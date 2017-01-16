"use strict";

class SrsReviewSchedule extends Widget {
    constructor() {
        super("srs-review-schedule");
        this.$("diagram").margin = { top: 30, left: 20, right: 20, bottom: 30 };
        this.$("diagram").barWidth = 20;
        this.$("diagram").barSpacing = 10;
        this.selectedIntervalButton = this.$("hours-button");
        this.$("hours-button").classList.add("selected");
        const buttonIds = ["hours-button", "days-button", "months-button"];
        for (const buttonId of buttonIds) {
            const button = this.$(buttonId);
            button.addEventListener("click", () => {
                if (this.selectedIntervalButton !== null) {
                    this.selectedIntervalButton.classList.remove("selected");
                }
                this.selectedIntervalButton = button;
                button.classList.add("selected");
                this.update();
            });
        }
    }

    connectedCallback() {
        this.updateListener = () => {
            // Only update if widget is visble
            if (this.$("diagram").offsetWidth !== null) this.update();
        };
        events.onAll(["current-srs-scheme-edited", "update-srs-status"],
            this.updateListener);
    }

    disconnectedCallback() {
        events.removeAll(["current-srs-scheme-edited", "update-srs-status"],
            this.updateListener);
    }

    update() {
        const stepName = this.selectedIntervalButton.textContent.toLowerCase();
        let step;
        let numSteps;
        let descriptionStep;
        if (stepName === "hours") {
            step = 60 * 60;
            numSteps = 48;
            descriptionStep = 6;
        } else if (stepName === "days") {
            step = 60 * 60 * 24;
            numSteps = 61;
            descriptionStep = 7;
        } else if (stepName === "months") {
            step = 60 * 60 * 24 * 30;
            numSteps = 24;
            descriptionStep = 6;
        }
        const descriptions = [];
        for (let i = 0; i < numSteps; ++i) {
            if (i === 0) {
                descriptions.push(`1 ${stepName.slice(0, -1)}`);
            } else if ((i + 1) % descriptionStep === 0) {
                descriptions.push(`${i + 1} ${stepName}`);
            } else {
                descriptions.push("");
            }
        }
        dataManager.srs.getSchedule(step, numSteps).then((schedule) => {
            this.$("diagram").draw(schedule, null, descriptions, true);
        });
    }

    open() {
        this.update();
    }

    adjustToLanguage(language, secondary) {
    }
}

customElements.define("srs-review-schedule", SrsReviewSchedule);
module.exports = SrsReviewSchedule;
