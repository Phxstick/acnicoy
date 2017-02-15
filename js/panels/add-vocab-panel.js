"use strict";

class AddVocabPanel extends Panel {
    constructor () {
        super("add-vocab");
        this.defaultOption = utility.createDefaultOption(
                "Select a vocabulary list (optional)");
        // Attach event handlers
        this.$("close-button").addEventListener(
            "click", () => main.closePanel("add-vocab"));
        this.$("cancel-button").addEventListener(
            "click", () => main.closePanel("add-vocab"));
        this.$("save-button").addEventListener(
            "click", () => this.save());
    }

    registerCentralEventListeners() {
        events.onAll(["language-changed", "current-srs-scheme-edited"], () => {
            // Fill SRS level popup stack
            const numLevels = dataManager.srs.currentScheme.numLevels;
            const intervalTexts = dataManager.srs.currentScheme.intervalTexts;
            this.$("srs-level").empty();
            for (let level = 1; level <= numLevels; ++level) {
                const option = this.$("srs-level").addOption(level);
                option.dataset.tooltip = intervalTexts[level];
            }
        });
        events.on("settings-languages-readings", () => {
            this.$("readings-entry").toggleDisplay(
                dataManager.languageSettings["readings"]);
        });
        events.on("vocab-list-created", (listName) => {
            const option = document.createElement("option");
            option.value = listName;
            option.textContent = listName;
            utility.insertNodeIntoSortedList(this.$("vocab-list"), option);
        });
        events.on("vocab-list-deleted", (listName) => {
            for (const option of this.$("vocab-list").children) {
                if (option.textContent === listName) {
                    option.remove();
                }
            }
        });
    }

    open() {
        this.$("word-entry").focus();
    }

    close() {
        this.$("word-entry").value = "";
        this.$("translations-entry").value = "";
        this.$("readings-entry").value = "";
        this.$("srs-level").setByIndex(0);
        this.defaultOption.setAttribute("selected", "");
        this.$("vocab-list").value = "";
    }

    adjustToLanguage(language, secondary) {
        // Fill vocab list selector
        this.$("vocab-list").empty();
        this.$("vocab-list").appendChild(this.defaultOption);
        const lists = dataManager.vocabLists.getLists();
        lists.sort();
        for (const list of lists) {
            const option = document.createElement("option");
            option.value = list;
            option.textContent = list;
            this.$("vocab-list").appendChild(option);
        }
        // Fill entries with placeholders
        this.$("word-entry").placeholder = `Enter ${language} word here`;
        this.$("translations-entry").placeholder =
            `Enter ${secondary} translations here`;
        // Adjust to Japanese language
        if (language === "Japanese") {
            this.$("word-entry").enableKanaInput("hira");
            this.$("readings-entry").enableKanaInput("hira");
        } else {
            this.$("word-entry").disableKanaInput("hira");
            this.$("readings-entry").disableKanaInput();
        }
    }

    save() {
        const separator = dataManager.settings["add"]["separator"];
        // Read entered values
        const word = this.$("word-entry").value.trim();
        const level = parseInt(this.$("srs-level").value);
        const list = this.$("vocab-list").value;
        let translations = utility.parseEntries(
            this.$("translations-entry").value, separator);
        let readings = utility.parseEntries(
            this.$("readings-entry").value, separator);
        // Update status with error messages if something is missing
        if (word.length === 0) {
            dialogWindow.info("The word to be added is missing.");
            return;
        }
        if (translations.length === 0) {
            main.updateStatus("No translations have been entered.");
            return;
        }
        // Add word and update status message
        dataManager.vocab.add(word, translations, readings, level).then(
            ([ entryNew, numTranslationsAdded, numReadingsAdded ]) => {
                if (list.length > 0) {
                    dataManager.vocabLists.addWordToList(word, list);
                }
                const numFailed = translations.length - numTranslationsAdded;
                const string1 = numTranslationsAdded !== 1 ? "s have" :
                                                             " has";
                const string2 = numFailed > 1 ? " were already registered" :
                    (numFailed === 1 ? " was already registered" : "");
                const failedString = numFailed === 0 ? "" : numFailed;
                const entryString = entryNew ? "The entry and " : "";
                main.updateStatus(`${entryString}${numTranslationsAdded} ` +
                                  `translation${string1} been added. ` +
                                  `${failedString}${string2}`);
                events.emit("word-added", word);
                events.emit("vocab-changed");
            }
        );
        main.closePanel("add-vocab");
    }
}

customElements.define("add-vocab-panel", AddVocabPanel);
module.exports = AddVocabPanel;
