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
     * Load language-independent data.
     * @returns {Promise}
     */
    modules.initialize = function () {
        const results = [];
        for (const name of components.modules) {
            if (modules[name].hasOwnProperty("initialize")) {
                results.push(modules[name].initialize());
            }
        }
        shortcuts.initialize();
        return Promise.all(results);
    };

    /**
     * Load user data for given language.
     * @param {String} language
     * @returns {Promise}
     */
    modules.load = async function (language) {
        const results = [];
        for (const name of components.modules) {
            if (modules[name].hasOwnProperty("load") && name !== "content") {
                results.push(modules[name].load(language));
            }
        }
        await Promise.all(results);
    };

    /**
     * Save user data for given language.
     * @param {String} language
     * @returns {Promise}
     */
    modules.save = async function (language) {
        const results = [];
        for (const name of components.modules) {
            if (modules[name].hasOwnProperty("save")) {
                results.push(modules[name].save(language));
            }
        }
        await Promise.all(results);
    };

    /**
     * Save user data for all languages as well as all global data.
     * @returns {Promise}
     */
    modules.saveAll = async function () {
        const promises = [];
        const languages = modules.languages.all;
        for (const language of languages) {
            promises.push(modules.save(language));
        }
        for (const name of components.modules) {
            if (modules[name].hasOwnProperty("saveGlobal")) {
                promises.push(modules[name].saveGlobal());
            }
        }
        await Promise.all(promises);
    };

    /**
     * Set currently used language in all modules.
     * @param {String} language
     */
    modules.setLanguage = async function (language) {
        modules.currentLanguage = language;
        modules.currentSecondaryLanguage =
            modules.languageSettings.getFor(language, "secondaryLanguage");
        for (const name of components.modules) {
            if (modules[name].hasOwnProperty("setLanguage")) {
                await modules[name].setLanguage(language);
            }
        }
    };

    /**
     * Backup user data for all languages.
     * @param {Object} info - Information about this backup (stored as JSON).
     *     Should contain at least an "event" field specifiying the occasion.
     */
    modules.createBackup = async function (info) {
        // Save all data first
        await modules.saveAll();
        const newBackupPath = paths.newBackup();
        info.time = utility.getTime();
        info.languages = modules.languages.all;
        // Copy all data to new backup location and create info file
        await fs.copy(paths.data, newBackupPath.directory);
        fs.writeFileSync(newBackupPath.infoFile, JSON.stringify(info, null, 4));
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
