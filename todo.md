Chinese
--------------------------------------------------------------------------------
- 1.638 entries use the variant pattern "see ...", (e.g. 怪蜀黍)
- Add "also pr." fields to readings in suggestion pane
- Probably include some separators for multi-word queries
- Check if all useful search cases are now properly handled

Before next release:
- Check readability of dictionary colors for other color schemes
- Implement properly importing from Anki

Checking:
- Test content download
- Check if everything is still working for Japanese
- Check if import/export is still working after updating CSV package

Further refinement:
- Use additional info in brackets in HSK list to match to the right entries
- Offer option to move pinyin to the right instead of above entry to save space
- Other grades [here](http://www.tanos.co.uk/hsk/skills/hanzi/hanzilist/)


General
--------------------------------------------------------------------------------

- Rework functionality for detecting shortcut collisions
- Error when clicking margin in notes container, stop prop. if container reached
- Include exception handling code that removes faulty backups that do not
  contain an info.json for some reason!
- Make sure overlays can't be interacted with while they're fading away
- Dynamically adjust size of popup stack and tooltip to fit it into the window
- Now that light button has no shadow by default, remove .no-shadow class
- Fix: focus is not on entry after closing overlay when reviewing multiple langs

### Extensions
- Add most important missing features to dictionary search (see further below)
- Extend notes section by most important features (see further below)
- Add some more achievements and create achievements section
- Keep working on list of improved kanji meanings
- Implement changing order of translations by dragging while pressing Ctrl
- Implement importing general color schemes as scss files
- Implement change logs (show up on first launch, accessible from settings)
- Implement organization of imported items that are not assigned to a level yet
- Improve SRS system or add options to use a different variant
  - Improve policy for incorrectly answered SRS items, e.g. by taking mistake
    count into account to move items down several levels
  - Implement an interval-based version of SRS 

### Fixes
- Correctly resize svg-bar-diagram when resizing window (set width + height)
- Don't preload words in vocab section - data revealed by scrolling is outdated
- Make it possibly to scroll while pressing Ctrl (for moving notes).
- Add overflow shadow to item solutions/notes in test-section again
- How to prevent SQLITE conflicting journals accumulating in the dropbox folder?
- Text-overflow in tree-view is not working anymore (node becomes invisible)
- Changing the color scheme and not restarting leads to wrong colors being used
  in places like the dictionary where colors are loaded dynamically

### Performance
- Use prepared statements for database accesses which are done repeatedly
- Try to reduce memory consumption
  - Don't attach separate context menu to every node in dict/kanji/vocab-section
  - Cut down on event listeners (kanji/vocab section,
    tooltips/context-menu/kanji-info-links)
  - Call garbage collector after unloading language data to actually unload it?
  - Remove example-words-index?
  - Use JS for exact match search? (then translations table can be deleted)
- Check if WAL size can exceed original database size
- Run `VACUUM` on databases once in a while to clean up? Add button to settings?
- Assign fixed width to side-bar and section-frame instead of flexing #bottom?
  (don't forget to stretch section frame and use transition when hiding sidebar)
- Consider adding HTML Canvas as option for bar diagram (and rename the widget)
- Make searching for vocab lists faster by pre-sorting in datamanger already?
- Make history view loading more efficient
- Limit size of search history to a sensible value
- Limit size of notifications list (since deleting one takes linear time there)
- Make edit distance calculation more efficient using threshold
- Apparent using innerHTML to delete children is slow now, use different method?

### Design
- Use font-family "Trajan" for roman numerals?
- Add color schemes based on Ubuntu colors
- Use translations-font and readings-font in some places instead of vocab-font
- Rework popup stack design in panels? (using borders and uniform colors)
- Extend color schemes with fitting tag border colors
- How to avoid "flash of unstyled content" (FOUC)?

### Misc
- Offer language data for EN if not available for the chosen source language?
- Implement reverse testing?
- Define proper interface for global settings to detect modifications?
- Initialize json-file in local storage somewhere upon first program start?
- For multi-language shortcuts, adjust text accordingly
- Add functionality for clearing histories
- Implement program updating functionality (in general settings)
  - Handle the "update-program-status" event there instead
  - Make sure notifications are removed or updated whenever necessary!
  - Make sure no additional program file is loaded after start for safe update
- Disallow closing loading-overlay via shortcut?
- Add loading screen where appropriate (loading vocab section, kanji view, ...)
- Reverse completion list order if it's shown above entry instead of below?
  - Extend the utility view function for this purpose
- Make wrap-up feature only show items that have actually been started?
- Don't close panels when pressing the same sidebar button again?


Components
--------------------------------------------------------------------------------

### Init window
- Make init section feel more welcoming and less plain. Consider including a
  welcome message or using a subtle pattern as background image.

### Main window
- Highlight menu button whose corresponding section/panel is opened?
  Or otherwise indicate which section/panel is currently opened?
- Notifications:
  - Add buttons to remove a notification or all of them?
  - Add conspicuous animation when new notification pops up, make it persistent
- Make sure selective-dimmer canvas adjusts to window size on resizing
- Add contrast shadow to introduction tour textbox? (solve arrow problem then)

### Notes section
- Implement simple undo-function and add corresponding button to bar
- Implement multiple selection
- Option to decrease font size and padding to see more groups at once?
- Make it possible to reorder groups via drag & drop
- Allow resizing group-overview and remember custom size
- Make sure no bugs in view can happen due to asynchronicity
- Make sure that displayed label in group search identifies group uniquely
- Somehow invalidate notes in search result if group is deleted
- Add shortcuts for both searches + add-button
- Add option to display number of notes in each group?

### Test section
- Re-evaluate answer after current item has been edited?
- If item has been renamed, directly display change instead of skipping?
- `text-align: center` impairs fadeIn function. How to work around?
  - Add `text-align` to solution divs again
- Also fade buttons in evaluation mode?
- Fix overflow shadow in test section (and add to notes container as well)

### Vocab section
- Add option to increase font size in vocab section? (1.2 rem for JP/ZH)
- Implement option to show only vocab entries that are not part of a list yet
- Also consider associated notes when searching vocabulary?
- Extend interface to allow access to functionality for sorting views

### Suggestion panes
- Consider suggesting vocabulary lists when adding/editing words as well
  - Requires a dataset of predefined vocabulary lists

### Migrate-srs-overlay
- Make migrating SRS items safer by applying changes to a copy of data and
  replacing old data only after migration has finished successfully?
  - Or rather use SQLITE3 transactions/savepoints/rollbacks
- Make sure that connections starting from the same level are always connected
  to a *consecutive* row of levels (otherwise, disallow connection)?

### Svg Bar Diagram
- Use a shadow at both sides to show when scrolling is possible
- Show percentage in top margin (if maxValues are given)
- Display tooltips (showing e.g. "current/total") on hover when flag is set

### Content downloading
- Round up download manager with hash checking?
- Also consider data in memory buffer in download status
- Implement pausing functionality for downloads (and in settings)
  - Automatically continue downloads in networkManager unless paused?
  - Save "paused" boolean in downloadsInfo as well
  - Save "downloadPaused" boolean in language table config as well
- Switch between percentage and exact values (in MB) upon clicking progressbar
- Try to split some general network stuff off of content.startDownload
  - Move content-stuff from networkManager into dataManager.content? Partly?
- Why does an error occurr in the stream after the download successfully finished
- Stop download after a certain number of read timeouts?
- Display button to stop download or retry connecting upon connection timeout
- Try to replace request module with axios and check if ESOCKETTIMEDOUTs stop

### Stats
- Line diagram which shows cumulative growth of vocabulary over diff. periods
- Implement selecting specific languages to show stats for
- Possibly use D3.js for diagrams?
- Implement dynamic update of detailed kanji/hanzi stats? Maybe make own widget?

### Settings
- Unify main window animation-settings into a single one (include bar hiding)
- Add save-button for user data somewhere (with last-saved label)?
- Add option to choose compact/extended/custom window size?


Japanese
--------------------------------------------------------------------------------

### Japanese language data
- Make semicolon standard separator to fix some bugs with language data
- Also make files for improved on/kun-yomi (or rather put in same file?)
- Check if there is new stuff in the JMdict that's not getting parsed yet
- Get rid of words column in dictionary table? (adjust both parse and JS-script)
  Note that this might require to create words-index again, probably not worth.
- Consider dropping name-dictionary to lower memory usage and file size
  - Maybe include it in the data but only load it when explicitly asked to
- In JLPT level parse procedure: consider to remove candidates where not a
  at least one reading or meaning match (unless there is no readings/meanings)
- Include other parts of the BCCWJ corpus into the dictionary? Maybe whole?
- Frequencies (esp. news) should contain all known entries to distinguish
  whether untagged words just appear rarely or are completely missing in corpus

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

### Dictionary
- Have option to only show a single combined search entry (like in Jisho.org)
  - Otherwise, detect when searching for English term in JA-entry, suggest
    interpreting as ENG-query instead
- Add option to use larger font size (150%) and huge (190%, line-height 2.1rem)
- Allow switching between additive and non-additive kanji/word/name search?
- Somehow handle multiple concurrent searches (maybe in utility.js)
- Implement tags like #words, #names, #jlpt:x, etc.
- Implement adding names (-> new testmode? Handle like words?)
- Implement option for displaying word frequencies
  - Include explanations for each word frequency (corpus size, age, etc.)
- Implement sorting by a combination of different word frequencies
- Also prioritize common words not part of the frequency lists?
  (marked with "spec1/2" in JMdict.xml)
- Implement tags/options to customize word/name search
- In content/database-module, switch query/run-method to one ignoring errors?
- Use separate where-clause for each (space-separated?) word in the query
- Refined okurigana mapping, such that e.g. searching "作hin" gives "作品"
- Devise a ranking for name search result, if possible find name frequencies
- Parse the new `g_type` attribute in JMdict and incorporate into the dictionary
- Also parse the remaining fields from the JMdict.xml file?
- Write more sophisticated function to guess whether vocab contains a certain
  entry from the dictionary
- Implement displaying various frequencies and uncomment corresponding option
- How to display search results more efficiently? What's taking all the time?
- Implement smart matching where inflection and ni/na/to particles can be given
- Consider using length of main word/reading as basic sorting criterion
- Use Source Han Sans instead of Yahei font?

### Kanji section
- Search customization:
  - [Checkbox] Show only meanings for each entry (and allow expanding)
- Display "Info"/"Strokes"/"Examples" buttons only on hover (Where? On right?)
  - "Examples" button linking to dictionary section in each search result?
    Or rather expand search result entry?
  - Strokes being displayed in a single scrollable row
- Implement different sorting criteria for kanji section overview
- Extend list of counters (maybe find a website for that)
- Consider parsing the kanjidic2.xml file instead, which contains 2x more kanji


Future
--------------------------------------------------------------------------------
- Init-window for starting language content downloads
- Add cursor design functionality (Unlock with progress, popup-list in settings)
  - Find out why custom cursors using local URLs don't work in CSS variables
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
  - Implement detailed hanzi stats (just like the kanji stats)
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
  the view in the dictionary can be a single parameterized obj
- Switch to "better-sqlite3" to increase performance and code style?
- Removing word from vocabulary lists should be done in datamanager function too
- Content-related tables should be created dynamically when the content is first
  loaded instead of at creation-time of the database!
- Python's built in xml module (with the ElementTree class) has no feature to
  disable entity expansion - use lxml instead to keep dictionary tag names.
- Remove font-awesome from github repo and add as node package instead

### Changes
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
- Use events to communicate changes between panel and suggestion pane?
- Use String.matchAll for test comparisons (now that Electron has Chrome 73+)

