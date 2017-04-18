"use strict";

const sqlite3 = require("sqlite3");
const fs = require("fs");

module.exports = function (paths, contentPaths, modules) {
    let data;

    function isKnownKanji(character) {
        return data.query(
            "SELECT COUNT(entry) AS amount FROM kanji WHERE entry = ?",
            character)
        .then(([{amount}]) => amount > 0);
    };

    function getKanjiInfo(kanji) {
        return data.query(
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
                    (k.entry IN (SELECT kanji FROM trainer.kanji)) AS added
             FROM kanji k JOIN radicals r ON k.radical_id = r.id
             WHERE k.entry = ?`, kanji)
        .then(([row]) => {
            row.meanings = row.meanings ? row.meanings.split(";") : [];
            row.onYomi = row.onYomi ? row.onYomi.split(";") : [];
            row.kunYomi = row.kunYomi ? row.kunYomi.split(";") : [];
            row.kanji = kanji;
            return row;
        });
    };

    // Lightweight method for getting only kanji meanings
    function getKanjiMeanings(kanji) {
        return data.query(
            `SELECT k.meanings AS meanings
             FROM kanji k
             WHERE k.entry = ?`, kanji)
        .then(([row]) => {
            return row.meanings ? row.meanings.split(";") : [];
        });
    };

    function getExampleWordsForKanji(kanji) {
        const pattern = `%${kanji}%`;
        const start = performance.now();
        // return data.query(
        //     "SELECT words FROM dictionary WHERE words LIKE ?", pattern)
        // .then((rows) => 
        //     return rows.map((row) => row.words.split(";")[0]);
        // });
        // TODO: Try doing much less in SQL to increase performance
        return data.query(
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

    function getKanjiList() {
        // TODO: Don't retrieve too much info? Or store info in kanji instead?
        return data.query(
            `SELECT k.entry AS kanji,
                    k.grade AS grade,
                    k.strokes AS strokes,
                    k.frequency AS frequency,
                    k.on_readings AS onYomi,
                    k.kun_readings AS kunYomi,
                    k.meanings AS meanings,
                    r.radical AS radical,
                    r.name AS radicalName,
                    (entry IN (SELECT kanji FROM trainer.kanji)) AS added
            FROM kanji k JOIN radicals r ON k.radical_id = r.id`);
    };

    // Convert a string of ";"-separated codes to an array of infos
    function parseCodes(codes) {
        codes = codes.split(";").withoutEmptyStrings();
        // TODO: Use settings here to choose language for mapping
        const codeMap = data.codeToText["English"];
        return codes.map((code) => codeMap[code]);
    };

    function getDictionaryEntryInfo(id) {
        return Promise.all([
            data.query(
                `SELECT words, news_freq FROM dictionary WHERE id = ?`, id),
            data.query(
                `SELECT translations, part_of_speech, field_of_application,
                        misc_info, words_restricted_to, readings_restricted_to,
                        dialect
                 FROM meanings WHERE id = ?`, id),
            data.query(
                `SELECT reading, restricted_to FROM readings WHERE id = ?`, id)
        ]).then(([[{ words, news_freq }], meanings, readings]) => {
            const info = { id };
            // Provide list of objects containing of a word and its reading
            words = words.split(";");
            info.wordsAndReadings = [];
            for (const { reading, restricted_to } of readings) {
                let wordsForThisReading;
                // If the reading is not restricted to particular given words,
                // it counts for all words
                if (restricted_to.length > 0) {
                    wordsForThisReading = restricted_to.split(";");
                } else {
                    wordsForThisReading = words;
                }
                for (const word of wordsForThisReading) {
                    info.wordsAndReadings.push({ word, reading });
                }
            }
            // Provide list of meaning-objects containing translations for this
            // meaning, field of application, etc.
            info.meanings = [];
            for (const { translations, part_of_speech, field_of_application,
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

    function getEntryIdsForTranslationQuery(query) {
        return data.query(
            `WITH matched_ids AS
               (SELECT DISTINCT id FROM translations WHERE translation LIKE ?)
             SELECT d.id
             FROM matched_ids m JOIN dictionary d ON m.id = d.id
             ORDER BY d.news_freq DESC`, query + "%")
        .then((rows) => rows.map((row) => row.id));
    };

    function getEntryIdsForReadingQuery(query) {
        return data.query(
            `WITH matched_ids AS
                 (SELECT id FROM words WHERE word LIKE ?
                  UNION
                  SELECT id FROM readings WHERE reading LIKE ?)
             SELECT d.id
             FROM matched_ids m JOIN dictionary d ON m.id = d.id
             ORDER BY d.news_freq DESC`, query + "%", query + "%")
        .then((rows) => rows.map((row) => row.id));
    };

    /**
     * Given a word from the vocabulary, try to guess ID of the dictionary entry
     * corresponding to this word by comparing information from the vocabulary
     * entry and dictionary entry candidates matching the word.
     * @param {String} word
     * @returns {Promise[Integer]}
     */
    async function guessDictionaryId(word) {
        let candidateIds =
            await data.query(`SELECT id FROM words WHERE word = ?`, word)
            .then((rows) => rows.map((row) => row.id));
        if (candidateIds.length === 1) {
            return candidateIds[0];
        }
        // Try entries which have only readings associated next
        if (candidateIds.length === 0) {
            candidateIds = await
                data.query(`SELECT id FROM readings WHERE reading = ?`, word)
                .then((rows) => rows.map((row) => row.id));
            // TODO: Only take entries which have no words associated here!
            if (candidateIds.length === 0) {
                return null;
            }
        }
        // Choose id whose corresponding dictionary entry fits best
        const existingInfo = await modules.vocab.getInfo(word);
        const existingTranslations = new Set(existingInfo.translations);
        const existingReadings = new Set(existingInfo.readings);
        const promises = [];
        for (const candidateId of candidateIds) {
            promises.push(data.query(`
                SELECT readings, translations FROM dictionary
                WHERE id = ?
            `, candidateId).then((rows) => {
                // TODO: Consider reading/translation restrictions here?
                let score = 0;
                const dictionaryTranslations = rows[0].translations.split(";");
                const dictionaryReadings = rows[0].readings.split(";");
                for (const translation of dictionaryTranslations) {
                    if (existingTranslations.has(translation)) score++;
                }
                // TODO: Only compare readings if word is associated
                for (const reading of dictionaryReadings) {
                    if (existingReadings.has(reading)) score++;
                }
                return score;
            }));
        }
        const scores = await Promise.all(promises);
        let bestScore = -1;
        let bestCandidateId;
        for (let i = 0; i < scores.length; ++i) {
            if (scores[i] > bestScore) {
                bestScore = scores[i];
                bestCandidateId = candidateIds[i];
            }
        }
        return bestCandidateId;
    }

    let query;
    return new Promise((resolve) => {
        // Load content database and attach trainer database to it,
        // also define function for querying the content database
        const db = new sqlite3.Database(contentPaths.database, () => {
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
        for (const { grade, amount } of amountPerGrade) {
            kanjiPerGrade[grade] = amount;
        }
        // Create mapping from jlpt level to amount
        const kanjiPerJlpt = {};
        for (const { level, amount } of amountPerLevel) {
            kanjiPerJlpt[level] = amount;
        }
        // Gather all the content into a frozen object
        data = Object.freeze({
            query: query,
            numKanjiPerGrade: Object.freeze(kanjiPerGrade),
            numKanjiPerJlptLevel: Object.freeze(kanjiPerJlpt),
            kanjiStrokes: Object.freeze(require(contentPaths.kanjiStrokes)),
            numericKanji: Object.freeze(require(contentPaths.numbers)),
            counterKanji: Object.freeze(require(contentPaths.counters)),
            codeToText: Object.freeze(require(contentPaths.dictCodeToText)),
            kokujiList: Object.freeze(
                new Set(fs.readFileSync(contentPaths.kokujiList, "utf8"))),
            isKnownKanji,
            getKanjiInfo,
            getKanjiMeanings,
            getExampleWordsForKanji,
            getKanjiList,
            getDictionaryEntryInfo,
            getEntryIdsForTranslationQuery,
            getEntryIdsForReadingQuery,
            guessDictionaryId
        });
        return data;
    });
};
