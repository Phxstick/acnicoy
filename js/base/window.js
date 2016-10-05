"use strict";

class Window extends Component {
    constructor(name, fontAwesome=true) {
        super(name + "-window", fontAwesome);
        this.root.appendChild(utility.parseHtmlFile(paths.html.window(name)));
    }
}

module.exports = Window;
