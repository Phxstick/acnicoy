"use strict";

const fs = require("fs");

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
 * Execute given callback when 'offset' time has passed after the last time it
 * was called. If 'lastTime' is undefined, execute the callback immediately.
 * @param {Function} callback
 * @param {Integer} offset - Time to call callback after (in seconds).
 * @param {Integer} [lastTime] - Last time the callback was called (in seconds).
 */
function setTimer(callback, offset, lastTime) {
    if (lastTime === undefined) {
        callback();
    } else {
        const currentTime = utility.getTime();
        const newOffset = Math.max(0, lastTime + offset - currentTime);
        window.setTimeout(callback, 1000 * newOffset);
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
        if (index === -1) {
            container.prependChild(node);
        } else if (index === container.children.length) {
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
 */
function removeEntryFromSortedList(
        container, value, key=(n)=>n.textContent, sortedBackwards) {
    if (container.children.length === 0) return;
    const index = findIndex(container, value, key, sortedBackwards);
    if (index < 0 || index >= container.children.length) return;
    if (key(container.children[index]) === value)
        container.removeChildAt(index);
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
        console.log(
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
 * Make given node a data view, which displays search results upon searching
 * for some data provided by given function. Scrolling almost to the bottom of
 * the view will cause more search results to be displayed.
 * @param {HTMLElement} view - Node which will contain the search results.
 * @param {Function} getData - Async function returning a list of data items.
 *     First argument must be the query (a string or undefined).
 * @param {Function} createViewItem - Function which takes a data item (returned
 *     by 'getdata') as argument and returns an HTMLElement representing a
 *     search result to be inserted into the view.
 * @param {Integer} initialDisplayAmount - Amount of items to display initially
 *     after a search.
 * @param {Integer} displayAmount - Amount of items to be displayed upon
 *     scrolling almost to the bottom of the search results view.
 *
 * @param {HTMLElement} [placeholder] - Node to be displayed if query searched
 *     for is empty.
 * @param {HTMLElement} [noResultsPane] - Node to be displayed if there are no
 *     search results after searching.
 * @param {Boolean} [deterministicSearch=true] - If set to true, querying the
 *     same thing as the previous time will not trigger a new search (as the
 *     search results are expected to be completely determined by the query).
 * @param {Boolean} [criticalScrollDistance=150] - Distance from the bottom of
 *     the view in number of pixels which determines how far to the bottom
 *     the view has to be scrolled for the next search results to be displayed.
 */
function initializeView({ view, getData, createViewItem, initialDisplayAmount,
                          displayAmount, placeholder, noResultsPane,
                          deterministicSearch=true,
                          criticalScrollDistance=150 }={}) {
    const state = {
        view,
        getData,
        createViewItem,
        lastQuery: null,
        lastArgs: null,
        searchResult: null,
        nextResultIndex: null,
        resultLoaded: false,
        viewItemsLoaded: true,
        initialDisplayAmount,
        displayAmount,
        deterministicSearch
    };
    function displayMoreViewItems() {
        state.viewItemsLoaded = false;
        const amount = state.nextResultIndex === 0 ?
            state.initialDisplayAmount : state.displayAmount;
        const limit = Math.min(
            state.nextResultIndex + amount, state.searchResult.length);
        const viewItemPromises = [];
        for (let i = state.nextResultIndex; i < limit; ++i) {
            viewItemPromises.push(state.createViewItem(state.searchResult[i]));
        }
        return Promise.all(viewItemPromises).then((viewItems) => {
            const fragment = document.createDocumentFragment();
            for (const viewItem of viewItems) {
                fragment.appendChild(viewItem);
            };
            state.view.appendChild(fragment);
            state.nextResultIndex = limit;
            state.viewItemsLoaded = true;
        });
    }
    // If user scrolls almost to bottom of view, load more entries
    state.view.uponScrollingBelow(criticalScrollDistance, () => {
        if (state.nextResultIndex > 0 &&
                state.resultLoaded &&
                state.viewItemsLoaded &&
                state.nextResultIndex < state.searchResult.length)
            displayMoreViewItems();
    });
    state.search = async function(query, ...args) {
        if (placeholder !== undefined && query.length === 0) {
            placeholder.show();
            state.view.hide();
            if (noResultsPane !== undefined)
                noResultsPane.hide();
            return;
        }
        if (state.deterministicSearch && query !== undefined
                && query.length > 0
                && query === state.lastQuery && args.equals(state.lastArgs)) {
            return;
        }
        state.lastQuery = query;
        state.lastArgs = args;
        state.resultLoaded = false;
        state.view.empty();
        const searchResult = await state.getData(query, ...args);
        state.nextResultIndex = 0;
        state.searchResult = searchResult;
        state.view.scrollToTop();
        await displayMoreViewItems();
        state.resultLoaded = true;
        if (placeholder !== undefined)
            placeholder.hide();
        if (noResultsPane !== undefined) {
            const resultsFound = state.searchResult.length > 0;
            state.view.toggleDisplay(resultsFound);
            noResultsPane.toggleDisplay(!resultsFound);
        }
        return state.searchResult;
    };
    return state;
}

/**
 * Make given node behave like a popup-window, i.e. it gets closed when clicking
 * somewhere outside of it. Call given callback if the window is being closed.
 * @param {HTMLElement} node
 * @param {Function} [callback]
 */
function makePopupWindow(node, callback) {
    let nodeClicked = false;
    node.addEventListener("click", (event) => {
        nodeClicked = true;
    });
    window.addEventListener("click", (event) => {
        if (!node.isHidden() && !nodeClicked) {
            node.hide();
            if (callback !== undefined) {
                callback();
            }
        }
        nodeClicked = false;
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


// Non DOM-related functions
module.exports.getTime = getTime;
module.exports.getShortDateString = getShortDateString;
module.exports.parseCssFile = parseCssFile;
module.exports.setEqual = setEqual;
module.exports.calculateED = calculateED;
module.exports.getStringForNumber = getStringForNumber;
module.exports.getOrdinalNumberString = getOrdinalNumberString;
module.exports.parseEntries = parseEntries;
module.exports.timeSpanStringToObject = timeSpanStringToObject;
module.exports.timeSpanStringToSeconds = timeSpanStringToSeconds;
module.exports.timeSpanObjectToString = timeSpanObjectToString;
module.exports.existsFile = existsFile;
module.exports.existsDirectory = existsDirectory;

// DOM related functions
module.exports.parseHtmlFile = parseHtmlFile;
module.exports.fragmentFromString = fragmentFromString;
module.exports.finishEventQueue = finishEventQueue;
module.exports.wait = wait;
module.exports.setTimer = setTimer;
module.exports.createSvgNode = createSvgNode;
module.exports.createDefaultOption = createDefaultOption;
module.exports.findIndex = findIndex;
module.exports.insertNodeIntoSortedList = insertNodeIntoSortedList;
module.exports.removeEntryFromSortedList = removeEntryFromSortedList;
module.exports.calculateHeaderCellWidths = calculateHeaderCellWidths;
module.exports.selectAllOnFocus = selectAllOnFocus;
module.exports.bindRadiobuttonGroup = bindRadiobuttonGroup;
module.exports.initializeView = initializeView;
module.exports.makePopupWindow = makePopupWindow;
module.exports.drawArrowOnCanvas = drawArrowOnCanvas;
