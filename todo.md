### Primary goals
- Write function to calculate n equally spaced colors on color wheel or at
  least an alternative to allow for more than 6 languages
- Finish first version of Japanese content:
  - Complete dictionary tag descriptions in Japanese
  - Make sure content can be downloaded correctly
    - Content status says "n.a." after successful download -> Fixed?
  - Use newest version of all files (and test!) right before first release
- Finish help section
- Remove test-stuff from server afterwards (like test-versions etc.)
- Remove the "default language" concept, select language which was selected last

### Secondary goals
- Also replace add-kanji panels with edit-kanji panels
- Make searching for vocab lists faster by pre-sorting in datamanger already
- Removing word from vocabulary lists should be done in datamanager function too
- Don't attach separate context menu to every node in dict/kanji/vocab-section
- Rework fonts in sass: Use gui-font for gui, and content-font for content
  - Make OpenSans-Regular the main font everywhere?
  - Also let font-family be inherited, and remove all workarounds (and test!)
- Make kana input not only react to shift, but also caps-lock and caps letters
- Finish dictionary search:
  - Somehow handle multiple concurrent searches (maybe in utility.js)
  - Implement tags like #words, #names, #jlpt:x, etc.
  - Implement adding names (-> new testmode? Handle like words?)
  - Implement option for displaying word frequencies
    - Include explanations for each word frequency (corpus size, age, etc.)
  - Implement sorting by a combination of different word frequencies
  - Also prioritize common words not part of the frequency lists?
    (marked with "spec1/2" in JMdict.xml)
- Devise a ranking for name search result, if possible find name frequencies
- Implement tags/options to customize word/name search
  - In content/database-module, switch query/run-method to one ignoring errors?
  - Use separate where-clause for each (space-separated?) word in the query
  - Refined okurigana mapping, such that e.g. searching "作hin" gives "作品"
- Add some more achievements and create achievements section
- Content-related tables should be created dynamically when the content is first
  loaded instead of at creation-time of the database!
- Reverse completion list order if it's shown above entry instead of below
  - Extend the utility view function for this purpose
- In edit-vocab-panel, load suggestions if content is available (see TODOs)
- Add control bar to notes sections to access search, open help or add new group
- Implement undo for custom pasting using handler in onlyAllowPastingRawText?

### Fixes
- Correctly resize svg-bar-diagram when resizing window (set width + height)
- Problem when editing word with dictonary id assigned but a different variant
- Notifications:
  - Why is "display:flex" added to notifications window when adding notific?
  - After deleting all notifications, text is not at the right place
  - When getting a notification, it is a bit messed up
  - After deleting a notification, text doesn't appear (still children left?)
- Prevent backslash-encoding on server side, newlines should arrive as such
- Strange error if autostart is not enabled. How to make it work on linux?
- Don't preload words in vocabulary section - on scroll, given date is outdated
- If word is renamed, associated vocab entry in dictionary entry gets outdated.
  Add a listener to dictionary section and method to dictionary entry to solve.


By category
--------------------------------------------------------------------------------
### General
- Remove flickering when quickly dragging vocab item over list contents column
  - Not a bug in Acnicoy - Events are just fired incorrectly
- Make semicolon standard separator to fix some bugs with language data
- Adjust scrollbars to corresponding background color so that they're always
  visible well. Also consider using thin, rounded scrollbars with margin
- Improve policy for incorrectly answered SRS items
  - Don't always move down two levels, but one with adjusted review time instead
- Also make files for improved on/kun-yomi (or rather put in same file?)
- Implement reverse testing?
- Implement save-on-change mode (add checkbox in settings)?
  - After finishing a test item (and upon finishing test session)
  - Save global/local settings whenever something changes
  - Save vocabulary (and history?) database on every change
  - After editing/moving/deleting notes (-> put at end of saveData function)
  - After change to vocabulary lists
  - Add explanation that enabling this setting might cause increased hard drive
    usage and network overhead if third-party synchronization services like
    dropbox are used to store user data, but it can prevent data loss.
  - If not activated, data only saved periodically + on exit + on certain events
- Add save-button for user data somewhere (with last-saved label)
- Define proper interface for global settings to detect modifications?
- Run `VACUUM` on databases once in a while to clean up? Add button to settings?
- Initialize json-file in local storage somewhere upon first program start?
- Remove font-awesome from github repo and add as node package instead
- Select exact folder to store data in? (create it if it doesn't exist yet)
- For multi-language shortcuts, make sure to adjust text accordingly
- Implement showing only vocab entries that are not part of a list yet
- Write more sophisticated function to guess whether vocab contains a certain
  entry from the dictionary
- Implement program updating
  - Add update button to settings
  - Make sure user data is saved before an update
  - Button to check for program updates (+ "last checked" label)
- Make history view loading more efficient
- Add functionality for clearing histories
- Implement program updating functionality (in general settings)
  - Handle the "update-program-status" event there instead
  - Make sure notifications are removed or updated whenever necessary!
  - Make sure no additional program file is loaded after start for safe update
- Display number of notes in each group

### Design
- Use font-family "Trajan" for roman numerals?
- Make dark deflt, Solarized (Light/Dark) and Ubuntu (Light/Dark) color schemes

### Performance
- Things got slower when reworking sass? Maybe because main window is flex now?
  Replace with `calc(100% - x)` or `width: fill`?
- Cut down on event listeners (kanji/vocab section,
  tooltips/context-menu/kanji-info-links)
- Why the significant performance degradation after doing something?
- Check if WAL size can exceed original database size. How to save disk space?
- Consider adding HTML Canvas as option for bar diagram (and rename the widget)
- Use JS for exact match search? (then translations table can be deleted)
- Remove example-words-index?
- Remove a bunch of content database indices?

### Init window
- Make init section feel more welcoming and less plain. Consider:
  - including a welcome message
  - putting program name above panes
  - using a subtle pattern as background picture

### Main window
- Remember where focus was when opening panel, restore after closing panel again
- Highlight menu button whose corresponding section/panel is opened?
  Or otherwise indicate which section/panel is currently opened?
- Notifications:
  - Use main-window color for notification window background maybe?
  - Add buttons to remove a notifications or all of them?
  - Add conspicious animation when new notification pops up, make it persistent
- Make sure selective-dimmer canvas adjusts to window size on resizing
- Add contrast shadow to introduction tour textbox? (solve arrow problem then)

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
- Allow directly setting new level in flashcard-mode
- Where to move level-frame?
- How to make it more convenient to test multiple languages in succession?
  - Implement a test-mode which just tests low-level items for each language?
- `text-align: center` impairs fadeIn function. How to work around?
  - Add `text-align` to solution divs again
- Test-complete-overlay: Try `Element.scrollIntoViewIfNeeded()` for elements
  with `progress` option of velocity call

### Kanji Info Panel
- Allow seeing stroke animation instead of pictures (and customize speed)
- Possibly make mapping from kanji parts to actual parts in SVG drawing
  to make sure all parts are properly highlighted
- Show info for kanji which are part of the Chinese zodiac
- Show info for kanji which symbolize a country
- Have separate table for searching kanji, extend readings by ones without
  a ".", keep all meanings for each kanji
- Have link to kanji disambiguation if there are kanji with similar meanings
- Implement settings
  - [Checkbox] Display commonly used nanori
  - [Checkbox] Show stroke animation instead of pictures
  - [Checkbox] Show detailed example word entries (as in dictionary)
  - [Checkbox] Hide outdated/rare yomi (also adjust for search results)

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
- Don't focus editable span on right click in edit panels
  - Use this.root.activeElement?

### Dictionary
- Have option to only show a single combined search entry (like in Jisho.org)
  - Otherwise, detect when searching for English term in JA-entry, suggest
    interpreting as ENG-query instead
- Allow switching between additive and non-additive kanji/word/name search?

### Kanji section
- Search customization:
  - [Checkbox] Show only meanings for each entry (and allow expanding)
- Display "Info"/"Strokes"/"Examples" buttons only on hover (Where? On right?)
  - "Examples" button linking to dictionary section in each search result?
    Or rather expand search result entry?
  - Strokes being displayed in a single scrollable row
- Implement different sorting criteria for kanji section overview
- Also parse the remaining fields from the JMdict.xml file?

### Migrate-srs-overlay
- Make migrating SRS items safer by applying changes to a copy of data and
  replacing old data only after migration has finished successfully?
  - Or rather use SQLITE3 transactions/savepoints/rollbacks
- Make sure that connections starting from the same level are always connected
  to a *consecutive* row of levels (otherwise, disallow connection)?

### Content downloading
- Round up download manager with hash checking?
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

### Stats
- Allow switching between showing daily/cumulative progress for each diagram?
- Implement selecting specific languages to show stats for
- Possibly use D3.js for diagrams?

### Settings
- Unify main window animation-settings into a single one (include bar hiding)
- General settings
  - [Button] Check for program updates (Check automatically every ~1 hour)
    - [Button] Update program (Do so safely)
  - [Radiobuttons] Choose separator for separating translations/readings
  - [Checkbox] Toggle fullscreen
  - [Chechbox, default on] Limit size of search history [+ positive integer]
- Language settings
  - [Checkbox] Automatically update language content if available
    - [Button] Edit SRS schemes
    - [Checkbutton/Entry] Choose interval-modifier for SRS-levels

Future
--------------------------------------------------------------------------------
- Init-window for starting language content downloads
- Add cursor design functionality (Unlock cursors, popup-list in settings)
  - Find out why custom cursors using local URLs don't work in CSS variables
  - Drill cursor for large achievement (e.g. 1000 kanji)
  - Tamamo's fluffy tail cursor for larger achievement (e.g. 600 kanji)
  - Yona's hairpin cursor for medium achievement (e.g. 300 kanji)
  - Meliodas' dragon handle for small achievement (e.g. 150 kanji)
- Separate whole framework into an own NPM package
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
- Integrate example sentences from the
  [Tanaka Corpus](http://www.edrdg.org/wiki/index.php/Tanaka_Corpus)
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
- Allow dragging around languages in settings to set testing order
- Link to similar looking kanji in info-panel to disambiguate more easily,
  also link to additional information (e.g. history, meanings) if available.
- Make a better dragging image in vocabulary section
- Create custom set of cursors
- Allow user to customize pinwall (button in settings + overlay side-bar)?
- Implement changelog-widget (for changelogs saved in local storage somewhere)?
- Create a custom menu bar?
- Find open dictionaries for English, Spanish, Chinese and Russian
- Create stylable `<select>` alternative
- Somehow display frequencies for specific words and readings in dictionary?
- Upgrade to Font Awesome 5
- Disallow deleting/editing default schemes (give info that it can be copied)
- Implement adding example sentences (which can be displayed in a test session)
- Create or find icons for achievements 

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
- Use folder "widgets" only for base widgets, put everything else directly into
  a folder called "gui-components"
  - Adjust pathManager and index.js
- Rename "Windows" to "Screens"?
- Starting to get collisions with classes defined in base.scss. Prefix them...

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
- Merge kanji and hanzi module into one, generalize with different readings
- Consider making shortcut-manager a data manager
  (-> if done, then remove separate init-call in data-manager.js)
- Using font-awesome font in some general widgets (e.g. tree-view), generalize
- Unify the fadeIn/fadeOut/slideToCurrentPosition functions
- Completely remove example-word-entry widget/template?
- Implement label-checkbox widget?
- Implement data binding function between checkboxes/radiobuttons and settings
- Only store number of items tested in stats (get added items from database)?
  - Necessary to build an index in the userdata database on time added?
- Further refactor Application framework
  - Implement quit-function of Application class, move controlled closing there
- Decide whether kanji search should be additive. If so, merge it into the
  dictionary search function
- As soon as everything search-related is generalized, the objects passed to
  `utility.initializeView` in the dictionary can be a single parameterized obj
- Switch to "better-sqlite3" to increase performance and code style?

### Adaptions
- Don't assign font family for every element and let it be inherited instead
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
- Replace inputs in srs-schemes-overlay with content-editable attribute
