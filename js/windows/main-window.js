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
        this.sectionFadeDuration = 200;
        this.sections = {};
        this.panels = {};
        this.suggestionPanes = {};
        this.kanjiInfoPanel = this.$("kanji-info-panel");
        this.fadingOutPreviousSection = false;
        this.nextSection = "";
        this.currentPanel = null;
        this.currentSection = null;
        this.suggestionsShown = false;
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
        this.$("language-popup").onOpen = () => {
            this.$("language-popup").clear();
            for (const language of dataManager.languages.visible) {
                this.$("language-popup").add(language);
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

    initialize() {
        // Adjust to global settings
        this.sections["settings"].broadcastGlobalSettings();
        // Only display home section
        this.sections["home"].show();
        utility.finishEventQueue().then(() => {
            this.sections["home"].open();
        });
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
    }

    openSection(name) {
        if (this.fadingOutPreviousSection) {
            this.nextSection = name;
            return;
        }
        if (this.currentSection === name) return;
        const currentSection = this.currentSection;
        return Promise.resolve(
                this.sections[currentSection].confirmClose())
        .then((confirmed) => {
            if (!confirmed) return;
            this.nextSection = name;
            this.sections[currentSection].close();
            if (dataManager.settings.design.fadeSectionSwitching) {
                this.fadingOutPreviousSection = true;
                return Velocity(this.sections[currentSection], "fadeOut", {
                    duration: this.sectionFadeDuration
                }).then(() => {
                    // Make sure section is already displayed when "open" called
                    this.fadingOutPreviousSection = false;
                    const nextSection = this.nextSection;
                    this.currentSection = nextSection;
                    this.sections[nextSection].style.opacity = "0";
                    this.sections[nextSection].show();
                    Velocity(this.sections[nextSection], "fadeIn",
                        { duration: this.sectionFadeDuration });
                    return utility.finishEventQueue().then(() => {
                        this.sections[nextSection].open();
                    });
                });
            } else {
                this.sections[currentSection].hide();
                this.currentSection = this.nextSection;
                this.sections[this.nextSection].style.opacity = "1";
                this.sections[this.nextSection].show();
                return utility.finishEventQueue().then(() => {
                    this.sections[this.nextSection].open();
                });
            }
        });
    }

    openPanel(name, { showSuggestions=false }={}) {
        const currentPanel = this.currentPanel;
        if (currentPanel !== null) {
            this.closePanel(currentPanel, currentPanel === name);
            if (currentPanel === name) return;
        } else {
            if (dataManager.settings.design.animateSlidingPanels) {
                Velocity(this.$("filter"), "fadeIn",
                    { duration: this.panelSlideDuration });
            } else {
                this.$("filter").style.opacity = "1";
                this.$("filter").show();
            }
        }
        this.panels[name].style.zIndex = layers["panel"];
        this.$("filter").classList.toggle("dark", showSuggestions);
        this.currentPanel = name;
        this.panels[name].open();
        if (dataManager.settings.design.animateSlidingPanels) {
            Velocity(this.panels[name],
                    { left: "0px" }, { duration: this.panelSlideDuration });
        } else {
            this.panels[name].style.left = "0";
        }
        if (showSuggestions) {
            this.suggestionsShown = true;
            if (dataManager.settings.design.animateSlidingPanels) {
                Velocity(this.suggestionPanes[name], "fadeIn",
                    { duration: this.panelSlideDuration });
            } else {
                this.suggestionPanes[name].style.opacity = "1";
                this.suggestionPanes[name].show();
            }
        }
    }

    closePanel(name, noOtherPanelOpening=true) {
        const panel = this.panels[name];
        if (dataManager.settings.design.animateSlidingPanels) {
            Velocity(panel, { left: "-400px" },
                { duration: this.panelSlideDuration}).then(() => panel.close());
        } else {
            panel.style.left = "-400px";
            panel.close();
        }
        panel.style.zIndex = layers["closing-panel"];
        if (noOtherPanelOpening) {
            this.currentPanel = null;
            if (dataManager.settings.design.animateSlidingPanels) {
                Velocity(this.$("filter"), "fadeOut",
                    { duration: this.panelSlideDuration });
            } else {
                this.$("filter").hide();
            }
        }
        if (this.suggestionsShown) {
            this.suggestionsShown = false;
            if (dataManager.settings.design.animateSlidingPanels) {
                Velocity(this.suggestionPanes[name], "fadeOut",
                    { duration: this.panelSlideDuration });
            } else {
                this.suggestionPanes[name].hide();
            }
        }
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
        const languages = dataManager.languages.visible;
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
            const contentAvailable = dataManager.content.isAvailable["Japanese"]
            this.$("find-kanji-button").toggleDisplay(contentAvailable);
            this.$("dictionary-button").toggleDisplay(contentAvailable);
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
        if (dataManager.currentLanguage === language)
            return Promise.resolve(false);
        return Promise.resolve(this.currentSection === null ? 
                true : this.sections[this.currentSection].confirmClose())
        .then((confirmed) => {
            if (!confirmed) return false;
            if (this.currentSection !== null) {
                this.sections[this.currentSection].close();
            }
            dataManager.setLanguage(language);
            this.adjustToLanguage(dataManager.currentLanguage,
                                  dataManager.currentSecondaryLanguage);
            const promises = [];
            for (const key in this.sections) {
                promises.push(Promise.resolve(
                    this.sections[key].adjustToLanguage(
                        dataManager.currentLanguage,
                        dataManager.currentSecondaryLanguage)));
            }
            for (const key in this.panels) {
                promises.push(Promise.resolve(
                    this.panels[key].adjustToLanguage(
                        dataManager.currentLanguage,
                        dataManager.currentSecondaryLanguage)));
            }
            this.$("language-popup").set(language);
            return Promise.all(promises).then(() => {
                if (this.currentSection !== null) {
                    return this.sections[this.currentSection].open();
                }
            }).then(() => {
                // Adjust to language specific settings
                this.sections["settings"].broadcastLanguageSettings(language);
                events.emit("language-changed", language);
                return true;
            });
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

    /**
     * Given a node with no children other than a text-node, turn every
     * kanji in the text into a kanji link (each character in a single span).
     * @param {HTMLElement} element - A node with textcontent.
     * @returns {Promise}
     */
    convertTextToKanjiInfoLinks(element) {
        const promises = [];
        const spans = [];
        for (const character of element.textContent) {
            const span = document.createElement("span");
            span.textContent = character;
            const promise = this.makeKanjiInfoLink(span, character);
            spans.push(span);
            promises.push(promise);
        }
        return Promise.all(promises).then(() => {
            element.textContent = "";
            for (const span of spans) {
                element.appendChild(span);
            }
        });
    }
}

customElements.define("main-window", MainWindow);
module.exports = MainWindow;
