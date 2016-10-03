"use strict";

const fs = require("fs");
const Handlebars = require("handlebars");

const templates = {};

module.exports.get = function (name) {
    if (!(name in templates)) {
        const source = fs.readFileSync(paths.template(name), "utf-8");
        templates[name] = Handlebars.compile(source);
    }
    return templates[name];
};
