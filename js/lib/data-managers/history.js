"use strict";

// Internal objects set externally
let trainer;

module.exports.internals = {
    set trainer(obj) { trainer = obj; }
};


function get(newerThan=0) {
    return trainer.query(
        "SELECT * FROM edit_history WHERE id > ? ORDER BY time DESC",
        newerThan);
}


function log(info) {
    info.time = utility.getTime();
    const keys = [];
    const qMarks = [];
    const values = [];
    for (let key in info) {
        keys.push(key);
        qMarks.push("?");
        values.push(info[key]);
    }
    trainer.run(`INSERT INTO edit_history (${ keys.join(", ") })
                VALUES (${ qMarks.join(", ") })`, ...values);
}


module.exports.exports = {
    get: get,
    log: log
};
