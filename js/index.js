"use strict";

const globals = {
    modules: ["languages", "settings", "language-settings", "vocab-lists",
              "pinwall", "content", "vocab", "kanji", "stats", "srs",
              "test", "history", "database"],
    windows: ["init-path", "init-lang", "init-default-lang", "loading", "main"],
    overlays: ["add-lang"],
    sections: ["home", "stats", /*"history",*/ "vocab", "settings",
               "test", "dictionary", "kanji"],
    panels: ["add-kanji", "edit-kanji", "add-vocab", "edit-vocab"],
    widgets: ["popup-stack", "switch-button", "switch-bar", "popup-list",
              "svg-bar-diagram", "kanji-info-panel", "pinwall-widget",
              "kanji-search-result-entry", "dictionary-search-result-entry",
              "pinwall-note", "srs-status-diagram", "language-table"],
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
    let defaultLanguage;
    let currentWindow;

    function openWindow(name, closePrevious=true) {
        if (currentWindow === name) return;
        if (closePrevious && currentWindow !== undefined) {
            closeWindow(currentWindow);
        }
        windows[name].style.display = "block";
        currentWindow = name;
    }
    
    function closeWindow(name) {
        windows[name].style.display = "none";
        currentWindow = undefined;
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
        overlay.create(); // Create overlay windows
        return Promise.all(windowsLoaded);
    }).then(() => {
        // Load data path. If it doesn't exist, let user choose it
        if (!paths.getDataPath()) {
            openWindow("init-path");
            return windows["init-path"].getNewDataPath()
                   .then((newPath) => paths.setDataPath(newPath));
        }
    }).then(() => {
        // Find registered languages. If none exist, let user register new ones
        languages = dataManager.languages.find();
        if (languages.length === 0) {
            openWindow("init-lang");
            return windows["init-lang"].getLanguageConfigs().then((configs) => {
                openWindow("loading");
                windows["loading"].setStatus("Creating language files...");
                const promises = [];
                for (let { language, settings } of configs) {
                    const p = dataManager.languages.add(language, settings);
                    promises.push(p);
                    languages.push(language);
                }
                return Promise.all(promises);
            });
        }
    }).then(() => {
        // Load the global settings. If they don't exist, create defaults
        if (utility.existsFile(paths.globalSettings)) {
            dataManager.settings.load();
        } else {
            dataManager.settings.setDefault();
        }
        defaultLanguage = dataManager.settings["languages"]["default"];
        // If no default language has been set or if it's not available...
        if (!defaultLanguage || !languages.includes(defaultLanguage)) {
            // ... if there's only one language, use it as default language
            if (languages.length === 1) {
                defaultLanguage = languages[0];
            // ... otherwise, let user choose the default language
            } else {
                openWindow("init-default-lang");
                return windows["init-default-lang"].getDefaultLang(languages)
                .then((language) => {
                    defaultLanguage = language;
                });
            }
        }
    }).then(() => {
        dataManager.settings["languages"]["default"] = defaultLanguage;
        dataManager.settings.save();
    }).then(() => {
        windows["loading"].setStatus("Loading language data...");
        openWindow("loading");
        // Load all language data
        const start = performance.now();
        const promises = [];
        for (let language of languages) {
            promises.push(dataManager.load(language));
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
        main.setLanguage(defaultLanguage);
        main.initialize(languages);
        windows["loading"].setStatus("Processing language content...");
        return main.processLanguageContent(languages);
    }).then(() => {
        openWindow("main", false);
        return utility.finishEventQueue();
    }).then(() => {
        closeWindow("loading");
    });/*.catch((error) => {
        console.error(error);
    });*/
}
