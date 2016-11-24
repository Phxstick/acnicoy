"use strict";

const menuItems = popupMenu.registerItems({
    "copy-word": {
        label: "Copy word",
        click: ({ currentNode }) => {
            clipboard.writeText(currentNode.dataset.word);
        }
    },
    "edit-word": {
        label: "Edit vocabulary item",
        click: ({ currentNode }) => {
            main.panels["edit-vocab"].load(currentNode.dataset.word);
            main.openPanel("edit-vocab");
        }
    },
    "add-word": {
        label: "Add word to vocabulary",
        click: ({ currentNode }) => {
            main.suggestionPanes["add-vocab"].load(
                currentNode.dataset.wordId, currentNode.dataset.word);
            main.openPanel("add-vocab", { showSuggestions: true });
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
        this.popupMenu(menuItems, () => {
            return dataManager.vocab.contains(word)
            .then((isAdded) => isAdded? ["copy-word", "edit-word"] :
                                        ["copy-word", "add-word"]);
        });
    }
}

customElements.define("example-word-entry", ExampleWordEntry);
module.exports = ExampleWordEntry;
