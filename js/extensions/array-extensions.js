"use strict";

/**
 *  Returns the last element of this array.
 */
Array.prototype.last = function () {
    return this[this.length - 1];
};


/**
 *  Sum up the integers in this array.
 */
Array.prototype.sum = function () {
    return this.reduce((total, value) => total + value, 0);
};


/**
 *  Remove first occurence of given element from this array.
 */
Array.prototype.remove = function (value) {
    const index = this.indexOf(value);
    if (index === -1) return false;
    this.splice(index, 1);
    return true;
}

/**
 *  Remove all elements from this array.
 */
Array.prototype.clear = function () {
    this.length = 0;
}

/**
 * Return a new array with all empty strings removed. Works best if most of
 * the elements are empty strings.
 */
Array.prototype.withoutEmptyStrings = function () {
    const result = [];
    for (let i = 0; i < this.length; ++i) {
        if (this[i].length > 0) {
            result.push(this[i]);
        }
    }
    return result;
}

/**
 * Remove item at given index in O(1) without leaving a gap. Order of this
 * array is not preserved.
 * @param {Integer} index
 */
Array.prototype.quickRemoveAt = function (index) {
    if (this.length > 1 && index !== this.length - 1) {
        this[index] = this.last();
    }
    this.length--;
}

/**
 * Check whether this array is equal to given array.
 * @param {Array} array
 * @returns {Boolean}
 */
Array.prototype.equals = function (array) {
    if (this.length !== array.length) return false;
    for (let i = 0; i < this.length; ++i) {
        if (this[i] !== array[i]) return false;
    }
    return true;
}
