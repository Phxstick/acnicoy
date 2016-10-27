"use strict";

class LanguageTable extends Widget {
    constructor() {
        super("language-table", true, true);
        // TODO: Add callbacks for settings
        // TODO: Add table column for SRS scheme, opening srs overylay on click
        this.languageConfigs = [];
        const template = templates.get("language-table-entry");
        this.$("add-language-button").addEventListener("click", () => {
            overlay.open("add-lang").then((config) => {
                if (config === null) return;
                for (let { language } of this.languageConfigs) {
                    if (config.language === language) {
                        dialogWindow.info("You cannot add a language twice!"); 
                        return;
                    }
                }
                this.languageConfigs.push(config);
                const row =
                    utility.fragmentFromString(template(config)).children[0];
                this.$("table-body").appendChild(row);
                // When the checkbox is clicked, update config
                const checkBox = row.children[2].children[0];
                checkBox.addEventListener("click", () => {
                    config.settings.readings = checkBox.checked;
                });
                // Remove language if remove-icon is clicked
                const removeIcon = row.children[3].children[0];
                removeIcon.addEventListener("click", () => {
                    this.languageConfigs.remove(config);
                    this.$("table-body").removeChild(row);
                    if (this.languageConfigs.length === 0) {
                        this.$("table").hide();
                    }
                });
                this.$("table").show();
            });
        });
    }

    getLanguageConfigs() {
        const copy = JSON.parse(JSON.stringify(this.languageConfigs));
        return copy;
    }
}

customElements.define("language-table", LanguageTable);
module.exports = LanguageTable;
