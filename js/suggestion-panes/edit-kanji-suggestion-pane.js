"use strict";

class EditKanjiSuggestionPane extends KanjiSuggestionPane {
    constructor() {
        super();
    }

    async load(kanji) {
        await super.load(kanji);
        const alreadyAdded = await dataManager.kanji.isAdded(kanji);

        if (alreadyAdded) {
            // Mark suggestions for all registered details as selected
            const info = await dataManager.kanji.getInfo(kanji);
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
        } else {
            // If the kanji is not added yet, select all details by default
            for (const meaningNode of this.$("meanings").children)
                this.selectSuggestionNode(meaningNode, "meaning");
            for (const onYomiNode of this.$("on-yomi").children)
                this.selectSuggestionNode(onYomiNode, "on-yomi");
            for (const kunYomiNode of this.$("kun-yomi").children)
                this.selectSuggestionNode(kunYomiNode, "kun-yomi");
        }
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
