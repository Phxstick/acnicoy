"use strict";

const menuItems = popupMenu.registerItems({
    "copy-hanzi": {
        label: "Copy hanzi",
        click: ({ currentNode }) => {
            const hanzi = currentNode.textContent;
            clipboard.writeText(hanzi);
        }
    },
    "remove-hanzi": {
        label: "Remove hanzi from SRS items",
        click: ({ data: {section} }) => {
            section.deleteHanzi();
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
    "add-reading": {
        label: "Add reading",
        click: ({ data: {section} }) => {
            const item = section.createListItem("", "reading");
            section.$("readings").scrollToBottom;
            item.focus();
        }
    },
    "delete-reading": {
        label: "Remove reading",
        click: ({ currentNode, data: {section} }) => {
            currentNode.remove();
            if (section.$("readings").children.length === 0)
                section.$("srs-level-readings").disabled = true;
        }
    },
    "modify-reading": {
        label: "Modify reading",
        click: ({ currentNode }) => {
            currentNode.focus();
        }
    }
});

class EditHanziPanel extends Panel {
    constructor() {
        super("edit-hanzi");
        this.typeToPopup = {
            "meaning": this.$("srs-level-meanings"),
            "reading": this.$("srs-level-readings")
        };
        // Create callbacks for adding values
        this.$("add-meaning-button").addEventListener("click", () => {
            const item = this.createListItem("", "meaning");
            item.focus();
        });
        this.$("add-reading-button").addEventListener("click", () => {
            const item = this.createListItem("", "reading");
            item.focus();
        });
        // Configure popup-menu for static elements
        this.$("hanzi").popupMenu(menuItems,
                ["copy-hanzi", "remove-hanzi"], { section: this });
        this.$("meanings").popupMenu(
                menuItems, ["add-meaning"], { section: this });
        this.$("readings").popupMenu(menuItems,
                ["add-reading"], { section: this });
        // Create closing and saving callbacks
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("edit-hanzi"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("edit-hanzi"));
        this.$("save-button").addEventListener(
            "click", () => { this.save(); main.closePanel("edit-hanzi"); });
        this.$("all-srs-levels").callback = (label, value) => {
            this.$("srs-level-meanings").setByIndex(value - 1);
            this.$("srs-level-readings").setByIndex(value - 1);
        };
    }

    registerCentralEventListeners() {
        events.onAll(["language-changed", "current-srs-scheme-edited"], () => {
            // Fill SRS level popup stacks
            const numLevels = dataManager.srs.currentScheme.numLevels;
            const intervalTexts = dataManager.srs.currentScheme.intervalTexts;
            const popups = [
                this.$("all-srs-levels"), this.$("srs-level-meanings"),
                this.$("srs-level-readings")
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
            this.$("srs-level-meanings").animate = animate;
            this.$("srs-level-readings").animate = animate;
        });
    }

    load(hanzi) {
        return dataManager.hanzi.getInfo(hanzi).then((info) => {
            this.$("meanings").empty();
            this.$("readings").empty();
            this.$("hanzi").textContent = hanzi;
            for (const meaning of info.meanings) {
                this.createListItem(meaning, "meaning");
            }
            for (const reading of info.readings) {
                this.createListItem(reading, "reading");
            }
            // Set level popup stacks
            this.$("all-srs-levels").setByIndex(0);
            this.$("srs-level-meanings").setByIndex(info.meaningsLevel - 1);
            this.$("srs-level-readings").setByIndex(info.readingsLevel - 1);
            // Disable level popups if there's no list entry
            this.$("srs-level-meanings").disabled = info.meanings.length === 0;
            this.$("srs-level-readings").disabled = info.readings.length === 0;
        });
    }

    createListItem(text, type) {
        const node = document.createElement("span");
        node.textContent = text;
        // Allow editing details on click
        node.contentEditable = "true";
        // If it's a reading, enable pinyin input
        node.addEventListener("focusin", () => {
            if (node.parentNode === this.$("readings")) {
                node.enablePinyinInput();
            }
        });
        // If the node is left empty, remove it upon losing focus
        node.addEventListener("focusout", () => {
            this.root.getSelection().removeAllRanges();
            const newText = node.textContent.trim();
            const listNode = node.parentNode;
            let removeNode = false;
            // If the node is left empty, remove it
            if (newText.length === 0) {
                removeNode = true;
            }
            // If the node is a duplicate, remove it
            for (const otherNode of listNode.children) {
                if (node === otherNode) continue;
                if (otherNode.textContent === newText) {
                    removeNode = true;
                    break;
                }
            }
            if (removeNode) {
                node.remove();
            } else {
                node.textContent = newText;
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
        } else if (type === "reading") {
            this.$("readings").appendChild(node);
            node.popupMenu(menuItems, ["delete-reading", "modify-reading"],
                           { section: this });
        }
        return node;
    }

    deleteHanzi() {
        const hanzi = this.$("hanzi").textContent;
        return dialogWindow.confirm(
            `Are you sure you want to remove the hanzi '${hanzi}'?`)
        .then((confirmed) => {
            if (!confirmed) return;
            dataManager.hanzi.remove(hanzi);
            main.closePanel("edit-hanzi");
            events.emit("hanzi-removed", hanzi);
        });
    }

    save() {
        const hanzi = this.$("hanzi").textContent;
        const levels = {
            meanings: parseInt(this.$("srs-level-meanings").value),
            readings: parseInt(this.$("srs-level-readings").value)
        };
        const values = { meanings: [], readings: [] };
        for (const item of this.$("meanings").children)
            values.meanings.push(item.textContent);
        for (const item of this.$("readings").children)
            values.readings.push(item.textContent);
        return dataManager.hanzi.edit(hanzi, values, levels).then((result) => {
            if (result === "removed") {
                main.updateStatus(`Hanzi ${hanzi} has been removed.`);
                events.emit("hanzi-removed", hanzi);
            } else if (result === "updated") {
                main.updateStatus(`Hanzi ${hanzi} has been updated.`);
                events.emit("hanzi-changed", hanzi);
            }
        });
    }
}

customElements.define("edit-hanzi-panel", EditHanziPanel);
module.exports = EditHanziPanel;