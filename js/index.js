"use strict";

// Load node modules
const ipcRenderer = require("electron").ipcRenderer;
const clipboard = require("clipboard");
const EventEmitter = require("events");

// Define functions for registering shortcuts (Put these into main later?)
const registerShortcut = (shortcut, callback) => {
    unregisterShortcut(shortcut);
    ipcRenderer.send("shortcut", shortcut, true);
    ipcRenderer.on(shortcut, callback);
};
const unregisterShortcut = (shortcut) => {
    ipcRenderer.send("shortcut", shortcut, false);
};
// Define a shortcut to force exit as early as possible
registerShortcut("Ctrl+Esc", () => ipcRenderer.send("close-now"));

// Load libraries
const paths = require("./js/lib/path-manager.js")(__dirname);
const dataManager = require(paths.lib.dataManager)(paths);
const utility = require(paths.lib.utility);  // Extends some objects
require(paths.lib.converter);  // Extends String, Input and TextArea
window.$ = window.jQuery = require(paths.lib.jQuery);
const dialogWindow = require(paths.lib.dialogWindow);

// Load widgets
const TrainerSection = require("./js/trainer-section.js");
const PopupMenu = require("./js/widgets/popup-menu.js");
const CloseButton = require("./js/widgets/close-button.js");
const PopupStack = require("./js/widgets/popup-stack.js");
const SwitchButton = require("./js/widgets/switch-button.js");
const SwitchBar = require("./js/widgets/switch-bar.js");
const PopupList = require("./js/widgets/popup-list.js");
const SvgBarDiagram = require("./js/widgets/svg-bar-diagram.js");


const eventEmitter = new EventEmitter(); // TODO: Put this into main class

class TrainerMain {
    constructor() {
        // TODO: Get rid of this (Use when instantiating instead?)
        $(document).ready(() => {
            // Store important DOM elements as members
            this.statusText = document.getElementById("status-text");
            this.filter = document.getElementById("filter");
            this.numSrsItemsLabel = document.getElementById("num-srs-items");
            // Language stuff
            const languages = dataManager.languages.find();
            if (languages.length === 0) {
                alert("No languages registered! Open init section!");
                process.exit();
            }
            for (let language of languages) {
                dataManager.languages.load(language);
            }
            // Register sections
            this.sections = {};
            const sections = document.getElementsByClassName("section");
            let numSections = 0;
            for (let i = 0; i < sections.length; ++i) {
                this.sections[sections[i].tagName.toLowerCase()] = sections[i];
                ++numSections;
            }
            this.currentSection = null;
            // Register panels
            this.panels = {};
            let numPanels = 0;
            const panels = document.getElementsByClassName("panel");
            for (let i = 0; i < panels.length; ++i) {
                this.panels[panels[i].tagName.toLowerCase().slice(0, -6)]
                    = panels[i];
                ++numPanels;
            }
            // TODO: Use panels object instead for everything?
            this.addVocabPanel = document.querySelector("add-vocab-panel");
            this.addKanjiPanel = document.querySelector("add-kanji-panel");
            this.editVocabPanel = document.querySelector("edit-vocab-panel");
            this.editKanjiPanel = document.querySelector("edit-kanji-panel");
            this.kanjiInfoPanel = document.querySelector("kanji-info-panel");
            this.currentPanel = null;
            // Get status bar and language popup
            this.statusBar = document.getElementById("status-text");
            this.languagePopup = document.getElementById("language-popup");
            // Once all sections are done loading, do initialization work
            let doneLoading = 0;
            eventEmitter.on("done-loading", () => {
                doneLoading++;
                if (doneLoading === numSections + numPanels) {
                    // Set standard language as current language
                    const standardLang = dataManager.settings["languages"]["standard"];
                    if (languages.contains(standardLang)) {
                        this.setLanguage(standardLang);
                        // dataManager.importSrs();  // TODO
                    } else {
                        alert("Standard language is not available!");
                        process.exit(); // TODO: Does this exit even work?
                    }
                    this.fillLanguagePopup(languages);
                    this.languagePopup.callback = (_, index) => {
                        if (this.language === languages[index]) return;
                        this.setLanguage(languages[index]);
                    };
                    // Open home section and undisplay all others
                    $(".section").css("display", "none");
                    this.sections["home-section"].style.display = "block";
                    this.sections["home-section"].open();
                    this.currentSection = "home-section";
                    // Update test button with amount of words to be tested
                    this.updateTestButton();
                    setInterval(() => {
                        this.updateTestButton();
                        this.fillLanguagePopup(languages);
                    }, 300000);  // Every 5 min
                    // $("#loading-frame").fadeOut();
                }
            });
            // Top menu button events
            $("#exit-button").click(() => ipcRenderer.send("quit"));
            $("#home-button").click(() => this.openSection("home-section"));
            $("#stats-button").click(() => this.openSection("stats-section"));
            $("#vocab-button").click(() => this.openSection("vocab-section"));
            $("#history-button").click(() =>
                    this.openSection("history-section"));
            $("#settings-button").click(() =>
                    this.openSection("settings-section"));
            // Sidebar button events
            $("#add-vocab-button").click(() =>
                    this.openPanel(this.addVocabPanel));
            $("#add-kanji-button").click(() =>
                    this.openPanel(this.addKanjiPanel));
            let openTestSection = () => {
                // Update label and open section if there are items to test
                // [ Somehow move this test to test section lateron? ]
                this.updateTestButton().then(() => {
                    if (parseInt(this.numSrsItemsLabel.textContent) > 0)
                        this.openSection("test-section");
                    else
                        this.updateStatus("There are currently no items " +
                                          "scheduled for testing!");
                });
            };
            $("#test-button").click(openTestSection);
            $("#dictionary-button").click(() =>
                    this.openSection("dictionary-section"));
            $("#find-kanji-button").click(() =>
                    this.openSection("kanji-section"));
            // Add local shortcuts
            registerShortcut("Ctrl+Q", () => ipcRenderer.send("quit"));
            registerShortcut("Ctrl+A", () => this.openPanel(this.addVocabPanel));
            registerShortcut("Ctrl+K", () => this.openPanel(this.addKanjiPanel));
            registerShortcut("Ctrl+F", () =>
                    this.openSection("dictionary-section"));
            registerShortcut("Ctrl+T", openTestSection);
            // registerShortcut("Ctrl+D", () => ipcRenderer.send("open-debug"));
            // ... Bind help section to F1
            ipcRenderer.on("closing-window", () => {
                if (this.sections[this.currentSection].confirmClose()) {
                    this.sections[this.currentSection].close();
                    dataManager.vocabLists.save();
                    ipcRenderer.send("close-now");
                }
            });
        });
    }
    openSection(section) {
        if (this.currentSection == section) return;
        if (!this.sections[this.currentSection].confirmClose()) return;
        this.sections[this.currentSection].close();
        $(this.sections[this.currentSection]).fadeOut(() => {
            $(this.sections[this.currentSection]).css("display", "none");
            this.sections[section].open();
            $(this.sections[section]).fadeIn();
        });
        this.currentSection = section;
    }
    openPanel(panel) {
        const currentPanel = this.currentPanel;
        if (currentPanel !== null) {
            this.closePanel(currentPanel, currentPanel === panel);
            if (currentPanel === panel) return;
        }
        panel.style.zIndex = 30;
        this.currentPanel = panel;
        panel.open();
        $(this.filter).fadeIn();
        $(panel).animate({ left: "0px" });
        // TODO: Do opening animations here? Possible (different widths, ...)?
    }
    // TODO: Use default args here
    closePanel(panel, noNew) {
        $(panel).animate({ left: "-400px" }, () => panel.close());
        panel.style.zIndex = 20;
        if (noNew) {
            this.currentPanel = null;
            $(this.filter).fadeOut();
        }
    }
    updateStatus(text) {
        this.statusText.fadeOut(300);
        this.statusText.textContent = text;
        this.statusText.fadeIn(300);
    }
    updateTestButton() {
        return dataManager.srs.getTotalAmountScheduled().then((count) =>
            this.numSrsItemsLabel.textContent = `${count} items`);
    }
    fillLanguagePopup(languages) {
        // TODO: Get srs counts for each language, then display in braces here
        // return dataManager.srs.getTotalAmountScheduled().then((count) => {
            this.languagePopup.clear();
            for (let i = 0; i < languages.length; ++i) {
                this.languagePopup.appendItem(languages[i]);
                if (languages[i] === this.language) {
                    this.languagePopup.set(i);
                }
            }
        // });
    }
    adjustToLanguage(language, secondary) {
        if (language === "Japanese") {
            if (document.getElementById("find-kanji-button").style.display ==
                    "none") {
            $("#find-kanji-button").show();
            $("#add-kanji-button").show();
            }
        } else {
            $("#find-kanji-button").hide();
            $("#add-kanji-button").hide();
        }
        this.updateTestButton();
    }
    setLanguage(language) {
        if (this.currentSection !== null) {
            if (!this.sections[this.currentSection].confirmClose()) return;
            this.sections[this.currentSection].close();
        }
        dataManager.languages.setCurrent(language);
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
    }
}

const main = new TrainerMain();
