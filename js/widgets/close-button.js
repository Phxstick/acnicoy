"use strict";

const path = require("path");

class CloseButton extends HTMLElement {
    createdCallback () {
        // Build structure
        this.root = this.createShadowRoot();
        this.$padding = $("<div id='padding'></div>");
        this.$stroke1 = $("<div class='stroke' id='stroke1'></div>");
        this.$stroke2 = $("<div class='stroke' id='stroke2'></div>");
        this.$container = $("<div id='container'></div>");
        this.$container.appendTo(this.root);
        this.$container.append(this.$stroke1, this.$padding, this.$stroke2);
        // Add callback
        $(this).on("click", () => { });
        // Do some styling
        const style = document.createElement("style");
        style.textContent = `@import url(${getStylePath("close-button")})`;
        this.root.appendChild(style);
        // const color = "#f3c6c6"; // "lightcoral"; // TODO: $(this).css("color");
        // this.$stroke1.css("background-color", color);
        // this.$stroke2.css("background-color", color);
        // this.$stroke1.css("box-shadow", `0 0 1px ${color}`);
        // this.$stroke2.css("box-shadow", `0 0 1px ${color}`);
        // Add fading
        this.$container.mouseenter(() => {
            this.$stroke1[0].classList.add("hovering");
            // this.$stroke1.css("background-color", "lightcoral");
            // this.$stroke2.css("background-color", "lightcoral");
            // this.$stroke1.css("opacity", "1");
            // this.$stroke2.css("opacity", "1");
        });
        this.$container.mouseleave(() => {
            this.$stroke1[0].classList.remove("hovering");
            // this.$stroke1.css("background-color", color);
            // this.$stroke2.css("background-color", color);
            // this.$stroke1.css("opacity", "0.4");
            // this.$stroke2.css("opacity", "0.4");
        });
    }
    set callback(value) {
        $(this).on("click", value);
    }
}

module.exports = document.registerElement(
        "close-button", { prototype: CloseButton.prototype });
