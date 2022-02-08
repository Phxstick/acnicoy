PYTHON = python3
JP_EN_DATA_SCRIPT_PATH = ./generate-japanese-data.py
ZH_EN_DATA_SCRIPT_PATH = ./generate-chinese-data.py
BASE_RESOURCE_PATH = /mnt/c/Users/Danie/Dropbox/Acnicoy/Resources
JP_RESOURCE_PATH = $(BASE_RESOURCE_PATH)/Japanese
ZH_RESOURCE_PATH = $(BASE_RESOURCE_PATH)/Chinese
JP_EN_OUTPUT_PATH = ./Japanese-English
ZH_EN_OUTPUT_PATH = ./Chinese-English
ELECTRON_PATH = ./node_modules/.bin/electron

DICTIONARY_PATH = $(JP_RESOURCE_PATH)/JMdict
DICT_TEXTS_PATH = $(JP_RESOURCE_PATH)/improved-dictionary-texts.json
PROPER_NAMES_PATH = $(JP_RESOURCE_PATH)/enamdict
NAME_TAG_TEXTS_PATH = $(JP_RESOURCE_PATH)/name-tag-to-text.json
JLPT_VOCAB_N5_PATH = $(JP_RESOURCE_PATH)/jlpt-vocab-n5.txt
JLPT_VOCAB_N4_PATH = $(JP_RESOURCE_PATH)/jlpt-vocab-n4.txt
JLPT_VOCAB_N3_PATH = $(JP_RESOURCE_PATH)/jlpt-vocab-n3.txt
JLPT_VOCAB_N2_PATH = $(JP_RESOURCE_PATH)/jlpt-vocab-n2.txt
JLPT_VOCAB_N1_PATH = $(JP_RESOURCE_PATH)/jlpt-vocab-n1.txt
JLPT_VOCAB_MANUAL_PATH = $(JP_RESOURCE_PATH)/jlpt-vocab-manual-assignments.json
BOOK_FREQ_PATH = $(JP_RESOURCE_PATH)/book-frequencies.tsv

KANJI_PATH = $(JP_RESOURCE_PATH)/kanjidic
KANJI_MEANINGS_PATH = $(JP_RESOURCE_PATH)/improved-kanji-meanings.json
KANJI_RADICALS_PATH = $(JP_RESOURCE_PATH)/radical.utf8.txt
KANJI_PARTS_PATH = $(JP_RESOURCE_PATH)/kradfile
KANJI_STROKES_PATH = $(JP_RESOURCE_PATH)/kanjivg.xml
KANJI_NUMERALS_PATH = $(JP_RESOURCE_PATH)/numeric-kanji.json
KANJI_COUNTERS_PATH = $(JP_RESOURCE_PATH)/counter-kanji.json
KANJI_KOKUJI_PATH = $(JP_RESOURCE_PATH)/kokuji.txt
NEW_JLPT_N3_KANJI_PATH = $(JP_RESOURCE_PATH)/new-jlpt-n3-kanji.txt

ZH_DICTIONARY_PATH = $(ZH_RESOURCE_PATH)/cedict_ts.u8
ZH_HSK_VOCAB_PATH = $(ZH_RESOURCE_PATH)/hsk-vocab-2021.txt
ZH_WEB_WORD_FREQ_PATH = $(ZH_RESOURCE_PATH)/internet-zh.num
ZH_LCMC_WORD_FREQ_PATH = $(ZH_RESOURCE_PATH)/lcmc.num

HANZI_PATH = $(ZH_RESOURCE_PATH)/Unihan
HANZI_HSK_PATH = $(ZH_RESOURCE_PATH)/charlist.txt
HANZI_RADICALS_PATH = $(ZH_RESOURCE_PATH)/kangxi-radicals-wikipedia.tsv
HANZI_STROKES_PATH = $(ZH_RESOURCE_PATH)/graphics.txt
HANZI_DECOMP_PATH = $(ZH_RESOURCE_PATH)/dictionary.txt

.PHONY: jp_data zh_data jp_dictionary_data kanji_data zh_dictionary_data zh_hanzi_data build start install

all: build

build:
	gulp

start:
	$(ELECTRON_PATH) .

install:
	npm install

jp_data: jp_dictionary_data kanji_data

zh_data: zh_dictionary_data zh_hanzi_data

jp_dictionary_data:
	mkdir -p $(JP_EN_OUTPUT_PATH)
	$(PYTHON) $(JP_EN_DATA_SCRIPT_PATH) \
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
        -o $(JP_EN_OUTPUT_PATH)
	cp $(NAME_TAG_TEXTS_PATH) $(JP_EN_OUTPUT_PATH)

jp_kanji_data:
	mkdir -p $(JP_EN_OUTPUT_PATH)
	$(PYTHON) $(JP_EN_DATA_SCRIPT_PATH) \
        --kanji $(KANJI_PATH) \
        --kanji-meanings $(KANJI_MEANINGS_PATH) \
        --kanji-radicals $(KANJI_RADICALS_PATH) \
        --kanji-parts $(KANJI_PARTS_PATH) \
        --kanji-strokes $(KANJI_STROKES_PATH) \
        --jlpt-kanji $(NEW_JLPT_N3_KANJI_PATH) \
        --example-words-index \
        -o $(JP_EN_OUTPUT_PATH)
	cp $(KANJI_NUMERALS_PATH) $(JP_EN_OUTPUT_PATH)
	cp $(KANJI_COUNTERS_PATH) $(JP_EN_OUTPUT_PATH)
	cp $(KANJI_KOKUJI_PATH) $(JP_EN_OUTPUT_PATH) 

zh_dictionary_data:
	mkdir -p $(ZH_EN_OUTPUT_PATH)
	$(PYTHON) $(ZH_EN_DATA_SCRIPT_PATH) \
        --dictionary $(ZH_DICTIONARY_PATH) \
        --hsk-vocab $(ZH_HSK_VOCAB_PATH) \
        --web-freq $(ZH_WEB_WORD_FREQ_PATH) \
        --lcmc-freq $(ZH_LCMC_WORD_FREQ_PATH) \
        -o $(ZH_EN_OUTPUT_PATH)

zh_hanzi_data:
	mkdir -p $(ZH_EN_OUTPUT_PATH)
	$(PYTHON) $(ZH_EN_DATA_SCRIPT_PATH) \
        --hanzi $(HANZI_PATH) \
        --hsk-hanzi $(HANZI_HSK_PATH) \
        --radicals $(HANZI_RADICALS_PATH) \
        --strokes $(HANZI_STROKES_PATH) \
        --decomp $(HANZI_DECOMP_PATH)
