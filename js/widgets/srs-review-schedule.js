"use strict";

class SrsReviewSchedule extends PinwallWidget {
    constructor() {
        super("srs-review-schedule");
        const numSteps = { "hours": 48, "days": 61, "months": 24 };
        this.$("diagram").minMaxValue = 20;
        this.$("diagram").setUnits(["hours", "days", "months"], "hours");
        this.$("diagram").setInfoText("SRS schedule for the next");
        this.$("diagram").showLegend();
        this.$("diagram").setDataCallback((unit) =>
            dataManager.srs.getScheduleFor(
                dataManager.languages.visible, unit, numSteps[unit]));
    }

    registerCentralEventListeners() {
        events.onAll(["settings-loaded", "language-added", "language-removed",
                      "language-visibility-changed"], () => this.update());
    }

    connectedCallback() {
        this.updateListener = () => this.update();
        events.onAll(["current-srs-scheme-edited", "update-srs-status"],
            this.updateListener);
    }

    disconnectedCallback() {
        events.removeAll(["current-srs-scheme-edited", "update-srs-status"],
            this.updateListener);
    }

    async adjustToLanguage(language, secondary) {
    }

    async update() {
        const languages = dataManager.languages.visible;
        this.$("diagram").setLegend(languages);
        this.$("diagram").toggleLegend(languages.length > 1);
        await this.$("diagram").drawTimeline();
    }
}

customElements.define("srs-review-schedule", SrsReviewSchedule);
module.exports = SrsReviewSchedule;
