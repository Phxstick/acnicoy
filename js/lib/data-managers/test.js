"use strict";

module.exports = function (paths, modules) {
    const test = {};

    test.modes = [];

    test.mode = {
        WORDS: "WORDS",
        KANJI_MEANINGS: "KANJI_MEANINGS",
        KANJI_ON_YOMI: "KANJI_ON_YOMI",
        KANJI_KUN_YOMI: "KANJI_KUN_YOMI"
    };

    test.modeToTable = function (mode) {
        switch (mode) {
            case test.mode.WORDS: return "vocabulary";
            case test.mode.KANJI_MEANINGS: return "kanji_meanings_test";
            case test.mode.KANJI_ON_YOMI: return "kanji_on_test";
            case test.mode.KANJI_KUN_YOMI: return "kanji_kun_test";
        }
    };

    test.getSolutions = function (item, mode, part) {
        switch (mode) {
            case test.mode.WORDS:
                if (part === "solutions")
                    return modules.vocab.getTranslations(item);
                else if (part === "readings")
                    return modules.vocab.getReadings(item);
            case test.mode.KANJI_MEANINGS:
                return modules.kanji.getMeanings(item);
            case test.mode.KANJI_ON_YOMI:
                return modules.kanji.getOnYomi(item);
            case test.mode.KANJI_KUN_YOMI:
                return modules.kanji.getKunYomi(item);
        }
    };

    test.setLanguage = function (language) {
        if (language === "Japanese")
            test.modes = [test.mode.WORDS, test.mode.KANJI_MEANINGS,
                          test.mode.KANJI_ON_YOMI, test.mode.KANJI_KUN_YOMI];
        else
            test.modes = [test.mode.WORDS];
    };

    return test;
};
