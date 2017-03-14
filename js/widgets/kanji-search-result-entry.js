"use strict";

class KanjiSearchResultEntry extends Widget {
    constructor (kanji, info) {
        super("kanji-search-result-entry");
        if (info === undefined) return;
        // Adjust data and fill handlebars template
        info.kanji = kanji;
        if (info.frequency === null) {
            info.rare = true;
        }
        info.meanings = info.meanings.join(", ");
        // info.onYomi = info.onYomi.join("、 ");
        // info.kunYomi = info.kunYomi.join("、 ");
        this.root.innerHTML += templates.get("kanji-search-result-entry")(info);
        main.makeKanjiInfoLink(this.$("kanji"), kanji);
        this.$("kanji").addEventListener("click", () => {
            main.$("kanji-info-panel").load(kanji);
            main.$("kanji-info-panel").open();
        });
        this.$("added-label").addEventListener("click", () => {
            main.panels["edit-kanji"].load(kanji);
            main.openPanel("edit-kanji");
        });
        this.$("add-button").addEventListener("click", () => {
            main.panels["add-kanji"].load(kanji);
            main.openPanel("add-kanji");
        });
        // Fill details bar with misc info spans
        // TODO: Create detail spans with handlebars aswell?
        const detailsBar = this.$("details-bar");
        const detailSpans =
            main.$("kanji-info-panel").getKanjiDetailSpans(kanji, info);
        detailSpans.forEach((span) => detailsBar.appendChild(span));
    }
}

customElements.define("kanji-search-result-entry", KanjiSearchResultEntry);
module.exports = KanjiSearchResultEntry;
