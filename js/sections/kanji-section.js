"use strict";

class KanjiSection extends Section {
    constructor () {
        super("kanji");
        this.selectedKanji = null;
        this.contentLoaded = false;
        this.addedPerGroupCounters = {};
        this.totalAmountPerGroup = {};
        this.addedAmountPerGroup = {};
        this.overviewSettings = {};
        this.searchSettings = {};

        // Initially hide some elements
        this.$("search-results").hide();
        this.$("no-search-results-info").hide();
        this.$("show-overview-button").hide();

        // =================================================================
        //   Start search when clicking a search example
        // =================================================================

        this.$("search-info").addEventListener("click", (event) => {
            if (event.target.classList.contains("search-example")) {
                this.search(event.target.textContent.trim(),
                            event.target.dataset.type);
            }
        });

        // =================================================================
        //   Control bar event listeners
        // =================================================================

        this.$("search-by-kanji").setCallback((query) => {
            this.search(query, "by-kanji");
        });
        this.$("search-by-meanings").setCallback((query) => {
            this.search(query, "by-meanings");
        });
        this.$("search-by-readings").setCallback((query) => {
            this.search(query, "by-readings");
        })
        this.$("search-by-readings").enableKanaInput();
        this.$("show-overview-button").addEventListener("click", () => {
            this.showOverview();
        });

        // =================================================================
        //   Kanji search functionality
        // =================================================================

        this.kanjiSearchViewState = new View({
            viewElement: this.$("search-results"),
            getData: async (query, method) => {
                if (method === "by-kanji") {
                    return await this.searchByKanji(query);
                } else if (method === "by-meanings") {
                    return await this.searchByDetails(query);
                } else if (method === "by-readings") {
                    return await this.searchByDetails(query);
                }
            },
            createViewItem: async (kanji) => {
                const info = await dataManager.content.getKanjiInfo(kanji);
                info.added = await dataManager.kanji.isAdded(kanji);
                const Entry = customElements.get("kanji-search-result-entry");
                return new Entry(kanji, info);
            },
            initialDisplayAmount: 10,
            displayAmount: 10,
            placeholder: this.$("search-info"),
            noDataPane: this.$("no-search-results-info")
        });

        // =================================================================
        //   Overview settings
        // =================================================================

        this.overviewSettings.splittingCriterion =
            dataManager.settings.kanjiOverview.splittingCriterion;
        utility.bindRadiobuttonGroup(
            this.$("overview-split-criterion"),
            dataManager.settings.kanjiOverview.splittingCriterion,
            (value) => {
                dataManager.settings.kanjiOverview.splittingCriterion = value;
                this.overviewSettings.splittingCriterion = value;
                this.displayKanji();
        });
        utility.makePopupWindow(this.$("settings-popup"));
        this.$("settings-button").addEventListener("click", () => {
            this.$("settings-popup").toggleDisplay();
            this.$("settings-popup").closeInThisIteration = false;
        });
        const labeledCheckboxes = this.$$(".labeled-checkbox");
        for (const labeledCheckbox of labeledCheckboxes) {
            const checkbox = labeledCheckbox.querySelector("check-box");
            labeledCheckbox.addEventListener("click", (event) => {
                if (event.target.tagName !== "CHECK-BOX") checkbox.toggle();
            });
        }
        this.$("show-jouyou").checked = this.overviewSettings.showJouyou =
            dataManager.settings.kanjiOverview.showJouyou;
        this.$("show-jouyou").callback = (value) => {
            dataManager.settings.kanjiOverview.showJouyou = value;
            this.overviewSettings.showJouyou = value;
            this.displayKanji();
        };
        this.$("show-jinmeiyou").checked = this.overviewSettings.showJinmeiyou =
            dataManager.settings.kanjiOverview.showJinmeiyou;
        this.$("show-jinmeiyou").callback = (value) => {
            dataManager.settings.kanjiOverview.showJinmeiyou = value;
            this.overviewSettings.showJinmeiyou = value;
            this.displayKanji();
        };
        this.$("show-hyougai").checked = this.overviewSettings.showHyougai =
            dataManager.settings.kanjiOverview.showHyougai;
        this.$("show-hyougai").callback = (value) => {
            dataManager.settings.kanjiOverview.showHyougai = value;
            this.overviewSettings.showHyougai = value;
            this.displayKanji();
        };
        this.$("show-added").checked =
            !dataManager.settings.kanjiOverview.onlyMissing;
        this.overviewSettings.onlyMissing =
            dataManager.settings.kanjiOverview.onlyMissing;
        this.$("show-added").callback = (value) => {
            dataManager.settings.kanjiOverview.onlyMissing = !value;
            this.overviewSettings.onlyMissing = !value;
            this.displayKanji();
        };

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
            getData: () => dataManager.history.get("kanji_search"),
            createViewItem:
                ({ name, type }) => this.createHistoryViewItem(name, type),
            initialDisplayAmount: 20,
            displayAmount: 20
        });
        this.$("history").addEventListener("click", (event) => {
            if (event.target.parentNode !== this.$("history")) return;
            this.kanjiSearchViewState.load(
                event.target.textContent, event.target.dataset.type);
            this.showSearchResults();
        });
    }

    registerCentralEventListeners() {
        events.on("kanji-added", async (kanji) => {
            if (!this.contentLoaded) return;
            const isKnownKanji = await dataManager.content.isKnownKanji(kanji);
            if (!isKnownKanji) return;
            this.$(kanji).classList.add("added");
            if (this.overviewSettings.onlyMissing) {
                this.$(kanji).hide();
            }
            this.updateAddedCounter(kanji, true);
            for (const kanjiEntry of this.$("search-results").children) {
                if (kanjiEntry.dataset.kanji === kanji) {
                    kanjiEntry.toggleAdded(true);
                    break;
                }
            }
        });
        events.on("kanji-removed", async (kanji) => {
            if (!this.contentLoaded) return;
            const isKnownKanji = await dataManager.content.isKnownKanji(kanji);
            if (!isKnownKanji) return;
            this.$(kanji).classList.remove("added");
            if (this.overviewSettings.onlyMissing) {
                this.$(kanji).show();
            }
            this.updateAddedCounter(kanji, false);
            for (const kanjiEntry of this.$("search-results").children) {
                if (kanjiEntry.dataset.kanji === kanji) {
                    kanjiEntry.toggleAdded(false);
                    break;
                }
            }
        });
        events.on("kanji-imported", async (items) => {
            if (!this.contentLoaded) return;
            for (const { kanji } of items) {
                const isKnownKanji=await dataManager.content.isKnownKanji(kanji)
                if (!isKnownKanji) return;
                this.$(kanji).classList.add("added");
                if (this.overviewSettings.onlyMissing) this.$(kanji).hide();
                this.updateAddedCounter(kanji, true);
            }
        });
    }

    open() {
        this.$("search-by-kanji").focus();
    }

    adjustToLanguage(language, secondary) {
        // Load search history
        if (language === "Japanese") {
            this.historyView.load();
        }
    }

    processLanguageContent(language, secondaryLanguage) {
        if (language === "Japanese") {
            if (dataManager.content.isLoadedFor(language, secondaryLanguage))
                this.contentLoaded = true;
            return dataManager.content.get(language, secondaryLanguage)
            .getKanjiLists().then((kanjiList) => {
                return this.createKanjiOverviewNodes(kanjiList).then(() => {
                    this.displayKanji();
                });
            });
        }
    }

    showOverview() {
        this.$("overview-pane").show();
        this.$("search-pane").hide();
        this.$("show-overview-button").hide();
        this.$("settings-button").show();
    }

    showSearchResults() {
        this.$("overview-pane").hide();
        this.$("search-pane").show();
        this.$("show-overview-button").show();
        this.$("settings-button").hide();
    }

    createKanjiOverviewNodes(kanjiList) {
        this.$("kanji-overview").empty();
        this.$("kanji-container").empty();
        const promises = [];
        const fragment = document.createDocumentFragment();
        for (const { kanji, added } of kanjiList) {
            const kanjiNode = document.createElement("span");
            kanjiNode.textContent = kanji;
            kanjiNode.id = kanji;
            kanjiNode.classList.toggle("added", added);
            promises.push(main.makeKanjiInfoLink(kanjiNode, kanji));
            kanjiNode.addEventListener("click", () => {
                if (this.selectedKanji !== null)
                    this.selectedKanji.classList.remove("selected");
                kanjiNode.classList.add("selected");
                this.selectedKanji = kanjiNode;
            });
            fragment.appendChild(kanjiNode);
        }
        this.$("kanji-container").appendChild(fragment);
        return Promise.all(promises);
    }

    async displayKanji() {
        const { splittingCriterion, sortingCriterion, onlyMissing,
                showJouyou, showJinmeiyou, showHyougai} = this.overviewSettings;
        let stepSize;
        if (splittingCriterion === "frequency") {
            stepSize = 500;
        } else if (splittingCriterion === "stroke-count") {
            stepSize = 5;
        }
        const secondaryLanguage = dataManager.languageSettings
                                  .getFor("Japanese", "secondaryLanguage");
        const kanjiLists = await dataManager.content.get(
                "Japanese", secondaryLanguage).getKanjiLists({
            splittingCriterion,
            includeAdded: !onlyMissing,
            includeJouyou: showJouyou,
            includeJinmeiyou: showJinmeiyou,
            includeHyougai: showHyougai,
            stepSize
        });
        const groups = this.$$("#kanji-overview > dd");
        for (const group of groups) {
            const kanjiNodes = Array.from(group.children);
            for (const kanjiNode of kanjiNodes) {
                this.$("kanji-container").appendChild(kanjiNode);
            }
        }
        this.$("kanji-overview").empty();
        const fragment = document.createDocumentFragment();
        for (const { groupName, groupValue, kanjiList, numTotal,
                     numAdded } of kanjiLists) {
            const title = document.createElement("dt");
            const content = document.createElement("dd");
            const groupNameLabel = document.createElement("span");
            groupNameLabel.textContent = groupName;
            title.appendChild(groupNameLabel);
            const numAddedCounter = document.createElement("span");
            numAddedCounter.classList.add("amount-added");
            numAddedCounter.textContent = `( ${numAdded} / ${numTotal} )`;
            this.addedPerGroupCounters[groupValue] = numAddedCounter;
            this.totalAmountPerGroup[groupValue] = numTotal;
            this.addedAmountPerGroup[groupValue] = numAdded;
            title.appendChild(numAddedCounter);
            if (numTotal > 0) {
                fragment.appendChild(title);
                if (!(onlyMissing && numAdded === numTotal)) {
                    for (const kanji of kanjiList) {
                        content.appendChild(this.$(kanji));
                    }
                    fragment.appendChild(content);
                }
            }
        }
        this.$("kanji-overview").appendChild(fragment);
    }

    /**
     * Update text of counter element which displays amount of kanji added
     * for group containing given kanji.
     * @param {String} kanji - Kanji which has been added/removed.
     * @param {Boolean} isAdded - True if kanji has been added to vocabulary.
     */
    async updateAddedCounter(kanji, isAdded) {
        const kanjiInfo = await dataManager.content.getKanjiInfo(kanji);
        let groupValue;
        // Get value of the kanji corresponding to current splitting criterion
        switch (this.overviewSettings.splittingCriterion) {
            case "grade": groupValue = kanjiInfo.grade; break;
            case "frequency": groupValue = kanjiInfo.frequency; break;
            case "jlpt-level": groupValue = kanjiInfo.jlptLevel; break;
            case "stroke-count": groupValue = kanjiInfo.strokes; break;
            case "radical": groupValue = kanjiInfo.radicalId; break;
        }
        // If values are split into ranges, find the range the value is in
        switch (this.overviewSettings.splittingCriterion) {
            case "frequency":
            case "stroke-count":
                for (const rangeString in this.addedPerGroupCounters) {
                    const [start, end] = rangeString.split("-");
                    if (parseInt(start) <= groupValue &&
                            groupValue <= parseInt(end)) {
                        groupValue = rangeString;
                        break;
                    }
                }
                break;
        }
        this.addedAmountPerGroup[groupValue] += isAdded;
        const numAdded = this.addedAmountPerGroup[groupValue];
        const numTotal = this.totalAmountPerGroup[groupValue];
        const counterNode = this.addedPerGroupCounters[groupValue];
        if (counterNode !== undefined) {
            counterNode.textContent = `( ${numAdded} / ${numTotal} )`;
        }
    }

    createHistoryViewItem(query, type) {
        const item = document.createElement("div");
        item.textContent = query;
        item.dataset.type = type;
        return item;
    }

    async search(query, method) {
        if (query.length > 0) {
            // Delete any entry with the same name from the history view items
            for (const entry of this.$("history").children) {
                if (entry.textContent === query) {
                    this.$("history").removeChild(entry);
                    break;
                }
            }
            // Add entry to the history and insert it into the history view
            dataManager.history.addEntry(
                "kanji_search", { name: query, type: method });
            this.$("history").insertBefore(
                this.createHistoryViewItem(query, method),
                this.$("history").firstChild);

            // Show given query in the corresponding input and clear all others
            this.$("search-by-kanji").value = "";
            this.$("search-by-meanings").value = "";
            this.$("search-by-readings").value = "";
            if (method === "by-kanji") {
                this.$("search-by-kanji").value = query;
            } else if (method === "by-meanings") {
                this.$("search-by-meanings").value = query;
            } else if (method === "by-readings") {
                this.$("search-by-readings").value = query;
            }

            // if (method === "by-kanji") {
            //     this.$("search-by-kanji").toggleSpinner(true);
            // } else if (method === "by-meanings") {
            //     this.$("search-by-meanings").toggleSpinner(true);
            // } else if (method === "by-readings") {
            //     this.$("search-by-readings").toggleSpinner(true);
            // }
        }
        await this.kanjiSearchViewState.load(query, method);
        await utility.finishEventQueue();
        this.showSearchResults();
        // this.$("search-by-kanji").toggleSpinner(false);
        // this.$("search-by-meanings").toggleSpinner(false);
        // this.$("search-by-readings").toggleSpinner(false);
    }

    async searchByKanji(query) {
        // Check which characters are known kanji (i.e. in the database)
        const knownKanjiPromises = [];
        for (const character of query) {
            knownKanjiPromises.push(dataManager.content.isKnownKanji(character))
        }
        // Display kanji in given order into the input field
        const kanjiKnown = await Promise.all(knownKanjiPromises);
        const querySet = new Set();
        const queriedKanji = [];
        for (let i = 0; i < query.length; ++i) {
            const character = query[i];
            const isKnownKanji = kanjiKnown[i];
            if (isKnownKanji && !querySet.has(character)) {
                querySet.add(character);
                queriedKanji.push(character);
            }
        }
        return queriedKanji;
    }

    async searchByDetails(query) {
        const queryObject = { meanings: [], onYomi: [], kunYomi: [] };
        const fields = query.split(/[\s,;|]+/g).map((f) => f.replace("*", "%"));
        for (const field of fields) {
            // If field consists only of katakana or dot/star, regard as on-yomi
            if (field.split("").every((c) => c === "." || c === "%" ||
                    (12449 <= c.charCodeAt(0) && c.charCodeAt(0) < 12543))) {
                queryObject.onYomi.push(field);
            }
            // If field consists only of hiragana or dot/star, regard as kunYomi
            else if (field.split("").every((c) => c == "." || c == "%" ||
                    (12353 <= c.charCodeAt(0) && c.charCodeAt(0) < 12439))) {
                queryObject.kunYomi.push(field);
            }
            // In all other cases, regard the field as a kanji meaning
            else {
                queryObject.meanings.push(field);
            }
        }
        return await dataManager.content.searchKanji(queryObject);
    }
}

customElements.define("kanji-section", KanjiSection);
module.exports = KanjiSection;
