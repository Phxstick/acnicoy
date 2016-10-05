"use strict";

class DictionarySection extends Section {
    constructor() {
        super("dictionary");
        this.lastResult = [];
        this.doneLoading = false;
        this.nextRowIndex = 0;
        const loadAmount = 20;  // Amout of entries to load at once
        // Store important elements as properties
        this.wordsFilter = this.root.getElementById("words-filter");
        this.meaningsFilter = this.root.getElementById("meanings-filter");
        this.resultList = this.root.getElementById("results");
        // Bind callbacks
        this.wordsFilter.addEventListener("keypress", (event) => {
            if (event.keyCode !== 13) return;
            dataManager.content.getEntryIdsForReadingQuery(
                    this.wordsFilter.value.trim()).then((idList) => {
                this.lastResult = idList;
                this.nextRowIndex = 0;
                this.resultList.empty();
                this.displayMoreResults(loadAmount);
            });
        });
        this.meaningsFilter.addEventListener("keypress", (event) => {
            if (event.keyCode !== 13) return;
            dataManager.content.getEntryIdsForTranslationQuery(
                    this.meaningsFilter.value.trim()).then((idList) => {
                this.lastResult = idList;
                this.nextRowIndex = 0;
                this.resultList.empty();
                this.displayMoreResults(loadAmount);
            });
        });
        // If the user scrolls almost to table bottom, load more search results
        this.resultList.uponScrollingBelow(200, () => {
            if (this.doneLoading && this.nextRowIndex < this.lastResult.length)
                this.displayMoreResults(loadAmount);
        });
        eventEmitter.emit("done-loading");
    }

    open() {
    }

    adjustToLanguage(language, secondary) {
        this.resultList.empty();
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


    displayMoreResults(amount) {
        this.doneLoading = false;
        const limit = Math.min(this.nextRowIndex + amount,
                               this.lastResult.length);
        const entryPromises = [];
        for (let i = this.nextRowIndex; i < limit; ++i) {
            const entryId = this.lastResult[i];
            const promise = dataManager.content.getDictionaryEntryInfo(entryId)
            .then((info) => {
                const resultEntry = new DictionarySearchResultEntry();
                resultEntry.setInfo(info);
                resultEntry.entryId = entryId;
                return resultEntry;
            });
            entryPromises.push(promise);
        }
        return Promise.all(entryPromises).then((entries) => {
            const fragment = document.createDocumentFragment();
            for (let entry of entries) {
                fragment.appendChild(entry);
            }
            this.resultList.appendChild(fragment);
            this.nextRowIndex = limit;
            return utility.finishEventQueue();
        }).then(() => {
            this.doneLoading = true;
        });
        // this.searchStatus.textContent =
        //  `Displaying ${this.nextRowIndex} of ${this.lastResult.length} results.`;
    }
}

customElements.define("dictionary-section", DictionarySection);
module.exports = DictionarySection;
