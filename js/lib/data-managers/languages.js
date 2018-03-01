"use strict";

const fs = require("fs-extra");

module.exports = function (paths, modules) {
    const languageManager = {};
    let languageList;

    // Find all registered languages in the data folder and return the list
    languageManager.find = function() {
        languageList = fs.readdirSync(paths.languages);
        return languageList.slice();
    };

    // Get list of all registered languages
    Object.defineProperty(languageManager, "all", {
        get: () => languageList.slice()
    });

    // Get list of visible registered languages
    Object.defineProperty(languageManager, "visible", {
        get: () => languageList.filter(
            (language) => !modules.languageSettings.for(language).hidden)
    });

    // Register a new language with given configuration
    languageManager.add = function (language, settings) {
        if (languageList.includes(language)) {
            throw new Error(`Language '${language}' is already registered.`);
        }
        fs.mkdirSync(paths.languageData(language).directory);
        const results = [];
        for (const name in modules) {
            if (modules[name].hasOwnProperty("create")) {
                results.push(modules[name].create(language, settings));
            }
        }
        return Promise.all(results).then(() => {
            languageList.push(language);
        });
    };

    // Remove all user data for given language
    languageManager.remove = async function (language) {
        if (!languageList.includes(language)) {
            throw new Error(`Language '${language}' is not registered.`);
        }
        languageList.remove(language);
        for (const name in modules) {
            if (modules[name].hasOwnProperty("unload")) {
                modules[name].unload(language);
            }
        }
        await fs.remove(paths.languageData(language).directory)
        .catch((error) => {
            throw(`Failed to remove language data for '${language}': ${error}`);
        });
    };

    return languageManager;
};
