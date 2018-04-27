"use strict";

module.exports = function (paths, modules) {
    const content = {};
    const dataMap = {};
    let data;

    content.isAvailableFor = (language, secondary) => {
        return dataMap.hasOwnProperty(`${language}-${secondary}`);
    };

    content.isAvailable = () => {
        const language = modules.currentLanguage;
        const secondaryLanguage = modules.currentSecondaryLanguage;
        return dataMap.hasOwnProperty(`${language}-${secondaryLanguage}`);
    };

    content.get = (language, secondary) => {
        return dataMap[`${language}-${secondary}`];
    };

    content.load = function (language) {
        const secondaryLanguage =
            modules.languageSettings.getFor(language, "secondaryLanguage");
        const contentPaths = paths.content(language, secondaryLanguage);
        const languagePair = `${language}-${secondaryLanguage}`;
        if (!utility.existsDirectory(contentPaths.directory)) {
            // Content not available
            return;
        }
        const contentModulePath = paths.js.contentModule(languagePair);
        if (!utility.existsFile(contentModulePath)) {
            dataMap[languagePair] = {};
            return Promise.resolve();
        } else {
            return require(contentModulePath)(paths, contentPaths, modules)
            .then((contentModule) => {
                dataMap[languagePair] = contentModule;
            });
        }
    };

    content.unload = function (language) {
        const secondaryLanguage =
            modules.languageSettings.getFor(language, "secondaryLanguage");
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
