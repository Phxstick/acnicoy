"use strict";

let vocab;
let kanji;

module.exports.internals = {
    set vocab(obj) { vocab = obj; },
    set kanji(obj) { kanji = obj; }
};

module.exports.exports = {
    modes: [],

    mode: {
        WORDS: "WORDS",
        KANJI_MEANINGS: "KANJI_MEANINGS",
        KANJI_ON_YOMI: "KANJI_ON_YOMI",
        KANJI_KUN_YOMI: "KANJI_KUN_YOMI"
    },

    modeToTable: function(mode) {
        switch (mode) {
            case this.mode.WORDS: return "vocabulary";
            case this.mode.KANJI_MEANINGS: return "kanji_meanings_test";
            case this.mode.KANJI_ON_YOMI: return "kanji_on_test";
            case this.mode.KANJI_KUN_YOMI: return "kanji_kun_test";
        }
    },

    getSolutions: function(item, mode, part) {
        switch (mode) {
            case this.mode.WORDS:
                if (part === "solutions") return vocab.getTranslations(item);
                else if (part === "readings") return vocab.getReadings(item);
            case this.mode.KANJI_MEANINGS: return kanji.getMeanings(item);
            case this.mode.KANJI_ON_YOMI: return kanji.getOnYomi(item);
            case this.mode.KANJI_KUN_YOMI: return kanji.getKunYomi(item);
        }
    },

    load: function(language) {
        if (language === "Japanese")
            this.modes = [this.mode.WORDS, this.mode.KANJI_MEANINGS,
                          this.mode.KANJI_ON_YOMI, this.mode.KANJI_KUN_YOMI];
        else
            this.modes = [this.mode.WORDS];
    }
};
