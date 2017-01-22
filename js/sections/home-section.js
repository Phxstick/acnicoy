"use strict";

class HomeSection extends Section {
    constructor() {
        super("home");
    }

    open() {
        for (const child of this.$("pinwall").children) {
            child.open();
        }
    }

    close() {
        this.saveWidgets();
    }

    adjustToLanguage(language, secondary) {
        const promises = [];
        const fragment = document.createDocumentFragment();
        for (const widgetData of dataManager.pinwall.getWidgets()) {
            const Type = customElements.get(widgetData.type);
            const widget = new Type();
            promises.push(Promise.resolve(widget.load(widgetData)));
            fragment.appendChild(widget);
        }
        return Promise.all(promises).then(() => utility.finishEventQueue())
        .then(() => {
            this.$("pinwall").innerHTML = "";
            this.$("pinwall").appendChild(fragment);
        });
    }

    addPinwallWidget(type) {
        const Type = customElements.get(type);
        const widget = new Type();
        this.$("pinwall").appendChild(widget);
        return widget;
    }

    saveWidgets() {
        dataManager.pinwall.clear();
        for (const widget of this.$("pinwall").children) {
            dataManager.pinwall.addWidget(widget.getSaveData());
        }
    }
}

customElements.define("home-section", HomeSection);
module.exports = HomeSection;
