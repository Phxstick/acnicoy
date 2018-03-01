"use strict";

class SettingsSection extends Section {
    constructor() {
        super("settings");
        this.subsections = [];
        // Create subsections
        for (const name of components.settingsSubsections) {
            const subsection = 
                document.createElement(name + "-settings-subsection");
            this.subsections.push(subsection);
            subsection.classList.add("settings-subsection");
            // TODO: Add slotted tabs and panels dynamically here
            // TODO: Use subsections directly, without wrapping with divs
            this.$$(`div[slot='panels'][data-tab-name='${name}']`)[0]
                .appendChild(subsection);
        }
    }

    initialize() {
        for (const subsection of this.subsections) {
            subsection.initialize();
        }
    }

    adjustToLanguage(language, secondary) {
        for (const subsection of this.subsections) {
            subsection.adjustToLanguage(language, secondary);
        }
    }

    openSubsection(name) {
        this.$$(`button[slot='tabs'][data-tab-name='${name}']`)[0].click();
    }

    broadcastGlobalSettings() {
        for (const subsection of this.subsections) {
            subsection.broadcastGlobalSettings();
        }
    }

    broadcastLanguageSettings(language) {
        for (const subsection of this.subsections) {
            subsection.broadcastLanguageSettings(language);
        }
    }
}

customElements.define("settings-section", SettingsSection);
module.exports = SettingsSection;
