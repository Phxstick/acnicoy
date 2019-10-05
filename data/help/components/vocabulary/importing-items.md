Vocabulary items can be imported into Acnicoy by opening the vocabulary section
and pressing the "Import" button at the bottom of the left row.

The file must be of CSV format, i.e. each row corresponds to a vocabulary item
and contains all associated data in fields that are separated with a comma,
semicolon or tab (the used separator can be specified at the beginning of the
import procedure).

The file must contain a header row consisting of supported field names, which
are listed in the following. All names are case insensitive, spaces can be
omitted or replaced with hyphens or underscores, and the order of fields in the
file may be arbitrary.

- Word (mandatory)
- Meanings (mandatory unless readings are provided)
- Readings (mandatory unless translations are provided)
- Notes
- SRS level
- Creation date
- Review date (as date string or unix time)
- Mistake count
- Correct count
- Tags (= vocabulary lists)
- Dictionary ID (ID of the associated dictionary entry if it exists)

Only the word and at least one meaning or reading must be provided, all
other data is optional. Also note the following:

- Items assigned to SRS levels that do not exist in the current SRS scheme
  will be assigned to the last level of the current scheme. To ensure correct
  assignment of levels, please choose a fitting SRS scheme first.
- Items that are already in the vocabulary get updated with missing values
  from the imported data. None of the existing data gets deleted or modified.

