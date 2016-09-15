"use strict";

const fs = require("fs");

module.exports = function(paths, modules) {
    const pinwall = {};
    const dataMap = {};

    let widgets;
    let path;

    pinwall.load = function (language) {
        dataMap[language] = require(paths.languageData(language).pinwall);
    };

    pinwall.setLanguage = function (language) {
        path = paths.languageData(language).pinwall;
        widgets = dataMap[language];
    };

    pinwall.save = function () {
        fs.writeFileSync(path, JSON.stringify(widgets, null, 4));
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
