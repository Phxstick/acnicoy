"use strict";

class Overlay extends Component {
    constructor(name, {
            mode = "slide-down",
            speed = 300,
            distance = 60 } = {}) {
        super(name + "-overlay");
        this.name = name;
        this.displayOptions = { mode, speed, distance };
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
