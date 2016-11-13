"use strict";

class AddKanjiPanel extends Panel {
    constructor() {
        super("add-kanji");
        this.allLevelsPopup = this.root.getElementById("all-srs-levels");
        this.meaningsLevelPopup =
            this.root.getElementById("srs-level-meanings");
        this.kunYomiLevelPopup = this.root.getElementById("srs-level-kun-yomi");
        this.onYomiLevelPopup = this.root.getElementById("srs-level-on-yomi");
        // Attach event handlers
        this.$("on-yomi-entry").enableKanaInput("kata");
        this.$("kun-yomi-entry").enableKanaInput("hira");
        this.root.getElementById("close-button").addEventListener(
            "click", () => main.closePanel("add-kanji"));
        this.root.getElementById("cancel-button").addEventListener(
            "click", () => main.closePanel("add-kanji"));
        this.root.getElementById("save-button").addEventListener(
            "click", () => this.save());
        this.allLevelsPopup.callback = (label, value) => {
            const idx = value - 1;
            this.meaningsLevelPopup.set(this.meaningsLevelPopup.children[idx]);
            this.onYomiLevelPopup.set(this.onYomiLevelPopup.children[idx]);
            this.kunYomiLevelPopup.set(this.kunYomiLevelPopup.children[idx]);
        };
    }

    open() {
        this.$("kanji-entry").style.width =
            `${this.$("kanji-entry").offsetHeight}px`;
        this.allLevelsPopup.set(this.allLevelsPopup.firstChild);
        this.meaningsLevelPopup.set(this.meaningsLevelPopup.firstChild);
        this.kunYomiLevelPopup.set(this.kunYomiLevelPopup.firstChild);
        this.onYomiLevelPopup.set(this.onYomiLevelPopup.firstChild);
        if (this.$("kanji-entry").textContent.length === 0)
            this.$("kanji-entry").focus();
        else
            this.$("meanings-entry").focus();
    }

    close() {
        this.$("kanji-entry").value = "";
        this.$("meanings-entry").value = "";
        this.$("on-yomi-entry").value = "";
        this.$("kun-yomi-entry").value = "";
    }

    adjustToLanguage(language, secondary) {
        if (language !== "Japanese") return;
        // Fill SRS level popup stack
        const numLevels = dataManager.srs.numLevels;
        const popups = [this.allLevelsPopup, this.meaningsLevelPopup,
                        this.kunYomiLevelPopup, this.onYomiLevelPopup];
        for (const popup of popups) {
            popup.empty();
            for (let i = 1; i < numLevels; ++i) popup.addOption(i);
        }
    }

    load(kanji) {
        this.$("kanji-entry").value = kanji;
        dataManager.content.getKanjiInfo(kanji).then((info) => {
            this.$("meanings-entry").value = info.meanings.join(", ");
            this.$("on-yomi-entry").value = info.onYomi.join(", ");
            this.$("kun-yomi-entry").value = info.kunYomi.join(", ");
        });
    }

    save() {
        const separator = dataManager.settings["add"]["separator"];
        const trim = (val, index, array) => { array[index] = val.trim(); }
        const notEmpty = (element) => element.length > 0;
        // Read values
        const kanji = this.$("kanji-entry").value.trim();
        const levels = {
            meanings: parseInt(this.meaningsLevelPopup.value),
            on_yomi: parseInt(this.onYomiLevelPopup.value),
            kun_yomi: parseInt(this.kunYomiLevelPopup.value)
        };
        const values = {
            meanings: this.$("meanings-entry").value.split(separator),
            on_yomi: this.$("on-yomi-entry").value.split(separator),
            kun_yomi: this.$("kun-yomi-entry").value.split(separator)
        };
        for (const attribute in values) {
            values[attribute].forEach(trim);
            values[attribute] = values[attribute].filter(notEmpty);
        }
        // Update status with error messages if something is missing
        if (kanji.length === 0) {
            dialogWindow.info("You need to enter a kanji to add.")
            return;
        }
        if (values.meanings.length === 0 && values.on_yomi.length === 0 &&
                values.kun_yomi.length === 0) {
            dialogWindow.info("You need to enter more details to add a kanji.");
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
            main.closePanel("add-kanji");
        });
    }
}

customElements.define("add-kanji-panel", AddKanjiPanel);
module.exports = AddKanjiPanel;
