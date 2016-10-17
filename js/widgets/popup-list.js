"use strict";

class PopupList extends Widget {
    constructor() {
        super("popup-list", true);
        this.callback = (label, value) => { };
        this.onOpen = () => { };
        this.isOpen = false;
        this.currentOption = null;
        window.addEventListener("click", () => this.close());
        this.$("label").addEventListener("click", (event) => {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
            event.stopPropagation();
        });
        this.addEventListener("click", (event) => {
            if (event.target.tagName !== "OPTION") return;
            this.invoke(event.target);
            this.close();
            event.stopPropagation();
        });
    }
    
    addOption(label, value) {
        const option = document.createElement("option");
        option.label = label;
        option.value = value === undefined ? label : value;
        this.appendChild(option);
        return option;
    }

    set(option) {
        if (this.currentOption === option) return;
        this.currentOption = option;
        this.$("label").textContent = option.label;
    }

    invoke(option) {
        this.set(option);
        this.callback(option.label, option.value);
    }

    get value() {
        return this.currentOption.value;
    }

    open() {
        if (this.children.length === 0) return;
        this.isOpen = true;
        this.$("popup-window").show();
        this.$("popup-window").style.top = `${this.offsetHeight}px`;
        this.onOpen();
    }

    close() {
        this.isOpen = false;
        this.$("popup-window").hide();
    }
}

customElements.define("popup-list", PopupList);
module.exports = PopupList;
