"use strict";

const globals = {
    modules: ["languages", "settings", "language-settings", "vocab-lists",
              "pinwall", "content", "vocab", "kanji", "stats", "srs",
              "test", "history", "database"],
    windows: ["init", "loading", "main"],
    sections: ["home", "stats", "history", "vocab", "settings",
               "test", "dictionary", "kanji"],
    panels: ["add-kanji", "edit-kanji", "add-vocab", "edit-vocab"],
    widgets: ["popup-stack", "switch-button", "switch-bar", "popup-list",
              "svg-bar-diagram", "kanji-info-panel", "pinwall-widget",
              "kanji-search-result-entry", "dictionary-search-result-entry",
              "pinwall-note", "srs-status-diagram"],
    extensions: ["converter", "array-extensions", "html-element-extensions"]
};

const startTime = performance.now();
// Load node modules
const { ipcRenderer, clipboard, remote } = require("electron");
const { Menu, MenuItem } = remote;
const EventEmitter = require("events");
const languageList = require("languages");

// TODO: Use this for languages init section and settings
// for (let langcode of languageList.getAllLanguageCode()) {
//     console.log(languageList.getLanguageInfo(langcode));
// }

// TODO: Put this into main class?
const eventEmitter = new EventEmitter();
// TODO: Make immediately closeable by default, until signal sent
ipcRenderer.on("closing-window", () => ipcRenderer.send("close-now"));

// Load libraries
const paths = require("./js/lib/path-manager.js")(__dirname);
const dataManager = require(paths.js.lib("data-manager"))(paths);
const utility = require(paths.js.lib("utility"));
const dialogWindow = require(paths.js.lib("dialog-window"));
const layers = require(paths.js.lib("layer-manager"));
const templates = require(paths.js.lib("template-manager"));
const Velocity = require(paths.js.lib("velocity"));
const PopupMenu = require(paths.js.lib("popup-menu"));

// Load base classes
const Component = require(paths.js.base("component"));
const Window = require(paths.js.base("window"));
const Section = require(paths.js.base("section"));
const Panel = require(paths.js.base("panel"));
const Widget = require(paths.js.base("widget"));
const PinwallWidget = require(paths.js.widget("pinwall-widget"));

for (let name of globals.windows) require(paths.js.window(name));
for (let name of globals.sections) require(paths.js.section(name));
for (let name of globals.panels) require(paths.js.panel(name));
for (let name of globals.widgets) require(paths.js.widget(name));
for (let name of globals.extensions) require(paths.js.extension(name));

const totalTime = performance.now() - startTime;
console.log("Loaded all required modules after %f ms", totalTime);


let main;
{
    let mainWindow;
    let initWindow;
    let loadingWindow;
    let languages;
    let standardLang;

    Promise.all([
        // Make sure the windows are all loaded
        new Promise((r) => window.addEventListener("DOMContentLoaded", r)),
        customElements.whenDefined("init-window"),
        customElements.whenDefined("loading-window"),
        customElements.whenDefined("main-window")
    ]).then(() => {
        // Get windows as DOM Elements
        mainWindow = document.getElementById("main-window");
        initWindow = document.getElementById("init-window");
        loadingWindow = document.getElementById("loading-window");
        main = mainWindow;
    }).then(() => {
        // Load data path. If it doesn't exist, let user choose it
        if (!paths.getDataPath()) {
            return initWindow.getNewDataPath()
                   .then((newPath) => paths.setDataPath(newPath));
        }
    }).then(() => {
        // Find registered languages. If none exist, let user register one
        languages = dataManager.languages.find();
        if (languages.length === 0) {
            return initWindow.getNewLanguages()
                .then(([lang, secondary, settings]) =>
                    dataManager.languages.add(language, secondary, settings))
                .then((language) => { languages = [language]; });
        }
    }).then(() => {
        dataManager.settings.load();
        standardLang = dataManager.settings["languages"]["standard"];
        // If no standard language has been set yet
        if (!standardLang) {
            if (languages.length === 1) {
                // Set the one given language as standard
                dataManager.settings["languages"]["standard"] = languages[0];
            } else {
                // TODO: Let user choose one as standard language
            }
        }
        // TODO: Don't forget to save settings in all cases. Maybe later?
        // if (!languages.includes(standardLang)) {
        //     alert("Standard language is not available!");
        //     // TODO: Display error and let user choose new standard lang?
        // }
    }).then(() => {
        loadingWindow.setStatus("Loading language data...");
        loadingWindow.style.display = "block";
        initWindow.style.display = "none";
        // Load all language data
        const start = performance.now();
        const promises = [];
        for (let language of languages) {
            promises.push(dataManager.languages.load(language));
        }
        return Promise.all(promises).then(() => {
            const total = performance.now() - startTime;
            console.log("Loaded all language data after %f ms", total);
        });
    }).then(() => {
        // Create sections and panels in main-window
        loadingWindow.setStatus("Creating sections...");
        return Promise.all([ main.createSections(), main.createPanels() ]);
    }).then(() => {
        // Set language and initialize stuff in main-window
        main.setLanguage(standardLang);
        main.initialize(languages);
    }).then(() => {
        // Create content-related stuff in advance
        loadingWindow.setStatus("Processing language content...");
        return main.processLanguageContent(languages);
    }).then(() => {
        // Render main-window
        main.style.display = "block";
        // TODO: Where to do this exactly?
        // TODO: Create shortcut-manager for this
        // TODO Bind help window to F1
        // Add local shortcuts
        // Define functions for registering shortcuts
        window.registerShortcut = (shortcut, callback) => {
            unregisterShortcut(shortcut);
            ipcRenderer.send("shortcut", shortcut, true);
            ipcRenderer.on(shortcut, callback);
        };
        window.unregisterShortcut = (shortcut) => {
            ipcRenderer.send("shortcut", shortcut, false);
        };
        registerShortcut("Ctrl+Q", () => ipcRenderer.send("quit"));
        registerShortcut("Ctrl+A", () => main.openPanel("add-vocab"));
        registerShortcut("Ctrl+K", () => main.openPanel("add-kanji"));
        registerShortcut("Ctrl+F", () => main.openSection("dictionary"));
        registerShortcut("Ctrl+T", () => main.openTestSection());
        // Define a shortcut to force exit (TODO: Remove later)
        registerShortcut("Ctrl+Esc", () => ipcRenderer.send("close-now"));
        return utility.finishEventQueue();
    }).then(() => {
        loadingWindow.style.display = "none";
    });/*.catch((error) => {
        console.error(error);
    });*/
}
