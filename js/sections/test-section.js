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
        this.itemFadeDuration = 400;  // Set in scss as well!
        this.solutionFadeDuration = 100;
        this.solutionFadeDistance = 10;
        this.solutionFadeDelay = 50;
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
            ifDelayHasPassed(() => this._showEvaluationButtons());
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
        this.$("exit-list-mode").addEventListener("click", () => {
            if (this.testInfo.itemsFinished > 0) {
                dialogWindow.info(
                    `You answered ${this.testInfo.numCorrect} ` +
                    `out of ${this.testInfo.itemsFinished} items correctly.`);
            }
            this.testInfo = null;
            main.openSection("vocab");
        });
        // Buttons on control bar
        this.$("ignore-answer").addEventListener("click", () => {
            this._ignoreAnswer();
        });
        this.$("add-answer").addEventListener("click", () => {
            const answer = this.$("answer-entry").value.trim();
            const item = this.testInfo.currentItem;
            dataManager.test.addToSolutions(
                item.entry, answer, item.mode, this.testInfo.currentPart);
            this._ignoreAnswer();
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
        events.on("settings-design-animate-popup-stacks", () => {
            const animate = dataManager.settings.design.animatePopupStacks;
            this.$("new-level").animate = animate;
        });
        events.on("settings-test-animate", () => {
            this.$("top").classList.toggle(
                "animate", dataManager.settings.test.animate);
        });
        events.on("settings-test-show-progress", () => {
            this.$("progress").toggleDisplay(
                dataManager.settings.test.showProgress);
            this.$("progress-text").toggleDisplay(
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
        events.on("settings-test-use-background-colors", () => {
            if (!dataManager.settings.test.useBackgroundColors) {
                this.$("top").className =
                    dataManager.settings.test.animate ? "animate" : "";
            }
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
        // If current item has been deleted, immediately skip to next item
        events.on("word-deleted", (word) => {
            const currentItem = this.testInfo.currentItem;
            if (currentItem.entry === word &&
                    currentItem.mode === dataManager.test.mode.WORDS) {
                this.testInfo.itemsTotal--;
                this.testInfo.skipNextEvaluation = true;
                this._createQuestion();
            }
        });
        events.on("kanji-removed", (kanji) => {
            const currentItem = this.testInfo.currentItem;
            if (currentItem.entry === kanji &&
                  (currentItem.mode === dataManager.test.mode.KANJI_MEANINGS ||
                   currentItem.mode === dataManager.test.mode.KANJI_ON_YOMI ||
                   currentItem.mode === dataManager.test.mode.KANJI_KUN_YOMI)) {
                this.testInfo.itemsTotal--;
                this.testInfo.skipNextEvaluation = true;
                this._createQuestion();
            }
        });
        // If current item has been edited, display new solutions
        events.onAll(["vocab-changed", "kanji-changed"], (entry) => {
            const item = this.testInfo.currentItem;
            if (item.entry === entry) {
                dataManager.test.getSolutions(
                    item.entry, item.mode, this.testInfo.currentPart)
                .then((solutions) => {
                    if (solutions.length === 0) {
                        if (item.parts.length === 0) {
                            this.testInfo.itemsTotal--;
                        } else {
                            this.testInfo.pickedItems.push(item);
                        }
                        this.testInfo.skipNextEvaluation = true;
                        this._createQuestion();
                    } else {
                        this.$("solutions").innerHTML = "";
                        this._displaySolutions(solutions, false);
                    }
                });
            }
        });
    }

    adjustToLanguage() {
        this.testInfo = null;
    }
    
    open() {
        if (this.testInfo === null) {
            this.createTest();
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

    createTest(vocabList) {
        if (vocabList === undefined) {
            this.$("list-mode-info").hide();
            return this._getTestItems().then((items) => {
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
                    inEvalStep: false,
                    vocabListMode: false,
                    skipNextEvaluation: false
                };
                this._createQuestion();
            });
        } else {
            const itemPromises = [];
            const words = dataManager.vocabLists.getWordsForList(vocabList);
            for (const word of words) {
                itemPromises.push(
                    this._createTestItem(word, dataManager.test.mode.WORDS));
            }
            this.$("score").textContent = "";
            this.$("vocab-list").textContent = vocabList;
            this.$("list-mode-info").show();
            return Promise.all(itemPromises).then((items) => {
                this.testInfo = {
                    items: items,
                    pickedItems: [],
                    currentItem: null,
                    currentPart: null,
                    numCorrect: 0,
                    numIncorrect: 0,
                    itemsTotal: items.length,
                    itemsFinished: 0,
                    inEvalStep: false,
                    vocabListMode: true,
                    skipNextEvaluation: false
                };
                this._createQuestion();
            });
        }
    }

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
            // Update status label, unless evaluations for correct answers are
            // skipped without animation and a correct answer was given
            if (!dataManager.settings.test.skipEvaluationOnCorrect ||
                    dataManager.settings.test.animate || !answerCorrect) {
                this.$("status").textContent = answerCorrect ?
                    "Correct answer!" : "Wrong answer!";
                this.$("status").classList.toggle("correct", answerCorrect);
                this.$("status").classList.toggle("incorrect", !answerCorrect);
            }
            // Skip evaluation for correct answer if corresponding flag is set
            if (dataManager.settings.test.skipEvaluationOnCorrect &&
                    answerCorrect) {
                this._createQuestion(newLevel);
            } else {
                this._displaySolutions(
                    solutions, dataManager.settings.test.animate);
                // Update rest of view
                if (item.parts.length === 0 && !this.testInfo.vocabListMode) {
                    this.$("levels-frame").show();
                    this.$("levels-frame").style.opacity = "1";
                    this.$("new-level").setByIndex(newLevel - 1);
                    this.$("old-level").textContent = item.level;
                    this.$("level-arrow").classList.toggle("correct",
                                                           itemCorrect);
                    this.$("level-arrow").classList.toggle("incorrect",
                                                           !itemCorrect);
                }
                this.$("answer-entry").hide();
                this.$("continue-button").show();
                this.$("continue-button").focus();
                if (dataManager.settings.test.enableIgnoreShortcut) {
                    shortcuts.register(
                        "ignore-answer", () => this._ignoreAnswer());
                }
                this.$("ignore-answer").removeAttribute("disabled");
                if (!answerCorrect)
                    this.$("add-answer").removeAttribute("disabled");
                this.$("modify-item").removeAttribute("disabled");
            }
        });
    }

    _showEvaluationButtons() {
        const item = this.testInfo.currentItem;
        const part = this.testInfo.currentPart;
        if (item.lastAnswerIncorrect) {
            item.marked = true;
        }
        this.testInfo.inEvalStep = true;
        dataManager.test.getSolutions(item.entry, item.mode, part)
        .then((solutions) => {
            this._displaySolutions(
                solutions, dataManager.settings.test.animate);
            this.$("status").textContent = "";
            this.$("show-solutions-button").hide();
            this.$("evaluation-buttons").show();
            this.$("modify-item").removeAttribute("disabled");
        });
    }

    _displaySolutions(solutions, animate) {
        for (const solution of solutions) {
            const solutionLabel = document.createElement("div");
            solutionLabel.textContent = solution;
            if (animate) {
                solutionLabel.style.opacity = "0";
            }
            this.$("solutions").appendChild(solutionLabel);
        }
        let delay = 0; 
        // If animation flag is set, fade and slide labels down a bit
        if (animate) {
            for (const solutionLabel of this.$("solutions").children) {
                solutionLabel.fadeIn({
                    distance: this.solutionFadeDistance,
                    duration: this.solutionFadeDuration,
                    direction: "right",
                    delay: delay
                });
                delay += this.solutionFadeDelay;
            }
        }
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
        // Use colors according to item type if flag is set
        if (dataManager.settings.test.useBackgroundColors) {
            const modes = dataManager.test.mode;
            let className;
            switch (mode) {
                case modes.WORDS:
                    if (part === "solutions") className = "word-meaning";
                    if (part === "readings") className = "word-reading";
                    break;
                case modes.KANJI_MEANINGS: className = "kanji-meaning"; break;
                case modes.KANJI_ON_YOMI: className = "kanji-on-yomi"; break;
                case modes.KANJI_KUN_YOMI: className = "kanji-kun-yomi"; break;
            }
            this.$("top").className = className;
            if (dataManager.settings.test.animate) {
                this.$("top").classList.add("animate");
            }
        }
    }

    _createQuestion(newLevel) {
        if (dataManager.settings.test.enableIgnoreShortcut) {
            shortcuts.unregister("ignore-answer");
        }
        this.testInfo.inEvalStep = false;
        dataManager.database.run("BEGIN TRANSACTION");
        // Process previously answered item
        if (this.testInfo.currentItem !== null &&
                !this.testInfo.skipNextEvaluation) {
            const item = this.testInfo.currentItem;
            if (item.parts.length === 0) {
                if (newLevel === undefined && !this.testInfo.vocabListMode) {
                    newLevel = this.$("new-level").value;
                }
                let scoreGain;
                // Update SRS system and daily stats
                if (!this.testInfo.vocabListMode) {
                    dataManager.stats.incrementTestedCounter(item.mode);
                    scoreGain = dataManager.stats.updateScore(
                        item.mode, item.level, newLevel);
                    dataManager.srs.setLevel(item.entry, newLevel, item.mode);
                    this.testInfo.score += scoreGain;
                }
                // Update testinfo-object
                this.testInfo.itemsFinished++;
                if (!item.marked && !item.lastAnswerIncorrect) {
                    this.testInfo.numCorrect++;
                } else {
                    this.testInfo.numIncorrect++;
                }
                // Animate label with gained score
                if (dataManager.settings.test.showScore &&
                        !this.testInfo.vocabListMode) {
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
        this.testInfo.skipNextEvaluation = false;
        // Display score and update progress
        this.$("progress").max = this.testInfo.itemsTotal;
        this.$("progress").value = this.testInfo.itemsFinished;
        this.$("progress-text").textContent =
            `${this.testInfo.itemsFinished} / ${this.testInfo.itemsTotal}`;
        if (!this.testInfo.vocabListMode) {
            this.$("score").textContent = this.testInfo.score.toFixed();
            main.updateTestButton();
        }
        // If "continuous" flag is set, add new items ready for review
        let promise = Promise.resolve();
        if (dataManager.settings.test.makeContinuous &&
                !this.testInfo.vocabListMode) {
            const lastUpdateTime = this.testInfo.lastUpdateTime;
            this.testInfo.lastUpdateTime = utility.getTime();
            promise = this._getTestItems(lastUpdateTime).then((newItems) => {
                this.testInfo.items.push(...newItems);
                this.testInfo.itemsTotal += newItems.length;
            });
        }
        return promise.then(() => {
            // Randomly pick new items until threshold amount
            while (this.testInfo.pickedItems.length < this.pickedItemsLimit &&
                    this.testInfo.items.length > 0) {
                const index = random.integer(0, this.testInfo.items.length - 1);
                this.testInfo.pickedItems.push(this.testInfo.items[index]);
                this.testInfo.items.quickRemoveAt(index);
            }
            // Check if test is completed (no items left)
            if (this.testInfo.pickedItems.length === 0) {
                dialogWindow.info(
                    `You answered ${this.testInfo.numCorrect} ` +
                    `out of ${this.testInfo.itemsTotal} items correctly.`);
                const inVocabListMode = this.testInfo.vocabListMode;
                this.testInfo = null;
                main.openSection(inVocabListMode ? "vocab" : "home");
                return;
            }
            // Randomly choose one of the picked items for reviewing
            const index = random.integer(0, this.testInfo.pickedItems.length-1);
            const newItem = this.testInfo.pickedItems[index];
            const previousItem = this.testInfo.currentItem;
            this.testInfo.pickedItems.quickRemoveAt(index);
            // Randomly choose a part of the item (e.g. meaning or reading)
            const partIndex = random.integer(0, newItem.parts.length - 1);
            const part = newItem.parts[partIndex];
            newItem.parts.splice(partIndex, 1);
            // Check if new item has solutions (if not, remove and skip it)
            dataManager.test.getSolutions(newItem.entry, newItem.mode, part)
            .then((solutions) => {
                if (solutions.length === 0) {
                    if (newItem.parts.length === 0) {
                        this.testInfo.itemsTotal--;
                    } else {
                        this.testInfo.pickedItems.push(newItem);
                    }
                    this.testInfo.skipNextEvaluation = true;
                    return this._createQuestion();
                }
                // If item has solutions, finally assign it as current item
                this.testInfo.currentItem = newItem;
                this.testInfo.currentPart = part;
                dataManager.database.run("END TRANSACTION");
                // == Update view ==
                // If animate flag is set, fade away previous item and solutions
                if (dataManager.settings.test.animate && previousItem !== null){
                    const solutionNodes = [];
                    for (const solutionNode of this.$("solutions").children) {
                        solutionNodes.push(solutionNode);
                    }
                    for (const solutionNode of solutionNodes) {
                        solutionNode.fadeOut({
                            duration: this.itemFadeDuration });
                    }
                    this.$("test-item").fadeOut({
                        duration: this.itemFadeDuration
                    }).then(() => {
                        this.$("test-item").style.visibility = "visible";
                    });
                    for (const solutionNode of solutionNodes) {
                        this.$("solutions").removeChild(solutionNode);
                    }
                } else {
                    this.$("solutions").innerHTML = "";
                }
                this.$("test-item").textContent = newItem.entry;
                // If animation flag is set, fade in new item
                if (dataManager.settings.test.animate && previousItem !== null){
                    this.$("test-item").fadeIn({
                        duration: this.itemFadeDuration });
                }
                this._prepareMode(newItem.mode, part);
                this.$("ignore-answer").setAttribute("disabled", "");
                this.$("add-answer").setAttribute("disabled", "");
                this.$("modify-item").setAttribute("disabled", "");
                if (dataManager.settings.test.animate && previousItem !== null){
                  Velocity(this.$("levels-frame"), "fadeOut",
                           { duration: this.itemFadeDuration });
                } else {
                  this.$("levels-frame").hide();
                }
                this.$("continue-button").hide();
                this.$("evaluation-buttons").hide();
                if (dataManager.settings.test.useFlashcardMode) {
                    this.$("show-solutions-button").show();
                    this.$("show-solutions-button").focus();
                } else {
                    this.$("answer-entry").value = "";
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
