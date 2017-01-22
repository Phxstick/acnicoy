"use strict";

class SrsStatusTable extends PinwallWidget {
    constructor() {
        super("srs-status-table");
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

    update() {
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
        return this.update();
    }
}

customElements.define("srs-status-table", SrsStatusTable);
module.exports = SrsStatusTable;
