"use strict";

class EditPanel extends Panel {
    constructor(name, itemTypes, mainItem) {
        super(name);
        this.nextElementToFocus = null;
        this.fadeDistance = 8;

        // Dummy element which holds focus if no other element has it
        this.focusHolder = document.createElement("div");
        this.focusHolder.setAttribute("tabindex", "-1");
        this.root.appendChild(this.focusHolder);
        this.focusHolder.addEventListener("keydown", (event) => {
            if (event.key !== "Tab") return;
            // If focus leaves dummy, it should go to the next element in order
            if (this.nextElementToFocus.offsetParent !== null) {
                event.preventDefault();
                this.nextElementToFocus.focus();
            }
            this.nextElementToFocus = null;
        });

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

            // Fade content at borders in case of overflow
            const viewWrapper = this.viewNodes[type].parentNode;
            viewWrapper.addEventListener("scroll", () => {
                viewWrapper.fadeContentAtBorders(this.fadeDistance);
            });
        }

        // Add functionality to buttons for browsing through a list of items
        this.$("prev-item-button").hide()
        this.$("next-item-button").hide()
        this.$("prev-item-button").addEventListener("click", () => {
            if (this.entryList === undefined) return
            if (this.entryIndex === 0) return
            this.entryIndex -= 1
            this.save()
            this.load(this.entryList[this.entryIndex], {
                entryList: this.entryList
            })
        })
        this.$("next-item-button").addEventListener("click", () => {
            if (this.entryList === undefined) return
            if (this.entryIndex === this.entryList.length - 1) return
            this.entryIndex += 1
            this.save()
            this.load(this.entryList[this.entryIndex], {
                entryList: this.entryList
            })
        })
    }

    load(entry, entryList) {
        // Display buttons for browsing to previous or next items in the list
        this.entryList = entryList
        if (!entryList) {
            this.$("prev-item-button").hide()
            this.$("next-item-button").hide()
            return
        }
        this.entryIndex = entryList.indexOf(entry)
        this.$("prev-item-button").show()
        this.$("next-item-button").show()
        this.$("prev-item-button").classList.toggle("disabled",
            this.entryIndex === 0)
        this.$("next-item-button").classList.toggle("disabled",
            this.entryIndex === this.entryList.length - 1)
        
    }

    createListItem(type, text="", createNewItemOnEnter=true) {
        const viewNode = this.viewNodes[type];
        const viewWrapper = viewNode.parentNode;  // Scrollable wrapper

        // Check if an item with this text already exists
        for (const otherNode of viewNode.children) {
            if (otherNode.textContent === text) return null;
        }

        const node = document.createElement("span");
        node.onlyAllowPastingRawText(this.root);
        node.putCursorAtEndOnFocus(this.root);
        node.textContent = text;

        // Allow editing items on click
        node.contentEditable = "true";
        node.setAttribute("spellcheck", "false");
        node.addEventListener("focusout", (event) => {
            this.$(`add-${type}-button`).show();
            this.root.getSelection().removeAllRanges();
            const newText = node.textContent.trim();
            // If focus will be lost, focus the dummy element
            if (event.relatedTarget === null) {
                this.nextElementToFocus = node;
                this.focusHolder.focus();
            }
            // Callback for removing node and determining next item to focus
            const removeNode = () => {
                if (node.nextSibling !== null) {
                    this.nextElementToFocus = node.nextSibling;
                } else {
                    this.nextElementToFocus = this.$(`add-${type}-button`);
                }
                node.remove();
            };
            // If the node is left empty, remove it
            if (newText.length === 0) {
                removeNode();
                return;
            }
            // If the node is a duplicate, remove it
            for (const otherNode of node.parentNode.children) {
                if (node === otherNode) continue;
                if (otherNode.textContent === newText) {
                    removeNode();
                    return;
                }
            }
            node.textContent = newText;
        });

        // If Enter or semicolon key is pressed, quit editing
        node.addEventListener("keypress", (event) => {
            if (event.key === "Enter" || event.key === ";") {
                event.preventDefault();
                const text = node.textContent.trim();
                // If this is the last item (and not empty), create a new one
                if (text.length !== 0 && node.nextSibling === null
                        && !event.ctrlKey && createNewItemOnEnter) {
                    this.createListItem(type);
                } else {
                    node.blur();
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

        // Don't change to edit mode on right-click
        node.addEventListener("contextmenu", () => {
            node.blur();
        });

        // Insert item into DOM and attach a context-menu
        viewNode.appendChild(node);

        // If this is a new item, scroll it into view completely
        if (text.length === 0) {
            viewWrapper.scrollToBottom();
        // If view is not scrolled, manually trigger update of edge gradients
        } else {
            viewWrapper.fadeContentAtBorders(this.fadeDistance);
        }

        return node;
    }

    removeListItem(type, text) {
        const viewNode = this.viewNodes[type];
        const viewWrapper = viewNode.parentNode;  // Scrollable wrapper

        // If a text is given, remove the node with this text (if it exists)
        if (text !== undefined) {
            for (const node of viewNode.children) {
                if (node.textContent === text) {
                    viewNode.removeChild(node);
                    break;
                }
            }
        // If no text is given, remove all nodes of this type
        } else {
            viewNode.empty();
        }

        // Update gradients at edges indicating overflow
        viewWrapper.fadeContentAtBorders(this.fadeDistance);
    }

    getListItems(type) {
        const viewNode = this.viewNodes[type];
        return viewNode.children;
    }
}

module.exports = EditPanel;
