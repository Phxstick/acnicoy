"use strict";

/**
**  Returns the last element of an array.
**/
Array.prototype.last = function() {
    return this[this.length - 1];
};


/**
**  Sum up the integers in the array.
**/
Array.prototype.sum = function() {
    return this.reduce((total, value) => total + value, 0);
};


/**
**  Given one or more values, return true if this array contains only
**  elements equal to given values.
**/
Array.prototype.containsOnly = function(...values) {
    for (let element of this) {
        if (!values.includes(element)) return false;
    }
    return true;
};


/**
**  Remove first occurence of given element from the array.
**/
Array.prototype.remove = function(value) {
    const index = this.indexOf(value);
    if (index === -1) return false;
    this.splice(index, 1);
    return true;
}


/**
** Return a new array with all empty strings removed. Works best if most of
** the elements are empty strings.
**/
Array.prototype.withoutEmptyStrings = function() {
    const result = [];
    for (let i = 0; i < this.length; ++i) {
        if (this[i].length > 0) {
            result.push(this[i]);
        }
    }
    return result;
}
