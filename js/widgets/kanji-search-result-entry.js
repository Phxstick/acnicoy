"use strict";

class KanjiSearchResultEntry extends Widget {
    constructor (kanji, info) {
        super("kanji-search-result-entry");
        this.dataset.kanji = kanji;
        if (info === undefined) return;
        // Adjust data and fill handlebars template
        info.kanji = kanji;
        if (info.frequency === null) {
            info.rare = true;
        }
        info.meanings = info.meanings.join(", ");
        this.root.innerHTML += templates.get("kanji-search-result-entry")(info);
        main.makeKanjiInfoLink(this.$("kanji"), kanji);
        this.$("kanji").addEventListener("click", () => {
            main.$("kanji-info-panel").load(kanji);
            main.$("kanji-info-panel").open();
        });
        this.$("added-label").addEventListener("click", () => {
            main.openPanel("edit-kanji", { entryName: kanji });
        });
        this.$("add-button").addEventListener("click", () => {
            main.openPanel("edit-kanji", { entryName: kanji });
        });
        // Fill details bar with misc info spans
        // TODO: Create detail spans with handlebars aswell?
        const detailsBar = this.$("details-bar");
        const detailSpans =
            main.$("kanji-info-panel").getKanjiDetailSpans(kanji, info);
        detailSpans.forEach((span) => detailsBar.appendChild(span));

        // Click a reading to search the kanji dictionary for it
        this.addEventListener("click", (event) => {
            const target = event.path[0];
            if (target.classList.contains("yomi")) {
                const query = target.textContent.trim();
                main.sections["kanji"].search(query, "by-readings");
            }
        });
    }

    toggleAdded(added) {
        this.$("added-label").toggleDisplay(added);
        this.$("add-button").toggleDisplay(!added);
    }
}

customElements.define("kanji-search-result-entry", KanjiSearchResultEntry);
module.exports = KanjiSearchResultEntry;
