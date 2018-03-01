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
        this.$("program-name").textContent = app.name;
        this.$("data-folder-name").textContent = `${app.name}Data`;
    }

    open() {
        this.$("data-path").value = paths.standardDataPathPrefix;
    }
}

customElements.define("init-path-window", InitPathWindow);
module.exports = InitPathWindow;
