"use strict";

class TimeBarDiagram extends Widget {
    constructor() {
        super("time-bar-diagram");
        this.selectedUnit = null;
        this.unitButtons = {};
        this.onResizeTimeout = null;
    }

    connectedCallback() {
        super.connectedCallback()
        this.resizeListener = () => {
            this.clearResizeTimeout()
            this.onResizeTimeout = window.setTimeout(() => this.resetViewBox(), 100)
        }
        window.addEventListener("resize", this.resizeListener)
    }

    disconnectedCallback() {
        super.disconnectedCallback()
        this.clearResizeTimeout()
        window.removeEventListener("resize", this.resizeListener)
    }

    clearResizeTimeout() {
        if (this.onResizeTimeout !== null) {
            window.clearTimeout(this.onResizeTimeout)
            this.onResizeTimeout = null
        }
    }

    setUnits(units) {
        for (const unit of units) {
            const button = document.createElement("button");
            button.textContent = unit[0].toUpperCase() + unit.slice(1);
            button.addEventListener("click", () => this.selectUnit(unit));
            this.unitButtons[unit] = button;
            this.$("unit-buttons").appendChild(button);
        }
    }

    setDataCallback(callback) {
        this.getTimeline = callback;
    }

    setInfoText(text) {
        this.$("info-text").textContent = text;
    }

    setOptions(options) {
        const {
            margin = { top: 15, left: 25, right: 25, bottom: 40 },
            barWidth = 20, 
            barSpacing = 10,
            textMarginTop = 6
        } = options
        const d = this.$("diagram")
        d.margin = margin
        d.barWidth = barWidth
        d.barSpacing = barSpacing
        d.textMarginTop = textMarginTop
    }

    async selectUnit(unit) {
        if (this.selectedUnit !== null) {
            const selectedUnitButton = this.unitButtons[this.selectedUnit];
            selectedUnitButton.classList.remove("selected");
        }
        this.selectedUnit = unit;
        this.unitButtons[unit].classList.add("selected");
        await this.drawTimeline()
    }

    async drawTimeline() {
        if (this.getTimeline === undefined) {
            throw new Error("Data callback must be set before drawing!");
        }
        if (this.selectedUnit === null) return
        const unit = this.selectedUnit
        const { timeline, options } = await this.getTimeline(unit);
        this.setOptions(options)
        const { reverse=false, minMaxValue=null } = options
        const { labels, separators } = utility.getTimelineMarkers(timeline, unit);
        const dataList = timeline.map(({data}) => data);
        const colors = dataList.length > 0 ?
            utility.getDistantColors(dataList[0].length) : null;
        this.$("diagram").setValues(dataList, {
            descriptions: labels, separators, colors, showValueLabels: true,
            showSmallSeparators: true, stackBars: true, stackSpacing: 1,
            reverse, minMaxValue });
        this.resetViewBox();
        this.clearResizeTimeout()
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

    toggleLegend(bool) {
        if (bool) this.showLegend();
        else this.hideLegend();
    }

    updateViewBox() {
        this.$("diagram").updateViewBox();
    }

    resetViewBox() {
        this.$("diagram").resetViewBox();
    }

    incrementLastValue(index) {
        this.$("diagram").incrementLastValue(index);
    }

    decrementLastValue(index) {
        this.$("diagram").decrementLastValue(index);
    }
}

customElements.define("time-bar-diagram", TimeBarDiagram);
module.exports = TimeBarDiagram;
