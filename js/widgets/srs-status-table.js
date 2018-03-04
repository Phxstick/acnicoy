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

    async adjustToLanguage(language, secondary) {
        await this.update();
    }

    async update() {
        const amounts = await dataManager.srs.getAmounts();
        const html = templates.get("srs-status-table")({
            amounts, modes: dataManager.test.modes
        });
        this.$("srs-table").innerHTML = html;
        this.$("reload-srs").addEventListener(
            "click", () => events.emit("update-srs-status"));
    }
}

customElements.define("srs-status-table", SrsStatusTable);
module.exports = SrsStatusTable;
