"use strict";

class LoadingOverlay extends Overlay {
    constructor() {
        super("loading", { mode: "fade", duration: 100 });
    }

    open(label="Loading") {
        this.$("loading-label").textContent = label;
    }
}

customElements.define("loading-overlay", LoadingOverlay);
module.exports = LoadingOverlay;
