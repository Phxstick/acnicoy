"use strict";

const sqlite3 = require("sqlite3");

module.exports = function (paths, modules) {
    const content = { data: null, allLoaded: [] };
    const dataMap = {};

    content.load = function (language) {
        let promise = new Promise((resolve) => resolve());
        if (language === "Japanese") {
            // TODO: Properly involve secondary language to get paths
            const cPaths = paths.content["Japanese-English"];
            let query;
            promise = new Promise((resolve) => {
                // Load content database and attach trainer database to it,
                // also define function for querying the content database
                const db = new sqlite3.Database(cPaths.database, () => {
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
            ])).then((results) => {
                // Create mapping from jouyou grade to amount
                const kanjiPerGrade = {};
                for (let { grade, amount } of results[0]) {
                    kanjiPerGrade[grade] = amount;
                }
                kanjiPerGrade[9] += kanjiPerGrade[10];
                kanjiPerGrade[10] = kanjiPerGrade[null];
                delete kanjiPerGrade[null];
                // Create mapping from jlpt level to amount
                const kanjiPerJlpt = {};
                for (let { level, amount } of results[1]) {
                    kanjiPerJlpt[level] = amount;
                }
                // Gather all the content into a frozen object
                // TODO: Directly put these into content object...?
                // TODO: Along with all functions for Japanese?
                dataMap["Japanese"] = Object.freeze({
                    query: query,
                    numKanjiPerGrade: Object.freeze(kanjiPerGrade),
                    numKanjiPerJlptLevel: Object.freeze(kanjiPerJlpt),
                    kanjiStrokes: Object.freeze(require(cPaths.kanjiStrokes)),
                    numericKanji: Object.freeze(require(cPaths.numbers)),
                    counterKanji: Object.freeze(require(cPaths.counters))
                });
            });
        }
        content.allLoaded.push(promise);
        return promise;
    };

    content.setLanguage = function (language) {
        content.data = dataMap[language];
    };

    content.getKanjiInfo = function (kanji) {
        return dataMap["Japanese"].query(
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
             WHERE k.entry = ?`, kanji)
        .then((rows) => {
            const row = rows[0];
            // TODO: Take null or 10 after all? (Make consistent!)
            if (row.grade == null) row.grade = 10;
            row.meanings = row.meanings ? row.meanings.split(",") : [];
            row.onYomi = row.onYomi ? row.onYomi.split(",") : [];
            row.kunYomi = row.kunYomi ? row.kunYomi.split(",") : [];
            return row;
        });
    };

    // TODO: Better naming? (since it returns rows, not words)
    content.getExampleWordsForKanji = function (kanji) {
        const pattern = `%${kanji}%`;
        const start = performance.now();
        // return content.query(
        //     "SELECT words FROM dictionary WHERE words LIKE ?", pattern)
        // .then((rows) => 
        //     return rows.map((row) => row.words.split(";")[0]);
        // });
        // TODO: Try doing much less in SQL to increase performance
        return dataMap["Japanese"].query(
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

    content.getKanjiList = function () {
        // TODO: Don't retrieve too much info? Or store info in kanji instead?
        console.log(content);
        return dataMap["Japanese"].query(
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
            FROM kanji k JOIN radicals r ON k.radical_id = r.id`);
    };

    content.dataMap = dataMap;

    return content;
};
