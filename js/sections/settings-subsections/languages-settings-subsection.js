"use strict";

class LanguagesSettingsSubsection extends SettingsSubsection {
    constructor() {
        super("languages");
        this.languageSettingsList = ["readings", "visibility"];
        this.$("languages-table").settingsSubsection = this;
    }

    initialize() {
        this.$("languages-table").clear();
        for (const language of dataManager.languages.all) {
            const languageSettings =
                dataManager.languageSettings.getFor(language);
            this.$("languages-table").addTableRow({
                language,
                settings: {
                    secondary: languageSettings.secondaryLanguage,
                    readings: languageSettings.readings,
                    srs: {
                        scheme: languageSettings.srs.scheme
                    },
                    hidden: languageSettings.hidden
                },
                default: dataManager.settings.languages.default === language,
                interactiveMode: true
            });
        }
    }
}

customElements.define("languages-settings-subsection",
    LanguagesSettingsSubsection);
module.exports = LanguagesSettingsSubsection;
