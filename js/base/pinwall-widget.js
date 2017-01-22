"use strict";

class PinwallWidget extends Widget {
    constructor(type) {
        super(type);
        this.widgetType = type;
    }

    load(data) {
    }

    getSaveData() {
        return { type: this.widgetType };
    }

    open() {
    }
}

module.exports = PinwallWidget;
