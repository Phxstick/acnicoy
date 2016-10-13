"use strict";

// TODO: Restrict character set for kanji entry

class AddKanjiPanel extends Panel {
    constructor() {
        super("add-kanji");
        // Store important DOM elements as properties
        this.kanjiEntry = this.root.querySelector(
            "textarea[name='kanji']");
        this.meaningsEntry = this.root.querySelector(
            "textarea[name='meanings']");
        this.onEntry = this.root.querySelector(
            "textarea[name='on']");
        this.kunEntry = this.root.querySelector(
            "textarea[name='kun']");
        this.allLevelsPopup = this.root.getElementById("all-levels");
        this.meaningsLevelPopup =
            this.root.getElementById("srs-level-meanings");
        this.kunYomiLevelPopup = this.root.getElementById("srs-level-kun");
        this.onYomiLevelPopup = this.root.getElementById("srs-level-on");
        // Attach event handlers
        this.onEntry.enableKanaInput("kata");
        this.kunEntry.enableKanaInput("hira");
        this.root.getElementById("close-button").addEventListener(
            "click", () => main.closePanel("add-kanji"));
        this.root.getElementById("cancel-button").addEventListener(
            "click", () => main.closePanel("add-kanji"));
        this.root.getElementById("save-button").addEventListener(
            "click", () => { this.save(); main.closePanel("add-kanji"); });
        this.allLevelsPopup.callback = (label, value) => {
            const idx = value - 1;
            this.meaningsLevelPopup.set(this.meaningsLevelPopup.children[idx]);
            this.onYomiLevelPopup.set(this.onYomiLevelPopup.children[idx]);
            this.kunYomiLevelPopup.set(this.kunYomiLevelPopup.children[idx]);
        };
    }

    open() {
        const kanjiStyle = window.getComputedStyle(this.kanjiEntry, null);
        this.kanjiEntry.style.width =
            kanjiStyle.getPropertyValue("font-size");
        this.kanjiEntry.style.display = "block";
        this.allLevelsPopup.set(this.allLevelsPopup.firstChild);
        this.meaningsLevelPopup.set(this.meaningsLevelPopup.firstChild);
        this.kunYomiLevelPopup.set(this.kunYomiLevelPopup.firstChild);
        this.onYomiLevelPopup.set(this.onYomiLevelPopup.firstChild);
        if (this.kanjiEntry.textContent.length === 0)
            this.kanjiEntry.focus();
        else
            this.meaningsEntry.focus();
    }

    close() {
        this.kanjiEntry.value = "";
        this.meaningsEntry.value = "";
        this.onEntry.value = "";
        this.kunEntry.value = "";
    }

    adjustToLanguage(language, secondary) {
        if (language !== "Japanese") return;
        // Fill SRS level popup stack
        const numLevels =
            dataManager.languageSettings["SRS"]["spacing"].length;
        const popups = [this.allLevelsPopup, this.meaningsLevelPopup,
                        this.kunYomiLevelPopup, this.onYomiLevelPopup];
        for (let popup of popups) {
            popup.empty();
            for (let i = 1; i < numLevels; ++i) popup.addOption(i);
        }
    }

    load(kanji) {
        this.kanjiEntry.value = kanji;
        dataManager.content.getKanjiInfo(kanji).then((info) => {
            this.meaningsEntry.value = info.meanings.join(", ");
            this.onEntry.value = info.onYomi.join(", ");
            this.kunEntry.value = info.kunYomi.join(", ");
        });
    }

    save() {
        const separator = dataManager.settings["add"]["separator"];
        const trim = (val, index, array) => { array[index] = val.trim(); }
        const notEmpty = (element) => element.length > 0;
        // Read values
        const kanji = this.kanjiEntry.value.trim();
        const levels = {
            meanings: parseInt(this.meaningsLevelPopup.value),
            on_yomi: parseInt(this.onYomiLevelPopup.value),
            kun_yomi: parseInt(this.kunYomiLevelPopup.value)
        };
        const values = {
            meanings: this.meaningsEntry.value.split(separator),
            on_yomi: this.onEntry.value.split(separator),
            kun_yomi: this.kunEntry.value.split(separator)
        };
        for (let attribute in values) {
            values[attribute].forEach(trim);
            values[attribute] = values[attribute].filter(notEmpty);
        }
        // Update status with error messages if something is missing
        if (kanji.length === 0) {
            main.updateStatus("The kanji field can not be empty!");
            return;
            // TODO: Also shortly highlight kanji entry field
        }
        if (values.meanings.length === 0 && values.on_yomi.length === 0 &&
                values.kun_yomi.length === 0) {
            main.updateStatus(
                "You need to enter some more information to add a kanji!");
            // TODO: Also shortly highlight 3 lower entries
            return;
        }
        return dataManager.kanji.add(kanji, values, levels).then((result) => {
            if (result === "added") {
                main.updateStatus(`Kanji ${kanji} has been added.`);
                events.emit("kanji-added", kanji);
            } else if (result === "updated") {
                main.updateStatus(`Kanji ${kanji} has been updated.`);
            } else if (result === "no-change") {
                main.updateStatus(`Kanji ${kanji} has not been changed.`);
            }
        });
    }
}

customElements.define("add-kanji-panel", AddKanjiPanel);
module.exports = AddKanjiPanel;
