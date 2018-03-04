"use strict";

class HomeSection extends Section {
    constructor() {
        super("home");
        const promises = [];
        const fragment = document.createDocumentFragment();
        for (const { type } of dataManager.settings.pinwall) {
            const Type = customElements.get(type);
            const widget = new Type();
            fragment.appendChild(widget);
        }
        this.$("pinwall").appendChild(fragment);
    }

    async adjustToLanguage(language, secondary) {
        const widgets = this.$("pinwall").children;
        const promises = [];
        for (const widget of widgets) {
            promises.push(widget.adjustToLanguage(language, secondary));
        }
        await Promise.all(promises);
    }
}

customElements.define("home-section", HomeSection);
module.exports = HomeSection;
