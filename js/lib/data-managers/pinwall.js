"use strict";

module.exports = {

    _widgets: null,
    _path: null,
    _language: null,

    load: function(path, language) {
        this._widgets = require(path);
        this._path = path;
        this._language = language;
    },

    save: function() {
        fs.writeFileSync(this._path, JSON.stringify(this._widgets, null, 4));
    },

    clear: function() {
        this._widgets.length = 0;
    },

    addWidget: function(widget) {
        this._widgets.push(widget);
    },

    getWidgets: function() {
        return this._widgets;
    }
};
