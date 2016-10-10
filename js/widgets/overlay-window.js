"use strict";

class OverlayWindow extends Widget {
    constructor() {
        super("overlay-window");
        this.speed = 400;
        this.filter = document.createElement("div");
        this.filter.id = "filter";
        this.frame = document.createElement("div");
        this.frame.id = "frame";
        this.wrapper = document.createElement("div");
        this.wrapper.id = "wrapper";
        this.root.appendChild(this.filter);
        this.filter.appendChild(this.wrapper);
        this.wrapper.appendChild(this.frame);
        Velocity(this.frame, { translateY: "-=200px", duration: 0 });
    }

    open() {
        Velocity(this.filter, "fadeIn", { duration: this.speed });
        Velocity(this.frame, { translateY: "+=200px" },
                             { duration: this.speed,
                               queue: false });
    }
    
    close() {
        Velocity(this.filter, "fadeOut", { duration: this.speed });
        Velocity(this.frame, { translateY: "-=200px" },
                             { duration: this.speed,
                               queue: false });
    }

    assignContent(content) {
        if (this.frame.children.length > 0) {
            if (this.frame.firstChild === content) {
                content.open();
                return;
            }
            this.frame.removeChild(this.frame.firstChild);
        }
        content.open();
        this.frame.appendChild(content);
    }
}

customElements.define("overlay-window", OverlayWindow);
module.exports = OverlayWindow;
