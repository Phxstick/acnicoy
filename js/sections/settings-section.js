"use strict";

class SettingsSection extends Section {
    constructor() {
        super("settings");
    }
}

customElements.define("settings-section", SettingsSection);
module.exports = SettingsSection;
