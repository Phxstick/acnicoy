"use strict";

class OverlayWindow extends Widget {
    constructor() {
        super("overlay-window", true);
        this.wrapper = this.$("wrapper");
    }

    open(overlay, args) {
        if (this.wrapper.children.length === 0)
            this.show();
        // Create a filter to dim the overlay below
        const filter = document.createElement("div");
        filter.classList.add("filter");
        const background = this.wrapper.children.length === 0 ?
            this.wrapper : this.wrapper.lastChild;
        filter.style.width = `${background.offsetWidth}px`;
        filter.style.height = `${background.offsetHeight}px`;
        filter.hide();
        this.wrapper.appendChild(filter);
        this.wrapper.appendChild(overlay);
        const promise = new Promise((resolve) => {
            overlay.resolve = resolve;
            return overlay.open(...args);
        });
        // Display the new overlay according to its display options
        const { mode, speed, distance } = overlay.displayOptions;
        switch (mode) {
            case "slide-down":
                Velocity.mock = true;
                Velocity(overlay, { translateY: `-=${distance}px` });
                Velocity.mock = false;
                Velocity(filter, "fadeIn", { duration: speed });
                Velocity(overlay, "fadeIn", { duration: speed });
                Velocity(overlay, { translateY: `+=${distance}px` },
                                  { duration: speed,
                                    queue: false });
                break;
            case "fade":
                Velocity(filter, "fadeIn", { duration: speed });
                Velocity(overlay, "fadeIn", { duration: speed });
                break;
            case "instant":
                filter.show();
                overlay.show();
                break;
        }
        promise.then(() => this.close());
        return promise;
    }
    
    close() {
        if (this.wrapper.children.length === 0) return;
        const length = this.wrapper.children.length;
        const overlay = this.wrapper.children[length - 1];
        const filter = this.wrapper.children[length - 2];
        Promise.resolve().then(() => {
            // Undisplay the filter and overlay according to its display mode
            const { mode, speed, distance } = overlay.displayOptions;
            switch (mode) {
                case "slide-down":
                    Velocity(filter, "fadeOut", { duration: speed });
                    Velocity(overlay, "fadeOut", { duration: speed });
                    return Velocity(
                            overlay, { translateY: `-=${distance}px` },
                                     { duration: speed,
                                       queue: false })
                    .then(() => {
                        Velocity.mock = true;
                        Velocity(overlay, { translateY: `+=${distance}px` });
                        Velocity.mock = false;
                    });
                case "fade":
                    Velocity(filter, "fadeOut", { duration: speed });
                    return Velocity(overlay, "fadeOut", { duration: speed });
                case "instant":
                    filter.hide();
                    overlay.hide();
                    break;
            }
        }).then(() => {
            overlay.close();
            this.wrapper.removeChild(overlay);
            this.wrapper.removeChild(filter);
            if (this.wrapper.children.length === 0)
                this.hide();
        });
    }
}

customElements.define("overlay-window", OverlayWindow);
module.exports = OverlayWindow;
