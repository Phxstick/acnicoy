"use strict";

const fs = require("fs");

module.exports = function (paths) {
    const modules = { };
    for (let name of globals.modules) {
        modules[name] = require(paths.js.dataModule(name))(paths, modules);
    }
    // Define some aliases
    modules.languageSettings = modules["language-settings"];
    modules.vocabLists = modules["vocab-lists"];
    return modules;
};
