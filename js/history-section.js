"use strict";

utility.processDocument2(document.currentScript.ownerDocument, (docContent) => {
class HistorySection extends TrainerSection {
    createdCallback () {
        this.root = this.createShadowRoot();
        this.root.appendChild(docContent);
        this.root.appendChild(this.root.getElementById("styles").content);
        this.flags = { added: true, deleted: true, modified: true,
                       entry: true, translation: true, reading: true };
        // Define variable values
        this.rows = null;  // All rows from edit_history table in the database
        this.lastId = null;  // ID of last entry in the history
        // Store important DOM elements as members
        this.table = this.root.getElementById("table-body");
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
        const criticalScrollDistance = 200;
        const displayAmount = 30;
        this.table.addEventListener("scroll", (event) => {
            const maxScroll = this.table.scrollHeight - this.table.clientHeight;
            const distanceToEnd = maxScroll - this.table.scrollTop;
            if (distanceToEnd < criticalScrollDistance
                    && this.nextRowIndex < this.rows.length)
                this.displayMoreEntries(displayAmount);
        });
        eventEmitter.emit("done-loading");
        // Make sure to update table when the vocabulary has been edited
        eventEmitter.on("vocab-changed", () => this.updateTable());
    }
    open() {
        utility.finishEventQueue().then(() => this.calculateHeaderCellWidths());
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
            setTimeout(() => this.calculateHeaderCellWidths(), 100);
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
        const fragment = document.createDocumentFragment();
        const template = this.root.getElementById("row-template").innerHTML;
        const rowTemplate = jsrender.templates(template);
        for (let entry of entries) {
            const time = new Date(Math.floor(parseInt(entry.time) * 1000));
            const data = { time: time.toDateString(), column: entry.column,
                           entry: entry.old_entry };
            switch (entry.type) {
                case "A":
                    data.type = "added";
                    switch (entry.column) {
                        case "entry":
                            data.details = `【${entry.new_readings}】 ` + 
                                           `${entry.new_translations}`;
                            data.entry = entry.new_entry;
                            break;
                        case "translation":
                            data.details = `[+] ${entry.new_translations}`;
                            break;
                        case "reading":
                            data.details = `[+] ${entry.new_readings}`;
                            break;
                    }
                    break;
                case "D":
                    data.type = "deleted";
                    switch (entry.column) {
                        case "entry":
                            data.details = `【${entry.old_readings}】 ` +
                                           `${entry.old_translations}`;
                            break;
                        case "translation":
                            data.details = `[-] ${entry.old_translations}`;
                            break;
                        case "reading":
                            data.details = `[-] ${entry.old_readings}`;
                            break;
                    }
                    break;
                case "R":
                    data.type = "modified";
                    switch (entry.column) {
                        case "entry":
                            data.details = `Changed to ${entry.new_entry}`; 
                            break;
                        case "translation":
                            data.details = `${entry.old_translations} --> ` +
                                           `${entry.new_translations}`;
                            break;
                        case "reading":
                            data.details = `${entry.old_readings} --> ` +
                                           `${entry.new_readings}`;
                            break;
                    }
                    break;
            }
            // Construct the row
            // TODO: Store ID as invisible table data
            const newNode = $(rowTemplate.render(data))[0];
            this.popupMenu.attachTo(newNode);
            fragment.appendChild(newNode);
        }
        return fragment;
    }
    calculateHeaderCellWidths() {
        const headerCells = this.root.querySelectorAll("#history th");
        const tableCells = this.root.querySelectorAll(
                "#history tbody tr:first-child td");
        if (tableCells.length === 0) return; // TODO: Make all equal width.
        for (let i = 0; i < headerCells.length; ++i) {
            headerCells[i].style.width = tableCells[i].offsetWidth + "px";
        }
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
            setTimeout(() => this.calculateHeaderCellWidths(), 100);
        };
    }
}
document.registerElement("history-section",
    { prototype: HistorySection.prototype });
});
