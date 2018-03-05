"use strict";

const fs = require("fs");

module.exports = function(paths, modules) {
    const notes = {};
    const dataMap = {};
    const isModified = {};
    let data;

    notes.create = function (language, settings) {
        const path = paths.languageData(language).notes;
        fs.writeFileSync(path, JSON.stringify([], null, 4));
    };

    notes.load = function (language) {
        dataMap[language] = require(paths.languageData(language).notes);
        isModified[language] = false;
    };

    notes.unload = function (language) {
        delete dataMap[language];
        delete isModified[language];
    };

    notes.setLanguage = function (language) {
        data = dataMap[language];
    };

    notes.save = function (language) {
        if (!isModified[language]) return;
        const path = paths.languageData(language).notes;
        fs.writeFileSync(path, JSON.stringify(dataMap[language], null, 4));
        isModified[language] = false;
    };

    notes.get = function () {
        return [...data];
    };

    notes.set = function (newData) {
        data = newData;
        dataMap[modules.currentLanguage] = newData;
        isModified[modules.currentLanguage] = true;
    };

    return notes;
};
