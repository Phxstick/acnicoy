"use strict";

const fs = require("fs");

module.exports = function(paths, modules) {
    const pinwall = {};
    const dataMap = {};

    let widgets;

    pinwall.create = function (language, settings) {
        const initialPinwall = [ { type: "srs-status-bar" } ];
        const path = paths.languageData(language).pinwall;
        fs.writeFileSync(path, JSON.stringify(initialPinwall, null, 4));
    };

    pinwall.load = function (language) {
        dataMap[language] = require(paths.languageData(language).pinwall);
    };

    pinwall.setLanguage = function (language) {
        widgets = dataMap[language];
    };

    pinwall.save = function () {
        for (const language in dataMap) {
            const path = paths.languageData(language).pinwall;
            fs.writeFileSync(path, JSON.stringify(dataMap[language], null, 4));
        }
    };

    pinwall.clear = function () {
        widgets.length = 0;
    };

    pinwall.addWidget = function (widget) {
        widgets.push(widget);
    };

    pinwall.getWidgets = function () {
        return widgets;
    };

    return pinwall;
};
