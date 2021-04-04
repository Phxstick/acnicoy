"use strict";

const { ipcRenderer, remote } = require("electron");
const mainBrowserWindow = remote.getCurrentWindow();
// const AutoLaunch = require("auto-launch");
const marked = require("marked");
const dateFormat = require("dateformat");
const colorSchemes = require(paths.generalColorSchemes);

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
            main.openPanel("edit-kanji", { entryName: kanji });
        }
    },
    "edit-kanji": {
        label: "Edit kanji",
        click: ({ currentNode }) => {
            const kanji = currentNode.textContent;
            main.openPanel("edit-kanji", { entryName: kanji });
        }
    },
    "delete-notification": {
        label: "Delete notification",
        click: ({ currentNode }) => {
            dataManager.notifications.delete(currentNode.dataset.id);
            main.$("notifications").removeChild(currentNode);
            // A text node might remain which disables the CSS selector ":empty"
            if (main.$("notifications").children.length === 0) {
                main.$("notifications").innerHTML = "";
            }
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
        this.$("panel-shortcuts-info").hide();

        // Constants
        this.sideBarWidth = "80px";  // Keep consistent with scss
        this.menuBarHeight = "42px";  // Keep consistent with scss
        this.panelSlideDuration = 300;
        this.kanjiInfoPanelSlideDuration = 200;
        this.showSuggestionsDuration = 180;
        this.sectionFadeDuration = 140;
        this.statusUpdateInterval = utility.timeSpanStringToSeconds("23 hours");
        this.dataSavingInterval = utility.timeSpanStringToSeconds("10 minutes");
        this.srsStatusUpdateInterval = utility.timeSpanStringToSeconds("5 min");
        this.statusFadeOutDelay = 1000 * 5;  // 3 seconds

        // Cached amounts of SRS items, updated regularly and on user action
        this.srsItemAmounts = {};
        this.srsItemAmountsDueTotal = {};

        // Main window components
        this.sections = {};
        this.panels = {};
        this.suggestionPanes = {};

        // State of main window components
        this.nextSection = null;
        this.currentPanel = null;
        this.currentSection = null;
        this.currentSuggestionPane = null;
        this.lastFocussedSectionElement = null;
        this.barsHidden = false;

        // Flags to keep track of whether an action is currently running
        this.fadingOutPreviousSection = false;
        this.creatingBackup = false;
        this.savingData = false;

        // IDs returned by method `window.setTimeout` (used to cancel a timer)
        this.statusFadeOutCallbackId = null;
        this.srsNotificationCallbackId = null;
        this.regularBackupCallbackId = null;
        this.dataSavingCallbackId = null;
        this.programUpdateCallbackId = null;
        this.languageDataUpdateCallbackId = null;

        // State variables for introduction tours
        this.introTourParts = null;
        this.currentPartIndex = -1;
        this.introTourContext = null;
        this.introTourPromise = null;

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
                () => this.openPanel("edit-vocab"));
        this.$("add-kanji-button").addEventListener("click",
                () => this.openPanel("edit-kanji"));
        this.$("add-hanzi-button").addEventListener("click",
                () => this.openPanel("edit-hanzi"));
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
                const isSelected = dataManager.currentLanguage === language;
                const amountDue = this.srsItemAmountsDueTotal[language];
                this.$("language-popup").add(language, isSelected);
                this.$("language-popup").setAmountDue(language, amountDue);
            }
        }

        // Switching language using Ctrl+Tab
        let switchingLanguage = false;
        window.addEventListener("keydown", (event) => {
            if (!switchingLanguage && event.key === "Tab" && event.ctrlKey) {
                switchingLanguage = true;
                this.$("language-popup").open();
            }
            if (switchingLanguage && event.key === "Tab") {
                event.preventDefault();
                if (event.shiftKey) {
                    this.$("language-popup").selectPreviousItem();
                } else {
                    this.$("language-popup").selectNextItem();
                }
            }
        });
        window.addEventListener("keyup", (event) => {
            if (switchingLanguage && !event.ctrlKey) {
                switchingLanguage = false;
                this.$("language-popup").invokeSelectedItem();
                this.$("language-popup").close();
            }
        });
        // Auto launch functionality
        // this.autoLauncher = new AutoLaunch({ name: app.name, isHidden: true });
        // Shortcut callbacks
        this.shortcutMap = {
            "add-word": () => this.openPanel("edit-vocab"),
            "add-kanji": () => {
                if (dataManager.currentLanguage === "Japanese") {
                    this.openPanel("edit-kanji");
                } else if (dataManager.currentLanguage === "Chinese") {
                    this.openPanel("edit-hanzi");
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
            "close-topmost": () => {
                // Close whatever is currently on top
                if (overlays.isAnyOpen()) {
                    overlays.closeTopmost();
                } else if (this.currentPanel !== null) {
                    this.closePanel(this.currentPanel);
                } else if (this.$("kanji-info-panel").isOpen) {
                    this.$("kanji-info-panel").close();
                } else if (this.sections["test"].testInfo !== null) {
                    this.sections["test"].closeSession();
                }
            },
            "toggle-fullscreen": () =>
                mainBrowserWindow.setFullScreen(
                    !mainBrowserWindow.isFullScreen()),
            "toggle-bars-visibility": () => this.toggleBarVisibility(),
            "refresh": () => events.emit("update-srs-status-cache"),
            "save-input": () => {
                if (this.currentPanel !== null) {
                    this.panels[this.currentPanel].save();
                    this.closePanel(this.currentPanel);
                }
            },
            "save-data": () => this.saveData(),
            "open-dev-tools": () => {
                // Open dev tools and stretch window to accomodate them
                const browserWindow = remote.getCurrentWindow();
                const webContents = remote.getCurrentWebContents();
                if (webContents.isDevToolsOpened()) {
                    webContents.closeDevTools();
                    const [width, height] = browserWindow.getContentSize();
                    browserWindow.setContentSize(
                        Math.max(600, width - 241), height);
                } else {
                    webContents.openDevTools();
                    browserWindow.setSize(
                        Math.min(screen.width, outerWidth + 241), outerHeight);
                }
            }
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

        // Keyboard shortcuts for intro tour (only active during a tour)
        this.tourShortcutsHandler = (event) => {
            if (event.key === "Escape") {
                this.exitIntroTour();
            } else if (event.key === "ArrowLeft" || event.key === "ArrowUp"
                       || event.key === "Backspace") {
                if (this.currentPartIndex > 0) {
                    --this.currentPartIndex;
                    this.displayNextPart();
                }
            } else if (event.key === "ArrowRight" || event.key === "ArrowDown"
                       || event.key === "Enter" || event.key === " ") {
                ++this.currentPartIndex;
                this.displayNextPart();
            }
            // Disable all other keyboard shortcuts during a tour
            event.preventDefault();
            event.stopPropagation();
        };

        // Hiding information on panel shortcuts
        this.$("hide-panel-shortcuts-info").addEventListener("click", () => {
            this.$("panel-shortcuts-info").hide();
            storage.set("show-panel-shortcuts-info", false);
            this.$("filter").classList.remove("dark");
        });
    }

    registerCentralEventListeners() {
        // Regularly update amount of SRS items displayed in various locations
        events.on("update-srs-status-cache", async () => {
            const languages = dataManager.languages.visible;
            for (const language of languages) {
                const amounts = await dataManager.srs.getAmountsFor(language);
                this.srsItemAmounts[language] = amounts;

                // Sum up amounts to get total number of due items per language
                let amountDueTotal = 0;
                for (const itemsForLevel of amounts) {
                    for (const mode in itemsForLevel) {
                        amountDueTotal += itemsForLevel[mode].due;
                    }
                }
                this.srsItemAmountsDueTotal[language] = amountDueTotal;
            }
            // After cache has been updated, notify other parts of the program
            this.updateTestButton();
            events.emit("update-srs-status");
        });
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
        // events.on("settings-general-auto-launch-on-startup", () => {
        //     this.autoLauncher.isEnabled().then((isEnabled) => {
        //         if (dataManager.settings.general.autoLaunchOnStartup) {
        //             if (!isEnabled) this.autoLauncher.enable();
        //         } else {
        //             this.autoLauncher.disable();
        //         }
        //     });
        // });
        events.on("content-download-finished", (info) => {
            this.addNotification("content-download-finished", info);
        });
    }

    async open() {
        app.openWindow("loading", "Initializing...");

        // Enable all shortcuts
        for (const shortcutName in this.shortcutMap) {
            shortcuts.enable(shortcutName);
        }

        // Load info about incomplete downloads
        networkManager.load();  // TODO: Move this somewhere else?

        // Initialize all subcomponents
        const results = [];
        for (const name in this.sections) {
            results.push(this.sections[name].initialize());
        }
        await Promise.all(results);

        // Open the language which was open when the program was closed last
        let lastOpenedLanguage = storage.get("last-opened-language");
        if (!dataManager.languages.all.includes(lastOpenedLanguage))
            lastOpenedLanguage = dataManager.languages.all[0];
        await this.setLanguage(lastOpenedLanguage);

        // Apply global settings
        this.sections["settings"].broadcastGlobalSettings();
        events.emit("settings-loaded");  // Allow other widgets to adjust

        // Only display home section
        this.sections["home"].show();
        utility.finishEventQueue().then(() => {
            this.sections["home"].open();
        });
        this.currentSection = "home";

        // Load search history in kanji info panel
        if (dataManager.content.isLoadedFor("Japanese", "English")) {
            this.$("kanji-info-panel").loadHistory();
        }

        // Regularly update SRS info
        events.emit("update-srs-status-cache");
        this.srsStatusCallbackId = window.setInterval(
            () => events.emit("update-srs-status-cache"),
            1000 * this.srsStatusUpdateInterval);

        // Wait until SRS info cache has been initialized
        await new Promise((resolve, reject) => {
            events.once("update-srs-status", resolve);
        });

        // If program version has changed, delete cache to force status update
        let lastUsedProgramVersion = storage.get("last-used-program-version");
        if (lastUsedProgramVersion !== app.version) {
            if (storage.has("dataUpdateCache"))
                storage.delete("dataUpdateCache");
        }
        storage.set("last-used-program-version", app.version);

        // Regularly check for new versions of program and language data
        this.programUpdateCallbackId = utility.setTimer(() =>
            events.emit("update-program-status"), this.statusUpdateInterval,
            storage.get("programUpdateCache.lastUpdateTime"));
        this.languageDataUpdateCallbackId = utility.setTimer(() =>
            events.emit("update-content-status"), this.statusUpdateInterval,
            storage.get("dataUpdateCache.lastUpdateTime"));

        // Periodically write user data to disk
        this.dataSavingCallbackId = window.setTimeout(() => this.saveData(),
            1000 * this.dataSavingInterval);

        // Run clean-up-code from now on whenever attempting to close the window
        ipcRenderer.send("activate-controlled-closing");

        // Load notifications
        const notifications = dataManager.notifications.get();
        for (const notification of notifications) {
            this.displayNotification(notification);
        }

        // Link achievements module to event emitter and do an initial check
        dataManager.achievements.setEventEmitter(events);
        events.on("achievement-unlocked", (info) => {
            const achievementName =
                dataManager.achievements.getName(info.achievement, info.level);
            this.updateStatus(`Unlocked achievement '${achievementName}'!`)
            this.addNotification("achievement-unlocked", info, true);
        });
        await dataManager.achievements.checkAll();

        // Display introduction overlay if not displayed yet
        const showIntroOverlay = storage.get("show-introduction-overlay");
        if (showIntroOverlay === undefined || showIntroOverlay) {
            overlays.open("introduction");
        }
        this.$("selective-dimmer").hide();
        this.$("intro-tour-textbox").hide();

        // When selecting fields in SRS overview, show amount on test button
        this.sections["home"].$("srs-status-overview").onSelectionChange =
            (selectionNotEmpty) => this.updateTestButton(selectionNotEmpty);

        // Notify user if there are shortcuts without assigned key combinations
        // const notifyUnassigned = storage.get("show-shortcuts-unassigned-notice")
        // if (shortcuts.hasUnassigned()) {
        //     if (notifyUnassigned || notifyUnassigned === undefined) {
        //         storage.set("show-shortcuts-unassigned-notice", false);
        //         const goToShortcuts = await dialogWindow.confirm(
        //             "For some of the newly added shortcuts, the default key " +
        //             "combinations collide with the currently assigned ones. " +
        //             "Do you want to assign new key combinations now?",
        //             false, "Notice");
        //         if (goToShortcuts) {
        //             main.sections["settings"].openSubsection("shortcuts");
        //             main.openSection("settings");
        //         }
        //     }
        // } else if (!notifyUnassigned) {
        //     storage.set("show-shortcuts-unassigned-notice", true);
        // }

        // Load language content for visible languages if auto-load is enabled
        if (dataManager.settings.general.autoLoadLanguageContent) {
            app.openWindow("loading", "Loading language data...");
            //    "This might take a bit.<br>" +
            //    "Content loading on application launch<br>" +
            //    "can be disabled in the settings.";
            const languages = dataManager.languages.visible;
            for (const language of languages) {
                const secondary = dataManager.languageSettings.getFor(
                    language, "secondaryLanguage");
                await this.loadLanguageContent(language, secondary, true);
            }
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
        if (!onStart) overlays.open("loading", "Loading language data");
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

    async openSection(name, noFading=false, args=[]) {
        if (this.fadingOutPreviousSection) {
            this.nextSection = name;
            return;
        }
        if (this.currentPanel !== null)
            this.closePanel(this.currentPanel)
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

            // Set background color of section container to that of next section
            if (name === "test") {
                const colors = dataManager.settings.getTestSectionColors();
                this.$("section-frame").style.setProperty(
                    "--test-section-background", "background-color" in colors ?
                    "#" + colors["background-color"] : "");
            }
            this.$("section-frame").classList.toggle("alternative-background",
                name === "home" || name === "stats" || name === "kanji");
            this.$("section-frame").classList.toggle("default-test-background",
                name === "test");

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
        this.sections[this.nextSection].open(...args);
    }

    async openPanel(name, { entryName, dictionaryId=undefined,
            isProperName=false, entryList=undefined }={}) {

        // If a different panel is already open, close it first
        let deferDimming = false;
        const currentPanel = this.currentPanel;
        if (currentPanel !== null) {
            this.closePanel(currentPanel, currentPanel === name);
            if (currentPanel === name) return;
        } else {
            // Otherwise, fade in the background dimming (if animations enabled)
            if (dataManager.settings.design.animateSlidingPanels) {
                Velocity(this.$("filter"), "stop");
                Velocity(this.$("filter"), "fadeIn",
                    { duration: this.panelSlideDuration });
            } else {
                deferDimming = true;
            }
            // Remember which element in the section had focus
            this.lastFocussedSectionElement =
                this.sections[this.currentSection].root.activeElement;
        }

        // Load the given entry
        if (name.startsWith("edit")) {
            await this.panels[name].load(entryName,
                { givenDictionaryId: dictionaryId, isProperName, entryList });
        }

        // Open the panel
        this.panels[name].style.zIndex = layers["panel"];
        this.currentPanel = name;
        this.panels[name].open();
        if (dataManager.settings.design.animateSlidingPanels) {
            Velocity(this.panels[name], "stop");
            Velocity(this.panels[name],
                    { left: "0px" }, { duration: this.panelSlideDuration });
        } else {
            this.panels[name].style.left = "0";
        }

        // Load suggestions (if available)
        let showSuggestions = false;
        const dictionaryAvailable = dataManager.content.isDictionaryAvailable();
        if (entryName !== undefined && dictionaryAvailable && !isProperName) {
            if (name.endsWith("kanji")) {
                showSuggestions = true;
                await this.suggestionPanes[name].load(entryName);
            } else if (name.endsWith("vocab")) {
                // Load suggestions by dictionary ID if one is given
                if (dictionaryId !== undefined) {
                    showSuggestions = true;
                    await this.suggestionPanes[name].load(
                        dictionaryId, entryName);
                }
                // If no dictionary ID is given, look it up or guess an ID
                else {
                    dictionaryId = await
                        dataManager.vocab.getAssociatedDictionaryId(entryName);
                    if (dictionaryId === null) {
                        dictionaryId = await
                            dataManager.content.guessDictionaryId(entryName);
                    }
                    if (dictionaryId !== null) {
                        showSuggestions = true;
                        await this.suggestionPanes[name].load(
                            dictionaryId, entryName);
                    }
                }
            }
        }

        // If animations are disabled, dim after loading to prevent flickering
        if (deferDimming) {
            this.$("filter").style.opacity = "1";
            this.$("filter").show();
        }

        let showPanelShortcuts = storage.get("show-panel-shortcuts-info");
        if (showPanelShortcuts === undefined) showPanelShortcuts = true;

        // Display loaded suggestion pane (unless the panel was already closed)
        if (this.currentPanel !== name) return;
        if (showSuggestions) {
            this.showSuggestionsPane(name);
        // If no suggestion pane is shown, display available shortcuts instead
        } else if (showPanelShortcuts) {
            this.showShortcutsInfo();
        } else {
            this.hideShortcutsInfo();
            this.hideSuggestionPane();
        }
    }

    showShortcutsInfo() {
        if (this.panelShortcutsInfoShown) return;
        this.panelShortcutsInfoShown = true;
        this.hideSuggestionPane();
        this.$("filter").classList.add("dark");
        if (dataManager.settings.design.animateSlidingPanels) {
            Velocity(this.$("panel-shortcuts-info"), "stop");
            Velocity(this.$("panel-shortcuts-info"), "fadeIn",
                { duration: this.panelSlideDuration });
        } else {
            this.$("panel-shortcuts-info").style.opacity = "1";
            this.$("panel-shortcuts-info").show();
        }
    }

    showSuggestionsPane(name, fast=false) {
        if (this.currentSuggestionPane !== null) return;
        this.currentSuggestionPane = name;
        this.hideShortcutsInfo(fast);
        this.$("filter").classList.add("dark");
        if (dataManager.settings.design.animateSlidingPanels) {
            Velocity(this.suggestionPanes[name], "stop");
            Velocity(this.suggestionPanes[name], "fadeIn",
                { duration: fast ? this.showSuggestionsDuration :
                                   this.panelSlideDuration });
        } else {
            this.suggestionPanes[name].style.opacity = "1";
            this.suggestionPanes[name].show();
        }
    }

    closePanel(name, noOtherPanelOpening=true) {
        const panel = this.panels[name];
        panel.close();

        // Remove the focus from the panel
        if (panel.root.activeElement !== null) {
            panel.root.activeElement.blur();
        }

        // Close the panel itself (using animation if flag is set)
        if (dataManager.settings.design.animateSlidingPanels) {
            Velocity(panel, "stop");
            Velocity(panel, { left: "-400px" },
                { duration: this.panelSlideDuration});
        } else {
            panel.style.left = "-400px";
        }
        panel.style.zIndex = layers["closing-panel"];

        // If no other panel is getting opened, remove the background dimming
        if (noOtherPanelOpening) {
            this.currentPanel = null;
            if (dataManager.settings.design.animateSlidingPanels) {
                Velocity(this.$("filter"), "stop");
                Velocity(this.$("filter"), "fadeOut",
                    { duration: this.panelSlideDuration });
            } else {
                this.$("filter").hide();
            }
            this.hideShortcutsInfo();
            this.hideSuggestionPane();

            // Also restore focus to last focussed element in current section
            if (this.lastFocussedSectionElement)
                this.lastFocussedSectionElement.focus();
        }
    }

    hideShortcutsInfo(fast=false) {
        if (!this.panelShortcutsInfoShown) return;
        this.panelShortcutsInfoShown = false;
        if (dataManager.settings.design.animateSlidingPanels) {
            Velocity(this.$("panel-shortcuts-info"), "stop");
            Velocity(this.$("panel-shortcuts-info"), "fadeOut",
                { duration: fast ? this.showSuggestionsDuration :
                                   this.panelSlideDuration });
        } else {
            this.$("panel-shortcuts-info").hide();
        }
        this.$("filter").classList.remove("dark");
    }

    hideSuggestionPane(fast=false) {
        if (this.currentSuggestionPane === null) return;
        const name = this.currentSuggestionPane;
        this.currentSuggestionPane = null;
        if (dataManager.settings.design.animateSlidingPanels) {
            Velocity(this.suggestionPanes[name], "stop");
            Velocity(this.suggestionPanes[name], "fadeOut",
                { duration: fast ? this.showSuggestionsDuration :
                                   this.panelSlideDuration });
        } else {
            this.suggestionPanes[name].hide();
        }
        this.$("filter").classList.remove("dark");
    }

    async toggleBarVisibility(easing="ease-in-out") {
        Velocity(this.$("side-bar"), "stop");
        Velocity(this.$("menu-bar"), "stop");
        let prom = Promise.resolve();
        if (dataManager.settings.design.enableAnimations) {
            if (this.barsHidden) {
                prom = Velocity(this.$("side-bar"),
                    { "width": this.sideBarWidth },
                    { easing, complete: () => {
                          this.$("side-bar").style.overflow = "initial"; }})
                Velocity(this.$("menu-bar"), { "height": this.menuBarHeight },
                    { easing, complete: () => {
                          this.$("menu-bar").style.overflow = "initial"; }})
            } else {
                this.$("menu-bar").style.overflow = "hidden";
                this.$("side-bar").style.overflow = "hidden";
                prom = Velocity(this.$("side-bar"), { "width": "0px" },
                                                    { easing });
                Velocity(this.$("menu-bar"), { "height": "0px" }, { easing });
            }
        } else {
            this.$("side-bar").toggleDisplay(this.barsHidden, "flex");
            this.$("menu-bar").toggleDisplay(this.barsHidden, "flex");
        }
        this.barsHidden = !this.barsHidden;
        this.$("bottom").classList.toggle("stretch", this.barsHidden);
        await prom;
    }

    updateStatus(text) {
        if (this.statusFadeOutCallbackId !== null) {
            window.clearTimeout(this.statusFadeOutCallbackId);
        }
        if (!this.barsHidden) this.$("status-text").fadeOut({ distance: 150 });
        this.$("status-text").textContent = text;
        if (!this.barsHidden) this.$("status-text").fadeIn({ distance: 150 });
        this.statusFadeOutCallbackId = window.setTimeout(() => {
            if (!this.barsHidden) this.$("status-text").fadeOut({
                    distance: 0, easing: "easeInSine", duration: 350 });
            else this.$("status-text").style.visibility = "hidden";
        }, this.statusFadeOutDelay);
    }

    updateTestButton(onlySelected=false) {
        const amount = onlySelected ?
            this.sections["home"].$("srs-status-overview").getSelectedAmount() :
            this.srsItemAmountsDueTotal[dataManager.currentLanguage];
        this.$("num-srs-items").innerHTML = `${amount}<br>items`;
        this.$("test-button").classList.toggle("highlighted", onlySelected);
        this.$("test-button").classList.toggle("no-items", amount === 0);
    }

    async openTestSection() {
        const selection =
            this.sections["home"].$("srs-status-overview").getSelection();
        const amount = selection === null ? await
            dataManager.srs.getTotalAmountDueFor(dataManager.currentLanguage) :
            this.sections["home"].$("srs-status-overview").getSelectedAmount();
        if (selection === null) {
            this.srsItemAmountsDueTotal[dataManager.currentLanguage] = amount;
        }
        if (amount > 0) {
            this.openSection("test", false, [selection !== null ? selection : 
                                                                  undefined]);
        } else {
            if (selection === null) {
                this.updateStatus("There are currently no items " +
                                  "available for review!");
            } else {
                this.updateStatus("The selected levels currently " +
                                  "contain no items available for review!");
                this.sections["home"].$("srs-status-overview").clearSelection()
            }
        }
        this.updateTestButton();
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
            if (this.currentPanel === "edit-kanji") {
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
            if (this.currentPanel === "edit-hanzi") {
                this.closePanel(this.currentPanel);
            }
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
        this.$("dictionary-button").toggleDisplay(
            dataManager.content.isDictionaryAvailable());
        this.$("side-bar").classList.remove("content-loaded");
        if (!dataManager.content.isLoadedFor(language, secondaryLanguage))
            return;
        if (language === "Japanese") {
            this.$("side-bar").classList.add("content-loaded");
            this.$("find-kanji-button").show();
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
        this.sections["notes"].saveData();
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
        // TODO: Don't check if kanji is in database here (do it elsewhere)
        return dataManager.content.get("Japanese", "English")
        .isKnownKanji(character).then((isKanji) => {
            if (isKanji) {
                element.classList.add("kanji-info-link");
                // Open kanji info panel upon clicking kanji
                element.addEventListener("click", async () => {
                    await this.$("kanji-info-panel").load(character);
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
        storage.set("last-opened-language", dataManager.currentLanguage);
        await this.saveData();
        await dataManager.database.closeAll();
        await dataManager.history.closeAll();
        networkManager.haltAll();
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
        // Note: notification IDs must be strings for this to work
        for (const notificationNode of notifications) {
            if (notificationNode.dataset.id === id) {
                this.$("notifications").removeChild(notificationNode);
                break;
            }
        }
        // A text node might remain which disables the CSS selector ":empty"
        if (this.$("notifications").children.length === 0) {
            this.$("notifications").innerHTML = "";
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
            const dateString = dateFormat(releaseDate, "mmm dS, yyyy");
            subtitle = `Version ${latestVersion}, released on ${dateString}` +
                       `<br>Click here to view the release notes.`;
            details = marked(description);
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
            buttonLabel = "Download";
            const { language, secondary } = data;
            title = `New language data available`;
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
            title = "Downloading language data...";
            buttonLabel = "Open<br>settings";
            const { language, secondary } = data;
            subtitle = `For ${language} (from ${secondary}).<br>
                        See language settings for progress.`;
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
            const { language, secondary, successful } = data;
            subtitle = `For ${language} (from ${secondary}).<br>`;
            if (successful) {
                title = "Data download finished";
                subtitle += "Press the button on the right to load.";
                if (dataManager.content.isLoadedFor(language, secondary)) {
                    buttonLabel = "Reload<br>data";
                } else {
                    buttonLabel = "Load<br>data";
                }
                buttonCallback = async () => {
                    await this.loadLanguageContent(language, secondary);
                    this.deleteNotification(id);
                };
                events.once("language-content-loaded", (info) => {
                    if (info.language==language && info.secondary==secondary) {
                        this.deleteNotification(id);
                    }
                });
            } else {
                title = "Language data download failed";
                subtitle += "This probably happened due to invalid data on " +
                            "the server. You could retry in a few days. If " +
                            "the problem persists, please contact the " +
                            "maintainer of the application (see GitHub page).";
                buttonLabel = "OK";
                buttonCallback = () => this.deleteNotification(id);
            }
        }
        else if (type === "achievement-unlocked") {
            const { achievement, level, language } = data;
            const name = dataManager.achievements.getName(achievement, level);
            title = `Achievement unlocked`;
            buttonLabel = "OK";
            subtitle = language !== undefined ? `[For ${language}] ` : "";
            subtitle += `<b>${name}</b> - ` + 
                dataManager.achievements.getDescription(achievement, level);
            buttonCallback = () => this.deleteNotification(id);
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
        this.$("notifications").prepend(fragment);
    }

    // ========================================================================
    //    Introduction tours
    // ========================================================================

    exitIntroTour() {
        this.$("selective-dimmer").hide();
        this.$("intro-tour-textbox").hide();
        window.removeEventListener("keydown", this.tourShortcutsHandler,
                                   { capture: true });
    }

    startIntroTour(name) {
        this.introTourParts = [];
        const parts = utility.parseHtmlFile(paths.introTour(name)).children;
        // Separate the script from the rest of the content for each step
        for (const part of parts) {
            const content = document.importNode(part.content, true);
            const target = part.dataset.target;
            let script = null;
            if (content.firstElementChild !== null
                    && content.firstElementChild.tagName === "SCRIPT") {
                script = content.firstElementChild.textContent;
                content.removeChild(content.firstElementChild);
            }
            this.introTourParts.push({ script, content, target });
        }
        this.currentPartIndex = 0;
        this.displayNextPart();
        window.addEventListener("keydown", this.tourShortcutsHandler,
                                { capture: true });
    }
    
    async displayNextPart() {
        if (this.currentPartIndex === this.introTourParts.length) {
            this.exitIntroTour();
            return;
        }
        // Toggle button visibility depending on if it's the first or last part
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
        // Execute script to set context, then insert content into the textbox
        const { script, content, target } =
            this.introTourParts[this.currentPartIndex];
        if (script !== null) {
            eval(script);
        }
        this.$("intro-tour-textbox-content").innerHTML = "";
        this.$("intro-tour-textbox-content").appendChild(content.cloneNode(1));
        if (this.introTourPromise) await this.introTourPromise;
        this.showTextbox(this.introTourContext.$(target));
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
        if (textboxPos.bottom + textboxHeight > totalHeight-windowEdgePadding) {
            delete textboxPos.bottom;
            textboxPos.top = windowEdgePadding;
        }
        if (textboxPos.left + textboxWidth > totalWidth - windowEdgePadding) {
            delete textboxPos.left;
            textboxPos.right = windowEdgePadding;
        }
        if (textboxPos.right + textboxWidth > totalWidth - windowEdgePadding) {
            delete textboxPos.right;
            textboxPos.left = windowEdgePadding;
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
        const schemeName = dataManager.settings.design.colorScheme;
        dimCtx.fillStyle = colorSchemes[schemeName]["generalBg"];
        dimCtx.shadowColor = colorSchemes[schemeName]["generalFg"];
        dimCtx.shadowBlur = "5";
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
