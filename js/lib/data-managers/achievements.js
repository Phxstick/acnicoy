"use strict";

const Type = { GLOBAL: 0, LANGUAGE_LOCAL: 1, LANGUAGE_SPECIFIC: 2 };
const fs = require("fs");

module.exports = function (paths, modules) {
    let userData;
    let eventEmitter;

    // Events which might trigger unlocking of an achievement
    const triggerEventToAchievements = {
        "language-added": ["languages-registered"]
    };

    // These functions return true if achievement is unlocked for given value
    const achievementToCheckFunction = {
        "srs-items-reviewed": (value) => {
            const languages = dataManager.languages.all;
            let numTotal = 0;
            for (const language of languages) {
                numTotal += modules.stats.getNumberOfItemsTestedFor(language);
            }
            return numTotal >= value;
        },
        "languages-registered": (value) => {
            return modules.languages.all.length >= value;
        },
        "vocab-items-registered": (value) => {
            return false;
        }
    };

    // Load achievement definition data and prepare it
    const achievements = require(paths.achievements);
    for (const achievement of achievements.global) {
        achievements.definitions[achievement].type = Type.GLOBAL;
    }
    for (const achievement of achievements.languageLocal) {
        achievements.definitions[achievement].type = Type.LANGUAGE_LOCAL;
    }
    for (const language in achievements.languageSpecific) {
        for (const achievement of achievements.languageSpecific[language]) {
            achievements.definitions[achievement].type = TYPE.LANGUAGE_SPECIFIC;
            if (achievements.definitions[achievement].languages === undefined) {
                achievements.definitions[achievement].languages = new Set();
            }
            achievements.definitions[achievement].languages.add(language);
        }
    }

    function saveGlobal() {
        fs.writeFileSync(paths.achievementsUnlocked, JSON.stringify(userData));
    }

    /**
     * Check if new level for given achievement has been unlocked.
     * @param {String} achievement - ID string of the achievement to check for.
     * @returns {Promise[Boolean]} - Whether a new level has been unlocked.
     */
    async function checkForAchievement(achievement) {
        const language = modules.currentLanguage;
        const achievementType = achievements.definitions[achievement].type;
        let nextLevel = 0;
        // Cancel checking if achievement cannot be unlocked for this language
        if (achievementType === Type.LANGUAGE_SPECIFIC
              && !achievements.definitions[achievement].languages.has(language))
            return;
        if (!userData.local.hasOwnProperty(language))
            userData.local[language] = {};
        const achievementsUnlocked = achievementType === Type.GLOBAL ?
            userData.global : userData.local[language];
        // Determine next level of the achievement which is not unlocked
        if (achievementsUnlocked.hasOwnProperty(achievement)) {
            nextLevel = achievementsUnlocked[achievement].length;
        }
        const check = achievementToCheckFunction[achievement];
        const levels = achievements.definitions[achievement].levels;
        // Unlock all new levels where the check-condition is satisfied
        let newLevelUnlocked = false;
        while (nextLevel < levels.length
                && await check(levels[nextLevel].value)) {
            if (!achievementsUnlocked.hasOwnProperty(achievement)) {
                achievementsUnlocked[achievement] = [];
            }
            achievementsUnlocked[achievement].push(utility.getTime());
            newLevelUnlocked = true;
            ++nextLevel;
        }
        return newLevelUnlocked;
    }

    /**
     * Check whether new levels for any of given achievements have been
     * unlocked. If that's the case, emit events and save user data.
     * @param {Array[String]} achievementList
     */
    async function checkAchievements(achievementList) {
        const promises = [];
        for (const achievement of achievementList) {
            promises.push(checkForAchievement(achievement));
        }
        const unlocked = await Promise.all(promises);
        let anyUnlocked = false;
        for (let i = 0; i < achievementList.length; ++i) {
            if (unlocked[i] > 0) {
                anyUnlocked = true;
                const achievement = achievementList[i];
                const language = userData.global.hasOwnProperty(achievement) ?
                    undefined : modules.currentLanguage;
                const level = userData.global.hasOwnProperty(achievement) ?
                    userData.global[achievement].length :
                    userData.local[language][achievement].length;
                eventEmitter.emit(`achievement-unlocked`,
                    { achievement, level, language });
            }
        }
        if (anyUnlocked) saveGlobal();
    }

    /**
     * Return a list of information about unlocked achievements.
     * @param {Array[String]} achievementIds
     * @param {Object} unlockData
     * @returns {Array[Object]}
     */
    function getUnlockedAchievements(achievementIds, unlockData) {
        const list = [];
        for (const achievement of achievementIds) {
            if (!unlockData.hasOwnProperty(achievement)) {
                list.push({ id: achievement, levels: [] });
                continue;
            }
            const { description, levels, tiers } =
                achievements.definitions[achievement];
            const tierLevels = tiers.reduce((arr, tierSize) => {
                if (arr.length > 0) arr.push(arr.last() + tierSize);
                else arr.push(tierSize);
                return arr;
            }, []);
            const unlockedLevels = [];
            const levelsUnlocked = unlockData[achievement].length;
            for (let level = 0; level < levelsUnlocked; ++level) {
                const { name, value } = levels[level];
                let tier = 0;
                for (const tierLevel of tierLevels) {
                    if (level < tierLevel) break;
                    ++tier;
                }
                unlockedLevels.push({
                    name,
                    tier,
                    description: description.replace("{X}", value),
                    unlockDate: new Date(unlockData[achievement][level] * 1000)
                });
            }
            list.push({
                id: achievement,
                levels: unlockedLevels
            });
        }
        return list;
    }

    // ========================================================================
    // Define external interface
    // ========================================================================

    const achievementInterface = {};

    achievementInterface.initialize = function () {
        if (!fs.existsSync(paths.achievementsUnlocked)) {
            const object = { global: {}, local: {} };
            fs.writeFileSync(paths.achievementsUnlocked, JSON.stringify(object))
        }
        userData = require(paths.achievementsUnlocked);
    };
    
    achievementInterface.setEventEmitter = function (emitter) {
        eventEmitter = emitter;
        for (const event in triggerEventToAchievements) {
            emitter.on(event, () => {
                checkAchievements(triggerEventToAchievements[event]);
            });
        }
    };

    achievementInterface.checkAll = async function () {
        await checkAchievements(Object.keys(achievements.definitions));
    };

    achievementInterface.getUnlockedGlobal = function () {
        return getUnlockedAchievements(achievements.global, userData.global);
    };

    achievementInterface.getUnlockedForLanguage = function (language) {
        if (!userData.local.hasOwnProperty(language))
            return getUnlockedAchievements(achievementIds, {});
        let achievementIds = achievements.languageLocal;
        if (achievements.languageSpecific.hasOwnProperty(language)) {
            achievementIds =
                achievementIds.concat(achievements.languageSpecific[language]);
        }
        return getUnlockedAchievements(achievementIds, userData.local[language])
    };

    achievementInterface.getName = function (achievement, level) {
        return achievements.definitions[achievement].levels[level-1].name;
    };

    achievementInterface.getDescription = function (achievement, level) {
        const val = achievements.definitions[achievement].levels[level-1].value;
        const description = achievements.definitions[achievement].description;
        return description.replace("{X}", val);
    };

        // const list = [];
        // for (const achievement of achievements.global) {
        //     const { description, levels, tiers } =
        //         achievements.definitions[achievement];
        //     const tierLevels = tiers.reduce((arr, tierSize) => {
        //         if (arr.length > 0) arr.push(arr.last() + tierSize);
        //         else arr.push(tierSize);
        //         return arr;
        //     }, [0]);
        //     for (let level = 0; level < levels.length; ++level) {
        //         const { name, value } = levels[level];
        //         let tier = 0;
        //         for (const tierLevel of tierLevels) {
        //             if (level >= tierLevel) ++tier;
        //         }
        //         list.push({
        //             name,
        //             tier,
        //             description: description.replace("{X}", value),
        //             unlocked: userData.global.hasOwnProperty(achievement) ?
        //                 userData.global[achievement][level] : undefined
        //         });
        //     }
        // }
        // return list;

    return achievementInterface;
}
