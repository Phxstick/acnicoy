"use strict";

const sqlite3 = require("sqlite3");

module.exports = async function (paths, contentPaths, modules) {
    let data;

    // Simply return all data from the dictionary
    async function getDictionaryEntryData(id) {
        const [trad, simp, pinyin] = id.split("|")
        const [{
            translations, variants, classifiers, hsk, net_rank, lcmc_rank
        }] = await data.query(`
            SELECT translations, variants, classifiers, hsk, net_rank, lcmc_rank
            FROM dictionary WHERE simp = ? AND trad = ? AND pinyin = ?
            `, simp, trad, pinyin)
        const info = {
            id: trad + "|" + simp + "|" + pinyin,
            simplified: simp,
            traditional: trad,
            pinyin,
            translations: translations.split(";"),
            variants: variants === null ? [] :
                variants.split(";").map(s => s.split("|")),
            classifiers: classifiers === null ? [] :
                classifiers.split(";").map(s => s.split("|")),
            hskLevel: hsk,
            netRank: net_rank,
            lcmcRank: lcmc_rank
        }
        return info
    };

    // Return data in a format that is required in other parts of the program
    async function getDictionaryEntryInfo(id) {
        const data = await getDictionaryEntryData(id)
        const convertedPinyin = data.pinyin.toPinyin()
        const wordsAndReadings = [{
            word: data.simplified,
            reading: convertedPinyin,
            rawReading: data.pinyin
        }]
        wordsAndReadings.push({
            word: data.traditional,
            reading: convertedPinyin,
            rawReading: data.pinyin
        })
        for (const [trad, simp, pinyin, type] of data.variants) {
            wordsAndReadings.push({
                word: simp, reading: pinyin.toPinyin(),
                rawReading: pinyin, type })
            wordsAndReadings.push({
                word: trad, reading: pinyin.toPinyin(),
                rawReading: pinyin, type })
        }
        return {
            ...data,
            wordsAndReadings,
            meanings: [
                { translations: data.translations }
            ]
        }
    }

    // Used by the content.searchDictionary function
    async function searchFunction(query) {
        if (query.words.length === 0 && query.translations.length === 0)
            return []
        const whereClauses = []
        const queryArguments = []
        if (query.words) {
            for (const word of query.words) {
                const containsNoHanzi =
                    word.split("").every(c => c.codePointAt(0) < 256)
                const sqlFields = []
                const sqlArgs = []
                if (containsNoHanzi) {
                    sqlFields.push("pinyin", "(';' || variants || ';')")
                    sqlArgs.push(word, `%|${word};%`)
                } else {
                    sqlFields.push(
                        "simp", "trad", "(';' || variants || ';')", "variants")
                    sqlArgs.push(word, word, `%;${word}|%`, `%|${word}|%`)
                }
                const sql = sqlFields.map(p => p + " LIKE ?").join(" OR ")
                whereClauses.push("(" + sql + ")")
                queryArguments.push(...sqlArgs)
            }
        }
        if (query.translations) {
            for (const translation of query.translations) {
                whereClauses.push("(';' || translations || ';') LIKE ?")
                queryArguments.push(`%;${translation};%`)
            }
        }
        const sortingCriteria = [];
        const settings = modules.settings.dictionary["Chinese"]
        const weights = settings.frequencyWeights
        if (weights.hsk) sortingCriteria.push("hsk AS hskLevel")
        if (weights.net) sortingCriteria.push("net_rank AS netRank")
        const sql = `
            SELECT simp, trad, pinyin, translations
                ${sortingCriteria.length ? ",":""} ${sortingCriteria.join(", ")}
            FROM dictionary
            WHERE ${whereClauses.join(" AND ")}
        `
        const rows = await data.query(sql, ...queryArguments)
        rows.sort((row1, row2) => row1.simp.length - row2.simp.length)
        rows.sort((row1, row2) => calculateEntryRank(row1, weights) -
                                  calculateEntryRank(row2, weights))
        return rows.map((row) => ({
            id: row.trad + "|" + row.simp + "|" + row.pinyin,
            word: settings.useTraditionalHanzi ? row.trad : row.simp,
            readings: row.pinyin,
            translations: row.translations
        }))
    }
    
    function calculateEntryRank(info, weights) {
        let score = 0;
        let weightSum = 0;
        if (!info.netRank && !info.hskLevel)
            return Infinity
        if (weights.net) {
            const netRank = info.netRank || (data.maxFreqValues.netRank + 1000)
            score += netRank * weights.net;
            weightSum += weights.net;
        }
        if (weights.hsk) {
            const hskLevel = info.hskLevel || (data.maxFreqValues.hskLevel + 1)
            score += data.hskSizeAccumulative[hskLevel] * 1.5
                     * weights.hsk;
            weightSum += weights.hsk;
        }
        if (score === 0) return 25000
        if (weightSum > 0) score /= weightSum;
        return score;
    }

    /**
     * @param {String} word
     * @returns {Promise[String]}
     */
    async function guessDictionaryIdForVocabItem(word) {
        const readings = await modules.vocab.getReadings(word)
        if (readings.length === 0) return guessDictionaryIdForNewWord(word)
        let rows = await data.query(
            "SELECT trad, simp, pinyin, variants FROM dictionary " +
            "WHERE (simp = ? OR trad = ? " +
            "OR (';' || variants || ';') LIKE ? OR variants LIKE ?) " +
            "ORDER BY hsk ASC, net_rank ASC",
            word, word, `;${word}|`, `|${word}|`)
        if (rows.length === 0) return null
        for (const row of rows) {
            const wordsAndReadings = [[row.trad, row.simp, row.pinyin]]
            if (row.variants !== null) {
                wordsAndReadings.push(
                    ...row.variants.split(";").map(v => v.split("|")))
            }
            const isMatching = wordsAndReadings.some(([trad, simp, pinyin]) =>
                (word === trad || word === simp) &&
                readings.some(reading => reading === pinyin.toPinyin()))
            if (isMatching)
                return row.trad + "|" + row.simp + "|" + row.pinyin
        }
        return false
    }

    /**
     * @param {String} word
     * @returns {Promise[String]}
     */
    async function guessDictionaryIdForNewWord(word) {
        const rows = await data.query(
            "SELECT simp, trad, pinyin FROM dictionary " +
            "WHERE simp = ? OR trad = ? " +
            "ORDER BY hsk ASC, net_rank ASC",
            word, word)
        return rows.length > 0 ?
            rows[0].trad + "|" + rows[0].simp + "|" + rows[0].pinyin : null
    }

    /**
     * Given a dictionary entry by its ID, return the corresponding entry from
     * the vocabulary (or null if there's no match).
     *
     * @param {String} dictionaryId
     * @param {Object} [dictionaryInfo] If info for this entry has already been
     *     extracted from the dictionary, pass it in here (performance boost).
     * @returns {String|null}
     */
    async function guessAssociatedVocabEntry(dictionaryId, dictionaryInfo) {
        if (dictionaryInfo === undefined) {
            dictionaryInfo = await getDictionaryEntryInfo(dictionaryId);
        }
        const rows = await modules.database.query(
            "SELECT word FROM vocabulary WHERE (word = ? OR word = ?) " +
            "AND (';' || readings || ';') LIKE ?",
            dictionaryInfo.simplified, dictionaryInfo.traditional,
            "%;" + dictionaryInfo.pinyin.toPinyin() + ";%")
        if (rows.length > 0) return rows[0].word;
        return null
    }

    async function getHanziInfo(hanzi) {
        const row = (await data.query(`
            SELECT h.meanings AS meanings,
                   h.pinyin AS pinyin,
                   h.jyutping as jyutping,
                   h.usenet_freq AS frequency,
                   h.trad AS trad,
                   h.simp AS simp,
                   h.hk_grade AS grade,
                   h.hsk AS hskLevel,
                   h.strokes AS strokes,
                   h.parts AS parts,
                   r.radical AS radical,
                   r.id AS radicalId,
                   r.name AS radicalName
            FROM hanzi h JOIN radicals r ON h.radical_id = r.id
            WHERE h.hanzi = ?
        `, hanzi))[0]
        row.meanings = row.meanings === null ? [] :
            row.meanings.split(";").map(m => m.split(","))
        row.pinyin = row.pinyin === null ? [] : row.pinyin.split(";")
        row.jyutping = row.jyutping === null ? [] : row.jyutping.split(";")
        row.hanzi = hanzi
        return row
    }

    async function isKnownHanzi(hanzi) {
        const rows = await data.query(
            "SELECT COUNT(hanzi) AS amount FROM hanzi WHERE hanzi = ?", hanzi)
        return rows[0].amount > 0
    }

    function getExampleWordsForHanzi(hanzi) {
        return modules.content.searchDictionary({ words: ["*" + hanzi + "*"] })
    }

    /**
     * Load content from database into an in-memory database.
     */
    async function loadDatabaseIntoMemory() {
        const db = utility.promisifyDatabase(new sqlite3.Database(":memory:"));
        // Temporarily attach content data database to in-memory one,
        // create tables and copy over data
        await db.run("ATTACH DATABASE ? AS ?",
            contentPaths.database, "content");
        const tablesInfo = await db.all(
            "SELECT name, sql FROM content.sqlite_master WHERE type='table'");
        for (const { name, sql } of tablesInfo) {
            await db.exec(sql);
            await db.run(`INSERT INTO ${name} SELECT * FROM content.${name}`);
        }
        await db.run("DETACH DATABASE ?", "content");
        // Attach user database (to later run SQL queries involving both db's),
        // provide function to re-attach database to access the most recent data
        await db.run("ATTACH DATABASE ? AS ?",
            paths.languageData("Chinese").database, "trainer");
        const updateUserData = async () => {
            await db.run("DETACH DATABASE ?", "trainer");
            await db.run("ATTACH DATABASE ? AS ?",
                paths.languageData("Chinese").database, "trainer");
        };
        const queryFunction = (query, ...params) => db.all(query, ...params);
        return { queryFunction, updateUserData };
    }

    const { queryFunction, updateUserData } = await loadDatabaseIntoMemory();

    // Get the amount of words per HSK level
    const hskQuery = "SELECT COUNT(*) AS c FROM dictionary WHERE hsk = ?"
    const hskSizePerLevel = {}
    const hskSizeAccumulative = {}
    for (let level = 1; level <= 7; ++level) {
        hskSizePerLevel[level] = (await queryFunction(hskQuery, level))[0].c
        hskSizeAccumulative[level] = level === 1 ? hskSizePerLevel[level] :
            hskSizeAccumulative[level - 1] + hskSizePerLevel[level]
    }
    // Register a non-existing HSK level for entries that don't have one
    hskSizeAccumulative[8] = hskSizeAccumulative[7] + 1000

    // Calculate the maximum value for all frequency indicators
    const maxValueRows = await queryFunction(
        "SELECT MAX(net_rank) as maxNetRank FROM dictionary")
    const maxFreqValues = {
        hskLevel: 7,
        netRank: maxValueRows[0].maxNetRank
    }

    // Define function to require a new version of a file (not cached version)
    function requireNew(path) {
        delete require.cache[require.resolve(path)];
        return require(path);
    }
    // Gather all the content into a frozen object
    data = Object.freeze({
        query: queryFunction,
        updateUserData,

        // Data objects
        hskSizeAccumulative: Object.freeze(hskSizeAccumulative),
        maxFreqValues: Object.freeze(maxFreqValues),
        hanziStrokes: Object.freeze(requireNew(contentPaths.hanziStrokes)),

        // Dictionary related
        containsDictionary: true,
        usesDictionaryIds: false,
        searchFunction,
        getDictionaryEntryInfo,
        guessDictionaryIdForNewWord,
        guessDictionaryIdForVocabItem,
        guessAssociatedVocabEntry,
        calculateEntryRank,

        // Hanzi related
        isKnownHanzi,
        getExampleWordsForHanzi,
        getHanziInfo,
        // getHanziMeanings,
        // getHanziLists,
        // searchHanzi
    });
    return data;
};