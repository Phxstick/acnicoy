"use strict";

const { remote } = require("electron");
const { Menu, MenuItem } = remote;

const popupMenu = new Menu();
const visibleItems = new Set();
const previouslyVisibleItems = new Set();

function registerItems(nameToOptions) {
    const menuItems = {};
    for (const name in nameToOptions) {
        menuItems[name] = new MenuItem(nameToOptions[name]);
        menuItems[name].visible = false;
        popupMenu.append(menuItems[name]);
    }
    return menuItems;
}

window.addEventListener("contextmenu", (event) => {
    // TODO: Also display items for copying/pasting here if necessary
    event.preventDefault();
    // Wait until the items to be displayed are determined
    module.exports.itemsLoaded.then(() => {
        // If the popupmenu has no items, don't display it
        if (visibleItems.size === 0) return;
        // Undisplay previously visible items
        for (const item of previouslyVisibleItems) {
            item.visible = false;
        }
        previouslyVisibleItems.clear();
        // Display new visible items (and remember them for undisplaying again)
        for (const item of visibleItems) {
            item.visible = true;
            previouslyVisibleItems.add(item);
        }
        visibleItems.clear();
        popupMenu.popup(remote.getCurrentWindow());
    });
});

module.exports.itemsLoaded = Promise.resolve();
module.exports.registerItems = registerItems;
module.exports.visibleItems = visibleItems;
module.exports.previouslyVisibleItems = previouslyVisibleItems;
