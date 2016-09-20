"use strict";

class SwitchButton extends HTMLElement {
    createdCallback () {
        this.root = this.attachShadow({mode: "open"});
        const slot = document.createElement("slot");
        this.root.appendChild(slot);
        const style = document.createElement("style");
        style.textContent = `@import url(${paths.css("switch-button")})`;
        this.root.appendChild(style);
        this.callback = () => {};
        this.addEventListener("click", () => this.toggle());
        if (this.hasAttribute("pushed"))
            this.classList.add("pushed");
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "pushed") {
            if (newValue === null) this.classList.remove("pushed");
            else this.classList.add("pushed");
        }
    }
    toggle () {
        if (!this.hasAttribute("pushed")) {
            this.setAttribute("pushed", "");
            this.classList.add("pushed");
            this.callback(true);
        } else {
            this.removeAttribute("pushed");
            this.classList.remove("pushed");
            this.callback(false);
        }
    }
}

module.exports = document.registerElement(
        "switch-button", { prototype: SwitchButton.prototype });
