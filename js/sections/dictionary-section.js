"use strict";

const generalOptions = [
    {
        type: "separator"
    },
    {
        type: "checkbox",
        key: "tag-common-words",
        label: "Tag common words",
        initialValue: () =>
            dataManager.settings.dictionary.tagCommonWords,
        onChange: (value) => {
            dataManager.settings.dictionary.tagCommonWords = value
        }
    },
    {
        type: "checkbox",
        key: "dye-common-words",
        label: "Dye common words green",
        initialValue: () =>
            dataManager.settings.dictionary.dyeCommonWords,
        onChange: (value) => {
            dataManager.settings.dictionary.dyeCommonWords = value
        }
    }
    // {
    //     type: "checkbox",
    //     name: "include-proper-name-search",
    //     label: "Also search proper names",
    //     initialValue: () =>
    //         dataManager.settings.dictionary.includeProperNameSearch,
    //     onChange: (v) => {
    //         dataManager.settings.dictionary.includeProperNameSearch = v
    //     }
    // },
]

const refRegex = /\[([^\]]*?)\]/g

window.languageToDictionaryConfig = {
    "Japanese": {
        categories: ["words", "names"],
        viewItemFunction: async (entryId, category) => {
            const isRegularWord = category === "words"
            const infoFunction = isRegularWord ?
                "getDictionaryEntryInfo" : "getProperNameEntryInfo"
            const info = await dataManager.content[infoFunction](entryId);
            const resultEntry = 
                document.createElement("dictionary-search-result-entry");
            info.associatedVocabEntry = await
                dataManager.content.guessAssociatedVocabEntry(
                    isRegularWord ? entryId : null, info)
            info.properName = !isRegularWord
            await resultEntry.setInfo(info);
            return resultEntry;
        },
        menuOptions: (settings) => ([
            {
                type: "checkbox",
                key: "part-of-speech-in-japanese",
                label: "Use Japanese terminology for info on part of speech",
                initialValue: () => settings.partOfSpeechInJapanese,
                onChange: (value) => {
                    settings.partOfSpeechInJapanese = value
                }
            },
            {
                type: "separator"
            },
            {
                type: "checkbox-group",
                // header: "Frequency indicators:",
                name: "frequency-indicators",
                initialValues: (key) => settings.frequencyIndicators[key],
                onChange: (key, value) => {
                    settings.frequencyIndicators[key] = value
                },
                items: [
                    {
                        key: "jlpt",
                        label: "Show JLPT level"
                    },
                    {
                        key: "news",
                        label: "Show frequency in news"
                    },
                    {
                        key: "book",
                        label: "Show frequency in books"
                    }
                    // {
                    //     key: "net",
                    //     label: "Show frequency on the internet"
                    // }
                ]
            },
            { 
                type: "separator"
            },
            {
                type: "checkbox-group",
                header: "Sorting criteria",
                name: "sorting-criteria",
                initialValues: (key) => settings.frequencyWeights[key] > 0,
                onChange: (key, value) => {
                    settings.frequencyWeights[key] = value ? 1 : 0;
                },
                items: [
                    {
                        key: "jlpt",
                        label: "JLPT level"
                    },
                    {
                        key: "news",
                        label: "Frequency in news"
                    },
                    {
                        key: "book",
                        label: "Frequency in books"
                    }
                    // {
                    //     key: "net",
                    //     label: "Frequency on the web"
                    // }
                ]
            }
        ])
    },
    "Chinese": {
        categories: ["words"],
        viewItemFunction: async (entryId, category) => {
            const info =
                await dataManager.content.getDictionaryEntryInfo(entryId);
            const resultEntry = 
                document.createElement("dictionary-search-result-entry");
            const settings = dataManager.settings.dictionary["Chinese"]
            info.fontFamily = settings.fontFamily + "-font"
            info.associatedVocabEntry = await
                dataManager.content.guessAssociatedVocabEntry(entryId, info);
            info.isChinese = true
            info.useTraditionalHanzi = settings.useTraditionalHanzi
            // Simplified variants are at even indices, traditional at uneven
            info.wordsAndReadings = info.wordsAndReadings.filter(
                (_, i) => i % 2 === (settings.useTraditionalHanzi ? 1 : 0))
            // Filter out simplified variants that are identical to main word
            if (!settings.useTraditionalHanzi) {
                info.wordsAndReadings = info.wordsAndReadings.filter((item,i) =>
                    i === 0 || item.word !== info.wordsAndReadings[0].word ||
                        item.reading !== info.wordsAndReadings[0].reading)
            }
            // Handle classifiers
            const convertedClassifiers = []
            for (const [trad, simp, pinyin] of info.classifiers) {
                convertedClassifiers.push({
                    pinyin: [{
                        raw: pinyin,
                        pinyin: pinyin.toPinyin(),
                        tone: pinyin[pinyin.length - 1]
                    }],
                    hanzi: settings.useTraditionalHanzi ? trad : simp
                })
            }
            info.classifiers = convertedClassifiers
            // Handle pinyin and their tones (ignore latin letters in the word)
            let ignoreSet = new Set()
            const word = info.wordsAndReadings[0].word.toLowerCase()
            for (let i = 0; i < word.length; ++i) {
                if ("a" <= word[i] && word[i] <= "z") {
                    ignoreSet.add(i)
                }
            }
            if (ignoreSet.size == 0) ignoreSet = undefined
            const [pinyin, tones] = info.pinyin.toPinyin(
                { separate: true, includeTones: true, ignoreSet })
            info.pinyin = [];
            for (let i = 0; i < pinyin.length; ++i) {
                info.pinyin.push({ pinyin: pinyin[i], tone: tones[i] })
            }
            await resultEntry.setInfo(info);
            return resultEntry;
        },
        menuOptions: (settings) => ([
            {
                type: "checkbox",
                label: "Color hanzi and pinyin according to their tones",
                initialValue: () => settings.colorByTones,
                onChange: (value) => { settings.colorByTones = value }
            },
            {
                type: "checkbox",
                label: "Use traditional hanzi",
                initialValue: () => settings.useTraditionalHanzi,
                onChange: (value) => { settings.useTraditionalHanzi = value }
            },
            {
                type: "radiobutton-group",
                header: "Font family",
                name: "font-family",
                initialValue: () => settings.fontFamily,
                onChange: (value) => settings.fontFamily = value,
                items: [
                    {
                        value: "sans-serif",
                        label: "Song Ti (Sans-serif)"
                    },
                    {
                        value: "serif",
                        label: "Hei Ti (Serif)"
                    },
                    {
                        value: "kaiti",
                        label: "Kai Ti (brush)"
                    }
                ]
            }
        ])
    }
}

async function processWordQuery(query) {
    // Try to match the entire query first and return matches if available
    const matches =
        await dataManager.content.searchDictionary( { words: [query + "%"] })
    if (matches.length > 0) return matches
    // Take apart the given search query into subqueries of maximum length that
    // have non-empty search results and return all the matches
    const searchResults = []
    const matchedParts = []
    let start = 0;
    while (start < query.length) {
        // Most common words probably have a length of 2+, so try to find words
        // starting with the first two characters to limit search results
        // (unless only one character is left in the string)
        let twoOrMoreCharsResult = []
        if (start + 1 < query.length) {
            twoOrMoreCharsResult = await dataManager.content.searchDictionary(
                { words: [query.substr(start, 2) + "%"] })
        }
        // If nothing could be found, search for the first character only
        if (twoOrMoreCharsResult.length === 0) {
            const oneCharResult = await dataManager.content.searchDictionary(
                { words: [query[start]] }, { exactMatchesOnly: true })
            searchResults.push(oneCharResult)
            matchedParts.push(query[start])
            start += 1
            continue
        }
        // Find the maximally matching subquery at this position by checking
        // progressively longer subqueries until the search result is empty
        // or the end of the query has been reached
        let stepSize = 3
        while (true) {
            if (start + stepSize > query.length) break
            const subQuery = query.substr(start, stepSize)
            const multiCharResult = await dataManager.content.searchDictionary(
                { words: [subQuery + "%"] })
            if (multiCharResult.size === 0) break
            stepSize++
        }
        // Now try to search for EXACT matches of progressively shorter
        // subqueries until results are found
        while (stepSize > 1) {
            stepSize--
            const subQuery = query.substr(start, stepSize)
            const exactMatches = await dataManager.content.searchDictionary(
                { words: [subQuery] }, { exactMatchesOnly: true })
            if (exactMatches.length > 0) {
                searchResults.push(exactMatches)
                matchedParts.push(subQuery)
                break
            }
        }
        start += stepSize
    }
    return Array.prototype.concat(...searchResults)
}

const searchFunction = (query, type, category) => {
    const searchProperNames = category === "names"
    if (type === "word") {
        const containsNoHanzi =
            query.split("").every(c => c.codePointAt(0) < 256)
        if (dataManager.currentLanguage === "Chinese" && containsNoHanzi) {
            // Interpret "v" as "ü" in pinyin searches
            query = query.replace("v", "ü")
        }
        if (dataManager.currentLanguage === "Chinese" &&
                !query.includes(" ") && !containsNoHanzi &&
                !(query.includes("%") || query.includes("*"))) {
            return processWordQuery(query) 
        } else if (dataManager.currentLanguage === "Chinese" ||
            dataManager.currentLanguage === "Japanese") {
            return dataManager.content.searchDictionary(
                { words: query.split(/\s+/).filter(s => s.length > 0) },
                { searchProperNames });
        } else {
            return dataManager.content.searchDictionary(
                { words: [query] }, { searchProperNames });
        }
    } else if (type === "meaning") {
        return dataManager.content.searchDictionary(
            { translations: [query] }, { searchProperNames });
    }

}

class DictionarySection extends Section {
    constructor() {
        super("dictionary");
        this.languageConfig = null;
        this.viewStates = {};
        // State variables
        this.selectedSearchResultCategory = null;
        this.loadedQuery = null;
        this.loadedQueryType = null;
        this.searchSettingsChanged = false;
        this.loadedCategories = new Set();
        this.categoriesLoading = new Set();
        this.categoriesAlreadyShownOnce = new Set();
        // Initially hide some elements
        this.$("search-in-progress").hide();
        this.$("search-results-words").hide();
        this.$("search-results-names").hide();
        this.$("no-search-results-info").hide();
        this.$("search-results-info-bar").hide();
        // Discard any active selection when right clicking search results
        // so that the confusing "copy" option doesn't appear
        const discardSelection = () => {
            const selection = window.getSelection()
            selection.removeAllRanges()
        }
        this.$("search-results-words").addEventListener(
            "contextmenu", discardSelection, { capture: true })
        this.$("search-results-names").addEventListener(
            "contextmenu", discardSelection, { capture: true })
        // =================================================================
        //   Start search when clicking a search example
        // =================================================================
        this.$("search-info").addEventListener("click", (event) => {
            if (event.target.classList.contains("search-example")) {
                this.search(event.target.textContent, event.target.dataset.type)
            }
        });
        // =================================================================
        //   Listeners for search entries and search buttons
        // =================================================================
        this.$("words-filter").setCallback((value) => {
            this.search(value, "word");
        });
        this.$("meanings-filter").setCallback((value) => {
            this.search(value, "meaning");
        })
        // =================================================================
        //   Listener for search result control buttons
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
        //   Words search
        // =================================================================
        this.viewStates["words"] = new View({
            viewElement: this.$("search-results-words"),
            getData: (query, searchCriterion) => {
                return searchFunction(query.trim(), searchCriterion, "words")
            },
            createViewItem: async (entryId) => {
                return this.languageConfig.viewItemFunction(entryId, "words")
            },
            initialDisplayAmount: 15,
            displayAmount: 15,
            deterministic: false,
            loadOnResize: true
        });
        // =================================================================
        //   Proper names search
        // =================================================================
        this.viewStates["names"] = new View({
            viewElement: this.$("search-results-names"),
            getData: (query, searchCriterion) => {
                return searchFunction(query.trim(), searchCriterion, "names")
            },
            createViewItem: async (entryId) => {
                return this.languageConfig.viewItemFunction(entryId, "names")
            },
            initialDisplayAmount: 15,
            displayAmount: 15,
            deterministic: false,
            loadOnResize: true
        });
        // =================================================================
        //   Settings
        // =================================================================
        this.$("settings-button").addEventListener("click", () => {
            this.$("settings-popup").toggleDisplay();
            this.$("settings-popup").closeInThisIteration = false;
        });
        utility.makePopupWindow(this.$("settings-popup"));
        // =================================================================
        //   Search history
        // =================================================================
        this.$("history-button").addEventListener("click", () => {
            this.$("history-popup").toggleDisplay();
            this.$("history-popup").closeInThisIteration = false;
        });
        utility.makePopupWindow(this.$("history-popup"));
        this.historyView = new View({
            viewElement: this.$("history"),
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
            if (!dataManager.content.isDictionaryLoaded()) return
            const searchResultEntries = dictionaryId !== null ||
                !this.loadedCategories.has("names") ?
                [...this.$("search-results-words").children] : 
                [...this.$("search-results-names").children,
                 ...this.$("search-results-words").children];
            if (dictionaryId === null) {
                dictionaryId = isAdded ?
                    dataManager.content.guessDictionaryIdForVocabItem(word) :
                    dataManager.content.guessDictionaryIdForNewWord(word)
                if (dictionaryId === null) return
            }
            for (const searchResultEntry of searchResultEntries) {
                let resultEntryId = searchResultEntry.dataset.id
                if (dataManager.content.usesDictionaryIds) {
                    resultEntryId = parseInt(resultEntryId)
                }
                if (resultEntryId === dictionaryId) {
                    searchResultEntry.toggleAdded(isAdded, word);
                    break
                } 
            }
        };
        events.on("word-added", (word, dictionaryId) => {
            updateWordStatus(word, dictionaryId, true);
        });
        events.on("word-deleted", (word, dictionaryId) => {
            updateWordStatus(word, dictionaryId, false);
        });
        events.on("settings-languages-readings", () => {
            if (dataManager.languageSettings.get("readings")) {
                this.$("words-filter").placeholder =
                    "Filter by words or readings";
            } else {
                this.$("words-filter").placeholder = "Filter by words";
            }
        });
    }

    adjustToLanguage(language, secondary) {
        this.languageConfig = window.languageToDictionaryConfig[language]
        if (this.languageConfig === undefined) return
        // Adjust search examples
        this.$$("#search-info .japanese").forEach(
            element => element.toggleDisplay(language === "Japanese"))
        this.$$("#search-info .chinese").forEach(
            element => element.toggleDisplay(language === "Chinese"))
        // Construct settings menu for this language
        this.$("settings-popup").innerHTML = ""
        const languageSettings = dataManager.settings.dictionary[language]
        const optList = [
            ...this.languageConfig.menuOptions(languageSettings),
            ...generalOptions
        ]
        for (const options of optList) {
            const element = utility.createSettingsItem(options, () => {
                // Redo last query if user already searched and settings changed
                this.searchSettingsChanged = true;
                if (this.loadedQuery !== null &&
                        this.selectedSearchResultCategory !== null) {
                    this.search(this.loadedQuery, this.loadedQueryType,
                                [this.selectedSearchResultCategory]);
                }
            })
            this.$("settings-popup").appendChild(element)
        }
        // Toggle available categories in the search-results-info-bar
        const allCategories = ["words", "names"]
        for (const category of allCategories) {
            this.$(`search-results-info-${category}`).toggleDisplay(
                this.languageConfig.categories.includes(category))
        }
        // Load history and search examples
        this.historyView.load();
        this.search("", null)
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

        // Make sure search fields reflect currently searched query
        if (type === "meaning") {
            this.$("meanings-filter").value = query;
            this.$("words-filter").value = "";
        } else if (type === "word") {
            this.$("words-filter").value = query;
            this.$("meanings-filter").value = "";
        }

        // If query has changed, reset and hide search results view
        if (!sameQuery) {
            this.$("search-results-info-bar").hide();
            this.$("control-bar").classList.remove("no-shadow");
            this.loadedCategories.clear();
            this.categoriesAlreadyShownOnce.clear();
            for (const category of this.languageConfig.categories) {
                this.$(`search-results-info-${category}-details`).textContent =
                    "Not loaded. Click to search.";
            }
        }
        // If query is empty, just display information about how to search
        if (query.length === 0) {
            const selectedCategory = this.selectedSearchResultCategory;
            if (selectedCategory !== null) {
                this.$(`search-results-${selectedCategory}`).hide();
                this.$(`search-results-info-${selectedCategory}`)
                .classList.remove("selected");
            }
            this.selectedSearchResultCategory = null;
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
        // If no categories to load are given, take default ones
        if (categories === null) {
            categories = ["words"];
            if (dataManager.settings.dictionary.includeProperNameSearch
                    && this.languageConfig.categories.includes("names")) {
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
        if (type === "word") {
            this.$("words-filter").toggleSpinner(true);
        } else if (type === "meaning") {
            this.$("meanings-filter").toggleSpinner(true);
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
            const searchResult = await this.viewStates[category].load(...args);
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
            // TODO: if search is interrupted, no longer display old results
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
        this.$("words-filter").toggleSpinner(false);
        this.$("meanings-filter").toggleSpinner(false);
    }

    createHistoryViewItem(query, type) {
        const item = document.createElement("div");
        item.textContent = query;
        item.dataset.type = type;
        return item;
    }

    showSearchResult(category) {
        // Display info bar if there is more than one category available
        if (this.languageConfig.categories.length > 1) {
            this.$("search-results-info-bar").show();
            this.$("control-bar").classList.add("no-shadow");
        }
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
