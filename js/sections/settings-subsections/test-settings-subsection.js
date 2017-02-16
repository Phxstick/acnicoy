"use strict";

class TestSettingsSubsection extends SettingsSubsection {
    constructor() {
        super("test");
        this.globalSettingsList = ["show-progress"];
        this.$("show-progress").checked =
            dataManager.settings.test.showProgress;
        this.$("show-progress").callback = (value) => {
            dataManager.settings.test.showProgress = value;
            this.broadcastGlobalSetting("show-progress");
        }
    }
}

customElements.define("test-settings-subsection", TestSettingsSubsection);
module.exports = TestSettingsSubsection;
