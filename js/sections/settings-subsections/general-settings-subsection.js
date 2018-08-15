"use strict";

const fs = require("fs");
const path = require("path");

class GeneralSettingsSubsection extends SettingsSubsection {
    constructor() {
        super("general");
        this.globalSettingsList = [
            "auto-launch-on-startup", "show-srs-notifications",
            "srs-notifications-interval", "do-regular-backup",
            "regular-backup-interval", "auto-load-language-content"
        ];
        this.$("auto-launch-on-startup").addEventListener("click", (event) => {
            dataManager.settings.general.autoLaunchOnStartup =
                event.target.checked;
            this.broadcastGlobalSetting("auto-launch-on-startup");
        });
        this.$("auto-load-language-content").addEventListener("click",
        (event) => {
            dataManager.settings.general.autoLoadLanguageContent =
                event.target.checked;
            this.broadcastGlobalSetting("auto-load-language-content");
        });
        this.$("data-path").textContent = paths.dataPathPrefix;
        this.$("data-path").addEventListener("click", () => {
            this.chooseDataPath();
        });
        this.$("choose-data-path").addEventListener("click", () => {
            this.chooseDataPath();
        });
        this.$("show-srs-notifications").addEventListener("click", (event) => {
            dataManager.settings.general.showSrsNotifications =
                event.target.checked;
            this.broadcastGlobalSetting("show-srs-notifications");
        });
        utility.bindRadiobuttonGroup(this.$("srs-notifications-intervals"),
            dataManager.settings.general.srsNotificationsInterval,
            (value) => {
                dataManager.settings.general.srsNotificationsInterval = value;
                this.broadcastGlobalSetting("srs-notifications-interval");
            }
        );
        this.$("do-regular-backup").addEventListener("click", (event) => {
            dataManager.settings.general.doRegularBackup = event.target.checked;
            this.broadcastGlobalSetting("do-regular-backup");
        });
        utility.bindRadiobuttonGroup(this.$("regular-backup-intervals"),
            dataManager.settings.general.regularBackupInterval,
            (value) => {
                dataManager.settings.general.regularBackupInterval = value;
                this.broadcastGlobalSetting("regular-backup-interval");
            }
        );
    }

    registerCentralEventListeners() {
        events.on("settings-general-show-srs-notifications", () => {
            this.$("show-srs-notifications").checked =
                dataManager.settings.general.showSrsNotifications;
            this.$("srs-notifications-intervals").toggleDisplay(
                dataManager.settings.general.showSrsNotifications);
        });
        events.on("settings-general-do-regular-backup", () => {
            this.$("do-regular-backup").checked =
                dataManager.settings.general.doRegularBackup;
            this.$("regular-backup-intervals").toggleDisplay(
                dataManager.settings.general.doRegularBackup);
        });
        events.on("settings-general-auto-launch-on-startup", () => {
            this.$("auto-launch-on-startup").checked = 
                dataManager.settings.general.autoLaunchOnStartup;
        });
        events.on("settings-general-auto-load-language-content", () => {
            this.$("auto-load-language-content").checked = 
                dataManager.settings.general.autoLoadLanguageContent;
        });
    }

    async chooseDataPath() {
        const previousPrefix = this.$("data-path").textContent;
        const newPrefix = dialogWindow.chooseDataPath(previousPrefix);
        const previousPath = path.resolve(
            previousPrefix, paths.dataPathBaseName);
        const newPath = path.resolve(newPrefix, paths.dataPathBaseName);
        if (previousPath === newPath)
            return;
        if (newPath.startsWith(previousPath)) {
            dialogWindow.info(
                `The new location must not be a subfolder of the previous one.`)
            return;
        }
        if (fs.existsSync(newPath)) {
            const confirmed = await dialogWindow.confirm(
                `The specified location '${newPrefix}' already contains a ` +
                `file named '${paths.dataPathBaseName}'. ` +
                `Are you sure you want to overwrite that file?`);
            if (!confirmed) return;
        }
        // Save changes in databases first
        const languages = dataManager.languages.all;
        for (const language of languages) {
            await dataManager.database.save(language);
            await dataManager.database.close(language);
            await dataManager.history.save(language);
            await dataManager.history.close(language);
        }
        // Change path and reload databases at new path
        paths.setDataPath(newPrefix);
        for (const language of languages) {
            await dataManager.database.load(language);
            await dataManager.history.load(language);
        }
        // Update view
        this.$("data-path").textContent = newPrefix;
    }
}

customElements.define("general-settings-subsection", GeneralSettingsSubsection);
module.exports = GeneralSettingsSubsection;
