"use strict";

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
    }
}

customElements.define(
        "dictionary-search-result-entry", DictionarySearchResultEntry);
module.exports = DictionarySearchResultEntry;
