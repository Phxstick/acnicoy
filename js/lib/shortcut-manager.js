"use strict";

const { remote } = require("electron");
const mainBrowserWindow = remote.getCurrentWindow();
const localShortcut = remote.require("electron-localshortcut");

function register(name, callback) {
    const shortcut = dataManager.settings.shortcuts[name];
    unregister(shortcut);
    localShortcut.register(mainBrowserWindow, shortcut, callback);
}

function unregister(name, callback) {
    const shortcut = dataManager.settings.shortcuts[name];
    if (localShortcut.isRegistered(mainBrowserWindow, shortcut)) {
        localShortcut.unregister(mainWindow, shortcut);
    }
}

function setBinding(name, shortcut) {
    dataManager.settings.shortcuts[name] = shortcut;
}

module.exports.register = register;
module.exports.unregister = unregister;
module.exports.setBinding = setBinding;
