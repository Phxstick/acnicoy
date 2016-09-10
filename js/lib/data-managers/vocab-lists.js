"use strict";

module.exports = {

    _data: null,
    _path: null,
    _language: null,
    _wordToLists: null,

    load: function(path, language) {
        this._data = require(path);
        this._path = path;
        this._language = language;
        // Create inverted index mapping from words to lists which contain them
        this._wordToLists = new Map();
        for (let list in this._data) {
            const words = this._data[list];
            for (let i = 0; i < words.length; ++i) {
                const word = words[i];
                if (!this._wordToLists.has(word))
                    this._wordToLists.set(word, []);
                if (!this._wordToLists.get(word).contains(list))
                    this._wordToLists.get(word).push(list);
            }
        }
    },

    save: function() {
        fs.writeFileSync(this._path, JSON.stringify(this._data, null, 4));
    },

    /*
     * Functions for reading lists and list contents.
     */

    getLists: function() {
        return Object.keys(this._data);
    },

    isWordInList: function(word, list) {
        return this._wordToLists.get(word).contains(list);
    },

    getListsForWord: function(word) {
        if (!this._wordToLists.has(word))
            return [];
        return this._wordToLists.get(word);
    },

    getWordsForList: function(list) {
        return this._data[list];
    },

    /*
     * Functions for renaming, deleting or adding new lists.
     */

    renameList: function(oldName, newName) {
        // Return false if list with new name already exists
        if (newName in this._data) return false;
        // Otherwise create new list with same content and delete old list
        this._data[newName] = this._data[oldName];
        delete this._data[oldName];
        // Also rename all occurrences in the inverted index
        for (let [word, lists] of this._wordToLists) {
            if (lists.contains(oldName))
                lists[lists.indexOf(oldName)] = newName;
        }
        return true;
    },

    createList: function(name) {
        if (name in this._data) return false;
        this._data[name] = [];
        return true;
    },

    deleteList: function(name) {
        delete this._data[name];
        // Also remove all occurrences of the list in the inverted index
        for (let [word, listNames] of this._wordToLists) {
            listNames.remove(name);
        }
    },

    /*
     * Functions for modifying list content.
     */

    addWordToList: function(word, list) {
        if (!this._wordToLists.has(word))
            this._wordToLists.set(word, []);
        if (this._wordToLists.get(word).contains(list))
            return false;
        this._wordToLists.get(word).push(list);
        this._data[list].push(word);
        return true;
    },

    removeWordFromList: function(word, list) {
        if (this._wordToLists.has(word)) {
            if (this._wordToLists.get(word).contains(list)) {
                this._wordToLists.get(word).remove(list);
                this._data[list].remove(word);
            }
        }
    }
};
