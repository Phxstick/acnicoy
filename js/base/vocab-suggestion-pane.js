"use strict";

class VocabSuggestionPane extends Widget {
    constructor() {
        super(`vocab-suggestion-pane`);
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

    // For entries in the Chinese dictionary
    resolveRefs(translation) {
        const refRegex = /\[([^\]]*?)\]/g
        const settings = dataManager.settings.dictionary["Chinese"]
        const useTrad = settings.useTraditionalHanzi
        const matches = translation.matchAll(refRegex)
        if (matches.length === 0) return text
        let newText = ""
        let i = 0
        for (const match of matches) {
            const startIndex = match.index
            const endIndex = match.index + match[0].length
            if (startIndex - i > 0) {
                newText += translation.slice(i, startIndex)
            }
            const [trad, simp, pinyin] = match[1].split("|")
            if (trad.length > 0) {
                newText += useTrad ? trad : simp
            } else {
                // References of the form "also pr. ..." contain only pinyin
                newText += pinyin.toPinyin()
            }
            i = endIndex
        }
        if (i < translation.length) {
            newText += translation.slice(i, translation.length)
        }
        return newText
    }

    async load(id, chosenWordVariant) {
        const info = await dataManager.content.getDictionaryEntryInfo(id);
        // Filter out traditional/simplified variants if language is Chinese
        if (dataManager.currentLanguage === "Chinese") {
            const settings = dataManager.settings.dictionary["Chinese"]
            // Simplified variants are at even indices, traditional at uneven
            info.wordsAndReadings = info.wordsAndReadings.filter(
                (_, i) => i % 2 === (settings.useTraditionalHanzi ? 1 : 0))
            // Filter out simplified variants that are identical to main word
            if (!settings.useTraditionalHanzi) {
                info.wordsAndReadings = info.wordsAndReadings.filter(
                    (item, i) => i === 0 ||
                        item.word !== info.wordsAndReadings[0].word ||
                        item.reading !== info.wordsAndReadings[0].reading)
            }
        }
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
        for (const { translations, restrictedTo, meaningsRestrictedTo,
                miscInfo } of info.meanings) {
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
            for (let translation of translations) {
                if (dataManager.currentLanguage === "Chinese") {
                    translation = this.resolveRefs(translation)
                }
                const translationNode = 
                    this.createSuggestionNode(translation, "translation");
                translationGroup.appendChild(translationNode);
            }
            // Register restrictions for this meaning
            if (meaningsRestrictedTo && meaningsRestrictedTo.length > 0) {
                this.restrictedMeaningsToWords.set(
                    translationGroup, new Set());
                for (const word of meaningsRestrictedTo) {
                    this.restrictedMeaningsToWords.get(translationGroup)
                                                  .add(word);
                }
            }
            this.$("translations").appendChild(meaningFrame);
            // Register kana word variants for words usually written as kana
            const kanaFlag = "Usually written using kana alone"
            if (miscInfo !== undefined && miscInfo.includes(kanaFlag)) {
                const setOfWordsRestrictedTo = new Set(restrictedTo);
                for (const { word, reading } of info.wordsAndReadings) {
                    if (setOfWordsRestrictedTo.size === 0 ||
                            setOfWordsRestrictedTo.has(word) ||
                            setOfWordsRestrictedTo.has(reading)) {
                        if (!this.wordVariantToReadings.has(reading)) {
                            this.wordVariantToReadings.set(reading, []);
                        }
                    }
                }
            }
        }
        // Display word variants and select the chosen one already
        this.$("word-variants").empty();
        this.$("readings-row").hide();
        for (const [word, readings] of this.wordVariantToReadings) {
            const node = this.createSuggestionNode(word, "word");
            this.$("word-variants").appendChild(node);
            if (word === chosenWordVariant) {
                this.selectSuggestionNode(node, "word");
            }
        }
    }

    createSuggestionNode(content, type) {
        const node = document.createElement("span");
        node.textContent = content;
        node.classList.add("suggestion");
        // Toggle selection status on left click
        node.addEventListener("click", () => {
            if (node.hasAttribute("selected")) {
                if (type !== "word") this.deselectSuggestionNode(node, type);
            } else {
                if (type === "word" && this.selectedVariantNode !== null) {
                    this.deselectSuggestionNode(this.selectedVariantNode, type);
                }
                this.selectSuggestionNode(node, type);
            }
        });
        // Deselect on right click (unless it's a word variant)
        node.addEventListener("contextmenu", () => {
            if (type === "word") return;
            this.deselectSuggestionNode(node, type);
        });
        return node;
    }

    selectSuggestionNode(node, type) {
        if (node.hasAttribute("selected")) return false;
        node.setAttribute("selected", "");
        if (type === "word") {
            const word = node.textContent;
            this.selectedVariantNode = node;
            this.$("readings").empty();
            // Only display meanings which are valid for this word
            for (const [tslGroup, words] of this.restrictedMeaningsToWords){
                tslGroup.parentNode.toggleDisplay(words.has(word));
            }
            // Create suggestions for corresponding readings
            const readings = this.wordVariantToReadings.get(word);
            if (readings.length > 0) {
                for (const reading of readings) {
                    const rNode = this.createSuggestionNode(
                        reading, "reading");
                    this.$("readings").appendChild(rNode);
                }
                this.$("readings-row").toggleDisplay(
                    dataManager.languageSettings.get("readings"));
            // If no readings exist, don't display readings row
            } else {
                this.$("readings-row").hide();
            }
        }
        return true;
    }

    deselectSuggestionNode(node, type) {
        if (!node.hasAttribute("selected")) return false;
        node.removeAttribute("selected");
        if (type === "word") {
            this.$("readings").empty();
            this.selectedVariantNode = null;
        }
        return true;
    }
}

module.exports = VocabSuggestionPane;
