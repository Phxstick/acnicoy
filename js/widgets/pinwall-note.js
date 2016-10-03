"use strict";

class PinwallNote extends PinwallWidget {
    constructor() {
        super("pinwall-note", "Note");
        this.windowFrame = this.root.getElementById("window");
        this.textDiv = this.root.getElementById("text-div");
        this.textEntry = this.root.getElementById("text-entry");
        this.editModeDiv = this.root.getElementById("edit-mode");
        this.saveButton = this.root.getElementById("save-button");
        this.saveButton.addEventListener("click", () => {
            this.textDiv.textContent = this.textEntry.value;
            this.editModeDiv.style.display = "none";
            this.textDiv.style.display = "block";
        });
        this.textDiv.addEventListener("click", () => {
            this.windowFrame.style.height = `${this.textDiv.offsetHeight}px`;
            this.windowFrame.style.width = `${this.textDiv.offsetWidth}px`;
            this.textEntry.value = this.textDiv.textContent;
            this.editModeDiv.style.display = "flex";
            this.textDiv.style.display = "none";
            this.textEntry.focus();
        });
        this.textEntry.focus();
    }
    setText(text) {
        this.textDiv.textContent = text;
    }
    getText() {
        return this.textDiv.textContent;
    }
    setSize(width, height) {
        this.windowFrame.style.width = width;
        this.windowFrame.style.height = height;
    }
    getWidth() {
        return this.windowFrame.style.width;
    }
    getHeight() {
        return this.windowFrame.style.height;
    }
    open() {
    }
    adjustToLanguage(language, secondary) {
    }
}

customElements.define("pinwall-note", PinwallNote);
module.exports = PinwallNote;
