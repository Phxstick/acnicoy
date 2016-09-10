"use strict";

// const css_normal = {
//     background: "lightgrey",
//     color: "grey",
//     "box-shadow": "none",
//     border: "1px solid grey"
// };
// const css_pushed = {
//     background: "greenyellow",
//     color: "black",
//     "box-shadow": "0px 0px 10px greenyellow",
//     border: "1px solid lime"
// };

class SwitchButton extends HTMLElement {
    createdCallback () {
        const init = this.getAttribute("init");
        this.state = (init === null) ? true : (init === "true");
        this.root = this.createShadowRoot();
        this.span = document.createElement("span");
        this.root.appendChild(this.span);
        this.span.textContent = this.textContent;
        const style = document.createElement("style");
        style.textContent = `@import url(${getStylePath("switch-button")})`;
        this.root.appendChild(style);
        this.callback = () => {};
        if (this.state) this.span.classList.add("pushed");
        this.span.addEventListener("click", () => this.invoke());
    }
    invoke () {
        this.state = !this.state;
        if (this.state)
            this.span.classList.add("pushed");
        else
            this.span.classList.remove("pushed");
        this.callback(this.state);
    }
}

module.exports = document.registerElement(
        "switch-button", { prototype: SwitchButton.prototype });
