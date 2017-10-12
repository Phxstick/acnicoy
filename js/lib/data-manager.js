"use strict";

const fs = require("fs-extra");

module.exports = function (paths) {
    const modules = { };

    // Load all modules
    for (const name of components.modules) {
        modules[name] = require(paths.js.dataModule(name))(paths, modules);
    }

    // Define some aliases
    modules.languageSettings = modules["language-settings"];
    modules.vocabLists = modules["vocab-lists"];

    /**
     * Load user data and content (if available) for given language.
     * @param {String} language
     * @returns {Promise}
     */
    modules.load = function (language) {
        modules.languageSettings.load(language);  // Always load settings first
        const results = [];
        for (const name in modules) {
            if (modules[name].hasOwnProperty("load") && name !== "settings") {
                results.push(modules[name].load(language));
            }
        }
        return Promise.all(results);
    };

    /**
     * Save user data for all languages.
     * @returns {Promise}
     */
    modules.save = function () {
        const results = [];
        for (const name in modules) {
            if (modules[name].hasOwnProperty("save")) {
                results.push(modules[name].save());
            }
        }
        return Promise.all(results);
    };

    /**
     * Set currently used language in all modules.
     * @param {String} language
     */
    modules.setLanguage = function (language) {
        modules.languageSettings.setLanguage(language);
        modules.currentLanguage = language;
        modules.currentSecondaryLanguage =
            modules.languageSettings.secondaryLanguage;
        for (const name in modules) {
            if (modules[name].hasOwnProperty("setLanguage")) {
                modules[name].setLanguage(language);
            }
        }
    };

    /**
     * Backup user data for all languages.
     * @param {Object} info - Information about this backup (stored as JSON).
     *     Should contain at least an "event" field specifiying the occasion.
     */
    modules.createBackup = async function (info) {
        // Save any unsaved changes to data first
        await modules.save();
        const newBackupPath = paths.newBackup();
        info.time = utility.getTime();
        info.languages = modules.languages.all;
        // Copy all data to new backup location and create info file
        fs.copy(paths.languages, newBackupPath.directory, async () => {
            await fs.copy(paths.achievementsUnlocked, newBackupPath.achievements);
            fs.writeFileSync(newBackupPath.infoFile, JSON.stringify(info, null, 4));
        });
    };

    /**
     * Get date of last backup in seconds.
     */
    modules.getLastBackupTime = function () {
        const backups = fs.readdirSync(paths.backups);
        if (backups.length === 0) return 0;
        let lastBackupIndex = 0;
        let lastBackupId = 0;
        for (let i = 0; i < backups.length; ++i) {
            const backupId = parseInt(backups[i].slice(0, 5));
            if (backupId > lastBackupId) {
                lastBackupIndex = i;
                lastBackupId = backupId;
            }
        }
        const lastBackup = backups[lastBackupIndex];
        const backupInfo = require(paths.backupInfo(lastBackup));
        return backupInfo.time;
    };

    return modules;
};
