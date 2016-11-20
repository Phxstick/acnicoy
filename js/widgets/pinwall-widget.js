"use strict";

class PinwallWidget extends Widget {
    constructor (name, label) {
        super("pinwall-widget");
        const root = this.root;
        this.hovering = false;
        this.contentFrame = root.getElementById("content-frame");
        // this.contentFrame.style.position = "relative";
        const controlFrame = root.getElementById("control-frame");
        const windowFrame = root.getElementById("window");
        this.widgetNameLabel = root.getElementById("widget-name");
        this.widgetNameLabel.textContent = label;
        this.removeButton = root.getElementById("remove-button");
        windowFrame.addEventListener("mouseenter", (event) => {
            this.hovering = true;
        });
        windowFrame.addEventListener("mouseleave", (event) => {
            this.hovering = false;
            controlFrame.hide();
        });
        document.addEventListener("keydown", (event) => {
            if (event.ctrlKey && this.hovering) {
                controlFrame.show();
            }
        });
        document.addEventListener("keyup", (event) => {
            if (!event.ctrlKey) {
                controlFrame.hide();
            }
        });
        this._removeCallback = () => { };
        this.removeButton.addEventListener("click", this._removeCallback);
        // Create new root in content frame and fill it with widget content
        this.root = this.contentFrame.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = `@import url(${paths.css(name)});`
        style.textContent += `@import url(${paths.fontAwesome})`;
        this.root.appendChild(style);
        this.root.appendChild(utility.parseHtmlFile(paths.html(name)));
    }

    set removeCallback(value) {
        this._removeCallback = value;
    }
}

customElements.define("pinwall-widget", PinwallWidget);
module.exports = PinwallWidget;
