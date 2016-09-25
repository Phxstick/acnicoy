"use strict";

const ipcRenderer = require("electron").ipcRenderer;

function confirm(text) {
    return ipcRenderer.sendSync("confirm", text);
}

function chooseDataPath(current) {
    return ipcRenderer.sendSync("choose-data-path", current);
}

module.exports.confirm = confirm;
module.exports.chooseDataPath = chooseDataPath;
