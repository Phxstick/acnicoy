"use strict";

const remote = require("@electron/remote");
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

function chooseImportFile() {
    const result = dialog.showOpenDialogSync({
        title: "Choose file to import", properties: ["openFile"]
    });
    return result === undefined ? null : result[0];
}

function chooseExportFile(defaultPath) {
    const result = dialog.showSaveDialogSync({
        title: "Save file", buttonLabel: "Export", defaultPath
    });
    return result === undefined ? null : result;
}

module.exports.confirm = confirm;
module.exports.info = info;
module.exports.error = error;
module.exports.chooseDataPath = chooseDataPath;
module.exports.chooseImportFile = chooseImportFile;
module.exports.chooseExportFile = chooseExportFile;

