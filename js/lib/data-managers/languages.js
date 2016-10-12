"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const languageManager = {};
    
    // Return list of all registered languages. Create folder if doesn't exist
    languageManager.find = function() {
        try {
            return fs.readdirSync(paths.languages);
        } catch (error) {
            if (error.errno === -2) fs.mkdirSync(paths.languages);
            return [];
        }
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
