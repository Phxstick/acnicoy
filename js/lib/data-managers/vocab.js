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
     * @returns {Promise[Array[String]]}
     */
    vocab.getAll = function () {
        return modules.database.query(
            "SELECT word FROM vocabulary ORDER BY word ASC")
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

    vocab.search = function (query, { subset }={}) {
        // TODO: Extend and optimize this function
        // TODO: Add sorting algorithm using scores
        // If no subset of words is given, search entire vocabulary
        if (subset === undefined) {
            const matchString = `%${query}%`;
            return modules.database.query(
                `SELECT DISTINCT word FROM vocabulary
                 WHERE word LIKE ?
                    OR translations LIKE ?
                    OR readings LIKE ?
                    OR readings LIKE ?`,
                matchString, matchString, matchString,
                matchString.toKana("hira"))
            .then((rows) => rows.map((row) => row.word));
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
     * @returns {Promise[Array[String]}
     */
    vocab.add = function (word, translations, readings, level) {
        return modules.database.query(
            "SELECT * FROM vocabulary WHERE word = ?", word)
        .then((rows) => {
            if (!rows.length) {
                // Word not added. Insert new row into the the vocabulary table
                const spacing = modules.srs.currentScheme.intervals[level];
                modules.stats.updateScore(modules.test.mode.WORDS, 0, level);
                return modules.database.run(`
                    INSERT INTO vocabulary
                    (word, date_added, level, review_date,
                     translations, readings)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    word, utility.getTime(), level, utility.getTime() + spacing,
                    translations.join(";"), readings.join(";"))
                .then(() => [true, translations.length, readings.length]);
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
            return modules.database.run(`
                UPDATE vocabulary SET translations = ?, readings = ?
                WHERE word = ?`,
                newTranslations.join(";"), newReadings.join(";"), word)
            .then(() => {
                let numTranslationsAdded = 0;
                let numReadingsAdded = 0;
                for (const translation of translations)
                    numTranslationsAdded += !oldTranslations.has(translation);
                for (const reading of readings)
                    numReadingsAdded += !oldReadings.has(reading);
                return [false, numTranslationsAdded, numReadingsAdded];
            });
        });
    }

    /**
     * Edit given word in the vocabulary using given details. Old translations
     * and readings are replaced with new ones. If a different SRS level is
     * given, review date gets adjusted, otherwise stays the same.
     * Status information about the process is returned in form of a string
     * which can take the values "updated" or "no-change".
     * @param {String} word
     * @param {Array[String]} translations
     * @param {Array[String]} readings
     * @param {Integer} level
     * @returns {Promise[String]}
     */
    vocab.edit = function (word, translations, readings, level) {
        // If there are no translations, completely remove the word
        if (!translations.length) {
            return getSrsLevel(word).then((oldLvl) => {
                modules.stats.updateScore(modules.test.mode.WORDS, oldLvl, 0);
                return vocab.remove(word).then(() => "removed");
            });
        }
        return modules.database.query(
            "SELECT * FROM vocabulary WHERE word = ?", word)
        .then((rows) => {
            // Get old values
            const oldTranslations = rows[0].translations.length === 0 ?
                [] : new Set(rows[0].translations.split(";"));
            const oldReadings = rows[0].readings.length === 0 ?
                [] : new Set(rows[0].readings.split(";"));
            const oldLevel = rows[0].level;
            const oldReviewDate = rows[0].review_date;
            // Check if anything has changed
            const updated =
                !utility.setEqual(
                    new Set(oldTranslations), new Set(translations)) ||
                !utility.setEqual(
                    new Set(oldReadings), new Set(readings)) ||
                oldLevel !== level;
            // Apply changes to database
            const spacing = modules.srs.currentScheme.intervals[level];
            const newReviewDate = oldLevel === level ? oldReviewDate :
                utility.getTime() + spacing;
            modules.stats.updateScore(modules.test.mode.WORDS, oldLevel, level);
            return modules.database.run(`
                UPDATE vocabulary
                SET translations = ?, readings = ?, level = ?, review_date = ?
                WHERE word = ?`,
                translations.join(";"), readings.join(";"), level,
                newReviewDate, word)
            .then(() => updated ? "updated" : "no-change");
        });
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
            `SELECT date_added, level, review_date, translations, readings
             FROM vocabulary WHERE word = ?`, word)
        .then(([{date_added, level, review_date, translations, readings}]) => {
            const info = {};
            info.translations =
                translations.length === 0 ? [] : translations.split(";");
            info.readings =
                readings.length === 0 ? [] : readings.split(";");
            info.level = level;
            info.reviewDate = review_date;
            info.dateAdded = date_added;
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

    return vocab;
};
