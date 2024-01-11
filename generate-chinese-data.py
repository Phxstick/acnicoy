"""Parse data for language-pair Chinese->English using raw data files provided
as command line arguments."""

__author__ = "Daniel Bindemann (Daniel.Bindemann@gmx.de)"

import os
import argparse
import re
import sqlite3
import random
import json
from dataclasses import dataclass


def create_dictionary_tables(cursor):
    """Create tables for the dictionary in the database referenced by given
    cursor. Drop tables first if they already exist.
    """
    cursor.execute("DROP TABLE IF EXISTS dictionary")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dictionary (
            simp TEXT,
            trad TEXT,
            pinyin TEXT,
            translations TEXT,
            variants TEXT,
            classifiers TEXT,
            hsk INTEGER,
            net_rank INTEGER,
            lcmc_rank INTEGER
        )
    """)


def create_hanzi_table(cursor):
    cursor.execute("DROP TABLE IF EXISTS hanzi")
    cursor.execute("""
        CREATE TABLE hanzi (
            hanzi TEXT PRIMARY KEY,
            trad TEXT,
            simp TEXT,
            hk_grade INTEGER,
            hsk INTEGER,
            radical_id INTEGER,
            strokes INTEGER,
            usenet_freq INTEGER,
            pinyin TEXT,
            jyutping TEXT,
            meanings TEXT,
            parts TEXT
        )
    """)


def create_radicals_table(cursor):
    cursor.execute("DROP TABLE IF EXISTS radicals")
    cursor.execute("""
        CREATE TABLE radicals (
            id INTEGER PRIMARY KEY,
            radical TEXT,
            variants TEXT,
            readings TEXT,
            name TEXT,
            strokes INTEGER,
            frequency INTEGER,
            simplified TEXT
        )
    """)


dict_entry_pattern = re.compile(r"^(\S+) (\S+) \[([^]]*)\] /(.*)/$")

"""
All of the following regular expressions are used to match references
to other dictionary entries in the translations, which are of the form
"trad|simp[pinyin]". There are different combinations of optional parts,
which is why multiple regexes are used.
"""

# Traditional form and readings mandatory, simplified optional (most entries)
ref_regex = re.compile(r"([^|[(: ]+?)(?:\|([^[]*))?\[([^]]*)\]")

# Both traditional and simplified mandatory, no readings (at least 1.6k entries)
ref_regex_2 = re.compile(r"([^|[(: ]+?)\|([^[),: ]*)")

# Traditional form is mandatory, readings and simplified form optional
ref_regex_3 = re.compile(r"([^|[(: ]+?)(?:\|([^[]*))?(?:\[([^]]*)\])?")

# Only readings mandatory, both words are optional (or only simp if present)
ref_regex_4 = re.compile(r"(?:([^|[(: ]+?)(?:\|([^[]*))?)?\[([^]]*)\]")


pinyin_replacements = {
    " ": "",
    "lu:": "lü",
    "Lu:": "Lü",
    "nu:": "nü",
    "Nu:": "Nü",
    "5": ""
}

def transform_pinyin(pinyin):
    for orig, new in pinyin_replacements.items():
        pinyin = pinyin.replace(orig, new)
    return pinyin


def parse_dictionary_entry(entry, line_number, cursor):
    match = dict_entry_pattern.match(entry)
    if match is None:
        print("ERROR: Could not parse line %d:  %s", (line_number, entry))
        return False
    trad, simp = match.group(1, 2)
    pinyin = transform_pinyin(match.group(3))
    translations = list(map(
            lambda t: t.strip(), match.group(4).replace(";", "/").split("/")))
    cursor.execute("INSERT INTO dictionary VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (simp, trad, pinyin, ";".join(translations),
        None, None, None, None, None))
    return True


def parse_dictionary(filename, cursor, verbose=False):
    """Parse given dictionary file (should be called 'cedict_ts.u8') and insert
    dictionary entries into the database referenced by the given cursor."""
    with open(filename, "r", encoding="utf8") as f:
        lines = f.readlines()
    print("Creating tables for dictionary...", end="\r")
    create_dictionary_tables(cursor)
    print("Creating tables for dictionary... Done.")

    print("Inserting entries into the database... 0%", end="\r")
    for i, line in enumerate(lines):
        if line.startswith("#"):
            i -= 1
            continue
        parse_dictionary_entry(line, i, cursor)
        perc = ((i + 1) / len(lines)) * 100
        print("Inserting entries into the database... %d%%" % perc,
              end="\r")
    cursor.execute("SELECT COUNT(*) FROM dictionary")
    num_entries = cursor.fetchone()[0]
    print("Inserting entries into the database... 100%")
    print("The dictionary contains %s entries." % num_entries)

    # TODO: create indices elsewhere?
    cursor.execute("CREATE INDEX dictionary_simp ON dictionary (simp)")
    cursor.execute(
        "CREATE INDEX dictionary_key ON dictionary (trad, simp, pinyin)")
    
    # Handle classifiers
    cursor.execute("SELECT simp, trad, pinyin, translations FROM dictionary")
    entries = cursor.fetchall()
    num_cls_found = 0
    print("Searching for classifiers... 0%", end="\r")
    for i, (simp, trad, pinyin, tsl_string) in enumerate(entries):
        translations = tsl_string.split(";")
        new_translations = translations.copy()
        cls_strings = []
        for translation in translations:
            if not translation.startswith("CL:"):
                continue
            num_cls_found += 1
            new_translations.remove(translation)
            # NOTE: strip function is needed because some entries contain spaces
            # after the comma between classifiers (5 entries at time of writing)
            cls_refs = map(lambda s: s.strip(), translation[3:].split(","))
            for cls_ref in cls_refs:
                match = ref_regex.match(cls_ref)
                if match is None:
                    print("WARNING: Couldn't match regex for classifiers for %s"
                        % str((trad, simp, pinyin)))
                    continue
                ref_trad, ref_simp, ref_pinyin = match.groups()
                if ref_simp is None:
                    ref_simp = ref_trad 
                cls_strings.append("%s|%s|%s" % (ref_trad, ref_simp, ref_pinyin))
        if len(cls_strings) > 0:
            cursor.execute(
                "UPDATE dictionary SET translations = ?, classifiers = ? "
                "WHERE trad = ? AND simp = ? AND pinyin = ?",
                (";".join(new_translations), ";".join(cls_strings),
                trad, simp, pinyin))
        perc = ((i + 1) / num_entries) * 100
        print("Searching for classifiers... %d%%" % perc, end="\r")
    print("Searching for classifiers... 100%%. Found classifiers for %s entries."
        % num_cls_found)

    # Handle variants of the form "variant of ..."
    cursor.execute("SELECT simp, trad, pinyin, translations FROM dictionary")
    entries = cursor.fetchall()
    variant_regex = re.compile(
        r"^(?:(\S*)\s)?variant of ([^|[, ]+)(?:\|([^[):, ]*))?(?:\[([^]]*)\])?")
    variants = []
    var_to_translations = dict()
    var_to_ref_map = dict()
    num_missing = 0
    num_ambiguous = 0
    print("Searching for variants... 0%", end="\r")
    for i, (simp, trad, pinyin, tsl_string) in enumerate(entries):
        translations = tsl_string.split(";")
        for translation in translations:
            match = variant_regex.match(translation)
            if match is None:
                continue
            variant_type, ref_trad, ref_simp, ref_pinyin = match.groups()
            if ref_simp is None:
                ref_simp = ref_trad 
            if variant_type is None:
                variant_type = ""
            if ref_pinyin is None:
                cursor.execute("SELECT COUNT(*) FROM dictionary WHERE "
                    "trad = ? AND simp = ?", (ref_trad, ref_simp))
                match_count = cursor.fetchone()[0]
                if match_count == 0:
                    if verbose:
                        print("WARNING: Couldn't find dictionary entry "
                            "for reference %s|%s" % (ref_trad, ref_simp))
                    num_missing += 1
                    continue
                if match_count > 1:
                    if verbose:
                        print("WARNING: Reference %s|%s is ambiguous "
                            "without readings" % (ref_trad, ref_simp))
                    num_ambiguous += 1
                    continue
                ref_pinyin = ""
            variant_key = (trad, simp, pinyin)
            ref_key = (ref_trad, ref_simp, transform_pinyin(ref_pinyin))
            var_to_translations[variant_key] = \
                list(filter(lambda t: t != translation, translations))
            variants.append((variant_key, variant_type))
            var_to_ref_map[variant_key] = ref_key
        perc = ((i + 1) / num_entries) * 100
        print("Searching for variants... %d%%" % perc, end="\r")
    print("Searching for variants... 100%%. Found %s variants." % len(variants))
    print("  Couldn't find dictionary entry for %s references." % num_missing)
    print("  Multiple dictionary entries for %s references." % num_ambiguous)

    # Map dictionary entries to a list of their variants.
    # NOTE: variants of variants exist, so I have to use a nested loop
    # to register such derived variants for all entries in the chain
    ref_to_variants = dict()
    for (variant_key, variant_type) in variants:
        key = variant_key
        while key in var_to_ref_map:
            ref_key = var_to_ref_map[key]
            # Need to catch the following case to prevent infinite loops,
            # this has happened for the entry: 倆錢兒|俩钱儿[lia3 qian2 r5]
            if key == ref_key:
                print("WARNING: entry %s contains a self-reference." % str(key))
                break
            variants_for_key = ref_to_variants.setdefault(ref_key, [])
            variants_for_key.append((variant_key, variant_type))
            key = ref_key

    # Register variants for all referenced dictionary entries
    print("Updating dictionary with variants... 0%", end="\r")
    for i, ref_key in enumerate(ref_to_variants):
        variants = ref_to_variants[ref_key]
        cursor.execute("SELECT COUNT(*) FROM dictionary "
            "WHERE trad = ? AND simp = ? AND pinyin = ?", ref_key)
        row = cursor.fetchone()
        if row is None:
            print("WARNING: Can't find dict entry for %s|%s [%s]" % ref_key)
            continue
        variant_strings = []
        for (var_trad, var_simp, var_pinyin), var_type in variants:
            variant_strings.append("%s|%s|%s|%s" %
                (var_trad, var_simp, var_pinyin, var_type))
        cursor.execute("UPDATE dictionary SET variants = ? "
            "WHERE trad = ? AND simp = ? AND pinyin = ?",
                (";".join(variant_strings), *ref_key))
        perc = ((i + 1) / len(ref_to_variants)) * 100
        print("Updating dictionary with variants... %d%%" % perc, end="\r")
    print("Updating dictionary with variants... 100%")

    # Update translations for all variants, delete entry if none are left
    print("Updating translations... 0%", end="\r")
    for i, var_key in enumerate(var_to_translations):
        new_translations = var_to_translations[var_key]
        if len(new_translations) == 0:
            cursor.execute("DELETE FROM dictionary "
                "WHERE trad = ? AND simp = ? AND pinyin = ?", var_key)
        else:
            cursor.execute("UPDATE dictionary SET translations = ? "
                "WHERE trad = ? AND simp = ? AND pinyin = ?",
                (";".join(new_translations), *var_key))
        perc = ((i + 1) / len(var_to_translations)) * 100
        print("Updating translations... %d%%" % perc, end="\r")
    print("Updating translations... 100%")

    # Handle other variants, i.e.:
    # - 176 entries use the pattern "also pr. ..." with different reading only
    # - 432 entries use the pattern "also written ...", e.g. 上鞋,
    #   the translations of the referenced entry are usually identical
    # cursor.execute(
    #     "SELECT simp, trad, pinyin, translations, variants FROM dictionary")
    # entries = cursor.fetchall()
    # num_also_written = 0
    # num_also_pr = 0
    # print("Searching for more variants... 0%", end="\r")
    # for i, (simp, trad, pinyin, tsl_string, variants) in enumerate(entries):
    #     translations = tsl_string.split(";")
    #     variant_strings = variants.split(";")
    #     new_translations = []
    #     match_found = False
    #     for translation in translations:
    #         if translation.startswith("also written "):
    #             match = ref_regex_3.match(translation[len("also written "):])
    #             if match is None:
    #                 print("WARNING: Couldn't match reference in entry %s|%s|%s"
    #                     % (trad, simp, pinyin))
    #                 continue
    #             num_also_written += 1
    #             var_trad, var_simp, var_pinyin = match.groups()
    #             if var_simp is None:
    #                 var_simp = var_trad 
    #             if var_pinyin is None:
    #                 var_pinyin = ""
    #         elif translation.startswith("also pr. "):
    #             regex = re.compile(r"also pr. \[([^]]*)\]")
    #             match = regex.match(translation)
    #             if match is None:
    #                 print("WARNING: Failed to match pr. in entry %s|%s|%s"
    #                     % (trad, simp, pinyin))
    #                 continue
    #             num_also_pr += 1
    #             var_trad = trad
    #             var_simp = simp
    #             var_pinyin = transform_pinyin(match.group(1))
    #         else:
    #             new_translations.append(translation)
    #             continue
    #         variant_strings.append("%s|%s|%s" %
    #             (var_trad, var_simp, var_pinyin))
    #         match_found = True
    #     if match_found:
    #         cursor.execute(
    #             "UPDATE dictionary SET translations = ?, variants = ? "
    #             "WHERE trad = ? AND simp = ? AND pinyin = ?",
    #             (";".join(new_translations), ";".join(variant_strings),
    #             trad, simp, pinyin))
    #     perc = ((i + 1) / num_entries) * 100
    #     print("Searching for more variants... %d%%" % perc, end="\r")
    # print("Searching for more variants... 100%.")
    # print("  Found %s variants of the form 'also written ...'."
    #     % num_also_written)
    # print("  Found %s variants of the form 'also pr. ...'." % num-num_also_pr)

    # Handle references, including:
    # - 242 references of the form "same as...", e.g. for word 馥馥
    # - 191 references of the form "see also...", e.g. for word 亞克力
    # - ...
    cursor.execute("SELECT simp, trad, pinyin, translations FROM dictionary")
    entries = cursor.fetchall()
    num_refs = 0
    num_missing = 0
    num_ambiguous = 0
    print("Processing references... 0%", end="\r")
    for i, (simp, trad, pinyin, tsl_string) in enumerate(entries):
        translations = tsl_string.split(";")
        new_translations = []
        match_found = False
        for translation in translations:
            no_pinyin = False
            matches = list(ref_regex_4.finditer(translation))
            if len(matches) == 0:
                matches = list(ref_regex_2.finditer(translation))
                if len(matches) == 0:
                    new_translations.append(translation)
                    continue
                no_pinyin = True
            match_found = True
            num_refs += len(matches)
            j = 0
            new_translation_parts = []
            for match in matches:
                if no_pinyin:
                    ref_trad, ref_simp = match.groups()
                    ref_pinyin = ""
                else:
                    ref_trad, ref_simp, ref_pinyin = match.groups()
                if ref_trad is None:
                    ref_trad = ""
                    ref_simp = ""
                else:
                    if ref_simp is None:
                        ref_simp = ref_trad
                    # Check if reference exists and is unambiguous
                    if no_pinyin:
                        cursor.execute("SELECT COUNT(*) FROM dictionary WHERE "
                            "trad = ? AND simp = ?", (ref_trad, ref_simp))
                    else:
                        cursor.execute("SELECT COUNT(*) FROM dictionary WHERE "
                            "trad = ? AND simp = ? AND pinyin = ?",
                            (ref_trad, ref_simp, transform_pinyin(ref_pinyin)))
                    match_count = cursor.fetchone()[0]
                    if match_count == 0:
                        if verbose:
                            print("WARNING: Couldn't find dictionary entry "
                                "for reference %s|%s|%s" %
                                (ref_trad, ref_simp,
                                transform_pinyin(ref_pinyin)))
                        num_missing += 1
                    if match_count > 1:
                        if verbose:
                            print("WARNING: Reference %s|%s is ambiguous "
                                "without readings" % (ref_trad, ref_simp))
                        num_ambiguous += 1
                if match.start() - j > 0:
                    new_translation_parts.append(translation[j:match.start()])
                new_translation_parts.append("[%s|%s|%s]" %
                    (ref_trad, ref_simp, transform_pinyin(ref_pinyin)))
                j = match.end()
            if j < len(translation):
                new_translation_parts.append(translation[j:])
            new_translations.append("".join(new_translation_parts))
        if match_found:
            cursor.execute("UPDATE dictionary SET translations = ? "
                "WHERE trad = ? AND simp = ? AND pinyin = ?",
                (";".join(new_translations), trad, simp, pinyin))
        perc = ((i + 1) / num_entries) * 100
        print("Processing references... %d%%" % perc, end="\r")
    print("Processing references... 100%%. Found %s references." % num_refs)
    print("  Couldn't find dictionary entry for %s references." % num_missing)
    print("  Multiple dictionary entries for %s references." % num_ambiguous)


def parse_hsk_vocabulary(filename, cursor, verbose=False):
    with open(filename, "r", encoding="utf8") as f:
        lines = f.readlines()
    header_regex = re.compile(r"^//.*\(Level (\d)")
    vocab_regex = re.compile(r"^(\d+) (.*)$")
    level = None
    num_entries = 0
    num_assigned = 0
    num_unmatched = 0
    num_duplicates = 0
    num_entries_total = 0
    num_assigned_total = 0
    num_unmatched_total = 0
    num_duplicates_total = 0
    for i, line in enumerate(lines):
        header_match = header_regex.match(line)
        if header_match is not None:
            if level is not None and verbose:
                print("---------------------------------------"
                      "-----------------------------")
                print("HSK level %s: %s entries, %s assigned, "
                      "%s unmatched, %s duplicates."
                      % (level, num_entries, num_assigned,
                         num_unmatched, num_duplicates))
                print("---------------------------------------"
                      "-----------------------------")
            level = int(header_match.group(1))
            num_entries_total += num_entries
            num_assigned_total += num_assigned
            num_unmatched_total += num_unmatched
            num_duplicates_total += num_duplicates
            num_entries = 0
            num_assigned = 0
            num_unmatched = 0
            num_duplicates = 0
            if not verbose:
                print("Parsed    0 words for HSK level %s."
                    % ("7 - 9" if level == 7 else level), end="\r")
            continue
        vocab_match = vocab_regex.match(line)
        if vocab_match is not None:
            if level is None:
                print("ERROR: first level header is missing. Aborting.")
                return
            words = [vocab_match.group(2).strip()]
            num_entries += 1
            # Check if entry contains two variants separated by a vertical line
            if "｜" in words[0]:
                words = words[0].split("｜")
            if not verbose:
                print("Parsed %4s words for HSK level %s."
                    % (num_entries, "7 - 9" if level == 7 else level), end="\r")
            for word in words:
                # Discard any additional information in brackets
                word = re.sub(r"（[^)]+）", "", word).strip()
                # Check if this word exists in the dictionary
                cursor.execute("SELECT hsk FROM dictionary WHERE simp = ?",
                        (word,))
                rows = cursor.fetchall()
                if len(rows) == 0:
                    # Check if dictionary contains variant without 儿 at the end
                    if word.endswith("儿"):
                        words.append(word[:-1])
                        continue
                    if verbose:
                        print("WARNING: Could not find dictionary entry "
                            "for word '%s'" % (word,))
                    num_unmatched += 1
                    continue
                # Check if an HSK level is already assigned
                if rows[0][0] is not None:
                    if verbose:
                        if rows[0][0] != level:
                            print("WARNING: Word '%s' already has a different "
                                  "HSK level assigned in the dictionary" % word)
                        else:
                            print("WARNING: Word '%s' appears multiple times "
                                  "in the same HSK level." % word)
                    num_duplicates += 1
                    continue
                num_assigned += 1
                # Update HSK level in the dictionary entry
                cursor.execute("UPDATE dictionary SET hsk = ? WHERE simp = ?",
                        (level, word))
    if verbose:
        print("--------------------------------------------------------------------")
        print("HSK level 7-9: %s entries, %s assigned, %s unmatched, %s duplicates."
            % (num_entries, num_assigned, num_unmatched, num_duplicates))
        print("--------------------------------------------------------------------")
    num_entries_total += num_entries
    num_assigned_total += num_assigned
    num_unmatched_total += num_unmatched
    num_duplicates_total += num_duplicates
    print("--------------------------------------------------------------------")
    print("TOTAL: %s entries, %s assigned, %s unmatched, %s duplicates."
          % (num_entries_total, num_assigned_total,
             num_unmatched_total, num_duplicates_total))
    print("--------------------------------------------------------------------")



def parse_word_frequencies(filename, freqtype, cursor, verbose=False):
    regex = re.compile(r"^(\d+)\s((?:\d|\.)+)\s(.+)$")
    column = "net_rank" if freqtype == "web" \
        else "lcmc_rank" if freqtype == "lcmc" else None
    if column is None:
        raise ValueError("Unknown freqtype '%s'." % freqtype)
    with open(filename, encoding="utf8") as f:
        # Skip first four lines
        for i in range(4):
            f.readline()
        no_match_counter = 0
        match_counter = 0
        for count, line in enumerate(f):
            line_match = regex.match(line)
            rank = int(line_match.group(1))
            score = float(line_match.group(2))
            word = line_match.group(3).strip()
            # Following cutoff leaves about 24-25k entries in web frequencies
            if score < 2:
                break
            # Check if this word exists in the dictionary
            cursor.execute(f"SELECT {column} FROM dictionary WHERE simp = ?",
                    (word,))
            entry = cursor.fetchone()
            if entry is None:
                if verbose:
                    print("WARNING: Could not find dictionary entry "
                        "for word '%s'" % (word,))
                no_match_counter += 1
                continue
            # Check if a frequency is already assigned
            if entry[0] is not None and entry[0] != rank:
                if verbose:
                    print("WARNING: Word '%s' already has a different "
                        "frequency assigned in the dictionary" % word)
                continue
            if not verbose:
                print(f"Parsed %5s word frequencies of type '%s'." %
                        (count, freqtype), end="\r")
            match_counter += 1
            # Update frequency in the dictionary entry
            cursor.execute(
                f"UPDATE dictionary SET {column} = ? WHERE simp = ?",
                (rank, word))
        print("Parsed %5s word frequencies of type '%s'." %
                (count, freqtype))
        print("Assigned frequencies for %s entries." % match_counter)
        print("Couldn't find matches for %s entries." % no_match_counter)


def parse_hanzi(unihan_path, cursor, verbose=False):
    # Define names of relevant files and relations therein
    relevant_fields = {
        "Variants": [
            "kTraditionalVariant",
            "kSimplifiedVariant"
        ],
        "Readings": [
            "kDefinition",
            "kHanyuPinyin",
            "kHanyuPinlu",  # Pinyin frequencies, not every hanzi has this
            "kMandarin",  # Most frequently used pinyin
            "kCantonese"  # Jyutping
        ],
        "DictionaryLikeData": [
            "kFrequency",  # From 1 to 5 (1 is most common)
            "kGradeLevel"  # From 1 to 6 (for Hong Kong)
        ],
        "IRGSources": [
            "kRSUnicode",
            "kTotalStrokes"
        ]
    }
    # Parse data for all relevant fields from Unihan files
    data = dict()
    rows = dict()
    print("Parsing Unihan files...", end="\r")
    for file_name in relevant_fields:
        file_path = os.path.join(unihan_path, f"Unihan_{file_name}.txt")
        with open(file_path, "r", encoding="utf8") as f:
            lines = f.readlines()
        relevant_fields_set = set(relevant_fields[file_name])
        for field_name in relevant_fields_set:
            data[field_name] = []
        for line in lines:
            if line.startswith("#") or line[0] == "\n":
                continue
            subject, relation, obj = line.split("\t")
            if relation in relevant_fields_set:
                data[relation].append((subject, obj.rstrip()))
                rows.setdefault(subject, dict())
    print("Parsing Unihan files... Done.")

    # Print some stats about parsed data
    if verbose:
        print("Found traditional variants for %s hanzi."
            % len(data["kTraditionalVariant"]))
        print("Found english definitions for %s hanzi."
            % len(data["kDefinition"]))
        print("Found pinyin list for %s hanzi."
            % len(data["kHanyuPinyin"]))
        print("Found most customary pinyin annotation for %s hanzi."
            % len(data["kMandarin"]))
        print("Found pinyin frequencies for %s hanzi."
            % len(data["kHanyuPinlu"]))
        print("Found usenet frequencies for %s hanzi."
            % len(data["kFrequency"]))
        print("Found HK grades for %s hanzi."
            % len(data["kGradeLevel"]))

    def sample_chars(d, n=30):
        ns = min(n, len(d))
        l = map(lambda c: chr(int(c[2:], 16)), random.sample(d, ns))
        return "".join(l) + ("..." if len(d) > n else "")

    def code_set(key):
        return set(map(lambda t: t[0], data[key]))
    
    def print_diff(key1, key2):
        x = code_set(key1) - code_set(key2)
        print(f"Hanzi with {key1} but no {key2}: {len(x)}  ({sample_chars(x)})")
    
    if verbose:
        print_diff("kDefinition", "kHanyuPinyin")
        print_diff("kDefinition", "kMandarin")
        print_diff("kHanyuPinyin", "kDefinition")
        print_diff("kHanyuPinyin", "kMandarin")
        print_diff("kMandarin", "kHanyuPinyin")
        print_diff("kHanyuPinlu", "kHanyuPinyin")
        print_diff("kHanyuPinlu", "kMandarin")
        print_diff("kTraditionalVariant", "kSimplifiedVariant")
        print_diff("kSimplifiedVariant", "kTraditionalVariant")

    # Process most customary pinyin
    for code, value in data["kMandarin"]:
        rows[code]["pinyin"] = value
    # Process list of pinyin
    for code, value in data["kHanyuPinyin"]:
        pinyin = value.split(":")[1].split(",")
        # Make sure pinyin from kMandarin comes first
        if "pinyin" in rows[code] and rows[code]["pinyin"] in pinyin:
            pinyin.remove(rows[code]["pinyin"])
            pinyin = [rows[code]["pinyin"]] + pinyin
        rows[code]["pinyin"] = ";".join(pinyin)
    # Process meanings
    for code, value in data["kDefinition"]:
        meanings = value.split(";")
        translations = map(lambda m:
                map(lambda t: t.strip(), m.split(",")), meanings)
        rows[code]["meanings"] = \
                ";".join(map(lambda t: ",".join(t), translations))
    # Process stroke counts
    for code, value in data["kTotalStrokes"]:
        num_strokes = value.split(" ")
        # Second value is preferred for TW, ignore it for now
        num_strokes = num_strokes[0]
        rows[code]["strokes"] = int(num_strokes)
    # Process USENET frequencies
    for code, value in data["kFrequency"]:
        rows[code]["usenet_freq"] = int(value)
    # Process Hongkong school system grades
    for code, value in data["kGradeLevel"]:
        rows[code]["hk_grade"] = int(value)
    # Process radicals
    for code, value in data["kRSUnicode"]:
        radical = value.split(".")[0].split("'")
        # Second part is simplified version of radical, not needed
        # because it's already included in the radicals table
        radical = radical[0]
        rows[code]["radical_id"] = int(radical)
    # Process Jyutping readings for Cantonese
    for code, value in data["kCantonese"]:
        jyutping = value.split(" ")
        rows[code]["jyutping"] = ";".join(jyutping)
    # Process simplified and traditional variants
    trad_variants = dict()
    simp_variants = dict()
    for code, value in data["kTraditionalVariant"]:
        trad_variants[code] = value.split(" ")
    for code, value in data["kSimplifiedVariant"]:
        simp_variants[code] = value.split(" ")
    # Find out how many hanzi are not converted between simplified/traditional
    unchanged_hanzi = []
    for code in rows:
        if code not in simp_variants and code not in trad_variants:
            unchanged_hanzi.append(code)
    if verbose:
        print(f"Hanzi with neither kSimplifiedVariant nor kTraditionalVariant: "
            f"{len(unchanged_hanzi)}  (${sample_chars(unchanged_hanzi)})")
    # Find hanzi that have conversions for both simplified and traditional
    both_conv = code_set("kSimplifiedVariant") & code_set("kTraditionalVariant")
    same_simp = []
    same_trad = []
    both_diff = []
    for code in both_conv:
        if len(simp_variants[code]) == 1 and simp_variants[code][0] == code:
            same_simp.append(code)
            continue
        if len(trad_variants[code]) == 1 and trad_variants[code][0] == code:
            same_trad.append(code)
            continue
        both_diff.append(code)
    # Print some stats about variants
    multiple_trad = [
        code for code in trad_variants.keys() if len(trad_variants[code]) > 1]
    multiple_simp = [
        code for code in simp_variants.keys() if len(simp_variants[code]) > 1]
    if verbose:
        print(f"Hanzi with multiple simplified variants: "
            f"{len(multiple_simp)}  ({sample_chars(multiple_simp)})")
        print(f"Hanzi with multiple traditional variants: "
            f"{len(multiple_trad)}  ({sample_chars(multiple_trad)})")
        print(f"Hanzi with both kSimplifiedVariant and kTraditionalVariant: "
            f"{len(both_conv)}  ({sample_chars(both_conv)})")
        print(f"Hanzi where simplified variant is identical: "
            f"{len(same_simp)}  ({sample_chars(same_simp)})")
    
    def code_to_hanzi(code):
        return chr(int(code[2:], 16))

    def conv_arr(codes):
        return ", ".join(map(lambda c: code_to_hanzi(c), codes))

    multi_simp_strings = \
        map(lambda c: f"{chr(int(c[2:], 16))} -> {conv_arr(simp_variants[c])}",
            same_trad)
    if verbose:
        print(f"Hanzi where traditional variant is identical: "
            f"{len(same_trad)}  ({', '.join(multi_simp_strings)})")
        both_diff_strings = \
            map(lambda code: f"{chr(int(code[2:], 16))}: -> "
                            f"simp: {conv_arr(simp_variants[code])}, "
                            f"trad: {conv_arr(trad_variants[code])}",
                both_diff)
        print(f"Hanzi with both distinct simplified and traditional variant: "
            f"{len(both_diff)}  ({', '.join(both_diff_strings)})")
    print(f"Total number of hanzi found: {len(rows)}")
    # Discard hanzi that have neither meanings nor readings associated
    codes_without_core_info = []
    all_codes = list(rows.keys())
    for code in all_codes:
        if "pinyin" in rows[code] or "meanings" in rows[code]:
            continue
        if code in simp_variants and simp_variants[code][0] in rows:
            simp_row = rows[simp_variants[code][0]]
            # A few hanzi (about 14) exist where the simplified version has
            # pinyin or english definitions associated but the traditional one
            # doesnt, so copy data from simplified to traditional version
            if "pinyin" in simp_row or "meanings" in simp_row:
                if "pinyin" in simp_row:
                    rows[code]["pinyin"] = simp_row["pinyin"]
                if "meanings" in simp_row:
                    rows[code]["meanings"] = simp_row["meanings"]
                continue
        codes_without_core_info.append(code)
        del rows[code]
    print(f"Hanzi with neither meanings nor pinyin: "
          f"{len(codes_without_core_info)}")
    # Add "trad" and "simp" fields to each row
    final_rows = []
    simplified_hanzi = []
    for code in rows:
        # Count simplified hanzi that are not also used as traditional ones
        if code in trad_variants and code not in simp_variants:
            simplified_hanzi.append(code)
        rows[code]["hanzi"] = chr(int(code[2:], 16))
        if code in trad_variants:
            trad_codes = map(lambda c: code_to_hanzi(c), trad_variants[code])
            rows[code]["trad"] = "".join(trad_codes)
        if code in simp_variants:
            simp_codes = map(lambda c: code_to_hanzi(c), simp_variants[code])
            rows[code]["simp"] = "".join(simp_codes)
        # rows[code]["trad"] = chr(int(code[2:], 16))
        # if code in simp_variants:
        #     simp_codes = list(filter(lambda c: c != code, simp_variants[code]))
        #     if len(simp_codes):
        #         rows[code]["simp"] = \
        #             "".join(map(lambda c: code_to_hanzi(c), simp_codes))
        final_rows.append(rows[code])
    print(f"Hanzi only representing a simplified variant: "
          f"{len(simplified_hanzi)}")
    # Insert all rows into the database
    print(f"Number of hanzi to be inserted into the database: "
          f"{len(final_rows)}")
    create_hanzi_table(cursor)
    keys = ["hanzi", "trad", "simp", "hk_grade", "hsk", "radical_id", "strokes",
            "usenet_freq", "pinyin", "jyutping", "meanings", "parts"]
    for row in final_rows:
        values = [(row[key] if key in row else None) for key in keys]
        qmarks = ", ".join(["?"] * len(keys))
        cursor.execute(
            f"INSERT INTO hanzi ({', '.join(keys)}) VALUES ({qmarks})", values)


def parse_hsk_characters(filename, cursor, verbose=False):
    with open(filename, "r", encoding="utf8") as f:
        lines = f.readlines()
    num_entries = 0
    num_assigned = 0
    num_unmatched = 0
    num_duplicates = 0
    num_entries_total = 0
    num_assigned_total = 0
    num_unmatched_total = 0
    num_duplicates_total = 0
    level = 0
    for i, line in enumerate(lines):
        header_regex = re.compile(r"^(.*)字表")
        entry_regex = re.compile(r"^(\d+)[\t](.)$")
        header_match = header_regex.match(line)
        if header_match is not None:
            # Skip the sections about handwriting
            if not header_match.group(1).endswith("级汉"):
                break
            if level > 0 and verbose:
                print("---------------------------------------"
                      "-----------------------------")
                print("HSK level %s: %s entries, %s assigned, "
                      "%s unmatched, %s duplicates."
                      % (level, num_entries, num_assigned,
                         num_unmatched, num_duplicates))
                print("---------------------------------------"
                      "-----------------------------")
            num_entries_total += num_entries
            num_assigned_total += num_assigned
            num_unmatched_total += num_unmatched
            num_duplicates_total += num_duplicates
            num_entries = 0
            num_assigned = 0
            num_unmatched = 0
            num_duplicates = 0
            level += 1
            if not verbose:
                print("Parsed    0 words for HSK level %s."
                    % ("7 - 9" if level == 7 else level), end="\r")
            continue
        entry_match = entry_regex.match(line)
        if entry_match is None:
            continue
        if level == 0:
            print("ERROR: first level header is missing. Aborting.")
            return
        char = entry_match.group(2).strip()
        num_entries += 1
        if not verbose:
            print("Parsed %4s characters for HSK level %s."
                % (num_entries, "7 - 9" if level == 7 else level), end="\r")
        # Check if this character exists in the database
        cursor.execute("SELECT hsk FROM hanzi WHERE hanzi = ?", (char,))
        rows = cursor.fetchall()
        if len(rows) == 0:
            if verbose:
                print("WARNING: Could not find database entry for hanzi '%s'"
                    % char)
            num_unmatched += 1
            continue
        # if len(rows) > 1:
        #     row_str = map(lambda row: f"(simp: {row[1]}, trad: {row[2]})", rows)
        #     print("WARNING: More than a single row has been matched for hanzi "
        #         f"{char}: {' | '.join(row_str)})")
        # Check if an HSK level is already assigned
        row = rows[0]
        if row[0] is not None:
            if verbose:
                if row[0] != level:
                    print("WARNING: Hanzi '%s' already has a different HSK "
                            "level assigned in the database" % char)
                else:
                    print("WARNING: Hanzi '%s' appears multiple times in "
                            "the same HSK level." % char)
            num_duplicates += 1
            continue
        num_assigned += 1
        # Update HSK level in the database entry
        cursor.execute(
            f"UPDATE hanzi SET hsk = ? WHERE hanzi = ?", (level, char))
    if verbose:
        print("--------------------------------------------------------------------")
        print("HSK level 7-9: %s entries, %s assigned, %s unmatched, %s duplicates."
            % (num_entries, num_assigned, num_unmatched, num_duplicates))
        print("--------------------------------------------------------------------")
    num_entries_total += num_entries
    num_assigned_total += num_assigned
    num_unmatched_total += num_unmatched
    num_duplicates_total += num_duplicates
    print("--------------------------------------------------------------------")
    print("TOTAL: %s entries, %s assigned, %s unmatched, %s duplicates."
          % (num_entries_total, num_assigned_total,
             num_unmatched_total, num_duplicates_total))
    print("--------------------------------------------------------------------")


def parse_radicals(filename, cursor):
    with open(filename, "r", encoding="utf8") as f:
        lines = f.readlines()[1:]  # Skip header line
    create_radicals_table(cursor)
    for line in lines:
        fields = line.split("\t")
        number = int(fields[0])
        radical = fields[1]
        variants = None
        if len(radical) > 1:
            variants = radical[2:-1].split("、")
            radical = radical[0]
        strokes = int(fields[2])
        meaning = fields[3]
        pinyin = fields[4]
        frequency = int(fields[5].replace(",", ""))
        simplified = fields[6]
        # Fields of the form (pr.X) actually don't contain the simplified
        # form but the previously used traditional form X of the radical
        if simplified.startswith("(pr.") or len(simplified) == 0:
            simplified = None
        variants = ";".join(variants) if variants is not None else None
        cursor.execute("""
            INSERT INTO radicals VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (number, radical, variants, pinyin, meaning, strokes,
            frequency, simplified))


def parse_hanzi_strokes(filename, output_filepath, cursor):
    """The file should be 'graphics.txt' from the Make Me a Hanzi project."""
    data = dict()
    discarded = []
    with open(filename, "r", encoding="utf8") as f:
        for i, line in enumerate(f):
            print("Parsed stroke info for %d hanzi..." % i, end="\r")
            line_data = json.loads(line)
            hanzi = line_data["character"]
            cursor.execute("SELECT hk_grade, hsk, usenet_freq FROM hanzi "
                "WHERE hanzi = ?", hanzi)
            row = cursor.fetchone()
            if row is None:
                # print("Couldn't find hanzi '%s' in the database." % hanzi)
                continue
            grade, hsk, freq = row
            if grade is None and hsk is None and freq is None:
                discarded.append(hanzi)
                continue
            strokes = line_data["strokes"]
            medians = line_data["medians"]
            data[hanzi] = []
            for stroke, median_list in zip(strokes, medians):
                data[hanzi].append({
                    "stroke": stroke, "parts": [], "start": median_list[0] })
        print("Parsed stroke info for %d hanzi... Done." % i)
    print("Discarded stroke info for %s infrequent hanzi." % len(discarded))
    print("Saving stroke data for %s hanzi." % len(data))
    # print("Discarded hanzi:", "".join(discarded))
    with open(output_filepath, "w", encoding="utf8") as f:
        json.dump(data, f, sort_keys=True, ensure_ascii=False)


def parse_hanzi_decompositions(filename, output_filepath, cursor):
    """The file should be 'dictionary.txt' from the Make Me a Hanzi project."""
    if not os.path.exists(output_filepath):
        print("ERROR: File with previously parsed hanzi strokes is missing.")
        return
    with open(output_filepath, "r", encoding="utf8") as f:
        data = json.load(f)

    ids_chars = "⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻"
    qmark = "？"

    # Define a recursive helper function
    def parse_decomp_tree(string, parts_list):
        if string[0] not in ids_chars:
            if string[0] != qmark:
                parts_list.append(string[0])
            return string[0] if string[0] != qmark else None, 1
        subtree1, size1 = parse_decomp_tree(string[1:], parts_list)
        subtree2, size2 = parse_decomp_tree(string[size1 + 1:], parts_list)
        size3 = 0
        subtree = [subtree1, subtree2]
        if string[0] == "⿲" or string[0]== "⿳":
            subtree3, size3 = \
                parse_decomp_tree(string[size1 + size2 + 1:], parts_list)
            subtree.append(subtree3)

        return subtree, size1 + size2 + size3 + 1
 
    with open(filename, "r", encoding="utf8") as f:
        for i, line in enumerate(f):
            print("Parsed decomposition info for %d hanzi..." % i, end="\r")
            line_data = json.loads(line)
            hanzi = line_data["character"]
            if hanzi not in data:
                continue
            decomp = line_data["decomposition"]
            parts = []
            tree, _ = parse_decomp_tree(decomp, parts)
            cursor.execute("UPDATE hanzi SET parts = ? WHERE hanzi = ?",
                ("".join(parts), hanzi))
            matches = line_data["matches"]
            for stroke_info, match in zip(data[hanzi], matches):
                if match is None:
                    continue
                subtree = tree
                for edge in match:
                    subtree = subtree[edge]
                if subtree is None:
                    continue
                stroke_info["parts"] = [subtree]
        print("Parsed decomposition info for %d hanzi... Done." % i)
    with open(output_filepath, "w", encoding="utf8") as f:
        json.dump(data, f, sort_keys=True, ensure_ascii=False)

@dataclass
class InputPaths:
    dictionary: str = None
    hanzi: str = None

    hsk_vocab: str = None
    web_word_frequencies: str = None
    lcmc_word_frequencies: str = None

    hanzi_radicals: str = None
    hanzi_strokes: str = None
    hanzi_decomposition: str = None
    hsk_hanzi: str = None


def generate_data(input_paths: InputPaths, output_path: str, verbose=False):
    database_path = os.path.join(output_path, "Chinese-English.sqlite3")
    hanzi_strokes_path = os.path.join(output_path, "hanzi-strokes.json")
    connection = sqlite3.connect(database_path)
    cursor = connection.cursor()
    if input_paths.dictionary is not None:
        print("Parsing dictionary from file '%s':" % input_paths.dictionary)
        parse_dictionary(input_paths.dictionary, cursor, verbose=verbose)
    if input_paths.hsk_vocab is not None:
        print()
        print("Parsing HSK word vocabulary lists from file '%s':"
              % input_paths.hsk_vocab)
        parse_hsk_vocabulary(input_paths.hsk_vocab, cursor, verbose=verbose)
    if input_paths.web_word_frequencies is not None:
        print()
        print("Parsing internet word frequencies from file '%s':"
              % input_paths.web_word_frequencies)
        parse_word_frequencies(
            input_paths.web_word_frequencies, "web", cursor, verbose=verbose)
    if input_paths.lcmc_word_frequencies is not None:
        print()
        print("Parsing LCMC word frequencies from file '%s':"
              % input_paths.lcmc_word_frequencies)
        parse_word_frequencies(
            input_paths.lcmc_word_frequencies, "lcmc", cursor, verbose=verbose)
    if input_paths.hanzi is not None:
        print()
        print("Parsing hanzi from Unihan data in directory '%s':"
              % input_paths.hanzi)
        parse_hanzi(input_paths.hanzi, cursor, verbose=verbose)
    if input_paths.hsk_hanzi is not None:
        print()
        print("Parsing HSK character lists from file '%s':"
              % input_paths.hsk_hanzi)
        parse_hsk_characters(input_paths.hsk_hanzi, cursor, verbose=verbose)
    if input_paths.hanzi_radicals is not None:
        print()
        print("Parsing radicals from file '%s'." % input_paths.hanzi_radicals)
        parse_radicals(input_paths.hanzi_radicals, cursor)
    if input_paths.hanzi_strokes is not None:
        print()
        print("Parsing SVG stroke sequences from file '%s':" %
            input_paths.hanzi_strokes)
        parse_hanzi_strokes(input_paths.hanzi_strokes,
            hanzi_strokes_path, cursor)
    if input_paths.hanzi_decomposition is not None:
        print()
        print("Parsing hanzi decompositions from file '%s':" %
            input_paths.hanzi_decomposition)
        parse_hanzi_decompositions(
            input_paths.hanzi_decomposition, hanzi_strokes_path, cursor)
    connection.commit()
    connection.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
            description="Parse data for language-pair Chinese->English.")
    parser.add_argument("--verbose", "-v", dest="verbose", action="store_true")
    parser.add_argument("--output", "--out", "-o", metavar="FILENAME",
            dest="output_path", help="Directory path for output files")

    parser.add_argument("--dictionary", "--dict", "--dic", "-d",
            metavar="FILENAME", dest="dictionary",
            help="Name of the CEDICT dictionary text file")
    parser.add_argument("--hsk-vocab", metavar="FILENAME",
            dest="hsk_vocab",
            help="Name of the plain text file containing 2021 HSK vocabulary")
    parser.add_argument("--web-freq", "--web", metavar="FILENAME",
            dest="web_word_frequencies",
            help="Name of the file containing internet word frequencies")
    parser.add_argument("--lcmc-freq", "--lcmc", metavar="FILENAME",
            dest="lcmc_word_frequencies",
            help="Name of the file containing LCMC word frequencies")

    parser.add_argument("--hanzi", "--han", metavar="FILENAME",
            dest="hanzi", help="Directory path with UNIHAN files.")
    parser.add_argument("--hanzi-radicals", "--radicals", "--rad",
            metavar="FILENAME", dest="hanzi_radicals",
            help="Name of the tsv file describing the 214 kangxi radicals.")
    parser.add_argument("--hanzi-strokes", "--strokes", "--str",
            metavar="FILENAME", dest="hanzi_strokes",
            help="Name of the file containing SVG stroke sequences.")
    parser.add_argument("--hanzi-decomposition", "--decomp",
            metavar="FILENAME", dest="hanzi_decomposition",
            help="Name of the file containing hanzi decomposition info.")
    parser.add_argument("--hsk-hanzi", metavar="FILENAME",
            dest="hsk_hanzi",
            help="Name of the plain text file containing HSK 3.0 characters")

    input_paths = InputPaths()
    args = parser.parse_args(namespace=input_paths)
    output_path = args.output_path if args.output_path else "Chinese-English"
    verbose = args.verbose
    generate_data(input_paths, output_path, verbose=verbose)
