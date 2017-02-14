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
 *  If the element already has a display value other than 'none', do nothing.
 */
HTMLElement.prototype.show = function(value) {
    if (getComputedStyle(this, null).getPropertyValue("display") !== "none" &&
            getComputedStyle(this, null).getPropertyValue("display") !== "")
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
 *  Show this element if given condition is true, otherwise hide it.
 *  @param {Boolean} condition - Indicates whether to show or hide this element.
 *  @param {String} [displayValue] - If this element will be shown, use
 *      this parameter as CSS value for the display property.
 */
HTMLElement.prototype.toggleDisplay =
        function(condition, displayValue) {
    if (condition) {
        this.show(displayValue);
    } else {
        this.hide();
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
 *  Insert given node as the first child of this node.
 */
HTMLElement.prototype.prependChild = function(node) {
    this.insertBefore(node, this.firstChild);
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
    this.scrollTop = this.scrollHeight;
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
        newNode.textContent = oldNode.textContent;
        newNode.style.cssText =
            document.defaultView.getComputedStyle(oldNode, "").cssText;
        // Map the old node to its copy
        nodeToCopyMap.set(oldNode, newNode);
        // Append new node to the copied tree
        if (oldNode !== this) {
            // console.log("Appending ", newNode, " to ",
            //         nodeToCopyMap[oldNode.parentNode]);
            nodeToCopyMap.get(oldNode.parentNode).appendChild(newNode);
        }
        // Append children of old node into array for traversing
        const oldSize = nodes.length;
        for (const child of oldNode.children) {
            nodes.push(child);
        }
    }
    return nodeToCopyMap.get(this);
}


/**
 *  Fade out this element while moving it given distance to the right,
 *  starting from the current position.
 */
HTMLElement.prototype.fadeOut = function(
        { distance=300, duration=500, easing="easeOutSine" }={}) {
    const fadeOutSpan = this.cloneNode(true); //this.safeDeepClone(); //this.cloneNode(true);
    fadeOutSpan.style.position = "fixed";
    fadeOutSpan.style.overflow = "hidden";
    this.style.visibility = "hidden";
    this.parentNode.appendChild(fadeOutSpan);
    const oldWidth = this.offsetWidth;
    const oldHeight = this.offsetHeight;
    const oldOffsetTop = this.offsetTop;
    const oldOffsetLeft = this.offsetLeft;
    fadeOutSpan.textContent = this.textContent;
    fadeOutSpan.style.width = `${oldWidth + 1}px`;
    fadeOutSpan.style.height = `${oldHeight}px`;
    fadeOutSpan.style.display = "block";
    fadeOutSpan.style.top = `${oldOffsetTop}px`;
    fadeOutSpan.style.left = `${oldOffsetLeft}px`;
    const options = { queue: false, duration, easing };
    Velocity(fadeOutSpan, { left: `+=${distance}` }, options);
    return Velocity(fadeOutSpan, "fadeOut", options).then(() => {
        // fadeOutSpan.remove();
    });
}


/**
 *  Fade in this element while moving it given distance to the right,
 *  arriving at the current position.
 */
HTMLElement.prototype.fadeIn = function(
        { distance=300, duration=500, easing="easeOutSine" }={}) {
    const fadeInSpan = this.safeDeepClone();//this.cloneNode(true);
    fadeInSpan.style.position = "fixed";
    fadeInSpan.style.overflow = "hidden";
    fadeInSpan.style.visibility = "visible";
    this.parentNode.appendChild(fadeInSpan);
    const newWidth = this.offsetWidth;
    const newOffsetTop = this.offsetTop;
    const newOffsetLeft = this.offsetLeft;
    fadeInSpan.style.top = `${newOffsetTop}px`;
    fadeInSpan.style.left = `${newOffsetLeft - distance}px`;
    fadeInSpan.style.display = "none";
    fadeInSpan.style.width = `${newWidth + 1}px`;
    const options = { queue: false, duration, easing };
    Velocity(fadeInSpan, { left: `+=${distance}` }, options);
    return Velocity(fadeInSpan, "fadeIn", options).then(() => {
        fadeInSpan.remove();
        this.style.visibility = "visible";
    });
}

/**
 *  When opening the context-menu for this element, display the given list
 *  of items.
 *  @param {Object} menuItems - Map item names to MenuItem-objects.
 *  @param {Array, function} itemNames - Either an array of item names or a
 *      function returning an array of item names (or promise of an array).
 *      For each of the given names, the menuItems-parameter must return
 *      a MenuItem-object which will be displayed.
 *  @param {Object} [data] - Optional data to pass to the menu items callback.
 */
HTMLElement.prototype.popupMenu = function (menuItems, itemNames, data) {
    if (data === undefined) {
        data = {};
    }
    if (this.popupMenuCallback !== undefined) {
        this.removeEventListener("contextmenu", this.popupMenuCallback);
    }
    // If itemNames is a function, evaluate items to be displayed right before
    // opening the popupWindow
    if (typeof itemNames === "function") {
        this.popupMenuCallback = (event) => {
            popupMenu.itemsLoaded = Promise.resolve(itemNames())
            .then((names) => {
                for (const name of names) {
                    const menuItem = menuItems[name];
                    menuItem.currentNode = this;
                    menuItem.data = data;
                    popupMenu.visibleItems.add(menuItem);
                }
            });
        };
    // If itemNames is an Array, directly read the names
    } else if (Array.isArray(itemNames)) {
        if (itemNames.length === 0) return;
        this.popupMenuCallback = (event) => {
            for (const name of itemNames) {
                const menuItem = menuItems[name];
                menuItem.currentNode = this;
                menuItem.data = data;
                popupMenu.visibleItems.add(menuItem);
            }
        };
    } else {
        throw new Error("Parameter 'itemNames' must be an array or function!");
    }
    this.addEventListener("contextmenu", () => this.popupMenuCallback());
}

/**
 *  Remove all children elements of this node.
 */
SVGElement.prototype.empty = function() {
    while (this.lastChild) this.removeChild(this.lastChild);
}

// Don't let buttons take focus when clicked (focus should only show when
// tabbing through widgets with the keyboard).
document.addEventListener("mousedown", (event) => {
    if (event.path[0].tagName === "BUTTON" ||
            event.path[1].tagName === "BUTTON" ||
            event.path[2].tagName === "BUTTON")
        event.preventDefault();
});
