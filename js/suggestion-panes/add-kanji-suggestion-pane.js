"use strict";

class AddKanjiSuggestionPane extends KanjiSuggestionPane {
    constructor() {
        super();
    }

    load(kanji) {
        super.load(kanji).then(() => {
            main.panels["add-kanji"].$("kanji-entry").value = kanji;
            // Select everything by default
            for (const meaningNode of this.$("meanings").children) {
                this.selectSuggestionNode(meaningNode, "meaning");
            }
            for (const onYomiNode of this.$("on-yomi").children) {
                this.selectSuggestionNode(onYomiNode, "on-yomi");
            }
            for (const kunYomiNode of this.$("kun-yomi").children) {
                this.selectSuggestionNode(kunYomiNode, "kun-yomi");
            }
        });
    }

    deselectSuggestionNode(node, type) {
        if (!super.deselectSuggestionNode(node, type)) return;
        const separator = dataManager.settings.add.separator;
        const meaningsEntry = main.panels["add-kanji"].$("meanings-entry");
        const onYomiEntry = main.panels["add-kanji"].$("on-yomi-entry");
        const kunYomiEntry = main.panels["add-kanji"].$("kun-yomi-entry");
        if (type === "meaning") {
            const meanings = utility.parseEntries(
                meaningsEntry.value, separator);
            const meaning = node.textContent;
            meanings.remove(meaning);
            meaningsEntry.value = meanings.join(separator + " ");
        } else if (type === "on-yomi") {
            const onYomiList = utility.parseEntries(
                onYomiEntry.value, separator);
            const onYomi = node.textContent;
            onYomiList.remove(onYomi);
            onYomiEntry.value = onYomiList.join(separator + " ");
        } else if (type === "kun-yomi") {
            const kunYomiList = utility.parseEntries(
                kunYomiEntry.value, separator);
            const kunYomi = node.textContent;
            kunYomiList.remove(kunYomi);
            kunYomiEntry.value = kunYomiList.join(separator + " ");
        }
    }

    selectSuggestionNode(node, type) {
        if (!super.selectSuggestionNode(node, type)) return;
        const separator = dataManager.settings.add.separator;
        const meaningsEntry = main.panels["add-kanji"].$("meanings-entry");
        const onYomiEntry = main.panels["add-kanji"].$("on-yomi-entry");
        const kunYomiEntry = main.panels["add-kanji"].$("kun-yomi-entry");
        if (type === "meaning") {
            const meanings = utility.parseEntries(
                meaningsEntry.value, separator);
            const meaning = node.textContent;
            if (!meanings.includes(meaning)) meanings.push(meaning);
            meaningsEntry.value = meanings.join(separator + " ");
        } else if (type === "on-yomi") {
            const onYomiList = utility.parseEntries(
                onYomiEntry.value, separator);
            const onYomi = node.textContent;
            if (!onYomiList.includes(onYomi)) onYomiList.push(onYomi);
            onYomiEntry.value = onYomiList.join(separator + " ");
        } else if (type === "kun-yomi") {
            const kunYomiList = utility.parseEntries(
                kunYomiEntry.value, separator);
            const kunYomi = node.textContent;
            if (!kunYomiList.includes(kunYomi)) kunYomiList.push(kunYomi);
            kunYomiEntry.value = kunYomiList.join(separator + " ");
        }
    }
}

customElements.define("add-kanji-suggestion-pane", AddKanjiSuggestionPane);
module.exports = AddKanjiSuggestionPane;
