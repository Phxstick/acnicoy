"use strict";

const languages = require("languages");

class AddLangOverlay extends Overlay {
    constructor() {
        super("add-lang");
        this.languageSelect = this.root.getElementById("language-select");
        this.secondaryLanguageSelect =
            this.root.getElementById("secondary-language-select");
        this.readingsCheckbox = this.root.getElementById("readings-checkbox");
        this.$("close-button").addEventListener("click", () => this.close());
        this.$("cancel-button").addEventListener("click", () => this.close());
        this.$("add-button").addEventListener("click", () => {
            if (!this.languageSelect.value) {
                dialogWindow.info("Select a language you want to learn.");
                return;
            }
            if (!this.secondaryLanguageSelect.value) {
                dialogWindow.info("Select a language for translations.");
                return;
            }
            this.close()
        });
        this.addButton = this.root.getElementById("add-button");
        this.cancelButton = this.root.getElementById("cancel-button");
        for (let langcode of languages.getAllLanguageCode()) {
            const option1 = document.createElement("option");
            const option2 = document.createElement("option");
            const language = languages.getLanguageInfo(langcode);
            option1.textContent = language.name;
            option2.textContent = language.name;
            // if (language.name === "Japanese") option1.selected = true;
            // if (language.name === "English") option2.selected = true;
            this.languageSelect.appendChild(option1);
            this.secondaryLanguageSelect.appendChild(option2);
        }
    }
    
    open() {
        this.languageSelect.value = "";
        this.secondaryLanguageSelect.value = "";
        this.readingsCheckbox.checked = false;
    }

    getConfig() {
        return new Promise((resolve, reject) => {
            this.$("cancel-button").addEventListener("click", reject);
            this.$("add-button").addEventListener("click", () => {
                resolve({ language: this.languageSelect.value,
                          secondary: this.secondaryLanguageSelect.value,
                          readings: this.readingsCheckbox.checked });
            });
        });
    }
}

customElements.define("add-lang-overlay", AddLangOverlay);
module.exports = AddLangOverlay;
