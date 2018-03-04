"use strict";

const fs = require("fs");

module.exports = function(paths, modules) {
    const notes = {};
    const dataMap = {};
    let data;

    notes.create = function (language, settings) {
        const path = paths.languageData(language).notes;
        fs.writeFileSync(path, JSON.stringify([], null, 4));
    };

    notes.load = function (language) {
        dataMap[language] = require(paths.languageData(language).notes);
    };

    notes.unload = function (language) {
        delete dataMap[language];
    };

    notes.setLanguage = function (language) {
        data = dataMap[language];
    };

    notes.save = function () {
        for (const language in dataMap) {
            const path = paths.languageData(language).notes;
            fs.writeFileSync(path, JSON.stringify(dataMap[language], null, 4));
        }
    };

    notes.get = function () {
        return [...data];
    };

    notes.set = function (newData) {
        data = newData;
        dataMap[modules.currentLanguage] = newData;
    };

    return notes;
};
