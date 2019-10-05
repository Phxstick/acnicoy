"use strict";

class ImportVocabOverlay extends Overlay {
    constructor() {
        super("import-vocab");
        this.$("language-data-warning").hide();
        this.$("houhou-note").hide();
        this.$("vocab-list").style.visibility = "hidden";

        // Links to help section
        this.$("import-help-link").addEventListener("click", () => {
            overlays.open("help", ["Components", "Vocabulary",
                                   "Importing items"]);
        });
        this.$("houhou-help-link").addEventListener("click", () => {
            overlays.open("help", ["Languages", "Japanese",
                                   "Importing data", "Houhou SRS"]);
        });

        // Callbacks for closing/aborting
        this.$("close-button").addEventListener("click", () => {
            this.resolve(null);
        });
        this.$("cancel-button").addEventListener("click", () => {
            this.resolve(null);
        });

        // Callbacks for choosing parse options
        this.parseSettings = {
            dataType: "vocab",
            fieldSeparator: "\t",
            itemSeparator: ";",
            levelsStartAtZero: false
        };
        utility.bindRadiobuttonGroup(this.$("data-type"), "vocab", (value) => {
            this.parseSettings.dataType = value;
            this.$("general-parse-options").toggleDisplay(value !== "Houhou");
            this.$("import-order").toggleDisplay(value !== "Houhou");
            this.$("houhou-note").toggleDisplay(value === "Houhou");
            this.$("language-data-warning").toggleDisplay(value === "Houhou" &&
                (!dataManager.content.isAvailableFor("Japanese", "English") ||
                 !dataManager.content.isCompatibleFor("Japanese", "English")));
            this.$("add-to-list-option").toggleDisplay(
                value !== "kanji" && value !== "hanzi");
        });
        utility.bindRadiobuttonGroup(this.$("field-separator"), "\t",
            (value) => { this.parseSettings.fieldSeparator = value });
        utility.bindRadiobuttonGroup(this.$("item-separator"), ";",
            (value) => { this.parseSettings.itemSeparator = value });
        this.$("count-levels-from-zero").addEventListener("click",
            (e) => { this.parseSettings.levelsStartAtZero = e.target.checked });

        // Callbacks for choosing import options
        this.importSettings = { order: "first-is-newest" };
        utility.bindRadiobuttonGroup(this.$("import-order"), "first-is-newest",
            (value) => { this.importSettings.order = value });
        this.$("add-to-list").callback = (checked) => {
            this.$("vocab-list").style.visibility = checked ? "visible":"hidden"
            if (checked) this.$("vocab-list").focus();
        };

        // Completion tooltip for choosing a vocabulary list
        this.vocabListCompletionTooltip =
            document.createElement("completion-tooltip");
        this.vocabListCompletionTooltip.attachTo(this.$("vocab-list"));
        this.vocabListCompletionTooltip.setAttribute("direction", "up");
        this.vocabListCompletionTooltip.setSelectionCallback(
            () => this.$("vocab-list").blur());
        this.vocabListCompletionTooltip.setData((query) =>
            dataManager.vocabLists.searchForList(query));

        // Callbacks for buttons
        this.$("choose-file-button").addEventListener("click", async () => {
            const filePath = await dialogWindow.chooseImportFile();
            if (filePath) this.parseInputFile(filePath);
        });
        this.$("import-items-button").addEventListener("click", async () => {
            this.importItems(this.vocabItems);
        });
    }

    async parseInputFile(filePath) {
        let parseSettings = { ...this.parseSettings };

        // Choose fixed settings for data from Houhou SRS
        if (parseSettings.dataType === "Houhou") {
            parseSettings.fieldSeparator = ";";
            parseSettings.itemSeparator = ",";
            parseSettings.levelsStartAtZero = true;
        }

        // Load language data if necessary
        if ((parseSettings.dataType === "Houhou"
                || parseSettings.dataType === "kanji")
                && dataManager.content.isAvailableFor("Japanese", "English")
                && dataManager.content.isCompatibleFor("Japanese", "English")
                && !dataManager.content.isLoadedFor("Japanese", "English")) {
            await main.loadLanguageContent("Japanese", "English");
        }

        // Display spinner instead of button and parse the file
        this.$("choose-file-button").hide();
        this.$("spinner").show("flex");
        const result = await utility.addMinDelay(
            dataManager.import.parseCsvFile(filePath, parseSettings), 700);
        this.$("spinner").hide();

        // Check if the file could be parsed (or at least a part of it)
        this.$("only-errors-message").hide();
        this.$("parse-error-message").hide();
        if (!result) {
            this.$("parse-error-message").show();
            this.$("choose-file-button").show();
            return;
        }
        const { items, warnings } = result;
        if (items.length === 0 && warnings.length > 0) {
            this.$("only-errors-message").show();
            this.$("choose-file-button").show();
            return;
        }

        // Display parse results, as well as options and button for importing
        this.$("parse-options").hide();
        this.$("import-options").show();
        this.$("num-errors-message").toggleDisplay(warnings.length > 0);
        this.$("num-items-message").toggleDisplay(items.length > 0);
        this.$("num-items-parsed").textContent = items.length;
        this.$("num-errors").textContent = warnings.length;
        this.$("import-items-button").show();
        this.vocabItems = items;
    }

    async importItems(items) {
        let importSettings = { ...this.importSettings };
        importSettings.addToList = this.$("add-to-list").checked ?
            this.$("vocab-list").value.trim() : null;
        if (importSettings.addToList === "") {
            dialogWindow.info("The vocabulary list name must not be empty.");
            return;
        }

        // Choose predefined item order for data from Houhou SRS
        if (this.parseSettings.dataType === "Houhou") {
            importSettings.order = "first-is-newest";
        }

        // Import items while displaying loading screen, then do postprocessing
        overlays.open("loading", "Importing items");
        await utility.addMinDelay(
            dataManager.import.importItems(items, importSettings), 700);
        await main.saveData();
        if (dataManager.content.isLoadedFor("Japanese", "English")) {
            await dataManager.content.get("Japanese","English").updateUserData()
        }
        events.emit("update-srs-status-cache");
        events.emit("vocab-imported");
        if (this.parseSettings.dataType === "Houhou" ||
                this.parseSettings.dataType === "kanji") {
            events.emit("kanji-imported", items.filter(i => i.type === "kanji"))
        }
        await utility.finishEventQueue();
        await utility.wait(500);
        this.resolve(null);
        overlays.closeTopmost();
    }

    open(listName) {
        this.$("parse-options").show();
        this.$("import-options").hide();
        this.$("choose-file-button").show();
        this.$("import-items-button").hide();
        this.$("parse-error-message").hide();
        this.$("only-errors-message").hide();
        this.$("spinner").hide();
        this.$("vocab-list").value = listName !== undefined ? listName : "";

        // Language-specific options
        const language = dataManager.currentLanguage;
        if (language === "Japanese" || language === "Chinese") {
            this.$$("[data-value='kanji']")[0].parentNode.toggleDisplay(
                language === "Japanese");
            this.$$("[data-value='Houhou']")[0].parentNode.toggleDisplay(
                language === "Japanese");
            this.$$("[data-value='hanzi']")[0].parentNode.toggleDisplay(
                language === "Chinese");
            this.$$("[data-value='vocab']")[0].click();
            this.$("data-type").show();
        } else {
            this.$("data-type").hide();
        }
    }
}

customElements.define("import-vocab-overlay", ImportVocabOverlay);
module.exports = ImportVocabOverlay;
