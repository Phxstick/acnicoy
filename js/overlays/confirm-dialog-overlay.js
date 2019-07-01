"use strict";

class ConfirmDialogOverlay extends Overlay {
    constructor() {
        super("confirm-dialog",
                { mode: "slide-down", speed: 200, distance: 30 });
        this.$("close-button").addEventListener("click", () => {
            this.resolve(null);
        });
        this.$("yes-button").addEventListener("click", () => {
            this.resolve(true);
        });
        this.$("no-button").addEventListener("click", () => {
            this.resolve(false);
        });
    }

    open(message, focusYes) {
        this.$("message").innerHTML = message;
        this.elementFocussedByDefault = focusYes ? this.$("yes-button") : null;
    }
}

customElements.define("confirm-dialog-overlay", ConfirmDialogOverlay);
module.exports = ConfirmDialogOverlay;
