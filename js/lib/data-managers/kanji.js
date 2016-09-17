"use strict";

module.exports = function (paths, modules) {
    const kanjiModule = {};

    // TODO: Split this method from edit-method suitably
    kanjiModule.add = function (kanji, meanings, onYomi, kunYomi, levels) {
    };

    kanjiModule.edit = function (kanji, meanings, onYomi, kunYomi, levels) {
      const tables = ["kanji_meanings", "kanji_kun", "kanji_on"];
      const attributes = ["meaning", "kun_reading", "on_reading"];
      const names = ["meanings", "kunYomi", "onYomi"];
      const modes = [modules.test.mode.KANJI_MEANINGS,
                     modules.test.mode.KANJI_KUN_YOMI,
                     modules.test.mode.KANJI_ON_YOMI];
      const newValues = [meanings, kunYomi, onYomi];
      const statusPromises = [];
      const promises = [];
      let entryChanged = false;
      for (let i = 0; i < tables.length; ++i) {
        const table = tables[i];
        const attr = attributes[i];
        let oldValues = [];
        const statusPromise = modules.database.query(
            `SELECT ${attr} FROM ${table} WHERE entry = ?`, kanji)
        .then((rows) => {
            // Store old values and remove them from the database
            rows.forEach((row) => oldValues.push(row[attr]));
            return modules.database.run(
                `DELETE FROM ${table} WHERE entry = ?`, kanji); 
        }).then(() => {
          // Insert new values
          for (let value of newValues[i]) {
            const promise = modules.database.run(
                `INSERT INTO ${table} VALUES (?, ?)`, kanji, value);
            promises.push(promise);
         
          }
          // Update SRS system
          if (newValues[i].length > 0) {
            const newLevel = levels[names[i]];
            const spacing =
                modules.languageSettings["SRS"]["spacing"][newLevel];
            const promise = modules.database.query(
                `SELECT * FROM ${table}_test WHERE entry = ?`, kanji)
            .then((rows) => {
              if (rows.length === 0) {
                modules.stats.updateDailyScore(modes[i], 0, newLevel);
                return modules.database.run(
                    `INSERT INTO ${table}_test VALUES (?, ?, ?)`,
                    kanji, newLevel, utility.getTime() + spacing);
              } else {
                const oldLevel = rows[0].level;
                if (oldLevel === newLevel) return;
                entryChanged = true;
                modules.stats.updateDailyScore(
                    modes[i], oldLevel, newLevel);
                return modules.database.run(
                    `UPDATE ${table}_test SET level = ?, time = ?
                    WHERE entry = ?`,
                    newLevel, utility.getTime() + spacing, kanji);
              }
            });
            promises.push(promise);
          } else {
              const promise = modules.database.run(
                `DELETE FROM ${table}_test WHERE entry = ?`, kanji);
              promises.push(promise);
          }
          // Determine status
          if (newValues[i].length > 0 && oldValues.length > 0) {
              if (utility.setEqual(new Set(newValues[i]), new Set(oldValues))) {
                  return "no-change";
              } else {
                  return "updated";
              }
          } else if (newValues[i].length > 0) {
              return "added";
          } else if (oldValues.length > 0) {
              return "removed";
          } else {
              return "not-added";
          }
        });
        statusPromises.push(statusPromise);
      }
      // TODO: Put this at beginning and make database dependencies on this?
      promises.push(kanjiModule.isAdded().then((alreadyAdded) => {
        if (!alreadyAdded) {
          modules.stats.incrementKanjiAddedToday();
          return modules.database.run(
              "INSERT INTO kanji VALUES (?, ?)", kanji, utility.getTime());
        }
      }));
      if (meanings.length === 0 && onYomi.length === 0 && kunYomi.length === 0) {
          promises.push(
              modules.database.run(
                  "DELETE FROM kanji WHERE entry = ?", kanji));
      }
      return Promise.all(statusPromises).then((statuses) => {
        return Promise.all(promises).then(() => {
          if (statuses.containsOnly("no-change")) return "no-change";
          if (statuses.containsOnly("added", "not-added")) return "added";
          if (statuses.containsOnly("removed", "not-added")) return "removed";
          return "updated";
        });
      });
    };

    kanjiModule.remove = function (kanji) {
        return edit(kanji, [], [], [], {});
    };

    kanjiModule.getMeanings = function (kanji) {
        return modules.database.query(
        "SELECT meaning FROM kanji_meanings WHERE entry = ?", kanji)
        .then((rows) => rows.map((row) => row.meaning));
    };

    kanjiModule.getOnYomi = function (kanji) {
        return modules.database.query(
        "SELECT on_reading FROM kanji_on WHERE entry = ?", kanji)
        .then((rows) => rows.map((row) => row.on_reading));
    };

    kanjiModule.getKunYomi = function (kanji) {
        return modules.database.query(
        "SELECT kun_reading FROM kanji_kun WHERE entry = ?", kanji)
        .then((rows) => rows.map((row) => row.kun_reading));
    };

    kanjiModule.isAdded = function (kanji) {
        return modules.database.query(
            "SELECT * FROM kanji WHERE entry = ?", kanji)
        .then((rows) => rows.length > 0);
    };

    kanjiModule.getInfo = function (kanji) {
        const info = { meanings: [], kunYomi: [], onYomi: [] };
        return Promise.all([
            modules.database.query(
              "SELECT meaning FROM kanji_meanings WHERE entry = ?", kanji),
            modules.database.query(
              "SELECT kun_reading FROM kanji_kun WHERE entry = ?", kanji),
            modules.database.query(
              "SELECT on_reading FROM kanji_on WHERE entry = ?", kanji),
            modules.database.query(
              "SELECT level FROM kanji_meanings_test WHERE entry = ?", kanji),
            modules.database.query(
              "SELECT level FROM kanji_kun_test WHERE entry = ?", kanji),
            modules.database.query(
              "SELECT level FROM kanji_on_test WHERE entry = ?", kanji)
        ]).then((results) => {
            for (let row of results[0]) info.meanings.push(row.meaning);
            for (let row of results[1]) info.kunYomi.push(row.kun_reading);
            for (let row of results[2]) info.onYomi.push(row.on_reading);
            info.meaningsLevel = results[3] ? (results[3][0] ?
                                 parseInt(results[3][0].level) : 1) : 1;
            info.kunLevel = results[4] ? (results[4][0] ?
                                 parseInt(results[4][0].level) : 1) : 1;
            info.onLevel = results[5] ? (results[5][0] ?
                                 parseInt(results[5][0].level) : 1) : 1;
            return info;
        });
    };

    kanjiModule.getAmountAdded = function () {
        return modules.database.query("SELECT COUNT(*) AS amount FROM kanji")
               .then((rows) => rows[0].amount);
    };

    // TODO: Move part of this to content section?
    kanjiModule.getAmountAddedForGrade = function (grade) {
        // TODO: Adjust grade to database value first (e.g. null for grade 10)
        return modules.content.dataMap["Japanese"].query(
            `SELECT COUNT(*) AS amount
             FROM trainer.kanji t JOIN kanji k ON t.entry = k.entry
             WHERE k.grade = ?`, grade)
        .then((rows) => rows[0].amount);
    };

    kanjiModule.getAmountsAddedPerGrade = function () {
        return modules.content.dataMap["Japanese"].query(
            `SELECT k.grade, COUNT(*) AS amount
             FROM trainer.kanji t JOIN kanji k ON t.entry = k.entry
             GROUP BY k.grade`)
        .then((rows) => {
             const result = {};
             for (let { grade, amount } of rows) {
                 result[grade] = amount;
             }
             result[9] += result[10];
             result[10] = result[null];
             delete result[null];
             return result;
        });
    };

    kanjiModule.getAmountsAddedPerJlptLevel = function () {
        return modules.content.dataMap["Japanese"].query(
            `SELECT k.jlpt AS level, COUNT(*) AS amount
             FROM trainer.kanji t JOIN kanji k ON t.entry = k.entry
             WHERE k.jlpt IS NOT NULL
             GROUP BY k.jlpt`)
        .then((rows) => {
            const result = {};
            for (let { level , amount } of rows) {
                result[level] = amount;
            }
            return result;
        });
    };

    return kanjiModule;
};
