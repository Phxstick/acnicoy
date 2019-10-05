"use strict";

class CompletionTooltip extends Widget {

    constructor() {
        super("completion-tooltip");
        this.wrapper = document.createElement("div");
        this.wrapper.id = "wrapper";
        this.root.appendChild(this.wrapper);
        this.items = document.createElement("div");
        this.items.id = "items";
        this.wrapper.appendChild(this.items);
        this.wrapper.hide();

        this.direction = "down";
        this.selectedItem = null;
        this.displayCallback = () => { };
        this.selectionCallback = () => { };

        // Initialize view
        this.viewState = new View({
            viewElement: this.items,
            getData: (query) => this.getData(query),
            createViewItem: (item) => {
                if (typeof item === "string") {
                    const option = document.createElement("div");
                    option.textContent = item;
                    return option;
                } else if (Array.isArray(item)) {
                    const option = document.createElement("div");
                    option.value = item[0];
                    option.textContent = item[1];
                    return option;
                } else if (item instanceof HTMLElement) {
                    return item;
                }
            },
            deterministic: false,
            initialDisplayAmount: 30,
            displayAmount: 30
        });

        // Click on an item in the tooltip to select it (don't wait for mouseup)
        this.items.addEventListener("mousedown", (event) => {
            if (event.target.parentNode !== this.items) return;
            this.selectedItem = event.target;
            if (this.activeNode instanceof HTMLInputElement) {
                this.activeNode.value = this.selectedItem.textContent;
            } else {
                this.activeNode.textContent = this.selectedItem.textContent;
            }
            this.selectionCallback(this.activeNode);
        });
    }

    setData(data) {
        this.getData = typeof data === "function" ? data : () => data;
    }

    // Can't get this to work for some reason
    // setPlaceholder(text) {
    //     this.items.style.setProperty("--no-items-text", text);
    // }

    setDisplayCallback(callback) {
        this.displayCallback = callback;
    }

    setSelectionCallback(callback) {
        this.selectionCallback = (node) => callback(node, this.selectedItem);
    }

    attachTo(node) {
        // Attach this widget to the DOM if it's not there yet
        this.attachedNodeRoot = node.getRoot();
        if (this.offsetParent === null) {
            this.attachedNodeRoot.appendChild(this);
        }

        // Hide tooltip when node loses focus
        node.addEventListener("focusout", (event) => {
            this.wrapper.hide();
        });

        // Show tooltip when node receives focus
        node.addEventListener("focusin", (event) => {
            this.activeNode = node;
            this.displayCallback(node);
            this.updateView(node);
            this.wrapper.show();
        });

        // Show items matching the typed substring
        node.addEventListener("input", () => {
            this.updateView(node);
        });

        // Move the selection when pressing up/down arrow keys, close with Esc
        node.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                node.blur();
                event.stopPropagation();
                return;
            }
            if (this.selectedItem !== null) {
                this.selectedItem.classList.remove("selected");
            }
            if (event.key === "ArrowDown") {
                this.selectedItem = this.selectedItem === null ?
                        this.items.firstElementChild :
                        this.selectedItem.nextSibling;
            } else if (event.key === "ArrowUp") {
                this.selectedItem = this.selectedItem === null ?
                        this.items.lastElementChild :
                        this.selectedItem.previousSibling;
            } else if (event.key === "Enter" && !event.ctrlKey) {
                if (this.selectedItem !== null) {
                    if (node instanceof HTMLInputElement) {
                        node.value = this.selectedItem.textContent;
                    } else {
                        node.textContent = this.selectedItem.textContent;
                    }
                    this.selectionCallback(node);
                }
            }
            if (this.selectedItem !== null) {
                this.selectedItem.scrollIntoViewIfNeeded(false);
                this.selectedItem.classList.add("selected");
            }
        });
    }

    async updateView(node) {
        // Fill list completion tooltip
        const text = node instanceof HTMLInputElement ? node.value.trim() :
                                                        node.textContent.trim();
        await this.viewState.load(text);

        // Hide the tooltip if there's no data
        this.wrapper.toggleDisplay(this.viewState.data.length > 0);
        if (this.viewState.data.length === 0) {
            this.selectedItem = null;
            return;
        }

        // Deselect any selected vocab list and select the first list by default
        if (this.selectedItem !== null) {
            this.selectedItem.classList.remove("selected");
        }
        if (this.items.firstChild !== null) {
            this.selectedItem = this.items.firstChild;
            this.selectedItem.classList.add("selected");
        } else {
            this.selectedItem = null;
        }

        // Position list selection wrapper
        const { left, top, bottom } = node.getBoundingClientRect();
        const rootElement = this.attachedNodeRoot.host === undefined ?
            this.attachedNodeRoot : this.attachedNodeRoot.host;
        const { left: rootLeft, top: rootTop, bottom: rootBottom }
            = rootElement.getBoundingClientRect();
        this.wrapper.style.left = `${left - rootLeft}px`;
        if (this.direction === "up") {
            // 2 * because bottom of rect is given starting from top of window
            this.wrapper.style.bottom = `${rootBottom - top}px`;
                // `${window.innerHeight - rootBottom + rootHeight - top}px`;
                // `${2 * window.innerHeight - top - rootBottom}px`;
            this.wrapper.style.top = "initial";
        } else if (this.direction === "down") {
            this.wrapper.style.top = `${bottom - rootTop}px`;
            this.wrapper.style.bottom = "initial";
        }
    }

    static get observedAttributes() {
        return ["direction"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "direction") {
            this.direction = newValue;
        }
    }
}

customElements.define("completion-tooltip", CompletionTooltip);
module.exports = CompletionTooltip;
