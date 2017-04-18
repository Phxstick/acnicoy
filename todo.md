### Up next
- Implement chronological ordering of vocabulary
- `text-align: center` impairs fadeIn function. How to work around?
  - Add `text-align` to solution divs again
- Implement reverse testing (especially for Russian)
- Button to manually check for content updates (+ "last checked" label)
- Button to check for program updates (+ "last checked" label)
- Further refactor Application framework
  - Implement quit-function of Application class, move controlled closing there
- Make status update message fade out after a short while if not updated
- Make sure entry content in dictionaries is always selected on focus!
- Fix: Focusing inputs in srs-schemes-overlay does not work anymore!
- Make kana input not only react to shift, but also caps-lock and caps letters
- Implement program updating
  - Add update button to settings
  - Make sure user data is saved before an update
- Allow using Ctrl+Enter for saving notes and submitting new vocab/kanji
- Allow selecting popup-stack item with arrow keys and number keys!
- Test on new data instance whether deleting kanji also deletes kanji data
  (are constraints really applied to database now?)
- New setting: [Checkbox] Automatically update language content if available
- Register content-related shortcuts in adjustToLanguageContent instead
- Don't focus editable span on right click in edit panels

### As soon as available
- Use thin symbols for fa-times, fa-plus etc. where fitting

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
- Remove flickering when quickly dragging vocab item over list contents column
  - Not a bug in Acnicoy - Events are just fired incorrectly
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
- Use "srs-schemes-edited" event instead of "current-srs-scheme-edited"?
- How to get undo/redo possibility for each item seperately?
- Also make files for improved on/kun-yomi (or rather put in same file?)
- Create stylable `<select>` alternative
- Make dark deflt, Solarized (Light/Dark) and Ubuntu (Light/Dark) color schemes
- Implement global stats somewhere
- Add "all languages" option to SRS review schedule
- Differentiate between standard gui-font and "content-font"

### Performance
- Things got slower when reworking sass? Maybe because main window is flex now?
  Replace with `calc(100% - x)` or `width: fill`?

### Init window
- Make init section feel more welcoming and less plain. Consider:
  - including a welcome message
  - putting program name above panes
  - using a subtle pattern as background picture

### Main window
- Remember where focus was when opening panel, restore after closing panel again
- Create quick start overlay with quick info on structure of the program
  - Give option to "not display this window again on program start"
  - Display on program start if not disabled
- Highlight menu button whose corresponding section/panel is opened?
  Or otherwise indicate which section/panel is currently opened?
- Create shortcut for testing all languages in given order.
  - Order can then be changed by dragging languages around in settings

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
- Re-evaluate answer after current item has been edited?
- If item has been renamed, directly display change instead of skipping?
- Also animate upwards-movement of test item when solutions are given

### Kanji Info Panel
- Allow seeing stroke animation instead of pictures (and customize speed)
- Use mapping to quickly load kanji examples (Store in file)? (Memory?)
- Possibly make mapping from kanji parts to actual parts in SVG drawing
  to make sure all parts are properly highlighted
- Show info for kanji which are part of the Chinese zodiac
- Show info for kanji which symbolize a country
- Have separate table for searching kanji, extend readings by ones without
  a ".", keep all meanings for each kanji
- Have link to kanji disambiguation if there are kanji with similar meanings
- Add new icons below close-button
  - Maximize panel (then display all info in one frame)
  - Settings
    - [Checkbox] Display commonly used nanori
    - [Checkbox] Show stroke animation instead of pictures
    - [Checkbox] Show detailed example word entries (as in dictionary)
    - [Checkbox] Hide outdated/rare yomi (also adjust for search results)
  - Forward and backward buttons (to browse kanji info history)
  - Open kanji info history

### Suggestion panes
- Consider suggesting vocabulary lists when adding/editing words as well
  - Requires a dataset of predefined vocabulary lists
- Use events to notify changes between panel and suggestion pane?

### Panels
- Allow vocab-add-separators to be escaped for single translations
- Add search function for existing vocabulary lists to add in both panels
- Make add-vocab-selector an entry with suggestions? Or display on click?
  - Allows creating new vocab lists directly in the panel
  - Allows searching for existing vocab lists quickly
  - Display items for each added list to allow adding multiple ones
  - Highlight items for lists that are not yet created
- Implement changing order of translations by dragging
- Consider displaying add-button only when hovering over a section
  - Replace add-button with new editable item on click
  - Allow immediately adding several items in a row
- Consider using lists instead of textareas for add-panels too
  - Maybe even replace add-panels with edit-panels

### Vocab section
- Implement searching in vocab lists and list contents

### Dictionary
- Display link to dictionary section help in info-frame
- Search settings:
  - [Checkbox] Display part-of-speech in Japanese
  - [Checkbox] Only show a single combined search entry (like Jisho)
  - [Checkbox] Search for names instead of words
- Implement better sorting algorithm including word-length
- Keep search history (viewable using a button in control bar?)

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
- Display info messages as in dictionary section
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

### Content downloading
- Download still tends to only work the first time on a day?
- Also consider data in memory buffer in download status
  - "currentSizeIncludingBuffered" in downloadsInfo?
- Implement pausing functionality for downloads (and in settings)
  - Automatically continue downloads in networkManager unless paused?
  - Save "paused" boolean in downloadsInfo as well
  - Save "downloadPaused" boolean in language table config as well
- Switch between percentage and exact values (in MB) upon clicking progressbar
- Split "info" request-target into "info" and "versions" to save bandwidth?
- Try to split some general network stuff off of content.startDownload
  - Move content-stuff from networkManager into dataManager.content? Partly?
- Remove all log messages
- Retry button next to error message in each row

### Stats/Achievements
- Use single-bar diagram for kanji progress to display relative to total!
- Display earned achievement in status bar and make it glow to highlight
- Daily stats diagrams below the general stats (next to each other?)
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
  - Program version
  - Tribute to base technologies (Electron and node.js)
  - Name of author
  - List of all used language recources as links
  - Link to project on Github and link to feedback opportunity
  - Specify used license

List of settings
--------------------------------------------------------------------------------
#### General settings
- [Button] Check for program updates (Check automatically every ~1 hour)
  - [Button] Update program (Do so safely)

#### TODO: Categorize these
- [Radiobuttons] Choose separator for separating translations/readings
- [Checkbutton/Entry] Choose interval-modifier for SRS-levels
- [Button] Edit SRS schemes

List of achievements
--------------------------------------------------------------------------------
#### Global achievements (Count for all languages)
- [Diversity] At least 3 languages registered.
- [Multicultural] At least 6 languages registered.
- [Hyperpolyglot] At least 9 languages registered.
- [Eager I] At least 1000 SRS items tested.
- [Eager II] At least 3500 SRS items tested.
- [Eager III] At least 6000 SRS items tested.
- [Diligent I] At least 10000 SRS items tested.
- [Diligent II] At least 20000 SRS items tested.
- [Diligent III] At least 30000 SRS items tested.
- [Zealous] At least 50000 SRS items tested.

#### Local achievements (Can be earned for each language)
- [Beginner I] At least 200 vocabulary items registered.
- [Beginner II] At least 500 vocabulary items registered.
- [Intermediate I] At least 1000 vocabulary items registered.
- [Intermediate II] At least 2000 vocabulary items registered.
- [Advanced I] At least 4000 vocabulary items registered.
- [Advanced II] At least 6000 vocabulary items registered.
- [Advanced III] At least 8000 vocabulary items registered.
- [Master I] At least 10000 vocabulary items registered.
- [Master II] At least 15000 vocabulary items registered.
- [Grand Master] At least 20000 vocabulary items registered.

Future
--------------------------------------------------------------------------------
- Init-window for starting language content downloads
- Add cursor design functionality (Unlock cursors, popup-list in settings)
  - Find out why custom cursors using local URLs don't work in CSS variables
  - Drill cursor for large achievement (e.g. 1000 kanji)
  - Tamamo's fluffy tail cursor for larger achievement (e.g. 600 kanji)
  - Yona's hairpin cursor for medium achievement (e.g. 300 kanji)
  - Meliodas' dragon handle for small achievement (e.g. 150 kanji)
- Display small label with amount of items in each vocabulary list
- Seperate whole framework into an own NPM package
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
- Create a custom menu bar?

### In-program notifications
- Notifications on following events:
  - New language content or program update is available
    - Button to start download and link to settings (and progress bar?)
  - Achievement earned
  - Download finished
- Small icon in each notification to remove it
- "Clear all" functionality
- Accessable from top right corner of the window?
- Shortly light up with an animation if there's a new notification
  - Keep faintly glowing until notification is read
  - Highlight unread notifications
- Store in a new file in user data

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
- Link to here for each kanji detail in info panel (like country/measure/number)

Code
--------------------------------------------------------------------------------
### Naming
- Rename panels into "panes" or "sliding-panes"?
- Call "popupMenu" "contextMenu" instead
- Use folder "widgets" only for base widgets, put everything else directly into
  a folder called "gui-components"
  - Adjust pathManager and index.js
- Rename "Windows" to "Screens"?

### Refactoring
- Move stuff in settings subsections into a settings manager?
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
- Make "events" and "main" globals attributes of "app" global
- Implement dynamic adding of tabs in tabbed-frame using `slotchange`-event

### Adaptions
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

Credits to add
--------------------------------------------------------------------------------
- <https://subtlepatterns.com/>
- [List of kokuji](http://www.sljfaq.org/afaq/kokuji-list.html)
- [Spinners](https://tobiasahlin.com/spinkit/)

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
