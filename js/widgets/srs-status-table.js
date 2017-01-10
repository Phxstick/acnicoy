"use strict";

class SrsStatusTable extends Widget {
    constructor() {
        super("srs-status-table");
    }

    connectedCallback() {
        this.updateListener = () => this.fillSrsTable();
        events.onAll(["current-srs-scheme-edited", "update-srs-status"],
            this.updateListener);
    }

    disconnectedCallback() {
        events.removeAll(["current-srs-scheme-edited", "update-srs-status"],
            this.updateListener);
    }

    

    fillSrsTable() {
        dataManager.srs.getAmounts().then((amounts) => {
            const html = templates.get("srs-status-table")({
                amounts, modes: dataManager.test.modesForLanguage(main.language)
            });
            this.$("srs-table").innerHTML = html;
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
