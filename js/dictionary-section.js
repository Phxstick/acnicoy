"use strict";

utility.processDocument(document.currentScript.ownerDocument, (docContent) => {
class DictionarySection extends TrainerSection {
    constructor() {
        super();
        this.root = this.createShadowRoot();
        this.root.appendChild(docContent);
        this.lastResult = [];
        this.nextRowIndex = 0;
        const loadAmount = 30;  // Amout of entries to load at once
        // Store important elements as properties
        this.wordsFilter = this.root.getElementById("words-filter");
        this.meaningsFilter = this.root.getElementById("meanings-filter");
        this.resultsTable = this.root.getElementById("results");
        this.resultsTableHead = this.root.getElementById("results-table-head");
        // Bind callbacks
        const getSearchCallback = (query, input) => (event) => {
            if (event.keyCode !== 13) return;
            dataManager.content.data.query(query, input.value.trim() + "%",
                    input.value.trim() + "%")
            .then((rows) => {
                this.lastResult = [];
                this.nextRowIndex = 0;
                rows.forEach((row) => this.lastResult.push(row.id));
                this.resultsTable.empty();
                // If no results are found, don't display the table head
                // TODO: Remove this once table head becomes obsolete
                if (this.lastResult.length === 0) {
                    this.resultsTableHead.style.display = "none";
                    // TODO: Display some "no matches found" message
                } else {
                    this.resultsTableHead.style.display = "block";
                }
                this.displayMoreResults(loadAmount);
            });
        };
        this.wordsFilter.addEventListener("keypress", getSearchCallback(
            `WITH matched_ids AS
                 (SELECT id FROM words WHERE word LIKE ?
                  UNION
                  SELECT id FROM readings WHERE reading LIKE ?)
             SELECT id, news_freq FROM matched_ids NATURAL JOIN dictionary
             ORDER BY news_freq DESC`,
            this.wordsFilter));
        this.meaningsFilter.addEventListener("keypress", getSearchCallback(
            "SELECT id FROM translations WHERE translation LIKE ?",
            this.meaningsFilter));
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
        // If the user scrolls almost to table bottom, load more search results
        this.resultsTable.uponScrollingBelow(200, () => {
            if (this.nextRowIndex > 0 &&
                    this.nextRowIndex < this.lastResult.length)
                this.displayMoreResults(loadAmount);
        });
        eventEmitter.emit("done-loading");
    }
    open() {
    }
    adjustToLanguage(language, secondary) {
        this.resultsTable.empty();
        if (dataManager.languageSettings.readings) {
            this.wordsFilter.placeholder = "Filter by words and readings";
        } else {
            this.wordsFilter.placeholder = "Filter by words";
        }
        if (language === "Japanese") {
            this.wordsFilter.enableKanaInput("hira");
        } else {
            this.wordsFilter.disableKanaInput();
        }
    }
    insertTableRow(entryId) {
        dataManager.content.getDictionaryEntryInfo(entryId).then((info) => {
            const { words, newsFreq, meanings, readings } = info;
            const tableRow = document.createElement("tr");
            tableRow.entryId = entryId;
            // Process words
            const wData = document.createElement("td");
            wData.innerHTML += `<div>${newsFreq}</div>`;
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
            // Display frequencies
            if (newsFreq > 0 && newsFreq < 25) {
                tableRow.classList.add("semi-frequent-entry");
            } else if (newsFreq >= 25) {
                tableRow.classList.add("frequent-entry");
            }
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
        const limit = Math.min(this.nextRowIndex + amount,
                               this.lastResult.length);
        for (let i = this.nextRowIndex; i < limit; ++i) {
            this.insertTableRow(this.lastResult[i]);
        }
        this.nextRowIndex = limit;
        utility.finishEventQueue().then(() =>
            utility.calculateHeaderCellWidths(
                this.resultsTable, this.resultsTableHead));
        // this.searchStatus.textContent =
        //  `Displaying ${this.nextRowIndex} of ${this.lastResult.length} results.`;
    }
}
customElements.define("dictionary-section", DictionarySection);
});
