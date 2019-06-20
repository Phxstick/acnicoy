"use strict";

const marked = require("marked");
const fs = require("fs");

class ResourcesOverlay extends Overlay {
    constructor() {
        super("resources");
        this.$("close-button").addEventListener("click", () => {
            this.resolve(null);
        });
        this.$("close-button-2").addEventListener("click", () => {
            this.resolve(null);
        });
        this.$("main-frame").innerHTML =
            marked(fs.readFileSync(paths.resourcesList, "utf8"));
    }
}

customElements.define("resources-overlay", ResourcesOverlay);
module.exports = ResourcesOverlay;
