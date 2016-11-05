"use strict";

class OverlayWindow extends Widget {
    constructor() {
        super("overlay-window", true);
        this.wrapper = this.$("wrapper");
        this.overlays = [];
        this.filters = [];
        // Change bottommost filter size when window size changes
        window.onresize = () => {
            if (this.overlays.length > 0) {
                this.filters[0].style.width = `${this.wrapper.offsetWidth}px`;
                this.filters[0].style.height = `${this.wrapper.offsetHeight}px`;
            }
        }
    }

    open(overlay, args) {
        if (this.overlays.length === 0)
            this.show();
        // Create a filter to dim the overlay below
        const filter = document.createElement("div");
        filter.classList.add("filter");
        const background = this.overlays.length === 0 ?
            this.wrapper : this.overlays.last();
        filter.style.width = `${background.offsetWidth}px`;
        filter.style.height = `${background.offsetHeight}px`;
        filter.hide();
        this.wrapper.appendChild(filter);
        this.wrapper.appendChild(overlay);
        this.overlays.push(overlay);
        this.filters.push(filter);
        // Create a promise which the opened overlay can resolve at any time
        const promise = new Promise((resolve) => {
            overlay.resolve = (args) => {
                this.close();
                resolve(args);
            };
        });
        overlay.open(...args);
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
        return promise;
    }
    
    close() {
        if (this.overlays.length === 0) return;
        const overlay = this.overlays.pop();
        const filter = this.filters.pop();
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
            if (this.overlays.length === 0)
                this.hide();
        });
    }
}

customElements.define("overlay-window", OverlayWindow);
module.exports = OverlayWindow;
