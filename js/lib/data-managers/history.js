"use strict";

const sqlite3 = require("sqlite3");
const promisifyDatabase = require("sqlite3-promises");

module.exports = function (paths, modules) {
    const history = {};
    const dataMap = {};
    let data;

    history.create = async function (language, settings) {
        const db = promisifyDatabase(
            new sqlite3.Database(paths.languageData(language).history));
        await db.run("PRAGMA journal_mode=WAL");
        await db.run("BEGIN TRANSACTION");
        await db.run(`CREATE TABLE dictionary (
            id INTEGER PRIMARY KEY,
            time INTEGER,
            name TEXT,
            type TEXT
        )`);
        await db.run(`CREATE INDEX dictionary_name ON dictionary(name)`);
        if (language === "Japanese") {
            await db.run(`CREATE TABLE kanji_info (
                id INTEGER PRIMARY KEY,
                time INTEGER,
                name TEXT
            )`);
            await db.run(`CREATE INDEX kanji_info_name ON kanji_info(name)`);
            await db.run(`CREATE TABLE kanji_search (
                id INTEGER PRIMARY KEY,
                time INTEGER,
                name TEXT,
                type TEXT
            )`);
            await db.run(`CREATE INDEX kanji_search_name ON kanji_search(name)`)
        }
        await db.run("END");
    };

    history.load = async function (language) {
        const path = paths.languageData(language).history;
        dataMap[language] = promisifyDatabase(new sqlite3.Database(path));
        await dataMap[language].run("PRAGMA wal_autocheckpoint=50");
        await dataMap[language].run("BEGIN TRANSACTION");
    };

    history.save = async function (language) {
        await dataMap[language].run("END");
        // await dataMap[language].run("PRAGMA wal_checkpoint");
        await dataMap[language].run("BEGIN TRANSACTION");
    };

    history.unload = function (language) {
        delete dataMap[language];
    };

    history.setLanguage = function (language) {
        data = dataMap[language];
    };

    history.addEntry = async function (table, entry) {
        entry.time = utility.getTime();
        const keys = [];
        const qMarks = [];
        const values = [];
        for (const key in entry) {
            keys.push(key);
            qMarks.push("?");
            values.push(entry[key]);
        }
        // Delete old entry with same name if there is one
        await data.run(`DELETE FROM ${table} WHERE name = ?`, entry.name);
        await data.run(`INSERT INTO ${table} (${keys.join(", ")})
                        VALUES (${qMarks.join(", ")})`, ...values);
    };

    history.get = async function (table) {
        return await data.all(`SELECT * FROM ${table} ORDER BY id DESC`);
    };

    history.getForLanguage = async function (language, table) {
        return await
            dataMap[language].all(`SELECT * FROM ${table} ORDER BY id DESC`);
    };

    return history;
};
