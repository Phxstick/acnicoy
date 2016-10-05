"use strict";

const fs = require("fs");
const Handlebars = require("handlebars");

const templates = {};

/**
**  Return template with given name. Load it if it's not registered yet.
**/
module.exports.get = function (name) {
    if (!(name in templates)) {
        const source = fs.readFileSync(paths.template(name), "utf-8");
        templates[name] = Handlebars.compile(source);
    }
    return templates[name];
};

/**
**  Register a bunch of handlebars helpers.
**/

Handlebars.registerHelper("eachLetter", function(word) {
    let html = "";
    for (let letter of word) {
        html += `<span>${letter}</span>`;
    }
    return new Handlebars.SafeString(html);
});

Handlebars.registerHelper("join", function(words, separator) {
    return words.join(separator);
});

Handlebars.registerHelper("inc", function(number, amount) {
    return parseInt(number) + amount;
});

// Block helpers from here on

Handlebars.registerHelper("ifLargerThanOne", function(length, options) {
    return length > 1 ? options.fn(this) : options.inverse(this);
});
