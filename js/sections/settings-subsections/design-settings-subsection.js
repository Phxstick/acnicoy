"use strict";

const fs = require("fs");
const path = require("path");
const { remote } = require("electron");
const mainBrowserWindow = remote.getCurrentWindow();

class DesignSettingsSubsection extends SettingsSubsection {
    constructor() {
        super("design");
        this.globalSettingsList = [
            "animate-sliding-panels", "animate-popup-stacks",
            "fade-section-switching", "cursor", "color-scheme"
        ];
        this.$("animate-sliding-panels").addEventListener("click", (event) => {
            dataManager.settings.design.animateSlidingPanels =
                event.target.checked;
            this.broadcastGlobalSetting("animate-sliding-panels");
        });
        this.$("animate-popup-stacks").addEventListener("click", (event) => {
            dataManager.settings.design.animatePopupStacks =
                event.target.checked;
            this.broadcastGlobalSetting("animate-popup-stacks");
        });
        this.$("fade-section-switching").addEventListener("click", (event) => {
            dataManager.settings.design.fadeSectionSwitching =
                event.target.checked;
            this.broadcastGlobalSetting("fade-section-switching");
        });
        const colorSchemes = fs.readdirSync(paths.colorSchemes)
            .map((filename) => path.basename(filename, ".scss"));
        for (const colorScheme of colorSchemes) {
            const option = document.createElement("option");
            if (colorScheme === dataManager.settings.design.colorScheme) {
                option.setAttribute("selected", "");
            }
            option.value = colorScheme;
            option.textContent = colorScheme;
            this.$("color-scheme").appendChild(option);
        }
        this.$("color-scheme").addEventListener("change", () => {
            dataManager.settings.design.colorScheme =
                this.$("color-scheme").value;
        });
        this.$("reload").addEventListener("click", () => {
            main.attemptToQuit().then((confirmed) => {
                if (confirmed) mainBrowserWindow.reload();
            });
        });
    }

    registerCentralEventListeners() {
        events.on("settings-design-animate-sliding-panels", () => {
            this.$("animate-sliding-panels").checked =
                dataManager.settings.design.animateSlidingPanels;
        });
        events.on("settings-design-animate-popup-stacks", () => {
            this.$("animate-popup-stacks").checked =
                dataManager.settings.design.animatePopupStacks;
        });
        events.on("settings-design-fade-section-switching", () => {
            this.$("fade-section-switching").checked =
                dataManager.settings.design.fadeSectionSwitching;
        });
    }
}

customElements.define("design-settings-subsection", DesignSettingsSubsection);
module.exports = DesignSettingsSubsection;
