"use strict";

class ShortcutsSettingsSubsection extends SettingsSubsection {
    constructor() {
        super("shortcuts");
        this.globalSettingsList = [
            "add-word", "add-kanji", "open-test-section", "open-dictionary",
            "open-kanji-search", "open-kanji-overview", "open-home-section",
            "open-stats-section", "open-vocab-section", "open-settings",
            "open-help",
            "quit", "force-quit", "close-sliding-panels", "toggle-fullscreen",
            "refresh",
            "ignore-answer"
        ];
        const shortcutLabels = this.$$("#shortcuts-list .keyboard-shortcut");
        for (const label of shortcutLabels) {
            label.addEventListener("click", () => {
                overlay.open("choose-shortcut").then((newShortcut) => {
                    if (newShortcut === null) return;
                    shortcuts.setBindingFor(label.id, newShortcut);
                    this.broadcastGlobalSetting(label.id);
                });
            });
        }
    }

    registerCentralEventListeners() {
        const shortcutLabels = this.$$("#shortcuts-list .keyboard-shortcut");
        for (const label of shortcutLabels) {
            events.on(`settings-shortcuts-${label.id}`, () => {
                label.textContent = shortcuts.getBindingFor(label.id);
            });
        }
    }
}

customElements.define("shortcuts-settings-subsection",
    ShortcutsSettingsSubsection);
module.exports = ShortcutsSettingsSubsection;
