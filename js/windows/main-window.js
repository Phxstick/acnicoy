"use strict";

const { ipcRenderer, remote } = require("electron");
const mainBrowserWindow = remote.getCurrentWindow();
const AutoLaunch = require("auto-launch");

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
            main.$("kanji-info-panel").load(currentNode.textContent);
            main.$("kanji-info-panel").open();
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
        this.fadingOutPreviousSection = false;
        this.nextSection = "";
        this.currentPanel = null;
        this.currentSection = null;
        this.suggestionsShown = false;
        this.srsNotificationCallbackId = null;
        this.regularBackupCallbackId = null;
        this.creatingBackup = false;
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
        // Auto launch functionality
        this.autoLauncher = new AutoLaunch({ name: app.name, isHidden: true });
        // Shortcut callbacks
        this.shortcutMap = {
            "add-word": () => this.openPanel("add-vocab"),
            "add-kanji": () => this.openPanel("add-kanji"),
            "open-test-section": () => this.openTestSection(),
            "open-dictionary": () => {
                this.openSection("dictionary");
                this.sections["dictionary"].$("words-filter").focus();
            },
            "open-kanji-search": () => {
                this.sections["kanji"].showSearchResults();
                this.openSection("kanji");
                this.sections["kanji"].$("search-entry").focus();
            },
            "open-kanji-overview": () => {
                this.sections["kanji"].showOverview();
                this.openSection("kanji");
            },
            "open-home-section": () => this.openSection("home"),
            "open-stats-section": () => this.openSection("stats"),
            "open-vocab-section": () => this.openSection("vocab"),
            "open-settings": () => this.openSection("settings"),
            // TODO Change this as soon as help section is done
            "open-help": () => this.updateStatus("Not yet implemented."),
            "quit": () => ipcRenderer.send("quit"),
            "force-quit": () => ipcRenderer.send("close-now"),
            "close-sliding-panels": () => {
                // Close whatever is currently on top
                if (overlays.isAnyOpen()) {
                    overlays.closeTopmost();
                } else if (this.currentPanel !== null) {
                    this.closePanel(this.currentPanel);
                } else if (this.$("kanji-info-panel").isOpen) {
                    this.$("kanji-info-panel").close();
                }
            },
            "toggle-fullscreen": () =>
                mainBrowserWindow.setFullScreen(
                    !mainBrowserWindow.isFullScreen()),
            "refresh": () => events.emit("update-srs-status")
        };
        this.shortcutsForLanguage = {
            "Japanese":
                ["add-kanji", "open-kanji-search", "open-kanji-overview",
                 "open-dictionary"]
        };
        // Confirm on closing and save data before exiting the application
        ipcRenderer.on("closing-window", () => {
            this.attemptToQuit().then((confirmed) => {
                if (confirmed) ipcRenderer.send("close-now");
            });
        });
    }

    registerCentralEventListeners() {
        // Update amount of SRS items displayed on test button regularly
        events.on("update-srs-status", () => this.updateTestButton());
        // Regulary notify user if SRS items are ready to be reviewed
        events.onAll(["settings-general-show-srs-notifications",
                      "settings-general-srs-notifications-interval"], () => {
            if (this.srsNotificationCallbackId !== null) {
                window.clearInterval(this.srsNotificationCallbackId);
                this.srsNotificationCallbackId = null;
            }
            if (dataManager.settings.general.showSrsNotifications) {
                this.srsNotificationCallbackId =
                    window.setInterval(() => this.showSrsNotification(), 1000 *
                    parseInt(
                        dataManager.settings.general.srsNotificationsInterval));
            }
        });
        events.onAll(["settings-general-do-regular-backup",
                      "settings-general-regular-backup-interval"], () => {
            if (this.regularBackupCallbackId !== null) {
                window.clearTimeout(this.regularBackupCallbackId);
                this.regularBackupCallbackId = null;
            }
            if (dataManager.settings.general.doRegularBackup) {
                let lastBackupDate = dataManager.getLastBackupTime();
                let currentDate = utility.getTime();
                const interval =
                    parseInt(dataManager.settings.general.regularBackupInterval)
                // If a backup is due, immediately create it.
                // Schedule following backups (check each day whether a backup
                // is necessary by repeatedly setting timeouts).
                const createBackupIfDue = () => {
                    currentDate = utility.getTime();
                    if (currentDate >= lastBackupDate + interval &&
                            !this.creatingBackup) {
                        this.creatingBackup = true;
                        lastBackupDate = currentDate;
                        dataManager.createBackup({ event: "regular-backup" })
                        .then(() => {
                            this.creatingBackup = false;
                        });
                    }
                    if (this.regularBackupCallbackId !== null) {
                        window.clearTimeout(this.regularBackupCallbackId);
                    }
                    this.regularBackupCallbackId = window.setTimeout(() => {
                        createBackupIfDue();
                    }, 1000 * 60 * 60 * 24);  // 1 day
                };
                createBackupIfDue();
            }
        });
        events.on("settings-general-auto-launch-on-startup", () => {
            this.autoLauncher.isEnabled().then((isEnabled) => {
                if (dataManager.settings.general.autoLaunchOnStartup) {
                    if (!isEnabled) this.autoLauncher.enable();
                } else {
                    this.autoLauncher.disable();
                }
            });
        });
    }

    async open() {
        app.openWindow("loading", "Initializing...");
        // Load info about incomplete downloads
        // TODO: Move this
        networkManager.load();
        // Initialize all subcomponents
        const results = [];
        for (const name in this.sections) {
            results.push(this.sections[name].initialize());
        }
        await Promise.all(results);
        // Set language and adjust to global settings
        await this.setLanguage(dataManager.settings.languages.default);
        this.sections["settings"].broadcastGlobalSettings();
        // Only display home section
        this.sections["home"].show();
        utility.finishEventQueue().then(() => {
            this.sections["home"].open();
        });
        this.currentSection = "home";
        // Load any character in kanji info panel to render stuff there
        // (Prevents buggy animation when first opening the panel)
        if (dataManager.content.isAvailable("Japanese", "English")) {
            this.$("kanji-info-panel").load("字");
        }
        // Regularly update displayed SRS info
        this.srsStatusCallbackId = window.setInterval(
            () => events.emit("update-srs-status"), 1000 * 60 * 5);  // 5 min
        // Regularly update content status
        window.setInterval(() => events.emit("update-content-status"),
            1000 * 60 * 60 * 3);  // 3 hours
        ipcRenderer.send("activate-controlled-closing");
        await utility.finishEventQueue();
        app.closeWindow("loading");
    }

    async close() {
        window.clearInterval(this.srsStatusCallbackId);
        for (const shortcutName in this.shortcutMap) {
            shortcuts.unregister(shortcutName);
        }
        ipcRenderer.send("deactivate-controlled-closing");
    }

    createSections () {
        const promises = [];
        for (const name of components.sections) {
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
        for (const name of components.panels) {
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
        for (const name of components.suggestionPanes) {
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

    processLanguageContent(language, secondaryLanguage) {
        const results = [];
        if (dataManager.content.isAvailable(language, secondaryLanguage)) {
            for (const name in this.sections) {
                results.push(
                    this.sections[name].processLanguageContent(
                        language, secondaryLanguage));
            }
        }
        return Promise.all(results);
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
                Velocity(this.$("filter"), "stop");
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
            Velocity(this.panels[name], "stop");
            Velocity(this.panels[name],
                    { left: "0px" }, { duration: this.panelSlideDuration });
        } else {
            this.panels[name].style.left = "0";
        }
        if (showSuggestions) {
            this.suggestionsShown = true;
            if (dataManager.settings.design.animateSlidingPanels) {
                Velocity(this.suggestionPanes[name], "stop");
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
            Velocity(panel, "stop");
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
                Velocity(this.$("filter"), "stop");
                Velocity(this.$("filter"), "fadeOut",
                    { duration: this.panelSlideDuration });
            } else {
                this.$("filter").hide();
            }
        }
        if (this.suggestionsShown) {
            this.suggestionsShown = false;
            if (dataManager.settings.design.animateSlidingPanels) {
                Velocity(this.suggestionPanes[name], "stop");
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
    }

    updateTestButton() {
        return dataManager.srs.getTotalAmountDue().then((amount) => {
            this.$("num-srs-items").textContent = amount;
            return amount;
        });
    }

    showSrsNotification() {
        if (!dataManager.settings.general.showSrsNotifications) return;
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
        } else {
            this.$("add-kanji-button").hide();
            this.$("kanji-info-panel").close();
            this.closePanel("add-kanji");
            this.closePanel("edit-kanji");
            if (this.currentSection === "kanji" ||
                    this.currentSection === "dictionary") {
                this.openSection("home");
            }
        }
        // Register shortcuts for this language
        for (const shortcutName in this.shortcutMap) {
            shortcuts.register(shortcutName, this.shortcutMap[shortcutName]);
        }
        for (const l in this.shortcutsForLanguage) {
            if (language !== l) {
                for (const shortcutName of this.shortcutsForLanguage[l]) {
                    shortcuts.unregister(shortcutName);
                }
            }
        }
        this.updateTestButton();
        // Choose fitting font
        const chineseBased = new Set(["Chinese", "Japanese", "Korean"]);
        const cyrillicBased = new Set(["Belarusian", "Bulgarian", "Macedonian",
            "Russian", "Rusyn", "Serbo-Croatian", "Ukrainian", "Bosnian",
            "Montenegrin", "Serbian",
            "Abkhaz", "Bashkir", "Chuvash", "Erzya", "Kazakh", "Kildi Sami",
            "Komi", "Kyrgyz", "Mari", "Moksha", "Mongolian", "Ossetic",
            "Romani", "Sakha", "Yakut", "Tajik", "Tatar", "Tuvan", "Udmurt",
            "Yuit", "Yupik"]);
        if (chineseBased.has(language)) {
            Component.setStyleClass("main-font", "Chinese");
        } else if (cyrillicBased.has(language)) {
            Component.setStyleClass("main-font", "Cyrillic");
        } else {
            Component.setStyleClass("main-font", "Latin");
        }
    }

    adjustToLanguageContent(language, secondaryLanguage) {
        this.$("find-kanji-button").hide();
        this.$("dictionary-button").hide();
        if (!dataManager.content.isAvailable(language, secondaryLanguage))
            return;
        if (language === "Japanese") {
            this.$("find-kanji-button").show();
            this.$("dictionary-button").show();
        }
        for (const name in this.sections) {
            this.sections[name].adjustToLanguageContent(
                language, secondaryLanguage);
        }
    }

    async setLanguage(language) {
        if (dataManager.currentLanguage === language)
            return false;
        if (this.currentSection !== null) {
            if (!await this.sections[this.currentSection].confirmClose())
                return false;
            this.sections[this.currentSection].close();
        }
        const testSessionClosed = await this.sections["test"].abortSession();
        if (!testSessionClosed)
            return false;
        dataManager.setLanguage(language);
        this.adjustToLanguage(dataManager.currentLanguage,
                              dataManager.currentSecondaryLanguage);
        this.adjustToLanguageContent(dataManager.currentLanguage,
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
        await Promise.all(promises);
        if (this.currentSection !== null) {
            await this.sections[this.currentSection].open();
        }
        // Adjust to language specific settings
        this.sections["settings"].broadcastLanguageSettings(language);
        events.emit("language-changed", language);
        return true;
    }

    makeKanjiInfoLink(element, character) {
        // TODO: Don't check if kanji is in database here (Do elsewhere)
        return dataManager.content.get("Japanese", "English")
        .isKnownKanji(character).then((isKanji) => {
            if (isKanji) {
                element.classList.add("kanji-info-link");
                element.addEventListener("click", () => {
                    this.$("kanji-info-panel").load(character);
                    this.$("kanji-info-panel").open();
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

    async attemptToQuit() {
        const confirmed =
            await this.sections[this.currentSection].confirmClose();
        if (!confirmed) return false;
        const testSessionClosed = await this.sections["test"].abortSession();
        if (!testSessionClosed) return false;
        this.sections[this.currentSection].close();
        await dataManager.save(); 
        networkManager.stopAllDownloads();
        networkManager.save();
        return true;
    }
}

customElements.define("main-window", MainWindow);
module.exports = MainWindow;
