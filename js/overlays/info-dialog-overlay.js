"use strict";

class InfoDialogOverlay extends Overlay {
    constructor() {
        super("info-dialog", { mode: "slide-down", speed: 200, distance: 30 });
        this.elementFocussedByDefault = this.$("ok-button");
        this.$("ok-button").addEventListener("click", () => {
            this.resolve();
        });
    }

    open(message) {
        this.$("message").innerHTML = message;
    }
}

customElements.define("info-dialog-overlay", InfoDialogOverlay);
module.exports = InfoDialogOverlay;
