"use strict";

const fs = require("fs");
const path = require("path");
const { desktopCapturer, remote } = require("electron");

/**
 * Return the current time in SECONDS since 1970/01/01.
 * @returns {Integer}
 */
function getTime() {
    const date = new Date();
    return parseInt(date.getTime() / 1000);
}

/**
 * Given a date object, return date as string of form "yyyy/mm/dd".
 * @param {Date} date
 * @returns {String}
 */
function getShortDateString(date) {
    return date.getUTCFullYear() + "/" +
           ("0" + (date.getUTCMonth() + 1)).slice(-2) + "/" +
           ("0" + (date.getUTCDate() + 1)).slice(-2);
}

/**
 * Return the number of days in the given month for given year.
 * @param {Integer} month
 * @param {Integer} year
 * @returns {Integer}
 */
function daysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Return a promise which is fulfilled when the current event queue is empty.
 * @returns {Promise}
 */
function finishEventQueue() {
    return new Promise((resolve) => window.setTimeout(resolve, 0));
}

/**
 * Return a promise which resolves after the given duration.
 * @param {Integer} [duration=500]
 * @returns {Promise}
 */
function wait(duration=500) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, duration);
    });
}

/**
 * Resolve the given promise after the given minimum delay.
 * @param {Promise}
 * @param {Integer} [minDelay=1200]
 * @returns {Promise}
 */
function addMinDelay(promise, minDelay=1200) {
    return Promise.all([wait(minDelay), promise]).then(([_, result]) => result);
}

/**
 * Execute given callback when 'offset' time has passed after the last time it
 * was called. If 'lastTime' is undefined, execute the callback immediately.
 * @param {Function} callback
 * @param {Integer} offset - Time to call callback after (in seconds).
 * @param {Integer} [lastTime] - Last time the callback was called (in seconds).
 * @returns {Integer|null} - Timer ID if a timer has been set, otherwise null.
 */
function setTimer(callback, offset, lastTime) {
    if (lastTime === undefined) {
        callback();
        return null;
    } else {
        const currentTime = utility.getTime();
        const newOffset = Math.max(0, lastTime + offset - currentTime);
        return window.setTimeout(callback, 1000 * newOffset);
    }
}

/**
 * Parse text of given css file and return object with css rules.
 * Returned object maps each css selector to an object mapping css properties
 * to their values.
 * @param {String} filepath
 * @returns {Object}
 */
function parseCssFile(filepath) {
    const text = fs.readFileSync(filepath, "utf-8");
    let blockOpen = false;
    let valOpen = false;
    let buff = "";
    let selBuff = "";
    let keyBuff = "";

    const rules = {};

    for (let c of text) {
        if (c === "\t") continue;

        if (c === "{") {
            blockOpen = true;
            selBuff = buff.trim();
            buff = "";
            continue;
        }

        if (blockOpen) {
            if (c === "}") {
                blockOpen = valOpen = false;
                selBuff = keyBuff = buff = "";
                continue;
            }

            if (!valOpen) {
                if (c === ":") {
                    valOpen = true;
                    keyBuff = buff.trim();
                    buff = "";
                    continue;
                }
            }
            else {
                if (c === "\n" || c === ";" || c === "}") {
                    const [selector, key, value] = [selBuff, keyBuff, buff];
                    if (!rules.hasOwnProperty(selector)) {
                        rules[selector] = {};
                    }
                    rules[selector][key] = value.trim();
                    valOpen = false;
                    keyBuff = buff = "";
                }
            }
        }

        if (c === "\n") {
            buff = "";
        } else {
            buff += c;
        }
    }
    return rules;
}

/**
 * Return true if the two given sets contain equal elements.
 * @param {Set} a
 * @param {Set} b
 * @returns {Boolean}
 */
function setEqual(a, b) {
    for (let element of a)
        if (!b.has(element)) return false;
    return a.size === b.size;
}

/**
 * Given an array, return a new one without duplicates.
 * @param {Array} array
 * @returns {Array}
 */
function removeDuplicates(array) {
    const alreadySeen = new Set();
    const newArray = [];
    for (const element of array) {
        if (!alreadySeen.has(element)) {
            newArray.push(element);
        }
        alreadySeen.add(element);
    }
    return newArray;
}

/**
 * Replace all sequences of whitespace with a single space (unicode 32).
 * @param {String}
 * @returns {String}
 */
function collapseWhitespace(string) {
    return string.replace(/\s+/g, " ");
}

/**
 * Escape characters in the given string that have a special meaning
 * in regular expressions. Taken from the MDN web docs.
 * @param {String} pattern 
 * @returns {String}
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Return a list of all matches of the given pattern in the given string.
 * @param {RegExp}
 * @param {String}
 * @returns {Array[Match]}
 */
function findMatches(pattern, string) {
    const matches = [];
    let match = pattern.exec(string);
    while (match !== null) {
        matches.push(match);
        match = pattern.exec(string);  // Will find next match
    }
    return matches;
}

/**
 * Given multiple arrays, return a new one where the i-th entry is an array
 * containing the i-th entries of the individual arrays.
 * @param {...Array} arrays
 * @returns {Array}
 */
function zipArrays(...arrays) {
    if (arrays.length === 0)
        return [];
    const numArrays = arrays.length;
    const numItems = arrays[0].length;
    const zippedArray = new Array(numItems);
    for (let i = 0; i < numItems; ++i) {
        zippedArray[i] = new Array(numArrays);
        for (let j = 0; j < numArrays; ++j) {
            zippedArray[i][j] = arrays[j][i];
        }
    }
    return zippedArray;
}

/**
 * Given a path, parse the html file at that path and return a fragment node
 * with the contents.
 * @param {String} path
 * @param {Boolean} wrapBody - If true, return a body element wrapping around
 *     the contents instead of a fragment.
 * @returns {DocumentFragment|HTMLBodyElement}
 */
function parseHtmlFile(path, wrapBody=false) {
    const htmlString = fs.readFileSync(path, "utf-8");
    if (wrapBody) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        return document.importNode(doc.body, true);
    } else  {
        return fragmentFromString(htmlString);
    }
}

/**
 * Given a string with html, return a document fragment with the parsed html.
 * @param {String} htmlString
 * @returns {DocumentFragment}
 */
function fragmentFromString(htmlString) {
    const template = document.createElement("template");
    template.innerHTML = htmlString;
    return document.importNode(template.content, true);
}

/**
 * Return the edit distance (Levenshtein distance) between given two words.
 * @param {String} word1
 * @param {String} word2
 * @returns {Integer}
 */
function calculateED(word1, word2) {
    const len1 = word1.length;
    const len2 = word2.length;
    const distances = [];
    for (let i = 0; i < len1 + 1; ++i)
        distances.push([i].concat(new Array(len2)));
    for (let i = 1; i < len2 + 1; ++i)
        distances[0][i] = i;
    for (let i = 1; i < len1 + 1; ++i) {
        for (let j = 1; j < len2 + 1; ++j) {
            const ED1 = distances[i - 1][j] + 1;
            const ED2 = distances[i][j - 1] + 1;
            const ED3 = distances[i - 1][j - 1] +
                        !(word1[i - 1] === word2[j - 1]);
            distances[i][j] = Math.min(ED1, ED2, ED3);
        }
    }
    return distances[len1][len2];
}

/**
 * Given an integer, return the string representing the number with commas
 * inserted for readability.
 * @param {Integer} number
 * @returns {String}
 */
function getStringForNumber(number) {
    number = number.toString();
    let string = "";
    for (let i = 0; i < number.length; ++i) {
        string += number[i];
        if (i !== number.length - 1 && (number.length - 1 - i) % 3 === 0) {
            string += ",";
        }
    }
    return string;
}

/**
 * Return the string representing the ordinal number for given integer.
 * @param {Integer} number
 * @returns {String}
 */
function getOrdinalNumberString(number) {
    let suffix = "th";
    if      (number % 10 === 1 && number % 100 !== 11) suffix = "st";
    else if (number % 10 === 2 && number % 100 !== 12) suffix = "nd";
    else if (number % 10 === 3 && number % 100 !== 13) suffix = "rd";
    return number.toString() + suffix;
}

/**
 * Given a string of entries, return the array of substrings split on given
 * separator, if the separator is not between parentheses. Trim substrings.
 * @param {String} entryString
 * @param {String} separator
 * @returns {Array[String]}
 */
function parseEntries(entryString, separator) {
    let entries = [];
    let insideParentheses = false;
    let insideSquareBrackets = false;
    let startIndex = 0;
    for (let i = 0; i < entryString.length; ++i) {
        if (entryString[i] === "(") {
            insideParentheses = true;
        } else if (entryString[i] === "[") {
            insideSquareBrackets = true;
        } else if (insideParentheses && entryString[i] === ")") {
            insideParentheses = false;
        } else if (insideSquareBrackets && entryString[i] === "]") {
            insideSquareBrackets = false;
        } else if ((!insideParentheses && !insideSquareBrackets && 
                    entryString[i] === separator)) {
            const entry = entryString.slice(startIndex, i).trim();
            if (entry.length > 0)
                entries.push(entry);
            startIndex = i + 1;
        }
    }
    const entry = entryString.slice(startIndex, entryString.length).trim();
    if (entry.length > 0)
        entries.push(entry);
    return entries;
}

/**
 * Parse given string defining a time span into an object.
 * @param {String} String defining a time span. Is a comma separated sequence
 *     of parts of the form: "number unit".
 * @returns {Object} Time span object of the form
 *     { seconds, minutes, hours, days, weeks, months, years }.
 * @throws Error if argument is not correctly formatted.
 */
function timeSpanStringToObject(string) {
    const parts = string.split(",").map((s) => s.trim());
    const result = { seconds: 0, minutes: 0, hours: 0,
                     days: 0, weeks: 0, months: 0, years: 0 };
    if (string.length === 0) {
        return result;
    }
    if (string.toLowerCase() === "infinity") {
        result.years = 8000000;  // Number of seconds fits into 6 bytes
        return result;
    }
    const usedUnits = new Set();
    for (const part of parts) {
        const match = part.match(/^(\d+)\s*(\w+)$/);
        if (match === null) {
            throw new Error(
                `Part of the string is incorrectly formatted: '${part}'`
                + ` (Should be of the form 'number unit')`);
        }
        const [number, unit] = match.slice(1).map((s) => s.toLowerCase());
        switch (unit) {
        case "s":
        case "sec":
        case "second":
        case "seconds":
            result.seconds += parseInt(number); break;
        case "min":
        case "minute":
        case "minutes":
            result.minutes += parseInt(number); break;
        case "h":
        case "hour":
        case "hours":
            result.hours += parseInt(number); break;
        case "d":
        case "day":
        case "days":
            result.days += parseInt(number); break;
        case "w":
        case "week":
        case "weeks":
            result.weeks += parseInt(number); break;
        case "mon":
        case "month":
        case "months":
            result.months += parseInt(number); break;
        case "y":
        case "year":
        case "years":
            result.years += parseInt(number); break;
        default:
            throw new Error(
                `Part of the string is incorrectly formatted: '${part}'`
                + ` (Unknown unit: '${unit}')`);
        }
    }
    return result;
}

/**
 * Return number of seconds in time span specified by given string.
 * @param {String} String defining a time span. Is a comma separated sequence
 *     of parts of the form: "number unit".
 * @returns {Integer}
 * @throws Error if argument is not correctly formatted.
 */
function timeSpanStringToSeconds(string) {
    const { seconds, minutes, hours, days, weeks, months, years } =
        timeSpanStringToObject(string);
    return seconds
           + minutes * 60
           + hours * 60 * 60
           + days * 60 * 60 * 24
           + weeks * 60 * 60 * 24 * 7
           + months * 60 * 60 * 24 * 30
           + years * 60 * 60 * 24 * 365;
}

/**
 * Return standard string notation for timespan defined by given object.
 * @param {Object} object - Object of form
 *     { seconds, minutes, hours, days, weeks, months, years }
 * @returns {String}
 */
function timeSpanObjectToString(object) {
    const substrings = [];
    const units = ["years", "months", "weeks", "days",
                   "hours", "minutes", "seconds"];
    for (const unit of units) {
        const amount = object[unit];
        if (amount === 0) continue;
        substrings.push(`${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`);
    }
    return substrings.join(", ");
}

/**
 * Return true if given path is an existing file.
 * @param {String} path
 * @returns {Boolean}
 */
function existsFile(path) {
    try {
        const stats = fs.lstatSync(path);
        return stats.isFile();
    } catch (error) {
        //if (error.errno === -2)
        return false;
    }
}

/**
 * Return true if given path is an existing directory.
 * @param {String} path
 * @returns {Boolean}
 */
function existsDirectory(path) {
    try {
        const stats = fs.lstatSync(path);
        return stats.isDirectory();
    } catch (error) {
        //if (error.errno === -2)
        return false;
    }
}


/**
 * Reduce the pain of creating SVG elements in javascript.
 * @param {String} type
 * @param {Object} attributes
 * @returns {HTMLSVGElement}
 */
function createSvgNode(type, attributes) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", type);
    for (let name in attributes) {
        node.setAttribute(name, attributes[name]);
    }
    return node;
}

/**
 * Create a default option element with empty value for a <select> element.
 * @param {String} text
 * @returns {HTMLOptionElement}
 */
function createDefaultOption(text) {
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = text;
    defaultOption.setAttribute("selected", "");
    return defaultOption;
}

/**
 * Given an HTMLElement whose children are sorted according to given key,
 * return the index of the child node with given key value.
 * If no such child node is found, return the index at which a node with that
 * key value would be inserted.
 * @param {HTMLElement} container
 * @param {*} value
 * @param {function} key
 * @param {Boolean} sortedBackwards
 * @returns {Integer}
 */
function findIndex(
        container, value, key=(node)=>node.textContent, sortedBackwards) {
    let middle = 0;
    let left = 0;
    let right = container.children.length - 1;
    if (sortedBackwards) {
        while (left <= right) {
            middle = left + parseInt((right - left) / 2);
            if (key(container.children[middle]) > value) {
                left = middle + 1;
            } else if (key(container.children[middle]) < value) {
                right = middle - 1;
            } else {
                return middle;
            }
        }
        return left;
    } else {
        while (left <= right) {
            middle = left + parseInt((right - left) / 2);
            if (key(container.children[middle]) < value) {
                left = middle + 1;
            } else if (key(container.children[middle]) > value) {
                right = middle - 1;
            } else {
                return middle;
            }
        }
        return left;
    }
}

/**
 * Given an HTMLElement whose children are sorted according to given key,
 * insert given node as child such that the children stay sorted.
 * @param {HTMLElement} container
 * @param {HTMLElement} node
 * @param {function} key
 * @param {Boolean} sortedBackwards
 */
function insertNodeIntoSortedList(
        container, node, key=(n)=>n.textContent, sortedBackwards) {
    if (container.children.length === 0) {
        container.appendChild(node);
    } else {
        const index = findIndex(container, key(node), key, sortedBackwards);
        if (index === container.children.length) {
            container.appendChild(node);
        } else {
            container.insertChildAt(node, index);
        }
    }
}

/**
 * Given an HTMLElement whose children are sorted according to given key,
 * remove node with given value from children if it exists.
 * @param {HTMLElement} container
 * @param {*} value
 * @param {function} key
 * @param {Boolean} sortedBackwards
 * @returns {Boolean} - Whether the element has been found.
 */
function removeEntryFromSortedList(
        container, value, key=(n)=>n.textContent, sortedBackwards) {
    if (container.children.length === 0) return false;
    const index = findIndex(container, value, key, sortedBackwards);
    if (index < 0 || index >= container.children.length) return false;
    // Don't test equality with "===" to make it work with arrays
    const valueAtIndex = key(container.children[index]);
    if (!(valueAtIndex > value) && !(valueAtIndex < value)) {
        container.removeChildAt(index);
        return true;
    }
    return false;
}

/**
 * Given an HTMLElement whose children are sorted according to given key,
 * return child node with given value if it exists (or null if it doesn't).
 * @param {HTMLElement} container
 * @param {*} value
 * @param {function} key
 * @param {Boolean} sortedBackwards
 * @returns {HTMLElement}
 */
function getEntryFromSortedList(
        container, value, key=(n)=>n.textContent, sortedBackwards) {
    if (container.children.length === 0) return null;
    const index = findIndex(container, value, key, sortedBackwards);
    if (index < 0 || index >= container.children.length) return null;
    // Don't test equality with "===" to make it work with arrays
    const valueAtIndex = key(container.children[index]);
    if (!(valueAtIndex > value) && !(valueAtIndex < value)) {
        return container.children[index];
    }
    return null;
}

/**
 * Given the tbody and thead of an HTML table, size the header cells in the
 * thead rows to fit the size of table row cells in tbody.
 * @param {HTMLTBodyElement} tableBody
 * @param {HTMLTHeadElement} tableHead
 */
function calculateHeaderCellWidths(tableBody, tableHead) {
    // If the thead contains no rows, do nothing
    if (tableHead.children.length === 0) {
        return;
    }
    // Currently only works for a single row in the thead.
    if (tableHead.children.length > 1) {
        throw { name: "NotImplementedError",
                message: "Table head to adjust sizes for can currently only " +
                         "contain a single row." };
    }
    const headCells = tableHead.children[0].children;
    const widths = [];
    // If there are no body rows to adjust cells to, make them equally sized
    if (tableBody.children.length === 0) {
        const width = tableHead.offsetWidth / headCells.length;
        for (let i = 0; i < headCells.length; ++i) {
            widths.push(width);
        }
    } else {
        const bodyCells = tableBody.children[0].children;
        // Throw an error if amount of cells in the thead and tbody do not fit
        if (bodyCells.length !== headCells.length) {
            throw { name: "ValueError",
                message: `Table head row contains ${headCells.length} cells, ` +
                         `but table body rows contain ${bodyCells.length}.` };
        }
        for (let i = 0; i < bodyCells.length; ++i) {
            widths.push(bodyCells[i].offsetWidth);
        }
    }
    for (let i = 0; i < headCells.length; ++i) {
        headCells[i].style.width = widths[i] + "px";
    }
}

/**
 * Select all the content in given node upon focussing in.
 * @param {HTMLInputElement} inputNode
 */
function selectAllOnFocus(inputNode) {
    inputNode.addEventListener("focusin", (event) => {
        inputNode.setSelectionRange(0, inputNode.value.length);
    });
}

/**
 * Provide functionality for a group of radiobuttons by calling a callback
 * whenever a different radiobutton in the group has been selected.
 * @param {HTMLElement} container - Element containing <check-box> elements
 *     among its descendents. All radiobuttons must have their 'dataset-value'
 *     attribute set.
 * @param {*} initialValue - Value of the radiobutton which should be selected
 *     initially.
 * @param {function} callback - Function taking a single value as argument,
 *     which is the value of the radiobutton that has been selected.
 *     The callback is called whenever the user clicks a checkbox other than
 *     the currently selected one.
 */
function bindRadiobuttonGroup(container, initialValue, callback) {
    let currentlySelected = container.querySelector(
        `check-box[data-value='${initialValue}']`);
    if (currentlySelected === null) {
        throw new Error(
            `Radiobutton with value '${initialValue}' could not be found.`);
    }
    currentlySelected.checked = true;
    container.addEventListener("click", (event) => {
        let radiobutton;
        if (event.target.tagName === "CHECK-BOX") {
            radiobutton = event.target;
            if (radiobutton.checked === false) {
                radiobutton.checked = true;
                return;
            }
        } else if (event.target.classList.contains("labeled-radiobutton")) {
            radiobutton = event.target.querySelector("check-box");
            if (radiobutton.checked === true) {
                return;
            }
            radiobutton.checked = true;
        } else if (event.target.parentNode.classList
                   .contains("labeled-radiobutton")) {
            radiobutton = event.target.parentNode.querySelector("check-box");
            if (radiobutton.checked === true) {
                return;
            }
            radiobutton.checked = true;
        } else {
            return;
        }
        currentlySelected.checked = false;
        currentlySelected = radiobutton;
        callback(radiobutton.dataset.value);
    });
}


/**
 * Make given node behave like a popup-window, i.e. it gets closed when clicking
 * somewhere outside of it. Call given callback if the window is being closed.
 * @param {HTMLElement} node
 * @param {Function} [callback]
 */
function makePopupWindow(node, callback) {
    node.closeInThisIteration = true;
    node.addEventListener("click", (event) => {
        node.closeInThisIteration = false;
    });
    window.addEventListener("click", (event) => {
        if (!node.isHidden() && node.closeInThisIteration) {
            node.hide();
            if (callback !== undefined) {
                callback();
            }
        }
        node.closeInThisIteration = true;
    });
    node.hide();
}


/**
 * Draw an arrow with given parameters on canvas given by its context.
 * @param {Object} ctx - Context of the canvas to draw on.
 * @param {Object} params - Parameters defining the arrow position and shape.
 */
function drawArrowOnCanvas(ctx,
        { start, end, headWidth, headLength, baseWidth }) {
    // Define functions for vector arithmetics
    const rotate = (point, angle) => ({
        x: Math.cos(angle) * point.x - Math.sin(angle) * point.y,
        y: Math.sin(angle) * point.x + Math.cos(angle) * point.y
    });
    const add = (point1, point2) => ({
        x: point1.x + point2.x, y: point1.y + point2.y
    });
    // Calculate necessary values
    const arrowLength = Math.sqrt((end.x - start.x)**2 + (end.y - start.y)**2);
    const baseLength = arrowLength - headLength;
    let angle = Math.asin((start.x - end.x) / arrowLength);
    if (end.y < start.y && start.x > end.x) {
        angle = Math.PI - angle;
    }
    if (end.y < start.y && start.x <= end.x) {
        angle = -Math.PI - angle;
    }
    // Define points in the unrotated coordinate system
    const points = [
        { x: baseWidth / 2, y: 0 },
        { x: baseWidth / 2, y: baseLength },
        { x: headWidth / 2, y: baseLength },
        { x: 0, y: arrowLength },  // tip of the arrow
        { x: -headWidth / 2, y: baseLength },
        { x: -baseWidth / 2, y: baseLength },
        { x: -baseWidth / 2, y: 0 },
    ]
    // Draw points with rotation and offset applied
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    for (const point of points) {
        const transformedPoint = add(rotate(point, angle), start);
        ctx.lineTo(transformedPoint.x, transformedPoint.y);
    }
    ctx.closePath();
    ctx.fill();
}


/**
 * Return an list containing certain information for given time intervals
 * in the near future, starting from the current date.
 * @param {String} unit - Can be "hours", "weeks", "days" or "months".
 * @param {String} numUnits - Number of intervals to get schedule for.
 * @param {Function} getInfoForInterval - A function which should return an
 *     object containing information corresponding to the given time interval.
 *     Time interval is given as 2 parameters startDate and endDate (exclusive).
 * @param {Boolean} [toFuture=true] - Whether timeline goes into the future.
 * @returns {Array} - Array with objects { data, startDate, endDate }, where
 *     date is the object returned from the callback for the interval.
 */
async function getTimeline(unit, numUnits, getInfoForInterval, toFuture=true) {
    const promises = [];
    const currentDate = new Date();
    let intervalStartDate = new Date(currentDate);
    let intervalEndDate = new Date(currentDate);
    // Set end of first interval to start of next hour/day/month
    if (unit === "hours") {
        intervalEndDate.setHours(currentDate.getHours() + toFuture, 0, 0, 0);
    } else if (unit === "days") {
        intervalEndDate.setHours(0, 0, 0, 0);
        intervalEndDate.setDate(currentDate.getDate() + toFuture);
    } else if (unit === "weeks") {
        intervalEndDate.setHours(0, 0, 0, 0);
        intervalEndDate.setDate(currentDate.getDate() + 7 * toFuture
                                - (currentDate.getDay() - 1) % 7);
    } else if (unit === "months") {
        intervalEndDate.setHours(0, 0, 0, 0);
        intervalEndDate.setDate(1);
        intervalEndDate.setMonth(currentDate.getMonth() + toFuture);
    }
    for (let i = 0; i < numUnits; ++i) {
        // Adjust order of dates depending on whether it goes to future/past
        const startDate = new Date(toFuture ? intervalStartDate :
                                              intervalEndDate);
        const endDate = new Date(toFuture ? intervalEndDate :
                                            intervalStartDate);
        const promise = Promise.resolve(getInfoForInterval(startDate,endDate,i))
                        .then((data) => ({ data, startDate, endDate }));
        promises.push(promise);
        // Shift interval by 1 unit
        intervalStartDate = new Date(intervalEndDate);
        const delta = toFuture ? 1 : -1;
        if (unit === "hours") {
            intervalEndDate.setHours(intervalStartDate.getHours() + delta);
        } else if (unit === "days") {
            intervalEndDate.setDate(intervalStartDate.getDate() + delta);
        } else if (unit === "weeks") {
            intervalEndDate.setDate(intervalStartDate.getDate() + 7 * delta);
        } else if (unit === "months") {
            intervalEndDate.setMonth(intervalStartDate.getMonth() + delta);
        }
    }
    return Promise.all(promises);
} 


/**
 * Given an array of successive time intervals and the name of the used unit,
 * return an array of labels (one for every few intervals) and an object mapping
 * indices to separators (for every next-larger unit). Usable for a bar diagram.
 * @param {Array} intervals - Array of objects { startDate, endDate }.
 * @param {String} unit - Can be "hours", "days", "months".
 * @param {Boolean} [toFuture=true] - Whether timeline goes into the future.
 * @returns {Object} - Object of the form { labels, separators }.
 */
function getTimelineMarkers(intervals, unit) {
    const labels = [];
    const separators = {};
    if (unit === "hours") {
        const startHour = (intervals[0].endDate.getHours() + 23) % 24;
        if (startHour % 3 === 0) labels.push(`${startHour}:00`);
        else labels.push("");
    }
    for (let i = 0; i < intervals.length; ++i) {
        const startDate = intervals[i].startDate;
        const endDate = intervals[i].endDate;
        if (unit === "hours") {
            const hour = endDate.getHours();
            // Display hour if divisible by 3
            if (hour % 3 === 0) {
                labels.push(`${hour}:00`);
            } else {
                labels.push("");
            }
            // Add separator if a new day begins
            if (startDate.getHours() === 0) {
                separators[i] = endDate.toLocaleString("en-us",
                    { month: "short", day: "2-digit" });
            }
        } else if (unit === "days") {
            // Display date if first day of a week
            if (startDate.getDay() === 1) {
                labels.push(`${getOrdinalNumberString(startDate.getDate())}`);
            } else {
                labels.push("");
            }
            // Add separator if a new month begins
            if (startDate.getDate() === 1) {
                separators[i] =
                    startDate.toLocaleString("en-us", { month: "long" });
            }
        } else if (unit === "months") {
            // Display month if divisible by 3 (Jan, Apr, Jul, Oct)
            if (startDate.getMonth() % 3 === 0) {
                labels.push(startDate.toLocaleString("en-us",{ month:"short" }))
            } else {
                labels.push("");
            }
            // Add separator if a new year begins
            if (startDate.getMonth() === 0) {
                separators[i] = startDate.toLocaleString("en-us",
                    { year: "numeric" });
            }
        }
    }
    return { labels, separators };
}

/**
 * Get n different colors which are as distinguishable as possible.
 * @param {Integer} n
 * @returns {Array}
 */
function getDistantColors(n) {
    // Use hand-picked colors for a small amount of languages
    let colors;
    if (dataManager.settings.design.colorScheme.startsWith("solarized")) {
        // orange, green, violet, yellow, magenta, cyan, red, blue
        colors = ["#cb4b16", "#859900", "#6c71c4", "#b58900",
                  "#d33682", "#2aa198", "#dc322f", "#268bd2"];
    } else {
        // red, green, blue, yellow, brown, pink
        colors = ["#b56262", "#6ab673", "#6262b5",
                  "#b5b562", "#ba956d", "#b56ab0"];
    }
    if (n <= colors.length) 
        return colors.slice(0, n);

    // 21 colors taken from here: https://stackoverflow.com/a/309193
    // Not very aesthetically pleasing, but sufficiently distinguishable
    const alternativeColors = [
        "#FF0000","#00FF00","#0000FF","#FFFF00","#FF00FF","#00FFFF","#000000", 
        "#800000","#008000","#000080","#808000","#800080","#008080","#808080", 
        "#C00000","#00C000","#0000C0","#C0C000","#C000C0","#00C0C0","#C0C0C0"
    ];
    if (n <= alternativeColors.length) 
        return alternativeColors.slice(0, n);

    // More than 21 colors are not supported, return array filled with #000000
    const blackArray = [];
    for (let i = 0; i < n; ++i) blackArray.push("#000000");
    return blackArray;
}


/**
 * Handle "keydown" event for given HTMLElement. Initially call the handler
 * only once when a key is pressed. If the key if kept pressed for a certain
 * amount of time, start calling the handler frequently in short intervals.
 * @param {HTMLElement} element
 * @param {Function} handler
 */
function handleKeyDownEvent(element, handler) {
    const initialDelay = 600;
    const longPressDelay = 80;
    let timeLastHandled = -1;
    let pressingLong = false;
    element.addEventListener("keyup", (event) => {
        timeLastHandled = -1;
        pressingLong = false;
    });
    element.addEventListener("keydown", (event) => {
        const currentTime = new Date().getTime();
        if (timeLastHandled > 0) {
            let delay = pressingLong ? longPressDelay : initialDelay;
            if (currentTime - timeLastHandled <= delay) {
                return;
            }
            pressingLong = true;
        }
        timeLastHandled = currentTime;
        handler(event);
    });
}

/**
 * Measure the size of an SVG text element even if it's hidden.
 * Creates a temporary invisible SVG element for this purpose.
 * @param {SVGElement} element
 * @returns {Object} - Object of the form { width, height }
 */
function measureSvgElementSize(element) {
    const svg = utility.createSvgNode("svg");
    svg.style.visibility = "hidden";
    svg.style.pointerEvents = "none";
    document.body.appendChild(svg);
    const clone = element.cloneNode(true);
    svg.appendChild(clone);
    const { width, height } = clone.getBBox();
    svg.remove();
    return { width, height };
}

/**
 * Return an interface for the given sqlite3 database based on promises.
 * The interface only contains the functions run, exec, all, close.
 */
function promisifyDatabase(db) {
    const dbInterface = {};
    dbInterface.run = (statement, ...args) => {
        return new Promise((resolve, reject) => {
            db.run(statement, ...args, (err) => err ? reject(err) : resolve());
        });
    };
    dbInterface.exec = (sqlText) => {
        return new Promise((resolve, reject) => {
            db.exec(sqlText, (err) => err ? reject(err) : resolve());
        });
    };
    dbInterface.all = (query, ...args) => {
        return new Promise((resolve, reject) => {
            db.all(query, ...args, (err, rows) => err ? reject(err) :
                                                        resolve(rows));
        });
    };
    dbInterface.close = () => {
        return new Promise((resolve, reject) => {
            db.close((err) => err ? reject(err) : resolve());
        });
    };
    return dbInterface;
}

// Efficiently remove all DOM nodes in the given set from the given container.
function removeMultipleNodes(nodesToDelete, container) {
    const fragment = document.createDocumentFragment();
    const children = Array.from(container.children);
    container.innerHTML = "";
    for (let i = 0; i < children.length; ++i) {
        if (!nodesToDelete.has(children[i])) fragment.appendChild(children[i]);
    }
    container.appendChild(fragment);
}

async function takeScreenshot(name, outputDirectory, includeBorder=true) {
    const browserWindow = remote.getCurrentWindow();
    const screenshot = await browserWindow.capturePage({
        x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });

    if (outputDirectory === undefined) outputDirectory = "screenshots";
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }
    const filepath = path.join(outputDirectory, name + ".png");
    if (!includeBorder) {
        fs.writeFileSync(filepath, screenshot.toPNG());
        return;
    }

    const image = new Image();
    image.src = "data:image/png;base64," + screenshot.toPNG().toString("base64")
    await new Promise((resolve) => { image.onload = resolve });
    const canvas = document.createElement("canvas");
    const imgWidth = window.innerWidth + 2;
    const imgHeight = window.innerHeight + 2;
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#000000";
    context.fillRect(0, 0, imgWidth, imgHeight);
    context.drawImage(image, 1, 1, window.innerWidth, window.innerHeight);
    const dataUrl = canvas.toDataURL("image/png");
    const data = dataUrl.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(filepath, data, "base64");
}

// Non DOM-related functions
module.exports.getTime = getTime;
module.exports.getShortDateString = getShortDateString;
module.exports.daysInMonth = daysInMonth;
module.exports.parseCssFile = parseCssFile;
module.exports.setEqual = setEqual;
module.exports.removeDuplicates = removeDuplicates;
module.exports.collapseWhitespace = collapseWhitespace;
module.exports.escapeRegex = escapeRegex;
module.exports.findMatches = findMatches;
module.exports.zipArrays = zipArrays;
module.exports.calculateED = calculateED;
module.exports.getStringForNumber = getStringForNumber;
module.exports.getOrdinalNumberString = getOrdinalNumberString;
module.exports.parseEntries = parseEntries;
module.exports.timeSpanStringToObject = timeSpanStringToObject;
module.exports.timeSpanStringToSeconds = timeSpanStringToSeconds;
module.exports.timeSpanObjectToString = timeSpanObjectToString;
module.exports.existsFile = existsFile;
module.exports.existsDirectory = existsDirectory;
module.exports.getTimeline = getTimeline;
module.exports.getTimelineMarkers = getTimelineMarkers;
module.exports.getDistantColors = getDistantColors;
module.exports.promisifyDatabase = promisifyDatabase;

// DOM related functions
module.exports.parseHtmlFile = parseHtmlFile;
module.exports.fragmentFromString = fragmentFromString;
module.exports.finishEventQueue = finishEventQueue;
module.exports.wait = wait;
module.exports.addMinDelay = addMinDelay;
module.exports.setTimer = setTimer;
module.exports.createSvgNode = createSvgNode;
module.exports.createDefaultOption = createDefaultOption;
module.exports.findIndex = findIndex;
module.exports.insertNodeIntoSortedList = insertNodeIntoSortedList;
module.exports.removeEntryFromSortedList = removeEntryFromSortedList;
module.exports.getEntryFromSortedList = getEntryFromSortedList;
module.exports.calculateHeaderCellWidths = calculateHeaderCellWidths;
module.exports.selectAllOnFocus = selectAllOnFocus;
module.exports.bindRadiobuttonGroup = bindRadiobuttonGroup;
module.exports.makePopupWindow = makePopupWindow;
module.exports.drawArrowOnCanvas = drawArrowOnCanvas;
module.exports.handleKeyDownEvent = handleKeyDownEvent;
module.exports.measureSvgElementSize = measureSvgElementSize;
module.exports.removeMultipleNodes = removeMultipleNodes;
module.exports.takeScreenshot = takeScreenshot;
