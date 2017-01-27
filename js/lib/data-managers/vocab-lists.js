"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const vocabLists = {};
    const dataMap = {};

    let data;
    let wordToLists;

    // Create the JSON file for vocablists (empty object).
    vocabLists.create = function (language, settings) {
        const path = paths.languageData(language).vocabLists;
        fs.writeFileSync(path, JSON.stringify({}, null, 4));
    };

    vocabLists.load = function (language) {
        const path = paths.languageData(language).vocabLists;
        dataMap[language] = { data: require(path), wordToLists: new Map() };
        const lists = Reflect.ownKeys(dataMap[language].data);
        for (const list of lists) {
            const words = dataMap[language].data[list];
            for (const word of words) {
                if (!dataMap[language].wordToLists.has(word))
                    dataMap[language].wordToLists.set(word, []);
                if (!dataMap[language].wordToLists.get(word).includes(list))
                    dataMap[language].wordToLists.get(word).push(list);
            }
        }
    };

    vocabLists.unload = function (language) {
        delete dataMap[language];
    };

    vocabLists.setLanguage = function (language) {
        data = dataMap[language].data;
        wordToLists = dataMap[language].wordToLists;
    };

    vocabLists.save = function () {
        for (const language in dataMap) {
            const path = paths.languageData(language).vocabLists;
            fs.writeFileSync(
                    path, JSON.stringify(dataMap[language].data, null, 4));
        }
    };

    /*
     * Functions for reading lists and list contents.
     */

    vocabLists.getLists = function () {
        return Object.keys(data);
    };

    vocabLists.isWordInList = function (word, list) {
        if (!wordToLists.has(word)) return false;
        return wordToLists.get(word).includes(list);
    };

    vocabLists.getListsForWord = function (word) {
        if (!wordToLists.has(word)) return [];
        return wordToLists.get(word);
    };

    vocabLists.getWordsForList = function (list) {
        return data[list];
    };

    /*
     * Functions for renaming, deleting or adding new lists.
     */

    vocabLists.renameList = function (oldName, newName) {
        // Return false if list with new name already exists
        if (newName in data) return false;
        // Otherwise create new list with same content and delete old list
        data[newName] = data[oldName];
        delete data[oldName];
        // Also rename all occurrences in the inverted index
        for (const [word, lists] of wordToLists) {
            if (lists.includes(oldName))
                lists[lists.indexOf(oldName)] = newName;
        }
        return true;
    };

    vocabLists.createList = function (name) {
        if (name in data) return false;
        data[name] = [];
        return true;
    };

    vocabLists.deleteList = function (name) {
        delete data[name];
        // Also remove all occurrences of the list in the inverted index
        for (const [word, listNames] of wordToLists) {
            listNames.remove(name);
        }
    };

    /*
     * Functions for modifying list content.
     */

    vocabLists.addWordToList = function (word, list) {
        if (!wordToLists.has(word))
            wordToLists.set(word, []);
        if (wordToLists.get(word).includes(list))
            return false;
        wordToLists.get(word).push(list);
        data[list].push(word);
        return true;
    };

    vocabLists.removeWordFromList = function (word, list) {
        if (wordToLists.has(word)) {
            if (wordToLists.get(word).includes(list)) {
                wordToLists.get(word).remove(list);
                data[list].remove(word);
            }
        }
    };

    return vocabLists;
};
