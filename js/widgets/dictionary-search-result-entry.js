"use strict";

const menuItems = contextMenu.registerItems({
    "copy-word": {
        label: "Copy word",
        click: ({ currentNode, data: { text } }) => {
            clipboard.writeText(text);
        }
    },
    "copy-reading": {
        label: "Copy reading",
        click: ({ currentNode, data: { text } }) => {
            clipboard.writeText(text);
        }
    },
    "copy-variant": {
        label: "Copy word variant",
        click: ({ currentNode, data: { text } }) => {
            clipboard.writeText(text);
        }
    },
    "copy-translation": {
        label: "Copy translation",
        click: ({ currentNode, data: { text } }) => {
            clipboard.writeText(text);
        }
    },
    "edit-word": {
        label: "Edit vocabulary item",
        click: ({ currentNode }) => {
            currentNode.editWord();
        }
    },
    "add-word": {
        label: "Add word to vocabulary",
        click: ({ currentNode }) => {
            currentNode.addWord();
        }
    }
});

class DictionarySearchResultEntry extends Widget {
    constructor () {
        super("dictionary-search-result-entry");
    }

    setInfo(info) {
        // Set entry class by frequency (determines background color)
        this.isProperName = !!info.properName;
        if (!info.properName) {
            const weights = dataManager.settings.dictionary.frequencyWeights;
            const rank = dataManager.content.calculateEntryRank(info, weights);
            if (rank <= 24000) {
                info.common = dataManager.settings.dictionary.tagCommonWords;
                if (dataManager.settings.dictionary.dyeCommonWords) {
                    if (rank <= 12000) {
                        info.entryClass = "frequent";
                    } else {
                        info.entryClass = "semi-frequent";
                    }
                }
            }
        } else {
            if (info.tags.length === 1) {
                info.entryClass = `tag-${info.tags[0]}`;
            }
        }

        // Prepare frequency indicators
        const flags = dataManager.settings.dictionary.frequencyIndicators;
        info.jlptLevel = flags.showJlptLevels && info.jlptLevel !== null ?
            `JLPT N${info.jlptLevel}` : undefined;
        info.newsRank = flags.showNewsFrequencies && info.newsRank !== null ?
            Math.ceil(info.newsRank / 2) : undefined;
        info.bookRank = flags.showBookFrequencies && info.bookRank !== null ?
            Math.ceil(info.bookRank / 1000) : undefined;

        // Instantiate handlebars template
        info.added = info.associatedVocabEntry !== null;
        this.root.innerHTML +=
            templates.get("dictionary-search-result-entry")(info);

        // Add tooltips to frequency tags
        if (info.newsRank) {
            this.$("entry-info").querySelector(".news-rank").tooltip(
                `Top ${info.newsRank},000 most frequent in news articles.`);
        }
        if (info.bookRank) {
            this.$("entry-info").querySelector(".book-rank").tooltip(
                `Top ${info.bookRank},000 most frequent in books.`);
        }

        // Open kanji info panel upon clicking a kanji in the main word
        if (info.wordsAndReadings[0].word.length > 0) {
            const mainWordFrame = this.root.getElementById("main-word");
            for (const span of mainWordFrame.children) {
                main.makeKanjiInfoLink(span, span.textContent);
            }
        }

        // Open kanji info panel upon clicking a kanji in the word variants
        const variantsFrame = this.root.getElementById("variants");
        if (variantsFrame !== null) {
            for (let i = 1; i < variantsFrame.children.length; ++i) {
                const wordFrame = variantsFrame.children[i].children[0];
                for (const span of wordFrame.children) {
                    main.makeKanjiInfoLink(span, span.textContent);
                }
            }
        }

        // Store important information in this element's dataset
        this.dataset.id = info.id;
        this.dataset.mainWord = info.wordsAndReadings[0].word;
        if (this.dataset.mainWord.length === 0) {
            this.dataset.mainWord = info.wordsAndReadings[0].reading;
        }
        if (info.associatedVocabEntry !== null) {
            this.dataset.isAdded = "true";
            this.dataset.vocabEntry = info.associatedVocabEntry;
        }

        const commandArgs = {};
        // Context menu to enable adding/editing word or copying text
        this.contextMenu(menuItems, (event) => {
            const target = event.path[0];
            let commandName = "copy-word";
            let text = this.dataset.mainWord;
            // Copy text of hovered item (or the main word if nothing hovered)
            if (this.$("main-reading").contains(target)) {
                text = info.wordsAndReadings[0].reading;
                commandName = "copy-reading";
            } else if (info.wordsAndReadings.length > 1 &&
                       this.$("variants").contains(target)) {
                if (target.classList.contains("word")) {
                    text = target.textContent.trim();
                    commandName = "copy-variant";
                } else if (target.parentNode.classList.contains("word")) {
                    text = target.parentNode.dataset.word;
                    commandName = "copy-variant";
                } else if (target.classList.contains("reading")) {
                    text = target.dataset.reading;
                    commandName = "copy-reading";
                }
            } else if (target.classList.contains("translation")) {
                text = target.textContent;
                commandName = "copy-translation";
            }
            commandArgs.text = text;
            return [commandName, this.dataset.isAdded ? "edit-word":"add-word"];
        }, commandArgs);

        // Click a translation or reading to search the dictionary for it
        this.addEventListener("click", (event) => {
            const categories = info.properName ? ["names"] : ["words"];
            const target = event.path[0];
            if (target.classList.contains("translation")) {
                // Remove parentheses and their content to match more stuff
                const query = target.textContent.replace(/\([^)]*\)/g,"").trim()
                main.sections["dictionary"].search(query, "meaning", categories)
            } else if (target.classList.contains("reading")) {
                const query = target.dataset.reading;
                main.sections["dictionary"].search(query, "reading", categories)
            } else if (target.id === "main-reading" ||
                       target.classList.contains("word")) {
                const query = target.textContent.trim();
                main.sections["dictionary"].search(query, "reading", categories)
            } else {
                return;
            }
            // If the dictionary is not opened, open it
            if (main.currentSection !== "dictionary") {
                main.openSection("dictionary");
            }
            // If the kanji info panel is open and maximized, minimize it
            const kanjiPanel = main.$("kanji-info-panel");
            if (kanjiPanel.isOpen && kanjiPanel.maximized) {
                kanjiPanel.setMaximized(false);
            }
        });

        // Attach event listeners to button to add/edit word in the vocabulary
        this.$("add-button").addEventListener("click", () => this.addWord());
        this.$("added-label").addEventListener("click", () => this.editWord());
    }

    toggleAdded(added, vocabEntry) {
        this.dataset.isAdded = added;
        this.dataset.vocabEntry = vocabEntry;
        this.$("added-label").toggleDisplay(added);
        this.$("add-button").toggleDisplay(!added);
    }

    addWord() {
        main.openPanel("edit-vocab", {
            entryName: this.dataset.mainWord,
            dictionaryId: parseInt(this.dataset.id),
            isProperName: this.isProperName
        });
    }

    editWord() {
        main.openPanel("edit-vocab", {
            entryName: this.dataset.vocabEntry
        });
    }
}

customElements.define(
        "dictionary-search-result-entry", DictionarySearchResultEntry);
module.exports = DictionarySearchResultEntry;
