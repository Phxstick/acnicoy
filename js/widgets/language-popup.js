"use strict";

class LanguagePopup extends Widget {
    constructor() {
        super("language-popup", true);
        this.callback = (language) => { };
        this.onOpen = (languages) => { };
        this.isOpen = false;
        window.addEventListener("click", () => this.close());
        this.$("label").addEventListener("click", (event) => {
            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
            event.stopPropagation();
        });
        this.$("popup-window").addEventListener("click", (event) => {
            this.invoke(event.target.parentNode.children[0].textContent);
            this.close();
            event.stopPropagation();
        });
        this.close();
    }
    
    add(language) {
        this.$("popup-window").innerHTML += `
            <div>
              <div>${language}</div>
              <div id="amount-due-${language}"></div>
            </div>`;
    }

    setAmountDue(language, amount) {
        const amountLabel = this.$("amount-due-" + language);
        amountLabel.textContent = amount;
        amountLabel.classList.toggle("highlight", amount > 0);
    }

    set(language) {
        this.$("label").textContent = language;
    }

    invoke(language) {
        this.set(language);
        this.callback(language);
    }

    get value() {
        return this.$("label").textContent;
    }

    open() {
        if (this.$("popup-window").children.length === 0) return;
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