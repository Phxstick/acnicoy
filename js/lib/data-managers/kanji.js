"use strict";

// Internal objects set externally
let trainer;
let content;
let stats;
let test;
let languageSettings;

module.exports.internals = {
    set trainer(obj) { trainer = obj; },
    set content(obj) { content = obj; },
    set stats(obj) { stats = obj; },
    set test(obj) { test = obj; },
    set languageSettings(obj) { languageSettings = obj; }
};


function add(kanji, meanings, onYomi, kunYomi, levels) {
    // TODO: Split this method from edit-method suitably
}


function edit(kanji, meanings, onYomi, kunYomi, levels) {
    const tables = ["kanji_meanings", "kanji_kun", "kanji_on"];
    const attributes = ["meaning", "kun_reading", "on_reading"];
    const names = ["meanings", "kunYomi", "onYomi"];
    const modes = [test.mode.KANJI_MEANINGS, test.mode.KANJI_KUN_YOMI,
                   test.mode.KANJI_ON_YOMI];
    const newValues = [meanings, kunYomi, onYomi];
    const statusPromises = [];
    const promises = [];
    let entryChanged = false;
    for (let i = 0; i < tables.length; ++i) {
      const table = tables[i];
      const attr = attributes[i];
      let oldValues = [];
      statusPromises.push(
      trainer.query(`SELECT ${attr} FROM ${table} WHERE entry = ?`, kanji).then(
        (rows) => {
          // Store old values
          rows.forEach((row) => oldValues.push(row[attr]));
          // Delete old values
          return trainer.run(`DELETE FROM ${table} WHERE entry = ?`, kanji); 
      }).then(() => {
        // Insert new values
        for (let value of newValues[i]) {
          promises.push(
              trainer.run(`INSERT INTO ${table} VALUES (?, ?)`, kanji, value));
        }
        // Update SRS system
        if (newValues[i].length > 0) {
          const newLevel = levels[names[i]];
          const spacing = languageSettings["SRS"]["spacing"][newLevel];
          promises.push(
              trainer.query(`SELECT * FROM ${table}_test WHERE entry = ?`, kanji)
              .then((rows) => {
                if (rows.length === 0) {
                  stats.updateDailyScore(modes[i], 0, newLevel);
                  return trainer.run(
                      `INSERT INTO ${table}_test VALUES (?, ?, ?)`,
                      kanji, newLevel, utility.getTime() + spacing);
                } else {
                  const oldLevel = rows[0].level;
                  if (oldLevel === newLevel) return;
                  entryChanged = true;
                  stats.updateDailyScore(modes[i], oldLevel, newLevel);
                  return trainer.run(
                      `UPDATE ${table}_test SET level = ?, time = ?
                      WHERE entry = ?`,
                      newLevel, utility.getTime() + spacing, kanji);
                }
              }));
        } else {
          promises.push(
              trainer.run(`DELETE FROM ${table}_test WHERE entry = ?`, kanji));
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
      }));
    }
    // TODO: Put this at beginning and make database dependencies on this?
    promises.push(isAdded().then((alreadyAdded) => {
      if (!alreadyAdded) {
        stats.incrementKanjiAddedToday();
        return trainer.run(
                "INSERT INTO kanji VALUES (?, ?)", kanji, utility.getTime());
      }
    }));
    if (meanings.length === 0 && onYomi.length === 0 && kunYomi.length === 0) {
        promises.push(trainer.run("DELETE FROM kanji WHERE entry = ?", kanji));
    }
    return Promise.all(statusPromises).then((statuses) => {
      return Promise.all(promises).then(() => {
        if (statuses.containsOnly("no-change")) return "no-change";
        if (statuses.containsOnly("added", "not-added")) return "added";
        if (statuses.containsOnly("removed", "not-added")) return "removed";
        return "updated";
      });
    });
}


function remove(kanji) {
    return edit(kanji, [], [], [], {});
}


function getMeanings(kanji) {
    return trainer.query(
    "SELECT meaning FROM kanji_meanings WHERE entry = ?", kanji)
    .then((rows) => rows.map((row) => row.meaning));
}


function getOnYomi(kanji) {
    return trainer.query(
    "SELECT on_reading FROM kanji_on WHERE entry = ?", kanji)
    .then((rows) => rows.map((row) => row.on_reading));
}


function getKunYomi(kanji) {
    return trainer.query(
    "SELECT kun_reading FROM kanji_kun WHERE entry = ?", kanji)
    .then((rows) => rows.map((row) => row.kun_reading));
}


function isAdded(kanji) {
    return trainer.query("SELECT * FROM kanji WHERE entry = ?", kanji)
           .then((rows) => rows.length > 0);
}


function getInfo(kanji) {
  return new Promise(function(resolve, reject) {
    const info = { meanings: [], kunYomi: [], onYomi: [] };
    isAdded(kanji).then((inTrainer) => {
        if (inTrainer) {
          Promise.all([
            trainer.query(
              "SELECT meaning FROM kanji_meanings WHERE entry = ?", kanji),
            trainer.query(
              "SELECT kun_reading FROM kanji_kun WHERE entry = ?", kanji),
            trainer.query(
              "SELECT on_reading FROM kanji_on WHERE entry = ?", kanji),
            trainer.query(
              "SELECT level FROM kanji_meanings_test WHERE entry = ?", kanji),
            trainer.query(
              "SELECT level FROM kanji_kun_test WHERE entry = ?", kanji),
            trainer.query(
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
          }).then(() => resolve(info));
        } else {
          // Kanji not registered in SRS system
          reject(`Kanji ${kanji} is not registered as SRS item!`);
        };
      });
  });
}


function getAmountAdded() {
    return trainer.query("SELECT COUNT(*) AS amount FROM kanji")
           .then((rows) => rows[0].amount);
}


// TODO: Move part of this to content section?
function getAmountAddedForGrade(grade) {
    // TODO: Adjust given grade to database value first (e.g. null for grade 10)
    return content.loaded["Japanese"].then((c) => {
        return new Promise((resolve, reject) => {
            c.data.all(
                `SELECT COUNT(*) AS amount
                 FROM trainer.kanji t JOIN kanji k ON t.entry = k.entry
                 WHERE k.grade = ?`,
                 grade, (error, rows) => resolve(rows[0].amount));
        });
    });
}


function getAmountsAddedPerGrade() {
    return content.loaded["Japanese"].then((c) => {
        return new Promise((resolve, reject) => {
            c.data.all(
                `SELECT k.grade, COUNT(*) AS amount
                 FROM trainer.kanji t JOIN kanji k ON t.entry = k.entry
                 GROUP BY k.grade`, (error, rows) => {
                     const result = {};
                     for (let { grade, amount } of rows) {
                         result[grade] = amount;
                     }
                     result[9] += result[10];
                     result[10] = result[null];
                     delete result[null];
                     resolve(result);
                 });
        });
    });
}


function getAmountsAddedPerJlptLevel() {
    return content.loaded["Japanese"].then((c) => {
        return new Promise((resolve, reject) => {
            c.data.all(
                `SELECT k.jlpt AS level, COUNT(*) AS amount
                 FROM trainer.kanji t JOIN kanji k ON t.entry = k.entry
                 WHERE k.jlpt IS NOT NULL
                 GROUP BY k.jlpt`, (error, rows) => {
                     const result = {};
                     for (let { level , amount } of rows) {
                         result[level] = amount;
                     }
                     resolve(result);
                 });
        });
    });
}


module.exports.exports = {
    add: add,
    edit: edit,
    remove: remove,
    getMeanings: getMeanings,
    getOnYomi: getOnYomi,
    getKunYomi: getKunYomi,
    isAdded: isAdded,
    getInfo: getInfo,
    getAmountAdded: getAmountAdded,
    getAmountAddedForGrade: getAmountAddedForGrade,
    getAmountsAddedPerGrade: getAmountsAddedPerGrade,
    getAmountsAddedPerJlptLevel: getAmountsAddedPerJlptLevel
};
