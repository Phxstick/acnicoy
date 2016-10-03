"use strict";

class SwitchButton extends Widget {
    constructor () {
        super("switch-button");
        const slot = document.createElement("slot");
        this.root.appendChild(slot);
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

customElements.define("switch-button", SwitchButton);
module.exports = SwitchButton;
