"use strict";

const { shell } = require("electron");

const components = new Set();
const currentStyleVariables = {};
const currentStyleClasses = {};
const styleClasses = require(paths.styleClasses);

class Component extends HTMLElement {
    constructor(name, wrapHtml=false, delegatesFocus=false) {
        super();
        this.root = this.attachShadow({ mode: "open", delegatesFocus });
        const style = document.createElement("style");
        style.textContent = `@import url(${paths.fontAwesome});`;
        // Apply global design (set in settings)
        let design = "default";
        if (dataManager.settings.isLoaded()) {
            design = dataManager.settings.design.colorScheme;
        }
        // Apply local CSS (if it exists)
        if (utility.existsFile(paths.css(name, design))) {
            style.textContent += `@import url(${paths.css(name, design)});`;
        }
        // Attach HTML to root (if it exists)
        if (utility.existsFile(paths.html(name))) {
            this.root.appendChild(
                utility.parseHtmlFile(paths.html(name), wrapHtml));
        }
        this.root.appendChild(style);
        // jQuery-like shortcuts for getting elements in shadow DOM
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

    connectedCallback() {
        components.add(this);
        // Apply currently active style variables to this element
        for (const variableName in currentStyleVariables) {
            this.style.setProperty(
                `--${variableName}`, currentStyleVariables[variableName]);
        }
        // Apply currently active style classes to this element
        for (const className in currentStyleClasses) {
            const currentValue = currentStyleClasses[className];
            for (const otherValue of styleClasses[className]) {
                this.classList.toggle(`GLOBAL-${className}-${otherValue}`,
                    otherValue === currentValue);
            }
        }
    }

    disconnectedCallback() {
        components.delete(this);
    }

    /**
    **  This is where global events should be handled.
    **/
    registerCentralEventListeners() {
    }

    /**
     * Change value of a single global CSS variable.
     * @param {string} variableName - Name of CSS variable (w.o. '--' prefix).
     * @param {string} value - New value for this CSS variable.
     */
    static setStyleVariable(variableName, value) {
        for (const component of components) {
            component.style.setProperty(`--${variableName}`, value);
        }
        currentStyleVariables[variableName] = value;
    }

    /**
     * Change value of a global style class.
     * @param {string} className - Name of the style class.
     * @param {string} value - New value for this style class.
     */
    static setStyleClass(className, value) {
        if (!styleClasses.hasOwnProperty(className))
            throw new Error(`Style class '${className}' is not registered.`);
        if (!styleClasses[className].includes(value))
            throw new Error(
                `Style class '${className}' has no value '${value}'.`);
        for (const component of components) {
            for (const otherValue of styleClasses[className]) {
                component.classList.toggle(
                    `GLOBAL-${className}-${otherValue}`, otherValue === value);
            }
        }
        currentStyleClasses[className] = value;
    }
}

module.exports = Component;
