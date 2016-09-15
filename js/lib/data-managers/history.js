"use strict";

module.exports = function (paths, modules) {
    const history = {};

    history.get = function (newerThan=0) {
        return modules.database.query(
            "SELECT * FROM edit_history WHERE id > ? ORDER BY time DESC",
            newerThan);
    };

    history.log = function (info) {
        info.time = utility.getTime();
        const keys = [];
        const qMarks = [];
        const values = [];
        for (let key in info) {
            keys.push(key);
            qMarks.push("?");
            values.push(info[key]);
        }
        return modules.database.run(
            `INSERT INTO edit_history (${keys.join(", ")})
             VALUES (${qMarks.join(", ")})`, ...values);
    };

    return history;
};
