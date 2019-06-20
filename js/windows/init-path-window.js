"use strict";

const isValidPath = require("is-valid-path");

class InitPathWindow extends Window {
    constructor() {
        super("init-path");
        this.$("choose-path-button").addEventListener("click", () => {
            this.$("data-path").value = dialogWindow.chooseDataPath(
                    this.$("data-path").value);
        });
        this.$("continue-button").addEventListener("click", () => {
            const path = this.$("data-path").value.trim();
            if (!isValidPath(path)) {
                dialogWindow.info("The entered path is not valid.");
                return;
            }
            this.resolve(path);
        });
    }

    open() {
        this.$("data-path").value = paths.getDefaultDataPath();
    }
}

customElements.define("init-path-window", InitPathWindow);
module.exports = InitPathWindow;
