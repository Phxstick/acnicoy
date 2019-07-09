"use strict";

class LanguagePopup extends Widget {
    constructor() {
        super("language-popup", true);
        this.setAttribute("tabIndex", "0");
        this.callback = (language) => { };
        this.onOpen = () => { };
        this.isOpen = false;
        this.selectedItem = null;
        // Close list when clicking outside, open list when clicking label
        window.addEventListener("click", () => this.close());
        this.$("label").addEventListener("click", (event) => {
            this.focus();
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
            event.stopPropagation();
        });
        // Select clicked item
        this.$("popup-window").addEventListener("click", (event) => {
            this.invoke(event.target.parentNode.dataset.language);
            this.close();
            event.stopPropagation();
        });
        this.close();
        // Enable selecting items with up/down arrow keys
        utility.handleKeyDownEvent(this, (event) => {
            if (!this.isOpen) return;
            if (event.key === "ArrowUp") {
                this.selectPreviousItem();
            } else if (event.key === "ArrowDown") {
                this.selectNextItem();
            }
        });
        // Select selected item when pressing enter/space (if the list is open)
        this.addEventListener("keypress", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            if (!this.isOpen) return;
            if (this.selectedItem === null) return;
            this.invokeSelectedItem();
            this.close();
            event.stopPropagation();
        });
        // Close the list if the widget loses focus
        this.addEventListener("focusout", (event) => {
            if (this.isOpen) this.close();
        });
    }
    
    add(language, selected=false) {
        const newItem = document.createElement("div");
        newItem.dataset.language = language;
        newItem.innerHTML = `<div>${language}</div>
                             <div id="amount-due-${language}"></div>`;
        this.$("popup-window").appendChild(newItem);
        if (selected) {
            if (this.selectedItem !== null) {
                this.selectedItem.classList.remove("selected");
            }
            this.selectedItem = newItem;
            this.selectedItem.classList.add("selected");
        }
    }

    setAmountDue(language, amount) {
        const amountLabel = this.$("amount-due-" + language);
        amountLabel.textContent = amount;
        amountLabel.classList.toggle("highlight", amount > 0);
    }

    invokeSelectedItem() {
        this.invoke(this.selectedItem.dataset.language);
    }

    clear() {
        this.$("popup-window").innerHTML = "";
        this.selectedItem = null;
    }

    set(language) {
        this.$("label").textContent = language;
        const items = this.$("popup-window").children;
        for (const item of items) {
            if (item.dataset.language === language) {
                if (this.selectedItem !== null) {
                    this.selectedItem.classList.remove("selected");
                }
                this.selectedItem = item;
                this.selectedItem.classList.add("selected");
            }
        }
    }

    selectPreviousItem() {
        if (this.selectedItem !== null) {
            this.selectedItem.classList.remove("selected");
        }
        if (this.selectedItem === null) {
            this.selectedItem = this.$("popup-window").lastElementChild;
        } else if (this.selectedItem.previousElementSibling === null) {
            this.selectedItem = this.$("popup-window").lastElementChild;
        } else {
            this.selectedItem = this.selectedItem.previousElementSibling;
        }
        this.selectedItem.classList.add("selected");
    }

    selectNextItem() {
        if (this.selectedItem !== null) {
            this.selectedItem.classList.remove("selected");
        }
        if (this.selectedItem === null) {
            this.selectedItem = this.$("popup-window").firstElementChild;
        } else if (this.selectedItem.nextElementSibling === null) {
            this.selectedItem = this.$("popup-window").firstElementChild;
        } else {
            this.selectedItem = this.selectedItem.nextElementSibling;
        }
        this.selectedItem.classList.add("selected");
    }

    async invoke(language) {
        if (await this.callback(language)) {
            this.set(language);
        };
    }

    get value() {
        return this.$("label").textContent;
    }

    set direction(value) {
        this.setAttribute("direction", value);
    }

    get direction() {
        return this.getAttribute("direction");
    }

    open() {
        this.isOpen = true;
        if (!this.direction || this.direction === "down") {
            this.$("popup-window").style.top = `${this.offsetHeight}px`;
            this.$("popup-window").style.bottom = "initial";
        } else if (this.direction === "up") {
            this.$("popup-window").style.top = "initial";
            this.$("popup-window").style.bottom = `${this.offsetHeight}px`;
        }
        this.$("popup-window").show();
        this.classList.add("open");
        this.onOpen();
    }

    close() {
        this.isOpen = false;
        this.$("popup-window").hide();
        this.classList.remove("open");
    }
}

customElements.define("language-popup", LanguagePopup);
module.exports = LanguagePopup;
