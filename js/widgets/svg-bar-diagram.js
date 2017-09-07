"use strict";

class SvgBarDiagram extends Widget {

    constructor() {
        super("svg-bar-diagram");
        this.svg = utility.createSvgNode("svg", {
            preserveAspectRatio: "xMinYMin slice"
        });
        this.root.appendChild(this.svg);
        // Parameters for drawing (all in pixels)
        this.margin = { top: 0, right: 0, bottom: 0, left: 0 };
        this.valueLabelMarginBottom = 5;
        this.smallSepTopHeight = 0;
        this.smallSepBottomHeight = 6;
        this.sepDescMarginTop = 0;
        this.descMarginBottom = 5;
        this.textMarginTop = null;
        this.topLineWidth = 0;
        this.bottomLineWidth = 1;
        this.barSpacing = null;
        this.barWidth = null;
        this.barRatio = 2;  // barWidth = barRatio * barSpacing
        // Allow dragging viewBox if diagram is larger than the viewPort
        this.dragging = false;
        this.dragStartX = null;
        this.viewOffsetX = 0;
        this.dragOffset = 0;
        this.svg.addEventListener("mousedown", (event) => {
            const { width: viewWidth } = this.svg.getBoundingClientRect();
            if (this.totalWidth <= viewWidth) return;
            this.dragging = true;
            this.dragStartX = event.clientX;
            this.svg.classList.add("dragging");
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
            this.svg.classList.remove("dragging");
        });
    }

    draw(values, { maxValues=null, descriptions=null, separators=null,
                   showValueLabels=false, showSmallSeparators=false }) {
        const numValues = values.length;

        // =====================================================================
        //    Check values and descriptions
        // =====================================================================
        // If maxValues is just an integer, use that as maximum for all values
        // If no maximum values are given, use the maximum of the values array
        if (typeof maxValues === "number") {
            const maxValue = maxValues;
            maxValues = [];
            for (let i = 0; i < numValues; ++i) maxValues.push(maxValue);
        }
        if (maxValues !== null && numValues !== maxValues.length)
            throw new Error("Arrays for drawing bars must have same length!");
        this.svg.empty();
        if (maxValues === null) {
            maxValues = [];
            const maxValue = Math.max(...values);
            for (let i = 0; i < numValues; ++i) maxValues.push(maxValue);
        }
        // Check if descriptions have correct format
        if (descriptions !== null && descriptions.length !== numValues &&
                descriptions.length !== numValues + 1)
            throw new Error("descriptions must be either null or an Array " +
                "of strings of length values.length or values.lenth + 1.");
        // Calculate the percentages
        const percentages = [];
        for (let i = 0; i < numValues; ++i) {
            percentages.push(maxValues[i] === 0 ? 0 : values[i] / maxValues[i]);
        }

        // =====================================================================
        //    Calculate size of the diagram
        // =====================================================================
        // Unless both spacing and barWidth are given, the diagram width will be
        // the view-width. Otherwise it will take up as much space as needed to
        // draw everything.
        const { width: viewWidth, height: viewHeight } =
                this.svg.getBoundingClientRect();
        this.svg.setAttribute("width", viewWidth.toString());
        this.svg.setAttribute("height", viewHeight.toString());
        this.svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
        this.viewOffsetX = 0;
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
        this.svg.classList.toggle("draggable", totalWidth > viewWidth);
        // Size of the bar area only
        const width = totalWidth - this.margin.left - this.margin.right;
        const height = totalHeight - this.margin.bottom - this.margin.top
                       - this.topLineWidth - this.bottomLineWidth;

        // =====================================================================
        //    Calculate parameters for drawing bars
        // =====================================================================
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

        // =====================================================================
        //    Draw top/bottom line
        // =====================================================================
        // Draw top line
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

        // =====================================================================
        //    Draw bars
        // =====================================================================
        const pos = { x: this.margin.left };
        for (let i = 0; i < numValues; ++i) {
            pos.y = this.margin.top + this.topLineWidth
                    + height * (1 - percentages[i]);
            const rect = utility.createSvgNode("rect",
                    { x: pos.x, y: pos.y, width: barWidth,
                      height: height * percentages[i] });
            rect.classList.add("bar");
            this.svg.appendChild(rect);
            // Also display value labels, if flag is set
            if (showValueLabels && values[i] > 0) {
                const valueLabel = utility.createSvgNode("text",
                    { x: pos.x + barWidth / 2,
                      y: pos.y - this.valueLabelMarginBottom });
                valueLabel.classList.add("value-label");
                valueLabel.textContent = values[i].toString();
                this.svg.appendChild(valueLabel);
            }
            pos.x += barWidth + barSpacing;
        }

        // =====================================================================
        //    Draw descriptions (if given)
        // =====================================================================
        // If numValues descriptions are given, draw them right below the bars.
        // If there are numValues + 1, draw them below the gaps between the bars.
        let firstDescriptionLabel;
        if (descriptions !== null) {
            const linePos = { x: this.margin.left - barSpacing / 2,
                              y: totalHeight - this.margin.bottom };
            const pos = { x: this.margin.left,
                          y: totalHeight - this.margin.bottom};
            if (descriptions.length === numValues) {
                pos.x += barWidth / 2;
            }
            if (descriptions.length === numValues + 1) {
                pos.x -= barSpacing / 2;
            }
            let alignment;
            // If this.textMarginTop is null, align vertically in the middle
            if (this.textMarginTop !== null) {
                pos.y += this.textMarginTop;
                alignment = "before-edge";
            } else {
                pos.y += this.margin.bottom / 2;
                alignment = "central";
            }
            // Draw description labels
            for (let i = 0; i < descriptions.length; ++i) {
                if (descriptions[i].length === 0) continue;
                const x = pos.x + i * (barWidth + barSpacing);
                const label = utility.createSvgNode("text",
                    { x, y: pos.y, "alignment-baseline": alignment});
                label.textContent = descriptions[i];
                label.classList.add("description-label");
                this.svg.appendChild(label);
                if (firstDescriptionLabel === undefined) {
                    firstDescriptionLabel = label;
                }
            }
            // Draw small seperators (if flag is set)
            if (showSmallSeparators) {
                for (let i = 0; i < numValues + 1; ++i) {
                    const smallSepLine = utility.createSvgNode("line", 
                        { x1: linePos.x, x2: linePos.x,
                          y1: linePos.y - this.smallSepTopHeight,
                          y2: linePos.y + this.smallSepBottomHeight });
                    smallSepLine.classList.add("small-separator");
                    this.svg.appendChild(smallSepLine);
                    linePos.x += barWidth + barSpacing;
                }
            }
        }
        // =====================================================================
        //    Draw large separators (if given)
        // =====================================================================
        if (separators !== null) {
            const startPosX = this.margin.left - barSpacing / 2;
            const y = totalHeight - this.margin.bottom;
            for (const index in separators) {
                const text = separators[index];
                const offset = parseInt(index) * (barWidth + barSpacing);
                // Draw description text (if not empty)
                let textHeight;
                if (text.length > 0) {
                    const label = utility.createSvgNode("text",
                        { x: startPosX + offset,
                          y: totalHeight - this.descMarginBottom,
                          "alignment-baseline": "baseline" });
                    label.classList.add("separator-label");
                    label.textContent = text;
                    this.svg.appendChild(label);
                    textHeight = label.getBBox().height;
                }
                // Extend line as far as possible if there's nothing below
                let yExtension = 0;
                if (showSmallSeparators) {
                    yExtension += this.smallSepBottomHeight;
                }
                if (descriptions === null ||
                        descriptions.length !== numValues + 1 ||
                        descriptions[index].length === 0) {
                    if (firstDescriptionLabel !== undefined) {
                        const { height: labelHeight } =
                            firstDescriptionLabel.getBBox();
                        yExtension += labelHeight + this.textMarginTop;
                    }
                    if (text.length > 0) {
                        yExtension = this.margin.bottom - textHeight
                                     - this.descMarginBottom
                                     - this.sepDescMarginTop;
                    } else if (text.length === 0) {
                        yExtension = this.margin.bottom
                                     - this.descMarginBottom;
                    }
                }
                // Draw line
                const sepLine = utility.createSvgNode("line", 
                    { x1: startPosX + offset, x2: startPosX + offset,
                      y1: 0, y2: y + yExtension });
                sepLine.classList.add("large-separator");
                this.svg.appendChild(sepLine);
            }
        }
    }
}

customElements.define("svg-bar-diagram", SvgBarDiagram);
module.exports = SvgBarDiagram;
