"use strict";

// Internal objects set externally
let trainer;
let test;
let languageSettings;

module.exports.internals = {
    set trainer(obj) { trainer = obj; },
    set test(obj) { test = obj; },
    set languageSettings(obj) { languageSettings = obj; }
};


function getNumberOfLevels() {
    return languageSettings["SRS"]["spacing"].length;
}


function getScheduledVocab() {
    return trainer.query(
        "SELECT entry FROM vocabulary WHERE time <= ? AND level > 0",
        utility.getTime())
    .then((rows) => rows.map((row) => row.entry));
}


function getScheduledKanji(mode) {
    const table = test.modeToTable(mode);
    return trainer.query(
        `SELECT entry FROM ${table} WHERE time <= ? AND level > 0`,
         utility.getTime())
    .then((rows) => rows.map((row) => row.entry));
}


function getAmountsScheduled() {
    const time = utility.getTime();
    const numLevels = languageSettings["SRS"]["spacing"].length;
    const counts = {};
    const promises = [];
    for (let mode of test.modes) {
        const table = test.modeToTable(mode);
        counts[mode] = new Array(numLevels);
        for (let level = 0; level < numLevels; ++level)
            counts[mode][level] = { count: 0, scheduled: 0 };
        promises.push(Promise.all([
            trainer.query(`SELECT level, COUNT(entry) AS count FROM ${table}
                           WHERE time <= ? GROUP BY level`, time),
            trainer.query(`SELECT level, COUNT(entry) AS scheduled FROM ${table}
                           WHERE time > ? GROUP BY level`, time)
        ]).then((results) => {
            for (let row of results[0])
                counts[mode][row.level].count = row.count;
            for (let row of results[1])
                counts[mode][row.level].scheduled = row.scheduled;
        }));
    }
    return Promise.all(promises).then(() => counts);
}


function getTotalAmountScheduled() {
    return getAmountsScheduled().then((counts) => {
        let total = 0;
        for (let mode in counts) {
            for (let level of counts[mode]) {
                total += level.count;
            }
        }
        return total;
    });
}


function getLevel(entry, mode) {
    const table = test.modeToTable(mode);
    return trainer.query(`SELECT level FROM ${table} WHERE entry = ?`, entry)
    .then((rows) => rows[0].level);
}


function setLevel(entry, newLevel, mode) {
    const table = test.modeToTable(mode);
    const spacing = languageSettings["SRS"]["spacing"][newLevel];
    return trainer.run(
        `UPDATE ${table} SET level = ?, time = ? WHERE entry = ?`,
        newLevel, utility.getTime() + spacing, entry);
}


module.exports.exports = {
    getNumberOfLevels: getNumberOfLevels,
    getScheduledVocab: getScheduledVocab,
    getScheduledKanji: getScheduledKanji,
    getAmountsScheduled: getAmountsScheduled,
    getTotalAmountScheduled: getTotalAmountScheduled,
    getLevel: getLevel,
    setLevel: setLevel
};
