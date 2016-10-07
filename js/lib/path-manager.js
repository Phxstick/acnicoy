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

    // JS
    const jsPath = path.resolve(basePath, "js");
    const baseClassPath = path.resolve(jsPath, "base");
    const windowsPath = path.resolve(jsPath, "windows");
    const sectionsPath = path.resolve(jsPath, "sections");
    const panelsPath = path.resolve(jsPath, "panels");
    const widgetsPath = path.resolve(jsPath, "widgets");
    const librariesPath = path.resolve(jsPath, "lib");
    const extensionsPath = path.resolve(jsPath, "extensions");
    const dataModulesPath = path.resolve(librariesPath, "data-managers");
    paths.js = {
        "base": (name) => path.resolve(baseClassPath, name + ".js"),
        "window": (name) => path.resolve(windowsPath, name + "-window.js"),
        "section": (name) => path.resolve(sectionsPath, name + "-section.js"),
        "panel": (name) => path.resolve(panelsPath, name + "-panel.js"),
        "widget": (name) => path.resolve(widgetsPath, name + ".js"),
        "lib": (name) => path.resolve(librariesPath, name + ".js"),
        "extension": (name) => path.resolve(extensionsPath, name + ".js"),
        "dataModule": (name) => path.resolve(dataModulesPath, name + ".js")
    };

    // HTML
    const htmlPath = path.resolve(basePath, "html");
    paths.html = {
        "window": (name) => path.resolve(htmlPath, name + "-window.html"),
        "section": (name) => path.resolve(htmlPath, name + "-section.html"),
        "panel": (name) => path.resolve(htmlPath, name + "-panel.html"),
        "widget": (name) => path.resolve(htmlPath, name + ".html")
    }

    // Templates
    const templatePath = path.resolve(basePath, "templates");
    paths.template = (name) => path.resolve(templatePath, name + ".handlebars");

    // CSS
    paths.css = (name) => path.resolve(basePath, "css", name + ".css");
    paths.layers = path.resolve(basePath, "css", "layers.css");
    paths.fontAwesome = path.resolve(basePath, "font-awesome",
                                     "css", "font-awesome.min.css");

    // Language data
    paths.languageData = (language) => ({
        database: path.resolve(langPath, language, "Vocabulary.sqlite"),
        vocabLists: path.resolve(langPath, language, "lists.json"),
        stats: path.resolve(langPath, language, "stats.json"),
        pinwall: path.resolve(langPath, language, "pinwall.json"),
        settings: path.resolve(langPath, language, "settings.json")
    });

    // Language content
    const contentRegister = {
        "Japanese": {
            "English": {
                database: "Japanese-English.sqlite3",
                kanjiStrokes: "kanji-strokes.json",
                numbers: "numeric-kanji.json",
                counters: "counter-kanji.json",
                dictCodeToText: "dict-code-to-text.json"
            }
        }
    };
    const contentPath = path.resolve(basePath, "data", "language-content");

    // Return null if content for given language pair is not available,
    // otherwise return an object mapping resource names to absolute paths
    paths.content = (language, secondaryLanguage) => {
        const p = path.resolve(contentPath, language + "-" + secondaryLanguage);
        if (!utility.existsDirectory(p))
            return null;
        const resourcePaths = contentRegister[language][secondaryLanguage];
        for (let resource in resourcePaths)
            resourcePaths[resource] = path.resolve(p, resourcePaths[resource]);
        return resourcePaths;
    };

    return paths;
};
