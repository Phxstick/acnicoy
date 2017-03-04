"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const settings = {};
    let data;

    settings.isLoaded = function() {
        return data !== undefined;
    };

    settings.setDefault = function() {
        const defaultSettings = fs.readFileSync(paths.defaultSettings);
        fs.writeFileSync(paths.globalSettings, defaultSettings);
        settings.load();
    };

    settings.load = function() {
        data = require(paths.globalSettings);
    };

    settings.save = function() {
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
