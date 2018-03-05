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
        click: ({ currentNode }) => {
            main.$("kanji-info-panel").load(currentNode.textContent);
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
        this.panelSlideDuration = 350;
        this.sectionFadeDuration = 200;
        this.statusUpdateInterval = utility.timeSpanStringToSeconds("3 hours");
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
        const onNotificationsWindowClosed = () => {
            // Unhighlight all highlighted notifications after they were viewed
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
                () => this.openPanel("add-vocab"));
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
        this.$("about-button").addEventListener("click",
                () => overlays.open("about"));
        this.$("help-button").addEventListener("click",
                () => overlays.open("help"));
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
                this.sections["kanji"].$("search-by-kanji-input").focus();
            },
            "open-kanji-overview": () => {
                this.sections["kanji"].showOverview();
                this.openSection("kanji");
            },
            "open-home-section": () => this.openSection("home"),
            "open-stats-section": () => this.openSection("stats"),
            "open-vocab-section": () => this.openSection("vocab"),
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
            "refresh": () => events.emit("update-srs-status"),
            "save-input": () => {
                if (this.currentPanel !== null) {
                    this.panels[this.currentPanel].save();
                }
            }
        };
        this.shortcutsForLanguage = {
            "Japanese":
                ["add-kanji", "open-kanji-search", "open-kanji-overview",
                 "open-dictionary"]
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
        events.on("update-program-status", async () => {
            const info = await networkManager.program.getLatestVersionInfo();
            info.lastUpdateTime = utility.getTime();
            const cacheKey = "cache.programVersionInfo";
            const cachedInfo = storage.get(cacheKey);
            storage.set(cacheKey, info);
            if ((cachedInfo === undefined && app.version !== info.latestVersion)
                    || (cachedInfo !== undefined &&
                        cachedInfo.latestVersion !== info.latestVersion)) {
                this.addNotification("program-update-available", info);
            }
            window.setTimeout(() => events.emit("update-program-status"),
                              this.statusUpdateInterval * 1000);
        });
        events.on("update-content-status", async ({ language, secondary }) => {
            const info = 
                    await networkManager.content.getStatus(language, secondary);
            info.lastUpdateTime = utility.getTime();
            const cacheKey = `cache.contentVersionInfo.${language}.${secondary}`
            const cachedInfo = storage.get(cacheKey);
            storage.set(cacheKey, info);
            if ((cachedInfo === undefined && info.updateAvailable)
                    || (cachedInfo !== undefined && !cachedInfo.updateAvailable
                                                 && info.updateAvailable)) {
                this.addNotification("content-update-available",
                    { language, secondary });
            }
            events.emit("update-content-view", { language, secondary });
            window.setTimeout(() => events.emit("update-content-status",
                { language, secondary }), this.statusUpdateInterval * 1000);
        });
        events.on("content-download-finished", (info) => {
            this.addNotification("content-download-finished", info);
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
        if (dataManager.content.isAvailable("Japanese", "English")) {
            this.$("kanji-info-panel").load("字", true);
            this.$("kanji-info-panel").loadHistory();
        }
        // Regularly update displayed SRS info
        this.srsStatusCallbackId = window.setInterval(
            () => events.emit("update-srs-status"), 1000 * 60 * 5);  // 5 min
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
        // Run clean-up-code from now on whenever attempting to close the window
        ipcRenderer.send("activate-controlled-closing");
        // Link achievements module to event emitter and do an initial check
        dataManager.achievements.setEventEmitter(events);
        events.on("achievement-unlocked", (info) => {
            this.updateStatus(`Unlocked achievement '${info.achievementName}'!`)
            this.addNotification("achievement-unlocked", info);
        });
        await dataManager.achievements.checkAll();
        // Load notifications
        const notifications = dataManager.notifications.get();
        for (const notification of notifications) {
            // Make sure to delete notifications which are useless after restart
            if (notification.type === "content-download-finished" ||
                    notification.type === "content-installation-finished") {
                dataManager.notifications.delete(notification.id);
                continue;
            }
            this.displayNotification(notification);
        }
        // TODO
        const selectiveDimmer = this.$("selective-dimmer");
        selectiveDimmer.hide();
        // TODO: Make sure canvas adjust to window size on resizing
        selectiveDimmer.width = window.innerWidth;
        selectiveDimmer.height = window.innerHeight;
        const dimCtx = selectiveDimmer.getContext("2d");
        window.dimCtx = dimCtx;
        window.highlightElement = (element) => {
            selectiveDimmer.show()
            const rect = element.getBoundingClientRect();
            // Clear and dim whole window
            dimCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            dimCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
            dimCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);
            // Draw shadow
            dimCtx.shadowColor = "white";
            dimCtx.shadowBlur = "15";
            dimCtx.fillStyle = "white";
            dimCtx.fillRect(rect.left, rect.top, rect.width, rect.height);
            // Clear canvas above element
            dimCtx.clearRect(rect.left, rect.top, rect.width, rect.height);
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

    async openPanel(name, { dictionaryId, entryName }={}) {
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
        this.panels[name].open();
        if (dataManager.settings.design.animateSlidingPanels) {
            Velocity(this.panels[name], "stop");
            Velocity(this.panels[name],
                    { left: "0px" }, { duration: this.panelSlideDuration });
        } else {
            this.panels[name].style.left = "0";
        }
        let showSuggestions = false;
        if (name === "edit-vocab" || name === "edit-kanji" ||
                name === "edit-hanzi") {
            if (entryName === undefined) {
                throw new Error(
                    "A vocab entry to load must be provided for edit panels!");
            }
            this.panels[name].load(entryName);
        }
        if (name === "add-kanji" || name === "edit-kanji") {
            if (dataManager.currentLanguage === "Japanese" &&
                    dataManager.currentSecondaryLanguage === "English" &&
                    dataManager.content.isAvailable("Japanese", "English")) {
                if (entryName !== undefined) {
                    showSuggestions = true;
                    this.suggestionPanes[name].load(entryName);
                }
            }
        }
        if (name === "add-vocab" || name === "edit-vocab") {
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
            } else if (entryName !== undefined) {
                if (dataManager.currentLanguage === "Japanese" &&
                        dataManager.currentSecondaryLanguage === "English" &&
                        dataManager.content.isAvailable("Japanese", "English")){
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

    addNotification(type, data) {
        const notification = dataManager.notifications.add(type, data);
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
            buttonCallback = () => {
                dialogWindow.info(
                    `Automated program updating is not yet implemented.
                     Please download and install the latest program version
                     from <a href="${app.homepage + "/releases"}">here</a>.`)
            };
        }
        else if (type === "program-download-finished") {
            title = "Program download finished";
            buttonLabel = "Install";
        }
        else if (type === "program-installation-finished") {
            title = "Program installation finished";
            buttonLabel = "Reload";
        }
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
                overlays.open("loading");
                await dataManager.content.load(language);
                if (dataManager.currentLanguage === language) {
                    dataManager.content.setLanguage(language);
                }
                await this.processLanguageContent(language, secondary);
                this.adjustToLanguageContent(language, secondary);
                this.deleteNotification(id);
                await utility.wait();
                overlays.closeTopmost();
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
        infoNode.addEventListener("click", () => {
            if (!details) return;
            detailsNode.toggleDisplay();
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
        if (language === "Chinese") {
            this.$("add-hanzi-button").show();
        } else {
            this.$("add-hanzi-button").hide();
        }
        for (const l in this.shortcutsForLanguage) {
            if (language !== l) {
                for (const shortcutName of this.shortcutsForLanguage[l]) {
                    shortcuts.disable(shortcutName);
                }
            } else {
                for (const shortcutName of this.shortcutsForLanguage[l]) {
                    shortcuts.enable(shortcutName);
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

    async attemptToQuit() {
        const confirmed =
            await this.sections[this.currentSection].confirmClose();
        if (!confirmed) return false;
        const testSessionClosed = await this.sections["test"].abortSession();
        if (!testSessionClosed) return false;
        this.sections[this.currentSection].close();
        await dataManager.saveAll(); 
        networkManager.stopAllDownloads();
        networkManager.save();
        return true;
    }
}

customElements.define("main-window", MainWindow);
module.exports = MainWindow;
