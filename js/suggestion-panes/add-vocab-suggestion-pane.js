"use strict";

class AddVocabSuggestionPane extends Widget {
    constructor() {
        super("add-vocab-suggestion-pane");
        this.wordVariantToReadings = new Map();
        this.selectedVariantNode = null;
        this.restrictedMeaningsToWords = new Map();
        // Select/deselect all translations when left/right-clicking header
        this.$("meanings-row-header").addEventListener("click", () => {
            const translations = this.$$("#translations .suggestion");
            for (const translationNode of translations) {
                this.selectSuggestionNode(translationNode, "translation");
            }
        });
        this.$("meanings-row-header").addEventListener("contextmenu", () => {
            const translations = this.$$("#translations .suggestion");
            for (const translationNode of translations) {
                this.deselectSuggestionNode(translationNode, "translation");
            }
        });
        // Select/Deselect all readings when left/right-clicking header
        this.$("readings-row-header").addEventListener("click", () => {
            const readings = this.$$("#readings .suggestion");
            for (const readingsNode of readings) {
                this.selectSuggestionNode(readingsNode, "reading");
            }
        });
        this.$("readings-row-header").addEventListener("contextmenu", () => {
            const readings = this.$$("#readings .suggestion");
            for (const readingsNode of readings) {
                this.deselectSuggestionNode(readingsNode, "reading");
            }
        });
    }
    
    load(id, chosenWordVariant) {
        dataManager.content.getDictionaryEntryInfo(id).then((info) => {
            this.wordVariantToReadings.clear();
            // Map word variants to array of readings
            for (const { word, reading } of info.wordsAndReadings) {
                if (word.length > 0) {
                    if (!this.wordVariantToReadings.has(word)) {
                        this.wordVariantToReadings.set(word, []);
                    }
                    this.wordVariantToReadings.get(word).push(reading);
                // If reading is also the word itself, use it as word instead
                } else {
                    if (!this.wordVariantToReadings.has(reading)) {
                        this.wordVariantToReadings.set(reading, []);
                    }
                }
            }
            // Create translation suggestions for each meaning
            this.$("translations").empty();
            this.restrictedMeaningsToWords.clear();
            for (const { translations, restrictedTo } of info.meanings) {
                // Create a container element for this meaning
                const meaningFrame = document.createElement("div");
                meaningFrame.classList.add("suggestion-group-frame");
                // Create frame holding translations for this meaning
                const translationGroup = document.createElement("div");
                translationGroup.classList.add("suggestion-group");
                meaningFrame.appendChild(translationGroup);
                // Create element for selecting all translations for meaning
                const translationGroupSelector = document.createElement("div");
                translationGroupSelector.classList.add(
                    "suggestion-group-selector")
                meaningFrame.appendChild(translationGroupSelector);
                // Select all on left click
                translationGroupSelector.addEventListener("click", () => {
                    for (const node of translationGroup.children) {
                        this.selectSuggestionNode(node, "translation")
                    }
                });
                // Deselect all on right click
                translationGroupSelector.addEventListener("contextmenu", () => {
                    for (const node of translationGroup.children) {
                        this.deselectSuggestionNode(node, "translation")
                    }
                });
                // Fill frame with translation suggestions
                for (const translation of translations) {
                    const translationNode = 
                        this.createSuggestionNode(translation, "translation");
                    // If only one meaning, select all translations by default
                    if (info.meanings.length === 1) {
                        this.selectSuggestionNode(
                            translationNode, "translation");
                    }
                    translationGroup.appendChild(translationNode);
                }
                // Register restrictions for this meaning
                if (restrictedTo.length > 0) {
                    this.restrictedMeaningsToWords.set(translationGroup, []);
                    for (const word of restrictedTo) {
                        this.restrictedMeaningsToWords.get(translationGroup)
                                                      .push(word);
                    }
                }
                this.$("translations").appendChild(meaningFrame);
            }
            // Display word variants and select the chosen one already
            this.$("word-variants").empty();
            for (const [word, readings] of this.wordVariantToReadings) {
                const node = this.createSuggestionNode(word, "word");
                this.$("word-variants").appendChild(node);
                if (word === chosenWordVariant) {
                    this.selectSuggestionNode(node, "word");
                }
            }
        });
    }

    deselectSuggestionNode(node, type) {
        if (!node.hasAttribute("selected")) return;
        node.removeAttribute("selected");
        const separator = dataManager.settings.add.separator;
        const wordEntry = main.panels["add-vocab"].$("word-entry");
        const readingsEntry = main.panels["add-vocab"].$("readings-entry");
        const translationsEntry =
            main.panels["add-vocab"].$("translations-entry");
        if (type === "word") {
            this.$("readings").empty();
            readingsEntry.value = "";
            wordEntry.value = "";
            this.selectedVariantNode = null;
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
        if (node.hasAttribute("selected")) return;
        node.setAttribute("selected", "");
        const separator = dataManager.settings.add.separator;
        const wordEntry = main.panels["add-vocab"].$("word-entry");
        const readingsEntry = main.panels["add-vocab"].$("readings-entry");
        const translationsEntry =
            main.panels["add-vocab"].$("translations-entry");
        if (type === "word") {
            const word = node.textContent;
            this.$("readings").empty();
            readingsEntry.value = "";
            wordEntry.value = node.textContent;
            this.selectedVariantNode = node;
            // Only display meanings which are valid for this word
            for (const [tslGroup, words] of this.restrictedMeaningsToWords) {
                tslGroup.parentNode[words.includes(word) ? "show" : "hide"]();
                if (!words.includes(word)) {
                    for (const translation of tslGroup.children) {
                        this.deselectSuggestionNode(translation, "translation");
                    }
                }
            }
            // Create suggestions for corresponding readings and select first
            const readings = this.wordVariantToReadings.get(word);
            if (readings.length > 0) {
                for (const reading of readings) {
                    const rNode = this.createSuggestionNode(reading, "reading");
                    this.$("readings").appendChild(rNode);
                }
                this.$("readings-row").show();
                this.selectSuggestionNode(
                    this.$("readings").children[0], "reading");
            // If no readings exist, don't display readings row
            } else {
                this.$("readings-row").hide();
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

    createSuggestionNode(content, type) {
        const node = document.createElement("span");
        node.textContent = content;
        node.classList.add("suggestion");
        // Select on left click
        node.addEventListener("click", () => {
            if (type === "word" && this.selectedVariantNode !== null) {
                this.deselectSuggestionNode(this.selectedVariantNode, type);
            }
            this.selectSuggestionNode(node, type);
        });
        // Deselect on right click
        node.addEventListener("contextmenu", () => {
            this.deselectSuggestionNode(node, type);
        });
        return node;
    }
}

customElements.define("add-vocab-suggestion-pane", AddVocabSuggestionPane);
module.exports = AddVocabSuggestionPane;
