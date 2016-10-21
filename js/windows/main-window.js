"use strict";

const { ipcRenderer } = require("electron");

const menuItems = popupMenu.registerItems({
    "copy-kanji": {
        label: "Copy kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            clipboard.writeText(kanji);
        }
    },
    "view-kanji-info": {
        label: "View kanji info",
        click: ({ currentNode }) => {
            main.kanjiInfoPanel.load(currentNode.textContent);
            main.kanjiInfoPanel.open();
        }
    },
    "add-kanji": {
        label: "Add kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            main.panels["add-kanji"].load(kanji);
            main.openPanel("add-kanji");
        }
    },
    "edit-kanji": {
        label: "Edit kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            main.panels["edit-kanji"].load(kanji);
            main.openPanel("edit-kanji");
        }
    }
});

class MainWindow extends Window {
    constructor () {
        super("main");
        // Store important DOM elements as members
        this.sectionWindow = this.root.getElementById("section-window");
        this.statusText = this.root.getElementById("status-text");
        this.filter = this.root.getElementById("filter");
        this.numSrsItemsLabel = this.root.getElementById("num-srs-items");
        this.statusBar = this.root.getElementById("status-text");
        this.languagePopup = this.root.getElementById("language-popup");
        this.dictionaryButton = this.root.getElementById("dictionary-button");
        this.findKanjiButton = this.root.getElementById("find-kanji-button");
        this.addKanjiButton = this.root.getElementById("add-kanji-button");
        this.kanjiInfoPanel = this.root.getElementById("kanji-info-panel");
        // Top menu button events
        this.root.getElementById("exit-button").addEventListener("click",
                () => ipcRenderer.send("quit"));
        this.root.getElementById("home-button").addEventListener("click",
                () => this.openSection("home"));
        this.root.getElementById("stats-button").addEventListener("click",
                () => this.openSection("stats"));
        this.root.getElementById("vocab-button").addEventListener("click",
                () => this.openSection("vocab"));
        this.root.getElementById("history-button").addEventListener("click",
                () => this.openSection("history"));
        this.root.getElementById("settings-button").addEventListener("click",
                () => this.openSection("settings"));
        // Sidebar button events
        this.root.getElementById("add-vocab-button").addEventListener("click",
                () => this.openPanel("add-vocab"));
        this.root.getElementById("add-kanji-button").addEventListener("click",
                () => this.openPanel("add-kanji"));
        this.root.getElementById("test-button").addEventListener("click",
                () => this.openTestSection());
        this.root.getElementById("dictionary-button").addEventListener("click",
                () => this.openSection("dictionary"));
        this.root.getElementById("find-kanji-button").addEventListener("click",
                () => this.openSection("kanji"));
        // Language popup events
        this.languagePopup.callback = (language) => this.setLanguage(language);
        this.languagePopup.onOpen = (languages) => {
            for (let language of languages) {
                dataManager.srs.getTotalAmountDueForLanguage(language)
                .then((amount) => {
                    this.languagePopup.setAmountDue(language, amount);
                });
            }
        }
    }

    createSections () {
        const promises = [];
        this.sections = {};
        for (let name of globals.sections) {
            const section = document.createElement(name + "-section");
            section.classList.add("section");
            section.hide();
            this.sectionWindow.appendChild(section);
            this.sections[name] = section;
            promises.push(customElements.whenDefined(name + "-section"));
        }
        this.currentSection = null;
        return promises;
    }

    createPanels () {
        const promises = [];
        this.panels = {};
        for (let name of globals.panels) {
            const panel = document.createElement(name + "-panel");
            panel.classList.add("panel");
            this.sectionWindow.appendChild(panel);
            this.panels[name] = panel;
            promises.push(customElements.whenDefined(name + "-panel"));
        }
        this.currentPanel = null;
        return promises;
    }

    processLanguageContent(languages) {
        const results = [];
        for (let language of languages) {
            if (dataManager.content.isAvailable[language]) {
                for (let name in this.sections) {
                    results.push(
                        this.sections[name].processLanguageContent(language));
                }
            }
        }
        return Promise.all(results);
    }

    initialize(languages, defaultLanguage) {
        // Fill language popup
        for (let language of languages) {
            this.languagePopup.add(language);
        }
        // Set language to default one
        this.setLanguage(defaultLanguage);
        // Only display home section
        this.sections["home"].show();
        this.sections["home"].open();
        this.currentSection = "home";
        // Update test button with amount of words to be tested
        this.updateTestButton();
        setInterval(() => {
            this.updateTestButton();
        }, 300000);  // Every 5 min
        // Confirm close command and save data before exiting the application
        ipcRenderer.send("activate-controlled-closing");
        ipcRenderer.on("closing-window", () => {
            if (this.sections[this.currentSection].confirmClose()) {
                this.sections[this.currentSection].close();
                dataManager.save();
                // networkManager.stopAllDownloads();
                ipcRenderer.send("close-now");
            }
        });
        // Register shortcuts
        shortcuts.register("force-quit", () => ipcRenderer.send("close-now"));
        shortcuts.register("quit", () => ipcRenderer.send("quit"));
        shortcuts.register("add-vocab", () => this.openPanel("add-vocab"));
        shortcuts.register("add-kanji", () => this.openPanel("add-kanji"));
        shortcuts.register("dictionary", () => this.openSection("dictionary"));
        shortcuts.register("test", () => this.openTestSection());
    }

    openSection(name) {
        if (this.currentSection == name) return;
        if (!this.sections[this.currentSection].confirmClose()) return;
        this.sections[this.currentSection].close();
        Velocity(this.sections[this.currentSection], "fadeOut").then(() => {
            this.sections[name].open();
            Velocity(this.sections[name], "fadeIn");
        });
        this.currentSection = name;
    }

    openPanel(name) {
        const currentPanel = this.currentPanel;
        if (currentPanel !== null) {
            this.closePanel(currentPanel, currentPanel === name);
            if (currentPanel === name) return;
        } else {
            Velocity(this.filter, "fadeIn");
        }
        this.panels[name].style.zIndex = layers["panel"];
        this.currentPanel = name;
        this.panels[name].open();
        Velocity(this.panels[name], { left: "0px" });
    }

    closePanel(name, noOtherPanelOpening=true) {
        const panel = this.panels[name];
        Velocity(panel, { left: "-400px" }).then(() => panel.close());
        panel.style.zIndex = layers["closing-panel"];
        if (noOtherPanelOpening) {
            this.currentPanel = null;
            Velocity(this.filter, "fadeOut");
        }
    }

    updateStatus(text) {
        this.statusText.fadeOut(300);
        this.statusText.textContent = text;
        this.statusText.fadeIn(300);
    }

    openTestSection() {
        // Update label and open section if there are items to test
        // [ Somehow move this test to test section lateron? ]
        this.updateTestButton().then((count) => {
            if (count > 0) {
                this.openSection("test");
            } else {
                this.updateStatus("There are currently no items " +
                                  "scheduled for testing!");
            }
        });
    };

    updateTestButton() {
        return dataManager.srs.getTotalAmountDue().then((amount) => {
            this.numSrsItemsLabel.textContent = `${amount} items`;
            return amount;
        });
    }

    adjustToLanguage(language, secondary) {
        if (language === "Japanese") {
            this.addKanjiButton.show();
            if (dataManager.content.isAvailable["Japanese"]) {
                this.findKanjiButton.show();
            } else {
                this.findKanjiButton.hide();
            }
        } else {
            this.addKanjiButton.hide();
            this.findKanjiButton.hide();
            if (this.currentSection === "kanji") {
                this.openSection("home");
            }
        }
        if (language === "Japanese" &&
                dataManager.content.isAvailable[language]) {
            this.dictionaryButton.show();
        } else {
            this.dictionaryButton.hide();
            if (this.currentSection === "dictionary") {
                this.openSection("home");
            }
        }
        this.updateTestButton();
    }

    setLanguage(language) {
        if (this.language !== undefined && this.language === language) return;
        if (this.currentSection !== null) {
            if (!this.sections[this.currentSection].confirmClose()) return;
            this.sections[this.currentSection].close();
        }
        dataManager.setLanguage(language);
        this.language = language;
        this.language2 = dataManager.languageSettings.secondaryLanguage;
        this.adjustToLanguage(this.language, this.language2);
        for (let key in this.sections) {
            this.sections[key].adjustToLanguage(this.language, this.language2);
        }
        for (let key in this.panels) {
            this.panels[key].adjustToLanguage(this.language, this.language2);
        }
        if (this.currentSection !== null)
            this.sections[this.currentSection].open();
        this.languagePopup.set(language);
    }

    makeKanjiInfoLink(element, character) {
        dataManager.content.isKnownKanji(character).then((isKanji) => {
            if (isKanji) {
                element.classList.add("kanji-info-link");
                element.addEventListener("click", () => {
                    this.kanjiInfoPanel.load(character);
                    this.kanjiInfoPanel.open();
                });
            }
            element.popupMenu(menuItems, () => {
                return dataManager.kanji.isAdded(character)
                .then((isAdded) => 
                    ["copy-kanji", "view-kanji-info",
                     isAdded? "edit-kanji" : "add-kanji"]);
            });
        });
    }
}

customElements.define("main-window", MainWindow);
module.exports = MainWindow;
