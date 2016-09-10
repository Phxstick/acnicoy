"use strict";

class SwitchBar extends HTMLSpanElement {
    createdCallback () {
        // this.bar = document.createElement("div");
        // while (this.childNodes.length > 0) {
        //     this.bar.appendChild(this.childNodes[0]);
        // }
        // this.appendChild(this.bar);
        // this.root = this.createShadowRoot();
        const style = document.createElement("style");
        style.textContent = `@import url(${getStylePath("switch-bar")})`;
        this.styleNode = style;
        // this.appendChild(style);
        // this.bar.classList.add("switch-bar");
    }
    attachedCallback() {
        this.parentNode.prependChild(this.styleNode);
    }
}
module.exports = document.registerElement(
        "switch-bar", { prototype: SwitchBar.prototype });