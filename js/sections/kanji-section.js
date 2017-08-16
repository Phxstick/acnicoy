"use strict";

class KanjiSection extends Section {
    constructor () {
        super("kanji");
        this.selectedKanji = null;
        this.contentAvailable = false;
        this.addedPerGroupCounters = {};
        this.totalAmountPerGroup = {};
        this.addedAmountPerGroup = {};
        this.overviewSettings = {};
        this.searchSettings = {};
        this.$("search-results").hide();
        this.$("no-search-results-info").hide();
        // =================================================================
        // Control bar event listeners
        // =================================================================
        this.$("show-overview-button").addEventListener("click", () => {
            this.showOverview();
        });
        this.$("search-button").addEventListener("click", () => {
            this.searchByKanji();
        });
        this.$("search-entry").addEventListener("keypress", (event) => {
            if (event.key !== "Enter") return;
            this.searchByKanji();
        });
        // =================================================================
        // Kanji search functionality
        // =================================================================
        this.kanjiSearchViewState = utility.initializeView({
            view: this.$("search-results"),
            getData: async (query) => {
                // Check which characters are known kanji (i.e. in the database)
                const knownKanjiPromises = [];
                for (const character of query) {
                    knownKanjiPromises.push(
                        dataManager.content.isKnownKanji(character));
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
            },
            createViewItem: async (kanji) => {
                const info = await dataManager.content.getKanjiInfo(kanji);
                const ResultEntry =
                    customElements.get("kanji-search-result-entry");
                return new ResultEntry(kanji, info);
            },
            uponResultLoaded: (resultsFound) => {
                this.$("overview-pane").hide();
                this.$("search-pane").show();
            },
            initialDisplayAmount: 10,
            displayAmount: 10,
            placeholder: this.$("search-info"),
            noResultsPane: this.$("no-search-results-info")
        });
        // =================================================================
        // Overview/Search settings
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
        this.$("settings-button").addEventListener("click", (event) => {
            this.$("settings-popup").toggleDisplay();
            event.stopPropagation();
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
        this.searchSettings.searchCriterion =
            dataManager.settings.kanjiSearch.searchCriterion;
        const setSearchCriterion = (value) => {
            dataManager.settings.kanjiSearch.searchCriterion = value;
            this.searchSettings.searchCriterion = value;
            this.$("search-entry").placeholder = `Search by ${value}`;
            this.$("search-entry").toggleKanaInput(value === "yomi");
        };
        setSearchCriterion(this.searchSettings.searchCriterion);
        utility.bindRadiobuttonGroup(
            this.$("search-criterion"),
            dataManager.settings.kanjiSearch.searchCriterion,
            setSearchCriterion
        );
    }

    registerCentralEventListeners() {
        events.on("kanji-added", (kanji) => {
            if (!this.contentAvailable) return;
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
        events.on("kanji-removed", (kanji) => {
            if (!this.contentAvailable) return;
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
    }

    open() {
        this.$("search-entry").focus();
    }

    processLanguageContent(language, secondaryLanguage) {
        if (language === "Japanese") {
            if (dataManager.content.isAvailable(language, secondaryLanguage))
                this.contentAvailable = true;
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
    }

    showSearchResults() {
        this.$("overview-pane").hide();
        this.$("search-pane").show();
    }

    createKanjiOverviewNodes(kanjiList) {
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
        const kanjiLists = await dataManager.content.get("Japanese",
                dataManager.languageSettings.for("Japanese").secondaryLanguage)
                .getKanjiLists({
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

    searchByKanji() {
        const query = this.$("search-entry").value.trim();
        // If query is same as the last, just display search-section again
        if (this.kanjiSearchViewState.lastQuery === query) {
            this.showSearchResults();
            return;
        }
        this.kanjiSearchViewState.search(query);
    }
}

customElements.define("kanji-section", KanjiSection);
module.exports = KanjiSection;
