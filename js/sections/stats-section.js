"use strict";

class StatsSection extends Section {
    constructor() {
        super("stats");
        // Store important elements
        this.jouyouKanjiDiagram = this.$("jouyou-kanji");
        this.jlptKanjiDiagram = this.$("jlpt-kanji");
        // Configure diagram display  parameters
        this.jouyouKanjiDiagram.bottomLineWidth = 1;
        this.jouyouKanjiDiagram.topLineWidth = 1;
        this.jouyouKanjiDiagram.margin =
            { top: 0, bottom: 30, left: 20, right: 20 };
        this.jlptKanjiDiagram.bottomLineWidth = 1;
        this.jlptKanjiDiagram.topLineWidth = 1;
        this.jlptKanjiDiagram.margin =
            { top: 0, bottom: 30, left: 20, right: 20 };
    }

    registerCentralEventListeners() {
        events.onAll(
            ["word-added", "word-deleted", "kanji-added", "kanji-removed",
             "current-srs-scheme-edited"],
        () => {
            if (this.isHidden()) return;
            this.updateStats();
        });
    }

    open() {
        this.updateStats();
    }

    adjustToLanguage(language, secondary) {
        this.jouyouKanjiDiagram.hide();
        if (language === "Japanese") {
            this.$("kanji-added-frame").show();
            this.$("kanji-diagrams").show();
            if (dataManager.content.isAvailable[language]) {
                this.jouyouKanjiDiagram.show();
                this.jlptKanjiDiagram.show();
            } else {
                this.jouyouKanjiDiagram.hide();
                this.jlptKanjiDiagram.hide();
            }
        } else {
            this.$("kanji-added-frame").hide();
            this.$("kanji-diagrams").hide();
        }
    }

    updateStats() {
        const promises = [];
        // Display number of items tested in total
        this.$("items-tested").textContent =
            dataManager.stats.getNumberOfItemsTested();
        // Display total score
        this.$("total-score").textContent = dataManager.stats.getTotalScore();
        // Display number of words added
        promises.push(dataManager.vocab.size().then((amount) => {
            this.$("words-added").textContent = amount;
        }));
        if (main.language === "Japanese") {
            // Display number of kanji added
            promises.push(dataManager.kanji.getAmountAdded().then((amount) => {
                this.$("kanji-added").textContent = amount;
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
                    .then(() => {
                        this.jouyouKanjiDiagram.draw(
                            values, maxValues, descriptions);
                    });
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
                    .then(() => {
                        this.jlptKanjiDiagram.draw(
                            values, maxValues, descriptions)
                    });
                });
            }
        }
        return Promise.all(promises);
    }
}

customElements.define("stats-section", StatsSection);
module.exports = StatsSection;
