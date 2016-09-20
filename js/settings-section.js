"use strict";

utility.processDocument2(document.currentScript.ownerDocument, (docContent) => {
class SettingsSection extends TrainerSection {
    constructor() {
        super();
        this.root = this.createShadowRoot();
        this.root.appendChild(docContent);
        this.root.appendChild(this.root.getElementById("styles").content);
        eventEmitter.emit("done-loading");
    }
}
customElements.define("settings-section", SettingsSection);
});
