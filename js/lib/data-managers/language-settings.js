"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const settings = {};
    const dataMap = {};
    let data;

    settings.create = function (language, settings) {
        const langSettings = {
            secondaryLanguage: settings.secondary,
            readings: settings.readings,
            srs: settings.srs
        };
        const path = paths.languageData(language).settings;
        fs.writeFileSync(path, JSON.stringify(langSettings, null, 4));
    };

    settings.load = function (language) {
        dataMap[language] = require(paths.languageData(language).settings);
    };

    settings.save = function () {
        for (const language in dataMap) {
            const path = paths.languageData(language).settings;
            fs.writeFileSync(path, JSON.stringify(dataMap[language], null, 4));
        }
    };

    settings.setLanguage = function (language) {
        data = dataMap[language];
    };

    settings.for = function (language) {
        return dataMap[language];
    }

    // Return a proxy which allows reading/writing on the data object
    return new Proxy(settings, {
        get: (target, key) => {
            if (data !== undefined && Reflect.has(data, key)) return data[key];
            else return target[key];
        },
        set: (target, key, value) => {
            if (data !== undefined && Reflect.has(data, key)) data[key] = value;
            else throw Error("You cannot create new settings!");
        }
    });
};
