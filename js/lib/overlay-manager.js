"use strict";

let overlay;
const contents = {};
const openOverlays = [];

function create() {
    overlay = document.createElement("overlay-window");
    overlay.id = "overlay";
    document.body.appendChild(overlay);
    for (let name of globals.overlays) {
        contents[name] = document.createElement(name + "-overlay");
    }
}

function get(name) {
    return contents[name];
}

function open(name) {
    // If overlay with given name is already open, just move it to top of stack
    if (openOverlays.includes(name)) {
        openOverlays.remove(name);
    }
    openOverlays.push(name);
    overlay.assignContent(contents[name]);
    if (openOverlays.length === 1) {
        overlay.open();
    }
}

function close(name) {
    if (openOverlays.length === 0) return;
    // If a name is given, close overlay with given name
    if (name !== undefined && openOverlays.includes(name)) {
        openOverlays.remove(name);
    // Otherwise, close the overlay on top of the stack
    } else {
        openOverlays.remove(openOverlays[openOverlays.length - 1]);
    }
    // If theres no overlay left to display, close the overlay window
    if (openOverlays.length === 0) {
        overlay.close();
    // Otherwise display the overlay on top of the stack
    } else {
        overlay.assignContent(contents[openOverlays[openOverlays.length - 1]]);
    }
}

module.exports.create = create;
module.exports.get = get;
module.exports.open = open;
module.exports.close = close;
