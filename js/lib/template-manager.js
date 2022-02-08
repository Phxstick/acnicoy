"use strict";

const fs = require("fs");
const Handlebars = require("handlebars");

const templates = new Map();

/**
**  Return template with given name. Load it if it's not registered yet.
**/
module.exports.get = function (name) {
    if (!templates.has(name)) {
        const source = fs.readFileSync(paths.template(name), "utf-8");
        templates.set(name, Handlebars.compile(source));
    }
    return templates.get(name);
};

/**
**  Register a bunch of handlebars helpers.
**/

Handlebars.registerHelper("eachLetter", function(word) {
    let html = "";
    for (const letter of word) {
        html += `<span>${letter}</span>`;
    }
    return new Handlebars.SafeString(html);
});

// Function used in the handlebars helper below
function transformWord(wordArray) {
    const newWordArray = []
    let latinPart = ""
    for (const char of wordArray) {
        if ("a" <= char.toLowerCase() && char.toLowerCase() <= "z") {
            latinPart += char
        } else {
            if (latinPart.length > 0) {
                newWordArray.push(latinPart)
                latinPart = ""
            }
            newWordArray.push(char)
        }
    } 
    if (latinPart.length > 0) {
        newWordArray.push(latinPart)
        latinPart = ""
    }
    return newWordArray
}

Handlebars.registerHelper("eachHanziWithPinyin",
        function(word, pinyin, colorByTones) {
    let html = "";
    /*
      String needs to be converted to an array, because JS strings use UTF-16
      instead of UTF-8 codepoints, so some Chinese characters are counted as 2
      characters. 181 dictionary entries are affected by this currently.
    */
    let wordArray = [...word]
    /*
      Check if the number of pinyin match the number of characters in the word.
      This is not the case in multiple edge cases:
      - 12 entries are single-character equivalents of 2-character words
        (pinyin still contains 2 syllables in that case)
      - About 34 entries have "xx" as pinyin for a single character (e.g.
        some of them are Korean or Japanese variants)
      - (... some other edge cases ...)
    */
    if (wordArray.length !== pinyin.length) {
        /*
          If the number doesn't match, treat sequences of latin letters
          in the word as a single instance and compare length again
          (useful for a few words like "小case", "打call", "母胎solo")
        */
        const newWordArray = transformWord(wordArray)
        if (newWordArray.length !== pinyin.length) {
            for (const letter of wordArray) {
                html += `<span>${letter}</span>`;
            }
            return new Handlebars.SafeString(html);
        } else {
            wordArray = newWordArray
        }
    }
    for (let i = 0; i < wordArray.length; ++i) {
        const classes = colorByTones ? ` class="tone${pinyin[i].tone}"` : ""
        html += `<span${classes}>${wordArray[i]}</span>`;
    }
    return new Handlebars.SafeString(html);
});

const refRegex = /\[([^\]]*?)\]/g

// Helper for converting references in the Chinese dictionary
Handlebars.registerHelper("convertRefs", function(text, useTrad) {
    const matches = text.matchAll(refRegex)
    if (matches.length === 0) return text
    let html = ""
    let i = 0
    for (const match of matches) {
        const startIndex = match.index
        const endIndex = match.index + match[0].length
        if (startIndex - i > 0) {
            html += `<span>${text.slice(i, startIndex)}</span>`
        }
        const [trad, simp, pinyin] = match[1].split("|")
        if (trad.length > 0) {
            html += `<a class='link dict-ref' ` +
                `data-trad='${trad}' data-simp='${simp}' ` +
                `data-pinyin='${pinyin}'>${useTrad ? trad : simp}</a>`
        } else {
            // References of the form "also pr. ..." contain only pinyin
            const [convPinyin, tones] =
                pinyin.toPinyin({ separate: true, includeTones: true })
            html += "<span>"
            for (let i = 0; i < convPinyin.length; ++i) {
                html += `<span class="tone${tones[i]}">${convPinyin[i]}</span>`
            }
            html += "</span>"
        }
        i = endIndex
    }
    if (i < text.length) {
        html += `<span>${text.slice(i, text.length)}</span>`
    }
    return new Handlebars.SafeString(html)
});

Handlebars.registerHelper("join", function(words, separator) {
    return words.join(separator);
});

Handlebars.registerHelper("inc", function(number, amount) {
    return parseInt(number) + amount;
});

// Block helpers from here on

Handlebars.registerHelper("ifLargerThanOne", function(length, options) {
    return length > 1 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("equal", function(a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
});
