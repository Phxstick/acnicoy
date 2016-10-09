"use strict";

class Component extends HTMLElement {
    constructor(name, fontAwesome=false) {
        super();
        this.root = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = `@import url(${paths.css(name)});`
        if (fontAwesome) {
            style.textContent += `@import url(${paths.fontAwesome})`;
        }
        this.root.appendChild(style);

        // jQuery-like shortcut for getting elements in shadow DOM
        this.$ = (id) => this.root.getElementById(id);
        this.registerCentralEventListeners();
    }

    /**
    **  This is where global events should be handled.
    **/
    registerCentralEventListeners() {
    }
}

module.exports = Component;
