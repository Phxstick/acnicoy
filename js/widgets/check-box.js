"use strict";

class CheckBox extends Widget {

    static get observedAttributes() {
        return ["checked", "controlled", "disabled"];
    }

    constructor() {
        super("check-box");
        this.callback = (value) => { };
        this._attributes = {
            "checked": false,
            "disabled": false,
            "controlled": false
        };
        this.addEventListener("click", () => {
            if (!this._attributes["controlled"])
                this.toggle();
        });
    }

    toggle() {
        this.checked = !this.checked;
    }

    invoke(value) {
        this.callback(value);
    }

    get value() {
        return this.checked;
    }

    set value(value) {
        this.checked = value;
    }

    get checked() {
        return this.hasAttribute("checked");
    }

    set checked(value) {
        if (value) this.setAttribute("checked", "");
        else this.removeAttribute("checked");
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "checked") {
            const checked = newValue === null ? false : true;
            this._attributes["checked"] = checked;
            this.invoke(checked);
            this.$("wrapper").classList.toggle("checked", checked);
        } else if (name === "controlled") {
            this._attributes["controlled"] = newValue === null ? false : true;
        }
    }
}

customElements.define("check-box", CheckBox);
module.exports = CheckBox;
