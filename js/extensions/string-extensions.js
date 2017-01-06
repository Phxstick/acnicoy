"use strict";

String.prototype.padStart = function (max, fillString) {
    const cur = this.length;
    if (max < cur) {
        return this;
    }
    const masked = max - cur;
    let filler = String(fillString) || " ";
    while (filler.length < masked) {
        filler += filler;
    }
    const fillerSlice = filler.slice(0, masked);
    return fillerSlice + this;
}
