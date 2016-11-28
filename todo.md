### Up next
- Implement migrate-srs-overlay
  - Make sure to backup user data with useful description before migration
  - Make sure stats initialization functions are called on SRS scheme change
  - Emit event to allow every section/panel/etc. to adapt
- Rework home-section
- Add context menu items for copying/pasting on selections
- Implement language settings (and optionally others already)
- Focus most important element in each overlay upon opening (e.g. buttons)
- Capture focus in overlays (especially dialogs!) and panels
- Have confirmClose-methods on overlays (e.g. srs-schemes-overlay)

### As soon as available
- Celebrate the day async/await is fully supported in electron (maybe with flag)
  - Immediately rewrite index.js chain, main window, datamanager methods
- Remove custom-elements-flag in main.js (as soon as electron has chrome v54)
- Use thin symbols for fa-times, fa-plus etc. where fitting

### Fixes
- Make loading of diagrams in stats-section work consistently
- Things got slower when reworking sass? Maybe because main window is flex now?
- Seperate meanings in kanji dictionary with ";" instead of "," (and adjust)
- Fix switching between sections
- SRS level editing is not fully stable (Maybe remove ability to edit levels?)
  - Make sure levels are ordered after resolving invalid values in SRS schemes
  - Make sure empty levels get removed/highlighted without requiring user input
- Remove flickering when quickly dragging vocab item over list contents column
- CSS Tooltip Issues (Need to make a widget I guess):
  - z-index is incorrect (Applied workaround)
  - can leave view
  - Memory hog when using on many elements
- Make language switching seamless
  - Hide flickering in sections like home/vocabulary

By category
--------------------------------------------------------------------------------
### General
- Create a proper pointer cursor. Create better normal cursor as well
- Make kana input type other kana type when pressing shift.
  - Also make into custom widget?
- Use popupMenu separators when context changes? (see e.g. dictionary entry)
  - Or rather split menu entries into groups to seperate by? (e.g. copy/paste)
- Info window when (new) language pack is available for a language
  - Allow user to start downloads and link to settings for progress bar
- Create a custom menu bar
- Expose shortcut for reloading program?
- Implement suggestion windows for other panels
  - Remove `globals.suggestionPanes` and use `globals.panels` instead
- Store user data path somewhere else (e.g. localStorage/`app.getPath(name)`)
  - Also store downloaded content and language packs somewhere else to allow
    putting all user data (including backups) into Dropbox
- Make semicolon standard separator to fix some bugs with language data

### Code
##### Naming
- Rename panels into "panes" or "sliding-panes"?
- Probably rename "window" to "screen"?
- Rename "overlay" global into "overlays"
- Name elements on pinwall "tiles/cards" instead of "widgets"?
- Call "popupMenu" "contextMenu" instead
- Use folder "widgets" only for base widgets, put everything else directly into
  a folder called "gui-components"
  - Adjust pathManager and index.js
- Remove inconsistencies in code, e.g. unify glossary ("word" <-> "entry")
  - Especially in dataManager
##### Refactoring
- Have htmlManager and cssManager which make sure all assets are only loaded
once? --> Faster loading, centralized resource loading
- Remove `main.language`/`main.language2` ??
- Make automatically-loading-upon-scrolling-divs into widgets?
- Make data-manager-modules into subclasses and gather similar code
  - Especially if static variables become implemented (or Typescript is used)!
- Split widgets into components specific to Acnicoy and base-widgets
  - Make base-widgets completely independent of Acnicoy (e.g. no base import)
- Make partitioned window stuff into class?
- Solve design dilemma with tabbed frame
  - Allow full styling of all frames while keeping it semantic
- Simply register event listeners in constructor after all?
- Use JS to position popup-panes and don't make it child of triggering button
##### Adaptions
- Use `position: sticky` for kanji info panel in kanji section?
- use split function from sqlite instead of JS version?
- Use ruby annotations for furigana
- Allow adding text to checkbox in a slot after a margin
- Use CSS counters where necessary (Especially srs-schemes-overlay)
- Extend markdown-js to suit the purpose of the program
  - See Japanese stack exchange for furigana syntax
  - Provide easy way create kanji-links (or just scan through markdown)

### Init window
- Make init section feel more welcoming and less plain. Background picture?
  - Consider including a welcome message
  - Consider putting program name above panes
  - Maybe something like dark linen as background?

### Main window
- Close-Panel shortcut (Default: ESC)
- Remember where focus was when opening panel, restore after closing panel again
- Create quick start overlay with quick info on structure of the program
  - Give option to "not display this window again on program start"
  - Display on program start if not disabled
- Highlight menu button whose corresponding section/panel is opened?
Or otherwise indicate which section/panel is currently opened?

### Home section
- Display every widget as block (full width)
- Possibly create overlay-style sidebar for customizing pinwall
  - Make sidebar invisible and only open upon clicking wrench-icon?
  - Differentiate between normal mode and customize-mode
- Widgets:
  - Combine notes into single widget?
    - Allow writing notes in markdown format, render when saving the note
    - Use `contenteditable` attribute for editing
  - SRS item bar diagram (customizable, shows when new items become available)
    - Maybe 1m/2w as standard interval
  - SRS info bar
    - Allow selecting certain levels to review
  - Changelog widget (Save changelogs in local storage somewhere)

### Test section
- Save test state when closing an unfinished test. Only confirm on program exit
- Also construct extended solutions in `_createTest` already ?
- Properly handle overflow if correct-answer-frame gets too large
  - Try to fade out items at bottom if list is too large,
  remove fading when bottom reached
- Show where the entry goes
- Animate everything (and have setting to toggle that)

### Kanji Info Panel
- Allow seeing stroke animation instead of pictures (and customize speed)
- Use mapping to quickly load kanji examples (Store in file)
- Possibly make mapping from kanji parts to actual parts in SVG drawing
to make sure all parts are properly highlighted
- Show info for kanji that are part of the Chinese zodiac
- Show info for kanji that symbolize a country
- Have separate table for searching kanji, extend readings by ones without
a ".", keep all meanings for each kanji
- Allow user to maximize panel (then display all info in one frame)

### Add Vocab Panel
- Allow vocab-add-separators to be escaped for single translations

### Vocab panels
- Add search function for vocabulary lists to add

### Edit vocab panel
- Small info in vocab list selector if there are no more lists to be selected

### Vocab section
- Implement tests on vocabulary lists
- Implement searching in vocab lists and list contents

### Svg Bar Diagram
- Terminology: *Descriptions*/*Labels*??

### Dictionary
- Display link to dictionary section help
- Have setting which makes part-of-speech display in Japanese
- Implement customized search settings (open when settings button clicked)
- Implement Better sort algorithm including word-length

### Kanji section
- Implement customizing overview
- Filter duplicates in kanji search
- Display search info when searching with empty bar (or list all added kanji?)
Implement following settings:
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
- Search customization:
  - Search by:
    * [Radiobutton] kanji [default]
    * [Radiobutton] meanings
    * [Radiobutton] yomi (Also change to kana-input)

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

#### Language settings
- [Language widget] Table of languages
  - Language
  - Secondary language
  - [Checkbox] Readings
  - [Button-Label] SRS scheme
  - Content downloading (Use stylable HTML5 progress bar for this)
  - Standard language (Use checkboxes coordinated with js)
  - Language hiding (hide to remove from language list, but keep data)
    - Keep list of visible languages in language-manager. Use where appropriate.

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
  - Yona's hairpin cursor for medium achievement (e.g. 300 kanji)
  - Meliodas' dragon handle for small achievement (e.g. 200 kanji)
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

### Content section
- Contains a database of custom info cards
- Allow uploading and sharing vocabulary lists
- Offer small coding environment for creating cards with extended markdown

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

#### CSS/DOM
- [Buttons](http://usabilitypost.com/2012/01/10/pressed-button-state-with-css3)
- [Shadow DOM](https://webkit.org/blog/4096/introducing-shadow-dom-api)
- [CSS Grid](https://css-tricks.com/snippets/css/complete-guide-grid)
(Basically very powerful 2D-flexboxes)
- [Selection API](http://caniuse.com/#feat=selection-api)
(`window.getSelection()`, `selectionstart`, `selectionchanged`)
- [Convenient DOM Manipulation](http://caniuse.com/#feat=dom-manip-convenience)
- Use `Element.scrollIntoViewIfNeeded()`
- [Focus within](http://caniuse.com/#feat=css-focus-within)
- [Scrollbar styling](http://caniuse.com/#feat=css-scrollbar)
- [CSS triangles](http://apps.eky.hk/css-triangle-generator/)

#### Misc
- Use `electron.shell.openExternal(link)` to open link in default browser
- [Learn gulp?](https://ponyfoo.com/articles/gulp-grunt-whatever)
- Use C++ in Chromium

> Chrome includes Google’s Native Client. Native Client allows web pages to run
> native code written in languages like C or C++. The code is executed in a
> sandbox for security, and it runs at almost-native speeds
