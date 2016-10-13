"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const stats = {};
    const dataMap = {};

    let data;
    let levelToScore;
    let scoreCalculation = Object.freeze(require(paths.scoreCalculation));

    stats.create = function (language, settings) {
        const initialStats = {
            daily: [],
            testedPerMode: {},
            scorePerMode: {}
        };
        for (let mode of modules.test.modesForLanguage(language)) {
            initialStats.testedPerMode[mode] = 0;
            initialStats.scorePerMode[mode] = 0;
        }
        const path = paths.languageData(language).stats;
        fs.writeFileSync(path, JSON.stringify(initialStats));
    };

    stats.load = function (language) {
        dataMap[language] = require(paths.languageData(language).stats);
    };

    stats.save = function () {
        for (let language in dataMap) {
            const path = paths.languageData(language).stats;
            fs.writeFileSync(path, JSON.stringify(dataMap[language]));
        }
    };

    stats.setLanguage = function (language) {
        data = dataMap[language];
        // Precalculate amout of score for each SRS level
        const timeIntervals = modules["language-settings"]["SRS"]["spacing"];
        levelToScore = { "0": 0 };
        for (let level = 1; level < timeIntervals.length; ++level) {
            const totalTime = timeIntervals.slice(1, level + 1).sum();
            for (let milestone in scoreCalculation["percentages"]) {
                if (totalTime > parseInt(milestone)) {
                    levelToScore[level] = 
                       (scoreCalculation["percentages"][milestone] *
                        scoreCalculation["scoreMultiplier"]);
                }
            }
        }
        Object.freeze(levelToScore);
    };

    /*
     *  Functions for updating stats
     */

    // TODO: Really necessary?
    // Append the days that have passed since the program was last started
    function registerPassedDays() {
        const d = new Date();
        const newItems = [];
        let currentDate = [d.getFullYear(), d.getMonth() + 1, d.getDate()];
        if (data["daily"].length === 0) {
            data["daily"].push({
                date: currentDate, score: 0, words: 0, kanji: 0, tested: 0 });
            return;
        }
        const lastDate = data["daily"].last().date;
        while (lastDate[0] != currentDate[0] || lastDate[1] != currentDate[1] ||
               lastDate[2] != currentDate[2]) {
            // TODO: Don't append kanji if not japanese
            newItems.push({
                date: currentDate, score: 0, words: 0, kanji: 0, tested: 0 });
            let [year, month, day] = currentDate;
            if (--day === 0) {
                if (--month === 0) {
                    --year;
                    month = 12;
                }
                day = new Date(year, month, 0).getDate();  // Last day of month
            }
            currentDate = [year, month, day];
        }
        newItems.reverse();
        for (let item of newItems)
            data["daily"].push(item);
    }


    stats.incrementTestedCounter = function (mode) {
        registerPassedDays();
        data["testedPerMode"][mode]++;
        data["daily"].last()["tested"]++;
    };

    stats.incrementWordsAddedToday = function () {
        registerPassedDays();
        data["daily"].last()["words"]++;
    };

    stats.incrementKanjiAddedToday = function () {
        registerPassedDays();
        data["daily"].last()["kanji"]++;
    };

    stats.updateDailyScore = function (mode, oldLevel, newLevel) {
        registerPassedDays();
        let difference = levelToScore[newLevel] - levelToScore[oldLevel];
        difference *= scoreCalculation.modeToMultiplier[mode];
        // Make sure the result is an integer
        console.assert(difference - parseInt(difference) < 0.000001,
            "ERROR: The score is not close enough to an integer: ", difference);
        data["daily"].last()["score"] += parseInt(difference);
    };

    /*
     *  Functions for querying stats
     */

    stats.getNumberOfItemsTested = function () {
        let total = 0;
        for (let mode of modules.test.modes) {
            total += data["testedPerMode"][mode];
        }
        return total;
    };

    stats.getTotalScore = function (mode) {
        // TODO: Accumulate score in stats.json instead of recalculating
        // const table = modules.test.modeToTable(mode);
        // const multiplier = scoreCalculation.modeToMultiplier[mode];
        // const addScore = (total, row) => total += levelToScore[row.level];
        // return modules.database.query(`SELECT level FROM ${table}`)
        //    .then((rows) => parseInt(rows.reduce(addScore, 0) * multiplier));
        return 0;
    };

    return stats;
};
