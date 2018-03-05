"use strict";

class DictionarySection extends Section {
    constructor() {
        super("dictionary");
        this.selectedSearchResultCategory = null;
        this.loadedQuery = null;
        this.loadedQueryType = null;
        this.searchSettingsChanged = false;
        this.allCategories = ["words", "names"]
        this.loadedCategories = new Set();
        this.categoriesLoading = new Set();
        this.categoriesAlreadyShownOnce = new Set();
        this.viewStates = {};
        // Initially hide some elements
        this.$("search-in-progress").hide();
        this.$("search-results-words").hide();
        this.$("search-results-names").hide();
        this.$("no-search-results-info").hide();
        this.$("search-results-info-bar").hide();
        // =================================================================
        // Start search when clicking a search example
        // =================================================================
        this.$("search-info").addEventListener("click", (event) => {
            if (event.target.classList.contains("search-example")) {
                this.search(event.target.textContent, event.target.dataset.type)
            }
        });
        // =================================================================
        // Listeners for search entries and search buttons
        // =================================================================
        utility.selectAllOnFocus(this.$("words-filter"));
        utility.selectAllOnFocus(this.$("meanings-filter"));
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
        // =================================================================
        // Listener for search result control buttons
        // =================================================================
        this.$("search-results-info-bar").addEventListener("click", (event) => {
            if (!this.$("search-results-info-bar").contains(event.target))
                return;
            let node = event.target;
            while (node.parentNode !== this.$("search-results-info-bar")) {
                node = node.parentNode;
            }
            const category = node.dataset.category;
            this.search(this.loadedQuery, this.loadedQueryType, [category]);
        });
        // =================================================================
        // Words search
        // =================================================================
        this.viewStates["words"] = utility.initializeView({
            view: this.$("search-results-words"),
            getData: (query, searchCriterion) => {
                if (searchCriterion === "reading") {
                    return dataManager.content.searchDictionary(
                        { readings: [query] });
                } else if (searchCriterion === "meaning") {
                    return dataManager.content.searchDictionary(
                        { translations: [query] });
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
            initialDisplayAmount: 15,
            displayAmount: 15,
            deterministicSearch: false
        });
        // =================================================================
        // Proper names search
        // =================================================================
        this.viewStates["names"] = utility.initializeView({
            view: this.$("search-results-names"),
            getData: (query, searchCriterion) => {
                if (searchCriterion === "reading") {
                    return dataManager.content.searchDictionary(
                        { readings: [query] }, { searchProperNames: true });
                } else if (searchCriterion === "meaning") {
                    return dataManager.content.searchDictionary(
                        { translations: [query] }, { searchProperNames: true });
                }
            },
            createViewItem: async (entryId) => {
                const info = await
                    dataManager.content.getProperNameEntryInfo(entryId);
                const resultEntry = 
                    document.createElement("dictionary-search-result-entry");
                info.properName = true;
                // info.added = await
                //     dataManager.content.doesVocabularyContain(entryId, info);
                resultEntry.setInfo(info);
                return resultEntry;
            },
            initialDisplayAmount: 15,
            displayAmount: 15,
            deterministicSearch: false
        });
        // =================================================================
        // Settings
        // =================================================================
        this.$("settings-button").addEventListener("click", (event) => {
            this.$("settings-popup").toggleDisplay();
            event.stopPropagation();
        });
        utility.makePopupWindow(this.$("settings-popup"));
        const labeledCheckboxes = this.$$(".labeled-checkbox");
        for (const labeledCheckbox of labeledCheckboxes) {
            const checkbox = labeledCheckbox.querySelector("check-box");
            labeledCheckbox.addEventListener("click", (event) => {
                if (event.target.tagName !== "CHECK-BOX") checkbox.toggle();
            });
        }
        this.$("part-of-speech-in-japanese").checked =
            dataManager.settings.dictionary.partOfSpeechInJapanese;
        this.$("part-of-speech-in-japanese").callback = (value) => {
            dataManager.settings.dictionary.partOfSpeechInJapanese = value;
            this.searchSettingsChanged = true;
            if (this.loadedQuery !== null &&
                    this.selectedSearchResultCategory !== null) {
                this.search(this.loadedQuery, this.loadedQueryType,
                            [this.selectedSearchResultCategory]);
            }
        };
        this.$("show-word-frequencies").checked =
            dataManager.settings.dictionary.showFrequencyValues;
        this.$("show-word-frequencies").callback = (value) => {
            dataManager.settings.dictionary.showFrequencyValues = value;
            this.searchSettingsChanged = true;
            if (this.loadedQuery !== null &&
                    this.selectedSearchResultCategory !== null) {
                this.search(this.loadedQuery, this.loadedQueryType,
                            [this.selectedSearchResultCategory]);
            }
        };
        this.$("include-proper-name-search").checked =
            dataManager.settings.dictionary.includeProperNameSearch;
        this.$("include-proper-name-search").callback = (value) => {
            dataManager.settings.dictionary.includeProperNameSearch = value;
        };
        // =================================================================
        // Search history
        // =================================================================
        this.$("history-button").addEventListener("click", () => {
            this.$("history-popup").toggleDisplay();
            event.stopPropagation();
        });
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
        const updateWordStatus = (word, dictionaryId, isAdded) => {
            const searchResultEntries = [
                ...this.$("search-results-words").children,
                ...this.$("search-results-names").children
            ];
            for (const searchResultEntry of searchResultEntries) {
                if (searchResultEntry.dataset.id === dictionaryId ||
                        searchResultEntry.dataset.mainWord === word) {
                    searchResultEntry.toggleAdded(isAdded);
                    break;
                }
            }
        };
        events.on("word-added", (word, dictionaryId) => {
            updateWordStatus(word, dictionaryId, true)
        });
        events.on("word-deleted", (word, dictionaryId) => {
            updateWordStatus(word, dictionaryId, false);
        });
        events.on("settings-languages-readings", () => {
            if (dataManager.languageSettings.get("readings")) {
                this.$("words-filter").placeholder =
                    "Filter by words and readings";
            } else {
                this.$("words-filter").placeholder = "Filter by words";
            }
        });
    }

    adjustToLanguage(language, secondary) {
        // Load search history
        this.historyViewState.search("");
    }

    open() {
        this.$("words-filter").focus();
    }

    async search(query, type, categories=null) {
        const sameQuery = query === this.loadedQuery &&
                          type === this.loadedQueryType &&
                          !this.searchSettingsChanged;
        this.loadedQuery = query;
        this.loadedQueryType = type;
        this.searchSettingsChanged = false;

        // If query has changed, reset and hide search results view
        if (!sameQuery) {
            this.$("search-results-info-bar").hide();
            this.$("control-bar").classList.remove("no-shadow");
            this.loadedCategories.clear();
            this.categoriesAlreadyShownOnce.clear();
            for (const category of this.allCategories) {
                this.$(`search-results-info-${category}-details`).textContent =
                    "Not loaded. Click to search.";
            }
        }
        // If query is empty, just display information about how to search
        if (query.length === 0) {
            this.$("search-info").show();
            return;
        }
        if (!sameQuery) {
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
        // If no categories to load are given, take standard ones
        if (categories === null) {
            categories = ["words"];
            if (dataManager.settings.dictionary.includeProperNameSearch) {
                categories.push("names");
            }
        }
        // Remove categories for which the search result is already loaded
        const categoryToBeDisplayed = categories[0];
        for (const loadedCategory of this.loadedCategories) {
            categories.remove(loadedCategory);
        }
        // If all requested categories are loaded, just display first category
        if (categories.length === 0) {
            this.showSearchResult(categoryToBeDisplayed);
            return;
        }

        // Indicate that a search is running
        this.$("search-info").hide();
        if (type === "reading") {
            this.$("words-filter-button").classList.add("searching");
        } else if (type === "meaning") {
            this.$("meanings-filter-button").classList.add("searching");
        }
        for (const category of categories) {
            this.categoriesLoading.add(category);
            this.$(`search-results-info-${category}-details`).textContent =
                "Searching...";
        }
        // If searching for just one category, immediately display search
        // results view for that category. Otherwise, delay category selection
        // until first non-empty search results have been found.
        this.showSearchResult(categories.length === 1 ? categories[0] : null);

        // Define function for searching and measuring search time
        const measuredSearch = async (category, ...args) => {
            const start = process.hrtime()
            const searchResult = await this.viewStates[category].search(...args)
            const [seconds, nanoSeconds] = process.hrtime(start);
            const timeInMilliSeconds = seconds * 1000 + nanoSeconds / 1000000;
            return [searchResult, timeInMilliSeconds / 1000];
        };
        // Execute the searches one after another (in given category order)
        for (const category of categories) {
            const [result, time] = await measuredSearch(category, query, type);
            this.categoriesLoading.delete(category);
            this.loadedCategories.add(category);
            this.$(`search-results-info-${category}-details`).textContent =
                `${result.length} found after ${time.toFixed(2)} seconds.`;
            // If no other category is selected and the search result is not
            // empty, or if this category is selected, show search results.
            if ((this.selectedSearchResultCategory === null && result.length)
                    || this.selectedSearchResultCategory === category) {
                await utility.finishEventQueue();
                this.showSearchResult(category);
            }
        }
        // If no search results have been found for any category, display notice
        if (this.selectedSearchResultCategory === null) {
            this.showSearchResult(null);
        }
        // Indicate that search has finished
        this.$("words-filter-button").classList.remove("searching");
        this.$("meanings-filter-button").classList.remove("searching");
    }

    createHistoryViewItem(query, type) {
        const item = document.createElement("div");
        item.textContent = query;
        item.dataset.type = type;
        return item;
    }

    showSearchResult(category) {
        this.$("search-results-info-bar").show();
        this.$("control-bar").classList.add("no-shadow");
        // Deselect previous category
        if (this.selectedSearchResultCategory !== null) {
            this.$(`search-results-${this.selectedSearchResultCategory}`).hide()
            this.$(`search-results-info-${this.selectedSearchResultCategory}`)
                .classList.remove("selected");
        }
        this.selectedSearchResultCategory = category;
        // If category is null, do not select any category
        if (category === null) {
            if (this.categoriesLoading.size) {
                this.$("search-in-progress").show();
                this.$("no-search-results-info").hide();
            } else {
                this.$("search-in-progress").hide();
                this.$("no-search-results-info").show();
            }
            return;
        }
        this.$(`search-results-info-${category}`).classList.add("selected");
        // Show search results for category only if it has been loaded
        if (this.categoriesLoading.has(category)) {
            this.$("search-in-progress").show();
            this.$("no-search-results-info").hide();
        } else {
            this.$("search-in-progress").hide();
            // Show search results for category only if not they're not empty
            if (this.$(`search-results-${category}`).children.length > 0) {
                this.$("no-search-results-info").hide();
                this.$(`search-results-${category}`).show();
                // Only scroll to top if result has not been displayed before
                if (!this.categoriesAlreadyShownOnce.has(category)) {
                    this.$(`search-results-${category}`).scrollToTop();
                    this.categoriesAlreadyShownOnce.add(category);
                }
            } else {
                this.$("no-search-results-info").show();
            }
        }
    }
}

customElements.define("dictionary-section", DictionarySection);
module.exports = DictionarySection;
