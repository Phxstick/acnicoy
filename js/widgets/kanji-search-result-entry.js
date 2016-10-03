"use strict";

class KanjiSearchResultEntry extends Widget {
    constructor () {
        super("kanji-search-result-entry");
    }

    setInfo(kanji, info) {
        // Adjust data and fill handlebars template
        info.kanji = kanji;
        if (info.frequency === null) {
            info.rare = true;
        }
        info.meanings = info.meanings.join(", ");
        // info.onYomi = info.onYomi.join("、 ");
        // info.kunYomi = info.kunYomi.join("、 ");
        this.root.innerHTML += templates.get("kanji-search-result-entry")(info);
        // Open kanji info panel upon clicking the kanji
        this.root.getElementById("kanji").addEventListener("click", () => {
            main.kanjiInfoPanel.load(kanji);
            main.kanjiInfoPanel.open();
        });
        // Fill details bar with misc info spans
        // TODO: Create detail spans with handlebars aswell?
        const detailsBar = this.root.getElementById("details-bar");
        const detailSpans =
            main.kanjiInfoPanel.getKanjiDetailSpans(kanji, info);
        detailSpans.forEach((span) => detailsBar.appendChild(span));
    }
}

customElements.define("kanji-search-result-entry", KanjiSearchResultEntry);
module.exports = KanjiSearchResultEntry;
