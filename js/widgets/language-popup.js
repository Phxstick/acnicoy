"use strict";

class LanguagePopup extends Widget {
    constructor() {
        super("language-popup", true);
        this.setAttribute("tabIndex", "0");
        this.callback = (language) => { };
        this.onOpen = (languages) => { };
        this.isOpen = false;
        this.focussedItem = null;
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
        // Focus item upon hovering over it
        let hoveredElement = null;
        this.$("popup-window").addEventListener("mouseover", (event) => {
            hoveredElement = event.target.parentNode;
            if (this.focussedItem !== null) {
                this.focussedItem.classList.remove("focussed");
            }
            this.focussedItem = hoveredElement;
            this.focussedItem.classList.add("focussed");
        });
        this.$("popup-window").addEventListener("mousemove", (event) => {
            if (hoveredElement != this.focussedItem) {
                if (this.focussedItem !== null) {
                    this.focussedItem.classList.remove("focussed");
                }
                this.focussedItem = hoveredElement;
                this.focussedItem.classList.add("focussed");
            }
        });
        // Enable selecting items with up/down arrow keys
        utility.handleKeyDownEvent(this, (event) => {
            if (!this.isOpen) return;
            if (event.key === "ArrowUp") {
                if (this.focussedItem !== null) {
                    this.focussedItem.classList.remove("focussed");
                }
                if (this.focussedItem === null) {
                    this.focussedItem = this.$("popup-window").lastElementChild;
                } else if (this.focussedItem.previousElementSibling === null) {
                    this.focussedItem = this.$("popup-window").lastElementChild;
                } else {
                    this.focussedItem = this.focussedItem.previousElementSibling
                }
                this.focussedItem.classList.add("focussed");
            } else if (event.key === "ArrowDown") {
                if (this.focussedItem !== null) {
                    this.focussedItem.classList.remove("focussed");
                }
                if (this.focussedItem === null) {
                    this.focussedItem = this.$("popup-window").firstElementChild
                } else if (this.focussedItem.nextElementSibling === null) {
                    this.focussedItem = this.$("popup-window").firstElementChild
                } else {
                    this.focussedItem = this.focussedItem.nextElementSibling;
                }
                this.focussedItem.classList.add("focussed");
            }
        });
        // Select focussed item when pressing enter/space (if the list is open)
        this.addEventListener("keypress", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            if (!this.isOpen) return;
            if (this.focussedItem === null) return;
            this.invoke(this.focussedItem.dataset.language);
            this.close();
            event.stopPropagation();
        });
        // Close the list if the widget loses focus
        this.addEventListener("focusout", (event) => {
            if (this.isOpen) this.close();
        });
    }
    
    add(language) {
        this.$("popup-window").innerHTML += `
            <div data-language="${language}">
              <div>${language}</div>
              <div id="amount-due-${language}"></div>
            </div>`;
    }

    setAmountDue(language, amount) {
        const amountLabel = this.$("amount-due-" + language);
        amountLabel.textContent = amount;
        amountLabel.classList.toggle("highlight", amount > 0);
    }

    clear() {
        this.$("popup-window").innerHTML = "";
    }

    set(language) {
        this.$("label").textContent = language;
        const items = this.$("popup-window").children;
        for (const item of items) {
            if (item.dataset.language === language) {
                if (this.focussedItem !== null) {
                    this.focussedItem.classList.remove("focussed");
                }
                this.focussedItem = item;
                this.focussedItem.classList.add("focussed");
            }
        }
    }

    async invoke(language) {
        if (await this.callback(language)) {
            this.set(language);
        };
    }

    get value() {
        return this.$("label").textContent;
    }

    open() {
        this.isOpen = true;
        this.$("popup-window").show();
        this.classList.add("open");
        this.$("popup-window").style.top = `${this.offsetHeight}px`;
        const languages = [];
        const options = this.$("popup-window").children;
        for (const option of options) {
            languages.push(option.children[0].textContent);
        }
        this.onOpen(languages);
    }

    close() {
        this.isOpen = false;
        this.$("popup-window").hide();
        this.classList.remove("open");
    }
}

customElements.define("language-popup", LanguagePopup);
module.exports = LanguagePopup;
