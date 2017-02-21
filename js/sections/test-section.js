"use strict";

/*
 * A test session can be either in an 'answer step' or an 'evaluation step'.
 * - Answer step (question to be answered is displayed for an item)
 *   - Flashcard mode: User clicks button when he's done thinking about it.
 *   - Non-flashcard mode: User enters answer into entry and presses enter.
 * - Evaluation step (correct answers for item are displayed)
 *   - Flashcard mode: User presses button according to how he answered.
 *   - Non-flashcard mode: User presses button to go to next item.
 *
 * Evaluation step can be skipped outside of flashcard-mode for correctly
 * answered items if the corresponding flag in the settings is set.
 *
 */

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
        this.testInfo = null;
        this.$("show-solutions-button").hide();
        this.$("answer-entry").hide();
        // Set some constants
        this.delay = 300;
        this.pickedItemsLimit = 10;
        // Create function which makes sure an action is not taken too fast
        this.lastTime = 0;
        const ifDelayHasPassed = (callback) => {
            const time = new Date().getTime();
            if (time - this.lastTime > this.delay) {
                callback();
                this.lastTime = time;
            }
        };
        // Add callbacks
        this.$("continue-button").addEventListener("click", () => {
            ifDelayHasPassed(() => this._createQuestion());
        });
        this.$("show-solutions-button").addEventListener("click", () => {
            ifDelayHasPassed(() => this._showSolutions());
        });
        this.$("answer-entry").addEventListener("keypress", (event) => {
            if (event.key === "Enter")
                ifDelayHasPassed(() => this._evaluateAnswer());
        });
        this.$("evaluation-button-wrong").addEventListener("click", () => {
            const item = this.testInfo.currentItem;
            item.lastAnswerIncorrect = true;
            const newLevel = dataManager.test.getNewLevel(item.level, false);
            ifDelayHasPassed(() => this._createQuestion(newLevel));
        });
        this.$("evaluation-button-correct").addEventListener("click", () => {
            const item = this.testInfo.currentItem;
            item.lastAnswerIncorrect = false;
            const isCorrect = !item.marked;
            const newLevel = dataManager.test.getNewLevel(item.level,isCorrect);
            ifDelayHasPassed(() => this._createQuestion(newLevel));
        });
        // Buttons on control bar
        this.$("ignore-answer").addEventListener("click", () => {
            this._ignoreAnswer();
        });
        this.$("add-answer").addEventListener("click", () => {
            // TODO: Implement
            main.updateStatus("Not yet implemented!");
            // this._createQuestion();
        });
        this.$("modify-item").addEventListener("click", () => {
            const item = this.testInfo.currentItem;
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
            this.$("new-level").empty();
            for (let level = 1; level <= numLevels; ++level) {
                const option = this.$("new-level").addOption(level);
                option.dataset.tooltip = intervalTexts[level];
                option.dataset.tooltipPos = "left";
            }
        });
        events.on("settings-test-show-progress", () => {
            this.$("progress").toggleDisplay(
                dataManager.settings.test.showProgress);
        });
        events.on("settings-test-show-score", () => {
            this.$("score").toggleDisplay(dataManager.settings.test.showScore);
        });
        events.on("settings-test-make-continuous", () => {
            this.testInfo = null;
        });
        events.on("settings-test-use-serif-font", () => {
            this.$("test-item").classList.toggle("serif",
                dataManager.settings.test.useSerifFont);
        });
        events.on("settings-test-font-size", () => {
            for (const size of ["small", "normal", "large"]) {
                this.$("test-item").classList.remove(size);
            }
            const newSize = dataManager.settings.test.fontSize;
            this.$("test-item").classList.add(newSize);
        });
        events.on("settings-test-enable-ignore-shortcut", () => {
            if (this.testInfo !== null && this.testInfo.inEvalStep
                    && !dataManager.settings.test.useFlashcardMode){
                if (dataManager.settings.test.enableIgnoreShortcut) {
                    shortcuts.register(
                        "ignore-answer", () => this._ignoreAnswer());
                } else {
                    shortcuts.unregister("ignore-answer");
                }
            }
        });
        events.on("settings-test-use-flashcard-mode", () => {
            const enabled = dataManager.settings.test.useFlashcardMode;
            this.$("ignore-answer").toggleDisplay(!enabled);
            this.$("add-answer").toggleDisplay(!enabled);
            this.$("modify-item").classList.toggle("flashcard-mode", enabled);
            // If test is in answer step, exchange eval buttons and answer entry
            if (this.testInfo !== null && !this.testInfo.inEvalStep) {
                if (enabled) {
                    this.$("answer-entry").hide();
                    this.$("show-solutions-button").show();
                } else {
                    this.$("answer-entry").show();
                    this.$("show-solutions-button").hide();
                }
            }
        });
    }

    adjustToLanguage() {
        this.testInfo = null;
    }
    
    open() {
        if (this.testInfo === null) {
            this._getTestItems().then((items) => {
                this.testInfo = {
                    items: items,
                    pickedItems: [],
                    currentItem: null,
                    currentPart: null,
                    numCorrect: 0,
                    numIncorrect: 0,
                    itemsTotal: items.length,
                    itemsFinished: 0,
                    lastUpdateTime: utility.getTime(),
                    score: 0,
                    inEvalStep: false
                };
                this._createQuestion();
            });
        } else if (this.testInfo.inEvalStep &&
                   !dataManager.settings.test.useFlashcardMode &&
                   dataManager.settings.test.enableIgnoreShortcut) {
            shortcuts.register("ignore-answer", () => this._ignoreAnswer());
        }
    }

    confirmClose() {
        if (!dataManager.settings.test.makeContinuous) {
            return dialogWindow.confirm(
                "Are you sure you want to cancel the test?")
            .then((confirmed) => {
                if (confirmed) this.testInfo = null;
                return confirmed;
            });
        }
        return true;
    }

    close() {
        shortcuts.unregister("ignore-answer");
    }

    /* =====================================================================
        Private testing functions
    ===================================================================== */

    _evaluateAnswer() {
        const answer = this.$("answer-entry").value.trim();
        const item = this.testInfo.currentItem;
        const part = this.testInfo.currentPart;
        const entry = item.entry;
        if (item.lastAnswerIncorrect) {
            item.marked = true;
        }
        this.testInfo.inEvalStep = true;
        Promise.all([
            dataManager.test.getSolutions(entry, item.mode, part),
            dataManager.test.getExtendedSolutions(entry, item.mode, part)
        ]).then(([solutions, extendedSolutions]) => {
            let answerCorrect = true;
            if (!extendedSolutions.has(answer)) {
                let match = false;
                for (const solution of extendedSolutions) {
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
            const itemCorrect = !item.marked && !item.lastAnswerIncorrect;
            // If item is finished, determine new level for this item
            let newLevel;
            if (item.parts.length === 0) {
                newLevel = dataManager.test.getNewLevel(item.level,itemCorrect);
            }
            // Reveal solutions
            for (const solution of solutions) {
                const answerLabel = document.createElement("div");
                answerLabel.textContent = solution;
                this.$("correct-answers").appendChild(answerLabel);
            }
            // Update rest of view
            if (item.parts.length === 0) {
                this.$("levels-frame").show();
                this.$("old-level").textContent = item.level;
                this.$("new-level").setByIndex(newLevel - 1);
                this.$("level-arrow").classList.toggle("correct",
                                                       itemCorrect);
                this.$("level-arrow").classList.toggle("incorrect",
                                                       !itemCorrect);
            }
            this.$("answer-entry").value = "";
            this.$("status").textContent = answerCorrect ?
                "Correct answer!" : "Wrong answer!";
            this.$("status").classList.toggle("correct", answerCorrect);
            this.$("status").classList.toggle("incorrect", !answerCorrect);
            this.$("ignore-answer").removeAttribute("disabled");
            if (!answerCorrect)
                this.$("add-answer").removeAttribute("disabled");
            this.$("answer-entry").hide();
            this.$("continue-button").show();
            this.$("continue-button").focus();
            if (dataManager.settings.test.enableIgnoreShortcut) {
                shortcuts.register(
                    "ignore-answer", () => this._ignoreAnswer());
            }
            this.$("modify-item").removeAttribute("disabled");
        });
    }

    _showSolutions() {
        const item = this.testInfo.currentItem;
        const part = this.testInfo.currentPart;
        if (item.lastAnswerIncorrect) {
            item.marked = true;
        }
        this.testInfo.inEvalStep = true;
        dataManager.test.getSolutions(item.entry, item.mode, part)
        .then((solutions) => {
            for (const solution of solutions) {
                const answerLabel = document.createElement("div");
                answerLabel.textContent = solution;
                this.$("correct-answers").appendChild(answerLabel);
            }
            this.$("status").textContent = "";
            this.$("show-solutions-button").hide();
            this.$("evaluation-buttons").show();
            this.$("modify-item").removeAttribute("disabled");
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

    _createQuestion(newLevel) {
        if (dataManager.settings.test.enableIgnoreShortcut) {
            shortcuts.unregister("ignore-answer");
        }
        this.testInfo.inEvalStep = false;
        dataManager.database.run("BEGIN TRANSACTION");
        // Process previously answered item
        if (this.testInfo.currentItem !== null) {
            const item = this.testInfo.currentItem;
            if (item.parts.length === 0) {
                if (newLevel === undefined) {
                    newLevel = this.$("new-level").value;
                }
                // Update SRS system and daily stats
                dataManager.stats.incrementTestedCounter(item.mode);
                const scoreGain = dataManager.stats.updateScore(
                    item.mode, item.level, newLevel);
                dataManager.srs.setLevel(item.entry, newLevel, item.mode);
                // Update testinfo-object
                this.testInfo.currentItem = null;
                this.testInfo.itemsFinished++;
                this.testInfo.score += scoreGain;
                if (!item.marked && !item.lastAnswerIncorrect) {
                    this.testInfo.numCorrect++;
                } else {
                    this.testInfo.numIncorrect++;
                }
                // Animate label with gained score
                if (dataManager.settings.test.showScore) {
                    this.$("score-animation").textContent =
                        `${scoreGain >= 0 ? "+" : "-"}${
                           Math.abs(scoreGain).toFixed(1)}`;
                    this.$("score-animation").classList.toggle("positive",
                        scoreGain > 0);
                    this.$("score-animation").classList.toggle("negative",
                        scoreGain < 0);
                    this.$("score-animation").show();
                    Velocity(this.$("score-animation"), {
                        translateY: "-30px",
                        opacity: 0
                    }, {
                        easing: "easeOutSine",
                        duration: 500
                    }).then(() => {
                        Velocity(this.$("score-animation"), "reverse",
                                 { duration: 0 });
                        this.$("score-animation").hide();
                    });
                }
            } else {
                this.testInfo.pickedItems.push(item);
            }
        }
        // Display score and update progress
        this.$("progress").max = this.testInfo.itemsTotal;
        this.$("progress").value = this.testInfo.itemsFinished;
        this.$("progress-text").textContent =
            `${this.testInfo.itemsFinished} / ${this.testInfo.itemsTotal}`;
        this.$("score").textContent = this.testInfo.score.toFixed();
        main.updateTestButton();
        // If "continuous" flag is set, add new items ready for review
        let promise = Promise.resolve();
        if (dataManager.settings.test.makeContinuous) {
            const lastUpdateTime = this.testInfo.lastUpdateTime;
            this.testInfo.lastUpdateTime = utility.getTime();
            promise = this._getTestItems(lastUpdateTime).then((newItems) => {
                this.testInfo.items.push(...newItems);
                this.testInfo.itemsTotal += newItems.length;
            });
        }
        promise.then(() => {
            dataManager.database.run("END TRANSACTION");
            // Randomly pick new items until threshold amount
            while (this.testInfo.pickedItems.length < this.pickedItemsLimit &&
                    this.testInfo.items.length > 0) {
                const index = random.integer(0, this.testInfo.items.length - 1);
                this.testInfo.pickedItems.push(this.testInfo.items[index]);
                // Efficiently remove item from testInfo.items
                if (this.testInfo.items.length > 1 &&
                        index !== this.testInfo.items.length - 1) {
                    this.testInfo.items[index] = this.testInfo.items.last();
                }
                this.testInfo.items.length--;
            }
            // Check if test is completed (no items left)
            if (this.testInfo.pickedItems.length === 0) {
                dialogWindow.info(
                    `You answered ${this.testInfo.numCorrect} ` +
                    `out of ${this.testInfo.itemsTotal} items correctly.`);
                this.testInfo = null;
                main.openSection("home");
                return;
            }
            // Randomly choose one of the picked items for reviewing
            const index = random.integer(0, this.testInfo.pickedItems.length-1);
            const newItem = this.testInfo.pickedItems[index];
            this.testInfo.currentItem = newItem;
            this.testInfo.pickedItems.splice(index, 1);
            // Randomly choose a part of the item (e.g. meaning or reading)
            const partIndex = random.integer(0, newItem.parts.length - 1);
            const part = newItem.parts[partIndex];
            this.testInfo.currentPart = part;
            newItem.parts.splice(partIndex, 1);
            // If animation flag is set, fade away old item and fade in new one
            let animationPromise = Promise.resolve();
            if (dataManager.settings.test.animate) {
                animationPromise = this.$("items").fadeOut(300).then(() => {
                    this.$("items").style.visibility = "visible";
                });
            }
            animationPromise.then(() => {
                // Display stuff
                this._prepareMode(newItem.mode, part);
                this.$("test-item").textContent = newItem.entry;
                this.$("correct-answers").innerHTML = "";
                this.$("ignore-answer").setAttribute("disabled", "");
                this.$("add-answer").setAttribute("disabled", "");
                this.$("modify-item").setAttribute("disabled", "");
                this.$("levels-frame").hide();
                this.$("continue-button").hide();
                this.$("evaluation-buttons").hide();
                if (dataManager.settings.test.useFlashcardMode) {
                    this.$("show-solutions-button").show();
                    this.$("show-solutions-button").focus();
                } else {
                    this.$("answer-entry").show();
                    this.$("answer-entry").focus();
                }
            });
        });
    }

    _ignoreAnswer() {
        if (!this.testInfo.currentItem.lastAnswerIncorrect)
            this.testInfo.currentItem.parts.push(this.testInfo.currentPart);
        this.testInfo.currentItem.lastAnswerIncorrect = false;
        this._createQuestion();
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

    _getTestItems(since=0) {
        const itemPromises = [];
        // Assemble vocabulary part of the testitem list
        const vocabPart = dataManager.srs.getDueVocab(since).then((words) => {
            for (const word of words) {
                itemPromises.push(
                    this._createTestItem(word, dataManager.test.mode.WORDS));
            }
        });
        // Assemble kanji part of the testitem list if the language is Japanese
        let kanjiParts = [];
        if (dataManager.currentLanguage === "Japanese") {
            for (const mode of [dataManager.test.mode.KANJI_MEANINGS,
                                dataManager.test.mode.KANJI_ON_YOMI,
                                dataManager.test.mode.KANJI_KUN_YOMI]) {
                kanjiParts.push(dataManager.srs.getDueKanji(mode, since)
                .then((kanjiList) => {
                    for (const kanji of kanjiList) {
                        itemPromises.push(this._createTestItem(kanji, mode));
                    }
                }));
            }
        }
        return Promise.all([vocabPart, ...kanjiParts]).then(() => {
            return Promise.all(itemPromises);
        });
    }
}

customElements.define("test-section", TestSection);
module.exports = TestSection;
