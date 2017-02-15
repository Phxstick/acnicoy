"use strict";


const Random = require("random-js");
const random = new Random(Random.engines.browserCrypto);

const menuItems = popupMenu.registerItems({
    "copy-test-item": {
        label: "Copy",
        click: ({ currentNode }) => {
            clipboard.writeText(currentNode.textContent);
        }
    }
});

class TestSection extends Section {
    constructor() {
        super("test");
        // Set some numbers and constants
        this.delay = 300;
        this.lastPress = 0;
        this.animate = false;
        // Add callbacks
        this.$("ignore-answer").addEventListener("click", () => {
            this._ignoreAnswer();
        });
        this.$("continue-button").addEventListener("click", () => {
            const time = new Date().getTime();
            if (time - this.lastPress > this.delay) {
                this._createQuestion();
                this.lastPress = time;
            }
        });
        this.$("answer-entry").addEventListener("keypress", (event) => {
            const time = new Date().getTime();
            if (event.key === "Enter" && time - this.lastPress > this.delay) {
                this._evaluateAnswer();
                this.lastPress = time;
            }
        });
        this.$("modify-item").addEventListener("click", () => {
            const item = this.testInfo.item;
            if (item.mode === dataManager.test.mode.KANJI_MEANINGS ||
                    item.mode === dataManager.test.mode.KANJI_ON_YOMI ||
                    item.mode === dataManager.test.mode.KANJI_KUN_YOMI) {
                main.panels["edit-kanji"].load(item.entry);
                main.openPanel("edit-kanji");
            } else if (item.mode === dataManager.test.mode.WORDS) {
                main.panels["edit-vocab"].load(item.entry);
                main.openPanel("edit-vocab");
            }
            // TODO: Immediately modify test item afterwards?
        });
        this.$("add-answer").addEventListener("click", () => {
            // TODO: Implement
            main.updateStatus("Not yet implemented!");
            // this._createQuestion();
        });
        // Create popup-menus
        this.$("test-item").popupMenu(menuItems, ["copy-test-item"]);
    }

    /* =====================================================================
        Inherited from Section
    ===================================================================== */

    registerCentralEventListeners() {
        events.onAll(["language-changed", "current-srs-scheme-edited"], () => {
            const numLevels = dataManager.srs.currentScheme.numLevels;
            const intervalTexts = dataManager.srs.currentScheme.intervalTexts;
            for (let level = 1; level <= numLevels; ++level) {
                const option = this.$("new-level").addOption(level);
                option.dataset.tooltip = intervalTexts[level];
                option.dataset.tooltipPos = "left";
            }
        });
    }
    
    open() {
        // ... Adjust widgets to settings
        if (dataManager.settings["test"]["progress_flag"]) {
            // ... show progress bar
        } else {
            // ... hide progress bar
        }
        if (dataManager.settings["test"]["stats_flag"]) {
            // ... show stats bar
        } else {
            // ... hide stats bar
        }
        this.testFinished = false;
        this._createTest();
    }

    close() {
        // ... clear stats bar ?
        // ... clear progress bar ?
        main.updateTestButton();
        // unregisterShortcut("Ctrl+R");
    }

    confirmClose() {
        return this.testFinished ||
            dialogWindow.confirm("Are you sure you want to cancel the test?");
    }

    /* =====================================================================
        Private testing functions
    ===================================================================== */

    _evaluateAnswer() {
        const answer = this.$("answer-entry").value.trim();
        const item = this.testInfo.item;
        const entry = item.entry;
        const part = this.testInfo.part;
        if (item.lastAnswerIncorrect) {
            item.marked = true;
        }
        this._getSolutions(entry, item.mode, part)
        .then(([originalSolutions, solutions]) => {
            let answerCorrect = true;
            if (!solutions.has(answer)) {
                let match = false;
                for (const solution of solutions) {
                    if (part !== "readings" && 
                        utility.calculateED(answer, solution)
                            < solution.length / 4)
                        match = true;
                }
                if (!match) {
                    item.parts.push(part);
                    answerCorrect = false;
                }
            }
            item.lastAnswerIncorrect = !answerCorrect;
            // registerShortcut("Ctrl+R",
            //     () => this._ignoreAnswer(this.testInfo.item, this.testInfo.part));
            // If item is finished, determine new level for this item
            const itemCorrect = !item.marked && !item.lastAnswerIncorrect;
            let newLevel;
            if (item.parts.length === 0) {
                if (itemCorrect) {
                    newLevel = item.level + 1;
                } else {
                    newLevel = Math.max(1, item.level - 1);
                }
            }
            // Display stuff
            if (item.parts.length === 0) {
                this.$("levels-frame").show();
                this.$("old-level").textContent = item.level;
                this.$("new-level").setByIndex(newLevel - 1);
                this.$("level-arrow").classList.toggle("correct", itemCorrect);
                this.$("level-arrow").classList.toggle("incorrect",
                                                       !itemCorrect);
            }
            this.$("answer-entry").value = "";
            this._showAnswers(originalSolutions);
            this.$("status").textContent = answerCorrect ?
                "Correct answer!" : "Wrong answer!";
            this.$("status").classList.toggle("correct", answerCorrect);
            this.$("status").classList.toggle("incorrect", !answerCorrect);
            this.$("ignore-answer").removeAttribute("disabled");
            if (!answerCorrect)
                this.$("add-answer").removeAttribute("disabled");
            this.$("modify-item").removeAttribute("disabled");
            // Exchange button and entry
            this.$("continue-button").show();
            this.$("answer-entry").hide();
            this.$("continue-button").focus();
        });
    }

    _prepareMode(mode, part) {
        this.$("status").classList.remove("correct");
        this.$("status").classList.remove("incorrect");
        // Choose right input method (for translations or readings)
        if (mode === dataManager.test.mode.KANJI_KUN_YOMI)
            this.$("answer-entry").enableKanaInput("hira");
        else if (mode === dataManager.test.mode.KANJI_ON_YOMI)
            this.$("answer-entry").enableKanaInput("kata");
        else if (part === "readings")
            this.$("answer-entry").enableKanaInput("hira");
        else
            this.$("answer-entry").disableKanaInput();
        // Choose the right status label
        if (part === "readings") {
            this.$("status").textContent = "How do you read this word?";
        } else {
            let text;
            if (mode === dataManager.test.mode.WORDS)
                text = `Translate from ${dataManager.currentLanguage} into ` +
                       `${dataManager.currentSecondaryLanguage}.`;
            else if (mode === dataManager.test.mode.KANJI_MEANINGS)
                text = `What could the following kanji mean?`;
            else if (mode === dataManager.test.mode.KANJI_ON_YOMI)
                text = `Name an ON-Yomi of the following kanji.`;
            else if (mode === dataManager.test.mode.KANJI_KUN_YOMI)
                text = `Name a KUN-Yomi of the following kanji.`;
            this.$("status").textContent = text;
        }
    }

    _createQuestion() {
        const item = this.testInfo.item;
        const items = this.testInfo.itemList;
        if (item !== null) {
            if (item.parts.length === 0) {
                if (!item.marked && !item.lastAnswerIncorrect) {
                    this.testInfo.numCorrect++;
                } else {
                    this.testInfo.numIncorrect++;
                }
                const newLevel = this.$("new-level").value;
                // Update SRS system and daily stats
                dataManager.stats.incrementTestedCounter(item.mode);
                dataManager.stats.updateScore(item.mode, item.level, newLevel);
                dataManager.srs.setLevel(item.entry, newLevel, item.mode);
            } else {
                items.push(item);
            }
        }
        // Check if the test is completed (no items left)
        if (items.length === 0) {
            dialogWindow.info(
                `Correct: ${this.testInfo.numCorrect}, ` +
                `Wrong: ${this.testInfo.numIncorrect}`);
            // TODO: Prepare and show test-complete stuff
            this.testFinished = true;
            main.openSection("home");
            return;
        }
        // ... Update stats bar
        // ... Update progress bar
        // Randomly pop one of the last 10 items in the list
        const offset = Math.floor(Math.random() * Math.min(10, items.length));
        const newItem = items[items.length - offset - 1];
        this.testInfo.item = newItem;
        items.splice(items.length - offset - 1, 1);
        // Randomly choose a part of the item
        const randNum = Math.floor(Math.random() * newItem.parts.length);
        const part = newItem.parts[randNum];
        this.testInfo.part = part;
        newItem.parts.splice(randNum, 1);
        //// unregisterShortcut("Ctrl+R");
        // TODO: Unregistering shortcut (customize in settings)
        let promise = Promise.resolve();
        if (this.animate) {
            promise = promise.then(() => this.$("items").fadeOut(300))
                             .then(() => {
                                 this.$("items").style.visibility = "visible";
                             });
        }
        promise.then(() => {
            // Display stuff
            this._prepareMode(newItem.mode, part);
            this.$("test-item").textContent = newItem.entry;
            this.$("correct-answers").innerHTML = "";
            this.$("ignore-answer").setAttribute("disabled", "");
            this.$("add-answer").setAttribute("disabled", "");
            this.$("modify-item").setAttribute("disabled", "");
            this.$("levels-frame").hide();
            // Exchange button and entry
            this.$("continue-button").hide();
            this.$("answer-entry").show();
            this.$("answer-entry").focus();
        });
    }

    _showAnswers(solutions) {
        for (const solution of solutions) {
            const answerLabel = document.createElement("div");
            answerLabel.textContent = solution;
            this.$("correct-answers").appendChild(answerLabel);
        }
    }

    _ignoreAnswer() {
        if (!this.testInfo.item.lastAnswerIncorrect)
            this.testInfo.item.parts.push(this.testInfo.part);
        this.testInfo.item.lastAnswerIncorrect = false;
        this._createQuestion();
        // unregisterShortcut("Ctrl+R");
    }

    _getSolutions(entry, mode, part) {
        const promise = dataManager.test.getSolutions(entry, mode, part);
        // TODO: Move the following to dataManager aswell!!
        return promise.then((result) => {
            const solutions = new Set(result);
            const originalSolutions = new Set(result);
            // If the language is English, make solutions without "to" count
            if (dataManager.currentSecondaryLanguage === "English") {
                for (const solution of originalSolutions) {
                    if (solution.startsWith("to "))
                        solutions.add(solution.slice(3));
                }
            }
            // Also ignore braces and their content for the solutions
            const pattern = /\(.*?\)/g;
            const temp = new Set(solutions);
            for (const solution of temp) {
                solutions.add(solution.replace(pattern, "").trim());
            }
            return [originalSolutions, solutions];
        });
    }

    _createTestItem(entry, mode) {
        const newItem = {
            entry: entry,
            marked: false,
            lastAnswerIncorrect: false,
            mode: mode,
            parts: ["solutions"]
        };
        return dataManager.srs.getLevel(entry, mode).then((level) => {
            newItem.level = level;
            if (mode === dataManager.test.mode.WORDS) {
                return dataManager.vocab.getReadings(entry).then((readings) => {
                    if (readings.length > 0) newItem.parts.push("readings");
                    return newItem;
                });
            }
            return newItem;
        });
    }

    _createTest() {
        const itemList = [];
        const promises = [];
        // Assemble vocabulary part of the testitem list
        const vocabPart = dataManager.srs.getDueVocab().then((words) => {
            for (const word of words) {
                promises.push(
                    this._createTestItem(word, dataManager.test.mode.WORDS)
                    .then((item) => itemList.push(item)));
            }
        });
        // Assemble kanji part of the testitem list if the language is Japanese
        let kanjiParts = [];
        if (dataManager.currentLanguage === "Japanese") {
            for (const mode of [dataManager.test.mode.KANJI_MEANINGS,
                                dataManager.test.mode.KANJI_ON_YOMI,
                                dataManager.test.mode.KANJI_KUN_YOMI]) {
                kanjiParts.push(dataManager.srs.getDueKanji(mode)
                .then((result) => {
                    for (const kanji of result) {
                        promises.push(this._createTestItem(kanji, mode)
                            .then((item) => itemList.push(item)));
                    }
                }));
            }
        }
        // Finally shuffle the testitems, initialize testInfo and start testing
        Promise.all([vocabPart, ...kanjiParts]).then(() => {
            Promise.all(promises).then(() => {
                random.shuffle(itemList);
                this.testInfo = {
                    itemList: itemList,
                    item: null,
                    part: null,
                    numCorrect: 0,
                    numIncorrect: 0
                };
                this._createQuestion();
            });
        });
    }
}

customElements.define("test-section", TestSection);
module.exports = TestSection;
