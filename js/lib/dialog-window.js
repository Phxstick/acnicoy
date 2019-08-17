"use strict";

const { remote } = require("electron");
const { dialog } = remote;

function confirm(text, focusYes=false, title) {
    return overlays.open("confirm-dialog", text, focusYes, title);
}

function info(text, title="Info") {
    return overlays.open("info-dialog", text, title);
}

function error(text, title="Error") {
    return overlays.open("info-dialog", text, title);
}

function chooseDataPath(defaultPath) {
    const result = dialog.showOpenDialogSync({
        title: "Choose directory for user data",
        defaultPath, properties: ["openDirectory"]
    });
    return result === undefined ? defaultPath : result[0];
}

module.exports.confirm = confirm;
module.exports.info = info;
module.exports.error = error;
module.exports.chooseDataPath = chooseDataPath;
