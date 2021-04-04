PYTHON = python3
DATA_SCRIPT_PATH = ./generate-japanese-data.py
RESOURCE_PATH = /mnt/c/Users/Danie/Dropbox/Acnicoy/Resources/Japanese
OUTPUT_PATH = ./Japanese-English
ELECTRON_PATH = ./node_modules/.bin/electron

DICTIONARY_PATH = $(RESOURCE_PATH)/JMdict
DICT_TEXTS_PATH = $(RESOURCE_PATH)/improved-dictionary-texts.json
PROPER_NAMES_PATH = $(RESOURCE_PATH)/enamdict
NAME_TAG_TEXTS_PATH = $(RESOURCE_PATH)/name-tag-to-text.json
JLPT_VOCAB_N5_PATH = $(RESOURCE_PATH)/jlpt-vocab-n5.txt
JLPT_VOCAB_N4_PATH = $(RESOURCE_PATH)/jlpt-vocab-n4.txt
JLPT_VOCAB_N3_PATH = $(RESOURCE_PATH)/jlpt-vocab-n3.txt
JLPT_VOCAB_N2_PATH = $(RESOURCE_PATH)/jlpt-vocab-n2.txt
JLPT_VOCAB_N1_PATH = $(RESOURCE_PATH)/jlpt-vocab-n1.txt
JLPT_VOCAB_MANUAL_PATH = $(RESOURCE_PATH)/jlpt-vocab-manual-assignments.json
BOOK_FREQ_PATH = $(RESOURCE_PATH)/book-frequencies.tsv

KANJI_PATH = $(RESOURCE_PATH)/kanjidic
KANJI_MEANINGS_PATH = $(RESOURCE_PATH)/improved-kanji-meanings.json
KANJI_RADICALS_PATH = $(RESOURCE_PATH)/radical.utf8.txt
KANJI_PARTS_PATH = $(RESOURCE_PATH)/kradfile
KANJI_STROKES_PATH = $(RESOURCE_PATH)/kanjivg.xml
KANJI_NUMERALS_PATH = $(RESOURCE_PATH)/numeric-kanji.json
KANJI_COUNTERS_PATH = $(RESOURCE_PATH)/counter-kanji.json
KANJI_KOKUJI_PATH = $(RESOURCE_PATH)/kokuji.txt
NEW_JLPT_N3_KANJI_PATH = $(RESOURCE_PATH)/new-jlpt-n3-kanji.txt

.PHONY: data dictionary_data kanji_data build start install

all: build

build:
	gulp

start:
	$(ELECTRON_PATH) .

install:
	npm install

data: dictionary_data kanji_data

dictionary_data:
	mkdir -p $(OUTPUT_PATH)
	$(PYTHON) $(DATA_SCRIPT_PATH) \
        --dict $(DICTIONARY_PATH) \
        --texts $(DICT_TEXTS_PATH) \
        --names $(PROPER_NAMES_PATH) \
        --jlpt $(JLPT_VOCAB_N5_PATH) \
               $(JLPT_VOCAB_N4_PATH) \
               $(JLPT_VOCAB_N3_PATH) \
               $(JLPT_VOCAB_N2_PATH) \
               $(JLPT_VOCAB_N1_PATH) \
               $(JLPT_VOCAB_MANUAL_PATH) \
        --books $(BOOK_FREQ_PATH) \
        -o $(OUTPUT_PATH)
	cp $(NAME_TAG_TEXTS_PATH) $(OUTPUT_PATH)

kanji_data:
	mkdir -p $(OUTPUT_PATH)
	$(PYTHON) $(DATA_SCRIPT_PATH) \
        --kanji $(KANJI_PATH) \
        --kanji-meanings $(KANJI_MEANINGS_PATH) \
        --kanji-radicals $(KANJI_RADICALS_PATH) \
        --kanji-parts $(KANJI_PARTS_PATH) \
        --kanji-strokes $(KANJI_STROKES_PATH) \
        --jlpt-kanji $(NEW_JLPT_N3_KANJI_PATH) \
        --example-words-index \
        -o $(OUTPUT_PATH)
	cp $(KANJI_NUMERALS_PATH) $(OUTPUT_PATH)
	cp $(KANJI_COUNTERS_PATH) $(OUTPUT_PATH)
	cp $(KANJI_KOKUJI_PATH) $(OUTPUT_PATH) 
