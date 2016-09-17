"use strict";

const startTime = performance.now();
// Load node modules
const { ipcRenderer, clipboard } = require("electron");
const EventEmitter = require("events");

// TODO: Put this into main class?
const eventEmitter = new EventEmitter();

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
const utility = require(paths.lib.utility);  // Extends some objects
require(paths.lib.converter);  // Extends String, Input and TextArea
window.$ = window.jQuery = require(paths.lib.jQuery);
const dialogWindow = require(paths.lib.dialogWindow);

const TrainerSection = require("./js/trainer-section.js");
// Load widgets
// TODO: Use path manager
const PopupMenu = require(paths.widgets["popup-menu"]);
const CloseButton = require(paths.widgets["close-button"]);
const PopupStack = require(paths.widgets["popup-stack"]);
const SwitchButton = require(paths.widgets["switch-button"]);
const SwitchBar = require(paths.widgets["switch-bar"]);
const PopupList = require(paths.widgets["popup-list"]);
const SvgBarDiagram = require(paths.widgets["svg-bar-diagram"]);

const totalTime = performance.now() - startTime;
console.log("Loaded all required modules after %f ms", totalTime);

// Load data path. If it doesn't exist, let user choose it
if (!paths.getDataPath()) {
    // TODO: Path could not be found, let user set data path
    // Set to paths.standardDataPathPrefix by default
    let newPath = null;
    paths.setDataPath(newPath);
}
// TODO: Make function to load global setting and use here
//       --> Then datamanager can be loaded at top again like all other modules

// Load list of registered languages. If none exist, let user register one
const dataManager = require(paths.lib.dataManager)(paths);
const languages = dataManager.languages.find();
const standardLang = dataManager.settings["languages"]["standard"];
if (languages.length === 0) {
    // TODO: Let user register a language
    alert("No languages registered! Open init section!");
    process.exit();
}
if (!languages.contains(standardLang)) {
    alert("Standard language is not available!");
    // TODO: Display error and let user choose new standard lang
}

// Load data for all languages
const start = performance.now();
for (let language of languages) {
    dataManager.languages.load(language);
}
const total = performance.now() - startTime;
console.log("Loaded all language data after %f ms", total);

// TODO: Do this in createSections and createPanels?
// Load section and panel files
for (let name in paths.sections) {
    const link = document.createElement("link");
    link.rel = "import";
    link.href = paths.sections[name];
    document.head.appendChild(link);
}
for (let name in paths.panels) {
    const link = document.createElement("link");
    link.rel = "import";
    link.href = paths.panels[name];
    document.head.appendChild(link);
}


let main;
// Create sections and panels
$(document).ready(() => {
    // TODO: Wait until all elements are defined with new API
    setTimeout(() => {
        main = document.getElementById("main-window");
        main.createSections();
        console.log("Done creating sections!");
        main.createPanels();
        console.log("Done creating panels!");
        main.doneLoading.then(() => {
            console.log("Done loading main section!");
            main.setLanguage(standardLang);
            main.loadLanguages(languages);
            utility.finishEventQueue().then(() => {
                main.style.display = "block";
            });
        });
    }, 2000);
});

// TODO: Where to do this exactly?
// TODO: Create shortcut-manager for this
// TODO Bind help window to F1
// Add local shortcuts
registerShortcut("Ctrl+Q", () => ipcRenderer.send("quit"));
registerShortcut("Ctrl+A", () => main.openPanel(main.addVocabPanel));
registerShortcut("Ctrl+K", () => main.openPanel(main.addKanjiPanel));
registerShortcut("Ctrl+F", () => main.openSection("dictionary-section"));
registerShortcut("Ctrl+T", () => main.openTestSection);

