"use strict";

module.exports = function (paths, modules) {
    const srs = {};
    
    srs.getNumberOfLevels = function () {
        return modules["language-settings"]["SRS"]["spacing"].length;
    };

    srs.getDueVocab = function () {
        return modules.database.query(
            "SELECT word FROM vocabulary WHERE review_date <= ? AND level > 0",
            utility.getTime())
        .then((rows) => rows.map((row) => row.word));
    };

    srs.getDueKanji = function (mode) {
        const table = modules.test.modeToTable(mode);
        return modules.database.query(
            `SELECT kanji FROM ${table} WHERE review_date <= ? AND level > 0`,
             utility.getTime())
        .then((rows) => rows.map((row) => row.kanji));
    };

    srs.getAmounts = function () {
        const time = utility.getTime();
        const numLevels = modules["language-settings"]["SRS"]["spacing"].length;
        const amounts = {};
        const promises = [];
        for (let level = 0; level < numLevels; ++level) {
            amounts[level] = {};
            for (let mode of modules.test.modes) {
                amounts[level][mode] = { due: 0, scheduled: 0 };
            }
        }
        for (let mode of modules.test.modes) {
            const table = modules.test.modeToTable(mode);
            promises.push(Promise.all([
                modules.database.query(
                    `SELECT level, COUNT(review_date) AS amount FROM ${table}
                     WHERE review_date <= ? GROUP BY level`, time),
                modules.database.query(
                    `SELECT level, COUNT(review_date) AS amount FROM ${table}
                     WHERE review_date > ? GROUP BY level`, time)
            ]).then(([amountDue, amountScheduled]) => {
                for (let { level, amount } of amountDue)
                    amounts[level][mode].due = amount;
                for (let { level, amount } of amountScheduled)
                    amounts[level][mode].scheduled = amount;
            }));
        }
        return Promise.all(promises).then(() => amounts);
    };

    srs.getTotalAmountDue = function () {
        return srs.getAmounts().then((amounts) => {
            let total = 0;
            for (let level in amounts) {
                for (let mode in amounts[level]) {
                    total += amounts[level][mode].due;
                }
            }
            return total;
        });
    };

    srs.getTotalAmountDueForLanguages = function (languages) {
        const time = utility.getTime();
        const amounts = {};
        const promises = [];
        for (let language of languages) {
            amounts[language] = 0;
            for (let mode of modules.test.modesForLanguage(language)) {
                const table = modules.test.modeToTable(mode);
                const promise = modules.database.queryLanguage(language,
                    `SELECT COUNT(review_date) AS amountDue FROM ${table}
                     WHERE review_date <= ?`, time)
                .then(([{amountDue}]) => {
                    amounts[language] += amountDue;
                });
                promises.push(promise);
            }
        }
        return Promise.all(promises).then(() => amounts);
    };

    srs.getLevel = function (entry, mode) {
        const table = modules.test.modeToTable(mode);
        const colName = mode === modules.test.mode.WORDS ? "word" : "kanji";
        return modules.database.query(
            `SELECT level FROM ${table} WHERE ${colName} = ?`, entry)
        .then(([{level}]) => level);
    };

    srs.setLevel = function (entry, newLevel, mode) {
        const table = modules.test.modeToTable(mode);
        const colName = mode === modules.test.mode.WORDS ? "word" : "kanji";
        const spacing = modules.languageSettings["SRS"]["spacing"][newLevel];
        return modules.database.run(
            `UPDATE ${table} SET level = ?, review_date = ?
             WHERE ${colName} = ?`,
            newLevel, utility.getTime() + spacing, entry);
    };
    
    return srs;
};
