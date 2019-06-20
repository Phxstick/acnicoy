"use strict";

const menuItems = contextMenu.registerItems({
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
        super("edit-vocab", ["translation", "reading", "vocab-list"]);
        this.dictionaryId = null;
        this.originalWord = null;
        this.$("word").onlyAllowPastingRawText(this.root);
        this.$("word").putCursorAtEndOnFocus(this.root);

        // Check if the entered word is already added and load its data if so
        this.$("word").addEventListener("focusout", async () => {
            const newWord = this.$("word").textContent.trim();
            if (this.originalWord === null && newWord.length > 0) {
                const isAlreadyAdded = await dataManager.vocab.contains(newWord)
                if (isAlreadyAdded) {
                    await this.load(newWord);
                    this.originalWord = null;
                } else {
                    this.$("header").textContent = "Add word";
                }
                // If language content is available, load suggestions as well
                if (dataManager.currentLanguage === "Japanese" &&
                        dataManager.currentSecondaryLanguage === "English" &&
                        dataManager.content.isLoadedFor("Japanese","English")) {
                    let dictionaryId = null;
                    if (isAlreadyAdded) {
                        dictionaryId = await
                            dataManager.vocab.getAssociatedDictionaryId(newWord)
                    }
                    if (dictionaryId === null) {
                        // TODO: Guess a dictionary ID by word only
                    }
                    if (dictionaryId !== null) {
                        main.suggestionPanes["edit-vocab"].load(dictionaryId, newWord);
                        // TODO: Show suggestion pane
                    }
                }
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

        // Create context menus for static elements
        this.$("word").contextMenu(menuItems, () =>
            this.originalWord === null ? ["copy-word", "rename-word"] :
                ["copy-word", "delete-word", "rename-word"], { section: this });
        this.$("translations-wrapper").contextMenu(
                menuItems, ["add-translation"], { section: this });
        this.$("readings-wrapper").contextMenu(
                menuItems, ["add-reading"], { section: this });
        this.$("vocab-lists-wrapper").contextMenu(
                menuItems, ["add-to-list"], { section: this });

        // Create completion tooltip for vocab-list view items
        this.vocabListCompletionTooltip =
            document.createElement("completion-tooltip");
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
        if (this.originalWord === null) {
            this.$("word").focus();
        }
    }

    async load(word, givenDictionaryId=null) {
        // Check if the word is already in the vocabulary
        if (word !== undefined && await dataManager.vocab.contains(word)) {
            this.originalWord = word;
        } else {
            this.originalWord = null;
        }

        // If a new word is getting added, just clear all fields
        if (this.originalWord === null) {
            this.$("word").textContent = "";
            this.$("translations").empty();
            this.$("readings").empty();
            this.$("vocab-lists").empty();
            this.$("header").textContent = "Add word";
            this.$("srs-level").setByIndex(0);
            this.dictionaryId = givenDictionaryId;
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
        const { translations, readings, level, dictionaryId } = wordInfo;
        if (dictionaryId === null && givenDictionaryId !== null) {
            this.dictionaryId = givenDictionaryId;
        } else {
            this.dictionaryId = dictionaryId;
        }

        // Display the word, translations, readings and the SRS level
        this.$("word").textContent = word;
        this.$("translations").empty();
        for (const translation of translations) {
            this.createListItem("translation", translation);
        }
        this.$("readings").empty();
        for (const reading of readings) {
            this.createListItem("reading", reading);
        }
        this.$("srs-level").setByIndex(level - 1);
    }

    createListItem(type, text="") {
        const createNewItemOnEnter = type !== "vocab-list";
        const node = super.createListItem(type, text, createNewItemOnEnter);
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
        events.emit("vocab-changed");
        main.closePanel("edit-vocab");
        main.updateStatus(`The vocabulary entry '${word}' has been removed.`);
        return true;
    }

    async save() {
        // Prevent empty item getting added as translation/reading/list
        if (this.root.activeElement !== null)
            this.root.activeElement.blur();
        // Assemble all the necessary data
        const originalWord = this.originalWord;
        const word = this.$("word").textContent;
        const level = parseInt(this.$("srs-level").value);
        const translations = [];
        const readings = [];
        const lists = [];
        for (const item of this.$("translations").children)
            translations.push(item.textContent);
        for (const item of this.$("readings").children)
            readings.push(item.textContent);
        for (const item of this.$("vocab-lists").children)
            lists.push(item.textContent);

        // Display error messages if something is missing
        if (word.length === 0) {
            if (originalWord === null) {
                dialogWindow.info("The word to be added is missing.");
            } else {
                // If the word was already added, ask whether to remove it
                this.deleteWord();
            }
            return;
        }
        if (translations.length === 0) {
            dialogWindow.info("No translations have been entered.");
            return;
        }

        // If the word already existed and was renamed, apply this change first
        if (originalWord !== null && originalWord !== word) {
            await dataManager.vocab.rename(originalWord, word);
            events.emit("word-deleted", originalWord, this.dictionaryId);
            events.emit("word-added", word, this.dictionaryId);
        }

        // Apply other changes to the database
        const isAlreadyAdded = await dataManager.vocab.contains(word);
        let dataChanged = false;
        if (isAlreadyAdded) {
            dataChanged = await dataManager.vocab.edit(
                    word, translations, readings, level);
        } else {
            await dataManager.vocab.add(
                    word, translations, readings, level, this.dictionaryId);
        }

        // Create vocabulary lists which do not exist yet (confirm first)
        const oldLists = new Set(dataManager.vocabLists.getListsForWord(word));
        const newLists = new Set(lists);
        for (const list of newLists) {
            if (!dataManager.vocabLists.existsList(list)) {
                const confirmed = await dialogWindow.confirm(
                    `There exists no list with the name '${list}'. ` +
                    `Do you want to create it now?`);
                if (confirmed) {
                    dataManager.vocabLists.createList(list);
                    events.emit("vocab-list-created", list, true);
                }
            }
        }

        // Apply changes to vocab-lists
        for (const list of oldLists) {
            if (!newLists.has(list)) {
                dataManager.vocabLists.removeWordFromList(originalWord, list);
                events.emit("removed-from-list", originalWord, list);
            }
        }
        for (const list of newLists) {
            if (!oldLists.has(list)) {
                if (dataManager.vocabLists.existsList(list)) {
                    dataManager.vocabLists.addWordToList(word, list);
                    events.emit("added-to-list", word, list);
                }
            }
        }

        // Emit events and change status message
        if (isAlreadyAdded) {
            if (dataChanged || (originalWord !== null && originalWord!==word)) {
                events.emit("vocab-changed", word);
                main.updateStatus("The vocabulary entry has been updated.");
            } else if (!utility.setEqual(oldLists, newLists)) {
                main.updateStatus("Vocabulary lists have been updated.");
            } else if (this.originalWord === null) {
                main.updateStatus("The vocabulary entry has not been changed.");
            }
        } else {
            const pluralSuffix = translations.length !== 1 ? "s" : "";
            events.emit("word-added", word, this.dictionaryId);
            main.updateStatus(`The word '${word}' and ${translations.length} ` +
                              `translation${pluralSuffix} have been added.`);
        }

        main.closePanel("edit-vocab");
    }
}

customElements.define("edit-vocab-panel", EditVocabPanel);
module.exports = EditVocabPanel;
