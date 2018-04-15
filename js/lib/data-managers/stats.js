"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const stats = {};
    const dataMap = {};
    const isModified = {};

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
        isModified[language] = false;
        stats.calculateScorePerLevel(language);
        return stats.recalculateTotalScores(language);
    };

    stats.unload = function (language) {
        delete dataMap[language];
        delete isModified[language];
    };

    stats.save = function (language) {
        if (!isModified[language]) return;
        const path = paths.languageData(language).stats;
        fs.writeFileSync(path, JSON.stringify(dataMap[language].data));
        isModified[language] = false;
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
                dataMap[language].levelToScore[level] =
                    scoreCalculation["scoreMultiplier"];
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
        Helper functions
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
            const dailyStatsObject = {
                date: currentDate, score: 0, words: 0, tested: 0
            };
            if (modules.currentLanguage === "Japanese") {
                dailyStatsObject.kanji = 0;
            }
            if (modules.currentLanguage === "Chinese") {
                dailyStatsObject.hanzi = 0;
            }
            newItems.push(dailyStatsObject);
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

    /* =========================================================================
        Updating stats
    ========================================================================= */

    stats.incrementTestedCounter = function (mode) {
        registerPassedDays();
        data.data["testedPerMode"][mode]++;
        data.data["daily"].last()["tested"]++;
        isModified[modules.currentLanguage] = true;
    };

    stats.incrementWordsAddedToday = function () {
        registerPassedDays();
        data.data["daily"].last()["words"]++;
        isModified[modules.currentLanguage] = true;
    };

    stats.incrementKanjiAddedToday = function () {
        registerPassedDays();
        data.data["daily"].last()["kanji"]++;
        isModified[modules.currentLanguage] = true;
    };

    stats.incrementHanziAddedToday = function () {
        registerPassedDays();
        data.data["daily"].last()["hanzi"]++;
        isModified[modules.currentLanguage] = true;
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
        isModified[modules.currentLanguage] = true;
        return difference;
    };

    /* =========================================================================
        Querying stats
    ========================================================================= */

    /**
     * Return total number of SRS items tested on for the given language.
     * @param {String} language
     * @returns {Number}
     */
    stats.getNumberOfItemsTestedFor = function (language) {
        let numTested = 0;
        for (const mode in dataMap[language].data.testedPerMode) {
            numTested += dataMap[language].data.testedPerMode[mode];
        }
        return numTested;
    };

    /**
     * Return total score for the given language (sum of scores for all modes).
     * @param {String} language
     * @returns {Number}
     */
    stats.getTotalScoreFor = function (language) {
        const modes = modules.test.modesForLanguage(language);
        let score = 0;
        for (const mode of modes) {
            score += dataMap[language].data.scorePerMode[mode];
        }
        return parseInt(score);
    };

    /**
     * Return a list containing the amounts of SRS items added recently for the
     * given languages.
     * @param {Array} languages
     * @param {String} unit - Can be "days" or "months".
     * @param {String} numUnits - Number of intervals in the timeline.
     * @returns {Array}
     */
    stats.getItemsAddedTimelineFor = function (languages, unit, numUnits) {
        return utility.getTimeline(unit, numUnits, async (startDate, endDate)=>{
            const startSecs = parseInt(startDate.getTime() / 1000);
            const endSecs = parseInt(endDate.getTime() / 1000);
            const numItemsPerLanguage = [];
            for (const language of languages) {
                let numItemsAdded = await modules.database.queryLanguage(
                        language, `SELECT COUNT(*) AS amount FROM vocabulary
                        WHERE date_added BETWEEN ? AND ?`, startSecs, endSecs-1)
                    .then(([{amount}]) => amount);
                if (language === "Japanese") {
                    numItemsAdded += await modules.database.queryLanguage(
                            language,`SELECT COUNT(*) AS amount FROM kanji WHERE
                            date_added BETWEEN ? AND ?`, startSecs, endSecs - 1)
                        .then(([{amount}]) => amount);
                }
                if (language === "Chinese") {
                    numItemsAdded += await modules.database.queryLanguage(
                            language,`SELECT COUNT(*) AS amount FROM hanzi WHERE
                            date_added BETWEEN ? AND ?`, startSecs, endSecs - 1)
                        .then(([{amount}]) => amount);
                }
                numItemsPerLanguage.push(numItemsAdded);
            }
            return numItemsPerLanguage;
        }, false);
    };

    /**
     * Return a list containing the amounts of items tested on recently for the
     * given languages.
     * @param {Array} languages
     * @param {String} unit - Can be "days" or "months".
     * @param {String} numUnits - Number of intervals in the timeline.
     * @returns {Array}
     */
    stats.getItemsTestedTimelineFor = function (languages, unit, numUnits) {
        const list = new Array(numUnits);
        for (let i = 0; i < numUnits; ++i) {
            list[i] = new Array(languages.length);
        }
        for (let j = 0; j < languages.length; ++j) {
            const dailyData = dataMap[languages[j]].data.daily;
            const numUnitsNonzero = Math.min(numUnits, dailyData.length);
            if (unit === "days") {
                for (let i = 0; i < numUnitsNonzero; ++i) {
                    list[i][j] = dailyData[dailyData.length - i - 1].tested;
                }
            } else if (unit === "months") {
                const d = new Date();
                let offset = 0;
                for (let i = 0; i < numUnitsNonzero; ++i) {
                    const start = dailyData.length - offset;
                    const nDays = utility.daysInMonth(d.getMonth(), d.getYear())
                    list[i][j] = dailyData.slice(start - nDays, start)
                        .reduce((total, dayObj) => total += dayObj.tested, 0);
                    offset += nDays;
                    d.setMonth(d.getMonth() - 1);
                }
            }
            for (let i = numUnitsNonzero; i < numUnits; ++i) {
                list[i][j] = 0;
            }
        }
        return utility.getTimeline(unit, numUnits, (sd,ed,i) => list[i], false);
    };

    return stats;
};
