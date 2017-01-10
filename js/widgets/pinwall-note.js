"use strict";

class PinwallNote extends Widget {
    constructor() {
        super("pinwall-note");
        // Edit note on double click, stop editing when focus is lost
        this.$("text").addEventListener("dblclick", () => {
            this.$("text").setAttribute("contenteditable", "true");
            this.$("text").focus();
        });
        this.$("text").addEventListener("focusout", () => {
            this.$("text").setAttribute("contenteditable", "false");
        });
    }

    setText(text) {
        this.$("text").textContent = text;
    }

    getText() {
        return this.$("text").textContent;
    }

    open() {
    }

    adjustToLanguage() {
    }
}

customElements.define("pinwall-note", PinwallNote);
module.exports = PinwallNote;
