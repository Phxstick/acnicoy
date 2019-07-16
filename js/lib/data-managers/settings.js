"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const settings = {};
    const defaultSettings = require(paths.defaultSettings);
    let data;

    // Recursively fills in missing values in user settings using default values
    function assureCompleteness(settingsObj, defaultsObj) {
        for (const key in defaultsObj) {
            if (!settingsObj.hasOwnProperty(key)) {
                settingsObj[key] = defaultsObj[key];
            } else if (defaultsObj[key] instanceof Object &&
                    !Array.isArray(defaultsObj[key])) {
                assureCompleteness(settingsObj[key], defaultsObj[key]);
            }
        }
    }

    settings.isLoaded = function () {
        return data !== undefined;
    };

    settings.initialize = function () {
        if (fs.existsSync(paths.globalSettings)) {
            data = require(paths.globalSettings);
            assureCompleteness(data, defaultSettings);
        } else {
            data = defaultSettings;
            settings.saveGlobal();
        }
    };

    settings.saveGlobal = function () {
        fs.writeFileSync(paths.globalSettings, JSON.stringify(data, null, 4));
    };

    return new Proxy(settings, {
        get: (target, key) => {
            if (data !== undefined && Reflect.has(data, key)) return data[key];
            else return target[key];
        },
        set: (target, key, value) => {
            if (data !== undefined && Reflect.has(data, key)) data[key] = value;
            else throw new Error("You cannot create new settings!")
        }
    });
};
