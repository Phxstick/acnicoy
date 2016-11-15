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
            section.meaningsList.scrollToBottom();
            section.packEditEntry(item, "meaning");
        }
    },
    "delete-meaning": {
        label: "Delete meaning",
        click: ({ currentNode, data: {section} }) => {
            section.meaningsList.removeChild(currentNode);
            if (section.meaningsList.children.length === 0)
                section.meaningsLevelPopup.disabled = true;
        }
    },
    "modify-meaning": {
        label: "Modify meaning",
        click: ({ currentNode, data: {section} }) => {
            section.packEditEntry(currentNode, "meaning");
        }
    },
    "add-on-yomi": {
        label: "Add on-yomi",
        click: ({ data: {section} }) => {
            const item = section.createListItem("", "on-yomi");
            section.onYomiList.scrollToBottom;
            section.packEditEntry(item, "on-yomi");
        }
    },
    "delete-on-yomi": {
        label: "Delete on-yomi",
        click: ({ currentNode, data: {section} }) => {
            section.onYomiList.removeChild(currentNode);
            if (section.onYomiList.children.length === 0)
                section.onYomiLevelPopup.disabled = true;
        }
    },
    "modify-on-yomi": {
        label: "Modify on-yomi",
        click: ({ currentNode, data: {section} }) => {
            section.packEditEntry(currentNode, "on-yomi");
        }
    },
    "add-kun-yomi": {
        label: "Add kun-yomi",
        click: ({ data: {section} }) => {
            const item = section.createListItem("", "kun-yomi");
            section.kunYomiList.scrollToBottom;
            section.packEditEntry(item, "kun-yomi");
        }
    },
    "delete-kun-yomi": {
        label: "Delete kun-yomi",
        click: ({ currentNode, data: {section} }) => {
            section.kunYomiList.removeChild(currentNode);
            if (section.kunYomiList.children.length === 0)
                section.kunYomiLevelPopup.disabled = true;
        }
    },
    "modify-kun-yomi": {
        label: "Modify kun-yomi",
        click: ({ currentNode, data: {section} }) => {
            section.packEditEntry(currentNode, "kun-yomi");
        }
    }
});

class EditKanjiPanel extends Panel {
    constructor() {
        super("edit-kanji");
        // Store important DOM elements as properties
        this.kanjiLabel = this.root.getElementById("kanji");
        this.meaningsList = this.root.getElementById("meanings");
        this.onYomiList = this.root.getElementById("on-yomi");
        this.kunYomiList = this.root.getElementById("kun-yomi");
        this.meaningsLevelPopup =
            this.root.getElementById("srs-level-meanings");
        this.kunYomiLevelPopup = this.root.getElementById("srs-level-kun-yomi");
        this.onYomiLevelPopup = this.root.getElementById("srs-level-on-yomi");
        this.allLevelsPopup = this.root.getElementById("all-srs-levels");
        this.typeToPopup = {
            "meaning": this.meaningsLevelPopup,
            "on-yomi": this.onYomiLevelPopup,
            "kun-yomi": this.kunYomiLevelPopup
        };
        // Create the edit input
        this.editInput = document.createElement("input");
        this.editInput.id = "edit-input";
        this.editInput.classList.add("inline-edit");
        this.editInput.callback = () => { };
        this.editInput.addEventListener("keypress", (event) => {
            if (event.keyCode === 13) {
                this.editInput.callback();
                this.editInput.unpack();
            }
        });
        // Configure popup-menu for static elements
        this.kanjiLabel.popupMenu(menuItems,
                ["copy-kanji", "remove-kanji"], { section: this });
        this.meaningsList.popupMenu(
                menuItems, ["add-meaning"], { section: this });
        this.onYomiList.popupMenu(menuItems,
                ["add-on-yomi"], { section: this });
        this.kunYomiList.popupMenu(menuItems,
                ["add-kun-yomi"], { section: this });
        // Create closing and saving callbacks
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("edit-kanji"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("edit-kanji"));
        this.$("save-button").addEventListener(
            "click", () => { this.save(); main.closePanel("edit-kanji"); });
        this.allLevelsPopup.callback = (label, value) => {
            const idx = value - 1;
            this.meaningsLevelPopup.set(this.meaningsLevelPopup.children[idx]);
            this.onYomiLevelPopup.set(this.onYomiLevelPopup.children[idx]);
            this.kunYomiLevelPopup.set(this.kunYomiLevelPopup.children[idx]);
        };
    }

    registerCentralEventListeners() {
        events.onAll(["language-changed", "srs-scheme-changed"], () => {
            const popups = [this.allLevelsPopup, this.meaningsLevelPopup,
                            this.kunYomiLevelPopup, this.onYomiLevelPopup];
            for (const popup of popups) {
                for (let i = 1; i < popup.children.length + 1; ++i) {
                    const option = popup.children[i - 1];
                    option.dataset.tooltip = dataManager.srs.intervalTexts[i];
                }
            }
        });
    }

    adjustToLanguage(language, secondary) {
        if (language !== "Japanese") return;
        // Fill SRS levels popup stacks
        const numLevels = dataManager.srs.numLevels;
        const popups = [ this.allLevelsPopup, this.meaningsLevelPopup,
                         this.onYomiLevelPopup, this.kunYomiLevelPopup ];
        for (const levelPopup of popups) {
            levelPopup.empty();
            for (let i = 1; i < numLevels; ++i) levelPopup.addOption(i);
        }
    }

    load(kanji) {
        return dataManager.kanji.getInfo(kanji).then((info) => {
            this.meaningsList.empty();
            this.onYomiList.empty();
            this.kunYomiList.empty();
            this.kanjiLabel.textContent = kanji;
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
            this.allLevelsPopup.set(this.allLevelsPopup.firstChild);
            this.meaningsLevelPopup.set(
                    this.meaningsLevelPopup.children[info.meaningsLevel - 1]);
            this.onYomiLevelPopup.set(
                    this.onYomiLevelPopup.children[info.onYomiLevel - 1]);
            this.kunYomiLevelPopup.set(
                    this.kunYomiLevelPopup.children[info.kunYomiLevel - 1]);
            // Disable level popups if there's no list entry
            this.meaningsLevelPopup.disabled = info.meanings.length === 0;
            this.onYomiLevelPopup.disabled = info.onYomi.length === 0;
            this.kunYomiLevelPopup.disabled = info.kunYomi.length === 0;
        });
    }

    createListItem(text, type) {
        const div = document.createElement("div");
        div.textContent = text;
        div.addEventListener("click", () => this.packEditEntry(div, type));
        if (type === "meaning") {
            this.meaningsList.appendChild(div);
            div.popupMenu(menuItems, ["delete-meaning", "modify-meaning"],
                           { section: this });
        } else if (type === "kun-yomi") {
            this.kunYomiList.appendChild(div);
            div.popupMenu(menuItems, ["delete-kun-yomi", "modify-kun-yomi"],
                           { section: this });
        } else if (type === "on-yomi") {
            this.onYomiList.appendChild(div);
            div.popupMenu(menuItems, ["delete-on-yomi", "modify-on-yomi"],
                           { section: this });
        }
        return div;
    }

    deleteKanji() {
        const kanji = this.kanjiLabel.textContent;
        return dialogWindow.confirm(
            `Are you sure you want to remove the kanji '${kanji}'?`)
        .then((confirmed) => {
            if (!confirmed) return;
            dataManager.kanji.remove(kanji);
            main.closePanel("edit-kanji");
            events.emit("kanji-removed", kanji);
        });
    }

    packEditEntry(node, type) {
        const kanji = this.kanjiLabel.textContent;
        // If the entry is already packed here, do nothing
        if (this.editInput.parentNode === node)
            return;
        // If the entry is already packed somewhere else, unpack it
        if (this.editInput.parentNode !== null) {
            this.editInput.callback();
            this.editInput.unpack();
        }
        const oldContent = node.textContent;
        // Pack the edit entry
        this.editInput.value = oldContent;
        node.textContent = "";
        node.appendChild(this.editInput);
        node.style.padding = "0px";
        if (type === "kun-yomi")
            this.editInput.enableKanaInput("hira");
        else if (type === "on-yomi")
            this.editInput.enableKanaInput("kata");
        // Add callback to unpack entry and pack node again
        this.editInput.unpack = () => {
            const newContent = this.editInput.value.trim();
            if (newContent.length === 0) {
                if (node.parentNode.children.length === 1) {
                    this.typeToPopup[type].disabled = true;
                }
                node.remove();
            } else {
                if (node.parentNode.children.length === 1) {
                    this.typeToPopup[type].disabled = false;
                }
                node.textContent = newContent;
            }
            this.editInput.remove();
            if (type === "kun-yomi" || type === "on-yomi")
                this.editInput.disableKanaInput();
            node.style.padding = "2px";
        }
        this.editInput.focus();
    }

    save() {
        const kanji = this.kanjiLabel.textContent;
        const levels = {
            meanings: parseInt(this.meaningsLevelPopup.value),
            on_yomi: parseInt(this.onYomiLevelPopup.value),
            kun_yomi: parseInt(this.kunYomiLevelPopup.value)
        };
        const values = { meanings: [], on_yomi: [], kun_yomi: [] };
        for (const item of this.meaningsList.children)
            values.meanings.push(item.textContent);
        for (const item of this.onYomiList.children)
            values.on_yomi.push(item.textContent);
        for (const item of this.kunYomiList.children)
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
