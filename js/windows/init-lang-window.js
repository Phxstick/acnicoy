"use strict";

const languageList = require("languages");

class InitLangWindow extends Window {
    constructor() {
        super("init-lang");
        this.continueButton = this.root.getElementById("continue-button");
        this.addLanguageButton =
            this.root.getElementById("add-language-button");
        this.addLanguageButton.addEventListener("click", () => {
            // TODO: Add new row to languages table
        });
        // TODO: Use this for languages init section and settings
        // for (let langcode of languageList.getAllLanguageCode()) {
        //     console.log(languageList.getLanguageInfo(langcode));
        // }
    }

    getNewLanguages() {
        this.openStep("add-languages-step");
        this.header.textContent = "Add languages";
        return new Promise((resolve, reject) => {
            // TODO: Remove old event listener
            this.continueButton.addEventListener("click",
                () => resolve(this.dataPathInput.value.trim()));
        });
        return ["Japanese", "English", {}];
    }
}

customElements.define("init-lang-window", InitLangWindow);
module.exports = InitLangWindow;
