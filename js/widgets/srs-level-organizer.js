"use strict";

class SrsLevelOrganizer extends Widget {
    constructor () {
        super("srs-level-organizer");
        this.dragging = false;
    }
}

customElements.define("srs-level-organizer", SrsLevelOrganizer);
module.exports = SrsLevelOrganizer;
