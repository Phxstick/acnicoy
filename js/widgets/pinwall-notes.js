"use strict";

const markdown = require("markdown").markdown;

const menuItems = popupMenu.registerItems({
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

class PinwallNotes extends PinwallWidget {
    constructor() {
        super("pinwall-notes");
        this.noteToMarkdown = new WeakMap();
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
        // Leave edit mode when focusing out of note or pressing escape
        this.$("notes").addEventListener("focusout", (event) => {
            if (event.target.parentNode !== this.$("notes")) return;
            this.saveNote(event.target);
        });
        window.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            if (this.noteBeingEdited === null) return;
            this.noteBeingEdited.blur();
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
        });
    }

    getSaveData() {
        if (this.noteBeingEdited !== null) {
            this.saveNote(this.noteBeingEdited);
        }
        const saveData = super.getSaveData();
        saveData.notes = [];
        for (const note of this.$("notes").children) {
            saveData.notes.push(this.noteToMarkdown.get(note));
        }
        return saveData;
    }

    load(data) {
        this.$("notes").empty();
        for (const content of data.notes) {
            this.addNote(content);
        }
    }

    addNote(markdownText) {
        const note = document.createElement("div");
        this.noteToMarkdown.set(note, markdownText);
        note.innerHTML = markdown.toHTML(markdownText);
        this.$("notes").appendChild(note);
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
        note.popupMenu(menuItems, ["edit-note", "delete-note"],
                       { widget: this });
        return note;
    }

    deleteNote(note) {
        this.$("notes").removeChild(note);
    }

    editNote(note) {
        this.noteBeingEdited = note;
        note.innerHTML = "";
        note.innerText = this.noteToMarkdown.get(note);
        note.setAttribute("contenteditable", "true");
        note.focus();
    }

    saveNote(note) {
        this.noteBeingEdited = null;
        const trimmedContent = note.innerText.trim();
        if (trimmedContent.length === 0) {
            this.deleteNote(note);
            return;
        }
        note.innerHTML = markdown.toHTML(trimmedContent);
        this.noteToMarkdown.set(note, trimmedContent);
        note.setAttribute("contenteditable", "false");
        note.blur();
    }
}

customElements.define("pinwall-notes", PinwallNotes);
module.exports = PinwallNotes;
