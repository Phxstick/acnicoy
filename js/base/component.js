"use strict";

class Component extends HTMLElement {
    constructor(name, wrapHtml=false) {
        super();
        this.root = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = `@import url(${paths.fontAwesome});`;
        if (utility.existsFile(paths.css(name))) {
            style.textContent += `@import url(${paths.css(name)});`
        }
        if (utility.existsFile(paths.html(name))) {
            this.root.appendChild(
                utility.parseHtmlFile(paths.html(name), wrapHtml))
        }
        this.root.appendChild(style);
        // jQuery-like shortcut for getting elements in shadow DOM
        this.$ = (id) => this.root.getElementById(id);
        this.$$ = (query) => this.root.querySelector(query);
        this.registerCentralEventListeners();
    }

    /**
    **  This is where global events should be handled.
    **/
    registerCentralEventListeners() {
    }
}

module.exports = Component;
