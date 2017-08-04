"use strict";

const dateFormat = require("dateformat");

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
        this.achievementIdToNode = new Map();

        const globalAchievements = dataManager.achievements.getUnlockedGlobal();

        const fragment = document.createDocumentFragment();
        for (const { achievementId, levels } of globalAchievements) {
            levels.reverse();
            const achievementNode = document.createElement("div");
            const achievementFragment = document.createDocumentFragment();
            for (const { name, tier, description, unlockDate } of levels) {
                const unlockDateString = "Unlocked on " +
                    dateFormat(unlockDate, "mmmm dS, yyyy");
                const levelNode = utility.fragmentFromString(`
                  <div class="tier-${tier}">
                    <div class="achievement-info">
                      <div class="name">${name}</div>
                      <div class="description">${description}</div>
                    </div>
                  </div>
                `).firstElementChild;
                levelNode.tooltip(
                    description + "<br><div style='height:10px'></div>"
                    + unlockDateString, 500, 250);
                achievementFragment.appendChild(levelNode);
            }
            achievementNode.appendChild(achievementFragment);
            achievementNode.style.counterReset = `level ${levels.length + 1}`;
            this.achievementIdToNode.set(achievementId, achievementNode);
            fragment.appendChild(achievementNode);
        }
        this.$("global-achievements").appendChild(fragment);

        
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
        events.on("achievement-unlocked", (achievementId) => {
            // TODO
            // TODO: Adjust counter-increment as well
        });
    }

    open() {
        this.updateStats();
    }

    adjustToLanguage(language, secondary) {
        this.$("jouyou-kanji").hide();
        this.$("jlpt-kanji").hide();
        this.$("kanji-added-frame").toggleDisplay(language === "Japanese");
        this.$("kanji-diagrams").toggleDisplay(language === "Japanese");
        this.$("hanzi-added-frame").toggleDisplay(language === "Chinese");
        // Content dependent
        const japaneseContentAvailable =
            language === "Japanese" && secondary === "English" &&
            dataManager.content.isAvailable("Japanese", "English");
        this.$("jouyou-kanji").toggleDisplay(japaneseContentAvailable);
        this.$("jlpt-kanji").toggleDisplay(japaneseContentAvailable);
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
        if (dataManager.currentLanguage === "Chinese") {
            // Display number of kanji added
            promises.push(dataManager.hanzi.getAmountAdded().then((amount) => {
                this.$("hanzi-added").textContent = amount;
            }));
        }
        return Promise.all(promises);
    }
}

customElements.define("stats-section", StatsSection);
module.exports = StatsSection;
