"use strict";

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
