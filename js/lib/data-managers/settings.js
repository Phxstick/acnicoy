"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const settings = require(paths.globalSettings);
    settings.save = () => fs.writeFileSync(paths.globalSettings,
                                           JSON.stringify(settings, null, 4));
    return settings;
};
