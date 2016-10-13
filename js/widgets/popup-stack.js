"use strict";

class PopupStack extends Widget {
    constructor () {
        super("popup-stack", true);
        this.callback = (label, value) => { };
        this.animated = true;
        this.overlap = 0;
        this.orientation = "horizontal";  // TODO: "vertical"
        this.isOpen = false;
        this.isDisabled = false;
        this.topItem = null;
        window.addEventListener("click", () => this.close());
        this.addEventListener("click", (event) => {
            if (this.isDisabled) return;
            if (this.isOpen) {
                this.set(event.target);
                this.close();
            } else {
                this.open();
            }
            event.stopPropagation();
        });
    }

    addOption (label, value) {
        const newItem = document.createElement("option");
        newItem.label = label;
        newItem.value = value === undefined ? label : value;
        this.appendChild(newItem);
    }

    set (item) {
        if (this.topItem !== null) {
            const topItemIndex = this.childrenArray().indexOf(this.topItem);
            this.topItem.style.zIndex = topItemIndex;
            this.topItem.removeAttribute("selected");
        }
        this.topItem = item;
        this.topItem.setAttribute("selected", "");
        this.topItem.style.zIndex = this.children.length;
        this.callback(this.topItem.label, this.topItem.value);
    }

    get value() {
        return this.topItem.value;
    }

    open () {
        if (this.children.length === 0) return;
        if (this.orientation === "horizontal") {
            const itemWidth = this.children[0].offsetWidth;
            let current = 0;
            for (let i = 0; i < this.children.length; ++i) {
                this.children[i].style.zIndex = i;
                if (this.animated) {
                    Velocity(this.children[i], { "left": `${current}px` });
                } else {
                    this.children[i].style.left = `${current}px`;
                }
                current += itemWidth - this.overlap;
            }
            this.topItem.style.zIndex = this.children.length;
            Velocity(this.$("shadow"), { "width": current });
        }
        this.isOpen = true;
    }

    close () {
        if (!this.isOpen) return;
        if (this.orientation === "horizontal") {
            if (this.animated) {
                Velocity(this.children, { "left": "0" });
            } else {
                for (let i = 0; i < this.children.length; ++i) {
                    this.children[i].style.left = "0";
                }
            }
        }
        Velocity(this.$("shadow"), {width: this.$("frame").offsetWidth + "px"});
        this.isOpen = false;
    }

    // Does not work for some reason...
    // attributeChangedCallback(name, oldValue, newValue) {
    //     console.log(name);
    //     if (name === "disabled") {
    //         if (newValue == null) console.log("Popup has been enabled.");
    //         else console.log("Popup has been disabled.");
    //     }
    // }

    set disabled(value) {
        if (value) this.setAttribute("disabled", "");
        else this.removeAttribute("disabled");
        // Move this to attributeChangedCallback once it works...
        this.isDisabled = value;
        if (this.topItem !== null) {
            if (value) this.topItem.classList.add("disabled");
            this.topItem.classList.remove("disabled");
        }
    }

    get disabled() {
        return this.getAttribute("disabled") !== null;
    }
}

customElements.define("popup-stack", PopupStack);
module.exports = PopupStack;
