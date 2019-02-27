"use strict";

const menuItems = contextMenu.registerItems({
    "copy-word": {
        label: "Copy word",
        click: ({ currentNode }) => {
            clipboard.writeText(currentNode.dataset.word);
        }
    },
    "edit-word": {
        label: "Edit vocabulary item",
        click: ({ currentNode }) => {
            main.openPanel("edit-vocab", {
                entryName: currentNode.dataset.word
            });
        }
    },
    "add-word": {
        label: "Add word to vocabulary",
        click: ({ currentNode }) => {
            main.openPanel("edit-vocab", {
                dictionaryId: currentNode.dataset.wordId,
                entryName: currentNode.dataset.word
            });
        }
    }
});


class ExampleWordEntry extends Widget {
    constructor (info) {
        super("example-word-entry");
        if (info === undefined) return;
        const { id, word, readings, translations, newsFreq } = info;
        // Take the first translation of each meaning
        const meanings = translations.split(";");
        const tslList = [];
        for (const meaning of meanings) {
            tslList.push(utility.parseEntries(meaning, ",")[0]);
        }
        const translationsCol = document.createElement("td");
        const data = { id, word, translations: tslList.join(", "),
            // Take the first reading
            // TODO: Choose most common reading / no outdated ones
            reading: readings.split(";")[0],
            // Alpha factor for green marker to represent word frequency
            alpha: newsFreq === 0 ? 0 :
                0.2 + 0.8 * (newsFreq - newsFreq % 10) / 45
        };
        this.dataset.wordId = id;
        this.dataset.word = word;
        this.root.innerHTML += templates.get("example-word-entry")(data);
        main.convertTextToKanjiInfoLinks(this.$("word"));
        this.contextMenu(menuItems, () => {
            return dataManager.vocab.contains(word)
            .then((isAdded) => isAdded? ["copy-word", "edit-word"] :
                                        ["copy-word", "add-word"]);
        });
    }
}

customElements.define("example-word-entry", ExampleWordEntry);
module.exports = ExampleWordEntry;
