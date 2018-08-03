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
        events.onAll(["language-added", "language-removed",
                      "language-visibility-changed"], () => {
            this.initStats();
        });
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
        // events.on("achievement-unlocked", (achievementId) => {
        //     // Implement, Adjust counter-increment as well
        // });
    }

    open() {
        if (this.recentlyInitialized) {
            this.$("words-added-timeline").moveViewToRightEnd();
            this.$("srs-reviews-timeline").moveViewToRightEnd();
        }
        this.recentlyInitialized = false;
    }

    initialize() {
        this.initStats();
        // Redraw the diagrams when new day starts (in order to shift diagram)
        schedule.scheduleJob("0 0 * * *", () => {
            this.$("words-added-timeline").drawTimeline();
            this.$("srs-reviews-timeline").drawTimeline();
            this.$("words-added-timeline").moveViewToRightEnd();
            this.$("srs-reviews-timeline").moveViewToRightEnd();
        });
    }

    initStats() {
        this.$("general-stats").update();
        const languages = dataManager.languages.visible;
        this.$("words-added-timeline").setLegend(languages);
        this.$("srs-reviews-timeline").setLegend(languages);
        this.$("words-added-timeline").toggleLegend(languages.length > 1);
        this.$("srs-reviews-timeline").toggleLegend(languages.length > 1);
        this.$("words-added-timeline").drawTimeline();
        this.$("srs-reviews-timeline").drawTimeline();
        this.recentlyInitialized = true;
    }
}

customElements.define("stats-section", StatsSection);
module.exports = StatsSection;
