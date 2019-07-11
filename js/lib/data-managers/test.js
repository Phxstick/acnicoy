"use strict";

module.exports = function (paths, modules) {
    const test = {};

    test.modes = [];

    test.mode = {
        WORDS: "WORDS",
        KANJI_MEANINGS: "KANJI_MEANINGS",
        KANJI_ON_YOMI: "KANJI_ON_YOMI",
        KANJI_KUN_YOMI: "KANJI_KUN_YOMI",
        HANZI_MEANINGS: "HANZI_MEANINGS",
        HANZI_READINGS: "HANZI_READINGS"
    };

    test.modeToTable = function (mode) {
        switch (mode) {
            case test.mode.WORDS: return "vocabulary";
            case test.mode.KANJI_MEANINGS: return "kanji_meanings";
            case test.mode.KANJI_ON_YOMI: return "kanji_on_yomi";
            case test.mode.KANJI_KUN_YOMI: return "kanji_kun_yomi";
            case test.mode.HANZI_MEANINGS: return "hanzi_meanings";
            case test.mode.HANZI_READINGS: return "hanzi_readings";
        }
    };

    test.modeToColumn = function (mode) {
        switch (mode) {
            case test.mode.WORDS: return "word";
            case test.mode.KANJI_MEANINGS:
            case test.mode.KANJI_ON_YOMI:
            case test.mode.KANJI_KUN_YOMI:
                return "kanji";
            case test.mode.HANZI_MEANINGS:
            case test.mode.HANZI_READINGS:
                return "hanzi";
        }
    };

    // Note: Returned value depends on current langauge
    test.modeToParts = function (mode) {
        switch (mode) {
            case test.mode.WORDS:
                if (!modules.languageSettings.readings) return ["meanings"];
                else return ["meanings", "readings"];
            case test.mode.KANJI_MEANINGS:
            case test.mode.KANJI_ON_YOMI:
            case test.mode.KANJI_KUN_YOMI:
            case test.mode.HANZI_MEANINGS:
            case test.mode.HANZI_READINGS:
                return ["solutions"];
        }
    };

    test.getSolutions = function (item, mode, part) {
        switch (mode) {
            case test.mode.WORDS:
                if (part === "meanings")
                    return modules.vocab.getTranslations(item);
                else if (part === "readings")
                    return modules.vocab.getReadings(item);
            case test.mode.KANJI_MEANINGS:
                return modules.kanji.getMeanings(item);
            case test.mode.KANJI_ON_YOMI:
                return modules.kanji.getOnYomi(item);
            case test.mode.KANJI_KUN_YOMI:
                return modules.kanji.getKunYomi(item);
            case test.mode.HANZI_MEANINGS:
                return modules.hanzi.getMeanings(item);
            case test.mode.HANZI_READINGS:
                return modules.hanzi.getReadings(item);
        }
    };

    test.addToSolutions = function (item, newSolution, mode, part) {
        switch (mode) {
            case test.mode.WORDS:
                if (part === "meanings")
                    return modules.vocab.add(item, [newSolution], [], []);
                else if (part === "readings")
                    return modules.vocab.add(item, [], [newSolution], []);
            case test.mode.KANJI_MEANINGS:
                return modules.kanji.add(item, { "meanings": [newSolution] });
            case test.mode.KANJI_ON_YOMI:
                return modules.kanji.add(item, { "on_yomi": [newSolution] });
            case test.mode.KANJI_KUN_YOMI:
                return modules.kanji.add(item, { "kun_yomi": [newSolution] });
            case test.mode.HANZI_MEANINGS:
                return modules.hanzi.add(item, { "meanings": [newSolution] });
            case test.mode.HANZI_READINGS:
                return modules.hanzi.add(item, { "readings": [newSolution] });
        }
    }

    const fullPattern = /(\[[^\]]*?\])|(\([^)]*?\))/g;
    const bracketPattern = /\(|\)|\[|\]/g;

    test.getExtendedSolutions = async function (item, mode, part) {
        const data = await test.getSolutions(item, mode, part);
        const solutions = new Set(data);
        const originalSolutions = new Set(data);

        // If the language is English, make solutions without "to" count
        if (modules.currentSecondaryLanguage === "English") {
            for (const solution of originalSolutions) {
                if (solution.startsWith("to "))
                    solutions.add(solution.slice(3));
            }
        }

        // Also ignore round/square brackets and their content for the solutions
        const temp = new Set(solutions);
        for (const solution of temp) {
            const onlyBracketsRemoved = solution.replace(bracketPattern, "");
            if (solution === onlyBracketsRemoved) continue;
            solutions.add(onlyBracketsRemoved.trim());
            const withoutBracketsAndContent = solution.replace(fullPattern, "");
            solutions.add(withoutBracketsAndContent.trim());
        }

        return solutions;
    }

    test.setLanguage = function (language) {
        test.modes = test.modesForLanguage(language);
    };

    test.modesForLanguage = function (language) {
        if (language === "Japanese") {
            return [test.mode.WORDS, test.mode.KANJI_MEANINGS,
                    test.mode.KANJI_ON_YOMI, test.mode.KANJI_KUN_YOMI];
        } else if (language === "Chinese") {
            return [test.mode.WORDS, test.mode.HANZI_MEANINGS,
                    test.mode.HANZI_READINGS];
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
    };

    test.incrementCorrectCounter = function (entry, mode) {
        const table = test.modeToTable(mode);
        const column = test.modeToColumn(mode);
        return modules.database.run(
            `UPDATE ${table} SET correct_count = correct_count + 1
             WHERE ${column} = ?`, entry);
    };

    test.incrementMistakesCounter = function (entry, mode) {
        const table = test.modeToTable(mode);
        const column = test.modeToColumn(mode);
        return modules.database.run(
            `UPDATE ${table} SET mistake_count = mistake_count + 1
             WHERE ${column} = ?`, entry);
    };

    return test;
};
