"use strict";

const fs = require("fs");

/**
 * Return the current time in SECONDS since 1970/01/01.
 */
function getTime() {
    const date = new Date();
    return parseInt(date.getTime() / 1000);
}

/**
 * Given a date object, return date as string of form "yyyy/mm/dd".
 */
function getShortDateString(date) {
    return date.getUTCFullYear() + "/" +
           ("0" + (date.getUTCMonth() + 1)).slice(-2) + "/" +
           ("0" + (date.getUTCDate() + 1)).slice(-2);
}

/**
**  Return a promise which is fulfilled when the current event queue is empty.
**/
function finishEventQueue() {
    return new Promise((resolve) => window.setTimeout(resolve, 0));
}

/**
**  Parse text of given css file and return object with css rules.
**  Returned object maps each css selector to an object mapping css properties
**  to their values.
**/
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
**  Return true if the two given sets contain equal elements.
**/
function setEqual(a, b) {
    for (let element of a)
        if (!b.has(element)) return false;
    return a.size === b.size;
}

/**
**  Given a path, parse the html file at that path and return a fragment node
**  with the contents.
**  If wrapBody is true, return a body element wrapping around the contents.
**/
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
**  Given a string with html, return a document fragment with the parsed html.
**/
function fragmentFromString(htmlString) {
    const template = document.createElement("template");
    template.innerHTML = htmlString;
    return document.importNode(template.content, true);
}

/**
**  Return the edit distance (Levenshtein distance) between given two words.
**/
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
**  Given an integer, return the string representing the number with commas
**  inserted for readability.
**/
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
**  Return the string representing the ordinal number for given integer.
**/
function getOrdinalNumberString(number) {
    let suffix = "th";
    if      (number % 10 === 1 && number % 100 !== 11) suffix = "st";
    else if (number % 10 === 2 && number % 100 !== 12) suffix = "nd";
    else if (number % 10 === 3 && number % 100 !== 13) suffix = "rd";
    return number.toString() + suffix;
}

/**
**  Given a string of entries, return the array of substrings split on given
**  separator, if the separator is not between parentheses. Trim substrings.
**/
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
 *     { hours, days, weeks, months, years }.
 * @throws Error if argument is not correctly formatted.
 */
function timeSpanStringToObject(string) {
    const parts = string.split(",").map((s) => s.trim());
    const result = { hours: 0, days: 0, weeks: 0, months: 0, years: 0 };
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
        case "m":
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
    const { hours, days, weeks, months, years } =
        timeSpanStringToObject(string);
    return hours * 60 * 60
           + days * 60 * 60 * 24
           + weeks * 60 * 60 * 24 * 7
           + months * 60 * 60 * 24 * 30
           + years * 60 * 60 * 24 * 365;
}

/**
 * Return standard string notation for timespan defined by given object.
 * @param {Object} object - Object of form { hours, days, weeks, months, years }
 * @returns {String}
 */
function timeSpanObjectToString(object) {
    const substrings = [];
    const units = ["years", "months", "weeks", "days", "hours"];
    for (const unit of units) {
        const amount = object[unit];
        if (amount === 0) continue;
        substrings.push(`${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`);
    }
    return substrings.join(", ");
}

/**
**  Return true if given path is an existing file.
**/
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
**  Return true if given path is an existing directory.
**/
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
**  Reduce the pain of creating SVG elements in javascript.
**/
function createSvgNode(type, attributes) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", type);
    for (let name in attributes) {
        node.setAttribute(name, attributes[name]);
    }
    return node;
}

/**
**  Create a default option element with empty value for a <select> element.
**/
function createDefaultOption(text) {
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = text;
    defaultOption.setAttribute("selected", "");
    return defaultOption;
}

/**
**  Given an HTMLElement whose children are sorted lexically by textContent,
**  return the index of the child node containing given text. If no such child
**  node is found, return the index where the child node would be inserted.
**  (Performs binary search using the textContents of the sorted nodes)
**/
function findIndex(listNode, text) {
    let middle = 0;
    let left = 0;
    let right = listNode.children.length - 1;
    while (left <= right) {
        middle = left + parseInt((right - left) / 2);
        if (listNode.children[middle].textContent < text) {
            left = middle + 1;
        } else if (listNode.children[middle].textContent > text) {
            right = middle - 1;
        } else {
            return middle;
        }
    }
    return left;
}

/**
**  Given an HTMLElement whose children are sorted lexically by textContent,
**  insert given node as child such that the children stay sorted.
**/
function insertNodeIntoSortedList(listNode, childNode) {
    if (listNode.children.length === 0) {
        listNode.appendChild(childNode);
    } else {
        const index = findIndex(listNode, childNode.textContent);
        if (index === -1) {
            listNode.prependChild(childNode);
        } else if (index === listNode.children.length) {
            listNode.appendChild(childNode);
        } else {
            listNode.insertChildAt(childNode, index);
        }
    }
}

/**
**  Given an HTMLElement whose children are sorted lexically by textContent,
**  remove node with given textContent from children if it exists.
**/
function removeEntryFromSortedList(listNode, text) {
    const index = findIndex(listNode, text);
    if (listNode.children.length === 0) return;
    if (index < 0 || index >= listNode.children.length) return;
    if (listNode.children[index].textContent === text)
        listNode.removeChildAt(index);
}

/**
**  Given the tbody and thead of an HTML table, size the header cells in the
**  thead rows to fit the size of table row cells in tbody.
**/
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
 * If given input is unfocused, select all the content upon click, otherwise
 * use the standard event handler (cursor is moved to clicked position).
 * @param {HTMLInputElement} inputNode
 */
function enableQuickSelect(inputNode) {
    const root = inputNode.getRoot();
    inputNode.addEventListener("mousedown", (event) => {
        // If input didn't have focus, select all text in it
        if (root.activeElement !== inputNode) {
            inputNode.focus();
            inputNode.setSelectionRange(0, inputNode.value.length);
            event.preventDefault();
        }
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
        if (event.target.tagName !== "CHECK-BOX") return;
        const radiobutton = event.target;
        const value = radiobutton.dataset.value;
        if (radiobutton.checked === false) {
            radiobutton.checked = true;
            return;
        }
        currentlySelected.checked = false;
        currentlySelected = radiobutton;
        callback(value);
    });
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
module.exports.createSvgNode = createSvgNode;
module.exports.createDefaultOption = createDefaultOption;
module.exports.findIndex = findIndex;
module.exports.insertNodeIntoSortedList = insertNodeIntoSortedList;
module.exports.removeEntryFromSortedList = removeEntryFromSortedList;
module.exports.calculateHeaderCellWidths = calculateHeaderCellWidths;
module.exports.enableQuickSelect = enableQuickSelect;
module.exports.bindRadiobuttonGroup = bindRadiobuttonGroup;
