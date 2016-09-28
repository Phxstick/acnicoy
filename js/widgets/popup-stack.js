"use strict";

class PopupStack extends HTMLDivElement {
    createdCallback () {
        this.callback = () => { };
        // Set parameters
        this.animated = true;
        this.overlap = 0;
        this.orientation = "horizontal";  // TODO: "vertical"
        this.items = [];
        this.isOpen = false;
        this.topItem = null;
        // Create widget tree
        this.root = this.createShadowRoot();
        const style = document.createElement("style");
        style.textContent = `@import url(${paths.css("popup-stack")})`;
        this.root.appendChild(style);
        this.itemContainer = document.createElement("div");
        this.itemContainer.id = "container";
        this.root.appendChild(this.itemContainer);
        window.addEventListener("click", () => this.close());
    }
    appendItem (text) {
        const newItem = document.createElement("span");
        newItem.textContent = text;
        const itemIndex = this.items.length;  // Dangerous
        newItem.style.zIndex = layers["popup-stack"] + itemIndex;
        newItem.addEventListener("click", (event) => {
            if (this.isOpen) {
                this.set(itemIndex);
                this.close();
            } else {
                this.open();
            }
            event.stopPropagation();
        });
        this.items.push(newItem);
        this.itemContainer.appendChild(newItem);
    }
    removeItem (index) {
    }
    set (index) {
        if (this.topItem !== null) {
            this.topItem.style.zIndex =
                layers["popup-stack"] + this.topItemIndex;
            this.topItem.classList.remove("selected");
        }
        this.topItem = this.items[index];
        this.topItem.classList.add("selected");
        this.topItemIndex = index;
        this.topItem.style.zIndex = layers["popup-stack"] + this.items.length;
        this.callback(this.get(), this.getIndex());
    }
    get () {
        return this.topItem.textContent;
    }
    getIndex () {
        return this.topItemIndex;
    }
    open () {
        if (this.items.length === 0) return;
        if (this.orientation === "horizontal") {
            const itemWidth = this.items[0].offsetWidth;
            let current = 0;
            for (let item of this.items) {
                if (this.animated)
                    $(item).animate({ "left": `${current}px` }, { queue: false });
                else
                    item.style.left = `${current}px`;
                current += itemWidth - this.overlap;
            }
            // $(this.itemContainer).animate({ "width": current });
        }
        this.isOpen = true;
    }
    close () {
        if (!this.isOpen) return;
        if (this.orientation === "horizontal") {
            if (this.animated)
                $(this.items).animate({ "left": "0" });
            else
                $(this.items).css({ "left": "0" });
        }
        // $(this.itemContainer).animate({ "width": "100%" });
        this.isOpen = false;
    }
    clear () {
        this.items.length = 0;
        this.itemContainer.empty();
    }
    disable() {
    }
    enable() {
    }
}

// module.exports = window.customElements.define("popup-stack", PopupStack);
module.exports = document.registerElement(
    "popup-stack", { prototype: PopupStack.prototype });
