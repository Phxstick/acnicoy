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
            case test.mode.KANJI_MEANINGS: return "kanji_meanings";
            case test.mode.KANJI_ON_YOMI: return "kanji_on_yomi";
            case test.mode.KANJI_KUN_YOMI: return "kanji_kun_yomi";
        }
    };

    test.modeToColumn = function (mode) {
        switch (mode) {
            case test.mode.WORDS: return "word";
            case test.mode.KANJI_MEANINGS:
            case test.mode.KANJI_ON_YOMI:
            case test.mode.KANJI_KUN_YOMI:
                return "kanji";
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

    test.getExtendedSolutions = function (item, mode, part) {
        return test.getSolutions(item, mode, part).then((result) => {
            const solutions = new Set(result);
            const originalSolutions = new Set(result);
            // If the language is English, make solutions without "to" count
            if (modules.currentSecondaryLanguage === "English") {
                for (const solution of originalSolutions) {
                    if (solution.startsWith("to "))
                        solutions.add(solution.slice(3));
                }
            }
            // Also ignore braces and their content for the solutions
            const pattern = /\(.*?\)/g;
            const temp = new Set(solutions);
            for (const solution of temp) {
                solutions.add(solution.replace(pattern, "").trim());
            }
            return solutions;
        });
    }

    test.setLanguage = function (language) {
        test.modes = test.modesForLanguage(language);
    };

    test.modesForLanguage = function (language) {
        if (language === "Japanese") {
            return [test.mode.WORDS, test.mode.KANJI_MEANINGS,
                    test.mode.KANJI_ON_YOMI, test.mode.KANJI_KUN_YOMI];
        } else {
            return [test.mode.WORDS];
        }
    };

    test.getNewLevel = function (oldLevel, isCorrect) {
        if (isCorrect) {
            return oldLevel + 1;
        } else {
            return Math.max(1, oldLevel - 1);
        }
    }

    return test;
};
