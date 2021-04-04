"use strict";

const csv = require("fast-csv");

module.exports = function (paths, modules) {
    const hanziModule = {};

    /**
     * Add given hanzi with given details. If hanzi is already added, just add
     * new values without changing previous values or previous SRS levels.
     * @param {String} hanzi - Hanzi to be added
     * @param {Object[Array[String]]} values - Hanzi information in form
     *     of an object mapping each attribute ("meanings", "readings")
     *     to an array of strings.
     * @param {Object[Integer]} levels - SRS levels in form of an object mapping
     *     each attribute ("meanings", "readings") to an integer.
     * @returns {Promise}
     */
    hanziModule.add = async function ({ hanzi, values, levels={},
            reviewDates={}, correctCounts={}, mistakeCounts={}, creationDate }){
        let newStatus = "no-change";
        const attributes = ["meanings", "readings"];
        const modes = {
            "meanings": modules.test.mode.HANZI_MEANINGS,
            "readings": modules.test.mode.HANZI_READINGS
        };
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
        // Add hanzi if it's not already added yet
        const alreadyAdded = await hanziModule.isAdded(hanzi);
        if (!alreadyAdded) {
            newStatus = "added";
            if (creationDate === undefined) creationDate = utility.getTime();
            modules.stats.incrementHanziAddedToday();
            await modules.database.run(
                "INSERT INTO hanzi (hanzi, date_added) VALUES (?, ?)",
                hanzi, creationDate);
        }
        const promises = [];
        // Update hanzi data for each attribute
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
                 FROM ${table} WHERE hanzi = ?`, hanzi)
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
                         WHERE hanzi = ?`, oldValues.join(";"), hanzi);
                } else if (oldValues.length === 0 && newValues.length > 0) {
                    modules.stats.updateScore(mode, 0, newLevel);
                    await modules.database.run(
                        `INSERT INTO ${table}
                         (hanzi, ${attribute}, level, review_date,
                          correct_count, mistake_count)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        hanzi, newValues.join(";"), newLevel, newReviewDate,
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
     * Edit given hanzi using given values by completely replacing previous
     * values with the new ones and changing the SRS levels for each attribute.
     * @param {String} hanzi - Hanzi to be edited
     * @param {Object[Array[String]]} values - Hanzi information in form
     *     of an object mapping each attribute ("meanings", "readings")
     *     to an array of strings.
     * @param {Object[Integer]} levels - SRS levels in form of an object mapping
     *     each attribute ("meanings", "readings") to an integer.
     * @returns {Promise}
     */
    hanziModule.edit = async function (hanzi, values, levels) {
        let newStatus = "no-change";
        const attributes = ["meanings", "readings"];
        const modes = {
            "meanings": modules.test.mode.HANZI_MEANINGS,
            "readings": modules.test.mode.HANZI_READINGS
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
                 FROM ${table} WHERE hanzi = ?`, hanzi)
            .then(async (rows) => { 
                if (rows.length) {
                    oldValues = rows[0][attribute].split(";");
                    oldLevel = rows[0]["level"];
                    oldReviewDate = rows[0]["review_date"];
                } else {
                    oldValues = [];
                }
                // Skip if values didn't change, else set status to "updated"
                if (utility.setEqual(new Set(newValues), new Set(oldValues)) &&
                        (oldLevel === newLevel || oldValues.length === 0)) {
                    return;
                } else {
                    newStatus = "updated";
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
                         WHERE hanzi = ?`,
                        newValues.join(";"), newLevel, newReviewDate, hanzi);
                } else if (oldValues.length === 0 && newValues.length > 0) {
                    modules.stats.updateScore(mode, 0, newLevel);
                    await modules.database.run(
                        `INSERT INTO ${table}
                         (hanzi, ${attribute}, level, review_date)
                         VALUES (?, ?, ?, ?)`,
                        hanzi, newValues.join(";"), newLevel, newReviewDate);
                } else if (oldValues.length > 0 && newValues.length === 0) {
                    modules.stats.updateScore(mode, oldLevel, 0);
                    await modules.database.run(
                        `DELETE FROM ${table} WHERE hanzi = ?`, hanzi);
                }
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        // If there are no new values provided, delete the hanzi
        let totalNumValues = 0;
        for (const attribute of attributes) {
            totalNumValues += values[attribute].length;
        }
        if (totalNumValues === 0) {
            newStatus = "removed";
            await modules.database.run(
                "DELETE FROM hanzi WHERE hanzi = ?", hanzi);
        }
        return newStatus;
    };

    hanziModule.rename = async function (oldHanzi, newHanzi) {
        await modules.database.run(
            "UPDATE hanzi SET hanzi = ? WHERE hanzi = ?", newHanzi, oldHanzi);
        await modules.database.run(
            "UPDATE hanzi_meanings SET hanzi = ? WHERE hanzi = ?",
            newHanzi, oldHanzi);
        await modules.database.run(
            "UPDATE hanzi_readings SET hanzi = ? WHERE hanzi = ?",
            newHanzi, oldHanzi);
    };

    /**
     * Completely remove hanzi from the database.
     * @param {String} hanzi
     * @returns {Promise}
     */
    hanziModule.remove = async function (hanzi) {
        await modules.database.run("DELETE FROM hanzi WHERE hanzi = ?", hanzi);
        // The following might not be necessary, if DB constraints work properly
        await modules.database.run(
            "DELETE FROM hanzi_meanings WHERE hanzi = ?", hanzi);
        await modules.database.run(
            "DELETE FROM hanzi_readings WHERE hanzi = ?", hanzi);
    };

    /**
     * Return meanings added for given hanzi in the vocabulary.
     * If hanzi is not added to the vocabulary, return an empty array.
     * @param {String} hanzi
     * @returns {Promise[Array[String]]}
     */
    hanziModule.getMeanings = function (hanzi) {
        return modules.database.query(
            "SELECT meanings FROM hanzi_meanings WHERE hanzi = ?", hanzi)
        .then((rows) => {
            if (rows.length === 0) return [];
            if (rows[0].meanings.length === 0) return [];
            return rows[0].meanings.split(";");
        });
    };

    /**
     * Return readings added for given hanzi in the vocabulary.
     * If hanzi is not added to the vocabulary, return an empty array.
     * @param {String} hanzi
     * @returns {Promise[Array[String]]}
     */
    hanziModule.getReadings = function (hanzi) {
        return modules.database.query(
            "SELECT readings FROM hanzi_readings WHERE hanzi = ?", hanzi)
        .then((rows) => {
            if (rows.length === 0) return [];
            if (rows[0].readings.length === 0) return [];
            return rows[0].readings.split(";");
        });
    };

    /**
     * Check if given hanzi is added in the vocabulary database.
     * @param {String} hanzi
     * @returns {Promise[Boolean]}
     */
    hanziModule.isAdded = function (hanzi) {
        return modules.database.query(
            "SELECT COUNT(*) AS amount FROM hanzi WHERE hanzi = ?", hanzi)
        .then(([{amount}]) => amount > 0);
    };

    /**
     * Return info for given hanzi from the vocabulary database.
     * @param {String} hanzi
     * @returns {Promise[Object]} Info object containing the fields "meanings",
     *     "readings", "meaningsLevel", "readingsLevel".
     */
    hanziModule.getInfo = function (hanzi) {
        const info = { meanings: [], readings: [],
                       meaningsLevel: 1, readingsLevel: 1 };
        return Promise.all([
            modules.database.query(
                `SELECT meanings, level
                 FROM hanzi_meanings WHERE hanzi = ?`, hanzi),
            modules.database.query(
                `SELECT readings, level
                 FROM hanzi_readings WHERE hanzi = ?`, hanzi),
        ]).then(([meaningsRows, readingsRows]) => {
            if (meaningsRows.length) {
                info.meanings = meaningsRows[0].meanings.split(";");
                info.meaningsLevel = meaningsRows[0].level;
            }
            if (readingsRows.length) {
                info.readings = readingsRows[0].readings.split(";");
                info.readingsLevel = readingsRows[0].level;
            }
            return info;
        });
    };

    /**
     * Return total amount of added hanzi in the vocabulary database.
     * @returns {Promise[Integer]}
     */
    hanziModule.getAmountAdded = function () {
        return modules.database.queryLanguage("Chinese",
            "SELECT COUNT(*) AS amount FROM hanzi").then(([{amount}]) => amount)
    };

    /**
     * Return a list of all hanzi in the vocabulary.
     * @param {String} sortingCriterion - "alphabetical" or "dateAdded".
     * @param {Boolean} [sortBackwards=false]
     * @returns {Promise[Array[String]]}
     */
    hanziModule.getAll = function (sortingCriterion, sortBackwards=false) {
        let columnToSortBy;
        if (sortingCriterion === "alphabetical") columnToSortBy = "hanzi";
        else if (sortingCriterion === "dateAdded") columnToSortBy = "date_added";
        const sortingDirection = sortBackwards ? "DESC" : "ASC";
        return modules.database.query(
            `SELECT hanzi FROM hanzi
             ORDER BY ${columnToSortBy} ${sortingDirection}, rowid DESC`)
        .then((rows) => rows.map((row) => row.hanzi));
    };

    /**
     * Return the date when the given hanzi was added (in seconds).
     * @param {String} hanzi
     * @returns {Integer}
     */
    hanziModule.getDateAdded = async function (hanzi) {
        const rows = await modules.database.query(
            `SELECT date_added FROM hanzi WHERE hanzi = ?`, hanzi);
        return rows[0].date_added;
    }

    /**
     * Return a mapping from all hanzi to the date when they were added
     * (in seconds).
     * @returns {Promise[Object[Integer]]}
     */
    hanziModule.getDateAddedForEachHanzi = function () {
        return modules.database.query(`SELECT hanzi, date_added FROM hanzi`)
        .then((rows) => {
            const map = new Map();
            for (const { hanzi, date_added } of rows) {
                map.set(hanzi, date_added);
            }
            return map;
        });
    }

    /**
     * Return a mapping from all hanzi to their internal database ID.
     */
    hanziModule.getIdForEachHanzi = function () {
        return modules.database.query(`SELECT hanzi, rowid FROM hanzi`)
        .then((rows) => {
            const map = new Map();
            for (const { hanzi, rowid } of rows) {
                map.set(hanzi, rowid);
            }
            return map;
        });
    }

    /**
     * Return the internal database ID of the given hanzi (for sorting purposes)
     */
    hanziModule.getId = function (hanzi) {
        return modules.database.query(`SELECT rowid FROM hanzi WHERE hanzi = ?`,
            hanzi).then(([{rowid}]) => rowid);
    }

    /**
     * Get a list of hanzi containing the given query string in their meanings
     * or readings.
     * @param {String} query
     * @param {String} searchMethod - "meanings" or "readings".
     * @returns {Array[String]}
     */
    hanziModule.search = async function (query, searchMethod) {
        let matchString = query.replace(/[*]/g, "%").replace(/[?]/g, "_");
        if (!matchString.includes("%")) matchString += "%";
        if (!matchString.startsWith("%")) matchString = "%;" + matchString;
        if (!matchString.endsWith("%")) matchString = matchString + ";%";
        const args = [matchString];
        const conditions = [];
        let tableName;
        if (searchMethod === "meanings") {
            tableName = "hanzi_meanings";
            conditions.push("(';'||meanings||';') LIKE ?");
        } else if (searchMethod === "readings") {
            tableName = "hanzi_readings";
            conditions.push("(';'||readings||';') LIKE ?");
        }
        const rows = await modules.database.query(
            `SELECT hanzi FROM ${tableName} WHERE ${conditions.join(" OR ")}`,
            ...args)
        return rows.map((row) => row.hanzi);
    }

    /**
     * Write the given hanzi including all associated information into a CSV
     * file at the given path. If no list of hanzi is given, export all hanzi.
     * @param {Array[String]} hanziList
     */
    hanziModule.export = async function (filepath, hanziList) {
        // Get all hanzi from database if no list is given
        if (hanziList === undefined) {
            hanziList = await modules.database.query(
                `SELECT hanzi FROM hanzi ORDER BY rowid ASC`);
            hanziList = hanziList.map(({ hanzi }) => hanzi);
        }
        if (hanziList.length === 0) return;

        // Assemble values from database for each hanzi
        const rows = []
        for (let i = 0; i < hanziList.length; ++i) {
            const hanzi = hanziList[i];
            rows.push({
                hanzi: await modules.database.query(
                    `SELECT * FROM hanzi k WHERE k.hanzi = ?`, hanzi),
                meanings: await modules.database.query(
                    `SELECT * FROM hanzi_meanings k WHERE k.hanzi = ?`, hanzi),
                readings: await modules.database.query(
                    `SELECT * FROM hanzi_readings k WHERE k.hanzi = ?`, hanzi)
            });
        }

        // Transform rows and write them to the given file
        csv.writeToPath(filepath, rows, {
            headers: true,
            delimiter: "\t",
            transform: (row) => ({
                "Hanzi": row.hanzi[0].hanzi,
                "Creation date": row.hanzi[0].date_added,

                "Meanings": row.meanings.length ? row.meanings[0].meanings:null,
                "Readings": row.readings.length ? row.readings[0].readings:null,

                "Meanings SRS level":
                    row.meanings.length ? row.meanings[0].level : null,
                "Readings SRS level":
                    row.readings.length ? row.readings[0].level : null,

                "Meanings review date":
                    row.meanings.length ? row.meanings[0].review_date : null,
                "Readings review date":
                    row.readings.length ? row.readings[0].review_date : null,

                "Meanings mistake count":
                    row.meanings.length ? row.meanings[0].mistake_count : null,
                "Readings mistake count":
                    row.readings.length ? row.readings[0].mistake_count : null,

                "Meanings correct count":
                    row.meanings.length ? row.meanings[0].correct_count : null,
                "Readings correct count":
                    row.readings.length ? row.readings[0].correct_count : null,
            })
        });
    }

    return hanziModule;
};
