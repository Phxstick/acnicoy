"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const stats = {};
    const dataMap = {};

    let data;
    const scoreCalculation = Object.freeze(require(paths.scoreCalculation));

    stats.create = function (language, settings) {
        const initialStats = {
            daily: [],
            testedPerMode: {},
            scorePerMode: {}
        };
        for (const mode of modules.test.modesForLanguage(language)) {
            initialStats.testedPerMode[mode] = 0;
            initialStats.scorePerMode[mode] = 0;
        }
        const path = paths.languageData(language).stats;
        fs.writeFileSync(path, JSON.stringify(initialStats));
    };

    stats.load = function (language) {
        dataMap[language] = {
            data: require(paths.languageData(language).stats)
        };
        stats.calculateScorePerLevel(language);
        return stats.recalculateTotalScores(language);
    };

    stats.save = function () {
        for (const language in dataMap) {
            const path = paths.languageData(language).stats;
            fs.writeFileSync(path, JSON.stringify(dataMap[language].data));
        }
    };

    stats.setLanguage = function (language) {
        data = dataMap[language];
    };

    /* =========================================================================
        Initialization Functions
    ========================================================================= */

    /**
     * Calculate amount of score for each SRS level for given language.
     * Interpolate scores between milestones from scoreCalculation.json.
     * @param {String} language
     */
    stats.calculateScorePerLevel = function (language) {
        const timeIntervals = modules.srs.getIntervalsForLanguage(language);
        const milestones =
            Reflect.ownKeys(scoreCalculation.percentages)
            .map(timeString => parseInt(timeString))
            .sort((a, b) => a - b);
        const percentages = [];
        for (const milestone of milestones) {
            percentages.push(scoreCalculation["percentages"][milestone]);
        }
        dataMap[language].levelToScore = { "0": 0 };
        for (let level = 1; level < timeIntervals.length; ++level) {
            const totalTime = timeIntervals.slice(1, level + 1).sum();
            if (totalTime > milestones.last()) {
                dataMap[language].levelToScore[level] = 1;
                continue;
            }
            let i = 1;
            while (totalTime > milestones[i]) ++i;
            const milestone = milestones[i];
            const prevMilestone = milestones[i - 1];
            const deltaTotal = milestone - prevMilestone;
            const delta = totalTime - prevMilestone;
            const ratio = delta / deltaTotal;
            dataMap[language].levelToScore[level] = (percentages[i - 1]
                + ratio * (percentages[i] - percentages[i - 1]))
                * scoreCalculation["scoreMultiplier"];
        }
        Object.freeze(dataMap[language].levelToScore);
    }

    /**
     * Recalculate total score for each testmode for given language.
     * @param {String} language
     * @returns {Promise}
     */
    stats.recalculateTotalScores = function (language) {
        const promises = [];
        for (const mode of modules.test.modesForLanguage(language)) {
            const table = modules.test.modeToTable(mode);
            const multiplier = scoreCalculation.modeToMultiplier[mode];
            const addScore = (total, row) => {
                return total + dataMap[language].levelToScore[row.level];
            };
            const promise = modules.database.queryLanguage(
                language, `SELECT level FROM ${table}`)
            .then((rows) => {
                dataMap[language].data.scorePerMode[mode] = 
                    rows.reduce(addScore, 0) * multiplier;
            });
            promises.push(promise);
        }
        return Promise.all(promises);
    }

    /* =========================================================================
        Updating stats
    ========================================================================= */

    /**
     * Append the days that have passed since the program was last started.
     */
    function registerPassedDays() {
        const d = new Date();
        const newItems = [];
        let currentDate = [d.getFullYear(), d.getMonth() + 1, d.getDate()];
        if (data.data["daily"].length === 0) {
            data.data["daily"].push({
                date: currentDate, score: 0, words: 0, kanji: 0, tested: 0 });
            return;
        }
        const lastDate = data.data["daily"].last().date;
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
        data.data["daily"].push(...newItems);
    }


    stats.incrementTestedCounter = function (mode) {
        registerPassedDays();
        data.data["testedPerMode"][mode]++;
        data.data["daily"].last()["tested"]++;
    };

    stats.incrementWordsAddedToday = function () {
        registerPassedDays();
        data.data["daily"].last()["words"]++;
    };

    stats.incrementKanjiAddedToday = function () {
        registerPassedDays();
        data.data["daily"].last()["kanji"]++;
    };

    /**
     * Update score according to the amount of score that corresponds to moving
     * an SRS item of given mode from given old level to given new level.
     * @param {String} mode - Testmode of the moved SRS item.
     * @param {Number} oldLevel - Previous SRS level of the moved SRS item.
     * @param {Number} newLevel - New SRS level of the moved SRS item.
     */
    stats.updateScore = function (mode, oldLevel, newLevel) {
        registerPassedDays();
        const difference = (data.levelToScore[newLevel] -
                            data.levelToScore[oldLevel])
                            * scoreCalculation.modeToMultiplier[mode];
        data.data["daily"].last()["score"] += difference;
        data.data["scorePerMode"][mode] += difference;
    };

    /* =========================================================================
        Querying stats
    ========================================================================= */

    /**
     * Return total number of items tested.
     * @returns {Number}
     */
    stats.getNumberOfItemsTested = function () {
        return modules.test.modes.reduce((total, mode) => {
            return total + data.data["testedPerMode"][mode];
        }, 0);
    };

    /**
     * Return total score for given testmode.
     * @returns {Number}
     */
    stats.getScoreForMode = function (mode) {
        return data.data["scorePerMode"][mode];
    };

    /**
     * Return total score (Sum of scores for all modes).
     * @returns {Number}
     */
    stats.getTotalScore = function() {
        return parseInt(modules.test.modes.reduce((total, mode) => {
           return total + stats.getScoreForMode(mode);
        }, 0));
    };

    return stats;
};
