"use strict";

class InitPathWindow extends Window {
    constructor() {
        super("init-path");
        this.$("choose-path-button").addEventListener("click", () => {
            this.$("data-path").value = dialogWindow.chooseDataPath(
                    this.$("data-path").value);
        });
    }

    getNewDataPath() {
        this.$("data-path").value = paths.standardDataPathPrefix;
        return new Promise((resolve, reject) => {
            this.$("continue-button").addEventListener("click", () => {
                const path = this.$("data-path").value.trim();
                if (!utility.existsDirectory(path)) {
                    dialogWindow.info("Given path is not a directory.");
                    return;
                }
                resolve(path);
            });
        });
    }
}

customElements.define("init-path-window", InitPathWindow);
module.exports = InitPathWindow;
