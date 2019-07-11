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

        this.selectedItem = null;
        this.displayCallback = () => { };
        this.selectionCallback = () => { };

        // Click on an item in the tooltip to select it (don't wait for mouseup)
        this.items.addEventListener("mousedown", (event) => {
            if (event.target.parentNode !== this.items) return;
            this.selectedItem = event.target;
            this.selectionCallback(this.activeNode);
        });

        // // Highlight items when hovering over them
        // this.items.addEventListener("mouseover", (event) => {
        //     if (event.target.parentNode !== this.items) return;
        //     if (this.selectedItem !== null) {
        //         this.selectedItem.classList.remove("selected");
        //     }
        //     this.selectedItem = event.target;
        //     this.selectedItem.classList.add("selected");
        // });

        // // Unhighlight highlighted item when mouse leaves tooltip
        // this.items.addEventListener("mouseout", (event) => {
        //     if (this.selectedItem !== null) {
        //         this.selectedItem.classList.remove("selected");
        //     }
        //     this.selectedItem = null;
        // });
    }

    setData(data) {
        this.viewState = utility.initializeView({
            view: this.items,
            getData: data,
            createViewItem: (text) => {
                const option = document.createElement("div");
                option.textContent = text;
                return option;
            },
            initialDisplayAmount: 30,
            displayAmount: 30,
            criticalScrollDistance: 150
        });
    }

    setDisplayCallback(callback) {
        this.displayCallback = callback;
    }

    setSelectionCallback(callback) {
        this.selectionCallback = (node) => {
            node.textContent = this.selectedItem.textContent;
            callback(node);
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
                this.selectedItem.scrollIntoViewIfNeeded();
                this.selectedItem.classList.add("selected");
            }
        });
    }

    async updateView(node) {
        // Fill list completion tooltip
        const text = node.textContent.trim();
        await this.viewState.search(text);

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
        const { left, top } = node.getBoundingClientRect();
        this.wrapper.style.left = `${left}px`;
        this.wrapper.style.bottom = `${window.innerHeight - top}px`;
    }
}

customElements.define("completion-tooltip", CompletionTooltip);
module.exports = CompletionTooltip;
