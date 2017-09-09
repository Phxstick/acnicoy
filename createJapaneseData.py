"""Parse data for language-pair "Japanese"->"English" using raw data files
provided as command line arguments."""

__author__ = "Daniel Bindemann (Daniel.Bindemann@gmx.de)"

import os
import sys
import argparse
import re
import sqlite3
import json
import xml.etree.ElementTree as ElementTree


def create_dictionary_tables(cursor):
    """Create tables for dictionary in the database referenced by given cursor.
    Drop tables first if they already exist.
    """
    cursor.execute("DROP TABLE IF EXISTS dictionary")
    cursor.execute("DROP TABLE IF EXISTS words")
    cursor.execute("DROP TABLE IF EXISTS readings")
    cursor.execute("DROP TABLE IF EXISTS meanings")
    cursor.execute("DROP TABLE IF EXISTS translations")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS dictionary (
            id INTEGER PRIMARY KEY,
            words TEXT,
            readings TEXT,
            translations TEXT,
            news_freq INTEGER
        )
        """)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS words (
            id INTEGER,
            word TEXT,
            news_freq INTEGER,
            net_freq INTEGER
        )
        """)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER,
            reading TEXT,
            news_freq INTEGER,
            net_freq INTEGER,
            restricted_to TEXT
        )
        """)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS meanings (
            id INTEGER,
            translations TEXT,
            part_of_speech TEXT,
            field_of_application TEXT,
            misc_info TEXT,
            dialect TEXT,
            words_restricted_to TEXT,
            readings_restricted_to TEXT
        )
        """)
    # TODO: Is translations table needed?
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS translations (
            id INTEGER,
            translation TEXT
        )
        """)


def create_kanji_tables(cursor):
    """Create table for kanji in the database referenced by given cursor.
    Drop table first if it already exists.
    """
    cursor.execute("DROP TABLE IF EXISTS kanji")
    cursor.execute("""
            CREATE TABLE kanji (
                entry TEXT PRIMARY KEY,
                grade INTEGER,
                jlpt INTEGER,
                radical_id INTEGER,
                strokes INTEGER,
                frequency INTEGER,
                on_yomi TEXT,
                kun_yomi TEXT,
                meanings TEXT,
                on_yomi_search TEXT,
                kun_yomi_search TEXT,
                meanings_search TEXT,
                parts TEXT)""");


def create_radicals_table(cursor):
    """Create table for radicals in the database referenced by given cursor.
    Drop table first if it already exists.
    """
    cursor.execute("DROP TABLE IF EXISTS radicals")
    cursor.execute("""
            CREATE TABLE radicals (
                id INTEGER PRIMARY KEY,
                radical TEXT,
                readings TEXT,
                name TEXT,
                strokes INTEGER,
                frequency INTEGER,
                details TEXT)""")


def parse_dictionary_entry(ID, entry, cursor, text_to_code):
    """ Parse dictionary entry given as an XML node.
    Insert it into the database referenced by given cursor under given ID.
    """
    # Create function for getting the code for a text. Create a new
    # code and register it if there's none for this text yet.
    def get_code(text):
        if text in text_to_code:
            return text_to_code[text]
        next_code = len(text_to_code)
        # Two bytes with chars a-z should be enough for all texts (max of 676)
        letter1 = chr(ord('a') + next_code // 26)
        letter2 = chr(ord('a') + next_code % 26)
        text_to_code[text] = letter1 + letter2
        return letter1 + letter2
    # Create variables to store data parsed for this entry
    # number = entry.find("ent_seq").text
    entry_news_freq = 0  # Calculated as maximum of word/reading frequencies
    words = []
    word_news_freq = dict()
    readings = []
    reading_news_freq = dict()
    reading_restricted_to = dict()
    meanings = []  # List of lists containing translations
    meaning_restricted_to = []
    part_of_speech = []
    field_of_application = []
    dialect = []
    misc_info = []
    # Parse kanji elements (i.e. words/sentences with kanji) for this entry
    for kanji_element in entry.findall("k_ele"):
        word = kanji_element.find("keb").text
        word_news_freq[word] = 0
        # Parse news frequency for this kanji element
        for freq_element in kanji_element.findall("ke_pri"):
            if freq_element.text.startswith("nf"):
                word_news_freq[word] = 49 - int(freq_element.text[2:])
                entry_news_freq = max(word_news_freq[word], entry_news_freq)
        words.append(word)
    # Parse readings (the words/sentences in kana) for this entry
    for reading_element in entry.findall("r_ele"):
        reading = reading_element.find("reb").text
        readings.append(reading)
        reading_news_freq[reading] = 0
        # Parse news frequency for this reading element
        for freq_element in reading_element.findall("re_pri"):
            if freq_element.text.startswith("nf"):
                reading_news_freq[reading] = 49 - int(freq_element.text[2:])
                entry_news_freq = max(reading_news_freq[reading], entry_news_freq)
        # Get kanji elements which this reading is restricted to
        reading_restricted_to[reading] = []
        for restr_element in reading_element.findall("re_restr"):
            reading_restricted_to[reading].append(restr_element.text)
    # Parse meanings (in form of translations) and a information about them
    for sense_element in entry.findall("sense"):
        translations = []
        part_of_speech.append([])
        field_of_application.append([])
        misc_info.append([])
        dialect.append([])
        meaning_restricted_to.append({ "words": [], "readings": [] })
        # Get part of speech information for this meaning
        for pos_element in sense_element.findall("pos"):
            part_of_speech[-1].append(get_code(pos_element.text))
        # Get field of application for this meaning
        for field_element in sense_element.findall("field"):
            field_of_application[-1].append(get_code(field_element.text))
        # Get misc info for this meaning
        for misc_element in sense_element.findall("misc"):
            misc_info[-1].append(get_code(misc_element.text))
        # Get dialect info for this meaning
        for dial_element in sense_element.findall("dial"):
            dialect[-1].append(get_code(dial_element.text))
        # Get kanji elements this meaning is restricted to
        for word_restr_element in sense_element.findall("stagk"):
            meaning_restricted_to[-1]["words"].append(word_restr_element.text)
        # Get reading elements this meaning is restricted to
        for reading_restr_element in sense_element.findall("stagr"):
            meaning_restricted_to[-1]["readings"].append(reading_restr_element.text)
        # Get translations corresponding to this meaning
        for gloss_element in sense_element.findall("gloss"):
            if gloss_element.attrib[
                    "{http://www.w3.org/XML/1998/namespace}lang"] == "eng":
                translation = gloss_element.text
                # # Remove any non-ASCII characters
                # if len(translation) != len(translation.encode()):
                #     translation = \
                #         "".join(filter(lambda c: ord(c) < 128, translation))
                # assert(all(ord(c) < 128 for c in translation))
                translations.append(translation)
        meanings.append(translations)
    # Insert entry into the database
    meaning_strings = [",".join(meaning) for meaning in meanings]
    cursor.execute("INSERT INTO dictionary VALUES (?, ?, ?, ?, ?)",
        (ID, ";".join(words), ";".join(readings), ";".join(meaning_strings),
         entry_news_freq))
    for word in words:
        cursor.execute("INSERT INTO words VALUES (?, ?, ?, ?)",
                (ID, word, word_news_freq[word], 0))
    for reading in readings:
        cursor.execute("INSERT INTO readings VALUES (?, ?, ?, ?, ?)",
                (ID, reading, reading_news_freq[reading], 0,
                 ";".join(reading_restricted_to[reading])))
    for translations, pos, field, misc, dial, restricted_to in zip(
            meanings, part_of_speech, field_of_application, misc_info,
            dialect, meaning_restricted_to):
        cursor.execute("INSERT INTO meanings VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (ID, ";".join(translations), ";".join(pos), ";".join(field),
                 ";".join(misc), ";".join(dial),
                 ";".join(restricted_to["words"]),
                 ";".join(restricted_to["readings"])))
        for translation in translations:
            cursor.execute("INSERT INTO translations VALUES (?, ?)",
                (ID, translation))


def parse_kanji_entry(line, cursor):
    """ Parse kanji entry given as string with space-separated information.
    Insert it into the database referenced by given cursor.
    """
    fields = line.split() 
    # Parse line
    data = {"kanji": fields[0], "on-yomi": [], "kun-yomi": [],
            "frequency": None, "strokes": None, "radical_id": None, "grade": 0,
            "jlpt": None, "meanings": re.findall(r"\{(.*?)\}", line),
            "on-yomi-search": [], "kun-yomi-search": [], "meanings-search": []}
    # data["jis_code"] = fields[1]
    for field in fields:
        if field[0] == "J":
            data["jlpt"] = int(field[1:])
        if field[0] == "B":
            data["radical_id"] = int(field[1:])
        if field[0] == "S":
            data["strokes"] = int(field[1:])
        elif field[0] == "G":
            data["grade"] = int(field[1:])
            if data["grade"] == 10:
                data["grade"] = 9
        elif field[0] == "F":
            data["frequency"] = int(field[1:])
        elif any((0x30A1 <= ord(c) <= 0x30A1 + 89 for c in field)):
            data["on-yomi"].append(field)
            if "." in field:
                data["on-yomi-search"].append(field.replace(".", ""));
        elif any((0x3042 <= ord(c) <= 0x3042 + 86 for c in field)):
            data["kun-yomi"].append(field)
            if "." in field:
                data["kun-yomi-search"].append(field.replace(".", ""));
        elif field == "T1" or field[0] == "{":
            break
    # Insert entry into database
    cursor.execute("""
            INSERT INTO kanji (entry, grade, jlpt, radical_id, strokes,
            frequency, on_yomi, kun_yomi, meanings, on_yomi_search,
            kun_yomi_search, meanings_search, parts)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (data["kanji"], data["grade"], data["jlpt"], data["radical_id"],
         data["strokes"], data["frequency"], ";".join(data["on-yomi"]),
         ";".join(data["kun-yomi"]), ";".join(data["meanings"]),
         ";".join(data["on-yomi-search"]), ";".join(data["kun-yomi-search"]),
         ";".join(data["meanings-search"]), ""))


def parse_radical_entry(line, cursor):
    """ Parse radical entry given as string with space-separated information.
    Insert it into the database referenced by given cursor.
    """
    fields = re.findall(
        r"(.) \[(.+?)\] B(\d+?) S(\d+?) N\((.*?)\)\w?(.*)\n",
        line, re.MULTILINE)[0];
    radical = fields[0]
    readings = fields[1].split()
    radical_id = int(fields[2])
    strokes = int(fields[3])
    name = fields[4]
    details = fields[5].strip()
    # Insert entry into database
    cursor.execute("INSERT INTO radicals VALUES (?, ?, ?, ?, ?, ?, ?)",
        (radical_id, radical, ", ".join(readings), name, strokes,
         None, details))


def parse_kanji_strokes_entry(entry, data_object):
    if "{http://kanjivg.tagaini.net}element" not in entry[0].attrib:
        return
    kanji = entry[0].attrib["{http://kanjivg.tagaini.net}element"]
    # TODO: Only take kanji that are registered in the database?
    data_object[kanji] = []
    # Do a depth first search over the element subtree. For each stroke,
    # store a list of subelements which the stroke is part of
    elements = []
    def dfs_recursive(node):
        if "{http://kanjivg.tagaini.net}element" in node.attrib:
            elements.append(node.attrib["{http://kanjivg.tagaini.net}element"])
        if node.tag == "path":
            data_object[kanji].append(
                    { "stroke": node.attrib["d"], "parts": "".join(elements) })
        for child_node in list(node):
            dfs_recursive(child_node)
        if "{http://kanjivg.tagaini.net}element" in node.attrib:
            del elements[-1]
    dfs_recursive(entry)
    # for stroke_element in entry.iter("path"):
    #     data_object[kanji].append(stroke_element.attrib["d"])


def parse_kanji_parts_entry(line, cursor):
    kanji = line[0]
    parts = "".join([s.strip() for s in sorted(line[4:].split(" ")) if len(s)])
    cursor.execute(
            "UPDATE kanji SET parts = ? WHERE entry = ?", (parts, kanji))


def parse_dictionary(filename, cursor, code_to_text_output_path):
    """Parse given dictionary file (should be called 'JMdict.xml') and insert
    dictionary entries into database referenced by given cursor.

    Map content of <pos>, <field>, <misc> and <dial> elements to two-letter
    codes which will be mapped back to texts again in the trainer.
        --> More compact database
        --> Allows using custom mapping from codes to texts
    Use given mapping from texts to improve texts, to output a mapping from
    codes to improved texts.
    """
    print("Parsing dictionary xml-file...", end="\r")
    tree = ElementTree.parse(filename)
    root = tree.getroot()
    print("Parsing dictionary xml-file... Done. Found %d entries" % len(root))

    print("Creating tables for dictionary...", end="\r")
    create_dictionary_tables(cursor)
    print("Creating tables for dictionary... Done.")

    text_to_code = dict()

    print("Inserting dict entries into database... 0%", end="\r")
    for ID, entry in enumerate(root):
        parse_dictionary_entry(ID, entry, cursor, text_to_code)
        perc = ((ID + 1) / len(root)) * 100
        print("Inserting dict entries into database... %d%%" % perc, end="\r")
    print("Inserting dict entries into database... 100%")

    print("Creating index on words...", end="\r")
    cursor.execute("CREATE INDEX words_word ON words(word COLLATE NOCASE)")
    print("Creating index on words... Done")
    print("Creating index on translations...", end="\r")
    cursor.execute(
        "CREATE INDEX translations_translation ON translations(translation "
        "COLLATE NOCASE)")
    print("Creating index on translations... Done")
    print("Creating index on readings...", end="\r")
    cursor.execute(
        "CREATE INDEX readings_reading ON readings(reading COLLATE NOCASE)")
    print("Creating index on readings... Done")
    print("Creating index on entry ids for words...", end="\r")
    cursor.execute(
        "CREATE INDEX words_id ON words(id)")
    print("Creating index on entry ids for words... Done")
    print("Creating index on entry ids for meanings...", end="\r")
    cursor.execute(
        "CREATE INDEX meanings_id ON meanings(id)")
    print("Creating index on entry ids for meanings... Done")
    print("Creating index on entry ids for readings...", end="\r")
    cursor.execute(
        "CREATE INDEX readings_id ON readings(id)")
    print("Creating index on entry ids for readings... Done")

    print("Creating json file containing code-to-text mapping...", end="\r")
    code_to_text = dict()
    for text in text_to_code:
        code_to_text[text_to_code[text]] = text
    with open(code_to_text_output_path, "w") as f2:
        f2.write(json.dumps(code_to_text, sort_keys=True, indent=4,
                            ensure_ascii=False))
    print("Creating json file containing code-to-text mapping... Done.")


def parse_improved_dictionary_texts(code_to_text_path, improved_texts_path):
    with open(code_to_text_path, "r+") as f, open(improved_texts_path) as f2:
        code_to_old_text = json.load(f)
        improved_texts = json.load(f2)
        code_to_new_text = { "English": dict(), "Japanese": dict() }
        for code in code_to_old_text:
            if code_to_old_text[code] in improved_texts["English"]:
                code_to_new_text["English"][code] = \
                    improved_texts["English"][code_to_old_text[code]]
            if code_to_old_text[code] in improved_texts["Japanese"]:
                code_to_new_text["Japanese"][code] = \
                    improved_texts["Japanese"][code_to_old_text[code]]
        f.seek(0)
        f.write(json.dumps(code_to_new_text, sort_keys=True, indent=4,
                           ensure_ascii=False))
        f.truncate()
    print("Done.")


def parse_word_web_frequencies(filename, cursor):
    print("PARSING WEB FREQUENCIES IS NOT YET IMPLEMENTED")


def parse_word_news_frequencies(filename, cursor):
    """Parse newspaper word frequency file with given filename (should be
    called something like 'wordfreq.txt') and insert values into database
    referenced by given cursor.
    """
    with open(filename, encoding="euc_jp") as f:
        next(f)
        for count, line in enumerate(f):
            parts = line.split("+")
            if len(parts) > 3 or len(parts) < 2:
                print("Skipping string at line %d:  %s" % (count, line))
                continue
            word = parts[-2]
            frequency = int(parts[-1].split("\t")[1])
            if frequency <= 3:
                break
            cursor.execute("UPDATE words SET news_freq = ? WHERE word = ?",
                           (frequency, word))
            print(count + 1, " newspaper word frequencies parsed...\r", end="")
        print("Finished parsing", count + 1, " newspaper word frequencies.")


def parse_kanji(filename, cursor):
    """Parse given kanji file (should be called 'kanjidic.txt') and insert
    kanji entries into database referenced by given cursor.
    """
    print("Creating tables for kanji...", end="\r")
    create_kanji_tables(cursor)
    print("Creating tables for kanji... Done.")

    print("Beginning to parse kanji.")
    with open(filename, encoding="euc_jp") as f:
        next(f)
        for count, line in enumerate(f):
            parse_kanji_entry(line, cursor)
            print(count + 1, "Kanji parsed...\r", end="")
        print("Finished parsing", count + 1, "Kanji.")

    print("Creating indices on kanji table...", end="\r")
    cursor.execute("CREATE INDEX kanji_entry ON kanji (entry ASC)")
    cursor.execute("CREATE INDEX kanji_grade ON kanji (grade ASC)")
    cursor.execute("CREATE INDEX kanji_strokes ON kanji (strokes ASC)")
    cursor.execute("CREATE INDEX kanji_frequency ON kanji (frequency ASC)")
    cursor.execute("CREATE INDEX kanji_radical_id on kanji(radical_id)")
    print("Creating indices on kanji table... Done.")


def parse_radicals(filename, cursor):
    """Parse given radicals file (should be called 'radical.utf8.txt')
    and insert radical entries into database referenced by given cursor.
    """
    print("Creating table for radicals...", end="\r")
    create_radicals_table(cursor)
    print("Creating table for radicals... Done.")

    print("Beginning to parse radicals.")
    with open(filename) as f:
        next(f)
        for count, line in enumerate(f):
            parse_radical_entry(line, cursor)
            print(count, "radicals parsed...\r", end="")
        print("Finished parsing", count, "radicals.")

    print("Creating indices on radicals table...", end="\r")
    cursor.execute("CREATE INDEX radicals_radical ON radicals (radical ASC)")
    cursor.execute("CREATE INDEX radicals_strokes ON radicals (strokes ASC)")
    print("Creating indices on radicals table... Done.")


def parse_improved_kanji_meanings(filename, cursor):
    """Parse json file with given filename containing improved kanji meanings.
    Apply changes from that file to database referenced by given cursor.
    """
    print("Applying improved kanji meanings...", end="\r")
    with open(filename) as f:
        newMeanings = json.load(f)
        for kanji in newMeanings:
            # Old meanings are kept as data in another column for searching
            cursor.execute(
                """UPDATE kanji SET meanings_search = (SELECT meanings FROM kanji
                WHERE entry = ?) WHERE entry = ?""", (kanji, kanji))
            # Old meanings are replaced with new ones
            cursor.execute("UPDATE kanji SET meanings = ? WHERE entry = ?",
                    (";".join(newMeanings[kanji]), kanji))
    print("Applying improved kanji meanings... Done.")


def parse_kanji_parts(filename, cursor):
    """Parse composition of kanji from text file with given filename (should be
    called "kradfile") and insert the data into the database referenced
    by given cursor.
    """
    print("Inserting kanji compositions into database... 0%", end="\r")
    with open(filename, encoding="euc_jp") as f:
        for number, line in enumerate(f):
            # Skip comment lines
            if line[0] == "#":
                continue
            parse_kanji_parts_entry(line, cursor)
            perc = ((number - 99) / 6355) * 100
            print("Inserting kanji compositions into database... %d%%"
                  % perc, end="\r")
        print("Inserting kanji compositions into database... 100%")


def update_jlpt_levels(filenameN3Kanji, cursor):
    """ Read new JLPT N3 kanji levels from given file (should be called
    something like "new_jlpt_n3_kanji.txt") and update old JLPT levels to new
    ones for kanji entries in the database referenced by given cursor.
    -- Don't call this function on an already updated database --
    """
    print("Updating JLPT levels in database...", end="\r")
    # Old N4 -> New N5, Old N3 -> New N4
    cursor.execute("UPDATE kanji SET jlpt = 5 WHERE jlpt = 4");
    cursor.execute("UPDATE kanji SET jlpt = 4 WHERE jlpt = 3");
    with open(filenameN3Kanji, encoding="UTF-16LE") as f:
        # Skip first three lines
        next(f);next(f);next(f)
        # For each new N3 kanji: if it's in old N2 level, set it to N3 level
        for line in f:
            kanji = line[0]
            cursor.execute("SELECT jlpt FROM kanji WHERE entry = ?", (kanji,))
            current_level = cursor.fetchone()[0]
            if current_level == 2:
                cursor.execute("UPDATE kanji SET jlpt = 3 WHERE entry = ?",
                               (kanji,))
    print("Updating JLPT levels in database... Done.")


def parse_kanji_strokes(filename, output_filepath):
    """Parse kanji strokes from xml file with given filename (should be of the
    form "kanjivg-*.xml") and store the data in a json file with given path.
    """
    print("Parsing kanji strokes xml-file...", end="\r")
    tree = ElementTree.parse(filename)
    root = tree.getroot()
    print("Parsing kanji strokes xml-file... Done.")

    print("Transforming kanji stroke entries into json object... 0%", end="\r")
    data_object = dict()
    for number, entry in enumerate(root):
        parse_kanji_strokes_entry(entry, data_object)
        perc = ((number + 1) / len(root)) * 100
        print("Transforming kanji stroke entries into json object... %d%%"
              % perc, end="\r")
    print("Transforming kanji stroke entries into json object... 100%")

    print("Storing json object to file '%s'..." % output_filepath, end="\r")
    with open(output_filepath, "w") as f:
        f.write(json.dumps(data_object, sort_keys=True, indent=4,
                           ensure_ascii=False))
    print("Storing json object to file '%s'... Done." % output_filepath)


def create_example_words_index(cursor, output_path):
    cursor.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND "
                   "(name = 'kanji' OR name = 'dictionary')")
    if len(cursor.fetchall()) != 2:
        print("Dictionary and kanji must be parsed into the database before "
              "creating a reversed index on example words for kanji!")
        return
    kanji_to_word_ids = dict()
    print("Creating index for kanji example words... 0%", end="\r")
    cursor.execute("SELECT entry FROM kanji")
    kanji_list = cursor.fetchall()
    for i, (kanji,) in enumerate(kanji_list):
        pattern = "%%%s%%" % kanji
        cursor.execute(
            """WITH frequent_words AS
               (SELECT w1.id, w1.word, w1.news_freq
                FROM words w1
                WHERE w1.word LIKE ?
                  AND w1.news_freq = (SELECT MAX(w2.news_freq)
                                      FROM words w2
                                      WHERE w2.word = w1.word))
               SELECT f.id
               FROM frequent_words f
               ORDER BY f.news_freq DESC""", (pattern,))
        kanji_to_word_ids[kanji] = [entry for (entry,) in cursor.fetchall()]
        print("Creating index for kanji example words... %d%%"
              % (((i + 1) / len(kanji_list)) * 100), end="\r")
    with open(output_path, "w") as output_file:
        output_file.write(json.dumps(kanji_to_word_ids, ensure_ascii=False))
    print("Creating index for kanji example words... 100%")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Parse dictionary for language-pair 'Japanese'->'English'.")
    parser.add_argument("--dictionary", "--dict", "--dic", "-d",
            metavar="FILENAME",
            dest="dict_filename", help="Filename of the dictionary xml file.")
    parser.add_argument("--kanji", "--kan", "-k", metavar="FILENAME",
            dest="kanji_filename", help="Filename of the kanji file.")
    parser.add_argument("--kanji-radicals", "--radicals", "--rad", "-r",
            metavar="FILENAME", dest="radicals_filename",
            help="Name of the file containing radicals for each kanji.")
    parser.add_argument("--kanji-meanings", "--meanings", "--mean", "-m",
            metavar="FILENAME", dest="kanji_meanings_filename",
            help="Filename of the json file containing revised kanji meanings.")
    parser.add_argument("--kanji-strokes", "--strokes", "--str", "-s",
            metavar="FILENAME", dest="kanji_strokes_filename",
            help="Filename of the xml file containing kanji stroke info.")
    parser.add_argument("--web-frequencies", "--web", "-w", metavar="FILENAME",
            dest="word_web_freq_filename",
            help="Filename of the file containing internet word frequencies.")
    parser.add_argument("--news-frequencies", "--news", "-n",
            metavar="FILENAME", dest="word_news_freq_filename",
            help="Filename of the file containing newspaper word frequencies.")
    parser.add_argument("--kanji-parts", "--part", "-p",
            metavar="FILENAME", dest="kanji_parts_filename",
            help="Filename of the file containing kanji part compositions.")
    parser.add_argument("--kanji-jlpt", "--kjlpt", "-j",
            metavar="FILENAME", dest="new_jlpt_n3_kanji",
            help="Filename of the file containing new JLPT N3 kanji.")
    parser.add_argument("--dictionary-texts", "--texts", "--tex", "-t",
            metavar="FILENAME", dest="improved_dictionary_texts_filename",
            help="Name of the json file mapping info entity texts in the "
                 "dictionary to improved versions.")
    parser.add_argument("--example-words-index", "--example-words", "-e",
            dest="example_words_index", action="store_true",
            help="Create a reversed index for getting example words for kanji."
                 " Dictionary and kanji must be in the database already.")
    parser.add_argument("--output", "--out", "-o", metavar="FILENAME",
            dest="output_path", help="Directory path for output files.")
    args = parser.parse_args()
    output_path = args.output_path if args.output_path is not None else "data"
    # Define filenames and paths for output files
    database_path = os.path.join(output_path, "Japanese-English.sqlite3")
    kanji_strokes_path = os.path.join(output_path, "kanji-strokes.json")
    code_to_text_path = os.path.join(output_path, "dict-code-to-text.json")
    example_words_index_path = os.path.join(
            output_path, "example-words-index.json")
    # Open database connection
    connection = sqlite3.connect(database_path)
    cursor = connection.cursor()
    # Parse dictionary
    if args.dict_filename is not None:
        print("Parsing dictionary from file '%s':" % args.dict_filename)
        parse_dictionary(args.dict_filename, cursor, code_to_text_path)
    # Parse improved dictionary texts
    if args.improved_dictionary_texts_filename is not None:
        print()
        print("Applying improved dictionary info texts from file '%s':" %
            args.improved_dictionary_texts_filename)
        parse_improved_dictionary_texts(
                code_to_text_path, args.improved_dictionary_texts_filename)
    # # Parse word frequencies
    # if args.word_web_freq_filename is not None:
    #     print()
    #     print("Parsing frequencies of words in the internet from file '%s':"
    #           % args.word_web_freq_filename)
    #     parse_word_web_frequencies(args.word_web_freq_filename, cursor)
    if args.word_news_freq_filename is not None:
        print()
        print("Parsing frequencies of words in newspapers from file '%s':"
              % args.word_news_freq_filename)
        parse_word_news_frequencies(args.word_news_freq_filename, cursor)
    # Parse kanji
    if args.kanji_filename is not None:
        print()
        print("Parsing kanji from file '%s':" % args.kanji_filename)
        parse_kanji(args.kanji_filename, cursor)
    # Parse radicals
    if args.radicals_filename is not None:
        print()
        print("Parsing radicals from file '%s':" % args.radicals_filename)
        parse_radicals(args.radicals_filename, cursor)
    # Parse improved kanji meanings
    if args.kanji_meanings_filename is not None:
        print()
        print("Applying improved kanji meanings from file '%s':" %
            args.kanji_meanings_filename)
        parse_improved_kanji_meanings(args.kanji_meanings_filename, cursor)
    # Parse kanji part compositions
    if args.kanji_parts_filename is not None:
        print()
        print("Parsing kanji parts from file '%s':" %
                args.kanji_parts_filename)
        parse_kanji_parts(args.kanji_parts_filename, cursor)
    # Update JLPT levels (now 5 instead of previously 4 levels)
    if args.new_jlpt_n3_kanji is not None:
        print()
        print("Updating JLPT levels using file '%s':" % args.new_jlpt_n3_kanji)
        update_jlpt_levels(args.new_jlpt_n3_kanji, cursor)
    # Create reversed index for example words containing certain kanji
    if args.example_words_index:
        print()
        create_example_words_index(cursor, example_words_index_path)
    connection.commit()
    connection.close()
    # Parse kanji stroke info
    if args.kanji_strokes_filename is not None:
        print()
        print("Parsing kanji strokes from file '%s':" %
                args.kanji_strokes_filename)
        parse_kanji_strokes(args.kanji_strokes_filename, kanji_strokes_path)
    print()

