"use strict";

class EditHanziSuggestionPane extends HanziSuggestionPane {
    constructor() {
        super();
        this.$("help-link").addEventListener("click", () => {
            overlays.open(
                "help", ["Languages", "Dictionary", "Search suggestions"]);
        });
    }

    async load(hanzi) {
        await super.load(hanzi);
        const alreadyAdded = await dataManager.hanzi.isAdded(hanzi);

        if (alreadyAdded) {
            // Mark suggestions for all registered details as selected
            const info = await dataManager.hanzi.getInfo(hanzi);
            const existingMeanings = new Set(info.meanings);
            const existingPinyin = new Set(info.pinyin);
            for (const meaningNode of this.$("meanings").children) {
                const tslNodes = meaningNode.querySelectorAll(".suggestion")
                for (const translationNode of tslNodes) {
                    if (existingMeanings.has(translationNode.textContent)) {
                        translationNode.setAttribute("selected", "");
                    }
                }
            }
            for (const pinyinNode of this.$("pinyin").children) {
                if (existingPinyin.has(pinyinNode.textContent)) {
                    pinyinNode.setAttribute("selected", "");
                }
            }
        } else {
            // If the hanzi is not added yet, select everything by default
            for (const meaningNode of this.$("meanings").children) {
                const tslNodes = meaningNode.querySelectorAll(".suggestion")
                for (const translationNode of tslNodes) {
                    this.selectSuggestionNode(translationNode, "meaning");
                }
            }
            for (const pinyinNode of this.$("pinyin").children)
                this.selectSuggestionNode(pinyinNode, "reading");
        }
    }

    deselectSuggestionNode(node, type) {
        if (!super.deselectSuggestionNode(node, type)) return;
        main.panels["edit-hanzi"].removeListItem(type, node.textContent);
    }

    selectSuggestionNode(node, type) {
        if (!super.selectSuggestionNode(node, type)) return;
        main.panels["edit-hanzi"].createListItem(type, node.textContent);
    }
}

customElements.define("edit-hanzi-suggestion-pane", EditHanziSuggestionPane);
module.exports = EditHanziSuggestionPane;
