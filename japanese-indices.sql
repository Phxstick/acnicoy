CREATE INDEX words_word ON words (word COLLATE NOCASE);
CREATE INDEX translations_translation ON translations (translation COLLATE NOCASE);
CREATE INDEX readings_reading ON readings (reading COLLATE NOCASE);
CREATE INDEX words_id ON words (id);
CREATE INDEX meanings_id ON meanings (id);
CREATE INDEX readings_id ON readings (id);

CREATE INDEX proper_names_name ON proper_names (name COLLATE NOCASE);
CREATE INDEX proper_names_reading ON proper_names (reading COLLATE NOCASE);

CREATE INDEX radicals_radical ON radicals (radical ASC);
CREATE INDEX radicals_strokes ON radicals (strokes ASC);

CREATE INDEX kanji_entry ON kanji (entry ASC);
CREATE INDEX kanji_grade ON kanji (grade ASC);
CREATE INDEX kanji_strokes ON kanji (strokes ASC);
CREATE INDEX kanji_frequency ON kanji (frequency ASC);
CREATE INDEX kanji_radical_id on kanji (radical_id ASC);
