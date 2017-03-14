"use strict";

class InitPathWindow extends Window {
    constructor() {
        super("init-path");
        this.$("choose-path-button").addEventListener("click", () => {
            this.$("data-path").value = dialogWindow.chooseDataPath(
                    this.$("data-path").value);
        });
        this.$("continue-button").addEventListener("click", () => {
            const path = this.$("data-path").value.trim();
            if (!utility.existsDirectory(path)) {
                dialogWindow.info("Given path is not a directory.");
                return;
            }
            this.resolve(path);
        });
    }

    open() {
        this.$("data-path").value = paths.standardDataPathPrefix;
    }
}

customElements.define("init-path-window", InitPathWindow);
module.exports = InitPathWindow;
