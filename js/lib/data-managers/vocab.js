"use strict";

module.exports = function (paths, modules) {

    function getWords(translation) {
        return modules.database.query(
            "SELECT entry FROM translations WHERE translation = ?", translation)
        .then((rows) => rows.map((row) => row.entry));
    }

    function getSrsLevel(word) {
        return modules.database.query(
            `SELECT level FROM vocabulary WHERE entry = ?`, word)
        .then((rows) => rows[0].level);
    }


    function getAll() {
        return modules.database.query(
            "SELECT entry FROM vocabulary ORDER BY entry ASC")
        .then((rows) => rows.map((row) => row.entry));
    }


    function contains(word) {
        return modules.database.query(
            "SELECT entry FROM vocabulary WHERE entry = ?", word)
        .then((rows) => rows.length > 0);
    }


    function size() {
        return modules.database.query(
            "SELECT COUNT(*) AS amount FROM vocabulary")
        .then((rows) => rows[0].amount);
    }


    function search(query, subset=null) {
        // TODO: Extend and optimize this function
        // TODO: Add sorting algorithm using scores
        // If no subset of words is given, search entire vocabulary efficiently
        if (subset === null) {
            const matchString = `%${query}%`;
            const matchedWords = Promise.all([
                modules.database.query(
                    "SELECT entry FROM vocabulary WHERE entry like ?",
                    matchString),
                modules.database.query(
                    "SELECT entry FROM translations WHERE translation like ?",
                    matchString),
                modules.database.query(
                    "SELECT entry FROM readings WHERE reading like ?",
                    matchString),
                modules.database.query(
                    "SELECT entry FROM readings WHERE reading like ?",
                    matchString.toKana("hira"))
            ]);
            return matchedWords.then((rowsArray) => {
                const result = new Set();
                for (let rows of rowsArray)
                    rows.forEach((row) => result.add(row.entry));
                return [...result];
            });
        } else {
            // TODO
        }
    }


    // TODO: Assume that argument is always added in the database?
    //       Does it even make a difference?
    function add(word, translations, readings, level, log=true) {
      return new Promise((resolve, reject) => {
        contains(word).then((isAdded) => {
          // Add word to SRS system if not yet added and update stats
          if (!isAdded) {
            const spacing = modules.languageSettings["SRS"]["spacing"][level];
            modules.database.run("INSERT INTO vocabulary VALUES (?, ?, ?)",
                       word, level, utility.getTime() + spacing);
            modules.stats.incrementWordsAddedToday();
            modules.stats.updateDailyScore(1, 0, level);
          }
          // Add translations and readings
          const translationsAdded = [];
          const readingsAdded = [];
          for (let translation of translations)
            translationsAdded.push(addTranslation(word, translation, false));
          for (let reading of readings)
            readingsAdded.push(addReading(word, reading, false));
          // Log accordingly and return information
          Promise.all(translationsAdded).then((tAdded) => {
            Promise.all(readingsAdded).then((rAdded) => {
              const newTranslations = [];
              const newReadings = [];
              tAdded.forEach((val, ind) => {
                if (val) newTranslations.push(translations[ind]);
              });
              rAdded.forEach((val, ind) => {
                if (val) newReadings.push(readings[ind]);
              });
              if (log) {
                if (!isAdded) {
                  modules.history.log({
                      type: "A", column: "entry", new_entry: word,
                      new_translations: translations.join(", "),
                      new_readings: readings.join(", ") });
                } else {
                  if (newTranslations.length > 0)
                    modules.history.log({
                        type: "A", column: "translation", old_entry: word,
                        new_translations: newTranslations.join(", ") });
                  if (newReadings.length > 0)
                    modules.history.log({
                        type: "A", column: "reading", old_entry: word,
                        new_readings: newReadings.join(", ") });
                }
              }
              resolve([!isAdded, newTranslations.length, newReadings.length]);
            });
          });
        });
      });
    }


    function remove(word) {
      return new Promise((resolve, reject) => {
        getTranslations(word).then((translations) => {
          Promise.all([
            modules.database.run(
                "DELETE FROM vocabulary WHERE entry = ?", word),
            modules.database.run(
                "DELETE FROM translations WHERE entry = ?", word),
            modules.database.run(
                "DELETE FROM readings WHERE entry = ?", word)
          ]).then(() => {
            for (let list of modules.vocabLists.getListsForWord(word)) {
                modules.vocabLists.removeWordFromList(word, list);
            }
            const promises = [];
            for (let translation of translations) {
              promises.push(getWords(translation).then((words) => {
                if (words.length === 0)
                  return modules.database.run(
                    "DELETE FROM vocabulary_back WHERE entry = ?", translation);
              }));
            }
            resolve(Promise.all(promises));
          });
        });
      });
    }


    function rename(word, newWord) {
        return Promise.all([
            getTranslations(word), getReadings(word), getSrsLevel(word)])
        .then(([translations, readings, level]) => {
            const lists = modules.vocabLists.getListsForWord(word);
            return remove(word)
            .then(() => add(newWord, translations, readings, level, false))
            .then(() => {
                for (let list of lists)
                    modules.vocabLists.addWordToList(newWord, list);
            });
        });
    }


    function getTranslations(word) {
        return modules.database.query(
        "SELECT translation FROM translations WHERE entry = ?", word)
        .then((rows) => rows.map((row) => row.translation));
    }


    function getReadings(word) {
        return modules.database.query(
            "SELECT reading FROM readings WHERE entry = ?", word)
        .then((rows) => rows.map((row) => row.reading));
    }


    function addTranslation(word, translation) {
        modules.database.query(
            "SELECT * FROM vocabulary_back WHERE entry = ?", translation)
        .then((rows) => {
            if (rows.length === 0) {
                modules.database.run(
                    "INSERT INTO vocabulary_back VALUES (?, ?, ?)",
                    translation, 0, 0);
            }
        });
        return getTranslations(word).then((translations) => {
            if (!translations.contains(translation))
                return modules.database.run(
                    "INSERT INTO translations VALUES (?, ?)", word, translation)
                .then(() => true);
            return false;
        });
    }


    function addReading(word, reading) {
        return getReadings().then((readings) => {
            if (!readings.contains(reading))
                return modules.database.run(
                    "INSERT INTO readings VALUES (?, ?)", word, reading)
                .then(() => true);
            return false;
        });
    }


    function removeTranslation(word, translation) {
      return getWords(translation).then((words) => {
        return getTranslations(word).then((translations) => {
          if (translations.length === 1)
            return remove(word);
          const promises = [];
          if (words.length === 1)
            promises.push(modules.database.run(
                "DELETE FROM vocabulary_back WHERE entry = ?", translation));
          promises.push(modules.database.run(
              "DELETE FROM translations WHERE entry = ? AND translation = ?",
              word, translation));
          return Promise.all(promises);
        });
      });
    }


    function removeReading(word, reading) {
      return modules.database.run(
         "DELETE FROM readings WHERE entry = ? AND reading = ?", word, reading);
    }

    return {
        getAll,
        contains,
        size,
        search,
        add,
        remove,
        rename,
        getTranslations,
        getReadings,
        addTranslation,
        addReading,
        removeTranslation,
        removeReading
    };
};
