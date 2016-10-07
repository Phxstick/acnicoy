"use strict";

class LoadingWindow extends Window {
    constructor() {
        super("loading");
        this.statusMessage = this.root.getElementById("status-message");
    }
    
    setStatus(text) {
        this.statusMessage.textContent = text;
    }
}

customElements.define("loading-window", LoadingWindow);
module.exports = LoadingWindow;
