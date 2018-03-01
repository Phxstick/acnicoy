"use strict";

class LoadingOverlay extends Overlay {
    constructor() {
        super("loading", { mode: "fade", duration: 100 });
    }
}

customElements.define("loading-overlay", LoadingOverlay);
module.exports = LoadingOverlay;
