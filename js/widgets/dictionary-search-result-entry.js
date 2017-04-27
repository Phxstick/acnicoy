"use strict";

const menuItems = popupMenu.registerItems({
    "copy-word": {
        label: "Copy word",
        click: ({ currentNode }) => {
            clipboard.writeText(currentNode.dataset.mainWord);
        }
    },
    "edit-word": {
        label: "Edit vocabulary item",
        click: ({ currentNode }) => {
            main.openPanel("edit-vocab", {
                dictionaryId: currentNode.dataset.id,
                entryName: currentNode.dataset.mainWord
            });
        }
    },
    "add-word": {
        label: "Add word to vocabulary",
        click: ({ currentNode }) => {
            main.openPanel("add-vocab", {
                dictionaryId: currentNode.dataset.id,
                entryName: currentNode.dataset.mainWord
            });
        }
    }
});

class DictionarySearchResultEntry extends Widget {
    constructor () {
        super("dictionary-search-result-entry");
    }

    setInfo(info) {
        // Adjust data and fill handlebars template
        if (info.newsFreq > 0 && info.newsFreq < 25) {
            info.frequency = "semi-frequent";
        } else if (info.newsFreq >= 25) {
            info.frequency = "frequent";
        }
        this.root.innerHTML +=
            templates.get("dictionary-search-result-entry")(info);
        // Open kanji info panel upon clicking a kanji in the words
        if (info.wordsAndReadings[0].word.length > 0) {
            const mainWordFrame = this.root.getElementById("main-word");
            for (const span of mainWordFrame.children) {
                main.makeKanjiInfoLink(span, span.textContent);
            }
        }
        const variantsFrame = this.root.getElementById("variants");
        if (variantsFrame !== null) {
            for (let i = 1; i < variantsFrame.children.length; ++i) {
                const wordFrame = variantsFrame.children[i].children[0];
                for (const span of wordFrame.children) {
                    main.makeKanjiInfoLink(span, span.textContent);
                }
            }
        }
        this.dataset.id = info.id;
        this.dataset.mainWord = info.wordsAndReadings[0].word;
        if (this.dataset.mainWord.length === 0) {
            this.dataset.mainWord = info.wordsAndReadings[0].reading;
        }
        this.popupMenu(menuItems, () => {
            return dataManager.content.doesVocabularyContain(info.id, info)
            .then((isAdded) => isAdded? ["copy-word", "edit-word"] :
                                        ["copy-word", "add-word"]);
        });
        this.$("add-button").addEventListener("click", () => {
            main.openPanel("add-vocab", {
                dictionaryId: this.dataset.id,
                entryName: this.dataset.mainWord
            });
        });
        this.$("added-label").addEventListener("click", () => {
            main.openPanel("edit-vocab", {
                dictionaryId: this.dataset.id,
                entryName: this.dataset.mainWord
            });
        });
    }

    toggleAdded(added) {
        this.$("added-label").toggleDisplay(added);
        this.$("add-button").toggleDisplay(!added);
    }
}

customElements.define(
        "dictionary-search-result-entry", DictionarySearchResultEntry);
module.exports = DictionarySearchResultEntry;
