"use strict";

class AboutOverlay extends Overlay {
    constructor() {
        super("about");
        this.$("close-button").addEventListener("click", () => {
            this.resolve(null);
        });
        this.$("close-button-2").addEventListener("click", () => {
            this.resolve(null);
        });
        this.$("resources-link").addEventListener("click", () => {
            overlays.open("resources");
        });
    }
    
    open() {
        this.$("app-name").textContent = app.name;
        this.$("app-version").textContent = app.version;
        this.$("app-description").textContent = app.description;
        this.$("app-author").textContent = app.author;
    }
}

customElements.define("about-overlay", AboutOverlay);
module.exports = AboutOverlay;
