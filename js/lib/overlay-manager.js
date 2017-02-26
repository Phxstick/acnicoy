"use strict";

let overlayWindow;
const contents = {};

function create() {
    overlayWindow = document.createElement("overlay-window");
    overlayWindow.id = "overlay";
    document.body.appendChild(overlayWindow);
    for (const name of globals.overlays) {
        contents[name] = document.createElement(name + "-overlay");
        // (Workaround) Force chromium to apply css to hidden element
        contents[name].style.display = "none";
    }
}

function get(name) {
    return contents[name];
}

function open(name, ...args) {
    if (!contents.hasOwnProperty(name)) {
        throw Error(`Overlay with name '${name}' is not registered.`);
    }
    return overlayWindow.open(contents[name], args);
}

function close() {
    return overlayWindow.close();
}

function isAnyOpen() {
    return overlayWindow.overlays.length > 0;
}

module.exports.create = create;
module.exports.get = get;
module.exports.open = open;
module.exports.close = close;
module.exports.isAnyOpen = isAnyOpen;
