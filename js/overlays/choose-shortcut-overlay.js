"use strict";

class ChooseShortcutOverlay extends Overlay {
    constructor() {
        super("choose-shortcut",
                { mode: "slide-down", speed: 200, distance: 30 });
        this.callback = null;
        this.$("close-button").addEventListener("click", () => {
            this.resolve(null);
        });
        this.$("cancel-button").addEventListener("click", () => {
            this.resolve(null);
        });
        this.callback = (event) => {
            event.stopPropagation();
            const accelerator = shortcuts.extractBinding(event);
            if (accelerator === null) return;
            if (shortcuts.isBindingUsed(accelerator)) {
                dialogWindow.info(
                    `Key combination '${accelerator}' is already in use.`);
                return;
            }
            this.resolve(accelerator);
        };
    }

    close() {
        window.removeEventListener("keydown", this.callback, true);
        shortcuts.enableAll();
    }

    open() {
        shortcuts.disableAll();
        window.addEventListener("keydown", this.callback, true);
    }
}

customElements.define("choose-shortcut-overlay", ChooseShortcutOverlay);
module.exports = ChooseShortcutOverlay;
