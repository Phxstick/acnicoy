"use strict";

const fs = require("fs").promises;
const parseCsv = require("neat-csv");
const Random = require("random-js");

module.exports = function (paths, modules) {
    const importFuncs = { };

    /**
     * Parse the given CSV file and return a list of items ready to be added
     * for the given language. Also return a list of warnings if a line
     * contains missing/invalid data. Return null if file could not be parsed.
     */
    importFuncs.parseCsvFile = async function (filepath, { dataType,
            fieldSeparator="\t", itemSeparator=";", levelsStartAtZero=false }) {
        const data = await fs.readFile(filepath, "utf8");
        let rows;
        try {
            rows = await parseCsv(data, { separator: fieldSeparator });
        } catch (error) {
            return null;
        }
        const items = [];
        const warnings = [];
        for (let i = 0; i < rows.length; ++i) {

            // Choose the right function for parsing each item according to type
            let parseFunc;
            if (dataType === "vocab") {
                parseFunc = parseVocabItem;
            } else if (dataType === "kanji") {
                parseFunc = parseKanjiItem;
            } else if (dataType === "hanzi") {
                parseFunc = parseHanziItem;
            } else if (dataType === "Houhou") {
                const itemType = getValue(rows[i], "Item Type");
                if (itemType === "v") {
                    parseFunc = parseVocabItem;
                } else if (itemType === "k") {
                    parseFunc = parseKanjiItem;
                } else {
                    warnings.push(`Line ${i}: error: encountered unrecognized `+
                                  `item type '${itemType}'.`);
                    continue;
                }
            }

            // Parse the item and catch errors (to output them later)
            try {
                const item = await parseFunc(
                    rows[i], itemSeparator, levelsStartAtZero);
                items.push(item);
            } catch (error) {
                warnings.push(error);//`Line ${i}: error: ${error.message}`);
            }
        }
        return { items, warnings };
    }

    /**
     * Given a list of items returned from the function `parseCsvFile`,
     * add those items to the vocabulary. Creates a user data backup first.
     */
    importFuncs.importItems = async function (items,
            { tagsToLists=true, order="first-is-oldest", addToList,
              batchSize=10, batchSpacing="3 days" }) {
        await modules.createBackup({ event: "import",
                                     language: modules.currentLanguage });
        if (addToList && !modules.vocabLists.existsList(addToList)) {
            modules.vocabLists.createList(addToList);
        }
        const numLevels = modules.srs.currentScheme.numLevels;
        const intervals = [-1, ...modules.srs.currentScheme.intervals];

        // Apply chosen order
        if (order === "first-is-newest") {
            items.reverse();
        } else if (order === "shuffle") {
            Random.shuffle(Random.engines.nativeMath, items);
        }

        for (const item of items) {
            if (item.type === "vocab") {
                if ("level" in item) {
                    if (item.level > numLevels)
                        item.level = numLevels;
                    if (item.level === numLevels) // && !("reviewDate" in item))
                        item.reviewDate =
                            utility.timeSpanStringToSeconds("infinity");
                } else if ("reviewDate" in item) {
                    let level = 1;
                    while (level < intervals.length - 1 &&
                            item.reviewDate > intervals[level]) ++level;
                    item.level = level;
                } else {
                    // TODO: put item into next batch
                    item.level = 1;
                }
                await modules.vocab.add(item);

                // Add item to specified vocabulary lists
                if (tagsToLists && "tags" in item) {
                    for (const tag of item.tags) {
                        if (!modules.vocabLists.existsList(tag)) {
                            modules.vocabLists.createList(tag);
                        }
                        modules.vocabLists.addWordToList(item.word, tag);
                    }
                }
                if (addToList) {
                    modules.vocabLists.addWordToList(item.word, addToList);
                }
            } else if (item.type === "kanji" || item.type === "hanzi") {
                for (const attribute in item.levels) {
                    const level = item.levels[attribute];
                    if (level > numLevels)
                        item.levels[attribute] = numLevels;
                    if (level === numLevels) {  // && !("reviewDate" in item)) {
                        item.reviewDates[attribute] =
                            utility.timeSpanStringToSeconds("infinity");
                    }
                }
                for (const attribute in item.reviewDates) {
                    if (!(attribute in item.levels)) {
                        let level = 1;
                        while (level < intervals.length - 1 &&
                                item.reviewDates[attribute] > intervals[level])
                            ++level;
                        item.levels[attribute] = level;
                    }
                }
                if (Object.keys(item.levels).length === 0 &&
                        Object.keys(item.reviewDates).length === 0) {
                    // TODO: put item into next batch
                    for (const attribute in item.values) {
                        item.levels[attribute] = 1;
                    }
                }
                if (item.type === "kanji") await modules.kanji.add(item);
                else if (item.type === "hanzi") await modules.hanzi.add(item);
            }
        }
    }

    /**
     * Check if given object contains one of given keys (case insensitive,
     * spaces can be omitted or replaced with underscores or hyphens).
     * If a key is found, return its value, else null.
     */
    function getValue(object, keys) {
        if (!Array.isArray(keys)) keys = [keys];
        const keyMap = {};
        for (const key in object)
            keyMap[key.toLowerCase()] = key;
        for (const key of keys) {
            const lowKey = key.toLowerCase();
            if (lowKey in keyMap)
                return object[keyMap[lowKey]];
            if (lowKey.replace(/ /g, "") in keyMap)
                return object[keyMap[lowKey.replace(/ /g, "")]];
            if (lowKey.replace(/ /g, "-") in keyMap)
                return object[keyMap[lowKey.replace(/ /g, "-")]];
            if (lowKey.replace(/ /g, "_") in keyMap)
                return object[keyMap[lowKey.replace(/ /g, "_")]];
        }
        return null;
    }

    /**
     * Given a row of a CSV file containing the raw data of a vocabulary item,
     * return the item as an object that is ready to be added to the vocabulary.
     * Might throw an error if data is missing or of an unknown format.
     * @param {Object} data
     * @param {String} itemSeparator - Used to separate meanings and readings.
     * @param {Boolean} levelsStartAtZero
     */
    function parseVocabItem(data, itemSeparator, levelsStartAtZero) {
        const vocabItem = { type: "vocab" };
        let value;

        // Parse word
        value = getValue(data, ["Kanji Reading", "Word", "Term", "Expression"]);
        if (!value) throw Error("The word is missing.");
        vocabItem.word = value.trim();

        // Parse meanings
        value = getValue(data, ["Accepted Meanings","Meanings","Translations"]);
        vocabItem.translations = !value ? [] : value.split(itemSeparator)
                // Unicode 8218 comma is replaced with standard 44 comma
                .map(t => t.trim().replace(/‚/g, ",").replace(/;/g, ","))
                .filter(t => t.length > 0);

        // Parse readings
        value = getValue(data, ["Accepted Readings", "Readings", "Yomi"]);
        vocabItem.readings = !value ? [] : value.split(itemSeparator)
                .map(r => r.trim().replace(/;/g, ","))
                .filter(r => r.length > 0 && r !== vocabItem.word);

        // Check if there's at least one meaning/reading (guaranteed in Houhou)
        if (!vocabItem.translations.length && !vocabItem.readings.length) {
            throw Error("The word must have at least one meaning or reading.");
        }

        // Parse notes
        value = getValue(data, ["Notes", "Meaning Notes"]);
        vocabItem.notes = !value ? [] : value.split(";")
                .map(note => note.trim()).filter(note => note.length > 0);
        value = getValue(data, ["Reading Notes"]);
        if (value) vocabItem.notes = vocabItem.notes.concat(value.split(";")
                .map(note => note.trim()).filter(note => note.length > 0));

        // Parse optional creation date
        value = getValue(data, ["Creation Date", "Date Added"]);
        if (value) vocabItem.creationDate = isNaN(value) ?
                parseInt(Date.parse(value) / 1000) : parseInt(value);

        // Parse SRS level
        value = getValue(data, ["SRS Level", "Level", "Grade"]);
        if (value) vocabItem.level = parseInt(value) + levelsStartAtZero;

        // Parse next review date
        value = getValue(data, ["Review Date", "Next Review Date"]);
        if (value) vocabItem.reviewDate = isNaN(value) ?
                parseInt(Date.parse(value) / 1000) : parseInt(value);
        
        // Parse review stats
        value = getValue(data, ["Mistake Count", "SRS Failure Count"]);
        if (value) vocabItem.mistakeCount = parseInt(value);
        value = getValue(data, ["Correct Count", "SRS Success Count"]);
        if (value) vocabItem.correctCount = parseInt(value);

        // Parse dictionary ID
        value = getValue(data, ["Dictionary ID"]);
        if (value) vocabItem.dictionaryId = parseInt(value);

        // Parse tags (= vocabulary lists)
        value = getValue(data, ["Vocab Lists", "Tags"]);
        if (value) vocabItem.tags = value.split(itemSeparator)
                                    .map(tag => tag.trim());

        return vocabItem;
    };

    /**
     * Like the function "parseVocabItem", but for kanji.
     */
    async function parseKanjiItem(data, itemSeparator, levelsStartAtZero) {
        const kanjiItem = { type: "kanji", values: {}, levels: {},
                reviewDates: {}, correctCounts: {}, mistakeCounts: {} };
        let value;

        // Parse kanji
        value = getValue(data, ["Kanji", "Kanji Reading"]);
        if (!value) throw Error("The kanji is missing.");
        kanjiItem.kanji = value.trim();

        // Parse meanings
        value = getValue(data, ["Accepted Meanings", "Meanings"]);
        kanjiItem.values.meanings = !value ? [] : value.split(itemSeparator)
                // Unicode 8218 comma is replaced with standard 44 comma
                .map(m => m.trim().replace(/‚/g, ",").replace(/;/g, ","))
                .filter(m => m.length > 0);

        // Parse on yomi
        value = getValue(data, ["On Yomi", "On Reading", "On"]);
        kanjiItem.values.on_yomi = !value ? [] : value.split(itemSeparator)
                .map(r => r.trim().replace(/;/g, ","))
                .filter(r => r.length > 0);

        // Parse kun yomi
        value = getValue(data, ["Kun Yomi", "Kun Reading", "Kun"]);
        kanjiItem.values.kun_yomi = !value ? [] : value.split(itemSeparator)
                .map(r => r.trim().replace(/;/g, ","))
                .filter(r => r.length > 0);

        // Parse readings (in case they're mixed together like in Houhou SRS)
        value = getValue(data, ["Accepted Readings", "Readings", "Yomi"]);
        const readings = !value ? [] : value.split(itemSeparator)
                         .map(r => r.trim().replace(/;/g, ","))
                         .filter(r => r.length > 0);
        let knownOnYomi;
        let knownKunYomi;

        // If content is loaded, get known on- and kun-yomi for this kanji first
        if (modules.content.isLoadedFor("Japanese", "English")) {
            const content = modules.content.get("Japanese", "English");
            const isKnownKanji = await content.isKnownKanji(kanjiItem.kanji);
            if (isKnownKanji) {
                const kanjiInfo = await content.getKanjiInfo(kanjiItem.kanji);
                knownOnYomi = new Set(kanjiInfo.onYomi.map(y => y.toRomaji()));
                knownKunYomi = new Set(kanjiInfo.kunYomi.map(y => y.toRomaji()))
            }
        }
        // For each reading, try to determine whether it's an on- or kun-yomi
        for (const reading of readings) {
            const romajiReading = reading.toRomaji();

            // If content is available, convert to romaji and compare with known
            if (knownOnYomi && knownOnYomi.has(romajiReading)) {
                kanjiItem.values.on_yomi.push(romajiReading.toKana("katakana"));
                continue;
            }
            if (knownKunYomi && knownKunYomi.has(romajiReading)) {
                kanjiItem.values.kun_yomi.push(romajiReading.toKana("hiragana"))
                continue;
            }

            // If the reading contains a dot, it should be a kun-yomi
            if (reading.includes(".")) {
                kanjiItem.values.kun_yomi.push(
                    romajiReading.toKana("hiragana"));
                continue;
            }

            // Else, assign based on whether its written in hiragana or katakana
            let readingAssigned = false;
            for (const char of reading) {
                const codePoint = char.codePointAt(0);
                if (codePoint >= 12353 && codePoint < 12439) {
                    kanjiItem.values.kun_yomi.push(
                        romajiReading.toKana("hiragana"));
                    readingAssigned = true;
                    break;
                } else if (codePoint >= 12449 && codePoint < 12539) {
                    kanjiItem.values.on_yomi.push(
                        romajiReading.toKana("katakana"));
                    readingAssigned = true;
                    break;
                }
            }

            // If the reading doesn't contain kana, treat as kun-yomi by default
            if (!readingAssigned) {
                kanjiItem.values.kun_yomi.push(romajiReading.toKana("hiragana"))
            }
        }

        // Check if there's at least one value among meanings and readings
        if (!kanjiItem.values.on_yomi.length &&
                !kanjiItem.values.kun_yomi.length &&
                !kanjiItem.values.meanings.length) {
            throw Error("The kanji must have at least one meaning or reading.");
        }

        // Parse creation date
        value = getValue(data, ["Creation Date", "Date Added"]);
        if (value) kanjiItem.creationDate = isNaN(value) ?
                parseInt(Date.parse(value) / 1000) : parseInt(value);

        // Parse SRS level (if there's just one, assign it to all details)
        value = getValue(data, ["SRS Level", "Level", "Grade"]);
        if (value) {
            kanjiItem.levels.meanings = parseInt(value) + levelsStartAtZero;
            kanjiItem.levels.kun_yomi = parseInt(value) + levelsStartAtZero;
            kanjiItem.levels.on_yomi = parseInt(value) + levelsStartAtZero;
        }

        // Parse SRS level for each detail if provided
        value = getValue(data, ["Meanings SRS Level", "Meanings Level",
                                "Meanings SRS-Level"]);
        if (value) kanjiItem.levels.meanings = parseInt(value)+levelsStartAtZero
        value = getValue(data, ["On Yomi SRS Level", "On Yomi Level",
                                "On-Yomi SRS Level", "On-Yomi SRS-Level",
                                "On-Yomi Level"]);
        if (value) kanjiItem.levels.on_yomi = parseInt(value)+levelsStartAtZero
        value = getValue(data, ["Kun Yomi SRS Level", "Kun Yomi Level",
                                "Kun-Yomi SRS Level", "Kun-Yomi SRS-Level",
                                "Kun-Yomi Level"]);
        if (value) kanjiItem.levels.kun_yomi = parseInt(value)+levelsStartAtZero

        // Parse next review date (if there's just one, assign to all details)
        value = getValue(data, ["Review Date", "Next Review Date"]);
        if (value) {
            value = isNaN(value) ?
                parseInt(Date.parse(value) / 1000) : parseInt(value);
            kanjiItem.reviewDates.meanings = value;
            kanjiItem.reviewDates.on_yomi = value;
            kanjiItem.reviewDates.kun_yomi = value;
        }

        // Parse next review date for each detail if provided
        value = getValue(data, ["Meanings Review Date"]);
        if (value) kanjiItem.reviewDates.meanings = isNaN(value) ?
                parseInt(Date.parse(value) / 1000) : parseInt(value);
        value = getValue(data, ["On Yomi Review Date", "On-Yomi Review Date"]);
        if (value) kanjiItem.reviewDates.on_yomi = isNaN(value) ?
                parseInt(Date.parse(value) / 1000) : parseInt(value);
        value = getValue(data, ["Kun Yomi Review Date", "Kun-Yomi Review Date"])
        if (value) kanjiItem.reviewDates.kun_yomi = isNaN(value) ?
                parseInt(Date.parse(value) / 1000) : parseInt(value);
        
        // Parse review stats
        value = getValue(data, ["Mistake Count", "SRS Failure Count"]);
        if (value) {
            kanjiItem.mistakeCounts.meanings = parseInt(value);
            kanjiItem.mistakeCounts.on_yomi = parseInt(value);
            kanjiItem.mistakeCounts.kun_yomi = parseInt(value);
        }
        value = getValue(data, ["Correct Count", "SRS Success Count"]);
        if (value) {
            kanjiItem.correctCounts.meanings = parseInt(value);
            kanjiItem.correctCounts.on_yomi = parseInt(value);
            kanjiItem.correctCounts.kun_yomi = parseInt(value);
        }

        // Parse review stats for each detail if provided
        value = getValue(data, ["Meanings Mistake Count"]);
        if (value) kanjiItem.mistakeCounts.meanings = parseInt(value);
        value = getValue(data, ["On Yomi Mistake Count"]);
        if (value) kanjiItem.mistakeCounts.on_yomi = parseInt(value);
        value = getValue(data, ["Kun Yomi Mistake Count"]);
        if (value) kanjiItem.mistakeCounts.kun_yomi = parseInt(value);

        value = getValue(data, ["Meanings Correct Count"]);
        if (value) kanjiItem.correctCounts.meanings = parseInt(value);
        value = getValue(data, ["On Yomi Correct Count"]);
        if (value) kanjiItem.correctCounts.on_yomi = parseInt(value);
        value = getValue(data, ["Kun Yomi Correct Count"]);
        if (value) kanjiItem.correctCounts.kun_yomi = parseInt(value);

        return kanjiItem;
    };

    /**
     * Like the function "parseKanjiItem", but for hanzi.
     */
    function parseHanziItem(data, itemSeparator, levelsStartAtZero) {
        const hanziItem = { type: "hanzi", values: {}, levels: {},
                reviewDates: {}, correctCounts: {}, mistakeCounts: {} };
        let value;

        // Parse hanzi
        value = getValue(data, ["Hanzi"]);
        if (!value) throw Error("The hanzi is missing.");
        hanziItem.hanzi = value.trim();

        // Parse meanings
        value = getValue(data, ["Meanings"]);
        hanziItem.values.meanings = !value ? [] : value.split(itemSeparator)
                .map(m => m.trim().replace(/;/g, ","))
                .filter(m => m.length > 0);

        // Parse readings
        value = getValue(data, ["Readings", "Pinyin"]);
        hanziItem.values.readings = !value ? [] : value.split(itemSeparator)
                .map(m => m.trim().replace(/;/g, ","))
                .filter(m => m.length > 0);

        // Check if there's at least one value among meanings and readings
        if (!hanziItem.values.meanings.length &&
                !hanziItem.values.readings.length) {
            throw Error("The hanzi must have at least one meaning or reading.");
        }

        // Parse creation date
        value = getValue(data, ["Creation Date", "Date Added"]);
        if (value) hanziItem.creationDate = isNaN(value) ?
                parseInt(Date.parse(value) / 1000) : parseInt(value);

        // Parse SRS level (if there's just one, assign it to all details)
        value = getValue(data, ["SRS Level", "Level", "Grade"]);
        if (value) {
            hanziItem.levels.meanings = parseInt(value) + levelsStartAtZero;
            hanziItem.levels.readings = parseInt(value) + levelsStartAtZero;
        }

        // Parse SRS level for each detail if provided
        value = getValue(data, ["Meanings SRS Level", "Meanings Level",
                                "Meanings SRS-Level"]);
        if (value) hanziItem.levels.meanings = parseInt(value)+levelsStartAtZero
        value = getValue(data, ["Readings SRS Level", "Readings Level",
                                "Readings SRS-Level"]);
        if (value) hanziItem.levels.readings = parseInt(value)+levelsStartAtZero

        // Parse next review date (if there's just one, assign to all details)
        value = getValue(data, ["Review Date", "Next Review Date"]);
        if (value) {
            value = isNaN(value) ?
                parseInt(Date.parse(value) / 1000) : parseInt(value);
            hanziItem.reviewDates.meanings = value;
            hanziItem.reviewDates.readings = value;
        }

        // Parse next review date for each detail if provided
        value = getValue(data, ["Meanings Review Date"]);
        if (value) hanziItem.reviewDates.meanings = isNaN(value) ?
                parseInt(Date.parse(value) / 1000) : parseInt(value);
        value = getValue(data, ["Readings Review Date"]);
        if (value) hanziItem.reviewDates.readings = isNaN(value) ?
                parseInt(Date.parse(value) / 1000) : parseInt(value);
        
        // Parse review stats
        value = getValue(data, ["Mistake Count", "SRS Failure Count"]);
        if (value) {
            hanziItem.mistakeCounts.meanings = parseInt(value);
            hanziItem.mistakeCounts.readings = parseInt(value);
        }
        value = getValue(data, ["Correct Count", "SRS Success Count"]);
        if (value) {
            hanziItem.correctCounts.meanings = parseInt(value);
            hanziItem.correctCounts.readings = parseInt(value);
        }

        // Parse review stats for each detail if provided
        value = getValue(data, ["Meanings Mistake Count"]);
        if (value) hanziItem.mistakeCounts.meanings = parseInt(value);
        value = getValue(data, ["Readings Mistake Count"]);
        if (value) hanziItem.mistakeCounts.readings = parseInt(value);

        value = getValue(data, ["Meanings Correct Count"]);
        if (value) hanziItem.correctCounts.meanings = parseInt(value);
        value = getValue(data, ["Readings Correct Count"]);
        if (value) hanziItem.correctCounts.readings = parseInt(value);

        return hanziItem;
    };

    return importFuncs;
}

