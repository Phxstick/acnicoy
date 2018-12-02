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
        label: "Rename word",
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

        // Allow editing the loaded word
        this.$("word").addEventListener("focusin", () => {
            this.wordBeforeEditing = this.$("word").textContent;
        });
        this.$("word").addEventListener("focusout", () => {
            this.root.getSelection().removeAllRanges();
            if (this.$("word").textContent.trim().length === 0) {
                this.deleteWord().then((confirmed) => {
                    if (!confirmed) {
                        this.$("word").textContent = this.wordBeforeEditing;
                    }
                });
            }
        });
        this.$("word").addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                this.$("word").blur();
            }
        });

        // Create closing and saving callbacks
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("edit-vocab"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("edit-vocab"));
        this.$("save-button").addEventListener("click", () => this.save());

        // Create context menus for static elements
        this.$("word").contextMenu(menuItems,
                ["copy-word", "delete-word", "rename-word"],
                { section: this });
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
            const filteredResult = [];
            for (const listName of result) {
                if (!addedLists.has(listName)) {
                    filteredResult.push(listName);
                }
            }
            filteredResult.sort();
            return filteredResult;
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
    }

    load(word) {
        // Set word
        this.originalWord = word;
        this.$("word").textContent = word;
        // Load names of vocab-lists this word is added to
        this.$("vocab-lists").empty();
        const addedLists = dataManager.vocabLists.getListsForWord(word);
        for (const listName of addedLists) {
            this.createListItem("vocab-list", listName);
        }
        // Load translations, readings and SRS level for this word
        return dataManager.vocab.getInfo(word)
        .then(({ translations, readings, level, dictionaryId }) => {
            this.dictionaryId = dictionaryId;
            this.$("translations").empty();
            for (const translation of translations) {
                this.createListItem("translation", translation);
            }
            this.$("readings").empty();
            for (const reading of readings) {
                this.createListItem("reading", reading);
            }
            this.$("srs-level").set(this.$("srs-level").children[level - 1]);
        });
    }

    createListItem(type, text="") {
        const node = super.createListItem(type, text);
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
                    { section: this })
            // Color node according to whether list exists or not
            node.addEventListener("input", (event) => {
                const text = event.target.textContent;
                node.classList.toggle("list-not-existing",
                    !dataManager.vocabLists.existsList(text));
            });
            this.vocabListCompletionTooltip.attachTo(node);
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
        return true;
    }

    async save() {
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

        // If the word was renamed, apply this change first
        if (originalWord !== word) {
            await dataManager.vocab.rename(originalWord, word);
            events.emit("word-deleted", originalWord, this.dictionaryId);
            events.emit("word-added", word, this.dictionaryId);
        }
        // Apply changes to database
        const newStatus = await dataManager.vocab.edit(
                word, translations, readings, level);

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
        if (newStatus !== "removed") {
            for (const list of newLists) {
                if (!oldLists.has(list)) {
                    dataManager.vocabLists.addWordToList(word, list);
                    events.emit("added-to-list", word, list);
                }
            }
        }

        // Emit events and change status message
        if (newStatus === "removed") {
            events.emit("word-deleted", originalWord, this.dictionaryId);
            main.updateStatus("The vocabulary entry has been removed.");
        } else if (newStatus === "updated" || originalWord !== word) {
            events.emit("vocab-changed", word);
            main.updateStatus("The vocabulary entry has been updated.");
        } else if (!utility.setEqual(oldLists, newLists)) {
            main.updateStatus("Vocabulary lists have been updated.")
        }
        main.closePanel("edit-vocab");
    }
}

customElements.define("edit-vocab-panel", EditVocabPanel);
module.exports = EditVocabPanel;
