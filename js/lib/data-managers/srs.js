"use strict";

module.exports = function (paths, modules) {
    const srs = {};
    
    srs.getNumberOfLevels = function () {
        return modules.languageSettings["SRS"]["spacing"].length;
    };

    srs.getScheduledVocab = function () {
        return modules.database.query(
            "SELECT entry FROM vocabulary WHERE time <= ? AND level > 0",
            utility.getTime())
        .then((rows) => rows.map((row) => row.entry));
    };

    // TODO: Don't use word "scheduled" for items that are ready to be tested

    srs.getScheduledKanji = function (mode) {
        const table = modules.test.modeToTable(mode);
        return modules.database.query(
            `SELECT entry FROM ${table} WHERE time <= ? AND level > 0`,
             utility.getTime())
        .then((rows) => rows.map((row) => row.entry));
    };

    srs.getAmountsScheduled = function () {
        const time = utility.getTime();
        const numLevels = modules.languageSettings["SRS"]["spacing"].length;
        const counts = {};
        const promises = [];
        for (let mode of modules.test.modes) {
            const table = modules.test.modeToTable(mode);
            counts[mode] = new Array(numLevels);
            for (let level = 0; level < numLevels; ++level)
                counts[mode][level] = { count: 0, scheduled: 0 };
            promises.push(Promise.all([
                modules.database.query(
                    `SELECT level, COUNT(entry) AS amount FROM ${table}
                     WHERE time <= ? GROUP BY level`, time),
                modules.database.query(
                    `SELECT level, COUNT(entry) AS amount FROM ${table}
                     WHERE time > ? GROUP BY level`, time)
            ]).then(([amountsReady, amountsScheduled]) => {
                for (let { level, amount } of amountsReady)
                    counts[mode][level].count = amount;
                for (let { level, amount } of amountsScheduled)
                    counts[mode][level].scheduled = amount;
            }));
        }
        return Promise.all(promises).then(() => counts);
    };

    srs.getTotalAmountScheduled = function () {
        return srs.getAmountsScheduled().then((counts) => {
            let total = 0;
            for (let mode in counts) {
                for (let level of counts[mode]) {
                    total += level.count;
                }
            }
            return total;
        });
    };

    srs.getTotalAmountScheduledForLanguages = function (languages) {
        const currentLanguage = modules.languages.currentLanguage;
        const modes = {};
        // Get necessary data for all languages
        for (let language of languages) {
            modules.test.setLanguage(language);
            modes[language] = modules.test.modes;
        }
        modules.test.setLanguage(currentLanguage);
        // Use data to get scheduled words for each language
        const time = utility.getTime();
        const counts = {};
        const promises = [];
        for (let language of languages) {
            counts[language] = 0;
            for (let mode of modes[language]) {
                const table = modules.test.modeToTable(mode);
                const promise = modules.database.queryLanguage(language,
                    `SELECT COUNT(entry) AS count FROM ${table}
                     WHERE time <= ?`, time)
                .then((results) => {
                    counts[language] += results[0].count;
                });
                promises.push(promise);
            }
        }
        return Promise.all(promises).then(() => counts);
    };

    srs.getLevel = function (entry, mode) {
        const table = modules.test.modeToTable(mode);
        return modules.database.query(
            `SELECT level FROM ${table} WHERE entry = ?`, entry)
        .then((rows) => rows[0].level);
    };

    srs.setLevel = function (entry, newLevel, mode) {
        const table = modules.test.modeToTable(mode);
        const spacing = modules.languageSettings["SRS"]["spacing"][newLevel];
        return modules.database.run(
            `UPDATE ${table} SET level = ?, time = ? WHERE entry = ?`,
            newLevel, utility.getTime() + spacing, entry);
    };
    
    return srs;
};
