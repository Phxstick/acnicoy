"use strict";

const menuItems = popupMenu.registerItems({
    "copy-word": {
        label: "Copy item",
        click: ({ currentNode }) => {
            const word = currentNode.textContent;
            clipboard.writeText(word);
        }
    },
    "delete-word": {
        label: "Delete item",
        click: ({ currentNode, data: {section} }) => {
            section.deleteWord();
        }
    },
    "rename-word": {
        label: "Rename item",
        click: ({ data: {section} }) => {
            section.packEditEntry(section.wordLabel, "word");
        }
    },
    "add-translation": {
        label: "Add translation",
        click: ({ data: {section} }) => {
            const item = section.createListItem("", "translation");
            section.translationsList.scrollToBottom();
            section.packEditEntry(item, "translation");
        }
    },
    "delete-translation": {
        label: "Delete translation",
        click: ({ currentNode, data: {section} }) => {
            section.translationsList.removeChild(currentNode);
        }
    },
    "modify-translation": {
        label: "Modify translation",
        click: ({ currentNode, data: {section} }) => {
            section.packEditEntry(currentNode, "translation");
        }
    },
    "add-reading": {
        label: "Add reading",
        click: ({ data: {section} }) => {
            const item = section.createListItem("", "reading");
            section.readingsList.scrollToBottom();
            section.packEditEntry(item, "reading");
        }
    },
    "delete-reading": {
        label: "Delete reading",
        click: ({ currentNode, data: {section} }) => {
            section.readingsList.removeChild(currentNode);
        }
    },
    "modify-reading": {
        label: "Modify reading",
        click: ({ currentNode, data: {section} }) => {
            section.packEditEntry(currentNode, "reading");
        }
    },
    "remove-from-list": {
        label: "Remove from list",
        click: ({ currentNode, data: {section} }) => {
            section.listsList.removeChild(currentNode);
        }
    }
});

class EditVocabPanel extends Panel {
    constructor() {
        super("edit-vocab");
        // Store important DOM elements as properties
        this.wordLabel = this.root.getElementById("word");
        this.translationsList = this.root.getElementById("translations");
        this.readingsList = this.root.getElementById("readings");
        this.listsList = this.root.getElementById("vocab-lists");
        this.levelPopup = this.root.getElementById("srs-level");
        this.vocabListSelect = this.root.getElementById(
            "vocab-list-select");
        this.vocabListAddButton = this.root.getElementById(
            "vocab-list-select-button");
        // Create the edit input
        this.editInput = document.createElement("input");
        this.editInput.id = "edit-input";
        this.editInput.classList.add("inline-edit");
        this.editInput.callback = () => { };
        this.editInput.addEventListener("keypress", (event) => {
            if (event.keyCode === 13) {
                this.editInput.callback();
                this.editInput.unpack();
            }
        });
        // Create callback for adding vocab lists
        this.vocabListAddButton.addEventListener("click", () => {
            const lists = [];
            for (const item of this.listsList.children)
                lists.push(item.textContent);
            const newList = this.vocabListSelect.value;
            const word = this.wordLabel.textContent;
            if (!lists.includes(newList) && newList.length > 0) {
                const span = document.createElement("span");
                span.textContent = newList;
                this.listsList.appendChild(span);
                span.popupMenu(menuItems,
                        ["remove-from-list"], { section: this });
            }
        });
        // Create closing and saving callbacks
        this.root.getElementById("close-button").addEventListener(
            "click", () => main.closePanel("edit-vocab"));
        this.root.getElementById("cancel-button").addEventListener(
            "click", () => main.closePanel("edit-vocab"));
        this.root.getElementById("save-button").addEventListener(
            "click", () => { this.save(); main.closePanel("edit-vocab"); });
        // Create popup menus for static elements
        this.wordLabel.popupMenu(menuItems,
                ["copy-word", "delete-word", "rename-word"],
                { section: this });
        this.translationsList.popupMenu(
                menuItems, ["add-translation"], { section: this });
        this.readingsList.popupMenu(
                menuItems, ["add-reading"], { section: this });
    }

    adjustToLanguage(language, secondary) {
        // Fill SRS level popup stack
        const numLevels = dataManager.srs.numLevels;
        this.levelPopup.empty();
        for (let i = 1; i < numLevels; ++i) this.levelPopup.addOption(i);
        this.levelPopup.set(this.levelPopup.firstChild);
        // Fill vocab list selector
        this.vocabListSelect.empty();
        const defaultOption = document.createElement("option");
        this.defaultListOption = defaultOption;
        defaultOption.value = "";
        defaultOption.textContent = "Select a vocabulary list to add";
        this.vocabListSelect.appendChild(defaultOption);
        const lists = dataManager.vocabLists.getLists();
        for (const list of lists) {
            const option = document.createElement("option");
            option.value = list;
            option.textContent = list;
            this.vocabListSelect.appendChild(option);
        }
        if (dataManager.languageSettings["readings"])
            this.$("readings-frame").show();
        else this.$("readings-frame").hide();
    }

    load(word) {
        this.listsList.empty();
        const lists = dataManager.vocabLists.getListsForWord(word);
        for (const list of lists) {
            this.createListItem(list, "list");
        }
        this.defaultListOption.setAttribute("selected", "");
        this.defaultListOption.value = "";
        return dataManager.vocab.getInfo(word)
        .then(({ translations, readings, level }) => {
            this.originalWord = word;
            this.translationsList.empty();
            this.readingsList.empty();
            this.wordLabel.textContent = word;
            for (const translation of translations) {
                this.createListItem(translation, "translation");
            }
            for (const reading of readings) {
                this.createListItem(reading, "reading");
            }
            this.levelPopup.set(this.levelPopup.children[level - 1]);
        });
    }

    createListItem(text, type) {
        const span = document.createElement("span");
        span.textContent = text;
        if (type !== "list") {
            span.addEventListener("click", () =>
                this.packEditEntry(span, type));
        }
        if (type === "reading") {
            this.readingsList.appendChild(span);
            span.popupMenu(menuItems, ["delete-reading", "modify-reading"],
                    { section: this });
        } else if (type === "translation") {
            this.translationsList.appendChild(span);
            span.popupMenu(menuItems,
                    ["delete-translation", "modify-translation"],
                    { section: this });
        } else if (type === "list") {
            this.listsList.appendChild(span);
            span.popupMenu(menuItems, ["remove-from-list"], { section: this });
        }
        return span;
    }

    deleteWord() {
        return dialogWindow.confirm(
            `Are you sure you want to delete the word '${this.originalWord}'?`)
        .then((confirmed) => {
            if (!confirmed) return;
            return dataManager.vocab.remove(this.originalWord).then(() => {
                events.emit("word-deleted", this.originalWord);
                events.emit("vocab-changed");
            });
        });
    }

    packEditEntry(node, type) {
        // If the entry is already packed here, do nothing
        if (this.editInput.parentNode === node)
            return;
        // If the entry is already packed somewhere else, unpack it
        if (this.editInput.parentNode !== null) {
            this.editInput.callback();
            this.editInput.unpack();
        }
        // Pack the edit entry
        this.editInput.value = node.textContent;
        node.textContent = "";
        node.appendChild(this.editInput);
        node.style.padding = "0px";
        if (type === "reading" && main.language === "Japanese")
            this.editInput.enableKanaInput("hira");
        // Add callback to unpack entry and pack node again
        this.editInput.unpack = () => {
            const newContent = this.editInput.value.trim();
            if (newContent.length === 0)
                node.remove();
            else
                node.textContent = newContent;
            this.editInput.remove();
            if (type === "reading")
                this.editInput.disableKanaInput();
            node.style.padding = "2px";
        }
        this.editInput.focus();
    }

    save() {
        // Assemble all the necessary data
        const originalWord = this.originalWord;
        const word = this.wordLabel.textContent;
        const level = parseInt(this.levelPopup.value);
        const translations = [];
        const readings = [];
        const lists = [];
        for (const item of this.translationsList.children)
            translations.push(item.textContent);
        for (const item of this.readingsList.children)
            readings.push(item.textContent);
        for (const item of this.listsList.children)
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
                main.updateStatus("The entry has been removed.");
            } else if (newStatus === "updated") {
                events.emit("vocab-changed");
                main.updateStatus("The entry has been updated.");
            } else if (newStatus === "no-change") {
                if (originalWord === word) {
                    main.updateStatus("The entry has not been changed.");
                } else {
                    main.updateStatus("The entry has been renamed.");
                }
            }
        });
    }
}

customElements.define("edit-vocab-panel", EditVocabPanel);
module.exports = EditVocabPanel;
