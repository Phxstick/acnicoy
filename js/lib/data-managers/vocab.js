"use strict";

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
     * Return a list of all words in the vocabulary.
     * @param {String} sortingCriterion - "alphabetical", "dateAdded" or "level"
     * @param {Boolean} [sortBackwards=false]
     * @returns {Promise[Array[String]]}
     */
    vocab.getAll = function (sortingCriterion, sortBackwards=false) {
        let columnToSortBy;
        if (sortingCriterion === "alphabetical") columnToSortBy = "word";
        else if (sortingCriterion === "dateAdded") columnToSortBy = "date_added";
        else if (sortingCriterion === "level") columnToSortBy = "level";
        const sortingDirection = sortBackwards ? "DESC" : "ASC";
        return modules.database.query(
            `SELECT word FROM vocabulary
             ORDER BY ${columnToSortBy} ${sortingDirection}`)
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
    vocab.size = function () {
        return modules.database.query(
            "SELECT COUNT(word) AS amount FROM vocabulary")
        .then(([{amount}]) => amount);
    }

    /**
     * Search the vocabulary for entries containing the given query string
     * in their word, readings or translations. Also try to match a version
     * converted to both hiragana and katakana, if the language is Japanese.
     * If a subset of words is provided as additional argument, only search
     * that subset.
     * @param {String} query
     * @param {Array} [subset]
     * @returns {Array[String]}
     */
    vocab.search = async function (query, { subset }={}) {
        // TODO: Extend and optimize this function, use exact-match-priority
        // TODO: Add sorting algorithm using scores
        // If no subset of words is given, search entire vocabulary
        if (subset === undefined) {
            const matchString = `%${query}%`;
            const conditions = [
                "word LIKE ?", "translations LIKE ?", "readings LIKE ?"];
            const args = [matchString, matchString, matchString];
            if (modules.currentLanguage === "Japanese") {
                conditions.push("word LIKE ?", "word LIKE ?",
                    "readings LIKE ?", "readings LIKE ?");
                const hiraganaMatchString = matchString.toKana("hiragana");
                const katakanaMatchString = matchString.toKana("katakana");
                args.push(hiraganaMatchString, katakanaMatchString,
                    hiraganaMatchString, katakanaMatchString);
            }
            const rows = await modules.database.query(
                `SELECT word FROM vocabulary
                 WHERE ${conditions.join(" OR ")}`, ...args);
            return rows.map((row) => row.word);
        } else {
            // TODO
        }
    }

    /**
     * Add given word to the vocabulary with given details. If the word is
     * already added, new translations or readings are added without deleting
     * any old ones, and the SRS level and review date always stay the same.
     * Status information about the process is returned in form of an array
     * [wasWordAlreadyAdded, numNewTranslationsAdded, numNewReadingsAdded].
     * @param {String} word
     * @param {Array[String]} translations
     * @param {Array[String]} readings
     * @param {Integer} level
     * @param {Integer} [dictionaryId=null] Id of the entry in the dictionary
     *     this word corresponds to. Optional.
     * @returns {Promise[Array[String]}
     */
    vocab.add = async function (word, translations, readings, level,
                                dictionaryId=null) {
        const rows = await modules.database.query(
            "SELECT * FROM vocabulary WHERE word = ?", word);
        if (!rows.length) {
            // Word not added. Insert new row into the the vocabulary table
            const spacing = modules.srs.currentScheme.intervals[level];
            modules.stats.updateScore(modules.test.mode.WORDS, 0, level);
            await modules.database.run(`
                INSERT INTO vocabulary
                (word, date_added, level, review_date,
                 translations, readings, dictionary_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                word, utility.getTime(), level, utility.getTime() + spacing,
                translations.join(";"), readings.join(";"), dictionaryId);
            return [true, translations.length, readings.length];
        }
        const oldTranslations = rows[0].translations.length === 0 ?
            new Set() : new Set(rows[0].translations.split(";"));
        const oldReadings = rows[0].readings.length === 0 ?
            new Set() : new Set(rows[0].readings.split(";"));
        const newTranslations = [...oldTranslations];
        const newReadings = [...oldReadings];
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
        await modules.database.run(`
            UPDATE vocabulary SET translations = ?, readings = ?
            WHERE word = ?`,
            newTranslations.join(";"), newReadings.join(";"), word);
        let numTranslationsAdded = 0;
        let numReadingsAdded = 0;
        for (const translation of translations)
            numTranslationsAdded += !oldTranslations.has(translation);
        for (const reading of readings)
            numReadingsAdded += !oldReadings.has(reading);
        return [false, numTranslationsAdded, numReadingsAdded];
    }

    /**
     * Edit given word in the vocabulary using given details. Old translations
     * and readings are replaced with new ones. If a different SRS level is
     * given, review date gets adjusted, otherwise stays the same.
     * Status information about the process is returned in form of a string
     * which can take the values "removed", "updated" or "no-change".
     * @param {String} word
     * @param {Array[String]} translations
     * @param {Array[String]} readings
     * @param {Integer} level
     * @returns {Promise[String]}
     */
    vocab.edit = async function (word, translations, readings, level) {
        // If there are no translations, completely remove the word
        if (!translations.length) {
            const oldLevel = await getSrsLevel(word);
            modules.stats.updateScore(modules.test.mode.WORDS, oldLevel, 0);
            await vocab.remove(word);
            return "removed";
        }
        // Get old values
        const rows = await modules.database.query(
            "SELECT * FROM vocabulary WHERE word = ?", word);
        const oldTranslations = rows[0].translations.length === 0 ?
            [] : new Set(rows[0].translations.split(";"));
        const oldReadings = rows[0].readings.length === 0 ?
            [] : new Set(rows[0].readings.split(";"));
        const oldLevel = rows[0].level;
        const oldReviewDate = rows[0].review_date;
        // Apply changes to database
        const spacing = modules.srs.currentScheme.intervals[level];
        const newReviewDate = oldLevel === level ? oldReviewDate :
            utility.getTime() + spacing;
        modules.stats.updateScore(modules.test.mode.WORDS, oldLevel, level);
        await modules.database.run(`
            UPDATE vocabulary
            SET translations = ?, readings = ?, level = ?, review_date = ?
            WHERE word = ?`,
            translations.join(";"), readings.join(";"), level,
            newReviewDate, word);
        // Report whether anything has changed
        const updated =
            !utility.setEqual(new Set(oldTranslations), new Set(translations))
            || !utility.setEqual(new Set(oldReadings), new Set(readings))
            || oldLevel !== level;
        return updated ? "updated" : "no-change";
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
     * "translations", "readings", "level", "reviewDate", "dateAdded".
     * @param {String} word
     * @returns {Promise[Object]}
     */
    vocab.getInfo = function (word) {
        return modules.database.query(
            `SELECT date_added, level, review_date, translations, readings,
                    dictionary_id
             FROM vocabulary WHERE word = ?`, word)
        .then(([{ date_added, level, review_date, translations, readings,
                  dictionary_id }]) => {
            const info = {};
            info.translations =
                translations.length === 0 ? [] : translations.split(";");
            info.readings =
                readings.length === 0 ? [] : readings.split(";");
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
            if (rows.length === 0) return [];
            if (rows[0].translations.length === 0) return [];
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
            if (rows.length === 0) return [];
            if (rows[0].readings.length === 0) return [];
            return rows[0].readings.split(";");
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
     * Return a mapping from words to date added (in seconds).
     * @returns {Promise[Object[Integer]]}
     */
    vocab.getDateAddedForEachWord = function () {
        return modules.database.query(`SELECT word, date_added FROM vocabulary`)
        .then((rows) => {
            const mapping = {};
            for (const { word, date_added } of rows) {
                mapping[word] = date_added;
            }
            return mapping;
        });
    }

    /**
     * Return a mapping from words to their current SRS levels.
     * @returns {Promise[Object[Integer]]}
     */
    vocab.getLevelForEachWord = function () {
        return modules.database.query(`SELECT word, level FROM vocabulary`)
        .then((rows) => {
            const mapping = {};
            for (const { word, level } of rows) {
                mapping[word] = level;
            }
            return mapping;
        });
    }

    return vocab;
};
