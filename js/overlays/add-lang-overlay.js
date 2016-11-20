"use strict";

const languages = require("languages");

class AddLangOverlay extends Overlay {
    constructor() {
        super("add-lang");
        this.$("close-button").addEventListener("click", () => {
            this.resolve(null);
        });
        this.$("cancel-button").addEventListener("click", () => {
            this.resolve(null);
        });
        this.$("add-button").addEventListener("click", () => {
            if (!this.$("language").value) {
                dialogWindow.info(
                    "You need to select a language you want to learn.");
                return;
            }
            if (!this.$("secondary-language").value) {
                dialogWindow.info(
                    "You need to select a language for translations.");
                return;
            }
            this.resolve({
                language: this.$("language").value,
                settings: {
                    secondary: this.$("secondary-language").value,
                    readings: this.$("readings-flag").checked,
                    srs: {
                        scheme: this.$("srs-scheme").value
                    }
                }
            });
        });
        this.$("language").appendChild(
            utility.createDefaultOption("Select foreign language"));
        this.$("secondary-language").appendChild(
            utility.createDefaultOption("Select language for translations"));
        const languageList = languages.getAllLanguageCode().sort(
                (l1, l2) => languages.getLanguageInfo(l1).name
                            < languages.getLanguageInfo(l2).name ? -1 : 1);
        for (const langcode of languageList) {
            const option1 = document.createElement("option");
            const option2 = document.createElement("option");
            const language = languages.getLanguageInfo(langcode);
            option1.textContent = language.name;
            option2.textContent = language.name;
            this.$("language").appendChild(option1);
            this.$("secondary-language").appendChild(option2);
        }
        this.$("srs-scheme").appendChild(
            utility.createDefaultOption("Select SRS scheme"));
        this.$("edit-srs-schemes").addEventListener("click", () => {
            overlay.open("srs-schemes");
        });
        events.on("srs-schemes-edited", () => this.loadSrsSchemes());
    }
    
    open() {
        this.$("language").value = "";
        this.$("secondary-language").value = "";
        this.$("readings-flag").checked = false;
        this.$("srs-scheme").value = "";
        this.loadSrsSchemes();
    }

    // Fill <select> with list of SRS schemes
    loadSrsSchemes() {
        this.$("srs-scheme").empty();
        for (const { name } of dataManager.srs.schemes) {
            const option = document.createElement("option");
            option.textContent = name;
            this.$("srs-scheme").appendChild(option);
        }
    }
}

customElements.define("add-lang-overlay", AddLangOverlay);
module.exports = AddLangOverlay;
