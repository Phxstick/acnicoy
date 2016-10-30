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
            this.resolve(null);
        });
        this.$("cancel-button").addEventListener("click", () => {
            this.resolve(null);
        });
        this.$("add-button").addEventListener("click", () => {
            if (!this.languageSelect.value) {
                dialogWindow.info(
                    "You need to select a language you want to learn.");
                return;
            }
            if (!this.secondaryLanguageSelect.value) {
                dialogWindow.info(
                    "You need to select a language for translations.");
                return;
            }
            this.resolve({
                language: this.languageSelect.value,
                settings: {
                    secondary: this.secondaryLanguageSelect.value,
                    readings: this.readingsCheckbox.checked
                }
            });
        });
        this.addButton = this.root.getElementById("add-button");
        this.cancelButton = this.root.getElementById("cancel-button");
        this.languageSelect.appendChild(utility.createDefaultOption(""));
        this.secondaryLanguageSelect.appendChild(
                utility.createDefaultOption(""));
        const languageList = languages.getAllLanguageCode().sort(
                (l1, l2) => languages.getLanguageInfo(l1).name
                            < languages.getLanguageInfo(l2).name ? -1 : 1);
        for (const langcode of languageList) {
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
        this.languageSelect.value = "";
        this.secondaryLanguageSelect.value = "";
        this.readingsCheckbox.checked = false;
    }
}

customElements.define("add-lang-overlay", AddLangOverlay);
module.exports = AddLangOverlay;
