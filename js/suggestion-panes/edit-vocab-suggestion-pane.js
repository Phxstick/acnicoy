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
        const wordLabel = editVocabPanel.$("word");
        const translationsList = editVocabPanel.$("translations");
        const readingsList = editVocabPanel.$("readings");
        if (type === "word") {
            wordLabel.textContent = "";
        } else if (type === "reading") {
            for (const readingNode of readingsList.children) {
                if (readingNode.textContent === node.textContent) {
                    readingsList.removeChild(readingNode);
                    break;
                }
            }
        } else if (type === "translation") {
            for (const translationNode of translationsList.children) {
                if (translationNode.textContent === node.textContent) {
                    translationsList.removeChild(translationNode);
                    break;
                }
            }
        }
    }

    selectSuggestionNode(node, type) {
        if (!super.selectSuggestionNode(node, type)) return;
        const editVocabPanel = main.panels["edit-vocab"];
        const wordLabel = editVocabPanel.$("word");
        const translationsList = editVocabPanel.$("translations");
        const readingsList = editVocabPanel.$("readings");
        if (type === "word") {
            wordLabel.textContent = node.textContent;
            // Mark suggestions for all selected readings as selected
            const chosenReadings = new Set();
            for (const readingNode of readingsList.children) {
                chosenReadings.add(readingNode.textContent);
            }
            for (const suggestionNode of this.$("readings").children) {
                if (chosenReadings.has(suggestionNode.textContent)) {
                    suggestionNode.setAttribute("selected", "");
                }
            }
        } else if (type === "reading") {
            for (const readingNode of readingsList.children) {
                if (readingNode.textContent === node.textContent) return;
            }
            editVocabPanel.createListItem(node.textContent, "reading");
        } else if (type === "translation") {
            for (const translationNode of translationsList.children) {
                if (translationNode.textContent === node.textContent) return;
            }
            editVocabPanel.createListItem(node.textContent, "translation");
        }
    }

}

customElements.define("edit-vocab-suggestion-pane", EditVocabSuggestionPane);
module.exports = EditVocabSuggestionPane;
