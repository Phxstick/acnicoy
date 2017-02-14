"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");

module.exports = function (basePath) {
    const paths = {};

    const trainerName = "Acnicoy";
    const dataPathBaseName = trainerName + "Data";
    const dataPathConfigFile = path.resolve(basePath, "data", "data-path.txt");
    paths.standardDataPathPrefix = path.resolve(os.homedir(), "Documents");
    let dataPath = null;
    let langPath = null;
    let backupsPath = null;
    let downloadsPath = null;
    let contentPath = null;

    // Try to load path for user data, return true if path could be loaded
    paths.getDataPath = function () {
        let prefix;
        try {
            prefix = fs.readFileSync(dataPathConfigFile, "utf8");
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
        paths.downloads = downloadsPath = path.resolve(dataPath, "Downloads");
        paths.backups = backupsPath = path.resolve(dataPath, "Backups");
        paths.globalSettings = path.resolve(dataPath, "settings.json");
        paths.srsSchemes = path.resolve(dataPath, "srs-schemes.json")
        contentPath = path.resolve(dataPath, "Content");
        // Create folder and subfolders if it doesn't exists yet
        try {
            fs.readdirSync(dataPath);
        } catch (error) {
            if (error.errno === -2) {
                fs.mkdirSync(dataPath);
                fs.mkdirSync(langPath);
                fs.mkdirSync(backupsPath);
                fs.mkdirSync(downloadsPath);
                fs.mkdirSync(contentPath);
            }
        }
    };

    // Global data
    paths.scoreCalculation = path.resolve(basePath, "data",
                                          "score-calculation.json");
    paths.defaultSettings = path.resolve(basePath, "data",
                                         "default-settings.json");
    paths.defaultSrsSchemes = path.resolve(basePath, "data",
                                           "default-srs-schemes.json");
    paths.img = {
        programIcon: path.resolve(basePath, "img", "icon.png")
    };

    // JS
    const jsPath = path.resolve(basePath, "js");
    const baseClassPath = path.resolve(jsPath, "base");
    const windowsPath = path.resolve(jsPath, "windows");
    const overlaysPath = path.resolve(jsPath, "overlays");
    const sectionsPath = path.resolve(jsPath, "sections");
    const settingsSubsectionsPath = path.resolve(
        sectionsPath, "settings-subsections");
    const panelsPath = path.resolve(jsPath, "panels");
    const suggestionPanesPath = path.resolve(jsPath, "suggestion-panes");
    const widgetsPath = path.resolve(jsPath, "widgets");
    const librariesPath = path.resolve(jsPath, "lib");
    const extensionsPath = path.resolve(jsPath, "extensions");
    const dataModulesPath = path.resolve(librariesPath, "data-managers");
    paths.js = {
        "base": (name) => path.resolve(baseClassPath, name + ".js"),
        "window": (name) => path.resolve(windowsPath, name + "-window.js"),
        "overlay": (name) => path.resolve(overlaysPath, name + "-overlay.js"),
        "section": (name) => path.resolve(sectionsPath, name + "-section.js"),
        "settingsSubsection": (name) => path.resolve(
            settingsSubsectionsPath, name + "-settings-subsection"),
        "panel": (name) => path.resolve(panelsPath, name + "-panel.js"),
        "suggestionPane": (name) => path.resolve(
            suggestionPanesPath, name + "-suggestion-pane.js"),
        "widget": (name) => path.resolve(widgetsPath, name + ".js"),
        "lib": (name) => path.resolve(librariesPath, name + ".js"),
        "extension": (name) => path.resolve(extensionsPath, name + ".js"),
        "dataModule": (name) => path.resolve(dataModulesPath, name + ".js")
    };

    // HTML
    const htmlPath = path.resolve(basePath, "html");
    paths.html = (name) => path.resolve(htmlPath, name + ".html");

    // Templates
    const templatePath = path.resolve(basePath, "templates");
    paths.template = (name) => path.resolve(templatePath, name + ".hbs");

    // CSS
    paths.css = (name) => path.resolve(basePath, "css", name + ".css");
    paths.layers = path.resolve(basePath, "css", "layers.css");
    paths.fontAwesome = path.resolve(basePath, "font-awesome",
                                     "css", "font-awesome.min.css");

    // Language data
    paths.languageData = (language) => ({
        directory: path.resolve(langPath, language),
        database: path.resolve(langPath, language, "Vocabulary.sqlite"),
        vocabLists: path.resolve(langPath, language, "lists.json"),
        stats: path.resolve(langPath, language, "stats.json"),
        pinwall: path.resolve(langPath, language, "pinwall.json"),
        settings: path.resolve(langPath, language, "settings.json")
    });

    // Language data backup
    paths.newBackup = () => {
        const id = fs.readdirSync(paths.backups).length;
        const currentDate = new Date();
        const day = currentDate.getDate();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const backupDir = path.resolve(backupsPath, [
            id.toString().padStart(5, "0"),
            year.toString().padStart(4, "0"),
            month.toString().padStart(2, "0"),
            day.toString().padStart(2, "0")
        ].join("-"));
        return { directory: backupDir,
                 infoFile: path.resolve(backupDir, "info.json") };
    };

    // Language content
    const contentRegister = {
        "Japanese": {
            "English": {
                database: "Japanese-English.sqlite3",
                kanjiStrokes: "kanji-strokes.json",
                numbers: "numeric-kanji.json",
                counters: "counter-kanji.json",
                dictCodeToText: "dict-code-to-text.json",
                kokujiList: "kokuji.txt"
            }
        }
    };

    // Return null if content for given language pair is not available,
    // otherwise return an object mapping resource names to absolute paths
    paths.content = (language, secondaryLanguage) => {
        const p = path.resolve(contentPath, language + "-" + secondaryLanguage);
        if (!utility.existsDirectory(p))
            return null;
        const resourcePaths = contentRegister[language][secondaryLanguage];
        for (const resource in resourcePaths)
            resourcePaths[resource] = path.resolve(p, resourcePaths[resource]);
        return resourcePaths;
    };

    // Download related
    paths.downloadDataPart = (filename) => {
        return path.resolve(downloadsPath, filename + ".part");
    };
    paths.downloadData = (filename) => {
        return path.resolve(downloadsPath, filename); 
    };
    paths.downloadDataOffset = (filename) => {
        return path.resolve(downloadsPath, filename + ".offset"); 
    };

    return paths;
};
