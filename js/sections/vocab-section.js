"use strict";

const menuItems = popupMenu.registerItems({
    "rename-list": {
        label: "Rename list",
        click: ({ currentNode }) => {
            currentNode.contentEditable = "true";
            currentNode.focus();
        }
    },
    "delete-list": {
        label: "Delete list",
        click: ({ currentNode, data: {section} }) => {
            section.deleteList(currentNode, currentNode.textContent);
        }
    },
    "test-on-list": {
        label: "Take test on list",
        click: ({ currentNode, data: {section} }) => {
            main.sections["test"].createTest(currentNode.textContent);
            main.openSection("test");
        }
    },
    "edit-item": {
        label: "Edit item",
        click: ({ currentNode }) => {
            const word = currentNode.textContent;
            main.panels["edit-vocab"].load(word);
            main.openPanel("edit-vocab");
        }
    },
    "remove-from-list": {
        label: "Remove item from list",
        click: ({ currentNode, data: {section} }) => {
            section.removeFromList(currentNode);
        }
    },
    "remove-from-vocab": {
        label: "Remove item from vocabulary",
        click: ({ currentNode, data: {section} }) => {
            const word = currentNode.textContent;
            return dialogWindow.confirm(
                `Are you sure you want to delete the word<br>'${word}'?`)
            .then((confirmed) => {
                if (!confirmed) return;
                dataManager.vocab.remove(word).then(() => {
                    events.emit("word-deleted", word);
                    events.emit("vocab-changed");
                });
            });
        }
    }
});

class VocabSection extends Section {
    constructor() {
        super("vocab");
        this.selectedList = null;
        this.selectedListNode = null;
        this.draggedItem = null;
        this.draggedItemType = null;
        this.allWordsQuery = "";
        // Add event listeners
        this.$("search-vocab-entry").addEventListener("keypress", (event) => {
            if (event.key !== "Enter") return;
            this.searchVocabulary();
        });
        this.$("search-vocab-button").addEventListener("click", () => {
            this.searchVocabulary();
        });
        this.$("add-list-button").addEventListener("click", () => {
            const item = this.createAllListsItem("");
            this.$("all-lists").appendChild(item);
            this.$("all-lists").scrollToBottom();
            item.contentEditable = "true";
            item.focus();
            this.$("all-lists-frame").show("flex");
            this.$("no-lists-info").hide();
        });
        this.$("rename-list-button").addEventListener("click", () => {
            this.selectedListNode.contentEditable = "true";
            this.selectedListNode.focus();
        });
        this.$("delete-list-button").addEventListener("click", () => {
            this.deleteList(
                this.selectedListNode, this.selectedListNode.textContent);
        });
        this.$("test-on-list-button").addEventListener("click", () => {
            main.sections["test"].createTest(this.selectedList);
            main.openSection("test");
        });
        // =====================================================================
        // Assign drag and drop listeners
        // =====================================================================
        // Allow dropping vocab list items into list-content-column
        for (const node of [this.$("list-contents"),
                            this.$("no-list-contents-info")]) {
            node.dragCounter = 0;
            node.addEventListener("dragover", (event) => {
                event.preventDefault();
            });
            node.addEventListener("drop", (event) => {
                if (this.selectedList === null) return;
                if (this.draggedItemType !== "all-words-item") return;
                event.preventDefault();
                const word = event.dataTransfer.getData("text");
                this.addToList(word, this.selectedList);
                node.classList.remove("dragover");
                node.dragCounter = 0;
            });
            node.addEventListener("dragenter", (event) => {
                if (this.selectedList === null) return;
                if (node.dragCounter === 0) {
                    node.classList.add("dragover");
                }
                node.dragCounter++;
            });
            node.addEventListener("dragleave", (event) => {
                if (this.selectedList === null) return;
                node.dragCounter--;
                if (node.dragCounter === 0) {
                    node.classList.remove("dragover");
                }
            });
        }
        // If user scrolls almost to bottom in vocabulary view, load more words
        const displayAmount = 80;
        const criticalDistance = 100;
        this.initialDisplayAmount = 40;
        this.vocabResultLoaded = false;
        this.$("all-words").uponScrollingBelow(criticalDistance, () => {
            if (this.nextRowIndex > 0 && this.vocabResultLoaded &&
                    this.nextRowIndex < this.vocabResultRows.length)
                this.loadMoreVocabulary(displayAmount);
        });
    }

    registerCentralEventListeners() {
        events.on("removed-from-list", (word, list) => {
            if (this.selectedList === list) {
                utility.removeEntryFromSortedList(this.$("list-contents"), word);
            }
        });
        events.on("added-to-list", (word, list) => {
            if (this.selectedList === list) {
                utility.insertNodeIntoSortedList(
                    this.$("list-contents"), this.createListContentsItem(word));
            }
        });
        // If a vocab item has been deleted, delete it from all lists
        events.on("word-deleted", (word) => {
            utility.removeEntryFromSortedList(this.$("all-words"), word);
            utility.removeEntryFromSortedList(this.$("list-contents"), word);
            events.emit("removed-from-list");
        });
        // If a new word has been added to the vocabulary ...
        events.on("word-added", (word) => {
            // ... show it in list of all words if it matches current filter
            // TODO: More precisely: Check if word matches query
            if (this.allWordsQuery.length === 0) {
                utility.insertNodeIntoSortedList(
                        this.$("all-words"), this.createAllWordsItem(word));
            }
            // ... show it in list contents if selected list contains it
            if (this.selectedList !== null &&
                dataManager.vocabLists.isWordInList(word, this.selectedList)) {
                const item = this.createListContentsItem(word);
                utility.insertNodeIntoSortedList(this.$("list-contents"), item);
            }
            events.emit("added-to-list");
        });
        events.onAll(["language-changed", "word-added", "word-deleted"],
        () => { 
            dataManager.vocab.size().then((size) => {
                this.$("all-words-frame").toggleDisplay(size > 0);
                this.$("empty-vocabulary-info").toggleDisplay(size === 0);
            });
        });
        events.onAll(
            ["language-changed", "vocab-list-created", "vocab-list-deleted"],
        () => {
            const noLists = dataManager.vocabLists.getLists().length === 0;
            this.$("all-lists-frame").toggleDisplay(!noLists, "flex");
            this.$("list-contents-column").toggleDisplay(!noLists, "flex");
            this.$("no-lists-info").toggleDisplay(noLists, "flex");
        });
        events.onAll(
            ["language-changed", "vocab-list-selected",
            "vocab-list-deselected", "added-to-list", "removed-from-list"],
        () => {
            const noListSelected = this.selectedListNode === null;
            this.$("list-contents-frame").toggleDisplay(
                !noListSelected, "flex");
            this.$("no-list-selected-info").toggleDisplay(noListSelected);
            if (this.selectedListNode !== null) {
                const noContents = dataManager.vocabLists.getWordsForList(
                    this.selectedList).length === 0;
                this.$("list-contents-frame").toggleDisplay(
                    !noContents, "flex");
                this.$("no-list-contents-info").toggleDisplay(
                    noContents, "flex");
            } else {
                this.$("no-list-contents-info").hide();
            }
        });
    }
    
    adjustToLanguage(language, secondary) {
        this.$("all-lists").empty();
        this.$("all-words").empty();
        this.deselectList();
        // Fill the left section with first few words in the vocabulary
        dataManager.vocab.getAll().then((words) => {
            this.nextRowIndex = 0;
            this.vocabResultRows = words;
            this.loadMoreVocabulary(this.initialDisplayAmount);
            this.$("all-words").scrollToTop();
            this.vocabResultLoaded = true;
        });
        const lists = dataManager.vocabLists.getLists();
        lists.sort();
        // Fill the middle section with all vocab list names
        const fragment = document.createDocumentFragment();
        for (const list of lists) {
            fragment.appendChild(this.createAllListsItem(list));
        }
        this.$("all-lists").appendChild(fragment);
    }

    loadMoreVocabulary(amount) {
        const limit = Math.min(this.nextRowIndex + amount,
                               this.vocabResultRows.length);
        const words = this.vocabResultRows.slice(this.nextRowIndex, limit);
        const fragment = document.createDocumentFragment();
        for (const word of words) {
            fragment.appendChild(this.createAllWordsItem(word));
        }
        this.$("all-words").appendChild(fragment);
        this.nextRowIndex = limit;
    }

    createAllWordsItem(word) {
        const item = document.createElement("div");
        item.draggable = true;
        item.textContent = word;
        // Mark the item if it already is part of at least one vocab list
        if (dataManager.vocabLists.getListsForWord(word).length > 0) {
            item.classList.add("already-in-list");
        }
        // Attach drag event to the item
        item.addEventListener("dragstart", (event) => {
            this.draggedItemType = "all-words-item";
            this.draggedItem = item;
            event.dataTransfer.setData("text/plain", item.textContent);
        });
        item.popupMenu(menuItems, ["edit-item", "remove-from-vocab"],
                       { section: this });
        return item;
    }

    createListContentsItem(word) {
        const item = document.createElement("div");
        item.textContent = word;
        item.draggable = true;
        // TODO: Allow dragging item into a different vocabulary list,
        //       or somewhere outside to remvove it from the list
        // item.addEventListener("dragstart", (event) => {
        //     event.dataTransfer.setData("text", item.textContent);
        // });
        item.popupMenu(menuItems,
                ["edit-item", "remove-from-list", "remove-from-vocab"],
                { section: this });
        return item;
    }

    createAllListsItem(name) {
        const node = document.createElement("div");
        node.textContent = name;
        // Remember old list name before editing
        node.addEventListener("focusin", () => {
            this.oldListName = node.textContent;
            node.removeEventListener("click", node.selectListCallback);
        });
        // Apply changes depending on input and previous value
        node.addEventListener("focusout", () => {
            this.root.getSelection().removeAllRanges();
            node.contentEditable = "false";
            node.addEventListener("click", node.selectListCallback);
            const oldName = this.oldListName;
            const newName = node.textContent.trim();
            // Case that an existing vocabulary list was renamed
            if (oldName.length > 0 && newName.length > 0) {
                if (newName === oldName) return;
                if (dataManager.vocabLists.renameList(oldName, newName)) {
                    main.updateStatus(
                        `Renamed list '${oldName}' to '${newName}'.`);
                    events.emit("vocab-list-deleted", oldName);
                    events.emit("vocab-list-created", newName);
                    this.insertListNameAtCorrectPosition(node);
                } else {
                    main.updateStatus(
                        `List with name '${newName}' already exists.`);
                    node.textContent = oldName;
                }
            // Case that an existing vocabulary list was deleted
            } else if (oldName.length > 0) {
                this.deleteList(node, oldName).then((confirmed) => {
                    if (!confirmed) {
                        node.textContent = oldName;
                    }
                });
            // Case that a new vocabulary list was added
            } else if (newName.length > 0) {
                if (dataManager.vocabLists.createList(newName)) {
                    this.insertListNameAtCorrectPosition(node);
                    main.updateStatus(`Created new list '${newName}'.`);
                    events.emit("vocab-list-created", newName);
                } else {
                    main.updateStatus(
                        `List with name '${newName}' already exists.`);
                    node.remove();
                }
            } else {
                node.remove();
            }
        });
        // If Enter key is pressed, quit editing
        node.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                node.blur();
            }
        });
        // When clicking on a vocabulary list name, show list contents
        node.selectListCallback = () => this.selectList(node);
        node.addEventListener("click", node.selectListCallback);
        // Allow dropping words on this list name to add word to the list
        node.addEventListener("dragover", (event) => {
            event.preventDefault();
        });
        node.addEventListener("drop", (event) => {
            event.preventDefault();
            const listName = node.textContent;
            const type = this.draggedItemType;
            if (type !== "all-words-item" && type !== "list-contents-item") {
                return;
            }
            const word = event.dataTransfer.getData("text");
            this.addToList(word, this.selectedList);
            node.classList.remove("dragover");
        });
        // Highlight list name when dragging valid vocabulary item over it
        node.addEventListener("dragenter", (event) => {
            event.preventDefault();
            const type = this.draggedItemType;
            if (type === "all-words-item" || type === "list-contents-item") {
                node.classList.add("dragover");
            }
        });
        node.addEventListener("dragleave", (event) => {
            node.classList.remove("dragover");
        });
        node.popupMenu(menuItems,
                ["test-on-list", "rename-list", "delete-list"],
                { section: this });
        return node;
    }

    // Make sure list of vocablist-names stays sorted
    insertListNameAtCorrectPosition(node) {
        const name = node.textContent;
        const allLists = this.$("all-lists").children;
        for (const listNode of allLists) {
            if (listNode.textContent > name) {
                this.$("all-lists").insertBefore(node, listNode);
                break;
            }
        }
        if (allLists.length === 0 ||
                allLists[allLists.length - 1].textContent < name)
            this.$("all-lists").appendChild(node);
    }

    deleteList(node, name) {
        return dialogWindow.confirm(
            `Are you sure you want to delete the vocabulary list '${name}'?`)
        .then((confirmed) => {
            if (!confirmed) return false;
            dataManager.vocabLists.deleteList(name);
            main.updateStatus(`Deleted list '${name}' and its contents.`);
            node.remove();
            if (this.selectedListNode === node) {
                this.deselectList();
            }
            events.emit("vocab-list-deleted", name);
            return true;
        });
    }

    selectList(node) {
        if (this.selectedListNode === node) return;
        const listName = node.textContent;
        if (this.selectedListNode !== null) {
            this.selectedListNode.classList.remove("selected");
        }
        node.classList.add("selected");
        this.$("rename-list-button").show();
        this.$("delete-list-button").show();
        this.$("test-on-list-button").show();
        this.selectedList = listName;
        this.selectedListNode = node;
        const words = dataManager.vocabLists.getWordsForList(listName);
        const fragment = document.createDocumentFragment();
        for (const word of words) {
            fragment.appendChild(this.createListContentsItem(word));
        }
        this.$("list-contents").empty();
        this.$("list-contents").appendChild(fragment);
        events.emit("vocab-list-selected", listName);
    }

    deselectList() {
        this.selectedListNode = null;
        this.selectedList = null;
        this.$("list-contents").empty();
        this.$("rename-list-button").hide();
        this.$("delete-list-button").hide();
        this.$("test-on-list-button").hide();
        events.emit("vocab-list-deselected");
    }

    addToList (word, listName) {
        if (dataManager.vocabLists.addWordToList(word, listName)) {
            this.draggedItem.classList.add("already-in-list");
            events.emit("added-to-list", word, listName);
        }
    }

    removeFromList(node) {
        const word = node.textContent;
        dataManager.vocabLists.removeWordFromList(word, this.selectedList);
        events.emit("removed-from-list", word, this.selectedList);
    }

    searchVocabulary() {
        const query = this.$("search-vocab-entry").value.trim();
        this.allWordsQuery = query;
        this.$("all-words").empty();
        const wordsReceived = query.length === 0 ?
            dataManager.vocab.getAll() :
            dataManager.vocab.search(query);
        // If the entry is empty, display all words
        wordsReceived.then((words) => {
            this.$("all-words").empty();
            this.nextRowIndex = 0;
            this.vocabResultRows = words;
            this.loadMoreVocabulary(this.initialDisplayAmount);
            this.$("all-words").scrollToTop();
            this.vocabResultLoaded = true;
        });
    }
}

customElements.define("vocab-section", VocabSection);
module.exports = VocabSection;
