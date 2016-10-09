"use strict";

const { remote, nativeImage } = require("electron");
const { dialog } = remote;

function confirm(text) {
    const buttonIndex = dialog.showMessageBox({
          type: "question", buttons: ["Yes", "No"], defaultId: 1,
          message: text, title: "Confirm", cancelId: 1
    });
    return buttonIndex === 0;
}

function info(text, title="Info") {
    dialog.showMessageBox({
        type: "info", buttons: ["'kay"], title: title, message: text
    });
}

function error(text, title="Error") {
    // TODO: How to get icon to work?
    // const img = nativeImage.createFromPath("./img/icon.png");
    dialog.showMessageBox({
        type: "error", buttons: ["'Kay"], title: title, message: text
    });
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
