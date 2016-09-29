"use strict";

utility.importDocContent(document.currentScript.ownerDocument, (docContent) => {
class HistorySection extends TrainerSection {
    constructor() {
        super(docContent);
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
        // Create a popup menu
        this.popupMenu = new PopupMenu();
        this.popupMenu.addItem("Reverse change", () =>
            main.updateStatus("Not implemented yet!"));
        // If the user scrolls almost to the table bottom, load more entries
        const displayAmount = 30;
        this.table.uponScrollingBelow(200, () => {
            if (this.nextRowIndex > 0 &&
                    this.nextRowIndex < this.rows.length)
                this.displayMoreEntries(displayAmount);
        });
        eventEmitter.emit("done-loading");
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
            htmlStrings.push(`<tr class="${data.type} ${data.column}"><td>${data.time}</td><td>${data.type}</td><td>${data.column}</td><td>${data.entry}</td><td>${data.details}</td></tr>`);
        }
        const fragment = document.createDocumentFragment();
        const rows = $(htmlStrings.join(''));
        for (let i = 0; i < rows.length; ++i) {
            const row = rows[i];
            this.popupMenu.attachTo(row);
            fragment.appendChild(row);
        }
        return fragment;
    }
    getToggleCallback(className) {
        return (state) => {
            const newDisplay = (state === true) ? "" : "none";
            this.flags[className] = state;
            switch (className) {
                case "added": case "deleted": case "modified":
                    for (let flag of ["entry", "translation", "reading"]) {
                        if (this.flags[flag] === true) {
                            const items = this.root.querySelectorAll(
                                `.${className}.${flag}`);
                            // TODO: Do with normal js?
                            $(items).css("display", newDisplay);
                        }
                    }
                    break;
                case "entry": case "translation": case "reading":
                    for (let flag of ["added", "deleted", "modified"]) {
                        if (this.flags[flag] === true) {
                            const items = this.root.querySelectorAll(
                                `.${className}.${flag}`);
                            // TODO: Do with normal js?
                            $(items).css("display", newDisplay);
                        }
                    }
                    break;
            }
            utility.finishEventQueue().then(() =>
                utility.calculateHeaderCellWidths(this.table, this.tableHead));
        };
    }
}
customElements.define("history-section", HistorySection);
});
