"use strict";

utility.importDocContent(document.currentScript.ownerDocument, (docContent) => {
class InitWindow extends HTMLElement {
    constructor() {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.appendChild(docContent);
        this.root.appendChild(this.root.getElementById("styles").content);
        this.frame = this.root.getElementById("init-frame");
        this.header = this.root.getElementById("header");
        this.stepContent = this.root.getElementById("step-content");
        this.buttons = this.root.getElementById("buttons");
        this.continueButton = this.root.getElementById("continue-button");
        this.backButton = this.root.getElementById("back-button");
        // Data path step
        this.dataPathStep = this.root.getElementById("data-path-step");
        this.dataPathInput = this.root.getElementById("data-path");
        this.choosePathButton = this.root.getElementById("choose-path-button");
        this.choosePathButton.addEventListener("click", () => {
            this.dataPathInput.value = dialogWindow.chooseDataPath(
                    this.dataPathInput.value);
        });
        // Add languages step
        this.addLanguagesStep = this.root.getElementById("add-languages-step");
        this.languagesTable = this.root.getElementById("languages");
        this.addLanguageButton =
            this.root.getElementById("add-language-button");
        this.addLanguageButton.addEventListener("click", () => {
            // TODO: Add new row to languages table
        });
        // Mapping of all init steps
        this.steps = {
            "data-path-step": this.dataPathStep,
            "add-languages-step": this.addLanguagesStep,
        };
        this.currentStep = null;
    }
    openStep(name) {
        // Display init-window if it's hidden
        if (getComputedStyle(this, null).getPropertyValue("display") === "none")
            this.style.display = "flex";
        // Replace current section with new one
        if (this.currentStep !== null) {
            this.stepContent.removeChild(this.steps[this.currentStep]);
        }
        this.stepContent.appendChild(this.steps[name]);
        this.currentStep = name;
        // TODO: If last frame, let continue-button say "Finish"
    }
    getNewDataPath() {
        this.openStep("data-path-step");
        this.header.textContent = "Choose data location";
        this.backButton.style.display = "none";
        this.dataPathInput.value = paths.standardDataPathPrefix;
        return new Promise((resolve, reject) => {
            // TODO: Check if path exists and if its a directory first
            this.continueButton.addEventListener("click",
                () => resolve(this.dataPathInput.value.trim()));
        });
    }
    getNewLanguages() {
        this.openStep("add-languages-step");
        this.header.textContent = "Add languages";
        return new Promise((resolve, reject) => {
            // TODO: Remove old event listener
            this.continueButton.addEventListener("click",
                () => resolve(this.dataPathInput.value.trim()));
        });
        return ["Japanese", "English", {}];
    }
}
customElements.define("init-window", InitWindow);
});
