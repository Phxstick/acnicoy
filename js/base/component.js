"use strict";

const { shell } = require("electron");

class Component extends HTMLElement {
    constructor(name, wrapHtml=false, delegatesFocus=false) {
        super();
        this.root = this.attachShadow({ mode: "open", delegatesFocus });
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
        this.$$ = (query) => this.root.querySelectorAll(query);
        this.registerCentralEventListeners();
        // Register relevant information for context-menu in this shadow tree
        this.root.addEventListener("contextmenu", (event) => {
            const target = event.target;
            if (this.root.getSelection().toString().length > 0) {
                popupMenu.selectionExists = true;
            }
            if (target !== null && (target.tagName === "TEXTAREA" ||
                                    target.tagName === "INPUT" ||
                                    target.contentEditable === "true")) {
                popupMenu.editableElementActive = true;
            }
        });
        // Open all http links associated with <a> tags in the default browser
        this.root.addEventListener("click", (event) => {
            if (event.target.tagName === "A") {
                if (event.target.href.startsWith("http")) {
                    shell.openExternal(event.target.href);
                }
                event.preventDefault();
            }
        }, true);
    }

    /**
    **  This is where global events should be handled.
    **/
    registerCentralEventListeners() {
    }
}

module.exports = Component;
