"use strict";

class SrsStatusTable extends PinwallWidget {
    constructor() {
        super("srs-status-table", "SRS status table");
        this.srsTable = this.root.getElementById("srs-table");
    }

    registerCentralEventListeners() {
        events.onAll(["current-srs-scheme-edited"], () => {
            this.fillSrsTable();
        });
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

customElements.define("srs-status-table", SrsStatusTable);
module.exports = SrsStatusTable;
