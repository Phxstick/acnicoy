"use strict";

const globals = {
    modules: ["languages", "settings", "language-settings", "vocab-lists",
                 "pinwall", "content", "vocab", "kanji", "stats", "srs",
                 "test", "history", "database"],
    panels: ["add-kanji", "edit-kanji", "add-vocab", "edit-vocab"],
    sections: ["home", "stats", "history", "vocab", "settings",
               "test", "dictionary", "kanji"]
};

const startTime = performance.now();
// Load node modules
const { ipcRenderer, clipboard } = require("electron");
const EventEmitter = require("events");

// TODO: Use this for languages init section and settings
// const languageList = require("languages");
// for (let langcode of languageList.getAllLanguageCode()) {
//     console.log(languageList.getLanguageInfo(langcode));
// }

// TODO: Put this into main class?
const eventEmitter = new EventEmitter();
ipcRenderer.on("closing-window", () => ipcRenderer.send("close-now"));

// Load libraries
const paths = require("./js/lib/path-manager.js")(__dirname);
const dataManager = require(paths.lib("data-manager"))(paths);
const utility = require(paths.lib("utility"));
const dialogWindow = require(paths.lib("dialog-window"));
const layers = require(paths.lib("layer-manager"));
const templates = require(paths.lib("template-manager"));
const Velocity = require(paths.lib("velocity"));

// Load libraries extending existing objects
require(paths.extension("converter"));
require(paths.extension("array-extensions"));
require(paths.extension("html-element-extensions"));

// Load components
const Component = require(paths.js.component("component"));
const Window = require(paths.js.component("window"));
const Section = require(paths.js.component("section"));
const Panel = require(paths.js.component("panel"));
const Widget = require(paths.js.component("widget"));

// Load windows
const MainWindow = require(paths.js.window("main"));
const InitWindow = require(paths.js.window("init"));

// Load widgets
const PopupMenu = require(paths.js.widget("popup-menu"));
const PopupStack = require(paths.js.widget("popup-stack"));
const SwitchButton = require(paths.js.widget("switch-button"));
const SwitchBar = require(paths.js.widget("switch-bar"));
const PopupList = require(paths.js.widget("popup-list"));
const SvgBarDiagram = require(paths.js.widget("svg-bar-diagram"));
const KanjiInfoPanel = require(paths.js.widget("kanji-info-panel"));
const KanjiSearchResultEntry =
    require(paths.js.widget("kanji-search-result-entry"));

const PinwallWidget = require(paths.js.widget("pinwall-widget"));
const PinwallNote = require(paths.js.widget("pinwall-note"));
const SrsStatusDiagram = require(paths.js.widget("srs-status-diagram"));

const totalTime = performance.now() - startTime;
console.log("Loaded all required modules after %f ms", totalTime);

// TODO: Put all of this in a closure
let main;  // TODO: Really fine as global object? Rather pass it to sections?
let mainWindow;
let initWindow;

Promise.all([
    // Make sure the windows are all loaded
    new Promise((r) => window.addEventListener("DOMContentLoaded", r)),
    customElements.whenDefined("main-window"),
    customElements.whenDefined("init-window")
]).then(() => {
    // Get windows as DOM Elements
    mainWindow = document.getElementById("main-window");
    initWindow = document.getElementById("init-window");
    main = mainWindow;
}).then(() => {
    // Load data path. If it doesn't exist, let user choose it
    if (!paths.getDataPath()) {
        return initWindow.getNewDataPath()
               .then((newPath) => paths.setDataPath(newPath));
    }
}).then(() => {
    // Load list of registered languages. If none exist, let user register one
    const languages = dataManager.languages.find();
    if (languages.length === 0) {
        return initWindow.getNewLanguages()
            .then(([lang, secondary, settings]) =>
                dataManager.languages.add(language, secondary, settings))
            .then((language) => [language]);
    }
    return languages;
}).then((languages) => {
    dataManager.settings.load();
    const standardLang = dataManager.settings["languages"]["standard"];
    // If no standard language has been set yet
    if (!standardLang) {
        if (languages.length === 1) {
            // Set the one given language as standard
            dataManager.settings["languages"]["standard"] = languages[0];
        } else {
            // TODO: Let user choose one as standard language
        }
    }
    return [languages, standardLang];
    // TODO: Don't forget to save settings in all cases. Maybe later?
    // if (!languages.contains(standardLang)) {
    //     alert("Standard language is not available!");
    //     // TODO: Display error and let user choose new standard lang?
    // }
}).then(([languages, standardLang]) => {
    // TODO: At this point, initialization is done --> Display loading window
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
        return [languages, standardLang];
    });
}).then(([languages, standardLang]) => {
    // Create sections and panels in main-window
    main.createSections();
    main.createPanels();
    return main.doneLoading.then(() => [languages, standardLang]);
}).then(([languages, standardLang]) => {
    // Set language and initialize stuff in main-window
    main.setLanguage(standardLang);
    main.loadLanguages(languages);
    return utility.finishEventQueue();
}).then(() => {
    // Finally display main-window
    main.style.display = "block";
    // TODO: Where to do this exactly?
    // TODO: Create shortcut-manager for this
    // TODO Bind help window to F1
    // Add local shortcuts
    // Define functions for registering shortcuts (Put these into main later?)
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
    // Define a shortcut to force exit
    registerShortcut("Ctrl+Esc", () => ipcRenderer.send("close-now"));
    return utility.finishEventQueue();
}).then(() => {
    // TODO: Now undisplay loading-window again
});/*.catch((error) => {
    console.error(error);
});*/
