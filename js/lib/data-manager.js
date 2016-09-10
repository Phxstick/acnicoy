"use strict";

const sqlite3 = require("sqlite3");

/*/
/   Define base paths
/*/
const home = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
const dataPath = path.resolve(home, "Documents", "TrainerData");
const contentPath = path.resolve("data");
const langPath = path.resolve(dataPath, "Languages");
const globalSettingsPath = path.resolve(dataPath, "settings.json");
const scoreCalculationPath = path.resolve("data", "scoreCalculation.json");
const dataManagersPath = path.resolve("js", "lib", "data-managers");

/*/
/   Load global settings
/*/
const settings = require(globalSettingsPath);
settings.save = () =>
    fs.writeFileSync(globalSettingsPath, JSON.stringify(settings, null, 4));

/*/
/   Create object for language specific settings
/*/
const languageSettings = {
    _path: null,
    load: function(path) {
        this._path = path;
        const data = require(path);
        for (let entry in data) {
            this[entry] = data[entry];
        }
    },
    save: function() {
        const path = this._path;
        delete this._path;
        fs.writeFileSync(this._path, JSON.stringify(this, null, 4));
        this._path = path;
    }
};

/*/
/   Create object as interface for the language databases
/*/
const trainer = {
    _database: null,
    load: function(path) { this._database = new sqlite3.Database(path); },
    query: function(query, ...params) {
      return new Promise((resolve, reject) => {
        this._database.all(query, ...params, (error, rows) => resolve(rows));
      });
    },
    run: function(statement, ...params) {
      return new Promise((resolve, reject) => {
        this._database.run(statement, ...params, resolve);
      });
    }
};

// TODO: Only load this in stats dataManager
const scoreCalculation = require(scoreCalculationPath);
Object.freeze(scoreCalculation);

/*/
/   Create objects as interfaces for various other data objects or methods
/*/
const vocabLists = require(path.resolve(dataManagersPath, "vocab-lists.js"));
const pinwall = require(path.resolve(dataManagersPath, "pinwall.js"));

const contentModule = require(path.resolve(dataManagersPath, "content.js"));
const vocabModule = require(path.resolve(dataManagersPath, "vocab.js"));
const kanjiModule = require(path.resolve(dataManagersPath, "kanji.js"));
const statsModule = require(path.resolve(dataManagersPath, "stats.js"));
const srsModule = require(path.resolve(dataManagersPath, "srs.js"));
const testModule = require(path.resolve(dataManagersPath, "test.js"));
const historyModule = require(path.resolve(dataManagersPath, "history.js"));

const content = contentModule.exports;
const vocab = vocabModule.exports;
const kanji = kanjiModule.exports;
const stats = statsModule.exports;
const srs = srsModule.exports;
const test = testModule.exports;
const history = historyModule.exports;

// Set some global variables for each module
contentModule.internals.contentPath = contentPath;
contentModule.internals.langPath = langPath;

vocabModule.internals.trainer = trainer;
vocabModule.internals.vocabLists = vocabLists;
vocabModule.internals.stats = stats;
vocabModule.internals.history = history;
vocabModule.internals.languageSettings = languageSettings;

kanjiModule.internals.trainer = trainer;
kanjiModule.internals.content = content;
kanjiModule.internals.stats = stats;
kanjiModule.internals.test = test;
kanjiModule.internals.languageSettings = languageSettings;

statsModule.internals.trainer = trainer;
statsModule.internals.languageSettings = languageSettings;
statsModule.internals.test = test;
statsModule.internals.scoreCalculation = scoreCalculation;

srsModule.internals.trainer = trainer;
srsModule.internals.test = test;
srsModule.internals.languageSettings = languageSettings;

testModule.internals.vocab = vocab;
testModule.internals.kanji = kanji;

historyModule.internals.trainer = trainer;



/*/
/   Create functions to manage and load languages
/*/
function findLanguages() {
    try {
        fs.readdirSync(dataPath);
    } catch (error) {
        if (error.errno === -2) fs.mkdirSync(dataPath);
    }
    try {
        return fs.readdirSync(langPath);
    } catch (error) {
        if (error.errno === -2) fs.mkdirSync(langPath);
        return [];
    }
}

function loadLanguage(language) {
    // Construct paths
    const trainerPath =   path.resolve(langPath, language, "Vocabulary.sqlite");
    const vocabListsPath =   path.resolve(langPath, language, "lists.json");
    const statsPath =        path.resolve(langPath, language, "stats.json");
    const pinwallPath =      path.resolve(langPath, language, "pinwall.json");
    const langSettingsPath = path.resolve(langPath, language, "settings.json");
    // Load data
    // TODO: Only give language as argument and get path from dataManager
    languageSettings.load(langSettingsPath);
    trainer.load(trainerPath);
    vocabLists.load(vocabListsPath, language);
    stats.load(statsPath, language);
    pinwall.load(pinwallPath, language);
    test.load(language);
}


/*/
/   Export everything which is public
/*/

// Data interface exports
module.exports.settings = settings;
module.exports.languageSettings = languageSettings;
module.exports.trainer = trainer;
module.exports.content = content;
module.exports.vocabLists = vocabLists;
module.exports.pinwall = pinwall;
module.exports.kanji = kanji;
module.exports.vocab = vocab;
module.exports.stats = stats;
module.exports.srs = srs;
module.exports.test = test;
module.exports.history = history;

// Language management exports
module.exports.findLanguages = findLanguages;
module.exports.loadLanguage = loadLanguage;
