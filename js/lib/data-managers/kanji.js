"use strict";

module.exports = function (paths, modules) {
    const kanjiModule = {};

    kanjiModule.add = function (kanji, values, levels) {
        let newStatus = "no-change";
        return kanjiModule.isAdded(kanji).then((alreadyAdded) => {
            if (!alreadyAdded) {
                newStatus = "added";
                modules.stats.incrementKanjiAddedToday();
                return modules.database.run(
                    "INSERT INTO kanji (kanji, date_added) VALUES (?, ?)",
                    kanji, utility.getTime());
            }
        }).then(() => {
            const attributes = ["meanings", "on_yomi", "kun_yomi"];
            const modes = {
                "meanings": modules.test.mode.KANJI_MEANINGS,
                "on_yomi": modules.test.mode.KANJI_ON_YOMI,
                "kun_yomi": modules.test.mode.KANJI_KUN_YOMI
            };
            const promises = [];
            for (const attribute of attributes) {
                const mode = modes[attribute];
                const table = modules.test.modeToTable(mode);
                const newValues = values[attribute];
                const newLevel = levels[attribute];
                const newReviewDate = utility.getTime()
                    + modules.srs.currentScheme.intervals[newLevel];
                let oldValues;
                let oldLevel;
                let oldReviewDate;
                modules.database.run("BEGIN TRANSACTION");
                const promise = modules.database.query(
                    // Get old values from the database
                    `SELECT ${attribute}, level, review_date
                     FROM ${table} WHERE kanji = ?`, kanji)
                .then((rows) => { 
                    if (rows.length) {
                        oldValues = rows[0][attribute].split(";");
                        oldLevel = rows[0]["level"];
                        oldReviewDate = rows[0]["review_date"];
                    } else {
                        oldValues = [];
                    }
                }).then(() => {
                    if (oldValues.length > 0 && newValues.length > 0) {
                        // Add new values and don't overwrite existing ones
                        for (const value of newValues) {
                            if (!oldValues.includes(value)) {
                                oldValues.push(value);
                            }
                        }
                        return modules.database.run(
                            `UPDATE ${table} SET ${attribute} = ?
                             WHERE kanji = ?`, oldValues.join(";"), kanji);
                    } else if (oldValues.length === 0 && newValues.length > 0) {
                        modules.stats.updateScore(mode, 0, newLevel);
                        return modules.database.run(
                            `INSERT INTO ${table}
                             (kanji, ${attribute}, level, review_date)
                             VALUES (?, ?, ?, ?)`,
                            kanji, newValues.join(";"), newLevel,
                            newReviewDate);
                    }
                }).then(() => {
                     if (newStatus !== "added" &&
                         !utility.setEqual(new Set(newValues),
                                           new Set(oldValues)))
                        newStatus = "updated";
                });
                promises.push(promise);
            }
            return Promise.all(promises).then(() => {
                modules.database.run("END");
                return newStatus;
            });
        });
    };

    kanjiModule.edit = function (kanji, values, levels) {
        let newStatus = "no-change";
        const attributes = ["meanings", "on_yomi", "kun_yomi"];
        const modes = {
            "meanings": modules.test.mode.KANJI_MEANINGS,
            "on_yomi": modules.test.mode.KANJI_ON_YOMI,
            "kun_yomi": modules.test.mode.KANJI_KUN_YOMI
        };
        const promises = [];
        for (const attribute of attributes) {
            const mode = modes[attribute];
            const table = modules.test.modeToTable(mode);
            const newValues = values[attribute];
            const newLevel = levels[attribute];
            let newReviewDate = utility.getTime()
                + modules.srs.currentScheme.intervals[newLevel];
            let oldValues;
            let oldLevel;
            let oldReviewDate;
            modules.database.run("BEGIN TRANSACTION");
            const promise = modules.database.query(
                // Get old values from the database
                `SELECT ${attribute}, level, review_date
                 FROM ${table} WHERE kanji = ?`, kanji)
            .then((rows) => { 
                if (rows.length) {
                    oldValues = rows[0][attribute].split(";");
                    oldLevel = rows[0]["level"];
                    oldReviewDate = rows[0]["review_date"];
                } else {
                    oldValues = [];
                }
            }).then(() => {
                // Update database with new values
                if (oldValues.length > 0 && newValues.length > 0) {
                    modules.stats.updateScore(mode, oldLevel, newLevel);
                    // If the level did not change, do not reset review date
                    if (oldLevel === newLevel) {
                        newReviewDate = oldReviewDate;
                    }
                    return modules.database.run(
                        `UPDATE ${table}
                         SET ${attribute} = ?, level = ?, review_date = ?
                         WHERE kanji = ?`,
                        newValues.join(";"), newLevel, newReviewDate, kanji);
                } else if (oldValues.length === 0 && newValues.length > 0) {
                    modules.stats.updateScore(mode, 0, newLevel);
                    return modules.database.run(
                        `INSERT INTO ${table}
                         (kanji, ${attribute}, level, review_date)
                         VALUES (?, ?, ?, ?)`,
                        kanji, newValues.join(";"), newLevel, newReviewDate);
                } else if (oldValues.length > 0 && newValues.length === 0) {
                    modules.stats.updateScore(mode, oldLevel, 0);
                    return modules.database.run(
                        `DELETE FROM ${table} WHERE kanji = ?`, kanji);
                }
            }).then(() => {
                if (!utility.setEqual(new Set(newValues),
                                      new Set(oldValues)) ||
                        (oldLevel !== undefined && oldLevel !== newLevel))
                    newStatus = "updated";
            });
            promises.push(promise);
        }
        return Promise.all(promises).then(() => {
            // If there are no new values provided, delete the kanji
            let totalNumValues = 0;
            for (const attribute of attributes) {
                totalNumValues += values[attribute].length;
            }
            if (totalNumValues === 0) {
                newStatus = "removed";
                return modules.database.run(
                    "DELETE FROM kanji WHERE kanji = ?", kanji);
            }
        }).then(() => {
            modules.database.run("END");
            return newStatus;
        });
    };

    kanjiModule.remove = function (kanji) {
        return modules.database.run("DELETE FROM kanji WHERE kanji = ?", kanji);
    };

    // Following three functions assume that queried field is not empty 
    kanjiModule.getMeanings = function (kanji) {
        return modules.database.query(
            "SELECT meanings FROM kanji_meanings WHERE kanji = ?", kanji)
        .then(([{meanings}]) => meanings.split(";"));
    };
    kanjiModule.getOnYomi = function (kanji) {
        return modules.database.query(
            "SELECT on_yomi FROM kanji_on_yomi WHERE kanji = ?", kanji)
        .then(([{on_yomi}]) => on_yomi.split(";"));
    };
    kanjiModule.getKunYomi = function (kanji) {
        return modules.database.query(
            "SELECT kun_yomi FROM kanji_kun_yomi WHERE kanji = ?", kanji)
        .then(([{kun_yomi}]) => kun_yomi.split(";"));
    };

    kanjiModule.isAdded = function (kanji) {
        return modules.database.query(
            "SELECT COUNT(*) AS amount FROM kanji WHERE kanji = ?", kanji)
        .then(([{amount}]) => amount > 0);
    };

    kanjiModule.getInfo = function (kanji) {
        const info = { meanings: [], kunYomi: [], onYomi: [],
                       meaningsLevel: 1, kunYomiLevel: 1, onYomiLevel: 1 };
        return Promise.all([
            modules.database.query(
                `SELECT meanings, level
                 FROM kanji_meanings WHERE kanji = ?`, kanji),
            modules.database.query(
                `SELECT kun_yomi, level
                 FROM kanji_kun_yomi WHERE kanji = ?`, kanji),
            modules.database.query(
                `SELECT on_yomi, level
                 FROM kanji_on_yomi WHERE kanji = ?`, kanji)
        ]).then(([meaningsRows, kunYomiRows, onYomiRows]) => {
            if (meaningsRows.length) {
                info.meanings = meaningsRows[0].meanings.split(";");
                info.meaningsLevel = meaningsRows[0].level;
            }
            if (kunYomiRows.length) {
                info.kunYomi = kunYomiRows[0].kun_yomi.split(";");
                info.kunYomiLevel = kunYomiRows[0].level;
            }
            if (onYomiRows.length) {
                info.onYomi = onYomiRows[0].on_yomi.split(";");
                info.onYomiLevel = onYomiRows[0].level;
            }
            return info;
        });
    };

    kanjiModule.getAmountAdded = function () {
        return modules.database.query("SELECT COUNT(*) AS amount FROM kanji")
               .then(([{amount}]) => amount);
    };

    kanjiModule.getAmountAddedForGrade = function (grade) {
        return modules.content.dataMap["Japanese"].query(
            `SELECT COUNT(*) AS amount
             FROM trainer.kanji t JOIN kanji k ON t.kanji = k.entry
             WHERE k.grade = ?`, grade)
        .then(([{amount}]) => amount);
    };

    kanjiModule.getAmountsAddedPerGrade = function () {
        return modules.content.dataMap["Japanese"].query(
            `SELECT k.grade, COUNT(t.kanji) AS amount
             FROM trainer.kanji t JOIN kanji k ON t.kanji = k.entry
             GROUP BY k.grade`)
        .then((rows) => {
             const result = {};
             for (const { grade, amount } of rows) {
                 result[grade] = amount;
             }
             return result;
        });
    };

    kanjiModule.getAmountsAddedPerJlptLevel = function () {
        return modules.content.dataMap["Japanese"].query(
            `SELECT k.jlpt AS level, COUNT(*) AS amount
             FROM trainer.kanji t JOIN kanji k ON t.kanji = k.entry
             WHERE k.jlpt IS NOT NULL
             GROUP BY k.jlpt`)
        .then((rows) => {
            const result = {};
            for (const { level , amount } of rows) {
                result[level] = amount;
            }
            return result;
        });
    };

    return kanjiModule;
};
