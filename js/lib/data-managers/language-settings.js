"use strict";

const fs = require("fs");
const dot = require("dot-prop");

module.exports = function (paths, modules) {
    const settings = {};
    const dataMap = {};
    const isModified = {};
    let data;

    settings.create = function (language, settings) {
        const langSettings = {
            secondaryLanguage: settings.secondary,
            readings: settings.readings,
            srs: {
                scheme: settings.srs.scheme
            },
            hidden: false
        };
        const path = paths.languageData(language).settings;
        fs.writeFileSync(path, JSON.stringify(langSettings, null, 4));
    };

    settings.load = function (language) {
        dataMap[language] = require(paths.languageData(language).settings);
        isModified[language] = false;
    };

    settings.unload = function (language) {
        delete dataMap[language];
        delete isModified[language];
    };

    settings.save = function (language) {
        if (!isModified[language]) return;
        const path = paths.languageData(language).settings;
        fs.writeFileSync(path, JSON.stringify(dataMap[language], null, 4));
        isModified[language] = false;
    };

    settings.setLanguage = function (language) {
        data = dataMap[language];
    };

    settings.get = function (identifier) {
        if (!identifier) return data;
        const value = dot.get(data, identifier);
        if (value === undefined) {
            throw new Error(`Setting '${identifier}' could not be found.`);
        }
        return value;
    };

    settings.set = function (identifier, value) {
        if (!dot.has(data, identifier)) {
            throw new Error(`Setting '${identifier}' could not be found.`);
        }
        isModified[modules.currentLanguage] = true;
        return dot.set(data, identifier, value);
    };

    settings.getFor = function (language, identifier) {
        if (!identifier) return dataMap[language];
        const value = dot.get(dataMap[language], identifier);
        if (value === undefined) {
            throw new Error(`Setting '${identifier}' could not be found.`);
        }
        return value;
    };

    settings.setFor = function (language, identifier, value) {
        if (!dot.has(dataMap[language], identifier)) {
            throw new Error(`Setting '${identifier}' could not be found.`);
        }
        isModified[language] = true;
        return dot.set(dataMap[language], identifier, value);
    };

    return settings;
};
