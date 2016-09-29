"use strict";

utility.getContentNode(document.currentScript.ownerDocument, (content) => {
class PinwallNote extends PinwallWidget {
    constructor() {
        super();
        this.widgetName = "Note";
        this.root = this.contentFrame.createShadowRoot();
        this.root.appendChild(content.cloneNode(true));
        this.windowFrame = this.root.getElementById("window");
        this.textDiv = this.root.getElementById("text-div");
        this.textEntry = this.root.getElementById("text-entry");
        this.editModeDiv = this.root.getElementById("edit-mode");
        this.saveButton = this.root.getElementById("save-button");
        this.saveButton.addEventListener("click", () => {
            // TODO: Rework this into a better working non-jquery solution?
            $(this.windowFrame).css("height", "");
            $(this.windowFrame).css("width", "");
            this.textDiv.textContent = this.textEntry.value;
            this.editModeDiv.style.display = "none";
            this.textDiv.style.display = "block";
        });
        this.textDiv.addEventListener("click", () => {
            $(this.windowFrame).height($(this.textDiv).height());
            $(this.windowFrame).width($(this.textDiv).width());
            // console.log($(this.textDiv).height());
            // console.log($(this.textDiv).width());
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
window.PinwallNote = PinwallNote;
});
