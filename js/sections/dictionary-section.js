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
            this.searchResultsViewState.search(
                this.$("words-filter").value.trim(), "reading");
        });
        this.$("meanings-filter").addEventListener("keypress", (event) => {
            if (event.key !== "Enter") return;
            this.searchResultsViewState.search(
                this.$("meanings-filter").value.trim(), "meaning");
        });
        this.$("words-filter-button").addEventListener("click", () => {
            this.searchResultsViewState.search(
                this.$("words-filter").value.trim(), "reading");
        });
        this.$("meanings-filter-button").addEventListener("click", () => {
            this.searchResultsViewState.search(
                this.$("meanings-filter").value.trim(), "meaning");
        })
        this.$("settings-button").addEventListener("click", () => {
            main.updateStatus("Not yet implemented!");
        })
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
        if (language === "Japanese") {
            this.$("words-filter").enableKanaInput("hira");
        } else {
            this.$("words-filter").disableKanaInput();
        }
    }

    open() {
        this.$("words-filter").focus();
    }
}

customElements.define("dictionary-section", DictionarySection);
module.exports = DictionarySection;
