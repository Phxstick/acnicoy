"use strict";

const menuItems = contextMenu.registerItems({
    "copy-email-address": {
        label: "Copy address",
        click: ({ currentNode }) => {
            clipboard.writeText(currentNode.textContent);
        }
    }
});

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
        this.$("app-author-name").textContent = app.author.name;
        this.$("app-author-email").textContent = app.author.email;
        this.$("app-author-email").href = `mailto:${app.author.email}`;
        this.$("app-author-email").contextMenu(menuItems,["copy-email-address"])
    }
}

customElements.define("about-overlay", AboutOverlay);
module.exports = AboutOverlay;
