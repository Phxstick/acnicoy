"use strict";

const globals = {
    modules: ["languages", "settings", "language-settings", "database",
              "vocab-lists", "pinwall", "content", "vocab", "kanji", "srs",
              "stats", "test", "history"],
    windows: ["init-path", "init-lang", "init-default-lang", "loading", "main"],
    overlays: ["add-lang", "info-dialog", "confirm-dialog", "srs-schemes",
               "migrate-srs", "choose-shortcut"],
    sections: ["home", "stats", "vocab", "settings",
               "test", "dictionary", "kanji"],
    settingsSubsections: ["languages", "test", "design"],
    panels: ["add-kanji", "edit-kanji", "add-vocab", "edit-vocab"],
    suggestionPanes: ["add-vocab"],
    widgets: ["popup-stack", "switch-button", "switch-bar", "popup-list",
              "svg-bar-diagram", "kanji-info-panel", "srs-status-bar",
              "kanji-search-result-entry", "dictionary-search-result-entry",
              "pinwall-notes", "srs-status-table", "language-table",
              "language-popup", "check-box", "example-word-entry",
              "tabbed-frame", "srs-review-schedule"],
    extensions: ["converter", "array-extensions", "html-element-extensions",
                 "event-emitter-extensions", "string-extensions"]
};

const startTime = performance.now();
// Load node modules
const { clipboard, remote } = require("electron");
const EventEmitter = require("events");
const Velocity = require("velocity-animate");

// Load modules
const basePath = remote.app.getAppPath();
const paths = require(basePath + "/js/lib/path-manager.js")(basePath);
const dataManager = require(paths.js.lib("data-manager"))(paths);
const utility = require(paths.js.lib("utility"));
const dialogWindow = require(paths.js.lib("dialog-window"));
const layers = require(paths.js.lib("layer-manager"));
const shortcuts = require(paths.js.lib("shortcut-manager"));
const overlay = require(paths.js.lib("overlay-manager"));
const templates = require(paths.js.lib("template-manager"));
const popupMenu = require(paths.js.lib("popup-menu"));
const networkManager = require(paths.js.lib("network-manager"));

// Load base classes
const Component = require(paths.js.base("component"));
const Window = require(paths.js.base("window"));
const Overlay = require(paths.js.base("overlay"));
const Section = require(paths.js.base("section"));
const Panel = require(paths.js.base("panel"));
const Widget = require(paths.js.base("widget"));
const PinwallWidget = require(paths.js.base("pinwall-widget"));
const SettingsSubsection = require(paths.js.base("settings-subsection"));

const OverlayWindow = require(paths.js.widget("overlay-window"));

// Load everything else defined in globals object
for (const name of globals.windows) require(paths.js.window(name));
for (const name of globals.overlays) require(paths.js.overlay(name));
for (const name of globals.sections) require(paths.js.section(name));
for (const name of globals.settingsSubsections)
    require(paths.js.settingsSubsection(name));
for (const name of globals.panels) require(paths.js.panel(name));
for (const name of globals.suggestionPanes)
    require(paths.js.suggestionPane(name));
for (const name of globals.widgets) require(paths.js.widget(name));
for (const name of globals.extensions) require(paths.js.extension(name));

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
        windows[name].show();
        currentWindow = name;
    }
    
    function closeWindow(name) {
        windows[name].hide();
        currentWindow = undefined;
    }
    
    new Promise((resolve) => {
        window.onload = resolve;
    }).then(() => {
        // Create all windows
        const windowsLoaded = [];
        for (const name of globals.windows) {
            const windowName = name + "-window";
            windowsLoaded.push(customElements.whenDefined(windowName));
            windows[name] = document.createElement(windowName);
            windows[name].classList.add("window");
            document.body.appendChild(windows[name]);
        }
        window.main = windows["main"];
        overlay.create(); // Create overlay windows
        return Promise.all(windowsLoaded)
        .then(utility.finishEventQueue);
    }).then(() => {
        // Load data path. If it doesn't exist, let user choose it
        if (!paths.getDataPath()) {
            openWindow("init-path");
            return windows["init-path"].getNewDataPath()
                   .then((newPath) => paths.setDataPath(newPath));
        }
    }).then(() => {
        // Load the global settings. If they don't exist, create defaults
        if (utility.existsFile(paths.globalSettings)) {
            dataManager.settings.load();
        } else {
            dataManager.settings.setDefault();
        }
        shortcuts.initialize();
        // Load registered srs-schemes
        dataManager.srs.loadSchemes();
        // Find registered languages. If none exist, let user register new ones
        languages = dataManager.languages.find();
        if (languages.length === 0) {
            openWindow("init-lang");
            return windows["init-lang"].getLanguageConfigs().then((configs) => {
                openWindow("loading");
                windows["loading"].setStatus("Creating language files...");
                const promises = [];
                for (const { language, settings } of configs) {
                    const p = dataManager.languages.add(language, settings);
                    promises.push(p);
                    languages.push(language);
                }
                return Promise.all(promises);
            });
        }
    }).then(() => {
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
        for (const language of languages) {
            promises.push(dataManager.load(language));
        }
        return Promise.all(promises).then(() => {
            const total = performance.now() - startTime;
            console.log("Loaded all language data after %f ms", total);
        });
    }).then(() => {
        // Create sections, panels and suggestion panes in main-window
        windows["loading"].setStatus("Creating interface...");
        return Promise.all([
            main.createSections(),
            main.createPanels(),
            main.createSuggestionPanes()
        ]);
    }).then(() => {
        // Display main window but don't hide loading window yet
        openWindow("main", false);
        // Set language and initialize stuff in main-window
        return main.setLanguage(defaultLanguage).then(() => {
            main.initialize();
            windows["loading"].setStatus("Processing language content...");
            return main.processLanguageContent(languages);
        });
    }).then(() => {
        // Load any character in kanji info panel to render stuff there
        // (Prevents buggy animation when first opening the panel)
        if (dataManager.content.isAvailable["Japanese"]) {
            main.kanjiInfoPanel.load("字");
        }
        return utility.finishEventQueue();
    }).then(() => {
        closeWindow("loading");
    });
}
