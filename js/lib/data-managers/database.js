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

    // Create a new database for given language with given settings
    database.create = function (language, settings) {
        const db = new sqlite3.Database(paths.languageData(language).database);
        return new Promise((resolve) => {
            // TODO: Make this a transaction?
            db.serialize(() => {
                db.run("PRAGMA foreign_keys = ON");
                // Create tables
                db.run(`
                    CREATE TABLE vocabulary (
                       entry TEXT PRIMARY KEY,
                       level INTEGER,
                       time INTEGER )`);
                db.run(`
                    CREATE TABLE vocabulary_back (
                        entry TEXT PRIMARY KEY,
                        level INTEGER,
                        time INTEGER )`);
                db.run(`
                    CREATE TABLE translations (
                        entry TEXT,
                        translation TEXT,
                        FOREIGN KEY (entry)
                            REFERENCES vocabulary (entry)
                            ON DELETE CASCADE
                            ON UPDATE CASCADE,
                        FOREIGN KEY (translation)
                            REFERENCES vocabulary_back (entry)
                            ON DELETE CASCADE
                            ON UPDATE CASCADE )`);
                db.run(`
                    CREATE TABLE readings (
                        entry TEXT,
                        reading TEXT,
                        FOREIGN KEY (entry)
                            REFERENCES vocabulary (entry)
                            ON DELETE CASCADE
                            ON UPDATE CASCADE )`);
                db.run(`
                    CREATE TABLE edit_history(
                        id INTEGER PRIMARY KEY,
                        type CHAR(1),
                        column CHAR(20),
                        time INTEGER,
                        old_entry TEXT,
                        old_translations TEXT,
                        old_readings TEXT,
                        new_entry TEXT,
                        new_translations TEXT,
                        new_readings TEXT)`);
                if (language === "Japanese") {
                    db.run(`
                        CREATE TABLE kanji (
                            entry TEXT PRIMARY KEY,
                            date_added INTEGER)`);
                    db.run(`
                        CREATE TABLE kanji_meanings (
                            entry TEXT,
                            meaning TEXT,
                            FOREIGN KEY (entry)
                                REFERENCES kanji (entry)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE )`);
                    db.run(`
                        CREATE TABLE kanji_on (
                            entry TEXT,
                            on_reading TEXT,
                            FOREIGN KEY (entry)
                                REFERENCES kanji (entry)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE )`);
                    db.run(`
                        CREATE TABLE kanji_kun (
                            entry TEXT,
                            kun_reading TEXT,
                            FOREIGN KEY (entry)
                                REFERENCES kanji (entry)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE )`);
                    db.run(`
                        CREATE TABLE kanji_meanings_test (
                            entry TEXT PRIMARY KEY,
                            level INTEGER,
                            time INTEGER,
                            FOREIGN KEY (entry)
                                REFERENCES kanji (entry)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE )`);
                    db.run(`
                        CREATE TABLE kanji_on_test (
                            entry TEXT PRIMARY KEY,
                            level INTEGER,
                            time INTEGER,
                            FOREIGN KEY (entry)
                                REFERENCES kanji (entry)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE )`);
                    db.run(`
                        CREATE TABLE kanji_kun_test (
                            entry TEXT PRIMARY KEY,
                            level INTEGER,
                            time INTEGER,
                            FOREIGN KEY (entry)
                                REFERENCES kanji (entry)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE )`);
                }
                // Create indices
                db.run(`CREATE INDEX vocabulary_time
                        ON vocabulary (time ASC)`);
                db.run(`CREATE INDEX vocabulary_back_time
                        ON vocabulary_back (time ASC)`);
                db.run(`CREATE INDEX translations_entry
                        ON translations (entry ASC)`);
                db.run(`CREATE INDEX translations_translation
                        ON translations (translation ASC)`);
                db.run(`CREATE INDEX readings_entry
                        ON readings (entry ASC)`);
                db.run(`CREATE INDEX readings_reading
                        ON readings (reading ASC)`);
                if (language === "Japanese") {
                    db.run(`CREATE INDEX kanji_meanings_entry
                            ON kanji_meanings (entry ASC)`);
                    db.run(`CREATE INDEX kanji_on_entry
                            ON kanji_on (entry ASC)`);
                    db.run(`CREATE INDEX kanji_kun_entry
                            ON kanji_kun (entry ASC)`);
                    db.run(`CREATE INDEX kanji_meanings_test_time
                            ON kanji_meanings_test (time ASC)`);
                    db.run(`CREATE INDEX kanji_on_test_time
                            ON kanji_on_test (time ASC)`);
                    db.run(`CREATE INDEX kanji_kun_test_time
                            ON kanji_kun_test (time ASC)`);
                    // TODO: More indices?
                }
                db.run("", resolve);
            });
        });
    }

    return database;
};
