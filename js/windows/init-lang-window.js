"use strict";

class InitLangWindow extends Window {
    constructor() {
        super("init-lang");
    }

    getLanguageConfigs() {
        return new Promise((resolve, reject) => {
            this.$("continue-button").addEventListener("click", () => {
                const configs = this.$("language-table").getLanguageConfigs();
                if (configs.length === 0) {
                    dialogWindow.info("You need to add at least one language.");
                    return;
                }
                console.log(configs);
                // TODO
                // resolve(configs);
            });
        });
    }
}

customElements.define("init-lang-window", InitLangWindow);
module.exports = InitLangWindow;
