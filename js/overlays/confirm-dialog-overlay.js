"use strict";

class ConfirmDialogOverlay extends Overlay {
    constructor() {
        super("confirm-dialog",
                { mode: "slide-down", speed: 200, distance: 30 });
        this.$("close-button").addEventListener("click", () => {
            this.resolve(false);
        });
        this.$("yes-button").addEventListener("click", () => {
            this.resolve(true);
        });
        this.$("no-button").addEventListener("click", () => {
            this.resolve(false);
        });
    }

    open(message) {
        this.$("message").textContent = message;
    }
}

customElements.define("confirm-dialog-overlay", ConfirmDialogOverlay);
module.exports = ConfirmDialogOverlay;
