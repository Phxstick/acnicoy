"use strict";

class EditVocabSuggestionPane extends VocabSuggestionPane {
    constructor() {
        super();
    }

    load(id, chosenWordVariant) {
        super.load(id, chosenWordVariant).then(() => {
            dataManager.vocab.getInfo(chosenWordVariant).then((info) => {
                // Mark suggestions for all selected translations as selected
                const existingTranslations = new Set(info.translations);
                const existingReadings = new Set(info.readings);
                for (const meaningNode of this.$("translations").children) {
                    const translationNodes = 
                        meaningNode.querySelectorAll(".suggestion");
                    for (const translationNode of translationNodes) {
                        const translation = translationNode.textContent;
                        if (existingTranslations.has(translation)) {
                            translationNode.setAttribute("selected", "");
                        }
                    }
                }
            });
        });
    }

    deselectSuggestionNode(node, type) {
        if (!super.deselectSuggestionNode(node, type)) return;
        const editVocabPanel = main.panels["edit-vocab"];
        if (type === "word") {
            editVocabPanel.setWord(node.textContent);
        } else {
            editVocabPanel.removeListItem(type, node.textContent);
        }
    }

    selectSuggestionNode(node, type) {
        if (!super.selectSuggestionNode(node, type)) return;
        const editVocabPanel = main.panels["edit-vocab"];
        if (type === "word") {
            editVocabPanel.setWord(node.textContent);
            // Mark suggestions for all selected readings as selected
            const chosenReadings = new Set();
            for (const readingNode of editVocabPanel.getListItems("reading")) {
                chosenReadings.add(readingNode.textContent);
            }
            for (const suggestionNode of this.$("readings").children) {
                if (chosenReadings.has(suggestionNode.textContent)) {
                    suggestionNode.setAttribute("selected", "");
                }
            }
        } else {
            editVocabPanel.createListItem(type, node.textContent);
        }
    }

}

customElements.define("edit-vocab-suggestion-pane", EditVocabSuggestionPane);
module.exports = EditVocabSuggestionPane;
