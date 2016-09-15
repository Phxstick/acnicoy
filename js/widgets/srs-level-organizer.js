"use strict";

// Do I only have access to the "paths" global if this is in a function...?
(function() {
const importDoc = document.currentScript.ownerDocument;
importDoc.addEventListener("DOMContentLoaded", () => {
const docContent = importDoc.getElementById("template").content;
class SrsLevelOrganizer extends TrainerSection {
    constructor () {
        this.dragging = false;
    }
    createdCallback () {
        this.root = this.createShadowRoot();
        this.root.appendChild(docContent.cloneNode(true));
        const style = document.createElement("style");
        style.textContent =
            `@import url(${paths.css("srs-level-organizer")});
             @import url(${paths.fontAwesome});`;
        this.root.appendChild(style);
    }
    adjustToLanguage(language, secondary) {
    }
}
window.PinwallWidget = document.registerElement("srs-level-organizer",
    { prototype: SrsLevelOrganizer.prototype });
});
})();
