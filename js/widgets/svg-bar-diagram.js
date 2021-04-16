"use strict";

class SvgBarDiagram extends Widget {

    constructor() {
        super("svg-bar-diagram");
        this.diagram = this.$("diagram");
        this.legend = this.$("legend");
        this.legend.hide();

        // Parameters for drawing (all in pixels)
        this.margin = { top: 0, right: 0, bottom: 0, left: 0 };
        this.valueLabelMarginBottom = 5;
        this.smallSepTopHeight = 0;
        this.smallSepBottomHeight = 6;
        this.sepDescMarginTop = 0;
        this.descMarginBottom = 5;
        this.textMarginTop = 6;
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
        this.diagram.addEventListener("mouseenter", (event) => {
            const { width: viewWidth } = this.diagram.getBoundingClientRect();
            this.diagram.classList.toggle("draggable",this.totalWidth>viewWidth)
        });
        this.diagram.addEventListener("mousedown", (event) => {
            const { width: viewWidth } = this.diagram.getBoundingClientRect();
            if (this.totalWidth <= viewWidth) return;
            this.dragging = true;
            this.dragStartX = event.clientX;
            this.diagram.classList.add("dragging");
        });
        window.addEventListener("mousemove", (event) => {
            if (!this.dragging) return;
            const { width: viewWidth, height: viewHeight } =
                this.diagram.getBoundingClientRect();
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
            this.diagram.setAttribute("viewBox",
                `${viewOffsetX} 0 ${viewWidth + viewOffsetX} ${viewHeight}`);
        });
        window.addEventListener("mouseup", () => {
            if (!this.dragging) return;
            this.dragging = false;
            this.viewOffsetX += this.dragOffset;
            this.diagram.classList.remove("dragging");
        });
    }

    draw() {
        this.lastValueLabel = undefined;

        // Get indices of the currently selected columns (if no labels
        // have been set, then all indices are selected by default)
        const columnIndices = []
        if (this.values.length > 0 && Array.isArray(this.values[0])) {
            if (this.indices === undefined) {
                for (let i = 0; i < this.values[0].length; ++i) {
                    columnIndices.push(i)
                }
            } else {
                for (let i = 0; i < this.indices.length; ++i) {
                    if (this.indices[i]) columnIndices.push(i)
                }
            }
        }

        // Put values/args into local variables for convenience
        const values = this.values
        values[0] = this.lastValues  // In case most recent values have changed
        const numValues = values.length;
        let { maxValues=null, descriptions=null, separators=null,
          colors=null, minMaxValue=null,
          showValueLabels=false, showSmallSeparators=false,
          stackBars=false, splitValueLabels=false, reverse=false,
          stackSpacing=0 } = this.args

        // =====================================================================
        //    Check values and descriptions
        // =====================================================================

        // If maxValues is just an integer, use that as maximum for all values.
        if (typeof maxValues === "number") {
            const maxValue = maxValues;
            maxValues = [];
            for (let i = 0; i < numValues; ++i) maxValues.push(maxValue);
        }
        if (maxValues !== null && numValues !== maxValues.length)
            throw new Error("Arrays for drawing bars must have same length!");

        // If no maximum values are given, use the maximum of the values array,
        // but make it at least as large as minMaxValue (if not null)
        if (maxValues === null) {
            let maxValue;
            if (numValues === 0) {
                maxValue = 0;
            } else if (typeof values[0] === "number") {
                maxValue = Math.max(...values);
            } else if (Array.isArray(values[0])) {
                if (stackBars) {
                    maxValue = Math.max(...values.map((arr) => {
                        let sum = 0;
                        for (const j of columnIndices) sum += arr[j];
                        return sum;
                    }));
                } else {
                    maxValue = Math.max(...values.map((arr) => {
                        let max = 0;
                        for (const j of columnIndices) max=Math.max(arr[j],max);
                        return max;
                    }));
                }
            } else {
                throw new Error("Values must be numbers or arrays of numbers.");
            }
            if (minMaxValue !== null) {
                maxValue = Math.max(minMaxValue, maxValue); 
            }
            maxValues = [];
            for (let i = 0; i < numValues; ++i) maxValues.push(maxValue);
        }

        // Check if descriptions have correct format
        if (descriptions !== null && descriptions.length !== numValues &&
                descriptions.length !== numValues + 1)
            throw new Error("Descriptions must be either null or an array " +
                "of strings of length (values.length) or (values.length + 1).");

        // Calculate the fractions
        const fractions = new Array(numValues);
        for (let i = 0; i < numValues; ++i) {
            if (maxValues[i] === 0) {
                fractions[i] = 0;
            } else if (typeof values[i] === "number") {
                fractions[i] = values[i] / maxValues[i];
            } else if (Array.isArray(values[i])) {
                fractions[i] = values[i].map((v) => v / maxValues[i]);
            } else {
                throw new Error("Values must be numbers or arrays of numbers.");
            }
        }

        // =====================================================================
        //    Calculate size of the diagram
        // =====================================================================

        // Unless both spacing and barWidth are given, the diagram width will be
        // the view-width. Otherwise it will take up as much space as needed to
        // draw everything. The diagram height is assumed to be given in pixels
        // by the CSS property "--diagram-height".
        this.viewOffsetX = 0;
        const totalHeight = parseInt(window.getComputedStyle(this)
                            .getPropertyValue("--diagram-height").slice(0,-2));
        let totalWidth;
        if (this.barSpacing !== null && this.barWidth !== null) {
            if (isNaN(this.barSpacing) || isNaN(this.barWidth)) {
                throw new Error("this.barSpacing and this.barWidth must " +
                                "either be integers or null!");
            }
            totalWidth = numValues * (this.barWidth + this.barSpacing) -
                         this.barSpacing + this.margin.left + this.margin.right;
        } else {
            totalWidth = this.diagram.getBoundingClientRect().width;
        }
        this.totalWidth = totalWidth;

        // Size of the bar area only
        const width = totalWidth - this.margin.left - this.margin.right;
        let height = totalHeight - this.margin.bottom - this.margin.top
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
                throw new Error("barWidth must be an integer or null!");
            }
            barSpacing = (width - numValues * barWidth) / (numValues - 1);
        }

        // =====================================================================
        //    Draw top/bottom line
        // =====================================================================

        this.diagram.empty();

        // Draw top line
        const topLine = utility.createSvgNode("line",
            { x1: 0, y1: this.margin.top + this.topLineWidth / 2,
             x2: totalWidth, y2: this.margin.top + this.topLineWidth / 2,
              "stroke-width": this.topLineWidth });
        topLine.id = "top-line";
        this.diagram.appendChild(topLine);

        // Draw bottom line
        const bottomLine = utility.createSvgNode("line",
            { x1: 0,
              y1: totalHeight - this.margin.bottom - this.bottomLineWidth / 2,
              x2: totalWidth,
              y2: totalHeight - this.margin.bottom - this.bottomLineWidth / 2,
              "stroke-width": this.bottomLineWidth });
        bottomLine.id = "bottom-line";
        this.diagram.appendChild(bottomLine);

        // =====================================================================
        //    Draw bars
        // =====================================================================
        const pos = { x: reverse ? totalWidth - this.margin.right - barWidth
                                 : this.margin.left,
                      y: this.margin.top + this.topLineWidth + height };
        for (let i = 0; i < numValues; ++i) {
            if (i > 0) pos.x += (1-2*reverse) * (barWidth + barSpacing);
            if (typeof fractions[i] === "number") {
                if (i !== 0 && fractions[i] === 0) continue;

                // Draw bar
                const barHeight = height * fractions[i];
                const rect = utility.createSvgNode("rect",
                        { x: pos.x, y: pos.y - barHeight,
                          width: barWidth, height: barHeight });
                rect.classList.add("bar");
                this.diagram.appendChild(rect);
                if (i == 0) this.lastBars = rect;

                // Also display value label (if flag is set)
                if (showValueLabels && (values[i] > 0 || i === 0)) {
                    const valueLabel = utility.createSvgNode("text",
                        { x: pos.x + barWidth / 2,
                          y: pos.y - barHeight - this.valueLabelMarginBottom });
                    valueLabel.classList.add("value-label");
                    valueLabel.textContent = values[i].toString();
                    this.diagram.appendChild(valueLabel);
                    if (i == 0) this.lastValueLabel = valueLabel;
                }
            } else if (Array.isArray(fractions[i])) {
                let valueSum = 0;
                for (const j of columnIndices) valueSum += values[i][j];
                if (i !== 0 && valueSum === 0) continue;

                const numBars = columnIndices.length;
                const spaceForBars = stackBars ?
                    height - (numBars - 1) * stackSpacing - numBars: height;
                let offsetX = 0;
                let offsetY = 0;
                if (i == 0) this.lastBars = [];
                if (i == 0) this.lastValueLabel = [];
                for (const j of columnIndices) {
                    if (i !== 0 && fractions[i][j] === 0) continue;

                    // Draw sub-bar
                    const barHeight = Math.ceil(spaceForBars * fractions[i][j]);
                    const width = stackBars ? barWidth : barWidth / numBars;
                    const rect = utility.createSvgNode("rect",
                        { x: pos.x + offsetX, y: pos.y - barHeight + offsetY,
                          width, height: barHeight });
                    if (colors !== null) {
                        rect.style.fill = colors[j];
                    }
                    rect.classList.add("bar");
                    this.diagram.appendChild(rect);
                    if (i == 0) this.lastBars[j] = rect;

                    // If sub-bars are not stacked, add label for each
                    if (!stackBars && splitValueLabels && showValueLabels
                            && (values[i][j] > 0 || i === 0)) {
                        const valueLabel = utility.createSvgNode("text",
                            { x: pos.x + offsetX + width / 2,
                              y: pos.y-barHeight-this.valueLabelMarginBottom });
                        valueLabel.classList.add("value-label");
                        valueLabel.textContent = values[i][j].toString();
                        this.diagram.appendChild(valueLabel);
                        if (i == 0) this.lastValueLabel[j] = valueLabel;
                        if (values[i][j] === 0) valueLabel.hide();
                    }

                    // Update position for the next sub-bar
                    if (stackBars) {
                        if (values[i][j] > 0) {
                            offsetY -= barHeight + stackSpacing;
                        }
                    } else {
                        offsetX += width;
                    }
                }

                // If bars are stacked, add single label with sum of all values
                if ((stackBars || !splitValueLabels) && showValueLabels
                        && (valueSum > 0 || i === 0)) {
                    if (!stackBars) {
                        const heights = []
                        for (const j in columnIndices)
                            heights.push(fractions[i][j] * height)
                        offsetY = -Math.max(heights);
                    }
                    const valueLabel = utility.createSvgNode("text",
                        { x: pos.x + barWidth / 2,
                          y: pos.y + offsetY - this.valueLabelMarginBottom });
                    valueLabel.classList.add("value-label");
                    valueLabel.textContent = valueSum.toString();
                    this.diagram.appendChild(valueLabel);
                    if (i == 0) this.lastValueLabel = valueLabel;
                    if (valueSum === 0) valueLabel.hide();
                }
            }
        }

        // =====================================================================
        //    Draw descriptions (if given)
        // =====================================================================

        // If numValues descriptions are given, draw them right below the bars.
        // If there are numValues+1, draw them below the gaps between the bars.

        if (descriptions !== null) {
            const linePos = {
                x: reverse ? totalWidth - this.margin.right + barSpacing / 2
                           : this.margin.left - barSpacing / 2,
                y: totalHeight - this.margin.bottom };
            const pos = { x: reverse ? totalWidth - this.margin.right
                                     : this.margin.left,
                          y: totalHeight - this.margin.bottom};
            if (descriptions.length === numValues) {
                pos.x += (1-2*reverse) * barWidth / 2;
            }
            if (descriptions.length === numValues + 1) {
                pos.x -= (1-2*reverse) * barSpacing / 2;
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
                const x = pos.x + (1-2*reverse) * i * (barWidth + barSpacing);
                const label = utility.createSvgNode("text",
                    { x, y: pos.y, "alignment-baseline": alignment});
                label.textContent = descriptions[i];
                label.classList.add("description-label");
                this.diagram.appendChild(label);
            }

            // Draw small seperators (if flag is set)
            if (showSmallSeparators) {
                for (let i = 0; i < numValues + 1; ++i) {
                    const smallSepLine = utility.createSvgNode("line", 
                        { x1: linePos.x, x2: linePos.x,
                          y1: linePos.y - this.smallSepTopHeight,
                          y2: linePos.y + this.smallSepBottomHeight });
                    smallSepLine.classList.add("small-separator");
                    this.diagram.appendChild(smallSepLine);
                    linePos.x += (1-2*reverse) * (barWidth + barSpacing);
                }
            }
        }

        // =====================================================================
        //    Draw large separators (if given)
        // =====================================================================

        if (separators !== null) {
            const startPosX =
                reverse ?  totalWidth - this.margin.right + barSpacing / 2
                        : this.margin.left - barSpacing / 2;
            const y = totalHeight - this.margin.bottom;
            for (let index in separators) {
                const text = separators[index];
                if (reverse) {
                    if (parseInt(index) === numValues) continue;
                    index = parseInt(index) + 1;
                }
                const offset =
                    (1-2*reverse) * parseInt(index) * (barWidth + barSpacing);

                // Draw description text (if not empty)
                let textHeight;
                if (text.length > 0) {
                    const label = utility.createSvgNode("text",
                        { x: startPosX + offset,
                          y: totalHeight - this.descMarginBottom,
                          "alignment-baseline": "baseline" });
                    label.classList.add("separator-label");
                    label.textContent = text;
                    this.diagram.appendChild(label);
                    textHeight = utility.measureSvgElementSize(label).height;
                }

                // Extend line as far as possible if there's nothing below
                let yExtension = 0;
                // No description below?
                if (descriptions === null ||
                        descriptions.length !== numValues + 1 ||
                        !descriptions[index]) {
                    // Separator is labelled?
                    if (text.length > 0) {
                        yExtension = this.margin.bottom - textHeight
                                     - this.descMarginBottom
                                     - this.sepDescMarginTop;
                    } else {
                        yExtension = this.margin.bottom - this.descMarginBottom;
                    }
                } else if (showSmallSeparators) {
                    yExtension = this.smallSepBottomHeight;
                }

                // Draw line
                const sepLine = utility.createSvgNode("line", 
                    { x1: startPosX + offset, x2: startPosX + offset,
                      y1: 0, y2: y + yExtension });
                sepLine.classList.add("large-separator");
                this.diagram.appendChild(sepLine);
            }
        }

        // =====================================================================
        //    Store some values in order to be able to redraw the last bar
        // =====================================================================

        this.maxBarHeight = height;
        this.lastValues = values[0];
        this.lastMaxValue = maxValues[0];
    }

    setValues(values, args) {
        this.values = values
        this.args = args
        this.lastValues = values[0]
        this.draw()
    }

    setLegend(labels, colors) {
        if (labels.length > colors.length) {
            throw new Error("There must be at least as many colors as labels.");
        }
        this.legend.empty();
        this.indices = []
        for (let i = 0; i < labels.length; ++i) {
            const container = document.createElement("div");
            const colorIndicator = document.createElement("div");
            colorIndicator.classList.add("color-indicator");
            colorIndicator.style.backgroundColor = colors[i];
            const label = document.createElement("div");
            label.classList.add("legend-label");
            label.textContent = labels[i];
            container.appendChild(colorIndicator);
            container.appendChild(label);
            this.legend.appendChild(container);
            this.indices.push(true)

            // Click to toggle visibility for corresponding data column
            container.addEventListener("click", (event) => {
                const indexValue = this.indices[i]
                // If ctrl key is pressed, only toggle the corresponding index
                if (event.ctrlKey) {
                    this.indices[i] = !this.indices[i]
                // If control key is not pressed, select the corresponding index.
                // If only this index is selected, select all others too,
                // otherwise deselect all others
                } else {
                    let numSelectedIndices = 0
                    for (let j = 0; j < this.indices.length; ++j) {
                        numSelectedIndices += this.indices[j]
                    }
                    for (let j = 0; j < this.indices.length; ++j) {
                        this.indices[j] = numSelectedIndices === 1 && indexValue
                    }
                    this.indices[i] = true
                }
                // Adjust appearance of labels accordingly
                for (let j = 0; j < labels.length; ++j) {
                    this.legend.children[j].classList.toggle(
                        "inactive", !this.indices[j])
                }
                this.draw()
            })
        }
    }
    
    hideLegend() {
        this.legend.hide();
    }

    showLegend() {
        this.legend.show("flex");
    }
    
    moveViewToRightEnd() {
        const { width: viewWidth, height: viewHeight } =
            this.diagram.getBoundingClientRect();
        this.viewOffsetX = this.totalWidth - viewWidth;
        this.diagram.setAttribute("viewBox",
            `${this.viewOffsetX} 0 ${this.totalWidth} ${viewHeight}`);
    }

    /**
     * Increment the value at the given index for the last bar.
     * @param {Integer} index
     */
    incrementLastValue(index) {
        if (index === undefined) {
            this.lastValues += 1;
            if (this.lastValues > this.lastMaxValue) ++this.lastMaxValue;
        } else {
            this.lastValues[index] += 1;
            if (this.lastValues.sum() > this.lastMaxValue) ++this.lastMaxValue;
        }
        this.adjustLastBars();
    }

    /**
     * Decrement the value at the given index for the last bar.
     * @param {Integer} index
     */
    decrementLastValue(index) {
        if (index === undefined) {
            this.lastValues -= 1;
            if (this.lastValues < 0) this.lastValues = 0;
        } else {
            this.lastValues[index] -= 1;
            if (this.lastValues[index] < 0) this.lastValues[index] = 0;
        }
        this.adjustLastBars();
    }

    /**
     * Update the last bar/bars and their labels according to the values stored
     * in this.lastValues and this.lastMaxValue.
     */
    adjustLastBars() {
        let yPos;
        if (this.lastMaxValue === 0) {
            yPos = this.margin.top + this.topLineWidth;
            this.lastBars.setAttribute("height", this.maxBarHeight);
            this.lastBars.setAttribute("y", yPos);
        } else if (typeof this.lastValues === "number") {
            const fraction = this.lastValues / this.lastMaxValue;
            yPos = this.margin.top + this.topLineWidth +
                   this.maxBarHeight * (1 - fraction);
            this.lastBars.setAttribute("height", this.maxBarHeight * fraction);
            this.lastBars.setAttribute("y", yPos);
        } else if (Array.isArray(this.lastValues)) {
            yPos = this.margin.top + this.topLineWidth + this.maxBarHeight;
            const numBars = this.lastValues.length;
            const spaceForBars = !this.args.stackBars ? this.maxBarHeight :
                this.maxBarHeight - (numBars - 1) *
                this.args.stackSpacing - numBars;
            const fractions = this.lastValues.map((v) => v / this.lastMaxValue);
            for (let i = 0; i < fractions.length; ++i) {
                if (this.lastBars[i] === undefined) continue
                const barHeight = Math.ceil(spaceForBars * fractions[i]);
                if (this.args.stackBars) yPos -= barHeight;
                else yPos = this.margin.top + this.topLineWidth
                            + this.maxBarHeight - barHeight;
                this.lastBars[i].setAttribute("height", barHeight);
                this.lastBars[i].setAttribute("y", yPos);
                if (this.args.stackBars && this.lastValues[i] > 0) {
                    yPos -= this.args.stackSpacing;
                }
            }
            if (!this.args.stackBars) {
                yPos = this.margin.top + this.topLineWidth +
                       this.maxBarHeight * (1 - Math.max(...fractions));
            }
        }

        // Update label
        if (this.lastValueLabel !== undefined) {
            if (this.args.stackBars || !this.args.splitValueLabels) {
                if (typeof this.lastValues === "number") {
                    this.lastValueLabel.textContent = this.lastValues;
                    this.lastValueLabel.toggleDisplay(this.lastValues > 0);
                } else if (Array.isArray(this.lastValues)) {
                    let sum = 0;
                    for (let i = 0; i < this.indices.length; ++i) {
                        if (this.indices[i]) {
                            sum += this.lastValues[i];
                        }
                    }
                    this.lastValueLabel.textContent = sum;
                    this.lastValueLabel.toggleDisplay(sum > 0)
                }
                yPos -= this.valueLabelMarginBottom;
                this.lastValueLabel.setAttribute("y", yPos);
            } else {
                for (let i = 0; i < this.lastValues.length; ++i) {
                    if (this.lastValueLabel[i] === undefined) continue
                    const fraction = this.lastValues[i] / this.lastMaxValue;
                    this.lastValueLabel[i].setAttribute("y", this.margin.top +
                        this.topLineWidth + this.maxBarHeight * (1 - fraction) -
                        this.valueLabelMarginBottom);
                    this.lastValueLabel[i].toggleDisplay(this.lastValues[i] > 0)
                }
            }
        }
    }
}

customElements.define("svg-bar-diagram", SvgBarDiagram);
module.exports = SvgBarDiagram;
