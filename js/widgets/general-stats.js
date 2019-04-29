"use strict";

class GeneralStats extends Widget {
    constructor() {
        super("general-stats");
        this.numAddedLabels = new Map();
        this.numTestedLabels = new Map();
        this.scoreLabels = new Map();
        events.on("word-added", () => {
            const language = dataManager.currentLanguage;
            this.numAddedLabels.get(language).textContent =
                parseInt(this.numAddedLabels.get(language).textContent) + 1;
            this.$("num-added-total").textContent =
                parseInt(this.$("num-added-total").textContent) + 1;
        });
        events.on("word-deleted", () => {
            const language = dataManager.currentLanguage;
            this.numAddedLabels.get(language).textContent =
                parseInt(this.numAddedLabels.get(language).textContent) - 1;
            this.$("num-added-total").textContent =
                parseInt(this.$("num-added-total").textContent) - 1;
        });
        events.on("item-reviewed", () => {
            const language = dataManager.currentLanguage;
            this.numTestedLabels.get(language).textContent =
                parseInt(this.numTestedLabels.get(language).textContent) + 1;
            this.$("num-tested-total").textContent =
                parseInt(this.$("num-tested-total").textContent) + 1;
        });
        events.onAll(["word-added", "word-deleted", "vocab-changed",
                      "kanji-added", "kanji-removed", "kanji-changed",
                      "hanzi-added", "hanzi-removed", "hanzi-changed",
                      "item-reviewed"], () => {
            const language = dataManager.currentLanguage;
            const newScore = dataManager.stats.getTotalScoreFor(language);
            const totalScore = dataManager.languages.all.reduce(
                (total, l) => total + dataManager.stats.getTotalScoreFor(l), 0);
            this.scoreLabels.get(language).textContent = newScore;
            this.$("score-total").textContent = totalScore;
        });
        events.on("srs-scheme-edited", (language) => {
            const newScore = dataManager.stats.getTotalScoreFor(language);
            const totalScore = dataManager.languages.all.reduce(
                (total, l) => total + dataManager.stats.getTotalScoreFor(l), 0);
            this.scoreLabels.get(language).textContent = newScore;
            this.$("score-total").textContent = totalScore;
        });
    }

    async update() {
        this.$("per-language").empty();
        this.numAddedLabels.clear();
        this.numTestedLabels.clear();
        this.scoreLabels.clear();
        const languages = dataManager.languages.visible;
        // Sort languages by mastery score
        languages.sort((l1, l2) => dataManager.stats.getTotalScoreFor(l2) -
                                   dataManager.stats.getTotalScoreFor(l1));
        let scoreTotal = 0;
        let numTestedTotal = 0;
        let numAddedTotal = 0;
        for (const lang of languages) {
            const score = dataManager.stats.getTotalScoreFor(lang);
            const numTested = dataManager.stats.getNumberOfItemsTestedFor(lang);
            const numAdded = await dataManager.vocab.sizeFor(lang);
            // Construct table row
            const row = document.createElement("div");
            row.classList.add("row");
            const languageLabel = document.createElement("div");
            languageLabel.classList.add("language-label");
            languageLabel.textContent = lang;
            row.appendChild(languageLabel);
            const numAddedLabel = document.createElement("div");
            numAddedLabel.textContent = numAdded;
            row.appendChild(numAddedLabel);
            this.numAddedLabels.set(lang, numAddedLabel);
            const numTestedLabel = document.createElement("div");
            numTestedLabel.textContent = numTested;
            row.appendChild(numTestedLabel);
            this.numTestedLabels.set(lang, numTestedLabel);
            const scoreLabel = document.createElement("div");
            scoreLabel.textContent = score;
            row.appendChild(scoreLabel);
            this.scoreLabels.set(lang, scoreLabel);
            this.$("per-language").appendChild(row);
            scoreTotal += score;
            numTestedTotal += numTested;
            numAddedTotal += numAdded;
        }
        this.$("num-added-total").textContent = numAddedTotal;
        this.$("num-tested-total").textContent = numTestedTotal;
        this.$("score-total").textContent = scoreTotal;
        this.$("total-row").toggleDisplay(languages.length > 1);
    }
}

customElements.define("general-stats", GeneralStats);
module.exports = GeneralStats;
