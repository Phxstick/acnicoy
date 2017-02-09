"use strict";

class SettingsSubsection extends Component {
    constructor(name) {
        super(name + "-settings-subsection");
        this.subsectionName = name;
        this.globalSettingsList = [];
        this.languageSettingsList = [];
    }

    adjustToLanguage(language, secondary) {
    }

    broadcastGlobalSetting(name) {
        events.emit(`settings-${this.subsectionName}-${name}`);
    }

    broadcastLanguageSetting(name, language) {
        if (language !== dataManager.currentLanguage) return;
        events.emit(`settings-${this.subsectionName}-${name}`);
    }

    broadcastGlobalSettings() {
        for (const settingName of this.globalSettingsList) {
            this.broadcastGlobalSetting(settingName);
        }
    }

    broadcastLanguageSettings(language) {
        for (const settingName of this.languageSettingsList) {
            this.broadcastLanguageSetting(settingName, language);
        }
    }
}

module.exports = SettingsSubsection;
