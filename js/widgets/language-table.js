"use strict";

class LanguageTable extends Widget {

    static get observedAttributes() {
        return ["interactive-mode"];
    }

    constructor() {
        super("language-table");
        this.$("table").hide();
        for (const element of this.$$(".interactive-only")) {
            element.hide();
        }
        this.languageConfigs = [];
        this.rowToConfig = new WeakMap();
        this.interactiveMode = false;
        this.settingsSubsection = null;
        this.handledDownloadStreams = new WeakSet();
        this.updatingContentStatus = new WeakSet();
        this.retryContentStatusUpdateDelay = 30000;
        // Quick access to language content elements for each language
        this.contentDownloadProgressFrames = new WeakMap();
        this.contentDownloadProgressBars = new WeakMap();
        this.contentDownloadProgressTexts = new WeakMap();
        this.contentStatusLabelFrames = new WeakMap();
        this.contentStatusLabels = new WeakMap();
        this.updateRequiredIcons = new WeakMap();
        this.connectingSpinners = new WeakMap();
        this.$("add-language-button").addEventListener("click", async () => {
            const config = await overlays.open("add-lang");
            if (config === null) return;
            for (const { language } of this.languageConfigs) {
                if (config.language === language) {
                    dialogWindow.info("You cannot add a language twice!"); 
                    return;
                }
            }
            if (this.interactiveMode) {
                await dataManager.languages.add(
                    config.language, config.settings);
                await dataManager.load(config.language);
                events.emit("language-added", config.language);
                config.default = false;
            }
            config.interactiveMode = this.interactiveMode;
            this.addTableRow(config);
        });
        // When a readings checkbox is clicked, update config
        this.$("table-body").addEventListener("click", (target) => {
            if (!event.target.classList.contains("readings-checkbox")) return;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            if (this.interactiveMode) {
                dataManager.languageSettings.for(config.language).readings =
                    event.target.checked;
                this.settingsSubsection.broadcastLanguageSetting("readings");
            }
            config.settings.readings = event.target.checked;
        });
        // Allow user to change SRS scheme and migrate items for a language
        this.$("table-body").addEventListener("click", (event) => {
            if (!this.interactiveMode) return;
            if (!event.target.classList.contains("scheme-button")) return;
            const label = event.target;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            overlays.open("migrate-srs", "switch-scheme", {
                language: config.language,
                schemeName: config.settings.srs.scheme
            }).then((migrated) => {
                if (!migrated) return;
                label.textContent = dataManager.languageSettings
                                    .for(config.language).srs.scheme;
            });
        });
        // Functionality for downloading language content
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("content-status-label")) return
            const row = event.target.parentNode.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            if (!config.downloadReady) return;
            config.downloading = true;
            config.downloadReady = false;
            this.updateContentStatus(config);
        });
        // Functionality for setting language opened by default
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("default-language-checkbox"))
                return;
            if (event.target.checked === false) {
                event.target.checked = true;
                return;
            }
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            const defaultLanguageCheckboxes =
                this.$$("#table-body .default-language-checkbox");
            for (const checkbox of defaultLanguageCheckboxes) {
                if (checkbox.checked && checkbox !== event.target) {
                    checkbox.checked = false;
                    break;
                }
            }
            dataManager.settings.languages.default = config.language;
        });
        // Activate hidden mode for language if eye-button is clicked
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("hide-button")) return;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            const hidden = !dataManager.languageSettings
                            .for(config.language).hidden;
            dataManager.languageSettings.for(config.language).hidden = hidden;
            row.classList.toggle("hidden", hidden);
            this.settingsSubsection.broadcastLanguageSetting("visibility");
        });
        // Remove language if a remove-icon is clicked
        this.$("table-body").addEventListener("click", async (event) => {
            if (!event.target.classList.contains("remove-button")) return;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            if (this.interactiveMode) {
                const confirmed = await dialogWindow.confirm(
                    `Are you sure you want to remove the language ` +
                    `'${config.language}' and delete all its data?`);
                if (!confirmed) return;
                const languages = dataManager.languages.all.slice();
                languages.remove(config.language);
                // If the removed language is the current one, switch to another
                if (config.language === dataManager.currentLanguage) {
                    if (languages.length > 0) {
                        const switched = await main.setLanguage(languages[0]);
                        if (!switched) return;
                    }
                }
                await dataManager.languages.remove(config.language);
                const defaultLang = dataManager.settings.languages.default;
                if (config.language === defaultLang && languages.length > 0) {
                    if (languages.length === 1) {
                        // Set single remaining language as default
                        const rows = this.$("table-body").children;
                        for (const row of rows) {
                            if (this.rowToConfig.get(row).language !==
                                    config.language) {
                                row.querySelectorAll(
                                        ".default-language-checkbox")[0]
                                .checked = true;
                                dataManager.settings.languages.default =
                                    this.rowToConfig.get(row).language;
                            }
                        }
                    } else {
                        // Let user choose new default language
                        await app.initDefaultLang();
                        app.openWindow("main");
                        return;
                    }
                }
            }
            this.languageConfigs.remove(config);
            this.$("table-body").removeChild(row);
            if (this.languageConfigs.length === 0) {
                if (this.interactiveMode) {
                    await app.initLanguages();
                    await app.initDefaultLang();
                    app.openWindow("main");
                } else {
                    this.$("table").hide();
                }
            }
        });
    }

    registerCentralEventListeners() {
        events.on("update-content-status", () => {
            for (const config of this.languageConfigs) {
                this.updateContentStatus(config);
            }
        });
    }

    addTableRow(config) {
        config.downloading = networkManager.content.getDownloadStatus(
                config.language, config.settings.secondary) !== null;
        config.downloadReady = false;
        this.languageConfigs.push(config);
        const template = templates.get("language-table-entry");
        const row = utility.fragmentFromString(template(config)).children[0];
        this.$("table-body").appendChild(row);
        this.rowToConfig.set(row, config);
        this.$("table").show();
        this.contentDownloadProgressFrames.set(
            config, row.querySelector(".content-download-progress-frame"));
        this.contentDownloadProgressBars.set(
            config, row.querySelector(".content-download-progress-bar"));
        this.contentDownloadProgressTexts.set(
            config, row.querySelector(".content-download-progress-label"));
        this.contentStatusLabelFrames.set(
            config, row.querySelector(".content-status-label-frame"));
        this.contentStatusLabels.set(
            config, row.querySelector(".content-status-label"));
        this.updateRequiredIcons.set(
            config, row.querySelector(".update-required-icon"));
        this.connectingSpinners.set(
            config, row.querySelector(".connecting-spinner"));
        this.updateContentStatus(config);
    }

    async updateContentStatus(config) {
        if (this.updatingContentStatus.has(config)) return;
        this.updatingContentStatus.add(config);
        const progressFrame = this.contentDownloadProgressFrames.get(config);
        const progressBar = this.contentDownloadProgressBars.get(config);
        const progressText = this.contentDownloadProgressTexts.get(config);
        const statusFrame = this.contentStatusLabelFrames.get(config);
        const statusLabel = this.contentStatusLabels.get(config);
        const updateRequiredIcon = this.updateRequiredIcons.get(config);
        const connectingSpinner = this.connectingSpinners.get(config);
        progressFrame.hide();
        statusFrame.hide();
        connectingSpinner.show();
        updateRequiredIcon.hide();
        statusLabel.classList.remove("button");
        statusLabel.classList.remove("up-to-date");
        try {
            // If a download has already been started, continue it
            if (config.downloading) {
                const downloadStream =
                    await networkManager.content.startDownload(
                        config.language, config.settings.secondary);
                if (this.handledDownloadStreams.has(downloadStream))
                    return;
                this.handledDownloadStreams.add(downloadStream);
                const { totalSize, downloaded, percentage } =
                    networkManager.content.getDownloadStatus(
                    config.language, config.settings.secondary);
                progressBar.max = totalSize;
                progressBar.value = downloaded;
                progressText.textContent = `${percentage.toFixed(0)} %`;
                downloadStream.on("progressing", (status) => {
                    progressBar.value = status.downloaded;
                    progressText.textContent =
                        `${status.percentage.toFixed(0)} %`;
                });
                downloadStream.on("finished", () => {
                    config.downloading = false;
                    this.updateContentStatus(config);
                });
                downloadStream.on("connection-lost", () => {
                    this.updateContentStatus(config);
                });
                progressFrame.show();
            } else {
                const { updateAvailable,
                        alreadyDownloaded,
                        programUpdateRequired } =
                    await networkManager.content.getStatus(
                        config.language, config.settings.secondary);
                statusLabel.classList.remove("error");
                if (updateAvailable) {
                    if (alreadyDownloaded) {
                        statusLabel.textContent = "Update";
                    } else {
                        statusLabel.textContent = "Download";
                    }
                } else {
                    if (alreadyDownloaded) {
                        statusLabel.textContent = "Up to date";
                        statusLabel.classList.add("up-to-date");
                    } else {
                        statusLabel.textContent = "n.a.";
                    }
                }
                statusFrame.show();
                statusLabel.classList.toggle("button", updateAvailable);
                config.downloadReady = updateAvailable;
                updateRequiredIcon.toggleDisplay(programUpdateRequired);
            }
        } catch (error) {
            if (error instanceof networkManager.NoServerConnectionError ||
                    error instanceof networkManager.ServerRequestFailedError) {
                progressFrame.hide();
                statusFrame.show();
                updateRequiredIcon.hide();
                if (error instanceof networkManager.NoServerConnectionError) {
                    statusLabel.textContent = "Connection error";
                }
                if (error instanceof networkManager.ServerRequestFailedError) {
                    statusLabel.textContent = "Server error";
                }
                statusLabel.classList.add("error");
                // Frequently try to reconnect
                window.setTimeout(() => this.updateContentStatus(config),
                    this.retryContentStatusUpdateDelay);
            } else {
                throw error;
            }
        } finally {
            connectingSpinner.hide();
            this.updatingContentStatus.delete(config);
        }
    }

    clear() {
        this.languageConfigs.length = 0;
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
        }
    }
}

customElements.define("language-table", LanguageTable);
module.exports = LanguageTable;
