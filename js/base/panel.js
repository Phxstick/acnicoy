"use strict";

class Panel extends Component {
    constructor(name) {
        super(name + "-panel");
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
