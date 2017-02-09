### Up next
- Move stuff in settings section into a settings manager?
- Fix: Focusing inputs in srs-schemes-overlay does not work anymore!
- Make kana input not only react to shift, but also caps-lock and caps letters
- Implement test-settings and extend test-section accordingly
- Implement most of the general settings
- Create a content management system for downloading and updating content
  - Info window when (new) language pack is available for a language
    - Allow user to start downloads and link to settings for progress bar
  - Implement content downloading (Use stylable HTML5 progress bar for this)
- Finish removing languages and refactor init-chain and windows for that

### As soon as available
- Celebrate the day async/await is fully supported in electron (maybe with flag)
  - Immediately rewrite index.js chain, main window, datamanager methods
- Remove custom-elements-flag in main.js (as soon as electron has chrome v54)
- Use thin symbols for fa-times, fa-plus etc. where fitting
- Implement dynamic adding of tabs in tabbed-frame using slotchange-event

### Fixes
- SRS level editing is not fully stable (Maybe remove ability to edit levels?)
  - Make sure levels are ordered after resolving invalid values in SRS schemes
  - Make sure empty levels get removed/highlighted without requiring user input
- CSS Tooltip Issues (Need to make a widget I guess):
  - z-index is incorrect (Applied workaround)
  - can leave view
  - Memory hog when using on many elements
- Height of diagrams in stats section is slightly too large for some reason
- Correctly resize svg-bar-diagram when resizing window (set width + height)
- Order of context menu items is not preserved

By category
--------------------------------------------------------------------------------
### General
- Use popupMenu separators when context changes? (see e.g. dictionary entry)
  - Or rather split menu entries into groups to seperate by? (e.g. copy/paste)
- Create a custom menu bar?
- Remove flickering when quickly dragging vocab item over list contents column
  - Not a bug in Acnicoy - Events are just fired incorrectly
- Expose shortcut for reloading program?
- Implement suggestion windows for other panels
  - Remove `globals.suggestionPanes` and use `globals.panels` instead
- Store user data path somewhere else (e.g. localStorage/`app.getPath(name)`)
  - Also store downloaded content and language packs somewhere else to allow
    putting all user data (including backups) into Dropbox
- Make semicolon standard separator to fix some bugs with language data
- Adjust scrollbars to corresponding background color so that they're always
  visible well. Also consider using thin, rounded scrollbars with margin
- Improve policy for incorrectly answered SRS items
  - Don't always move down two levels, but one with adjusted review time instead
- Calculate *urgency level* for given set of vocabulary (Show in home-section)
  - Allow testing vocabulary in approximate urgency order
- Use "srs-schemes-edited" event instead of "current-srs-scheme-edited"?
- How to get undo/redo possibility for each item seperately?
- Also make files for improved on/kun-yomi (or rather put in same file?)

### Code
##### Naming
- Rename panels into "panes" or "sliding-panes"?
- Probably rename "window" to "screen"
- Rename "overlay" global into "overlays"
- Call "popupMenu" "contextMenu" instead
- Use folder "widgets" only for base widgets, put everything else directly into
  a folder called "gui-components"
  - Adjust pathManager and index.js
- Remove inconsistencies in code, e.g. unify glossary ("word" <-> "entry")
  - Especially in dataManager

##### Refactoring
- Have htmlManager and cssManager which make sure all assets are only loaded
once? --> Faster loading, centralized resource loading
- Make automatically-loading-upon-scrolling-divs into widgets?
- Make data-manager-modules into subclasses and gather similar code
  - Especially if static variables become implemented (or Typescript is used)!
- Split widgets into components specific to Acnicoy and base-widgets
  - Make base-widgets completely independent of Acnicoy (e.g. no base import)
- Make partitioned window stuff into class?
- Solve design dilemma concerning tabbed frame
  - Allow full styling of all frames while keeping it semantic
- Simply register event listeners in constructor after all?
- Use JS to position popup-panes and don't make it child of triggering button
- Hide all initially hidden things with javascript instead of CSS? Works?
- Organize each dataManager module into following scheme?
  1. Control functions (load, save, setLanguage)
  2. Functions completely independent of languages
  3. Functions operating on current language
  4. Functions depending on any other language (using `dataMap`)
- svg-bar-diagram: Pass in length-parameters as options to draw-function

##### Adaptions
- Use `position: sticky` for kanji info panel in kanji section?
- use split function from sqlite instead of JS version?
- Use ruby annotations for furigana
- Allow adding text to checkbox in a slot after a margin
- Use CSS counters where necessary (Especially srs-schemes-overlay)
- Extend markdown-js to suit the purpose of the program
  - See Japanese stack exchange for furigana syntax
  - Provide easy way create kanji-links (or just scan through markdown)
- Identify SRS schemes by ID instead of name!
- Use advanced CSS width values where possible (`width: fill`);

### Performance
- Things got slower when reworking sass? Maybe because main window is flex now?
  Replace with `calc(100% - x)` or `width: fill`?

### Init window
- Make init section feel more welcoming and less plain
  - Consider including a welcome message
  - Consider putting program name above panes
  - Consider using a subtle pattern as background picture

### Main window
- Remember where focus was when opening panel, restore after closing panel again
- Create quick start overlay with quick info on structure of the program
  - Give option to "not display this window again on program start"
  - Display on program start if not disabled
- Highlight menu button whose corresponding section/panel is opened?
  Or otherwise indicate which section/panel is currently opened?
- Shortcut, probably Ctrl+R, to reload stuff, e.g. update SRS stuff?
- Create shortcut for testing all languages in given order.
  - Order can then be changed by dragging languages around in settings
- Close-Panel shortcut (Default: ESC)

### Home section
- Extend srs-status-bar
  - Display info message if vocabulary is empty
  - Allow showing detailed infos per mode
  - Replace "level" label with reload- and help-button?
  - Add a displayable bar-diagram to visualize SRS status

### Svg Bar Diagram
- Use a shadow at both sides to show when scrolling is possible
- Show percentage in top margin (if maxValues are given)
- Display tooltips (showing e.g. "current/total") on hover when flag is set

### Test section
- Save test state when closing an unfinished test. Only confirm on program exit
- Also construct extended solutions in `_createTest` already ?
- Properly handle overflow if correct-answer-frame gets too large
  - Try to fade out items at bottom if list is too large,
    remove fading when bottom reached
- Show where the entry goes (And allow directly choosing other level aswell)
- Show score gained during test
- Show test progress
- Animate:
  - Test item container (fade in sliding to right, fade out sliding to right)
  - solution-items (fade in each one sliding to bottom after previous one)
  - Animation when score gets updated (green/red text with +/- sliding up)?
- Display more detailed statistics at end of test (`test-finished-overlay`)
  - Display items answered incorrectly (along with answers on click/hover)

### Kanji Info Panel
- Allow seeing stroke animation instead of pictures (and customize speed)
- Use mapping to quickly load kanji examples (Store in file)
- Possibly make mapping from kanji parts to actual parts in SVG drawing
to make sure all parts are properly highlighted
- Show info for kanji which are part of the Chinese zodiac
- Show info for kanji which symbolize a country
- Show info for kanjj which can be used as a measure/metric
- Have separate table for searching kanji, extend readings by ones without
  a ".", keep all meanings for each kanji
- Link to an info page for each kanji detail (like country/measure/number)
- Have link to kanji disambiguation if there are kanji with similar meanings
- Add new icons below close-button
  - Allow user to maximize panel (then display all info in one frame)
  - Allow user to adjust some settings
    - [Checkbox] Display commonly used nanori
    - [Checkbox] Show stroke animation instead of pictures
    - [Checkbox] Show detailed example word entries (as in dictionary)
    - [Checkbox] Hide outdated/rare yomi (also adjust for search results)
  - Forward and backward buttons (to browse kanji info history)

### Panels
- Allow vocab-add-separators to be escaped for single translations
- Add search function for existing vocabulary lists to add in both panels
- Make add-vocab-selector an entry with suggestions? Or display on click?
  - Allows creating new vocab lists directly in the panel
  - Allows searching for existing vocab lists quickly
  - Display items for each added list to allow adding multiple ones
  - Highlight items for lists that are not yet created
- Consider suggesting vocabulary lists when adding/editing words as well
  - Requires a dataset of predefined vocabulary lists
- Implement changing order of translations by dragging
- Consider displaying add-button only when hovering over a section
  - Replace add-button with new editable item on click
  - Allow immediately adding several items in a row
- Consider using lists instead of textareas for add-panels too
  - Maybe even replace add-panels with edit-panels

### Vocab section
- Implement tests on vocabulary lists
- Implement searching in vocab lists and list contents

### Dictionary
- Display link to dictionary section help in info-frame
- Search settings:
  - [Checkbox] Display part-of-speech in Japanese
  - [Checkbox] Only show a single combined search entry (like Jisho)
  - [Checkbox] Search for names instead of words
- Implement better sort algorithm including word-length
- Keep search history (viewable using a button in control bar?)
- Focus on search entry when using Ctrl+f shortcut
  - Switch between search entries when repeatedly pressing shortcut

### Kanji section
#### Overview
- Overview customization:
  - Display kanji by:
    * [Radiobutton] grade [default]
    * [Radiobutton] frequency
    * [Radiobutton] JLPT level
    * [Radiobutton] stroke count
    * [Radiobutton] radical
  - [Checkbox] Display Jinmeiyou kanji [default OFF]
  - [Checkbox] Display hyougai kanji [default OFF]
  - [Checkbox] Display added kanji [default ON]
#### Search
- Display search info when searching with empty bar (or list all added kanji?)
- If query stayed the same, just open search results without searching again
- Filter duplicates
- Search customization:
  - Search by:
    * [Radiobutton] kanji [default]
    * [Radiobutton] meanings
    * [Radiobutton] yomi (Also change to kana-input)
  - [Checkbox] Show only meanings for each entry (and allow expanding)
- Display "Info"/"Strokes"/"Examples" buttons only on hover (Where? On right?)
  - "Examples" button linking to dictionary section in each search result?
    Or rather expand search result entry?
  - Strokes being displayed in a single scrollable row

### Migrate-srs-overlay
- Make migrating SRS items safer by applying changes to a copy of data and
  replacing old data only after migration has finished successfully?
  - Or rather use SQLITE3 transactions/savepoints/rollbacks
- Find algorithm to create reasonable default SRS scheme migration connections
- Remove connectors for old scheme levels which have no items associated
- Make sure that connections starting from the same level are always connected
  to a *consecutive* row of levels (otherwise, disallow connection)?

### Stats/Achievements
- Use single-bar diagram for kanji progress to display relative to total!
- Display earned achievement in status bar and make it glow to highlight
- Daily stats diagrams below the general stats, next to each other
  - One for mastery points, one for new vocab/kanji added
  - Allow displaying both daily and cumulative progress for each diagram
  - Also color each bar in two colors according to kanji and vocab progress
- Possibly use D3.js for diagrams?

### Help
- Use overlay widget
- Use markdown and extend it
- Create directory tree
#### Help structure:
- Introduction
- Quick start
- [Separator]
- SRS
  - Overview
  - Editing schemes
  - Migrating items
- Vocabulary
  - Editing
  - Lists
- Home section
- Testing
- [Separator]
- Japanese
  - Dictionary
  - Kanji section

### About
- Use overlay and include (hardcoded is fine I guess):
  - Tribute to base technologies (Electron and node.js)
  - List of all used language recources as links
  - Link to project on Github and link to feedback opportunity
  - Specify used license

List of settings
--------------------------------------------------------------------------------
#### General settings
- [File-Dialog] Change user data path
- [Checkbox] Notify me when SRS item reviews are available
  - [Widget] Choose time intervals for notification
- [Checkbox] Regularly backup data
  - [Widget] Choose backup interval
- [Button] Check for program updates (Check automatically every ~1 hour)
  - [Button] Update program (Do so safely)

#### Test settings
- [Checkbox] Display test progress
- [Checkbox] Display score gained (with xp-like animations when upated)
- [Checkbox] Load new test items during test
- [Checkbox] Color test item background according to test item type?
  - [Checkbox] Fade test item background
- [Button] Customize SRS schemes
- [Checkbox] Use flashcard-style testing
- [Checkbox] Allow ignoring answer per shortcut
  - [Shortcut-Widget] Choose shortcut for ignoring answer

#### Design settings
- [Checkbox] Animate test items
- [Checkbox] Animate panels
- [Checkbox] Animate Popup stacks
- [Checkbox] Animate section switching
- [Checkbox] Compress side bar into icons
- [Popup-List] Cursor selection (Some have to be unlocked)
  - Drill cursor for large achievement (e.g. 1000 kanji)
  - Tamamo's fluffy tail cursor for larger achievement (e.g. 600 kanji)
  - Yona's hairpin cursor for medium achievement (e.g. 300 kanji)
  - Meliodas' dragon handle for small achievement (e.g. 150 kanji)
- [Popup-List] Color schemes
  - Have "designs" subfolder in sass directory with named sass partials
  - Definitely implement dark version for current default scheme
  - Solarized (Light/Dark) and Ubuntu (Light/Dark) Color schemes

#### Shortcuts
- [Shortcut-widgets] For all known shortcuts in the settings

#### TODO: Categorize these
- [Radiobuttons] Choose separator for separating translations/readings

List of achievements
--------------------------------------------------------------------------------
#### Global achievements (Count for all languages)
- [Diversity] At least 3 languages registered.
- [Multicultural] At least 6 languages registered.
- [Hyperpolyglot] At least 9 languages registered.
- [Eager] At least 1000 SRS items tested.
- [Diligent] At least 10000 SRS items tested.
- [Zealous] At least 50000 SRS items tested.

#### Local achievements (Can be earned for each language)
- [Beginner] At least 1000 vocabulary items registered.
- [Learned] At least 5000 vocabulary items registered.
- [Master] At least 10000 vocabulary items registered.

Future
--------------------------------------------------------------------------------
- Allow converting parts of vocabulary into html/pdf/markdown file
  - Use electrons builtin for pdf (And a fitting media stylesheet?)
- Correctly assign furigana
- Restructuring: Separate core functionality from language extensions
  - Provide interface for extensions, e.g.:
    - `addMenuButton(label, callback)` for main-section extensions
    - `addStatistic(element)` for stats-section extensions
  - Use ES6 proxies for data modules
  - Split data generation from makefile into one for each language,
  along with the py script to generate it
- Consider making kanji-modes into single one with 2-3 parts for each kanji
  - Very problematic for partly added kanji
  - Would allow more stylish and compact mode presentation
  - Would allow easier importing from Houhou SRS
- Find monolingual dictionary for Japanese
- Add additional field to kanjiData database for "hidden acceptable meanings",
  containg synonyms or words with very similar meaning?
  - Show option in test settings to turn hidden meanings on or off
  - Allow displaying hidden meanings in kanji info
- Have invisible translations for synonyms/unnecessary words (e.g. AE <-> BE)
- Proper focus system with frames and elements for tabbing
- Zinnia or Tegaki for handwritten character recognition
- Allow exporting vocabulary somehow (e.g. csv, xml)
- Extend vocabulary section to allowing viewing detailed list of vocab items
- Split kanji meanings into groups too?
  - Adjust kanji info panel and suggestion windows for kanji panels
- Migrate to Typescript (And offer interfaces for language extensions)?
- How to handle overtime due of SRS items? E.g. if an item has been scheduled
  for after a day, but has been answered correctly after 1 month - should the
  item be moved to 2 days, or directly to 2 months?
  -> Disambiguate between *frequent practice* and *long memorization time*
  -> Make test-settings for handling these according to preferences
- Add new database columns for non-outdated/non-rare on-/kun-yomi
- Allow having different SRS schemes for each test-mode
- Link to similar looking kanji in info-panel to disambiguate more easily,
  also link to additional information (e.g. history, meanings) if available.
- Make a better dragging image in vocabulary section
- Create custom set of cursors
- Allow user to customize pinwall (button in settings + overlay side-bar)?
- Implement changelog-widget (for changelogs saved in local storage somewhere)?

### Content section
- Create similar kanji/word disambiguation pages of the following form:
  - [Optional] Title
  - List of kanji/words under consideration (can be used instead of title)
  - [Optional] Introduction (e.g. mention the general shared meanings/notions)
  - List of separate elucidations (info for each kanji/word)
    - [Optional, for kanji] Some example words to see the differences clearly
  - [Optional] Supplementary information (Joint disambiguation, or notes)
  - [Optional] Sources
- Contains a database of custom info cards
- Allow uploading and sharing vocabulary lists
- Offer small coding environment for creating cards with extended markdown

Credits to add
--------------------------------------------------------------------------------
- <https://subtlepatterns.com/>

Resources
--------------------------------------------------------------------------------
#### Japanese
- [New JLPT stuff](http://www.tanos.co.uk/jlpt/skills/vocab/)
  - Get JLPT lists for words too
- [Unicode ranges](http://www.rikai.com/library/kanjitables/kanji_codes.unicode.shtml)
- [Word freq](http://pj.ninjal.ac.jp/corpus_center/bccwj/en/freq-list.html)
- [Counters](http://hiramatu-hifuka.com/onyak/onyak2/josu-ta.html)
- Kanji textbook/Internet frequencies?
- [Honorific language](http://www.levelup99.net/businessmanner/cate3post24.html)
  - Study uses of Teineigo, Sonkeigo, Kenjougo
- [Country names in Kanji](http://www.jref.com/articles/country-names-in-kanji.224/)

#### CSS/DOM
- [Buttons](http://usabilitypost.com/2012/01/10/pressed-button-state-with-css3)
- [Shadow DOM](https://webkit.org/blog/4096/introducing-shadow-dom-api)
- [CSS Grid](https://css-tricks.com/snippets/css/complete-guide-grid)
- [Selection API](http://caniuse.com/#feat=selection-api)
(`window.getSelection()`, `selectionstart`, `selectionchanged`)
- [Convenient DOM Manipulation](http://caniuse.com/#feat=dom-manip-convenience)
- Use `Element.scrollIntoViewIfNeeded()`
- [Focus within](http://caniuse.com/#feat=css-focus-within)
- [Scrollbar styling](http://caniuse.com/#feat=css-scrollbar)
- [CSS triangles](http://apps.eky.hk/css-triangle-generator/)
- [Background images](https://subtlepatterns.com/)
