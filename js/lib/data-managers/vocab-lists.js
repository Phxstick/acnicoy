"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const vocabLists = {};
    const dataMap = {};
    const isModified = {};

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
        isModified[language] = false;
    };

    vocabLists.unload = function (language) {
        delete dataMap[language];
        delete isModified[language];
    };

    vocabLists.setLanguage = function (language) {
        data = dataMap[language].data;
        wordToLists = dataMap[language].wordToLists;
    };

    vocabLists.save = function (language) {
        if (!isModified[language]) return;
        const path = paths.languageData(language).vocabLists;
        fs.writeFileSync(path, JSON.stringify(dataMap[language].data, null, 4));
        isModified[language] = false;
    };

    // =====================================================================
    // Getting list names and list contents
    // =====================================================================

    vocabLists.getLists = function () {
        return Object.keys(data);
    };

    vocabLists.isWordInList = function (word, list) {
        if (!wordToLists.has(word)) return false;
        return wordToLists.get(word).includes(list);
    };

    vocabLists.getListsForWord = function (word) {
        if (!wordToLists.has(word)) return [];
        return [...wordToLists.get(word)];
    };

    vocabLists.getWordsForList = function (list) {
        return [...data[list]];
    };

    // =====================================================================
    // Renaming, deleting or adding new lists
    // =====================================================================

    vocabLists.existsList = function (name) {
        return name in data;
    };

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
        isModified[modules.currentLanguage] = true;
        return true;
    };

    vocabLists.createList = function (name) {
        if (name in data) return false;
        data[name] = [];
        isModified[modules.currentLanguage] = true;
        return true;
    };

    vocabLists.deleteList = function (name) {
        delete data[name];
        // Also remove all occurrences of the list in the inverted index
        for (const [word, listNames] of wordToLists) {
            listNames.remove(name);
        }
        isModified[modules.currentLanguage] = true;
    };

    // =====================================================================
    // Modifying list content
    // =====================================================================

    vocabLists.addWordToList = function (word, list) {
        if (!wordToLists.has(word))
            wordToLists.set(word, []);
        if (wordToLists.get(word).includes(list))
            return false;
        wordToLists.get(word).push(list);
        data[list].push(word);
        isModified[modules.currentLanguage] = true;
        return true;
    };

    vocabLists.removeWordFromList = function (word, list) {
        if (!wordToLists.has(word)) return;
        if (!wordToLists.get(word).includes(list)) return;
        wordToLists.get(word).remove(list);
        data[list].remove(word);
        isModified[modules.currentLanguage] = true;
        return true;
    };

    // =====================================================================
    // Searching for lists or searching lists
    // =====================================================================

    vocabLists.searchForList = function (query) {
        query = query.toLowerCase();
        const startMatches = [];
        const otherMatches = [];
        for (const name in data) {
            if (name.toLowerCase().startsWith(query)) startMatches.push(name);
            else if (name.toLowerCase().includes(query)) otherMatches.push(name)
        }
        startMatches.sort();
        otherMatches.sort();
        return [...startMatches, ...otherMatches];
    };

    vocabLists.searchList = async function (listName, query) {
        const searchResult = await modules.vocab.search(query);
        const wordsInList = new Set(vocabLists.getWordsForList(listName));
        return searchResult.filter((word) => wordsInList.has(word));
    };

    return vocabLists;
};
