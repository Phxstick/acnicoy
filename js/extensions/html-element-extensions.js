"use strict";

/**
 *  Return whether this element is hidden.
 */
HTMLElement.prototype.isHidden = function() {
    return this.offsetParent === null;
}

const previousDisplayValue = Symbol("previousDisplayValue");
/**
 *  Set this element's display value to 'none'. Remember old display value.
 *  If the element is already not displayed, do nothing.
 */
HTMLElement.prototype.hide = function() {
    const display = getComputedStyle(this, null).getPropertyValue("display");
    if (display === "none") return;
    this[previousDisplayValue] = display;
    this.style.display = "none";
}

/**
 *  Set this element's display value to given argument. If no argument is given,
 *  use the previous display value if available, or otherwise 'block'.
 *  If the element is already hidden, do nothing.
 */
HTMLElement.prototype.show = function(value) {
    const display = getComputedStyle(this, null).getPropertyValue("display");
    if (display !== "none" && display !== "")
        return;
    if (value !== undefined) {
        this.style.display = value;
    } else if (this[previousDisplayValue] !== undefined) {
        this.style.display = this[previousDisplayValue];
    } else {
        this.style.display = "block";
    }
}

/**
 * Show this element if given condition is true, otherwise hide it.
 * If condition is not given, just hide it if it's visible and show if hidden.
 * @param {Boolean} [condition] - Whether to show or hide this element.
 * @param {String} [displayValue] - If this element will be shown, use
 *     this parameter as CSS value for the display property.
 */
HTMLElement.prototype.toggleDisplay = function(condition, displayValue) {
    if (condition === undefined) {
        if (this.isHidden()) {
            this.show(displayValue);
        } else {
            this.hide();
        }
    } else {
        if (condition) {
            this.show(displayValue);
        } else {
            this.hide();
        }
    }
}

/**
 *  Remove all children elements of this node.
 */
HTMLElement.prototype.empty = function() {
    this.innerHTML = "";
}

/**
 *  Return the children of this element in an array.
 */
HTMLElement.prototype.childrenArray = function () {
    return Array.prototype.slice.call(this.children);
}


/**
 *  Insert given node as child at given index.
 */
HTMLElement.prototype.insertChildAt = function(node, index) {
    this.insertBefore(node, this.children[index]);
}


/**
 *  Remove child node of this node at given index.
 */
HTMLElement.prototype.removeChildAt = function(index) {
    this.removeChild(this.children[index]);
}


/**
 *  Scroll to the end of this element in a certain direction.
 */
HTMLElement.prototype.scrollToBottom = function() {
    this.scrollTop = this.scrollHeight - this.offsetHeight;
}
HTMLElement.prototype.scrollToRight = function() {
    this.scrollLeft = this.scrollWidth;
}
HTMLElement.prototype.scrollToTop = function() {
    this.scrollTop = 0;
}
HTMLElement.prototype.scrollToLeft = function() {
    this.scrollLeft = 0;
}


/**
 *  Upon scrolling further than given distance to the bottom of this element,
 *  execute given callback.
 */
HTMLElement.prototype.uponScrollingBelow = function (limit, callback) {
    this.addEventListener("scroll", (event) => {
        utility.finishEventQueue().then(() => {
            const maxScroll = this.scrollHeight - this.clientHeight;
            const distanceToEnd = maxScroll - this.scrollTop;
            if (distanceToEnd < limit) callback();
        });
    });
}


// TODO: Is this really needed? Better alternative?
HTMLElement.prototype.safeDeepClone = function() {
    const nodeToCopyMap = new Map();
    const nodes = [];
    nodes.push(this);
    while (nodes.length > 0) {
        const oldNode = nodes.pop();
        // "Copy" old note with correct tag, textContent and style
        const newNode = document.createElement(oldNode.tagName);
        newNode.style.cssText =
            document.defaultView.getComputedStyle(oldNode, "").cssText;
        // Map the old node to its copy
        nodeToCopyMap.set(oldNode, newNode);
        // Append new node to the copied tree
        if (oldNode !== this) {
            nodeToCopyMap.get(oldNode.parentNode).appendChild(newNode);
        }
        // Append children of old node into array for traversing
        const oldSize = nodes.length;
        for (const child of oldNode.childNodes) {
            if (child.nodeType === 3) {
                if (child.textContent.trim().length > 0) {
                    newNode.textContent = child.textContent;
                }
            } else {
                nodes.push(child);
            }
        }
    }
    return nodeToCopyMap.get(this);
}

/**
 * Return the root element of the subtree this element is part of.
 */
HTMLElement.prototype.getRoot = function() {
    let node = this;
    while (node.parentNode && !node.shadowRoot) {
        node = node.parentNode;
    }
    return node;
}

// Helper function for fadeIn/fadeOut/slideToCurrentPosition
function createFadeClone(node) {
    const clone = node.safeDeepClone();
    clone.style.position = "fixed";
    clone.style.overflow = "hidden";
    node.parentElement.appendChild(clone);

    // Copy classes and in-place styles
    clone.className = node.className;
    const styleKeys = Array.from(node.style);
    for (const styleKey of styleKeys) {
        clone.style[styleKey] = node.style[styleKey];
    }

    // Set width and height
    const oldWidth = node.offsetWidth;
    const oldHeight = node.offsetHeight;
    clone.style.width = `${oldWidth + 1}px`;
    clone.style.height = `${oldHeight}px`;

    return clone;
}

/**
 *  Fade out this element while moving it given distance into given direction,
 *  starting from the current position.
 */
HTMLElement.prototype.fadeOut = function(
        { distance=300, duration=500, easing="easeOutSine",
          direction="right", delay=0, zIndex="auto" }={}) {
    const fadeOutNode = createFadeClone(this);
    fadeOutNode.style.zIndex = zIndex;
    fadeOutNode.style.display = "block";
    fadeOutNode.style.visibility = "visible";
    this.style.visibility = "hidden";
    const root = this.getRoot();
    const nodeRect = this.getBoundingClientRect();
    const rootRect = root.host.getBoundingClientRect();
    const oldOffsets = {
        left: nodeRect.left - rootRect.left,
        top: nodeRect.top - rootRect.top,
        right: rootRect.width - nodeRect.right + rootRect.left,
        bottom: rootRect.height - nodeRect.bottom + rootRect.top
    };
    const directionToAttribute = {
        right: "left", down: "top", left: "right", up: "bottom"
    };
    const directionToSecondaryAttribute = {
        right: "top", down: "left", left: "top", up: "left"
    };
    fadeOutNode.style[directionToAttribute[direction]] =
        `${oldOffsets[directionToAttribute[direction]]}px`;
    fadeOutNode.style[directionToSecondaryAttribute[direction]] =
        `${oldOffsets[directionToSecondaryAttribute[direction]]}px`;
    const options = { queue: false, duration, easing, delay };
    Velocity(fadeOutNode, {
        [directionToAttribute[direction]]: `+=${distance}` }, options);
    return Velocity(fadeOutNode, "fadeOut", options).then(() => {
        fadeOutNode.remove();
    });
}


/**
 *  Fade in this element while moving it given distance to the right,
 *  arriving at the current position.
 */
HTMLElement.prototype.fadeIn = function(
        { distance=300, duration=500, easing="easeOutSine",
          direction="right", delay=0, zIndex="auto", onCompletion }={}) {
    const fadeInNode = createFadeClone(this);
    fadeInNode.style.zIndex = zIndex;
    fadeInNode.style.visibility = "visible";
    fadeInNode.style.display = "none";
    const root = this.getRoot();
    const nodeRect = this.getBoundingClientRect();
    const rootRect = root.host.getBoundingClientRect();
    const newOffsets = {
        left: nodeRect.left - rootRect.left,
        top: nodeRect.top - rootRect.top,
        right: rootRect.width - nodeRect.right + rootRect.left,
        bottom: rootRect.height - nodeRect.bottom + rootRect.top
    };
    const directionToAttribute = {
        right: "left", down: "top", left: "right", up: "bottom"
    };
    const directionToSecondaryAttribute = {
        right: "top", down: "left", left: "top", up: "left"
    };
    fadeInNode.style[directionToAttribute[direction]] =
        `${newOffsets[directionToAttribute[direction]] - distance}px`;
    fadeInNode.style[directionToSecondaryAttribute[direction]] =
        `${newOffsets[directionToSecondaryAttribute[direction]]}px`;
    const options = { queue: false, duration, easing, delay };
    Velocity(fadeInNode, {
        [directionToAttribute[direction]]: `+=${distance}` }, options);
    let finished = false;
    const onFinish = () => {
        finished = true;
        fadeInNode.remove();
        this.style.visibility = "visible";
        this.style.opacity = "1";
        if (onCompletion !== undefined) onCompletion();
    };
    Velocity(fadeInNode, "fadeIn", { ...options, complete: onFinish });

    // Return a function that can be used to stop this animation in advance
    return () => {
        if (finished) return;
        Velocity(fadeInNode, "stop");
        onFinish();
    };
}

/**
 *  Slide this item to the position it's currently at.
 */
HTMLElement.prototype.slideToCurrentPosition = function(
        { distance=300, duration=500, easing="easeOutSine",
          direction="right", delay=0, zIndex="auto" }={}) {
    const fadeInNode = createFadeClone(this)
    fadeInNode.style.zIndex = zIndex;
    fadeInNode.style.margin = "0";
    fadeInNode.style.visibility = "visible";
    const root = this.getRoot();
    const nodeRect = this.getBoundingClientRect();
    const rootRect = root.host.getBoundingClientRect();
    const offsets = {
        left: nodeRect.left - rootRect.left,
        top: nodeRect.top - rootRect.top,
        right: rootRect.width - nodeRect.right + rootRect.left,
        bottom: rootRect.height - nodeRect.bottom + rootRect.top
    };
    const directionToAttribute = {
        right: "left", down: "top", left: "right", up: "bottom"
    };
    const directionToSecondaryAttribute = {
        right: "top", down: "left", left: "top", up: "left"
    };
    fadeInNode.style[directionToAttribute[direction]] =
        `${offsets[directionToAttribute[direction]] - distance}px`;
    fadeInNode.style[directionToSecondaryAttribute[direction]] =
        `${offsets[directionToSecondaryAttribute[direction]]}px`;

    let finished = false;
    const onFinish = () => {
        finished = true;
        fadeInNode.remove();
        this.style.visibility = "visible";
    };
    const options = { queue: false, duration, easing, delay, complete:onFinish }
    this.style.visibility = "hidden";
    Velocity(fadeInNode, {
        [directionToAttribute[direction]]: `+=${distance}` }, options);

    // Return a function that can be used to stop this animation in advance
    return () => {
        if (finished) return;
        Velocity(fadeInNode, "stop");
        onFinish();
    };
}

/**
 *  When opening the context menu for this element, display the given list
 *  of items.
 *  @param {Object} menuItems - Map item names to MenuItem-objects.
 *  @param {Array, function} itemNames - Either an array of item names or a
 *      function returning an array of item names (or promise of an array).
 *      For each of the given names, the menuItems-parameter must return
 *      a MenuItem-object which will be displayed.
 *  @param {Object} [data] - Optional data to pass to the menu items callback.
 */
HTMLElement.prototype.contextMenu = function (menuItems, itemNames, data) {
    if (data === undefined) {
        data = {};
    }
    if (this.contextMenuCallback !== undefined) {
        this.removeEventListener("contextmenu", this.contextMenuCallback);
    }
    // If itemNames is a function, evaluate items to be displayed right before
    // opening the context menu
    if (typeof itemNames === "function") {
        this.contextMenuCallback = (event) => {
            contextMenu.displayItems(Promise.resolve(itemNames(event))
            .then((names) => {
                const items = [];
                for (const name of names) {
                    const menuItem = menuItems[name];
                    menuItem.currentNode = this;
                    menuItem.data = { ...data, event };
                    items.push(menuItem);
                }
                return items;
            }));
        };
    // If itemNames is an Array, directly display the given items
    } else if (Array.isArray(itemNames)) {
        if (itemNames.length === 0) return;
        this.contextMenuCallback = (event) => {
            const items = [];
            for (const name of itemNames) {
                const menuItem = menuItems[name];
                menuItem.currentNode = this;
                menuItem.data = { ...data, event };
                items.push(menuItem);
            }
            contextMenu.displayItems(items);
        };
    } else {
        throw new Error("Parameter 'itemNames' must be an array or function!");
    }
    this.addEventListener("contextmenu",
            (event) => this.contextMenuCallback(event));
}

/**
 * Display tooltip with given content when hovering over this element.
 * @param {String|function[String]} content - HTML to display in the tooltip.
 *     Can also be an asynchronous function returning the content.
 * @param {Integer} [delay=500] - Delay before tooltip appears (in milliseconds)
 * @param {Integer} [width] - Width of the tooltip in pixels. By default it is
 *     as wide as its content.
 */
HTMLElement.prototype.tooltip = function (content, delay=300, width) {
    this.removeTooltip();
    const tooltip = document.getElementById("tooltip");
    const positionTooltip = (event) => {
        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;
        if (tooltipWidth === null) return;
        // Make sure tooltip doesn't leave the window on the right side
        if (event.pageX + tooltipWidth > window.innerWidth) {
            tooltip.style.left = `${window.innerWidth - tooltipWidth}px`;
        } else {
            tooltip.style.left = `${event.pageX}px`;
        }
        // Make sure tooltip doesn't leave the window on the left side
        if (event.pageY - tooltipHeight < 0) {
            tooltip.style.bottom = `${window.innerHeight - tooltipHeight}px`;
        } else {
            tooltip.style.bottom = `${window.innerHeight - event.pageY}px`;
        }
    };
    let lastMouseEvent;
    this.addEventListener("mouseenter", (event) => {
        if (window.currentTooltipTimeoutId !== null) {
            window.clearTimeout(window.currentTooltipTimeoutId);
        }
        lastMouseEvent = event;
        positionTooltip(event);
        // Wait specified delay before displaying the tooltip
        window.currentTooltipTimeoutId = window.setTimeout(async () => {
            // Make tooltip as wide as the content by default
            if (width === undefined) {
                tooltip.style.whiteSpace = "nowrap";
                tooltip.style.width = "auto";
            // If width is specified, resize tooltip
            } else {
                tooltip.style.whiteSpace = "normal";
                tooltip.style.width = `${width}px`;
            }
            // Set content to display
            let finalContent = content;
            if (typeof content === "function") {
                finalContent = await content();
            }
            tooltip.innerHTML = finalContent;
            // Position and display tooltip
            await utility.finishEventQueue();
            positionTooltip(lastMouseEvent);
            tooltip.style.visibility = "visible";
            window.currentTooltipTimeoutId = null;
        }, delay);
    });
    this.addEventListener("mouseleave", (event) => {
        if (window.currentTooltipTimeoutId !== null) {
            window.clearTimeout(window.currentTooltipTimeoutId);
            window.currentTooltipTimeoutId = null;
        }
        tooltip.style.visibility = "hidden";
    });
    this.addEventListener("mousemove", (event) => {
        lastMouseEvent = event;
        positionTooltip(event);
    });
}

/**
 * Remove any callbacks related to displaying a tooltip from this element.
 * @returns {Boolean} - Whether the element had tooltip callbacks attached.
 */
HTMLElement.prototype.removeTooltip = function () {
    let removed = false;
    if (this.tooltipEnterCallback !== undefined) {
        this.removeEventListener("mouseenter", this.tooltipEnterCallback);
        removed = true;
    }
    if (this.tooltipLeaveCallback !== undefined) {
        this.removeEventListener("mouseleave", this.tooltipLeaveCallback);
        removed = true;
    }
    if (this.tooltipMoveCallback !== undefined) {
        this.removeEventListener("mousemove", this.tooltipMoveCallback);
        removed = true;
    }
    if (window.currentTooltipTimeoutId !== null) {
        window.clearTimeout(window.currentTooltipTimeoutId);
        window.currentTooltipTimeoutId = null;
    }
    this.tooltipEnterCallback = undefined;
    this.tooltipLeaveCallback = undefined;
    this.tooltipMoveCallback = undefined;
    return removed;
}

/**
 * When the top/bottom of the scrollable content in this element is not reached,
 * fade out borders at the top/bottom of the scrollable content.
 * This function only sets two CSS variables --top-shadow-height and 
 * --bottom-shadow-height in the element, actual CSS must be applied separately.
 * The parent should not have the `overflow` property set and should contain the
 * gradients as pseudo-elements (and non-static `position` to be their anchor).
 * @param {Integer} [maxFadeDistance=15]
 */
HTMLElement.prototype.fadeContentAtBorders = function (maxFadeDistance=15) {
    if (this.scrollHeight <= this.clientHeight) {
        this.parentNode.style.setProperty("--top-shadow-height", `0px`);
        this.parentNode.style.setProperty("--bottom-shadow-height", `0px`);
        return;
    }
    const distanceFromTop = this.scrollTop;
    const distanceFromBottom =
        this.scrollHeight - this.scrollTop - this.clientHeight;
    const topShadowHeight = Math.min(maxFadeDistance, distanceFromTop);
    const bottomShadowHeight = Math.min(maxFadeDistance, distanceFromBottom);
    this.parentNode.style.setProperty(
        "--top-shadow-height", `${topShadowHeight}px`);
    this.parentNode.style.setProperty(
        "--bottom-shadow-height", `${bottomShadowHeight}px`);
}

/**
 *  Remove all children elements of this node.
 */
SVGElement.prototype.empty = function() {
    while (this.lastChild) this.removeChild(this.lastChild);
}

/**
 *  Hide/display this element.
 */
SVGElement.prototype.hide = function() {
    this.style.display = "none";
}

SVGElement.prototype.show = function() {
    this.style.display = "block";
}

SVGElement.prototype.toggleDisplay = function(condition) {
    if (condition) this.show();
    else this.hide();
}

// Don't let buttons take focus when clicked (focus should only show when
// tabbing through widgets with the keyboard).
document.addEventListener("mousedown", (event) => {
    if (event.path[0].tagName === "BUTTON" ||
            event.path[1].tagName === "BUTTON" ||
            event.path[2].tagName === "BUTTON")
        event.preventDefault();
});

// To prevent pasting whole HTML into elements with contenteditable enabled
HTMLElement.prototype.onlyAllowPastingRawText = function(root) {
    this.addEventListener("paste", (event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
    });
}

// When this element gets focussed, put the cursor at the end of first text node
HTMLElement.prototype.putCursorAtEndOnFocus = function(root) {
    this.addEventListener("focusin", () => {
        if (this.firstChild === null) return;
        if (this.firstChild.nodeType !== Node.TEXT_NODE) return;
        const range = document.createRange();
        range.setStart(this.firstChild, this.textContent.length);
        range.setEnd(this.firstChild, this.textContent.length);
        const selection = root.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    });
}
