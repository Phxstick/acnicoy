"use strict";

class LoadingWindow extends Window {
    constructor() {
        super("loading", true);
    }

    open(text) {
        this.setStatus(text);
    }
    
    setStatus(text) {
        this.$("status-message").textContent = text;
    }
}

customElements.define("loading-window", LoadingWindow);
module.exports = LoadingWindow;
