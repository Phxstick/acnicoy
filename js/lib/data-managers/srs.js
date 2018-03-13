"use strict";


const fs = require("fs");

module.exports = function (paths, modules) {
    const srs = {};
    const dataMap = {};

    srs.initialize = function () {
        srs.loadSchemes();
    };

    // Not needed since saveSchemes is already called when necessary
    // srs.saveGlobal = function () {
    //     srs.saveSchemes();
    // };

    srs.load = function (language) {
        dataMap[language] = {};
        srs.loadSchemeInfo(language);
    };

    srs.unload = function (language) {
        delete dataMap[language];
    };

    srs.setLanguage = function (language) {
        srs.currentScheme = dataMap[language];
    };


    /* =========================================================================
        Language independent SRS scheme functions
    ========================================================================= */

    srs.loadSchemes = function() {
        if (!utility.existsFile(paths.srsSchemes)) {
            const defaultSrsSchemes = fs.readFileSync(paths.defaultSrsSchemes);
            fs.writeFileSync(paths.srsSchemes, defaultSrsSchemes);
        }
        srs.schemes = require(paths.srsSchemes);
    };

    srs.saveSchemes = function() {
        fs.writeFileSync(
            paths.srsSchemes, JSON.stringify(srs.schemes, null, 4));
    };

    srs.createScheme = function (schemeName) {
        for (const scheme of srs.schemes) {
            // Check if scheme with that name already exists
            if (schemeName === scheme.name) {
                return false;
            }
        }
        srs.schemes.push({ name: schemeName, description: "", intervals: [] });
        return true;
    };

    srs.editScheme = function (
            schemeName, newName, newDescription, newIntervals) {
        let schemeInfo;
        // Check if scheme with given name exists
        for (const scheme of srs.schemes) {
            if (schemeName === scheme.name) {
                schemeInfo = scheme;
                break;
            }
        }
        if (!schemeInfo) {
            throw new Error(
                `SRS scheme with name '${schemeName}' could not be found.`);
        }
        // Edit scheme
        schemeInfo.name = newName;
        schemeInfo.description = newDescription;
        schemeInfo.intervals = newIntervals;
        // Switch languages using this scheme to edited version
        const languagesUsingScheme = srs.getLanguagesUsingScheme(schemeName);
        for (const language of languagesUsingScheme) {
            srs.switchScheme(language, newName);
        }
        return schemeInfo;
    };

    /**
     * Return interval texts for scheme with given name.
     * @param {String} schemeName - Name of SRS scheme to get intervals for.
     * @returns {Array[Integer]} - Array of size numLevels + 1 where entry at
     *     index i is the interval of SRS level i for given scheme in seconds.
     *     NOTE: First value is arbitrary, because levels start at 1.
     */
    srs.getIntervalTextsForScheme = function (schemeName) {
        for (const { name, intervals } of srs.schemes) {
            if (name === schemeName) return ["", ...intervals, "Infinity"];
        }
        throw new Error(
            `SRS scheme with name '${schemeName}' could not be found.`);
    };

    /**
     * Return number of levels in an SRS scheme (including last "infinity" one)
     * @param {String} schemeName - Name of SRS scheme to get information for.
     * @returns {Integer}
     */
    srs.getNumLevelsForScheme = function (schemeName) {
        return srs.getIntervalTextsForScheme(schemeName).length - 1;
    };

    /* =========================================================================
        Language dependent SRS scheme functions
    ========================================================================= */

    /**
     * Return list of languages using SRS scheme with given name.
     * @param {String} schemeName - Name of SRS scheme.
     * @returns {Array[String]}
     */
    srs.getLanguagesUsingScheme = function (schemeName) {
        const languagesUsingScheme = [];
        for (const language of modules.languages.all) {
            const used = modules.languageSettings.getFor(language, "srs.scheme")
            if (used === schemeName) {
                languagesUsingScheme.push(language);
            }
        }
        return languagesUsingScheme;
    };

    /**
     * Return list of languages using SRS scheme with given name.
     * Only languages which have at least one SRS item are considered.
     * @param {String} schemeName - Name of SRS scheme.
     * @returns {Promise(Array[String])}
     */
    srs.getNonEmptyLanguagesUsingScheme = function (schemeName) {
        const languages = srs.getLanguagesUsingScheme();
        const languagesNonEmpty = [];
        const promises = [];
        for (const language of languages) {
            const promise = srs.getAmountOfItems(language).then((amount) => {
                if (amount > 0) languagesNonEmpty.push(language);
            });
            promises.push(promise);
        }
        return Promise.all(promises).then(() => languagesNonEmpty);
    };

    srs.switchScheme = function (language, newSchemeName) {
        modules.languageSettings.setFor(language, "srs.scheme", newSchemeName);
        modules.languageSettings.save(language);
        srs.loadSchemeInfo(language);
        modules.stats.calculateScorePerLevel(language);
        return modules.stats.recalculateTotalScores(language);
    };

    srs.loadSchemeInfo = function (language) {
        const scheme = modules.languageSettings.getFor(language, "srs.scheme");
        const timeSpanNames = srs.getIntervalTextsForScheme(scheme);
        const intervalModifier = utility.timeSpanStringToSeconds(
            modules.settings.srs.intervalModifier);
        const timeSpans = timeSpanNames.map((t) => 
            utility.timeSpanStringToSeconds(t) - intervalModifier);
        dataMap[language].intervals = Object.freeze(timeSpans);
        dataMap[language].intervalTexts = Object.freeze(timeSpanNames);
        dataMap[language].numLevels = timeSpanNames.length - 1;
    }

    srs.getIntervalsForLanguage = function (language) {
        return dataMap[language].intervals;
    };

    /* =========================================================================
        Getting SRS info
    ========================================================================= */

    srs.getDueVocab = function (startTime=0) {
        return modules.database.query(
            `SELECT word FROM vocabulary
             WHERE review_date <= ? AND review_date > ? AND level > 0`,
            utility.getTime(), startTime)
        .then((rows) => rows.map((row) => row.word));
    };

    srs.getDueKanji = function (mode, startTime=0) {
        const table = modules.test.modeToTable(mode);
        return modules.database.query(
            `SELECT kanji FROM ${table}
             WHERE review_date <= ? AND review_date > ? AND level > 0`,
             utility.getTime(), startTime)
        .then((rows) => rows.map((row) => row.kanji));
    };

    srs.getDueHanzi = function (mode, startTime=0) {
        const table = modules.test.modeToTable(mode);
        return modules.database.query(
            `SELECT hanzi FROM ${table}
             WHERE review_date <= ? AND review_date > ? AND level > 0`,
             utility.getTime(), startTime)
        .then((rows) => rows.map((row) => row.hanzi));
    };

    srs.getAmounts = function () {
        const time = utility.getTime();
        const amounts = {};
        const promises = [];
        for (let level = 0; level <= srs.currentScheme.numLevels; ++level) {
            amounts[level] = {};
            for (const mode of modules.test.modes) {
                amounts[level][mode] = { due: 0, scheduled: 0 };
            }
        }
        for (const mode of modules.test.modes) {
            const table = modules.test.modeToTable(mode);
            promises.push(Promise.all([
                modules.database.query(
                    `SELECT level, COUNT(review_date) AS amount FROM ${table}
                     WHERE review_date <= ? GROUP BY level`, time),
                modules.database.query(
                    `SELECT level, COUNT(review_date) AS amount FROM ${table}
                     WHERE review_date > ? GROUP BY level`, time)
            ]).then(([amountDue, amountScheduled]) => {
                for (const { level, amount } of amountDue)
                    amounts[level][mode].due = amount;
                for (const { level, amount } of amountScheduled)
                    amounts[level][mode].scheduled = amount;
            }));
        }
        return Promise.all(promises).then(() => amounts);
    };

    srs.getTotalAmountDue = function () {
        return srs.getAmounts().then((amounts) => {
            let total = 0;
            for (const level in amounts) {
                for (const mode in amounts[level]) {
                    total += amounts[level][mode].due;
                }
            }
            return total;
        });
    };

    srs.getTotalAmountDueForLanguage = function (language) {
        const time = utility.getTime();
        const promises = [];
        for (const mode of modules.test.modesForLanguage(language)) {
            const table = modules.test.modeToTable(mode);
            const promise = modules.database.queryLanguage(language,
                `SELECT COUNT(review_date) AS amountDue FROM ${table}
                 WHERE review_date <= ?`, time)
            .then(([{amountDue}]) => amountDue);
            promises.push(promise);
        }
        return Promise.all(promises).then((amounts) => amounts.sum());
    };

    srs.getLevel = function (entry, mode) {
        const table = modules.test.modeToTable(mode);
        const column = modules.test.modeToColumn(mode);
        return modules.database.query(
            `SELECT level FROM ${table} WHERE ${column} = ?`, entry)
        .then(([{level}]) => level);
    };

    srs.getAmountOfItemsPerLevel = async function (language) {
        const modePromises = [];
        for (const mode of modules.test.modesForLanguage(language)) {
            const table = modules.test.modeToTable(mode);
            const column = modules.test.modeToColumn(mode);
            const promise = modules.database.queryLanguage(language, `
                SELECT level, COUNT(${column}) AS amount
                FROM ${table}
                GROUP BY level
            `).then((levelsAndAmounts) => {
                const levelToAmount = new Map();
                for (const { level, amount } of levelsAndAmounts) {
                    levelToAmount.set(level, amount);
                }
                return levelToAmount;
            });
            modePromises.push(promise);
        }
        const levelToAmountMaps = await Promise.all(modePromises);
        const levelToTotalAmount = new Map();
        const scheme = modules.languageSettings.getFor(language, "srs.scheme");
        const numLevels = srs.getNumLevelsForScheme(scheme);
        for (let level = 1; level <= numLevels; ++level) {
            levelToTotalAmount.set(level, 0);
        }
        for (const levelToAmount of levelToAmountMaps) {
            for (const [level, amount] of levelToAmount) {
                levelToTotalAmount.set(level,
                    levelToTotalAmount.get(level) + amount);
            }
        }
        return levelToTotalAmount;
    };

    srs.getAmountOfItems = function (language) {
        return srs.getAmountOfItemsPerLevel(language).then((levelToAmount) => {
            let totalAmount = 0;
            for (const [,amount] of levelToAmount) {
                totalAmount += amount;
            }
            return totalAmount;
        });
    };

    /**
     * Return a list containing numbers of SRS items scheduled for intervals
     * in the near future, starting from the current date.
     * @param {String} unit - Can be "hours", "weeks", "days" or "months".
     * @param {String} numUnits - Number of intervals to get schedule for.
     * @returns {Array} - Array with entries of the form { amount, endDate }.
     *     Each entry contains the number of SRS items scheduled for the i-th
     *     hour/day/month (starting to count from the current hour/day/month),
     *     and the end date of the interval (exclusive).
     */
    srs.getSchedule = function (unit, numUnits) {
        return utility.getTimeline(unit, numUnits, async (startDate,endDate)=> {
            const startSecs = parseInt(startDate.getTime() / 1000);
            const endSecs = parseInt(endDate.getTime() / 1000);
            const promises = [];
            for (const mode of modules.test.modes) {
                const table = modules.test.modeToTable(mode);
                promises.push(modules.database.query(
                    `SELECT COUNT(review_date) AS amount FROM ${table}
                     WHERE review_date BETWEEN ? AND ?`,
                    startSecs, endSecs-1).then(([{amount}]) => amount));
            }
            const amounts = await Promise.all(promises);
            return amounts.sum();
        });
    };

    /* =========================================================================
        Updating SRS info
    ========================================================================= */

    srs.setLevel = function (entry, newLevel, mode) {
        const table = modules.test.modeToTable(mode);
        const column = modules.test.modeToColumn(mode);
        const spacing = srs.currentScheme.intervals[newLevel];
        return modules.database.run(
            `UPDATE ${table} SET level = ?, review_date = ?
             WHERE ${column} = ?`,
            newLevel, utility.getTime() + spacing, entry);
    };

    /**
     * Migrate SRS items for given language from scheme defined by oldIntervals
     * to new scheme defined by newIntervals, according to given migration plan.
     * @param {String} language
     * @param {Array[Integer]} oldIntervals - Array of intervals for each level
     *     in the old scheme.
     * @param {Array[Integer]} newIntervals - Array of intervals for each level
     *     in the new scheme.
     * @param {Set[Integer->Array[Array[Integer, String]]]} migrationPlan -
     *     Maps each level from the old scheme to an array consisting of tuples
     *     of the form (newLevel, modifier), where newLevel is a level from the
     *     new scheme and modifier is a string specifying how the review date
     *     of each SRS item moved into this level should be adjusted to the 
     *     interval of the new level.
     *     The array of tuples should be ordered by the first entry of the
     *     tuples (i.e. number of new level). If more than one tuple is given, 
     *     an SRS item will be moved into the next level among given ones
     *     where the cumulative interval up that level is smaller than the
     *     time which the SRS item has already been scheduled in its current
     *     level.
     */
    srs.migrateItems = async function (
            language, oldIntervals, newIntervals, migrationPlan) {
        // Get SRS items with all necessary info for all testmodes
        const srsItemListPromises = [];
        const modes = modules.test.modesForLanguage(language);
        for (const mode of modes) {
            const table = modules.test.modeToTable(mode);
            const column = modules.test.modeToColumn(mode);
            srsItemListPromises.push(
                modules.database.queryLanguage(language,
                    `SELECT ${column} AS item,
                            level, review_date AS reviewDate FROM ${table}`));
        }
        const modeToItemList = {};
        // Map each mode to a list of their SRS items
        const srsItemLists = await Promise.all(srsItemListPromises);
        for (let i = 0; i < srsItemLists.length; ++i) {
            modeToItemList[modes[i]] = srsItemLists[i];
        }
        const itemPromises = [];
        const currentTime = utility.getTime();
        for (const mode in modeToItemList) {
            const srsItemList = modeToItemList[mode];
            const table = modules.test.modeToTable(mode);
            const column = modules.test.modeToColumn(mode);
            for (const { item, level, reviewDate } of srsItemList) {
                const oldInterval = oldIntervals[level];
                const timeUntilReview = Math.max(reviewDate - currentTime, 0);
                const timeScheduled = oldInterval - timeUntilReview;
                let finalLevel, finalReviewDate;
                let cumulativeInterval = 0;
                for (const [newLevel, modifier] of migrationPlan.get(level)) {
                    cumulativeInterval += newIntervals[newLevel];
                    const timeDiff = cumulativeInterval - oldInterval;
                    if (cumulativeInterval >= oldInterval) {
                        if (modifier === "+") {
                            // Postpone review date to fit into new level
                            finalReviewDate = reviewDate + timeDiff;
                        }
                        finalLevel = newLevel;
                        break;
                    } else {
                        if (timeScheduled < cumulativeInterval) {
                            if (modifier === "-" || modifier === "\u223c") {
                                // Bring review date forward
                                finalReviewDate = reviewDate + timeDiff;
                            }
                            finalLevel = newLevel;
                            break;
                        }
                    }
                }
                // Case that timeScheduled is larger than cumulative
                // intervals of all specified new levels.
                if (finalLevel === undefined) {
                    const [lastLevel, modifier] =
                        migrationPlan.get(level).last();
                    finalLevel = lastLevel;
                    if (modifier === "-") {
                        // Bring review date forward
                        const timeDiff = cumulativeInterval - oldInterval;
                        finalReviewDate = reviewDate + timeDiff;
                    }
                }
                if (finalReviewDate === undefined) {
                    finalReviewDate = reviewDate;
                }
                itemPromises.push(modules.database.runLanguage(language,
                    `UPDATE ${table} SET level = ?, review_date = ?
                     WHERE ${column} = ?`,
                    [finalLevel, finalReviewDate, item]));
            }
        }
        await Promise.all(itemPromises);
        modules.database.save(language);
    };
    
    return srs;
};
