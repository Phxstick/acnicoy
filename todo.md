### Up next
- Add popup-menus to dictionary section
- Implement load function in add-vocab-panel
  - Provide suggestions in add-vocab-panel as clickable spans
    (left click to edit, right click to remove)
- Allow user to choose an SRS config when adding a new language
  - Add "SRS scheme" to language table
  - Provide a bunch of default named SRS configs in default settings
  - Put SRS widget into an overlay!
  - Allow user registering his own schemes and use these with their names
- Try edit-input changes in stash as soon as electron has chrome 54
  (Also remove custom-elements flag in main.js.
   Also make sure edit-input gets closed when clicking somewhere else.)
- Make language switching seamless (Do sth about vocab section?)
- Allow quickly switching between sections without opening multiple ones
- Build "Recently added" functionality into vocab- and kanji-section?
- For settings, extend language table by
  - SRS scheme name 
  - Content downloading (Use stylable HTML5 progress bar for this)
  - Standard language (Use checkboxes coordinated with js)
- Celebrate the day async/await is fully supported in electron (maybe with flag)
  - Immediately rewrite index.js chain, main window, datamanager methods
- When creating a listbox widget, implement ES6 iterator symbol for it
- Make sure stats initialization functions are called on SRS scheme change

### Fixes
- Remove lvl 0 from kanji table
- Things got slower when reworking sass? Maybe because main window is flex now?
- Seperate meanings in kanji dictionary with ";" instead of "," (and adjust)

### General
- Create a proper pointer cursor. Create better normal cursor as well
- Also use border gradients for shadowing
- Check out new electron features?
- Make kana input type katakana when pressing shift.
  - Also make into custom widget?
- Allow vocab-add-separators to be escaped for single translations
- Implement global tooltip widget
  - Add a function to HTMLElement prototype?
  - Use for kanji hovering (show meanings)
  - Use for displaying spacings when hovering over SRS levels
- Use popupMenu separators when context changes?
- Use overlay to create [about], put credits there
- Use `!important`-selector to define necessary shadow dom host styles?
- Info window when (new) language pack is available for a language
  - Allow user to start downloads and link to settings for progress bar
- Save test state when closing an unfinished test. Only confirm on program exit
- Close-Panel shortcut (Default: ESC)

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
- Replace all sass occurrences of "darkred" with "highlight-color"?

### Init window
- Make init section feel more welcoming and less plain. Background picture?

### Main window
- Remember where focus was when opening panel, restore after closing panel again
- Create quick start overlay with quick info on structure of the program
  - Give option to "not display this window again on program start"
  - Display on program start if not disabled

### Home section
- Display every widget as block (full width)
- Possibly create overlay-style sidebar for customizing pinwall
- Widgets:
  - Combine notes into single widget?
  - SRS item bar diagram (customizable, shows when new items become available)
    - Maybe 1 week as standard interval
  - SRS info bar
  - Changelog widget

### Test section
- Also construct extended solutions in `_createTest` already ?
- Properly handle overflow if correct-answer-frame gets too large
  - Try to fade out items at bottom if list is too large,
  remove fading when bottom reached
- Possibly round up appearance time to e.g. 15 minutes
  - New stuff appears in batches, and a counter can be shown in intro section
- Show where the entry goes
- Animate everything (and have setting to toggle that)
- Make test-results overlay

### Kanji Info Panel
- Allow seeing stroke animation instead of pictures (and customize speed)
- Use inverted index to quickly load kanji examples (use C++ here)
- Possibly make mapping from kanji parts to actual parts in SVG drawing
to make sure all parts are properly highlighted
- Show info for kanji that are part of the Chinese zodiac
- Show info for kanji that symbolize a country
- Have separate table for searching kanji, extend readings by ones without
a ".", keep all meanings for each kanji

### Edit Vocab Panel
- Remove lists from select element where the word is already in?

### Vocab section
- Implementing testing oneself on vocabulary
- Make sure ALL changes to vocab lists are reflected in add vocab panel

### Svg Bar Diagram
- Terminology: *Descriptions*/*Labels*??

### Dictionary
- Display help info at center of section at the beginning and when the user
presses enter on empty input or clicks some kind of help button
- Also make `<inputs>` bigger and move to center when search result is empty
- Have setting which makes part-of-speech display in Japanese

### Stats/Achievements
- Use single-bar diagram for kanji progress to display relative to total!
- Display earned achievement in status bar and make it glow golden to highlight
- Daily stats diagrams below the general stats, next to each other
  - One for mastery points, one for new vocab/kanji added
  - Allow displaying daily and cumulative progress for each daigram
  - Also color each bar in two colors according to kanji and vocab progress
- Bar diagrams showing kanji learned by grade and JLPT next to each other
- Update at least general stats when words/kanji are added
- Possibly use D3.js for diagrams?

### Help
- Use overlay widget


Future
--------------------------------------------------------------------------------
- Consider making kanji-modes into single one with 2-3 parts for each kanji
  - Very problematic for partly added kanji
  - Would allow more stylish and compact mode presentation
  - Would allow easier synchronization with Houhou SRS trainer
- Find monolingual dictionary for Japanese
- Add additional field to kanjiData database for "hidden acceptable meanings",
  containg synonyms or words with very similar meaning?
  - Show option in test settings to turn hidden meanings on or off
  - Allow displaying hidden meanings in kanji info
- Have invisible translations for synonyms/unnecessary words (e.g. AE <-> BE)
- Proper focus system with frames and elements for tabbing
- Restructuring: Separate core functionality from language extensions
  - Provide interface for extensions, e.g.:
    - `addMenuButton(label, callback)` for main-section extensions
    - `addStatistic(element)` for stats-section extensions
  - Use ES6 proxies for data modules
  - Split data generation from makefile into one for each language,
  along with the py script to generate it
- Zinnia or Tegaki for handwritten character recognition

### Content section
- Contains a database of custom info cards
- Allow uploading and sharing vocabulary lists
- Offer small coding environment for creating cards with HTML/CSS/JS

List of settings
--------------------------------------------------------------------------------
#### Data/General settings
- [File-Dialog] Change data path

#### Language settings
- [Language widget] Table of languages (Add/Remove/Preferences/Content download)

#### Test settings
- [Checkbox] Display test progress
- [Checkbox] Display score gained (Necessary?)
- [Checkbox] Color test item background according to test item type?
- [Widget] Setting SRS options
- [Checkbox] Allow ignoring answer per shortcut
  - [Shortcut-Widget] Choose shortcut for ignoring answer

#### Design settings
- [Checkbox] Animate test items
- [Checkbox] Fade test section background (only if colored-option is set)
- [Checkbox] Animate panels
- [Checkbox] Animate Popup stacks
- [Checkbox] Compress side bar into icons
- [Listbox] Cursor selection (Some maybe habe to be unlocked)
  - Especially drill cursor for large achievement (e.g. 1000 kanji)
- [Widget] Possibly color settings by changing and recompiling Sass
           or using CSS variables

#### Shortcuts
- [Shortcut-widgets] For all known shortcuts in the settings

List of achievements
--------------------------------------------------------------------------------
- [Diversity] At least 5 languages registered.

Resources
--------------------------------------------------------------------------------
#### Japanese
- [New JLPT stuff](http://www.tanos.co.uk/jlpt/skills/vocab/)
  - Get JLPT lists for words too
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

#### Misc
- Use native browser notification popups?
- [Learn gulp?](https://ponyfoo.com/articles/gulp-grunt-whatever)
- Use C++ in Chromium

> Chrome includes Google’s Native Client. Native Client allows web pages to run
> native code written in languages like C or C++. The code is executed in a
> sandbox for security, and it runs at almost-native speeds
