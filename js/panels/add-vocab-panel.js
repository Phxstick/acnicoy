"use strict";

class AddVocabPanel extends Panel {
    constructor () {
        super("add-vocab");
        this.dictionaryId = null;
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
            this.$("srs-level").setByIndex(0);
        });
        events.on("settings-languages-readings", () => {
            this.$("readings-entry").toggleDisplay(
                dataManager.languageSettings.get("readings"));
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
        events.on("settings-design-animate-popup-stacks", () => {
            const animate = dataManager.settings.design.animatePopupStacks;
            this.$("srs-level").animate = animate;
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
        this.dictionaryId = null;
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
        // Enable special input methods if necessary
        this.$("word-entry").toggleKanaInput(language === "Japanese");
        this.$("readings-entry").toggleKanaInput(language === "Japanese");
        this.$("readings-entry").togglePinyinInput(language === "Chinese");
        this.$("readings-entry").classList.toggle(
            "pinyin", language === "Chinese");
    }

    setDictionaryId(dictionaryId) {
        this.dictionaryId = dictionaryId;
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
        // Display error messages if something is missing
        if (word.length === 0) {
            dialogWindow.info("The word to be added is missing.");
            return;
        }
        if (translations.length === 0) {
            dialogWindow.info("No translations have been entered.");
            return;
        }
        // Add word and update status message
        dataManager.vocab.add(
            word, translations, readings, level, this.dictionaryId)
        .then(([ entryNew, numTranslationsAdded, numReadingsAdded ]) => {
            if (list.length > 0) {
                if (dataManager.vocabLists.addWordToList(word, list)) {
                    events.emit("added-to-list", word, list);
                };
            }
            const numFailed = translations.length - numTranslationsAdded;
            const string1 = numTranslationsAdded !== 1 ? "s have" : " has";
            const string2 = numFailed > 1 ? " were already registered" :
                (numFailed === 1 ? " was already registered" : "");
            const failedString = numFailed === 0 ? "" : numFailed;
            const entryString = entryNew ? "The entry and " : "";
            main.updateStatus(`${entryString}${numTranslationsAdded} ` +
                              `translation${string1} been added. ` +
                              `${failedString}${string2}`);
            if (entryNew) {
                events.emit("word-added", word, this.dictionaryId);
            }
            events.emit("vocab-changed", word, this.dictionaryId);
        });
        main.closePanel("add-vocab");
    }
}

customElements.define("add-vocab-panel", AddVocabPanel);
module.exports = AddVocabPanel;
