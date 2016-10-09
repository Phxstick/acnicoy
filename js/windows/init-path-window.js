"use strict";

class InitPathWindow extends Window {
    constructor() {
        super("init-path");
        this.continueButton = this.root.getElementById("continue-button");
        this.dataPathInput = this.root.getElementById("data-path");
        this.choosePathButton = this.root.getElementById("choose-path-button");
        this.choosePathButton.addEventListener("click", () => {
            this.dataPathInput.value = dialogWindow.chooseDataPath(
                    this.dataPathInput.value);
        });
    }

    getNewDataPath() {
        this.dataPathInput.value = paths.standardDataPathPrefix;
        return new Promise((resolve, reject) => {
            this.continueButton.addEventListener("click", () => {
                const path = this.dataPathInput.value.trim();
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
