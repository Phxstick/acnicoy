"use strict";

class HanziSuggestionPane extends Widget {
    constructor() {
        super(`hanzi-suggestion-pane`);
        // Select/deselect all meanings when left/right-clicking header
        this.$("meanings-row-header").addEventListener("click", () => {
            const meaningNodes = this.$$("#meanings .suggestion");
            for (const meaningNode of meaningNodes) {
                this.selectSuggestionNode(meaningNode, "meaning");
            }
        });
        this.$("meanings-row-header").addEventListener("contextmenu", () => {
            const meaningNodes = this.$$("#meanings .suggestion");
            for (const meaningNode of meaningNodes) {
                this.deselectSuggestionNode(meaningNode, "meaning");
            }
        });
        // Select/deselect all pinyin when left/right-clicking header
        this.$("pinyin-row-header").addEventListener("click", () => {
            const pinyinNodes = this.$$("#pinyin .suggestion");
            for (const pinyinNode of pinyinNodes) {
                this.selectSuggestionNode(pinyinNode, "reading");
            }
        });
        this.$("pinyin-row-header").addEventListener("contextmenu", () => {
            const pinyinNodes = this.$$("#pinyin .suggestion");
            for (const pinyinNode of pinyinNodes) {
                this.deselectSuggestionNode(pinyinNode, "reading");
            }
        });
    }

    async load(hanzi) {
        const info = await dataManager.content.getHanziInfo(hanzi);
        this.$("meanings").empty();
        for (const translations of info.meanings) {
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
                    this.selectSuggestionNode(node, "meaning")
                }
            });
            // Deselect all on right click
            translationGroupSelector.addEventListener("contextmenu", () => {
                for (const node of translationGroup.children) {
                    this.deselectSuggestionNode(node, "meaning")
                }
            });
            // Fill frame with translation suggestions
            for (const translation of translations) {
                const translationNode = 
                    this.createSuggestionNode(translation, "meaning");
                translationGroup.appendChild(translationNode);
            }
            this.$("meanings").appendChild(meaningFrame);
        }
        this.$("meanings-row").toggleDisplay(info.meanings.length > 0);
        this.$("pinyin").empty();
        for (const pinyin of info.pinyin) {
            this.$("pinyin").appendChild(
                this.createSuggestionNode(pinyin, "reading"));
        }
        this.$("pinyin-row").toggleDisplay(info.pinyin.length > 0);
    }

    createSuggestionNode(content, type) {
        const node = document.createElement("span");
        node.textContent = content;
        node.classList.add("suggestion");
        // Toggle selection status on left click
        node.addEventListener("click", () => {
            if (!node.hasAttribute("selected")) {
                this.selectSuggestionNode(node, type);
            } else {
                this.deselectSuggestionNode(node, type);
            }
        });
        // Deselect on right click
        node.addEventListener("contextmenu", () => {
            this.deselectSuggestionNode(node, type);
        });
        return node;
    }

    selectSuggestionNode(node, type) {
        if (node.hasAttribute("selected")) return false;
        node.setAttribute("selected", "");
        return true;
    }

    deselectSuggestionNode(node, type) {
        if (!node.hasAttribute("selected")) return false;
        node.removeAttribute("selected");
        return true;
    }
}

module.exports = HanziSuggestionPane;
