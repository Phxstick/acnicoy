"use strict";

module.exports = function (paths, modules) {
    const vocab = {};

    function getSrsLevel(word) {
        return modules.database.query(
            `SELECT level FROM vocabulary WHERE word = ?`, word)
        .then(([{level}]) => level);
    }

    vocab.getAll = function () {
        return modules.database.query(
            "SELECT word FROM vocabulary ORDER BY word ASC")
        .then((rows) => rows.map((row) => row.word));
    }

    vocab.contains = function (word) {
        return modules.database.query(
            "SELECT COUNT(word) FROM vocabulary WHERE word = ?", word)
        .then(([{amount}]) => amount > 0);
    }

    vocab.size = function () {
        return modules.database.query(
            "SELECT COUNT(word) AS amount FROM vocabulary")
        .then(([{amount}]) => amount);
    }

    vocab.search = function (query, { subset }) {
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
            .then((rows) => rows.forEach((row) => row.word));
        } else {
            // TODO
        }
    }

    vocab.add = function (word, translations, readings, level) {
        return modules.database.query(
            "SELECT * FROM vocabulary WHERE word = ?", word)
        .then((rows) => {
            if (!rows.length) {
                // Word not added. Insert new row into the the vocabulary table
                const spacing =
                    modules.languageSettings["SRS"]["spacing"][level];
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
                [] : new Set(rows[0].translations.split(";"));
            const oldReadings = rows[0].readings.length === 0 ?
                [] : new Set(rows[0].readings.split(";"));
            return modules.database.run(`
                UPDATE vocabulary SET translations = ?, readings = ?
                WHERE word = ?`,
                translations.join(";"), readings.join(";"), word)
            .then(() => {
                let numTranslationsAdded = 0;
                let numReadingsAdded = 0;
                for (let translation of translations)
                    numTranslationsAdded += !oldTranslations.has(translation);
                for (let reading of readings)
                    numReadingsAdded += !oldReadings.has(reading);
                return [false, numTranslationsAdded, numReadingsAdded];
            });
        });
    }

    vocab.edit = function (word, translations, readings, level) {
        // If there are no translations, completely remove the word
        if (!translations.length) {
            return vocab.remove(word).then(() => "removed");
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
            const spacing = modules.languageSettings["SRS"]["spacing"][level];
            const newReviewDate = oldLevel === level ? oldReviewDate :
                utility.getTime() + spacing;
            return modules.database.run(`
                UPDATE vocabulary
                SET translations = ?, readings = ?, level = ?, review_date = ?
                WHERE word = ?`,
                translations.join(";"), readings.join(";"), level,
                newReviewDate, word)
            .then(() => updated ? "updated" : "no-change");
        });
    }

    vocab.remove = function (word) {
        const lists = modules.vocabLists.getListsForWord(word);
        for (let list of lists) {
            modules.vocabLists.removeWordFromList(word, list);
        }
        return modules.database.run(
                "DELETE FROM vocabulary WHERE word = ?", word);
    }

    vocab.rename = function (word, newWord) {
        const lists = modules.vocabLists.getListsForWord(word);
        for (let list of lists) {
            modules.vocabLists.removeWordFromList(word, list);
            modules.vocabLists.addWordToList(newWord, list);
        }
        return modules.database.run(
                "UPDATE vocabulary SET word = ? WHERE word = ?",
                newWord, word);
    }

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

    vocab.getTranslations = function (word) {
        return modules.database.query(
            "SELECT translations FROM vocabulary WHERE word = ?", word)
        .then(([{translations}]) =>
                translations.length === 0 ? [] : translations.split(";"));
    }

    vocab.getReadings = function (word) {
        return modules.database.query(
            "SELECT readings FROM vocabulary WHERE word = ?", word)
        .then(([{readings}]) => 
                readings.length === 0 ? [] : readings.split(";"));
    }

    return vocab;
};
