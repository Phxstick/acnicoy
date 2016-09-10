"use strict";

utility.processDocument(document.currentScript.ownerDocument, (docContent) => {
class KanjiSection extends TrainerSection {
    createdCallback() {
        this.root = this.createShadowRoot();
        this.root.appendChild(docContent);
        this.selectedKanji = null;
        this.overviewFrame = this.root.getElementById("overview");
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
            // TODO: Open edit-panel here instead
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
        for (let i = 0; i < rows.length; ++i) {
            const kanjiSpan = document.createElement("span");
            const kanji = rows[i].entry;
            const added = rows[i].added;
            const strokes = rows[i].strokes;
            let grade = rows[i].grade;
            if (grade === 9 || grade === 10) grade = 9;
            else if (grade === null) grade = 0;
            kanjiSpan.textContent = kanji;
            kanjiSpan.id = kanji;
            kanjiSpan.className = `${added ? "added" : ""} grade-${grade} 
 strokes-${strokes} kanji`;
            if (added) this.popupMenuAdded.attachTo(kanjiSpan);
            else this.popupMenuMissing.attachTo(kanjiSpan);
            kanjiSpan.addEventListener("click", () => {
                if (this.selectedKanji !== null)
                    this.selectedKanji.classList.remove("kanji-selected");
                kanjiSpan.classList.add("kanji-selected");
                this.selectedKanji = kanjiSpan;
                main.kanjiInfoPanel.load(kanji).then(
                    () => main.kanjiInfoPanel.open());
            });
            fragment.appendChild(kanjiSpan);
        }
        this.root.getElementById("kanji-container").appendChild(fragment);
    }
    displayKanji(ordering, onlyMissing=false, showJinmeiyou=false,
            showHyougai=false) {
        this.overviewFrame.empty();
        $(".added").css("display", onlyMissing ? "none" : "inline-block");
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
                this.overviewFrame.appendChild(title);
                this.overviewFrame.appendChild(content);
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
        return dataManager.content.loaded["Japanese"].then((content) => {
            return dataManager.kanji.getAmountAddedForGrade(grade)
            .then((added) => {
                const total = content.numKanjiPerGrade[grade];
                this.addedPerGradeCounters[grade].textContent =
                    `( ${added} / ${total} )`;
            });
        });
    }
}
document.registerElement("kanji-section",
    { prototype: KanjiSection.prototype });
});
