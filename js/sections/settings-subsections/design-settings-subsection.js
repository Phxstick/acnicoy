"use strict";

const fs = require("fs");
const path = require("path");
const { remote } = require("electron");
const mainBrowserWindow = remote.getCurrentWindow();

const testColorSchemes = require(paths.testSectionColorSchemes);
const generalColorSchemes = {
    "default": {
        name: "Default", 
        generalBg: "#f5f5f5", highlightBg: "#dc143c", navBg: "#8b0000",
        generalFg: "#303030", highlightFg: "#ffffff", navFg: "#dddddd"
    },
    "solarized-light": { 
        name: "Solarized Light",
        generalBg: "#f6efdc", highlightBg: "#da7e54", navBg: "#586e75",
        generalFg: "#46585e", highlightFg: "#ffffff", navFg: "#d8d6c7"
    },
};

const itemTypeNames = {
    "word-meaning": "Word meaning",
    "word-reading": "Word reading",
    "kanji-meaning": "Kanji meaning",
    "kanji-on-yomi": "Kanji on-yomi",
    "kanji-kun-yomi": "Kanji kun-yomi",
    "hanzi-meaning": "Hanzi meaning",
    "hanzi-reading": "Hanzi reading"
};
const itemTypeTexts = {
    "word-meaning": "Word",
    "word-reading": "Word",
    "kanji-meaning": "漢字",
    "kanji-on-yomi": "漢字",
    "kanji-kun-yomi": "漢字",
    "hanzi-meaning": "汉字",
    "hanzi-reading": "汉字"
};

class DesignSettingsSubsection extends SettingsSubsection {
    constructor() {
        super("design");
        this.globalSettingsList = [
            "animate-popup-stacks",  // Keep this event so it gets adjusted
            "enable-animations", "general-color-scheme", "test-section-colors"
        ];
        this.$("enable-animations").addEventListener("click", (event) => {
            const checked = event.target.checked;
            dataManager.settings.design.fadeSectionSwitching = checked;
            dataManager.settings.design.animatePopupStacks = checked;
            dataManager.settings.design.animateSlidingPanels = checked;
            this.broadcastGlobalSetting("animate-sliding-panels");
            this.broadcastGlobalSetting("animate-popup-stacks");
            this.broadcastGlobalSetting("fade-section-switching");
        });
        this.useMultiColorTestScheme = null;

        // ====================================================================
        //   General color scheme
        // ====================================================================
        for (const colorScheme in generalColorSchemes) {
            const option = document.createElement("option");
            if (colorScheme === dataManager.settings.design.colorScheme) {
                option.setAttribute("selected", "");
            }
            option.value = colorScheme;
            option.textContent = generalColorSchemes[colorScheme].name;
            this.$("general-color-scheme").appendChild(option);
        }
        this.$("general-color-scheme").addEventListener("input", () => {
            const colorScheme = this.$("general-color-scheme").value;
            dataManager.settings.design.colorScheme = colorScheme;
            this.showGeneralColorsPreview(colorScheme);
        });
        this.$("reload").addEventListener("click", async () => {
            const confirmed = await main.attemptToQuit();
            if (confirmed) mainBrowserWindow.reload();
        });

        // ====================================================================
        //   Test section colors
        // ====================================================================

        this.$("use-multicolor-test-scheme").addEventListener("click",(event)=>{
            dataManager.settings.test.useBackgroundColors = event.target.checked
            events.emit("settings-test-use-background-colors");
        });
        this.$("test-color-scheme").addEventListener("input", () => {
            const testColorScheme = this.$("test-color-scheme").value;
            dataManager.settings.design.testColorScheme = testColorScheme;
            this.showTestColorsPreview(testColorScheme);
        });

        // If the user enters a valid hex color, save value and update preview
        this.$("test-colors-preview").addEventListener("input", (event) => {
            const target = event.target;
            if (dataManager.settings.design.testColorScheme !== "custom")
                return;
            const useMultiColor = dataManager.settings.test.useBackgroundColors;
            const colors = useMultiColor ?
                dataManager.settings.design.customTestMulticolorScheme :
                dataManager.settings.design.customTestUnicolorScheme;

            // Check if value is a valid hex color
            if (colorLib.isHex(target.value)) {
                const key = target.dataset.type === "bg" ?
                        "background-color" : "color";

                // Update settings
                const newValue = target.value.slice(1);
                if (useMultiColor) {
                    colors[key + "s"][target.dataset.name] = newValue;
                } else {
                    colors[key] = newValue;
                }

                // Update preview
                let node = target;
                while (!node.classList.contains("color-preview")) {
                    node = node.parentNode;
                }
                node.querySelector(".color-box").style[key] = target.value;
                target.classList.remove("invalid-color");
            } else {
                target.classList.add("invalid-color");
            }
        });
    }

    registerCentralEventListeners() {
        events.on("settings-design-enable-animations", () => {
            // All three settings should have same value now, so just pick one
            this.$("enable-animations").checked =
                dataManager.settings.design.animateSlidingPanels;
        });
        events.on("settings-design-general-color-scheme", () => {
            this.showGeneralColorsPreview(
                dataManager.settings.design.colorScheme);
        });
        events.on("settings-test-use-background-colors", () => {
            const useMultiColor = dataManager.settings.test.useBackgroundColors;
            this.$("use-multicolor-test-scheme").checked = useMultiColor;
            const groupKey = useMultiColor ? "multicolor" : "unicolor";

            // If the user switched between unicolor and multicolor and the
            // currently used scheme has only one version, switch to default
            let currentScheme = dataManager.settings.design.testColorScheme;
            if (this.useMultiColorTestScheme !== null &&
                    this.useMultiColorTestScheme !== useMultiColor) {
                if (!(currentScheme in testColorSchemes[groupKey])) {
                    currentScheme = "default";
                    dataManager.settings.design.testColorScheme = currentScheme;
                }
            }
            this.useMultiColorTestScheme = useMultiColor;

            // List all schemes for the selected type (unicolor/multicolor)
            this.$("test-color-scheme").empty();
            for (const colorScheme in testColorSchemes[groupKey]) {
                const option = document.createElement("option");
                if (colorScheme === currentScheme) {
                    option.setAttribute("selected", "");
                }
                option.value = colorScheme;
                option.textContent=testColorSchemes[groupKey][colorScheme].name;
                this.$("test-color-scheme").appendChild(option);
            }

            // In any case, display colors for the currently selected scheme
            this.showTestColorsPreview(currentScheme);
        });
    }

    showGeneralColorsPreview(schemeName) {
        const colors = generalColorSchemes[schemeName];
        const colorPreviewTemplate = templates.get("color-preview");
        const previews = [];
        previews.push(colorPreviewTemplate({
            title: "Navbars", text: "Text", showValues: false,
            bgColor: colors["navBg"], fgColor: colors["navFg"]
        }));
        previews.push(colorPreviewTemplate({
            title: "Content", text: "Text", showValues: false,
            bgColor: colors["generalBg"], fgColor: colors["generalFg"]
        }));
        previews.push(colorPreviewTemplate({
            title: "Marked", text: "Text", showValues: false,
            bgColor: colors["highlightBg"], fgColor: colors["highlightFg"]
        }));
        this.$("general-colors-preview").innerHTML = previews.join("\n");
    }

    showTestColorsPreview(schemeName) {
        const useMultiColor = dataManager.settings.test.useBackgroundColors;
        const colorPreviewTemplate = templates.get("color-preview");
        const colors = dataManager.settings.getTestSectionColors(schemeName);
        if (!useMultiColor) {
            this.$("test-colors-preview").innerHTML = colorPreviewTemplate({
                title: "Preview", text: "Word",
                showValues: schemeName === "custom",
                bgColor: "#" + colors["background-color"],
                fgColor: "#" + colors["color"]
            });
        } else {
            const types = ["word-meaning", "word-reading"];
            if (dataManager.languages.all.includes("Japanese"))
                types.push("kanji-meaning", "kanji-on-yomi", "kanji-kun-yomi");
            if (dataManager.languages.all.includes("Chinese"))
                types.push("hanzi-meaning", "hanzi-reading");

            const previews = [];
            for (const type of types) {
                previews.push(colorPreviewTemplate({
                    title: itemTypeNames[type],
                    text: itemTypeTexts[type],
                    showValues: schemeName === "custom",
                    fgColor: "colors" in colors ?
                        "#" + colors["colors"][type] : "#" + colors["color"],
                    bgColor: "background-colors" in colors ?
                        "#" + colors["background-colors"][type] :
                        "#" + colors["background-color"],
                    valueName: type }));
            }
            this.$("test-colors-preview").innerHTML = previews.join("\n");
        }
    }
}

customElements.define("design-settings-subsection", DesignSettingsSubsection);
module.exports = DesignSettingsSubsection;
