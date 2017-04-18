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
        this.itemFadeDistance = 300;  // Set in scss as well!
        this.solutionFadeDuration = 100;
        this.solutionFadeDistance = 10;  // Set in scss as well!
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
        this.$("solutions").addEventListener("scroll", () => {
            this.$("solutions").fadeScrollableBorders();
        });
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
        this.$("abort-session").addEventListener("click", () => {
            this.closeSession();
        });
        this.$("wrap-up").addEventListener("click", () => {
            this.testInfo.items.length = 0;
            this.testInfo.numTotal = this.testInfo.numFinished
                                     + this.testInfo.pickedItems.length + 1;
            this.$("progress").max = this.testInfo.numTotal;
            this.$("progress-text").textContent =
                `${this.testInfo.numFinished} / ${this.testInfo.numTotal}`;
            if (!this.testInfo.vocabListMode) {
                main.updateTestButton();
            }
            this.$("wrap-up").hide();
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
                main.openPanel("edit-kanji", { entryName: item.entry });
            } else if (item.mode === dataManager.test.mode.WORDS) {
                main.openPanel("edit-vocab", { entryName: item.entry });
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
            if (dataManager.settings.test.useBackgroundColors) {
                if (this.testInfo !== null) {
                    const mode = this.testInfo.currentItem.mode;
                    const part = this.testInfo.currentPart;
                    this._applyColors(mode, part);
                }
            } else {
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
            if (this.testInfo === null) return;
            const currentItem = this.testInfo.currentItem;
            if (currentItem.entry === word &&
                    currentItem.mode === dataManager.test.mode.WORDS) {
                this.testInfo.numTotal--;
                this.testInfo.skipNextEvaluation = true;
                this._createQuestion();
            }
        });
        events.on("kanji-removed", (kanji) => {
            if (this.testInfo === null) return;
            const currentItem = this.testInfo.currentItem;
            if (currentItem.entry === kanji &&
                  (currentItem.mode === dataManager.test.mode.KANJI_MEANINGS ||
                   currentItem.mode === dataManager.test.mode.KANJI_ON_YOMI ||
                   currentItem.mode === dataManager.test.mode.KANJI_KUN_YOMI)) {
                this.testInfo.numTotal--;
                this.testInfo.skipNextEvaluation = true;
                this._createQuestion();
            }
        });
        // If current item has been edited, display new solutions
        events.onAll(["vocab-changed", "kanji-changed"], (entry) => {
            if (this.testInfo === null) return;
            const item = this.testInfo.currentItem;
            if (item.entry === entry) {
                dataManager.test.getSolutions(
                    item.entry, item.mode, this.testInfo.currentPart)
                .then((solutions) => {
                    if (solutions.length === 0) {
                        if (item.parts.length === 0) {
                            this.testInfo.numTotal--;
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
        // If no test session is currently running, create one
        if (this.testInfo === null) {
            this.createTest();
        } else {
            // Register shortcut for ignoring answer
            if (this.testInfo.inEvalStep &&
                   !dataManager.settings.test.useFlashcardMode &&
                   dataManager.settings.test.enableIgnoreShortcut) {
                shortcuts.register("ignore-answer", () => this._ignoreAnswer());
            }
            // Put focus on correct element
            if (dataManager.settings.test.useFlashcardMode) {
                if (this.testInfo.inEvalStep) {
                    this.$("evaluation-button-correct").focus();
                } else {
                    this.$("show-solutions-button").focus();
                }
            } else {
                if (this.testInfo.inEvalStep) {
                    this.$("continue-button").focus();
                } else {
                    this.$("answer-entry").focus();
                }
            }
        }
    }

    confirmClose() {
        if (!dataManager.settings.test.makeContinuous)
            return this.abortSession();
        return true;
    }

    async abortSession() {
        if (this.testInfo !== null) {
            const confirmed = await dialogWindow.confirm(
                "A test session is still running.<br>Do you want to abort it?");
            if (confirmed) this.testInfo = null;
            return confirmed;
        }
        return true;
    }

    close() {
        shortcuts.unregister("ignore-answer");
    }

    /* =====================================================================
        Private testing functions
    ===================================================================== */

    async createTest(vocabList) {
        if (!await this.abortSession()) return false;
        const testInfo = {
            pickedItems: [],
            mistakes: [],
            currentItem: null,
            currentPart: null,
            numCorrect: 0,
            numIncorrect: 0,
            numFinished: 0,
            inEvalStep: false,
            skipNextEvaluation: false
        };
        let items;
        let vocabListMode;
        let additionalTestInfo;
        if (vocabList === undefined) {
            this.$("session-info").textContent = "Testing on SRS items";
            this.$("vocab-list").hide();
            items = await this._getTestItems();
            vocabListMode = false;
            additionalTestInfo = {
                lastUpdateTime: utility.getTime(),
                score: 0
            };
        } else {
            this.$("session-info").textContent = "Testing on vocabulary list:";
            this.$("vocab-list").textContent = vocabList;
            this.$("vocab-list").show();
            this.$("score").textContent = "";
            const itemPromises = [];
            const words = dataManager.vocabLists.getWordsForList(vocabList);
            for (const word of words) {
                itemPromises.push(
                    this._createTestItem(word, dataManager.test.mode.WORDS));
            }
            items = await Promise.all(itemPromises);
            vocabListMode = true;
            additionalTestInfo = {};
        }
        this.$("wrap-up").show();
        this.testInfo = Object.assign(testInfo, additionalTestInfo, {
            items, numTotal: items.length, vocabListMode
        });
        await utility.finishEventQueue();
        this._createQuestion();
        return true;
    }

    closeSession() {
        if (this.testInfo.numFinished > 0) {
            overlays.open("test-complete", this.testInfo);
        }
        const inVocabListMode = this.testInfo.vocabListMode;
        this.testInfo = null;
        main.openSection(inVocabListMode ? "vocab" : "home");
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
        this.$("solutions").fadeScrollableBorders();
        let delay = 0; 
        // If animation flag is set, fade and slide labels down a bit
        utility.finishEventQueue().then(() => {
            if (animate) {
                const solutionNodes = [];
                for (const solutionNode of this.$("solutions").children) {
                    if (solutionNode.offsetTop >
                            this.$("solutions").offsetHeight) {
                        solutionNode.style.opacity = "1";
                    } else {
                        solutionNodes.push(solutionNode);
                    }
                }
                for (const solutionNode of solutionNodes) {
                    solutionNode.fadeIn({
                        distance: this.solutionFadeDistance,
                        duration: this.solutionFadeDuration,
                        direction: "right",
                        delay: delay
                    });
                    delay += this.solutionFadeDelay;
                }
            }
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
        if (dataManager.settings.test.useBackgroundColors) {
            this._applyColors(mode, part);
        }
    }

    // Use colors according to item type (mode and part)
    _applyColors(mode, part) {
        const modes = dataManager.test.mode;
        let className;
        switch (mode) {
            case modes.WORDS:
                if (part === "meanings") className = "word-meaning";
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
                // Update SRS system, daily stats, testInfo and counters
                if (!this.testInfo.vocabListMode) {
                    dataManager.stats.incrementTestedCounter(item.mode);
                    scoreGain = dataManager.stats.updateScore(
                        item.mode, item.level, newLevel);
                    dataManager.srs.setLevel(item.entry, newLevel, item.mode);
                    this.testInfo.score += scoreGain;
                }
                this.testInfo.numFinished++;
                const itemCorrect = !item.marked && !item.lastAnswerIncorrect;
                if (itemCorrect) {
                    dataManager.test.incrementCorrectCounter(
                        item.entry, item.mode);
                    this.testInfo.numCorrect++;
                } else {
                    dataManager.test.incrementMistakesCounter(
                        item.entry, item.mode);
                    this.testInfo.numIncorrect++;
                    this.testInfo.mistakes.push({
                        name: this.testInfo.currentItem.entry,
                        mode: this.testInfo.currentItem.mode,
                        part: this.testInfo.currentPart
                    });
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
        this.$("progress").max = this.testInfo.numTotal;
        this.$("progress").value = this.testInfo.numFinished;
        this.$("progress-text").textContent =
            `${this.testInfo.numFinished} / ${this.testInfo.numTotal}`;
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
                this.testInfo.numTotal += newItems.length;
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
                if (!this.testInfo.vocabListMode) {
                    dataManager.database.run("END TRANSACTION");
                }
                this.closeSession();
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
                        this.testInfo.numTotal--;
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
                    const { top: solutionFrameTop, bottom: solutionFrameBottom,
                            left: solutionFrameLeft, right: solutionFrameRight }
                        = this.$("solutions").getBoundingClientRect();
                    // Animate all solution nodes which are visible
                    for (const solutionNode of solutionNodes) {
                        const { top: solutionNodeTop,
                                bottom: solutionNodeBottom } =
                            solutionNode.getBoundingClientRect();
                        if (solutionNodeBottom >= solutionFrameTop &&
                                solutionNodeTop < solutionFrameBottom) {
                            solutionNode.fadeOut({
                                duration: this.itemFadeDuration, zIndex: "-1" })
                        }
                    }
                    // Animate test item
                    this.$("test-item").fadeOut({
                        duration: this.itemFadeDuration
                    }).then(() => {
                        // Reset test item and solution containers afterwards
                        this.$("test-item").style.visibility = "visible";
                        this.$("solutions").classList.remove("stretch-shadows");
                        this.$("solutions").style.width = "auto";
                        this.$("solutions").style.height = "auto";
                        this.$("solutions").style.left = "0";
                        this.$("solutions").style.top = "0";
                        this.$("solutions").style.position = "static";
                        this.$("solutions-wrapper").style.width = "auto";
                        this.$("solutions-wrapper").style.height = "auto";
                        this.$("solutions-wrapper").style.left = "0";
                        this.$("solutions-wrapper").style.top = "0";
                        this.$("solutions-wrapper").style.position = "relative";
                    });
                    // Keep shape of solution containers and stretch shadows
                    const rootOffsets = this.$("solutions").getRoot().host
                                        .getBoundingClientRect();
                    const solutionsWidth = this.$("solutions").offsetWidth;
                    const solutionsHeight = this.$("solutions").offsetHeight;
                    this.$("solutions").classList.add("stretch-shadows");
                    this.$("solutions").style.left =
                        `${solutionFrameLeft - rootOffsets.left}px`;
                    this.$("solutions").style.top =
                        `${solutionFrameTop - rootOffsets.top}px`;
                    this.$("solutions").style.width = `${solutionsWidth}px`;
                    this.$("solutions").style.height = `${solutionsHeight}px`;
                    this.$("solutions").style.position = "fixed";
                    this.$("solutions-wrapper").style.left =
                        `${solutionFrameLeft - rootOffsets.left}px`;
                    this.$("solutions-wrapper").style.top =
                        `${solutionFrameTop - rootOffsets.top}px`;
                    this.$("solutions-wrapper").style.width =
                        `${solutionsWidth}px`;
                    this.$("solutions-wrapper").style.height =
                        `${solutionsHeight}px`;
                    this.$("solutions-wrapper").style.position = "fixed";
                    // Empty solution container
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
            parts: [
                mode === dataManager.test.mode.WORDS ? "meanings" : "solutions"]
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
