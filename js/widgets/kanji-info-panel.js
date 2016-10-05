"use strict";

const menuItems = PopupMenu.registerItems({
    "copy-kanji": {
        label: "Copy kanji",
        click: ({ currentNode }) => {
            clipboard.writeText(currentNode.textContent);
        }
    },
    "copy-word": {
        label: "Copy word",
        click: ({ currentNode }) => {
            clipboard.writeText(currentNode.word);
        }
    },
    "edit-word": {
        label: "Edit vocabulary item",
        click: ({ currentNode }) => {
            main.panels["edit-vocab"].load(currentNode.word);
            main.openPanel("edit-vocab");
        }
    },
    "add-word": {
        label: "Add word to vocabulary",
        click: ({ currentNode }) => {
            main.panels["add-vocab"].load(currentNode.wordId, currentNode.word);
            main.openPanel("add-vocab");
        }
    }
});

class KanjiInfoPanel extends Widget {
    constructor () {
        super("kanji-info-panel", true, true);
        this.isOpen = false;
        // Store important DOM elements as properties
        this.frame = this.root.getElementById("window");
        this.closeButton = this.root.getElementById("close-button");
        this.kanji = this.root.getElementById("kanji");
        this.kanji.popupMenu(menuItems, ["copy-kanji"]);
        this.completeSvg = this.root.getElementById("complete-kanji");
        this.addedLabel = this.root.getElementById("added-label");
        this.addButton = this.root.getElementById("add-button");
        this.meanings = this.root.getElementById("meanings");
        this.onReadings = this.root.getElementById("on-readings");
        this.kunReadings = this.root.getElementById("kun-readings");
        this.onReadingsFrame = this.root.getElementById("on-frame");
        this.kunReadingsFrame = this.root.getElementById("kun-frame");
        this.numberFrame = this.root.getElementById("number-frame");
        this.numberLabel = this.root.getElementById("number-label");
        this.numberDetails = this.root.getElementById("number-details");
        this.counterFrame = this.root.getElementById("counter-frame");
        this.counterLabel = this.root.getElementById("counter-label");
        this.detailsFrame = this.root.getElementById("details-frame");
        this.strokeCount = this.root.getElementById("stroke-count");
        this.radical = this.root.getElementById("radical");
        this.radicalName = this.root.getElementById("radical-name");
        this.kanjiParts = this.root.getElementById("kanji-parts");
        this.strokeGraphics = this.root.getElementById("stroke-graphics");
        this.sectionButtons = {
            "info": this.root.getElementById("info-button"),
            "strokes": this.root.getElementById("strokes-button"),
            "examples": this.root.getElementById("examples-button")
        };
        this.sectionFrames = {
            "info": this.root.getElementById("info-frame"),
            "strokes": this.root.getElementById("strokes-frame"),
            "examples": this.root.getElementById("examples-frame")
        };
        this.exampleWords = this.root.getElementById("example-words");
        // Create button callbacks
        for (let name in this.sectionButtons) {
            this.sectionButtons[name].addEventListener("click", () => {
                this.openSection(name);
            });
        }
        // Callbacks
        this.closeButton.addEventListener("click", () => {
            Velocity(this, "slideUp", { duration: 200 });
            this.isOpen = false;
        });
        // Create button callbacks
        this.addButton.addEventListener("click", () => {
            main.panels["add-kanji"].load(this.currentKanji);
            main.openPanel("add-kanji");
        });
        this.addedLabel.addEventListener("click", () => {
            main.panels["edit-kanji"].load(this.currentKanji);
            main.openPanel("edit-kanji");
        });
        this.sectionButtons["examples"].addEventListener("click", () => {
            if (this.examplesLoaded) return;
            this.exampleWords.empty();
            dataManager.content.getExampleWordsForKanji(this.currentKanji)
            .then((rows) => {
                this.nextRowIndex = 0;
                this.exampleWordRows = rows;
                this.displayMoreExampleWords(15)
                this.exampleWords.scrollToTop();
                this.examplesLoaded = true;
            });
        });
        this.sectionButtons["strokes"].addEventListener("click", () => {
            if (this.strokesLoaded) return;
            this.strokesLoaded = true;
            this.displayStrokeGraphics();
        });
        // If user scrolls almost to the table bottom, load more example words
        const displayAmount = 20;
        this.exampleWords.uponScrollingBelow(50, () => {
            if (this.nextRowIndex > 0 && this.examplesLoaded &&
                    this.nextRowIndex < this.exampleWordRows.length)
                this.displayMoreExampleWords(displayAmount);
        });
        // State information variables
        this.currentKanji = null;
        this.examplesLoaded = false;
        this.strokesLoaded = false;
    }
    open () {
        if (!this.isOpen) {
            Velocity(this, "slideDown", { duration: 200 });
            this.isOpen = true;
        }
    }
    close () {
    }
    adjustToLanguage(language, secondary) {
    }
    openSection(newSection) {
        if (newSection === "strokes") {
            this.sectionFrames[newSection].style.display = "flex";
        } else {
            this.sectionFrames[newSection].style.display = "block";
        }
        this.sectionButtons[newSection].classList.add("selected");
        for (let section in this.sectionButtons) {
            if (newSection !== section) {
                this.sectionFrames[section].style.display = "none";
                this.sectionButtons[section].classList.remove("selected");
            }
        }
    }
    load (kanji) {
        this.examplesLoaded = false;
        this.strokesLoaded = false;
        this.currentKanji = kanji;
        // Fill info fields
        this.kanji.textContent = kanji;
        this.openSection("info");
        return dataManager.content.getKanjiInfo(kanji).then((info) => {
            // Display meanings, on-yomi, kun-yomi
            this.meanings.textContent = info.meanings.join(", ");
            // TODO: Dont just insert spaces, treat as separate clickable
            // entities with custom spacing
            this.onReadings.textContent = info.onYomi.join("、 ");
            this.kunReadings.textContent = info.kunYomi.join("、 ");
            // Hide on/kun-yomi header label if not available
            this.onReadingsFrame.style.display =
                    info.onYomi.length > 0 ? "block" : "none";
            this.kunReadingsFrame.style.display =
                    info.kunYomi.length > 0 ? "block" : "none";
            this.detailsFrame.empty();
            // Display misc info spans
            const detailSpans = this.getKanjiDetailSpans(kanji, info);
            for (let span of detailSpans) {
                this.detailsFrame.appendChild(span);
            }
            // If counter kanji: display list of objects counted in description
            const counterKanji = dataManager.content.data.counterKanji;
            if (kanji in counterKanji) {
                this.counterLabel.textContent = counterKanji[kanji].join(", ");
                this.counterFrame.style.display = "block";
            } else {
                this.counterFrame.style.display = "none";
            }
            // Info kanji is number, display represented number in description
            const numericKanji = dataManager.content.data.numericKanji;
            if (kanji in numericKanji.kanjiToNumber) {
                this.numberLabel.textContent = utility.getStringForNumber(
                    numericKanji.kanjiToNumber[kanji].number);
                // If kanji is only used in legal docs and/or obsolete,
                // display this info after the represented number
                if (numericKanji.kanjiToNumber[kanji].legal) {
                    this.numberDetails.textContent = 
                        "(For use in legal documents";
                    if (numericKanji.kanjiToNumber[kanji].obsolete)
                        this.numberDetails.textContent += ", now obsolete";
                    this.numberDetails.textContent += ")";
                } else {
                    this.numberDetails.textContent = "";
                }
                this.numberFrame.style.display = "block";
            } else {
                this.numberFrame.style.display = "none";
            }
            // Display 'added' sign or button for adding the kanji
            this.addedLabel.style.display =
                info.added ? "block" : "none";
            this.addButton.style.display =
                info.added ? "none" : "block";
            // Display number of strokes, radical and kanji parts
            // (In strokes section)
            this.strokeCount.textContent = info.strokes;
            this.radical.textContent = info.radical;
            this.radicalName.textContent = info.radicalName;
                `${info.radical}  (${info.radicalName})`;
            // List kanji parts
            this.kanjiParts.empty();
            for (let part of info.parts) {
                const span = document.createElement("span");
                span.textContent = part;
                this.kanjiParts.appendChild(span);
            }
        });
    }
    displayMoreExampleWords(amount) {
        const limit = Math.min(this.nextRowIndex + amount,
                               this.exampleWordRows.length);
        this.exampleWords.appendChild(
            this.createExampleWordRows(
                this.exampleWordRows.slice(this.nextRowIndex, limit)));
        this.nextRowIndex = limit;
    }
    // TODO: Differentiate term "rows" (database rows <-> table rows)...
    createExampleWordRows(dataRows) {
        const fragment = document.createDocumentFragment();
        for (let dataRow of dataRows) {
            // TODO: Attach popupmenu for adding words
            const tableRow = document.createElement("tr");
            // Add colored frequency marker to the row
            const freqMarker = document.createElement("td");
            const colorSpan = document.createElement("div");
            const alpha = dataRow.newsFreq === 0 ? 0 :
                0.2 + 0.8 * (dataRow.newsFreq - dataRow.newsFreq % 10) / 45;
            colorSpan.style.backgroundColor = `rgba(0, 255, 0, ${alpha})`;
            freqMarker.appendChild(colorSpan);
            tableRow.appendChild(freqMarker);
            tableRow.word = dataRow.word;
            tableRow.wordId = dataRow.id;
            // Add the word to the row
            const wordCol = document.createElement("td");
            wordCol.textContent = dataRow.word;
            tableRow.appendChild(wordCol);
            tableRow.popupMenu(menuItems, () => {
                return dataManager.vocab.contains(dataRow.word)
                .then((isAdded) => isAdded? ["copy-word", "edit-word"] :
                                            ["copy-word", "add-word"]);
            });
            // Add readings to the row
            // TODO: Choose most common readings / no outdated ones
            const readingsCol = document.createElement("td");
            readingsCol.textContent = dataRow.readings.split(";")[0];
            // .join(", ");
            tableRow.appendChild(readingsCol);
            // For each meaning, append a translation
            const meanings = dataRow.translations.split(";");
            const translations = [];
            for (let meaning of meanings) {
                translations.push(utility.parseEntries(meaning, ",")[0])
            }
            const translationsCol = document.createElement("td");
            translationsCol.textContent = translations.join(", ");
            tableRow.appendChild(translationsCol);
            // Append new table row to the fragment
            fragment.appendChild(tableRow);
        }
        return fragment;
    }
    displayStrokeGraphics() {
        const kanjiStrokes = dataManager.content.data.kanjiStrokes;
        this.strokeGraphics.empty();
        // If no stroke info is available, display a note
        if (!kanjiStrokes.hasOwnProperty(this.currentKanji)) {
            const span = document.createElement("span");
            // TODO: Make this message a bit more stylish (center, ...)
            span.textContent = "No stroke info available!";
            this.strokeGraphics.appendChild(span);
            return;
        }
        const strokes = kanjiStrokes[this.currentKanji];
        while (this.completeSvg.lastChild !== null) {
            this.completeSvg.removeChild(this.completeSvg.lastChild);
        }
        // Adjust svg diagram for the whole kanji
        this.completeSvg.setAttribute(
                "width", `${this.kanji.offsetWidth - 1}px`);
        this.completeSvg.setAttribute(
                "height", `${this.kanji.offsetHeight}px`);
        this.completeSvg.setAttribute("viewBox", "0 0 109 109");
        // Draw the complete kanji into the complete-kanji-svg
        const partToPath = {};
        for (let s of strokes) {
            const path = utility.createSvgNode(
                "path", { d: s.stroke });
            this.completeSvg.appendChild(path);
            // Also create a mapping from kanji part to path elements
            for (let part of s.parts) {
                if (!(part in partToPath)) {
                    partToPath[part] = [];
                }
                partToPath[part].push(path);
            }
        }
        // Show kanji diagram with highlighted strokes when hovering
        // over the kanji part corresponding to these strokes
        for (let i = 0; i < this.kanjiParts.children.length; ++i) {
            const part = this.kanjiParts.children[i].textContent;
            this.kanjiParts.children[i].addEventListener("mouseover",
            () => {
                this.completeSvg.style.visibility = "visible";
                this.kanji.style.visibility = "hidden";
                if (!(part in partToPath)) return;
                for (let path of partToPath[part]) {
                    path.classList.add("highlighted");
                    // path.setAttribute("stroke", "red");
                }
            });
            this.kanjiParts.children[i].addEventListener("mouseout",
            () => {
                this.completeSvg.style.visibility = "hidden";
                this.kanji.style.visibility = "visible";
                if (!(part in partToPath)) return;
                for (let path of partToPath[part]) {
                    path.classList.remove("highlighted");
                    // path.setAttribute("stroke", "black");
                }
            });
                
        }
        // For each stroke, create an svg diagram
        for (let i = 0; i < strokes.length; ++i) {
            const svg = utility.createSvgNode(
                    "svg", { //width: "90", height: "90",
                             viewBox: "0 0 109 109"});
            // Create lightgrey stippled bars in the middle
            const stippledLines = utility.createSvgNode("path",
                { d: "M 50.5,0  v 109  M 0,50.5  h 109" });
            stippledLines.classList.add("middle-marker");
            svg.appendChild(stippledLines);
            // Display all previous strokes in gray, current in black
            for (let j = 0; j <= i; ++j) {
                const path = utility.createSvgNode(
                    "path", { d: strokes[j].stroke });
                if (j == i) path.classList.add("last-stroke");
                svg.appendChild(path);
            }
            const lastStroke = strokes[i].stroke;
            // Display a red dot where the current stroke begins
            const dotPos = lastStroke.match(/^M\s?([-\d.]+),([-\d.]+)/);
            // TODO: Still sometimes throws error
            //       (Cannot read property 1 of null)
            const brushStart = utility.createSvgNode("circle",
                { cx: dotPos[1], cy: dotPos[2], r: "5" });
            brushStart.classList.add("brush-start");
            svg.appendChild(brushStart);
            this.strokeGraphics.appendChild(svg);
        }
        this.strokeGraphics.scrollToLeft();
    }
    
    getKanjiDetailSpans(kanji, info) {
        const spans = [];
        // Display grade info
        const gradeSpan = document.createElement("span");
        if (info.grade == 0) {
            gradeSpan.textContent = `Hyougai kanji`;
        } else if (info.grade <= 6) {
            gradeSpan.textContent = `Jouyou kanji, grade ${info.grade}`;
        } else if (info.grade == 8) {
            gradeSpan.textContent = `Jouyou kanji, secondary grade`;
        } else if (info.grade == 9) {
            gradeSpan.textContent = `Jinmeiyou kanji`;
        }
        spans.push(gradeSpan);
        // Append JLPT level if it has one
        if (info.jlptLevel !== null) {
            const jlptSpan = document.createElement("span");
            jlptSpan.textContent = `JLPT N${info.jlptLevel}`;
            spans.push(jlptSpan);
        }
        // Display frequency of kanji in newspapers (if in top 2500)
        if (info.frequency !== null) {
            const freqSpan = document.createElement("span");
            const freq = utility.getOrdinalNumberString(info.frequency);
            freqSpan.textContent = `${freq} most frequent`;
            spans.push(freqSpan);
        }
        // TODO: Add info if kanji is kokuji
        // Add info if kanji is a counter
        const counterKanji = dataManager.content.data.counterKanji;
        if (kanji in counterKanji) {
            const counterSpan = document.createElement("span");
            counterSpan.textContent = "Counter";
            spans.push(counterSpan);
        }
        // Add info if kanji is a numeral
        const numericKanji = dataManager.content.data.numericKanji;
        if (kanji in numericKanji.kanjiToNumber) {
            // Display small info label in details bar
            const numberSpan = document.createElement("span");
            numberSpan.textContent = "Numeral";
            spans.push(numberSpan);
        }
        return spans;
    }
}

customElements.define("kanji-info-panel", KanjiInfoPanel);
module.exports = KanjiInfoPanel;
