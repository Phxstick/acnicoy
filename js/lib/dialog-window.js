"use strict";

const { remote, nativeImage } = require("electron");
const { dialog } = remote;

function confirm(text) {
    return overlay.open("confirm-dialog", text);
}

function info(text, title="Info") {
    return overlay.open("info-dialog", text, title);
}

function error(text, title="Error") {
    return overlay.open("info-dialog", text, title);
}

function chooseDataPath(defaultPath) {
    const result = dialog.showOpenDialog({
        title: "Choose directory for program data",
        defaultPath: defaultPath,
        properties: ["openDirectory"]
    });
    return result === undefined ? defaultPath : result[0];
}

module.exports.confirm = confirm;
module.exports.info = info;
module.exports.error = error;
module.exports.chooseDataPath = chooseDataPath;
