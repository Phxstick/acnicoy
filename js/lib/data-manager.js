"use strict";

const fs = require("fs");

module.exports = function (paths) {
    const modules = { };

    for (const name of globals.modules) {
        modules[name] = require(paths.js.dataModule(name))(paths, modules);
    }

    // Define some aliases
    modules.languageSettings = modules["language-settings"];
    modules.vocabLists = modules["vocab-lists"];

    // Load user data and content (if available) for given language
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

    // Save user data for all languages
    modules.save = function () {
        const results = [];
        for (const name in modules) {
            if (modules[name].hasOwnProperty("save")) {
                results.push(modules[name].save());
            }
        }
        return Promise.all(results);
    };

    modules.setLanguage = function (language) {
        modules.languageSettings.setLanguage(language);
        for (const name in modules) {
            if (modules[name].hasOwnProperty("setLanguage")) {
                modules[name].setLanguage(language);
            }
        }
    };

    return modules;
};
