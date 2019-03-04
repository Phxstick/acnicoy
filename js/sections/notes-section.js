"use strict";

const markdown = require("markdown").markdown;

const menuItems = contextMenu.registerItems({
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
    }
});

class NotesSection extends Section {
    constructor() {
        super("notes");
        this.$("add-button").hide();
        this.noteToMarkdown = new WeakMap();
        this.noteToContentNode = new WeakMap();

        // State variables
        this.noteBeingEdited = null;
        this.selectedGroupNode = null;
        this.currentNotesContainer = null;

        // State variables for drag & drop
        this.draggingNote = false;
        this.draggedNote = null;
        this.dragAnchorX = 0;
        this.dragAnchorY = 0;
        // Remeber the neighbor/container of the node before dragging started
        this.previousNeighbor = null;
        this.previousContainer = null;

        // Remember what the cursor is hovering over while dragging a note
        this.currentlyHoveredNote = null;
        this.bottomHovered = false;
        this.addButtonHovered = false;

        // Add an empty note in edit-mode when clicking the add-button
        this.$("add-button").addEventListener("click", () => {
            const note = this.addNote("", this.currentNotesContainer);
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
        // If cursor hovers over notes-frame while dragging, highlight last note
        this.$("notes-frame").addEventListener("mouseenter", () => {
            if (!this.draggingNote) return;
            this.notesFrameHovered = true;
        });
        this.$("notes-frame").addEventListener("mouseleave", () => {
            if (!this.draggingNote) return;
            this.notesFrameHovered = false;
        });

        // Leave edit mode when pressing escape or using shortcut for saving
        window.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            if (this.noteBeingEdited === null) return;
            const contentNode = this.noteToContentNode.get(this.noteBeingEdited)
            this.saveNote(this.noteBeingEdited);
        });
        shortcuts.bindCallback("save-input", () => {
            if (this.noteBeingEdited === null) return;
            const contentNode = this.noteToContentNode.get(this.noteBeingEdited)
            this.saveNote(this.noteBeingEdited);
        });

        // Enter edit mode when double clicking a note
        this.$("notes").addEventListener("dblclick", (event) => {
            if (this.noteBeingEdited !== null) return;
            if (this.controlButtons.contains(event.target)) return;
            let node = event.target;
            while (node.parentNode !== this.currentNotesContainer) {
                node = node.parentNode;
            }
            this.editNote(node);
        });

        // Edit/delete a note when clicking the corresponding control button
        this.controlButtons = this.$("control-buttons");
        this.controlButtons.hide();
        this.$("edit-button").addEventListener("click", () => {
            this.editNote(this.currentlyHoveredNote);
        });
        this.$("delete-button").addEventListener("click", () => {
            this.deleteNote(this.currentlyHoveredNote);
        });

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
        };

        // Start dragging a note when pressing mouse button while pressing CTRL
        this.$("notes").addEventListener("mousedown", (event) => {
            if (this.currentlyHoveredNote === null) return;
            if (this.controlButtons.contains(event.target)) return;
            if (!event.ctrlKey) return;
            startDraggingNote(event);
            event.preventDefault();
        });
        // Start dragging a note when pressing the move button
        this.$("move-button").addEventListener("mousedown", startDraggingNote);
        
        // Highlight new position for the dragged note
        window.addEventListener("mousemove", (event) => {
            if (!this.draggingNote) return;
            this.draggedNote.style.left = `${event.pageX - this.dragAnchorX}px`;
            this.draggedNote.style.top = `${event.pageY - this.dragAnchorY}px`;
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

        // Function which terminates dragging of a note
        const dropNote = () => {
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
                // If neither another note nor the add-button is hovered,
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
        //   Set callbacks for the structure tree
        // ====================================================================

        // When selecting a group, display all notes contained in there
        this.$("structure-tree").setOnSelect((node) => {
            this.selectedGroupNode = node;
            this.currentNotesContainer = node.data;
            this.$("notes").appendChild(this.currentNotesContainer);
            this.$("add-button").show();
            this.$("info-panel").hide();
        });
        // When deselecting a group, hide all notes and the add-button
        this.$("structure-tree").setOnDeselect((node) => {
            this.currentNotesContainer.remove();
            this.currentNotesContainer = null;
            this.selectedGroupNode = null;
            this.$("add-button").hide();
            this.$("info-panel").show();
        });

        // Enable moving notes to other groups via drag & drop
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
        this.$("structure-tree").addListener("mouseup", (event, node) => {
            if (!node.canDrop) return;
            window.clearTimeout(switchCallbackId);
            node.data.prepend(this.draggedNote);
            dropNote();
            node.labelNode.classList.remove("dragover");
            node.canDrop = false;
            event.stopPropagation();
        });
    }

    adjustToLanguage(language, secondary) {
        const dataTree = dataManager.notes.get();
        this.$("structure-tree").deselect();
        this.$("structure-tree").build(dataTree, (notes) => {
            const notesContainer = document.createElement("div");
            notesContainer.classList.add("notes-container");
            if (notes !== undefined) {
                for (const note of notes) {
                    this.addNote(note, notesContainer, true);
                }
            }
            return notesContainer;
        });
    }

    /**
     * Write the current state of the notes to the data manager.
     */
    saveData() {
        if (this.noteBeingEdited !== null) {
            this.saveNote(this.noteBeingEdited);
        }
        const data = this.$("structure-tree").toJsonObject((notesContainer) => {
            const markdownArray = []
            for (const note of notesContainer.children) {
                markdownArray.push(this.noteToMarkdown.get(note));
            }
            return markdownArray;
        });
        dataManager.notes.set(data);
    }

    addNote(markdownText, notesContainer, appendAtEnd=false) {
        const note = document.createElement("div");
        const contentNode = document.createElement("div");
        contentNode.classList.add("note-content");
        contentNode.innerHTML = markdown.toHTML(markdownText);
        contentNode.onlyAllowPastingRawText(this.root);
        note.appendChild(contentNode);
        if (appendAtEnd) {
            notesContainer.appendChild(note);
        } else {
            notesContainer.prepend(note);
        }
        this.noteToContentNode.set(note, contentNode);
        this.noteToMarkdown.set(note, markdownText);
        // Display control buttons when hovering over an (unfocused) note
        note.addEventListener("mouseenter", () => {
            this.currentlyHoveredNote = note;
            // if (!this.draggingNote) {
            //     note.appendChild(this.controlButtons);
            //     this.controlButtons.show();
            // }
        });
        note.addEventListener("mouseleave", () => {
            this.currentlyHoveredNote = null;
            if (this.draggingNote) {
                if (this.bottomHovered) {
                    if (note.nextSibling !== null) {
                        note.nextSibling.classList.remove(
                            "highlight-top");
                    }
                } else {
                    if (note === this.currentNotesContainer.firstElementChild) {
                        this.$("add-button").classList.remove(
                            "highlight-bottom");
                    } else {
                        note.classList.remove("highlight-top");
                    }
                }
            }
            // if (!this.draggingNote && this.controlButtons.parentNode === note) {
            //     note.removeChild(this.controlButtons);
            //     this.controlButtons.hide();
            // }
        });
        note.contextMenu(menuItems, ["edit-note", "delete-note"],
                         { section: this });
        return note;
    }

    deleteNote(note) {
        this.currentNotesContainer.removeChild(note);
    }

    editNote(note) {
        this.noteBeingEdited = note;
        const contentNode = this.noteToContentNode.get(note);
        contentNode.innerHTML = "";
        contentNode.innerText = this.noteToMarkdown.get(note);
        contentNode.setAttribute("contenteditable", "true");
        contentNode.focus();
        note.classList.add("editing");
    }

    saveNote(note) {
        this.noteBeingEdited = null;
        const contentNode = this.noteToContentNode.get(note);
        const trimmedContent = contentNode.innerText.trim();
        if (trimmedContent.length === 0) {
            this.deleteNote(note);
            return;
        }
        contentNode.innerHTML = markdown.toHTML(trimmedContent);
        contentNode.setAttribute("contenteditable", "false");
        note.classList.remove("editing");
        this.noteToMarkdown.set(note, trimmedContent);
    }
}

customElements.define("notes-section", NotesSection);
module.exports = NotesSection;
