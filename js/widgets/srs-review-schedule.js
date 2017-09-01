"use strict";

class SrsReviewSchedule extends PinwallWidget {
    constructor() {
        super("srs-review-schedule");
        this.$("diagram").margin = { top: 30, left: 25, right: 25, bottom: 40 };
        this.$("diagram").barWidth = 20;
        this.$("diagram").barSpacing = 10;
        this.$("diagram").textMarginTop = 6;
        this.selectedUnit = "hours";
        this.$("hours-button").classList.add("selected");
        const units = ["hours", "days", "months"];
        for (const unit of units) {
            const button = this.$(`${unit}-button`);
            button.addEventListener("click", () => {
                const selectedUnitButton = this.$(`${this.selectedUnit}-button`)
                selectedUnitButton.classList.remove("selected");
                button.classList.add("selected");
                this.selectedUnit = unit;
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
        const unit = this.selectedUnit;
        let numSteps;
        if (unit === "hours") numSteps = 48;
        else if (unit === "days") numSteps = 61;
        else if (unit === "months") numSteps = 24;
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
                    // Display hour if divisible by 3
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
                    date.setDate(date.getDate() - 1);
                    // Display date if first day of a week
                    if (date.getDay() === 1) {
                        descriptions.push(
                           `${utility.getOrdinalNumberString(date.getDate())}`);
                    } else {
                        descriptions.push("");
                    }
                    if (date.getDate() === 1) {
                        separators[index] = date.toLocaleString("en-us",
                            { month: "long" });
                    }
                } else if (unit === "months") {
                    date.setMonth(date.getMonth() - 1, 1);
                    // Display month if divisible by 3 (Jan, Apr, Jul, Oct)
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
}

customElements.define("srs-review-schedule", SrsReviewSchedule);
module.exports = SrsReviewSchedule;
