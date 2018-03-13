"use strict";

class SrsReviewSchedule extends PinwallWidget {
    constructor() {
        super("srs-review-schedule");
        const numSteps = { "hours": 48, "days": 61, "months": 24 };
        this.$("diagram").setUnits(["hours", "days", "months"], "hours");
        this.$("diagram").setInfoText("Show SRS schedule for the next");
        this.$("diagram").setDataCallback((unit) =>
            dataManager.srs.getSchedule(unit, numSteps[unit]));
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
        await this.update();
    }

    async update() {
        await this.$("diagram").drawTimeline();
    }
}

customElements.define("srs-review-schedule", SrsReviewSchedule);
module.exports = SrsReviewSchedule;
