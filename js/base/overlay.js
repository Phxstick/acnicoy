"use strict";

class Overlay extends Component {
    constructor(name, fontAwesome=true) {
        super(name + "-overlay", fontAwesome);
        this.name = name;
        this.root.appendChild(utility.parseHtmlFile(paths.html.overlay(name)));
    }

    /**
    **  Called before the overlay is being opened.
    **/
    open() {
    }

    /**
    **  Close this overlay using the overlay manager.
    **/
    close() {
        overlay.close(this.name);
    }
}

module.exports = Overlay;
