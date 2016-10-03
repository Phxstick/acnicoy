"use strict";

class SvgBarDiagram extends Widget {
    constructor () {
        super("svg-bar-diagram");
        this.svg = utility.createSvgNode("svg");
        this.root.appendChild(this.svg);
        // Parameters for drawing (all in pixels)
        this.margin = { top: 0, right: 0, bottom: 0, left: 0 };
        this.textMarginTop = null;
        this.barWidth = 10;
        this.topLineWidth = 0;
        this.bottomLineWidth = 1;
    }
    draw (values, maxValues=null, descriptions=null) {
        if (maxValues !== null && values.length !== maxValues.length)
            throw Error("Arrays for drawing bars must have same length!");
        // Remove old elements first
        while (this.svg.lastChild) {
            this.svg.removeChild(this.svg.lastChild);
        }
        // If no maximum values are given, use the maximum of the values array
        if (maxValues === null) {
            const maxValue = Math.max(...values);
            for (let i = 0; i < values.length; ++i) maxValues.push(maxValue);
        }
        // Calculate the percentages
        const percentages = [];
        for (let i = 0; i < values.length; ++i) {
            percentages.push(maxValues[i] === 0 ? 0 : values[i] / maxValues[i]);
        }
        const { width: totalWidth, height: totalHeight } =
                this.svg.getBoundingClientRect();
        // Draw the top line
        const topLine = utility.createSvgNode("line",
            { x1: 0, y1: this.margin.top + this.topLineWidth / 2,
             x2: totalWidth, y2: this.margin.top + this.topLineWidth / 2,
              "stroke-width": this.topLineWidth });
        topLine.id = "top-line";
        this.svg.appendChild(topLine);
        // Draw the bottom line
        const bottomLine = utility.createSvgNode("line",
            { x1: 0,
              y1: totalHeight - this.margin.bottom - this.bottomLineWidth / 2,
              x2: totalWidth,
              y2: totalHeight - this.margin.bottom - this.bottomLineWidth / 2,
              "stroke-width": this.bottomLineWidth });
        bottomLine.id = "bottom-line";
        this.svg.appendChild(bottomLine);
        // Calculate size of the bar area and spacing between bars
        const width = totalWidth - this.margin.left - this.margin.right;
        const height = totalHeight - this.margin.bottom - this.margin.top
                       - this.topLineWidth - this.bottomLineWidth;
        const spacing =
            (width - values.length * this.barWidth) / (values.length - 1);
        // Draw the bars
        const pos = { x: this.margin.left };
        for (let i = 0; i < values.length; ++i) {
            pos.y = this.margin.top + this.topLineWidth
                    + height * (1 - percentages[i]);
            const rect = utility.createSvgNode("rect",
                    { x: pos.x, y: pos.y, width: this.barWidth,
                      height: height * percentages[i] });
            rect.classList.add("bar");
            this.svg.appendChild(rect);
            pos.x += this.barWidth + spacing;
        }
        // Draw the descriptions if given
        if (descriptions !== null) {
            const pos = { x: this.margin.left + this.barWidth / 2,
                          y: totalHeight - this.margin.bottom };
            let alignment;
            // If this.textMarginTop === null, align vertically in the middle
            if (this.textMarginTop !== null) {
                pos.y += this.textMarginTop;
                alignment = "hanging";
            } else {
                pos.y += this.margin.bottom / 2;
                alignment = "middle";
            }
            // Draw descriptions
            for (let i = 0; i < values.length; ++i) {
                const text = utility.createSvgNode("text",
                    { x: pos.x, y: pos.y, "alignment-baseline": alignment });
                text.textContent = descriptions[i];
                text.classList.add("label");
                this.svg.appendChild(text);
                pos.x += this.barWidth + spacing;
            }
        }
        // TODO: Show percentage in top margin?
        // TODO: Create popup windows for hovering (showing "current/total")
    }
}

customElements.define("svg-bar-diagram", SvgBarDiagram);
module.exports = SvgBarDiagram;
