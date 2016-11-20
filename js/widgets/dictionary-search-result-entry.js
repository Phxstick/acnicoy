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
            main.panels["edit-vocab"].load(currentNode.dataset.mainWord);
            main.openPanel("edit-vocab");
        }
    },
    "add-word": {
        label: "Add word to vocabulary",
        click: ({ currentNode }) => {
            main.panels["add-vocab"].load(
                currentNode.dataset.id, currentNode.dataset.mainWord);
            main.openPanel("add-vocab");
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
        this.dataset.mainWord = info.id;
        this.dataset.mainWord = info.wordsAndReadings[0].word;
        this.popupMenu(menuItems, () => {
            return dataManager.vocab.contains(this.dataset.mainWord)
            .then((isAdded) => isAdded? ["copy-word", "edit-word"] :
                                        ["copy-word", "add-word"]);
        });
    }
}

customElements.define(
        "dictionary-search-result-entry", DictionarySearchResultEntry);
module.exports = DictionarySearchResultEntry;
