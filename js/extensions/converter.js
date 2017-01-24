"use strict";

/**
**  This module extends String, HTMLInputElement and HTMLTextAreaElement
**  by methods to convert romaji to kana and the other way round.
**/

const hiragana1 = [];
for (let i = 12353; i < 12439; ++i) hiragana1.push(String.fromCharCode(i));
const hiragana2 = [
    "きゃ", "きゅ", "きょ", "ぎゃ", "ぎゅ", "ぎょ", "しゃ", "しゅ",
    "しょ", "じゃ", "じゅ", "じょ", "ちゃ", "ちゅ", "ちょ", "にゃ",
    "にゅ", "にょ", "ひゃ", "ひゅ", "ひょ", "びゃ", "びゅ", "びょ",
    "ぴゃ", "ぴゅ", "ぴょ", "みゃ", "みゅ", "みょ", "にゃ", "にゅ",
    "にょ", "りゃ", "りゅ", "りょ"
];
const hiraRomaji1 = [
    "", "a", "", "i", "", "u", "", "e", "", "o", "ka", "ga", "ki", "gi",
    "ku", "gu", "ke", "ge", "ko", "go", "sa", "za", "shi", "ji", "su",
    "zu", "se", "ze", "so", "zo", "ta", "da", "chi", "di", "っ", "tsu",
    "du", "te", "de", "to", "do", "na", "ni", "nu", "ne", "no", "ha", "ba",
    "pa", "hi", "bi", "pi", "fu", "bu", "pu", "he", "be", "pe", "ho", "bo",
    "po", "ma", "mi", "mu", "me", "mo", "ゃ", "ya", "ゅ", "yu", "ょ", "yo",
    "ra", "ri", "ru", "re", "ro", "", "wa", "", "", "wo", "n", "", "", ""
];
const hiraRomaji2 = [
    "kya", "kyu", "kyo", "gya", "gyu", "gyo", "sha", "shu",
    "sho", "ja", "ju", "jo", "cha", "chu", "cho", "nya",
    "nyu", "nyo", "hya", "hyu", "hyo", "bya", "byu", "byo",
    "pya", "pyu", "pyo", "mya", "myu", "myo", "nya", "nyu",
    "nyo", "rya", "ryu", "ryo"
];
const hiraRepl1 = {};
const hiraRepl2 = {};
const romajiHira1 = {};
const romajiHira2 = {};
for (let i = 0; i < hiragana1.length; ++i)
    hiraRepl1[hiragana1[i]] = hiraRomaji1[i];
for (let i = 0; i < hiragana2.length; ++i)
    hiraRepl2[hiragana2[i]] = hiraRomaji2[i];
for (let i = 0; i < hiraRomaji1.length; ++i)
    romajiHira1[hiraRomaji1[i]] = hiragana1[i];
for (let i = 0; i < hiraRomaji2.length; ++i)
    romajiHira2[hiraRomaji2[i]] = hiragana2[i];

const katakana1 = [];
for (let i = 12449; i < 12539; ++i) katakana1.push(String.fromCharCode(i));
const katakana2 = [
    "キャ", "キュ", "キョ", "ギャ", "ギュ", "ギョ", "シャ", "シュ",
    "ショ", "ジャ", "ジュ", "ジョ", "チャ", "チュ", "チョ", "ニャ",
    "ニュ", "ニョ", "ヒャ", "ヒュ", "ヒョ", "ビャ", "ビュ", "ビョ",
    "ピャ", "ピュ", "ピョ", "ミャ", "ミュ", "ミョ", "ニャ", "ニュ",
    "ニョ", "リャ", "リュ", "リョ"
];
const kataRomaji1 = [
    "", "a", "", "i", "", "u", "", "e", "", "o", "ka", "ga", "ki", "gi",
    "ku", "gu", "ke", "ge", "ko", "go", "sa", "za", "shi", "ji", "su",
    "zu", "se", "ze", "so", "zo", "ta", "da", "chi", "di", "ッ", "tsu",
    "du", "te", "de", "to", "do", "na", "ni", "nu", "ne", "no", "ha", "ba",
    "pa", "hi", "bi", "pi", "fu", "bu", "pu", "he", "be", "pe", "ho", "bo",
    "po", "ma", "mi", "mu", "me", "mo", "ャ", "ya", "ュ", "yu", "ョ", "yo",
    "ra", "ri", "ru", "re", "ro", "", "wa", "", "", "wo", "n", "", "", ""
];
const kataRomaji2 = [
    "kya", "kyu", "kyo", "gya", "gyu", "gyo", "sha", "shu",
    "sho", "ja", "ju", "jo", "cha", "chu", "cho", "nya",
    "nyu", "nyo", "hya", "hyu", "hyo", "bya", "byu", "byo",
    "pya", "pyu", "pyo", "mya", "myu", "myo", "nya", "nyu",
    "nyo", "rya", "ryu", "ryo"
];
const kataRepl1 = {};
const kataRepl2 = {};
const romajiKata1 = {};
const romajiKata2 = {};
for (let i = 0; i < katakana1.length; ++i)
    kataRepl1[katakana1[i]] = kataRomaji1[i];
for (let i = 0; i < katakana2.length; ++i)
    kataRepl2[katakana2[i]] = kataRomaji2[i];
for (let i = 0; i < kataRomaji1.length; ++i)
    romajiKata1[kataRomaji1[i]] = katakana1[i];
for (let i = 0; i < kataRomaji2.length; ++i)
    romajiKata2[kataRomaji2[i]] = katakana2[i];

const romajiChars = new Set("abcdefghijkmnoprstuwyzABCDEFGHIJKMNOPRSTUWYZ");
const smallKana = new Set(["ゃ", "ゅ", "ょ", "ャ", "ュ", "ョ"]);
const singleRomaji = new Set("aeioun");


// TODO: Can this create strings like "hon'i"?
String.prototype.toRomaji = function() {
    const string = this.toLowerCase();
    let converted = [];
    for (let i = 0; i < string.length; ++i) {
        // Treat compounds specially
        if (smallKana.has(string[i]) && i !== 0) {
            const composition = string[i - 1] + string[i];
            if (hiraRepl2.hasOwnProperty(composition))
                converted.push(hiraRepl2[composition]);
            else if (kataRepl2.hasOwnProperty(composition))
                converted.push(kataRepl2[composition]);
        }
        // Convert single kana
        else if ((hiraRepl1.hasOwnProperty(string[i]) ||
                  kataRepl1.hasOwnProperty(string[i])) &&
                 !(i !== string.length - 1 && smallKana.has(string[i + 1]))) {
            if (hiraRepl1.hasOwnProperty(string[i]))
                converted.push(hiraRepl1[string[i]]);
            else if (kataRepl1.hasOwnProperty(string[i]))
                converted.push(kataRepl1[string[i]]);
        }
        // Also allow dots and characters used for romaji
        else if (string[i] === "." || romajiChars.has(string[i])) {
            converted.push(string[i]);
        }
    }
    converted = converted.join("");
    const finalString = [];
    // Treat double consonants
    for (let i = 0; i < converted.length; ++i) {
        if (converted[i] === "っ" || converted[i] === "ッ") {
            if (i !== converted.length - 1)
                finalString.push(converted[i + 1]);
            else
                finalString.push("t");
        } else {
            finalString.push(converted[i]);
        }
    }
    return finalString.join("");
}

String.prototype.toKana = function(type, ignoreN) {
    const dict1 = type === "hira" ? romajiHira1 : romajiKata1;
    const dict2 = type === "hira" ? romajiHira2 : romajiKata2;
    const string = this.toLowerCase().trim();
    const converted = [];
    let i = 0;
    while (i < string.length) {
        // Check whether there is an n with apostrophe
        if (i < string.length - 1 && string.slice(i, i + 2) === "n'") {
            converted.push(type === "hira" ? "ん" : "ン");
            ++i;
        }
        // Check if we have duplicate letters
        else if (i < string.length - 1 && string[i] !== "n" &&
                 string[i] === string[i + 1] && romajiChars.has(string[i])) {
            converted.push(type === "hira" ? "っ" : "ッ");
        }
        // Check for 3-letter compounds
        else if (i < string.length - 2 &&
                 dict2.hasOwnProperty(string.slice(i, i + 3))) {
            converted.push(dict2[string.slice(i, i + 3)]);
            i += 2;
        }
        // Check for 2-letter compounds
        else if (i < string.length - 1 &&
                 dict2.hasOwnProperty(string.slice(i, i + 2))) {
            converted.push(dict2[string.slice(i, i + 2)]);
            ++i;
        }
        // Check for single kana with 3 romaji letters
        else if (i < string.length - 2 &&
                 dict1.hasOwnProperty(string.slice(i, i + 3))) {
            converted.push(dict1[string.slice(i, i + 3)]);
            i += 2;
        }
        // Check for single kana with 2 romaji letters
        else if (i < string.length - 1 &&
                 dict1.hasOwnProperty(string.slice(i, i + 2))) {
            converted.push(dict1[string.slice(i, i + 2)]);
            ++i;
        }
        // If "n" is being ignored, just append it
        else if (ignoreN && string[i] === "n") {
            converted.push(string[i]);
        }
        // Check for single kana with 1 romaji letter
        else if (singleRomaji.has(string[i])) {
            converted.push(dict1[string[i]]);
        }
        // Replace minus or underscore with "ー" when writing katakana
        else if (type === "kata" && (string[i] === "-" || string[i] === "_")) {
            converted.push("ー");
        }
        // Anything else simply gets appended
        else {
            converted.push(string[i]);
        }
        ++i;
    }
    return converted.join("");
}

function kanaInput(input, type, event) {
    const pos = input.selectionStart;
    let text = input.value.toLowerCase();
    const key = event.key.toLowerCase();
    let replaced = false;
    if (key === "n" && pos > 0 && text[pos - 1] === "n") {
        text = text.slice(0, pos - 1) +
               (type === "hira" ? "ん" : "ン") +
               text.slice(pos);
        replaced = true;
    } else if (romajiChars.has(key) || key === "-" || key === "_") {
        text = text.slice(0, pos) + key + text.slice(pos);
    } else {
        return;
    }
    input.value = text.toKana(type, true);
    const newPos = pos + 1 - (text.length - input.value.length) - replaced;
    event.preventDefault();
    input.setSelectionRange(newPos, newPos);
}

HTMLInputElement.prototype.enableKanaInput =
HTMLTextAreaElement.prototype.enableKanaInput = function(type) {
    if (this.currentInputMethod !== undefined)
        this.disableKanaInput();
    const otherType = type === "hira" ? "kata" : "hira";
    this.currentInputMethod = (event) => {
        kanaInput(this, event.shiftKey ? otherType : type, event);
    };
    this.addEventListener("keypress", this.currentInputMethod);
}

HTMLInputElement.prototype.disableKanaInput =
HTMLTextAreaElement.prototype.disableKanaInput = function() {
    if (this.currentInputMethod !== undefined) {
        this.removeEventListener("keypress", this.currentInputMethod);
        this.currentInputMethod = undefined;
    }
}

// Function for converting text in HTMLElements with "contenteditable".
// This requires the shadow root as parameter in order to get current selection.
function kanaInputRoot(input, type, root, event) {
    const { anchorOffset: pos, anchorNode: node } = root.getSelection();
    let text = input.textContent;
    let replaced = false;
    if (event.key === "n" && pos > 0 && text[pos - 1] === "n") {
        text = text.slice(0, pos - 1) +
               (type === "hira" ? "ん" : "ン") +
               text.slice(pos);
        replaced = true;
    } else if (romajiChars.has(event.key)) {
        text = text.slice(0, pos) + event.key + text.slice(pos);
    } else {
        return;
    }
    input.textContent = text.toKana(type, true);
    const newPos =
        pos + 1 - (text.length - input.textContent.length) - replaced;
    const newTextNode = input.firstChild;
    const range = document.createRange();
    range.setStart(newTextNode, newPos);
    range.setEnd(newTextNode, newPos);
    const selection = root.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    event.preventDefault();
}

HTMLElement.prototype.enableKanaInput = function(type, root) {
    if (this.currentInputMethod !== undefined)
        this.disableKanaInput();
    this.currentInputMethod = (event) => kanaInputRoot(this, type, root, event);
    this.addEventListener("keypress", this.currentInputMethod);
}

HTMLElement.prototype.disableKanaInput = function() {
    if (this.currentInputMethod !== undefined) {
        this.removeEventListener("keypress", this.currentInputMethod);
        this.currentInputMethod = undefined;
    }
}
