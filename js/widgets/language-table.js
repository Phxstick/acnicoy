"use strict";

class LanguageTable extends Widget {
    constructor() {
        super("language-table", true, true);
        // TODO: Add callbacks for settings
        this.languageConfigs = [];
        const template = templates.get("language-table-entry");
        this.$("add-language-button").addEventListener("click", () => {
            overlay.open("add-lang");
            overlay.get("add-lang").getConfig().then((config) => {
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
                        this.$("table").style.display = "none";
                    }
                });
                this.$("table").style.display = "block";
            }).catch((error) => {});
        });
    }

    getLanguageConfigs() {
        const copy = JSON.parse(JSON.stringify(this.languageConfigs));
        return copy;
    }
}

customElements.define("language-table", LanguageTable);
module.exports = LanguageTable;
