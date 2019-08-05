"use strict";

class SrsStatusOverview extends PinwallWidget {
    constructor() {
        super("srs-status-overview");
        this.minSpinnerDisplayTimePromise = null;
        this.$("update-button").addEventListener("click", () => {
            this.$("update-button").hide();
            this.$("updating-spinner").show("table-cell");
            this.minSpinnerDisplayTimePromise = utility.wait(740);
            events.emit("update-srs-status-cache");
        });
    }

    connectedCallback() {
        this.updateListener = () => this.update();
        events.onAll(["srs-scheme-edited", "update-srs-status",
                      "language-added", "language-removed",
                      "language-visibility-changed"], this.updateListener);
    }

    disconnectedCallback() {
        events.removeAll(["srs-scheme-edited", "update-srs-status",
                          "language-added", "language-removed",
                          "language-visibility-changed"], this.updateListener);
    }

    async update() {
        const languages = dataManager.languages.visible;
        const amounts = main.srsItemAmounts;
        let maxNumLevels = 1;
        for (const language of languages) {
            maxNumLevels = Math.max(maxNumLevels, amounts[language].length - 1);
        }

        // Remove all HTML except for the header row
        const container = this.$("container");
        while (container.children.length > 1) {
            container.removeChild(container.lastChild);
        }

        // Add header cells for the total count and each SRS level
        const headersHTML = ["<div>Total</div>"];
        for (let level = 1; level <= maxNumLevels; ++level) {
            headersHTML.push(`<div>${level}</div>`);
        }
        this.$("column-headers").innerHTML = headersHTML.join("");

        // Add dual row for each language
        const rowsHtml = [];
        for (const language of languages) {
            const amountsForLanguage = new Array(maxNumLevels + 1);
            amountsForLanguage[0] = { total: 0, due: 0 };
            for (let level = 1; level < amounts[language].length; ++level) {
                amountsForLanguage[level] = { total: 0, due: 0 };
                for (const mode of dataManager.test.modesForLanguage(language)){
                    const { due, scheduled } = amounts[language][level][mode];
                    amountsForLanguage[level].total += due + scheduled;
                    amountsForLanguage[level].due += due;
                }
                amountsForLanguage[0].total += amountsForLanguage[level].total;
                amountsForLanguage[0].due += amountsForLanguage[level].due;
            }
            for (let l = amounts[language].length; l <= maxNumLevels; ++l) {
                amountsForLanguage[l] = { total: "", due: "" };
            }
            const template = templates.get("srs-status-overview-row");
            const html = template({ language, amounts: amountsForLanguage });
            rowsHtml.push(html);
        }
        this.$("container").appendChild(
            utility.fragmentFromString(rowsHtml.join("")));

        // Wait minimum time before hiding spinner and showing button again
        if (this.minSpinnerDisplayTimePromise !== null) {
            await this.minSpinnerDisplayTimePromise;
        }
        this.$("update-button").show("table-cell");
        this.$("updating-spinner").hide();
    }
}

customElements.define("srs-status-overview", SrsStatusOverview);
module.exports = SrsStatusOverview;

