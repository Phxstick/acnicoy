"use strict";

const dateFormat = require("dateformat");

class LanguageTable extends Widget {

    static get observedAttributes() {
        return ["interactive-mode"];
    }

    constructor() {
        super("language-table");
        this.$("table").hide();
        this.$("update-content-status-button").hide();
        this.$("last-content-status-update-time").hide();
        this.$("content-update-error-label").hide();
        this.$("check-content-update-spinner").hide();
        for (const element of this.$$(".interactive-only")) {
            element.hide();
        }

        this.languageConfigs = [];
        this.languageToConfig = new Map();
        this.rowToConfig = new WeakMap();
        this.configToDomElements = new WeakMap();
        this.interactiveMode = false;
        this.settingsSubsection = null;
        this.handledDownloadStreams = new WeakSet();
        this.updatingContentStatus = new WeakSet();

        // Quick access to language content elements for each language
        this.$("edit-srs-schemes-button").addEventListener("click", () => {
            overlays.open("srs-schemes");
        });

        // Adding a new language
        this.$("add-language-button").addEventListener("click", async () => {
            const config = await overlays.open("add-lang");
            if (!config) return;
            const language = config.language;
            const secondary = config.settings.secondary;
            if (this.languageToConfig.has(language)) {
                dialogWindow.info("You cannot add a language twice!"); 
                return;
            }
            if (this.interactiveMode) {
                await dataManager.languages.add(language, config.settings);
                await dataManager.load(language);
                events.emit("language-added", language);
            }
            config.interactiveMode = this.interactiveMode;

            // Check using cache whether language content is available
            const statusUpdateRequiredKey =
                `dataUpdateCache.statusUpdateRequired.${language}.${secondary}`;
            const languageDataVersionsKey =
                `dataUpdateCache.latestReleaseVersions.${language}.${secondary}`
            if (storage.get(languageDataVersionsKey) !== undefined) {
                storage.set(statusUpdateRequiredKey, true);
            }

            this.addTableRow(config);
        });

        // Updating language content status
        this.$("update-content-status-button").addEventListener(
            "click", () => this.checkForContentUpdates());

        // When a readings checkbox is clicked, update config
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("readings-checkbox")) return;
            const config = this.rowToConfig.get(event.target.closest("tr"));
            if (this.interactiveMode) {
                dataManager.languageSettings.setFor(
                    config.language, "readings", event.target.checked);
                this.settingsSubsection.broadcastLanguageSetting(
                    "readings", config.language);
            }
            config.settings.readings = event.target.checked;
        });

        // Allow user to change SRS scheme and migrate items for a language
        this.$("table-body").addEventListener("click", (event) => {
            if (!this.interactiveMode) return;
            if (!event.target.classList.contains("scheme-button")) return;
            const config = this.rowToConfig.get(event.target.closest("tr"));
            const label = event.target;
            overlays.open("migrate-srs", "switch-scheme", {
                language: config.language,
                schemeName: config.settings.srs.scheme
            }).then((migrated) => {
                if (!migrated) return;
                const newScheme = dataManager.languageSettings
                                  .getFor(config.language, "srs.scheme");
                label.textContent = newScheme;
                config.settings.srs.scheme = newScheme;
            });
        });

        // Functionality for loading/unloading language content
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("content-load-status-label"))
                return;
            const config = this.rowToConfig.get(event.target.closest("tr"));
            const language = config.language;
            const secondary = config.settings.secondary;
            if (!dataManager.content.isLoadedFor(language, secondary)) {
                main.loadLanguageContent(language, secondary);
                event.target.textContent = "Unload";
            } else {
                dataManager.content.unload(language, secondary);
                main.adjustToLanguageContent(language, secondary);
                event.target.textContent = "Load";
            }
        });

        // Functionality for downloading language content
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("content-status-label")) return
            const config = this.rowToConfig.get(event.target.closest("tr"));
            if (!config.downloadReady) return;
            events.emit("start-content-download", {
                language: config.language,
                secondary: config.settings.secondary
            });
        });

        // Activate hidden mode for language if eye-button is clicked
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("hide-button")) return;
            const row = event.target.closest("tr");
            const config = this.rowToConfig.get(row);
            const hidden = dataManager.languageSettings
                           .getFor(config.language, "hidden");
            if (!hidden && dataManager.languages.visible.length === 1) {
                dialogWindow.info("At least one language must be kept visible.")
                return;
            }
            dataManager.languageSettings.setFor(
                config.language, "hidden", !hidden);
            row.classList.toggle("hidden", !hidden);
            this.settingsSubsection.broadcastLanguageSetting(
                "visibility", config.language);
            events.emit("language-visibility-changed", config.language);
        });

        // Remove language if a remove-icon is clicked
        this.$("table-body").addEventListener("click", async (event) => {
            if (!event.target.classList.contains("remove-button")) return;
            const row = event.target.closest("tr");
            const config = this.rowToConfig.get(row);
            if (this.interactiveMode) {
                const confirmed = await dialogWindow.confirm(
                    `Are you sure you want to remove the language ` +
                    `'${config.language}' and delete all its data?`);
                if (!confirmed) return;
                const languages = dataManager.languages.all.slice();
                languages.remove(config.language);
                events.emit("language-removed", config.language);
                // If the removed language is the current one, switch to another
                if (config.language === dataManager.currentLanguage) {
                    if (languages.length > 0) {
                        const switched = await main.setLanguage(languages[0]);
                        if (!switched) return;
                    }
                }
                await dataManager.languages.remove(config.language);
            }
            this.languageConfigs.remove(config);
            this.languageToConfig.delete(config.language);
            this.$("table-body").removeChild(row);
            if (this.languageConfigs.length === 0) {
                if (this.interactiveMode) {
                    await app.initLanguages();
                    app.openWindow("main");
                } else {
                    this.$("table").hide();
                }
            }
        });
    }

    registerCentralEventListeners() {
        events.on("start-content-download", ({ language, secondary }) => {
            if (!this.interactiveMode) return;
            const config = this.languageToConfig.get(language);
            config.downloading = true;
            config.downloadReady = false;
            this.updateContentStatus(language);
        });
        events.on("language-content-loaded", ({ language, secondary }) => {
            if (!this.interactiveMode) return;
            // If language content is already loaded at program launch, this
            // event will be emitted before the language table has been filled
            if (!this.languageToConfig.has(language)) return;
            const config = this.languageToConfig.get(language);
            const elements = this.configToDomElements.get(config);
            elements.loadStatusLabel.textContent = "Unload";
        });
        events.on("update-content-status", () => {
            if (!this.interactiveMode) return;
            main.languageDataUpdateCallbackId = null;
            this.checkForContentUpdates();
        });
    }

    addTableRow(config) {
        const language = config.language;
        this.languageConfigs.push(config);
        this.languageToConfig.set(language, config);
        const template = templates.get("language-table-entry");
        const row = utility.fragmentFromString(template(config)).children[0];
        this.$("table-body").appendChild(row);
        this.rowToConfig.set(row, config);
        this.$("table").show();
        if (!config.interactiveMode) return;

        // Initialize download status
        const secondary = config.settings.secondary;
        config.downloading = networkManager.content.getDownloadStatus(
                language, secondary) !== null;
        config.downloadReady = false;

        // Get all named DOM elements in this row
        const q = (query) => row.querySelector(query);
        const elements = {
            connectingSpinner: q(".connecting-spinner"),

            progressFrame: q(".content-download-progress-frame"),
            progressBar: q(".content-download-progress-bar"),
            progressText: q(".content-download-progress-label"),

            statusFrame: q(".content-status-label-frame"),
            statusLabel: q(".content-status-label"),
            loadStatusLabel: q(".content-load-status-label"),

            programUpdateRecommendedIcon: q(".program-update-recommended-icon"),
            programUpdateRequiredIcon: q(".program-update-required-icon"),
            contentUpdateRequiredIcon: q(".content-update-required-icon")
        };
        this.configToDomElements.set(config, elements);

        elements.loadStatusLabel.textContent =
            dataManager.content.isLoadedFor(language,secondary)?"Unload":"Load";
        this.updateContentStatus(language);
    }

    async checkForContentUpdates() {
        this.$("update-content-status-button").hide();
        this.$("content-update-error-label").hide();
        this.$("check-content-update-spinner").show();

        // Request latest versions of language data and cache them
        let newVersions;
        try {
            const promise = networkManager.content.getLatestVersions();
            newVersions = await utility.addMinDelay(promise);
        } catch (error) {
            this.$("content-update-error-label").show();
            this.$("update-content-status-button").show();
            this.$("check-content-update-spinner").hide();
            return;
        }
        const versionsCacheKey = "dataUpdateCache.latestReleaseVersions";
        let cachedVersions = storage.get(versionsCacheKey);
        if (cachedVersions === undefined) cachedVersions = {};
        storage.set(versionsCacheKey, newVersions);

        // Record time of update and schedule the next update
        const lastUpdateTime = utility.getTime();
        storage.set("dataUpdateCache.lastUpdateTime", lastUpdateTime);
        this.$("last-content-status-update-time").textContent =
            "Last checked: " + dateFormat(lastUpdateTime, "HH:MM, mmm dS");
        if (main.languageDataUpdateCallbackId !== null) {
            window.clearTimeout(main.languageDataUpdateCallbackId);
        }
        main.languageDataUpdateCallbackId = window.setTimeout(() =>
            events.emit("update-content-status"),main.statusUpdateInterval*1000)

        // Flag languages where current version is not equal to cached one
        const flagsCacheKey = "dataUpdateCache.statusUpdateRequired";
        let statusUpdateRequired = storage.get(flagsCacheKey);
        if (statusUpdateRequired === undefined) statusUpdateRequired = {};
        for (const language of dataManager.languages.all) {
            const secondary =
                this.languageToConfig.get(language).settings.secondary;
            if (!newVersions.hasOwnProperty(language)) continue;
            if (!newVersions[language].hasOwnProperty(secondary)) continue;
            const newVersion = newVersions[language][secondary];
            if (!cachedVersions.hasOwnProperty(language) ||
                    !cachedVersions[language].hasOwnProperty(secondary) ||
                    newVersion !== cachedVersions[language][secondary]) {
                if (!statusUpdateRequired.hasOwnProperty(language))
                    statusUpdateRequired[language] = {};
                statusUpdateRequired[language][secondary] = true;
            }
        }
        storage.set(flagsCacheKey, statusUpdateRequired);

        for (const language of dataManager.languages.all) {
            this.updateContentStatus(language);
        }
        this.$("update-content-status-button").show();
        this.$("check-content-update-spinner").hide();
    }

    async updateContentStatus(language) {
        const config = this.languageToConfig.get(language);
        if (this.updatingContentStatus.has(config)) return;
        this.updatingContentStatus.add(config);
        const secondary = config.settings.secondary;
        const flagKey =
            `dataUpdateCache.statusUpdateRequired.${language}.${secondary}`;
        const cacheKey =
            `dataUpdateCache.latestFileVersions.${language}.${secondary}`;
        const elements = this.configToDomElements.get(config);

        // Initially only show the spinner, hide everything else
        elements.progressFrame.hide();
        elements.loadStatusLabel.hide();
        elements.statusFrame.hide();
        elements.connectingSpinner.show();
        elements.programUpdateRecommendedIcon.hide();
        elements.programUpdateRequiredIcon.hide();
        elements.contentUpdateRequiredIcon.hide();
        elements.statusLabel.classList.remove("button");
        elements.statusLabel.classList.remove("up-to-date");

        // If some content is already downloaded, check whether it's compatible
        const contentAvailable =
            dataManager.content.isAvailableFor(language, secondary);
        if (contentAvailable) {
            const contentUpdateRequired =
                dataManager.content.updateRequired(language, secondary);
            const programUpdateRequired =
                dataManager.content.programUpdateRequired(language, secondary);
            if (contentUpdateRequired) {
                elements.contentUpdateRequiredIcon.show();
            } else if (programUpdateRequired) {
                elements.programUpdateRequiredIcon.show();
            } else {
                elements.loadStatusLabel.show();
            }
        }

        // Callback for when the download has ended (successfully or not)
        const concludeDownload = (successful) => {
            config.downloading = false;
            events.emit("content-download-finished",
                { language, secondary, successful });
            this.updateContentStatus(language);
        };

        // Callback for when a network error occurs, show corresponding message
        const onError = (error) => {
            if (error instanceof networkManager.ConnectionError) {
                if (error.connectionTimeout) {
                    // No connection, try again in a few minutes
                    window.setTimeout(() => this.updateContentStatus(language),
                        utility.timeSpanStringToSeconds("5 minutes") * 1000);
                    elements.statusLabel.textContent = "Connection Error";
                    elements.statusLabel.classList.add("error");
                    elements.progressFrame.hide();
                    elements.statusFrame.show();
                    elements.programUpdateRecommendedIcon.hide();
                } else {
                    // Almost immediately try to reconnect upon read timeout
                    window.setTimeout(() => this.updateContentStatus(language),
                        utility.timeSpanStringToSeconds("1 second") * 1000);
                }
            } else if (error instanceof networkManager.RequestError) {
                networkManager.stopDownload(language, secondary);
                concludeDownload(false);
            } else {
                networkManager.stopDownload(language, secondary);
                concludeDownload(false);
            }
        };

        try {
            // If a download has already been started, continue it
            if (config.downloading) {
                const downloadStream =
                    await networkManager.content.startDownload(
                        language, secondary)
                if (!this.handledDownloadStreams.has(downloadStream)) {
                    this.handledDownloadStreams.add(downloadStream);

                    // Initialize status of progress bar
                    const { totalSize, downloaded, percentage } =
                        networkManager.content.getDownloadStatus(
                            language, secondary);
                    elements.progressBar.max = totalSize;
                    elements.progressBar.value = downloaded;
                    elements.progressText.textContent =
                        `${percentage.toFixed(0)} %`;

                    // Update progress bar as the download progresses
                    downloadStream.on("progressing", (status) => {
                        elements.progressBar.value = status.downloaded;
                        elements.progressText.textContent =
                            `${status.percentage.toFixed(0)} %`;
                    });

                    // Display a spinner before downloaded data gets processed
                    downloadStream.on("starting-data-processing", () => {
                        elements.connectingSpinner.show();
                        elements.progressFrame.hide();
                    });

                    // Update status and issue notification if download is over
                    downloadStream.on("ended", (successful) => {
                        if (successful) {
                            if (dataManager.content.isLoadedFor(
                                    language, secondary)) {
                                elements.loadStatusLabel.textContent = "Reload";
                            } else {
                                elements.loadStatusLabel.textContent = "Load";
                            }
                            storage.set(`${cacheKey}.updateAvailable`, false);
                        }
                        concludeDownload(successful);
                    });

                    downloadStream.on("error", onError);
                    elements.progressFrame.show();
                }
            } else {
                const updateRequired = storage.get(flagKey);
                if (updateRequired) {
                    // Request information on latest language data from server
                    const promise = networkManager.content.getStatus(
                            language, secondary);
                    const info = await utility.addMinDelay(promise);
                    const cachedInfo = storage.get(cacheKey);
                    storage.set(cacheKey, info);
                    storage.set(flagKey, false);

                    // Issue a notification if a new update is available
                    if ((cachedInfo === undefined && info.updateAvailable)
                            || (cachedInfo !== undefined &&
                                !cachedInfo.updateAvailable &&
                                info.updateAvailable)) {
                        main.addNotification("content-update-available",
                            { language, secondary });
                    }
                }

                // Update interface according to current status
                let programUpdateRecommended = false;
                let updateAvailable = false;
                if (storage.has(cacheKey)) {
                    ({ programUpdateRecommended, updateAvailable }
                        = storage.get(cacheKey));
                }
                elements.statusLabel.classList.remove("error");
                if (updateAvailable) {
                    if (contentAvailable) {
                        elements.statusLabel.textContent = "Update";
                    } else {
                        elements.statusLabel.textContent = "Download";
                    }
                } else {
                    if (contentAvailable) {
                        elements.statusLabel.textContent = "Up to date";
                        elements.statusLabel.classList.add("up-to-date");
                    } else {
                        elements.statusLabel.textContent = "n.a.";
                    }
                }
                elements.statusFrame.show();
                elements.statusLabel.classList.toggle(
                    "button", updateAvailable);
                config.downloadReady = updateAvailable;
                elements.programUpdateRecommendedIcon.toggleDisplay(
                        programUpdateRecommended);
            }
        } catch (error) {
            onError(error);
        } finally {
            elements.connectingSpinner.hide();
            this.updatingContentStatus.delete(config);
        }
    }

    clear() {
        this.languageConfigs.length = 0;
        this.languageToConfig.clear();
        this.$("table").hide();
        this.$("table-body").empty();
    }

    getLanguageConfigs() {
        const copy = JSON.parse(JSON.stringify(this.languageConfigs));
        return copy;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "interactive-mode") {
            this.interactiveMode = (newValue !== null);
            for (const element of this.$$(".interactive-only")) {
                element.toggleDisplay(this.interactiveMode, "table-cell");
            }
            for (const element of this.$$(".non-interactive")) {
                element.toggleDisplay(!this.interactiveMode, "table-cell");
            }
            this.$("update-content-status-button").toggleDisplay(
                this.interactiveMode);
        }
    }
}

customElements.define("language-table", LanguageTable);
module.exports = LanguageTable;
