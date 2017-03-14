"use strict";

class InitDefaultLangWindow extends Window {
    constructor() {
        super("init-default-lang");
        this.$("continue-button").addEventListener("click", () => {
            const language = this.$("default-language").value;
            if (!language) {
                dialogWindow.info("You need to choose a default language.");
                return;
            }
            this.resolve(language);
        });
    }

    open(languages) {
        this.$("default-language").empty();
        this.$("default-language").appendChild(
                utility.createDefaultOption("Choose default language"));
        for (const language of languages) {
            const option = document.createElement("option");
            option.textContent = language;
            option.value = language;
            this.$("default-language").appendChild(option);
        }
    }
}

customElements.define("init-default-lang-window", InitDefaultLangWindow);
module.exports = InitDefaultLangWindow;
