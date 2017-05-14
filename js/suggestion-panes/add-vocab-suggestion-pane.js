"use strict";

class AddVocabSuggestionPane extends VocabSuggestionPane {
    constructor() {
        super();
    }

    load(id, chosenWordVariant) {
        super.load(id, chosenWordVariant).then(() => {
            // If there's only one meaning, select all translations by default
            if (this.$("translations").children.length === 1) {
                const suggestionNodes = this.$("translations").firstElementChild
                                        .querySelectorAll(".suggestion");
                for (const suggestionNode of suggestionNodes) {
                    this.selectSuggestionNode(suggestionNode, "translation");
                }
            }
        });
    }

    deselectSuggestionNode(node, type) {
        if (!super.deselectSuggestionNode(node, type)) return;
        const separator = dataManager.settings.add.separator;
        const wordEntry = main.panels["add-vocab"].$("word-entry");
        const readingsEntry = main.panels["add-vocab"].$("readings-entry");
        const translationsEntry =
            main.panels["add-vocab"].$("translations-entry");
        if (type === "word") {
            readingsEntry.value = "";
            wordEntry.value = "";
        } else if (type === "reading") {
            const readings = utility.parseEntries(
                readingsEntry.value, separator);
            const reading = node.textContent;
            readings.remove(reading);
            readingsEntry.value = readings.join(separator + " ");
        } else if (type === "translation") {
            const translations = utility.parseEntries(
                translationsEntry.value, separator);
            const translation = node.textContent;
            translations.remove(translation);
            translationsEntry.value = translations.join(separator + " ");
        }
    }

    selectSuggestionNode(node, type) {
        if (!super.selectSuggestionNode(node, type)) return;
        const separator = dataManager.settings.add.separator;
        const wordEntry = main.panels["add-vocab"].$("word-entry");
        const readingsEntry = main.panels["add-vocab"].$("readings-entry");
        const translationsEntry =
            main.panels["add-vocab"].$("translations-entry");
        if (type === "word") {
            // Clear readings and select those valid for chosen word variant
            wordEntry.value = node.textContent;
            readingsEntry.value = "";
            for (const readingNode of this.$("readings").children) {
                this.selectSuggestionNode(readingNode, "reading");
            }
            // Deselect meanings that are not valid for selected word
            for (const [tslGroup, words] of this.restrictedMeaningsToWords) {
                if (!words.has(node.textContent)) {
                    for (const translation of tslGroup.children) {
                        this.deselectSuggestionNode(translation, "translation");
                    }
                }
            }
        } else if (type === "reading") {
            // Insert reading into textarea if it doesn't already contain it
            const readings = utility.parseEntries(
                readingsEntry.value, separator);
            const reading = node.textContent;
            if (!readings.includes(reading)) {
                readings.push(reading);
            }
            readingsEntry.value = readings.join(separator + " ");
        } else if (type === "translation") {
            // Insert translation into textarea if it doesn't already contain it
            const translations = utility.parseEntries(
                translationsEntry.value, separator);
            const translation = node.textContent;
            if (!translations.includes(translation)) {
                translations.push(translation);
            }
            translationsEntry.value = translations.join(separator + " ");
        }
    }

}

customElements.define("add-vocab-suggestion-pane", AddVocabSuggestionPane);
module.exports = AddVocabSuggestionPane;
