"use strict";

// Internal objects set externally
let trainer;
let languageSettings;
let test;
let scoreCalculation;

module.exports.internals = {
    set trainer(obj) { trainer = obj; },
    set languageSettings(obj) { languageSettings = obj; },
    set test(obj) { test = obj; },
    set scoreCalculation(obj) { scoreCalculation = obj; }
}

module.exports.exports = {

    _data: null,
    _path: null,
    _levelToScore: null,

    load: function(path) {
        this._data = require(path);
        this._path = path;
        const timeIntervals = languageSettings["SRS"]["spacing"];
        // Precalculate amout of score for each SRS level
        this._levelToScore = { "0": 0 };
        for (let level = 1; level < timeIntervals.length; ++level) {
            const totalTime = timeIntervals.slice(1, level + 1).sum();
            for (let milestone in scoreCalculation["percentages"]) {
                if (totalTime > parseInt(milestone)) {
                    this._levelToScore[level] = 
                       (scoreCalculation["percentages"][milestone] *
                        scoreCalculation["scoreMultiplier"]);
                }
            }
        }
        Object.freeze(this._levelToScore);
    },

    save: function() {
        fs.writeFileSync(this._path, JSON.stringify(this._data));
    },

    /*
     *  Functions for updating stats
     */

    incrementTestedCounter: function(mode) {
        this.registerPassedDays();
        this._data["testedPerMode"][mode]++;
        this._data["daily"].last()["tested"]++;
    },

    incrementWordsAddedToday: function() {
        this.registerPassedDays();
        this._data["daily"].last()["words"]++;
    },

    incrementKanjiAddedToday: function() {
        this.registerPassedDays();
        this._data["daily"].last()["kanji"]++;
    },

    // TODO: Really necessary?
    // Append the days that have passed since the program was last started
    registerPassedDays: function() {
        const d = new Date();
        const newItems = [];
        let currentDate = [d.getFullYear(), d.getMonth() + 1, d.getDate()];
        const lastDate = this._data["daily"].last().date;
        while (lastDate[0] != currentDate[0] || lastDate[1] != currentDate[1] ||
               lastDate[2] != currentDate[2]) {
            // TODO: Dont append kanji if not japanese
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
            this._data["daily"].push(item);
    },

    updateDailyScore: function(mode, oldLevel, newLevel) {
        this.registerPassedDays();
        const oldScore = this._levelToScore[oldLevel];
        const newScore = this._levelToScore[newLevel];
        let difference = newScore - oldScore;
        difference *= scoreCalculation.modeToMultiplier[mode];
        this._data["daily"].last()["score"] += difference;
    },

    /*
     *  Functions for querying stats
     */

    getNumberOfItemsTested: function() {
        let total = 0;
        for (let mode of test.modes) {
            total += this._data["testedPerMode"][mode];
        }
        return total;
    },

    getTotalScore: function(mode) {
        // TODO: Accumulate score in stats.json instead of recalculating
        const table = test.modeToTable(mode);
        const multiplier = scoreCalculation.modeToMultiplier[mode];
        const addScore = (total, row) => total += this._levelToScore[row.level];
        return trainer.query(`SELECT level FROM ${table}`)
           .then((rows) => parseInt(rows.reduce(addScore, 0) * multiplier));
    }

};
