"use strict";

module.exports = function (paths, modules) {
    const srs = {};

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

    srs.getIntervalsForScheme = function (schemeName) {
        for (const { name, intervals } of srs.schemes) {
            if (name === schemeName) return intervals;
        }
        throw Error(`SRS scheme with name '${schemeName}' could not be found.`);
    };

    srs.setLanguage = function (language) {
        const scheme = modules.languageSettings["srs"]["scheme"];
        const timeSpanNames = srs.getIntervalsForScheme(scheme);
        const timeSpans =
            timeSpanNames.map((t) => utility.timeSpanStringToSeconds(t));
        srs.intervals = Object.freeze([0, ...timeSpans, 1000000000000]);
        srs.intervalTexts = Object.freeze([0, ...timeSpanNames, "Infinity"]);
        srs.numLevels = srs.intervals.length;
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
        const amounts = {};
        const promises = [];
        for (let level = 0; level < srs.numLevels; ++level) {
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
        const colName = mode === modules.test.mode.WORDS ? "word" : "kanji";
        return modules.database.query(
            `SELECT level FROM ${table} WHERE ${colName} = ?`, entry)
        .then(([{level}]) => level);
    };

    srs.setLevel = function (entry, newLevel, mode) {
        const table = modules.test.modeToTable(mode);
        const colName = mode === modules.test.mode.WORDS ? "word" : "kanji";
        const spacing = srs.intervals[newLevel];
        return modules.database.run(
            `UPDATE ${table} SET level = ?, review_date = ?
             WHERE ${colName} = ?`,
            newLevel, utility.getTime() + spacing, entry);
    };
    
    return srs;
};
