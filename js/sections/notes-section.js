"use strict";

const markdown = require("markdown").markdown;

const menuItems = contextMenu.registerItems({
    "edit-note": {
        label: "Edit note",
        click: ({ currentNode, data: {widget} }) => {
            widget.editNote(currentNode);
        }
    },
    "delete-note": {
        label: "Delete note",
        click: ({ currentNode, data: {widget} }) => {
            widget.deleteNote(currentNode);
        }
    }
});

class NotesSection extends Section {
    constructor() {
        super("notes");
        this.noteToMarkdown = new WeakMap();
        this.noteToContentNode = new WeakMap();
        this.noteBeingEdited = null;
        this.currentlyHoveredNote = null;
        this.bottomHovered = false;
        this.addButtonHovered = false;
        this.draggingNote = false;
        this.draggedNote = null;
        this.previousNextSibling = null;
        this.dragAnchorX = 0;
        this.dragAnchorY = 0;
        this.$("add-button").addEventListener("click", () => {
            const note = this.addNote("");
            this.editNote(note);
        });
        this.$("add-button").addEventListener("mouseenter", () => {
            if (!this.draggingNote) return;
            this.addButtonHovered = true;
            this.$("add-button").classList.add("highlight-top");
        });
        this.$("add-button").addEventListener("mouseleave", () => {
            if (!this.draggingNote) return;
            this.addButtonHovered = false;
            this.$("add-button").classList.remove("highlight-top");
        });

        // Leave edit mode when focussing out of note, pressing escape or
        // save-shortcut
        this.$("notes").addEventListener("focusout", (event) => {
            if (!event.target.classList.contains("note-content")) return;
            this.saveNote(event.target.parentNode);
        });
        window.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            if (this.noteBeingEdited === null) return;
            const contentNode = this.noteToContentNode.get(this.noteBeingEdited)
            contentNode.blur();
        });
        shortcuts.bindCallback("save-input", () => {
            if (this.noteBeingEdited === null) return;
            const contentNode = this.noteToContentNode.get(this.noteBeingEdited)
            contentNode.blur();
        });

        // Enter edit mode when double clicking note
        this.$("notes").addEventListener("dblclick", (event) => {
            if (this.noteBeingEdited !== null) return;
            if (this.controlButtons.contains(event.target)) return;
            let node = event.target;
            while (node.parentNode !== this.$("notes")) {
                node = node.parentNode;
            }
            this.editNote(node);
        });
        this.controlButtons = this.$("control-buttons");
        this.controlButtons.hide();
        this.$("edit-button").addEventListener("click", () => {
            this.editNote(this.currentlyHoveredNote);
        });
        this.$("delete-button").addEventListener("click", () => {
            this.deleteNote(this.currentlyHoveredNote);
        });
        // == Drag an item when pressing the move-button ==
        this.$("move-button").addEventListener("mousedown", (event) => {
            this.draggingNote = true;
            this.draggedNote = this.currentlyHoveredNote;
            this.previousNextSibling = this.draggedNote.nextSibling;
            const boundingRect = this.draggedNote.getBoundingClientRect();
            this.dragAnchorX = event.pageX - boundingRect.left;
            this.dragAnchorY = event.pageY - boundingRect.top;
            this.draggedNote.style.left = `${event.pageX - this.dragAnchorX}px`;
            this.draggedNote.style.top = `${event.pageY - this.dragAnchorY}px`;
            this.draggedNote.style.width = `${this.draggedNote.offsetWidth}px`;
            this.draggedNote.style.height =`${this.draggedNote.offsetHeight}px`;
            this.draggedNote.classList.add("dragged-note");
            document.body.appendChild(this.draggedNote);
        });
        window.addEventListener("mousemove", (event) => {
            if (!this.draggingNote) return;
            this.draggedNote.style.left = `${event.pageX - this.dragAnchorX}px`;
            this.draggedNote.style.top = `${event.pageY - this.dragAnchorY}px`;
            // Display new position for dragged item when dragging over notes
            if (this.currentlyHoveredNote === null) return;
            const rect = this.currentlyHoveredNote.getBoundingClientRect();
            const localY = event.pageY - rect.top;
            this.bottomHovered = localY > rect.height / 2;
            this.currentlyHoveredNote.classList.toggle(
                "highlight-top", !this.bottomHovered);
            if (this.currentlyHoveredNote.nextSibling !== null) {
                this.currentlyHoveredNote.nextSibling.classList.toggle(
                    "highlight-top", this.bottomHovered);
            } else {
                this.$("add-button").classList.toggle(
                    "highlight-top", this.bottomHovered);
            }
        });
        window.addEventListener("mouseup", (event) => {
            if (!this.draggingNote) return;
            this.draggingNote = false;
            this.draggedNote.classList.remove("dragged-note");
            this.draggedNote.style.left = "0px";
            this.draggedNote.style.top = "0px";
            this.draggedNote.style.width = "auto";
            this.draggedNote.style.height = "auto";
            // Drop note at new position
            if (this.currentlyHoveredNote === null) {
                if (this.addButtonHovered) {
                    this.$("add-button").classList.remove("highlight-top");
                    this.$("notes").appendChild(this.draggedNote);
                    this.addButtonHovered = false;
                } else {
                    this.$("notes").insertBefore(
                        this.draggedNote, this.previousNextSibling);
                }
            } else if (this.bottomHovered) {
                const nextSibling = this.currentlyHoveredNote.nextSibling;
                this.$("notes").insertBefore(this.draggedNote, nextSibling);
                if (nextSibling !== null) {
                    nextSibling.classList.remove("highlight-top");
                } else {
                    this.$("add-button").classList.remove("highlight-top");
                }
            } else {
                this.$("notes").insertBefore(
                    this.draggedNote, this.currentlyHoveredNote);
                this.currentlyHoveredNote.classList.remove("highlight-top");
            }
            this.saveData();
        });
    }

    adjustToLanguage(language, secondary) {
        this.$("notes").empty();
        const notesContent = dataManager.notes.get();
        for (const noteContent of notesContent) {
            this.addNote(noteContent);
        }
    }

    saveData() {
        if (this.noteBeingEdited !== null) {
            this.saveNote(this.noteBeingEdited);
        }
        const notes = this.$("notes").children;
        const notesData = [];
        for (const note of notes) {
            notesData.push(this.noteToMarkdown.get(note));
        }
        dataManager.notes.set(notesData);
    }

    addNote(markdownText) {
        const note = document.createElement("div");
        const contentNode = document.createElement("div");
        contentNode.classList.add("note-content");
        contentNode.innerHTML = markdown.toHTML(markdownText);
        note.appendChild(contentNode);
        this.$("notes").appendChild(note);
        this.noteToContentNode.set(note, contentNode);
        this.noteToMarkdown.set(note, markdownText);
        // Display control buttons when hovering over an (unfocused) note
        note.addEventListener("mouseenter", () => {
            this.currentlyHoveredNote = note;
            if (!this.draggingNote) {
                note.appendChild(this.controlButtons);
                this.controlButtons.show();
            }
        });
        note.addEventListener("mouseleave", () => {
            this.currentlyHoveredNote = null;
            if (this.draggingNote) {
                if (this.bottomHovered) {
                    if (note.nextSibling !== null) {
                        note.nextSibling.classList.remove("highlight-top");
                    } else {
                        this.$("add-button").classList.remove("highlight-top");
                    }
                } else {
                    note.classList.remove("highlight-top");
                }
            }
            if (!this.draggingNote && this.controlButtons.parentNode === note) {
                note.removeChild(this.controlButtons);
                this.controlButtons.hide();
            }
        });
        note.contextMenu(menuItems, ["edit-note", "delete-note"],
                         { widget: this });
        return note;
    }

    deleteNote(note) {
        this.$("notes").removeChild(note);
        this.saveData();
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
        this.saveData();
    }
}

customElements.define("notes-section", NotesSection);
module.exports = NotesSection;
