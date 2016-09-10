"use strict";

(function() {
const importDoc = document.currentScript.ownerDocument;
importDoc.addEventListener("DOMContentLoaded", () => {
const docContent = importDoc.getElementById("template").content;
class PinwallWidget extends TrainerSection {
    constructor () {
        this.hovering = false;
    }
    createdCallback () {
        const root = this.createShadowRoot();
        root.appendChild(docContent.cloneNode(true));
        this.contentFrame = root.getElementById("content-frame");
        const controlFrame = root.getElementById("control-frame");
        const windowFrame = root.getElementById("window");
        this.widgetNameLabel = root.getElementById("widget-name");
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
    }
    adjustToLanguage(language, secondary) {
    }
    set widgetName(value) {
        this.widgetNameLabel.textContent = value;
    }
    set removeCallback(value) {
        this._removeCallback = value;
        // this.removeButton.removeEventListener("click");
        // this.removeButton.addEventListener("click", value);
    }
}
window.PinwallWidget = document.registerElement("pinwall-widget",
    { prototype: PinwallWidget.prototype });
});
})();
