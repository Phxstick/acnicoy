"use strict";

const fs = require("fs");
const testSectionColorSchemes = require(paths.testSectionColorSchemes);

module.exports = function (paths, modules) {
    const settings = {};
    const defaultSettings = require(paths.defaultSettings);
    let data;

    // If combinations for new shortcuts would cause collision, deactivate them
    function updateShortcuts(assigned, defaults) {
        const assignedKeyCombinations = new Set();
        for (const shortcutName in assigned) {
            assignedKeyCombinations.add(assigned[shortcutName]);
        }
        for (const shortcutName in defaults) {
            if (!assigned.hasOwnProperty(shortcutName)) {
                if (assignedKeyCombinations.has(defaults[shortcutName])) {
                    assigned[shortcutName] = "";
                } else {
                    assigned[shortcutName] = defaults[shortcutName];
                }
            }
        }
    }

    // Recursively fills in missing values in user settings using default values
    function assureCompleteness(settingsObj, defaultsObj) {
        for (const key in defaultsObj) {
            if (!settingsObj.hasOwnProperty(key)) {
                settingsObj[key] = defaultsObj[key];
            } else if (defaultsObj[key] instanceof Object &&
                    !Array.isArray(defaultsObj[key])) {
                // Special handling for shortcuts
                if (key === "shortcuts") {
                    updateShortcuts(settingsObj[key], defaultsObj[key]);
                } else {
                    assureCompleteness(settingsObj[key], defaultsObj[key]);
                }
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

    settings.getTestSectionColors = function(schemeName, multiColor) {
        if (schemeName === undefined) schemeName = data.design.testColorScheme;
        if (multiColor === undefined) multiColor = data.test.useBackgroundColors
        let colorScheme;
        if (schemeName === "custom") {
            if (multiColor) {
                colorScheme = data.design.customTestMulticolorScheme;
            } else {
                colorScheme = data.design.customTestUnicolorScheme;
            }
        } else {
            const groupKey = multiColor ? "multicolor" : "unicolor";
            // Check if specified scheme is available in this program version
            if (schemeName in testSectionColorSchemes[groupKey]) {
                colorScheme = testSectionColorSchemes[groupKey][schemeName];
            } else {
                colorScheme = testSectionColorSchemes[groupKey]["default"];
            }
        }
        return colorScheme;
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
