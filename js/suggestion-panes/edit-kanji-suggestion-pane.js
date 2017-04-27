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
        const editKanjiPanel = main.panels["edit-kanji"];
        const meaningsList = editKanjiPanel.$("meanings");
        const onYomiList = editKanjiPanel.$("on-yomi");
        const kunYomiList = editKanjiPanel.$("kun-yomi");
        if (type === "meaning") {
            for (const meaningNode of meaningsList.children) {
                if (meaningNode.textContent === node.textContent) {
                    meaningsList.removeChild(meaningNode);
                    break;
                }
            }
        } else if (type === "on-yomi") {
            for (const onYomiNode of onYomiList.children) {
                if (onYomiNode.textContent === node.textContent) {
                    onYomiList.removeChild(onYomiNode);
                    break;
                }
            }
        } else if (type === "kun-yomi") {
            for (const kunYomiNode of kunYomiList.children) {
                if (kunYomiNode.textContent === node.textContent) {
                    kunYomiList.removeChild(kunYomiNode);
                    break;
                }
            }
        }
    }

    selectSuggestionNode(node, type) {
        if (!super.selectSuggestionNode(node, type)) return;
        const editKanjiPanel = main.panels["edit-kanji"];
        const meaningsList = editKanjiPanel.$("meanings");
        const onYomiList = editKanjiPanel.$("on-yomi");
        const kunYomiList = editKanjiPanel.$("kun-yomi");
        if (type === "meaning") {
            for (const meaningNode of meaningsList.children) {
                if (meaningNode.textContent === node.textContent) return;
            }
            editKanjiPanel.createListItem(node.textContent, "meaning");
        } else if (type === "on-yomi") {
            for (const onYomiNode of onYomiList.children) {
                if (onYomiNode.textContent === node.textContent) return;
            }
            editKanjiPanel.createListItem(node.textContent, "on-yomi");
        } else if (type === "kun-yomi") {
            for (const kunYomiNode of kunYomiList.children) {
                if (kunYomiNode.textContent === node.textContent) return;
            }
            editKanjiPanel.createListItem(node.textContent, "kun-yomi");
        }
    }
}

customElements.define("edit-kanji-suggestion-pane", EditKanjiSuggestionPane);
module.exports = EditKanjiSuggestionPane;
