"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const settings = {};

    settings.setDefault = function() {
        const defaultSettings = fs.readFileSync(paths.defaultSettings);
        fs.writeFileSync(paths.globalSettings, defaultSettings);
        settings.load();
    }

    settings.load = function() {
        const data = require(paths.globalSettings);
        for (let entry in data) {
            settings[entry] = data[entry];
        }
    };

    settings.save = function() {
        fs.writeFileSync(paths.globalSettings,
                JSON.stringify(settings, null, 4));
    };

    return settings;
};
