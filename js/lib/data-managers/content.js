"use strict";

const sqlite3 = require("sqlite3");

module.exports = function (paths, modules) {
    const content = { data: null };
    const dataMap = {};
    const isAvailable = {};

    content.dataMap = dataMap;
    content.isAvailable = isAvailable;

    content.load = function (language) {
        let promise = Promise.resolve();
        modules.languageSettings.setLanguage(language);
        const secondaryLanguage = modules.languageSettings.secondaryLanguage;
        const cPaths = paths.content(language, secondaryLanguage);
        if (cPaths === null) {  // Content not available
            isAvailable[language] = false;
            return;
        }
        isAvailable[language] = true;
        if (language === "Japanese") {
            let query;
            promise = new Promise((resolve) => {
                // Load content database and attach trainer database to it,
                // also define function for querying the content database
                const db = new sqlite3.Database(cPaths.database, () => {
                    query = function(query, ...params) {
                        return new Promise((resolve, reject) => {
                            db.all(query, ...params, (e, rows)=> resolve(rows));
                        });
                    };
                    const attachStmt = db.prepare("ATTACH DATABASE ? AS ?");
                    attachStmt.run(paths.languageData("Japanese").database,
                                   "trainer", resolve);
                });
            }).then(() => Promise.all([
                // Get information about kanji grades and jlpt levels
                query(`SELECT grade, COUNT(*) AS amount FROM kanji
                        GROUP BY grade`),
                query(`SELECT jlpt AS level, COUNT(*) AS amount
                       FROM kanji WHERE jlpt IS NOT NULL
                       GROUP BY jlpt`)
            ])).then(([amountPerGrade, amountPerLevel]) => {
                // Create mapping from jouyou grade to amount
                const kanjiPerGrade = {};
                for (let { grade, amount } of amountPerGrade) {
                    kanjiPerGrade[grade] = amount;
                }
                // Create mapping from jlpt level to amount
                const kanjiPerJlpt = {};
                for (let { level, amount } of amountPerLevel) {
                    kanjiPerJlpt[level] = amount;
                }
                // Gather all the content into a frozen object
                // TODO: Directly put these into content object...?
                // TODO: Along with all functions for Japanese?
                dataMap["Japanese"] = Object.freeze({
                    query: query,
                    numKanjiPerGrade: Object.freeze(kanjiPerGrade),
                    numKanjiPerJlptLevel: Object.freeze(kanjiPerJlpt),
                    kanjiStrokes: Object.freeze(require(cPaths.kanjiStrokes)),
                    numericKanji: Object.freeze(require(cPaths.numbers)),
                    counterKanji: Object.freeze(require(cPaths.counters)),
                    codeToText: Object.freeze(require(cPaths.dictCodeToText))
                });
            });
        }
        return promise;
    };

    content.setLanguage = function (language) {
        content.data = dataMap[language];
    };

    content.isKnownKanji = function (character) {
        return dataMap["Japanese"].query(
            "SELECT COUNT(entry) AS amount FROM kanji WHERE entry = ?",
            character)
        .then(([{amount}]) => amount > 0);
    };

    content.getKanjiInfo = function (kanji) {
        return dataMap["Japanese"].query(
            `SELECT k.grade AS grade,
                    k.strokes AS strokes,
                    k.frequency AS frequency,
                    k.on_readings AS onYomi,
                    k.kun_readings AS kunYomi,
                    k.meanings AS meanings,
                    k.parts AS parts,
                    k.jlpt AS jlptLevel,
                    r.radical AS radical,
                    r.name AS radicalName,
                    (k.entry IN (SELECT entry FROM trainer.kanji)) AS added
             FROM kanji k JOIN radicals r ON k.radical_id = r.id
             WHERE k.entry = ?`, kanji)
        .then(([row]) => {
            row.meanings = row.meanings ? row.meanings.split(",") : [];
            row.onYomi = row.onYomi ? row.onYomi.split(",") : [];
            row.kunYomi = row.kunYomi ? row.kunYomi.split(",") : [];
            return row;
        });
    };

    // TODO: Better naming? (since it returns rows, not words)
    content.getExampleWordsForKanji = function (kanji) {
        const pattern = `%${kanji}%`;
        const start = performance.now();
        // return content.query(
        //     "SELECT words FROM dictionary WHERE words LIKE ?", pattern)
        // .then((rows) => 
        //     return rows.map((row) => row.words.split(";")[0]);
        // });
        // TODO: Try doing much less in SQL to increase performance
        return dataMap["Japanese"].query(
            `WITH frequent_words AS
             (SELECT w1.id, w1.word, w1.news_freq
              FROM words w1
              WHERE w1.word LIKE ?
                AND w1.news_freq = (SELECT MAX(w2.news_freq)
                                    FROM words w2
                                    WHERE w2.word = w1.word))
             SELECT f.id AS id,
                    f.word AS word,
                    d.translations AS translations,
                    d.readings AS readings,
                    f.news_freq AS newsFreq
             FROM frequent_words f JOIN dictionary d ON f.id = d.id
             ORDER BY f.news_freq DESC `, pattern)
        .then((rows) => {
            const totalTime = performance.now() - start;
            console.log("Received example word rows after %f ms", totalTime);
            return rows;
        });
    };

    content.getKanjiList = function () {
        // TODO: Don't retrieve too much info? Or store info in kanji instead?
        return dataMap["Japanese"].query(
            `SELECT k.entry AS kanji,
                    k.grade AS grade,
                    k.strokes AS strokes,
                    k.frequency AS frequency,
                    k.on_readings AS onYomi,
                    k.kun_readings AS kunYomi,
                    k.meanings AS meanings,
                    r.radical AS radical,
                    r.name AS radicalName,
                    (entry IN (SELECT entry FROM trainer.kanji)) AS added
            FROM kanji k JOIN radicals r ON k.radical_id = r.id`);
    };

    // Convert a string of ";"-separated codes to an array of infos
    function parseCodes(codes) {
        codes = codes.split(";").withoutEmptyStrings();
        // TODO: Use settings here to choose language for mapping
        const codeMap = dataMap["Japanese"].codeToText["English"];
        return codes.map((code) => codeMap[code]);
    }

    content.getDictionaryEntryInfo = function (id) {
        return Promise.all([
            dataMap["Japanese"].query(
                `SELECT words, news_freq FROM dictionary WHERE id = ?`, id),
            dataMap["Japanese"].query(
                `SELECT translations, part_of_speech, field_of_application,
                        misc_info, words_restricted_to, readings_restricted_to,
                        dialect
                 FROM meanings WHERE id = ?`, id),
            dataMap["Japanese"].query(
                `SELECT reading, restricted_to FROM readings WHERE id = ?`, id)
        ]).then(([[{ words, news_freq }], meanings, readings]) => {
            const info = {};
            // Provide list of objects containing of a word and its reading
            words = words.split(";");
            info.wordsAndReadings = [];
            for (let { reading, restricted_to } of readings) {
                let wordsForThisReading;
                // If the reading is not restricted to particular given words,
                // it counts for all words
                if (restricted_to.length > 0) {
                    wordsForThisReading = restricted_to.split(";");
                } else {
                    wordsForThisReading = words;
                }
                for (let word of wordsForThisReading) {
                    info.wordsAndReadings.push({
                        word: word, reading: reading
                    });
                }
            }
            // Provide list of meaning-objects containing translations for this
            // meaning, field of application, etc.
            info.meanings = [];
            for (let { translations, part_of_speech, field_of_application,
                       misc_info, words_restricted_to, readings_restricted_to,
                       dialect } of meanings) {
                info.meanings.push({
                    translations: translations.split(";"),
                    partsOfSpeech: parseCodes(part_of_speech),
                    fieldsOfApplication: parseCodes(field_of_application),
                    miscInfo: parseCodes(misc_info),
                    dialect: parseCodes(dialect),
                    restrictedTo: words_restricted_to.split(";").concat(
                                  readings_restricted_to.split(";"))
                                  .withoutEmptyStrings()
                });
            }
            info.newsFreq = news_freq;
            return info;
        });
    };

    content.getEntryIdsForTranslationQuery = function (query) {
        return dataMap["Japanese"].query(
            `WITH matched_ids AS
               (SELECT DISTINCT id FROM translations WHERE translation LIKE ?)
             SELECT d.id
             FROM matched_ids m JOIN dictionary d ON m.id = d.id
             ORDER BY d.news_freq DESC`, query + "%")
        .then((rows) => rows.map((row) => row.id));
    };

    content.getEntryIdsForReadingQuery = function (query) {
        return dataMap["Japanese"].query(
            `WITH matched_ids AS
                 (SELECT id FROM words WHERE word LIKE ?
                  UNION
                  SELECT id FROM readings WHERE reading LIKE ?)
             SELECT d.id
             FROM matched_ids m JOIN dictionary d ON m.id = d.id
             ORDER BY d.news_freq DESC`, query + "%", query + "%")
        .then((rows) => rows.map((row) => row.id));
    };

    return content;
};
