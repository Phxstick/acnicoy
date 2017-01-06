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

const standardRoles = ["undo", "redo", "delete", "cut", "copy", "paste"];
const standardRoleToMenuItem = {};
for (const role of standardRoles) {
    const menuItem = new MenuItem({ role });
    standardRoleToMenuItem[role] = menuItem;
    menuItem.visible = false;
    popupMenu.append(menuItem);
}

const webContents = remote.getCurrentWebContents();
const currentWindow = remote.getCurrentWindow();
webContents.on("context-menu", (event, params) => {
    // Wait until the items to be displayed are determined
    module.exports.itemsLoaded.then(() => {
        // If there is a selection somewhere, add menu item for copying.
        // If the element is editable, also display other items such as "paste"
        const selectionExists = module.exports.selectionExists;
        const editableElementActive = module.exports.editableElementActive;
        if (selectionExists) {
            visibleItems.add(standardRoleToMenuItem["copy"]);
            if (editableElementActive) {
                visibleItems.add(standardRoleToMenuItem["cut"]);
                visibleItems.add(standardRoleToMenuItem["delete"]);
            }
        }
        if (editableElementActive) {
            if (clipboard.readText().length > 0) {
                visibleItems.add(standardRoleToMenuItem["paste"]);
            }
            // visibleItems.add(standardRoleToMenuItem["undo"]);
            // visibleItems.add(standardRoleToMenuItem["redo"]);
            // standardRoleToMenuItem["undo"].enabled = params.editFlags.canUndo;
            // standardRoleToMenuItem["redo"].enabled = params.editFlags.canRedo;
        }
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
        module.exports.selectionExists = false;
        module.exports.editableElementActive = false;
        popupMenu.popup(currentWindow);
    });
});

module.exports.itemsLoaded = Promise.resolve();
module.exports.registerItems = registerItems;
module.exports.visibleItems = visibleItems;
module.exports.previouslyVisibleItems = previouslyVisibleItems;
module.exports.selectionExists = false;
module.exports.editableElementActive = false;
