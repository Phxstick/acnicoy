"use strict";

const menuItems = contextMenu.registerItems({
    "copy-hanzi": {
        label: "Copy hanzi",
        click: ({ currentNode }) => {
            const hanzi = currentNode.textContent;
            clipboard.writeText(hanzi);
            currentNode.blur();
        }
    },
    "remove-hanzi": {
        label: "Delete hanzi",
        click: ({ data: {section} }) => {
            section.deleteHanzi();
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
                section.$("srs-level-meanings").hide();
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
            section.createListItem("reading");
        }
    },
    "delete-reading": {
        label: "Remove reading",
        click: ({ currentNode, data: {section} }) => {
            currentNode.remove();
            if (section.$("readings").children.length === 0)
                section.$("srs-level-readings").hide();
        }
    },
    "modify-reading": {
        label: "Modify reading",
        click: ({ currentNode }) => {
            currentNode.focus();
        }
    }
});

class EditHanziPanel extends EditPanel {
    constructor() {
        super("edit-hanzi", ["meaning", "reading"]);
        this.originalHanzi = null;
        this.lastEnteredHanzi = null;
        this.$("hanzi").putCursorAtEndOnFocus(this.root);

        // Prevent having more than one character in the hanzi entry
        this.$("hanzi").addEventListener("keypress", (event) => {
            const selection = this.root.getSelection();
            const existingText = this.$("hanzi").textContent;
            if (existingText.length === 1 && selection.getRangeAt(0).collapsed)
                event.preventDefault();
        });
        this.$("hanzi").addEventListener("paste", (event) => {
            event.preventDefault();
            const newText = event.clipboardData.getData("text/plain");
            if (newText.length === 0) return;
            const existingText = this.$("hanzi").textContent;
            const selection = this.root.getSelection();
            if (existingText.length === 1 && selection.getRangeAt(0).collapsed)
                event.preventDefault();
            else document.execCommand("insertText", false, newText[0]);
        });

        // Upon finishing entering hanzi, try to load associated information
        this.$("hanzi").addEventListener("focusout", async () => {
            const newHanzi = this.$("hanzi").textContent;
            if (this.originalHanzi !== null || newHanzi.length === 0) return;
            if (this.lastEnteredHanzi === newHanzi) return;
            this.lastEnteredHanzi = newHanzi;

            // If the entered hanzi is already added, load data from vocabulary
            const isAlreadyAdded = await dataManager.hanzi.isAdded(newHanzi);
            if (isAlreadyAdded) {
                await this.load(newHanzi);
                this.originalHanzi = null;  // To stay in "add-mode"
            } else {
                this.$("header").textContent = "Add hanzi";
            }

            // If language data is available, load suggestions as well
            if (dataManager.content.isDictionaryAvailable()) {
                // TODO: fill this in after making language data for Chinese
            }
        });

        // Jump to meanings when pressing enter after typing in a new hanzi
        this.$("hanzi").addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                if (this.originalHanzi === null) {
                    this.createListItem("meaning");
                } else {
                    this.$("hanzi").blur();
                }
                event.preventDefault();
            }
        });

        // SRS level selectors shouldn't be accessible using tab, only shortcuts
        this.$("srs-level-meanings").setAttribute("tabindex", "-1");
        this.$("srs-level-readings").setAttribute("tabindex", "-1");
        this.root.addEventListener("keydown", (event) => {
            if (event.ctrlKey && "1" <= event.key && event.key <= "9") {
                const focussedElement = this.root.activeElement;
                const newLevel = parseInt(event.key);
                if (this.$("meanings").contains(focussedElement)) {
                    this.$("srs-level-meanings").setByIndex(newLevel - 1);
                } else if (this.$("readings").contains(focussedElement)) {
                    this.$("srs-level-readings").setByIndex(newLevel - 1);
                } else {
                    this.$("all-srs-levels").setByIndex(newLevel - 1);
                }
                event.preventDefault();
                event.stopPropagation();
            }
        });

        // Set up SRS level selector that sets levels for all details
        this.$("all-srs-levels").callback = (label, value) => {
            this.$("srs-level-meanings").setByIndex(value - 1);
            this.$("srs-level-readings").setByIndex(value - 1);
        };

        // Create closing and saving callbacks
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("edit-hanzi"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("edit-hanzi"));
        this.$("save-button").addEventListener("click", () => this.save());

        // Configure popup-menu for static elements
        this.$("hanzi").contextMenu(menuItems, () =>
            this.originalHanzi === null ? ["copy-hanzi"] :
                ["copy-hanzi", "remove-hanzi"], { section: this });
        this.$("meanings-wrapper").contextMenu(menuItems,
                ["add-meaning"], { section: this });
        this.$("readings-wrapper").contextMenu(menuItems,
                ["add-reading"], { section: this });
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

    open() {
        if (this.originalHanzi === null) {
            this.$("hanzi").focus();
        }
    }

    async load(hanzi) {
        // Check if the hanzi is already in the vocabulary
        if (hanzi !== undefined && await dataManager.hanzi.isAdded(hanzi)) {
            this.originalHanzi = hanzi;
        } else {
            this.originalHanzi = null;
            this.lastEnteredHanzi = null;
        }

        // If a new hanzi is getting added, just clear all fields
        if (this.originalHanzi === null) {
            this.$("hanzi").textContent = "";
            this.$("meanings").empty();
            this.$("readings").empty();
            this.$("header").textContent = "Add hanzi";
            this.$("all-srs-levels").setByIndex(0);
            this.$("srs-level-meanings").hide();
            this.$("srs-level-readings").hide();
            return;
        }
        this.$("header").textContent = "Edit hanzi";

        // Otherwise, fill in the data associated with this hanzi 
        const info = await dataManager.hanzi.getInfo(hanzi);
        this.$("meanings").empty();
        this.$("readings").empty();
        this.$("hanzi").textContent = hanzi;
        for (const meaning of info.meanings) {
            this.createListItem("meaning", meaning);
        }
        for (const reading of info.readings) {
            this.createListItem("reading", reading);
        }

        // Set level popup stacks
        this.$("all-srs-levels").setByIndex(0);  // Must be set first
        this.$("srs-level-meanings").setByIndex(info.meaningsLevel - 1);
        this.$("srs-level-readings").setByIndex(info.readingsLevel - 1);

        // Hide level popups if there are no values in a field
        this.$("srs-level-meanings").toggleDisplay(info.meanings.length > 0);
        this.$("srs-level-readings").toggleDisplay(info.readings.length > 0);
    }

    createListItem(type, text="") {
        const node = super.createListItem(type, text);

        // If it's a reading, enable pinyin input
        node.addEventListener("focusin", () => {
            if (type === "reading") node.enablePinyinInput();
        });

        // Show srs-level selector if this is the first item of the given type
        if (this.viewNodes[type].children.length === 1) {
            this.$(`srs-level-${type}s`).show();
        }

        // Hide srs-level-selector if there are no items left of the given type
        node.addEventListener("focusout", () => {
            this.$(`srs-level-${type}s`).toggleDisplay(
                this.viewNodes[type].children.length > 0);
        });

        // Attach a context-menu
        if (type === "meaning") {
            node.contextMenu(menuItems, ["delete-meaning", "modify-meaning"],
                             { section: this });
        } else if (type === "reading") {
            node.contextMenu(menuItems, ["delete-reading", "modify-reading"],
                             { section: this });
        }
        if (text.length === 0) {
            node.focus();
        }

        return node;
    }

    async deleteHanzi() {
        const hanzi = this.originalHanzi;
        const confirmed = await dialogWindow.confirm(
            `Are you sure you want to remove the hanzi '${hanzi}'?`);
        if (!confirmed) return false;
        dataManager.hanzi.remove(hanzi);
        events.emit("hanzi-removed", hanzi);
        main.closePanel("edit-hanzi");
        main.updateStatus(`The hanzi ${hanzi} has been removed.`);
        return true;
    }

    async save() {
        // Prevent empty item getting added as meaning/reading
        if (this.root.activeElement !== null)
            this.root.activeElement.blur();

        // Assemble all the necessary data
        const originalHanzi = this.originalHanzi;
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

        // If no hanzi has been entered or no values have been entered at all,
        // display an error message (if adding) or ask whether to remove hanzi
        if ((values.meanings.length === 0 && values.readings.length === 0)
                || hanzi.length === 0) {
            if (originalHanzi === null) {
                if (hanzi.length === 0) {
                    dialogWindow.info("The hanzi to be added is missing.");
                } else {
                    dialogWindow.info("You must enter at least one meaning " +
                                      "or reading to add the hanzi.");
                }
            } else {
                this.deleteHanzi();
            }
            return;
        }

        // If a hanzi is being edited and was renamed, apply this change first
        const isAlreadyAdded = await dataManager.hanzi.isAdded(hanzi);
        const renamed = originalHanzi !== null && originalHanzi !== hanzi;
        if (renamed) {
            if (isAlreadyAdded) {
                const confirmed = await dialogWindow.confirm(
                    `The hanzi ${hanzi} has already been added to the ` +
                    `vocabulary. Do you want to overwrite its values?`);
                if (!confirmed) return;
                await dataManager.hanzi.remove(originalHanzi);
                events.emit("hanzi-removed", originalHanzi);
            } else {
                await dataManager.hanzi.rename(originalHanzi, hanzi);
                events.emit("hanzi-removed", originalHanzi);
                events.emit("hanzi-added", hanzi);
            }
        }

        // Apply other changes to the database and emit corresponding events
        let dataChanged;
        if (isAlreadyAdded || renamed) {
            const result = await dataManager.hanzi.edit(hanzi, values, levels);
            dataChanged = result === "updated";
            if (dataChanged) events.emit("hanzi-changed", hanzi);
        } else {
            await dataManager.hanzi.add(hanzi, values, levels);
            events.emit("hanzi-added", hanzi);
        }

        // Update the status message
        if (isAlreadyAdded || renamed) {
            if (renamed) {
                main.updateStatus(
                    `Hanzi ${originalHanzi} has been renamed to ${hanzi}.`);
            } else if (dataChanged) {
                main.updateStatus(`Hanzi ${hanzi} has been updated.`);
            }
        } else {
            main.updateStatus(`Hanzi ${hanzi} has been added.`);
        }

        main.closePanel("edit-hanzi");
    }
}

customElements.define("edit-hanzi-panel", EditHanziPanel);
module.exports = EditHanziPanel;
