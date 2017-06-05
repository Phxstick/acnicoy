"use strict";

class AddHanziPanel extends Panel {
    constructor() {
        super("add-hanzi");
        this.$("readings-entry").enablePinyinInput();
        // Attach event handlers
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("add-hanzi"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("add-hanzi"));
        this.$("save-button").addEventListener(
            "click", () => this.save());
        this.$("all-srs-levels").callback = (label, value) => {
            this.$("srs-level-meanings").setByIndex(value - 1);
            this.$("srs-level-readings").setByIndex(value - 1);
        };
    }

    registerCentralEventListeners() {
        events.onAll(["language-changed", "current-srs-scheme-edited"], () => {
            // Fill SRS level popup stacks
            const numLevels = dataManager.srs.currentScheme.numLevels;
            const intervalTexts = dataManager.srs.currentScheme.intervalTexts;
            const popups = [
                this.$("all-srs-levels"), this.$("srs-level-meanings"),
                this.$("srs-level-readings")
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
            this.$("srs-level-readings").animate = animate;
        });
    }

    open() {
        this.$("hanzi-entry").style.width =
            `${this.$("hanzi-entry").offsetHeight}px`;
        this.$("hanzi-entry").focus();
    }

    close() {
        this.$("hanzi-entry").value = "";
        this.$("meanings-entry").value = "";
        this.$("readings-entry").value = "";
        this.$("all-srs-levels").setByIndex(0);
        this.$("srs-level-meanings").setByIndex(0);
        this.$("srs-level-readings").setByIndex(0);
    }

    save() {
        const separator = dataManager.settings["add"]["separator"];
        const trim = (val, index, array) => { array[index] = val.trim(); }
        const notEmpty = (element) => element.length > 0;
        // Read values
        const hanzi = this.$("hanzi-entry").value.trim();
        const levels = {
            meanings: parseInt(this.$("srs-level-meanings").value),
            readings: parseInt(this.$("srs-level-readings").value)
        };
        const values = {
            meanings: utility.parseEntries(
                this.$("meanings-entry").value, separator),
            readings: utility.parseEntries(
                this.$("readings-entry").value, separator)
        };
        for (const attribute in values) {
            values[attribute].forEach(trim);
            values[attribute] = values[attribute].filter(notEmpty);
        }
        // Update status with error messages if something is missing
        if (hanzi.length === 0) {
            dialogWindow.info("You need to enter a hanzi to add.")
            return;
        }
        if (values.meanings.length === 0 && values.readings.length === 0) {
            dialogWindow.info("You need to enter some details to add a hanzi.");
            return;
        }
        return dataManager.hanzi.add(hanzi, values, levels).then((result) => {
            if (result === "added") {
                main.updateStatus(`Hanzi ${hanzi} has been added.`);
                events.emit("hanzi-added", hanzi);
            } else if (result === "updated") {
                main.updateStatus(`Hanzi ${hanzi} has been updated.`);
                events.emit("hanzi-changed", hanzi);
            } else if (result === "no-change") {
                main.updateStatus(`Hanzi ${hanzi} has not been changed.`);
            }
            main.closePanel("add-hanzi");
        });
    }
}

customElements.define("add-hanzi-panel", AddHanziPanel);
module.exports = AddHanziPanel;
