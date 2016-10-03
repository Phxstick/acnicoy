"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const languageManager = {};
    
    languageManager.currentLanguage = null;

    // Return list of all registered languages. Create folder if doesn't exist
    languageManager.find = function() {
        try {
            return fs.readdirSync(paths.languages);
        } catch (error) {
            if (error.errno === -2) fs.mkdirSync(paths.languages);
            return [];
        }
    };

    // Load content and user data for given language
    languageManager.load = function (language) {
        const languageDataModules = [
            "language-settings", "content", "database", "vocab-lists",
            "stats", "pinwall"
        ];
        const promises = [];
        for (let name of languageDataModules) {
            promises.push(modules[name].load(language));
        }
        return Promise.all(promises);
    };

    languageManager.setCurrent = function (language) {
        const languageDependentModules = [
            "language-settings", "content", "database", "vocab-lists",
            "stats", "pinwall", "test"
        ];
        for (let name of languageDependentModules) {
            modules[name].setLanguage(language);
        }
        languageManager.currentLanguage = language;
    };

    // Register a new language with given configuration
    languageManager.add = function (language, secondary, settings) {
        // TODO: Create language and return promise
        return language;
    };

    return languageManager;
};
