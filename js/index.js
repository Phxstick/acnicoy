"use strict";

const startTime = performance.now();

// Load node modules
const { clipboard } = require("electron");
const remote = require("@electron/remote");
const EventEmitter = require("events");
const Velocity = require("velocity-animate");
const Store = require("electron-store")
const storage = new Store({ name: "Settings", fileExtension: "" })
const path = require("path");

// Load modules
const basePath = remote.app.getAppPath();
const paths = require(path.resolve(
    basePath, "js", "lib", "path-manager.js"))(basePath);
const components = require(paths.componentRegister);
const dataManager = require(paths.js.lib("data-manager"))(paths);
const utility = require(paths.js.lib("utility"));
const dialogWindow = require(paths.js.lib("dialog-window"));
const layers = require(paths.js.lib("layer-manager"));
const shortcuts = require(paths.js.lib("shortcut-manager"));
const overlays = require(paths.js.lib("overlay-manager"));
const templates = require(paths.js.lib("template-manager"));
const contextMenu = require(paths.js.lib("context-menu"));
const networkManager = require(paths.js.lib("network-manager"));
const colorLib = require(paths.js.lib("color-utility"));
const View = require(paths.js.lib("view"));

// Load base classes
const Component = require(paths.js.base("component"));
const Window = require(paths.js.base("window"));
const Overlay = require(paths.js.base("overlay"));
const Section = require(paths.js.base("section"));
const Panel = require(paths.js.base("panel"));
const EditPanel = require(paths.js.base("edit-panel"));
const Widget = require(paths.js.base("widget"));
const PinwallWidget = require(paths.js.base("pinwall-widget"));
const SettingsSubsection = require(paths.js.base("settings-subsection"));

const OverlayWindow = require(paths.js.widget("overlay-window"));
const VocabSuggestionPane = require(paths.js.base("vocab-suggestion-pane"));
const KanjiSuggestionPane = require(paths.js.base("kanji-suggestion-pane"));
const HanziSuggestionPane = require(paths.js.base("hanzi-suggestion-pane"));

// Load all registered components
for (const name of components.windows) require(paths.js.window(name));
for (const name of components.overlays) require(paths.js.overlay(name));
for (const name of components.sections) require(paths.js.section(name));
for (const name of components.settingsSubsections)
    require(paths.js.settingsSubsection(name));
for (const name of components.panels) require(paths.js.panel(name));
for (const name of components.suggestionPanes)
    require(paths.js.suggestionPane(name));
for (const name of components.widgets) require(paths.js.widget(name));
for (const name of components.extensions) require(paths.js.extension(name));

const totalTime = performance.now() - startTime;
// console.log("Loaded all required modules after %f ms", totalTime);


class Application {
    constructor() {
        this.windows = {};
        this.currentWindow = null;
        const packageJson = require(paths.packageInfo);
        this.name = packageJson.name[0].toUpperCase() +
                    packageJson.name.slice(1);  // Capitalize name
        this.version = packageJson.version;
        this.description = packageJson.description;
        this.author = packageJson.author;
        this.homepage = packageJson.homepage;
    }

    quit() {
    }

    async openWindow(name, ...args) {
        this.windows[name].open(...args);
        if (this.currentWindow === name) return;
        if (this.currentWindow !== null && !this.windows[name].onTop) {
            this.closeWindow(this.currentWindow);
        }
        if (!this.windows[name].onTop) {
            this.currentWindow = name;
        }
        this.windows[name].show();
        return new Promise((resolve) => {
            this.windows[name].resolve = resolve;
        });
    }

    async closeWindow(name) {
        this.windows[name].hide();
        if (!this.windows[name].onTop)
            this.currentWindow = null;
        return this.windows[name].close();
    }

    async createWindows() {
        const windowsLoaded = [];
        for (const name of components.windows) {
            const windowName = name + "-window";
            windowsLoaded.push(customElements.whenDefined(windowName));
            this.windows[name] = document.createElement(windowName);
            this.windows[name].classList.add("window");
            document.body.appendChild(this.windows[name]);
        }
        overlays.create();
        await Promise.all(windowsLoaded);
        await utility.finishEventQueue();
    }

    async initLanguages() {
        const languages = dataManager.languages.find();
        if (languages.length === 0) {
            const configs = await this.openWindow("init-lang");
            this.openWindow("loading", "Creating language files...");
            const promises = [];
            for (const { language, settings } of configs) {
                const promise = dataManager.languages.add(language, settings);
                promises.push(promise);
                languages.push(language);
            }
            await Promise.all(promises);
            storage.set("last-opened-language", languages[0]);
        }

        // Load user data for all languages
        this.openWindow("loading", "Loading user data...");
        let start = performance.now();
        const promises = [];
        for (const language of languages) {
            promises.push(dataManager.load(language));
        }
        await Promise.all(promises);
        let total = performance.now() - start;
        // console.log("Loaded all user data after %f ms", total);
    }

    async initialize() {
        await new Promise((resolve) => { window.onload = resolve; });
        document.title = this.name;
        document.body.hide();  // Don't show anything until elements are loaded

        // Immediately initialize global data if data path is already set
        let colorScheme = "default";
        if (paths.existsDataPath()) {
            paths.init();
            await dataManager.initialize();
            await shortcuts.initialize();

            // Get design from settings (or use default if files are missing)
            const specifiedDesign = dataManager.settings.design.colorScheme;
            if (utility.existsDirectory(paths.design(specifiedDesign))) {
                colorScheme = specifiedDesign;
            }
        }

        // Create interface (using design settings if already loaded above)
        const indexStyle = document.createElement("link");
        indexStyle.rel = "stylesheet";
        indexStyle.href = `../css/${colorScheme}/index.css`;
        document.head.appendChild(indexStyle);
        await this.createWindows();
        window.main = this.windows["main"];
        Component.setStyleClass("cursor", "default");
        await utility.finishEventQueue();
        document.body.show();

        // If user data location is not set, let user choose it
        if (!paths.existsDataPath()) {
            const newPath = await this.openWindow("init-path");
            paths.setDataPath(newPath);
            await dataManager.initialize();
            await shortcuts.initialize();
        }

        // Load registered languages. If none exist, let user register new ones
        await this.initLanguages();

        // Create sections, panels and suggestion panes in main-window
        this.openWindow("loading", "Creating interface...");
        await utility.finishEventQueue();
        await Promise.all([
            main.createSections(),
            main.createPanels(),
            main.createSuggestionPanes()
        ]);
        await utility.finishEventQueue();

        // Initialize stuff in main-window
        this.openWindow("main");
    }
}

window.events = new EventEmitter();  // Communication between components
window.events.setMaxListeners(20);
window.app = new Application();
app.initialize();
