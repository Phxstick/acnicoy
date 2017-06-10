"use strict";

const { remote } = require("electron");
const { Menu, MenuItem } = remote;

const itemGroupsToBeDisplayed = [];

/**
 * Register menu item with given options.
 * @param {Object} options
 * @returns MenuItem
 */
function registerItem(options) {
    return new MenuItem(options);
}

/**
 * Register several menu items with given options. 
 * @param {Object} options - Mapping from names to options.
 * @returns Object - Mapping from names to MenuItems.
 */
function registerItems(nameToOptions) {
    const menuItems = {};
    for (const name in nameToOptions) {
        menuItems[name] = registerItem(nameToOptions[name]);
    }
    return menuItems;
}

/**
 * Display given menu items the next time the context menu is displayed.
 * @param {Array[MenuItem]|Promise[Array[MenuItem]]} menuItem
 */
function displayItems(menuItem) {
    itemGroupsToBeDisplayed.push(menuItem);
}

/**
 * Set this as callback for the contextmenu event in every shadow tree,
 * in order to allow the context menu to gather invocation info in that tree.
 * @param Object event
 * @param ShadowRoot root
 */
function onContextMenuInvocation(event, root) {
    const target = event.target;
    const editableElementActive = target !== null &&
                                  (target.tagName === "TEXTAREA" ||
                                   target.tagName === "INPUT" ||
                                   target.contentEditable === "true");
    const selectionExists = root.getSelection().toString().length > 0;
    const clipboardNotEmpty = clipboard.readText().length > 0;
    // Undo/Redo items
    if (editableElementActive) {
        displayItems([standardRoleToMenuItem["undo"],
                      standardRoleToMenuItem["redo"]]);
    }
    // Items for copying/cutting/deleting or pasting text
    const textManipulationItems = [];
    if (selectionExists && editableElementActive)
        textManipulationItems.push(standardRoleToMenuItem["cut"]);
    if (selectionExists)
        textManipulationItems.push(standardRoleToMenuItem["copy"]);
    if (editableElementActive && clipboardNotEmpty)
        textManipulationItems.push(standardRoleToMenuItem["paste"]);
    if (selectionExists && editableElementActive)
        textManipulationItems.push(standardRoleToMenuItem["delete"]);
    displayItems(textManipulationItems);
    // If target is a link, allow copying the link location
    if (target.tagName === "A") {
        displayItems([standardRoleToMenuItem["copy-link-location"]]);
        standardRoleToMenuItem["copy-link-location"].currentNode = target;
    }
}


const standardRoles = ["undo", "redo", "delete", "cut", "copy", "paste"];
const standardRoleToMenuItem = {};
for (const role of standardRoles) {
    standardRoleToMenuItem[role] = registerItem({ role });
}

standardRoleToMenuItem["copy-link-location"] = registerItem({
    label: "Copy link location",
    click: ({ currentNode }) => {
        clipboard.writeText(currentNode.href);
    }
});

const webContents = remote.getCurrentWebContents();
const currentWindow = remote.getCurrentWindow();
webContents.on("context-menu", async (event, params) => {
    // Wait until all the items to be displayed are determined
    const itemGroups = await Promise.all(itemGroupsToBeDisplayed);
    // If the context menu has no visible items, don't display it
    let numItemsVisible = 0;
    for (const group of itemGroups) {
        for (const item of group) {
            ++numItemsVisible;
        }
    }
    if (numItemsVisible === 0) return;
    standardRoleToMenuItem["undo"].enabled = params.editFlags.canUndo;
    standardRoleToMenuItem["redo"].enabled = params.editFlags.canRedo;
    const contextMenu = new Menu();
    const itemsDisplayed = new Set();
    // Display items in each group (and separate groups with separator item)
    for (const group of itemGroups) {
        let numNonDuplicateItems = 0;
        for (const item of group) {
            if (!itemsDisplayed.has(item)) ++numNonDuplicateItems;
        }
        if (numNonDuplicateItems === 0)
            continue;
        if (contextMenu.items.length > 0)
            contextMenu.append(new MenuItem({ type: "separator" }));
        for (const item of group) {
            if (itemsDisplayed.has(item)) continue;
            contextMenu.append(item);
            itemsDisplayed.add(item);
        }
    }
    itemGroupsToBeDisplayed.clear();
    contextMenu.popup(currentWindow);
});

module.exports.registerItem = registerItem;
module.exports.registerItems = registerItems;
module.exports.displayItems = displayItems;
module.exports.onInvocation = onContextMenuInvocation;
