"use strict";

class Overlay extends Component {
    constructor(name, {
            mode = "slide-down",
            speed = 300,
            distance = 150 } = {}) {
        super(name + "-overlay", true);
        this.name = name;
        this.displayOptions = { mode, speed, distance };
        this.root.appendChild(utility.parseHtmlFile(paths.html.overlay(name)));
    }

    /**
    **  Called before the overlay is being opened.
    **/
    open() {
    }

    /**
    **  Called before the overlay is being closed.
    **/
    close() {
    }
}

module.exports = Overlay;
