"use strict";

class SrsReviewSchedule extends PinwallWidget {
    constructor() {
        super("srs-review-schedule");
        const numSteps = { "hours": 60, "days": 61, "months": 60 };
        this.$("diagram").setUnits(["hours", "days", "months"]);
        this.$("diagram").setInfoText("SRS schedule for the next");
        this.$("diagram").showLegend();
        this.$("diagram").setDataCallback(async (unit) => ({
            timeline: await dataManager.srs.getScheduleFor(
                dataManager.languages.visible, unit, numSteps[unit]),
            options: {
                minMaxValue: 20,
                reverse: false
            }
        }))
    }

    connectedCallback() {
        this.updateListener = () => this.update();
        events.onAll(["settings-loaded", "language-added", "language-removed",
                      "language-visibility-changed", "srs-scheme-edited",
                      "update-srs-status"], this.updateListener);
    }

    disconnectedCallback() {
        events.removeAll([
            "settings-loaded", "language-added", "language-removed",
            "language-visibility-changed", "srs-scheme-edited",
            "update-srs-status"], this.updateListener);
    }

    open() {
        this.$("diagram").updateViewBox()
    }

    async update() {
        const languages = dataManager.languages.visible;
        this.$("diagram").setLegend(languages);
        this.$("diagram").toggleLegend(languages.length > 1);
        await this.$("diagram").selectUnit("hours");
    }
}

customElements.define("srs-review-schedule", SrsReviewSchedule);
module.exports = SrsReviewSchedule;
