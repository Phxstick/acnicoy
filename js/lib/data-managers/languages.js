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
            modules.languageSettings, modules.content, modules.database,
            modules.vocabLists, modules.stats, modules.pinwall
        ];
        for (let module of languageDataModules)
            module.load(language);
    };

    languageManager.setCurrent = function (language) {
        const languageDependentModules = [
            modules.languageSettings, modules.content, modules.database,
            modules.vocabLists, modules.stats, modules.pinwall, modules.test
        ];
        for (let module of languageDependentModules)
            module.setLanguage(language);
        languageManager.currentLanguage = language;
    };

    // Register a new language with given configuration
    languageManager.add = function (language, settings) {
        // TODO
    };

    return languageManager;
};
