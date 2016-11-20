### Up next
- Implement migrate-srs-overlay
  - Make sure to backup user data with useful description before migration
  - Make sure stats initialization functions are called on SRS scheme change
  - Emit event to allow every section/panel/etc. to adapt
- Implement load function in add-vocab-panel
  - Provide suggestions in add-vocab-panel as clickable spans?
    (left click to edit, right click to remove)
  - If element has very few translations/meanings, immediately fill these in
- Try edit-input changes in stash as soon as electron has chrome 54
  (Also remove custom-elements flag in main.js.
   Also make sure edit-input gets closed when clicking somewhere else.)
- Celebrate the day async/await is fully supported in electron (maybe with flag)
  - Immediately rewrite index.js chain, main window, datamanager methods
- Use thin symbols for fa-times, fa-plus etc. when they become available
- Focus most important element in each overlay upon opening (e.g. buttons)
- Have confirmClose-methods on overlays (e.g. srs-schemes-overlay)
- Implement language settings and some others
- Rework home-section

### Fixes
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
- Use popupMenu separators when context changes?
- Use overlay to create [about], put credits there
- Info window when (new) language pack is available for a language
  - Allow user to start downloads and link to settings for progress bar
- Capture focus in overlays (especially dialogs!) and panels
- Extend markdown-js to suit the purpose of the program
  - See Japanese stack exchange for furigana syntax
- Create a custom menu bar
- Expose shortcut for reloading program?
- Store user data path somewhere else (e.g. localStorage/`app.getPath(name)`)
  - Also store downloaded content and language packs somewhere else to allow
    putting all user data (including backups) into Dropbox

### Code
- Remove inconsistencies in code, e.g. unify glossary ("word" <-> "entry")
- Have htmlManager and cssManager which make sure all assets are only loaded
once? --> Faster loading, centralized resource loading
- Remove `main.language`/`main.language2` ??
- Make automatically-loading-upon-scrolling-divs into widgets?
- Make data-manager-modules into subclasses and gather similar code
  - Especially if static variables become implemented!!
- use split function from sqlite instead of JS version?
- Split widgets into components specific to Acnicoy and base-widgets
  - Make base-widgets completely independent of Acnicoy (e.g. no base import)
- Possibly rename *windows* to *screens*
- Use `slotchange` events on slots to find out if slotted nodes are changed
- Make partitioned window stuff into class?
- Use `electron.shell.openExternal(link)` to open link in default browser
- Use `position: sticky` for kanji info panel in kanji section?
- Use ruby annotations for furigana
- Allow adding text to checkbox in a slot after a margin
- Rename "overlay" global into "overlays"
- Simply register event listeners in constructor after all?
- Solve design dilemma with tabbed frame
  - Allow full styling of all frames while keeping it semantic

### Init window
- Make init section feel more welcoming and less plain. Background picture?
  - Consider including a welcome message
  - Consider putting program name above windows
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
- Widgets:
  - Combine notes into single widget?
    - Allow writing notes in markdown format, render when saving the note
  - SRS item bar diagram (customizable, shows when new items become available)
    - Maybe 1m/2w as standard interval
  - SRS info bar
    - Allow selecting certain levels to review
  - Changelog widget

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

### Edit Vocab Panel
- Remove lists from select element where the word is already in?

### Vocab section
- Implement tests on vocabulary lists
- Implement searching in vocab lists and list contents

### Svg Bar Diagram
- Terminology: *Descriptions*/*Labels*??

### Dictionary
- Display link to dictionary section help
- Have setting which makes part-of-speech display in Japanese
- Implement customized search settings (open when settings button clicked)

### Kanji section
- Implement customizing overview
- Filter duplicates in kanji search
- Display search info when searching with empty bar (or list all added kanji?)

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
  - Vocabulary lists
- Home section
- Testing
- [Separator]
- Japanese
  - Dictionary
  - Kanji section

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
  - By changing and recompiling Sass or using CSS variables
  - Have "designs" subfolder in sass directory with named sass partials
  - Definitely implement dark version for current default scheme
  - Solarized (Light/Dark) and Ubuntu (Light/Dark) Color schemes

#### Shortcuts
- [Shortcut-widgets] For all known shortcuts in the settings

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
- Migrate to Typescript?

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
- [Learn gulp?](https://ponyfoo.com/articles/gulp-grunt-whatever)
- Use C++ in Chromium

> Chrome includes Google’s Native Client. Native Client allows web pages to run
> native code written in languages like C or C++. The code is executed in a
> sandbox for security, and it runs at almost-native speeds
