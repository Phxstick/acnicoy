
### Kanji

Aside from importing words (as explained [here](help#Components#Vocabulary#Importing_items)), you can also import kanji into your vocabulary. The following field names are recognized when importing kanji:

- Kanji
- Meanings
- Readings (kun-yomi should be written in hiragana, and on-yomi in katakana)
- On yomi (if not already provided using the "readings" field)
- Kun yomi (if not already provided using the "readings" field)
- Creation date
- (Meanings / On yomi / Kun yomi) SRS level
- (Meanings / On yomi / Kun yomi) review date
- (Meanings / On yomi / Kun yomi) mistake count
- (Meanings / On yomi / Kun yomi) correct count


As with importing words, at least one meaning or readings must be provided.
SRS levels, review dates and status counts can be provided separately for each
detail by using the corresponding prefix, e.g. "On Yomi SRS Level". To set all
values at once, one can also provide a single field without any prefix.

### Houhou SRS

Acnicoy offers the possibility to import CSV data that has been exported from
Houhou SRS, which is a vocabulary learning application similar to Acnicoy.
Despite the similarities, the two applications have some incompatibilities
regarding the data that is stored as part of vocabulary items. Importing items
can therefore entail loss of data, as listed below:

- Kanji tags will be **discarded**.
- Kanji notes will be **discarded**.
- Suspended vocabulary items are not recognized as such.
  The suspension date will be **discarded**.
- The creation dates are not part of the exported CSV file and are therefore 
  **lost**. However, the order of item creation is preserved.

Additionally, some of the imported data might be assigned differently:

- Reading notes of words will be moved to the meaning notes.
- Unlike Acnicoy, Houhou does not track review counts and mistake counts
  seperately for kanji meanings and readings. The given counts will be
  assigned to all fields (meanings, on-yomi and kun-yomi).
- Houhou does not distinguish between on-yomi and kun-yomi in vocabulary items.
  To enable correct assignment of readings, language data must be available
  during the import procedure. Kanji that are not present in the dictionary
  might still get their readings assigned incorrectly.

