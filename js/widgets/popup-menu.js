"use strict";

class PopupMenu extends HTMLElement {
    createdCallback () {
        this.posted = false;
        this.callbacks = new Map();
        this.onOpen = () => { };  // Called before menu pops up
        this.root = this.createShadowRoot();
        this.menuWindow = document.createElement("div");
        const style = document.createElement("style");
        style.textContent = `@import url(${getStylePath("popup-menu")})`;
        this.root.appendChild(this.menuWindow);
        this.root.appendChild(style);
        document.body.appendChild(this);
        window.addEventListener("contextmenu", () => this.unpost());
        window.addEventListener("click", () => this.unpost());
    }
    post (x, y) {
        if (this.posted) return;
        // Display invisible popupmenu at (0, 0) to measure it's computed size
        this.menuWindow.style.visibility = "hidden";
        this.menuWindow.style.display = "block";
        this.menuWindow.style.left = "0";
        this.menuWindow.style.top = "0";
        const height = this.menuWindow.offsetHeight;
        const width = this.menuWindow.offsetWidth;
        // Adapt new position if menu would leave the left/bottom window border
        let xOffset = event.screenX - window.screenX;
        let yOffset = event.screenY - window.screenY;
        if (xOffset + width > window.innerWidth) {
            xOffset += window.innerWidth - xOffset - width;
        }
        if (yOffset + height > window.innerHeight) {
            yOffset += window.innerHeight - yOffset - height;
        }
        // Move the window to correct position and make it visible
        this.menuWindow.style.left = xOffset + "px";
        this.menuWindow.style.top = yOffset + "px";
        this.menuWindow.style.visibility = "visible";
        this.posted = true;
        event.stopPropagation();
    }
    unpost () {
        if (!this.posted) return;
        this.menuWindow.style.display = "none";
        this.posted = false;
        event.stopPropagation();
    }
    addItem (text, command) {
        const newItem = document.createElement("span");
        newItem.classList.add("item");
        newItem.textContent = text;
        newItem.addEventListener("click", () => {
            command();
            this.unpost();
        });
        this.menuWindow.appendChild(newItem);
    }
    clearItems (object) {
        this.menuWindow.empty()
    }
    addSeparator () {
        const newSeparator = document.createElement("span");
        newSeparator.classList.add("separator");
        const line = document.createElement("hr");
        newSeparator.appendChild(line);
        newSeparator.addEventListener("click", () => this.unpost());
        this.menuWindow.appendChild(newSeparator);
    }
    attachTo (object) {
        this.callbacks.set(object, (event) => {
            this.currentObject = object;
            this.onOpen(object);
            this.post(event.pageX, event.pageY);
        });
        object.addEventListener("contextmenu",
            this.callbacks.get(object));
    }
    detachFrom (object) {
        object.removeEventListener("contextmenu", this.callbacks.get(object));
    }
}

module.exports = document.registerElement(
        "popup-menu", { prototype: PopupMenu.prototype });
