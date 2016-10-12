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
            SRS: {  // TODO: Save scheme name from given settings for this
                spacing: [0, 14400, 28800, 72000, 201600, 590400,
                          2404800, 7761600, 31104000, 1000000000000]
            }
        };
        const path = paths.languageData(language).settings;
        fs.writeFileSync(path, JSON.stringify(langSettings, null, 4));
    };

    settings.load = function (language) {
        dataMap[language] = require(paths.languageData(language).settings);
    };

    settings.save = function () {
        for (let language in dataMap) {
            const path = paths.languageData(language).settings;
            fs.writeFileSync(path, JSON.stringify(dataMap[language], null, 4));
        }
    };

    settings.setLanguage = function (language) {
        data = dataMap[language];
    };

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
