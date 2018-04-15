"use strict";

const dateFormat = require("dateformat");

class StatsSection extends Section {
    constructor() {
        super("stats");
        const numSteps = { "days": 61, "months": 36 };
        this.$("words-added-timeline").reverse = true;
        this.$("words-added-timeline").setUnits(["days", "months"], "days");
        this.$("words-added-timeline").setInfoText("Items added in the last");
        this.$("words-added-timeline").setDataCallback((unit) =>
            dataManager.stats.getItemsAddedTimelineFor(
                dataManager.languages.visible, unit, numSteps[unit]));
        this.$("srs-reviews-timeline").reverse = true;
        this.$("srs-reviews-timeline").setUnits(["days", "months"], "days");
        this.$("srs-reviews-timeline").setInfoText("Items reviewed in the last")
        this.$("srs-reviews-timeline").setDataCallback((unit) =>
            dataManager.stats.getItemsTestedTimelineFor(
                dataManager.languages.visible, unit, numSteps[unit]));
        this.$("words-added-timeline").showLegend();
        this.$("srs-reviews-timeline").showLegend();
        // this.achievementIdToNode = new Map();

        // const globalAchievements = dataManager.achievements.getUnlockedGlobal();

        // const fragment = document.createDocumentFragment();
        // for (const { achievementId, levels } of globalAchievements) {
        //     levels.reverse();
        //     const achievementNode = document.createElement("div");
        //     const achievementFragment = document.createDocumentFragment();
        //     for (const { name, tier, description, unlockDate } of levels) {
        //         const unlockDateString = "Unlocked on " +
        //             dateFormat(unlockDate, "mmmm dS, yyyy");
        //         const levelNode = utility.fragmentFromString(`
        //           <div class="tier-${tier}">
        //             <div class="achievement-info">
        //               <div class="name">${name}</div>
        //               <div class="description">${description}</div>
        //             </div>
        //           </div>
        //         `).firstElementChild;
        //         levelNode.tooltip(
        //             description + "<br><div style='height:10px'></div>"
        //             + unlockDateString, 500, 250);
        //         achievementFragment.appendChild(levelNode);
        //     }
        //     achievementNode.appendChild(achievementFragment);
        //     achievementNode.style.counterReset = `level ${levels.length + 1}`;
        //     this.achievementIdToNode.set(achievementId, achievementNode);
        //     fragment.appendChild(achievementNode);
        // }
        // this.$("global-achievements").appendChild(fragment);

        
        // const globalAchievements = dataManager.achievements.getGlobal();
        // for (const { name, tier, description, unlocked } of globalAchievements){
        //     const node = document.createElement("div");
        //     const nameNode = document.createElement("div");
        //     nameNode.textContent = name;
        //     nameNode.classList.add("name-node");
        //     node.appendChild(nameNode);
        //     node.classList.add(`tier-${tier}`);
        //     node.classList.toggle("locked", !unlocked);
        //     this.$("global-achievements").appendChild(node);
        // }
    }

    registerCentralEventListeners() {
        events.onAll(
            ["word-added", "word-deleted", "kanji-added", "kanji-removed",
             "current-srs-scheme-edited", "hanzi-added", "hanzi-removed"],
        () => {
            if (this.isHidden()) return;
            this.updateStats();
        });
        events.onAll(["language-added", "language-removed"], () => {
            const languages = dataManager.languages.visible;
            this.$("words-added-timeline").setLegend(languages);
            this.$("srs-reviews-timeline").setLegend(languages);
        });
        // events.on("achievement-unlocked", (achievementId) => {
        //     // TODO
        //     // TODO: Adjust counter-increment as well
        // });
    }

    initialize() {
        const languages = dataManager.languages.visible;
        this.$("words-added-timeline").setLegend(languages);
        this.$("srs-reviews-timeline").setLegend(languages);
        this.initStats();
    }

    open() {
    }

    adjustToLanguage(language, secondary) {
    }

    async initStats() {
        const languages = dataManager.languages.visible;
        // Sort languages by mastery score for general stats
        languages.sort((l1, l2) => dataManager.stats.getTotalScoreFor(l2) -
                                   dataManager.stats.getTotalScoreFor(l1));
        // Fill general stats
        let scoreTotal = 0;
        let numTestedTotal = 0;
        let numAddedTotal = 0;
        for (const lang of languages) {
            const score = dataManager.stats.getTotalScoreFor(lang);
            const numTested = dataManager.stats.getNumberOfItemsTestedFor(lang);
            const numAdded = await dataManager.vocab.sizeFor(lang);
            const row = utility.fragmentFromString(
                `<div class="general-stats-row">
                   <div class="language-label">${lang}</div>
                   <div>${numAdded}</div>
                   <div>${numTested}</div>
                   <div>${score}</div>
                 </div>`);
            this.$("general-stats-per-language").appendChild(row);
            scoreTotal += score;
            numTestedTotal += numTested;
            numAddedTotal += numAdded;
        }
        const totalsRow = utility.fragmentFromString(
            `<div class="general-stats-row">
               <div></div>
               <div>${numAddedTotal}</div>
               <div>${numTestedTotal}</div>
               <div>${scoreTotal}</div>
             </div>`);
        this.$("general-stats-total").appendChild(totalsRow);
        // Draw daily stats diagrams
        this.$("words-added-timeline").drawTimeline();
        this.$("srs-reviews-timeline").drawTimeline();
    }

    async updateStats() {
        // TODO
    }
}

customElements.define("stats-section", StatsSection);
module.exports = StatsSection;
