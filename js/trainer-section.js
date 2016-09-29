"use strict";

class TrainerSection extends HTMLElement {
    constructor(content) {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.appendChild(content);
        this.root.appendChild(this.root.getElementById("styles").content);
    }
    open() {
    }
    confirmClose() {
        return true;
    }
    close() {
    }
    adjustToLanguage(language, secondary) {
    }
}

module.exports = TrainerSection;
