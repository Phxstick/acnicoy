"use strict";

utility.processDocument(document.currentScript.ownerDocument, (docContent) => {
class DictionarySection extends TrainerSection {
    constructor() {
        super();
        this.root = this.createShadowRoot();
        this.root.appendChild(docContent);
        this.lastResult = [];
        this.lastIndex = 0;
        const loadAmount = 30;  // Amout of entries to load at once
        // Store important elements as properties
        this.entryFilter = this.root.getElementById("entry-filter");
        this.meaningsFilter = this.root.getElementById("meanings-filter");
        this.readingsFilter = this.root.getElementById("readings-filter");
        this.readingsFilter.enableKanaInput("hira");
        this.resultsTable = this.root.getElementById("results");
        this.searchStatus = this.root.getElementById("search-status");
        this.loadMoreButton = this.root.getElementById("load-more-results");
        // Bind callbacks
        this.loadMoreButton.addEventListener("click", () =>
            this.displayMoreResults(loadAmount));
        const getSearchCallback = (query, input) => (event) => {
            if (event.keyCode !== 13) return;
            dataManager.content.data.query(query, input.value.trim() + "%")
            .then((rows) => {
                this.lastResult = [];
                this.lastIndex = 0;
                rows.forEach((row) => this.lastResult.push(row.id));
                this.resultsTable.empty();
                if (this.lastResult.length === 0) {
                    this.searchStatus.textContent = "No matches found.";
                } else {
                    this.displayMoreResults(loadAmount);
                }
            });
        };
        this.entryFilter.addEventListener("keypress", getSearchCallback(
            "SELECT id FROM words WHERE word LIKE ?", this.entryFilter));
        this.meaningsFilter.addEventListener("keypress", getSearchCallback(
            "SELECT id FROM translations WHERE translation LIKE ?",
            this.meaningsFilter));
        this.readingsFilter.addEventListener("keypress", getSearchCallback(
            "SELECT id FROM readings WHERE reading LIKE ?",
            this.readingsFilter));
        // Create popup menus
        this.kanjiPopup = new PopupMenu();
        this.kanjiPopup.onOpen = (object) => {
            this.kanjiPopup.clearItems();
            return dataManager.kanji.isAdded(object.textContent)
            .then((isAdded) => {
                // Adjust entry by whether kanji is already added or not
                if (isAdded) {
                    this.kanjiPopup.addItem("Edit this kanji", () => {
                        main.addKanjiPanel.load(object.textContent);
                        main.openPanel(main.addKanjiPanel);
                    });
                } else {
                    this.kanjiPopup.addItem("Add this kanji", () => {
                        main.addKanjiPanel.kanjiEntry.value =
                            object.textContent;
                        main.openPanel(main.addKanjiPanel);
                    });
                }
                this.kanjiPopup.addItem("View kanji info", () => {
                    main.kanjiInfoPanel.load(object.textContent);
                    main.kanjiInfoPanel.open();
                });
            });
        };
        eventEmitter.emit("done-loading");
    }
    insertTableRow(entryId) {
        dataManager.content.data.query(
            `SELECT words, translations, readings FROM dictionary
             WHERE id = ?`, entryId)
        .then((rows) => {
            const words = rows[0].words.split(";");
            const meanings = rows[0].translations.split(";")
            meanings.forEach(
                (val, ind, arr) => arr[ind] = val.split(",").join(", "));
            const readings = rows[0].readings.split(";");
            const tableRow = document.createElement("tr");
            tableRow.entryId = entryId;
            // Process words
            const wData = document.createElement("td");
            for (let i = 0; i < words.length; ++i) {
                const el = document.createElement("div");
                // Make every kanji character a link to open info panel
                for (let character of words[i]) {
                    el.appendChild(this.createCharSpan(character));
                }
                // el.textContent = words[i];
                if (words.length > 1 && i === 0) {
                    el.style.marginBottom = "10px";
                }
                if (i > 0) {
                    el.style.marginBottom = "2px";
                    el.classList.add("alternative-writing");
                }
                wData.appendChild(el);
            }
            tableRow.appendChild(wData);
            // Process meanings
            const mData = document.createElement("td");
            for (let i = 0; i < meanings.length; ++i) {
                const el = document.createElement("div");
                el.textContent = meanings[i];
                if (meanings.length > 1) {
                    el.textContent = `${i + 1}. ${meanings[i]}`;
                    el.style.marginBottom = "3px";
                } else {
                    el.textContent = meanings[i];
                }
                mData.appendChild(el);
            }
            tableRow.appendChild(mData);
            // Process readings
            const rData = document.createElement("td");
            for (let reading of readings) {
                const el = document.createElement("div");
                el.textContent = reading;
                el.style.marginBottom = "3px";
                rData.appendChild(el);
            }
            tableRow.appendChild(rData);
            this.resultsTable.appendChild(tableRow);
        });
    }
    createCharSpan(character) {
        const charSpan = document.createElement("span");
        charSpan.textContent = character;
        dataManager.content.data.query(
            "SELECT count(entry) AS containsChar FROM kanji WHERE entry = ?",
            character)
        .then((rows) => {
            const row = rows[0];
            if (row.containsChar) {
                charSpan.classList.add("kanji-info-link");
                charSpan.addEventListener("click", () => {
                    main.kanjiInfoPanel.load(character);
                    main.kanjiInfoPanel.open();
                });
                this.kanjiPopup.attachTo(charSpan);
            }
        });
        return charSpan;
    }
    displayMoreResults(amount) {
        const limit = Math.min(this.lastIndex + amount, this.lastResult.length);
        for (let i = this.lastIndex; i < limit; ++i) {
            this.insertTableRow(this.lastResult[i]);
        }
        this.lastIndex = limit;
        this.searchStatus.textContent =
           `Displaying ${this.lastIndex} of ${this.lastResult.length} results.`;
    }
}
customElements.define("dictionary-section", DictionarySection);
});
