"use strict";

// TODO: Remake and parameterize

class PopupList extends Widget {
    constructor() {
        super("popup-list");
        this.callback = () => { };
        this.onOpen = () => { };
        // Set parameters
        // self.fade = false;
        this.itemWidth = 30;
        this.itemHeight = 30;
        this.items = [];
        this.isOpen = false;
        // this.style.height = `${this.itemHeight}px`;
        // this.style.width = `${this.itemWidth}px`;
        // this.style.display = "inline-block";
        // Create label
        this.label = document.createElement("span");
        this.label.id = "label";
        this.label.addEventListener("click", (event) => {
            this.open();
            event.stopPropagation();
        });
        this.root.appendChild(this.label);
        // Create popup window
        this.popupWindow = document.createElement("div");
        this.popupWindow.id = "popup-window";
        this.root.appendChild(this.popupWindow);
    }
    // TODO
    setItemHeight () {
    }
    setItemWidth () {
    }
    appendItem (text) {
        const newItem = document.createElement("div");
        newItem.classList.add("item");
        newItem.textContent = text;
        const itemIndex = this.items.length;  // Dangerous
        newItem.addEventListener("click", (event) => {
            this.set(itemIndex);
            this.close();
            event.stopPropagation();
        });
        this.items.push(newItem);
        this.popupWindow.appendChild(newItem);
    }
    removeItem (index) {
    }
    setLabelText(text) {
        this.label.textContent = text;
    }
    set (index) {
        // TODO: Good idea to return here?
        if (this.currentItemIndex === index) return;
        this.currentItemIndex = index;
        this.label.textContent = this.items[index].textContent;
        this.callback(this.get(), this.getIndex());
    }
    get () {
        return this.label.textContent;
    }
    getIndex () {
        return this.currentItemIndex;
    }
    open () {
        this.isOpen = true;
        this.popupWindow.style.display = "block";
        this.onOpen();
        this.popupWindow.style.top = `${this.offsetHeight}px`;
    }
    close () {
        this.isOpen = false;
        this.popupWindow.style.display = "none";
    }
    clear () {
        this.items.length = 0;
        while (this.popupWindow.firstChild) {
            this.popupWindow.removeChild(this.popupWindow.firstChild);
        }
    }
}

customElements.define("popup-list", PopupList);
module.exports = PopupList;
