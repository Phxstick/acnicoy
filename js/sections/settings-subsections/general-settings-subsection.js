"use strict";

class GeneralSettingsSubsection extends SettingsSubsection {
    constructor() {
        super("general");
        this.globalSettingsList = [
            "auto-launch-on-startup", "show-srs-notifications",
            "srs-notifications-interval", "do-regular-backup",
            "regular-backup-interval"
        ];
        this.$("auto-launch-on-startup").addEventListener("click", (event) => {
            dataManager.settings.general.autoLaunchOnStartup =
                event.target.checked;
            this.broadcastGlobalSetting("auto-launch-on-startup");
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
    }

    chooseDataPath() {
        const previousPath = this.$("data-path").textContent;
        const newPath = dialogWindow.chooseDataPath(previousPath);
        if (previousPath === newPath) return;
        if (!paths.setDataPath(newPath)) {
            dialogWindow.confirm(`The specified location '${newPath}' ` +
                `already contains a file named '${paths.dataPathBaseName}'. ` +
                `Are you sure you want to overwrite that file?`)
            .then((confirmed) => {
                if (!confirmed) return;
                paths.setDataPath(newPath, true);
                this.$("data-path").textContent = newPath;
            });
        } else {
            this.$("data-path").textContent = newPath;
        }
    }
}

customElements.define("general-settings-subsection", GeneralSettingsSubsection);
module.exports = GeneralSettingsSubsection;
