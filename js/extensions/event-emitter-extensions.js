"use strict";

const EventEmitter = require("events");

EventEmitter.prototype.onAll = function(events, listener) {
    for (const event of events) {
        this.on(event, listener);
    }
}
