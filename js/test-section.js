"use strict";

const Random = require("random-js");
const random = new Random(Random.engines.nativeMath);

utility.processDocument(document.currentScript.ownerDocument, (docContent) => {
class TestSection extends TrainerSection {
    constructor() {
        super();
        this.root = this.createShadowRoot();
        this.root.appendChild(docContent);
        // Store important DOM elements as class members
        this.statusLabel = this.root.getElementById("status");
        this.itemsDiv = this.root.getElementById("items");  // Rename this...
        this.testItem = this.root.getElementById("test-item");
        this.ignoreAnswerButton = this.root.getElementById("ignore-answer");
        this.modifyItemButton = this.root.getElementById("modify-item");
        this.addAnswerButton = this.root.getElementById("add-answer");
        this.continueButton = this.root.getElementById("continue");
        this.answerEntry = this.root.getElementById("answer");
        this.correctAnswers = this.root.getElementById("correct-answers");
        // Set some numbers and constants
        this.delay = 300;
        this.lastPress = 0;
        this.animate = false;
        // Add callbacks
        this.ignoreAnswerButton.addEventListener("click", () => {
            this._ignoreAnswer();
        });
        this.continueButton.addEventListener("click", () => {
            const time = new Date().getTime();
            if (time - this.lastPress > this.delay) {
                this._createQuestion();
                this.lastPress = time;
            }
        });
        this.answerEntry.addEventListener("keypress", (event) => {
            const time = new Date().getTime();
            if (event.which === 13 && time - this.lastPress > this.delay) {
                this._evaluateAnswer();
                this.lastPress = time;
            }
        });
        this.modifyItemButton.addEventListener("click", () => {
            const item = this.testInfo.item;
            if (item.mode === dataManager.test.mode.KANJI_MEANINGS ||
                    item.mode === dataManager.test.mode.KANJI_ON_YOMI ||
                    item.mode === dataManager.test.mode.KANJI_KUN_YOMI) {
                main.editKanjiPanel.load(item.entry);
                main.openPanel(main.editKanjiPanel);
            } else if (item.mode === dataManager.test.mode.WORDS) {
                main.editVocabPanel.load(item.entry);
                main.openPanel(main.editVocabPanel);
            }
            // TODO: Immediately modify test item afterwards?
        });
        this.addAnswerButton.addEventListener("click", () => {
            // TODO: Implement
            main.updateStatus("Not yet implemented!");
            // this._createQuestion();
        });
        // Create popup-menus
        const testItemPopup = new PopupMenu();
        testItemPopup.attachTo(this.testItem);
        testItemPopup.addItem("Copy", () => {
            clipboard.writeText(this.testItem.textContent);
        });
        eventEmitter.emit("done-loading");
    }

    /**
    *   Functions from TrainerSection
    **/

    open() {
        // ... Adjust widgets to settings
        if (dataManager.settings["test"]["progress_flag"]) {
            // ... pack progress bar
        } else {
            // ... unpack progress bar
        }
        if (dataManager.settings["test"]["stats_flag"]) {
            // ... pack stats bar
        } else {
            // ... unpack stats bar
        }
        this.testFinished = false;
        this._createTest();
    }

    close() {
        // ... clear stats bar ?
        // ... clear progress bar ?
        dataManager.stats.save();
        main.updateTestButton();
        // unregisterShortcut("Ctrl+R");
    }

    confirmClose() {
        return this.testFinished ||
            dialogWindow.confirm("Are you sure you want to cancel the test?");
    }

    /**
    *   Private testing functions
    **/

    _evaluateAnswer() {
        const answer = this.answerEntry.value.trim();
        const item = this.testInfo.item;
        const entry = item.entry;
        const part = this.testInfo.part;
        if (item.lastAnswerIncorrect)
            item.marked = true;
        this._getSolutions(entry, item.mode, part)
        .then(([originalSolutions, solutions]) => {
            let isCorrect = true;
            if (!solutions.has(answer)) {
                let match = false;
                for (let solution of solutions) {
                    if (part !== "readings" && 
                        utility.calculateED(answer, solution)
                            < solution.length / 4)
                        match = true;
                }
                if (!match) {
                    item.parts.push(part);
                    isCorrect = false;
                }
            }
            item.lastAnswerIncorrect = !isCorrect;
            // registerShortcut("Ctrl+R",
            //     () => this._ignoreAnswer(this.testInfo.item, this.testInfo.part));
            // Display stuff
            this.answerEntry.value = "";
            this._showAnswers(originalSolutions);
            this.statusLabel.textContent = isCorrect ?
                "Correct answer!" : "Wrong answer!";
            this.statusLabel.style.color = isCorrect ?
                "lawngreen" : "orange";
            this.ignoreAnswerButton.removeAttribute("disabled");
            if (!isCorrect) this.addAnswerButton.removeAttribute("disabled");
            this.modifyItemButton.removeAttribute("disabled");
            // this.statusLabel.style.textShadow = "0 0 1px whitesmoke";
            // Exchange button and entry
            this.continueButton.style.display = "block";
            this.answerEntry.style.display = "none";
            this.continueButton.focus();
        });
    }

    _prepareMode(mode, part) {
        this.statusLabel.style.color = "whitesmoke";
        // Choose right input method (for translations or readings)
        if (mode === dataManager.test.mode.KANJI_KUN_YOMI)
            this.answerEntry.enableKanaInput("hira");
        else if (mode === dataManager.test.mode.KANJI_ON_YOMI)
            this.answerEntry.enableKanaInput("kata");
        else if (part === "readings")
            this.answerEntry.enableKanaInput("hira");
        else
            this.answerEntry.disableKanaInput();
        // Choose the right status label
        if (part === "readings") {
            this.statusLabel.textContent = "How do you read this word?";
        } else {
            let text;
            if (mode === dataManager.test.mode.WORDS)
                text = `Translate from ${main.language} into ${main.language2}`;
            else if (mode === dataManager.test.mode.KANJI_MEANINGS)
                text = `What could the following kanji mean?`;
            else if (mode === dataManager.test.mode.KANJI_ON_YOMI)
                text =  `Name an ON-Yomi of the following kanji.`;
            else if (mode === dataManager.test.mode.KANJI_KUN_YOMI)
                text = `Name a KUN-Yomi of the following kanji.`;
            this.statusLabel.textContent = text;
        }
    }

    _createQuestion() {
        // Apply result to stats if the last item was finished (and exists),
        // Otherwise insert it back into the test item list
        const item = this.testInfo.item;
        const items = this.testInfo.itemList;
        if (item !== null) {
            if (item.parts.length === 0) {
                let answeredCorrectly;
                if (!item.marked && !item.lastAnswerIncorrect) {
                    answeredCorrectly = true;
                    this.testInfo.numCorrect++;
                } else {
                    answeredCorrectly = false;
                    this.testInfo.numIncorrect++;
                }
                this._updateData(item, answeredCorrectly);
            } else {
                items.push(item);
            }
        }
        // Check if the test is completed (no items left)
        if (items.length === 0) {
            alert(`Correct: ${this.testInfo.numCorrect}\n` +
                  `Wrong: ${this.testInfo.numIncorrect}`);
            // TODO: Prepare and show test-complete stuff
            this.testFinished = true;
            main.openSection("home-section");
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
        const promise = this.animate ? 
            this.itemsDiv.fadeOut(300).then(
                    () => this.itemsDiv.visibility = "visible") :
                    Promise.resolve();
        promise.then(() => {
            // Display stuff
            this._prepareMode(newItem.mode, part);
            this.testItem.textContent = newItem.entry;
            this.correctAnswers.innerHTML = "";
            this.ignoreAnswerButton.setAttribute("disabled", "");
            this.addAnswerButton.setAttribute("disabled", "");
            this.modifyItemButton.setAttribute("disabled", "");
            // Exchange button and entry
            this.continueButton.style.display = "none";
            this.answerEntry.style.display = "block";
            this.answerEntry.focus();
        });
    }

    _showAnswers(solutions) {
        for (let solution of solutions) {
            const div = document.createElement("div");
            div.textContent = solution;
            this.correctAnswers.appendChild(div);
        }
    }

    _ignoreAnswer() {
        if (!this.testInfo.item.lastAnswerIncorrect)
            this.testInfo.item.parts.push(this.testInfo.part);
        this.testInfo.item.lastAnswerIncorrect = false;
        this._createQuestion();
        // unregisterShortcut("Ctrl+R");
    }

    /**
     * Updates SRS system and daily stats.
     */
    _updateData(item, answeredCorrectly) {
        let newLevel =
            answeredCorrectly ? item.level + 1 : Math.max(1, item.level - 1);
        dataManager.stats.incrementTestedCounter(item.mode);
        dataManager.stats.updateDailyScore(item.mode, item.level, newLevel);
        dataManager.srs.setLevel(item.entry, newLevel, item.mode);
    }

    _getSolutions(entry, mode, part) {
        const promise = dataManager.test.getSolutions(entry, mode, part);
        // TODO: Move the following to dataManager aswell!!
        return promise.then((result) => {
            const solutions = new Set(result);
            const originalSolutions = new Set(result);
            // If the language is English, make solutions without "to" count
            if (main.language2 === "English") {
                for (let solution of originalSolutions) {
                    if (solution.startsWith("to "))
                        solutions.add(solution.slice(3));
                }
            }
            // Also ignore braces and their content for the solutions
            const pattern = /\(.*?\)/g;
            const temp = new Set(solutions);
            for (let solution of temp)
                solutions.add(solution.replace(pattern, "").trim());
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
        const vocabPart = dataManager.srs.getScheduledVocab().then((words) => {
            for (let word of words) {
                promises.push(
                    this._createTestItem(word, dataManager.test.mode.WORDS)
                    .then((item) => itemList.push(item)));
            }
        });
        // Assemble kanji part of the testitem list if the language is Japanese
        let kanjiParts = [];
        if (main.language === "Japanese") {
            for (let mode of [dataManager.test.mode.KANJI_MEANINGS,
                              dataManager.test.mode.KANJI_ON_YOMI,
                              dataManager.test.mode.KANJI_KUN_YOMI]) {
                kanjiParts.push(dataManager.srs.getScheduledKanji(mode)
                .then((result) => {
                    for (let kanji of result) {
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
});
