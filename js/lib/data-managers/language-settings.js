"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const settings = {};
    const dataMap = {};
    let data;
    let currentLanguage;

    settings.load = function (language) {
        dataMap[language] = require(paths.languageData(language).settings);
    };

    // TODO: First make sure everything is saved and changed properly
    // module.save = function () {
    //     const path = paths.languageData(currentLanguage).settings;
    //     fs.writeFileSync(path, JSON.stringify(module, null, 4));
    // };

    settings.setLanguage = function (language) {
        data = dataMap[language];
        currentLanguage = language;
        for (let entry in data) {
            settings[entry] = data[entry];
        }
    };

    return settings;
};
