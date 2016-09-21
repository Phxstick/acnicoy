"use strict";

// TODO: Remake and parameterize

class PopupList extends HTMLElement {
    createdCallback () {
        this.callback = () => { };
        this.onOpen = () => { };
        // Set parameters
        // self.fade = false;
        //this.itemWidth = parseInt(this.getAttribute("itemwidth"));
        this.itemWidth = 30;
        this.itemHeight = 30;
        // this.itemHeight = parseInt(this.getAttribute("itemheight"));
        this.items = [];
        this.isOpen = false;
        // Create widget tree
        this.root = this.createShadowRoot();
        const style = document.createElement("style");
        style.textContent = `@import url(${paths.css("popup-list")})`;
        // const style2 = document.createElement("style");
        // style2.textContent = `#container span { width: ${this.itemWidth}px;
        //                                         height: ${this.itemHeight}px;}`;
        this.root.appendChild(style);
        // this.root.appendChild(style2);
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
    // TODO TODO TODO
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
        $(this.popupWindow).css("top", $(this).css("height"));
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

module.exports = document.registerElement(
    "popup-list", { prototype: PopupList.prototype });
