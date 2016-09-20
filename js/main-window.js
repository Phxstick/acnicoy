"use strict";

utility.processDocument2(document.currentScript.ownerDocument, (docContent) => {
class MainWindow extends HTMLElement {
    constructor () {
        super();
        // TODO: Try to use a shadow root and replace jQuery
        //// this.root = this.createShadowRoot();
        //// this.root.appendChild(docContent);
        //// this.root.appendChild(this.root.getElementById("styles").content);
        this.appendChild(docContent);
        this.appendChild(document.getElementById("styles").content);
        // Store important DOM elements as members
        this.sectionWindow = document.getElementById("section-window");
        this.statusText = document.getElementById("status-text");
        this.filter = document.getElementById("filter");
        this.numSrsItemsLabel = document.getElementById("num-srs-items");
        this.statusBar = document.getElementById("status-text");
        this.languagePopup = document.getElementById("language-popup");
        // Top menu button events
        document.getElementById("exit-button").addEventListener("click",
                () => ipcRenderer.send("quit"));
        document.getElementById("home-button").addEventListener("click",
                () => this.openSection("home-section"));
        document.getElementById("stats-button").addEventListener("click",
                () => this.openSection("stats-section"));
        document.getElementById("vocab-button").addEventListener("click",
                () => this.openSection("vocab-section"));
        document.getElementById("history-button").addEventListener("click",
                () => this.openSection("history-section"));
        document.getElementById("settings-button").addEventListener("click",
                () => this.openSection("settings-section"));
        // Sidebar button events
        document.getElementById("add-vocab-button").addEventListener("click",
                () => this.openPanel(this.panels["add-vocab-panel"]));
        document.getElementById("add-kanji-button").addEventListener("click",
                () => this.openPanel(this.panels["add-kanji-panel"]));
        document.getElementById("test-button").addEventListener("click",
                () => this.openTestSection());
        document.getElementById("dictionary-button").addEventListener("click",
                () => this.openSection("dictionary-section"));
        document.getElementById("find-kanji-button").addEventListener("click",
                () => this.openSection("kanji-section"));
        // Confirm close command and save data before exiting the application
        ipcRenderer.on("closing-window", () => {
            if (this.sections[this.currentSection].confirmClose()) {
                this.sections[this.currentSection].close();
                // TODO: Use global datamanager save function here
                dataManager.vocabLists.save();
                ipcRenderer.send("close-now");
            }
        });
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
            const section = document.createElement(name);;
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
        // Fill language popup and assign event
        this.fillLanguagePopup(languages);
        this.languagePopup.callback = (_, index) => {
            if (this.language === languages[index]) return;
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
            this.fillLanguagePopup(languages);
        }, 300000);  // Every 5 min
    }
    openSection(section) {
        if (this.currentSection == section) return;
        if (!this.sections[this.currentSection].confirmClose()) return;
        this.sections[this.currentSection].close();
        $(this.sections[this.currentSection]).fadeOut(() => {
            $(this.sections[this.currentSection]).css("display", "none");
            this.sections[section].open();
            $(this.sections[section]).fadeIn();
        });
        this.currentSection = section;
    }
    openPanel(panel) {
        const currentPanel = this.currentPanel;
        if (currentPanel !== null) {
            this.closePanel(currentPanel, currentPanel === panel);
            if (currentPanel === panel) return;
        }
        panel.style.zIndex = 30;
        this.currentPanel = panel;
        panel.open();
        $(this.filter).fadeIn();
        $(panel).animate({ left: "0px" });
        // TODO: Do opening animations here? Possible (different widths, ...)?
    }
    // TODO: Use default args here
    closePanel(panel, noNew) {
        $(panel).animate({ left: "-400px" }, () => panel.close());
        panel.style.zIndex = 20;
        if (noNew) {
            this.currentPanel = null;
            $(this.filter).fadeOut();
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
        // TODO: Get srs counts for each language, then display in braces here
        // return dataManager.srs.getTotalAmountScheduled().then((count) => {
        // Why is this not working
        utility.finishEventQueue().then(() => {
            this.languagePopup.clear();
            for (let i = 0; i < languages.length; ++i) {
                this.languagePopup.appendItem(languages[i]);
                if (languages[i] === this.language) {
                    this.languagePopup.set(i);
                }
            }
        });
        // });
    }
    adjustToLanguage(language, secondary) {
        // TODO: Rewrite without jQuery... implement own show/hide methods?
        if (language === "Japanese") {
            if (document.getElementById("find-kanji-button").style.display ==
                    "none") {
                $(document.getElementById("find-kanji-button")).show();
                $(document.getElementById("add-kanji-button")).show();
            }
        } else {
            $(document.getElementById("find-kanji-button")).hide();
            $(document.getElementById("add-kanji-button")).hide();
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
    }
}
customElements.define("main-window", MainWindow);
});
