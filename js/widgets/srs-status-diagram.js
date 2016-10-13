"use strict";

class SrsStatusDiagram extends PinwallWidget {
    constructor() {
        super("srs-status-diagram", "SRS status diagram");
        this.srsTable = this.root.getElementById("srs-table");
    }

    fillSrsTable() {
        dataManager.srs.getAmounts().then((amounts) => {
            const html = templates.get("srs-status-table")({
                amounts, modes: dataManager.test.modesForLanguage(main.language)
            });
            this.srsTable.innerHTML = html;
            this.$("reload-srs").addEventListener(
                    "click", () => this.fillSrsTable());
            main.updateTestButton();
        });
    }

    open() {
        this.fillSrsTable();
    }

    adjustToLanguage(language, secondary) {
        this.fillSrsTable();
    }
}

customElements.define("srs-status-diagram", SrsStatusDiagram);
module.exports = SrsStatusDiagram;
