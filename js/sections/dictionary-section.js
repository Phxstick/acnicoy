"use strict";

class DictionarySection extends Section {
    constructor() {
        super("dictionary");
        // Initially hide some elements
        this.$("results").hide();
        this.$("no-search-results-info").hide();
        utility.enableQuickSelect(this.$("words-filter"));
        utility.enableQuickSelect(this.$("meanings-filter"));
        // Bind callbacks
        this.$("words-filter").addEventListener("keypress", (event) => {
            if (event.key !== "Enter") return;
            this.searchResultsViewState.search("reading");
        });
        this.$("meanings-filter").addEventListener("keypress", (event) => {
            if (event.key !== "Enter") return;
            this.searchResultsViewState.search("meaning");
        });
        this.$("words-filter-button").addEventListener("click", () => {
            this.searchResultsViewState.search("reading");
        });
        this.$("meanings-filter-button").addEventListener("click", () => {
            this.searchResultsViewState.search("meaning");
        })
        this.$("settings-button").addEventListener("click", () => {
            main.updateStatus("Not yet implemented!");
        })
        // If the user scrolls almost to table bottom, load more search results
        this.searchResultsViewState = utility.initializeView({
            view: this.$("results"),
            getData: (searchCriterion) => {
                if (searchCriterion === "reading") {
                    return dataManager.content.getEntryIdsForReadingQuery(
                        this.$("words-filter").value.trim());
                } else if (searchCriterion === "meaning") {
                    return dataManager.content.getEntryIdsForTranslationQuery(
                        this.$("meanings-filter").value.trim());
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
            uponResultLoaded: async (resultsFound) => {
                await utility.finishEventQueue();
                this.$("info-frame").hide();
                this.$("no-search-results-info").toggleDisplay(!resultsFound);
                this.$("results").toggleDisplay(resultsFound);
            },
            initialDisplayAmount: 15,
            displayAmount: 15
        });
    }

    registerCentralEventListeners() {
        events.on("word-added", (word, dictionaryId) => {
            for (const searchResultEntry of this.$("results").children) {
                if (searchResultEntry.dataset.id === dictionaryId ||
                        searchResultEntry.dataset.mainWord === word) {
                    searchResultEntry.toggleAdded(true);
                }
            }
        });
        events.on("word-deleted", (word, dictionaryId) => {
            for (const searchResultEntry of this.$("results").children) {
                if (searchResultEntry.dataset.id === dictionaryId ||
                        searchResultEntry.dataset.mainWord === word) {
                    searchResultEntry.toggleAdded(false);
                }
            }
        });
    }

    adjustToLanguage(language, secondary) {
        this.$("results").empty();
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
