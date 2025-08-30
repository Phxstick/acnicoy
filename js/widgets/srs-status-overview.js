"use strict";

const { Random } = require("random-js");
const random = new Random();

class SrsStatusOverview extends PinwallWidget {
    constructor() {
        super("srs-status-overview");
        this.selectedFields = new Set();
        this.selectedAmount = 0;
        this.onSelectionChange = (isNotEmpty) => { };

        // Update view while displaying spinner when clicking "refresh" button
        this.minSpinnerDisplayTimePromise = null;
        this.$("update-button").addEventListener("click", () => {
            this.$("update-button").hide();
            this.$("updating-spinner").show("table-cell");
            this.minSpinnerDisplayTimePromise = utility.wait(740);
            events.emit("update-srs-status-cache");
        });

        // Make fields light up on hovering while pressing Ctrl or Shift
        window.addEventListener("keydown", (event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey)
                this.$("container").classList.add("modifier-pressed");
        });
        window.addEventListener("keyup", (event) => {
            if (!event.ctrlKey && !event.metaKey && !event.shiftKey)
                this.$("container").classList.remove("modifier-pressed");
        });

        // Allow selecting specific levels of specific languages for review
        let overviewClicked = false;
        this.$("container").addEventListener("click", (event) => {
            const field = event.target;

            // Either Ctrl or Shift must be pressed, Ctrl preserves selection
            const modifierUsed = event.ctrlKey || event.metaKey || event.shiftKey;
            if (!modifierUsed) return;
            if (!event.ctrlKey && !event.metaKey) this.clearSelection();
            overviewClicked = true;

            // Click a language (or its total-count) to select all levels for it
            if (field.classList.contains("language-label") ||
                    field.classList.contains("all-items")) {
                let row = field.parentNode;
                if (!row.classList.contains("row-frame"))
                    row = row.parentNode;
                let languageRows = [row];

                // If shift is pressed, also do this for all languages above
                if (event.shiftKey) {
                    while (row.previousElementSibling.id !== "header-row") {
                        languageRows.push(row.previousElementSibling);
                        row = row.previousElementSibling;
                    }
                }

                // Find out whether all levels for these languages are selected
                let allSelected = true;
                for (const row of languageRows) {
                    const fields = row.children[1].children;
                    for (let i = 1; i < fields.length; ++i) {
                        if (!this.selectedFields.has(fields[i])) {
                            allSelected = false;
                            break;
                        }
                    }
                }

                // Select missing levels, or deselect all if all is selected
                for (const row of languageRows) {
                    const fields = row.children[1].children;
                    for (let i = 1; i < fields.length; ++i) {
                        this.toggleSelected(fields[i], !allSelected);
                    }
                }

            // Click an SRS level header to select this level for all languages
            } else if (field.parentNode === this.$("column-headers")) {

                // If shift is pressed, also do this for all levels below;
                // if "total" field is clicked, do it for all existing levels
                const level = parseInt(field.textContent);
                const all = field === field.parentNode.firstElementChild;
                const start = event.shiftKey || all ? 1 : level;
                const end = all ? field.parentNode.children.length : level + 1;

                // Get the table row for each language in random order
                const numLanguages = this.$("container").children.length - 1;
                const rows = [];
                for (let i = 1; i < numLanguages + 1; ++i) {
                    rows.push(this.$("container").children[i].children[1]);
                }
                random.shuffle(rows);

                // Find out whether all languages for these levels are selected
                let allSelected = true;
                for (let i = start; i < end; ++i) {
                    for (const row of rows) {
                        if (!this.selectedFields.has(row.children[i])) {
                            allSelected = false;
                            break;
                        }
                    }
                }

                // Select missing levels, or deselect all if all is selected
                for (let i = start; i < end; ++i) {
                    for (const row of rows) {
                        this.toggleSelected(row.children[i], !allSelected);
                    }
                }

            // Click a table entry to select certain level for certain language
            } else if (field.parentNode.classList.contains("subrow")) {
                if (!event.shiftKey) this.toggleSelected(field);
                else {
                    // If shift is pressed, select all levels up to this one
                    // (unless all levels are already selected, then unselect)
                    let allSelected = true;
                    let fieldIndex;
                    const otherFields = field.parentNode.children;
                    for (let i = 1; i < otherFields.length; ++i) {
                        if (!this.selectedFields.has(otherFields[i])) {
                            allSelected = false;
                        }
                        if (field === otherFields[i]) {
                            fieldIndex = i + 1;
                            break;
                        }
                    }
                    for (let i = 1; i < fieldIndex; ++i) {
                        this.toggleSelected(otherFields[i], !allSelected);
                    }
                }
            } else {
                overviewClicked = false;
                return;
            }
            this.onSelectionChange(this.selectedFields.size > 0);
        });

        // Clear selection when clicking somewhere else or pressing Escape
        window.addEventListener("click", () => {
            if (!overviewClicked) {
                this.clearSelection();
                this.onSelectionChange(false);
            }
            overviewClicked = false;
        });
        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.clearSelection();
                this.onSelectionChange(false);
            }
        });
    }

    connectedCallback() {
        this.updateListener = () => this.update();
        events.onAll(["srs-scheme-edited", "update-srs-status",
                      "language-visibility-changed"], this.updateListener);
        shortcuts.bindCallback("refresh", () => this.clearSelection());
    }

    disconnectedCallback() {
        events.removeAll(["srs-scheme-edited", "update-srs-status",
                          "language-visibility-changed"], this.updateListener);
    }
    
    clearSelection() {
        if (!this.selectedFields.size) return; 
        for (const field of this.selectedFields)
            field.classList.remove("selected");
        this.selectedFields.clear();
        this.selectedAmount = 0;
    }

    toggleSelected(field, boolean) {
        if (boolean || (boolean !== false && !this.selectedFields.has(field))) {
            if (!this.selectedFields.has(field)&&field.children[1].textContent)
                this.selectedAmount += parseInt(field.children[1].textContent);
            this.selectedFields.add(field);
            field.classList.add("selected");
        } else {
            if (this.selectedFields.has(field) && field.children[1].textContent)
                this.selectedAmount -= parseInt(field.children[1].textContent);
            this.selectedFields.delete(field);
            field.classList.remove("selected");
        }
    }

    getSelection() {
        // Map each language to an (arbitrarily ordered) list of selected levels
        // (order of languages is determined by first occurrance in selection)
        if (this.selectedFields.size === 0) return null;
        const selection = new Map();
        const dueForLanguage = new Map();
        for (const field of this.selectedFields) {
            const language = field.parentNode.dataset.language;
            if (!dueForLanguage.has(language)) dueForLanguage.set(language, 0);
            if (field.children[1].textContent)
                dueForLanguage.set(language, dueForLanguage.get(language) +
                    parseInt(field.children[1].textContent));
            if (!selection.has(language)) selection.set(language, new Set());
            selection.get(language).add(parseInt(field.dataset.level));
        }
        // Discard languages for which there are no items ready for review
        for (const [language, numItemsDue] of dueForLanguage.entries()) {
            if (!numItemsDue) selection.delete(language);
        }
        return selection;
    }

    getSelectedAmount() {
        return this.selectedAmount;
    }

    async update() {
        if (this.selectedFields.size > 0) return;

        const languages = dataManager.languages.visible;
        const amounts = main.srsItemAmounts;
        let maxNumLevels = 1;
        for (const language of languages) {
            maxNumLevels = Math.max(maxNumLevels, amounts[language].length - 1);
        }

        // Remove all HTML except for the header row
        const container = this.$("container");
        while (container.children.length > 1) {
            container.removeChild(container.lastChild);
        }

        // Add header cells for the total count and each SRS level
        const headersHTML = ["<div>Total</div>"];
        for (let level = 1; level <= maxNumLevels; ++level) {
            headersHTML.push(`<div>${level}</div>`);
        }
        this.$("column-headers").innerHTML = headersHTML.join("");

        // Add row for each language
        const rowsHtml = [];
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
            rowsHtml.push(html);
        }
        this.$("container").appendChild(
            utility.fragmentFromString(rowsHtml.join("")));

        // Wait minimum time before hiding spinner and showing button again
        if (this.minSpinnerDisplayTimePromise !== null) {
            await this.minSpinnerDisplayTimePromise;
        }
        this.$("update-button").show("table-cell");
        this.$("updating-spinner").hide();
    }
}

customElements.define("srs-status-overview", SrsStatusOverview);
module.exports = SrsStatusOverview;

