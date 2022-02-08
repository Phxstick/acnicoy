"use strict";

const menuItems = contextMenu.registerItems({
    "copy-kanji": {
        label: "Copy kanji",
        click: ({ currentNode }) => {
            clipboard.writeText(currentNode.textContent);
        }
    },
    "copy-hanzi": {
        label: "Copy hanzi",
        click: ({ currentNode }) => {
            clipboard.writeText(currentNode.textContent);
        }
    }
});

class KanjiInfoPanel extends Widget {
    constructor() {
        super("kanji-info-panel", true, true);
        this.isOpen = false;
        this.maximized = false;
        this.currentKanji = null;
        this.historyLoaded = false;
        this.examplesLoaded = false;
        this.strokesLoaded = false;
        this.historyIndex = 0;
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
        this.$("kanji").contextMenu(menuItems, () =>
            dataManager.currentLanguage === "Japanese" ?
            ["copy-kanji"] : ["copy-hanzi"]);
        for (const name in this.sectionButtons) {
            this.sectionButtons[name].addEventListener("click", () => {
                this.openSection(name);
            });
        }
        this.$("close-button").addEventListener("click", () => this.close());
        this.$("maximize-button").addEventListener("click",
            () => this.setMaximized(!this.maximized));
        this.$("history-button").tooltip(
            () => dataManager.currentLanguage === "Japanese" ?
            "Open kanji history" : "Open hanzi history");
        this.$("history-button").addEventListener("click", (event) => {
            this.$("history").toggleDisplay();
            event.stopPropagation();
        });
        this.$("history-prev-button").tooltip(
            () => dataManager.currentLanguage === "Japanese" ?
            "Show previous kanji" : "Show previous hanzi");
        this.$("history-prev-button").addEventListener("click", () => {
            const historyItems = this.$("history").children
            if (this.historyIndex === historyItems.length - 1) return
            ++this.historyIndex;
            this.load(historyItems[this.historyIndex].textContent, false)
            this.$("history-next-button").disabled = false;
            this.$("history-prev-button").disabled =
                this.historyIndex === historyItems.length - 1;
        });
        this.$("history-next-button").tooltip(
            () => dataManager.currentLanguage === "Japanese" ?
            "Show next kanji" : "Show next hanzi");
        this.$("history-next-button").addEventListener("click", () => {
            const historyItems = this.$("history").children
            if (this.historyIndex === 0) return
            --this.historyIndex;
            this.load(historyItems[this.historyIndex].textContent, false)
            this.$("history-prev-button").disabled = false;
            this.$("history-next-button").disabled = this.historyIndex === 0
        });
        const openEditPanel = () => {
            const panel = dataManager.currentLanguage === "Japanese" ?
                "edit-kanji" : "edit-hanzi"
            main.openPanel(panel, { entryName: this.currentKanji });
        }
        this.$("add-button").addEventListener("click", openEditPanel)
        this.$("added-label").addEventListener("click", openEditPanel)
        this.loadExampleWords = async () => {
            if (this.examplesLoaded) return;
            this.examplesLoaded = true;
            this.$("example-words").style.visiblity = "hidden"
            // this.$("example-words-placeholder").show()
            await this.exampleWordsView.load(this.currentKanji);
            await utility.finishEventQueue()
            this.$("example-words").style.visiblity = "visible"
            // this.$("example-words-placeholder").hide()
        };
        this.$("example-words-placeholder").hide()
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
        const createDetailedExampleWordViewItem = async (entryId) => {
            const language = dataManager.currentLanguage
            const config = window.languageToDictionaryConfig[language]
            return await config.viewItemFunction(entryId, "words")
        };
        this.$("example-words").classList.add("small-entries");
        this.exampleWordsView = new View({
            viewElement: this.$("example-words"),
            getData: async (char) => {
                if (dataManager.currentLanguage === "Japanese") {
                    return dataManager.content.exampleWordIds[char]
                } else {
                    return dataManager.content.getExampleWordsForHanzi(char)
                }
            },
            createViewItem: createDetailedExampleWordViewItem,
            initialDisplayAmount: 10,
            displayAmount: 15
        });
        // =================================================================
        // Kanji history
        // =================================================================
        utility.makePopupWindow(this.$("history"));
        this.historyView = new View({
            viewElement: this.$("history"),
            getData: async () => {
                const [language, table] =
                    dataManager.currentLanguage == "Japanese" ?
                    ["Japanese", "kanji_info"] : ["Chinese", "hanzi_info"]
                const history =
                    await dataManager.history.getForLanguage(language, table)
                this.historyIndex = 0
                return history
            },
            createViewItem: ({ name }) => this.createHistoryViewItem(name),
            initialDisplayAmount: 30,
            displayAmount: 10
        });
        this.$("history").addEventListener("click", (event) => {
            if (event.target.parentNode !== this.$("history")) return;
            this.load(event.target.textContent);
        });
    }

    registerCentralEventListeners() {
        events.onAll(["kanji-added", "hanzi-added"], (kanji) => {
            if (this.currentKanji !== kanji) return;
            this.$("added-label").show();
            this.$("add-button").hide();
        });
        events.on(["kanji-removed", "hanzi-removed"], (kanji) => {
            if (this.currentKanji !== kanji) return;
            this.$("added-label").hide();
            this.$("add-button").show();
        });
        const updateWordStatus = (word, dictionaryId, isAdded) => {
            if (!dataManager.content.isDictionaryLoaded()) return
            if (dictionaryId === null) {
                dictionaryId = isAdded ?
                    dataManager.content.guessDictionaryIdForVocabItem(word) :
                    dataManager.content.guessDictionaryIdForNewWord(word)
                if (dictionaryId === null) return
            }
            for (const searchResultEntry of this.$("example-words").children) {
                let resultEntryId = searchResultEntry.dataset.id
                if (dataManager.content.usesDictionaryIds) {
                    resultEntryId = parseInt(resultEntryId)
                }
                if (resultEntryId === dictionaryId) {
                    searchResultEntry.toggleAdded(isAdded, word);
                    break
                } 
            }
        };
        events.on("word-added", (word, dictionaryId) => {
            updateWordStatus(word, dictionaryId, true);
        });
        events.on("word-deleted", (word, dictionaryId) => {
            updateWordStatus(word, dictionaryId, false);
        });
        events.on("settings-loaded", () => {
            this.setMaximized(dataManager.settings.kanjiInfo.maximized);
        });
    }

    adjustToLanguage(language, secondary) {
        this.historyLoaded = false
        this.$("add-button").textContent =
            language === "Japanese" ? "Add kanji" : "Add hanzi"
    }

    async open() {
        if (this.isOpen) return;
        if (dataManager.settings.design.animateSlidingPanels) {
            if (!this.maximized) {
                Velocity(this, "slideDown",
                    { duration: main.kanjiInfoPanelSlideDuration });
            } else {
                // Animation is too chunky, prob. because example words load
                // Velocity(this, "fadeIn",
                //     { duration: main.kanjiInfoPanelSlideDuration });
                this.show();
            }
        } else {
            this.show();
        }
        this.isOpen = true;
    }

    close() {
        if (!this.isOpen) return;
        if (dataManager.settings.design.animateSlidingPanels) {
            if (!this.maximized) {
                Velocity(this, "slideUp",
                    { duration: main.kanjiInfoPanelSlideDuration });
            } else {
                // Animation is too chunky, prob. because example words load
                // Velocity(this, "fadeOut",
                //     { duration: main.kanjiInfoPanelSlideDuration });
                this.hide();
            }
        } else {
            this.hide();
        }
        this.isOpen = false;
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
            this.$("maximize-button").tooltip("Minimize window");
        } else {
            this.sectionFrames["strokes"].hide();
            this.sectionFrames["examples"].hide();
            this.openSection("info");
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

    async load(kanji, updateHistory=true) {
        if (kanji === this.currentKanji) return;
        if (updateHistory) {
            const promise = this.historyLoaded ?
                Promise.resolve() : this.historyView.load()
            promise.then(() => {
                this.historyLoaded = true
                // Delete any entry with the same name from the history view
                for (const entry of this.$("history").children) {
                    if (entry.textContent === kanji) {
                        this.$("history").removeChild(entry);
                        break;
                    }
                }
                // Add entry to the history and insert it into the view
                const tableName = dataManager.currentLanguage == "Japanese" ?
                    "kanji_info" : "hanzi_info"
                dataManager.history.addEntry(tableName, { name: kanji });
                this.$("history").insertBefore(
                    this.createHistoryViewItem(kanji),
                    this.$("history").firstChild)
                this.historyIndex = 0
                this.$("history-next-button").disabled = true;
                this.$("history-prev-button").disabled =
                    this.$("history").children.length === 1
            })
        }
        // Get content and set state variables
        const content = dataManager.content;
        const language = dataManager.currentLanguage;
        this.examplesLoaded = false;
        this.strokesLoaded = false;
        this.currentKanji = kanji;
        // Fill info fields
        this.$("kanji").textContent = kanji;
        this.openSection("info");
        const info = await (language === "Japanese" ?
            content.getKanjiInfo(kanji) : content.getHanziInfo(kanji))
        // Display core information
        if (language === "Japanese") {
            this.$("meanings-label").textContent = info.meanings.join(", ");
            // TODO: Dont just insert spaces, treat as separate clickable
            // entities with custom spacing
            this.$("on-yomi-label").textContent = info.onYomi.join("、 ");
            this.$("kun-yomi-label").textContent = info.kunYomi.join("、 ");
            this.$("on-yomi-frame").toggleDisplay(info.onYomi.length > 0);
            this.$("kun-yomi-frame").toggleDisplay(info.kunYomi.length > 0);
            this.$("pinyin-frame").hide()
            this.$("jyutping-frame").hide()
        } else if (language === "Chinese") {
            this.$("meanings-label").textContent =
                info.meanings.map(m => m.join(", ")).join("; ")
            this.$("pinyin-label").textContent = info.pinyin.join(", ");
            this.$("jyutping-label").textContent = info.jyutping.join(", ");
            this.$("pinyin-frame").toggleDisplay(info.pinyin.length > 0);
            this.$("jyutping-frame").toggleDisplay(info.jyutping.length > 0);
            this.$("on-yomi-frame").hide()
            this.$("kun-yomi-frame").hide()
        }
        // Display misc info spans
        this.$("details-frame").empty();
        const detailSpans = language === "Japanese" ?
            this.getKanjiDetailSpans(kanji, info) :
            this.getHanziDetailSpans(kanji, info)
        for (const span of detailSpans) {
            this.$("details-frame").appendChild(span);
        }
        if (language === "Japanese") {
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
                        this.$("number-details").textContent += ", now obsolete"
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
        } else {
            this.$("counter-frame").hide()
            this.$("number-frame").hide()
            this.$("length-unit-frame").hide()
        }
        // Display 'added' sign or button for adding the kanji
        const isAdded = await (language === "Japanese" ?
            dataManager.kanji.isAdded(kanji) : dataManager.hanzi.isAdded(kanji))
        this.$("added-label").toggleDisplay(isAdded);
        this.$("add-button").toggleDisplay(!isAdded);
        // Display number of strokes, radical and kanji parts
        this.$("stroke-count").textContent = info.strokes;
        this.$("radical").textContent = info.radical;
        this.$("radical-name").textContent = info.radicalName;
        // List kanji parts
        if (info.parts !== null) {
            this.$("kanji-parts").empty();
            for (const part of info.parts) {
                const span = document.createElement("span");
                span.textContent = part;
                this.$("kanji-parts").appendChild(span);
            }
        }
        this.$("kanji-parts-frame").toggleDisplay(info.parts !== null)
        // Immediately load example words if the panel is maximized
        if (this.maximized && !dummy) {
            this.$("example-words").empty();
            this.loadExampleWords();
            this.loadStrokeGraphics();
        }
    }

    displayStrokeGraphics() {
        if (this.$("kanji").isHidden()) return;
        const kanjiStrokes = dataManager.currentLanguage === "Japanese" ?
            dataManager.content.kanjiStrokes : dataManager.content.hanziStrokes
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
            const s = dataManager.currentLanguage === "Japanese" ? 109 : 1024
            this.$("complete-kanji-svg").setAttribute("viewBox",`0 0 ${s} ${s}`)
        });
        // Draw the complete kanji into the complete-kanji-svg
        this.$("complete-kanji-svg").classList.toggle("hanzi",
            dataManager.currentLanguage === "Chinese")
        let parentNode = this.$("complete-kanji-svg")
        if (dataManager.currentLanguage === "Chinese") {
            parentNode = utility.createSvgNode("g",
                { transform: "scale(1, -1) translate(0, -900)" })
            this.$("complete-kanji-svg").appendChild(parentNode)
        }
        const partToPath = {};
        for (const { stroke, parts } of strokes) {
            const path = utility.createSvgNode("path", { d: stroke });
            parentNode.appendChild(path);
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
            const size =
                dataManager.currentLanguage === "Japanese" ? 109 : 1024
            const svg = utility.createSvgNode(
                    "svg", { //width: "90", height: "90",
                             viewBox: `0 0 ${size} ${size}`});
            // Create lightgrey stippled bars in the middle
            const stippledLines = utility.createSvgNode("path",
                { d: `M ${size/2},0  v ${size}  M 0,${size/2}  h ${size}` });
            stippledLines.classList.add("middle-marker");
            svg.appendChild(stippledLines);
            let parentNode = svg
            // Special treatmeant for Hanzi strokes
            if (dataManager.currentLanguage === "Chinese") {
                stippledLines.classList.add("scaled")
                parentNode = utility.createSvgNode("g",
                    { transform: "scale(1, -1) translate(0, -900)" })
                svg.appendChild(parentNode)
            }
            // Display all previous strokes in gray, current in black
            for (let j = 0; j <= i; ++j) {
                const path = utility.createSvgNode(
                    "path", { d: strokes[j].stroke });
                if (j == i) path.classList.add("last-stroke");
                if (dataManager.currentLanguage === "Chinese") {
                    path.classList.add("hanzi")
                }
                parentNode.appendChild(path);
            }
            // Display a red dot where the current stroke begins
            let brushStart
            if (dataManager.currentLanguage === "Chinese") {
                const start = strokes[i].start
                brushStart = utility.createSvgNode("circle",
                    { cx: start[0], cy: start[1], r: "50" });
            }
            if (dataManager.currentLanguage === "Japanese") {
                const lastStroke = strokes[i].stroke;
                const dotPos = lastStroke.match(/^M\s*([-\d.]+),([-\d.]+)/);
                brushStart = utility.createSvgNode("circle",
                    { cx: dotPos[1], cy: dotPos[2], r: "5" });
            }
            brushStart.classList.add("brush-start");
            parentNode.appendChild(brushStart)
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
        // if ("分寸尺丈".includes(kanji)) makeSpan("Unit of length");
        return spans;
    }

    getHanziDetailSpans(hanzi, info) {
        const spans = [];
        const makeSpan = (text) => {
            const span = document.createElement("span");
            span.textContent = text;
            spans.push(span);
        }
        // Display HK grade info
        if (info.grade !== null) {
            if (info.grade <= 6) {
                makeSpan(`HK Grade ${info.grade}`)
            } else if (info.grade == 7) {
                makeSpan(`HK grade 7–9`);
            }
        }
        // Append HSK level if it's included
        if (info.hskLevel !== null) {
            const level = info.hskLevel === 7 ? "7–9" : info.hskLevel
            makeSpan(`HSK ${level}`);
        }
        // Display frequency of kanji in USENET listings
        if (info.frequency !== null) {
            makeSpan(`Frequency ${info.frequency}`);
        }
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
