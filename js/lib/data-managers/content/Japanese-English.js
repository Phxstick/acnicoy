"use strict";

const sqlite3 = require("sqlite3");
const fs = require("fs");

module.exports = async function (paths, contentPaths, modules) {
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
                    k.on_yomi AS onYomi,
                    k.kun_yomi AS kunYomi,
                    k.meanings AS meanings,
                    k.parts AS parts,
                    k.jlpt AS jlptLevel,
                    r.radical AS radical,
                    r.id AS radicalId,
                    r.name AS radicalName
             FROM kanji k JOIN radicals r ON k.radical_id = r.id
             WHERE k.entry = ?`, kanji)
        .then(([row]) => {
            row.meanings = row.meanings.length ? row.meanings.split(";") : [];
            row.onYomi = row.onYomi.length ? row.onYomi.split(";") : [];
            row.kunYomi = row.kunYomi.length ? row.kunYomi.split(";") : [];
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
            return row.meanings.length ? row.meanings.split(";") : [];
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
        const language = modules.settings.dictionary.partOfSpeechInJapanese ?
            "Japanese" : "English";
        const codeMap = data.codeToText[language];
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

    /**
     * Given a word which is *not* present in the vocabulary, find the ID of
     * the dictionary entry which matches most likely (with the highest news
     * frequency). If the word has already been added to the dictionary, use
     * the function `guessDictionaryId` to make use of translations/readings.
     * @param {String} word
     * @returns {Promise[Integer]}
     */
    async function findDictionaryIdForWord(word) {
        const wordMatches = await data.query(
            "SELECT d.id AS id, MAX(d.news_freq) AS freq " +
            "FROM words w JOIN dictionary d " +
            "ON w.id = d.id WHERE w.word = ?", word);
        if (wordMatches.length > 0) return wordMatches[0].id;
        const readingMatches = await data.query(
            "SELECT d.id AS id, MAX(d.news_freq) AS freq " +
            "FROM readings r JOIN dictionary d " +
            "ON r.id = d.id WHERE r.reading = ?", word);
        if (readingMatches.length > 0) return readingMatches[0].id;
        return null;
    }

    /**
     * Given a word from the vocabulary, try to guess ID of the dictionary entry
     * corresponding to this word by comparing information from the vocabulary
     * entry and dictionary entry candidates matching the word.
     * @param {String} word
     * @returns {Promise[Integer]}
     */
    async function guessDictionaryId(word) {
        let candidateIds =
            await data.query(`SELECT id FROM words WHERE word LIKE ?`, word)
            .then((rows) => rows.map((row) => row.id));
        if (candidateIds.length === 1) {
            return candidateIds[0];
        }
        // Try entries which have only readings associated next
        if (candidateIds.length === 0) {
            candidateIds = await
                data.query(`SELECT id FROM readings WHERE reading LIKE ?`, word)
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
        for (const cId of candidateIds) {
            promises.push(Promise.all([
                data.query(`SELECT reading FROM readings WHERE id = ?`, cId),
                data.query(`SELECT translations FROM meanings WHERE id=?`, cId),
            ]).then(([dictionaryReadings, dictionaryMeanings]) => {
                // TODO: Consider reading/translation restrictions here?
                let score = 0;
                for (const row of dictionaryMeanings) {
                    const dictionaryTranslations = row.translations.split(";");
                    for (const translation of dictionaryTranslations) {
                        if (existingTranslations.has(translation)) score++;
                    }
                }
                // TODO: Only compare readings if word is associated
                for (const row of dictionaryReadings) {
                    if (existingReadings.has(row.reading)) score++;
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
     * Given a dictionary entry by its ID, return the corresponding entry from
     * the vocabulary (or null if there's no match). If the data associated with
     * the dictionary entry has already been loaded, it can be passed as the
     * second argument to prevent loading it twice and speed up the procedure.
     *
     * First check whether an entry in the vocabulary has this ID associated.
     * If not, try to guess which vocabulary entry most likely matches this
     * dictionary entry by comparing the words, readings and translations.
     *
     * In order to find a vocabulary entry matching a proper name from the
     * dictionary, one can set the parameter dictionaryId to null and pass
     * the associated data as the second argument.
     *
     * @param {Integer} dictionaryId
     * @param {Object} [dictionaryInfo] If info for this entry has already been
     *     extracted from the dictionary, pass it in here (performance boost).
     *     Can also be used to match proper names to vocabulary entries.
     * @returns {String|null}
     */
    async function guessAssociatedVocabEntry(dictionaryId, dictionaryInfo) {
        if (dictionaryInfo === undefined) {
            dictionaryInfo = await getDictionaryEntryInfo(dictionaryId);
        }

        // Try to match dictionary ID first
        if (dictionaryId !== null) {
            const idQueryResult = await data.query(
                "SELECT word FROM trainer.vocabulary WHERE dictionary_id = ?",
                dictionaryId);
            if (idQueryResult.length > 0) return idQueryResult[0].word;
        }

        // Add kana variants as word variants as well (after kanji variants)
        const wordsAndReadings = [...dictionaryInfo.wordsAndReadings];
        const readings = new Set();
        for (const wordAndReading of wordsAndReadings) {
            if (wordAndReading.word.length > 0) {
                readings.add(wordAndReading.reading);
            }
        }
        for (const reading of readings) {
            wordsAndReadings.push({ word: "", reading });
        }

        // Try to match each word variant (starting with main word at index 0)
        for (const wordAndReading of wordsAndReadings) {
            const { word, reading } = wordAndReading;
            const wordContainsKanji = word.length > 0;
            const vocabEntry = wordContainsKanji ? word : reading;
            const wordMatch = await modules.vocab.contains(vocabEntry);

            // If the word variant doesn't match, skip it and try the next one
            if (!wordMatch) continue;
            const vocabEntryData = await modules.vocab.getInfo(vocabEntry);

            // If this word variant contains kanji, check whether its reading
            // is registered as one of the readings of the vocabulary entry
            if (wordContainsKanji && vocabEntryData.readings.length > 0) {
                let readingMatch = false;
                for (const registeredReading of vocabEntryData.readings) {
                    if (registeredReading === reading) {
                        readingMatch = true;
                        break;
                    }
                }
                // If a reading matched, consider word matched, else skip
                if (readingMatch) return word;
                else continue;
            }

            // If this word doesn't contain kanji or has no registered readings,
            // check translations instead
            const translations = new Set();
            for (const meaning of dictionaryInfo.meanings) {
                for (const translation of meaning.translations) {
                    translations.add(translation);
                }
            }
            let translationMatch = false;
            for (const registeredTranslation of vocabEntryData.translations) {
                if (translations.has(registeredTranslation)) {
                    translationMatch = true;
                    break;
                }
            }
            // If at least one translation matched, consider word as matching
            if (translationMatch) return vocabEntry;
        }
        return null;
    }

    /**
     * Given an object with query information, return a list of matching kanji.
     * Kanji are primarily sorted by how many fields in the query they match.
     * @param {Object} query - Object of form { meanings, onYomi, kunYomi }.
     *     On-yomi and kun-yomi must be in katakana/hiragana respectively.
     * @returns {Array}
     */
    async function searchKanji(query) {
        // If query is empty, return an empty list
        if (Object.keys(query).length === 0)
            return [];

        // Convert wildcards * and ? to % and _ for SQL pattern matching
        const replace = (f) => f.replace(/[*]/g, "%").replace(/[?]/g, "_");
        for (const field in query) {
            query[field] = query[field].map(replace);
        }

        // If any query field contains a wildcard at the start or end
        // (or both sides), do not prioritize exact matches for that field.
        const exactMatchesQuery = { };
        for (const field in query) {
            exactMatchesQuery[field] = [];
            for (const qString of query[field]) {
                if (!qString.startsWith("%") && !qString.endsWith("%")) {
                    exactMatchesQuery[field].push(qString.replace(/[%_]/g, ""));
                }
            }
        }

        // Search for exact matches (using query without any wildcards).
        let exactMatches = await kanjiSearchFunction(exactMatchesQuery);
        const originalQuery = { };
        for (const field in query) originalQuery[field] = query[field];

        // Add wildcard to both sides of each meaning
        query.meanings = query.meanings.map(
            (m) => (m.startsWith("%")?"":"%") + m + (m.endsWith("%")?"":"%"));
        // Add wildcard to end of kun-yomi if there are none at the beginning
        query.kunYomi = query.kunYomi.map(
            (k) => k.startsWith("%") ? k : k + (k.endsWith("%")?"":"%"));

        // Search for all matches, put exact matches at the beginning of results
        let allMatches = await kanjiSearchFunction(query);
        const matchKanji = Array(allMatches.length);
        for (let i = 0; i < exactMatches.length; ++i) {
            matchKanji[i] = exactMatches[i].kanji;
        }

        // Prioritize matches where any meaning query matches whole words.
        // Only match word boundaries if there is no wild card at that side
        // of the string in the original query.
        if (query.meanings.length > 0) {
            const wholeWordMatches = [];
            const nonWholeWordMatches = [];
            const queryRegexes = []
            for (const meaning of originalQuery.meanings) {
                if (meaning.startsWith("%") && meaning.endsWith("%"))
                    continue;
                let regex = meaning.replace(/^%+/, "").replace(/%+$/, "");
                if (!meaning.startsWith("%")) {
                    regex = "\\b" + regex; 
                }
                if (!meaning.endsWith("%")) {
                    regex = regex + "\\b";
                }
                regex.replace(/%+/g, "\\B*?");
                queryRegexes.push(new RegExp(regex, 'i'));
            }
            for (const match of allMatches) {
                if (match.meanings === null) {
                    nonWholeWordMatches.push(match);
                    continue;
                }
                let matched = false;
                for (const regex of queryRegexes) {
                    if (regex.test(match.meanings)) {
                        matched = true;
                        break;
                    }
                }
                if (matched) {
                    wholeWordMatches.push(match);
                } else {
                    nonWholeWordMatches.push(match);
                }
            }
            allMatches = [...wholeWordMatches, ...nonWholeWordMatches];
        }

        // Add all non-exact matches to the result array
        let i = 0;
        let j = 0;
        while (j < allMatches.length) {
            if (i < exactMatches.length &&
                    exactMatches[i].kanji === allMatches[j].kanji) {
                ++i;
            } else {
                matchKanji[exactMatches.length + j - i] = allMatches[j].kanji;
            }
            ++j;
        }
        return matchKanji;
    }

    // Executes database queries for the given kanji details query object
    async function kanjiSearchFunction(query) {

        // Find matching kanji for each detail in the query
        const promises = [];
        for (const meaning of query.meanings) {
            promises.push(data.query(
                `SELECT entry, frequency,
                        (meanings || ';' || meanings_search) AS allMeanings
                 FROM kanji
                 WHERE (';' || meanings || ';') LIKE '%;${meaning};%' 
                 OR (';' || meanings_search || ';') LIKE '%;${meaning};%'`));
        }
        for (const onYomi of query.onYomi) {
            promises.push(data.query(
                `SELECT entry, frequency FROM kanji
                 WHERE (';' || on_yomi || ';') LIKE '%;${onYomi};%'
                 OR (';' || on_yomi_search || ';') LIKE '%;${onYomi};%'`));
        }
        for (const kunYomi of query.kunYomi) {
            promises.push(data.query(
                `SELECT entry, frequency FROM kanji
                 WHERE (';' || kun_yomi || ';') LIKE '%;${kunYomi};%'
                 OR (';' || kun_yomi_search || ';') LIKE '%;${kunYomi};%'`));
        }
        const subMatches = await Promise.all(promises);

        // Map each matched kanji to frequency, number of matches and data
        const matches = new Map();
        for (const subMatch of subMatches) {
            for (const info of subMatch) {
                const { entry, frequency } = info;
                if (!matches.has(entry)) {
                    matches.set(entry, { frequency, matchCount: 0,
                                         meanings: null });
                }
                const matchObj = matches.get(entry);
                if (info.hasOwnProperty("allMeanings"))
                    matchObj.meanings = info.allMeanings;
                matchObj.matchCount++;
            }
        }
        const matchList = [...matches];

        // Sort kanji by match count, or by frequency if match count is equal
        matchList.sort((match1, match2) => {
            if (match1[1].matchCount !== match2[1].matchCount) {
                return match2[1].matchCount - match1[1].matchCount;
            } else {
                if (match1[1].frequency === null) return 1;
                if (match2[1].frequency === null) return -1;
                return match1[1].frequency - match2[1].frequency;
            }
        });

        // Return kanji along with meanings if they contain matches (else null)
        return matchList.map((match) => ({ kanji: match[0],
                                           meanings: match[1].meanings }));
    }

    /**
     * Given an object with query information, return a list of ids of matching
     * dictionary entries. Exact matches are prioritized.
     * @param {Object} query - Object of form { translations, readings }.
     *     If readings are written using romaji, matches for both hiragana and
     *     katakana are considered.
     * @param {Object} options - Object of the form { searchProperNames }.
     * @returns {Array}
     */
    async function searchDictionary(query, options={}) {
        // Choose an implementation of the core search function
        let searchFunction;
        if (options.searchProperNames) {
            searchFunction = searchProperNames;
        } else {
            searchFunction = searchDictionaryVariant1;
        }
        // If query is empty, return an empty list
        if (Object.keys(query).length === 0)
            return [];
        // Add missing query fields (to make following code simpler)
        if (query.translations === undefined)
            query.translations = [];
        if (query.readings === undefined)
            query.readings = [];
        // Convert wildcards * and ? to % and _ for SQL pattern matching
        const replace = (t) => t.replace(/[*]/g, "%").replace(/[?]/g, "_");
        query.translations = query.translations.map(replace);
        query.readings = query.readings.map(replace);
        // If any query field contains a wildcard at the start or end
        // (or both sides), do not prioritize exact matches for that field.
        const exactMatchesQuery = { readings: [], translations: [] };
        for (const reading of query.readings) {
            if (!reading.startsWith("%") && !reading.endsWith("%")) {
                exactMatchesQuery.readings.push(reading.replace(/[%_]/g, ""));
            }
        }
        for (const translation of query.translations) {
            if (!translation.startsWith("%") && !translation.endsWith("%")) {
                exactMatchesQuery.translations.push(
                    translation.replace(/[%_]/g, ""));
            }
        }
        // Search for exact matches (using query without any wildcards).
        let exactMatches = await searchFunction(exactMatchesQuery, options);
        const originalQuery = {
            translations: query.translations,
            readings: query.readings
        };
        // Add wildcard to both sides of each translation
        query.translations = query.translations.map(
            (t) => (t.startsWith("%")?"":"%") + t + (t.endsWith("%")?"":"%"));
        // Add wildcard to end of words/readings if there's none at beginning
        query.readings = query.readings.map(
            (r) => r.startsWith("%") ? r : r + (r.endsWith("%")?"":"%"));
        // Search for all matches
        let allMatches = await searchFunction(query, options);
        const matchIds = Array(allMatches.length);
        // Exact matches are at the beginning of the search results
        for (let i = 0; i < exactMatches.length; ++i) {
            matchIds[i] = exactMatches[i].id;
        }
        // Prioritize matches where any translation query matches whole words.
        // Only match word boundaries if there is no wild card at that side
        // of the string in the original query.
        if (query.translations.length) {
            const wholeWordMatches = [];
            const nonWholeWordMatches = [];
            const queryRegexes = []
            for (const translation of originalQuery.translations) {
                if (translation.startsWith("%") && translation.endsWith("%"))
                    continue;
                let regex = translation.replace(/^%+/, "").replace(/%+$/, "");
                if (!translation.startsWith("%")) {
                    regex = "\\b" + regex; 
                }
                if (!translation.endsWith("%")) {
                    regex = regex + "\\b";
                }
                regex.replace(/%+/g, "\\B*?");
                queryRegexes.push(new RegExp(regex, 'i'));
            }
            for (const match of allMatches) {
                let matched = false;
                for (const regex of queryRegexes) {
                    if (regex.test(match.translations)) {
                        matched = true;
                        break;
                    }
                }
                if (matched) {
                    wholeWordMatches.push(match);
                } else {
                    nonWholeWordMatches.push(match);
                }
            }
            allMatches = [...wholeWordMatches, ...nonWholeWordMatches];
        }
        // Add all non-exact matches to the result array
        let i = 0;
        let j = 0;
        while (j < allMatches.length) {
            if (i < exactMatches.length &&
                    exactMatches[i].id === allMatches[j].id) {
                ++i;
            } else {
                matchIds[exactMatches.length + j - i] = allMatches[j].id;
            }
            ++j;
        }
        return matchIds;
    }

    async function searchDictionaryVariant1(query, options) {
        if (query.readings.length === 0 && query.translations.length === 0)
            return [];
        const selectClauses = [];
        const queryArguments = [];
        // Matching words and readings (if reading contains romaji,
        // search for both hiragana and katakana versions)
        if (query.readings.length > 0) {
            const whereClausesYomi = [];
            for (const reading of query.readings) {
                const hiraVariant = reading.toKana("hiragana");
                const kataVariant = reading.toKana("katakana");
                if (hiraVariant !== reading && kataVariant !== reading) {
                    whereClausesYomi.push("(reading LIKE ? OR reading LIKE ?)");
                    queryArguments.push(hiraVariant, kataVariant);
                } else {
                    whereClausesYomi.push("reading LIKE ?");
                    queryArguments.push(reading);
                }
            }
            queryArguments.push(...query.readings);
            selectClauses.push(
                "(SELECT DISTINCT id FROM readings WHERE "
                + whereClausesYomi.join(" AND ") + " UNION "
                + "SELECT DISTINCT id FROM words WHERE "
                + Array(query.readings.length).fill("word LIKE ?")
                  .join(" AND ") + ")");
        }
        // Matching translations
        if (query.translations.length > 0) {
            selectClauses.push(
                "(SELECT DISTINCT id FROM translations WHERE "
                + Array(query.translations.length).fill("translation LIKE ?")
                  .join(" AND ") + ")");
            queryArguments.push(...query.translations);
        }

        // Sort IDs by news frequency and extract corresponding translations
        const rows = await data.query(
            `WITH matched_ids AS ${selectClauses.join(" INTERSECT ")}
             SELECT d.id, GROUP_CONCAT(t.translations, ';') AS translations
             FROM matched_ids m INNER JOIN dictionary d ON m.id = d.id
                                INNER JOIN meanings t ON m.id = t.id
             GROUP BY d.id
             ORDER BY d.news_freq DESC`, ...queryArguments);
        return rows;
    }

    // NOTE: this only works if the "dictionary" table contains translations
    //       (which is not the case for the current version of the dictionary)
    async function searchDictionaryVariant2(query, options) {
        if (query.readings.length === 0 && query.translations.length === 0)
            return [];
        const whereClauses = [];
        const queryArguments = [];
        // Matching words and readings (if reading contains romaji,
        // search for both hiragana and katakana versions)
        if (query.readings.length) {
            for (const reading of query.readings) {
                const hiraVariant = reading.toKana("hiragana");
                const kataVariant = reading.toKana("katakana");
                if (hiraVariant !== reading && kataVariant !== reading) {
                    whereClauses.push(
                        "((';' || readings || ';' || words || ';') LIKE ? OR " +
                        " (';' || readings || ';' || words || ';') LIKE ?)")
                    queryArguments.push(
                        `%;${hiraVariant};%`, `%;${kataVariant};%`);
                } else {
                    whereClauses.push(
                        "(';' || readings || ';' || words || ';') LIKE ?");
                    queryArguments.push(`%;${reading};%`);
                }
            }
        }
        // Matching translations
        if (query.translations.length) {
            for (const translation of query.translations) {
                whereClauses.push("(';' || translations || ';') LIKE ?");
                queryArguments.push(`%;${translation};%`);
            }
        }
        const rows = await data.query(`
             SELECT id, translations FROM dictionary
             WHERE ${whereClauses.join(" AND ")}
             ORDER BY news_freq DESC`, ...queryArguments);
        return rows;
    }

    async function searchProperNames(query, options) {
        if (query.readings.length === 0 && query.translations.length === 0)
            return [];
        const whereClauses = [];
        const queryArguments = [];
        // Matching words and readings (if reading contains romaji,
        // search for both hiragana and katakana versions)
        if (query.readings.length) {
            for (const reading of query.readings) {
                const hiraVariant = reading.toKana("hiragana");
                const kataVariant = reading.toKana("katakana");
                if (hiraVariant !== reading && kataVariant !== reading) {
                    whereClauses.push(
                        "(reading LIKE ? OR reading LIKE ? OR" +
                        " name LIKE ? OR name LIKE ?)")
                    queryArguments.push(
                        hiraVariant, hiraVariant, kataVariant, kataVariant);
                } else {
                    whereClauses.push("reading LIKE ? OR name LIKE ?");
                    queryArguments.push(reading, reading);
                }
            }
        }
        // Matching translations
        if (query.translations.length) {
            for (const translation of query.translations) {
                whereClauses.push("(';' || translations || ';') LIKE ?");
                queryArguments.push(`%;${translation};%`);
            }
        }
        const rows = await data.query(
            `SELECT id, translations FROM proper_names
             WHERE ${whereClauses.join(" AND ")}`, ...queryArguments);
        return rows;
    }

    async function getProperNameEntryInfo(id) {
        let [{ name, tags, reading, translations }] = await data.query(`
            SELECT name, tags, reading, translations FROM proper_names
            WHERE id = ?`, id);
        const tagToText = data.nameTagToText[
            modules.settings.dictionary.partOfSpeechInJapanese ?
            "Japanese" : "English"];
        const tagList = tags.split(";").filter((tag) => tag !== "abbr");
        return {
            id,
            wordsAndReadings: [{ 
                word: reading === null ? "" : name,
                reading: reading === null ? name : reading
            }],
            meanings: [{
                translations: translations.split(";"),
                partsOfSpeech: tagList.map((tag) => tagToText[tag]),
                miscInfo: tags.includes("abbr") ? [tagToText["abbr"]] : []
            }],
            tags: tagList
        };
    }

    /**
     * Load content from database into an in-memory database.
     * @returns {Function} - Function to query the in-memory database.
     */
    async function loadDatabaseIntoMemory() {
        const db = utility.promisifyDatabase(new sqlite3.Database(":memory:"));
        // Attach content and user data database to in-memory one
        await db.run("ATTACH DATABASE ? AS ?",
            contentPaths.database, "content");
        await db.run("ATTACH DATABASE ? AS ?",
            paths.languageData("Japanese").database, "trainer");
        // Create tables of content database in in-memory database and
        // copy over all data
        const tablesInfo = await db.all(
            "SELECT name, sql FROM content.sqlite_master WHERE type='table'");
        for (const { name, sql } of tablesInfo) {
            await db.exec(sql);
            await db.run(`INSERT INTO ${name} SELECT * FROM content.${name}`);
        }
        // Create indices of content database in in-memory database
        const createIndicesSql = fs.readFileSync(paths.japaneseIndices, "utf8");
        await db.exec(createIndicesSql);
        // Detach content database again
        await db.run("DETACH DATABASE ?", "content");
        const queryFunction = (query, ...params) => db.all(query, ...params);
        const updateUserData = async () => {
            await db.run("DETACH DATABASE ?", "trainer");
            await db.run("ATTACH DATABASE ? AS ?",
                paths.languageData("Japanese").database, "trainer");
        };
        return { queryFunction, updateUserData };
    }

    const { queryFunction, updateUserData } = await loadDatabaseIntoMemory();
    const [amountPerGrade, amountPerLevel] = await Promise.all([
        // Get information about kanji grades and jlpt levels
        queryFunction(`SELECT grade, COUNT(*) AS amount FROM kanji
                       GROUP BY grade`),
        queryFunction(`SELECT jlpt AS level, COUNT(*) AS amount
                       FROM kanji WHERE jlpt IS NOT NULL
                       GROUP BY jlpt`)
    ]);
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
    // Define function to require a new version of a file (not cached version)
    function requireNew(path) {
        delete require.cache[require.resolve(path)];
        return require(path);
    }
    // Gather all the content into a frozen object
    data = Object.freeze({
        query: queryFunction,
        updateUserData,

        // Data objects
        numKanjiPerGrade: Object.freeze(kanjiPerGrade),
        numKanjiPerJlptLevel: Object.freeze(kanjiPerJlpt),
        kanjiStrokes: Object.freeze(requireNew(contentPaths.kanjiStrokes)),
        numericKanji: Object.freeze(requireNew(contentPaths.numbers)),
        counterKanji: Object.freeze(requireNew(contentPaths.counters)),
        codeToText: Object.freeze(requireNew(contentPaths.dictCodeToText)),
        nameTagToText: Object.freeze(requireNew(contentPaths.nameTagToText)),
        kokujiList: Object.freeze(
            new Set(fs.readFileSync(contentPaths.kokujiList, "utf8"))),
        exampleWordIds: Object.freeze(requireNew(contentPaths.exampleWordIds)),

        // Kanji related
        isKnownKanji,
        getKanjiInfo,
        getKanjiMeanings,
        getKanjiLists,
        searchKanji,

        // Dictionary related
        dictionaryAvailable: true,
        getDictionaryEntryInfo,
        findDictionaryIdForWord,
        guessDictionaryId,
        guessAssociatedVocabEntry,
        searchDictionary,

        // Proper names
        getProperNameEntryInfo
    });
    return data;
};
