"use strict";

const sqlite3 = require("sqlite3");

module.exports = function (paths, modules) {
    const database = {};
    const dataMap = {};
    let data;

    database.load = async function (language) {
        const path = paths.languageData(language).database;
        dataMap[language] = new sqlite3.Database(path);
        await database.runLanguage(language, "PRAGMA wal_autocheckpoint=50");
        await database.runLanguage(language, "BEGIN TRANSACTION");
        if (language === dataManager.currentLanguage) data = dataMap[language];
    };

    database.save = async function (language) {
        await database.runLanguage(language, "END");
        // await database.runLanguage(language, "PRAGMA wal_checkpoint");
        await database.runLanguage(language, "BEGIN TRANSACTION");
    };

    database.unload = function (language) {
        delete dataMap[language];
    };

    database.setLanguage = function (language) {
        data = dataMap[language];
    };

    database.close = async function (language) {
        return new Promise((resolve, reject) => {
            dataMap[language].close((error) => error ? reject(error):resolve());
        });
    };

    database.closeAll = async function () {
        for (const language in dataMap) {
            await database.close(language);
        }
    };

    database.query = function (query, ...params) {
        // return new Promise((resolve, reject) => {
        //     data.all(query, ...params, (error, rows) => resolve(rows));
        // });
        return new Promise((resolve, reject) => {
            data.all(query, ...params, (error, rows) =>
                error ? reject(error) : resolve(rows));
        });
    };

    database.run = function (statement, ...params) {
        // return new Promise((resolve, reject) => {
        //     data.run(statement, ...params, resolve);
        // });
        return new Promise((resolve, reject) => {
            data.run(statement, ...params, (error) =>
                error ? reject(error) : resolve());
        });
    };

    // Query the database for given language
    database.queryLanguage = function (language, query, ...params) {
        return new Promise((resolve, reject) => {
            dataMap[language].all(query, ...params,
                    (error, rows) => resolve(rows));
        });
    };

    // Run statement on the database for given language
    database.runLanguage = function (language, statement, ...params) {
        return new Promise((resolve, reject) => {
            dataMap[language].run(statement, ...params, resolve);
        });
    };

    // Create a new database for given language with given settings
    database.create = function (language, settings) {
        const db = new sqlite3.Database(paths.languageData(language).database);
        return new Promise((resolve) => {
            db.serialize(() => {
                db.run("PRAGMA journal_mode=WAL");
                db.run("BEGIN TRANSACTION");
                db.run("PRAGMA foreign_keys = ON");
                // Create tables
                db.run(`
                    CREATE TABLE vocabulary (
                        word TEXT PRIMARY KEY,
                        date_added INTEGER,
                        translations TEXT,
                        readings TEXT,
                        notes TEXT,
                        level INTEGER,
                        review_date INTEGER,
                        correct_count INTEGER DEFAULT 0,
                        mistake_count INTEGER DEFAULT 0,
                        dictionary_id INTEGER )
                `);
                if (language === "Japanese") {
                    db.run(`
                        CREATE TABLE kanji (
                            kanji TEXT PRIMARY KEY,
                            date_added INTEGER )
                    `);
                    db.run(`
                        CREATE TABLE kanji_meanings (
                            kanji TEXT PRIMARY KEY,
                            meanings TEXT,
                            level INTEGER,
                            review_date INTEGER,
                            correct_count INTEGER DEFAULT 0,
                            mistake_count INTEGER DEFAULT 0,
                            FOREIGN KEY (kanji)
                                REFERENCES kanji (kanji)
                                ON DELETE CASCADE )
                    `);
                    db.run(`
                        CREATE TABLE kanji_on_yomi (
                            kanji TEXT PRIMARY KEY,
                            on_yomi TEXT,
                            level INTEGER,
                            review_date INTEGER,
                            correct_count INTEGER DEFAULT 0,
                            mistake_count INTEGER DEFAULT 0,
                            FOREIGN KEY (kanji)
                                REFERENCES kanji (kanji)
                                ON DELETE CASCADE )
                    `);
                    db.run(`
                        CREATE TABLE kanji_kun_yomi (
                            kanji TEXT PRIMARY KEY,
                            kun_yomi TEXT,
                            level INTEGER,
                            review_date INTEGER,
                            correct_count INTEGER DEFAULT 0,
                            mistake_count INTEGER DEFAULT 0,
                            FOREIGN KEY (kanji)
                                REFERENCES kanji (kanji)
                                ON DELETE CASCADE )
                    `);
                }
                if (language === "Chinese") {
                    db.run(`
                        CREATE TABLE hanzi (
                            hanzi TEXT PRIMARY KEY,
                            date_added INTEGER )
                    `);
                    db.run(`
                        CREATE TABLE hanzi_meanings (
                            hanzi TEXT PRIMARY KEY,
                            meanings TEXT,
                            level INTEGER,
                            review_date INTEGER,
                            correct_count INTEGER DEFAULT 0,
                            mistake_count INTEGER DEFAULT 0,
                            FOREIGN KEY (hanzi)
                                REFERENCES hanzi (hanzi)
                                ON DELETE CASCADE )
                    `);
                    db.run(`
                        CREATE TABLE hanzi_readings (
                            hanzi TEXT PRIMARY KEY,
                            readings TEXT,
                            level INTEGER,
                            review_date INTEGER,
                            correct_count INTEGER DEFAULT 0,
                            mistake_count INTEGER DEFAULT 0,
                            FOREIGN KEY (hanzi)
                                REFERENCES hanzi (hanzi)
                                ON DELETE CASCADE )
                    `);
                }
                // Create indices
                db.run(`CREATE INDEX vocabulary_date_added
                        ON vocabulary (date_added DESC)`);
                db.run(`CREATE INDEX vocabulary_review_date
                        ON vocabulary (review_date ASC)`);
                db.run(`CREATE INDEX vocabulary_dictionary_id
                        ON vocabulary (dictionary_id ASC)`);
                if (language === "Japanese") {
                    db.run(`CREATE INDEX kanji_date_added
                            ON kanji (date_added DESC)`);
                    db.run(`CREATE INDEX kanji_meanings_review_date
                            ON kanji_meanings (review_date ASC)`);
                    db.run(`CREATE INDEX kanji_on_yomi_review_date
                            ON kanji_on_yomi (review_date ASC)`);
                    db.run(`CREATE INDEX kanji_kun_yomi_review_date
                            ON kanji_kun_yomi (review_date ASC)`);
                }
                if (language === "Chinese") {
                    db.run(`CREATE INDEX hanzi_date_added
                            ON hanzi (date_added DESC)`);
                    db.run(`CREATE INDEX hanzi_meanings_review_date
                            ON hanzi_meanings (review_date ASC)`);
                    db.run(`CREATE INDEX hanzi_readings_review_date
                            ON hanzi_readings (review_date ASC)`);
                }
                db.run("END", resolve);
            });
        });
    }

    return database;
};
