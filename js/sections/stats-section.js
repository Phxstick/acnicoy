"use strict";

class StatsSection extends Section {
    constructor() {
        super("stats");
        // Store important elements
        this.totalScore = this.root.getElementById("total-score");
        this.wordsAdded = this.root.getElementById("words-added");
        this.kanjiAdded = this.root.getElementById("kanji-added");
        this.itemsTested = this.root.getElementById("items-tested");
        this.kanjiDiagrams = this.root.getElementById("kanji-diagrams");
        this.kanjiAddedFrame = this.root.getElementById("kanji-added-frame");
        this.jouyouKanjiDiagram = this.root.getElementById("jouyou-kanji");
        this.jlptKanjiDiagram = this.root.getElementById("jlpt-kanji");
        // Configure diagram display parameters
        this.jouyouKanjiDiagram.barWidth = 35;
        this.jouyouKanjiDiagram.bottomLineWidth = 2;
        this.jouyouKanjiDiagram.topLineWidth = 2;
        this.jouyouKanjiDiagram.margin =
            { top: 0, bottom: 30, left: 20, right: 20 };
        this.jlptKanjiDiagram.barWidth = 35;
        this.jlptKanjiDiagram.bottomLineWidth = 2;
        this.jlptKanjiDiagram.topLineWidth = 2;
        this.jlptKanjiDiagram.margin =
            { top: 0, bottom: 30, left: 20, right: 20 };
    }

    open() {
        this.updateStats();
    }

    adjustToLanguage(language, secondary) {
        this.jouyouKanjiDiagram.hide();
        if (language === "Japanese") {
            this.kanjiAddedFrame.show();
            this.kanjiDiagrams.show();
            if (dataManager.content.isAvailable[language]) {
                this.jouyouKanjiDiagram.show();
                this.jlptKanjiDiagram.show();
            } else {
                this.jouyouKanjiDiagram.hide();
                this.jlptKanjiDiagram.hide();
            }
        } else {
            this.kanjiAddedFrame.hide();
            this.kanjiDiagrams.hide();
        }
    }

    updateStats() {
        const promises = [];
        // Display number of items tested in total
        this.itemsTested.textContent =
            dataManager.stats.getNumberOfItemsTested();
        // Display total score for all specified modes
        const totalScorePromises = [];
        for (const mode of dataManager.test.modes) {
            totalScorePromises.push(dataManager.stats.getTotalScore(mode));
        }
        promises.push(Promise.all(totalScorePromises).then((totalScores) => {
            this.totalScore.textContent = totalScores.sum();
        }));
        // Display number of words added
        promises.push(dataManager.vocab.size().then((amount) => {
            this.wordsAdded.textContent = amount;
        }));
        if (main.language === "Japanese") {
            // Display number of kanji added
            promises.push(dataManager.kanji.getAmountAdded().then((amount) => {
                this.kanjiAdded.textContent = amount;
            }));
            // Display percentages of jouyou kanjj per grade in bar diagram
            if (dataManager.content.isAvailable["Japanese"]) {
                const numKanjiPerGrade =
                    dataManager.content.data.numKanjiPerGrade;
                dataManager.kanji.getAmountsAddedPerGrade().then((amounts) => {
                    const values = [];
                    const maxValues = [];
                    const descriptions = [];
                    for (let grade = 1; grade <= 6; ++grade) {
                        values.push(amounts[grade]);
                        maxValues.push(numKanjiPerGrade[grade]);
                        descriptions.push(
                            utility.getOrdinalNumberString(grade));
                    }
                    values.push(amounts[8]);
                    maxValues.push(numKanjiPerGrade[8]);
                    descriptions.push("Sec");
                    utility.finishEventQueue()
                    .then(() => this.jouyouKanjiDiagram.draw(
                            values, maxValues, descriptions));
                });
                // Display percentages of kanji per jlpt level in bar diagram
                const numKanjiPerJlptLevel =
                    dataManager.content.data.numKanjiPerJlptLevel;
                dataManager.kanji.getAmountsAddedPerJlptLevel()
                .then((amounts) => {
                    const values = [];
                    const maxValues = [];
                    const descriptions = [];
                    for (let level = 5; level >= 1; --level) {
                        values.push(amounts[level]);
                        maxValues.push(numKanjiPerJlptLevel[level]);
                        descriptions.push(`N${level}`);
                    }
                    utility.finishEventQueue()
                    .then(() => this.jlptKanjiDiagram.draw(
                            values, maxValues, descriptions));
                });
            }
        }
        return Promise.all(promises);
    }
}

customElements.define("stats-section", StatsSection);
module.exports = StatsSection;
