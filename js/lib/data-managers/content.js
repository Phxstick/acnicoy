"use strict";

const compareVersions = require("compare-versions");

module.exports = function (paths, modules) {
    const content = {};
    const dataMap = {};
    let data;

    content.isAvailableFor = (language, secondary) => {
        const contentPaths = paths.content(language, secondary);
        return utility.existsDirectory(contentPaths.directory);
    };

    content.isCompatibleFor = (language, secondary) => {
        return !content.updateRequired(language, secondary) &&
               !content.programUpdateRequired(language, secondary);
    };
    
    content.updateRequired = (language, secondary) => {
        const languagePair = `${language}-${secondary}`;
        const minVersions = require(paths.minContentVersions)[languagePair];
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
        return content.isLoadedFor(language, secondaryLanguage) &&
               !!content.get(language, secondaryLanguage).dictionaryAvailable;
    };

    content.get = (language, secondary) => {
        return dataMap[`${language}-${secondary}`];
    };

    content.load = async function (language) {
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
