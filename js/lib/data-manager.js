"use strict";

const fs = require("fs");

module.exports = function (paths) {
    const modules = { };
    for (let name in paths.modules)
        modules[name] = require(paths.modules[name])(paths, modules);
    return modules;
};
