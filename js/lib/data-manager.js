"use strict";

const fs = require("fs");
const { ncp } = require("ncp");

module.exports = function (paths) {
    const modules = { };

    // Load all modules
    for (const name of globals.modules) {
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
        modules.languageSettings.setLanguage(language);
        const results = [];
        for (const name in modules) {
            if (modules[name].hasOwnProperty("load")) {
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
     * @returns {Promise}
     */
    modules.createBackup = function (info) {
        // Save any unsaved changes to data first
        return modules.save().then(() => {
            return new Promise((resolve, reject) => {
                const languageDataPath = paths.languages;
                const newBackupPath = paths.newBackup();
                info.time = utility.getTime();
                // Copy all data to new backup location and create info file
                ncp(languageDataPath, newBackupPath.directory, (error) => {
                    if (error) {
                        reject(error);
                    }
                    fs.writeFileSync(newBackupPath.infoFile,
                        JSON.stringify(info, null, 4));
                    resolve();
                });
            });
        });
    };

    /**
     * Get date of last backup in seconds.
     */
    modules.getLastBackupTime = function () {
        const backups = fs.readdirSync(paths.backups);
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
