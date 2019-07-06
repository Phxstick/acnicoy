"use strict";

const sqlite3 = require("sqlite3");

module.exports = function (paths, modules) {
    const history = {};
    const dataMap = {};
    let data;

    history.create = async function (language, settings) {
        const db = utility.promisifyDatabase(
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
        const db = new sqlite3.Database(path);
        dataMap[language] = utility.promisifyDatabase(db);
        const dbc = utility.promisifyDatabase(db);
        // Cache sizes of the tables
        dataMap[language].sizes = { };
        dataMap[language].sizes["dictionary"] =
            (await dbc.all("SELECT COUNT(*) AS size FROM dictionary"))[0].size;
        if (language === "Japanese") {
            dataMap[language].sizes["kanji_info"] =
                (await dbc.all("SELECT COUNT(*) AS c FROM kanji_info"))[0].c;
            dataMap[language].sizes["kanji_search"] =
                (await dbc.all("SELECT COUNT(*) AS c FROM kanji_search"))[0].c;
        }
        await dataMap[language].run("PRAGMA wal_autocheckpoint=50");
        await dataMap[language].run("BEGIN TRANSACTION");
        if (language === dataManager.currentLanguage) data = dataMap[language];
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

    history.close = async function (language) {
        await dataMap[language].close();
    };

    history.closeAll = async function () {
        for (const language in dataMap) {
            await history.close(language);
        }
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
        // Delete old entry with the same name if there is one
        const entryExists = (await data.all(
            `SELECT COUNT(*) AS count FROM ${table} WHERE name = ?`,
            entry.name))[0].count;
        if (entryExists) {
            await data.run(`DELETE FROM ${table} WHERE name = ?`, entry.name);
            --data.sizes[table];
        }
        // Add the entry and increase the cached size counter
        await data.run(`INSERT INTO ${table} (${keys.join(", ")})
                        VALUES (${qMarks.join(", ")})`, ...values);
        ++data.sizes[table];
        // Get maximum allowed number of database entries from the settings
        let limit;
        if (table === "dictionary") {
            limit = dataManager.settings.dictionary.historySizeLimit;
        } else if (table === "kanji_search") {
            limit = dataManager.settings.kanjiSearch.historySizeLimit;
        } else if (table === "kanji_info") {
            limit = dataManager.settings.kanjiInfo.historySizeLimit;
        }
        // If the database size is above limit, delete the least recent entry
        if (data.sizes[table] > limit) {
            const lastEntryId = (await data.all(
                `SELECT id FROM ${table} ORDER BY id ASC LIMIT 1`))[0].id;
            await data.run(`DELETE FROM ${table} WHERE id = ?`, lastEntryId);
        }
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
