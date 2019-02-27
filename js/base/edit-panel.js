"use strict";

class EditPanel extends Panel {
    constructor(name, itemTypes) {
        super(name);

        this.viewNodes = {};
        for (const type of itemTypes) {
            // View node has either same name as item type or with 's' attached
            this.viewNodes[type] = this.$(type + (this.$(type)===null?'s':''));
        }

        for (const type of itemTypes) {
            this.$(`add-${type}-button`).addEventListener("click", () => {
                this.createListItem(type);
            });
            this.$(`add-${type}-button`).addEventListener("focusin", () => {
                this.createListItem(type);
            });
        }
    }

    createListItem(type, text="") {
        const viewNode = this.viewNodes[type];

        // Check if an item with this text already exists
        for (const otherNode of viewNode.children) {
            if (otherNode.textContent === text) return;
        }

        const node = document.createElement("span");
        node.textContent = text;

        // Allow editing items on click
        node.contentEditable = "true";
        node.addEventListener("focusout", (event) => {
            this.$(`add-${type}-button`).show();
            this.root.getSelection().removeAllRanges();
            const newText = node.textContent.trim();
            // If the node is left empty, remove it
            if (newText.length === 0) {
                node.remove();
                return;
            }
            // If the node is a duplicate, remove it
            for (const otherNode of node.parentNode.children) {
                if (node === otherNode) continue;
                if (otherNode.textContent === newText) {
                    node.remove();
                    return;
                }
            }
            node.textContent = newText;
        });

        // If Enter key is pressed, quit editing
        node.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                node.blur();
                const text = node.textContent.trim();
                // If this is the last item (and not empty), create a new one
                if (text.length !== 0 && node.nextSibling === null) {
                    this.createListItem(type);
                }
            }
        });

        // If Delete key is pressed, remove the node
        node.addEventListener("keydown", (event) => {
            if (event.key === "Delete") {
                event.preventDefault();
                node.textContent = "";
                node.blur();
            }
        });

        // Hide add-button if it's an empty item
        node.addEventListener("focusin", () => {
            if (text.length === 0) {
                this.$(`add-${type}-button`).hide();
            }
        });

        // Insert item into DOM and attach a context-menu
        viewNode.appendChild(node);
        viewNode.scrollToBottom();

        return node;
    }

    removeListItem(type, text) {
        const viewNode = this.viewNodes[type];
        // If a text is given, remove the node with this text (if it exists)
        if (text !== undefined) {
            for (const node of viewNode.children) {
                if (node.textContent === text) {
                    viewNode.remove(node);
                    break;
                }
            }
        // If no text is given, remove all nodes of this type
        } else {
            viewNode.empty();
        }
    }

    getListItems(type) {
        const viewNode = this.viewNodes[type];
        return viewNode.children;
    }
}

module.exports = EditPanel;
