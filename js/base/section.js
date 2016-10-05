"use strict";

class Section extends Component {
    constructor(name, fontAwesome=true) {
        super(name + "-section", fontAwesome);
        this.root.appendChild(
                utility.parseHtmlFile(paths.html.section(name), true));
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

module.exports = Section;
