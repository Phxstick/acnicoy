"use strict";

const path = require("path");
const fs = require("fs");

module.exports = function (basePath) {
    const paths = {};

    const home = process.env[process.platform == "win32" ?
                                 "USERPROFILE" : "HOME"];
    const trainerName = "Acnicoy";
    const dataPathBaseName = trainerName + "Data";
    const dataPathConfigFile = path.resolve(basePath, "data", "data-path.txt");
    paths.standardDataPathPrefix = path.resolve(home, "Documents");
    let dataPath = null;
    let langPath = null;

    // Try to load path for user data, return true if path could be loaded
    paths.getDataPath = function () {
        let prefix;
        try {
            prefix = fs.readFileSync(dataPathConfigFile, { encoding: "utf-8" });
            if (prefix[prefix.length - 1] == "\n")
                prefix = prefix.slice(0, prefix.length - 1);
        } catch (error) {
            return false;
        }
        paths.setDataPath(prefix);
        return true;
    }
    
    // Set a path for folder to store user data in
    paths.setDataPath = function (prefix) { 
        fs.writeFileSync(dataPathConfigFile, prefix);
        paths.data = dataPath = path.resolve(prefix, dataPathBaseName);
        paths.languages = langPath = path.resolve(dataPath, "Languages");
        paths.globalSettings = path.resolve(dataPath, "settings.json");
        // Create folder if it doesn't exists yet
        try {
            fs.readdirSync(dataPath);
        } catch (error) {
            if (error.errno === -2) fs.mkdirSync(dataPath);
        }
    };

    // Global data
    paths.scoreCalculation = path.resolve(basePath, "data",
                                          "scoreCalculation.json");

    // HTML
    const sectionsPath = path.resolve(basePath, "html", "sections");
    paths.sections = {
        "home-section": path.resolve(sectionsPath, "home-section.html"),
        "stats-section": path.resolve(sectionsPath, "stats-section.html"),
        "history-section": path.resolve(sectionsPath, "history-section.html"),
        "vocab-section": path.resolve(sectionsPath, "vocab-section.html"),
        "settings-section": path.resolve(sectionsPath, "settings-section.html"),
        "test-section": path.resolve(sectionsPath, "test-section.html"),
        "dictionary-section": path.resolve(sectionsPath,
                                           "dictionary-section.html"),
        "kanji-section": path.resolve(sectionsPath, "kanji-section.html")
    };
    const panelsPath = path.resolve(basePath, "html", "panels");
    paths.panels = {
        "add-vocab-panel": path.resolve(panelsPath, "add-vocab-panel.html"),
        "add-kanji-panel": path.resolve(panelsPath, "add-kanji-panel.html"),
        "edit-vocab-panel": path.resolve(panelsPath, "edit-vocab-panel.html"),
        "edit-kanji-panel": path.resolve(panelsPath, "edit-kanji-panel.html"),
        "kanji-info-panel": path.resolve(panelsPath, "kanji-info-panel.html")
    };

    // Styles
    paths.css = (name) => path.resolve(basePath, "css", name + ".css");
    paths.layers = path.resolve(basePath, "css", "layers.css");
    // TODO: Make fontAwesome and jQuery path version-independent?
    paths.fontAwesome = path.resolve(basePath, "font-awesome-4.5.0",
                                     "css", "font-awesome.min.css");

    // Library and extension scripts
    paths.lib = {
        jQuery: path.resolve(basePath, "js", "lib", "jquery-2.1.4.min.js"),
        utility: path.resolve(basePath, "js", "lib", "utility.js"),
        converter: path.resolve(basePath, "js", "lib", "converter.js"),
        dialogWindow: path.resolve(basePath, "js", "lib", "dialog-window.js"),
        dataManager: path.resolve(basePath, "js", "lib", "data-manager.js"),
        layerManager: path.resolve(basePath, "js", "lib", "layer-manager.js")
    };

    // Custom widget scripts
    const widgetsPath = path.resolve(basePath, "js", "widgets");
    paths.widgets = {
        "popup-menu": path.resolve(widgetsPath, "popup-menu.js"),
        "popup-stack": path.resolve(widgetsPath, "popup-stack.js"),
        "switch-button": path.resolve(widgetsPath, "switch-button.js"),
        "switch-bar": path.resolve(widgetsPath, "switch-bar.js"),
        "popup-list": path.resolve(widgetsPath, "popup-list.js"),
        "svg-bar-diagram": path.resolve(widgetsPath, "svg-bar-diagram.js")
    };

    // Data interface modules
    // TODO: Call folder "data-modules"?
    const dataModulesPath = path.resolve(basePath, "js", "lib","data-managers");
    paths.modules = {
        languages: path.resolve(dataModulesPath, "languages.js"),
        settings: path.resolve(dataModulesPath, "settings.js"),
        languageSettings: path.resolve(dataModulesPath, "language-settings.js"),
        vocabLists: path.resolve(dataModulesPath, "vocab-lists.js"),
        pinwall: path.resolve(dataModulesPath, "pinwall.js"),
        content: path.resolve(dataModulesPath, "content.js"),
        vocab: path.resolve(dataModulesPath, "vocab.js"),
        kanji: path.resolve(dataModulesPath, "kanji.js"),
        stats: path.resolve(dataModulesPath, "stats.js"),
        srs: path.resolve(dataModulesPath, "srs.js"),
        test: path.resolve(dataModulesPath, "test.js"),
        history: path.resolve(dataModulesPath, "history.js"),
        database: path.resolve(dataModulesPath, "database.js")
    };

    // Language data
    paths.languageData = (language) => ({
        database: path.resolve(langPath, language, "Vocabulary.sqlite"),
        vocabLists: path.resolve(langPath, language, "lists.json"),
        stats: path.resolve(langPath, language, "stats.json"),
        pinwall: path.resolve(langPath, language, "pinwall.json"),
        settings: path.resolve(langPath, language, "settings.json")
    });

    // Language content
    const contentPath = path.resolve(basePath, "data", "language-content");
    const japEngPath = path.resolve(contentPath, "Japanese-English");
    paths.content = {
        "Japanese-English": {
            database: path.resolve(japEngPath, "Japanese-English.sqlite3"),
            kanjiStrokes: path.resolve(japEngPath, "kanji-strokes.json"),
            numbers: path.resolve(japEngPath, "numeric-kanji.json"),
            counters: path.resolve(japEngPath, "counter-kanji.json")
        }
    };

    return paths;
};
