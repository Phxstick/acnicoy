"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const languageManager = {};
    
    // Return list of all registered languages
    languageManager.find = function() {
        return fs.readdirSync(paths.languages);
    };

    // Register a new language with given configuration
    languageManager.add = function (language, settings) {
        fs.mkdirSync(paths.languageData(language).directory);
        const results = [];
        for (let name in modules) {
            if (modules[name].hasOwnProperty("create")) {
                results.push(modules[name].create(language, settings));
            }
        }
        return Promise.all(results);
    };

    return languageManager;
};
