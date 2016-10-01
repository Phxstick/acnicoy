"use strict";

utility.importDocContent(document.currentScript.ownerDocument, (docContent) => {
class KanjiSection extends TrainerSection {
    constructor () {
        super(docContent);
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
                this.displayMoreSearchResults(30);
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
        // Create popupmenus
        this.popupMenuAdded = new PopupMenu();
        this.popupMenuMissing = new PopupMenu();
        this.popupMenuAdded.addItem("Copy", () => {
            clipboard.writeText(this.popupMenuAdded.currentObject.textContent);
        });
        this.popupMenuAdded.addSeparator();
        this.popupMenuAdded.addItem("Edit", () => {
            main.editKanjiPanel.load(
                this.popupMenuAdded.currentObject.textContent);
            main.openPanel(main.editKanjiPanel);
        });
        this.popupMenuAdded.addItem("Remove", () => { });
        this.popupMenuMissing.addItem("Copy", () => {
            clipboard.writeText(this.popupMenuMissing.currentObject.textContent);
        });
        this.popupMenuMissing.addItem("Add", () => {
            main.addKanjiPanel.load(
                this.popupMenuMissing.currentObject.textContent);
            main.openPanel(main.addKanjiPanel);
        });
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
            if (added) this.popupMenuAdded.attachTo(kanjiSpan);
            else this.popupMenuMissing.attachTo(kanjiSpan);
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
        // $(".added").css("display", onlyMissing ? "none" : "inline-block");
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
            this.popupMenuMissing.detachFrom(item);
            this.popupMenuAdded.attachTo(item);
        }
        else if (type === "removed") {
            item.classList.remove("added");
            this.popupMenuAdded.detachFrom(item);
            this.popupMenuMissing.attachTo(item);
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
            const resultItem = document.createElement("div");
            const leftFrame = document.createElement("div");
            leftFrame.classList.add("left-frame");
            const infoFrame = document.createElement("div");
            infoFrame.classList.add("info-frame");
            resultItem.appendChild(leftFrame);
            resultItem.appendChild(infoFrame);
            // Fill left frame with the kanji and links
            const kanjiFrame = document.createElement("div");
            kanjiFrame.classList.add("kanji-frame");
            kanjiFrame.classList.add("kanji-info-link");
            // Open kanji info panel upon clicking the kanji
            kanjiFrame.addEventListener("click", () => {
                main.kanjiInfoPanel.load(kanji);
                main.kanjiInfoPanel.open();
            });
            kanjiFrame.textContent = kanji;
            leftFrame.appendChild(kanjiFrame);
            // Create info frame elements
            const meaningsFrame = document.createElement("div");
            meaningsFrame.classList.add("meanings-frame");
            const onYomiFrame = document.createElement("div");
            onYomiFrame.classList.add("yomi-frame");
            const kunYomiFrame = document.createElement("div");
            kunYomiFrame.classList.add("yomi-frame");
            const detailsBar = document.createElement("div");
            detailsBar.classList.add("details-bar");
            infoFrame.appendChild(meaningsFrame);
            infoFrame.appendChild(detailsBar);
            infoFrame.appendChild(onYomiFrame);
            infoFrame.appendChild(kunYomiFrame);
            // Fill info frame with data
            promise = dataManager.content.getKanjiInfo(kanji).then((info) =>  {
                meaningsFrame.textContent = info.meanings.join(", ");
                onYomiFrame.textContent = info.onYomi.join("、 ");
                kunYomiFrame.textContent = info.kunYomi.join("、 ");
                fragment.appendChild(resultItem);
                const detailSpans =
                    main.kanjiInfoPanel.getKanjiDetailSpans(kanji, info);
                detailSpans.forEach((span) => detailsBar.appendChild(span));
                // Choose fitting classes
                // if (info.frequency === null || info.grade === 0) {
                //     kanjiFrame.style.color = "gray";
                // }
                // if (info.added) {
                //     kanjiFrame.style.color = "green";
                //     kanjiFrame.style.textShadow = "0 0 2px lawngreen";
                // }
            });
            promises.push(promise);
        }
        Promise.all(promises).then(
            () => this.searchResults.appendChild(fragment));
    }
}
customElements.define("kanji-section", KanjiSection);
});
