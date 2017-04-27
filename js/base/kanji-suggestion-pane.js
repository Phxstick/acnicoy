"use strict";

class KanjiSuggestionPane extends Widget {
    constructor() {
        super(`kanji-suggestion-pane`);
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
        // Select/Deselect all on-yomi when left/right-clicking header
        this.$("on-yomi-row-header").addEventListener("click", () => {
            const onYomiNodes = this.$$("#on-yomi .suggestion");
            for (const onYomiNode of onYomiNodes) {
                this.selectSuggestionNode(onYomiNode, "on-yomi");
            }
        });
        this.$("on-yomi-row-header").addEventListener("contextmenu", () => {
            const onYomiNodes = this.$$("#on-yomi .suggestion");
            for (const onYomiNode of onYomiNodes) {
                this.deselectSuggestionNode(onYomiNode, "on-yomi");
            }
        });
        // Select/Deselect all kun-yomi when left/right-clicking header
        this.$("kun-yomi-row-header").addEventListener("click", () => {
            const kunYomiNodes = this.$$("#kun-yomi .suggestion");
            for (const kunYomiNode of kunYomiNodes) {
                this.selectSuggestionNode(kunYomiNode, "kun-yomi");
            }
        });
        this.$("kun-yomi-row-header").addEventListener("contextmenu", () => {
            const kunYomiNodes = this.$$("#kun-yomi .suggestion");
            for (const kunYomiNode of kunYomiNodes) {
                this.deselectSuggestionNode(kunYomiNode, "kun-yomi");
            }
        });
    }

    load(kanji) {
        return dataManager.content.getKanjiInfo(kanji).then((info) => {
            this.$("meanings").empty();
            for (const meaning of info.meanings) {
                this.$("meanings").appendChild(
                    this.createSuggestionNode(meaning, "meaning"));
            }
            this.$("on-yomi").empty();
            for (const onYomi of info.onYomi) {
                this.$("on-yomi").appendChild(
                    this.createSuggestionNode(onYomi, "on-yomi"));
            }
            this.$("kun-yomi").empty();
            for (const kunYomi of info.kunYomi) {
                this.$("kun-yomi").appendChild(
                    this.createSuggestionNode(kunYomi, "kun-yomi"));
            }
        });
    }

    createSuggestionNode(content, type) {
        const node = document.createElement("span");
        node.textContent = content;
        node.classList.add("suggestion");
        // Select on left click
        node.addEventListener("click", () => {
            this.selectSuggestionNode(node, type);
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

module.exports = KanjiSuggestionPane;
