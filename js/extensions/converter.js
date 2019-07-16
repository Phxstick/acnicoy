"use strict";

/*
 *  This module extends String, HTMLInputElement and HTMLTextAreaElement and
 *  HTMLElements with text conversion from/to hiragana, katakana and pinyin.
 */

HTMLInputElement.prototype.disableInputConversion =
HTMLTextAreaElement.prototype.disableInputConversion = function () {
    if (this.currentInputHandler !== undefined) {
        this.removeEventListener("keypress", this.currentInputHandler);
        this.currentInputHandler = undefined;
        this.currentInputMethod = undefined;
    }
}

// ============================================================================
//   Methods to convert between romaji and kana
// ============================================================================

const singleHiragana = [];
for (let charCode = 12353; charCode < 12439; ++charCode)
    singleHiragana.push(String.fromCharCode(charCode));
const hiraganaCompounds = [
    "きゃ", "きゅ", "きょ", "ぎゃ", "ぎゅ", "ぎょ",
    "しゃ", "しゅ", "しょ", "じゃ", "じゅ", "じょ",
    "ちゃ", "ちゅ", "ちょ",
    "にゃ", "にゅ", "にょ",
    "ひゃ", "ひゅ", "ひょ", "びゃ", "びゅ", "びょ", "ぴゃ", "ぴゅ", "ぴょ",
    "みゃ", "みゅ", "みょ",
    "にゃ", "にゅ", "にょ",
    "りゃ", "りゅ", "りょ"
];
const singleHiraganaRomaji = [
    "xa", "a", "xi", "i", "xu", "u", "xe", "e", "xo", "o",
    "ka", "ga", "ki", "gi", "ku", "gu", "ke", "ge", "ko", "go",
    "sa", "za", "shi", "ji", "su", "zu", "se", "ze", "so", "zo",
    "ta", "da", "chi", "di", "xtsu", "tsu", "du", "te", "de", "to", "do",
    "na", "ni", "nu", "ne", "no",
    "ha", "ba", "pa", "hi", "bi", "pi", "fu", "bu", "pu", "he", "be", "pe",
    "ho", "bo", "po",
    "ma", "mi", "mu", "me", "mo",
    "xya", "ya", "xyu", "yu", "xyo", "yo",
    "ra", "ri", "ru", "re", "ro",
    "xwa", "wa", "wi", "we", "wo",
    "n", "ゔ", "xka", "xke"
];
const hiraganaCompoundsRomaji = [
    "kya", "kyu", "kyo", "gya", "gyu", "gyo",
    "sha", "shu", "sho", "ja", "ju", "jo",
    "cha", "chu", "cho",
    "nya", "nyu", "nyo",
    "hya", "hyu", "hyo", "bya", "byu", "byo", "pya", "pyu", "pyo",
    "mya", "myu", "myo",
    "nya", "nyu", "nyo",
    "rya", "ryu", "ryo"
];
const singleHiraganaToRomaji = {};
const hiraganaCompoundsToRomaji = {};
const romajiToSingleHiragana = {};
const romajiToHiraganaCompounds = {};
for (let i = 0; i < singleHiragana.length; ++i)
    singleHiraganaToRomaji[singleHiragana[i]] = singleHiraganaRomaji[i];
for (let i = 0; i < hiraganaCompounds.length; ++i)
    hiraganaCompoundsToRomaji[hiraganaCompounds[i]] = hiraganaCompoundsRomaji[i]
for (let i = 0; i < singleHiraganaRomaji.length; ++i)
    romajiToSingleHiragana[singleHiraganaRomaji[i]] = singleHiragana[i];
for (let i = 0; i < hiraganaCompoundsRomaji.length; ++i)
    romajiToHiraganaCompounds[hiraganaCompoundsRomaji[i]] = hiraganaCompounds[i]

const singleKatakana = [];
for (let charCode = 12449; charCode < 12539; ++charCode)
    singleKatakana.push(String.fromCharCode(charCode));
const katakanaCompounds = [
    "キャ", "キュ", "キョ", "ギャ", "ギュ", "ギョ",
    "シャ", "シュ", "ショ", "ジャ", "ジュ", "ジョ",
    "チャ", "チュ", "チョ",
    "ニャ", "ニュ", "ニョ",
    "ヒャ", "ヒュ", "ヒョ", "ビャ", "ビュ", "ビョ", "ピャ", "ピュ", "ピョ",
    "ミャ", "ミュ", "ミョ",
    "ニャ", "ニュ", "ニョ",
    "リャ", "リュ", "リョ",
    
    "ファ", "フェ", "フィ", "フォ",
    "ヴァ", "ヴェ", "ヴィ", "ヴォ",
    "ツァ", "チェ", "ティ", "トゥ", "ディ", "デュ",
    "シェ", "ジェ",
    "ウェ", "ウォ", "ウィ"
];
const singleKatakanaRomaji = [
    "xa", "a", "xi", "i", "xu", "u", "xe", "e", "xo", "o",
    "ka", "ga", "ki", "gi", "ku", "gu", "ke", "ge", "ko", "go",
    "sa", "za", "shi", "ji", "su", "zu", "se", "ze", "so", "zo",
    "ta", "da", "chi", "di", "xtsu", "tsu", "du", "te", "de", "to", "do",
    "na", "ni", "nu", "ne", "no",
    "ha", "ba", "pa", "hi", "bi", "pi", "fu", "bu", "pu", "he", "be", "pe",
    "ho", "bo", "po",
    "ma", "mi", "mu", "me", "mo",
    "xya", "ya", "xyu", "yu", "xyo", "yo",
    "ra", "ri", "ru", "re", "ro",
    "xwa", "wa", "wi", "we", "wo",
    "n", "ヴ", "xka", "xke", "va", "vi", "ve", "vo"
];
const katakanaCompoundsRomaji = [
    "kya", "kyu", "kyo", "gya", "gyu", "gyo",
    "sha", "shu", "sho", "ja", "ju", "jo",
    "cha", "chu", "cho",
    "nya", "nyu", "nyo",
    "hya", "hyu", "hyo", "bya", "byu", "byo", "pya", "pyu", "pyo",
    "mya", "myu", "myo",
    "nya", "nyu", "nyo",
    "rya", "ryu", "ryo",

    "fa", "fe", "fi", "fo",
    "va", "ve", "vi", "vo",
    "tsa", "che", "thi", "tu", "dhi", "dyu",
    "she", "je",
    "we", "wo", "wi"
];
const singleKatakanaToRomaji = {};
const katakanaCompoundsToRomaji = {};
const romajiToSingleKatakana = {};
const romajiToKatakanaCompounds = {};
for (let i = 0; i < singleKatakana.length; ++i)
    singleKatakanaToRomaji[singleKatakana[i]] = singleKatakanaRomaji[i];
for (let i = 0; i < katakanaCompounds.length; ++i)
    katakanaCompoundsToRomaji[katakanaCompounds[i]] = katakanaCompoundsRomaji[i]
for (let i = 0; i < singleKatakanaRomaji.length; ++i)
    romajiToSingleKatakana[singleKatakanaRomaji[i]] = singleKatakana[i];
for (let i = 0; i < katakanaCompoundsRomaji.length; ++i)
    romajiToKatakanaCompounds[katakanaCompoundsRomaji[i]] = katakanaCompounds[i]

const romajiChars = new Set("abcdefghijkmnoprstuwyzABCDEFGHIJKMNOPRSTUWYZ");
const smallKana = new Set("ゃゅょャュョ");
const kanaVowels = new Set("あえいおうアエイオウ");
const yRowKana = new Set("やゆよヤユヨ");
const singleRomaji = new Set("aeioun");


String.prototype.toRomaji = function() {
    const string = this.toLowerCase();
    let converted = [];
    let i = 0;
    while (i < string.length) {
        // Treat compounds specially
        if (i !== string.length - 1 && smallKana.has(string[i + 1]) &&
              (hiraganaCompoundsToRomaji.hasOwnProperty(string.slice(i,i+2)) ||
               katakanaCompoundsToRomaji.hasOwnProperty(string.slice(i,i+2)))) {
            const composition = string[i] + string[i + 1];
            if (hiraganaCompoundsToRomaji.hasOwnProperty(composition))
                converted.push(hiraganaCompoundsToRomaji[composition]);
            else if (katakanaCompoundsToRomaji.hasOwnProperty(composition))
                converted.push(katakanaCompoundsToRomaji[composition]);
            ++i;
        }
        //  Skip "っ" or "ッ" (convert later) unless it's at the end
        else if (i !== string.length - 1 &&
                (string[i] === "っ" || string[i] === "ッ")) {
            converted.push(string[i]);
            ++i;
            continue;
        }
        // Insert 'n' + apostrophe when encountering "ん"/"ン" + vowel/yRowKana
        else if ((string[i] === "ん" || string[i] === "ン" ) &&
                i !== string.length - 1 && (kanaVowels.has(string[i + 1]) ||
                yRowKana.has(string[i + 1]))) {
            converted.push("n", "'");
        }
        // Convert single kana
        else if ((singleHiraganaToRomaji.hasOwnProperty(string[i]) ||
                  singleKatakanaToRomaji.hasOwnProperty(string[i]))) {
            if (singleHiraganaToRomaji.hasOwnProperty(string[i]))
                converted.push(singleHiraganaToRomaji[string[i]]);
            else if (singleKatakanaToRomaji.hasOwnProperty(string[i]))
                converted.push(singleKatakanaToRomaji[string[i]]);
        }
        // Convert "ー" to hyphen when writing katakana
        else if (string[i] === "ー") {
            converted.push("-");
        }
        // Also allow dots and characters used for romaji
        else if (string[i] === "." || romajiChars.has(string[i])) {
            converted.push(string[i]);
        }
        ++i;
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

String.prototype.toKana = function (type, ignoreN) {
    const romajiToSingleKana = type === "hiragana" ?
        romajiToSingleHiragana : romajiToSingleKatakana;
    const romajiToCompounds = type === "hiragana" ?
        romajiToHiraganaCompounds : romajiToKatakanaCompounds;
    const string = this.toLowerCase().trim();
    const converted = [];
    let i = 0;
    while (i < string.length) {
        // Check whether there is an n with apostrophe
        if (i < string.length - 1 && string.slice(i, i + 2) === "n'") {
            converted.push(type === "hiragana" ? "ん" : "ン");
            ++i;
        }
        // Check if we have duplicate letters (which can't stand alone)
        else if (i < string.length - 1 && string[i] === string[i + 1] &&
                romajiChars.has(string[i]) && !singleRomaji.has(string[i])) {
            converted.push(type === "hiragana" ? "っ" : "ッ");
        }
        // Check for 3-letter compounds
        else if (i < string.length - 2 &&
                 romajiToCompounds.hasOwnProperty(string.slice(i, i + 3))) {
            converted.push(romajiToCompounds[string.slice(i, i + 3)]);
            i += 2;
        }
        // Check for 2-letter compounds
        else if (i < string.length - 1 &&
                 romajiToCompounds.hasOwnProperty(string.slice(i, i + 2))) {
            converted.push(romajiToCompounds[string.slice(i, i + 2)]);
            ++i;
        }
        // Check for single kana with 4 romaji letters (only 'xtsu')
        else if (i < string.length - 3 &&
                 romajiToSingleKana.hasOwnProperty(string.slice(i, i + 4))) {
            converted.push(romajiToSingleKana[string.slice(i, i + 4)]);
            i += 3;
        }
        // Check for single kana with 3 romaji letters
        else if (i < string.length - 2 &&
                 romajiToSingleKana.hasOwnProperty(string.slice(i, i + 3))) {
            converted.push(romajiToSingleKana[string.slice(i, i + 3)]);
            i += 2;
        }
        // Check for single kana with 2 romaji letters
        else if (i < string.length - 1 &&
                 romajiToSingleKana.hasOwnProperty(string.slice(i, i + 2))) {
            converted.push(romajiToSingleKana[string.slice(i, i + 2)]);
            ++i;
        }
        // If "n" is being ignored, just append it
        else if (ignoreN && string[i] === "n") {
            converted.push(string[i]);
        }
        // Check for single kana with 1 romaji letter
        else if (singleRomaji.has(string[i])) {
            converted.push(romajiToSingleKana[string[i]]);
        }
        // Replace minus or underscore with "ー" when writing katakana
        else if (type === "katakana" &&
                (string[i] === "-" || string[i] === "_")) {
            converted.push("ー");
        }
        // Replace non-breaking space (\u160) with a normal space (\u32)
        else if (string.codePointAt(i) === 160) {
            converted.push(" ");
        }
        // Anything else simply gets appended
        else {
            converted.push(string[i]);
        }
        ++i;
    }
    return converted.join("");
}

function kanaInput(type, event) {
    const input = event.target;
    const pos = input.selectionStart;
    const end = input.selectionEnd;
    // If there's a selection, delete selected text first
    if (pos !== end) {
        const text = input.value;
        input.value = text.slice(0, pos) + text.slice(end, text.length);
    }
    // Do conversion for the remaining text
    let text = input.value.toLowerCase();
    const key = event.key.toLowerCase();
    let replaced = false;
    if (key === "n" && pos > 0 && text[pos - 1] === "n") {
        text = text.slice(0, pos - 1) +
               (type === "hiragana" ? "ん" : "ン") +
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
HTMLTextAreaElement.prototype.enableKanaInput = function (type="hiragana") {
    if (this.currentInputHandler !== undefined)
        this.removeEventListener("keypress", this.currentInputHandler);
    this.currentInputMethod = type;
    const otherType = type === "hiragana" ? "katakana" : "hiragana";
    this.currentInputHandler = (event) =>
            kanaInput(event.shiftKey ^ event.getModifierState("CapsLock") ?
                      otherType : type, event);
    this.addEventListener("keypress", this.currentInputHandler);
}

HTMLInputElement.prototype.disableKanaInput =
HTMLTextAreaElement.prototype.disableKanaInput = function () {
    if (this.currentInputMethod === "hiragana" ||
            this.currentInputMethod === "katakana") {
        this.removeEventListener("keypress", this.currentInputHandler);
        this.currentInputHandler = undefined;
        this.currentInputMethod = undefined;
    }
}

HTMLInputElement.prototype.toggleKanaInput =
HTMLTextAreaElement.prototype.toggleKanaInput = function(bool, type="hiragana"){
    if (bool) this.enableKanaInput(type);
    else this.disableKanaInput();
}

// Function for converting text in HTMLElements with "contenteditable".
// This requires the shadow root as parameter in order to get current selection.
function kanaInputRoot(type, root, event) {
    const input = event.target;
    const { anchorOffset: pos, anchorNode: node } = root.getSelection();
    let text = input.textContent.toLowerCase();
    let key = event.key.toLowerCase();
    let replaced = false;
    if (key === "n" && pos > 0 && text[pos - 1] === "n") {
        text = text.slice(0, pos - 1) +
               (type === "hiragana" ? "ん" : "ン") +
               text.slice(pos);
        replaced = true;
    } else if (romajiChars.has(key) || key === "-" || key === "_") {
        text = text.slice(0, pos) + key + text.slice(pos);
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

HTMLElement.prototype.enableKanaInput = function (type="hiragana") {
    if (this.currentInputHandler !== undefined)
        this.removeEventListener("keypress", this.currentInputHandler);
    this.currentInputMethod = type;
    const otherType = type === "hiragana" ? "katakana" : "hiragana";
    const root = this.getRoot();
    this.currentInputHandler = (event) =>
        kanaInputRoot(event.shiftKey ^ event.getModifierState("CapsLock") ?
            otherType : type, root, event)
    this.addEventListener("keypress", this.currentInputHandler);
}

HTMLElement.prototype.disableKanaInput = function () {
    if (this.currentInputMethod === "hiragana" ||
            this.currentInputMethod === "katakana") {
        this.removeEventListener("keypress", this.currentInputHandler);
        this.currentInputHandler = undefined;
        this.currentInputMethod = undefined;
    }
}

HTMLElement.prototype.toggleKanaInput = function (bool, type="hiragana") {
    if (bool) this.enableKanaInput(type);
    else this.disableKanaInput();
}

// ============================================================================
//   Pinyin input methods
// ============================================================================

const charsForPinyin =
    new Set("1234abcdefghijklmnopqrstuwxyzüABCDEFGHIJKLMNOPQRSTUWXYZÜ");

const onlyVowelSyllables = new Set([
    "a", "ai", "ao", "an", "ang", "e", "ei", "en", "eng", "er", "o", "ou", "yi",
    "ya", "yao", "ye", "you", "yan", "yang", "yin", "ying", "yong", "wu", "wa",
    "wai", "wei", "wo", "wan", "wang", "wen", "weng", "yu", "yue", "yuan", "yun"
]);
const pinyinInitials =
    new Set(["sh", "ch", "za", ..."bpmfdtnlzcsrjqxgkh".split("")]);
const pinyinFinals = new Set([
    "iang", "iong", "uang",
    "ang", "eng", "ong", "iao", "ian", "ing", "uai", "uan", "üan",
    "ai", "ao", "an", "ou", "ei", "en", "ia", "ie", "iu", "in", "ua", "uo",
    "ui", "un", "üe", "ün",
    "a", "o", "e", "i", "u", "ü"
]);
const accentCodes = new Set(["1", "2", "3", "4"]);

const accentedVowels = {
    "a": { "1": "ā", "2": "á", "3": "ǎ", "4": "à" },
    "e": { "1": "ē", "2": "é", "3": "ě", "4": "è" },
    "i": { "1": "ī", "2": "í", "3": "ǐ", "4": "ì" },
    "o": { "1": "ō", "2": "ó", "3": "ǒ", "4": "ò" },
    "u": { "1": "ū", "2": "ú", "3": "ǔ", "4": "ù" },
    "ü": { "1": "ǖ", "2": "ǘ", "3": "ǚ", "4": "ǜ" }, 

    "A": { "1": "Ā", "2": "Á", "3": "Ǎ", "4": "À" },
    "E": { "1": "Ē", "2": "É", "3": "Ě", "4": "È" },
    "I": { "1": "Ī", "2": "Í", "3": "Ǐ", "4": "Ì" },
    "O": { "1": "Ō", "2": "Ó", "3": "Ǒ", "4": "Ò" },
    "U": { "1": "Ū", "2": "Ú", "3": "Ǔ", "4": "Ù" },
    "Ü": { "1": "Ǖ", "2": "Ǘ", "3": "Ǚ", "4": "Ǜ" }
};

const accentPositions = {
    "er": 0,
    "yi": 1,
    "ya": 1,
    "yao": 1,
    "ye": 1,
    "you": 1,
    "yan": 1,
    "yang": 1,
    "yin": 1,
    "ying": 1,
    "yong": 1,
    "wu": 1,
    "wa": 1,
    "wai": 1,
    "wei": 1,
    "wo": 1,
    "wan": 1,
    "wang": 1,
    "wen": 1,
    "weng": 1,
    "yu": 1,
    "yue": 2,
    "yuan": 2,
    "yun": 1,

    "a": 0,
    "o": 0,
    "e": 0,
    "i": 0,
    "u": 0,
    "ü": 0,
    "ai": 0,
    "ao": 0,
    "an": 0,
    "ou": 0,
    "ei": 0,
    "en": 0,
    "ia": 1,
    "ie": 1,
    "iu": 1,
    "in": 0,
    "ua": 1,
    "uo": 1,
    "ui": 1,
    "un": 0,
    "üe": 1,
    "ün": 0,
    "ang": 0,
    "eng": 0,
    "ong": 0,
    "iao": 1,
    "ian": 1,
    "ing": 0,
    "uai": 1,
    "uan": 1,
    "üan": 1,
    "iang": 1,
    "iong": 1,
    "uang": 1
};

const syllableToAccentedSyllable = new Map();
const accentedSyllables = new Set();

// TODO: Don't convert non-existing combinations of initials and finals here
for (const initial of pinyinInitials) {
    for (const final of pinyinFinals) {
        const syllable = initial + final;
        syllableToAccentedSyllable.set(syllable, {});
        for (const accentCode of accentCodes) {
            const vowel = final[accentPositions[final]];
            const accentedFinal =
                final.replace(vowel, accentedVowels[vowel][accentCode]);
            const accentedSyllable = initial + accentedFinal;
            syllableToAccentedSyllable.get(syllable)[accentCode] =
                accentedSyllable;
            accentedSyllables.add(accentedSyllable);
        }
    }
}
for (const syllable of onlyVowelSyllables) {
    syllableToAccentedSyllable.set(syllable, {});
    for (const accentCode of accentCodes) {
        const vowel = syllable[accentPositions[syllable]];
        const accentedSyllable =
            syllable.replace(vowel, accentedVowels[vowel][accentCode]);
        syllableToAccentedSyllable.get(syllable)[accentCode] = accentedSyllable;
        accentedSyllables.add(accentedSyllable);
    }
}
// Allow some conversion from "ue" to "ü"
syllableToAccentedSyllable.set("nue", {});
syllableToAccentedSyllable.set("lue", {});
syllableToAccentedSyllable.set("nuee", {});
syllableToAccentedSyllable.set("luee", {});
for (const accentCode of accentCodes) {
    const accentedUe = accentedVowels["ü"][accentCode];
    syllableToAccentedSyllable.get("nue")[accentCode] = "n" + accentedUe;
    syllableToAccentedSyllable.get("lue")[accentCode] = "l" + accentedUe;
    syllableToAccentedSyllable.get("nuee")[accentCode] = "n" + accentedUe + "e";
    syllableToAccentedSyllable.get("luee")[accentCode] = "l" + accentedUe + "e";
}

String.prototype.toPinyin = function () {
    const string = this.toLowerCase().trim();
    const converted = [];
    let i = 0;
    while (i < string.length) {
        let processed = false;
        // Skip already converted syllables
        for (let l = 6; l >= 1; --l) {
            const syllable = string.slice(i, i + l);
            if (accentedSyllables.has(syllable)) {
                converted.push(syllable);
                i += l;
                processed = true;
                break;
            }
        }
        if (processed) continue;
        // Convert maximal syllables
        for (let l = 6; l >= 1; --l) {
            const syllable = string.slice(i, i + l);
            if (syllableToAccentedSyllable.has(syllable)) {
                const accentCode = string.slice(i + l, i + l + 1);
                if (accentCodes.has(accentCode)) {
                    converted.push(
                        syllableToAccentedSyllable.get(syllable)[accentCode]);
                    ++i;
                } else {
                    // Convert "ue" to "ü" in valid syllables
                    if (syllable === "nue" || syllable === "lue" ||
                            syllable === "nuee" || syllable === "luee") {
                        converted.push(syllable.replace("ue", "ü"));
                    } else {
                        converted.push(syllable);
                    }
                }
                i += l;
                processed = true;
                break;
            }
        }
        if (processed) continue;
        // If no syllables have been matched, just append the next character
        converted.push(string[i]);
        ++i;
    }
    return converted.join("");
}

function pinyinInput(event) {
    const input = event.target;
    const pos = input.selectionStart;
    const end = input.selectionEnd;
    // If there's a selection, delete selected text first
    if (pos !== end) {
        const text = input.value;
        input.value = text.slice(0, pos) + text.slice(end, text.length);
    }
    // Do conversion for the remaining text
    const key = event.key.toLowerCase();
    if (!charsForPinyin.has(key)) return;
    let text = input.value.toLowerCase();
    text = text.slice(0, pos) + key + text.slice(pos);
    input.value = text.toPinyin();
    const newPos = pos + 1 - (text.length - input.value.length);
    event.preventDefault();
    input.setSelectionRange(newPos, newPos);
}

HTMLInputElement.prototype.enablePinyinInput =
HTMLTextAreaElement.prototype.enablePinyinInput = function () {
    if (this.currentInputHandler !== undefined)
        this.removeEventListener("keypress", this.currentInputHandler);
    this.currentInputMethod = "pinyin";
    this.currentInputHandler = pinyinInput;
    this.addEventListener("keypress", this.currentInputHandler);
}

HTMLInputElement.prototype.disablePinyinInput =
HTMLTextAreaElement.prototype.disablePinyinInput = function() {
    if (this.currentInputMethod === "pinyin") {
        this.removeEventListener("keypress", this.currentInputHandler);
        this.currentInputHandler = undefined;
        this.currentInputMethod = undefined;
    }
}

HTMLInputElement.prototype.togglePinyinInput =
HTMLTextAreaElement.prototype.togglePinyinInput = function(bool) {
    if (bool) this.enablePinyinInput();
    else this.disablePinyinInput();
}


// Function for converting text in HTMLElements with "contenteditable".
// This requires the shadow root as parameter in order to get current selection.
function pinyinInputRoot(root, event) {
    const input = event.target;
    const { anchorOffset: pos, anchorNode: node } = root.getSelection();
    const key = event.key.toLowerCase();
    if (!charsForPinyin.has(key)) return;
    let text = input.textContent;
    text = text.slice(0, pos) + key + text.slice(pos);
    input.textContent = text.toPinyin();
    const newPos =
        pos + 1 - (text.length - input.textContent.length);
    const newTextNode = input.firstChild;
    const range = document.createRange();
    range.setStart(newTextNode, newPos);
    range.setEnd(newTextNode, newPos);
    const selection = root.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    event.preventDefault();
}

HTMLElement.prototype.enablePinyinInput = function () {
    if (this.currentInputHandler !== undefined)
        this.removeEventListener("keypress", this.currentInputHandler);
    this.currentInputMethod = "pinyin";
    const root = this.getRoot();
    this.currentInputHandler = (event) => pinyinInputRoot(root, event);
    this.addEventListener("keypress", this.currentInputHandler);
}

HTMLElement.prototype.disablePinyinInput = function () {
    if (this.currentInputMethod === "pinyin") {
        this.removeEventListener("keypress", this.currentInputHandler);
        this.currentInputHandler = undefined;
        this.currentInputMethod = undefined;
    }
}

HTMLElement.prototype.togglePinyinInput = function (bool) {
    if (bool) this.enablePinyinInput();
    else this.disablePinyinInput();
}
