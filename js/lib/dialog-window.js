"use strict";

const ipcRenderer = require("electron").ipcRenderer;

function confirm(text) {
    return ipcRenderer.sendSync("confirm", text);
}

module.exports.confirm = confirm;
