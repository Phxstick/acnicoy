"use strict";

class HomeSection extends Section {
    constructor() {
        super("home");
        this.pinwall = this.root.getElementById("pinwall");
        this.widgetAdder = this.root.getElementById("widget-adder");
        // TODO: Generalize
        this.widgetAdder.addEventListener(
            "click", () => this.addPinwallWidget("pinwall-note"));
    }

    open() {
        for (let i = 0; i < this.pinwall.children.length - 1; ++i) {
            this.pinwall.children[i].open();
        }
    }

    close() {
        this.saveWidgets();
    }

    adjustToLanguage(language, secondary) {
        // Clean up old widgets
        while (this.pinwall.children.length > 1) {
            this.pinwall.removeChild(this.pinwall.firstChild);
        }
        // Create new widgets according to pinwall.json file
        for (let widget of dataManager.pinwall.getWidgets()) {
            const object = this.addPinwallWidget(widget.type);
            if (widget.type === "pinwall-note") {
                // TODO: Set size
                object.setText(widget.text);
            }
            object.adjustToLanguage(language, secondary);
        }
    }

    addPinwallWidget(type) {
        const Type = customElements.get(type);
        const widget = new Type();
        this.pinwall.insertBefore(widget, this.widgetAdder);
        widget.removeCallback = () => this.pinwall.removeChild(widget);
        return widget;
    }

    saveWidgets() {
        dataManager.pinwall.clear();
        for (let i = 0; i < this.pinwall.children.length - 1; ++i) {
            const widget = this.pinwall.children[i];
            const entry = { type: widget.tagName.toLowerCase() };
            if (widget.tagName.toLowerCase() === "pinwall-note") {
                entry.text = widget.getText();
            }
            dataManager.pinwall.addWidget(entry);
        }
        dataManager.pinwall.save();
    }
}

customElements.define("home-section", HomeSection);
module.exports = HomeSection;
