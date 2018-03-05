"use strict";

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
    hanziModule.add = async function (hanzi, values, levels) {
        let newStatus = "no-change";
        const attributes = ["meanings", "readings"];
        const modes = {
            "meanings": modules.test.mode.HANZI_MEANINGS,
            "readings": modules.test.mode.HANZI_READINGS
        };
        // Fill in missing values
        if (levels === undefined) {
            levels = {};
        }
        for (const attribute of attributes) {
            if (!values.hasOwnProperty(attribute)) values[attribute] = [];
            if (!levels.hasOwnProperty(attribute)) levels[attribute] = 1;
        }
        // Add hanzi if it's not already added yet
        const alreadyAdded = await hanziModule.isAdded(hanzi);
        if (!alreadyAdded) {
            newStatus = "added";
            modules.stats.incrementHanziAddedToday();
            await modules.database.run(
                "INSERT INTO hanzi (hanzi, date_added) VALUES (?, ?)",
                hanzi, utility.getTime());
        }
        const promises = [];
        // Update hanzi data for each attribute
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
                         (hanzi, ${attribute}, level, review_date)
                         VALUES (?, ?, ?, ?)`,
                        hanzi, newValues.join(";"), newLevel, newReviewDate);
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
                // Set status to "updated" if any values changed
                if (!utility.setEqual(new Set(newValues), new Set(oldValues)) ||
                        (oldLevel !== undefined && oldLevel !== newLevel))
                    newStatus = "updated";
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

    /**
     * Completely remove hanzi from the database.
     * @param {String} hanzi
     * @returns {Promise}
     */
    hanziModule.remove = function (hanzi) {
        return modules.database.run("DELETE FROM hanzi WHERE hanzi = ?", hanzi);
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
        return modules.database.query("SELECT COUNT(*) AS amount FROM hanzi")
               .then(([{amount}]) => amount);
    };

    return hanziModule;
};
