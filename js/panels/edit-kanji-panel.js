"use strict";

const menuItems = contextMenu.registerItems({
    "copy-kanji": {
        label: "Copy kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            clipboard.writeText(kanji);
            currentNode.blur();
        }
    },
    "remove-kanji": {
        label: "Delete kanji",
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
                section.$("srs-level-meaning").hide();
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
                section.$("srs-level-on-yomi").hide();
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
                section.$("srs-level-kun-yomi").hide();
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
        this.closed = false;
        this.originalKanji = null;
        this.lastEnteredKanji = null;
        this.$("kanji").putCursorAtEndOnFocus(this.root);

        // Prevent having more than one character in the kanji entry
        this.$("kanji").addEventListener("keypress", (event) => {
            const selection = this.root.getSelection();
            const existingText = this.$("kanji").textContent;
            if (existingText.length === 1 && selection.getRangeAt(0).collapsed)
                event.preventDefault();
        });
        this.$("kanji").addEventListener("paste", (event) => {
            event.preventDefault();
            const newText = event.clipboardData.getData("text/plain");
            if (newText.length === 0) return;
            const existingText = this.$("kanji").textContent;
            const selection = this.root.getSelection();
            if (existingText.length === 1 && selection.getRangeAt(0).collapsed)
                event.preventDefault();
            else document.execCommand("insertText", false, newText[0]);
        });

        // Upon finishing entering kanji, try to load associated information
        this.$("kanji").addEventListener("focusout", async () => {
            if (this.closed) return;
            const newKanji = this.$("kanji").textContent;
            if (this.originalKanji !== null || newKanji.length === 0) return;
            if (this.lastEnteredKanji === newKanji) return;
            this.lastEnteredKanji = newKanji;

            // If the entered kanji is already added, load data from vocabulary
            const isAlreadyAdded = await dataManager.kanji.isAdded(newKanji);
            if (isAlreadyAdded) {
                await this.load(newKanji);
                this.originalKanji = null;  // To stay in "add-mode"
            } else {
                this.$("header").textContent = "Add kanji";
            }

            // If language data is available, load suggestions as well
            if (dataManager.content.isDictionaryAvailable()) {
                const known = await dataManager.content.isKnownKanji(newKanji);
                if (known) {
                    main.suggestionPanes["edit-kanji"].load(newKanji);
                    main.showSuggestionsPane("edit-kanji", true);
                } else {
                    main.hideSuggestionPane(true);
                }
            }
        });

        // Jump to meanings when pressing enter after typing in a new kanji
        this.$("kanji").addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                if (this.originalKanji === null) {
                    this.createListItem("meaning");
                } else {
                    this.$("kanji").blur();
                }
                event.preventDefault();
            }
        });

        // SRS level selectors shouldn't be accessible using tab, only shortcuts
        this.$("srs-level-meaning").setAttribute("tabindex", "-1");
        this.$("srs-level-on-yomi").setAttribute("tabindex", "-1");
        this.$("srs-level-kun-yomi").setAttribute("tabindex", "-1");
        this.root.addEventListener("keydown", (event) => {
            if (event.ctrlKey && "1" <= event.key && event.key <= "9") {
                const focussedElement = this.root.activeElement;
                const newLevel = parseInt(event.key);
                if (this.$("meanings").contains(focussedElement)) {
                    this.$("srs-level-meaning").setByIndex(newLevel - 1);
                } else if (this.$("on-yomi").contains(focussedElement)) {
                    this.$("srs-level-on-yomi").setByIndex(newLevel - 1);
                } else if (this.$("kun-yomi").contains(focussedElement)) {
                    this.$("srs-level-kun-yomi").setByIndex(newLevel - 1);
                } else {
                    this.$("all-srs-levels").setByIndex(newLevel - 1);
                }
                event.preventDefault();
                event.stopPropagation();
            }
        });

        // Set up SRS level selector that sets levels for all details
        this.$("all-srs-levels").callback = (label, value) => {
            this.$("srs-level-meaning").setByIndex(value - 1);
            this.$("srs-level-on-yomi").setByIndex(value - 1);
            this.$("srs-level-kun-yomi").setByIndex(value - 1);
        };

        // Create closing and saving callbacks
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("edit-kanji"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("edit-kanji"));
        this.$("save-button").addEventListener("click", () => this.save());

        // Configure context menu for static elements
        this.$("kanji").contextMenu(menuItems, () =>
            this.originalKanji === null ? ["copy-kanji"] :
                ["copy-kanji", "remove-kanji"], { section: this });
        this.$("meanings-wrapper").contextMenu(
                menuItems, ["add-meaning"], { section: this });
        this.$("on-yomi-wrapper").contextMenu(menuItems,
                ["add-on-yomi"], { section: this });
        this.$("kun-yomi-wrapper").contextMenu(menuItems,
                ["add-kun-yomi"], { section: this });
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

    open() {
        this.closed = false;
        if (this.originalKanji === null) {
            this.$("kanji").focus();
        }
    }

    close() {
        this.closed = true;
    }

    async load(kanji) {
        // Check if the kanji is already in the vocabulary
        if (kanji !== undefined && await dataManager.kanji.isAdded(kanji)) {
            this.originalKanji = kanji;
        } else {
            this.originalKanji = null;
            this.lastEnteredKanji = null;
        }

        // If a new kanji is getting added, just clear all fields
        if (this.originalKanji === null) {
            this.$("kanji").textContent = kanji !== undefined ? kanji : "";
            this.$("meanings").empty();
            this.$("on-yomi").empty();
            this.$("kun-yomi").empty();
            this.$("header").textContent = "Add kanji";
            this.$("all-srs-levels").setByIndex(0);
            this.$("srs-level-meaning").hide();
            this.$("srs-level-on-yomi").hide();
            this.$("srs-level-kun-yomi").hide();
            return;
        }
        this.$("header").textContent = "Edit kanji";

        // Otherwise, fill in the data associated with this kanji 
        const info = await dataManager.kanji.getInfo(kanji);
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

        // Set levels in popup stacks
        this.$("all-srs-levels").setByIndex(0);  // Must be set first
        this.$("srs-level-meaning").setByIndex(info.meaningsLevel - 1);
        this.$("srs-level-on-yomi").setByIndex(info.onYomiLevel - 1);
        this.$("srs-level-kun-yomi").setByIndex(info.kunYomiLevel - 1);

        // Hide level popups if there are no values in a field
        this.$("srs-level-meaning").toggleDisplay(info.meanings.length > 0)
        this.$("srs-level-on-yomi").toggleDisplay(info.onYomi.length > 0)
        this.$("srs-level-kun-yomi").toggleDisplay(info.kunYomi.length > 0)
    }

    createListItem(type, text="") {
        const node = super.createListItem(type, text);

        // If a node with this text already exists, do nothing
        if (node === null) return;

        // If it's a yomi, enable kana input
        node.addEventListener("focusin", () => {
            if (type === "on-yomi") node.enableKanaInput("katakana");
            if (type === "kun-yomi") node.enableKanaInput("hiragana");
        });

        // Show srs-level selector if this is the first item of the given type
        if (this.viewNodes[type].children.length === 1) {
            this.$(`srs-level-${type}`).show();
        }

        // Hide srs-level-selector if there are no items left of the given type
        node.addEventListener("focusout", () => {
            this.$(`srs-level-${type}`).toggleDisplay(
                this.viewNodes[type].children.length > 0);
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

    async deleteKanji() {
        const kanji = this.originalKanji;
        const confirmed = await dialogWindow.confirm(
            `Are you sure you want to remove the kanji ${kanji}?`);
        if (!confirmed) return false;
        dataManager.kanji.remove(kanji);
        events.emit("kanji-removed", kanji);
        main.closePanel("edit-kanji");
        main.updateStatus(`The kanji ${kanji} has been removed.`);
        return true;
    }

    async save() {
        // Prevent empty item getting added as meaning/on-yomi/kun-yomi
        if (this.root.activeElement !== null)
            this.root.activeElement.blur();

        // Assemble all the necessary data
        const originalKanji = this.originalKanji;
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

        // If no kanji has been entered or no values have been entered at all,
        // display an error message (if adding) or ask whether to remove kanji
        if ((values.meanings.length === 0 && values.on_yomi.length === 0 &&
                values.kun_yomi.length === 0) || kanji.length === 0) {
            if (originalKanji === null) {
                if (kanji.length === 0) {
                    dialogWindow.info("The kanji to be added is missing.");
                } else {
                    dialogWindow.info("You must enter at least one meaning, " +
                                      "on-yomi or kun-yomi to add the kanji.");
                }
            } else {
                this.deleteKanji();
            }
            return;
        }

        // If a kanji is being edited and was renamed, apply this change first
        const isAlreadyAdded = await dataManager.kanji.isAdded(kanji);
        const renamed = originalKanji !== null && originalKanji !== kanji;
        if (renamed) {
            if (isAlreadyAdded) {
                const confirmed = await dialogWindow.confirm(
                    `The kanji ${kanji} has already been added to the ` +
                    `vocabulary. Do you want to overwrite its values?`);
                if (!confirmed) return;
                await dataManager.kanji.remove(originalKanji);
                events.emit("kanji-removed", originalKanji);
            } else {
                await dataManager.kanji.rename(originalKanji, kanji);
                events.emit("kanji-removed", originalKanji);
                events.emit("kanji-added", kanji);
            }
        }

        // Apply other changes to the database and emit corresponding events
        let dataChanged;
        if (isAlreadyAdded || renamed) {
            const result = await dataManager.kanji.edit(kanji, values, levels);
            dataChanged = result === "updated";
            if (dataChanged) events.emit("kanji-changed", kanji);
        } else {
            await dataManager.kanji.add(kanji, values, levels);
            events.emit("kanji-added", kanji);
        }

        // Update the status message
        if (isAlreadyAdded || renamed) {
            if (renamed) {
                main.updateStatus(
                    `Kanji ${originalKanji} has been renamed to ${kanji}.`);
            } else if (dataChanged) {
                main.updateStatus(`Kanji ${kanji} has been updated.`);
            }
        } else {
            main.updateStatus(`Kanji ${kanji} has been added.`);
        }

        main.closePanel("edit-kanji");
    }
}

customElements.define("edit-kanji-panel", EditKanjiPanel);
module.exports = EditKanjiPanel;
