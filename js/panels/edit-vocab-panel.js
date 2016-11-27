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
        label: "Delete translation",
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
        label: "Delete reading",
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
            currentNode.remove();
            if (section.$("vocab-lists").children.length === 0) {
                section.$("vocab-lists-header").hide();
            }
        }
    }
});

class EditVocabPanel extends Panel {
    constructor() {
        super("edit-vocab");
        // Allow editing the loaded word
        this.$("word").enableKanaInput("hira", this.root);
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
        this.$("add-vocab-list-button").addEventListener("click", () => {
            const lists = [];
            for (const item of this.$("vocab-lists").children)
                lists.push(item.textContent);
            const newList = this.$("select-vocab-list").value;
            const word = this.$("word").textContent;
            if (!lists.includes(newList) && newList.length > 0) {
                const node = document.createElement("span");
                node.textContent = newList;
                this.$("vocab-lists").appendChild(node);
                node.popupMenu(menuItems,
                        ["remove-from-list"], { section: this });
                this.$("vocab-lists-header").show();
            }
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
        events.onAll(["language-changed", "srs-scheme-changed"], () => {
            for (let i = 1; i < this.$("srs-level").children.length + 1; ++i) {
                const option = this.$("srs-level").children[i - 1];
                option.dataset.tooltip = dataManager.srs.intervalTexts[i];
            }
        });
    }

    adjustToLanguage(language, secondary) {
        // Fill SRS level popup stack
        const numLevels = dataManager.srs.numLevels;
        this.$("srs-level").empty();
        for (let i = 1; i < numLevels; ++i) this.$("srs-level").addOption(i);
        this.$("srs-level").set(this.$("srs-level").firstChild);
        // Fill vocab list selector
        this.$("select-vocab-list").empty();
        this.defaultListOption = utility.createDefaultOption(
            "Select a vocab list to add word to");
        this.$("select-vocab-list").appendChild(this.defaultListOption);
        const lists = dataManager.vocabLists.getLists();
        for (const list of lists) {
            const option = document.createElement("option");
            option.value = list;
            option.textContent = list;
            this.$("select-vocab-list").appendChild(option);
        }
        // Only display list of readings if they're enabled for this language
        this.$("readings-frame").toggleDisplay(
            dataManager.languageSettings["readings"]);
    }

    load(word) {
        // Set word
        this.originalWord = word;
        this.$("word").textContent = word;
        // Load vocab lists this word is added to
        this.$("vocab-lists").empty();
        const lists = dataManager.vocabLists.getListsForWord(word);
        for (const list of lists) {
            this.createListItem(list, "list");
        }
        this.$("vocab-lists-header").toggleDisplay(lists.length > 0);
        // Select default option
        this.defaultListOption.setAttribute("selected", "");
        this.defaultListOption.value = "";
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
            // If it's a reading, enable hiragana input
            node.addEventListener("focusin", () => {
                if (node.parentNode === this.$("readings")) {
                    node.enableKanaInput("hira", this.root);
                }
            });
            // If the node is left empty, remove it upon losing focus
            node.addEventListener("focusout", () => {
                this.root.getSelection().removeAllRanges();
                node.textContent = node.textContent.trim();
                if (node.textContent.length === 0) {
                    node.remove();
                }
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
            for (const list of oldLists) {
                dataManager.vocabLists.removeWordFromList(word, list);
            }
            for (const list of lists) {
                dataManager.vocabLists.addWordToList(word, list);
            }
            if (newStatus === "removed") {
                events.emit("word-deleted", originalWord);
                main.updateStatus("The vocabulary entry has been removed.");
            } else if (newStatus === "updated") {
                events.emit("vocab-changed");
                main.updateStatus("The vocabulary entry has been updated.");
            } else if (newStatus === "no-change") {
                if (originalWord === word) {
                    main.updateStatus(
                        "The vocabulary entry has not been changed.");
                } else {
                    main.updateStatus(
                        "The vocabulary entry has been renamed.");
                }
            }
        });
    }
}

customElements.define("edit-vocab-panel", EditVocabPanel);
module.exports = EditVocabPanel;
