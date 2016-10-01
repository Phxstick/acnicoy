"use strict";

const fs = require("fs");
// TODO: Don't hard-code here
const path = "/home/daniel/Acnicoy/html/widgets/kanji-search-result-entry.hbs";
const source = fs.readFileSync(path, "utf-8");
const template = Handlebars.compile(source);


class KanjiSearchResultEntry extends HTMLElement {
    createdCallback () {
        this.root = this.createShadowRoot();
        const style = document.createElement("style");
        style.textContent =
            `@import url(${paths.css("kanji-search-result-entry")})`;
        this.root.appendChild(style);
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
        this.root.innerHTML += template(info);
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

module.exports = document.registerElement("kanji-search-result-entry",
        { prototype: KanjiSearchResultEntry.prototype });
