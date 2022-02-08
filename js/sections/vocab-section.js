"use strict";

const menuItems = contextMenu.registerItems({
    // ========================================================================
    //   Options for vocabulary lists
    // ========================================================================
    "rename-list": {
        label: "Rename list",
        click: ({ currentNode }) => {
            currentNode.enterEditMode();
        }
    },
    "delete-list": {
        label: "Delete list",
        click: ({ currentNode, data: {section} }) => {
            section.deleteItem(currentNode, "vocab-lists");
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
            section.startTestOnVocabLists([currentNode]);
        }
    },

    // ========================================================================
    //   Options for single vocabulary items
    // ========================================================================
    "edit-item": {
        label: "Edit item",
        click: ({ currentNode, data: { section, itemType } }) => {
            section.editItem(currentNode.textContent, itemType);
        }
    },
    "copy-item": {
        label: "Copy item",
        click: ({ currentNode }) => {
            clipboard.writeText(currentNode.textContent);
        }
    },
    "delete-item": {
        label: "Delete item",
        click: ({ currentNode, data: { section, itemType } }) => {
            section.deleteItem(currentNode, itemType);
        }
    },
    // Special option for items in list content view
    "remove-from-list": {
        label: "Remove item from list",
        click: ({ currentNode, data: {section} }) => {
            section.removeFromVocabList(currentNode.textContent,
                                        section.selectedList);
        }
    },

    // ========================================================================
    //   Options for multiple selected items
    // ========================================================================
    "copy-selected": {
        label: "Copy selected items",
        click: ({ currentNode, data: { section, itemType } }) => {
            section.copySelected(itemType);
        }
    },
    "export-selected": {
        label: "Export selected items",
        click: ({ currentNode, data: { section, itemType } }) => {
            if (itemType === "list-contents") {
                section.exportItems("vocab", true);
            } else {
                section.exportItems(itemType, true);
            }
        }
    },
    "delete-selected": {
        label: "Delete selected items",
        click: ({ currentNode, data: { section, itemType } }) => {
            section.deleteSelected(itemType);
        }
    },
    // Special option for vocabulary lists
    "test-on-selected": {
        label: "Test on selected lists",
        click: ({ currentNode, data: {section} }) => {
            section.startTestOnVocabLists(section.currentSelection);
        }
    },
    // Special option for list content items
    "remove-selected-from-list": {
        label: "Remove selected items from list",
        click: ({ currentNode, data: {section} }) => {
            section.removeSelectedFromList();
        }
    }
});

class VocabSection extends Section {
    constructor() {
        super("vocab");

        // Data for vocab lists
        this.selectedList = null;
        this.selectedListNode = null;
        this.listNameToAmountLabel = new Map();
        this.listNameToViewNode = new Map();

        // State variables for drag & drop
        this.draggedItem = null;
        this.draggedItemType = null;
        this.currentlyHoveredNode = null;

        // State variables for selections
        this.currentSelection = new Set();
        this.selectionTarget = null;

        this.$("rename-list-button").hide();
        this.$("delete-list-button").hide();
        this.$("test-on-list-button").hide();
        this.$("import-export-vocab-buttons").hide();
        this.$("control-selected-vocab-buttons").hide();
        this.$("control-selected-list-contents-buttons").hide();
        this.$("search-kanji-by-on-yomi").enableKanaInput("katakana");
        this.$("search-kanji-by-kun-yomi").enableKanaInput("hiragana");
        this.$("search-hanzi-by-readings").togglePinyinInput(true);
        this.$("vocab-lists").contextMenu(
            menuItems, ["create-list"], { section: this });

        // =====================================================================
        //   Add event listeners to vocab control buttons
        // =====================================================================
        this.$("export-vocab-button").addEventListener("click", () => {
            this.exportItems("vocab", false);
        });
        this.$("import-vocab-button").addEventListener("click", () => {
            overlays.open("import-vocab");
        });

        this.$("copy-selected-vocab-button").addEventListener("click", () => {
            this.copySelected("vocab");
        });
        this.$("export-selected-vocab-button").addEventListener("click", () => {
            this.exportItems("vocab", true);
        });
        this.$("delete-selected-vocab-button").addEventListener("click", () => {
            this.deleteSelected("vocab");
        });

        // =====================================================================
        //   Add event listeners to list control buttons
        // =====================================================================
        this.$("add-list-button").addEventListener("click", () => {
            this.addVocabList();
        });
        this.$("rename-list-button").addEventListener("click", () => {
            if (this.selectedListNode !== null) {
                this.selectedListNode.enterEditMode();
            }
        });
        this.$("delete-list-button").addEventListener("click", () => {
            if (this.selectedListNode !== null) {
                this.deleteItem(this.selectedListNode, "vocab-lists");
            } else if (this.selectionTarget === "vocab-lists" &&
                       this.currentSelection.size > 0) {
                this.deleteSelected("vocab-lists");
            }
        });
        this.$("test-on-list-button").addEventListener("click", () => {
            if (this.selectedListNode !== null) {
                this.startTestOnVocabLists([this.selectedListNode]);
            } else if (this.selectionTarget === "vocab-lists" &&
                       this.currentSelection.size > 0) {
                this.startTestOnVocabLists(this.currentSelection);
            }
        });

        // =====================================================================
        //   Add event listeners to list content control buttons
        // =====================================================================
        this.$("copy-selected-list-contents-button").addEventListener("click",
            () => this.copySelected("list-contents"));
        this.$("export-selected-list-contents-button").addEventListener("click",
            () => this.exportItems("vocab", true));
        this.$("delete-selected-list-contents-button").addEventListener("click",
            () => this.deleteSelected("list-contents"));
        this.$("remove-selected-from-list-button").addEventListener("click",
            () => this.removeSelectedFromList());

        // =====================================================================
        //   Drag and drop functionality
        // =====================================================================

        // Element that will be displayed beneath the cursor while dragging
        const dragImage = document.createElement("div");
        dragImage.classList.add("vocab-drag-image");
        document.body.appendChild(dragImage);
        dragImage.hide();

        // Highlight list content frame if hovering while dragging vocab items
        for (const node of [this.$("list-contents"),
                            this.$("no-list-contents-info")]) {
            node.addEventListener("mouseenter", () => {
                if (this.draggedItemType !== "vocab") return;
                this.currentlyHoveredNode = node;
                node.classList.add("dragover");
            });
            node.addEventListener("mouseleave", () => {
                if (this.draggedItemType !== "vocab") return;
                this.currentlyHoveredNode = null;
                node.classList.remove("dragover");
            });
        }

        // Get ready for dragging if pressing mouse button above draggable item
        let readyToDrag = false;
        let itemToDrag;
        let itemType;
        this.root.addEventListener("mousedown", (event) => {
            itemToDrag = event.target;
            readyToDrag = true;
            if (event.target.parentNode === this.$("vocab")) {
                itemType = "vocab";
            } else if (event.target.parentNode === this.$("list-contents")) {
                itemType = "list-contents";
            } else {
                readyToDrag = false;
            }
        });
        
        // Start dragging if moving mouse while ready to drag, move image along
        window.addEventListener("mousemove", (event) => {
            if (readyToDrag) {
                readyToDrag = false;
                Component.setStyleClass("cursor", "dragging");

                // Determine what will be dragged
                if (this.currentSelection.has(itemToDrag)) {
                    this.draggedItem = this.currentSelection;
                } else {
                    this.draggedItem = itemToDrag;
                }
                this.draggedItemType = itemType;

                // Define the image that will be visible during dragging
                if (this.draggedItem === this.currentSelection) {
                    dragImage.textContent =
                        `${this.currentSelection.size} items`;
                } else {
                    dragImage.textContent = this.draggedItem.textContent;
                }
                dragImage.show();
            }

            // Move the drag-image along with the cursor
            if (this.draggedItem !== null) {
                const width = dragImage.offsetWidth;
                const height = dragImage.offsetHeight;
                dragImage.style.left = `${event.pageX - width + 5}px`;
                dragImage.style.top = `${event.pageY - height + 5}px`;
            }
        });
        
        const stopDragging = () => {
            if (this.draggedItem === null) return false;
            this.draggedItem = null;
            this.draggedItemType = null;
            dragImage.hide();
            Component.setStyleClass("cursor", "default");
            if (this.currentlyHoveredNode === null) return false;
            this.currentlyHoveredNode.classList.remove("dragover");
            this.currentlyHoveredNode = null;
            return true;
        };

        window.addEventListener("contextmenu", () => {
            readyToDrag = false;
            stopDragging();
        });

        window.addEventListener("mouseup", () => {
            readyToDrag = false;
            const target = this.currentlyHoveredNode;
            const item = this.draggedItem;
            const type = this.draggedItemType;
            if (!stopDragging()) return;

            // Dropping items on list content view
            if (target === this.$("no-list-contents-info") ||
                    target === this.$("list-contents")) {
                if (type === "vocab" && this.selectedListNode !== null) {
                    if (item === this.currentSelection) {
                        for (const node of this.currentSelection) {
                            const word = node.textContent;
                            this.addToVocabList(word, this.selectedList);
                        }
                        this.clearSelection();
                    } else {
                        this.addToVocabList(item.textContent, this.selectedList)
                    }
                }
            }

            // Dropping items on vocab list label
            else if (target.parentNode == this.$("vocab-lists")) {
                const listName = target.dataset.listName;
                if (type === "list-contents" && this.selectedList === listName)
                    return;
                if (item === this.currentSelection) {
                    for (const node of this.currentSelection) {
                        this.addToVocabList(node.textContent, listName);
                    }
                    if (type === "list-contents") {
                        this.removeSelectedFromList(false);
                    } else if (type === "vocab") {
                        this.clearSelection();
                    }
                } else {
                    const word = item.textContent;
                    this.addToVocabList(word, listName);
                    if (type === "list-contents") {
                        this.removeFromVocabList(word, this.selectedList);
                    }
                }
            }
        });

        // =====================================================================
        //   Initialize views and attach event listeners for searching
        // =====================================================================
        this.viewStates = {};
        this.viewData = {};
        this.isViewLoaded = {};
        this.viewConfigs = {
            "vocab": {
                displayInitial: 40,
                displayOnScroll: 40,
                sortingCriterion: "dateAdded",
                sortBackwards: true
            },
            "vocab-lists": {
                displayInitial: 40,
                displayOnScroll: 40,
                sortingCriterion: "alphabetical",
                sortBackwards: false
            },
            "list-contents": {
                displayInitial: 40,
                displayOnScroll: 40,
                sortingCriterion: "alphabetical",
                sortBackwards: false
            },
            "kanji": {
                displayInitial: 300,
                displayOnScroll: 300,
                sortingCriterion: "dateAdded",
                sortBackwards: true
            },
            "hanzi": {
                displayInitial: 300,
                displayOnScroll: 300,
                sortingCriterion: "dateAdded",
                sortBackwards: true
            }
        };
        for (const viewName in this.viewConfigs) {
            this.viewStates[viewName] = new View({
                viewElement: this.$(viewName),
                getData: (query,method) => this.search(viewName, query, method),
                createViewItem: (text) => this.createViewItem(viewName, text),
                initialDisplayAmount: this.viewConfigs[viewName].displayInitial,
                displayAmount: this.viewConfigs[viewName].displayOnScroll,
                deterministic: false,
                loadOnResize: true
            });
            this.viewData[viewName] = { srsLevels: null, datesAdded: null,
                                        ids: null };

            // Add search functionality
            let searchFieldNames;
            if (viewName === "kanji") {
                searchFieldNames = {
                    [`search-${viewName}-by-meanings`]: "meanings",
                    [`search-${viewName}-by-on-yomi`]: "on-yomi",
                    [`search-${viewName}-by-kun-yomi`]: "kun-yomi"
                };
            } else if (viewName === "hanzi") {
                searchFieldNames = {
                    [`search-${viewName}-by-meanings`]: "meanings",
                    [`search-${viewName}-by-readings`]: "readings"
                };
            } else {
                searchFieldNames = { [`search-${viewName}`]: undefined };
            }

            // Attach event listener to search field
            for (const searchFieldName in searchFieldNames) {
                const searchMethod = searchFieldNames[searchFieldName];
                this.$(searchFieldName).setCallback((query) => {
                    this.viewStates[viewName].load(query, searchMethod);
                })
            }
        }

        // =====================================================================
        //   Selection functionality (only if a modifier key is pressed)
        // =====================================================================

        for (const viewName in this.viewConfigs) {
            const viewNode = this.$(viewName);
            this.$(viewName).addEventListener("click", (event) => {
                if (event.target === viewNode) return;
                let target = event.target;
                while (target.parentNode !== viewNode)
                    target = target.parentNode;
                const modifierUsed = event.ctrlKey || event.shiftKey;

                // Clear selection if it's in a different view, or no ctrl/shift
                if (this.selectionTarget !== viewName || !modifierUsed)
                    this.clearSelection();

                // If neither ctrl nor shift is pressed, don't select anything
                if (!modifierUsed) return;
                this.selectionTarget = viewName;

                // If a single list is selected, also keep it in multiple select
                if (viewName == "vocab-lists" && this.selectedListNode !== null)
                    this.currentSelection.add(this.selectedListNode)

                // If ctrl is pressed (but not shift), add/remove from selection
                const next = target.nextSibling;
                const prev = target.previousSibling;
                if (event.ctrlKey && !event.shiftKey) {
                    if (!this.currentSelection.has(target)) {
                        this.currentSelection.add(target);
                        target.classList.add("selected");
                        if (next === null || !this.currentSelection.has(next))
                            target.classList.add("last-selected");
                        if (prev !== null && this.currentSelection.has(prev))
                            prev.classList.remove("last-selected");
                    } else {
                        this.currentSelection.delete(target);
                        target.classList.remove("selected");
                        target.classList.remove("last-selected");
                        if (prev !== null && this.currentSelection.has(prev))
                            prev.classList.add("last-selected");
                    }
                    this.onSelectionChange();
                }

                if (event.shiftKey) {
                    const children = viewNode.children;

                    // Shift pressed, nothing selected -> select all up to first
                    if (this.currentSelection.size === 0) {
                        let i = 0;
                        while (children[i] !== target) {
                            this.currentSelection.add(children[i]);
                            children[i].classList.add("selected");
                            ++i;
                        }
                        this.currentSelection.add(target);
                        target.classList.add("selected");
                        target.classList.add("last-selected");
                        this.onSelectionChange();
                        return;
                    }

                    // If only selected element is this one, do nothing
                    if (this.currentSelection.size === 1 &&
                            this.currentSelection.has(target)) return;

                    // Otherwise, try to select until first selected above this
                    let node = target.previousSibling;
                    while (node !== null) {
                        if (this.currentSelection.has(node)) {
                            node.classList.remove("last-selected");
                            const selectionChanged = node !== target;
                            while (node !== target) {
                                node = node.nextSibling;
                                this.currentSelection.add(node);
                                node.classList.add("selected");
                            }
                            if (next===null || !this.currentSelection.has(next))
                                target.classList.add("last-selected");
                            if (selectionChanged) this.onSelectionChange();
                            return;
                        }
                        node = node.previousSibling;
                    }

                    // If there's no selected node above, select bottomwards
                    node = target;
                    const selectionChanged = !this.currentSelection.has(node);
                    while (!this.currentSelection.has(node)) {
                        this.currentSelection.add(node);
                        node.classList.add("selected");
                        node = node.nextSibling;
                    }
                    if (selectionChanged) this.onSelectionChange();
                    return;
                }
            });
        }

        // Clear selection by pressing escape
        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.currentSelection.size > 0)
                this.clearSelection();
        });

        // =====================================================================
        //   Define behavior for left-clicking without pressing modifier key
        // =====================================================================

        // Edit clicked vocabulary items
        this.$("vocab").addEventListener("click", (event) => {
            if (event.target.parentNode !== this.$("vocab")) return;
            if (event.ctrlKey || event.shiftKey) return;
            this.editItem(event.target.textContent, "vocab");
        });
        this.$("list-contents").addEventListener("click", (event) => {
            if (event.target.parentNode !== this.$("list-contents")) return;
            if (event.ctrlKey || event.shiftKey) return;
            this.editItem(event.target.textContent, "list-contents");
        });
        this.$("kanji").addEventListener("click", (event) => {
            if (event.target.parentNode !== this.$("kanji")) return;
            if (event.ctrlKey || event.shiftKey) return;
            this.editItem(event.target.textContent, "kanji");
        });
        this.$("hanzi").addEventListener("click", (event) => {
            if (event.target.parentNode !== this.$("hanzi")) return;
            if (event.ctrlKey || event.shiftKey) return;
            this.editItem(event.target.textContent, "hanzi");
        });

        // Show content of a list only when selecting without a modifier
        this.$("vocab-lists").addEventListener("click", (event) => {
            if (event.target === this.$("vocab-lists")) return;
            let node = event.target;
            while (node.parentNode !== this.$("vocab-lists"))
                node = node.parentNode;
            if (node.classList.contains("edit-mode")) return;
            if (event.ctrlKey || event.shiftKey) {
                const selected = this.selectedListNode;
                this.deselectVocabList();
                if (selected !== null && this.currentSelection.has(selected)) {
                    selected.classList.add("selected");
                    if (!this.currentSelection.has(selected.nextSibling))
                        selected.classList.add("last-selected");
                }
                this.$("delete-list-button").toggleDisplay(
                    this.currentSelection.size > 0);
                this.$("test-on-list-button").toggleDisplay(
                    this.currentSelection.size > 0);
            } else {
                this.selectVocabList(node);
            }
        });
    }

    registerCentralEventListeners() {
        // ====================================================================
        // Update views if vocabulary changed
        // ====================================================================
        events.on("word-deleted", (word) => {
            if (!this.isViewLoaded["vocab"]) return;
            this.removeEntryFromSortedView("vocab", word);
        });
        events.on("word-added", async (word) => {
            const dateAdded = await dataManager.vocab.getDateAdded(word);
            const srsLevel = await dataManager.srs.getLevel(
                    word, dataManager.test.mode.WORDS);
            const id = await dataManager.vocab.getId(word);
            this.viewData["vocab"].datesAdded.set(word, dateAdded);
            this.viewData["vocab"].srsLevels.set(word, srsLevel);
            this.viewData["vocab"].ids.set(word, id);
            if (!this.isViewLoaded["vocab"]) return;
            this.insertEntryIntoSortedView("vocab", word);
        });
        events.on("vocab-imported", async () => {
            if (this.isViewLoaded["vocab"])
                this.viewStates["vocab"].load("");
            if (this.isViewLoaded["vocab-lists"])
                this.viewStates["vocab-lists"].load("");
            if (this.selectedList !== null)
                this.viewStates["list-contents"].load("");
            const language = dataManager.currentLanguage;
            if (language === "Japanese" && this.isViewLoaded["kanji"])
                this.viewStates["kanji"].load("");
            if (language === "Chinese" && this.isViewLoaded["hanzi"])
                this.viewStates["hanzi"].load("");
        });
        // ====================================================================
        // Update views if content of a vocabulary list changed
        // ====================================================================
        events.on("removed-from-list", async (word, list) => {
            if (!this.isViewLoaded["vocab-lists"]) return;
            if (!this.isViewLoaded["vocab"]) return;

            // Unmark vocab-view item if it is not part of any list anymore
            if (dataManager.vocabLists.getListsForWord(word).length === 0) {
                const node = await this.getEntryFromSortedView("vocab", word);
                if (node !== null) node.classList.remove("already-in-list");
            }

            if (list !== undefined) {
                // Remove vocab item from list contents view
                if (this.selectedList === list) {
                    this.removeEntryFromSortedView("list-contents", word);
                }

                // Decrement word counter of the list (if list name if visible)
                const amountLabel = this.listNameToAmountLabel.get(list);
                if (amountLabel === undefined) return;
                amountLabel.textContent = parseInt(amountLabel.textContent) - 1;

                // Rearrange lists if they are sorted by length
                if (this.viewConfigs["vocab-lists"].sortingCriterion=="length"){
                    this.insertNodeIntoSortedView(
                        "vocab-lists", this.listNameToViewNode.get(list));
                }
            }
        });
        events.on("added-to-list", async (word, list) => {
            if (!this.isViewLoaded["vocab-lists"]) return;
            if (!this.isViewLoaded["vocab"]) return;
            // Mark the vocab item if it is displayed in the vocab-view
            const node = await this.getEntryFromSortedView("vocab", word);
            if (node !== null) {
                node.classList.add("already-in-list");
            }
            // Add vocab item to list contents view
            if (this.selectedList === list) {
                this.insertEntryIntoSortedView("list-contents", word);
            }
            // Increment word counter of the list (if the list name is visible)
            const amountLabel = this.listNameToAmountLabel.get(list);
            if (amountLabel === undefined) return;
            amountLabel.textContent = parseInt(amountLabel.textContent) + 1;
            // Rearrange lists if they are sorted by length
            if (this.viewConfigs["vocab-lists"].sortingCriterion === "length") {
                this.insertNodeIntoSortedView(
                    "vocab-lists", this.listNameToViewNode.get(list));
            }
        });
        // ====================================================================
        // Display correct columns and whether they're empty or not
        // ====================================================================
        events.onAll(["language-changed", "word-added", "word-deleted",
                      "vocab-imported"], () => { 
            dataManager.vocab.sizeFor(dataManager.currentLanguage)
            .then((size) => {
                this.$("vocab-frame").toggleDisplay(size > 0);
                this.$("empty-vocabulary-info").toggleDisplay(size === 0);
                this.$("import-export-vocab-buttons").toggleDisplay(size > 0);
            });
        });
        events.onAll(["language-changed", "vocab-list-created",
                      "vocab-list-deleted", "vocab-imported"], () => {
            const noLists = dataManager.vocabLists.getLists().length === 0;
            this.$("vocab-lists-frame").toggleDisplay(!noLists, "flex");
            this.$("list-contents-column").toggleDisplay(!noLists, "flex");
            this.$("no-lists-info").toggleDisplay(noLists, "flex");
        });
        events.on("vocab-list-created", (list, insertIntoView=false) => {
            if (insertIntoView && this.isViewLoaded["vocab-lists"]) {
                this.insertEntryIntoSortedView("vocab-lists", list);
            }
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
                if (noContents)
                    this.$("control-selected-list-contents-buttons").hide();
            } else {
                this.$("no-list-contents-info").hide();
                this.$("control-selected-list-contents-buttons").hide();
            }
        });
        // ====================================================================
        // Kanji view updates
        // ====================================================================
        events.on("kanji-removed", (kanji) => {
            if (!this.isViewLoaded["kanji"]) return;
            this.removeEntryFromSortedView("kanji", kanji);
        });
        events.on("kanji-added", async (kanji) => {
            const dateAdded = await dataManager.kanji.getDateAdded(kanji);
            const id = await dataManager.kanji.getId(kanji);
            this.viewData["kanji"].datesAdded.set(kanji, dateAdded);
            this.viewData["kanji"].ids.set(kanji, id);
            if (!this.isViewLoaded["kanji"]) return;
            this.insertEntryIntoSortedView("kanji", kanji);
        });
        events.onAll(["language-changed", "kanji-added", "kanji-removed",
                      "vocab-imported"], () => { 
            if (dataManager.currentLanguage !== "Japanese") return;
            dataManager.kanji.getAmountAdded().then((amountAdded) => {
                this.$("kanji-frame").toggleDisplay(amountAdded > 0);
                this.$("no-kanji-info").toggleDisplay(amountAdded === 0);
            });
        });
        // ====================================================================
        // Hanzi view updates
        // ====================================================================
        events.on("hanzi-removed", (hanzi) => {
            if (!this.isViewLoaded["hanzi"]) return;
            this.removeEntryFromSortedView("hanzi", hanzi);
        });
        events.on("hanzi-added", async (hanzi) => {
            const dateAdded = await dataManager.hanzi.getDateAdded(hanzi);
            const id = await dataManager.hanzi.getId(hanzi);
            this.viewData["hanzi"].datesAdded.set(hanzi, dateAdded);
            this.viewData["hanzi"].ids.set(hanzi, id);
            if (!this.isViewLoaded["hanzi"]) return;
            this.insertEntryIntoSortedView("hanzi", hanzi);
        });
        events.onAll(["language-changed", "hanzi-added", "hanzi-removed",
                      "vocab-imported"], () => { 
            if (dataManager.currentLanguage !== "Chinese") return;
            dataManager.hanzi.getAmountAdded().then((amountAdded) => {
                this.$("hanzi-frame").toggleDisplay(amountAdded > 0);
                this.$("no-hanzi-info").toggleDisplay(amountAdded === 0);
            });
        });
    }
    
    async adjustToLanguage(language, secondary) {
        this.deselectVocabList();
        this.listNameToAmountLabel.clear();
        this.listNameToViewNode.clear();
        this.clearSelection();

        // Display necessary tabs
        this.$("words-tab-button").click();
        this.$("kanji-tab-button").toggleDisplay(language === "Japanese");
        this.$("hanzi-tab-button").toggleDisplay(language === "Chinese");
        if (language === "Japanese" || language === "Chinese") {
            this.$("words-tab-button").show();
        } else {
            this.$("words-tab-button").hide();
        }

        // Load data needed for item sorting
        this.viewData["vocab"].datesAdded =
            await dataManager.vocab.getDateAddedForEachWord();
        this.viewData["vocab"].srsLevels =
            await dataManager.vocab.getLevelForEachWord();
        this.viewData["vocab"].ids =
            await dataManager.vocab.getIdForEachWord();
        if (language === "Japanese") {
            this.viewData["kanji"].datesAdded =
                await dataManager.kanji.getDateAddedForEachKanji();
            this.viewData["kanji"].ids =
                await dataManager.kanji.getIdForEachKanji();
        }
        if (language === "Chinese") {
            this.viewData["hanzi"].datesAdded =
                await dataManager.hanzi.getDateAddedForEachHanzi();
            this.viewData["hanzi"].ids =
                await dataManager.hanzi.getIdForEachHanzi();
        }

        // Defer initial loading of views until section is actually opened
        for (const viewName in this.viewStates) {
            this.isViewLoaded[viewName] = false;
        }

        // Enable pinyin input in search entries if language is Chinese
        this.$("search-vocab").togglePinyinInput(language === "Chinese");
        this.$("search-list-contents").togglePinyinInput(language==="Chinese");
    }

    open() {
        // Load initial view contents if not done yet. If they're already
        // loaded, fill them up in case the view size has been changed.
        if (!this.isViewLoaded["vocab"]) {
            this.isViewLoaded["vocab"] = true;
            this.viewStates["vocab"].load("");
        } else this.viewStates["vocab"].fillSufficiently();
        if (!this.isViewLoaded["vocab-lists"]) {
            this.isViewLoaded["vocab-lists"] = true;
            this.viewStates["vocab-lists"].load("");
        } else this.viewStates["vocab-lists"].fillSufficiently();
        const language = dataManager.currentLanguage;
        if (language === "Japanese") {
            if (!this.isViewLoaded["kanji"]) {
                this.isViewLoaded["kanji"] = true;
                this.viewStates["kanji"].load("");
            } else this.viewStates["kanji"].fillSufficiently();
        } else if (language === "Chinese") {
            if (!this.isViewLoaded["hanzi"]) {
                this.isViewLoaded["hanzi"] = true;
                this.viewStates["hanzi"].load("");
            } else this.viewStates["hanzi"].fillSufficiently();
        }
        this.$("search-vocab").focus();
    }

    // =====================================================================
    // Functions for creating items
    // =====================================================================

    createViewItem(fieldName, content) {
        if (fieldName === "vocab")
            return this.createVocabViewItem(content);
        if (fieldName === "vocab-lists")
            return this.createVocabListsViewItem(content);
        if (fieldName === "list-contents")
            return this.createListContentsViewItem(content);
        if (fieldName === "kanji")
            return this.createKanjiViewItem(content);
        if (fieldName === "hanzi")
            return this.createHanziViewItem(content);
    }

    createVocabViewItem(word) {
        const item = document.createElement("div");
        item.textContent = word;

        // Mark the item if it already is part of at least one vocab list
        if (dataManager.vocabLists.getListsForWord(word).length > 0) {
            item.classList.add("already-in-list");
        }

        // Add context menu
        item.contextMenu(menuItems, () => this.selectionTarget === "vocab" &&
            this.currentSelection.size > 1 && this.currentSelection.has(item) ?
            ["copy-selected", "export-selected", "delete-selected"] :
            ["edit-item", "copy-item", "delete-item"],
            { section: this, itemType: "vocab" });
        return item;
    }

    createKanjiViewItem(kanji) {
        const item = document.createElement("div");
        item.textContent = kanji;
        item.contextMenu(menuItems, () => this.selectionTarget === "kanji" &&
            this.currentSelection.size > 1 && this.currentSelection.has(item) ?
            ["copy-selected", "export-selected", "delete-selected"] :
            ["edit-item", "copy-item", "delete-item"],
            { section: this, itemType: "kanji" });
        return item;
    }

    createHanziViewItem(hanzi) {
        const item = document.createElement("div");
        item.textContent = hanzi;
        item.contextMenu(menuItems, () => this.selectionTarget === "hanzi" &&
            this.currentSelection.size > 1 && this.currentSelection.has(item) ?
            ["copy-selected", "export-selected", "delete-selected"] :
            ["edit-item", "copy-item", "delete-item"],
            { section: this, itemType: "hanzi" });
        return item;
    }

    createListContentsViewItem(word) {
        const item = document.createElement("div");
        item.textContent = word;
        item.contextMenu(menuItems, () =>
            this.selectionTarget === "list-contents" &&
            this.currentSelection.size > 1 && this.currentSelection.has(item) ?
            ["copy-selected", "export-selected", "delete-selected",
             "remove-selected-from-list"] :
            ["edit-item", "copy-item", "delete-item", "remove-from-list"],
            { section: this, itemType: "list-contents" });
        return item;
    }

    createVocabListsViewItem(name) {
        const node = document.createElement("div");

        // Display name of the list
        const nameLabel = document.createElement("div");
        nameLabel.textContent = name;
        nameLabel.classList.add("list-name");
        nameLabel.setAttribute("spellcheck", "false");
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

        // Allow renaming the list
        node.enterEditMode = () => {
            nameLabel.contentEditable = "true";
            nameLabel.focus();
            node.classList.add("edit-mode");
        };
        nameLabel.addEventListener("focusin", () => {
            node.removeEventListener("click", node.selectVocabListCallback);
        });

        // If Enter is pressed, quit editing and process input
        nameLabel.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                nameLabel.blur();
            }
        });

        // If Escape is pressed, quit editing without making any changes
        nameLabel.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                nameLabel.textContent = node.dataset.listName;
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

            // Case that an existing vocabulary list was renamed to empty string
            } else if (oldName.length > 0) {
                dialogWindow.info("The name of a list must not be empty!");
                nameLabel.textContent = oldName;

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

        // Highlight list name when dragging vocabulary items over it
        node.addEventListener("mouseenter", () => {
            this.currentlyHoveredNode = node;
            if (this.draggedItem !== null) node.classList.add("dragover");
        });
        node.addEventListener("mouseleave", () => {
            this.currentlyHoveredNode = null;
            if (this.draggedItem !== null) node.classList.remove("dragover");
        });

        node.contextMenu(menuItems, () =>
            this.selectionTarget === "vocab-lists" &&
            this.currentSelection.size > 1 && this.currentSelection.has(node) ?
                ["test-on-selected", "delete-selected"] :
                ["test-on-list", "delete-list", "rename-list"],
                { section: this, itemType: "vocab-lists" });
        return node;
    }

    editItem(item, itemType) {
        const entryList = this.viewStates[itemType].data
        const panelNames = {
            "vocab": "edit-vocab",
            "list-contents": "edit-vocab",
            "kanji": "edit-kanji",
            "hanzi": "edit-hanzi"
        }
        main.openPanel(panelNames[itemType], { entryName: item, entryList });
    }

    copySelected(type) {
        const strings = [];
        if (type === "vocab-lists") {
            for (const node of this.currentSelection)
                strings.push(node.dataset.listName);
        } else {
            for (const node of this.currentSelection)
                strings.push(node.textContent);
        }
        clipboard.writeText(strings.join("\n"));
        main.updateStatus(
            `Copied ${this.currentSelection.size} items to the clipboard.`);
    }

    async exportItems(type, onlySelected) {
        const items = !onlySelected ? undefined :
            Array.from(this.currentSelection).map((node) => node.textContent);
        const filepath = await dialogWindow.chooseExportFile(
            `acnicoy-${dataManager.currentLanguage}-${type}-export.tsv`);
        if (!filepath) return;
        await dataManager[type].export(filepath, items);
        const numItems = onlySelected ? items.length :
            await dataManager[type].getAmountAdded();
        main.updateStatus(`Exported ${numItems} vocabulary items.`);
    }

    // =====================================================================
    // Functions for deleting items or selections thereof
    // =====================================================================

    async deleteItem(node, type, onlySingleItem=true) {
        const item = type === "vocab-lists" ? node.dataset.listName :
                                              node.textContent;
        if (onlySingleItem) {
            let typeStr = type;
            if (type === "vocab" || type === "list-contents") typeStr = "word";
            else if (type === "vocab-lists") typeStr = "list";
            const confirmed = await dialogWindow.confirm(
                `Are you sure you want to delete the ${typeStr}<br>'${item}'?`);
            if (!confirmed) return;
        }
        if (type === "vocab" || type === "list-contents") {
            const oldLists = dataManager.vocabLists.getListsForWord(item);
            const dictionaryId = dataManager.content.isDictionaryLoaded() ?
                await dataManager.vocab.getAssociatedDictionaryId(item) : null;
            await dataManager.vocab.remove(item);
            for (const listName of oldLists) {
                events.emit("removed-from-list", item, listName);
            }
            events.emit("word-deleted", item, dictionaryId);
            events.emit("vocab-changed");
        } else if (type === "vocab-lists") {
            if (this.selectedListNode === node) this.deselectVocabList();
            const words = dataManager.vocabLists.getWordsForList(item);
            dataManager.vocabLists.deleteList(item);
            for (const word of words) events.emit("removed-from-list", word);
            events.emit("vocab-list-deleted", item);
            if (onlySingleItem) node.remove();
        } else if (type === "kanji") {
            dataManager.kanji.remove(item);
            events.emit("kanji-removed", item);
        } else if (type === "hanzi") {
            dataManager.hanzi.remove(item);
            events.emit("hanzi-removed", item);
        }
    }

    async deleteSelected(type) {
        if (this.selectionTarget !== type || this.currentSelection.size === 0)
            return;
        const amount = this.currentSelection.size;
        const confirmed = await dialogWindow.confirm(
           `Are you sure you want to delete the ${amount} selected items?`);
        if (!confirmed) return false;
        // Efficiently remove the items from the view (in linear time)
        utility.removeMultipleNodes(this.currentSelection, this.$(type));
        // Now delete each item from the data and emit events
        for (const node of this.currentSelection) {
            this.deleteItem(node, type, false)
        }
        this.clearSelection();
    }

    // =====================================================================
    // Functions for handling selections
    // =====================================================================

    clearSelection() {
        for (const element of this.currentSelection) {
            element.classList.remove("selected");
            element.classList.remove("last-selected");
        }
        this.selectionTarget = null;
        this.currentSelection.clear();
        this.onSelectionChange();
    }

    onSelectionChange() {
        // Vocab control buttons
        this.$("import-export-vocab-buttons").toggleDisplay(
            this.selectionTarget !== "vocab" || this.currentSelection.size===0);
        this.$("control-selected-vocab-buttons").toggleDisplay(
            this.selectionTarget === "vocab" && this.currentSelection.size > 0);

        // List control buttons
        const listsSelected = this.selectedListNode !== null ||
            (this.selectionTarget==="vocab-lists"&&this.currentSelection.size);
        this.$("delete-list-button").toggleDisplay(listsSelected);
        this.$("test-on-list-button").toggleDisplay(listsSelected);

        // List contents control buttons
        this.$("control-selected-list-contents-buttons").toggleDisplay(
            this.selectionTarget === "list-contents"
            && this.currentSelection.size > 0);
    }

    // =====================================================================
    // Functions for selecting or testing on vocab lists
    // =====================================================================

    addVocabList() {
        const item = this.createViewItem("vocab-lists", "");
        this.$("vocab-lists").appendChild(item);
        this.$("vocab-lists").scrollToBottom();
        this.$("vocab-lists-frame").show("flex");
        this.$("no-lists-info").hide();
        item.enterEditMode();
    }

    selectVocabList(node) {
        if (this.selectedListNode === node) return;
        const listName = node.dataset.listName;
        if (this.selectedListNode !== null) {
            this.selectedListNode.classList.remove("selected");
            this.selectedListNode.classList.remove("last-selected");
        }
        node.classList.add("selected");
        node.classList.add("last-selected");
        this.$("rename-list-button").show();
        this.$("delete-list-button").show();
        this.$("test-on-list-button").show();
        this.selectedList = listName;
        this.selectedListNode = node;
        this.viewStates["list-contents"].load("");
        events.emit("vocab-list-selected", listName);
    }

    deselectVocabList() {
        if (this.selectedListNode === null) return;
        this.selectedListNode.classList.remove("selected");
        this.selectedListNode.classList.remove("last-selected");
        this.selectedListNode = null;
        this.selectedList = null;
        this.$("list-contents").empty();
        this.$("rename-list-button").hide();
        this.$("delete-list-button").hide();
        this.$("test-on-list-button").hide();
        events.emit("vocab-list-deselected");
    }

    async startTestOnVocabLists(nodes) {
        let totalAmountOfWords = 0;
        const listNames = [];
        for (const node of nodes) {
            const listName = node.dataset.listName;
            listNames.push(listName);
            totalAmountOfWords +=
                dataManager.vocabLists.getWordsForList(listName).length;
        }
        if (totalAmountOfWords === 0) {
            if (listNames.length === 1) {
                dialogWindow.info(`The list '${listNames[0]}' is empty!`);
            } else {
                dialogWindow.info(`The selected lists are all empty!`);
            }
            return;
        }
        const noOtherSessionActive = await main.sections["test"].abortSession();
        if (noOtherSessionActive)
            main.openSection("test", false, [undefined, listNames]);
    }

    // =====================================================================
    // Functions for manipulating vocab list contents
    // =====================================================================

    addToVocabList (word, listName) {
        if (dataManager.vocabLists.addWordToList(word, listName)) {
            events.emit("added-to-list", word, listName);
        }
    }

    removeFromVocabList(word, listName) {
        dataManager.vocabLists.removeWordFromList(word, listName);
        events.emit("removed-from-list", word, listName);
    }

    async removeSelectedFromList(confirm=true) {
        if (this.selectionTarget !== "list-contents" ||
                this.currentSelection.size === 0) return;
        if (confirm) {
            const amount = this.currentSelection.size;
            const confirmed = await dialogWindow.confirm(
               `Are you sure you want to remove the ${amount} selected items ` +
               `from the list '${this.selectedList}'?`);
            if (!confirmed) return false;
        }
        // Efficiently remove the items from the view (in linear time)
        utility.removeMultipleNodes(
            this.currentSelection, this.$("list-contents"));
        // Efficiently delete the items from the list data (also in linear time)
        const wordsToDelete = new Set();
        for (const node of this.currentSelection) {
            wordsToDelete.add(node.textContent);
        }
        dataManager.vocabLists.removeMultipleWordsFromList(wordsToDelete,
                                                           this.selectedList);
        // Emit events to update associated items in other views
        for (const node of this.currentSelection) {
            events.emit("removed-from-list",node.textContent,this.selectedList);
        }
        this.clearSelection();
    }

    // =====================================================================
    // Item sorting
    // =====================================================================

    async getStringKeyForSorting(fieldName) {
        const sortingCriterion = this.viewConfigs[fieldName].sortingCriterion;
        if (fieldName === "vocab") {
            const datesAdded = this.viewData["vocab"].datesAdded;
            const srsLevels = this.viewData["vocab"].srsLevels;
            const ids = this.viewData["vocab"].ids;
            if (sortingCriterion === "alphabetical") {
                return (word) => word;
            } else if (sortingCriterion === "dateAdded") {
                return (word) => [datesAdded.get(word), ids.get(word)];
            } else if (sortingCriterion === "level") {
                return (word) => [srsLevels.get(word), ids.get(word)];
            }
        } else if (fieldName === "vocab-lists") {
            if (sortingCriterion === "alphabetical") {
                return (listName) => listName;
            } else if (sortingCriterion === "length") {
                return (listName) =>
                    [dataManager.vocabLists.getWordsForList(listName).length,
                     listName];
            }
        } else if (fieldName === "list-contents") {
            if (sortingCriterion === "alphabetical") {
                return (word) => word;
            }
        } else if (fieldName === "kanji") {
            const datesAdded = this.viewData["kanji"].datesAdded;
            const ids = this.viewData["kanji"].ids;
            if (sortingCriterion === "alphabetical") {
                return (kanji) => kanji;
            } else if (sortingCriterion === "dateAdded") {
                return (kanji) => [datesAdded.get(kanji), ids.get(kanji)];
            }
        } else if (fieldName === "hanzi") {
            const datesAdded = this.viewData["hanzi"].datesAdded;
            const ids = this.viewData["hanzi"].ids;
            if (sortingCriterion === "alphabetical") {
                return (hanzi) => hanzi;
            } else if (sortingCriterion === "dateAdded") {
                return (hanzi) => [datesAdded.get(hanzi), ids.get(hanzi)];
            }
        }
    }

    getNodeKeyForSorting(fieldName) {
        const sortingCriterion = this.viewConfigs[fieldName].sortingCriterion;
        if (fieldName === "vocab") {
            return (node) => node.textContent;
        } else if (fieldName === "vocab-lists") {
            return (node) => node.dataset.listName;
        } else if (fieldName === "list-contents") {
            return (node) => node.textContent;
        } else if (fieldName === "kanji") {
            return (node) => node.textContent;
        } else if (fieldName === "hanzi") {
            return (node) => node.textContent;
        }
    }

    async insertEntryIntoSortedView(fieldName, content) {
        const node = this.createViewItem(fieldName, content);
        await this.insertNodeIntoSortedView(fieldName, node);
    }

    async insertNodeIntoSortedView(fieldName, node) {
        // Only insert if there is no filter on the view
        if (this.viewStates[fieldName].lastQuery !== "") {
            return;
        }
        const nodeKey = this.getNodeKeyForSorting(fieldName);
        const sortBackwards = this.viewConfigs[fieldName].sortBackwards;
        const viewNode = this.$(fieldName);
        const stringKey = await this.getStringKeyForSorting(fieldName);
        const key = (node) => stringKey(nodeKey(node));
        const value = key(node);
        if (viewNode.children.length === 0) {
            viewNode.appendChild(node);
        } else {
            const index = utility.findIndex(viewNode, value, key, sortBackwards)
            if (index === -1) {
                viewNode.prepend(node);
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
        const sortBackwards = this.viewConfigs[fieldName].sortBackwards;
        const value = stringKey(content);
        await utility.removeEntryFromSortedList(
            this.$(fieldName), value, key, sortBackwards);
    }

    async getEntryFromSortedView(fieldName, content) {
        const nodeKey = this.getNodeKeyForSorting(fieldName);
        const stringKey = await this.getStringKeyForSorting(fieldName);
        const key = (node) => stringKey(nodeKey(node));
        const sortBackwards = this.viewConfigs[fieldName].sortBackwards;
        const value = stringKey(content);
        return utility.getEntryFromSortedList(
            this.$(fieldName), value, key, sortBackwards);
    }

    // =====================================================================
    // Search functionality
    // =====================================================================

    async search(fieldName, query, searchMethod) {
        if (this.selectionTarget === fieldName) this.clearSelection();
        const sortingCriterion = this.viewConfigs[fieldName].sortingCriterion;
        const sortBackwards = this.viewConfigs[fieldName].sortBackwards;
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
            } else if (fieldName === "kanji") {
                searchResults = await dataManager.kanji.getAll(
                    sortingCriterion, sortBackwards);
                alreadySorted = true;
            } else if (fieldName === "hanzi") {
                searchResults = await dataManager.hanzi.getAll(
                    sortingCriterion, sortBackwards);
                alreadySorted = true;
            }
        } else {
            if (fieldName === "vocab") {
                searchResults = await dataManager.vocab.search(query);
            } else if (fieldName === "vocab-lists") {
                searchResults = dataManager.vocabLists.searchForList(query);
            } else if (fieldName === "list-contents") {
                searchResults = await dataManager.vocabLists.searchList(
                    this.selectedList, query);
            } else if (fieldName === "kanji") {
                searchResults =
                    await dataManager.kanji.search(query, searchMethod);
            } else if (fieldName === "hanzi") {
                searchResults =
                    await dataManager.hanzi.search(query, searchMethod);
            }
        }
        // NOTE: Entries are now already sorted in the datamanager-function
        // Sort search result if necessary
        // if (!alreadySorted) {
        //     const key = await this.getStringKeyForSorting(fieldName);
        //     searchResults.sort((entry1, entry2) => {
        //         const value1 = key(entry1);
        //         const value2 = key(entry2);
        //         if (value1 < value2) return -1 + 2 * sortBackwards;
        //         if (value1 > value2) return 1 - 2 * sortBackwards;
        //         return 0;
        //     });
        // }
        if (fieldName === "vocab-lists") {
            this.deselectVocabList();
        }
        return searchResults;
    }

}

customElements.define("vocab-section", VocabSection);
module.exports = VocabSection;
