"use strict";

utility.importDocContent(document.currentScript.ownerDocument, (docContent) => {
class MainWindow extends HTMLElement {
    constructor () {
        super();
        this.root = this.attachShadow({ mode: "open" });
        this.root.appendChild(docContent);
        this.root.appendChild(this.root.getElementById("styles").content);
        // Store important DOM elements as members
        this.sectionWindow = this.root.getElementById("section-window");
        this.statusText = this.root.getElementById("status-text");
        this.filter = this.root.getElementById("filter");
        this.numSrsItemsLabel = this.root.getElementById("num-srs-items");
        this.statusBar = this.root.getElementById("status-text");
        this.languagePopup = this.root.getElementById("language-popup");
        this.dictionaryButton = this.root.getElementById("dictionary-button");
        this.findKanjiButton = this.root.getElementById("find-kanji-button");
        this.addKanjiButton = this.root.getElementById("add-kanji-button");
        // Top menu button events
        this.root.getElementById("exit-button").addEventListener("click",
                () => ipcRenderer.send("quit"));
        this.root.getElementById("home-button").addEventListener("click",
                () => this.openSection("home-section"));
        this.root.getElementById("stats-button").addEventListener("click",
                () => this.openSection("stats-section"));
        this.root.getElementById("vocab-button").addEventListener("click",
                () => this.openSection("vocab-section"));
        this.root.getElementById("history-button").addEventListener("click",
                () => this.openSection("history-section"));
        this.root.getElementById("settings-button").addEventListener("click",
                () => this.openSection("settings-section"));
        // Sidebar button events
        this.root.getElementById("add-vocab-button").addEventListener("click",
                () => this.openPanel(this.panels["add-vocab-panel"]));
        this.root.getElementById("add-kanji-button").addEventListener("click",
                () => this.openPanel(this.panels["add-kanji-panel"]));
        this.root.getElementById("test-button").addEventListener("click",
                () => this.openTestSection());
        this.root.getElementById("dictionary-button").addEventListener("click",
                () => this.openSection("dictionary-section"));
        this.root.getElementById("find-kanji-button").addEventListener("click",
                () => this.openSection("kanji-section"));
        // TODO: Where exactly to put this?
        this.doneLoading = new Promise((resolve) => {
            const numSections = Object.keys(paths.sections).length;
            const numPanels = Object.keys(paths.panels).length;
            let numLoaded = 0;
            eventEmitter.on("done-loading", () => {
                if (++numLoaded === numSections + numPanels)
                    resolve();
            });
        });
    }
    createSections () {
        const promises = [];
        this.sections = {};
        for (let name in paths.sections) {
            // Load section files
            const link = document.createElement("link");
            link.rel = "import";
            link.href = paths.sections[name];
            document.head.appendChild(link);
            // Create sections
            const section = document.createElement(name);
            section.classList.add("section");
            section.style.display = "none";
            section.id = name;
            this.sectionWindow.appendChild(section);
            this.sections[name] = section;
            promises.push(customElements.whenDefined(name));
        }
        this.currentSection = null;
        return promises;
    }
    createPanels () {
        const promises = [];
        this.panels = {};
        for (let name in paths.panels) {
            // Load panel files
            const link = document.createElement("link");
            link.rel = "import";
            link.href = paths.panels[name];
            document.head.appendChild(link);
            // Create panels
            const panel = document.createElement(name);
            if (name !== "kanji-info-panel")
                panel.classList.add("panel");
            panel.id = name;
            this.sectionWindow.appendChild(panel);
            this.panels[name] = panel;
            promises.push(customElements.whenDefined(name));
        }
        // TODO: Use this.panels instead for everything
        this.addVocabPanel = this.panels["add-vocab-panel"];
        this.addKanjiPanel = this.panels["add-kanji-panel"];
        this.editVocabPanel = this.panels["edit-vocab-panel"];
        this.editKanjiPanel = this.panels["edit-kanji-panel"];
        this.kanjiInfoPanel = this.panels["kanji-info-panel"];
        this.currentPanel = null;
        return promises;
    }
    loadLanguages(languages) {
        // Assign callbacks for language popup
        this.languagePopup.onOpen = () => this.fillLanguagePopup(languages);
        this.languagePopup.callback = (_, index) => {
            // if (this.language === languages[index]) return;
            this.setLanguage(languages[index]);
        };
        // Only display home section
        this.sections["home-section"].style.display = "block";
        this.sections["home-section"].open();
        this.currentSection = "home-section";
        // Update test button with amount of words to be tested
        this.updateTestButton();
        setInterval(() => {
            this.updateTestButton();
        }, 300000);  // Every 5 min
        // Confirm close command and save data before exiting the application
        ipcRenderer.removeAllListeners("closing-window");
        ipcRenderer.on("closing-window", () => {
            if (this.sections[this.currentSection].confirmClose()) {
                this.sections[this.currentSection].close();
                // TODO: Use global datamanager save function here
                dataManager.vocabLists.save();
                ipcRenderer.send("close-now");
            }
        });
    }
    openSection(name) {
        if (this.currentSection == name) return;
        if (!this.sections[this.currentSection].confirmClose()) return;
        this.sections[this.currentSection].close();
        Velocity(this.sections[this.currentSection], "fadeOut").then(() => {
            this.sections[name].open();
            Velocity(this.sections[name], "fadeIn");
        });
        this.currentSection = name;
    }
    openPanel(panel) {
        const currentPanel = this.currentPanel;
        if (currentPanel !== null) {
            this.closePanel(currentPanel, currentPanel === panel);
            if (currentPanel === panel) return;
        } else {
            Velocity(this.filter, "fadeIn");
        }
        panel.style.zIndex = layers["panel"];
        this.currentPanel = panel;
        panel.open();
        Velocity(panel, { left: "0px" });
    }
    closePanel(panel, noOtherPanelOpening=true) {
        Velocity(panel, { left: "-400px" }).then(() => panel.close());
        panel.style.zIndex = layers["closing-panel"];
        if (noOtherPanelOpening) {
            this.currentPanel = null;
            Velocity(this.filter, "fadeOut");
        }
    }
    updateStatus(text) {
        this.statusText.fadeOut(300);
        this.statusText.textContent = text;
        this.statusText.fadeIn(300);
    }
    openTestSection() {
        // Update label and open section if there are items to test
        // [ Somehow move this test to test section lateron? ]
        this.updateTestButton().then(() => {
            // TODO: Don't read from textcontent, use data directly
            if (parseInt(this.numSrsItemsLabel.textContent) > 0)
                this.openSection("test-section");
            else
                this.updateStatus("There are currently no items " +
                                  "scheduled for testing!");
        });
    };
    updateTestButton() {
        return dataManager.srs.getTotalAmountScheduled().then((count) =>
            this.numSrsItemsLabel.textContent = `${count} items`);
    }
    fillLanguagePopup(languages) {
        dataManager.srs.getTotalAmountScheduledForLanguages(languages)
        .then((amounts) => {
            this.languagePopup.clear();
            for (let i = 0; i < languages.length; ++i) {
                if (amounts[languages[i]] > 0) {
                    this.languagePopup.appendItem(
                        `${languages[i]} (${amounts[languages[i]]})`);
                } else {
                    this.languagePopup.appendItem(languages[i]);
                }
            }
        });
    }
    adjustToLanguage(language, secondary) {
        if (language === "Japanese") {
            this.findKanjiButton.style.display = "flex";
            this.addKanjiButton.style.display = "flex";
        } else {
            this.findKanjiButton.style.display = "none";
            this.addKanjiButton.style.display = "none";
        }
        this.updateTestButton();
    }
    setLanguage(language) {
        if (this.currentSection !== null) {
            if (!this.sections[this.currentSection].confirmClose()) return;
            this.sections[this.currentSection].close();
        }
        dataManager.languages.setCurrent(language);
        this.language = language;
        this.language2 = dataManager.languageSettings.secondaryLanguage;
        this.adjustToLanguage(this.language, this.language2);
        for (let key in this.sections) {
            this.sections[key].adjustToLanguage(this.language, this.language2);
        }
        for (let key in this.panels) {
            this.panels[key].adjustToLanguage(this.language, this.language2);
        }
        if (this.currentSection !== null)
            this.sections[this.currentSection].open();
        this.languagePopup.setLabelText(language);
    }
}
customElements.define("main-window", MainWindow);
});
