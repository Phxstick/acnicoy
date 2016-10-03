"use strict";

class PinwallWidget extends Widget {
    constructor (name, label) {
        super("pinwall-widget", true, true);
        const root = this.root;
        this.hovering = false;
        this.contentFrame = root.getElementById("content-frame");
        // this.contentFrame.style.position = "relative";
        const controlFrame = root.getElementById("control-frame");
        const windowFrame = root.getElementById("window");
        this.widgetNameLabel = root.getElementById("widget-name");
        this.widgetNameLabel.textContent = label;
        this.style.display = "inline-block";
        this.removeButton = root.getElementById("remove-button");
        windowFrame.addEventListener("mouseenter", (event) => {
            this.hovering = true;
        });
        windowFrame.addEventListener("mouseleave", (event) => {
            this.hovering = false;
            if (controlFrame.style.display === "block")
                controlFrame.style.display = "none";
        });
        document.addEventListener("keydown", (event) => {
            if (event.ctrlKey && this.hovering &&
                    controlFrame.style.display !== "block") {
                controlFrame.style.display = "block";
            }
        });
        document.addEventListener("keyup", (event) => {
            if (!event.ctrlKey && controlFrame.style.display === "block") {
                controlFrame.style.display = "none";
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
        this.root.appendChild(utility.parseHtmlFile(paths.html.widget(name)));
    }
    adjustToLanguage(language, secondary) {
    }
    open() {
    }
    set removeCallback(value) {
        this._removeCallback = value;
        // this.removeButton.removeEventListener("click");
        // this.removeButton.addEventListener("click", value);
    }
}

customElements.define("pinwall-widget", PinwallWidget);
module.exports = PinwallWidget;
