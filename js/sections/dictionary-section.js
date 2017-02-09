"use strict";

class DictionarySection extends Section {
    constructor() {
        super("dictionary");
        this.lastResult = [];
        this.doneLoading = false;
        this.nextRowIndex = 0;
        this.loadAmount = 20;  // Amout of entries to load at once
        // Initially hide some elements
        this.$("results").hide();
        this.$("no-search-results-info").hide();
        utility.enableQuickSelect(this.$("words-filter"));
        utility.enableQuickSelect(this.$("meanings-filter"));
        // Bind callbacks
        this.$("words-filter").addEventListener("keypress", (event) => {
            if (event.key !== "Enter") return;
            this.searchByReading();
        });
        this.$("meanings-filter").addEventListener("keypress", (event) => {
            if (event.key !== "Enter") return;
            this.searchByMeaning();
        });
        this.$("words-filter-button").addEventListener("click", () => {
            this.searchByReading();
        });
        this.$("meanings-filter-button").addEventListener("click", () => {
            this.searchByMeaning();
        })
        this.$("settings-button").addEventListener("click", () => {
            main.updateStatus("Not yet implemented!");
        })
        // If the user scrolls almost to table bottom, load more search results
        this.$("results").uponScrollingBelow(200, () => {
            if (this.doneLoading && this.nextRowIndex < this.lastResult.length)
                this.displayMoreResults(this.loadAmount);
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


    displayMoreResults(amount) {
        this.doneLoading = false;
        const limit = Math.min(this.nextRowIndex + amount,
                               this.lastResult.length);
        const entryPromises = [];
        for (let i = this.nextRowIndex; i < limit; ++i) {
            const entryId = this.lastResult[i];
            const promise = dataManager.content.getDictionaryEntryInfo(entryId)
            .then((info) => {
                const resultEntry = 
                    document.createElement("dictionary-search-result-entry");
                resultEntry.setInfo(info);
                resultEntry.entryId = entryId;
                return resultEntry;
            });
            entryPromises.push(promise);
        }
        return Promise.all(entryPromises).then((entries) => {
            const fragment = document.createDocumentFragment();
            for (const entry of entries) {
                fragment.appendChild(entry);
            }
            this.$("results").appendChild(fragment);
            this.nextRowIndex = limit;
            return utility.finishEventQueue();
        }).then(() => {
            this.doneLoading = true;
            this.$("info-frame").hide();
            this.$("no-search-results-info").toggleDisplay(
                this.lastResult.length === 0);
            this.$("results").toggleDisplay(this.lastResult.length > 0);
        });
    }

    searchByReading() {
        dataManager.content.getEntryIdsForReadingQuery(
                this.$("words-filter").value.trim()).then((idList) => {
            this.lastResult = idList;
            this.nextRowIndex = 0;
            this.$("results").empty();
            this.displayMoreResults(this.loadAmount);
        });
    }

    searchByMeaning() {
        dataManager.content.getEntryIdsForTranslationQuery(
                this.$("meanings-filter").value.trim()).then((idList) => {
            this.lastResult = idList;
            this.nextRowIndex = 0;
            this.$("results").empty();
            this.displayMoreResults(this.loadAmount);
        });
    }
}

customElements.define("dictionary-section", DictionarySection);
module.exports = DictionarySection;
