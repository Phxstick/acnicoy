"use strict";

const { compareVersions } = require("compare-versions");

module.exports = function (paths, modules) {
    const minContentVersions = require(paths.minContentVersions);
    const content = {};
    const dataMap = {};
    let data;

    const languagesWithDictionary = new Set(["Japanese", "Chinese"])

    content.isAvailableFor = (language, secondary) => {
        const contentPaths = paths.content(language, secondary);
        return utility.existsDirectory(contentPaths.directory);
    };

    content.isCompatibleFor = (language, secondary) => {
        return !content.updateRequired(language, secondary) &&
               !content.programUpdateRequired(language, secondary);
    };
    
    content.updateRequired = (language, secondary) => {
        const minVersions = minContentVersions[language][secondary];
        const curVersions = require(paths.content(language, secondary).versions)
        for (const file in minVersions) {
            if (!curVersions.hasOwnProperty(file) ||
                    compareVersions(curVersions[file], minVersions[file]) == -1)
                return true;
        }
        return false;
    };

    content.programUpdateRequired = (language, secondary) => {
        const curProgramVersion = require(paths.packageInfo).version;
        const minProgramVersions =
            require(paths.content(language, secondary).minProgramVersions);
        for (const file in minProgramVersions) {
            if (compareVersions(curProgramVersion,minProgramVersions[file])==-1)
                return true;
        }
        return false;
    };

    content.isLoadedFor = (language, secondary) => {
        return dataMap.hasOwnProperty(`${language}-${secondary}`);
    };

    content.isLoaded = () => {
        const language = modules.currentLanguage;
        const secondaryLanguage = modules.currentSecondaryLanguage;
        return content.isLoadedFor(language, secondaryLanguage);
    };

    content.isDictionaryAvailable = () => {
        const language = modules.currentLanguage;
        const secondaryLanguage = modules.currentSecondaryLanguage;
        return content.isAvailableFor(language, secondaryLanguage) &&
            languagesWithDictionary.has(language)
    }

    content.isDictionaryLoaded = () => {
        return content.isLoaded() && !!data.containsDictionary;
    }

    content.get = (language, secondary) => {
        return dataMap[`${language}-${secondary}`];
    };

    content.load = async function (language) {
        if (language === undefined) language = modules.currentLanguage
        const secondaryLanguage =
            modules.languageSettings.getFor(language, "secondaryLanguage");
        if (!content.isAvailableFor(language, secondaryLanguage) ||
            !content.isCompatibleFor(language, secondaryLanguage)) return;
        const contentPaths = paths.content(language, secondaryLanguage);
        const languagePair = `${language}-${secondaryLanguage}`;
        const contentModulePath = paths.js.contentModule(languagePair);
        dataMap[languagePair] = !utility.existsFile(contentModulePath) ? {} :
            await require(contentModulePath)(paths, contentPaths, modules);
    };

    content.unload = function (language, secondaryLanguage) {
        const languagePair = `${language}-${secondaryLanguage}`;
        if (dataMap.hasOwnProperty(languagePair)) {
            delete dataMap[languagePair];
        }
    };

    content.setLanguage = function (language) {
        const secondaryLanguage =
            modules.languageSettings.getFor(language, "secondaryLanguage");
        const languagePair = `${language}-${secondaryLanguage}`;
        data = dataMap[languagePair];
    };

    /**
     * Given an object with query information, return a list of ids of matching
     * dictionary entries. Exact matches are prioritized.
     * This internally uses a function called "searchFunction" that must be
     * implemented in the language-specific code module. It takes the query
     * and an arbitrary options object as arguments and returns a list of
     * matching entries of the form { id, translations }.
     * @param {Object} query - Object of form { translations, words }.
     * @returns {Array}
     */
    content.searchDictionary = async function (query, options={}) {
        // Check if search function is implemented
        if (data.searchFunction === undefined) {
            const l1 = modules.currentLanguage;
            const l2 = modules.currentSecondaryLanguage;
            throw new Error("Language-specific search function could not " +
                `be found for the language pair '${l1}' -> '${l2}'.`)
        }
        // If query is empty, return an empty list
        if (Object.keys(query).length === 0)
            return [];
        // Add missing query fields (to make following code simpler)
        if (query.translations === undefined)
            query.translations = [];
        if (query.words === undefined)
            query.words = [];
        // Convert wildcards * and ? to % and _ for SQL pattern matching
        const replace = (t) => t.replace(/[*]/g, "%").replace(/[?]/g, "_");
        query.translations = query.translations.map(replace);
        query.words = query.words.map(replace);
        if (options.exactMatchesOnly) {
            // If any query field contains a wildcard at the start or end
            // (or both sides), do not prioritize exact matches for that field.
            const exactMatchesQuery = { words: [], translations: [] };
            for (const reading of query.words) {
                if (!reading.startsWith("%") && !reading.endsWith("%")) {
                    exactMatchesQuery.words.push(reading.replace(/[%_]/g, ""));
                }
            }
            for (const translation of query.translations) {
                if (!translation.startsWith("%") && !translation.endsWith("%")){
                    exactMatchesQuery.translations.push(
                        translation.replace(/[%_]/g, ""));
                }
            }
            let matches = await data.searchFunction(exactMatchesQuery, options)
            return matches.map(row => row.id)

        }
        const originalQuery = {
            translations: query.translations,
            words: query.words
        };
        // Add wildcard to both sides of each translation
        query.translations = query.translations.map(
            (t) => (t.startsWith("%")?"":"%") + t + (t.endsWith("%")?"":"%"));
        // Add wildcard to end of words/readings if there's none at beginning
        query.words = query.words.map(
            (r) => r.startsWith("%") ? r : r + (r.endsWith("%")?"":"%"));
        // Execute search function
        let allMatches = await data.searchFunction(query, options);
        allMatches = allMatches.map(m => ({
            ...m, id: m.id, translations: m.translations.split(";"),
            readings: m.readings ? m.readings.split(";") : []
        }))
        // Sort matches depending on how well they match the query
        //// console.log(allMatches.length)
        //// console.time("sorting-matches")
        allMatches = utility.sortMatches(allMatches, {
            translations: originalQuery.translations[0],
            word: originalQuery.words.length ? originalQuery.words[0] : "",
            readings: originalQuery.words.length ? originalQuery.words[0] : ""
        }, modules.currentLanguage, modules.currentSecondaryLanguage)
        //// console.timeEnd("sorting-matches")
        // Return IDs only
        return allMatches.map(row => row.id)
    }

    return new Proxy(content, {
        get: (target, key) => {
            if (data !== undefined && Reflect.has(data, key)) return data[key];
            else return target[key];
        },
        set: (target, key, value) => {
            throw new Error("You cannot dynamically add more content!");
        }
    });
};
