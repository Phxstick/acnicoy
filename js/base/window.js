"use strict";

class Window extends Component {
    constructor(name, onTop=false) {
        super(name + "-window");
        this.onTop = onTop;
    }

    open() {
    }

    close() {
    }
}

module.exports = Window;
