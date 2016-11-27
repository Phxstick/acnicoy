"use strict";

class KanjiSection extends Section {
    constructor () {
        super("kanji");
        this.lastSearchResult = [];
        this.selectedKanji = null;
        // Add event listeners
        this.$("show-overview-button").addEventListener("click", () => {
            this.$("overview-pane").show();
            this.$("search-pane").hide();
        });
        this.$("search-button").addEventListener("click", () => {
            this.searchByKanji();
        });
        this.$("search-entry").addEventListener("keypress", (event) => {
            if (event.key !== "Enter") return;
            this.searchByKanji();
        });
        this.$("settings-button").addEventListener("click", () => {
            main.updateStatus("Not yet implemented!");
        })
        // Create counter spans which display amount of added kanji per grade
        this.addedPerGradeCounters = {};
        for (let grade = 0; grade <= 9; ++grade) {
            this.addedPerGradeCounters[grade] = document.createElement("span");
            this.addedPerGradeCounters[grade].classList.add("statistic-label");
        }
    }

    registerCentralEventListeners() {
        events.on("kanji-added", (kanji) => {
            this.$(kanji).classList.add("added");
            dataManager.content.getKanjiInfo(kanji).then((info) => {
                this.updateAddedPerGradeCounter(info.grade);
            });
        });
        events.on("kanji-removed", (kanji) => {
            this.$(kanji).classList.remove("added");
            dataManager.content.getKanjiInfo(kanji).then((info) => {
                this.updateAddedPerGradeCounter(info.grade);
            });
        });
    }

    processLanguageContent(language) {
        // Kanji section is only available for Japanese.
        if (language === "Japanese") {
            return dataManager.content.getKanjiList().then((rows) => {
                return this.createKanji(rows).then(() => {
                    this.displayKanji("grade");
                });
            });
        }
    }

    createKanji(rows) {
        const promises = [];
        const fragment = document.createDocumentFragment();
        for (const { kanji, added, strokes, grade } of rows) {
            const kanjiSpan = document.createElement("span");
            kanjiSpan.textContent = kanji;
            kanjiSpan.id = kanji;
            kanjiSpan.className = 
              `${added ? "added" : ""} grade-${grade} strokes-${strokes} kanji`;
            promises.push(main.makeKanjiInfoLink(kanjiSpan, kanji));
            kanjiSpan.addEventListener("click", () => {
                if (this.selectedKanji !== null)
                    this.selectedKanji.classList.remove("selected");
                kanjiSpan.classList.add("selected");
                this.selectedKanji = kanjiSpan;
            });
            fragment.appendChild(kanjiSpan);
        }
        this.$("kanji-container").appendChild(fragment);
        return Promise.all(promises);
    }

    displayKanji(ordering, {
            onlyMissing=false,
            showJinmeiyou=false,
            showHyougai=false }={}) {
        const kanjiOverview = this.$("kanji-overview");
        kanjiOverview.empty();
        if (onlyMissing) {
            const elements = this.root.getElementsByClassName("added");
            for (const element in elements) {
                element.style.display = "none";
            }
        }
        let content;
        let title;
        const titles = [];
        const gradeNumbers = [];
        if (ordering === "grade") {
            for (let i = 1; i <= 6; ++i) {
                titles.push(`Grade ${i}`);
                gradeNumbers.push(i);
            }
            titles.push("Secondary Grade");
            gradeNumbers.push(8);
            if (showJinmeiyou) {
                titles.push("Jinmeiyou");
                gradeNumbers.push(9);
            }
            if (showHyougai) {
                titles.push("Hyougai");
                gradeNumbers.push(0);
            }
            for (let i = 0; i < titles.length; ++i) {
                title = document.createElement("dt");
                content = document.createElement("dd");
                const selector = ".grade-" + gradeNumbers[i];
                const spans = this.root.querySelectorAll(selector);
                // const added = this.root.querySelectorAll(selector + ".added");
                const titleSpan = document.createElement("span");
                titleSpan.textContent = titles[i];
                title.appendChild(titleSpan);
                title.appendChild(this.addedPerGradeCounters[gradeNumbers[i]]);
                this.updateAddedPerGradeCounter(gradeNumbers[i]);
                for (const span of spans) {
                    content.appendChild(span);
                }
                kanjiOverview.appendChild(title);
                kanjiOverview.appendChild(content);
            }
        }
    }

    /**
     * Update text of counter element which displays amount of kanji added
     * for a given grade.
     * @param {Number} grade - The grade of the kanji as valid integer.
     * @returns {Promise}
     */
    updateAddedPerGradeCounter(grade) {
        const numKanjiPerGrade =
            dataManager.content.dataMap["Japanese"].numKanjiPerGrade;
        return dataManager.kanji.getAmountAddedForGrade(grade).then((added) => {
            const total = numKanjiPerGrade[grade];
            this.addedPerGradeCounters[grade].textContent =
                `( ${added} / ${total} )`;
        });
    }

    displayMoreSearchResults(amount) {
        const fragment = document.createDocumentFragment();
        const promises = [];
        const ResultEntry = customElements.get("kanji-search-result-entry");
        let promise;
        for (const kanji of this.lastSearchResult) {
            // Fill info frame with data
            promise = dataManager.content.getKanjiInfo(kanji).then((info) =>  {
                fragment.appendChild(new ResultEntry(kanji, info));
            });
            promises.push(promise);
        }
        return Promise.all(promises).then(
            () => this.$("search-results").appendChild(fragment));
    }

    searchByKanji() {
        const queryString = this.$("search-entry").value.trim();
        const knownKanji = [];
        const promises = [];
        // Check which characters are known kanji (= in the database)
        for (const character of queryString) {
            const promise = dataManager.content.isKnownKanji(character)
            .then((isKnown) => isKnown ? knownKanji.push(character) : 0);
            promises.push(promise);
        }
        // Display kanji in order given in the input field
        Promise.all(promises).then(() => {
            this.lastSearchResult = knownKanji;
            this.$("search-results").empty();
            this.displayMoreSearchResults(10);
            this.$("overview-pane").hide();
            this.$("search-pane").show();
        });
    }
}

customElements.define("kanji-section", KanjiSection);
module.exports = KanjiSection;
