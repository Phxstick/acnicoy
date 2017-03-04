"use strict";

class TestSettingsSubsection extends SettingsSubsection {
    constructor() {
        super("test");
        this.globalSettingsList = [
            "use-flashcard-mode", "make-continuous", "show-progress",
            "show-score", "animate", "enable-ignore-shortcut",
            "font-style", "font-size", "use-serif-font",
            "use-background-colors", "skip-evaluation-on-correct"
        ];
        this.$("show-progress").addEventListener("click", (event) => {
            dataManager.settings.test.showProgress = event.target.checked;
            this.broadcastGlobalSetting("show-progress");
        });
        this.$("show-score").addEventListener("click", (event) => {
            dataManager.settings.test.showScore = event.target.checked;
            this.broadcastGlobalSetting("show-score");
        });
        this.$("make-continuous").addEventListener("click", (event) => {
            dataManager.settings.test.makeContinuous = event.target.checked;
            this.broadcastGlobalSetting("make-continuous");
        });
        this.$("animate").addEventListener("click", (event) => {
            dataManager.settings.test.animate = event.target.checked;
            this.broadcastGlobalSetting("animate");
        });
        this.$("enable-ignore-shortcut").addEventListener("click", (event) => {
            dataManager.settings.test.enableIgnoreShortcut =
                event.target.checked;
            this.broadcastGlobalSetting("enable-ignore-shortcut");
        });
        this.$("ignore-shortcut").addEventListener("click", () => {
            overlay.open("choose-shortcut").then((newShortcut) => {
                if (newShortcut === null) return;
                shortcuts.setBindingFor("ignore-answer", newShortcut);
                events.emit("settings-shortcuts-ignore-answer");
            });
        });
        this.$("use-serif-font").addEventListener("click", (event) => {
            dataManager.settings.test.useSerifFont = event.target.checked;
            this.broadcastGlobalSetting("use-serif-font");
        });
        this.$("use-flashcard-mode").addEventListener("click", (event) => {
            dataManager.settings.test.useFlashcardMode = event.target.checked;
            this.broadcastGlobalSetting("use-flashcard-mode");
        });
        this.$("use-background-colors").addEventListener("click", (event) => {
            dataManager.settings.test.useBackgroundColors = event.target.checked
            this.broadcastGlobalSetting("use-background-colors");
        });
        this.$("skip-evaluation-on-correct")
        .addEventListener("click", (event) => {
            dataManager.settings.test.skipEvaluationOnCorrect =
                event.target.checked;
            this.broadcastGlobalSetting("skip-evaluation-on-correct");
        });
        utility.bindRadiobuttonGroup(this.$("font-sizes"),
            dataManager.settings.test.fontSize,
            (value) => {
                dataManager.settings.test.fontSize = value;
                this.broadcastGlobalSetting("font-size");
            }
        );
    }

    registerCentralEventListeners() {
        events.on("settings-test-show-progress", () => {
            this.$("show-progress").checked =
                dataManager.settings.test.showProgress;
        });
        events.on("settings-test-show-score", () => {
            this.$("show-score").checked =
                dataManager.settings.test.showScore;
        });
        events.on("settings-test-make-continuous", () => {
            this.$("make-continuous").checked =
                dataManager.settings.test.makeContinuous;
        });
        events.on("settings-test-animate", () => {
            this.$("animate").checked = dataManager.settings.test.animate;
        });
        events.on("settings-test-enable-ignore-shortcut", () => {
            const enabled = dataManager.settings.test.enableIgnoreShortcut;
            this.$("enable-ignore-shortcut").checked = enabled;
            this.$("choose-ignore-shortcut").toggleDisplay(enabled, "inline");
        });
        events.on("settings-shortcuts-ignore-answer", () => {
            this.$("ignore-shortcut").textContent =
                shortcuts.getBindingFor("ignore-answer");
        });
        events.on("settings-test-use-serif-font", () => {
            this.$("use-serif-font").checked =
                dataManager.settings.test.useSerifFont;
        });
        events.on("settings-test-use-flashcard-mode", () => {
            this.$("use-flashcard-mode").checked =
                dataManager.settings.test.useFlashcardMode;
            this.$("skip-evaluation-on-correct").parentNode.toggleDisplay(
                !dataManager.settings.test.useFlashcardMode);
            this.$("enable-ignore-shortcut").parentNode.toggleDisplay(
                !dataManager.settings.test.useFlashcardMode);
        });
        events.on("settings-test-use-background-colors", () => {
            this.$("use-background-colors").checked =
                dataManager.settings.test.useBackgroundColors;
        });
        events.on("settings-test-skip-evaluation-on-correct", () => {
            this.$("skip-evaluation-on-correct").checked =
                dataManager.settings.test.skipEvaluationOnCorrect;
        });
    }
}

customElements.define("test-settings-subsection", TestSettingsSubsection);
module.exports = TestSettingsSubsection;
