### Up next
- Add popup-menus to dictionary section
- Implement load function in add-vocab-panel
  - Provide suggestions in add-vocab-panel as clickable spans
    (left click to edit, right click to remove)
- Allow user to choose an SRS config when adding a new language
  - Put SRS widget into an overlay!
  - Allow user registering his own schemes and use these with their names
- Try edit-input changes in stash as soon as electron has chrome 54
  (Also remove custom-elements flag in main.js.
   Also make sure edit-input gets closed when clicking somewhere else.)
- Make language switching seamless (Do sth about vocab section?)
- Allow quickly switching between sections without opening multiple ones
- Build "Recently added" functionality into vocab- and kanji-section?
- Celebrate the day async/await is fully supported in electron (maybe with flag)
  - Immediately rewrite index.js chain, main window, datamanager methods
- When creating a listbox widget, implement ES6 iterator symbol for it
- Make sure stats initialization functions are called on SRS scheme change
- Use thin symbols for fa-times, fa-plus etc. when they become available
- Focus most important element in each overlay upon opening (e.g. buttons)
- Implement global tooltip widget
  - Add a function to HTMLElement prototype?
  - Use for kanji hovering (show meanings)
  - Use for displaying spacings when hovering over SRS levels
- Have confirmClose-methods on overlays (e.g. srs-schemes-overlay)
- Make all buttons in sections/panels into light style.
  - "dark buttons" should be called "menu buttons" and only be used for
  menu items
  - "light buttons" should be default buttons used everywhere.

### Fixes
- Remove lvl 0 from kanji table
- Things got slower when reworking sass? Maybe because main window is flex now?
- Seperate meanings in kanji dictionary with ";" instead of "," (and adjust)
- Closing several overlays at once doesn't work (see close function)
- SRS level editing is not stable (Maybe remove ability to edit levels?)
  - Make sure levels are ordered after resolving invalid values in SRS schemes
  - Make sure empty levels get removed/highlighted without requiring user input


### General
- Create a proper pointer cursor. Create better normal curshttp://www.skenma.jp/faq/kenma_chigai.htmlor as well
- Also use border gradients for shadowing
- Check out new electron features?
- Make kana input type katakana when pressing shift.
  - Also make into custom widget?
- Allow vocab-add-separators to be escaped for single translations
- Use popupMenu separators when context changes?
- Use overlay to create [about], put credits there
- Use `!important`-selector to define necessary shadow dom host styles?
- Info window when (new) language pack is available for a language
  - Allow user to start downloads and link to settings for progress bar
- Save test state when closing an unfinished test. Only confirm on program exit
- Close-Panel shortcut (Default: ESC)
- Allow user to resize kanji info panel
- Capture focus in overlays (especially dialogs!) and panels
- Extend markdown-js to suit the purpose of the program

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
- Make partitioned window stuff into class?
- Use electron.shell.openExternal(link) to open link in default browser

### Init window
- Make init section feel more welcoming and less plain. Background picture?
  - Consider putting program name above windows
  - Maybe something like dark linen as backkground?

### Main window
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
  - SRS item bar diagram (customizable, shows when new items become available)
    - Maybe 1 week as standard interval
  - SRS info bar
    - Allow selecting certain levels to review
  - Changelog widget

### Test section
- Also construct extended solutions in `_createTest` already ?
- Properly handle overflow if correct-answer-frame gets too large
  - Try to fade out items at bottom if list is too large,
  remove fading when bottom reached
- Show where the entry goes
- Animate everything (and have setting to toggle that)
- Make test-results into overlay?

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
- Allow converting parts of vocabulary into html/pdf/markdown file
  - Use electrons builtin for pdf (And a fitting media stylesheet?)
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
  - Would allow easier synchronization with Houhou SRS
- Find monolingual dictionary for Japanese
- Add additional field to kanjiData database for "hidden acceptable meanings",
  containg synonyms or words with very similar meaning?
  - Show option in test settings to turn hidden meanings on or off
  - Allow displaying hidden meanings in kanji info
- Have invisible translations for synonyms/unnecessary words (e.g. AE <-> BE)
- Proper focus system with frames and elements for tabbing
- Zinnia or Tegaki for handwritten character recognition
- Allow exporting vocabulary somehow (e.g. csv, xml)

### Content section
- Contains a database of custom info cards
- Allow uploading and sharing vocabulary lists
- Offer small coding environment for creating cards with HTML/CSS/JS

List of settings
--------------------------------------------------------------------------------
#### Data/General settings
- [File-Dialog] Change user data path
- [Checkbox] Notify me when SRS item reviews are available
  - [Widget] Choose time intervals for notification

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
  - [Checkbox] Fade test section background
- [Button] Customize SRS schemes
- [Checkbox] Allow ignoring answer per shortcut
  - [Shortcut-Widget] Choose shortcut for ignoring answer

#### Design settings
- [Checkbox] Animate test items
- [Checkbox] Animate panels
- [Checkbox] Animate Popup stacks
- [Checkbox] Animate section switching
- [Checkbox] Compress side bar into icons
- [Listbox] Cursor selection (Some maybe habe to be unlocked)
  - Especially drill cursor for large achievement (e.g. 1000 kanji)
- [Widget] Possibly color settings by changing and recompiling Sass
           or using CSS variables

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
- [Learn gulp?](https://ponyfoo.com/articles/gulp-grunt-whatever)
- Use C++ in Chromium

> Chrome includes Google’s Native Client. Native Client allows web pages to run
> native code written in languages like C or C++. The code is executed in a
> sandbox for security, and it runs at almost-native speeds
