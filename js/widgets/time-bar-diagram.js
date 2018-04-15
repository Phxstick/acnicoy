"use strict";

class TimeBarDiagram extends Widget {
    constructor() {
        super("time-bar-diagram");
        this.unitButtons = {};
        this.reverse = false;
        this.$("diagram").margin = { top: 30, left: 25, right: 25, bottom: 40 };
        this.$("diagram").barWidth = 20;
        this.$("diagram").barSpacing = 10;
        this.$("diagram").textMarginTop = 6;
    }

    setUnits(units, defaultUnit) {
        for (const unit of units) {
            const button = document.createElement("button");
            button.textContent = unit[0].toUpperCase() + unit.slice(1);
            button.addEventListener("click", () => {
                const selectedUnitButton = this.unitButtons[this.selectedUnit];
                selectedUnitButton.classList.remove("selected");
                button.classList.add("selected");
                this.selectedUnit = unit;
                this.drawTimeline();
            });
            this.unitButtons[unit] = button;
            this.$("unit-buttons").appendChild(button);
        }
        this.selectedUnit = defaultUnit;
        this.unitButtons[defaultUnit].classList.add("selected");
    }

    setDataCallback(callback) {
        this.getTimeline = callback;
    }

    setInfoText(text) {
        this.$("info-text").textContent = text;
    }

    async drawTimeline() {
        if (this.getTimeline === undefined) {
            throw new Error("Data callback must be set before drawing!");
        }
        const unit = this.selectedUnit;
        const timeline = await this.getTimeline(unit);
        const {labels,separators} = utility.getTimelineMarkers(timeline, unit);
        const dataList = timeline.map(({data}) => data);
        const colors = dataList.length > 0 ?
                utility.getDistantColors(dataList[0].length) : null;
        this.$("diagram").draw(dataList, { descriptions: labels, separators,
            colors, showValueLabels: true, showSmallSeparators: true,
            stackBars: true, reverse: this.reverse });
    }

    setLegend(labels) {
        const colors = utility.getDistantColors(labels.length);
        this.$("diagram").setLegend(labels, colors);
    }
    
    hideLegend() {
        this.$("diagram").hideLegend();
    }

    showLegend() {
        this.$("diagram").showLegend();
    }
}

customElements.define("time-bar-diagram", TimeBarDiagram);
module.exports = TimeBarDiagram;
