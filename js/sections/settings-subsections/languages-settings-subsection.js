"use strict";

class LanguagesSettingsSubsection extends SettingsSubsection {
    constructor() {
        super("languages");
        for (const language of dataManager.languages.all) {
            const languageSettings = dataManager.languageSettings.for(language);
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
