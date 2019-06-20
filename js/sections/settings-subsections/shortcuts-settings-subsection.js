"use strict";

class ShortcutsSettingsSubsection extends SettingsSubsection {
    constructor() {
        super("shortcuts");
        this.globalSettingsList = [
            "add-word", "add-kanji", "open-test-section", "open-dictionary",
            "open-kanji-search", "open-kanji-overview", "open-vocab-section",
            "open-notes-section",
            
            "open-home-section", "open-stats-section", "open-settings",
            "open-help",

            "quit", "force-quit", "close-sliding-panels",
            "toggle-bars-visibility", "refresh",
            "ignore-answer", "save-input", "open-dev-tools"
        ];
        const shortcutLabels = this.$$("#shortcuts-list .keyboard-shortcut");
        for (const label of shortcutLabels) {
            label.addEventListener("click", () => {
                overlays.open("choose-shortcut").then((newKeyCombination) => {
                    if (newKeyCombination === null) return;
                    shortcuts.bindKeyCombination(label.id, newKeyCombination);
                    this.broadcastGlobalSetting(label.id);
                });
            });
        }
    }

    registerCentralEventListeners() {
        const shortcutLabels = this.$$("#shortcuts-list .keyboard-shortcut");
        for (const label of shortcutLabels) {
            events.on(`settings-shortcuts-${label.id}`, () => {
                label.textContent = shortcuts.getBoundKeyCombination(label.id);
            });
        }
    }

    adjustToLanguage(language, secondary) {
        const shortcutLabels = this.$$("#shortcuts-list .keyboard-shortcut");
        const shortcutsToHide = new Set();
        if (language !== "Japanese") {
            const shortcutNames = [
                "add-kanji", "open-kanji-search", "open-kanji-overview",
                "open-dictionary"
            ];
            for (const name of shortcutNames) shortcutsToHide.add(name);
        }
        for (const label of shortcutLabels) {
            label.parentNode.toggleDisplay(!shortcutsToHide.has(label.id));
        }
    }
}

customElements.define("shortcuts-settings-subsection",
    ShortcutsSettingsSubsection);
module.exports = ShortcutsSettingsSubsection;
