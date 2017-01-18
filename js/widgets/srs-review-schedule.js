"use strict";

class SrsReviewSchedule extends Widget {
    constructor() {
        super("srs-review-schedule");
        this.$("diagram").margin = { top: 30, left: 25, right: 25, bottom: 40 };
        this.$("diagram").barWidth = 20;
        this.$("diagram").barSpacing = 10;
        this.$("diagram").textMarginTop = 6;
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
        this.updateListener = () => this.update();
        events.onAll(["current-srs-scheme-edited", "update-srs-status"],
            this.updateListener);
    }

    disconnectedCallback() {
        events.removeAll(["current-srs-scheme-edited", "update-srs-status"],
            this.updateListener);
    }

    update() {
        if (this.$("diagram").isHidden()) return;
        const unit = this.selectedIntervalButton.textContent.toLowerCase();
        let numSteps;
        if (unit === "hours") numSteps = 48;
        else if (unit === "days") numSteps = 61;
        else if (unit === "months") numSteps = 20;
        dataManager.srs.getSchedule(unit, numSteps).then((schedule) => {
            const amounts = []
            const descriptions = [];
            const separators = {};
            if (unit === "hours") {
                const startHour = (schedule[0].date.getHours() + 23) % 24;
                if (startHour % 3 === 0) descriptions.push(`${startHour}:00`);
                else descriptions.push("");
            }
            for (const [index, { amount, date }] of schedule.entries()) {
                amounts.push(amount);
                if (unit === "hours") {
                    const hour = date.getHours();
                    if (hour % 3 === 0) {
                        descriptions.push(`${hour}:00`);
                    } else {
                        descriptions.push("");
                    }
                    if (date.getHours() === 1) {
                        separators[index] = date.toLocaleString("en-us",
                            { month: "short", day: "2-digit" });
                    }
                } else if (unit === "days") {
                    if (date.getDay() === 2) {
                        date.setDate(date.getDate() - 1);
                        descriptions.push(
                           `${utility.getOrdinalNumberString(date.getDate())}`);
                    } else {
                        descriptions.push("");
                    }
                    if (date.getDate() === 2) {
                        separators[index] = date.toLocaleString("en-us",
                            { month: "long" });
                    }
                } else if (unit === "months") {
                    date.setMonth(date.getMonth() - 1, 1); // Previous month
                    if (date.getMonth() % 3 === 0) {
                        descriptions.push(
                            date.toLocaleString("en-us", { month: "short" }));
                    } else {
                        descriptions.push("");
                    }
                    if (date.getMonth() === 0) {
                        separators[index] = date.toLocaleString("en-us",
                            { year: "numeric" });
                    }
                }
            }
            this.$("diagram").draw(amounts, { descriptions, separators,
                showValueLabels: true, showSmallSeparators: true });
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
