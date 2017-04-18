"use strict";

const menuItems = popupMenu.registerItems({
    "copy-word": {
        label: "Copy word",
        click: ({ currentNode }) => {
            const word = currentNode.textContent;
            clipboard.writeText(word);
            currentNode.blur();
        }
    },
    "delete-word": {
        label: "Remove word from SRS items",
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
            const item = section.createListItem("", "translation");
            section.$("translations").scrollToBottom();
            item.focus();
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
            const item = section.createListItem("", "reading");
            section.$("readings").scrollToBottom();
            item.focus();
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
    "remove-from-list": {
        label: "Remove from list",
        click: ({ currentNode, data: {section} }) => {
            const listName = currentNode.textContent;
            section.listNameToOption.get(listName).show();
            currentNode.remove();
        }
    }
});

class EditVocabPanel extends Panel {
    constructor() {
        super("edit-vocab");
        this.listNameToOption = new Map();
        // Make sure vocablist selector gets hidden when clicking somewhere else
        this.$("select-vocab-list-wrapper").hide();
        window.addEventListener("click", () => {
            this.$("select-vocab-list-wrapper").hide();
        });
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
        // Create callbacks for adding values
        this.$("add-translation-button").addEventListener("click", () => {
            const item = this.createListItem("", "translation");
            item.focus();
        });
        this.$("add-reading-button").addEventListener("click", () => {
            const item = this.createListItem("", "reading");
            item.focus();
        });
        this.$("add-vocab-list-button").addEventListener("click", (event) => {
            this.$("select-vocab-list-wrapper").show();
            event.stopPropagation();
        });
        // Create closing and saving callbacks
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("edit-vocab"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("edit-vocab"));
        this.$("save-button").addEventListener(
            "click", () => { this.save(); main.closePanel("edit-vocab"); });
        // Create popup menus for static elements
        this.$("word").popupMenu(menuItems,
                ["copy-word", "delete-word", "rename-word"],
                { section: this });
        this.$("translations").popupMenu(
                menuItems, ["add-translation"], { section: this });
        this.$("readings").popupMenu(
                menuItems, ["add-reading"], { section: this });
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
        events.on("vocab-list-created", (listName) => {
            const item = this.createVocabListOption(listName);
            utility.insertNodeIntoSortedList(this.$("select-vocab-list"), item);
        });
        events.on("vocab-list-deleted", (listName) => {
            this.listNameToOption.get(listName).remove();
            this.listNameToOption.delete(listName);
        });
        events.on("settings-languages-readings", () => {
            this.$("readings-frame").toggleDisplay(
                dataManager.languageSettings["readings"]);
        });
        events.on("settings-design-animate-popup-stacks", () => {
            const animate = dataManager.settings.design.animatePopupStacks;
            this.$("srs-level").animate = animate;
        });
    }

    adjustToLanguage(language, secondary) {
        // Fill vocab list selector
        this.$("select-vocab-list").empty();
        this.listNameToOption.clear();
        const allVocabLists = dataManager.vocabLists.getLists();
        allVocabLists.sort();
        for (const listName of allVocabLists) {
            this.$("select-vocab-list").appendChild(
                    this.createVocabListOption(listName));
        }
        // If language is Japanese, allow editing the word with kana
        if (language === "Japanese") {
            this.$("word").enableKanaInput("hira", this.root);
        } else {
            this.$("word").disableKanaInput();
        }
    }

    load(word) {
        // Set word
        this.originalWord = word;
        this.$("word").textContent = word;
        // Load names of vocab-lists this word is added to
        const previouslyAddedLists = this.$("vocab-lists").children;
        for (const { textContent: listName } of previouslyAddedLists) {
            if (this.listNameToOption.has(listName)) {
                this.listNameToOption.get(listName).show();
            }
        }
        this.$("vocab-lists").empty();
        const addedLists = dataManager.vocabLists.getListsForWord(word);
        for (const listName of addedLists) {
            this.createListItem(listName, "list");
        }
        // Load translations, readings and SRS level for this word
        return dataManager.vocab.getInfo(word)
        .then(({ translations, readings, level }) => {
            this.$("translations").empty();
            for (const translation of translations) {
                this.createListItem(translation, "translation");
            }
            this.$("readings").empty();
            for (const reading of readings) {
                this.createListItem(reading, "reading");
            }
            this.$("srs-level").set(this.$("srs-level").children[level - 1]);
        });
    }

    createListItem(text, type) {
        const node = document.createElement("span");
        node.textContent = text;
        // Allow editing translations and readings on click
        if (type !== "list") {
            node.contentEditable = "true";
            // If it's a Japanese reading, enable hiragana input
            node.addEventListener("focusin", () => {
                if (dataManager.currentLanguage === "Japanese" &&
                        node.parentNode === this.$("readings")) {
                    node.enableKanaInput("hira", this.root);
                }
            });
            node.addEventListener("focusout", () => {
                this.root.getSelection().removeAllRanges();
                const newText = node.textContent.trim();
                // If the node is left empty, remove it
                if (newText.length === 0) {
                    node.remove();
                    return;
                }
                // If the node is a duplicate, remove it
                for (const otherNode of node.parentNode.children) {
                    if (node === otherNode) continue;
                    if (otherNode.textContent === newText) {
                        node.remove();
                        return;
                    }
                }
                node.textContent = newText;
            });
            // If Enter key is pressed, quit editing
            node.addEventListener("keypress", (event) => {
                if (event.key === "Enter") {
                    node.blur();
                }
            });
        }
        // Insert item into DOM and attach a context-menu
        if (type === "reading") {
            this.$("readings").appendChild(node);
            node.popupMenu(menuItems, ["delete-reading", "modify-reading"],
                    { section: this });
        } else if (type === "translation") {
            this.$("translations").appendChild(node);
            node.popupMenu(menuItems,
                    ["delete-translation", "modify-translation"],
                    { section: this });
        } else if (type === "list") {
            this.$("vocab-lists").appendChild(node);
            node.popupMenu(menuItems, ["remove-from-list"], { section: this });
        }
        return node;
    }

    createVocabListOption(listName) {
        const option = document.createElement("div");
        option.textContent = listName;
        option.addEventListener("click", (event) => {
            this.$("select-vocab-list-wrapper").hide();
            this.addToVocabList(listName);
            this.$("add-vocab-list-button").blur();
            event.stopPropagation();
        });
        this.listNameToOption.set(listName, option);
        return option;
    }

    deleteWord() {
        return dialogWindow.confirm(
            `Are you sure you want to delete the word <br>` +
            `'${this.originalWord}'?`)
        .then((confirmed) => {
            if (!confirmed) return false;
            return dataManager.vocab.remove(this.originalWord).then(() => {
                main.closePanel("edit-vocab");
                events.emit("word-deleted", this.originalWord);
                events.emit("vocab-changed");
                return true;
            });
        });
    }

    addToVocabList(listName) {
        const node = document.createElement("span");
        node.textContent = listName;
        this.$("vocab-lists").appendChild(node);
        this.listNameToOption.get(listName).hide();
        node.popupMenu(menuItems, ["remove-from-list"], { section: this });
    }

    save() {
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
        let promise = Promise.resolve();
        if (originalWord !== word) {
            promise = dataManager.vocab.rename(originalWord, word);
            events.emit("word-deleted", originalWord);
            events.emit("word-added", word);
        }
        return promise.then(() =>
            // Apply changes to database
            dataManager.vocab.edit(word, translations, readings, level)
        ).then((newStatus) => {
            // Apply changes to vocab-lists
            const oldLists = dataManager.vocabLists.getListsForWord(word);
            const listsChanged = !utility.setEqual(new Set(oldLists),
                                                   new Set(lists));
            for (const list of oldLists) {
                dataManager.vocabLists.removeWordFromList(word, list);
                events.emit("removed-from-list", word, list);
            }
            for (const list of lists) {
                dataManager.vocabLists.addWordToList(word, list);
                events.emit("added-to-list", word, list);
            }
            if (newStatus === "removed") {
                events.emit("word-deleted", originalWord);
                main.updateStatus("The vocabulary entry has been removed.");
            } else if (newStatus === "updated" || originalWord !== word) {
                events.emit("vocab-changed", word);
                main.updateStatus("The vocabulary entry has been updated.");
            } else if (listsChanged) {
                main.updateStatus("Vocabulary lists have been updated.")
            }
        });
    }
}

customElements.define("edit-vocab-panel", EditVocabPanel);
module.exports = EditVocabPanel;
