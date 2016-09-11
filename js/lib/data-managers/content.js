"use strict";

const sqlite3 = require("sqlite3");

let contentPath;
let langPath;

module.exports.internals = {
    set contentPath(path) { contentPath = path; },
    set langPath(path) { langPath = path; }
};

module.exports.exports = {

    loaded: { },

    // TODO: Properly involve secondary language aswell?
    load: function(language) {
        if (language === "Japanese") {
          const cPath = path.resolve(contentPath, "Japanese-English")
          const tPath = path.resolve(langPath, "Japanese", "Vocabulary.sqlite");
          const dbPath = path.resolve(cPath, "Japanese-English.sqlite3");
          const strokesPath = path.resolve(cPath, "kanji-strokes.json");
          const numbersPath = path.resolve(cPath, "numeric-kanji.json");
          const countersPath = path.resolve(cPath, "counter-kanji.json");
          this.loaded["Japanese"] = new Promise((resolve) => {
              const db = new sqlite3.Database(dbPath, () => {
                  const query = function(query, ...params) {
                      return new Promise((resolve, reject) => {
                          db.all(query, ...params,
                              (error, rows) => resolve(rows));
                      });
                  };
                  const attachStatement = db.prepare("ATTACH DATABASE ? AS ?");
                  attachStatement.run(tPath, "trainer", () => {
                      const kanjiPerGrade = {};
                      const kanjiPerJlpt = {};
                      Promise.all([
                          query(`SELECT grade, COUNT(*) AS amount FROM kanji
                                  GROUP BY grade`),
                          query(`SELECT jlpt AS level, COUNT(*) AS amount
                                 FROM kanji WHERE jlpt IS NOT NULL
                                 GROUP BY jlpt`)
                      ]).then((results) => {
                          // Create mapping from jouyou grade to amount
                          for (let { grade, amount } of results[0]) {
                              kanjiPerGrade[grade] = amount;
                          }
                          kanjiPerGrade[9] += kanjiPerGrade[10];
                          kanjiPerGrade[10] = kanjiPerGrade[null];
                          delete kanjiPerGrade[null];
                          // Create mapping from jlpt level to amount
                          for (let { level, amount } of results[1]) {
                              kanjiPerJlpt[level] = amount;
                          }
                          resolve(Object.freeze({
                              query: query,
                              data: db,
                              numKanjiPerGrade: Object.freeze(kanjiPerGrade),
                              numKanjiPerJlptLevel: Object.freeze(kanjiPerJlpt),
                              kanjiStrokes: Object.freeze(require(strokesPath)),
                              numericKanji: Object.freeze(require(numbersPath)),
                              counterKanji: Object.freeze(require(countersPath))
                          }));
                      });
                  });
              });
          });
        }
    },

    getKanjiInfo: function(kanji) {
      return this.loaded["Japanese"].then((content) =>
        new Promise((resolve, reject) =>
            content.data.get(
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
                 WHERE k.entry = ?`, kanji, (error, row) => {
                     // TODO: Take null or 10 after all? (Make consistent!)
                     if (row.grade == null) row.grade = 10;
                     row.meanings = row.meanings ? row.meanings.split(",") : [];
                     row.onYomi = row.onYomi ? row.onYomi.split(",") : [];
                     row.kunYomi = row.kunYomi ? row.kunYomi.split(",") : [];
                     resolve(row);
                 }))
      );
    },

    // TODO: Better naming? (since it returns rows, not words)
    getExampleWordsForKanji: function(kanji) {
        return this.loaded["Japanese"].then((content) => {
            return new Promise((resolve, reject) => {
                const pattern = `%${kanji}%`;
                // content.data.all(
                //     "SELECT words FROM dictionary WHERE words LIKE ?", pattern,
                //     (error, rows) => {
                //         resolve(rows.map((row) => row.words.split(";")[0]));
                //     });
                // TODO TODO: Try doing less in SQL to increase performance
                const start = performance.now();
                content.data.all(
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
                     ORDER BY f.news_freq DESC `, pattern,
                    (error, rows) => {
                        const totalTime = performance.now() - start;
                        console.log("Received example word rows after %f ms",
                                totalTime);
                        resolve(rows);
                    });
            });
        });
    },

    getKanjiList: function() {
        // TODO: Don't retrieve too much info? Or store info in kanji instead?
        return this.loaded["Japanese"].then((content) =>
            new Promise((resolve, reject) => content.data.all(
                `SELECT k.entry AS entry,
                        k.grade AS grade,
                        k.strokes AS strokes,
                        k.frequency AS frequency,
                        k.on_readings AS onYomi,
                        k.kun_readings AS kunYomi,
                        k.meanings AS meanings,
                        r.radical AS radical,
                        r.name AS radicalName,
                        (entry IN (SELECT entry FROM trainer.kanji)) AS added
                FROM kanji k JOIN radicals r ON k.radical_id = r.id`,
                // (error, rows) => resolve(rows)));
                (error, rows) => {
                    if (error) console.error(error);
                    else resolve(rows);
                }))
        );
    }

};
