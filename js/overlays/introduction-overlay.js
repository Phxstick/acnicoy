"use strict";

class IntroductionOverlay extends Overlay {
    constructor() {
        super("introduction", { mode: "instant" });
        // this.$("close-button").addEventListener("click", () => {
        //     this.resolve(null);
        // });
        this.$("skip-tour-button").addEventListener("click", () => {
            storage.set("show-introduction-overlay", false);
            this.resolve(null);
        });
        this.$("take-tour-button").addEventListener("click", () => {
            storage.set("show-introduction-overlay", false);
            main.startIntroTour("main-window");
            this.resolve(null);
        });
    }
}

customElements.define("introduction-overlay", IntroductionOverlay);
module.exports = IntroductionOverlay;
