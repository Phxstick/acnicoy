"use strict";

const menuItems = contextMenu.registerItems({
    "copy-kanji": {
        label: "Copy kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            clipboard.writeText(kanji);
        }
    },
    "remove-kanji": {
        label: "Remove kanji from SRS items",
        click: ({ data: {section} }) => {
            section.deleteKanji();
        }
    },
    "add-meaning": {
        label: "Add meaning",
        click: ({ data: {section} }) => {
            section.createListItem("meaning");
        }
    },
    "delete-meaning": {
        label: "Remove meaning",
        click: ({ currentNode, data: {section} }) => {
            currentNode.remove();
            if (section.$("meanings").children.length === 0)
                section.$("srs-level-meaning").disabled = true;
        }
    },
    "modify-meaning": {
        label: "Modify meaning",
        click: ({ currentNode }) => {
            currentNode.focus();
        }
    },
    "add-on-yomi": {
        label: "Add on-yomi",
        click: ({ data: {section} }) => {
            section.createListItem("on-yomi");
        }
    },
    "delete-on-yomi": {
        label: "Remove on-yomi",
        click: ({ currentNode, data: {section} }) => {
            currentNode.remove();
            if (section.$("on-yomi").children.length === 0)
                section.$("srs-level-on-yomi").disabled = true;
        }
    },
    "modify-on-yomi": {
        label: "Modify on-yomi",
        click: ({ currentNode }) => {
            currentNode.focus();
        }
    },
    "add-kun-yomi": {
        label: "Add kun-yomi",
        click: ({ data: {section} }) => {
            section.createListItem("kun-yomi");
        }
    },
    "delete-kun-yomi": {
        label: "Remove kun-yomi",
        click: ({ currentNode, data: {section} }) => {
            currentNode.remove();
            if (section.$("kun-yomi").children.length === 0)
                section.$("srs-level-kun-yomi").disabled = true;
        }
    },
    "modify-kun-yomi": {
        label: "Modify kun-yomi",
        click: ({ currentNode }) => {
            currentNode.focus();
        }
    }
});

class EditKanjiPanel extends EditPanel {
    constructor() {
        super("edit-kanji", ["meaning", "on-yomi", "kun-yomi"]);

        // Configure context menu for static elements
        this.$("kanji").contextMenu(menuItems,
                ["copy-kanji", "remove-kanji"], { section: this });
        this.$("meanings-wrapper").contextMenu(
                menuItems, ["add-meaning"], { section: this });
        this.$("on-yomi-wrapper").contextMenu(menuItems,
                ["add-on-yomi"], { section: this });
        this.$("kun-yomi-wrapper").contextMenu(menuItems,
                ["add-kun-yomi"], { section: this });

        // Create closing and saving callbacks
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("edit-kanji"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("edit-kanji"));
        this.$("save-button").addEventListener("click", () => this.save());
        this.$("all-srs-levels").callback = (label, value) => {
            this.$("srs-level-meaning").setByIndex(value - 1);
            this.$("srs-level-on-yomi").setByIndex(value - 1);
            this.$("srs-level-kun-yomi").setByIndex(value - 1);
        };
    }

    registerCentralEventListeners() {
        events.onAll(["language-changed", "current-srs-scheme-edited"], () => {
            // Fill SRS level popup stacks
            const numLevels = dataManager.srs.currentScheme.numLevels;
            const intervalTexts = dataManager.srs.currentScheme.intervalTexts;
            const popups = [
                this.$("all-srs-levels"), this.$("srs-level-meaning"),
                this.$("srs-level-kun-yomi"), this.$("srs-level-on-yomi")
            ];
            for (const popup of popups) {
                popup.empty();
                for (let level = 1; level <= numLevels; ++level) {
                    const option = popup.addOption(level);
                    option.dataset.tooltip = intervalTexts[level];
                }
            }
        });
        events.on("settings-design-animate-popup-stacks", () => {
            const animate = dataManager.settings.design.animatePopupStacks;
            this.$("all-srs-levels").animate = animate;
            this.$("srs-level-meaning").animate = animate;
            this.$("srs-level-on-yomi").animate = animate;
            this.$("srs-level-kun-yomi").animate = animate;
        });
    }

    load(kanji) {
        return dataManager.kanji.getInfo(kanji).then((info) => {
            this.$("meanings").empty();
            this.$("on-yomi").empty();
            this.$("kun-yomi").empty();
            this.$("kanji").textContent = kanji;
            for (const meaning of info.meanings) {
                this.createListItem("meaning", meaning);
            }
            for (const onYomi of info.onYomi) {
                this.createListItem("on-yomi", onYomi);
            }
            for (const kunYomi of info.kunYomi) {
                this.createListItem("kun-yomi", kunYomi);
            }
            // Set level popup stacks
            this.$("all-srs-levels").setByIndex(0);
            this.$("srs-level-meaning").setByIndex(info.meaningsLevel - 1);
            this.$("srs-level-on-yomi").setByIndex(info.onYomiLevel - 1);
            this.$("srs-level-kun-yomi").setByIndex(info.kunYomiLevel - 1);
            // Disable level popups if there's no list entry
            this.$("srs-level-meaning").disabled = info.meanings.length === 0;
            this.$("srs-level-on-yomi").disabled = info.onYomi.length === 0;
            this.$("srs-level-kun-yomi").disabled = info.kunYomi.length === 0;
        });
    }

    createListItem(type, text="") {
        const node = super.createListItem(type, text);
        // If it's a yomi, enable kana input
        node.addEventListener("focusin", () => {
            if (type === "on-yomi") node.enableKanaInput("katakana");
            if (type === "kun-yomi") node.enableKanaInput("hiragana");
        });
        // Disable srs-level-selector if there are no items left of this type
        node.addEventListener("focusout", () => {
            this.$(`srs-level-${type}`).disabled =
                this.viewNodes[type].children.length === 0;
        });
        // Attach a context-menu
        if (type === "meaning") {
            node.contextMenu(menuItems, ["delete-meaning", "modify-meaning"],
                             { section: this });
        } else if (type === "kun-yomi") {
            node.contextMenu(menuItems, ["delete-kun-yomi", "modify-kun-yomi"],
                             { section: this });
        } else if (type === "on-yomi") {
            node.contextMenu(menuItems, ["delete-on-yomi", "modify-on-yomi"],
                             { section: this });
        }
        if (text.length === 0) {
            node.focus();
        }
        return node;
    }

    deleteKanji() {
        const kanji = this.$("kanji").textContent;
        return dialogWindow.confirm(
            `Are you sure you want to remove the kanji '${kanji}'?`)
        .then((confirmed) => {
            if (!confirmed) return;
            dataManager.kanji.remove(kanji);
            main.closePanel("edit-kanji");
            events.emit("kanji-removed", kanji);
        });
    }

    save() {
        const kanji = this.$("kanji").textContent;
        const levels = {
            meanings: parseInt(this.$("srs-level-meaning").value),
            on_yomi: parseInt(this.$("srs-level-on-yomi").value),
            kun_yomi: parseInt(this.$("srs-level-kun-yomi").value)
        };
        const values = { meanings: [], on_yomi: [], kun_yomi: [] };
        for (const item of this.$("meanings").children)
            values.meanings.push(item.textContent);
        for (const item of this.$("on-yomi").children)
            values.on_yomi.push(item.textContent);
        for (const item of this.$("kun-yomi").children)
            values.kun_yomi.push(item.textContent);
        return dataManager.kanji.edit(kanji, values, levels).then((result) => {
            if (result === "removed") {
                main.updateStatus(`Kanji ${kanji} has been removed.`);
                events.emit("kanji-removed", kanji);
            } else if (result === "updated") {
                main.updateStatus(`Kanji ${kanji} has been updated.`);
                events.emit("kanji-changed", kanji);
            }
            main.closePanel("edit-kanji");
        });
    }
}

customElements.define("edit-kanji-panel", EditKanjiPanel);
module.exports = EditKanjiPanel;
