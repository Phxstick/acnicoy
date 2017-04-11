"use strict";

class StatsSection extends Section {
    constructor() {
        super("stats");
        // Configure diagram display  parameters
        this.$("jouyou-kanji").bottomLineWidth = 1;
        this.$("jouyou-kanji").topLineWidth = 1;
        this.$("jouyou-kanji").margin =
            { top: 0, bottom: 30, left: 20, right: 20 };
        this.$("jlpt-kanji").bottomLineWidth = 1;
        this.$("jlpt-kanji").topLineWidth = 1;
        this.$("jlpt-kanji").margin =
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
        this.$("jouyou-kanji").hide();
        this.$("jlpt-kanji").hide();
        if (language === "Japanese") {
            this.$("kanji-added-frame").show();
            this.$("kanji-diagrams").show();
            if (secondary === "English" &&
                    dataManager.content.isAvailable(language, secondary)) {
                this.$("jouyou-kanji").show();
                this.$("jlpt-kanji").show();
            } else {
                this.$("jouyou-kanji").hide();
                this.$("jlpt-kanji").hide();
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
        if (dataManager.currentLanguage === "Japanese") {
            // Display number of kanji added
            promises.push(dataManager.kanji.getAmountAdded().then((amount) => {
                this.$("kanji-added").textContent = amount;
            }));
            // Display percentages of jouyou kanjj per grade in bar diagram
            if (dataManager.currentSecondaryLanguage === "English" &&
                    dataManager.content.isAvailable("Japanese", "English")) {
                const numKanjiPerGrade =
                    dataManager.content.numKanjiPerGrade;
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
                        this.$("jouyou-kanji").draw(
                            values, { maxValues, descriptions }); 
                    });
                });
                // Display percentages of kanji per jlpt level in bar diagram
                const numKanjiPerJlptLevel =
                    dataManager.content.numKanjiPerJlptLevel;
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
                        this.$("jlpt-kanji").draw(
                            values, { maxValues, descriptions });
                    });
                });
            }
        }
        return Promise.all(promises);
    }
}

customElements.define("stats-section", StatsSection);
module.exports = StatsSection;
