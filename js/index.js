"use strict";

const globals = {
    modules: ["languages", "settings", "language-settings", "vocab-lists",
              "pinwall", "content", "vocab", "kanji", "stats", "srs",
              "test", "history", "database"],
    windows: ["init-path", "init-lang", "loading", "main"],
    overlays: ["add-lang"],
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
const { clipboard } = require("electron");
const EventEmitter = require("events");

// Load libraries
const paths = require(basePath + "/js/lib/path-manager.js")(basePath);
const dataManager = require(paths.js.lib("data-manager"))(paths);
const utility = require(paths.js.lib("utility"));
const dialogWindow = require(paths.js.lib("dialog-window"));
const layers = require(paths.js.lib("layer-manager"));
const shortcuts = require(paths.js.lib("shortcut-manager"));
const overlay = require(paths.js.lib("overlay-manager"));
const templates = require(paths.js.lib("template-manager"));
const popupMenu = require(paths.js.lib("popup-menu"));
const Velocity = require(paths.js.lib("velocity"));

// Load base classes
const Component = require(paths.js.base("component"));
const Window = require(paths.js.base("window"));
const Overlay = require(paths.js.base("overlay"));
const Section = require(paths.js.base("section"));
const Panel = require(paths.js.base("panel"));
const Widget = require(paths.js.base("widget"));

const OverlayWindow = require(paths.js.widget("overlay-window"));
const PinwallWidget = require(paths.js.widget("pinwall-widget"));

// Load everything else defined in globals object
for (let name of globals.windows) require(paths.js.window(name));
for (let name of globals.overlays) require(paths.js.overlay(name));
for (let name of globals.sections) require(paths.js.section(name));
for (let name of globals.panels) require(paths.js.panel(name));
for (let name of globals.widgets) require(paths.js.widget(name));
for (let name of globals.extensions) require(paths.js.extension(name));

const totalTime = performance.now() - startTime;
console.log("Loaded all required modules after %f ms", totalTime);

{
    window.events = new EventEmitter();  // Communication between components
    const windows = {};
    let languages;
    let standardLang;
    let currentWindow;

    function openWindow(name, closePrevious=true) {
        if (closePrevious && currentWindow !== undefined) {
            windows[currentWindow].style.display = "none";
        }
        windows[name].style.display = "block";
        currentWindow = name;
    }

    Promise.resolve().then(() => {
        // Create all windows
        const windowsLoaded = [];
        for (let name of globals.windows) {
            const windowName = name + "-window";
            windowsLoaded.push(customElements.whenDefined(windowName));
            windows[name] = document.createElement(windowName);
            windows[name].classList.add("window");
            document.body.appendChild(windows[name]);
        }
        window.main = windows["main"];
        // Create overlay windows
        overlay.create();
        return Promise.all(windowsLoaded);
    }).then(() => {
        // Load data path. If it doesn't exist, let user choose it
        if (!paths.getDataPath()) {
            openWindow("init-path");
            return windows["init-path"].getNewDataPath()
                   .then((newPath) => paths.setDataPath(newPath));
        }
    }).then(() => {
        // Find registered languages. If none exist, let user register one
        languages = dataManager.languages.find();
        if (languages.length === 0) {
            openWindow("init-lang");
            return windows["init-lang"].getNewLanguages()
                .then(([lang, secondary, settings]) =>
                    dataManager.languages.add(language, secondary, settings))
                .then((language) => { languages = [language]; });
        }
    }).then(() => {
        // Load the global settings. If the file doesn't exist, create it
        if (!utility.existsFile(paths.globalSettings)) {
            dataManager.settings.setDefault();
        }
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
        windows["loading"].setStatus("Loading language data...");
        openWindow("loading");
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
        windows["loading"].setStatus("Creating sections...");
        return Promise.all([ main.createSections(), main.createPanels() ]);
    }).then(() => {
        // Set language and initialize stuff in main-window
        main.setLanguage(standardLang);
        main.initialize(languages);
        windows["loading"].setStatus("Processing language content...");
        return main.processLanguageContent(languages);
    }).then(() => {
        openWindow("main", false);
        return utility.finishEventQueue();
    }).then(() => {
        windows["loading"].style.display = "none";
    });/*.catch((error) => {
        console.error(error);
    });*/
}
