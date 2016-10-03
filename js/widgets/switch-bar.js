"use strict";

class SwitchBar extends Widget {
    constructor () {
        super("switch-bar");
        const slot = document.createElement("slot");
        this.root.appendChild(slot);
    }
}

customElements.define("switch-bar", SwitchBar);
module.exports = SwitchBar;
