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


def create_vocab_tables(cursor):
    """Create tables for vocabulary in the database referenced by given cursor.
    Drop tables first if they already exist.
    """
    cursor.execute("DROP TABLE IF EXISTS dictionary")
    cursor.execute("DROP TABLE IF EXISTS words")
    cursor.execute("DROP TABLE IF EXISTS readings")
    cursor.execute("DROP TABLE IF EXISTS translations")
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS dictionary (
            id INTEGER PRIMARY KEY,
            words TEXT,
            readings TEXT,
            translations TEXT
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
            reading TEXT
        )
        """)
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
                on_readings TEXT,
                kun_readings TEXT,
                meanings TEXT,
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


def parse_vocab_entry(ID, entry, cursor):
    """ Parse vocabulary entry given as an XML node.
    Insert it into the database referenced by given cursor under given ID.
    """
    # number = entry.find("ent_seq").text
    words = []
    word_news_freq = dict()
    readings = []
    senses = []
    # Parse necessary information for this entry
    for kanji_element in entry.findall("k_ele"):
        word = kanji_element.find("keb").text
        word_news_freq[word] = 0
        # Parse news frequency for this kanji element
        for freq_element in kanji_element.findall("ke_pri"):
            if freq_element.text.startswith("nf"):
                word_news_freq[word] = 49 - int(freq_element.text[2:])
        words.append(word)
    for reading_element in entry.findall("r_ele"):
        readings.append(reading_element.find("reb").text)
    for sense_element in entry.findall("sense"):
        translations = []
        for gloss_element in sense_element.findall("gloss"):
            if gloss_element.attrib[
                    "{http://www.w3.org/XML/1998/namespace}lang"] == "eng":
                translations.append(gloss_element.text)
        senses.append(translations)
    # # Print out entry info
    # print("_____ Entry ID %s _____" % ID)
    # print("Entry names:   %s" % ", ".join(words))
    # print("Readings:      %s" % ", ".join(readings))
    # print("Senses:")
    # for number, sense in enumerate(senses):
    #     print("    %d. %s" % (number + 1, ", ".join(sense)))
    # print()
    # Insert entry into the database
    sense_strings = [",".join(sense) for sense in senses]
    cursor.execute("INSERT INTO dictionary VALUES (?, ?, ?, ?)",
        (ID, ";".join(words), ";".join(readings), ";".join(sense_strings)))
    for word in words:
        cursor.execute("INSERT INTO words VALUES (?, ?, ?, ?)",
                (ID, word, word_news_freq[word], 0))
    for reading in readings:
        cursor.execute("INSERT INTO readings VALUES (?, ?)", (ID, reading))
    for sense in senses:
        for translation in sense:
            cursor.execute("INSERT INTO translations VALUES (?, ?)",
                (ID, translation))


def parse_kanji_entry(line, cursor):
    """ Parse kanji entry given as string with space-separated information.
    Insert it into the database referenced by given cursor.
    """
    fields = line.split() 
    # Parse line
    data = {"kanji": fields[0], "on": [], "kun": [], "frequency": None,
            "strokes": None, "radical_id": None, "grade": None, "jlpt": None,
            "meanings": re.findall(r"\{(.*?)\}", line)}
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
        elif field[0] == "F":
            data["frequency"] = int(field[1:])
        elif any((0x30A1 <= ord(c) <= 0x30A1 + 89 for c in field)):
            data["on"].append(field)
        elif any((0x3042 <= ord(c) <= 0x3042 + 86 for c in field)):
            data["kun"].append(field)
        elif field == "T1" or field[0] == "{":
            break
    # Insert entry into database
    cursor.execute("INSERT INTO kanji VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (data["kanji"], data["grade"], data["jlpt"], data["radical_id"],
         data["strokes"], data["frequency"], ",".join(data["on"]),
         ",".join(data["kun"]), ",".join(data["meanings"]), ""))


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


def parse_vocab(filename, cursor):
    """Parse given vocabulary file (should be called 'JMdict.xml') and insert
    vocabulary entries into database referenced by given cursor.
    """
    print("Parsing vocabulary xml-file...", end="\r")
    tree = ElementTree.parse(filename)
    root = tree.getroot()
    print("Parsing vocabulary xml-file... Done. Found %d entries" % len(root))

    print("Creating tables for vocabulary...", end="\r")
    create_vocab_tables(cursor)
    print("Creating tables for vocabulary... Done.")

    print("Inserting vocab entries into database... 0%", end="\r")
    for ID, entry in enumerate(root):
        parse_vocab_entry(ID, entry, cursor)
        perc = ((ID + 1) / len(root)) * 100
        print("Inserting vocab entries into database... %d%%" % perc, end="\r")
    print("Inserting vocab entries into database... 100%")

    print("Creating index on words...", end="\r")
    cursor.execute("CREATE INDEX words_word ON words(word)")
    print("Creating index on words... Done")
    print("Creating index on translations...", end="\r")
    cursor.execute(
        "CREATE INDEX translations_translation ON translations(translation)")
    print("Creating index on translations... Done")
    print("Creating index on readings...", end="\r")
    cursor.execute(
        "CREATE INDEX readings_reading ON readings(reading)")
    print("Creating index on readings... Done")
    # TODO: Which indices are needed most? Select carefully
    # print("Creating index on word news frequencies...", end="\r")
    # cursor.execute(
    #     "CREATE INDEX words_news_freq ON words(news_freq)")
    # print("Creating index on word news frequencies... Done")
    print("Creating index on words + word news frequencies...", end="\r")
    cursor.execute(
        "CREATE INDEX words_word_news_freq ON words(word, news_freq)")
    print("Creating index on words + word news frequencies... Done")


def parse_word_web_frequencies(filename, cursor):
    print("PARSING WEB FREQUENCIES IS NOT YET IMPLEMENTED")
    pass


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
            cursor.execute("UPDATE kanji SET meanings = ? WHERE entry = ?",
                    (",".join(newMeanings[kanji]), kanji))
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


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Parse data for language-pair 'Japanese'->'English'.")
    parser.add_argument("--vocabulary", "--vocab", "--voc", "-v",
            metavar="FILENAME",
            dest="vocab_filename", help="Filename of the vocabulary xml file.")
    parser.add_argument("--kanji", "--kan", "-k", metavar="FILENAME",
            dest="kanji_filename", help="Filename of the kanji file.")
    parser.add_argument("--radicals", "--rad", "-r", metavar="FILENAME",
            dest="radicals_filename", help="Filename of the radicals file.")
    parser.add_argument("--improvements", "--imp", "-i", metavar="FILENAME",
            dest="improvements_filename",
            help="Filename of the json file containing revised kanji meanings.")
    parser.add_argument("--strokes", "--str", "-s", metavar="FILENAME",
            dest="kanji_strokes_filename",
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
    parser.add_argument("--update-jlpt", "--jlpt", "-j",
            metavar="FILENAME", dest="new_jlpt_n3_kanji",
            help="Filename of the file containing new JLPT N3 kanji.")
    parser.add_argument("--output", "--out", "-o", metavar="FILENAME",
            dest="output_path", help="Directory path for output files.")
    args = parser.parse_args()
    output_path = args.output_path if args.output_path is not None else "data"
    # Define filenames and paths for output files
    database_path = os.path.join(output_path, "Japanese-English.sqlite3")
    kanji_strokes_path = os.path.join(output_path, "kanji-strokes.json")
    # Open database connection
    connection = sqlite3.connect(database_path)
    cursor = connection.cursor()
    # print("Creating data for language-pair 'Japanese'->'English'.")
    # Parse vocabulary
    if args.vocab_filename is not None:
        print("Parsing vocabulary from file '%s':" % args.vocab_filename)
        parse_vocab(args.vocab_filename, cursor)
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
    if args.improvements_filename is not None:
        print()
        print("Applying improved kanji meanings from file '%s':" %
            args.improvements_filename)
        parse_improved_kanji_meanings(args.improvements_filename, cursor)
    # Parse kanji part compositions
    if args.kanji_parts_filename is not None:
        print()
        print("Parsing kanji parts from file '%s':" %
                args.kanji_parts_filename)
        parse_kanji_parts(args.kanji_parts_filename, cursor)
    # Update JLPT levels (now 5 instead of previously 4 levels)
    if args.new_jlpt_n3_kanji:
        print()
        print("Updating JLPT levels using file '%s':" % args.new_jlpt_n3_kanji)
        update_jlpt_levels(args.new_jlpt_n3_kanji, cursor)
    connection.commit()
    connection.close()
    # Parse kanji stroke info
    if args.kanji_strokes_filename is not None:
        print()
        print("Parsing kanji strokes from file '%s':" %
                args.kanji_strokes_filename)
        parse_kanji_strokes(args.kanji_strokes_filename, kanji_strokes_path)
    print()

