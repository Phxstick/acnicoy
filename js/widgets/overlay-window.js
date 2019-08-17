"use strict";

class OverlayWindow extends Widget {
    constructor() {
        super("overlay-window", true);
        this.wrapper = this.$("wrapper");
        this.resolveFunctions = new WeakMap();
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

    async open(overlay, args) {
        if (this.overlays.length === 0)
            this.show();
        // Prevent previously opened overlay from capturing focus
        if (this.overlays.length > 0) {
            this.overlays.last().lastFocussedElement =
                this.overlays.last().root.activeElement;
            this.overlays.last().captureFocus = false;
        }
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
            this.resolveFunctions.set(overlay, resolve);
            // Overlay can call this function internally to return some value
            overlay.resolve = (returnValue) => this.closeTopmost(returnValue);
        });
        overlay.open(...args);
        overlay.captureFocus = true;
        // Display the new overlay according to its display options
        const { mode, speed, distance } = overlay.displayOptions;
        overlay.style.opacity = "0";
        // Workaround for bug where confirm-dialog is translated down by ~170px
        overlay.style.transform = "";
        overlay.show();
        if (overlay.elementFocussedByDefault === null)
            overlay.elementFocussedByDefault = overlay.sentinel;
        overlay.elementFocussedByDefault.focus();
        await utility.finishEventQueue();
        if (dataManager.settings.design.enableAnimations) {
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
                overlay.style.opacity = "1";
                break;
            }
        } else {
            filter.show();
            overlay.show();
            overlay.style.opacity = "1";
        }
        return promise;
    }
    
    closeTopmost(returnValue) {
        if (this.overlays.length === 0) return;
        const overlay = this.overlays.pop();
        const filter = this.filters.pop();
        overlay.style.pointerEvents = "none";
        overlay.captureFocus = false;
        // Move focus back to previous overlay
        if (this.overlays.length > 0) {
            this.overlays.last().captureFocus = true;
            this.overlays.last().lastFocussedElement.focus();
        }
        Promise.resolve().then(() => {
            // Undisplay the filter and overlay according to its display mode
            const { mode, speed, distance } = overlay.displayOptions;
            if (dataManager.settings.design.enableAnimations) {
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
            } else {
                filter.hide();
                overlay.hide();
            }
        }).then(() => {
            overlay.close();
            overlay.style.pointerEvents = "auto";
            this.wrapper.removeChild(overlay);
            this.wrapper.removeChild(filter);
            if (this.overlays.length === 0) {
                this.hide();
            }
        });
        const resolveFunction = this.resolveFunctions.get(overlay);
        this.resolveFunctions.delete(overlay);
        resolveFunction(returnValue);
    }
}

customElements.define("overlay-window", OverlayWindow);
module.exports = OverlayWindow;
