"use strict";

class Section extends Component {
    constructor(name) {
        super(name + "-section", true);
    }

    /**
     * Called when main window is opened.
     */
    initialize() {
    }

    /**
     *  Called before the section is being opened.
     */
    open() {
    }

    /**
     *  Called when attempting to close the section. If the method returns
     *  false, the close-action will be cancelled.
     */
    confirmClose() {
        return true;
    }

    /**
     *  Called before the section is being closed. Allows cleaning up stuff.
     */
    close() {
    }
    
    /**
     *  Will be called when the current language pair changes. Everything
     *  in the section depending on the current language should be set in this
     *  function.
     */
    adjustToLanguage(language, secondary) {
    }

    /**
     *  Called ONCE when new content for a language becomes available.
     */
    processLanguageContent(language, secondaryLanguage) {
    }

    /**
     *  Called when changing language or new content becomes available.
     */
    adjustToLanguageContent(language, secondaryLanguage) {
    }
}

module.exports = Section;
