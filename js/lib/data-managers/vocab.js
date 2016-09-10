"use strict";

// Internal objects set externally
let trainer;
let vocabLists;
let stats;
let history;
let languageSettings;

module.exports.internals = {
    set trainer(obj) { trainer = obj; },
    set vocabLists(obj) { vocabLists = obj; },
    set stats(obj) { stats = obj; },
    set history(obj) { history = obj; },
    set languageSettings(obj) { languageSettings = obj; }
};


function getWords(translation) {
    return trainer.query("SELECT entry FROM translations WHERE translation = ?",
        translation).then((rows) => rows.map((row) => row.entry));
}

function getSrsLevel(word) {
    return trainer.query(`SELECT level FROM vocabulary WHERE entry = ?`, word)
    .then((rows) => rows[0].level);
}


function getAll() {
    return trainer.query("SELECT entry FROM vocabulary ORDER BY entry ASC")
    .then((rows) => rows.map((row) => row.entry));
}


function contains(word) {
    return trainer.query("SELECT entry FROM vocabulary WHERE entry = ?", word)
    .then((rows) => rows.length > 0);
}


function size() {
    return trainer.query("SELECT COUNT(*) AS amount FROM vocabulary").then(
        (rows) => rows[0].amount);
}


function search(query, subset=null) {
    // TODO: Extend and optimize this function
    // TODO: Add sorting algorithm using scores
    // If no subset of words is given, search the entire vocabulary efficiently
    if (subset === null) {
        const matchString = `%${query}%`;
        const matchedWords = Promise.all([
            trainer.query("SELECT entry FROM vocabulary WHERE entry like ?",
                matchString),
            trainer.query(
                "SELECT entry FROM translations WHERE translation like ?",
                matchString),
            trainer.query("SELECT entry FROM readings WHERE reading like ?",
                matchString),
            trainer.query("SELECT entry FROM readings WHERE reading like ?",
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


// TODO: Assume that argument is always added in the trainer?
//       Does it even make a difference?
function add(word, translations, readings, level, log=true) {
  return new Promise((resolve, reject) => {
    contains(word).then((isAdded) => {
      // Add word to SRS system if not yet added and update stats
      if (!isAdded) {
        const spacing = languageSettings["SRS"]["spacing"][level];
        trainer.run("INSERT INTO vocabulary VALUES (?, ?, ?)",
                   word, level, utility.getTime() + spacing);
        stats.incrementWordsAddedToday();
        stats.updateDailyScore(1, 0, level);
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
              history.log({ type: "A", column: "entry", new_entry: word,
                            new_translations: translations.join(", "),
                            new_readings: readings.join(", ") });
            } else {
              if (newTranslations.length > 0)
                history.log({ type: "A", column: "translation", old_entry: word,
                              new_translations: newTranslations.join(", ") });
              if (newReadings.length > 0)
                history.log({ type: "A", column: "reading", old_entry: word,
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
        trainer.run("DELETE FROM vocabulary WHERE entry = ?", word),
        trainer.run("DELETE FROM translations WHERE entry = ?", word),
        trainer.run("DELETE FROM readings WHERE entry = ?", word)
      ]).then(() => {
        for (let list of vocabLists.getListsForWord(word)) {
            vocabLists.removeWordFromList(word, list);
        }
        const promises = [];
        for (let translation of translations) {
          promises.push(getWords(translation).then((words) => {
            if (words.length === 0)
              return trainer.run("DELETE FROM vocabulary_back WHERE entry = ?",
                                translation);
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
    .then((results) => {
        const [translations, readings, level] = results;
        const lists = vocabLists.getListsForWord(word);
        return remove(word)
        .then(() => add(newWord, translations, readings, level, false))
        .then(() => {
            for (let list of lists) vocabLists.addWordToList(newWord, list);
        });
    });
}


function getTranslations(word) {
    return trainer.query(
    "SELECT translation FROM translations WHERE entry = ?", word)
    .then((rows) => rows.map((row) => row.translation));
}


function getReadings(word) {
    return trainer.query("SELECT reading FROM readings WHERE entry = ?", word)
    .then((rows) => rows.map((row) => row.reading));
}


function addTranslation(word, translation) {
    trainer.query("SELECT * FROM vocabulary_back WHERE entry = ?", translation)
    .then((rows) => {
        if (rows.length === 0) {
            trainer.run("INSERT INTO vocabulary_back VALUES (?, ?, ?)",
                       translation, 0, 0);
        }
    });
    return getTranslations(word).then((translations) => {
        if (!translations.contains(translation))
            return trainer.run("INSERT INTO translations VALUES (?, ?)",
                              word, translation).then(() => true);
        return false;
    });
}


function addReading(word, reading) {
    return getReadings().then((readings) => {
        if (!readings.contains(reading))
            return trainer.run("INSERT INTO readings VALUES (?, ?)",
                              word, reading).then(() => true);
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
        promises.push(trainer.run(
            "DELETE FROM vocabulary_back WHERE entry = ?", translation));
      promises.push(trainer.run(
          "DELETE FROM translations WHERE entry = ? AND translation = ?",
          word, translation));
      return Promise.all(promises);
    });
  });
}


function removeReading(word, reading) {
  return trainer.run("DELETE FROM readings WHERE entry = ? AND reading = ?",
                    word, reading);
}


module.exports.exports = {
    getAll: getAll,
    contains: contains,
    size: size,
    search: search,
    add: add,
    remove: remove,
    rename: rename,
    getTranslations: getTranslations,
    getReadings: getReadings,
    addTranslation: addTranslation,
    addReading: addReading,
    removeTranslation: removeTranslation,
    removeReading: removeReading
};
