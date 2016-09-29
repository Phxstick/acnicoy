"use strict";

utility.importDocContent(document.currentScript.ownerDocument, (docContent) => {
class SettingsSection extends TrainerSection {
    constructor() {
        super(docContent);
        eventEmitter.emit("done-loading");
    }
}
customElements.define("settings-section", SettingsSection);
});
