PYTHON = python3
DATA_SCRIPT_PATH = ./createJapaneseData.py
RESOURCE_PATH = ~/Dropbox/TrainerResources
OUTPUT_PATH = ./data/language-content/Japanese-English

VOCAB_PATH = $(RESOURCE_PATH)/JMdict.xml
RADICALS_PATH = $(RESOURCE_PATH)/radical.utf8.txt
IMP_PATH = $(RESOURCE_PATH)/improvedKanjiMeanings.json
NEW_JLPT_N3_PATH = $(RESOURCE_PATH)/new_jlpt_n3_kanji.txt
KANJI_PATH = $(RESOURCE_PATH)/kanjidic.txt
KANJI_PARTS_PATH = $(RESOURCE_PATH)/kradfile
KANJI_STROKES_PATH = $(RESOURCE_PATH)/kanjivg-20150615-2.xml
KANJI_NUMERALS_PATH = $(RESOURCE_PATH)/numeric-kanji.json
KANJI_COUNTERS_PATH = $(RESOURCE_PATH)/counter-kanji.json

.PHONY: data vocab_data kanji_data build start


all: build

build:
	gulp

start:
	./node_modules/.bin/electron .


data: vocab_data kanji_data

vocab_data:
	$(PYTHON) $(DATA_SCRIPT_PATH) --vocab $(VOCAB_PATH) -o $(OUTPUT_PATH)

kanji_data:
	$(PYTHON) $(DATA_SCRIPT_PATH) \
        --kanji $(KANJI_PATH) --radicals $(RADICALS_PATH) \
        --imp $(IMP_PATH) --kanji-parts $(KANJI_PARTS_PATH) \
        --jlpt $(NEW_JLPT_N3_PATH) --strokes $(KANJI_STROKES_PATH) \
        -o $(OUTPUT_PATH)
	cp $(KANJI_NUMERALS_PATH) $(OUTPUT_PATH)
	cp $(KANJI_COUNTERS_PATH) $(OUTPUT_PATH)
