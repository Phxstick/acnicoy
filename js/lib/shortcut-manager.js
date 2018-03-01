"use strict";

const shortcutNameToCallbacks = new Map();
const keyCombinationToShortcutName = new Map();
const disabledShortcuts = new Set();

let allShortcutsDisabled = false;

/**
 * Load shortcuts and their assigned key combinations from the global settings.
 * Also add an event listener to the window object to listen for shortcuts.
 */
function initialize() {
    for (const shortcutName in dataManager.settings.shortcuts) {
        keyCombinationToShortcutName.set(
            dataManager.settings.shortcuts[shortcutName], shortcutName);
        if (!shortcutNameToCallbacks.has(shortcutName)) {
            shortcutNameToCallbacks.set(shortcutName, []);
        }
    }
    window.addEventListener("keydown", (event) => {
        if (allShortcutsDisabled)
            return;
        const keyCombination = extractKeyCombination(event);
        if (keyCombination === null)
            return;
        if (keyCombinationToShortcutName.has(keyCombination)) {
            const shortcut = keyCombinationToShortcutName.get(keyCombination);
            if (disabledShortcuts.has(shortcut))
                return;
            const callbacks = shortcutNameToCallbacks.get(shortcut);
            for (const callback of callbacks) {
                callback();
            }
            event.preventDefault();
        }
    });
}

/**
 * Execute given callback function when shortcut with given name is triggered.
 * @param {String} shortcutName
 * @param {Function} callback
 */
function bindCallback(shortcutName, callback) {
    if (!shortcutNameToCallbacks.has(shortcutName)) {
        shortcutNameToCallbacks.set(shortcutName, [callback]);
    } else if (!shortcutNameToCallbacks.get(shortcutName).includes(callback)) {
        shortcutNameToCallbacks.get(shortcutName).push(callback);
    } else {
        throw new Error("Given callback is already bound to this shortcut!");
    }
}

/**
 * Stop given callback function from being executed when shortcut with given
 * name is triggered. If no callback is given, remove all callbacks which have
 * been registered for the shortcut with given name.
 * @param {String} shortcutName
 * @param {function} [callback]
 */
function unbindCallback(shortcutName, callback) {
    if (callback === undefined) {
        shortcutNameToCallbacks.get(shortcutName).empty();
    } else {
        shortcutNameToCallbacks.get(shortcutName).remove(callback);
    }
}

/**
 * Disable shortcut with given name.
 */
function disable(shortcutName) {
    disabledShortcuts.add(shortcutName);
}

/**
 * Enable shortcut with given name.
 */
function enable(shortcutName) {
    disabledShortcuts.delete(shortcutName);
}

/**
 * Disable all shortcuts.
 */
function disableAll() {
    allShortcutsDisabled = true;
}

/**
 * Enable all shortcuts.
 */
function enableAll() {
    allShortcutsDisabled = false;
}

/**
 * Bind given key combination to shortcut with given name.
 * @param {String} shortcutName
 * @param {String} keyCombination
 */
function bindKeyCombination(shortcutName, keyCombination) {
    keyCombinationToShortcutName.delete(
        dataManager.settings.shortcuts[shortcutName]);
    dataManager.settings.shortcuts[shortcutName] = keyCombination;
    keyCombinationToShortcutName.set(keyCombination, shortcutName);
}

/**
 * Return bound key combination for shortcut with given name.
 * @param {String} shortcutName
 */
function getBoundKeyCombination(shortcutName) {
    return keyCombinationToReadableForm(
        dataManager.settings.shortcuts[shortcutName]);
}

/**
 * Return true if given key combination is already bound to a shortcut.
 * @param {String} shortcutName
 */
function isKeyCombinationUsed(keyCombination) {
    return keyCombinationToShortcutName.has(keyCombination);
}

/**
 * Return string representing pressed key combination for given keyboard event,
 * or null if the pressed key combination is not a valid shortcut combination.
 * @param {KeyboardEvent} event
 * @returns {String, null}
 */
function extractKeyCombination(event) {
    // Key combination must contain either ctrl, alt, esc or a function key
    if (!event.ctrlKey &&
            !event.altKey &&
            event.key !== "Escape" &&
            !(event.key[0] === "F" && parseInt(event.key.slice(1)) !== NaN))
        return null;
    // Key combination cannot only be one of the modifier keys
    if (event.key === "Control" ||
            event.key === "Alt" ||
            event.key === "Shift")
        return null;
    let keyCombination = `${event.ctrlKey ? "CmdOrCtrl+" : ""}` +
                         `${event.altKey ? "Alt+" : ""}` +
                         `${event.shiftKey ? "Shift+" : ""}`;
    if (event.key.length === 1) {
        keyCombination += event.key.toUpperCase();
    } else if (event.key === " ") {
        keyCombination += "Space";
    } else if (event.key === "+") {
        keyCombination += "Plus";
    } else {
        keyCombination += event.key;
    }
    return keyCombination;
}

/**
 * Return a well formatted string representing given key combination.
 * @param {String} keyCombination
 * @returns {String}
 */
function keyCombinationToReadableForm(keyCombination) {
    const keys = keyCombination.split("+");
    keys.forEach((key, index) => {
        if (key === "CmdOrCtrl") keys[index] = "Ctrl";
    });
    return keys.join(" + ");
}

module.exports.initialize = initialize;
module.exports.bindCallback = bindCallback;
module.exports.unbindCallback = unbindCallback;
module.exports.disable = disable;
module.exports.enable = enable;
module.exports.disableAll = disableAll;
module.exports.enableAll = enableAll;
module.exports.bindKeyCombination = bindKeyCombination;
module.exports.getBoundKeyCombination = getBoundKeyCombination;
module.exports.isKeyCombinationUsed = isKeyCombinationUsed;
module.exports.extractKeyCombination = extractKeyCombination;
module.exports.keyCombinationToReadableForm = keyCombinationToReadableForm;
