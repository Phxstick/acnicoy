"use strict";

class HomeSection extends Section {
    constructor() {
        super("home");
        this.pinwall = this.root.getElementById("pinwall");
    }

    open() {
        for (const child of this.pinwall.children) {
            child.open();
        }
    }

    close() {
        this.saveWidgets();
    }

    adjustToLanguage(language, secondary) {
        this.pinwall.innerHTML = "";
        const fragment = document.createDocumentFragment();
        for (const widget of dataManager.pinwall.getWidgets()) {
            const Type = customElements.get(widget.type);
            const object = new Type();
            object.removeCallback = () => this.pinwall.removeChild(object);
            if (widget.type === "pinwall-note") {
                // TODO: Set size
                object.setText(widget.text);
            }
            object.adjustToLanguage(language, secondary);
            fragment.appendChild(object);
        }
        this.pinwall.appendChild(fragment);
    }

    addPinwallWidget(type) {
        const Type = customElements.get(type);
        const widget = new Type();
        this.pinwall.appendChild(widget);
        widget.removeCallback = () => this.pinwall.removeChild(widget);
        return widget;
    }

    saveWidgets() {
        dataManager.pinwall.clear();
        for (const widget of this.pinwall.children) {
            const entry = { type: widget.tagName.toLowerCase() };
            if (widget.tagName.toLowerCase() === "pinwall-note") {
                entry.text = widget.getText();
            }
            dataManager.pinwall.addWidget(entry);
        }
    }
}

customElements.define("home-section", HomeSection);
module.exports = HomeSection;
