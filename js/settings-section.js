"use strict";

class SettingsSection extends Section {
    constructor() {
        super("settings");
        eventEmitter.emit("done-loading");
    }
}

customElements.define("settings-section", SettingsSection);
module.exports = SettingsSection;
