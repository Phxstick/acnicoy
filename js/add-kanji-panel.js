"use strict";

// TODO: Capture focus within panel
// TODO: Restrict character set for kanji entry
// TODO: Load suggestion windows in load function
// TODO: Make on/kun entries kana-input-fields

$(document).ready(function() {
    const importDoc = document.currentScript.ownerDocument;
    const content = importDoc.getElementById("content");
    class AddKanjiPanel extends TrainerSection {
        createdCallback () {
            // Create shadow tree and load css
            this.root = this.createShadowRoot();
            this.root.appendChild(content);
            this.root.appendChild(this.root.getElementById("styles").content);
            // Store important DOM elements as properties
            this.kanjiEntry = this.root.querySelector(
                "textarea[name='kanji']");
            this.meaningsEntry = this.root.querySelector(
                "textarea[name='meanings']");
            this.onEntry = this.root.querySelector(
                "textarea[name='on']");
            this.kunEntry = this.root.querySelector(
                "textarea[name='kun']");
            this.levelPopup = this.root.getElementById("srs-level");
            this.meaningsLevelPopup =
                this.root.getElementById("srs-level-meanings");
            this.kunLevelPopup = this.root.getElementById("srs-level-kun");
            this.onLevelPopup = this.root.getElementById("srs-level-on");
            // Attach event handlers
            this.onEntry.enableKanaInput("kata");
            this.kunEntry.enableKanaInput("hira");
            this.root.getElementById("close-button").addEventListener(
                "click", () => main.closePanel(this, true));
            this.root.getElementById("cancel-button").addEventListener(
                "click", () => main.closePanel(this, true));
            this.root.getElementById("save-button").addEventListener(
                "click", () => this.save());
            eventEmitter.emit("done-loading");
        }
        open () {
            const kanjiStyle = window.getComputedStyle(this.kanjiEntry, null);
            this.kanjiEntry.style.width =
                kanjiStyle.getPropertyValue("font-size");
            this.kanjiEntry.style.display = "block";
            this.levelPopup.set(0);
            this.meaningsLevelPopup.set(0);
            this.kunLevelPopup.set(0);
            this.onLevelPopup.set(0);
            if (this.kanjiEntry.textContent.length === 0)
                this.kanjiEntry.focus();
            else
                this.meaningsEntry.focus();
        }
        close () {
            this.kanjiEntry.value = "";
            this.meaningsEntry.value = "";
            this.onEntry.value = "";
            this.kunEntry.value = "";
        }
        adjustToLanguage(language, secondary) {
            if (language !== "Japanese") return;
            if (this.doneSetting) return;
            // Fill SRS level popup stack
            const numLevels =
                dataManager.languageSettings["SRS"]["spacing"].length;
            const popups = [this.levelPopup, this.meaningsLevelPopup,
                            this.kunLevelPopup, this.onLevelPopup];
            for (let popup of popups) {
                popup.clear();
                for (let i = 1; i < numLevels; ++i) popup.appendItem(i);
                popup.set(0);
            }
            // Popup-stack stuff
            this.levelPopup.callback = (val, index) => {
                this.meaningsLevelPopup.set(index);
                this.onLevelPopup.set(index);
                this.kunLevelPopup.set(index);
            };
            // ... Just a workaround
            this.doneSetting = true;
        }
        load (kanji) {
            this.kanjiEntry.value = kanji;
            dataManager.content.getKanjiInfo(kanji).then((info) => {
                this.meaningsEntry.value = info.meanings.join(", ");
                this.onEntry.value = info.onYomi.join(", ");
                this.kunEntry.value = info.kunYomi.join(", ");
            });
        }
        save () {
            const separator = dataManager.settings["add"]["separator"];
            const trim = (val, index, array) => { array[index] = val.trim(); }
            const notEmpty = (element) => element.length > 0;
            // Read values
            const kanji = this.kanjiEntry.value;
            const levels = { meanings: this.meaningsLevelPopup.get(),
                             kunYomi: this.kunLevelPopup.get(),
                             onYomi: this.onLevelPopup.get() };
            let meanings = this.meaningsEntry.value.split(separator);
            let on = this.onEntry.value.split(separator);
            let kun = this.kunEntry.value.split(separator);
            meanings.forEach(trim);
            on.forEach(trim);
            kun.forEach(trim);
            meanings = meanings.filter(notEmpty);
            on = on.filter(notEmpty);
            kun = kun.filter(notEmpty);
            // Update status with error messages if something is missing
            if (kanji.length === 0) {
                main.updateStatus("The kanji field can not be empty!");
                return;
                // TODO: Also shortly highlight kanji entry field
            }
            if (meanings.length === 0 && on.length === 0 && kun.length === 0) {
                main.updateStatus(
                    "You need to enter some more information to add a kanji!");
                // TODO: Also shortly highlight 3 lower entries
                return;
            }
            dataManager.kanji.edit(kanji, meanings, on, kun, levels).then(
                (result) => {
                    eventEmitter.emit("kanji-edited", kanji, result);
                    if (result === "added")
                        main.updateStatus(`Kanji ${kanji} has been added.`);
                    else if (result === "updated")
                        main.updateStatus(`Kanji ${kanji} has been updated.`);
                    else if (result === "removed")
                        main.updateStatus(`Kanji ${kanji} has been removed.`);
                }
            );
            main.closePanel(this, true);
        }
    }
    document.registerElement("add-kanji-panel",
                             { prototype: AddKanjiPanel.prototype });
});
