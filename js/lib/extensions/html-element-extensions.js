"use strict";

/**
**  Remove all children elements of this node.
**/
HTMLElement.prototype.empty = function() {
    while (this.lastChild !== null)
        this.removeChild(this.lastChild);
}


/**
**  Insert given node as the first child of this node.
**/
HTMLElement.prototype.prependChild = function(node) {
    this.insertBefore(node, this.firstChild);
}


/**
**  Insert given node as child at given index.
**/
HTMLElement.prototype.insertChildAt = function(node, index) {
    this.insertBefore(node, this.children[index]);
}


/**
**  Remove child node of this node at given index.
**/
HTMLElement.prototype.removeChildAt = function(index) {
    this.removeChild(this.children[index]);
}


/**
**  Scroll to the end of this element in a certain direction.
**/
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
**  Upon scrolling further than given distance to the bottom of this element,
**  execute given callback.
**/
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
    const nodeToCopyMap = {};
    const nodes = [];
    nodes.push(this);
    while (nodes.length > 0) {
        const oldNode = nodes.pop();
        // "Copy" old note with correct tag, textContent and style
        const newNode = document.createElement(oldNode.tagName);
        newNode.textContent = oldNode.textContent;
        newNode.style.cssText =
            document.defaultView.getComputedStyle(oldNode, "").cssText;
        // for (let attribute in oldNode.style) {
        //     newNode.style.setProperty(attribute,
        //         oldNode.style.getPropertyValue(attribute));
        //     // newNode.style[attribute] = oldNode.style[attribute];
        // }
        // Map the old node to its copy
        nodeToCopyMap[oldNode] = newNode;
        // Append new node to the copied tree
        if (oldNode !== this) {
            console.log("Appending ", newNode, " to ",
                    nodeToCopyMap[oldNode.parentNode]);
            nodeToCopyMap[oldNode.parentNode].appendChild(newNode);
        }
        // Append children of old node into array for traversing
        for (let i = 0; i < oldNode.children.length; ++i) {
            nodes.push(oldNode.children[i]);
        }
    }
    return nodeToCopyMap[this];
}


/**
**  Fade out this element while moving it given distance to the right,
**  starting from the current position.
**/
HTMLElement.prototype.fadeOut = function(distance) {
    const fadeOutSpan = this.safeDeepClone(); //this.cloneNode(true);
    fadeOutSpan.style.position = "fixed";
    fadeOutSpan.style.overflow = "hidden";
    this.style.visibility = "hidden";
    this.parentNode.appendChild(fadeOutSpan);
    const oldWidth = this.offsetWidth;
    const oldOffsetTop = this.offsetTop;
    const oldOffsetLeft = this.offsetLeft;
    fadeOutSpan.textContent = this.textContent;
    fadeOutSpan.style.width = `${oldWidth}px`;
    fadeOutSpan.style.display = "inline-block";
    fadeOutSpan.style.top = `${oldOffsetTop}px`;
    fadeOutSpan.style.left = `${oldOffsetLeft}px`;
    Velocity(fadeOutSpan, { left: `+=${distance}` });
    return Velocity(fadeOutSpan, "fadeOut", { queue: false }).then(() => {
        fadeOutSpan.remove();
    });
}


/**
**  Fade in this element while moving it given distance to the right,
**  arriving at the current position.
**/
HTMLElement.prototype.fadeIn = function(distance) {
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
    fadeInSpan.style.width = `${newWidth}px`;
    Velocity(fadeInSpan, { left: `+=${distance}` });
    return Velocity(fadeInSpan, "fadeIn", { queue: false }).then(() => {
        fadeInSpan.remove();
        this.style.visibility = "visible";
    });
}
