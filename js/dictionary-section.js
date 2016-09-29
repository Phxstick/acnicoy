"use strict";

utility.importDocContent(document.currentScript.ownerDocument, (docContent) => {
class DictionarySection extends TrainerSection {
    constructor() {
        super(docContent);
        this.lastResult = [];
        this.nextRowIndex = 0;
        const loadAmount = 30;  // Amout of entries to load at once
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
        this.resultList.uponScrollingBelow(200, () => {
            if (this.nextRowIndex > 0 &&
                    this.nextRowIndex < this.lastResult.length)
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
    createDictionaryEntry(entryId) {
        dataManager.content.getDictionaryEntryInfo(entryId).then((info) => {
            const { wordsAndReadings, meanings, newsFreq } = info;
            const entryFrame = document.createElement("div");
            const wordFrame = document.createElement("div");
            wordFrame.classList.add("word-frame");
            const meaningsFrame = document.createElement("div");
            meaningsFrame.classList.add("meanings-frame");
            entryFrame.appendChild(wordFrame);
            entryFrame.appendChild(meaningsFrame);
                // tableRow.entryId = entryId;
            // Process main word and its reading
            const mainWordDiv = document.createElement("div");
            const mainReadingDiv = document.createElement("div");
            mainReadingDiv.classList.add("readings-small");
            mainWordDiv.classList.add("main-word");
            const {word: mainWord, reading: mainReading} = wordsAndReadings[0];
            // If there is only a reading, use it as the main word
            if (mainWord.length === 0) {
                mainWordDiv.textContent = mainReading;
            } else {
                for (let character of mainWord) {
                    mainWordDiv.appendChild(this.createCharSpan(character));
                }
                mainReadingDiv.textContent = mainReading;
            }
            wordFrame.appendChild(mainReadingDiv);
            wordFrame.appendChild(mainWordDiv);
            // Process variants of this word
            const variantSpans = [];
            for (let i = 1; i < wordsAndReadings.length; ++i) {
                const { word, reading } = wordsAndReadings[i];
                const variantSpan = document.createElement("span");
                const wordSpan = document.createElement("span");
                const readingSpan = document.createElement("span");
                // Make every kanji character a link to open kanji info panel
                for (let character of word) {
                    wordSpan.appendChild(this.createCharSpan(character));
                }
                readingSpan.textContent = `【${reading}】`;
                if (i !== wordsAndReadings.length - 1) {
                    readingSpan.textContent += "、";
                }
                variantSpan.appendChild(wordSpan);
                variantSpan.appendChild(readingSpan);
                variantSpans.push(variantSpan);
            }
            // Process meanings
            for (let i = 0; i < meanings.length; ++i) {
                const { translations, partsOfSpeech, fieldsOfApplication,
                        miscInfo, restrictedTo } = meanings[i];
                const meaningFrame = document.createElement("div");
                const numberSpan = document.createElement("span");
                numberSpan.classList.add("number");
                const posSpan = document.createElement("span");
                posSpan.classList.add("part-of-speech");
                const translationsSpan = document.createElement("span");
                meaningFrame.appendChild(numberSpan);
                meaningFrame.appendChild(posSpan);
                meaningFrame.appendChild(translationsSpan);
                if (meanings.length > 1) {
                    numberSpan.textContent = `${i + 1}. `;
                }
                if (partsOfSpeech.length > 0) {
                    posSpan.textContent = `${partsOfSpeech.join(", ")}`;
                }
                translationsSpan.textContent = translations.join("; ");
                // TODO: Use fieldsOfApplication, miscInfo, restrictedTo
                meaningsFrame.appendChild(meaningFrame);
            }
            // Display frequencies
            if (newsFreq > 0 && newsFreq < 25) {
                entryFrame.classList.add("semi-frequent-entry");
            } else if (newsFreq >= 25) {
                entryFrame.classList.add("frequent-entry");
            }
            this.resultList.appendChild(entryFrame);
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
            this.createDictionaryEntry(this.lastResult[i]);
        }
        this.nextRowIndex = limit;
        // this.searchStatus.textContent =
        //  `Displaying ${this.nextRowIndex} of ${this.lastResult.length} results.`;
    }
}
customElements.define("dictionary-section", DictionarySection);
});
