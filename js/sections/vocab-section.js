"use strict";

const menuItems = contextMenu.registerItems({
    "rename-list": {
        label: "Rename list",
        click: ({ currentNode }) => {
            currentNode.enterEditMode();
        }
    },
    "delete-list": {
        label: "Delete list",
        click: ({ currentNode, data: {section} }) => {
            section.deleteVocabList(currentNode);
        }
    },
    "create-list": {
        label: "Create new vocab list",
        click: ({ currentNode, data: {section} }) => {
            section.addVocabList();
        }
    },
    "test-on-list": {
        label: "Take test on list",
        click: ({ currentNode, data: {section} }) => {
            section.startTestOnVocabList(currentNode.dataset.listName);
        }
    },
    "edit-item": {
        label: "Edit item",
        click: ({ currentNode }) => {
            const word = currentNode.textContent;
            main.openPanel("edit-vocab", { entryName: word });
        }
    },
    "remove-from-list": {
        label: "Remove item from list",
        click: ({ currentNode, data: {section} }) => {
            section.removeFromVocabList(currentNode);
        }
    },
    "remove-from-vocab": {
        label: "Remove item from vocabulary",
        click: async ({ currentNode, data: {section} }) => {
            const word = currentNode.textContent;
            const confirmed = await dialogWindow.confirm(
                `Are you sure you want to delete the word<br>'${word}'?`)
            if (!confirmed) return;
            const oldLists = dataManager.vocabLists.getListsForWord(word);
            const dictionaryId = 
                await dataManager.vocab.getAssociatedDictionaryId(word);
            await dataManager.vocab.remove(word);
            for (const listName of oldLists) {
                events.emit("removed-from-list", word, listName);
            }
            events.emit("word-deleted", word, dictionaryId);
            events.emit("vocab-changed");
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
        this.listNameToAmountLabel = new Map();
        this.listNameToViewNode = new Map();

        this.$("vocab-lists").contextMenu(
            menuItems, ["create-list"], { section: this });
        // =====================================================================
        // Add event listeners to vocab list control buttons
        // =====================================================================
        this.$("add-list-button").addEventListener("click", () => {
            this.addVocabList();
        });
        this.$("rename-list-button").addEventListener("click", () => {
            this.selectedListNode.enterEditMode();
        });
        this.$("delete-list-button").addEventListener("click", () => {
            this.deleteVocabList(this.selectedListNode);
        });
        this.$("test-on-list-button").addEventListener("click", () => {
            this.startTestOnVocabList(this.selectedList);
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
                if (this.draggedItemType !== "vocab-item") return;
                event.preventDefault();
                const word = event.dataTransfer.getData("text");
                this.addToVocabList(word, this.selectedList);
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

        // =====================================================================
        // Initialize search info and attach event listeners for searching
        // =====================================================================
        this.viewStates = {};
        const displayAmounts = {
            "vocab": {
                initial: 50,
                onScroll: 100
            },
            "vocab-lists": {
                initial: 40,
                onScroll: 40
            },
            "list-contents": {
                initial: 40,
                onScroll: 80
            }
        };
        for (const fieldName in displayAmounts) {
            this.viewStates[fieldName] = utility.initializeView({
                view: this.$(fieldName),
                getData: (query) => this.search(fieldName, query),
                createViewItem: (text) => this.createViewItem(fieldName, text),
                initialDisplayAmount: displayAmounts[fieldName].initial,
                displayAmount: displayAmounts[fieldName].onScroll,
                criticalScrollDistance: 150,
                sortingCriterion: "alphabetical",
                sortBackwards: false
            });
            // Attach event listener to search entry
            const searchEntry = this.$(`search-${fieldName}-entry`)
            searchEntry.addEventListener("keypress", (event) => {
                if (event.key !== "Enter") return;
                const query = searchEntry.value.trim();
                this.viewStates[fieldName].search(query);
            });
            // Attach event listener to search button
            const searchButton = this.$(`search-${fieldName}-button`);
            searchButton.addEventListener("click", () => {
                const query = searchEntry.value.trim();
                this.viewStates[fieldName].search(query);
            });
        }
    }

    registerCentralEventListeners() {
        // If content of a vocabulary list changed, update view
        events.on("removed-from-list", (word, list) => {
            if (this.selectedList === list) {
                this.removeEntryFromSortedView("list-contents", word);
            }
            const amountLabel = this.listNameToAmountLabel.get(list);
            amountLabel.textContent = parseInt(amountLabel.textContent) - 1;
            if (this.viewStates["vocab-lists"].sortingCriterion === "length") {
                this.insertNodeIntoSortedView(
                    "vocab-lists", this.listNameToViewNode.get(list));
            }
        });
        events.on("added-to-list", (word, list) => {
            if (this.selectedList === list) {
                this.insertEntryIntoSortedView("list-contents", word);
            }
            const amountLabel = this.listNameToAmountLabel.get(list);
            amountLabel.textContent = parseInt(amountLabel.textContent) + 1;
            if (this.viewStates["vocab-lists"].sortingCriterion === "length") {
                this.insertNodeIntoSortedView(
                    "vocab-lists", this.listNameToViewNode.get(list));
            }
        });
        // If a vocab item has been deleted or added, update view
        events.on("word-deleted", (word) => {
            this.removeEntryFromSortedView("vocab", word);
        });
        events.on("word-added", (word) => {
            this.insertEntryIntoSortedView("vocab", word);
            if (this.selectedList !== null &&
                  dataManager.vocabLists.isWordInList(word, this.selectedList)){
                this.insertEntryIntoSortedView("list-contents", word);
            }
        });
        events.onAll(["language-changed", "word-added", "word-deleted"],
        () => { 
            dataManager.vocab.size().then((size) => {
                this.$("vocab-frame").toggleDisplay(size > 0);
                this.$("empty-vocabulary-info").toggleDisplay(size === 0);
            });
        });
        events.onAll(
            ["language-changed", "vocab-list-created", "vocab-list-deleted"],
        () => {
            const noLists = dataManager.vocabLists.getLists().length === 0;
            this.$("vocab-lists-frame").toggleDisplay(!noLists, "flex");
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
        this.deselectVocabList();
        this.listNameToAmountLabel.clear();
        this.listNameToViewNode.clear();
        // Load part of vocabulary and list of vocab-list names
        this.viewStates["vocab"].search("");
        this.viewStates["vocab-lists"].search("");
    }

    // =====================================================================
    // Functions for creating items for the three data views
    // =====================================================================

    createViewItem(fieldName, content) {
        if (fieldName === "vocab")
            return this.createVocabViewItem(content);
        if (fieldName === "vocab-lists")
            return this.createVocabListsViewItem(content);
        if (fieldName === "list-contents")
            return this.createListContentsViewItem(content);
    }

    createVocabViewItem(word) {
        const item = document.createElement("div");
        item.draggable = true;
        item.textContent = word;
        // Mark the item if it already is part of at least one vocab list
        if (dataManager.vocabLists.getListsForWord(word).length > 0) {
            item.classList.add("already-in-list");
        }
        // Attach drag event to the item
        item.addEventListener("dragstart", (event) => {
            this.draggedItemType = "vocab-item";
            this.draggedItem = item;
            event.dataTransfer.setData("text/plain", item.textContent);
        });
        item.contextMenu(menuItems, ["edit-item", "remove-from-vocab"],
                         { section: this });
        return item;
    }

    createListContentsViewItem(word) {
        const item = document.createElement("div");
        item.textContent = word;
        // item.draggable = true;
        // TODO: Allow dragging item into a different vocabulary list,
        //       or somewhere outside to remvove it from the list
        // item.addEventListener("dragstart", (event) => {
        //     event.dataTransfer.setData("text", item.textContent);
        // });
        item.contextMenu(menuItems,
                ["edit-item", "remove-from-list", "remove-from-vocab"],
                { section: this });
        return item;
    }

    createVocabListsViewItem(name) {
        const node = document.createElement("div");
        // Display name of the list
        const nameLabel = document.createElement("div");
        nameLabel.textContent = name;
        nameLabel.classList.add("list-name");
        node.appendChild(nameLabel);
        node.dataset.listName = name;
        // Display small label with amount of items in this vocabulary list
        const amountLabel = document.createElement("div");
        amountLabel.classList.add("amount-words");
        amountLabel.textContent = name.length === 0 ? "0" :
            dataManager.vocabLists.getWordsForList(name).length;
        if (name.length > 0) {
            this.listNameToAmountLabel.set(name, amountLabel);
            this.listNameToViewNode.set(name, node);
        }
        node.appendChild(amountLabel);
        // When clicking on a vocabulary list name, show list contents
        node.selectVocabListCallback = () => this.selectVocabList(node);
        node.addEventListener("click", node.selectVocabListCallback);
        // Allow renaming the list
        node.enterEditMode = () => {
            nameLabel.contentEditable = "true";
            nameLabel.focus();
            node.classList.add("edit-mode");
        };
        nameLabel.addEventListener("focusin", () => {
            node.removeEventListener("click", node.selectVocabListCallback);
        });
        // If Enter key is pressed, quit editing
        nameLabel.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                nameLabel.blur();
            }
        });
        // Apply changes depending on input and previous value
        nameLabel.addEventListener("focusout", () => {
            this.root.getSelection().removeAllRanges();
            nameLabel.contentEditable = "false";
            node.classList.remove("edit-mode");
            node.addEventListener("click", node.selectVocabListCallback);
            const oldName = node.dataset.listName;
            const newName = nameLabel.textContent.trim();
            // Case that an existing vocabulary list was renamed
            let doRename = false;
            if (oldName.length > 0 && newName.length > 0) {
                if (newName === oldName) {
                    nameLabel.textContent = newName;
                    return;
                }
                if (dataManager.vocabLists.renameList(oldName, newName)) {
                    doRename = true;
                    main.updateStatus(
                        `Renamed list '${oldName}' to '${newName}'.`);
                    events.emit("vocab-list-deleted", oldName);
                    events.emit("vocab-list-created", newName);
                } else {
                    main.updateStatus(
                        `List with name '${newName}' already exists.`);
                    nameLabel.textContent = oldName;
                }
            // Case that an existing vocabulary list was deleted
            } else if (oldName.length > 0) {
                this.deleteVocabList(node).then((confirmed) => {
                    if (!confirmed) {
                        nameLabel.textContent = oldName;
                    }
                });
            // Case that a new vocabulary list was added
            } else if (newName.length > 0) {
                if (dataManager.vocabLists.createList(newName)) {
                    doRename = true;
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
            if (doRename) {
                node.dataset.listName = newName;
                nameLabel.textContent = newName;
                if (this.selectedList === oldName)
                    this.selectedList = newName;
                this.listNameToAmountLabel.set(newName, amountLabel);
                this.listNameToViewNode.set(newName, node);
                this.insertNodeIntoSortedView("vocab-lists", node);
            }
        });
        // Allow dropping words on this list name to add word to the list
        node.addEventListener("dragover", (event) => {
            event.preventDefault();
        });
        node.addEventListener("drop", (event) => {
            event.preventDefault();
            const listName = node.dataset.listName;
            const type = this.draggedItemType;
            if (type !== "vocab-item" && type !== "list-contents-item") {
                return;
            }
            const word = event.dataTransfer.getData("text");
            this.addToVocabList(word, listName);
            node.classList.remove("dragover");
            node.dragCounter = 0;
        });
        // Highlight list name when dragging valid vocabulary item over it
        node.dragCounter = 0;
        node.addEventListener("dragenter", (event) => {
            event.preventDefault();
            const type = this.draggedItemType;
            if (type === "vocab-item" || type === "list-contents-item") {
                if (node.dragCounter === 0) {
                    node.classList.add("dragover");
                }
                node.dragCounter++;
            }
        });
        node.addEventListener("dragleave", (event) => {
            const type = this.draggedItemType;
            if (type === "vocab-item" || type === "list-contents-item") {
                node.dragCounter--;
                if (node.dragCounter === 0) {
                    node.classList.remove("dragover");
                }
            }
        });
        node.contextMenu(menuItems,
                ["test-on-list", "rename-list", "delete-list"],
                { section: this });
        return node;
    }

    // =====================================================================
    // Functions for manipulating, selecting or testing on vocab lists
    // =====================================================================

    addVocabList() {
        const item = this.createViewItem("vocab-lists", "");
        this.$("vocab-lists").appendChild(item);
        this.$("vocab-lists").scrollToBottom();
        this.$("vocab-lists-frame").show("flex");
        this.$("no-lists-info").hide();
        item.enterEditMode();
    }

    deleteVocabList(node) {
        const name = node.dataset.listName;
        return dialogWindow.confirm(
            `Are you sure you want to delete the vocabulary list '${name}'?`)
        .then((confirmed) => {
            if (!confirmed) return false;
            dataManager.vocabLists.deleteList(name);
            main.updateStatus(`Deleted list '${name}' and its contents.`);
            node.remove();
            if (this.selectedListNode === node) {
                this.deselectVocabList();
            }
            events.emit("vocab-list-deleted", name);
            return true;
        });
    }

    selectVocabList(node) {
        if (this.selectedListNode === node) return;
        const listName = node.dataset.listName;
        if (this.selectedListNode !== null) {
            this.selectedListNode.classList.remove("selected");
        }
        node.classList.add("selected");
        this.$("rename-list-button").show();
        this.$("delete-list-button").show();
        this.$("test-on-list-button").show();
        this.selectedList = listName;
        this.selectedListNode = node;
        this.viewStates["list-contents"].search("");
        events.emit("vocab-list-selected", listName);
    }

    deselectVocabList() {
        this.selectedListNode = null;
        this.selectedList = null;
        this.$("list-contents").empty();
        this.$("rename-list-button").hide();
        this.$("delete-list-button").hide();
        this.$("test-on-list-button").hide();
        events.emit("vocab-list-deselected");
    }

    startTestOnVocabList(listName) {
        if (dataManager.vocabLists.getWordsForList(listName).length === 0) {
            dialogWindow.info(`The vocabulary list '${listName}' is empty!`);
            return;
        }
        main.sections["test"].createTest(listName).then((created) => {
            if (created) main.openSection("test");
        });
    }

    // =====================================================================
    // Functions for manipulating vocab list contents
    // =====================================================================

    addToVocabList (word, listName) {
        if (dataManager.vocabLists.addWordToList(word, listName)) {
            this.draggedItem.classList.add("already-in-list");
            events.emit("added-to-list", word, listName);
        }
    }

    removeFromVocabList(node) {
        const word = node.textContent;
        dataManager.vocabLists.removeWordFromList(word, this.selectedList);
        events.emit("removed-from-list", word, this.selectedList);
    }

    // =====================================================================
    // Search functionality
    // =====================================================================

    async getStringKeyForSorting(fieldName) {
        const sortingCriterion = this.viewStates[fieldName].sortingCriterion;
        if (fieldName === "vocab") {
            if (sortingCriterion === "alphabetical") {
                return (word) => word;
            } else if (sortingCriterion === "dateAdded") {
                return dataManager.vocab.getDateAddedForEachWord()
                .then((datesAdded) => {
                    return (word) => datesAdded[word];
                });
            } else if (sortingCriterion === "level") {
                return dataManager.vocab.getLevelForEachWord()
                .then((levels) => {
                    return (word) => levels[word];
                });
            }
        } else if (fieldName === "vocab-lists") {
            if (sortingCriterion === "alphabetical") {
                return (listName) => listName;
            } else if (sortingCriterion === "length") {
                return (listName) => 
                    dataManager.vocabLists.getWordsForList(listName).length;
            }
        } else if (fieldName === "list-contents") {
            if (sortingCriterion === "alphabetical") {
                return (word) => word;
            }
        }
    }

    getNodeKeyForSorting(fieldName) {
        const sortingCriterion = this.viewStates[fieldName].sortingCriterion;
        if (fieldName === "vocab") {
            return (node) => node.textContent;
        } else if (fieldName === "vocab-lists") {
            return (node) => node.dataset.listName;
        } else if (fieldName === "list-contents") {
            return (node) => node.textContent;
        }
    }

    async search(fieldName, query) {
        const sortingCriterion = this.viewStates[fieldName].sortingCriterion;
        const sortBackwards = this.viewStates[fieldName].sortBackwards;
        let searchResults;
        let alreadySorted = false;
        if (query.length === 0) {
            // If query is empty, take all items as search result
            if (fieldName === "vocab") {
                searchResults = await dataManager.vocab.getAll(
                    sortingCriterion, sortBackwards);
                alreadySorted = true;
            } else if (fieldName === "vocab-lists") {
                searchResults = dataManager.vocabLists.getLists();
            } else if (fieldName === "list-contents") {
                searchResults = dataManager.vocabLists.getWordsForList(
                    this.selectedList);
            }
        } else {
            if (fieldName === "vocab") {
                searchResults = await dataManager.vocab.search(query);
            } else if (fieldName === "vocab-lists") {
                searchResults = dataManager.vocabLists.searchForList(query);
            } else if (fieldName === "list-contents") {
                searchResults =
                    dataManager.vocabLists.searchList(this.selectedList, query);
            }
        }
        // Sort search result if necessary
        if (!alreadySorted) {
            const key = await this.getStringKeyForSorting(fieldName);
            searchResults.sort((entry1, entry2) => {
                const value1 = key(entry1);
                const value2 = key(entry2);
                if (value1 < value2) return -1 + 2 * sortBackwards;
                if (value1 > value2) return 1 - 2 * sortBackwards;
                return 0;
            });
        }
        if (fieldName === "vocab-lists") {
            this.deselectVocabList();
        }
        return searchResults;
    }

    async insertEntryIntoSortedView(fieldName, content) {
        const node = this.createViewItem(fieldName, content);
        await this.insertNodeIntoSortedView(fieldName, node);
    }

    async insertNodeIntoSortedView(fieldName, node) {
        const nodeKey = this.getNodeKeyForSorting(fieldName);
        const content = nodeKey(node).toLowerCase();
        // Check if content of node matches last query
        if (!content.includes(this.viewStates[fieldName].lastQuery)) {
            return;
        }
        const sortBackwards = this.viewStates[fieldName].sortBackwards;
        const viewNode = this.$(fieldName);
        const stringKey = await this.getStringKeyForSorting(fieldName);
        const key = (node) => stringKey(nodeKey(node));
        const value = key(node);
        if (viewNode.children.length === 0) {
            viewNode.appendChild(node);
        } else {
            const index = utility.findIndex(viewNode, value, key, sortBackwards)
            if (index === -1) {
                viewNode.prependChild(node);
            } else if (index === viewNode.children.length) {
                const displayAmount = this.viewStates[fieldName].displayAmount;
                const initialDisplayAmount =
                    this.viewStates[fieldName].initialDisplayAmount;
                if ((viewNode.children.length - initialDisplayAmount) %
                        displayAmount !== 0) {
                    viewNode.appendChild(node);
                }
            } else {
                viewNode.insertChildAt(node, index);
            }
        }
    }

    async removeEntryFromSortedView(fieldName, content) {
        const nodeKey = this.getNodeKeyForSorting(fieldName);
        const stringKey = await this.getStringKeyForSorting(fieldName);
        const key = (node) => stringKey(nodeKey(node));
        const sortBackwards = this.viewStates[fieldName].sortBackwards;
        await utility.removeEntryFromSortedList(
            this.$(fieldName), content, key, sortBackwards);
    }
}

customElements.define("vocab-section", VocabSection);
module.exports = VocabSection;
