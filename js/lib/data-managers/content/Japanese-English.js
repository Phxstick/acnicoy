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
                    r.id AS radicalId,
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

    function getExampleWordIdsForKanji(kanji) {
        const pattern = `%${kanji}%`;
        const start = performance.now();
        return data.query(
            `SELECT id FROM dictionary WHERE words LIKE ?
             ORDER BY news_freq DESC`, pattern)
        .then((rows) => {
            const totalTime = performance.now() - start;
            console.log("Received example word rows after %f ms", totalTime);
            return rows.map((row) => row.id);
        });
    }

    function getExampleWordsDataForKanji(kanji) {
        // TODO: Try doing much less in SQL to increase performance
        const pattern = `%${kanji}%`;
        const start = performance.now();
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

    async function getKanjiLists({
            splittingCriterion, includeAdded=true, includeJouyou=true,
            includeJinmeiyou=true, includeHyougai=true, stepSize }={}) {
        const whereClauses = [];
        if (!includeJouyou) whereClauses.push("k.grade NOT BETWEEN 1 AND 8");
        if (!includeJinmeiyou) whereClauses.push("k.grade != 9");
        if (!includeHyougai) whereClauses.push("k.grade != 0");
        const whereClause = (whereClauses.length > 0 ? "WHERE " : "") +
                whereClauses.map((clause) => "(" + clause + ")").join(" AND ");
        if (splittingCriterion === undefined) {
            return data.query(`
                SELECT k.entry AS kanji,
                       (k.entry IN (SELECT kanji FROM trainer.kanji)) AS added
                FROM kanji k
                ${whereClause}
            `);
        }
        let splitColumn;
        switch (splittingCriterion) {
            case "grade": splitColumn = "k.grade"; break;
            case "frequency": splitColumn = "k.frequency"; break;
            case "jlpt-level": splitColumn = "k.jlpt"; break;
            case "stroke-count": splitColumn = "k.strokes"; break;
            case "radical": splitColumn = "k.radical_id"; break;
            default: throw new Error(
                `'${splittingCriterion}' is not a valid splitting criterion.`);
        }
        // const groups = await data.query(
        //     `SELECT ${splitColumn} AS groupValue,
        //             COUNT(k.entry) AS groupSize
        //      FROM kanji k JOIN radicals r ON k.radical_id = r.id
        //      ${whereClause}
        //      GROUP BY ${splitColumn}
        //      ORDER BY ${splitColumn} ASC
        // `);
        // const promises = [];
        // for (const { groupValue, groupSize } of groups) {
        //     let whereClauseGroup = whereClause.length === 0 ? "WHERE " : " AND "
        //     whereClauseGroup += `${splitColumn} = ${groupValue}`;
        //     promises.push(data.query(`
        //         SELECT k.entry AS kanji,
        //                (k.entry IN (SELECT kanji FROM trainer.kanji)) AS added
        //         FROM kanji k JOIN radicals r ON k.radical_id = r.id
        //         ${whereClause}
        //         ${whereClauseGroup}
        //     `).then((rows) => {
        //         let numAdded = 0;
        //         rows.forEach(({ added }) => { if (added) ++numAdded; });
        //         return {
        //             groupValue,
        //             kanjiList: rows.map((row) => row.kanji),
        //             numTotal: groupSize,
        //             numAdded,
        //         };
        //     }));
        // }
        const groups = [];
        switch (splittingCriterion) {
            case "grade":
                if (includeJouyou) {
                    for (let i = 1; i <= 6; ++i) {
                        groups.push({ value: i, name: `Grade ${i}` });
                    }
                    groups.push({ value: 8, name: `Secondary Grade` });
                }
                if (includeJinmeiyou) {
                    groups.push({ value: 9, name: `Jinmeiyou` });
                }
                if (includeHyougai) {
                    groups.push({ value: 0, name: `Hyougai` });
                }
                break;
            case "jlpt-level":
                for (let i = 5; i >= 1; --i) {
                    groups.push({ value: i, name: `Level ${i}` });
                }
                break;
            case "radical":
                const radicals = await data.query(
                    "SELECT id, radical, name FROM radicals");
                for (const { id, radical, name } of radicals) {
                    groups.push({ value: id,
                                  name: `[ ${radical} ] ${name}` });
                }
                break;
            case "frequency": {
                if (!stepSize)
                    throw new Error("When splitting by 'frequency' or 'grade'" +
                                    ", a stepSize must be provided.");
                const maxFrequency =
                    await data.query("SELECT MAX(frequency) AS max FROM kanji")
                              .then(([row]) => row.max);
                let i = 1;
                while (i < maxFrequency) {
                    groups.push({ value: [i, i + stepSize - 1],
                                  name: `${i} to ${i + stepSize - 1}` });
                    i += stepSize;
                }
                if (maxFrequency - i > 0) {
                    groups.push({ value: [i, maxFrequency],
                                  name: `${i} to ${maxFrequency}` });
                }
                groups.push({ value: null, name: "Rare" });
                break;
            } case "stroke-count": {
                if (!stepSize)
                    throw new Error(
                        "When splitting by 'frequency' or 'strokes-count', " +
                        "a stepSize must be provided.");
                const maxStrokeNumber =
                    await data.query("SELECT MAX(strokes) AS max FROM kanji")
                              .then(([row]) => row.max);
                let i = 1;
                while (i < maxStrokeNumber) {
                    groups.push({ value: [i, i + stepSize - 1],
                                  name: `${i} to ${i + stepSize - 1} strokes` });
                    i += stepSize;
                }
                if (maxStrokeNumber - i > 0) {
                    groups.push({ value: [i, maxStrokeNumber],
                                  name: `${i} to ${maxFrequency} strokes` });
                }
                break;
            }
        }
        const promises = [];
        for (const { name, value } of groups) {
            let whereClauseGroup = whereClause.length === 0 ? "WHERE " : " AND "
            if (!Array.isArray(value)) {
                if (typeof value === "number") {
                    whereClauseGroup += `${splitColumn} = ${value}`;
                } else if (typeof value === "string") {
                    whereClauseGroup += `${splitColumn} = '${value}'`;
                } else if (value === null) {
                    whereClauseGroup += `${splitColumn} IS NULL`;
                }
            } else {
                whereClauseGroup +=
                    `${splitColumn} BETWEEN ${value[0]} AND ${value[1]}`;
            }
            promises.push(data.query(`
                SELECT k.entry AS kanji,
                       (k.entry IN (SELECT kanji FROM trainer.kanji)) AS added
                FROM kanji k JOIN radicals r ON k.radical_id = r.id
                ${whereClause}
                ${whereClauseGroup}
            `).then((rows) => {
                const kanjiList = [];
                let numAdded = 0;
                for (const { kanji, added } of rows) {
                    if (includeAdded || !added) kanjiList.push(kanji);
                    if (added) ++numAdded;
                }
                return {
                    groupName: name,
                    groupValue: !Array.isArray(value) ?
                        value : `${value[0]}-${value[1]}`,
                    kanjiList,
                    numTotal: rows.length,
                    numAdded,
                };
            }));
        }
        return Promise.all(promises);
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

    /**
     * Given a dictionary entry by its ID, check whether the vocabulary contains
     * an entry which has this dictionary ID associated.
     * If no such entry is found, guess if the vocabulary contains this entry by
     * checking if any word matches this dictionary entry sufficiently.
     * @param {Integer} dictionaryId
     * @param {Object} [dictionaryInfo] If info for this entry has already been
     *     extracted from the dictionary, pass it in here (Performance boost)
     * @returns {Promise[Boolean]}
     */
    async function doesVocabularyContain(dictionaryId, dictionaryInfo) {
        if (dictionaryInfo === undefined) {
            dictionaryInfo = await getDictionaryEntryInfo(dictionaryId);
        }
        return modules.vocab.contains(
            dictionaryInfo.wordsAndReadings[0].word);
    }

    /**
     * Given a list of meanings and readings (on-yomi in katakana, kun-yomi
     * in hiragana), return a list of matching kanji.
     * @param {Array[String]} meanings
     * @param {Array[String]} readings
     */
    async function searchForKanji(meanings, readings) {
        data.query(`SELECT entry FROM kanji`);
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
            getExampleWordIdsForKanji,
            getExampleWordsDataForKanji,
            getKanjiLists,
            getDictionaryEntryInfo,
            getEntryIdsForTranslationQuery,
            getEntryIdsForReadingQuery,
            guessDictionaryId,
            doesVocabularyContain
        });
        return data;
    });
};
