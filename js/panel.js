"use strict";

class Panel extends Component {
    constructor(name, fontAwesome=true) {
        super(name + "-panel", fontAwesome);
        this.root.appendChild(
                utility.parseHtmlFile(paths.html.panel(name), true));
    }
    open() {
    }
    confirmClose() {
        return true;
    }
    close() {
    }
    adjustToLanguage(language, secondary) {
    }
}

module.exports = Panel;
