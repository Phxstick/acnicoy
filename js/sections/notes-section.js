"use strict";

const marked = require("marked");

const menuItems = contextMenu.registerItems({
    "save-note": {
        label: "Save note",
        click: ({ data: { section } }) => {
            section.saveNoteBeingEdited();
        }
    },
    "edit-note": {
        label: "Edit note",
        click: ({ currentNode, data: { section } }) => {
            section.editNote(currentNode);
        }
    },
    "delete-note": {
        label: "Delete note",
        click: ({ currentNode, data: { section } }) => {
            section.deleteNote(currentNode);
        }
    },
    "view-in-group": {
        label: "View in group",
        click: async ({ currentNode, data: { section } }) => {
            section.viewInGroup(currentNode);
        }
    },
    "insert-note-below": {
        label: "Insert note below",
        click: ({ currentNode, data: { section } }) => {
            const note = section.createNote("");
            currentNode.parentNode.insertBefore(note, currentNode.nextSibling);
            section.editNote(note);
            if (note.nextSibling === null) {
                note.scrollIntoView(false);
            }
        }
    }
});

class NotesSection extends Section {
    constructor() {
        super("notes");
        this.$("add-button").hide();
        this.$("search-results").hide();
        this.$("no-search-results-info").hide();
        this.searchResultsContainer = this.$("search-results");
        this.$("structure-tree").setAttribute("sort-children", "");

        // ====================================================================
        //   Variables
        // ====================================================================

        // Note mappings
        this.noteToMarkdown = new WeakMap();
        this.noteToGroupNode = new WeakMap();
        this.noteToReference = new WeakMap();

        // General state
        this.isOpen = false;
        this.modified = false;
        this.noteBeingEdited = null;
        this.selectedGroupNode = null;
        this.currentNotesContainer = null;
        this.initializedGroups = new WeakSet();

        // Drag & drop
        this.draggingNote = false;
        this.draggedNote = null;
        this.dragAnchorX = 0;
        this.dragAnchorY = 0;
        // Remember the neighbor/container of the node before dragging started
        this.previousNeighbor = null;
        this.previousContainer = null;
        // Remember what the cursor is hovering over while dragging a note
        this.currentlyHoveredNote = null;
        this.bottomHovered = false;
        this.addButtonHovered = false;

        this.$("add-group-button").addEventListener("click", () => {
            this.$("structure-tree").addNode();
        });

        // ====================================================================
        //   Views
        // ====================================================================

        this.lastGroupNode;
        this.searchResultsView = new View({
            viewElement: this.searchResultsContainer,
            scrollElement: this.$("notes-frame"),
            noDataPane: this.$("no-search-results-info"),
            createViewItem: ([noteContent, groupNode, reference]) => {
                const fragment = document.createDocumentFragment();
                // Display location of note (if not same as for previous note)
                if (this.lastGroupNode !== groupNode) {
                    this.lastGroupNode = groupNode;
                    const path = this.$("structure-tree").getPath(groupNode);
                    const locationLabel = document.createElement("div");
                    const labelParts = [];
                    for (let i = 0; i < path.length; ++i) {
                        labelParts.push(`<span>${path[i]}</span>`);
                        if (i !== path.length - 1)
                            labelParts.push(`<span class="separator"></span>`)
                    }
                    locationLabel.classList.add("location-label");
                    locationLabel.innerHTML = labelParts.join("");
                    fragment.appendChild(locationLabel);
                }
                // Create note
                const note = this.createNote(noteContent);
                this.noteToGroupNode.set(note, groupNode);
                if (reference) this.noteToReference.set(note, reference);
                fragment.appendChild(note);
                return fragment;
            },
            initialDisplayAmount: 15,
            displayAmount: 10,
            deterministic: false,
            loadOnScroll: false
        });

        // Display more notes upon scrolling view or resizing window
        const fillView = () => {
            if (this.currentNotesContainer === this.searchResultsContainer) {
                this.searchResultsView.fillSufficiently();
            } else if (this.selectedGroupNode !== null) {
                this.selectedGroupNode.data.view.fillSufficiently();
            }
        };
        this.$("notes-frame").addEventListener("scroll", () => fillView());
        let resizeHandlerId = null;
        window.addEventListener("resize", () => {
            if (resizeHandlerId !== null) clearTimeout(resizeHandlerId);
            resizeHandlerId = window.setTimeout(fillView, 800);
        });

        // ====================================================================
        //   Search buttons/entries callbacks
        // ====================================================================

        for (const part of ["groups", "notes"]) {
            const button = this.$(`search-${part}-button`);
            const entry = this.$(`search-${part}-entry`);
            entry.hide();

            // Show/hide search entry upon clicking button
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                if (entry.isHidden()) {
                    entry.value = "";
                    entry.show();
                    Velocity(entry, "slideDown", { duration: 140 });
                    entry.focus();
                } else {
                   entry.blur();
                }
            });

            if (part === "notes") {
                // Press enter to search
                entry.addEventListener("keypress", (event) => {
                    if (event.key === "Enter") {
                        this.search(entry.value.trim());
                        entry.blur();
                    }
                });
            }

            // Press escape to hide search entry
            entry.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    entry.blur();
                }
            });

            // Also hide search entry upon losing focus
            entry.addEventListener("focusout", (event) => {
                Velocity(entry, "slideUp", { duration: 140, display: "none" });
            });
        }

        // ====================================================================
        //   Searching groups using completion tooltip
        // ====================================================================

        const groupSearchCompletionTooltip =
            document.createElement("completion-tooltip");
        groupSearchCompletionTooltip.setAttribute("direction", "down");
        // groupSearchCompletionTooltip.setPlaceholder("No matching groups.");
        groupSearchCompletionTooltip.attachTo(this.$("search-groups-entry"));

        // Display all groups containing entered string, prioritize if at start
        const candidateOptionToNode = new WeakMap();
        groupSearchCompletionTooltip.setData((query) => {
            if (query.trim().length === 0) return [];
            const startMatches = [];
            const otherMatches = [];
            query = query.trim().toLowerCase();
            this.$("structure-tree").traverse((node) => {
                if (this.selectedGroupNode === node) return;
                const name = node.name;
                if (name.toLowerCase().includes(query)) {
                    const option = document.createElement("div");
                    option.value = name;
                    // TODO: make sure displayed label identifies group uniquely
                    option.textContent = name;
                    candidateOptionToNode.set(option, node);
                    if (name.toLowerCase().startsWith(query)) {
                        startMatches.push(option);
                    } else {
                        otherMatches.push(option);
                    }
                }
            });
            // startMatches.sort();
            // otherMatches.sort();
            return [...startMatches, ...otherMatches];
        });

        // Upon selecting an option, open corresponding group and hide entry
        groupSearchCompletionTooltip.setSelectionCallback((_, selectedNode) => {
            this.$("search-groups-entry").value = selectedNode.value;
            this.$("search-groups-entry").blur();
            const treeNode = candidateOptionToNode.get(selectedNode);
            this.$("structure-tree").select(treeNode);
        });

        // ====================================================================
        //   Button for adding notes
        // ====================================================================

        // Add an empty note in edit-mode when clicking the add-button
        this.$("add-button").addEventListener("click", () => {
            const note = this.createNote("");
            this.currentNotesContainer.prepend(note);
            this.editNote(note);
        });

        // When hovering over the add-button while dragging a note, highlight it
        this.$("add-button").addEventListener("mouseenter", () => {
            if (!this.draggingNote) return;
            this.addButtonHovered = true;
            this.$("add-button").classList.add("highlight-bottom");
        });
        this.$("add-button").addEventListener("mouseleave", () => {
            if (!this.draggingNote) return;
            this.addButtonHovered = false;
            this.$("add-button").classList.remove("highlight-bottom");
        });

        // ====================================================================
        //   Editing notes
        // ====================================================================

        // Leave edit mode when pressing escape or using shortcut for saving
        window.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            if (this.noteBeingEdited === null) return;
            this.saveNoteBeingEdited();
        });
        shortcuts.bindCallback("save-input", () => {
            if (this.noteBeingEdited === null) return;
            this.saveNoteBeingEdited();
        });

        // Enter edit mode when double clicking a note
        this.$("notes").addEventListener("dblclick", (event) => {
            let node = event.target;
            while (node.parentNode !== this.currentNotesContainer) {
                node = node.parentNode;
            }
            if (!node.classList.contains("note-content")) return;
            if (this.noteBeingEdited === node)
                return;
            if (this.noteBeingEdited !== null)
                this.saveNoteBeingEdited();
            this.editNote(node);
        });

        // ====================================================================
        //   Initiating to drag notes
        // ====================================================================

        // When pressing CTRL, change cursor over notes to signal ready-to-drag
        window.addEventListener("keydown", (event) => {
            if (this.noteBeingEdited !== null) return;
            if (event.key === "Control") {
                this.$("notes-frame").classList.add("ready-to-drag-note");
            }
        });
        window.addEventListener("keyup", (event) => {
            if (event.key === "Control") {
                this.$("notes-frame").classList.remove("ready-to-drag-note");
            }
        });

        // Function which initiates dragging of a note
        const startDraggingNote = (event) => {
            if (this.noteBeingEdited !== null) return;
            this.draggingNote = true;
            this.draggedNote = this.currentlyHoveredNote;
            this.previousNeighbor = this.draggedNote.nextSibling;
            this.previousContainer = this.currentNotesContainer;
            const boundingRect = this.draggedNote.getBoundingClientRect();
            this.dragAnchorX = event.pageX - boundingRect.left;
            this.dragAnchorY = event.pageY - boundingRect.top;
            this.draggedNote.style.left = `${event.pageX - this.dragAnchorX}px`;
            this.draggedNote.style.top = `${event.pageY - this.dragAnchorY}px`;
            this.draggedNote.style.width = `${this.draggedNote.offsetWidth}px`;
            this.draggedNote.style.height =`${this.draggedNote.offsetHeight}px`;
            this.draggedNote.classList.add("dragged-note");
            document.body.appendChild(this.draggedNote);
            Component.setStyleClass("cursor", "dragging");

            // Fill level of view might go below threshold, fill if necessary
            if (this.currentNotesContainer === this.searchResultsContainer) {
                this.searchResultsView.fillSufficiently();
            } else {
                this.selectedGroupNode.data.view.fillSufficiently();
            }
        };

        // Start dragging a note when pressing mouse button while pressing CTRL
        this.$("notes").addEventListener("mousedown", (event) => {
            if (this.currentlyHoveredNote === null) return;
            if (!event.ctrlKey) return;
            startDraggingNote(event);
            event.preventDefault();
        });

        // ====================================================================
        //   Highlighting new position while dragging note
        // ====================================================================
        
        window.addEventListener("mousemove", (event) => {
            if (!this.draggingNote) return;
            this.draggedNote.style.left = `${event.pageX - this.dragAnchorX}px`;
            this.draggedNote.style.top = `${event.pageY - this.dragAnchorY}px`;
            if (this.currentNotesContainer===this.searchResultsContainer)return;
            const lastElement = this.currentNotesContainer.children.length > 0 ?
                this.currentNotesContainer.lastElementChild:this.$("add-button")
            lastElement.classList.remove("highlight-bottom");

            // Case that the dragged note is hovering over another note
            if (this.currentlyHoveredNote !== null) {
                const rect = this.currentlyHoveredNote.getBoundingClientRect();
                const localY = event.pageY - rect.top;
                this.bottomHovered = localY > rect.height / 2;

                // If the bottom of the note is hovered, highlight the top
                // border of the note below, or bottom border if it's last note
                if (this.currentlyHoveredNote.nextSibling !== null) {
                    this.currentlyHoveredNote.nextSibling.classList.toggle(
                        "highlight-top", this.bottomHovered);
                } else {
                    this.currentlyHoveredNote.classList.toggle(
                        "highlight-bottom", this.bottomHovered);
                }

                // If the top of the note is hovered...
                if (this.currentlyHoveredNote !==
                        this.currentNotesContainer.firstElementChild) {
                    // ..highlight top border of the note if it's not the first
                    this.currentlyHoveredNote.classList.toggle(
                        "highlight-top", !this.bottomHovered);
                } else {
                    // ..highlight bottom border of add-button if it's the first
                    this.$("add-button").classList.toggle(
                        "highlight-bottom", !this.bottomHovered);
                } 

            // Case that dragged note is hovering over empty part of note frame
            } else if (this.notesFrameHovered) {
                if (this.addButtonHovered) {
                    this.$("add-button").classList.add("highlight-bottom");
                } else {
                    lastElement.classList.add("highlight-bottom");
                }
            }
        });

        // If cursor hovers over notes-frame while dragging, highlight last note
        this.$("notes-frame").addEventListener("mouseenter", () => {
            if (!this.draggingNote) return;
            if (this.currentNotesContainer===this.searchResultsContainer)return;
            this.notesFrameHovered = true;
        });
        this.$("notes-frame").addEventListener("mouseleave", () => {
            if (!this.draggingNote) return;
            if (this.currentNotesContainer===this.searchResultsContainer)return;
            this.notesFrameHovered = false;
        });

        // ====================================================================
        //   Releasing dragged notes
        // ====================================================================

        // Function which terminates dragging of a note
        const dropNote = () => {
            this.modified = true;
            this.draggingNote = false;
            this.draggedNote.classList.remove("dragged-note");
            this.draggedNote.style.left = "0px";
            this.draggedNote.style.top = "0px";
            this.draggedNote.style.width = "auto";
            this.draggedNote.style.height = "auto";
            Component.setStyleClass("cursor", "default");
        };

        // Move note to the new position upon releasing the mouse button
        window.addEventListener("mouseup", (event) => {
            if (!this.draggingNote) return;
            dropNote();

            // If dragged note is dropped in search results, just put it back
            if (this.currentNotesContainer === this.searchResultsContainer) {
                this.previousContainer.insertBefore(
                    this.draggedNote, this.previousNeighbor);
                return;
            }

            // First handle case that no other node has been hovered during drop
            const lastElement = this.currentNotesContainer.children.length > 0 ?
                this.currentNotesContainer.lastElementChild:this.$("add-button")
            if (this.currentlyHoveredNote === null) {

                // If the add-button is hovered, put note below the add-button
                if (this.addButtonHovered) {
                    this.$("add-button").classList.remove("highlight-bottom");
                    this.currentNotesContainer.prepend(this.draggedNote);
                    this.addButtonHovered = false;

                // If an empty part of the note frame is hovered, drop at end
                } else if (this.notesFrameHovered) {
                    lastElement.classList.remove("highlight-bottom");
                    this.currentNotesContainer.append(this.draggedNote);

                // If neither another note nor the add-button are hovered,
                // put the note back where it was before dragging started
                } else {
                    this.previousContainer.insertBefore(
                        this.draggedNote, this.previousNeighbor);
                }

            // If the bottom of a node is hovered, place it below the other note
            } else if (this.bottomHovered) {
                const nextSibling = this.currentlyHoveredNote.nextSibling;
                this.currentNotesContainer.insertBefore(
                    this.draggedNote, nextSibling);
                if (nextSibling !== null) {
                    nextSibling.classList.remove("highlight-top");
                } else {
                    this.currentlyHoveredNote.classList.remove(
                        "highlight-bottom");
                }

            // If the top of a node is hovered, place it above the other note
            } else {
                if (this.currentlyHoveredNote ===
                        this.currentNotesContainer.firstElementChild) {
                    this.$("add-button").classList.remove("highlight-bottom");
                }
                this.currentlyHoveredNote.classList.remove("highlight-top");
                this.currentNotesContainer.insertBefore(
                    this.draggedNote, this.currentlyHoveredNote);
            }
        });

        // ====================================================================
        //   Structure tree selection callbacks
        // ====================================================================

        // Register modifications in the structure tree (so changes get saved)
        this.$("structure-tree").setOnModify(() => {
            this.modified = true;
        });

        // When selecting a group, display all notes contained in there
        this.$("structure-tree").setOnSelect((node) => {
            if (!this.initializedGroups.has(node)) this.initializeGroup(node);
            this.selectedGroupNode = node;
            this.currentNotesContainer = node.data.container;
            this.$("notes").appendChild(this.currentNotesContainer);
            this.$("add-button").show();
            this.$("info-panel").hide();
            this.$("search-results").hide();
            this.$("no-search-results-info").hide();
            this.$("notes-frame").scrollTop = node.data.scrollOffset;
            // Fill up in case window resized or notes deleted in search results
            this.selectedGroupNode.data.view.fillSufficiently();
        });

        // When deselecting a group, hide all notes and the add-button
        this.$("structure-tree").setOnDeselect((node) => {
            if (this.noteBeingEdited !== null) {
                this.saveNoteBeingEdited();
            }
            node.data.scrollOffset = this.$("notes-frame").scrollTop;
            this.currentNotesContainer.remove();
            this.currentNotesContainer = null;
            this.selectedGroupNode = null;
            this.$("add-button").hide();
            this.$("info-panel").show();
        });

        // ====================================================================
        //   Dragging notes to other groups
        // ====================================================================

        let switchDelay = 1000;  // 1 second
        let switchCallbackId;
        this.$("structure-tree").addListener("mouseover", (event, node) => {
            if (!this.draggingNote || node === this.selectedGroupNode) return;
            // When hovering over a group for a while, select that group
            const switchCallback = () => this.$("structure-tree").select(node); 
            switchCallbackId = window.setTimeout(switchCallback, switchDelay);
            node.labelNode.classList.add("dragover");
            node.canDrop = true;
        });
        this.$("structure-tree").addListener("mouseout", (event, node) => {
            if (!node.canDrop) return;
            window.clearTimeout(switchCallbackId);
            node.labelNode.classList.remove("dragover");
            node.canDrop = false;
        });
        this.$("structure-tree").addListener("mouseup", async (event, node) => {
            if (!node.canDrop) return;
            window.clearTimeout(switchCallbackId);
            dropNote();
            node.labelNode.classList.remove("dragover");
            node.canDrop = false;
            event.stopPropagation();
            if (!this.initializedGroups.has(node))
                await this.initializeGroup(node);
            node.data.container.prepend(this.draggedNote);

            // If note was dragged from search results, also delete original one
            if (this.previousContainer === this.searchResultsContainer) {
                if (this.noteToReference.has(this.draggedNote)) {
                    this.noteToReference.get(this.draggedNote).remove();
                } else {
                    const groupNode = this.noteToGroupNode.get(this.draggedNote)
                    const noteContent =this.noteToMarkdown.get(this.draggedNote)
                    const notes = this.initializedGroups.has(groupNode) ?
                        groupNode.data.notes : groupNode.data;
                    notes.splice(notes.indexOf(noteContent), 1);
                }
            }
        });
    }

    adjustToLanguage(language, secondary) {
        // Build tree of groups for current language, don't load any notes yet
        const dataTree = dataManager.notes.get();
        this.$("structure-tree").deselect();
        this.$("structure-tree").build(dataTree,
            (notes) => notes === undefined ? [] : notes);
    }

    open() {
        this.isOpen = true;
        // Fill up view in case window was resized while section was not open
        if (this.currentNotesContainer === this.searchResultsContainer) {
            this.searchResultsView.fillSufficiently();
        } else if (this.selectedGroupNode !== null) {
            this.selectedGroupNode.data.view.fillSufficiently();
        }
    }

    close() {
        this.isOpen = false;
        if (this.noteBeingEdited !== null) {
            this.saveNoteBeingEdited();
        }
    }

    /**
     * Writes the current state of the notes to the data manager.
     */
    saveData() {
        if (this.noteBeingEdited !== null)
            this.saveNoteBeingEdited();
        if (!this.modified)
            return;
        this.modified = false;
        const data = this.$("structure-tree").toJsonObject((data) => {
            if (Array.isArray(data)) return data;  // Group not initialized
            const unviewedNotes = data.notes.slice(data.view.nextDataIndex);
            const viewedNotes = [];
            for (const note of data.container.children) {
                viewedNotes.push(this.noteToMarkdown.get(note));
            }
            return viewedNotes.concat(unviewedNotes);
        });
        dataManager.notes.set(data);
    }

    /**
     * Creates view for group defined by given tree node and loads first notes
     */
    async initializeGroup(node) {
        const notes = node.data;
        const container = document.createElement("div");
        container.classList.add("notes-container");
        const view = new View({
            viewElement: container,
            scrollElement: this.$("notes-frame"),
            getData: notes,
            createViewItem: (noteContent) => this.createNote(noteContent),
            initialDisplayAmount: 15,
            displayAmount: 10,
            loadOnScroll: false
        });
        node.data = { notes, view, container, scrollOffset: 0 };
        this.initializedGroups.add(node);
        await view.load();
    }

    /**
     * Creates view item for a note with the given markdown content.
     */
    createNote(markdownText) {
        const note = document.createElement("div");
        note.classList.add("note-content");
        note.setAttribute("spellcheck", "false");
        note.innerHTML = marked(markdownText);
        note.onlyAllowPastingRawText(this.root);
        this.noteToMarkdown.set(note, markdownText);
        note.addEventListener("mouseenter", () => {
            this.currentlyHoveredNote = note;
        });
        note.addEventListener("mouseleave", () => {
            if (this.currentNotesContainer===this.searchResultsContainer)return;
            this.currentlyHoveredNote = null;
            if (this.draggingNote) {
                if (this.bottomHovered) {
                    if (note.nextSibling !== null) {
                        note.nextSibling.classList.remove(
                            "highlight-top");
                    }
                } else {
                    if (note===this.currentNotesContainer.firstElementChild)
                        this.$("add-button").classList.remove(
                            "highlight-bottom");
                    else note.classList.remove("highlight-top");
                }
            }
        });
        note.contextMenu(menuItems, () => this.noteBeingEdited !== note ?
            ["edit-note", "delete-note", this.currentNotesContainer ===
             this.searchResultsContainer ? "view-in-group":"insert-note-below"]
            : ["save-note"], { section: this });
        return note;
    }

    deleteNote(note) {
        if (this.currentNotesContainer !== this.searchResultsContainer) {
            this.currentNotesContainer.removeChild(note);
            this.selectedGroupNode.data.view.fillSufficiently();
        } else {
            // If reference is given, remove note from data, else from the view
            if (this.noteToReference.has(note)) {
                this.noteToReference.get(note).remove();
            } else {
                const groupNode = this.noteToGroupNode.get(note);
                const notes = this.initializedGroups.has(groupNode) ?
                    groupNode.data.notes : groupNode.data;
                const noteContent = this.noteToMarkdown.get(note);
                notes.splice(notes.indexOf(noteContent), 1);
            }
            // Also remove it from the search results
            note.remove();
            this.searchResultsView.fillSufficiently();
        }
        this.modified = true;
    }

    editNote(note) {
        if (this.noteBeingEdited !== null) {
            this.saveNoteBeingEdited();
        }
        this.noteBeingEdited = note;
        note.innerHTML = "";
        note.innerText = this.noteToMarkdown.get(note);
        note.setAttribute("contenteditable", "true");
        note.focus();
        note.classList.add("editing");
    }

    saveNoteBeingEdited() {
        const note = this.noteBeingEdited;
        this.noteBeingEdited = null;
        const newMarkdown = note.innerText.trim();
        if (newMarkdown.length === 0) {
            this.deleteNote(note);
            return;
        }
        const newHtml = marked(newMarkdown);
        note.innerHTML = newHtml;
        note.setAttribute("contenteditable", "false");
        note.classList.remove("editing");
        const oldMarkdown = this.noteToMarkdown.get(note);
        this.noteToMarkdown.set(note, newMarkdown);

        // If note is edited in search result, also modifiy the original note
        if (this.currentNotesContainer === this.searchResultsContainer) {
            if (this.noteToReference.has(note)) {
                const reference = this.noteToReference.get(note);
                reference.innerHTML = newHtml;
                this.noteToMarkdown.set(reference, newMarkdown);
            } else {
                const groupNode = this.noteToGroupNode.get(note);
                const notes = this.initializedGroups.has(groupNode) ?
                    groupNode.data.notes : groupNode.data;
                notes[notes.indexOf(oldMarkdown)] = newMarkdown;
            }
        }
        this.modified = true;
    }

    async viewInGroup(note) {
        const groupNode = this.noteToGroupNode.get(note);
        if (!this.initializedGroups.has(groupNode))
            await this.initializeGroup(groupNode);
        this.$("structure-tree").select(groupNode);

        // If referenced note is not displayed yet, load notes until it is
        let noteInGroup;
        if (this.noteToReference.has(note)) {
            noteInGroup = this.noteToReference.get(note);
        } else {
            const noteContent = this.noteToMarkdown.get(note);
            const dataIndex = groupNode.data.notes.indexOf(noteContent);
            const currentSize = this.currentNotesContainer.children.length;
            const view = groupNode.data.view;
            const idxInView = currentSize + dataIndex - view.nextDataIndex;
            // TODO: use single call?
            while (view.nextDataIndex <= dataIndex) {
                await view.displayBatch();
            }
            noteInGroup = this.currentNotesContainer.children[idxInView];
        }
        noteInGroup.scrollIntoViewIfNeeded();
    }

    search(query) {
        // const boundary = "\(\\b|\\*\)";  // Allow asterisk in word boundaries
        const boundary = "\\b";

        // Construct two queries with no wildcards at the end or beginning
        const withoutWildcards = query.replace(/^\\*/,"").replace(/\\*$/,"");
        // Add one version with word boundaries and one with asterisk boundaries
        let exactQuery = boundary + withoutWildcards + boundary;
        let markedExactQuery = "\\*" + withoutWildcards + "\\*";

        // Add wildcard to end if query does not contain any wildcards at all
        if (!query.includes("*")) query += "*"; 
        let markedQuery = query;
        // Search at word boundaries if no wildcard at start/end of word
        //// if (!query.startsWith("*")) query = boundary + query;
        //// if (!query.endsWith("*")) query = query + boundary;
        // Create version with asterisks instead of word boundaries
        if (!query.startsWith("*")) markedQuery = "\\*" + markedQuery;
        if (!query.endsWith("*")) markedQuery = markedQuery + "\\*";

        // Convert ? to . (any char) and * (not \*) to .*? (non-greedy sequence)
        const convertWildcards =
            (query) => query.replace(/[?]/g, ".").replace(/(?<!\\)[*]/g, ".*?");
        query = convertWildcards(query);
        exactQuery = convertWildcards(exactQuery);
        markedQuery = convertWildcards(markedQuery);
        markedExactQuery = convertWildcards(markedExactQuery);

        // Turn strings into RegExp objects
        const generalRegex = new RegExp(query, 'ig');
        const exactRegex = new RegExp(exactQuery, 'ig');
        const markedRegex = new RegExp(markedQuery, 'ig');
        const markedExactRegex = new RegExp(markedExactQuery, 'ig');

        // Traverse tree of groups and find matches in markdown source of notes
        const matches = [];
        const exactMatches = [];
        const markedMatches = [];
        const markedExactMatches = [];
        this.$("structure-tree").traverse((node) => {
            const getMatches = (noteContent, reference) => {
                // First use the most general regex corresponding to query
                if (generalRegex.test(noteContent)) {
                    const matchInfo = [noteContent, node, reference];
                    // If there's a match, check if there's also a marked one
                    if (markedRegex.test(noteContent)) {
                        // If there's a marked match, check if also exact one
                        if (markedExactRegex.test(noteContent)) {
                            markedExactMatches.push(matchInfo);
                        } else {
                            markedMatches.push(matchInfo);
                        }
                    }
                    // If there's no marked match, check for exact one instead
                    else if (exactRegex.test(noteContent)) {
                        exactMatches.push(matchInfo);
                    } else {
                        matches.push(matchInfo);
                    }
                }
            };
            // First find matches among notes displayed in view (if initialized)
            if (this.initializedGroups.has(node)) {
                for (const noteElement of node.data.container.children) {
                    getMatches(this.noteToMarkdown.get(noteElement),noteElement)
                }
            }
            // Find matches among undisplayed notes
            const startIndex = this.initializedGroups.has(node) ?
                node.data.view.nextDataIndex : 0;
            const notes = this.initializedGroups.has(node) ?
                node.data.notes : node.data;
            for (let i = startIndex; i < notes.length; ++i) {
                getMatches(notes[i], undefined);
            }
        });

        // Show search results
        this.$("structure-tree").deselect();
        this.$("add-button").hide();
        this.$("info-panel").hide();
        this.$("search-results").show();
        this.searchResultsView.load(
            [...markedExactMatches,...markedMatches,...exactMatches,...matches])
        this.lastGroupNode = null;
        this.currentNotesContainer = this.searchResultsContainer;
    }
}

customElements.define("notes-section", NotesSection);
module.exports = NotesSection;
