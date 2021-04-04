"use strict";

const csv = require("fast-csv");

module.exports = function (paths, modules) {
    const vocab = {};

    /**
     * Return SRS level for given word in the vocabulary.
     * @param {String} word
     * @returns {Promise[Integer]}
     */
    function getSrsLevel(word) {
        return modules.database.query(
            `SELECT level FROM vocabulary WHERE word = ?`, word)
        .then(([{level}]) => level);
    }

    /**
     * Return the ID of the given word (as assigned internally by the database).
     * @param {String} word
     * @returns {Promise[Integer]}
     */
    vocab.getId = function (word) {
        return modules.database.query(
            `SELECT rowid FROM vocabulary WHERE word = ?`, word)
        .then(([{rowid}]) => rowid);
    }

    /**
     * Return a list of all words in the vocabulary.
     * @param {String} sortingCriterion - "alphabetical", "dateAdded" or "level"
     * @param {Boolean} [sortBackwards=false]
     * @returns {Promise[Array[String]]}
     */
    vocab.getAll = function (sortingCriterion, sortBackwards=false) {
        let columnToSortBy;
        if (sortingCriterion === "alphabetical") columnToSortBy = "word";
        else if (sortingCriterion === "dateAdded") columnToSortBy = "date_added"
        else if (sortingCriterion === "level") columnToSortBy = "level";
        const sortingDirection = sortBackwards ? "DESC" : "ASC";
        return modules.database.query(
            `SELECT word FROM vocabulary
             ORDER BY ${columnToSortBy} ${sortingDirection}, rowid DESC`)
        .then((rows) => rows.map((row) => row.word));
    }

    /**
     * Check whether given word has been added to the vocabulary.
     * @param {String} word
     * @returns {Promise[Boolean]}
     */
    vocab.contains = function (word) {
        return modules.database.query(
            "SELECT COUNT(word) AS amount FROM vocabulary WHERE word = ?", word)
        .then(([{amount}]) => amount > 0);
    }

    /**
     * Return amount of words in the vocabulary.
     * @returns {Promise[Integer]}
     */
    vocab.getAmountAdded = function () {
        return modules.database.query(
            "SELECT COUNT(word) AS amount FROM vocabulary")
        .then(([{amount}]) => amount);
    }

    /**
     * Return amount of words in the vocabulary of the given language.
     * @param {String} language
     * @returns {Promise[Integer]}
     */
    vocab.sizeFor = function (language) {
        return modules.database.queryLanguage(language,
            "SELECT COUNT(word) AS amount FROM vocabulary")
        .then(([{amount}]) => amount);
    }

    const languagesWithoutSpaces = new Set([
        "Chinese", "Japanese", "Thai", "Khmer", "Lao", "Burmesese"
    ])

    function isMatchType(matchType, queryValue, entryValue) {
        const cleanedQuery = queryValue.replace(/^%+/, "").replace(/%+$/, "");
        let regexString
        let regex
        switch (matchType) {
            case "exact":
                return entryValue === cleanedQuery
            case "start":
                if (queryValue.startsWith("%")) return false
                return entryValue.startsWith(cleanedQuery)
            case "word":
                if (queryValue.startsWith("%") && queryValue.endsWith("%"))
                    return false
                regexString = utility.escapeRegex(cleanedQuery)
                if (!queryValue.startsWith("%")) {
                    regexString = "\\b" + regexString 
                }
                if (!queryValue.endsWith("%")) {
                    regexString = regexString + "\\b"
                }
                regexString = regexString.replace(/%+|[*]+/g, "\\S*?")
                regex = new RegExp(regexString)
                if (regex.test(entryValue)) return true
                return false
            case "wordStart":
                if (queryValue.startsWith("%") || queryValue.endsWith("%"))
                    return false
                regexString = "\\b" + utility.escapeRegex(cleanedQuery)
                regexString = regexString.replace(/%+|[*]+/g, "\\S*?")
                regex = new RegExp(regexString)
                if (regex.test(entryValue)) return true
                return false
            default:
                throw new Error("Unknown match type: " + matchType)
        }
    }

    const bracketContentsPattern = /(?:\[[^\]]*?\])|(?:\([^)]*?\))/g;
    const bracketPattern = /\(|\)|\[|\]/g;

    /**
     * Given an array of search results, order them according to how well each
     * matches the query.
     * @param {array} matches - Each entry is an object of the form
     *    { word: string, translations: string[], readings: string[]
     *      notes: string[] }
     * @param {string | object} query - If an object, it may contain following
     *    string fields: word, translations, readings, notes. All fields
     *    except for "word" may be undefined or null.
     */
    function sortMatches(matches, query, primaryLanguage, secondaryLanguage) {
        const fields = ["word", "translations", "readings", "notes"]
        const matchTypes = ["exact", "word", "start", "wordStart"]
        const matchesByType = {
            "exact": [],
            "start": [],
            "word": [],
            "wordStart": [],
            "other": []
        }
        const isStringQuery = typeof query === "string"
        // console.time("Classifying matches")
        for (const entry of matches) {
            let matchFound = false
            for (const matchType of matchTypes) {
                for (const fieldName of fields) {
                    if (!entry[fieldName] || (!isStringQuery && !query[fieldName]))
                        continue
                    const fieldValues = fieldName === "word" ?
                        [entry[fieldName].toLowerCase()] :
                        entry[fieldName].map(s => s.toLowerCase())
                    const queryValues = isStringQuery ?
                        [query.toLowerCase()] : [query[fieldName].toLowerCase()]

                    // Skip word-based matching critera for languages w/o spaces
                    const fieldUsesNoSpaces =
                        ((fieldName === "word" || fieldName === "readings") &&
                        languagesWithoutSpaces.has(primaryLanguage)) ||
                        ((fieldName === "translations" ||
                          fieldName === "notes") &&
                        languagesWithoutSpaces.has(secondaryLanguage))
                    if (fieldUsesNoSpaces &&
                            (matchType == "word" || matchType == "wordStart")) {
                        continue
                    }

                    // Add/remove leading "to " of english verbs
                    const isEnglishField =
                        (primaryLanguage === "English" && fieldName === "word") ||
                        (secondaryLanguage === "English" &&
                        (fieldName === "translations" || fieldName === "notes"))
                    if (isEnglishField) {
                        if (queryValues[0].startsWith("to ")) {
                            queryValues.push(queryValues[0].substr(3))
                        } else {
                            queryValues.push("to " + queryValues[0])
                        }
                    }

                    // Include kana-versions for Japanese words
                    const isJapaneseField =
                        (primaryLanguage === "Japanese" &&
                        (fieldName === "word" || fieldName === "readings")) ||
                        (secondaryLanguage === "Japanese" &&
                        (fieldName === "translations" || fieldName === "notes"))
                    if (isJapaneseField) {
                        queryValues.push(queryValues[0].toKana("hiragana"))
                        queryValues.push(queryValues[0].toKana("katakana"))
                    }

                    // Include field variants with all bracket content removed
                    const additionalFieldValues = []
                    for (const fieldValue of fieldValues) {
                        const bracketContentMatches = utility.findMatches(
                            bracketContentsPattern, fieldValue)
                        if (bracketContentMatches.length === 0) continue
                        const parts = []
                        let start = 0;
                        for (const match of bracketContentMatches) {
                            parts.push(fieldValue.slice(start, match.index))
                            start = match.index + match[0].length;
                        }
                        parts.push(fieldValue.slice(start))
                        additionalFieldValues.push(
                            utility.collapseWhitespace(parts.join(" ").trim()))
                    }
                    if (additionalFieldValues.length > 0) {
                        fieldValues.push(...additionalFieldValues)
                    }

                    // Check if query matches any of the values in this field
                    for (const fieldValue of fieldValues) {
                        for (const queryValue of queryValues) {
                            const isMatching = isMatchType(
                                matchType, queryValue, fieldValue)
                            if (isMatching) {
                                matchesByType[matchType].push(entry)
                                matchFound = true
                                break
                            }
                        }
                        if (matchFound) break
                    }
                    if (matchFound) break
                }
                if (matchFound) break
            }
            if (!matchFound) matchesByType["other"].push(entry)
        }
        // console.timeEnd("Classifying matches")
        const sortedMatches = []
        for (const matchType of matchTypes) {
            sortedMatches.push(...matchesByType[matchType])
        }
        sortedMatches.push(...matchesByType["other"])
        return sortedMatches
    }

    /**
     * Search the vocabulary for entries containing the given query string
     * in the word, readings or translations. Also try to match a version
     * converted to both hiragana and katakana, if the language is Japanese.
     * @param {String} query
     * @returns {Array[String]}
     */
    vocab.search = async function (query) {
        query = query.replace(/[*]/g, "%").replace(/[?]/g, "_");
        let matchString = query
        if (!matchString.includes("%")) matchString = "%" + matchString + "%";
        let multiFieldMatchString = matchString;
        if (!matchString.startsWith("%"))
            multiFieldMatchString = "%;" + multiFieldMatchString;
        if (!matchString.endsWith("%"))
            multiFieldMatchString = multiFieldMatchString + ";%";
        const args = [matchString, multiFieldMatchString, multiFieldMatchString]
        const conditions = ["word LIKE ?",
            "(';'||translations||';') LIKE ?", "(';'||readings||';') LIKE ?"];
        // Include searching for kana versions of readings
        if (modules.currentLanguage === "Japanese") {
            conditions.push("word LIKE ?", "word LIKE ?",
                "(';'||readings||';') LIKE ?", "(';'||readings||';') LIKE ?");
            args.push(matchString.toKana("hiragana"),
                      matchString.toKana("katakana"),
                      multiFieldMatchString.toKana("hiragana"),
                      multiFieldMatchString.toKana("katakana"));
        }
        // For english verbs, search both with and without the leading "to "
        if (!matchString.startsWith("%") && matchString.endsWith("%")) {
            if (modules.currentLanguage === "English") {
                conditions.push("word LIKE ?");
                if (matchString.startsWith("to ")) {
                    args.push(matchString.substr(3));
                } else {
                    args.push("to " + matchString);
                }
            }
            if (modules.currentSecondaryLanguage === "English") {
                conditions.push("(';'||translations||';') LIKE ?");
                if (matchString.startsWith("to ")) {
                    args.push("%;" + matchString.substr(3));
                } else {
                    args.push("%;to " + matchString);
                }
                if (!matchString.endsWith("%")) {
                    args[args.length - 1] += ";%";
                }
            }
        }
        const rows = await modules.database.query(
            `SELECT word, translations, readings, notes FROM vocabulary
             WHERE ${conditions.join(" OR ")}
             ORDER BY date_added DESC`, ...args);
        const matches = rows.map(({ word, translations, readings, notes }) => ({
            word,
            translations: translations !== null && translations.length ?
                translations.split(";") : null,
            readings: readings !== null && readings.length ?
                readings.split(";") : null,
            notes: notes !== null && notes.length ?
                notes.split(";") : null
        }))
        const sortedMatches = sortMatches(
            matches, query, modules.currentLanguage,
            modules.currentSecondaryLanguage)
        return sortedMatches.map((match) => match.word);
    }

    /**
     * Add given word to the vocabulary with given details. If the word is
     * already added, new translations or readings are added without deleting
     * any old ones, and the SRS level and review date always stay the same.
     * Returns true if the word has been newly added.
     */
    vocab.add = async function ({ word, translations=[], readings=[], notes=[],
                                  level=1, correctCount=0, mistakeCount=0,
                                  reviewDate=null, creationDate=null,
                                  dictionaryId=null }) {
        translations = utility.removeDuplicates(translations);
        readings = utility.removeDuplicates(readings);
        notes = utility.removeDuplicates(notes);
        const rows = await modules.database.query(
            "SELECT * FROM vocabulary WHERE word = ?", word);
        if (!rows.length) {
            // Word not added. Insert new row into the vocabulary table
            if (reviewDate === null) {
                const spacing = modules.srs.currentScheme.intervals[level];
                reviewDate = utility.getTime() + spacing;
            }
            if (creationDate === null) {
                creationDate = utility.getTime();
            }
            modules.stats.updateScore(modules.test.mode.WORDS, 0, level);
            await modules.database.run(`
                INSERT INTO vocabulary
                (word, date_added, level, review_date,
                 translations, readings, notes,
                 correct_count, mistake_count, dictionary_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                word, creationDate, level, reviewDate,
                translations.length > 0 ? translations.join(";") : null,
                readings.length > 0 ? readings.join(";") : null,
                notes.length > 0 ? notes.join(";") : null,
                correctCount, mistakeCount, dictionaryId);
            return true;
        }

        // If word is already added, extend with new values without deleting old
        const oldTranslations = rows[0].translations === null ?
            new Set() : new Set(rows[0].translations.split(";"));
        const oldReadings = rows[0].readings === null ?
            new Set() : new Set(rows[0].readings.split(";"));
        const oldNotes = rows[0].notes === null ?
            new Set() : new Set(rows[0].notes.split(";"));
        const newTranslations = [...oldTranslations];
        const newReadings = [...oldReadings];
        const newNotes = [...oldNotes];
        for (const translation of translations) {
            if (!oldTranslations.has(translation)) {
                newTranslations.push(translation);
            }
        }
        for (const reading of readings) {
            if (!oldReadings.has(reading)) {
                newReadings.push(reading);
            }
        }
        for (const note of notes) {
            if (!oldNotes.has(note)) {
                newNotes.push(note);
            }
        }
        await modules.database.run(`
            UPDATE vocabulary SET translations = ?, readings = ?, notes = ?
            WHERE word = ?`,
            newTranslations.length > 0 ? newTranslations.join(";") : null,
            newReadings.length > 0 ? newReadings.join(";") : null,
            newNotes.length > 0 ? newNotes.join(";") : null, word);
        return false;
    }

    /**
     * Edit given word in the vocabulary using given details. Old translations
     * and readings are replaced with new ones. If a different SRS level is
     * given, review date gets adjusted, otherwise stays the same.
     * Returns true if the a change has been made to the data.
     * @param {String} word
     * @param {Array[String]} translations
     * @param {Array[String]} readings
     * @param {Integer} level
     * @returns {Promise[Boolean]}
     */
    vocab.edit = async function (word, translations, readings, notes, level) {
        // Get old values
        const rows = await modules.database.query(
            "SELECT * FROM vocabulary WHERE word = ?", word);
        const oldTranslations = rows[0].translations === null ?
            [] : new Set(rows[0].translations.split(";"));
        const oldReadings = rows[0].readings === null ?
            [] : new Set(rows[0].readings.split(";"));
        const oldNotes = rows[0].notes === null ?
            [] : new Set(rows[0].notes.split(";"));
        const oldLevel = rows[0].level;
        const oldReviewDate = rows[0].review_date;

        // Don't write to database if nothing has changed
        const hasChanged =
            !utility.setEqual(new Set(oldTranslations),new Set(translations))
            || !utility.setEqual(new Set(oldReadings), new Set(readings))
            || !utility.setEqual(new Set(oldNotes), new Set(notes))
            || oldLevel !== level;
        if (!hasChanged) return false

        // Compute new SRS info and update stats (only if the level changed)
        const spacing = modules.srs.currentScheme.intervals[level];
        const newReviewDate = oldLevel === level ? oldReviewDate :
            utility.getTime() + spacing;
        if (oldLevel !== level)
            modules.stats.updateScore(modules.test.mode.WORDS, oldLevel, level);

        // Apply changes to database
        await modules.database.run(`
            UPDATE vocabulary
            SET translations = ?, readings = ?, notes = ?, level = ?,
                review_date = ?
            WHERE word = ?`,
            translations.length > 0 ? translations.join(";") : null,
            readings.length > 0 ? readings.join(";") : null,
            notes.length > 0 ? notes.join(";") : null,
            level, newReviewDate, word);
        return true
    }

    /**
     * Completely remove given added word from the vocabulary.
     * @param {String} word
     * @returns {Promise}
     */
    vocab.remove = function (word) {
        const lists = modules.vocabLists.getListsForWord(word);
        for (const list of lists) {
            modules.vocabLists.removeWordFromList(word, list);
        }
        return getSrsLevel(word).then((oldLvl) => {
            modules.stats.updateScore(modules.test.mode.WORDS, oldLvl, 0);
            return modules.database.run(
                    "DELETE FROM vocabulary WHERE word = ?", word);
        });
    }

    /**
     * Rename given word in the vocabulary. All word details stay the same.
     * @param {String} word
     * @param {String} newWord
     * @returns {Promise}
     */
    vocab.rename = function (word, newWord) {
        const lists = modules.vocabLists.getListsForWord(word);
        for (const list of lists) {
            modules.vocabLists.removeWordFromList(word, list);
            modules.vocabLists.addWordToList(newWord, list);
        }
        return modules.database.run(
                "UPDATE vocabulary SET word = ? WHERE word = ?",
                newWord, word);
    }

    /**
     * Return information about given added word. Info object contains fields
     * "translations", "readings", "notes", "level", "reviewDate", "dateAdded".
     * @param {String} word
     * @returns {Promise[Object]}
     */
    vocab.getInfo = function (word) {
        return modules.database.query(
            `SELECT date_added, level, review_date, translations, readings,
                    notes, dictionary_id
             FROM vocabulary WHERE word = ?`, word)
        .then(([{ date_added, level, review_date, translations, readings,
                  notes, dictionary_id }]) => {
            const info = {};
            info.translations =
                translations === null ? [] : translations.split(";");
            info.readings =
                readings === null ? [] : readings.split(";");
            info.notes =
                notes === null ? [] : notes.split(";");
            info.level = level;
            info.reviewDate = review_date;
            info.dateAdded = date_added;
            info.dictionaryId = dictionary_id;
            return info;
        });
    }

    /**
     * Return translations for given word, or an empty array if the word is not
     * added or has no translations.
     * @param {String} word
     * @returns {Promise[Array[String]]}
     */
    vocab.getTranslations = function (word) {
        return modules.database.query(
            "SELECT translations FROM vocabulary WHERE word = ?", word)
        .then((rows) => {
            if (rows.length === 0 || rows[0].translations === null) return [];
            return rows[0].translations.split(";");
        });
    }

    /**
     * Return readings for given word, or an empty array if the word is not
     * added or has no readings.
     * @param {String} word
     * @returns {Promise[Array[String]]}
     */
    vocab.getReadings = function (word) {
        return modules.database.query(
            "SELECT readings FROM vocabulary WHERE word = ?", word)
        .then((rows) => {
            if (rows.length === 0 || rows[0].readings === null) return [];
            return rows[0].readings.split(";");
        });
    }

    /**
     * Return notes associated with given word, or an empty array if the word
     * is not added or has no notes.
     * @param {String} word
     * @returns {Promise[Array[String]]}
     */
    vocab.getNotes = function (word) {
        return modules.database.query(
            "SELECT notes FROM vocabulary WHERE word = ?", word)
        .then((rows) => {
            if (rows.length === 0 || rows[0].notes === null) return [];
            return rows[0].notes.split(";");
        });
    }

    /**
     * Return dictionary ID associated with given word in the vocabulary.
     * If no ID is associated, return null.
     * @param {String} word
     * @returns {Promise[Integer|null]}
     */
    vocab.getAssociatedDictionaryId = function (word) {
        return modules.database.query(
            "SELECT dictionary_id FROM vocabulary WHERE word = ?", word)
        .then((rows) => {
            if (rows.length === 0) {
                throw new Error(
                    `Word '${word}' could not be found in the vocabulary.`);
            }
            return rows[0].dictionary_id;
        });
    }

    /**
     * Return the date when the given word was added (in seconds).
     * @param {String} word
     * @returns {Integer}
     */
    vocab.getDateAdded = async function (word) {
        const rows = await modules.database.query(
            `SELECT date_added FROM vocabulary WHERE word = ?`, word);
        return rows[0].date_added;
    }

    /**
     * Return a mapping from words to date added (in seconds).
     */
    vocab.getDateAddedForEachWord = function () {
        return modules.database.query(`SELECT word, date_added FROM vocabulary`)
        .then((rows) => {
            const map = new Map();
            for (const { word, date_added } of rows) {
                map.set(word, date_added);
            }
            return map;
        });
    }

    /**
     * Return a mapping from words to their current SRS levels.
     */
    vocab.getLevelForEachWord = function () {
        return modules.database.query(`SELECT word, level FROM vocabulary`)
        .then((rows) => {
            const map = new Map();
            for (const { word, level } of rows) {
                map.set(word, level);
            }
            return map;
        });
    }

    /**
     * Return a mapping from words to their internal database IDs.
     */
    vocab.getIdForEachWord = function () {
        return modules.database.query(`SELECT word, rowid FROM vocabulary`)
        .then((rows) => {
            const map = new Map();
            for (const { word, rowid } of rows) {
                map.set(word, rowid);
            }
            return map;
        });
    }

    /**
     * Write the given words including all associated information into a CSV
     * file at the given path. If no list of words is given, export all words.
     * @param {Array[String]} words
     */
    vocab.export = async function (filepath, words) {
        let rows;
        if (words === undefined) {
            rows = await modules.database.query(
                `SELECT * FROM vocabulary ORDER BY date_added DESC, rowid DESC`)
        } else {
            rows = [];
            for (const word of words) {
                rows.push((await modules.database.query(
                    `SELECT * FROM vocabulary WHERE word = ?`, word))[0]);
            }
        }
        if (rows.length === 0) return;
        csv.writeToPath(filepath, rows, {
            headers: true,
            delimiter: "\t",
            transform: (row) => ({
                "Word": row.word,
                "Creation date": row.date_added,

                "Meanings": row.translations,
                "Readings": row.readings,
                "Notes": row.notes,

                "SRS level": row.level,
                "Review date": row.review_date,
                "Correct count": row.correct_count,
                "Mistake count": row.mistake_count,
                "Tags": modules.vocabLists.getListsForWord(row.word)
                        .map(listName => listName.replace(";", "")).join(";"),
                "Dictionary ID": row.dictionary_id
            })
        });
    }

    return vocab;
};
