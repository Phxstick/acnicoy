"use strict";

class SvgBarDiagram extends Widget {

    constructor () {
        super("svg-bar-diagram");
        this.svg = utility.createSvgNode("svg", {
            preserveAspectRatio: "xMinYMin slice"
        });
        this.root.appendChild(this.svg);
        // Parameters for drawing (all in pixels)
        this.margin = { top: 0, right: 0, bottom: 0, left: 0 };
        this.textMarginTop = null;
        this.topLineWidth = 0;
        this.bottomLineWidth = 1;
        this.barSpacing = null;
        this.barWidth = null;
        this.barRatio = 2;  // barWidth = barRatio * barSpacing
        // Allow dragging viewBox if diagram is larger than the viewPort
        this.dragging = false;
        this.dragAnchorX = null;
        this.viewOffsetX = 0;
        this.dragOffset = 0;
        this.svg.addEventListener("mousedown", (event) => {
            this.dragging = true;
            this.dragStartX = event.clientX;
        });
        window.addEventListener("mousemove", (event) => {
            if (!this.dragging) return;
            const { width: viewWidth, height: viewHeight } =
                this.svg.getBoundingClientRect();
            const x = event.clientX;
            this.dragOffset = this.dragStartX - x;
            if (this.viewOffsetX + this.dragOffset < 0) {
                this.dragOffset = -this.viewOffsetX;
            }
            const maxViewOffsetX = this.totalWidth - viewWidth;
            if (this.viewOffsetX + this.dragOffset > maxViewOffsetX) {
                this.dragOffset = maxViewOffsetX - this.viewOffsetX;
            }
            const viewOffsetX = this.viewOffsetX + this.dragOffset;
            this.svg.setAttribute("viewBox",
                `${viewOffsetX} 0 ${viewWidth + viewOffsetX} ${viewHeight}`);
        });
        window.addEventListener("mouseup", () => {
            if (!this.dragging) return;
            this.dragging = false;
            this.viewOffsetX += this.dragOffset;
        });
    }

    draw (values, maxValues=null, descriptions=null) {
        const numValues = values.length;
        if (maxValues !== null && numValues !== maxValues.length)
            throw new Error("Arrays for drawing bars must have same length!");
        this.svg.empty();
        // If no maximum values are given, use the maximum of the values array
        if (maxValues === null) {
            const maxValue = Math.max(...values);
            for (let i = 0; i < numValues; ++i) maxValues.push(maxValue);
        }
        // Calculate the percentages
        const percentages = [];
        for (let i = 0; i < numValues; ++i) {
            percentages.push(maxValues[i] === 0 ? 0 : values[i] / maxValues[i]);
        }
        // === Calculate size of the diagram ===
        // Unless both spacing and barWidth are given, the diagram width will be
        // the view-width. Otherwise it will take up as much space as needed to
        // draw everything.
        const { width: viewWidth, height: viewHeight } =
                this.svg.getBoundingClientRect();
        this.svg.setAttribute("width", viewWidth.toString());
        this.svg.setAttribute("height", viewHeight.toString());
        const totalHeight = viewHeight;
        let totalWidth;
        if (this.barSpacing !== null && this.barWidth !== null) {
            if (isNaN(this.barSpacing) || isNaN(this.barWidth)) {
                throw new Error("this.barSpacing and this.barWidth must " +
                                "either be integers or null!");
            }
            totalWidth = numValues * (this.barWidth + this.barSpacing) -
                         this.barSpacing + this.margin.left + this.margin.right;
        } else {
            totalWidth = viewWidth;
        }
        this.totalWidth = totalWidth;
        // Size of the bar area only
        const width = totalWidth - this.margin.left - this.margin.right;
        const height = totalHeight - this.margin.bottom - this.margin.top
                       - this.topLineWidth - this.bottomLineWidth;
        // === Calculate parameters for drawing the bars ===
        let barSpacing = this.barSpacing;
        let barWidth = this.barWidth;
        // If neither barSpacing not barWidth is given, calculate those values
        // according to a standard ratio between them, while making sure that
        // the bars will completely fit into the diagram.
        if (this.barSpacing === null && this.barWidth === null) {
            barSpacing = width / (this.barRatio * numValues + numValues - 1);
            barWidth = this.barRatio * barSpacing;
        // If barSpacing is given but not barWidth, calculate the latter,
        // assuming that the width of the diagram is its width on the screen.
        } else if (this.barSpacing !== null && this.barWidth === null) {
            if (isNaN(this.barSpacing)) {
                throw new Error("barSpacing must be an integer or null!");
            }
            barWidth = (width - (numValues - 1) * barSpacing) / numValues;
        // If only barWidth is given, calculate barSpacing instead under
        // the same assumptions as in the case above.
        } else if (this.barSpacing === null && this.barWidth !== null) {
            if (isNaN(this.barWidth)) {
                throw new Error("this.barWidth must be an integer or null!");
            }
            barSpacing = (width - numValues * barWidth) / (numValues - 1);
        }
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
        // Draw the bars
        const pos = { x: this.margin.left };
        for (let i = 0; i < numValues; ++i) {
            pos.y = this.margin.top + this.topLineWidth
                    + height * (1 - percentages[i]);
            const rect = utility.createSvgNode("rect",
                    { x: pos.x, y: pos.y, width: barWidth,
                      height: height * percentages[i] });
            rect.classList.add("bar");
            this.svg.appendChild(rect);
            pos.x += barWidth + barSpacing;
        }
        // Draw the descriptions if given
        if (descriptions !== null) {
            const pos = { x: this.margin.left + barWidth / 2,
                          y: totalHeight - this.margin.bottom };
            let alignment;
            // If this.textMarginTop is null, align vertically in the middle
            if (this.textMarginTop !== null) {
                pos.y += this.textMarginTop;
                alignment = "hanging";
            } else {
                pos.y += this.margin.bottom / 2;
                alignment = "middle";
            }
            // Draw descriptions
            for (let i = 0; i < numValues; ++i) {
                const text = utility.createSvgNode("text",
                    { x: pos.x, y: pos.y, "alignment-baseline": alignment });
                text.textContent = descriptions[i];
                text.classList.add("label");
                this.svg.appendChild(text);
                pos.x += barWidth + barSpacing;
            }
        }
        // TODO: Show percentage in top margin?
        // TODO: Display tooltips for hovering (showing "current/total")
    }
}

customElements.define("svg-bar-diagram", SvgBarDiagram);
module.exports = SvgBarDiagram;
