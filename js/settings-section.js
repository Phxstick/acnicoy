"use strict";

utility.processDocument2(document.currentScript.ownerDocument, (docContent) => {
class SettingsSection extends TrainerSection {
    createdCallback() {
        this.root = this.createShadowRoot();
        this.root.appendChild(docContent);
        this.root.appendChild(this.root.getElementById("styles").content);
        eventEmitter.emit("done-loading");
    }
}
document.registerElement("settings-section",
    { prototype: SettingsSection.prototype });
});
