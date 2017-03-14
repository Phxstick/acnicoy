"use strict";

module.exports = function (paths, modules) {
    const kanjiModule = {};

    /**
     * Add given kanji with given details. If kanji is already added, just add
     * new values without changing previous values or previous SRS levels.
     * @param {String} kanji - Kanji to be added
     * @param {Object[Array[String]]} values - Kanji information in form
     *     of an object mapping each attribute ("meanings", "on_yomi",
     *     "kun_yomi") to an array of strings.
     * @param {Object[Integer]} levels - SRS levels in form of an object mapping
     *     each attribute ("meanings", "on_yomi", "kun_yomi") to an integer.
     * @returns {Promise}
     */
    kanjiModule.add = async function (kanji, values, levels) {
        let newStatus = "no-change";
        const attributes = ["meanings", "on_yomi", "kun_yomi"];
        const modes = {
            "meanings": modules.test.mode.KANJI_MEANINGS,
            "on_yomi": modules.test.mode.KANJI_ON_YOMI,
            "kun_yomi": modules.test.mode.KANJI_KUN_YOMI
        };
        // Fill in missing values
        if (levels === undefined) {
            levels = {};
        }
        for (const attribute of attributes) {
            if (!values.hasOwnProperty(attribute)) values[attribute] = [];
            if (!levels.hasOwnProperty(attribute)) levels[attribute] = 1;
        }
        // Add kanji if it's not already added yet
        const alreadyAdded = await kanjiModule.isAdded(kanji);
        if (!alreadyAdded) {
            newStatus = "added";
            modules.stats.incrementKanjiAddedToday();
            await modules.database.run(
                "INSERT INTO kanji (kanji, date_added) VALUES (?, ?)",
                kanji, utility.getTime());
        }
        const promises = [];
        // Update kanji data for each attribute
        modules.database.run("BEGIN TRANSACTION");
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
            const promise = modules.database.query(
                // Get old values from the database
                `SELECT ${attribute}, level, review_date
                 FROM ${table} WHERE kanji = ?`, kanji)
            .then(async (rows) => { 
                if (rows.length) {
                    oldValues = rows[0][attribute].split(";");
                    oldLevel = rows[0]["level"];
                    oldReviewDate = rows[0]["review_date"];
                } else {
                    oldValues = [];
                }
                if (oldValues.length > 0 && newValues.length > 0) {
                    // Add new values and don't overwrite existing ones
                    for (const value of newValues) {
                        if (!oldValues.includes(value)) {
                            oldValues.push(value);
                        }
                    }
                    await modules.database.run(
                        `UPDATE ${table} SET ${attribute} = ?
                         WHERE kanji = ?`, oldValues.join(";"), kanji);
                } else if (oldValues.length === 0 && newValues.length > 0) {
                    modules.stats.updateScore(mode, 0, newLevel);
                    await modules.database.run(
                        `INSERT INTO ${table}
                         (kanji, ${attribute}, level, review_date)
                         VALUES (?, ?, ?, ?)`,
                        kanji, newValues.join(";"), newLevel, newReviewDate);
                }
                if (newStatus !== "added" &&
                    !utility.setEqual(new Set(newValues),
                                      new Set(oldValues)))
                    newStatus = "updated";
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        modules.database.run("END");
        return newStatus;
    };

    /**
     * Edit given kanji using given values by completely replacing previous
     * values with the new ones and changing the SRS levels for each attribute.
     * @param {String} kanji - Kanji to be edited
     * @param {Object[Array[String]]} values - Kanji information in form
     *     of an object mapping each attribute ("meanings", "on_yomi",
     *     "kun_yomi") to an array of strings.
     * @param {Object[Integer]} levels - SRS levels in form of an object mapping
     *     each attribute ("meanings", "on_yomi", "kun_yomi") to an integer.
     * @returns {Promise}
     */
    kanjiModule.edit = async function (kanji, values, levels) {
        let newStatus = "no-change";
        const attributes = ["meanings", "on_yomi", "kun_yomi"];
        const modes = {
            "meanings": modules.test.mode.KANJI_MEANINGS,
            "on_yomi": modules.test.mode.KANJI_ON_YOMI,
            "kun_yomi": modules.test.mode.KANJI_KUN_YOMI
        };
        const promises = [];
        modules.database.run("BEGIN TRANSACTION");
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
            const promise = modules.database.query(
                // Get old values from the database
                `SELECT ${attribute}, level, review_date
                 FROM ${table} WHERE kanji = ?`, kanji)
            .then(async (rows) => { 
                if (rows.length) {
                    oldValues = rows[0][attribute].split(";");
                    oldLevel = rows[0]["level"];
                    oldReviewDate = rows[0]["review_date"];
                } else {
                    oldValues = [];
                }
                // Update database with new values
                if (oldValues.length > 0 && newValues.length > 0) {
                    modules.stats.updateScore(mode, oldLevel, newLevel);
                    // If the level did not change, do not reset review date
                    if (oldLevel === newLevel) {
                        newReviewDate = oldReviewDate;
                    }
                    await modules.database.run(
                        `UPDATE ${table}
                         SET ${attribute} = ?, level = ?, review_date = ?
                         WHERE kanji = ?`,
                        newValues.join(";"), newLevel, newReviewDate, kanji);
                } else if (oldValues.length === 0 && newValues.length > 0) {
                    modules.stats.updateScore(mode, 0, newLevel);
                    await modules.database.run(
                        `INSERT INTO ${table}
                         (kanji, ${attribute}, level, review_date)
                         VALUES (?, ?, ?, ?)`,
                        kanji, newValues.join(";"), newLevel, newReviewDate);
                } else if (oldValues.length > 0 && newValues.length === 0) {
                    modules.stats.updateScore(mode, oldLevel, 0);
                    await modules.database.run(
                        `DELETE FROM ${table} WHERE kanji = ?`, kanji);
                }
                // Set status to "updated" if any values changed
                if (!utility.setEqual(new Set(newValues), new Set(oldValues)) ||
                        (oldLevel !== undefined && oldLevel !== newLevel))
                    newStatus = "updated";
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        // If there are no new values provided, delete the kanji
        let totalNumValues = 0;
        for (const attribute of attributes) {
            totalNumValues += values[attribute].length;
        }
        if (totalNumValues === 0) {
            newStatus = "removed";
            await modules.database.run(
                "DELETE FROM kanji WHERE kanji = ?", kanji);
        }
        modules.database.run("END");
        return newStatus;
    };

    /**
     * Completely remove kanji from the database.
     * @param {String} kanji
     * @returns {Promise}
     */
    kanjiModule.remove = function (kanji) {
        return modules.database.run("DELETE FROM kanji WHERE kanji = ?", kanji);
    };

    /**
     * Return meanings added for given kanji in the vocabulary.
     * If kanji is not added to the vocabulary, return an empty array.
     * @param {String} kanji
     * @returns {Promise[Array[String]]}
     */
    kanjiModule.getMeanings = function (kanji) {
        return modules.database.query(
            "SELECT meanings FROM kanji_meanings WHERE kanji = ?", kanji)
        .then((rows) => {
            if (rows.length === 0) return [];
            if (rows[0].meanings.length === 0) return [];
            return rows[0].meanings.split(";");
        });
    };

    /**
     * Return on-yomi added for given kanji in the vocabulary.
     * If kanji is not added to the vocabulary, return an empty array.
     * @param {String} kanji
     * @returns {Promise[Array[String]]}
     */
    kanjiModule.getOnYomi = function (kanji) {
        return modules.database.query(
            "SELECT on_yomi FROM kanji_on_yomi WHERE kanji = ?", kanji)
        .then((rows) => {
            if (rows.length === 0) return [];
            if (rows[0].on_yomi.length === 0) return [];
            return rows[0].on_yomi.split(";");
        });
    };

    /**
     * Return kun-yomi added for given kanji in the vocabulary.
     * If kanji is not added to the vocabulary, return an empty array.
     * @param {String} kanji
     * @returns {Promise[Array[String]]}
     */
    kanjiModule.getKunYomi = function (kanji) {
        return modules.database.query(
            "SELECT kun_yomi FROM kanji_kun_yomi WHERE kanji = ?", kanji)
        .then((rows) => {
            if (rows.length === 0) return [];
            if (rows[0].kun_yomi.length === 0) return [];
            return rows[0].kun_yomi.split(";");
        });
    };

    /**
     * Check if given kanji is added in the vocabulary database.
     * @param {String} kanji
     * @returns {Promise[Boolean]}
     */
    kanjiModule.isAdded = function (kanji) {
        return modules.database.query(
            "SELECT COUNT(*) AS amount FROM kanji WHERE kanji = ?", kanji)
        .then(([{amount}]) => amount > 0);
    };

    /**
     * Return info for given kanji from the vocabulary database.
     * @param {String} kanji
     * @returns {Promise[Object]} Info object containing the fields "meanings",
     *     "kunYomi", "onYomi", "meaningsLevel", "kunYomiLevel", "onYomiLevel".
     */
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

    /**
     * Return total amount of added kanji in the vocabulary database.
     * @returns {Promise[Integer]}
     */
    kanjiModule.getAmountAdded = function () {
        return modules.database.query("SELECT COUNT(*) AS amount FROM kanji")
               .then(([{amount}]) => amount);
    };

    /**
     * Return total amount of added kanji in the vocabulary for given grade.
     * @returns {Promise[Integer]}
     */
    kanjiModule.getAmountAddedForGrade = function (grade) {
        return modules.content.dataMap["Japanese"].query(
            `SELECT COUNT(*) AS amount
             FROM trainer.kanji t JOIN kanji k ON t.kanji = k.entry
             WHERE k.grade = ?`, grade)
        .then(([{amount}]) => amount);
    };

    /**
     * Return total amount of added kanji in the vocabulary for each grade.
     * @returns {Promise[Object[Integer]]}
     */
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

    /**
     * Return total amount of added kanji in the vocabulary for each JLPT level.
     * @returns {Promise[Object[Integer]]}
     */
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
