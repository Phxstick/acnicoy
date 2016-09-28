"use const";

const fs = require("fs");

const cssContent = utility.parseCssText(fs.readFileSync(
                       paths.layers, { encoding: "utf-8" }));
const layers = {};

for (let key in cssContent[":root, :host"]) {
    layers[key.slice(2, -6)] = parseInt(cssContent[":root, :host"][key]);
}

module.exports = layers;
