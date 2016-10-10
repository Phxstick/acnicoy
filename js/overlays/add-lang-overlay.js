"use strict";

const languages = require("languages");

class AddLangOverlay extends Overlay {
    constructor() {
        super("add-lang");
        this.languageSelect = this.root.getElementById("language-select");
        this.secondaryLanguageSelect =
            this.root.getElementById("secondary-language-select");
        this.readingsCheckbox = this.root.getElementById("readings-checkbox");
        this.$("close-button").addEventListener("click", () => {
            this.close();
            this.reject();
        });
        this.$("cancel-button").addEventListener("click", () => {
            this.close();
            this.reject();
        });
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
            this.resolve();
        });
        this.addButton = this.root.getElementById("add-button");
        this.cancelButton = this.root.getElementById("cancel-button");
        this.languageSelect.appendChild(utility.createDefaultOption(""));
        this.secondaryLanguageSelect.appendChild(
                utility.createDefaultOption(""));
        for (let langcode of languages.getAllLanguageCode()) {
            const option1 = document.createElement("option");
            const option2 = document.createElement("option");
            const language = languages.getLanguageInfo(langcode);
            option1.textContent = language.name;
            option2.textContent = language.name;
            this.languageSelect.appendChild(option1);
            this.secondaryLanguageSelect.appendChild(option2);
        }
    }
    
    open() {
        this.languageSelect.children[0].setAttribute("selected", "");
        this.secondaryLanguageSelect.children[0].setAttribute("selected", "");
        this.languageSelect.value = "";
        this.secondaryLanguageSelect.value = "";
        this.readingsCheckbox.checked = false;
    }

    getConfig() {
        return new Promise((resolve, reject) => {
            this.reject = () => reject();
            this.resolve = () => resolve({
                language: this.languageSelect.value,
                settings: {
                    secondary: this.secondaryLanguageSelect.value,
                    readings: this.readingsCheckbox.checked
                }
            });
        });
    }
}

customElements.define("add-lang-overlay", AddLangOverlay);
module.exports = AddLangOverlay;
