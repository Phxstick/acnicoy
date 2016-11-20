"use strict";

const menuItems = popupMenu.registerItems({
    "rename-list": {
        label: "Rename list",
        click: ({ currentNode, data: {section} }) => {
            section.packEditEntry(currentNode);
        }
    },
    "delete-list": {
        label: "Delete list",
        click: ({ currentNode, data: {section} }) => {
            section.deleteList(currentNode);
        }
    },
    "test-on-list": {
        label: "Take test on list",
        click: ({ currentNode, data: {section} }) => {
            main.updateStatus("Not yet implemented.");
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
                `Are you sure you want to delete the word '${name}'?`)
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

        // Create in-place input for (re-)naming vocabulary lists
        this.editInput = document.createElement("input");
        this.editInput.id = "edit-input";
        this.editInput.classList.add("inline-edit");
        this.editInput.callback = () => { };
        this.editInput.addEventListener("keypress", (event) => {
            if (event.keyCode !== 13) return;
            this.editInput.callback();
            this.editInput.unpack();
        });
        this.$("search-vocab-entry").addEventListener("keypress", (event) => {
            if (event.keyCode !== 13) return;
            this.searchVocabulary();
        });
        this.$("search-vocab-button").addEventListener("click", () => {
            this.searchVocabulary();
        });
        this.$("add-list-button").addEventListener("click", () => {
            const item = this.createAllListsItem("");
            this.$("all-lists").appendChild(item);
            this.$("all-lists").scrollToBottom();
            this.packEditEntry(item);
            this.$("all-lists-frame").show("flex");
            this.$("no-lists-info").hide();
            this.editInput.focus();
        });
        this.$("rename-list-button").addEventListener("click", () => {
            this.packEditEntry(this.selectedListNode);
        });
        this.$("delete-list-button").addEventListener("click", () => {
            this.deleteList(this.selectedListNode);
        });
        this.$("test-on-list-button").addEventListener("click", () => {
            main.updateStatus("Not yet implemented.");
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
                event.preventDefault();
                if (node.dragCounter === 0) {
                    node.classList.add("dragover");
                }
                node.dragCounter++;
            });
            node.addEventListener("dragleave", (event) => {
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
                this.$("all-words-frame")[size === 0 ? "hide" : "show"]();
                this.$("empty-vocabulary-info")[size === 0 ? "show" : "hide"]();
            });
        });
        events.onAll(
            ["language-changed", "vocab-list-created", "vocab-list-deleted"],
        () => {
            const noLists = dataManager.vocabLists.getLists().length === 0;
            this.$("all-lists-frame")[noLists ? "hide" : "show"]("flex");
            this.$("no-lists-info")[noLists ? "show" : "hide"]("flex");
            this.$("list-contents-column")[noLists ? "hide" : "show"]("flex");
        });
        events.onAll(
            ["language-changed", "vocab-list-selected",
            "vocab-list-deselected", "added-to-list", "removed-from-list"],
        () => {
            const noListSelected = this.selectedListNode === null;
            this.$("list-contents-frame")
                [noListSelected ? "hide" : "show"]("flex");
            this.$("no-list-selected-info")[noListSelected ? "show" : "hide"]();
            if (this.selectedListNode !== null) {
                const noContents = dataManager.vocabLists.getWordsForList(
                    this.selectedList).length === 0;
                this.$("list-contents-frame")
                    [noContents ? "hide" : "show"]("flex");
                this.$("no-list-contents-info")
                    [noContents? "show" : "hide"]("flex");
            } else {
                this.$("no-list-contents-info").hide();
            }
        });
    }
    
    adjustToLanguage(language, secondary) {
        this.$("all-lists").empty();
        this.$("all-words").empty();
        this.deselectList();
        // Fill the left section with first words in the vocabulary
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
        // Attach drag event to the item
        // item.addEventListener("dragstart", (event) => {
        //     event.dataTransfer.setData("text", item.textContent);
        // });
        item.popupMenu(menuItems,
                ["edit-item", "remove-from-list", "remove-from-vocab"],
                { section: this });
        return item;
    }

    createAllListsItem(name) {
        const item = document.createElement("div");
        item.textContent = name;
        // When clicking on a vocabulary list name, show list contents
        item.addEventListener("click", () => {
            this.selectList(item);
        });
        // Allow dropping words on this list name to add word to the list
        item.addEventListener("dragover", (event) => {
            event.preventDefault();
        });
        item.addEventListener("drop", (event) => {
            event.preventDefault();
            const listName = item.textContent;
            const type = this.draggedItemType;
            if (type !== "all-words-item" && type !== "list-contents-item") {
                return;
            }
            const word = event.dataTransfer.getData("text");
            this.addToList(word, this.selectedList);
            item.classList.remove("dragover");
        });
        // Give item a boxshadow and bg color when dragging valid word over it
        item.addEventListener("dragenter", (event) => {
            event.preventDefault();
            const type = this.draggedItemType;
            if (type === "all-words-item" || type === "list-contents-item") {
                item.classList.add("dragover");
            }
        });
        item.addEventListener("dragleave", (event) => {
            item.classList.remove("dragover");
        });
        item.popupMenu(menuItems,
                ["test-on-list", "rename-list", "delete-list"],
                { section: this });
        return item;
    }

    packEditEntry(node) {
        // If the entry is already packed here, do nothing
        if (this.editInput.parentNode === node)
            return;
        // If the entry is already packed somewhere else, unpack it
        if (this.editInput.parentNode !== null) {
            this.editInput.callback();
            this.editInput.unpack();
        }
        const oldName = node.textContent;
        // Pack the edit entry
        this.editInput.value = oldName;
        node.textContent = "";
        node.appendChild(this.editInput);
        node.style.padding = "0px";
        // Add callback to unpack entry and pack node again
        this.editInput.unpack = () => {
            const newName = this.editInput.value.trim();
            node.remove();
            if (newName.length === 0) return;
            node.textContent = newName;
            this.editInput.remove();
            node.style.padding = "2px";
            // Keep list lexically sorted by inserting node at correct index
            const allLists = this.$("all-lists").children;
            for (const item of allLists) {
                if (item.textContent > newName) {
                    this.$("all-lists").insertBefore(node, item);
                    break;
                }
            }
            if (allLists.length === 0 ||
                    allLists[allLists.length - 1].textContent < newName)
                this.$("all-lists").appendChild(node);
        }
        // Add callback registering changes to data
        this.editInput.callback = () => {
            const newName = this.editInput.value.trim();
            if (newName === oldName) return;
            // Case that an existing vocabulary list was renamed
            if (oldName.length > 0 && newName.length > 0) {
                if (dataManager.vocabLists.renameList(oldName, newName)) {
                    main.updateStatus(
                        `Renamed list '${oldName}' to '${newName}'.`);
                } else {
                    main.updateStatus(
                        `List with name '${newName}' already exists.`);
                }
            // Case that an existing vocabulary list was deleted
            } else if (oldName.length > 0) {
                this.editInput.value = oldName;
                return this.deleteList(node);
            // Case that a new vocabulary list was added
            } else if (newName.length > 0) {
                if (dataManager.vocabLists.createList(newName)) {
                    main.updateStatus(`Created new list '${newName}'.`);
                    events.emit("vocab-list-created", newName);
                } else {
                    main.updateStatus(
                        `List with name '${newName}' already exists.`);
                }
            }
        };
        this.editInput.focus();
    }

    deleteList(node) {
        const name = node.textContent;
        return dialogWindow.confirm(
            `Are you sure you want to delete the vocabulary list '${name}'?`)
        .then((confirmed) => {
            if (!confirmed) return;
            dataManager.vocabLists.deleteList(name);
            main.updateStatus(`Deleted list '${name}' and its contents.`);
            node.remove();
            if (this.selectedListNode === node) {
                this.deselectList();
            }
            events.emit("vocab-list-deleted", name);
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
            if (this.selectedList === listName) {
                const item = this.createListContentsItem(word);
                utility.insertNodeIntoSortedList(
                    this.$("list-contents"), item);
            }
            this.draggedItem.classList.add("already-in-list");
            events.emit("added-to-list", word, listName);
        }
    }

    removeFromList(node) {
        const word = node.textContent;
        dataManager.vocabLists.removeWordFromList(word, this.selectedList);
        this.$("list-contents").removeChild(node);
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
