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
        return dataManager.srs.getAmounts().then((amounts) => {
            const html = templates.get("srs-status-table")({
                amounts, modes: dataManager.test.modes
            });
            this.$("srs-table").innerHTML = html;
            this.$("reload-srs").addEventListener(
                "click", () => events.emit("update-srs-status"));
        });
    }

    open() {
        return this.fillSrsTable();
    }

    adjustToLanguage(language, secondary) {
        return this.fillSrsTable();
    }
}

customElements.define("srs-status-table", SrsStatusTable);
module.exports = SrsStatusTable;
