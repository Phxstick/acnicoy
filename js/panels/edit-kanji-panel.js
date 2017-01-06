"use strict";

const menuItems = popupMenu.registerItems({
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
            const item = section.createListItem("", "meaning");
            section.$("meanings").scrollToBottom();
            item.focus();
        }
    },
    "delete-meaning": {
        label: "Remove meaning",
        click: ({ currentNode, data: {section} }) => {
            currentNode.remove();
            if (section.$("meanings").children.length === 0)
                section.$("srs-level-meanings").disabled = true;
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
            const item = section.createListItem("", "on-yomi");
            section.$("on-yomi").scrollToBottom;
            item.focus();
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
            const item = section.createListItem("", "kun-yomi");
            section.$("kun-yomi").scrollToBottom;
            item.focus();
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

class EditKanjiPanel extends Panel {
    constructor() {
        super("edit-kanji");
        this.typeToPopup = {
            "meaning": this.$("srs-level-meanings"),
            "on-yomi": this.$("srs-level-on-yomi"),
            "kun-yomi": this.$("srs-level-kun-yomi")
        };
        // Create callbacks for adding values
        this.$("add-meaning-button").addEventListener("click", () => {
            const item = this.createListItem("", "meaning");
            item.focus();
        });
        this.$("add-on-yomi-button").addEventListener("click", () => {
            const item = this.createListItem("", "on-yomi");
            item.focus();
        });
        this.$("add-kun-yomi-button").addEventListener("click", () => {
            const item = this.createListItem("", "kun-yomi");
            item.focus();
        });
        // Configure popup-menu for static elements
        this.$("kanji").popupMenu(menuItems,
                ["copy-kanji", "remove-kanji"], { section: this });
        this.$("meanings").popupMenu(
                menuItems, ["add-meaning"], { section: this });
        this.$("on-yomi").popupMenu(menuItems,
                ["add-on-yomi"], { section: this });
        this.$("kun-yomi").popupMenu(menuItems,
                ["add-kun-yomi"], { section: this });
        // Create closing and saving callbacks
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("edit-kanji"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("edit-kanji"));
        this.$("save-button").addEventListener(
            "click", () => { this.save(); main.closePanel("edit-kanji"); });
        this.$("all-srs-levels").callback = (label, value) => {
            this.$("srs-level-meanings").setByIndex(value - 1);
            this.$("srs-level-on-yomi").setByIndex(value - 1);
            this.$("srs-level-kun-yomi").setByIndex(value - 1);
        };
    }

    registerCentralEventListeners() {
        events.onAll(["language-changed", "current-srs-scheme-edited"], () => {
            const popups = [
                this.$("all-srs-levels"), this.$("srs-level-meanings"),
                this.$("srs-level-kun-yomi"), this.$("srs-level-on-yomi")
            ];
            for (const popup of popups) {
                for (let i = 1; i < popup.children.length + 1; ++i) {
                    const option = popup.children[i - 1];
                    option.dataset.tooltip =
                        dataManager.srs.currentScheme.intervalTexts[i];
                }
            }
        });
    }

    adjustToLanguage(language, secondary) {
        if (language !== "Japanese") return;
        // Fill SRS levels popup stacks
        const numLevels = dataManager.srs.currentScheme.numLevels;
        const popups = [
            this.$("all-srs-levels"), this.$("srs-level-meanings"),
            this.$("srs-level-on-yomi"), this.$("srs-level-kun-yomi")
        ];
        for (const levelPopup of popups) {
            levelPopup.empty();
            for (let i = 1; i <= numLevels; ++i) levelPopup.addOption(i);
        }
    }

    load(kanji) {
        return dataManager.kanji.getInfo(kanji).then((info) => {
            this.$("meanings").empty();
            this.$("on-yomi").empty();
            this.$("kun-yomi").empty();
            this.$("kanji").textContent = kanji;
            for (const meaning of info.meanings) {
                this.createListItem(meaning, "meaning");
            }
            for (const onYomi of info.onYomi) {
                this.createListItem(onYomi, "on-yomi");
            }
            for (const kunYomi of info.kunYomi) {
                this.createListItem(kunYomi, "kun-yomi");
            }
            // Set level popup stacks
            this.$("all-srs-levels").setByIndex(0);
            this.$("srs-level-meanings").setByIndex(info.meaningsLevel - 1);
            this.$("srs-level-on-yomi").setByIndex(info.onYomiLevel - 1);
            this.$("srs-level-kun-yomi").setByIndex(info.kunYomiLevel - 1);
            // Disable level popups if there's no list entry
            this.$("srs-level-meanings").disabled = info.meanings.length === 0;
            this.$("srs-level-on-yomi").disabled = info.onYomi.length === 0;
            this.$("srs-level-kun-yomi").disabled = info.kunYomi.length === 0;
        });
    }

    createListItem(text, type) {
        const node = document.createElement("span");
        node.textContent = text;
        // Allow editing details on click
        node.contentEditable = "true";
        // If it's a yomi, enable kana input
        node.addEventListener("focusin", () => {
            if (node.parentNode === this.$("on-yomi")) {
                node.enableKanaInput("kata", this.root);
            }
            if (node.parentNode === this.$("kun-yomi")) {
                node.enableKanaInput("hira", this.root);
            }
        });
        // If the node is left empty, remove it upon losing focus
        node.addEventListener("focusout", () => {
            this.root.getSelection().removeAllRanges();
            const newContent = node.textContent.trim();
            const listNode = node.parentNode;
            if (newContent.length === 0) {
                node.remove();
            } else {
                node.textContent = newContent;
            }
            // Disable srs-level-selector if there are no items of this type
            this.typeToPopup[type].disabled = listNode.children.length === 0;
        });
        // If Enter key is pressed, quit editing
        node.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                node.blur();
            }
        });
        // Insert item into DOM and attach a context-menu
        if (type === "meaning") {
            this.$("meanings").appendChild(node);
            node.popupMenu(menuItems, ["delete-meaning", "modify-meaning"],
                           { section: this });
        } else if (type === "kun-yomi") {
            this.$("kun-yomi").appendChild(node);
            node.popupMenu(menuItems, ["delete-kun-yomi", "modify-kun-yomi"],
                           { section: this });
        } else if (type === "on-yomi") {
            this.$("on-yomi").appendChild(node);
            node.popupMenu(menuItems, ["delete-on-yomi", "modify-on-yomi"],
                           { section: this });
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
            meanings: parseInt(this.$("srs-level-meanings").value),
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
            } else if (result === "no-change") {
                main.updateStatus(`Kanji ${kanji} has not been changed.`);
            }
        });
    }
}

customElements.define("edit-kanji-panel", EditKanjiPanel);
module.exports = EditKanjiPanel;
