"use strict";

const { ipcRenderer, remote } = require("electron");
const mainBrowserWindow = remote.getCurrentWindow();
const AutoLaunch = require("auto-launch");
const markdown = require("markdown").markdown;

const menuItems = contextMenu.registerItems({
    "copy-kanji": {
        label: "Copy kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            clipboard.writeText(kanji);
        }
    },
    "view-kanji-info": {
        label: "View kanji info",
        click: async ({ currentNode }) => {
            await main.$("kanji-info-panel").load(currentNode.textContent);
            await utility.finishEventQueue();
            main.$("kanji-info-panel").open();
        }
    },
    "add-kanji": {
        label: "Add kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            main.openPanel("add-kanji", { entryName: kanji });
        }
    },
    "edit-kanji": {
        label: "Edit kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            main.panels["edit-kanji"].load(kanji);
            main.openPanel("edit-kanji", { entryName: kanji });
        }
    },
    "delete-notification": {
        label: "Delete notification",
        click: ({ currentNode }) => {
            dataManager.notifications.delete(parseInt(currentNode.dataset.id));
            main.$("notifications").removeChild(currentNode);
        }
    },
    "delete-all-notifications": {
        label: "Delete all notifications",
        click: async ({ currentNode }) => {
            const confirmed = await dialogWindow.confirm(
                "Are you sure you want to delete all notifications?");
            if (confirmed) {
                dataManager.notifications.deleteAll();
                main.$("notifications").empty();
            }
        }
    }
});

class MainWindow extends Window {
    constructor () {
        super("main");
        // Constants
        this.sideBarWidth = "80px";  // Keep consistent with scss
        this.menuBarHeight = "42px";  // Keep consistent with scss
        this.panelSlideDuration = 350;
        this.sectionFadeDuration = 200;
        this.statusUpdateInterval = utility.timeSpanStringToSeconds("3 hours");
        this.dataSavingInterval = utility.timeSpanStringToSeconds("10 minutes");
        this.srsStatusUpdateInterval = utility.timeSpanStringToSeconds("5 min");
        this.statusFadeOutDelay = 1000 * 5;  // 3 seconds
        // Collections
        this.sections = {};
        this.panels = {};
        this.suggestionPanes = {};
        // Variables
        this.fadingOutPreviousSection = false;
        this.nextSection = "";
        this.currentPanel = null;
        this.currentSection = null;
        this.suggestionsShown = false;
        this.srsNotificationCallbackId = null;
        this.regularBackupCallbackId = null;
        this.dataSavingCallbackId = null;
        this.creatingBackup = false;
        this.savingData = false;
        this.introTourParts = null;
        this.currentPartIndex = -1;
        this.introTourContext = null;
        this.introTourPromise = null;
        this.barsHidden = false;
        this.statusFadeOutCallbackId = null;
        // Menu button events
        this.$("home-button").addEventListener("click",
                () => this.openSection("home"));
        this.$("stats-button").addEventListener("click",
                () => this.openSection("stats"));
        this.$("settings-button").addEventListener("click",
                () => this.openSection("settings"));
        this.$("help-button").addEventListener("click",
                () => overlays.open("help"));
        this.$("about-button").addEventListener("click",
                () => overlays.open("about"));
        this.$("exit-button").addEventListener("click",
                () => ipcRenderer.send("quit"));
        // Unhighlight all highlighted notifications after they were viewed
        const onNotificationsWindowClosed = () => {
            let notificationNode = this.$("notifications").firstElementChild;
            while (notificationNode !== null &&
                    notificationNode.classList.contains("highlighted")) {
                notificationNode.classList.remove("highlighted");
                notificationNode = notificationNode.nextElementSibling;
            }
        }
        let notificationsWindowOpen = false;
        this.$("notifications-button").addEventListener("click", (event) => {
            event.currentTarget.classList.remove("highlighted");
            event.currentTarget.classList.toggle("selected");
            dataManager.notifications.unhighlightAll();
            notificationsWindowOpen = !notificationsWindowOpen;
            this.$("notifications").toggleDisplay();
            if (!notificationsWindowOpen) {
                onNotificationsWindowClosed();
            }
            event.stopPropagation();
        });
        utility.makePopupWindow(this.$("notifications"), () => {
            this.$("notifications-button").classList.remove("highlighted");
            this.$("notifications-button").classList.remove("selected");
            dataManager.notifications.unhighlightAll();
            notificationsWindowOpen = false;
            onNotificationsWindowClosed();
        });
        // Sidebar button events
        this.$("add-vocab-button").addEventListener("click",
                () => this.openPanel("edit-vocab", { entryName: null }));
        this.$("add-kanji-button").addEventListener("click",
                () => this.openPanel("add-kanji"));
        this.$("add-hanzi-button").addEventListener("click",
                () => this.openPanel("add-hanzi"));
        this.$("test-button").addEventListener("click",
                () => this.openTestSection());
        this.$("dictionary-button").addEventListener("click",
                () => this.openSection("dictionary"));
        this.$("find-kanji-button").addEventListener("click",
                () => this.openSection("kanji"));
        this.$("vocab-button").addEventListener("click",
                () => this.openSection("vocab"));
        this.$("notes-button").addEventListener("click",
                () => this.openSection("notes"));
        // Language popup events
        this.$("language-popup").callback = (lang) => this.setLanguage(lang);
        this.$("language-popup").onOpen = () => {
            this.$("language-popup").clear();
            for (const language of dataManager.languages.visible) {
                this.$("language-popup").add(language);
                dataManager.srs.getTotalAmountDueFor(language).then((amount)=>{
                    this.$("language-popup").setAmountDue(language, amount);
                });
            }
        }
        // Auto launch functionality
        this.autoLauncher = new AutoLaunch({ name: app.name, isHidden: true });
        // Shortcut callbacks
        this.shortcutMap = {
            "add-word": () => this.openPanel("edit-vocab", { entryName: null }),
            "add-kanji": () => {
                if (dataManager.currentLanguage === "Japanese") {
                    this.openPanel("add-kanji");
                } else if (dataManager.currentLanguage === "Chinese") {
                    this.openPanel("add-hanzi");
                }
            },
            "open-test-section": () => this.openTestSection(),
            "open-dictionary": () => {
                if (dataManager.currentLanguage === "Japanese" &&
                        dataManager.content.isLoaded()) {
                    this.openSection("dictionary");
                    this.sections["dictionary"].$("words-filter").focus();
                }
            },
            "open-kanji-search": () => {
                if (dataManager.currentLanguage === "Japanese" &&
                        dataManager.content.isLoaded()) {
                    this.sections["kanji"].showSearchResults();
                    this.openSection("kanji");
                    this.sections["kanji"].$("search-by-kanji-input").focus();
                }
            },
            "open-kanji-overview": () => {
                if (dataManager.currentLanguage === "Japanese" &&
                        dataManager.content.isLoaded()) {
                    this.sections["kanji"].showOverview();
                    this.openSection("kanji");
                }
            },
            "open-home-section": () => this.openSection("home"),
            "open-stats-section": () => this.openSection("stats"),
            "open-vocab-section": () => this.openSection("vocab"),
            "open-notes-section": () => this.openSection("notes"),
            "open-settings": () => this.openSection("settings"),
            "open-help": () => overlays.open("help"),
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
            "toggle-bars-visibility": () => this.toggleBarVisibility(),
            "refresh": () => events.emit("update-srs-status"),
            "save-input": () => {
                if (this.currentPanel !== null) {
                    this.panels[this.currentPanel].save();
                }
            },
            "save-data": () => this.saveData()
        };
        // Register all shortcut callbacks
        for (const shortcutName in this.shortcutMap) {
            shortcuts.bindCallback(
                shortcutName, this.shortcutMap[shortcutName]);
        }
        // Confirm on closing and save data before exiting the application
        ipcRenderer.on("closing-window", () => {
            this.attemptToQuit().then((confirmed) => {
                if (confirmed) ipcRenderer.send("close-now");
            });
        });
        // Introduction tour button callbacks
        this.$("intro-tour-exit-button").addEventListener("click", () => {
            this.exitIntroTour();
        });
        this.$("intro-tour-back-button").addEventListener("click", () => {
            --this.currentPartIndex;
            this.displayNextPart();
        });
        this.$("intro-tour-next-button").addEventListener("click", () => {
            ++this.currentPartIndex;
            this.displayNextPart();
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
        events.on("content-download-finished", (info) => {
            this.addNotification("content-download-finished", info);
        });
        events.on("settings-test-show-progress", () => {
            this.updateTestButton();
        });
    }

    async open() {
        app.openWindow("loading", "Initializing...");
        // Load info about incomplete downloads
        networkManager.load();  // TODO: Move this
        // Initialize all subcomponents
        const results = [];
        for (const name in this.sections) {
            results.push(this.sections[name].initialize());
        }
        await Promise.all(results);
        // Enable all shortcuts
        for (const shortcutName in this.shortcutMap) {
            shortcuts.enable(shortcutName);
        }
        // Set language and adjust to global settings
        await this.setLanguage(dataManager.settings.languages.default);
        this.sections["settings"].broadcastGlobalSettings();
        events.emit("settings-loaded");  // Allow other widgets to adjust
        // Only display home section
        this.sections["home"].show();
        utility.finishEventQueue().then(() => {
            this.sections["home"].open();
        });
        this.currentSection = "home";
        // Load any character in kanji info panel to render stuff there
        // (Prevents buggy animation when first opening the panel)
        if (dataManager.content.isLoadedFor("Japanese", "English")) {
            this.$("kanji-info-panel").load("字", true);
            this.$("kanji-info-panel").loadHistory();
        }
        // Regularly update SRS info
        events.emit("update-srs-status");
        this.srsStatusCallbackId = window.setInterval(
            () => events.emit("update-srs-status"),
            1000 * this.srsStatusUpdateInterval);
        // Regularly update program and language content status
        utility.setTimer(() => events.emit("update-program-status"),
                         this.statusUpdateInterval,
                         storage.get("cache.programVersionInfo.lastUpdateTime"))
        const languages = dataManager.languages.all;
        for (const lang of languages) {
            const secondary = 
                dataManager.languageSettings.getFor(lang, "secondaryLanguage");
            const lastUpdateTime = storage.get(
                `cache.contentVersionInfo.${lang}.${secondary}.lastUpdateTime`);
            const pair = { language: lang, secondary };
            utility.setTimer(() => events.emit("update-content-status", pair),
                this.statusUpdateInterval, lastUpdateTime);
        }
        // Periodically write user data to disk
        this.dataSavingCallbackId = window.setTimeout(() => this.saveData(),
            1000 * this.dataSavingInterval);
        // Run clean-up-code from now on whenever attempting to close the window
        ipcRenderer.send("activate-controlled-closing");
        // Link achievements module to event emitter and do an initial check
        dataManager.achievements.setEventEmitter(events);
        events.on("achievement-unlocked", (info) => {
            this.updateStatus(`Unlocked achievement '${info.achievementName}'!`)
            this.addNotification("achievement-unlocked", info, true);
        });
        await dataManager.achievements.checkAll();
        // Load notifications
        const notifications = dataManager.notifications.get();
        for (const notification of notifications) {
            this.displayNotification(notification);
        }
        this.$("selective-dimmer").hide();
        this.$("intro-tour-textbox").hide();
        // Display introduction overlay if not displayed yet
        const showIntroOverlay = storage.get("show-introduction-overlay");
        if (showIntroOverlay === undefined || showIntroOverlay) {
            overlays.open("introduction");
        }
        await utility.finishEventQueue();
        app.closeWindow("loading");
    }

    async close() {
        window.clearInterval(this.srsStatusCallbackId);
        for (const shortcutName in this.shortcutMap) {
            shortcuts.disable(shortcutName);
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

    async loadLanguageContent(language, secondary, onStart=false) {
        if (!dataManager.content.isAvailableFor(language, secondary) ||
            !dataManager.content.isCompatibleFor(language, secondary)) return;
        if (!onStart) overlays.open("loading");
        await dataManager.content.load(language);
        const processed = [];
        for (const name in this.sections) {
            processed.push(
                this.sections[name].processLanguageContent(language,secondary));
        }
        await Promise.all(processed);
        if (dataManager.currentLanguage === language) {
            dataManager.content.setLanguage(language);
            this.adjustToLanguageContent(language, secondary);
        }
        events.emit("language-content-loaded", { language, secondary });
        await utility.wait();
        if (!onStart) overlays.closeTopmost();
    }

    async openSection(name, noFading=false) {
        if (this.fadingOutPreviousSection) {
            this.nextSection = name;
            return;
        }
        if (this.currentSection === name)
            return;
        const currentSection = this.currentSection;
        const confirmed =
            await Promise.resolve(this.sections[currentSection].confirmClose());
        if (!confirmed)
            return;
        this.nextSection = name;
        await this.sections[currentSection].close();
        if (dataManager.settings.design.fadeSectionSwitching && !noFading) {
            this.fadingOutPreviousSection = true;
            await Velocity(this.sections[currentSection], "fadeOut",
                { duration: this.sectionFadeDuration });
            // Make sure section is already displayed when "open" called
            this.fadingOutPreviousSection = false;
            const nextSection = this.nextSection;
            this.currentSection = nextSection;
            this.sections[nextSection].style.opacity = "0";
            this.sections[nextSection].show();
            Velocity(this.sections[nextSection], "fadeIn",
                { duration: this.sectionFadeDuration });
        } else {
            this.sections[currentSection].hide();
            this.currentSection = this.nextSection;
            this.sections[this.nextSection].style.opacity = "1";
            this.sections[this.nextSection].show();
        }
        await utility.finishEventQueue();
        this.sections[this.nextSection].open();
    }

    async openPanel(name, { dictionaryId, entryName }={}) {

        // If a different panel is already open, close it first
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
        this.currentPanel = name;
        let showSuggestions = false;

        // Load the given entry
        if (name === "edit-vocab" || name === "edit-kanji" ||
                name === "edit-hanzi") {
            if (entryName === undefined) {
                throw new Error(
                    "A vocab entry to load must be provided for edit panels!");
            }
            await this.panels[name].load(entryName, dictionaryId);
        }

        // Open the panel
        this.panels[name].open();
        if (dataManager.settings.design.animateSlidingPanels) {
            Velocity(this.panels[name], "stop");
            Velocity(this.panels[name],
                    { left: "0px" }, { duration: this.panelSlideDuration });
        } else {
            this.panels[name].style.left = "0";
        }

        // Only load suggestions for kanji if languages are Japanese-English
        if (name === "add-kanji" || name === "edit-kanji") {
            if (dataManager.currentLanguage === "Japanese" &&
                    dataManager.currentSecondaryLanguage === "English" &&
                    dataManager.content.isLoadedFor("Japanese", "English")) {
                if (entryName !== undefined) {
                    showSuggestions = true;
                    this.suggestionPanes[name].load(entryName);
                }
            }
        }

        if (name === "add-vocab" || name === "edit-vocab") {

            // Load suggestions by dictionary ID if one is given
            if (dictionaryId !== undefined) {
                if (entryName === undefined) {
                    throw new Error("If a dictionary ID is provived, " +
                        "the chosen word variant must be provided as well.");
                }
                if (name === "add-vocab") {
                    this.panels["add-vocab"].setDictionaryId(dictionaryId);
                }
                showSuggestions = true;
                this.suggestionPanes[name].load(dictionaryId, entryName);
            }

            // If no dictionary ID is given, look it up or guess an ID
            else if (entryName !== undefined) {
                if (dataManager.currentLanguage === "Japanese" &&
                        dataManager.currentSecondaryLanguage === "English" &&
                        dataManager.content.isLoadedFor("Japanese","English")) {
                    dictionaryId = await
                        dataManager.vocab.getAssociatedDictionaryId(entryName);
                    if (dictionaryId === null) {
                        dictionaryId = await
                            dataManager.content.guessDictionaryId(entryName);
                    }
                    if (dictionaryId !== null) {
                        showSuggestions = true;
                        this.suggestionPanes[name].load(dictionaryId, entryName)
                    }
                }
            }
        }

        // Display loaded suggestion panel (unless panel is already closed)
        if (this.currentPanel === null) return;
        this.$("filter").classList.toggle("dark", showSuggestions);
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
        if (panel.root.activeElement !== null) {
            panel.root.activeElement.blur();
        }
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

    async toggleBarVisibility() {
        // this.$("side-bar").toggleDisplay();
        // this.$("menu-bar").toggleDisplay();
        Velocity(this.$("side-bar"), "stop");
        Velocity(this.$("menu-bar"), "stop");
        let prom;
        if (this.barsHidden) {
            prom = Velocity(this.$("side-bar"), { "width": this.sideBarWidth },
                { complete: () => {
                      this.$("side-bar").style.overflow = "initial"; }})
            Velocity(this.$("menu-bar"), { "height": this.menuBarHeight },
                { complete: () => {
                      this.$("menu-bar").style.overflow = "initial"; }})
        } else {
            this.$("menu-bar").style.overflow = "hidden";
            this.$("side-bar").style.overflow = "hidden";
            prom = Velocity(this.$("side-bar"), { "width": "0px" });
            Velocity(this.$("menu-bar"), { "height": "0px" });
        }
        this.barsHidden = !this.barsHidden;
        await prom;
    }

    updateStatus(text) {
        if (this.statusFadeOutCallbackId !== null) {
            window.clearTimeout(this.statusFadeOutCallbackId);
        }
        if (!this.barsHidden) this.$("status-text").fadeOut();
        this.$("status-text").textContent = text;
        if (!this.barsHidden) this.$("status-text").fadeIn();
        this.statusFadeOutCallbackId = window.setTimeout(() => {
            if (!this.barsHidden) this.$("status-text").fadeOut({
                    distance: 0, easing: "easeInSine", duration: 350 });
        }, this.statusFadeOutDelay);
    }

    async updateTestButton() {
        const amount = await
            dataManager.srs.getTotalAmountDueFor(dataManager.currentLanguage);
        this.$("num-srs-items").innerHTML = `${amount}<br>items`;
        this.$("test-button").classList.toggle("no-items", amount === 0);
        return amount;
    }

    openTestSection() {
        // Update label and open section if there are items to test
        this.updateTestButton().then((count) => {
            if (count > 0) {
                this.openSection("test");
            } else {
                this.updateStatus("There are currently no items " +
                                  "available for testing!");
            }
        });
    }

    showSrsNotification() {
        if (!dataManager.settings.general.showSrsNotifications) return;
        const languages = dataManager.languages.visible;
        const promises = [];
        for (const language of languages) {
            promises.push(dataManager.srs.getTotalAmountDueFor(language));
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
            if (this.currentPanel === "add-kanji" ||
                    this.currentPanel === "edit-kanji") {
                this.closePanel(this.currentPanel);
            }
            if (this.currentSection === "kanji" ||
                    this.currentSection === "dictionary") {
                this.openSection("home");
            }
        }
        if (language === "Chinese") {
            this.$("add-hanzi-button").show();
        } else {
            this.$("add-hanzi-button").hide();
        }
        this.updateTestButton();
        // Choose fitting font
        const cyrillicBased = new Set(["Belarusian", "Bulgarian", "Macedonian",
            "Russian", "Rusyn", "Serbo-Croatian", "Ukrainian", "Bosnian",
            "Montenegrin", "Serbian",
            "Abkhaz", "Bashkir", "Chuvash", "Erzya", "Kazakh", "Kildi Sami",
            "Komi", "Kyrgyz", "Mari", "Moksha", "Mongolian", "Ossetic",
            "Romani", "Sakha", "Yakut", "Tajik", "Tatar", "Tuvan", "Udmurt",
            "Yuit", "Yupik"]);
        if (language === "Chinese") {
            Component.setStyleClass("main-font", "Chinese");
        } else if (language === "Japanese") {
            Component.setStyleClass("main-font", "Japanese");
        } else if (cyrillicBased.has(language)) {
            Component.setStyleClass("main-font", "Cyrillic");
        } else {
            Component.setStyleClass("main-font", "Latin");
        }
    }

    adjustToLanguageContent(language, secondaryLanguage) {
        this.$("find-kanji-button").hide();
        this.$("dictionary-button").hide();
        if (!dataManager.content.isLoadedFor(language, secondaryLanguage))
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
        }
        const testSessionClosed = await this.sections["test"].abortSession();
        if (!testSessionClosed)
            return false;
        await dataManager.setLanguage(language);
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

    // async catchKanjiInfoLinks(element) {
    //     element.addEventListener("click", (event) => {
    //         if (event.target.classList.contains("kanji-info-link")) {
    //             this.$("kanji-info-panel").load(event.target.textContent);
    //             this.$("kanji-info-panel").open();
    //         }
    //     });
    // }

    async makeKanjiInfoLink(element, character) {
        // TODO: Don't check if kanji is in database here (Do elsewhere)
        return dataManager.content.get("Japanese", "English")
        .isKnownKanji(character).then((isKanji) => {
            if (isKanji) {
                element.classList.add("kanji-info-link");
                // Open kanji info panel upon clicking kanji
                element.addEventListener("click", () => {
                    this.$("kanji-info-panel").load(character);
                    this.$("kanji-info-panel").open();
                });
                // Display tooltip with kanji meanings after a short delay
                element.tooltip(async () => {
                    const meanings =
                        await dataManager.content.get("Japanese", "English")
                        .getKanjiMeanings(character);
                    return meanings.join(", ");
                });
                // Attach context menu
                element.contextMenu(menuItems, () => {
                    return dataManager.kanji.isAdded(character)
                    .then((isAdded) => {
                        return ["copy-kanji", "view-kanji-info",
                                isAdded ? "edit-kanji" : "add-kanji"];
                    });
                });
            }
        });
    }

    /**
     * Given a node with no children other than a text-node, turn every
     * kanji in the text into a kanji link (each character in a single span).
     * @param {HTMLElement} element - A node with textContent.
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

    async saveData() {
        if (this.savingData) return;
        window.clearTimeout(this.dataSavingCallbackId);
        this.savingData = true;
        this.sections["notes"].saveData();
        await dataManager.saveAll();
        this.dataSavingCallbackId = window.setTimeout(() => this.saveData(),
            1000 * this.dataSavingInterval);
        this.savingData = false;
    }

    async attemptToQuit() {
        const confirmed =
            await this.sections[this.currentSection].confirmClose();
        if (!confirmed) return false;
        const testSessionClosed = await this.sections["test"].abortSession();
        if (!testSessionClosed) return false;
        await this.saveData();
        await dataManager.database.closeAll();
        await dataManager.history.closeAll();
        networkManager.stopAllDownloads();
        networkManager.save();
        return true;
    }

    // ========================================================================
    //    Application-internal notifications
    // ========================================================================

    addNotification(type, data, global=false) {
        const notification = dataManager.notifications.add(type, data, global);
        this.displayNotification(notification);
    }

    deleteNotification(id) {
        const notifications = this.$("notifications").children;
        for (const notificationNode of notifications) {
            if (parseInt(notificationNode.dataset.id) === id) {
                this.$("notifications").removeChild(notificationNode);
                break;
            }
        }
        dataManager.notifications.delete(id);
    }

    displayNotification(notification) {
        const { id, date, type, data, highlighted } = notification;
        let title;
        let details;
        let subtitle;
        let buttonLabel;
        let buttonCallback;
        const template = templates.get("internal-notification");
        if (type === "program-update-available") {
            title = "New program version available";
            buttonLabel = "Download";
            const { latestVersion, releaseDate, description } = data;
            subtitle = `Version ${latestVersion}, released on ${releaseDate}`;
            details = markdown.toHTML(description);
            buttonCallback = () => events.emit("start-program-update");
        }
        // else if (type === "program-download-finished") {
        //     title = "Program download finished";
        //     buttonLabel = "Install";
        // }
        // else if (type === "program-installation-finished") {
        //     title = "Program installation finished";
        //     buttonLabel = "Reload";
        // }
        else if (type === "content-update-available") {
            title = "New language content available";
            buttonLabel = "Download";
            const { language, secondary } = data;
            // subtitle = `For ${secondary} ➝ ${language}`;
            subtitle = `For ${language} (from ${secondary})`;
            buttonCallback = () => {
                events.emit("start-content-download", { language, secondary });
            };
            events.once("start-content-download", (info) => {
                if (info.language === language && info.secondary == secondary) {
                    this.deleteNotification(id);
                    this.addNotification("content-update-downloading", info);
                }
            });
        }
        else if (type === "content-update-downloading") {
            title = "Downloading content update...";
            buttonLabel = "Open<br>settings";
            const { language, secondary } = data;
            subtitle = `For ${language} (from ${secondary}).<br>
                        See language settings for download progress.`;
            buttonCallback = () => {
                main.sections["settings"].openSubsection("languages");
                main.openSection("settings");
            };
            events.once("content-download-finished", (info) => {
                if (info.language === language && info.secondary == secondary) {
                    this.deleteNotification(id);
                }
            });
        }
        else if (type === "content-download-finished") {
            title = "Content download finished";
            buttonLabel = "Reload<br>content";
            const { language, secondary } = data;
            subtitle = `For ${language} (from ${secondary}).<br>
                        Press button on the right to load the content.`;
            buttonCallback = async () => {
                await this.loadLanguageContent(language, secondary);
                this.deleteNotification(id);
            };
        }
        else if (type === "achievement-unlocked") {
            const { achievement, achievementName, language } = data;
            title = `Achievement unlocked: ${achievementName}`;
            buttonLabel = "";
            subtitle = language !== undefined ? `[${language}] ` : "";
            subtitle +=
                dataManager.achievements.getDescription(achievement, language);
        }
        else {
            throw new Error(`Notification type '${type}' does not exist.`);
        }
        // Create document fragment with given data
        const html = template({ title, subtitle, details, buttonLabel });
        const fragment = utility.fragmentFromString(html);
        const buttonNode = fragment.querySelector(".action");
        const detailsNode = fragment.querySelector(".details");
        const notificationNode = fragment.querySelector(".notification");
        notificationNode.dataset.id = id;
        notificationNode.dataset.type = type;
        const infoNode = fragment.querySelector(".info-frame");
        // Add callbacks
        if (buttonLabel) {
            buttonNode.addEventListener("click", buttonCallback);
        }
        detailsNode.hide();
        let detailsOpen = false;
        infoNode.addEventListener("click", () => {
            if (!details) return;
            if (!detailsOpen) {
                Velocity(detailsNode, "slideDown", { duration: "fast" });
            } else {
                Velocity(detailsNode, "slideUp", { duration: "fast" });
            }
            detailsOpen = !detailsOpen;
        });
        notificationNode.contextMenu(menuItems, ["delete-notification"]);
        this.$("notifications").contextMenu(menuItems, () => {
            return this.$("notifications").children.length > 0 ?
                ["delete-all-notifications"] : [];
        });
        // Highlight notification button and notification itself
        if (highlighted) {
            this.$("notifications-button").classList.add("highlighted");
            notificationNode.classList.add("highlighted");
        }
        // Overwrite existing notification if it must be unique
        if (type === "program-update-available" ||
                type === "content-update-available") {
            for (const notification of this.$("notifications").children) {
                if (notification.type === type) {
                    dataManager.notifications.delete(notification.id);
                    this.$("notifications").removeChild(notification);
                    break;
                }
            }
        }
        this.$("notifications").prependChild(fragment);
    }

    // ========================================================================
    //    Introduction tours
    // ========================================================================

    exitIntroTour() {
        this.$("selective-dimmer").hide();
        this.$("intro-tour-textbox").hide();
    }

    startIntroTour(name) {
        this.introTourParts =
            utility.parseHtmlFile(paths.introTour(name)).children;
        this.currentPartIndex = 0;
        this.displayNextPart();
    }
    
    async displayNextPart() {
        if (this.currentPartIndex === this.introTourParts.length) {
            this.exitIntroTour();
            return;
        }
        if (this.currentPartIndex === this.introTourParts.length - 1) {
            this.$("intro-tour-exit-button").hide();
            this.$("intro-tour-next-button").textContent = "Finish tour";
        } else {
            this.$("intro-tour-exit-button").show();
            this.$("intro-tour-next-button").textContent = "Next";
        }
        if (this.currentPartIndex === 0) {
            this.$("intro-tour-back-button").hide();
        } else {
            this.$("intro-tour-back-button").show();
        }
        const currentPart = this.introTourParts[this.currentPartIndex];
        const content = document.importNode(currentPart.content, true);
        this.$("intro-tour-textbox-content").innerHTML = "";
        this.$("intro-tour-textbox-content").appendChild(content);
        if (this.introTourPromise) await this.introTourPromise;
        this.showTextbox(this.introTourContext.$(currentPart.dataset.target));
        this.$("intro-tour-next-button").focus();
    }

    showTextbox(targetElement) {
        const selectiveDimmer = this.$("selective-dimmer");
        const textbox = this.$("intro-tour-textbox");
        const totalHeight = window.innerHeight;
        const totalWidth = window.innerWidth;
        const dimCtx = selectiveDimmer.getContext("2d");
        selectiveDimmer.width = totalWidth;
        selectiveDimmer.height = totalHeight;
        // Determine size of the textbox
        const textboxWidth = 300;
        textbox.style.width = `${textboxWidth}px`;
        textbox.style.visibility = "hidden";
        textbox.show();
        const textboxHeight = textbox.clientHeight;
        // Clear and dim whole window
        dimCtx.clearRect(0, 0, totalWidth, totalHeight);
        dimCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
        dimCtx.fillRect(0, 0, totalWidth, totalHeight);
        // If no target element is given, just center the textbox
        if (!targetElement) {
            textbox.style.top = `${(totalHeight - textboxHeight) / 2}px`;
            textbox.style.left = `${(totalWidth - textboxWidth) / 2}px`;
            textbox.style.bottom = "";
            textbox.style.right = "";
            selectiveDimmer.show()
            textbox.style.visibility = "visible";
            return;
        }
        const rect = targetElement.getBoundingClientRect();
        // Draw rectangle for shadow around element
        dimCtx.shadowColor = "white";
        dimCtx.shadowBlur = "15";
        dimCtx.fillStyle = "white";
        dimCtx.fillRect(rect.left, rect.top, rect.width, rect.height);
        // Clear rectangle above element such that only shadow remains
        dimCtx.clearRect(rect.left, rect.top, rect.width, rect.height);
        // ================================================================
        // Position textbox according to element position/size
        // ================================================================
        let textboxPos = {};
        // Calculate space to each side of the element
        const space = { left: rect.left, top: rect.top,
            right: totalWidth - rect.left - rect.width,
            bottom: totalHeight - rect.top - rect.height }
        const mostSpace =
            Math.max(space.left, space.right, space.bottom, space.top);
        // Set the main anchor of the textbox (= where more space is left)
        const textboxElemOffset = 25;
        if (mostSpace === space.right) {
            textboxPos.left = rect.left + rect.width + textboxElemOffset;
        } else if (mostSpace === space.bottom) {
            textboxPos.top = rect.top + rect.height + textboxElemOffset;
        } else if (mostSpace === space.left) {
            textboxPos.right = totalWidth - rect.left + textboxElemOffset;
        } else if (mostSpace === space.top) {
            textboxPos.bottom = totalHeight - rect.top + textboxElemOffset;
        }
        // Set the secondary anchor of the textbox
        if (mostSpace === space.left || mostSpace === space.right) {
            // Center textbox if it is smaller than the element
            if (textboxHeight < rect.height) {
                textboxPos.top = rect.top + (rect.height - textboxHeight) / 2;
            // Otherwise slightly offset textbox to the top
            } else {
                textboxPos.top = Math.max(6,
                    rect.top - Math.min(20, (textboxHeight - rect.height) / 2));
            }
        } else if (mostSpace === space.top || mostSpace === space.bottom) {
            // Center textbox if it is smaller than the element
            if (textboxWidth < rect.width) {
                textboxPos.left = rect.left + (rect.width - textboxWidth) / 2;
            // Otherwise slightly offset textbox to the left
            } else {
                textboxPos.left = Math.max(6,
                    rect.left - Math.min(20, (textboxWidth - rect.width) / 2));
            }
        }
        // If textbox leaves window, reposition it (and leave small gap to edge)
        const windowEdgePadding = 10;
        if (textboxPos.top + textboxHeight > totalHeight - windowEdgePadding) {
            delete textboxPos.top;
            textboxPos.bottom = windowEdgePadding;
        }
        if (textboxPos.left + textboxWidth > totalWidth - windowEdgePadding) {
            delete textboxPos.left;
            textboxPos.right = windowEdgePadding;
        }
        // Draw arrow pointing to the element in focus
        const arrowToElementGap = 3;
        const arrowTipPos = {};
        const arrowBasePos = {};
        if (mostSpace === space.right) {
            arrowTipPos.y = arrowBasePos.y = rect.top + rect.height / 2;
            arrowTipPos.x = rect.left + rect.width + arrowToElementGap;
            arrowBasePos.x = rect.left + rect.width + textboxElemOffset;
        } else if (mostSpace === space.bottom) {
            arrowTipPos.x = arrowBasePos.x = rect.left + rect.width / 2;
            arrowTipPos.y = rect.top + rect.height + arrowToElementGap;
            arrowBasePos.y = rect.top + rect.height + textboxElemOffset;
        } else if (mostSpace === space.left) {
            arrowTipPos.y = arrowBasePos.y = rect.top + rect.height / 2;
            arrowTipPos.x = rect.left - arrowToElementGap;
            arrowBasePos.x = rect.left - textboxElemOffset;
        } else if (mostSpace === space.top) {
            arrowTipPos.x = arrowBasePos.x = rect.left + rect.width / 2;
            arrowTipPos.y = rect.top - arrowToElementGap;
            arrowBasePos.y = rect.top - textboxElemOffset;
        }
        dimCtx.shadowColor = "black";
        dimCtx.shadowBlur = "5";
        dimCtx.fillStyle = "#f5f5f5";
        utility.drawArrowOnCanvas(dimCtx, {
            start: arrowBasePos, end: arrowTipPos,
            headWidth: 30, headLength: 12, baseWidth: 12
        });
        // Move textbox to calculated position
        textbox.style.top = "top" in textboxPos ?
            `${textboxPos.top}px` : "";
        textbox.style.bottom = "bottom" in textboxPos ?
            `${textboxPos.bottom}px` : "";
        textbox.style.left = "left" in textboxPos ?
            `${textboxPos.left}px` : "";
        textbox.style.right = "right" in textboxPos ?
            `${textboxPos.right}px` : "";
        // Finally after everything is positioned, show the textbox/dimmer
        selectiveDimmer.show()
        textbox.style.visibility = "visible";
    }

}

customElements.define("main-window", MainWindow);
module.exports = MainWindow;
