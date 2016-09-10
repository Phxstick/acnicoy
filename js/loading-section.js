"use strict";

utility.processDocument(document.currentScript.ownerDocument, (docContent) => {
    document.addEventListener("DOMContentLoaded", () => {
        window.TEMP = docContent;
    });
});
