"use strict";

class AddVocabPanel extends Panel {
    constructor () {
        super("add-vocab");
        // Store important DOM elements as properties
        this.wordEntry = this.root.querySelector("textarea[name='word']");
        this.translationsEntry = this.root.querySelector(
            "textarea[name='translations']");
        this.readingsEntry = this.root.querySelector(
            "textarea[name='readings']");
        this.levelPopup = this.root.querySelector("#srs-level");
        this.vocabListSelect = this.root.querySelector(
            "select[name='vocab-list']");
        this.vocabListSelect.classList.add("empty");
        this.vocabListSelect.addEventListener("change", () => {
            if (this.vocabListSelect.value.length === 0)
                this.vocabListSelect.classList.add("empty");
            else
                this.vocabListSelect.classList.remove("empty");
        });
        // Attach event handlers
        this.readingsEntry.enableKanaInput("hira");
        this.root.getElementById("close-button").addEventListener(
            "click", () => main.closePanel("add-vocab"));
        this.root.getElementById("cancel-button").addEventListener(
            "click", () => main.closePanel("add-vocab"));
        this.root.getElementById("save-button").addEventListener(
            "click", () => this.save());
    }

    open() {
        this.wordEntry.focus();
    }

    close() {
        this.wordEntry.value = "";
        this.translationsEntry.value = "";
        this.readingsEntry.value = "";
        this.levelPopup.set(0);
        this.defaultOption.setAttribute("selected", "");
        this.vocabListSelect.value = "";
    }

    load(id, word) {
        this.wordEntry.value = word;
        // TODO: Load necessary word info into fields here
    }

    adjustToLanguage(language, secondary) {
        // Fill SRS level popup stack
        this.levelPopup.clear();
        const numLevels =
            dataManager.languageSettings["SRS"]["spacing"].length;
        for (let i = 1; i < numLevels; ++i) this.levelPopup.appendItem(i);
        this.levelPopup.set(0);
        // Fill vocab list selector
        while (this.vocabListSelect.lastChild !== null)
            this.vocabListSelect.removeChild(this.vocabListSelect.lastChild);
        this.defaultOption = document.createElement("option");
        this.defaultOption.value = "";
        this.defaultOption.textContent =
            "Select a vocabulary list (optional)";
        this.defaultOption.setAttribute("selected", "");
        this.vocabListSelect.appendChild(this.defaultOption);
        const lists = dataManager.vocabLists.getLists();
        lists.sort();
        for (let list of lists) {
            const option = document.createElement("option");
            option.value = list;
            option.textContent = list;
            this.vocabListSelect.appendChild(option);
        }
        // Fill entries with placeholders
        this.wordEntry.placeholder = `Enter ${language} word here`;
        this.translationsEntry.placeholder =
            `Enter ${secondary} translations here`;
        // Pack or unpack textarea for readings
        this.readingsEntry.style.display =
            dataManager.languageSettings["readings"] ? "block" : "none";
    }

    save() {
        const separator = dataManager.settings["add"]["separator"];
        // Read entered values
        const word = this.wordEntry.value.trim();
        const level = this.levelPopup.get();
        const list = this.vocabListSelect.value;
        let translations = utility.parseEntries(
            this.translationsEntry.value, separator);
        let readings = utility.parseEntries(
            this.readingsEntry.value, separator);
        // Update status with error messages if something is missing
        if (word.length === 0) {
            main.updateStatus("The word to be added is missing.");
            // TODO: Shortly highlight word entry
            return;
        }
        if (translations.length === 0) {
            main.updateStatus("No translations have been entered.");
            // TODO: Shortly highlight translations entry
            return;
        }
        dataManager.vocab.add(word, translations, readings, level).then(
           (args) => {
               if (list.length > 0) {
                   dataManager.vocabLists.addWordToList(word, list);
               }
               const entryNew = args[0];
               const numTranslationsAdded = args[1];
               const numReadingsAdded = args[2];
               const numFailed = translations.length - numTranslationsAdded;
               const string1 = numTranslationsAdded !== 1 ? "s have" :
                                                            " has";
               const string2 = numFailed > 1 ? " were already registered" :
                   (numFailed === 1 ? " was already registered" : "");
               const failedString = numFailed === 0 ? "" : numFailed;
               const entryString = entryNew ? "The entry and " : "";
               // TODO: Include info about readings.
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
