"use strict";

const path = require("path");

module.exports = function (basePath) {
    const paths = {};

    // Construct some base paths
    const home = process.env[process.platform == "win32" ?
                             "USERPROFILE" : "HOME"];
    // TODO: Change "TrainerData" to program name (+ "data" I guess)
    // TODO: Set dataPath according to settings and provide function to change
    // TODO: Read datapath out of internal settings first
    const dataPath = path.resolve(home, "Documents", "TrainerData");
    const contentPath = path.resolve(basePath, "data", "language-content");
    const langPath = path.resolve(dataPath, "Languages");
    // TODO: Call folder "data-modules"?
    const dataModulesPath = path.resolve(basePath, "js", "lib", "data-managers");

    // TODO: Reconstruct all paths if datapath has been changed

    // Global data
    paths.globalSettings = path.resolve(dataPath, "settings.json");
    paths.scoreCalculation = path.resolve(basePath, "data",
                                          "scoreCalculation.json");
    paths.data = dataPath;
    paths.languages = langPath;

    // Styles
    paths.css = (name) => path.resolve(basePath, "css", name + ".css");
    // TODO: Make fontAwesome and jQuery path version-independent?
    paths.fontAwesome = path.resolve(basePath, "font-awesome-4.5.0",
                                     "css", "font-awesome.min.css");

    // Library and extension scripts
    paths.lib = {
        jQuery: path.resolve(basePath, "js", "lib", "jquery-2.1.4.min.js"),
        utility: path.resolve(basePath, "js", "lib", "utility.js"),
        converter: path.resolve(basePath, "js", "lib", "converter.js"),
        dialogWindow: path.resolve(basePath, "js", "lib", "dialog-window.js"),
        dataManager: path.resolve(basePath, "js", "lib", "data-manager.js")
    };

    // Data interface modules
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
