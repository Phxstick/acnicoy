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
        click: ({ currentNode }) => {
            const word = main.panels["edit-vocab"].wordLabel.textContent;
            main.panels["edit-vocab"].deleteWord(word);
        }
    },
    "rename-word": {
        label: "Rename item",
        click: ({ data: {section} }) => {
            section.packEditEntry(section.wordLabel, "word");
        }
    },
    "add-translation": {
        label: "Add meaning",
        click: ({ data: {section} }) => {
            const item = section.createListItem("", "translation");
            section.translationsList.scrollToBottom();
            section.packEditEntry(item, "translation");
        }
    },
    "delete-translation": {
        label: "Delete translation",
        click: ({ currentNode, data: {section} }) => {
            const word = section.wordLabel.textContent;
            section.translationsList.removeChild(currentNode);
            section.changes.push(() => dataManager.vocab.removeTranslation(
                word, currentNode.textContent));
            section.changes.push(() => dataManager.history.log(
                { type: "D", column: "translation", old_entry: word,
                  old_translations: currentNode.textContent }));
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
            const word = section.wordLabel.textContent;
            section.readingsList.removeChild(currentNode);
            section.changes.push(() => dataManager.vocab.removeReading(
                word, currentNode.textContent));
            section.changes.push(() => dataManager.history.log(
                { type: "D", column: "reading", old_entry: word,
                  old_readings: currentNode.textContent }));
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
            section.changes.push(
                () => dataManager.vocabLists.removeWordFromList(
                    section.wordLabel.textContent, currentNode.textContent));
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
        this.editInput.callback = () => { };
        this.editInput.addEventListener("keypress", (event) => {
            if (event.keyCode === 13) {
                this.editInput.callback();
                this.editInput.unpack();
            }
        });
        // Configure default entry for vocab list select
        this.vocabListSelect.classList.add("empty");
        this.vocabListSelect.addEventListener("change", () => {
            if (this.vocabListSelect.value.length === 0)
                this.vocabListSelect.classList.add("empty");
            else
                this.vocabListSelect.classList.remove("empty");
        });
        // Create callback for adding vocab lists
        this.vocabListAddButton.addEventListener("click", () => {
            const lists = [];
            for (let i = 0; i < this.listsList.children.length; ++i)
                lists.push(this.listsList.children[i].textContent);
            const newList = this.vocabListSelect.value;
            const word = this.wordLabel.textContent;
            if (!lists.includes(newList) && newList.length > 0) {
                const span = document.createElement("span");
                span.textContent = newList;
                this.listsList.appendChild(span);
                span.popupMenu(menuItems,
                        ["remove-from-list"], { section: this });
                this.changes.push(
                    () => dataManager.vocabLists.addWordToList(
                        word, newList));
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
        const numLevels = dataManager.srs.getNumberOfLevels();
        this.levelPopup.clear();
        for (let i = 1; i < numLevels; ++i) this.levelPopup.appendItem(i);
        this.levelPopup.set(0);
        // Fill vocab list selector
        this.vocabListSelect.empty();
        const defaultOption = document.createElement("option");
        this.defaultListOption = defaultOption;
        defaultOption.value = "";
        defaultOption.textContent = "Select a vocabulary list to add";
        this.vocabListSelect.appendChild(defaultOption);
        const lists = dataManager.vocabLists.getLists();
        for (let list of lists) {
            const option = document.createElement("option");
            option.value = list;
            option.textContent = list;
            this.vocabListSelect.appendChild(option);
        }
        this.root.getElementById("readings-frame").style.display =
            dataManager.languageSettings["readings"] ? "flex" : "none";
    }

    load(word) {
        Promise.all([
            dataManager.vocab.getTranslations(word),
            dataManager.vocab.getReadings(word),
            dataManager.srs.getLevel(word, dataManager.test.mode.WORDS)])
        .then(([translations, readings, level]) => {
            this.oldWord = word;  // Remove lateron
            this.translationsList.empty();
            this.readingsList.empty();
            this.wordLabel.textContent = word;
            for (let translation of translations) {
                this.createListItem(translation, "translation");
            }
            for (let reading of readings) {
                this.createListItem(reading, "reading");
            }
            this.levelPopup.set(level - 1);
            this.changes = [];
        });
        this.listsList.empty();
        const lists = dataManager.vocabLists.getListsForWord(word);
        for (let list of lists) {
            this.createListItem(list, "list");
        }
        this.defaultListOption.setAttribute("selected", "");
        this.defaultListOption.value = "";
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

    deleteWord(word) {
        if (!dialogWindow.confirm(
                `Are you sure you want to delete the word '${word}'?`))
            return;
        const oldTranslations = [];
        const oldReadings = [];
        this.translationsList.children.forEach(
                (node) => oldTranslations.push(node.textContent));
        this.readingsList.children.forEach(
                (node) => oldReadings.push(node.textContent));
        this.save()
        .then(() => dataManager.vocab.remove(word))
        .then(() => dataManager.history.log({ type: "D", column: "entry",
                                      old_entry: word,
                                      old_translations: oldTranslations,
                                      old_readings: oldReadings }));
        main.closePanel("edit-vocab");
        events.emit("word-deleted", word);
        events.emit("vocab-changed");
    }

    packEditEntry(node, type) {
        const word = this.wordLabel.textContent;
        // If the entry is already packed here, do nothing
        if (this.editInput.parentNode === node)
            return;
        // If the entry is already packed somewhere else, unpack it
        if (this.editInput.parentNode !== null) {
            this.editInput.callback();
            this.editInput.unpack();
        }
        const oldContent = node.textContent;
        // Pack the edit entry
        this.editInput.value = oldContent;
        node.textContent = "";
        node.appendChild(this.editInput);
        node.style.padding = "0px";
        if (type === "reading")
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
        // Add callback registering changes to data
        this.editInput.callback = () => {
            const newContent = this.editInput.value.trim();
            if (newContent === oldContent) return;
            if (oldContent.length > 0) {
                if (newContent.length > 0) {
                    // Case that a translation was modified
                    if (type === "translation") {
                        this.changes.push(
                            () => dataManager.vocab.addTranslation(
                                word, newContent));
                        this.changes.push(
                            () => dataManager.history.log(
                            { type: "R", column: "translation",
                              old_entry: word, old_translations: oldContent,
                              new_translations: newContent }));
                    // Case that a reading was modified
                    } else if (type === "reading") {
                        this.changes.push(
                            () => dataManager.vocab.addReading(
                                word, newContent));
                        this.changes.push(
                            () => dataManager.history.log(
                            { type: "R", column: "reading", old_entry: word,
                              old_readings: oldContent,
                              new_readings: newContent }));
                    // Case that the word was modified
                    } else if (type === "word") {
                        this.changes.push(
                            () => dataManager.vocab.rename(
                                oldContent, newContent));
                        this.changes.push(
                            () => dataManager.history.log(
                            { type: "R", column: "entry",
                              old_entry: oldContent,
                              new_entry: newContent }));
                    }
                } else {
                    // Case that a translation was removed
                    if (type === "translation") {
                        this.changes.push(
                            () => dataManager.history.log(
                            { type: "D", column: "translation",
                              old_entry: word,
                              old_translations: oldContent }));
                    // Case that a reading was removed
                    } else if (type === "reading") {
                        this.changes.push(
                            () => dataManager.history.log(
                            { type: "D", column: "reading", old_entry: word,
                              old_readings: oldContent }));
                    // Case that the word was deleted
                    } else if (type === "word") {
                        this.deleteWord(oldContent);
                    }
                }
                // In both cases, remove the old reading/translation
                if (type === "translation") {
                    this.changes.push(
                        () => dataManager.vocab.removeTranslation(
                            word, oldContent));
                } else if (type === "reading") {
                    this.changes.push(
                        () => dataManager.vocab.removeReading(
                            word, oldContent));
                }
            } else {
                if (newContent.length > 0) {
                    // Case that a translation was added
                    if (type === "translation") {
                        this.changes.push(
                            () => dataManager.vocab.addTranslation(
                                word, newContent));
                        this.changes.push(
                            () => dataManager.history.log(
                                { type: "A", column: "translation",
                                  old_entry: word, 
                                  new_translations: newContent }));

                    // Case that a reading was added
                    } else if (type === "reading") {
                        this.changes.push(
                            () => dataManager.vocab.addReading(
                                word, newContent));
                        this.changes.push(
                            () => dataManager.history.log(
                            { type: "A", column: "reading", old_entry: word,
                              new_readings: newContent }));
                    }
                }
            }
        };
        this.editInput.focus();
    }

    save() {
        const word = this.wordLabel.textContent;
        let promise = Promise.resolve();
        for (let func of this.changes) {
            promise = promise.then(func);
        }
        return promise.then(() =>
                dataManager.srs.getLevel(word, dataManager.test.mode.WORDS))
        .then((currentLevel) => {
            const newLevel = parseInt(this.levelPopup.get());
            if (currentLevel !== newLevel) {
                events.emit("vocab-changed");
                return dataManager.srs.setLevel(
                        word, newLevel, dataManager.test.mode.WORDS);
            }
            // TODO: Emit proper events (with info from edit-word function!)
            if (this.changes.length > 0) {
                if (this.oldWord !== word) {
                    events.emit("word-deleted", this.oldWord);
                    events.emit("word-added", word);
                }
                events.emit("vocab-changed");
                main.updateStatus("The entry has been updated.");
            } if (this.changes.length === 0 && currentLevel === newLevel) {
                main.updateStatus("The entry has not been changed.");
            }
        });
    }
}

customElements.define("edit-vocab-panel", EditVocabPanel);
module.exports = EditVocabPanel;
