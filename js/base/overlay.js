"use strict";

class Overlay extends Component {
    constructor(name, {
            mode = "slide-down",
            speed = 300,
            distance = 60 } = {}) {
        super(name + "-overlay", false, true);
        this.name = name;
        this.displayOptions = { mode, speed, distance };
        // Create a sentinel which is always the last child in the tree
        const sentinel = document.createElement("div");
        sentinel.tabIndex = "0";
        this.root.appendChild(sentinel);
        this.root.appendChild = (node) => {
            this.root.insertBefore(node, sentinel);
            return node;
        };
        this.elementFocussedByDefault = sentinel;
        this.lastFocussedElement = sentinel;
        // Keep focus within the element using the sentinel and delegatesFocus
        this.captureFocus = false;
        this.root.addEventListener("focusout", (event) => {
            if (!this.captureFocus) return;
            if (event.target === sentinel && (event.relatedTarget === null ||
                    !this.root.contains(event.relatedTarget))) { 
                this.focus();
            } else if (event.relatedTarget === sentinel) {
                this.focus();
            } else if (event.relatedTarget === null ||
                       !this.root.contains(event.relatedTarget)) {
                sentinel.focus();
            }
        });
    }

    /**
    **  Called before the overlay is being opened.
    **/
    open() {
    }

    /**
    **  Called before the overlay is being closed.
    **/
    close() {
    }
}

module.exports = Overlay;
