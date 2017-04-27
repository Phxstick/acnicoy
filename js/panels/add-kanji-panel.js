"use strict";

class AddKanjiPanel extends Panel {
    constructor() {
        super("add-kanji");
        // Attach event handlers
        this.$("on-yomi-entry").enableKanaInput("kata");
        this.$("kun-yomi-entry").enableKanaInput("hira");
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("add-kanji"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("add-kanji"));
        this.$("save-button").addEventListener(
            "click", () => this.save());
        this.$("all-srs-levels").callback = (label, value) => {
            this.$("srs-level-meanings").setByIndex(value - 1);
            this.$("srs-level-on-yomi").setByIndex(value - 1);
            this.$("srs-level-kun-yomi").setByIndex(value - 1);
        };
    }

    registerCentralEventListeners() {
        events.onAll(["language-changed", "current-srs-scheme-edited"], () => {
            // Fill SRS level popup stacks
            const numLevels = dataManager.srs.currentScheme.numLevels;
            const intervalTexts = dataManager.srs.currentScheme.intervalTexts;
            const popups = [
                this.$("all-srs-levels"), this.$("srs-level-meanings"),
                this.$("srs-level-kun-yomi"), this.$("srs-level-on-yomi")
            ];
            for (const popup of popups) {
                popup.empty();
                for (let level = 1; level <= numLevels; ++level) {
                    const option = popup.addOption(level);
                    option.dataset.tooltip = intervalTexts[level];
                }
            }
            for (const popup of popups) {
                popup.setByIndex(0);
            }
        });
        events.on("settings-design-animate-popup-stacks", () => {
            const animate = dataManager.settings.design.animatePopupStacks;
            this.$("all-srs-levels").animate = animate;
            this.$("srs-level-meanings").animate = animate;
            this.$("srs-level-on-yomi").animate = animate;
            this.$("srs-level-kun-yomi").animate = animate;
        });
    }

    open() {
        this.$("kanji-entry").style.width =
            `${this.$("kanji-entry").offsetHeight}px`;
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
        this.$("all-srs-levels").setByIndex(0);
        this.$("srs-level-meanings").setByIndex(0);
        this.$("srs-level-kun-yomi").setByIndex(0);
        this.$("srs-level-on-yomi").setByIndex(0);
    }

    save() {
        const separator = dataManager.settings["add"]["separator"];
        const trim = (val, index, array) => { array[index] = val.trim(); }
        const notEmpty = (element) => element.length > 0;
        // Read values
        const kanji = this.$("kanji-entry").value.trim();
        const levels = {
            meanings: parseInt(this.$("srs-level-meanings").value),
            on_yomi: parseInt(this.$("srs-level-on-yomi").value),
            kun_yomi: parseInt(this.$("srs-level-kun-yomi").value)
        };
        const values = {
            meanings: utility.parseEntries(
                this.$("meanings-entry").value, separator),
            on_yomi: utility.parseEntries(
                this.$("on-yomi-entry").value, separator),
            kun_yomi: utility.parseEntries(
                this.$("kun-yomi-entry").value, separator)
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
                events.emit("kanji-changed", kanji);
            } else if (result === "no-change") {
                main.updateStatus(`Kanji ${kanji} has not been changed.`);
            }
            main.closePanel("add-kanji");
        });
    }
}

customElements.define("add-kanji-panel", AddKanjiPanel);
module.exports = AddKanjiPanel;
