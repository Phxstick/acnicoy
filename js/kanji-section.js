"use strict";

const menuItems = PopupMenu.registerItems({
    "copy-kanji": {
        label: "Copy kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            clipboard.writeText(kanji);
        }
    },
    "view-kanji-info": {
        label: "View kanji info",
        click: ({ currentNode }) => {
            main.kanjiInfoPanel.load(currentNode.textContent);
            main.kanjiInfoPanel.open();
        }
    },
    "add-kanji": {
        label: "Add kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            main.panels["add-kanji"].load(kanji);
            main.openPanel("add-kanji");
        }
    },
    "edit-kanji": {
        label: "Edit kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            main.panels["edit-kanji"].load(kanji);
            main.openPanel("edit-kanji");
        }
    }
});

class KanjiSection extends Section {
    constructor () {
        super("kanji");
        this.lastSearchResult = [];
        this.selectedKanji = null;
        this.overviewWindow = this.root.getElementById("overview-window");
        this.searchWindow = this.root.getElementById("search-window");
        this.overview = this.root.getElementById("overview");
        this.searchResults = this.root.getElementById("search-results");
        // Buttons for switching between overview and search results
        this.showOverviewButton =
            this.root.getElementById("show-overview-button");
        this.showSearchResultsButton =
            this.root.getElementById("show-search-results-button");
        this.showOverviewButton.addEventListener("click", () => {
            this.overviewWindow.style.display = "block";
            this.searchWindow.style.display = "none";
        });
        this.showSearchResultsButton.addEventListener("click", () => {
            this.overviewWindow.style.display = "none";
            this.searchWindow.style.display = "block";
        });
        this.searchByKanjiEntry =
            this.root.getElementById("search-by-kanji-entry");
        this.searchByKanjiEntry.addEventListener("keypress", (event) => {
            if (event.keyCode !== 13) return;
            const queryString = this.searchByKanjiEntry.value.trim();
            const knownKanji = [];
            const promises = [];
            // Check which characters are known kanji (= in the database)
            for (let character of queryString) {
                const promise = dataManager.content.isKnownKanji(character)
                .then((isKnown) => isKnown ? knownKanji.push(character) : 0);
                promises.push(promise);
            }
            // Display kanji in order given in the input field
            Promise.all(promises).then(() => {
                this.lastSearchResult = knownKanji;
                this.searchResults.empty();
                this.displayMoreSearchResults(10);
                this.overviewWindow.style.display = "none";
                this.searchWindow.style.display = "block";
            });
        });
        this.kanjiContainer = this.root.getElementById("kanji-container");
        // Create counter spans which display amount of added kanji per grade
        this.addedPerGradeCounters = {};
        for (let grade = 0; grade <= 9; ++grade) {
            this.addedPerGradeCounters[grade] = document.createElement("span");
            this.addedPerGradeCounters[grade].classList.add("statistic-label");
        }
        eventEmitter.on("kanji-edited", (kanji, type) => {
            this.updateKanjiStatus(kanji, type)
            dataManager.content.getKanjiInfo(kanji).then((info) => {
                this.updateAddedPerGradeCounter(info.grade);
            });
        });
        dataManager.content.getKanjiList().then((rows) => {
            this.createKanji(rows);
            this.displayKanji("grade");
            eventEmitter.emit("done-loading");
        });
    }

    createKanji(rows) {
        const fragment = document.createDocumentFragment();
        for (let { kanji, added, strokes, grade } of rows) {
            const kanjiSpan = document.createElement("span");
            kanjiSpan.textContent = kanji;
            kanjiSpan.id = kanji;
            kanjiSpan.className = 
              `${added ? "added" : ""} grade-${grade} strokes-${strokes} kanji`;
            kanjiSpan.popupMenu(menuItems,
                    ["copy-kanji", "view-kanji-info",
                     added ? "edit-kanji" : "add-kanji"]);
            kanjiSpan.addEventListener("click", () => {
                if (this.selectedKanji !== null)
                    this.selectedKanji.classList.remove("selected");
                kanjiSpan.classList.add("selected");
                this.selectedKanji = kanjiSpan;
                main.kanjiInfoPanel.load(kanji).then(
                    () => main.kanjiInfoPanel.open());
            });
            fragment.appendChild(kanjiSpan);
        }
        this.kanjiContainer.appendChild(fragment);
    }

    displayKanji(ordering, onlyMissing=false, showJinmeiyou=false,
            showHyougai=false) {
        this.overview.empty();
        if (onlyMissing) {
            const elements = this.root.getElementsByClassName("added");
            for (let i = 0; i < elements.length; ++i)
                elements[i].style.display = "none";
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
                let spans = this.root.querySelectorAll(selector);
                let added = this.root.querySelectorAll(selector + ".added");
                const titleSpan = document.createElement("span");
                titleSpan.textContent = titles[i];
                title.appendChild(titleSpan);
                title.appendChild(this.addedPerGradeCounters[gradeNumbers[i]]);
                this.updateAddedPerGradeCounter(gradeNumbers[i]);
                for (let i = 0; i < spans.length; ++i) {
                    content.appendChild(spans[i]);
                }
                this.overview.appendChild(title);
                this.overview.appendChild(content);
            }
        }
    }

    /**
     * Update element corresponding to given kanji in the kanji overview
     * (mark whether it is added or not).
     * @param {String} kanji - The kanji which changed its status.
     * @param {String} type - The type of status change ("added, "updated",
     * "removed").
     */
    updateKanjiStatus(kanji, type) {
        const item = this.root.getElementById(kanji);
        if (type === "added") {
            item.classList.add("added");
            item.popupMenu(menuItems, ["copy-kanji", "edit-kanji"]);
        }
        else if (type === "removed") {
            item.classList.remove("added");
            item.popupMenu(menuItems, ["copy-kanji", "add-kanji"]);
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
        let promise;
        for (let kanji of this.lastSearchResult) {
            // Fill info frame with data
            promise = dataManager.content.getKanjiInfo(kanji).then((info) =>  {
                const entry = new KanjiSearchResultEntry();
                entry.setInfo(kanji, info);
                fragment.appendChild(entry);
            });
            promises.push(promise);
        }
        Promise.all(promises).then(
            () => this.searchResults.appendChild(fragment));
    }
}

customElements.define("kanji-section", KanjiSection);
module.exports = KanjiSection;
