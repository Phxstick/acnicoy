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
        this.$("data-path").textContent = paths.getDataPath();
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
        this.$("check-program-update").addEventListener("click", () => {
            events.emit("update-program-status");
        });
        this.$("update-program-version").addEventListener("click", () => {
            events.emit("start-program-update");
        });
    }

    initialize() {
        this.updateProgramVersionStatusView();
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
        events.on("update-program-status", async () => {
            try {
                this.$("check-program-update-spinner").show();
                this.$("program-version-status").hide();
                this.$("check-program-update").style.visibility = "hidden";
                const infoProm = networkManager.program.getLatestVersionInfo()
                const minDelay = new Promise((resolve) =>
                    window.setTimeout(() => resolve(), 1200));
                const [_, info] = await Promise.all([minDelay, infoProm]);
                // Cache latest information
                info.lastUpdateTime = utility.getTime();
                const cacheKey = "cache.programVersionInfo";
                const cachedInfo = storage.get(cacheKey);
                storage.set(cacheKey, info);
                // If a new version has been released, add a notification
                if ((cachedInfo === undefined &&
                     app.version !== info.latestVersion)
                        || (cachedInfo !== undefined &&
                            cachedInfo.latestVersion !== info.latestVersion)) {
                    main.addNotification("program-update-available", info);
                }
                // Update view
                this.updateProgramVersionStatusView();
            } catch (error) {
                if (error instanceof networkManager.NoServerConnectionError) {
                    this.$("program-version-status").textContent =
                        "Connection error";
                } else
                if (error instanceof networkManager.ServerRequestFailedError) {
                    this.$("program-version-status").textContent =
                        "Server error";
                } else {
                    throw error;
                }
                this.$("update-program-version").hide();
            } finally {
                // Check for updates periodically
                window.setTimeout(() => events.emit("update-program-status"),
                                  main.statusUpdateInterval * 1000);
            }
        });
        events.on("start-program-update", () => {
            dialogWindow.info(
                `Automated program updating is not yet implemented.
                 Please download and install the latest program version
                 from <a href="${app.homepage + "/releases"}">here</a>.`);
        });
    }

    async chooseDataPath() {
        const previousPath = paths.dataPath;
        const newPath = dialogWindow.chooseDataPath(previousPath);
        if (previousPath === newPath)
            return;

        // Check if new path is valid
        if (newPath.startsWith(previousPath)) {
            dialogWindow.info(
                `The new location must not be a subfolder of the previous one.`)
            return;
        }
        
        // If new path exists, get confirmation that it can be overwritten
        if (fs.existsSync(newPath) && fs.readdirSync(newPath).length > 0) {
            const confirmed = await dialogWindow.confirm(
                `The specified directory '${newPath}' is not empty. ` +
                `Are you sure you want to overwrite its content?`);
            if (!confirmed) return;
        }

        // Save changes in databases and close them
        const languages = dataManager.languages.all;
        for (const language of languages) {
            await dataManager.database.save(language);
            await dataManager.database.close(language);
            await dataManager.history.save(language);
            await dataManager.history.close(language);
        }

        // Change path and reload databases at new path
        paths.setDataPath(newPath);
        for (const language of languages) {
            await dataManager.database.load(language);
            await dataManager.history.load(language);
        }

        // Update view
        this.$("data-path").textContent = newPath;
    }

    updateProgramVersionStatusView() {
        const info = storage.get("cache.programVersionInfo");
        if (!info) return;
        const updateAvailable = app.version !== info.latestVersion;
        this.$("current-program-version").textContent = app.version;
        this.$("program-version-status").textContent =
            updateAvailable ? "Update available" : "Up to date";
        this.$("update-program-version").toggleDisplay(updateAvailable);
        this.$("check-program-update").style.visibility =
            updateAvailable ? "hidden" : "visible";
        this.$("program-version-status").classList.toggle(
            "update-available", updateAvailable);
        this.$("check-program-update-spinner").hide();
        this.$("program-version-status").show();
    }
}

customElements.define("general-settings-subsection", GeneralSettingsSubsection);
module.exports = GeneralSettingsSubsection;
