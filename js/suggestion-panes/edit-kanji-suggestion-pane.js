"use strict";

class EditKanjiSuggestionPane extends KanjiSuggestionPane {
    constructor() {
        super();
    }

    load(kanji) {
        super.load(kanji).then(() => {
            dataManager.kanji.getInfo(kanji).then((info) => {
                // Mark suggestions for all selected details as selected
                const existingMeanings = new Set(info.meanings);
                const existingOnYomi = new Set(info.onYomi);
                const existingKunYomi = new Set(info.kunYomi);
                for (const meaningNode of this.$("meanings").children) {
                    if (existingMeanings.has(meaningNode.textContent)) {
                        meaningNode.setAttribute("selected", "");
                    }
                }
                for (const onYomiNode of this.$("on-yomi").children) {
                    if (existingOnYomi.has(onYomiNode.textContent)) {
                        onYomiNode.setAttribute("selected", "");
                    }
                }
                for (const kunYomiNode of this.$("kun-yomi").children) {
                    if (existingKunYomi.has(kunYomiNode.textContent)) {
                        kunYomiNode.setAttribute("selected", "");
                    }
                }
            });
        });
    }

    deselectSuggestionNode(node, type) {
        if (!super.deselectSuggestionNode(node, type)) return;
        main.panels["edit-kanji"].removeListItem(type, node.textContent);
    }

    selectSuggestionNode(node, type) {
        if (!super.selectSuggestionNode(node, type)) return;
        main.panels["edit-kanji"].createListItem(type, node.textContent);
    }
}

customElements.define("edit-kanji-suggestion-pane", EditKanjiSuggestionPane);
module.exports = EditKanjiSuggestionPane;
