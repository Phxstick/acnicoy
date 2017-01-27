"use strict";

class SettingsSection extends Section {
    constructor() {
        super("settings");
        this.subsections = [];
        // Create subsections
        for (const name of globals.settingsSubsections) {
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

    adjustToLanguage(language, secondary) {
        for (const section of this.subsections) {
            section.adjustToLanguage(language, secondary);
        }
    }
}

customElements.define("settings-section", SettingsSection);
module.exports = SettingsSection;
