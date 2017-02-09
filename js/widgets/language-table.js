"use strict";

class LanguageTable extends Widget {

    static get observedAttributes() {
        return ["interactive-mode"];
    }

    constructor() {
        super("language-table");
        this.$("table").hide();
        this.languageConfigs = [];
        this.rowToConfig = new WeakMap();
        this.interactiveMode = false;
        this.settingsSubsection = null;
        this.$("add-language-button").addEventListener("click", () => {
            overlay.open("add-lang").then((config) => {
                if (config === null) return;
                for (const { language } of this.languageConfigs) {
                    if (config.language === language) {
                        dialogWindow.info("You cannot add a language twice!"); 
                        return;
                    }
                }
                let promise = Promise.resolve();
                if (this.interactiveMode) {
                    promise = dataManager.languages.add(
                        config.language, config.settings).then(() => {
                            dataManager.load(config.language);
                        });
                }
                promise.then(() => {
                    config.interactiveMode = this.interactiveMode;
                    config.default = false;
                    this.addTableRow(config);
                });
            });
        });
        // When a readings checkbox is clicked, update config
        this.$("table-body").addEventListener("click", (target) => {
            if (!event.target.classList.contains("readings-checkbox")) return;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            if (this.interactiveMode) {
                dataManager.languageSettings.for(config.language).readings =
                    event.target.checked;
                this.settingsSubsection.broadcastLanguageSetting("readings");
            }
            config.settings.readings = event.target.checked;
        });
        // Allow user to change SRS scheme and migrate items for a language
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("scheme-button")) return;
            const label = event.target;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            overlay.open("migrate-srs", "switch-scheme", {
                language: config.language,
                schemeName: config.settings.srs.scheme
            }).then((migrated) => {
                if (!migrated) return;
                label.textContent = dataManager.languageSettings
                                    .for(config.language).srs.scheme;
            });
        });
        // Functionality for setting language opened by default
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("default-language-checkbox"))
                return;
            if (event.target.checked === false) {
                event.target.checked = true;
                return;
            }
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            const defaultLanguageCheckboxes =
                this.$$("#table-body .default-language-checkbox");
            for (const checkbox of defaultLanguageCheckboxes) {
                if (checkbox.checked && checkbox !== event.target) {
                    checkbox.checked = false;
                    break;
                }
            }
            dataManager.settings.languages.default = config.language;
        });
        // Activate hidden mode for language if eye-button is clicked
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("hide-button")) return;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            const hidden = !dataManager.languageSettings
                            .for(config.language).hidden;
            dataManager.languageSettings.for(config.language).hidden = hidden;
            row.classList.toggle("hidden", hidden);
            this.settingsSubsection.broadcastLanguageSetting("visibility");
        });
        // Remove language if a remove-icon is clicked
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("remove-button")) return;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            let promise = Promise.resolve(true);
            if (this.interactiveMode) {
                promise = dialogWindow.confirm(
                    `Are you sure you want to remove the language ` +
                    `'${config.language}' and delete all its data?`);
            }
            promise.then((confirmed) => {
                if (!confirmed) return;
                // If the removed language is the current one, switch to other
                let promise = Promise.resolve()
                if (config.language === dataManager.currentLanguage) {
                    const languages = dataManager.languages.all.slice();
                    languages.remove(config.language);
                    promise = main.setLanguage(languages[0]);
                }
                promise.then((switched) => {
                    if (!switched) return;
                    const defaultLang = dataManager.settings.languages.default;
                    if (config.language === defaultLang) {
                        // TODO: Let user choose new default language
                    }
                    this.languageConfigs.remove(config);
                    this.$("table-body").removeChild(row);
                    if (this.languageConfigs.length === 0) {
                        this.$("table").hide();
                        if (this.interactiveMode) {
                            // TODO: Open init window for choosing new lang
                        }
                    }
                    dataManager.languages.remove(config.language);
                });
            });
        });
    }

    addTableRow(config) {
        this.languageConfigs.push(config);
        const template = templates.get("language-table-entry");
        const row = utility.fragmentFromString(template(config)).children[0];
        this.$("table-body").appendChild(row);
        this.rowToConfig.set(row, config);
        this.$("table").show();
    }

    getLanguageConfigs() {
        const copy = JSON.parse(JSON.stringify(this.languageConfigs));
        return copy;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "interactive-mode") {
            this.interactiveMode = (newValue !== null);
            for (const element of this.$$(".interactive-only")) {
                element.toggleDisplay(this.interactiveMode, "table-cell");
            }
        }
    }
}

customElements.define("language-table", LanguageTable);
module.exports = LanguageTable;
