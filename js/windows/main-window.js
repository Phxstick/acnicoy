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
        this.panelSlideDuration = 350;
        this.sectionFadeDuration = 250;
        this.sections = {};
        this.panels = {};
        this.suggestionPanes = {};
        this.kanjiInfoPanel = this.$("kanji-info-panel");
        // Top menu button events
        this.$("exit-button").addEventListener("click",
                () => ipcRenderer.send("quit"));
        this.$("home-button").addEventListener("click",
                () => this.openSection("home"));
        this.$("stats-button").addEventListener("click",
                () => this.openSection("stats"));
        this.$("vocab-button").addEventListener("click",
                () => this.openSection("vocab"));
        this.$("settings-button").addEventListener("click",
                () => this.openSection("settings"));
        // Sidebar button events
        this.$("add-vocab-button").addEventListener("click",
                () => this.openPanel("add-vocab"));
        this.$("add-kanji-button").addEventListener("click",
                () => this.openPanel("add-kanji"));
        this.$("test-button").addEventListener("click",
                () => this.openTestSection());
        this.$("dictionary-button").addEventListener("click",
                () => this.openSection("dictionary"));
        this.$("find-kanji-button").addEventListener("click",
                () => this.openSection("kanji"));
        // Language popup events
        this.$("language-popup").callback = (lang) => this.setLanguage(lang);
        this.$("language-popup").onOpen = (languages) => {
            for (const language of languages) {
                dataManager.srs.getTotalAmountDueForLanguage(language)
                .then((amount) => {
                    this.$("language-popup").setAmountDue(language, amount);
                });
            }
        }
        // Update amount of SRS items displayed on test button regularly
        events.on("update-srs-status", () => this.updateTestButton());
    }

    createSections () {
        const promises = [];
        for (const name of globals.sections) {
            const section = document.createElement(name + "-section");
            section.classList.add("section");
            section.hide();
            this.$("section-frame").appendChild(section);
            this.sections[name] = section;
            promises.push(customElements.whenDefined(name + "-section"));
        }
        this.currentSection = null;
        return promises;
    }

    createPanels () {
        const promises = [];
        for (const name of globals.panels) {
            const panel = document.createElement(name + "-panel");
            panel.classList.add("sliding-pane");
            this.$("section-frame").appendChild(panel);
            this.panels[name] = panel;
            promises.push(customElements.whenDefined(name + "-panel"));
        }
        this.currentPanel = null;
        return promises;
    }

    createSuggestionPanes () {
        const promises = [];
        for (const name of globals.suggestionPanes) {
            const suggestionPane = 
                document.createElement(name + "-suggestion-pane");
            suggestionPane.classList.add("suggestion-pane");
            suggestionPane.hide();
            this.$("section-frame").appendChild(suggestionPane);
            this.suggestionPanes[name] = suggestionPane;
            promises.push(customElements.whenDefined(
                name + "-suggestion-pane"));
        }
        return promises;
    }

    processLanguageContent(languages) {
        const results = [];
        for (const language of languages) {
            if (dataManager.content.isAvailable[language]) {
                for (const name in this.sections) {
                    results.push(
                        this.sections[name].processLanguageContent(language));
                }
            }
        }
        return Promise.all(results);
    }

    initialize(languages, defaultLanguage) {
        // Fill language popup
        for (const language of languages) {
            this.$("language-popup").add(language);
        }
        // Set language to default one
        this.setLanguage(defaultLanguage).then(() => {
            // Only display home section
            this.sections["home"].show();
            this.sections["home"].open();
            this.currentSection = "home";
            // Regularly update displayed SRS info
            setInterval(() => events.emit("update-srs-status"),
                1000 * 60 * 5);  // Every 5 minutes
            // Regulary notify user if SRS items are ready to be reviewed
            setInterval(() => {
                this.showSrsNotification();
            }, 1000 * 60 * 15);  // Every 15 min
            // Confirm close command and save data before exiting application
            ipcRenderer.send("activate-controlled-closing");
            ipcRenderer.on("closing-window", () => {
                Promise.resolve(
                    this.sections[this.currentSection].confirmClose())
                .then((confirmed) => {
                    if (!confirmed) return;
                    this.sections[this.currentSection].close();
                    dataManager.save();
                    // networkManager.stopAllDownloads();
                    ipcRenderer.send("close-now");
                });
            });
            // Register shortcuts
            shortcuts.register("force-quit",
                    () => ipcRenderer.send("close-now"));
            shortcuts.register("quit", () => ipcRenderer.send("quit"));
            shortcuts.register("add-vocab", () => this.openPanel("add-vocab"));
            shortcuts.register("add-kanji", () => this.openPanel("add-kanji"));
            shortcuts.register("dictionary",
                    () => this.openSection("dictionary"));
            shortcuts.register("test", () => this.openTestSection());
        });
    }

    openSection(name) {
        if (this.currentSection === name) return;
        const currentSection = this.currentSection;
        this.currentSection = name;
        return Promise.resolve(
                this.sections[currentSection].confirmClose())
        .then((confirmed) => {
            if (!confirmed) return;
            this.sections[currentSection].close();
            Velocity(this.sections[currentSection], "fadeOut",
                { duration: this.sectionFadeDuration })
            .then(() => {
                this.sections[name].open();
                Velocity(this.sections[name], "fadeIn",
                    { duration: this.sectionFadeDuration });
            });
        });
    }

    openPanel(name, { showSuggestions=false }={}) {
        const currentPanel = this.currentPanel;
        if (currentPanel !== null) {
            this.closePanel(currentPanel, currentPanel === name);
            if (currentPanel === name) return;
        } else {
            Velocity(this.$("filter"), "fadeIn",
                { duration: this.panelSlideDuration });
        }
        this.panels[name].style.zIndex = layers["panel"];
        this.$("filter").classList.toggle("dark", showSuggestions);
        this.currentPanel = name;
        this.panels[name].open();
        Velocity(this.panels[name],
                { left: "0px" }, { duration: this.panelSlideDuration });
        if (showSuggestions) {
            Velocity(this.suggestionPanes[name], "fadeIn",
                { duration: this.panelSlideDuration });
        }
    }

    closePanel(name, noOtherPanelOpening=true) {
        const panel = this.panels[name];
        Velocity(panel, { left: "-400px" },
            { duration: this.panelSlideDuration}).then(() => panel.close());
        panel.style.zIndex = layers["closing-panel"];
        if (noOtherPanelOpening) {
            this.currentPanel = null;
            Velocity(this.$("filter"), "fadeOut",
                { duration: this.panelSlideDuration });
        }
        Velocity(this.suggestionPanes[name], "fadeOut",
            { duration: this.panelSlideDuration });
    }

    updateStatus(text) {
        this.$("status-text").fadeOut();
        this.$("status-text").textContent = text;
        this.$("status-text").fadeIn();
    }

    openTestSection() {
        // Update label and open section if there are items to test
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
            this.$("num-srs-items").textContent = amount;
            return amount;
        });
    }

    showSrsNotification() {
        const languages = dataManager.languages.find();
        const promises = [];
        for (const language of languages) {
            promises.push(
                dataManager.srs.getTotalAmountDueForLanguage(language));
        }
        let text = "";
        Promise.all(promises).then((amounts) => {
            for (let i = 0; i < languages.length; ++i) {
                const language = languages[i];
                const amount = amounts[i];
                if (amount === 0) continue;
                if (i > 0) text += "\n";
                text += `${language} (${amount} items)`;
            }
            if (text.length === 0) return;
            const notification = new Notification("SRS reviews available", {
                title: "SRS reviews available",
                body: text,
                icon: paths.img.programIcon
            });
        });
    }

    adjustToLanguage(language, secondary) {
        if (language === "Japanese") {
            this.$("add-kanji-button").show();
            if (dataManager.content.isAvailable["Japanese"]) {
                this.$("find-kanji-button").show();
                this.$("dictionary-button").show();
            }
        } else {
            this.$("add-kanji-button").hide();
            this.$("dictionary-button").hide();
            this.$("find-kanji-button").hide();
            this.kanjiInfoPanel.close();
            if (this.currentSection === "kanji" ||
                    this.currentSection === "dictionary") {
                this.openSection("home");
            }
        }
        this.updateTestButton();
    }

    setLanguage(language) {
        if (this.language !== undefined && this.language === language) return;
        return Promise.resolve(this.currentSection === null ? 
                true : this.sections[this.currentSection].confirmClose())
        .then((confirmed) => {
            if (!confirmed) return;
            if (this.currentSection !== null) {
                this.sections[this.currentSection].close();
            }
            dataManager.setLanguage(language);
            this.language = language;
            this.language2 = dataManager.languageSettings.secondaryLanguage;
            this.adjustToLanguage(this.language, this.language2);
            for (const key in this.sections) {
                this.sections[key].adjustToLanguage(
                        this.language, this.language2);
            }
            for (const key in this.panels) {
                this.panels[key].adjustToLanguage(
                        this.language, this.language2);
            }
            if (this.currentSection !== null)
                this.sections[this.currentSection].open();
            this.$("language-popup").set(language);
            events.emit("language-changed", language);
        });
    }

    makeKanjiInfoLink(element, character) {
        // TODO: Don't check if kanji is in database here (Do elsewhere)
        return dataManager.content.isKnownKanji(character).then((isKanji) => {
            if (isKanji) {
                element.classList.add("kanji-info-link");
                element.addEventListener("click", () => {
                    this.kanjiInfoPanel.load(character);
                    this.kanjiInfoPanel.open();
                });
            }
            element.popupMenu(menuItems, () => {
                return dataManager.kanji.isAdded(character)
                .then((isAdded) => {
                    return ["copy-kanji", "view-kanji-info",
                            isAdded ? "edit-kanji" : "add-kanji"];
                });
            });
        });
    }
}

customElements.define("main-window", MainWindow);
module.exports = MainWindow;
