"use strict";

class SwitchBar extends HTMLSpanElement {
    createdCallback () {
        this.root = this.attachShadow({mode: "open"});
        const style = document.createElement("style");
        style.textContent = `@import url(${paths.css("switch-bar")})`;
        this.root.appendChild(style);
        const slot = document.createElement("slot");
        this.root.appendChild(slot);
    }
}

document.registerElement(
    "switch-bar", { prototype: SwitchBar.prototype });
module.exports = SwitchBar;
