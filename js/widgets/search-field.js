"use strict";

class SearchField extends Widget {

    static get observedAttributes() {
        return ["placeholder"];
        this.isClearable = false;
    }

    constructor() {
        super("search-field");
        utility.selectAllOnFocus(this.$("search-input"));
        this.$("clear-icon").hide();
    }

    toggleSpinner(value) {
        this.$("search-button").classList.toggle("spinning", value);
    }

    setCallback(callback) {
        const search = () => {
            const query = this.$("search-input").value.trim();
            if (query) {
                this.isClearable = true;
                this.$("search-icon").hide();
                this.$("clear-icon").show();
            }
            callback(query);
        }
        const clear = () => {
            this.isClearable = false;
            this.$("search-icon").show();
            this.$("clear-icon").hide();
            this.$("search-input").value = "";
            callback("");
        }
        this.$("search-input").addEventListener("keydown", (event) => {
            if (event.key === "Escape" && this.isClearable) clear()
        })
        this.$("search-input").addEventListener("keypress", (event) => {
            if (event.key === "Enter") search()
        })
        this.$("search-button").addEventListener("click", () => {
            if (this.isClearable) {
                clear()
            } else {
                search()
            }
        })
        this.$("search-input").addEventListener("input", () => {
            this.isClearable = false;
            this.$("search-icon").show();
            this.$("clear-icon").hide();
        })
    }

    // Delegate properties of the internal input field
    set value(value) {
        this.$("search-input").value = value;
    }
    get value() {
        return this.$("search-input").value;
    }
    set placeholder(value) {
        this.setAttribute("placeholder", value);
    }
    get placeholder() {
        return this.getAttribute("placeholder");
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "placeholder") {
            this.$("search-input").setAttribute(name, newValue);
        }
    }
    addEventListener(event, callback) {
        this.$("search-input").addEventListener(event, callback);
    }
    focus() {
        this.$("search-input").focus();
    }
    enableKanaInput(type) {
        this.$("search-input").enableKanaInput(type);
    }
    togglePinyinInput(bool) {
        this.$("search-input").togglePinyinInput(bool);
    }
}

customElements.define("search-field", SearchField);
module.exports = SearchField;