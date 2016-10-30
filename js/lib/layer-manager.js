"use const";

const cssContent = utility.parseCssFile(paths.layers);
const layers = {};

for (const key in cssContent[":root, :host"]) {
    layers[key.slice(2, -6)] = parseInt(cssContent[":root, :host"][key]);
}

module.exports = layers;
