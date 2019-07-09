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
            "toggle-bars-visibility", "refresh", "open-dev-tools",

            "count-as-correct", "count-as-wrong",
            "ignore-answer", "add-solution", "edit-test-item",

            "save-input"
        ];
        this.languageSpecificShortcutLabels =
            this.$$("#shortcuts-list .keyboard-shortcut[data-language]");

        // Click a shortcut to change its key combination (unless it's fixed)
        this.$("shortcuts-list").addEventListener("click", async (event) => {
            if (!event.target.classList.contains("keyboard-shortcut")) return;
            if (event.target.classList.contains("fixed")) return;
            const newKeyCombination = await overlays.open("choose-shortcut");
            if (newKeyCombination === null) return;
            const shortcutName = event.target.dataset.name;
            shortcuts.bindKeyCombination(shortcutName, newKeyCombination);
            this.broadcastGlobalSetting(shortcutName);
        });
    }
    
    registerCentralEventListeners() {
        const shortcutLabels =
            this.$$("#shortcuts-list .keyboard-shortcut:not(.fixed)");
        for (const label of shortcutLabels) {
            events.on(`settings-shortcuts-${label.dataset.name}`, () => {
                label.textContent =
                    shortcuts.getBoundKeyCombination(label.dataset.name);
            });
        }
    }

    adjustToLanguage(language, secondary) {
        for (const label of this.languageSpecificShortcutLabels) {
            label.parentNode.toggleDisplay(label.dataset.language === language);
        }
    }
}

customElements.define("shortcuts-settings-subsection",
    ShortcutsSettingsSubsection);
module.exports = ShortcutsSettingsSubsection;
