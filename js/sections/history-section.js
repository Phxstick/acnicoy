"use strict";

class HistorySection extends Section {
    constructor() {
        super("history");
        this.entryTemplate = templates.get("history-entry");
        this.flags = { added: true, deleted: true, modified: true,
                       entry: true, translation: true, reading: true };
        // Define variable values
        this.rows = null;  // All rows from edit_history table in the database
        this.lastId = null;  // ID of last entry in the history
        // Store important DOM elements as members
        this.table = this.root.getElementById("history-table-body");
        this.tableHead = this.root.getElementById("history-table-head");
        // Assign callbacks
        for (let flag in this.flags) {
            this.root.getElementById(`${flag}-filter`).callback =
                this.getToggleCallback(flag);
        }
        // If the user scrolls almost to the table bottom, load more entries
        const displayAmount = 30;
        this.table.uponScrollingBelow(200, () => {
            if (this.nextRowIndex > 0 &&
                    this.nextRowIndex < this.rows.length)
                this.displayMoreEntries(displayAmount);
        });
        // Make sure to update table when the vocabulary has been edited
        eventEmitter.on("vocab-changed", () => this.updateTable());
    }

    open() {
        utility.finishEventQueue().then(() =>
            utility.calculateHeaderCellWidths(this.table, this.tableHead));
    }

    adjustToLanguage(language, secondary) {
        this.nextRowIndex = 0;  // Index of next row to be been displayed
        // Get all rows from the database first, then fill history table with
        // entries up until load limit
        dataManager.history.get().then((rows) => {
            this.rows = rows;
            this.table.empty();
            this.displayMoreEntries(50);
            if (rows.length > 0)
                this.lastId = rows[0].id;
        });
    }

    updateTable() {
        dataManager.history.get(this.lastId).then((rows) => {
            this.table.prependChild(this.createTableRows(rows));
            utility.finishEventQueue().then(() =>
                utility.calculateHeaderCellWidths(this.table, this.tableHead));
            if (rows.length > 0)
                this.lastId = rows[0].id;
        });
    }

    displayMoreEntries(amount) {
        const limit = Math.min(this.nextRowIndex + amount, this.rows.length);
        this.table.appendChild(
            this.createTableRows(this.rows.slice(this.nextRowIndex, limit)));
        this.nextRowIndex = limit;
    }

    // TODO: Differentiate term "rows" (database rows <-> table rows)...
    createTableRows(entries) {
        const htmlStrings = [];
        for (let entry of entries) {
            const date = new Date(Math.floor(parseInt(entry.time) * 1000));
            const data = { time: utility.getShortDateString(date),
                           column: entry.column,
                           entry: entry.old_entry };
            switch (entry.type) {
                case "A":
                    data.type = "added";
                    switch (entry.column) {
                        case "entry":
                            const readings = entry.new_readings.length > 0 ?
                                `【${entry.new_readings}】 ` : "";
                            data.details = `${readings}` + 
                                           `${entry.new_translations}`;
                            data.entry = entry.new_entry;
                            break;
                        case "translation":
                            data.details = `<i class="fa fa-plus"></i>` +
                                `<span>${entry.new_translations}</span>`;
                            break;
                        case "reading":
                            data.details = `<i class="fa fa-plus"></i>` +
                                `<span>${entry.new_readings}</span>`;
                            break;
                    }
                    break;
                case "D":
                    data.type = "deleted";
                    switch (entry.column) {
                        case "entry":
                            const readings = entry.old_readings.length > 0 ?
                                `【${entry.old_readings}】 ` : "";
                            data.details = `${readings}` + 
                                           `${entry.old_translations}`;
                            break;
                        case "translation":
                            data.details = `<i class="fa fa-minus"></i>` +
                                `<span>${entry.old_translations}</span>`;
                            break;
                        case "reading":
                            data.details = `<i class="fa fa-minus"></i>` +
                                `<span>${entry.old_readings}</span>`;
                            break;
                    }
                    break;
                case "R":
                    data.type = "modified";
                    switch (entry.column) {
                        case "entry":
                            data.details = `<i class="fa fa-arrow-right">
                                            <span>${entry.new_entry}</span>`; 
                            break;
                        case "translation":
                            data.details =
                                `<span>${entry.old_translations}</span>` +
                                `<i class="fa fa-arrow-right"></i>` +
                                `<span>${entry.new_translations}</span>`;
                            break;
                        case "reading":
                            data.details =
                                `<span>${entry.old_readings}</span>` +
                                `<i class="fa fa-arrow-right"></i>` +
                                `<span>${entry.new_readings}</span>`;
                            break;
                    }
                    break;
            }
            // Construct the row
            // TODO: Store ID as invisible table data
            htmlStrings.push(this.entryTemplate(data));
        }
        return utility.fragmentFromString(htmlStrings.join(''));
    }

    getToggleCallback(className) {
        return (state) => {
            const newDisplay = (state === true) ? "" : "none";
            this.flags[className] = state;
            let flags;
            switch (className) {
                case "added": case "deleted": case "modified":
                    flags = ["entry", "translation", "reading"]; break;
                case "entry": case "translation": case "reading":
                    flags = ["added", "deleted", "modified"]; break;
            }
            for (let flag of flags) {
                if (this.flags[flag]) {
                    const items = this.root.querySelectorAll(
                        `.${className}.${flag}`);
                    for (let i = 0; i < items.length; ++i) {
                        items[i].style.display = newDisplay;
                    }
                }
            }
            utility.finishEventQueue().then(() =>
                utility.calculateHeaderCellWidths(this.table, this.tableHead));
        };
    }
}

customElements.define("history-section", HistorySection);
module.exports = HistorySection;
