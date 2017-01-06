"use strict";

const sqlite3 = require("sqlite3");

module.exports = function (paths, modules) {
    const database = {};
    const dataMap = {};
    let data;

    database.load = function (language) {
        const path = paths.languageData(language).database;
        dataMap[language] = new sqlite3.Database(path);
    };

    database.setLanguage = function (language) {
        data = dataMap[language];
    };

    database.query = function (query, ...params) {
        return new Promise((resolve, reject) => {
            data.all(query, ...params, (error, rows) => resolve(rows));
        });
    };

    database.run = function (statement, ...params) {
        return new Promise((resolve, reject) => {
            data.run(statement, ...params, resolve);
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
                db.run("BEGIN TRANSACTION");
                db.run("PRAGMA foreign_keys = ON");
                // Create tables
                db.run(`
                    CREATE TABLE vocabulary (
                        word TEXT PRIMARY KEY,
                        date_added INTEGER,
                        level INTEGER,
                        review_date INTEGER,
                        translations TEXT,
                        readings TEXT )
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
                            FOREIGN KEY (kanji)
                                REFERENCES kanji (kanji)
                                ON DELETE CASCADE )
                    `);
                }
                // Create indices
                db.run(`CREATE INDEX vocabulary_date_added
                        ON vocabulary (date_added DESC)`);
                db.run(`CREATE INDEX vocabulary_review_date
                        ON vocabulary (review_date ASC)`);
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
                db.run("END", resolve);
            });
        });
    }

    return database;
};
