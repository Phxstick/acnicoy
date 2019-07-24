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
        this.selectionCallback = (node) => {
            node.textContent = this.selectedItem.textContent;
            callback(node, this.selectedItem);
        };
    }

    attachTo(node) {
        // Attach this widget to the DOM if it's not there yet
        if (this.offsetParent === null) {
            document.body.appendChild(this);
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
        this.wrapper.style.left = `${left}px`;
        if (this.direction === "up") {
            this.wrapper.style.bottom = `${window.innerHeight - top}px`;
            this.wrapper.style.top = "initial";
        } else if (this.direction === "down") {
            this.wrapper.style.top = `${bottom}px`;
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
