"use strict";

class InitLangWindow extends Window {
    constructor() {
        super("init-lang");
        this.$("help-link").addEventListener("click", () => {
            overlays.open("help", ["Components", "SRS"]);
        });
        this.$("continue-button").addEventListener("click", () => {
            const configs = this.$("language-table").getLanguageConfigs();
            if (configs.length === 0) {
                dialogWindow.info("You need to add at least one language.");
                return;
            }
            this.$("language-table").clear();
            this.resolve(configs);
        });
    }
}

customElements.define("init-lang-window", InitLangWindow);
module.exports = InitLangWindow;
