import os
import sys
import shutil
import importlib
import argparse
import json
from pathlib import Path

data_filenames = {
    "Japanese": {
        "words": {
            "dictionary": "JMdict_e",
            "dictionary-texts": "improved-dictionary-texts.json",
            "proper-names": "enamdict",
            "jlpt-vocab-n5": "jlpt-vocab-n5.txt",
            "jlpt-vocab-n4": "jlpt-vocab-n4.txt",
            "jlpt-vocab-n3": "jlpt-vocab-n3.txt",
            "jlpt-vocab-n2": "jlpt-vocab-n2.txt",
            "jlpt-vocab-n1": "jlpt-vocab-n1.txt",
            "jlpt-vocab-manual": "jlpt-vocab-manual-assignments.json",
            "book-frequencies": "book-frequencies.tsv",
            "name-tag-texts": "name-tag-to-text.json"
        },
        "kanji": {
            "kanji": "kanjidic",
            "meanings": "improved-kanji-meanings.json",
            "radicals": "radical.utf8.txt",
            "strokes": "kanjivg.xml",
            "parts": "kradfile",
            "numerals": "numeric-kanji.json",
            "counters": "counter-kanji.json",
            "kokuji": "kokuji.txt",
            "new-jlpt-n3": "new-jlpt-n3-kanji.txt"
        }
    },
    "Chinese": {
        "words": {
            "dictionary": "cedict_ts.u8",
            "hsk-vocab": "hsk-vocab-2021.txt",
            "web-frequencies": "internet-zh.num",
            "lcmc-frequencies": "lcmc.num"
        },
        "hanzi": {
            "hanzi": "Unihan",
            "hanzi-radicals": "kangxi-radicals-wikipedia.tsv",
            "hanzi-strokes": "graphics.txt",
            "hanzi-decomposition": "dictionary.txt",
            "hsk-hanzi": "charlist.txt"
        }
    }
}

def main():
    if len(sys.argv) < 3:
        print(f"Usage: python3 {sys.argv[0]} <language> <data-path> [options]")
        return
    supported_languages = ["Japanese", "Chinese"]
    language = sys.argv[1].capitalize()
    if language not in supported_languages:
        print(f"Language '{language}' is not supported.")
        print(f"Supported languages are:", ", ".join(supported_languages))
        return
    lang_lower = language.lower()
    lang2 = "English"
    data_path = sys.argv[2]
    options = sys.argv[3:]
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", "--out", "-o", metavar="FILENAME",
            dest="out_path", help="Directory path for output files")
    args = parser.parse_known_args(options)[0]
    script_path = Path(sys.path[0]).resolve()
    output_path = Path(args.out_path) if args.out_path else script_path
    output_path /= f"{language}-{lang2}"
    os.makedirs(output_path, exist_ok=True)

    language_module = importlib.import_module(f"generate-{lang_lower}-data")
    parts = data_filenames[language].keys()
    for part in parts:
        filenames = data_filenames[language][part]
        paths = {
            resource_name: Path(data_path) / filename
            for resource_name, filename in filenames.items()
        }
        if language == "Japanese":
            if part == "words":
                input_paths = language_module.InputPaths(**{
                    "dictionary": paths["dictionary"],
                    "dictionary_texts": paths["dictionary-texts"],
                    # "proper_names": paths["proper-names"],
                    "jlpt_vocab": [
                        paths["jlpt-vocab-n5"],
                        paths["jlpt-vocab-n4"],
                        paths["jlpt-vocab-n3"],
                        paths["jlpt-vocab-n2"],
                        paths["jlpt-vocab-n1"],
                        paths["jlpt-vocab-manual"],
                    ],
                    "word_book_frequencies": paths["book-frequencies"]
                })
                language_module.generate_data(input_paths, output_path)
                shutil.copy(paths["name-tag-texts"], output_path)
            elif part == "kanji":
                input_paths = language_module.InputPaths(**{
                    "kanji": paths["kanji"],
                    "kanji_meanings": paths["meanings"],
                    "kanji_radicals": paths["radicals"],
                    "kanji_strokes": paths["strokes"],
                    "kanji_parts": paths["parts"],
                    "new_jlpt_n3_kanji": paths["new-jlpt-n3"],
                    "example_words_index": paths
                })
                language_module.generate_data(input_paths, output_path)
                shutil.copy(paths["numerals"], output_path)
                shutil.copy(paths["counters"], output_path)
                shutil.copy(paths["kokuji"], output_path)
        elif language == "Chinese":
            if part == "words":
                input_paths = language_module.InputPaths(**{
                    "dictionary": paths["dictionary"],
                    "hsk_vocab": paths["hsk-vocab"],
                    "web_word_frequencies": paths["web-frequencies"],
                    "lcmc_word_frequencies": paths["lcmc-frequencies"]
                })
                language_module.generate_data(input_paths, output_path)
            elif part == "hanzi":
                input_paths = language_module.InputPaths(**{
                    "hanzi": paths["hanzi"],
                    "hsk_hanzi": paths["hsk-hanzi"],
                    "hanzi_radicals": paths["hanzi-radicals"],
                    "hanzi_strokes": paths["hanzi-strokes"],
                    "hanzi_decomposition": paths["hanzi-decomposition"]
                })
                language_module.generate_data(input_paths, output_path)

    # Gather information about program versions and language data versions
    package_path = script_path / "package.json"
    version_register_path = script_path / "data" / "min-content-versions.json" 
    with open(package_path, encoding="utf-8") as f:
        package_info = json.load(f)
        program_version = package_info["version"]
    with open(version_register_path, encoding="utf-8") as f:
        min_content_versions = json.load(f)

    # Write version infos to output directory
    content_versions_path = output_path / "versions.json"
    min_program_versions_path = output_path / "min-program-versions.json"
    with open(content_versions_path, "w", encoding="utf-8") as f:
        json.dump(min_content_versions[language][lang2], f)
    with open(min_program_versions_path, "w", encoding="utf-8") as f:
        obj = {}
        for filename in min_content_versions[language][lang2]:
            obj[filename] = program_version
        json.dump(obj, f)

if __name__ == "__main__":
    main()
