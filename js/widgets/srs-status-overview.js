"use strict";

class SrsStatusOverview extends PinwallWidget {
    constructor() {
        super("srs-status-overview");
        this.minSpinnerDisplayTimePromise = Promise.resolve();
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
        // Add header for the total count and each SRS level
        const rowsHtml = [];
        const headersHTML = [];
        for (let level = 1; level <= maxNumLevels; ++level) {
            headersHTML.push(`<div>${level}</div>`);
        }
        rowsHtml.push(`
          <div id="header-row">
            <div style="display:none" id="update-button">
              <i class="fa fa-refresh"></i>Refresh</div>
            <div id="updating-spinner" class="pulsating-triple-dots">
              <div class="bounce1"></div>
              <div class="bounce2"></div>
              <div class="bounce3"></div>
            </div>
            <div>
              <div id="column-headers">
                <div>Total</div>
                ${headersHTML.join("")}
              </div>
            </div>
          </div>
        `);
        // Add dual row for each language
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
            rowsHtml.push(html)
        }
        this.$("container").innerHTML = rowsHtml.join("");
        this.$("update-button").addEventListener("click", () => {
            this.$("update-button").hide();
            this.$("updating-spinner").show("table-cell");
            this.minSpinnerDisplayTimePromise = utility.wait(740);
            events.emit("update-srs-status");
        });
        await this.minSpinnerDisplayTimePromise;
        this.$("update-button").show("table-cell");
        this.$("updating-spinner").hide();
    }
}

customElements.define("srs-status-overview", SrsStatusOverview);
module.exports = SrsStatusOverview;

