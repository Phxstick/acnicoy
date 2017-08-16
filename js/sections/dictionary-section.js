"use strict";

class DictionarySection extends Section {
    constructor() {
        super("dictionary");
        // Initially hide some elements
        this.$("search-results").hide();
        this.$("no-search-results-info").hide();
        utility.enableQuickSelect(this.$("words-filter"));
        utility.enableQuickSelect(this.$("meanings-filter"));
        // Bind callbacks
        this.$("words-filter").addEventListener("keypress", (event) => {
            if (event.key !== "Enter") return;
            this.search(this.$("words-filter").value.trim(), "reading");
        });
        this.$("meanings-filter").addEventListener("keypress", (event) => {
            if (event.key !== "Enter") return;
            this.search(this.$("meanings-filter").value.trim(), "meaning");
        });
        this.$("words-filter-button").addEventListener("click", () => {
            this.search(this.$("words-filter").value.trim(), "reading");
        });
        this.$("meanings-filter-button").addEventListener("click", () => {
            this.search(this.$("meanings-filter").value.trim(), "meaning");
        });
        this.$("history-button").addEventListener("click", () => {
            this.$("history-popup").toggleDisplay();
            event.stopPropagation();
        });
        this.$("settings-button").addEventListener("click", () => {
            main.updateStatus("Not yet implemented!");
        });
        // If the user scrolls almost to table bottom, load more search results
        this.searchResultsViewState = utility.initializeView({
            view: this.$("search-results"),
            getData: (q, searchCriterion) => {
                if (searchCriterion === "reading") {
                    this.$("words-filter-button").classList.add("searching");
                    return dataManager.content.getEntryIdsForReadingQuery(q);
                } else if (searchCriterion === "meaning") {
                    this.$("meanings-filter-button").classList.add("searching");
                    return dataManager.content.getEntryIdsForTranslationQuery(q)
                }
            },
            createViewItem: async (entryId) => {
                const info = await
                    dataManager.content.getDictionaryEntryInfo(entryId);
                const resultEntry = 
                    document.createElement("dictionary-search-result-entry");
                info.added = await
                    dataManager.content.doesVocabularyContain(entryId, info);
                resultEntry.setInfo(info);
                return resultEntry;
            },
            uponResultLoaded: () => {
                this.$("words-filter-button").classList.remove("searching");
                this.$("meanings-filter-button").classList.remove("searching");
            },
            initialDisplayAmount: 15,
            displayAmount: 15,
            placeholder: this.$("search-info"),
            noResultsPane: this.$("no-search-results-info")
        });
        // =================================================================
        // Search history
        // =================================================================
        utility.makePopupWindow(this.$("history-popup"));
        this.historyViewState = utility.initializeView({
            view: this.$("history"),
            getData: async () => await dataManager.history.get("dictionary"),
            createViewItem:
                ({ name, type }) => this.createHistoryViewItem(name, type),
            initialDisplayAmount: 20,
            displayAmount: 20
        });
        this.$("history").addEventListener("click", (event) => {
            if (event.target.parentNode !== this.$("history")) return;
            this.search(event.target.textContent, event.target.dataset.type);
        });
    }

    registerCentralEventListeners() {
        events.on("word-added", (word, dictionaryId) => {
            for (const searchResultEntry of this.$("search-results").children) {
                if (searchResultEntry.dataset.id === dictionaryId ||
                        searchResultEntry.dataset.mainWord === word) {
                    searchResultEntry.toggleAdded(true);
                }
            }
        });
        events.on("word-deleted", (word, dictionaryId) => {
            for (const searchResultEntry of this.$("search-results").children) {
                if (searchResultEntry.dataset.id === dictionaryId ||
                        searchResultEntry.dataset.mainWord === word) {
                    searchResultEntry.toggleAdded(false);
                }
            }
        });
    }

    adjustToLanguage(language, secondary) {
        this.$("search-results").empty();
        if (dataManager.languageSettings.readings) {
            this.$("words-filter").placeholder = "Filter by words and readings";
        } else {
            this.$("words-filter").placeholder = "Filter by words";
        }
        this.$("words-filter").toggleKanaInput(language === "Japanese");
        // Load search history
        this.historyViewState.search();
    }

    open() {
        this.$("words-filter").focus();
    }

    search(query, type) {
        if (query.length > 0) {
            // Delete any entry with the same name from the history view items
            for (const entry of this.$("history").children) {
                if (entry.textContent === query) {
                    this.$("history").removeChild(entry);
                    break;
                }
            }
            // Add entry to the history and insert it into the history view
            dataManager.history.addEntry("dictionary", { name: query, type });
            this.$("history").insertBefore(
                this.createHistoryViewItem(query, type),
                this.$("history").firstChild);
        }
        this.searchResultsViewState.search(query, type);
    }

    createHistoryViewItem(query, type) {
        const item = document.createElement("div");
        item.textContent = query;
        item.dataset.type = type;
        return item;
    }
}

customElements.define("dictionary-section", DictionarySection);
module.exports = DictionarySection;
