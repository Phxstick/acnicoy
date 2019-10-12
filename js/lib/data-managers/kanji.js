"use strict";

const csv = require("fast-csv");

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
    kanjiModule.add = async function ({ kanji, values, levels={},
            reviewDates={}, correctCounts={}, mistakeCounts={}, creationDate }){
        let newStatus = "no-change";
        const attributes = ["meanings", "on_yomi", "kun_yomi"];
        const modes = {
            "meanings": modules.test.mode.KANJI_MEANINGS,
            "on_yomi": modules.test.mode.KANJI_ON_YOMI,
            "kun_yomi": modules.test.mode.KANJI_KUN_YOMI
        };
        // Fill in missing values
        for (const attribute of attributes) {
            if (!values.hasOwnProperty(attribute)) values[attribute] = [];
            if (!levels.hasOwnProperty(attribute)) levels[attribute] = 1;
            if (!reviewDates.hasOwnProperty(attribute))
                reviewDates[attribute] = utility.getTime()
                    + modules.srs.currentScheme.intervals[levels[attribute]];
            if (!correctCounts.hasOwnProperty(attribute))
                correctCounts[attribute] = 0;
            if (!mistakeCounts.hasOwnProperty(attribute))
                mistakeCounts[attribute] = 0;
        }
        // Add kanji if it's not already added yet
        const alreadyAdded = await kanjiModule.isAdded(kanji);
        if (!alreadyAdded) {
            newStatus = "added";
            if (creationDate === undefined) creationDate = utility.getTime();
            modules.stats.incrementKanjiAddedToday();
            await modules.database.run(
                "INSERT INTO kanji (kanji, date_added) VALUES (?, ?)",
                kanji, creationDate);
        }
        const promises = [];
        // Update kanji data for each attribute
        for (const attribute of attributes) {
            const mode = modes[attribute];
            const table = modules.test.modeToTable(mode);
            const newValues = values[attribute];
            const newLevel = levels[attribute];
            const newReviewDate = reviewDates[attribute];
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
                         (kanji, ${attribute}, level, review_date,
                          correct_count, mistake_count)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        kanji, newValues.join(";"), newLevel, newReviewDate,
                        correctCounts[attribute], mistakeCounts[attribute]);
                }
                if (newStatus !== "added" &&
                    !utility.setEqual(new Set(newValues),
                                      new Set(oldValues)))
                    newStatus = "updated";
            });
            promises.push(promise);
        }
        await Promise.all(promises);
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
        return newStatus;
    };

    kanjiModule.rename = async function (oldKanji, newKanji) {
        await modules.database.run(
            "UPDATE kanji SET kanji = ? WHERE kanji = ?", newKanji, oldKanji);
        await modules.database.run(
            "UPDATE kanji_meanings SET kanji = ? WHERE kanji = ?",
            newKanji, oldKanji);
        await modules.database.run(
            "UPDATE kanji_on_yomi SET kanji = ? WHERE kanji = ?",
            newKanji, oldKanji);
        await modules.database.run(
            "UPDATE kanji_kun_yomi SET kanji = ? WHERE kanji = ?",
            newKanji, oldKanji);
    };

    /**
     * Completely remove kanji from the database.
     * @param {String} kanji
     * @returns {Promise}
     */
    kanjiModule.remove = async function (kanji) {
        await modules.database.run("DELETE FROM kanji WHERE kanji = ?", kanji);
        // The following might not be necessary, if DB constraints work properly
        await modules.database.run(
            "DELETE FROM kanji_meanings WHERE kanji = ?", kanji);
        await modules.database.run(
            "DELETE FROM kanji_on_yomi WHERE kanji = ?", kanji);
        await modules.database.run(
            "DELETE FROM kanji_kun_yomi WHERE kanji = ?", kanji);
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
        return modules.database.queryLanguage("Japanese",
            "SELECT COUNT(*) AS amount FROM kanji").then(([{amount}]) => amount)
    };

    // /**
    //  * Return total amount of added kanji in the vocabulary for given grade.
    //  * @returns {Promise[Integer]}
    //  */
    // kanjiModule.getAmountAddedForGrade = function (grade) {
    //     return modules.content.get("Japanese", "English").query(
    //         `SELECT COUNT(*) AS amount
    //          FROM trainer.kanji t JOIN kanji k ON t.kanji = k.entry
    //          WHERE k.grade = ?`, grade)
    //     .then(([{amount}]) => amount);
    // };

    /**
     * Return total amount of added kanji in the vocabulary for each grade.
     * @returns {Promise[Object[Integer]]}
     */
    kanjiModule.getAmountsAddedPerGrade = function () {
        return modules.content.get("Japanese", "English").query(
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
        return modules.content.get("Japanese", "English").query(
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

    /**
     * Return a list of all kanji in the vocabulary.
     * @param {String} sortingCriterion - "alphabetical" or "dateAdded".
     * @param {Boolean} [sortBackwards=false]
     * @returns {Promise[Array[String]]}
     */
    kanjiModule.getAll = function (sortingCriterion, sortBackwards=false) {
        let columnToSortBy;
        if (sortingCriterion === "alphabetical") columnToSortBy = "kanji";
        else if (sortingCriterion === "dateAdded") columnToSortBy = "date_added";
        const sortingDirection = sortBackwards ? "DESC" : "ASC";
        const sortClause = sortingCriterion === undefined ? "" :
            `ORDER BY ${columnToSortBy} ${sortingDirection}, rowid DESC`;
        return modules.database.queryLanguage(
            "Japanese", `SELECT kanji FROM kanji ${sortClause}`)
        .then((rows) => rows.map((row) => row.kanji));
    };

    /**
     * Return the date when the given kanji was added (in seconds).
     * @param {String} kanji
     * @returns {Integer}
     */
    kanjiModule.getDateAdded = async function (kanji) {
        const rows = await modules.database.query(
            `SELECT date_added FROM kanji WHERE kanji = ?`, kanji);
        return rows[0].date_added;
    }

    /**
     * Return a mapping from all kanji to the date when they were added
     * (in seconds).
     * @returns {Promise[Object[Integer]]}
     */
    kanjiModule.getDateAddedForEachKanji = function () {
        return modules.database.query(`SELECT kanji, date_added FROM kanji`)
        .then((rows) => {
            const map = new Map();
            for (const { kanji, date_added } of rows) {
                map.set(kanji, date_added);
            }
            return map;
        });
    }

    /**
     * Return a mapping from all kanji to their internal database ID.
     */
    kanjiModule.getIdForEachKanji = function () {
        return modules.database.query(`SELECT kanji, rowid FROM kanji`)
        .then((rows) => {
            const map = new Map();
            for (const { kanji, rowid } of rows) {
                map.set(kanji, rowid);
            }
            return map;
        });
    }

    /**
     * Return the internal database ID of the given kanji (for sorting purposes)
     */
    kanjiModule.getId = function (kanji) {
        return modules.database.query(`SELECT rowid FROM kanji WHERE kanji = ?`,
            kanji).then(([{rowid}]) => rowid);
    }

    /**
     * Get a list of kanji containing the given query string in their meanings,
     * on-yomi or kun-yomi.
     * @param {String} query
     * @param {String} searchMethod - "meanings", "on-yomi" or "kun-yomi".
     * @returns {Array[String]}
     */
    kanjiModule.search = async function (query, searchMethod) {
        let matchString = query.replace(/[*]/g, "%").replace(/[?]/g, "_");
        if (!matchString.includes("%")) matchString += "%";
        if (!matchString.startsWith("%")) matchString = "%;" + matchString;
        if (!matchString.endsWith("%")) matchString = matchString + ";%";
        const args = [matchString];
        const conditions = [];
        let tableName;
        if (searchMethod === "meanings") {
            tableName = "kanji_meanings";
            conditions.push("(';'||meanings||';') LIKE ?");
        } else if (searchMethod === "on-yomi") {
            tableName = "kanji_on_yomi";
            conditions.push("(';'||on_yomi||';') LIKE ?")
        } else if (searchMethod === "kun-yomi") {
            tableName = "kanji_kun_yomi";
            conditions.push("(';'||kun_yomi||';') LIKE ?",
                "(';'||replace(kun_yomi,'.','')||';') LIKE ?")
            args.push(matchString);
        }
        const rows = await modules.database.query(
            `SELECT kanji FROM ${tableName} WHERE ${conditions.join(" OR ")}`,
            ...args)
        return rows.map((row) => row.kanji);
    }

    /**
     * Write the given kanji including all associated information into a CSV
     * file at the given path. If no list of kanji is given, export all kanji.
     * @param {Array[String]} kanjiList
     */
    kanjiModule.export = async function (filepath, kanjiList) {
        // Get all kanji from database if no list is given
        if (kanjiList === undefined) {
            kanjiList = await modules.database.query(
                `SELECT kanji FROM kanji ORDER BY rowid ASC`);
            kanjiList = kanjiList.map(({ kanji }) => kanji);
        }
        if (kanjiList.length === 0) return;

        // Assemble values from database for each kanji
        const rows = []
        for (let i = 0; i < kanjiList.length; ++i) {
            const kanji = kanjiList[i];
            rows.push({
                kanji: await modules.database.query(
                    `SELECT * FROM kanji k WHERE k.kanji = ?`, kanji),
                meanings: await modules.database.query(
                    `SELECT * FROM kanji_meanings k WHERE k.kanji = ?`, kanji),
                onYomi: await modules.database.query(
                    `SELECT * FROM kanji_on_yomi k WHERE k.kanji = ?`, kanji),
                kunYomi: await modules.database.query(
                    `SELECT * FROM kanji_kun_yomi k WHERE k.kanji = ?`, kanji)
            });
        }

        // Transform rows and write them to the given file
        csv.writeToPath(filepath, rows, {
            headers: true,
            delimiter: "\t",
            transform: (row) => ({
                "Kanji": row.kanji[0].kanji,
                "Creation date": row.kanji[0].date_added,

                "Meanings": row.meanings.length ? row.meanings[0].meanings:null,
                "On yomi": row.onYomi.length ? row.onYomi[0].on_yomi : null,
                "Kun yomi": row.kunYomi.length ? row.kunYomi[0].kun_yomi : null,

                "Meanings SRS level":
                    row.meanings.length ? row.meanings[0].level : null,
                "On yomi SRS level":
                    row.onYomi.length ? row.onYomi[0].level : null,
                "Kun Yomi SRS level":
                    row.kunYomi.length ? row.kunYomi[0].level : null,

                "Meanings review date":
                    row.meanings.length ? row.meanings[0].review_date : null,
                "On yomi review date":
                    row.onYomi.length ? row.onYomi[0].review_date : null,
                "Kun Yomi review date":
                    row.kunYomi.length ? row.kunYomi[0].review_date : null,

                "Meanings mistake count":
                    row.meanings.length ? row.meanings[0].mistake_count : null,
                "On yomi mistake count": 
                    row.onYomi.length ? row.onYomi[0].mistake_count : null,
                "Kun Yomi mistake count":
                    row.kunYomi.length ? row.kunYomi[0].mistake_count : null,

                "Meanings correct count":
                    row.meanings.length ? row.meanings[0].correct_count : null,
                "On yomi correct count":
                    row.onYomi.length ? row.onYomi[0].correct_count : null,
                "Kun Yomi correct count":
                    row.kunYomi.length ? row.kunYomi[0].correct_count : null
            })
        });
    }

    return kanjiModule;
};
