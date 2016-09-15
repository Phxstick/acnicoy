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

    return database;
};
