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
            const keyCombination = shortcuts.extractKeyCombination(event);
            if (keyCombination === null) return;
            if (shortcuts.isKeyCombinationUsed(keyCombination)) {
                const keyCombString =
                    shortcuts.keyCombinationToReadableForm(keyCombination);
                dialogWindow.info(
                    `Key combination '${keyCombString}' is already in use.`);
                return;
            }
            this.resolve(keyCombination);
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
