"use strict";

class EditVocabSuggestionPane extends VocabSuggestionPane {
    constructor() {
        super();
        this.autoSelect = null;
    }

    async load(id, chosenWordVariant) {
        await super.load(id, chosenWordVariant);
        // Change behavior depending on whether word is already the vocabulary
        const alreadyAdded = await dataManager.vocab.contains(chosenWordVariant)
        this.autoSelect = !alreadyAdded;
        if (!alreadyAdded) return;
        // Mark suggestions for all selected translations as selected
        const info = await dataManager.vocab.getInfo(chosenWordVariant);
        const existingTranslations = new Set(info.translations);
        const existingReadings = new Set(info.readings);
        for (const meaningNode of this.$("translations").children) {
            const translationNodes = meaningNode.querySelectorAll(".suggestion")
            for (const translationNode of translationNodes) {
                const translation = translationNode.textContent;
                if (existingTranslations.has(translation)) {
                    translationNode.setAttribute("selected", "");
                }
            }
        }
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
            if (!autoSelect) {
                // Mark suggestions for all selected readings as selected
                const chosenReadings = new Set();
                const readingNodes = editVocabPanel.getListItems("reading");
                for (const readingNode of readingNodes) {
                    chosenReadings.add(readingNode.textContent);
                }
                for (const suggestionNode of this.$("readings").children) {
                    if (chosenReadings.has(suggestionNode.textContent)) {
                        suggestionNode.setAttribute("selected", "");
                    }
                }
            } else {
                // Clear readings and select those valid for chosen word variant
                editVocabPanel.removeListItem("reading");
                for (const suggestionNode of this.$("readings").children) {
                    this.selectSuggestionNode(suggestionNode, "reading");
                }
                // Deselect meanings that are not valid for the selected word
                for (const [tslGroup, words] of this.restrictedMeaningsToWords) {
                    if (!words.has(node.textContent)) {
                        for (const translation of tslGroup.children) {
                            this.deselectSuggestionNode(
                                translation, "translation");
                        }
                    }
                }
                // If there's only one meaning, select all existing translations
                if (this.$("translations").children.length === 1) {
                    const suggestionNodes =
                        this.$("translations").firstElementChild
                                              .querySelectorAll(".suggestion");
                    for (const suggestionNode of suggestionNodes) {
                        this.selectSuggestionNode(suggestionNode, "translation")
                    }
                }
            }
        } else {
            editVocabPanel.createListItem(type, node.textContent);
        }
    }

}

customElements.define("edit-vocab-suggestion-pane", EditVocabSuggestionPane);
module.exports = EditVocabSuggestionPane;
