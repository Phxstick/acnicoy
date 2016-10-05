"use strict";

const menuItems = PopupMenu.registerItems({
    "copy-kanji": {
        label: "Copy kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            clipboard.writeText(currentNode.textContent);
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
            section.meaningsList.scrollToBottom;
            section.packEditEntry(item, "meaning");
        }
    },
    "delete-meaning": {
        label: "Delete meaning",
        click: ({ currentNode, data: {section} }) => {
            section.meaningsList.removeChild(currentNode);
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
        this.levelPopups = [ this.meaningsLevelPopup, this.onYomiLevelPopup,
                             this.kunYomiLevelPopup, this.allLevelsPopup ];
        // Create the edit input
        this.editInput = document.createElement("input");
        this.editInput.id = "edit-input";
        this.editInput.callback = () => { };
        this.editInput.addEventListener("keypress", (event) => {
            if (event.keyCode === 13) {
                this.editInput.callback();
                this.editInput.unpack();
            }
        });
        // Configure popup-menu for static elements
        this.kanjiLabel.popupMenu(menuItems, ["copy-kanji", "remove-kanji"]);
        this.meaningsList.popupMenu(menuItems, ["add-meaning"]);
        this.onYomiList.popupMenu(menuItems, ["add-on-yomi"]);
        this.kunYomiList.popupMenu(menuItems, ["add-kun-yomi"]);
        // Create closing and saving callbacks
        this.root.getElementById("close-button").addEventListener(
            "click", () => main.closePanel("edit-kanji"));
        this.root.getElementById("cancel-button").addEventListener(
            "click", () => main.closePanel("edit-kanji"));
        this.root.getElementById("save-button").addEventListener(
            "click", () => { this.save(); main.closePanel("edit-kanji"); });
        // TODO: all-srs-levels popup callback
        eventEmitter.emit("done-loading");
    }

    adjustToLanguage(language, secondary) {
        if (language !== "Japanese") return;
        // Fill SRS levels popup stacks
        const numLevels =
            dataManager.languageSettings["SRS"]["spacing"].length;
        for (let levelPopup of this.levelPopups) {
            levelPopup.clear();
            for (let i = 1; i < numLevels; ++i) levelPopup.appendItem(i);
            levelPopup.set(0);
        }
    }

    load(kanji) {
        dataManager.kanji.getInfo(kanji).then((info) => {
            this.meaningsList.empty();
            this.onYomiList.empty();
            this.kunYomiList.empty();
            this.kanjiLabel.textContent = kanji;
            for (let meaning of info.meanings) {
                this.createListItem(meaning, "meaning");
            }
            for (let onYomi of info.onYomi) {
                this.createListItem(onYomi, "on-yomi");
            }
            for (let kunYomi of info.kunYomi) {
                this.createListItem(kunYomi, "kun-yomi");
            }
            // Set level popup stacks
            this.allLevelsPopup.set(0);
            this.meaningsLevelPopup.set(info.meaningsLevel - 1);
            this.onYomiLevelPopup.set(info.onLevel - 1);
            this.kunYomiLevelPopup.set(info.kunLevel - 1);
            // Disable level popups if there's no list entry
            // TODO: Implement disable methods that leave stack empty
            if (info.onYomi.length === 0) this.onYomiLevelPopup.disable();
            else this.onYomiLevelPopup.enable();
            if (info.kunYomi.length === 0) this.kunYomiLevelPopup.disable();
            else this.kunYomiLevelPopup.enable();
            // TODO: Delete these after implementing above functions
            this.onYomiLevelPopup.style.display =
                info.onYomi.length === 0 ? "none" : "flex";
            this.kunYomiLevelPopup.style.display =
                info.kunYomi.length === 0 ? "none" : "flex";
            this.changes = [];
        });
    }

    createListItem(text, type) {
        const span = document.createElement("span");
        span.classList.add("list-entry");
        span.textContent = text;
        span.addEventListener("click", () => this.packEditEntry(span, type));
        if (type === "meaning") {
            this.meaningsList.appendChild(span);
            span.popupMenu(menuItems, ["delete-meaning", "modify-meaning"],
                           { section: this });
        } else if (type === "kun-yomi") {
            this.kunYomiList.appendChild(span);
            span.popupMenu(menuItems, ["delete-kun-yomi", "modify-kun-yomi"],
                           { section: this });
        } else if (type === "on-yomi") {
            this.onYomiList.appendChild(span);
            span.popupMenu(menuItems, ["delete-on-yomi", "modify-on-yomi"],
                           { section: this });
        }
        return span;
    }

    deleteKanji() {
        const kanji = this.kanjiLabel.textContent;
        if (!dialogWindow.confirm(
                `Are you sure you want to remove the kanji '${kanji}'?`))
            return;
        dataManager.kanji.remove(kanji);
        main.closePanel("edit-kanji");
        // TODO: Emit events
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
            if (newContent.length === 0)
                node.remove();
            else
                node.textContent = newContent;
            this.editInput.remove();
            if (type === "kun-yomi" || type === "on-yomi")
                this.editInput.disableKanaInput();
            node.style.padding = "2px";
        }
        this.editInput.focus();
    }

    save() {
        const kanji = this.kanjiLabel.textContent;
        const meanings = [];
        const onYomi = [];
        const kunYomi = [];
        for (let i = 0; i < this.meaningsList.children.length; ++i)
            meanings.push(this.meaningsList.children[i].textContent);
        for (let i = 0; i < this.onYomiList.children.length; ++i)
            onYomi.push(this.onYomiList.children[i].textContent);
        for (let i = 0; i < this.kunYomiList.children.length; ++i)
            kunYomi.push(this.kunYomiList.children[i].textContent);
        const levels = {
            meanings: this.meaningsLevelPopup.get(),
            onYomi: this.onYomiLevelPopup.get(),
            kunYomi: this.kunYomiLevelPopup.get()
        };
        return dataManager.kanji.edit(kanji, meanings, onYomi, kunYomi, levels)
        .then((newStatus) => {
            // Display status message
            if (newStatus === "removed") {
                main.updateStatus(`The kanji ${kanji} has been removed.`);
            } else if (newStatus === "updated") {
                main.updateStatus(`The kanji ${kanji} has been updated.`);
            } else if (newStatus === "no-change") {
                main.updateStatus(`The kanji ${kanji} has not been changed.`);
            } else {
                throw "New status of edited kanji is invalid!";
            }
            // TODO: Emit events
        });
    }
}

customElements.define("edit-kanji-panel", EditKanjiPanel);
module.exports = EditKanjiPanel;