"use strict";

const menuItems = contextMenu.registerItems({
    "copy-kanji": {
        label: "Copy kanji",
        click: ({ currentNode }) => {
            clipboard.writeText(currentNode.textContent);
        }
    }
});

class KanjiInfoPanel extends Widget {
    constructor() {
        super("kanji-info-panel", true, true);
        this.isOpen = false;
        this.currentKanji = null;
        this.examplesLoaded = false;
        this.strokesLoaded = false;
        this.maximized = false;
        this.sessionHistory = [];
        this.sessionHistoryIndex = -1;
        this.browsingSessionHistory = false;
        this.sectionButtons = {
            "info": this.$("info-button"),
            "strokes": this.$("strokes-button"),
            "examples": this.$("examples-button")
        };
        this.sectionFrames = {
            "info": this.$("info-frame"),
            "strokes": this.$("strokes-frame"),
            "examples": this.$("examples-frame")
        };
        // Attach event listeners
        this.$("kanji").contextMenu(menuItems, ["copy-kanji"]);
        for (const name in this.sectionButtons) {
            this.sectionButtons[name].addEventListener("click", () => {
                this.openSection(name);
            });
        }
        this.$("close-button").addEventListener("click", () => this.close());
        this.$("maximize-button").addEventListener("click",
            () => this.setMaximized(!this.maximized));
        this.$("history-button").tooltip("Open kanji history");
        this.$("history-button").addEventListener("click", () => {
            this.$("history").toggleDisplay();
            event.stopPropagation();
        });
        this.$("history-prev-button").tooltip("Show previous kanji");
        this.$("history-prev-button").addEventListener("click", () => {
            if (this.sessionHistoryIndex > 0) {
                --this.sessionHistoryIndex;
                this.browsingSessionHistory = true;
                this.load(this.sessionHistory[this.sessionHistoryIndex]);
                this.$("history-next-button").disabled = false;
                this.$("history-prev-button").disabled =
                    this.sessionHistoryIndex === 0;
            }
        });
        this.$("history-next-button").tooltip("Show next kanji");
        this.$("history-next-button").addEventListener("click", () => {
            if (this.sessionHistoryIndex < this.sessionHistory.length - 1) {
                ++this.sessionHistoryIndex;
                this.browsingSessionHistory = true;
                this.load(this.sessionHistory[this.sessionHistoryIndex]);
                this.$("history-prev-button").disabled = false;
                this.$("history-next-button").disabled =
                    this.sessionHistoryIndex === this.sessionHistory.length - 1;
            }
        });
        this.$("add-button").addEventListener("click", () => {
            main.openPanel("add-kanji", { entryName: this.currentKanji });
        });
        this.$("added-label").addEventListener("click", () => {
            main.openPanel("edit-kanji", { entryName: this.currentKanji });
        });
        this.loadExampleWords = async () => {
            if (this.examplesLoaded) return;
            this.examplesLoaded = true;
            await this.exampleWordsViewState.search(this.currentKanji);
        };
        this.loadStrokeGraphics = () => {
            if (this.strokesLoaded) return;
            this.strokesLoaded = true;
            this.displayStrokeGraphics();
        };
        this.sectionButtons["examples"].addEventListener(
            "click", this.loadExampleWords);
        this.sectionButtons["strokes"].addEventListener(
            "click", this.loadStrokeGraphics);
        // =================================================================
        // Example words view functionality
        // =================================================================
        const createSmallExampleWordViewItem = async (entryId) => {
            const ExampleWordEntry = customElements.get("example-word-entry");
            const info = await
                dataManager.content.getExampleWordsDataForEntryId(entryId);
            return new ExampleWordEntry(info);
        };
        const createDetailedExampleWordViewItem = async (entryId) => {
            const info = await
                dataManager.content.getDictionaryEntryInfo(entryId);
            const resultEntry = 
                document.createElement("dictionary-search-result-entry");
            info.added = await
                dataManager.content.doesVocabularyContain(entryId, info);
            resultEntry.setInfo(info);
            return resultEntry;
        };
        this.$("example-words").classList.add("small-entries");
        this.exampleWordsViewState = utility.initializeView({
            view: this.$("example-words"),
            getData: (kanji) => dataManager.content.exampleWordIds[kanji],
            createViewItem: createDetailedExampleWordViewItem,
            initialDisplayAmount: 10,
            displayAmount: 15
        });
        // =================================================================
        // Kanji history
        // =================================================================
        utility.makePopupWindow(this.$("history"));
        this.historyViewState = utility.initializeView({
            view: this.$("history"),
            getData: async () => await
                dataManager.history.getForLanguage("Japanese", "kanji_info"),
            createViewItem: ({ name }) => this.createHistoryViewItem(name),
            initialDisplayAmount: 30,
            displayAmount: 10
        });
        this.$("history").addEventListener("click", (event) => {
            if (event.target.parentNode !== this.$("history")) return;
            this.load(event.target.textContent);
        });
        // =================================================================
        // Load settings
        // =================================================================
        this.setMaximized(dataManager.settings.kanjiInfo.maximized);
    }

    registerCentralEventListeners() {
        events.on("kanji-added", (kanji) => {
            if (this.currentKanji !== kanji) return;
            this.$("added-label").show();
            this.$("add-button").hide();
        });
        events.on("kanji-removed", (kanji) => {
            if (this.currentKanji !== kanji) return;
            this.$("added-label").hide();
            this.$("add-button").show();
        });
    }

    async open() {
        if (this.isOpen) return;
        Velocity(this, "slideDown", { duration: 200 });
        this.isOpen = true;
    }

    close() {
        if (!this.isOpen) return;
        Velocity(this, "slideUp", { duration: 200 });
        this.isOpen = false;
    }

    loadHistory() {
        this.historyViewState.search();
    }

    setMaximized(bool) {
        this.maximized = bool;
        dataManager.settings.kanjiInfo.maximized = this.maximized;
        this.classList.toggle("maximized", this.maximized);
        for (const sectionName in this.sectionFrames) {
            this.sectionFrames[sectionName].toggleDisplay(this.maximized);
        }
        if (this.maximized) {
            if (this.currentKanji !== null) {
                this.loadExampleWords();
                this.loadStrokeGraphics();
            }
            this.$("maximize-button").firstChild.innerHTML = "&#x1f5d5";
            this.$("maximize-button").tooltip("Minimize window");
        } else {
            this.sectionFrames["strokes"].hide();
            this.sectionFrames["examples"].hide();
            this.openSection("info");
            this.$("maximize-button").firstChild.innerHTML = "&#x1f5d6";
            this.$("maximize-button").tooltip("Maximize window");
        }
        this.$("close-button").children[0].toggleDisplay(!this.maximized);
        this.$("close-button").classList.toggle("x-shape", this.maximized);
    }

    openSection(newSection) {
        this.sectionFrames[newSection].show();
        this.sectionButtons[newSection].classList.add("selected");
        for (const section in this.sectionButtons) {
            if (!this.maximized && newSection !== section) {
                this.sectionFrames[section].hide();
                this.sectionButtons[section].classList.remove("selected");
            }
        }
    }

    async load (kanji, dummy=false) {
        if (kanji === this.currentKanji) return;
        if (!dummy) {
            // Delete any entry with the same name from the history view items
            for (const entry of this.$("history").children) {
                if (entry.textContent === kanji) {
                    this.$("history").removeChild(entry);
                    break;
                }
            }
            // Add entry to the history and insert it into the history view
            dataManager.history.addEntry("kanji_info", { name: kanji });
            this.$("history").insertBefore(
                this.createHistoryViewItem(kanji), this.$("history").firstChild)
            // Update session history
            if (!this.browsingSessionHistory) {
                this.sessionHistoryIndex++;
                this.sessionHistory.splice(this.sessionHistoryIndex);
                this.sessionHistory.push(kanji);
                this.$("history-next-button").disabled = true;
                this.$("history-prev-button").disabled =
                    this.sessionHistoryIndex === 0;
            }
            this.browsingSessionHistory = false;
        }
        // Get content and set state variables
        const content = dataManager.content.get("Japanese", "English");
        this.examplesLoaded = false;
        this.strokesLoaded = false;
        this.currentKanji = kanji;
        // Fill info fields
        this.$("kanji").textContent = kanji;
        this.openSection("info");
        const info = await content.getKanjiInfo(kanji);
        // Display meanings, on-yomi, kun-yomi
        this.$("meanings-label").textContent = info.meanings.join(", ");
        // TODO: Dont just insert spaces, treat as separate clickable
        // entities with custom spacing
        this.$("on-yomi-label").textContent = info.onYomi.join("、 ");
        this.$("kun-yomi-label").textContent = info.kunYomi.join("、 ");
        // Hide on/kun-yomi header label if not available
        this.$("on-yomi-frame").toggleDisplay(info.onYomi.length > 0);
        this.$("kun-yomi-frame").toggleDisplay(info.kunYomi.length > 0);
        this.$("details-frame").empty();
        // Display misc info spans
        const detailSpans = this.getKanjiDetailSpans(kanji, info);
        for (const span of detailSpans) {
            this.$("details-frame").appendChild(span);
        }
        // If counter kanji: display list of objects counted in description
        const isCounterKanji = kanji in content.counterKanji;
        if (isCounterKanji) {
            this.$("counter-label").textContent =
                content.counterKanji[kanji].join(", ");
        }
        this.$("counter-frame").toggleDisplay(isCounterKanji);
        // Info kanji is number, display represented number in description
        const isNumericKanji = kanji in content.numericKanji.kanjiToNumber;
        if (isNumericKanji) {
            this.$("number-label").textContent = utility.getStringForNumber(
                content.numericKanji.kanjiToNumber[kanji].number);
            // If kanji is only used in legal docs and/or obsolete,
            // display this info after the represented number
            if (content.numericKanji.kanjiToNumber[kanji].legal) {
                this.$("number-details").textContent = 
                    "(For use in legal documents";
                if (content.numericKanji.kanjiToNumber[kanji].obsolete) {
                    this.$("number-details").textContent += ", now obsolete";
                }
                this.$("number-details").textContent += ")";
            } else {
                this.$("number-details").textContent = "";
            }
        }
        this.$("number-frame").toggleDisplay(isNumericKanji);
        // If kanji represents a unit of length
        const isUnitOfLength = "分寸尺丈".includes(kanji);
        if (isUnitOfLength) {
            const label = this.$("length-unit-label");
            if (kanji === "分") {
                label.textContent = "1 分 (ぶ) = ３ mm";
            } else if (kanji === "寸") {
                label.textContent = "1 寸 (すん) = 10 分 = 3.03 cm";
            } else if (kanji === "尺") {
                label.textContent = "1 尺 (しゃく) = 10 寸 = 30.3 cm";
            } else if (kanji === "丈") {
                label.textContent = "1 丈 (じょう) = 10 尺 = 3.03 m";
            }
            main.convertTextToKanjiInfoLinks(label);
        }
        this.$("length-unit-frame").toggleDisplay(isUnitOfLength);
        // Display 'added' sign or button for adding the kanji
        this.$("added-label").toggleDisplay(info.added);
        this.$("add-button").toggleDisplay(!info.added);
        // Display number of strokes, radical and kanji parts
        this.$("stroke-count").textContent = info.strokes;
        this.$("radical").textContent = info.radical;
        this.$("radical-name").textContent = info.radicalName;
        // List kanji parts
        this.$("kanji-parts").empty();
        for (const part of info.parts) {
            const span = document.createElement("span");
            span.textContent = part;
            this.$("kanji-parts").appendChild(span);
        }
        if (this.maximized && !dummy) {
            this.loadExampleWords();
            this.loadStrokeGraphics();
        }
    }

    displayStrokeGraphics() {
        if (this.$("kanji").isHidden()) return;
        const content = dataManager.content.get("Japanese", "English");
        const kanjiStrokes = content.kanjiStrokes;
        this.$("stroke-graphics").empty();
        // If no stroke info is available, display a note
        const strokesAvailable = kanjiStrokes.hasOwnProperty(this.currentKanji);
        this.$("stroke-graphics").toggleDisplay(strokesAvailable);
        this.$("strokes-not-available-info").toggleDisplay(!strokesAvailable);
        if (!strokesAvailable) return;
        const strokes = kanjiStrokes[this.currentKanji];
        this.$("complete-kanji-svg").empty();
        // Adjust svg diagram for the whole kanji
        utility.finishEventQueue().then(() => {
            this.$("complete-kanji-svg").setAttribute(
                    "width", `${this.$("kanji").offsetWidth - 1}px`);
            this.$("complete-kanji-svg").setAttribute(
                    "height", `${this.$("kanji").offsetHeight}px`);
            this.$("complete-kanji-svg").setAttribute("viewBox", "0 0 109 109");
        });
        // Draw the complete kanji into the complete-kanji-svg
        const partToPath = {};
        for (const { stroke, parts } of strokes) {
            const path = utility.createSvgNode("path", { d: stroke });
            this.$("complete-kanji-svg").appendChild(path);
            // Also create a mapping from kanji part to path elements
            for (const part of parts) {
                if (!(part in partToPath)) {
                    partToPath[part] = [];
                }
                partToPath[part].push(path);
            }
        }
        // Show kanji diagram with highlighted strokes when hovering
        // over the kanji part corresponding to these strokes
        for (const item of this.$("kanji-parts").children) {
            const part = item.textContent;
            item.addEventListener("mouseover", () => {
                this.$("complete-kanji-svg").style.visibility = "visible";
                this.$("kanji").style.visibility = "hidden";
                if (!(part in partToPath)) return;
                for (const path of partToPath[part]) {
                    path.classList.add("highlighted");
                }
            });
            item.addEventListener("mouseout", () => {
                this.$("complete-kanji-svg").style.visibility = "hidden";
                this.$("kanji").style.visibility = "visible";
                if (!(part in partToPath)) return;
                for (const path of partToPath[part]) {
                    path.classList.remove("highlighted");
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
            const dotPos = lastStroke.match(/^M\s*([-\d.]+),([-\d.]+)/);
            const brushStart = utility.createSvgNode("circle",
                { cx: dotPos[1], cy: dotPos[2], r: "5" });
            brushStart.classList.add("brush-start");
            svg.appendChild(brushStart);
            this.$("stroke-graphics").appendChild(svg);
        }
        this.$("stroke-graphics").scrollToLeft();
    }
    
    getKanjiDetailSpans(kanji, info) {
        const content = dataManager.content.get("Japanese", "English");
        const spans = [];
        const makeSpan = (text) => {
            const span = document.createElement("span");
            span.textContent = text;
            spans.push(span);
        }
        // Display grade info
        if (info.grade == 0) {
            makeSpan(`Hyougai kanji`);
        } else if (info.grade <= 6) {
            makeSpan(`Jouyou kanji, grade ${info.grade}`);
        } else if (info.grade == 8) {
            makeSpan(`Jouyou kanji, secondary grade`);
        } else if (info.grade == 9) {
            makeSpan(`Jinmeiyou kanji`);
        }
        // Append JLPT level if it has one
        if (info.jlptLevel !== null) {
            makeSpan(`JLPT N${info.jlptLevel}`);
        }
        // Display frequency of kanji in newspapers (if in top 2500)
        if (info.frequency !== null) {
            const freq = utility.getOrdinalNumberString(info.frequency);
            makeSpan(`${freq} most frequent`);
        }
        // Add info if kanji is a kokuji, counter, numeral, unit of length
        if (content.kokujiList.has(kanji)) makeSpan("Kokuji");
        if (kanji in content.counterKanji) makeSpan("Counter");
        if (kanji in content.numericKanji.kanjiToNumber) makeSpan("Numeral");
        if ("分寸尺丈".includes(kanji)) makeSpan("Unit of length");
        return spans;
    }

    createHistoryViewItem(kanji) {
        const item = document.createElement("div");
        item.textContent = kanji;
        return item;
    }
}

customElements.define("kanji-info-panel", KanjiInfoPanel);
module.exports = KanjiInfoPanel;
