"use strict";

class SrsStatusBar extends PinwallWidget {
    constructor() {
        super("srs-status-bar");
    }

    connectedCallback() {
        this.updateListener = () => this.update();
        events.onAll(["current-srs-scheme-edited", "update-srs-status"],
            this.updateListener);
    }

    disconnectedCallback() {
        events.removeAll(["current-srs-scheme-edited", "update-srs-status"],
            this.updateListener);
    }
    
    async adjustToLanguage(language, secondary) {
        await this.update();
    }

    async update() {
        const amounts = await dataManager.srs.getAmounts();
        this.$("levels").empty();
        this.$("amounts-total").empty();
        this.$("amounts-due").empty();
        const numLevels = dataManager.srs.currentScheme.numLevels;
        for (let level = 1; level <= numLevels; ++level) {
            // Display labels with each level
            const levelLabel = document.createElement("div");
            levelLabel.textContent = level;
            this.$("levels").appendChild(levelLabel);
            // Display total amount of SRS items in this level
            let amountTotal = 0;
            for (const mode of dataManager.test.modes) {
                amountTotal += amounts[level][mode].due;
                amountTotal += amounts[level][mode].scheduled;
            }
            const amountTotalLabel = document.createElement("div");
            amountTotalLabel.textContent = amountTotal;
            this.$("amounts-total").appendChild(amountTotalLabel);
            // Display amount of SRS items ready for review in this level
            let amountDue = 0;
            for (const mode of dataManager.test.modes) {
                amountDue += amounts[level][mode].due;
            }
            const amountDueLabel = document.createElement("div");
            amountDueLabel.textContent = amountDue;
            amountDueLabel.classList.toggle("highlighted", amountDue > 0);
            this.$("amounts-due").appendChild(amountDueLabel);
        }
    }
}

customElements.define("srs-status-bar", SrsStatusBar);
module.exports = SrsStatusBar;
