"use strict";

const menuItems = contextMenu.registerItems({
    // Shortcuts for word
    "copy-word": {
        label: "Copy word",
        click: ({ currentNode }) => {
            const word = currentNode.textContent;
            clipboard.writeText(word);
            currentNode.blur();
        }
    },
    "delete-word": {
        label: "Delete word",
        click: ({ currentNode, data: {section} }) => {
            section.deleteWord();
        }
    },
    "rename-word": {
        label: "Edit word",
        click: ({ currentNode }) => {
            currentNode.focus();
        }
    },

    // Shortcuts for translations
    "add-translation": {
        label: "Add translation",
        click: ({ data: {section} }) => {
            section.createListItem("translation");
        }
    },
    "delete-translation": {
        label: "Remove translation",
        click: ({ currentNode }) => {
            currentNode.remove();
        }
    },
    "modify-translation": {
        label: "Modify translation",
        click: ({ currentNode }) => {
            currentNode.focus();
        }
    },

    // Shortcuts for readings
    "add-reading": {
        label: "Add reading",
        click: ({ data: {section} }) => {
            section.createListItem("reading");
        }
    },
    "delete-reading": {
        label: "Remove reading",
        click: ({ currentNode }) => {
            currentNode.remove();
        }
    },
    "modify-reading": {
        label: "Modify reading",
        click: ({ currentNode }) => {
            currentNode.focus();
        }
    },

    // Shortcuts for supplementary notes
    "add-note": {
        label: "Add note",
        click: ({ data: {section} }) => {
            section.createListItem("note");
        }
    },
    "delete-note": {
        label: "Remove note",
        click: ({ currentNode }) => {
            currentNode.remove();
        }
    },
    "modify-note": {
        label: "Edit note",
        click: ({ currentNode }) => {
            currentNode.focus();
        }
    },

    // Shortcuts for vocab lists
    "add-to-list": {
        label: "Add to a list",
        click: ({ currentNode, data: {section} }) => {
            section.createListItem("vocab-list")
        }
    },
    "remove-from-list": {
        label: "Remove from list",
        click: ({ currentNode, data: {section} }) => {
            currentNode.remove();
        }
    }
});

class EditVocabPanel extends EditPanel {
    constructor() {
        super("edit-vocab", ["translation", "reading", "vocab-list", "note"]);
        this.closed = false;
        this.dictionaryId = null;
        this.originalWord = null;
        this.lastEnteredWord = null;
        this.$("word").onlyAllowPastingRawText(this.root);
        this.$("word").putCursorAtEndOnFocus(this.root);

        // Upon finishing entering word, try to load associated information
        this.$("word").addEventListener("focusout", async () => {
            if (this.closed) return;
            const newWord = this.$("word").textContent.trim();
            if (this.originalWord !== null || newWord.length === 0) return;
            if (this.dictionaryId !== null) return;
            if (this.lastEnteredWord === newWord) return;
            this.lastEnteredWord = newWord;

            // If the entered word is already added, load data from vocabulary
            const isAlreadyAdded = await dataManager.vocab.contains(newWord);
            if (isAlreadyAdded) {
                await this.load(newWord);
                this.originalWord = null;  // To stay in "add-mode"
            } else {
                this.$("header").textContent = "Add word";
            }

            // If language content is available, load suggestions as well
            if (!dataManager.content.isDictionaryAvailable()) return;
            let dictionaryId = null;
            if (isAlreadyAdded) {
                dictionaryId = await
                    dataManager.vocab.getAssociatedDictionaryId(newWord);
                if (dictionaryId === null) {
                    dictionaryId = await
                        dataManager.content.guessDictionaryId(newWord);
                }
            }
            if (dictionaryId === null) {
                dictionaryId = await
                    dataManager.content.findDictionaryIdForWord(newWord);
            }
            if (dictionaryId !== null) {
                main.suggestionPanes["edit-vocab"].load(dictionaryId, newWord);
                main.showSuggestionsPane("edit-vocab", true);
            } else {
                main.hideSuggestionPane(true);
            }
        });

        // Jump to translations when typing in a new word and pressing enter
        this.$("word").addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                if (this.originalWord === null) {
                    this.createListItem("translation");
                } else {
                    this.$("word").blur();
                }
                event.preventDefault();
            }
        });

        // SRS level selector shouldn't be accessible using tab, only shortcuts
        this.$("srs-level").setAttribute("tabindex", "-1");
        this.root.addEventListener("keydown", (event) => {
            if ("1" <= event.key && event.key <= "9" && event.ctrlKey) {
                this.$("srs-level").setByIndex(parseInt(event.key) - 1);
                event.preventDefault();
                event.stopPropagation();
            }
        });

        // Create closing and saving callbacks
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("edit-vocab"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("edit-vocab"));
        this.$("save-button").addEventListener("click", () => this.save());

        // Configure context menus for static elements
        this.$("word").contextMenu(menuItems, () =>
            this.originalWord === null ? ["copy-word", "rename-word"] :
                ["copy-word", "delete-word", "rename-word"], { section: this });
        this.$("translations-wrapper").contextMenu(
                menuItems, ["add-translation"], { section: this });
        this.$("readings-wrapper").contextMenu(
                menuItems, ["add-reading"], { section: this });
        this.$("vocab-lists-wrapper").contextMenu(
                menuItems, ["add-to-list"], { section: this });
        this.$("notes-wrapper").contextMenu(
                menuItems, ["add-note"], { section: this });

        // Set up completion tooltip for vocab-list view items
        this.vocabListCompletionTooltip =
            document.createElement("completion-tooltip");
        // this.vocabListCompletionTooltip.setPlaceholder("No matching lists.");
        this.vocabListCompletionTooltip.setAttribute("direction", "up");
        const addedLists = new Set();
        this.vocabListCompletionTooltip.setDisplayCallback((node) => {
            addedLists.clear();
            for (const childNode of this.$("vocab-lists").children) {
                if (childNode === node) continue;
                addedLists.add(childNode.textContent);
            }
        });
        this.vocabListCompletionTooltip.setSelectionCallback((node) => {
            node.classList.remove("list-not-existing");
            addedLists.clear();
        });
        this.vocabListCompletionTooltip.setData((query) => {
            const result = dataManager.vocabLists.searchForList(query);
            return result.filter((listName) => !addedLists.has(listName));
        });

        // Fade content at view borders if there are overflows
        this.$("translations-wrapper").fadeContentAtBorders(this.fadeDistance);
        this.$("readings-wrapper").fadeContentAtBorders(this.fadeDistance);
        this.$("vocab-lists-wrapper").fadeContentAtBorders(this.fadeDistance);
        this.$("notes-wrapper").fadeContentAtBorders(this.fadeDistance);
    }

    registerCentralEventListeners() {
        events.onAll(["language-changed", "current-srs-scheme-edited"], () => {
            // Fill SRS level popup stack
            const numLevels = dataManager.srs.currentScheme.numLevels;
            const intervalTexts = dataManager.srs.currentScheme.intervalTexts;
            this.$("srs-level").empty();
            for (let level = 1; level <= numLevels; ++level) {
                const option = this.$("srs-level").addOption(level);
                option.dataset.tooltip = intervalTexts[level];
            }
            this.$("srs-level").setByIndex(0);
        });
        events.on("settings-languages-readings", () => {
            this.$("readings-frame").toggleDisplay(
                dataManager.languageSettings.get("readings"));
            this.$("translations-frame").classList.toggle("readings-enabled",
                dataManager.languageSettings.get("readings"));
        });
        events.on("settings-design-animate-popup-stacks", () => {
            const animate = dataManager.settings.design.animatePopupStacks;
            this.$("srs-level").animate = animate;
        });
    }

    adjustToLanguage(language, secondary) {
        // If language is Japanese, allow editing the word with kana
        this.$("word").toggleKanaInput(language === "Japanese");
        this.$("readings").classList.toggle("pinyin", language === "Chinese");
        // Close panel if language changes while a vocabulary item is loaded
        if (main.currentPanel === "edit-vocab" && this.originalWord !== null) {
            main.closePanel("edit-vocab");
        }
    }

    open() {
        this.closed = false;
        if (this.originalWord === null) {
            this.$("word").focus();
        }
    }

    close() {
        this.closed = true;
    }

    async load(word, givenDictionaryId=null, isProperName=false) {
        // Check if the word is already in the vocabulary
        if (word !== undefined && await dataManager.vocab.contains(word)) {
            this.originalWord = word;
        } else {
            this.originalWord = null;
            this.lastEnteredWord = null;
        }

        // If a new word is getting added, clear all fields
        if (this.originalWord === null) {
            this.$("word").textContent = "";
            this.$("translations").empty();
            this.$("readings").empty();
            this.$("vocab-lists").empty();
            this.$("notes").empty();
            this.$("header").textContent = "Add word";
            this.$("srs-level").setByIndex(0);

            if (!isProperName) {
                this.dictionaryId = givenDictionaryId;
            }
            // If it's a proper name + language data is available, show details
            else if (dataManager.content.isDictionaryAvailable()) {
                this.dictionaryId = null;
                const info = await dataManager.content.getProperNameEntryInfo(
                    givenDictionaryId);
                this.$("word").textContent = info.wordsAndReadings[0].word ?
                    info.wordsAndReadings[0].word :
                    info.wordsAndReadings[0].reading;
                const reading = info.wordsAndReadings[0].reading;
                for (const translation of info.meanings[0].translations) {
                    if (translation.toKana("hiragana") === reading ||
                            translation.toKana("katakana") == reading) continue;
                    this.createListItem("translation", translation);
                }
                this.createListItem("reading", reading);
            }
            return;
        }
        this.$("header").textContent = "Edit word";

        // Load names of vocab-lists this word is added to
        this.$("vocab-lists").empty();
        const addedLists = dataManager.vocabLists.getListsForWord(word);
        for (const listName of addedLists) {
            this.createListItem("vocab-list", listName);
        }

        // Load existing data for this word, possibly including a dictionary ID
        const wordInfo = await dataManager.vocab.getInfo(word);
        const { translations, readings, notes, level, dictionaryId } = wordInfo;
        if (dictionaryId === null && givenDictionaryId !== null) {
            this.dictionaryId = givenDictionaryId;
        } else {
            this.dictionaryId = dictionaryId;
        }

        // Display the word, translations, readings, notes and the SRS level
        this.$("word").textContent = word;
        this.$("translations").empty();
        for (const translation of translations) {
            this.createListItem("translation", translation);
        }
        this.$("readings").empty();
        for (const reading of readings) {
            this.createListItem("reading", reading);
        }
        this.$("notes").empty();
        for (const note of notes) {
            this.createListItem("note", note);
        }
        this.$("srs-level").setByIndex(level - 1);
    }

    createListItem(type, text="") {
        const node = super.createListItem(type, text);

        // If a node with this text already exists, do nothing
        if (node === null) return;

        if (type === "reading") {
            node.contextMenu(menuItems,
                    ["delete-reading", "modify-reading"],
                    { section: this });
            // Enable special input methods if necessary
            node.toggleKanaInput(dataManager.currentLanguage === "Japanese");
            node.togglePinyinInput(dataManager.currentLanguage === "Chinese");
        } else if (type === "translation") {
            node.contextMenu(menuItems,
                    ["delete-translation", "modify-translation"],
                    { section: this });
        } else if (type === "vocab-list") {
            node.contextMenu(menuItems,
                    ["add-to-list", "remove-from-list"],
                    { section: this });
            // Color node according to whether list exists or not
            node.addEventListener("input", (event) => {
                const text = event.target.textContent;
                node.classList.toggle("list-not-existing",
                    !dataManager.vocabLists.existsList(text));
            });
            this.vocabListCompletionTooltip.attachTo(node);
        } else if (type === "note") {
            node.contextMenu(menuItems,
                    ["delete-note", "modify-note"], { section: this });
        }
        if (text.length === 0) {
            node.focus();
        }
        return node;
    }

    setWord(text) {
        this.$("word").textContent = text;
    }

    async deleteWord() {
        const word = this.originalWord;
        const confirmed = await dialogWindow.confirm(
            `Are you sure you want to delete the word <br> '${word}'?`);
        if (!confirmed) return false;
        const oldLists = dataManager.vocabLists.getListsForWord(word);
        await dataManager.vocab.remove(word);
        for (const listName of oldLists) {
            events.emit("removed-from-list", word, listName);
        }
        events.emit("word-deleted", word, this.dictionaryId);
        main.closePanel("edit-vocab");
        main.updateStatus(`The vocabulary entry '${word}' has been removed.`);
        return true;
    }

    async save() {
        // Prevent empty item getting added as translation/reading/note/list
        if (this.root.activeElement !== null)
            this.root.activeElement.blur();

        // Assemble all the necessary data
        const originalWord = this.originalWord;
        const word = this.$("word").textContent;
        const level = parseInt(this.$("srs-level").value);
        const translations = [];
        const readings = [];
        const lists = [];
        const notes = [];
        for (const item of this.$("translations").children)
            translations.push(item.textContent);
        for (const item of this.$("readings").children)
            readings.push(item.textContent);
        for (const item of this.$("vocab-lists").children)
            lists.push(item.textContent);
        for (const item of this.$("notes").children)
            notes.push(item.textContent);

        // If no word has been entered or no values have been entered at all,
        // display an error message (if adding) or ask whether to remove word
        if ((translations.length == 0 && readings.length == 0) || !word.length){
            if (originalWord === null) {
                if (word.length === 0) {
                    dialogWindow.info("The word to be added is missing.");
                } else {
                    dialogWindow.info("You must enter at least one translation"+
                                      " or reading to add the word.");
                }
            } else {
                this.deleteWord();
            }
            return;
        }

        // If the word already existed and was renamed, apply this change first
        const isAlreadyAdded = await dataManager.vocab.contains(word);
        const renamed = originalWord !== null && originalWord !== word;
        if (renamed) {
            if (isAlreadyAdded) {
                const confirmed = await dialogWindow.confirm(
                    `The word ${word} has already been added to the ` +
                    `vocabulary. Do you want to overwrite its values?`);
                if (!confirmed) return;
                await dataManager.vocab.remove(originalWord);
                events.emit("word-deleted", originalWord, this.dictionaryId);
            } else {
                await dataManager.vocab.rename(originalWord, word);
                events.emit("word-deleted", originalWord, this.dictionaryId);
                events.emit("word-added", word, this.dictionaryId);
            }
        }

        // Apply other changes to the database and emit corresponding events
        let dataChanged;
        if (isAlreadyAdded || renamed) {
            dataChanged = await dataManager.vocab.edit(
                word, translations, readings, notes, level);
            if (dataChanged) events.emit("vocab-changed", word);
        } else {
            await dataManager.vocab.add(
                word, translations, readings, notes, level, this.dictionaryId);
            events.emit("word-added", word, this.dictionaryId);
        }

        // Create vocabulary lists which do not exist yet (confirm first)
        const oldLists = new Set(dataManager.vocabLists.getListsForWord(word));
        const newLists = new Set(lists);
        for (const list of newLists) {
            if (!dataManager.vocabLists.existsList(list)) {
                const confirmed = await dialogWindow.confirm(
                    `There exists no list with the name '${list}'. ` +
                    `Do you want to create it now?`, true);
                if (confirmed) {
                    dataManager.vocabLists.createList(list);
                    events.emit("vocab-list-created", list, true);
                }
            }
        }

        // Apply changes to vocab-lists
        for (const list of oldLists) {
            const notInList = !newLists.has(list);
            if (notInList) {
                dataManager.vocabLists.removeWordFromList(originalWord, list);
            }
            if (notInList || renamed) {
                events.emit("removed-from-list", originalWord, list);
            }
        }
        for (const list of newLists) {
            if (!dataManager.vocabLists.existsList(list)) continue;
            const notInList = !oldLists.has(list);
            if (notInList) {
                dataManager.vocabLists.addWordToList(word, list);
            }
            if (notInList || renamed) {
                events.emit("added-to-list", word, list);
            }
        }

        // Update the status message
        if (isAlreadyAdded || renamed) {
            if (dataChanged || renamed) {
                main.updateStatus("The vocabulary entry has been updated.");
            } else if (!utility.setEqual(oldLists, newLists)) {
                main.updateStatus("Vocabulary lists have been updated.");
            }
        } else {
            const pluralSuffix = translations.length !== 1 ? "s" : "";
            main.updateStatus(`The word '${word}' and ${translations.length} ` +
                              `translation${pluralSuffix} have been added.`);
        }

        main.closePanel("edit-vocab");
    }
}

customElements.define("edit-vocab-panel", EditVocabPanel);
module.exports = EditVocabPanel;
