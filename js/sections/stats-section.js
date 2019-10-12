"use strict";

// const dateFormat = require("dateformat");
const schedule = require("node-schedule");

class StatsSection extends Section {
    constructor() {
        super("stats");
        const numSteps = { "days": 61, "months": 36 };

        this.$("words-added-timeline").reverse = true;
        this.$("words-added-timeline").minMaxValue = 20;
        this.$("words-added-timeline").setUnits(["days", "months"], "days");
        this.$("words-added-timeline").setInfoText("Items added in the last");
        this.$("words-added-timeline").setDataCallback((unit) =>
            dataManager.stats.getItemsAddedTimelineFor(
                dataManager.languages.visible, unit, numSteps[unit]));

        this.$("srs-reviews-timeline").reverse = true;
        this.$("srs-reviews-timeline").minMaxValue = 50;
        this.$("srs-reviews-timeline").setUnits(["days", "months"], "days");
        this.$("srs-reviews-timeline").setInfoText("Items reviewed in the last")
        this.$("srs-reviews-timeline").setDataCallback((unit) =>
            dataManager.stats.getItemsTestedTimelineFor(
                dataManager.languages.visible, unit, numSteps[unit]));

        const settingsLinks = this.$$(".settings-link");
        for (const link of settingsLinks) {
            link.addEventListener("click", () => {
                main.openSection("settings");
                main.sections["settings"].openSubsection("languages");
            });
        }
    }

    registerCentralEventListeners() {
        events.onAll(["language-added", "language-removed", "vocab-imported",
                      "language-visibility-changed"], () => this.initStats());
        events.on("word-added", () => {
            const visibleLanguages = dataManager.languages.visible;
            this.$("words-added-timeline").incrementLastValue(
                visibleLanguages.indexOf(dataManager.currentLanguage));
        });
        events.on("word-deleted", () => {
            const visibleLanguages = dataManager.languages.visible;
            this.$("words-added-timeline").decrementLastValue(
                visibleLanguages.indexOf(dataManager.currentLanguage));
        });
        events.on("item-reviewed", () => {
            const visibleLanguages = dataManager.languages.visible;
            this.$("srs-reviews-timeline").incrementLastValue(
                visibleLanguages.indexOf(dataManager.currentLanguage));
        });
        events.on("kanji-added", (kanji) => this.updateKanjiStats(kanji,true));
        events.on("kanji-removed", (kanji)=>this.updateKanjiStats(kanji,false));
        events.on("hanzi-added", (hanzi) => this.updateHanziStats(hanzi,true));
        events.on("hanzi-removed", (hanzi)=>this.updateHanziStats(hanzi,false));
    }

    open() {
        if (this.recentlyInitialized) {
            this.$("words-added-timeline").moveViewToRightEnd();
            this.$("srs-reviews-timeline").moveViewToRightEnd();
        }
        this.recentlyInitialized = false;
    }

    async initialize() {
        await this.initStats();
        // Redraw the diagrams when new day starts (in order to shift diagram)
        schedule.scheduleJob("0 0 * * *", () => {
            this.$("words-added-timeline").drawTimeline();
            this.$("srs-reviews-timeline").drawTimeline();
            this.$("words-added-timeline").moveViewToRightEnd();
            this.$("srs-reviews-timeline").moveViewToRightEnd();
        });
    }

    async processLanguageContent(language, secondaryLanguage) {
        if (language === "Japanese") {
            await this.initKanjiStats();
        } else if (language === "Chinese") {
            await this.initHanziStats();
        }
    }

    async initStats() {
        await this.$("general-stats").update();
        const languages = dataManager.languages.visible;
        this.$("words-added-timeline").setLegend(languages);
        this.$("srs-reviews-timeline").setLegend(languages);
        this.$("words-added-timeline").toggleLegend(languages.length > 1);
        this.$("srs-reviews-timeline").toggleLegend(languages.length > 1);
        await this.$("words-added-timeline").drawTimeline();
        await this.$("srs-reviews-timeline").drawTimeline();
        await this.initKanjiStats();
        await this.initHanziStats();
        this.recentlyInitialized = true;
    }

    async initKanjiStats() {
        if (!dataManager.languages.visible.includes("Japanese")) {
            this.$("kanji-stats").hide();
            return;
        }
        this.$("kanji-stats").show();
        dataManager.kanji.getAmountAdded().then((amount) => {
            this.$("kanji-count").textContent = amount;
        });
        if (!dataManager.content.isLoadedFor("Japanese", "English")) {
            this.$("kanji-stats-detailed").hide();
            this.$("kanji-data-not-loaded").show();
            return;
        }
        const content = dataManager.content.get("Japanese", "English");
        this.$("kanji-stats-detailed").show();
        this.$("kanji-data-not-loaded").hide();
        await content.updateUserData();  // Needed to count in newly added kanji
        const kanjiPerLevel = await
                dataManager.kanji.getAmountsAddedPerJlptLevel();
        const kanjiPerGrade = await
                dataManager.kanji.getAmountsAddedPerGrade();
        this.$("kanji-by-jlpt").empty();
        this.$("kanji-by-grade").empty();
        const makeLabel = (text, numAdded, numTotal) => {
            const div = document.createElement("div");
            div.innerHTML =
`<div>
<div class="detail-label">${text}</div>
<div class="num-added">${numAdded}</div>
<div class="detail-total">of ${numTotal}</div>
</div>`;
            return div;
        };
        for (let level = 5; level >= 1; --level) {
            let numAdded = kanjiPerLevel[level];
            if (numAdded === undefined) numAdded = 0;
            const numTotal = content.numKanjiPerJlptLevel[level];
            this.$("kanji-by-jlpt").appendChild(
                makeLabel(`JLPT ${level}`, numAdded, numTotal));
        }
        for (let grade = 1; grade <= 6; ++grade) {
            let numAdded = kanjiPerGrade[grade];
            if (numAdded === undefined) numAdded = 0;
            const numTotal = content.numKanjiPerGrade[grade];
            this.$("kanji-by-grade").appendChild(
                makeLabel(`Grade ${grade}`, numAdded, numTotal));
        }
        let numSecondary = kanjiPerGrade[8];
        if (numSecondary === undefined) numSecondary = 0;
        this.$("kanji-by-grade").appendChild(makeLabel(
            `Grade 7+`, numSecondary, content.numKanjiPerGrade[8]));
    }

    initHanziStats() {
        if (dataManager.languages.visible.includes("Chinese")) {
            this.$("hanzi-stats").show();
            dataManager.hanzi.getAmountAdded().then((amount) => {
                this.$("hanzi-count").textContent = amount;
            });
            if (dataManager.content.isLoadedFor("Chinese", "English")) {
                this.$("hanzi-stats-detailed").show();
                this.$("hanzi-data-not-loaded").hide();
                // TODO: show more detailed hanzi stats (when data is available)
            } else {
                this.$("hanzi-stats-detailed").hide();
                this.$("hanzi-data-not-loaded").show();
            }
        } else {
            this.$("hanzi-stats").hide();
        }
    }

    async updateKanjiStats(kanji, added) {
        // Update general counter
        const previousAmount = parseInt(this.$("kanji-count").textContent);
        this.$("kanji-count").textContent = previousAmount + (added ? 1 : -1);

        // Get kanji info if language data is loaded
        if (!dataManager.content.isLoadedFor("Japanese", "English")) return;
        const content = dataManager.content.get("Japanese", "English");
        const kanjiInfo = await content.getKanjiInfo(kanji);

        // Update corresponding counter in the JLPT row
        if (kanjiInfo.jlptLevel) {
            const jlptIndex = 5 - kanjiInfo.jlptLevel;
            const jlptCountElement = this.$("kanji-by-jlpt").children[jlptIndex]
            const jlptCount = jlptCountElement.querySelector(".num-added");
            jlptCount.textContent =
                parseInt(jlptCount.textContent) + (added ? 1 : -1);
        }

        // Update corresponding counter in the grade row
        if (kanjiInfo.grade > 0 && kanjiInfo.grade < 9) {
            const gradeIndex = kanjiInfo.grade === 8 ? 6 : kanjiInfo.grade - 1;
            const gradeCountElement =
                this.$("kanji-by-grade").children[gradeIndex];
            const gradeCount = gradeCountElement.querySelector(".num-added");
            gradeCount.textContent =
                parseInt(gradeCount.textContent) + (added ? 1 : -1);
        }
    }

    async updateHanziStats(hanzi, added) {
        // Update general counter
        const previousAmount = parseInt(this.$("hanzi-count").textContent);
        this.$("hanzi-count").textContent = previousAmount + (added ? 1 : -1);
    }
}

customElements.define("stats-section", StatsSection);
module.exports = StatsSection;
