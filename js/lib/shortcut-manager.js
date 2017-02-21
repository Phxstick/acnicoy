"use strict";

const { remote } = require("electron");
const mainBrowserWindow = remote.getCurrentWindow();
const localShortcut = remote.require("electron-localshortcut");

const nameToCallback = new Map();
const bindingToName = new Map();

const acceleratorKeyToEventKey = {
    "CmdOrCtrl": "Ctrl"
};

function initialize() {
    for (const name in dataManager.settings.shortcuts) {
        bindingToName.set(dataManager.settings.shortcuts[name], name);
    }
}

function register(name, callback) {
    const shortcut = dataManager.settings.shortcuts[name];
    unregister(shortcut);
    localShortcut.register(mainBrowserWindow, shortcut, callback);
    nameToCallback.set(name, callback);
}

function unregister(name) {
    const shortcut = dataManager.settings.shortcuts[name];
    if (localShortcut.isRegistered(mainBrowserWindow, shortcut)) {
        localShortcut.unregister(mainBrowserWindow, shortcut);
    }
    if (nameToCallback.has(name)) {
        nameToCallback.delete(name);
    }
}

function setBindingFor(name, shortcut) {
    let callback;
    if (nameToCallback.has(name)) {
        callback = nameToCallback.get(name);
    }
    unregister(name);
    dataManager.settings.shortcuts[name] = shortcut;
    bindingToName.delete(dataManager.settings.shortcuts[name]);
    bindingToName.set(shortcut, name);
    // Re-register existing callback for new shortcut
    if (callback) {
        register(name, callback);
    }
}

function getBindingFor(name) {
    return bindingToReadableForm(dataManager.settings.shortcuts[name]);
}

function disableAll() {
    localShortcut.disableAll(mainBrowserWindow);
}

function enableAll() {
    localShortcut.enableAll(mainBrowserWindow);
}

function isBindingUsed(binding) {
    return bindingToName.has(binding);
}

/**
 * @param {KeyboardEvent} event
 * @returns {String, null} - Returns Accelerator for a keyboard shortcut
 *     or null if the keys pressed in the event do not comprise a valid binding.
 */
function extractBinding(event) {
    if (!event.ctrlKey && !event.altKey) return null;
    if (event.key === "Control" ||
        event.key === "Alt" ||
        event.key === "Shift") return null;
    let accelerator = `${event.ctrlKey ? "CmdOrCtrl+" : ""}` +
                      `${event.altKey ? "Alt+" : ""}` +
                      event.key.toUpperCase();
    return accelerator;
}

function bindingToReadableForm(accelerator) {
    const keys = accelerator.split("+");
    keys.forEach((key, index) => {
        if (acceleratorKeyToEventKey.hasOwnProperty(key)) {
            keys[index] = acceleratorKeyToEventKey[key];
        }
    });
    return keys.join(" + ");
}

module.exports.initialize = initialize;
module.exports.register = register;
module.exports.unregister = unregister;
module.exports.setBindingFor = setBindingFor;
module.exports.getBindingFor = getBindingFor;
module.exports.disableAll = disableAll;
module.exports.enableAll = enableAll;
module.exports.isBindingUsed = isBindingUsed;
module.exports.extractBinding = extractBinding;
module.exports.bindingToReadableForm = bindingToReadableForm;
