"use strict";

class LoadingWindow extends Window {
    constructor() {
        super("loading", true);
    }

    open(text, details) {
        this.setStatus(text, details);
    }
    
    setStatus(text, details) {
        this.$("status-text").innerHTML = text !== undefined ? text : "";
        this.$("status-details").innerHTML = details !== undefined ? details:"";
    }
}

customElements.define("loading-window", LoadingWindow);
module.exports = LoadingWindow;
