"use strict";

class SrsSchemesOverlay extends Overlay {
    constructor() {
        super("srs-schemes");
        this.editModeActive = false;
        this.levelItemToSeconds = new WeakMap();
        this.schemeItemToOptions = new WeakMap();
        this.invalidTimeSpans = new Set();
        // Initially hide some elements
        this.$("save-scheme-button").hide();
        this.$("cancel-edit-button").hide();
        this.$("scheme-name-input").hide();
        this.$("scheme-description-input").hide();
        this.$("add-level-button").hide();
        this.hideSchemeDetails();
        // Add all event listeners
        this.$("done-button").addEventListener("click", () => {
            if (this.editModeActive) {
                dialogWindow.confirm(
                    `The current scheme has unsaved changes.
                     Do you want to save those changes?`)
                .then((confirmed) => {
                    if (confirmed === null) return;
                    if (confirmed && !this.saveChanges()) return;
                    this.resolve();
                });
            } else {
                this.resolve();
            }
        });
        this.$("add-scheme-button").addEventListener("click", () => {
            if (this.selectedSchemeItem !== null) {
                this.selectedSchemeItem.classList.remove("selected");
                this.selectedSchemeItem = null;
            }
            const newSchemeOptions = {
                name: "", description: "", intervals: []
            };
            this.showSchemeDetails(newSchemeOptions);
            this.openEditMode();
            this.$("scheme-name-input").focus();
        });
        this.$("edit-scheme-button").addEventListener("click", () => {
            this.openEditMode();
        });
        this.$("save-scheme-button").addEventListener("click", () => {
            if (this.saveChanges()) {
                this.exitEditMode();
            }
        });
        this.$("cancel-edit-button").addEventListener("click", () => {
            this.exitEditMode();
        });
        this.$("copy-scheme-button").addEventListener("click", () => {
            this.selectedSchemeItem.classList.remove("selected");
            this.selectedSchemeItem = null;
            this.showSchemeDetails({
                name: "",
                description: this.selectedScheme.description,
                intervals: this.selectedScheme.intervals.slice()
            });
            this.openEditMode();
            this.$("scheme-name-input").focus();
        });
        this.$("remove-scheme-button").addEventListener("click", () => {
            // TODO: Rewrite this with async/await
            const schemeName = this.selectedScheme.name;
            dialogWindow.confirm(
                `Are you sure you want to delete the SRS scheme` +
                ` '${schemeName}'?`)
            .then((confirmed) => {
                if (!confirmed) return;
                const languagesUsingScheme =
                    dataManager.srs.getLanguagesUsingScheme(schemeName);
                const removeScheme = () => {
                    this.$("schemes-list").removeChild(this.selectedSchemeItem);
                    dataManager.srs.schemes.remove(this.selectedScheme);
                    dataManager.srs.saveSchemes();
                    events.emit("srs-scheme-deleted", schemeName);
                    this.hideSchemeDetails();
                };
                // If scheme is in use, let user choose new scheme + migrate
                if (languagesUsingScheme.length > 0) {
                    overlay.open("migrate-srs", "delete-scheme", { schemeName })
                    .then((migrated) => {
                        if (migrated) removeScheme();
                    });
                } else {
                    removeScheme();
                }
            });
        });
        // Remove SRS level if cross next to it was clicked
        this.$("scheme-levels").addEventListener("click", (event) => {
            if (!event.target.classList.contains("remove-level-button")) return;
            const levels = this.$("scheme-levels").childrenArray();
            const startIndex = levels.indexOf(event.target.parentNode);
            this.$("scheme-levels").removeChild(event.target.parentNode);
            for (let i = startIndex; i < levels.length; ++i) {
                levels[i].children[0].textContent = i;
            }
        });
        this.$("add-level-button").addEventListener("click", (event) => {
            const level = this.$("scheme-levels").children.length + 1;
            this.$("scheme-levels").appendChild(utility.fragmentFromString(`
              <div>
                <div class="level">${level}</div>
                <div class="interval"></div>
                <input class="interval-input">
                <i class="fa fa-remove remove-level-button"></i>
              </div>
            `));
            this.$("scheme-levels").lastElementChild.children[2].focus();
        });
        // Show scheme details when scheme has been selected
        this.$("schemes-list").addEventListener("click", (event) => {
            if (event.target.parentNode !== this.$("schemes-list")) return;
            const item = event.target;
            if (this.selectedSchemeItem === item) return;
            if (this.editModeActive) {
                dialogWindow.confirm(
                    `The current scheme has unsaved changes.
                    Do you want to save those changes?`)
                .then((confirmed) => {
                    if (confirmed === null) return;
                    if (confirmed && !this.saveChanges()) return;
                    this.exitEditMode();
                    if (this.selectedSchemeItem !== null)
                        this.selectedSchemeItem.classList.remove("selected");
                    this.selectedSchemeItem = item;
                    this.selectedSchemeItem.classList.add("selected");
                    this.showSchemeDetails(this.schemeItemToOptions.get(item));
                });
            } else {
                if (this.selectedSchemeItem !== null) {
                    this.selectedSchemeItem.classList.remove("selected");
                }
                this.selectedSchemeItem = item;
                this.selectedSchemeItem.classList.add("selected");
                this.showSchemeDetails(this.schemeItemToOptions.get(item));
            }
        });
        // Show validity of entered timespans and sort level items upon typing
        this.$("scheme-levels").addEventListener("keydown", (event) => {
            if (!event.target.classList.contains("interval-input")) return;
            const key = event.key;
            const input = event.target;
            const levelItem = input.parentNode;
            utility.finishEventQueue().then(() => {
                const text = input.value;
                let seconds;
                try {
                    seconds = utility.timeSpanStringToSeconds(text);
                } catch (e) {
                    input.classList.add("invalid");
                    this.levelItemToSeconds.set(levelItem, null);
                    this.invalidTimeSpans.add(levelItem);
                    return;
                } 
                this.levelItemToSeconds.set(levelItem, seconds);
                this.invalidTimeSpans.delete(levelItem);
                input.classList.remove("invalid");
                const levelItemList = this.$("scheme-levels");
                // Move level item if there's no invalid input around
                if (this.invalidTimeSpans.size > 0) return;
                let moved = false;
                for (const other of levelItemList.children) {
                    if (other === levelItem) continue;
                    if (this.levelItemToSeconds.get(other) === null) continue;
                    if (seconds <= this.levelItemToSeconds.get(other)) {
                        if (other.previousElementSibling !== levelItem) {
                            levelItemList.insertBefore(levelItem, other);
                            moved = true;
                        }
                        break;
                    }
                }
                const last = levelItemList.lastElementChild;
                if (!moved && seconds > this.levelItemToSeconds.get(last)) {
                    levelItemList.appendChild(levelItem);
                    moved = true;
                }
                // Focus the entry again if user didn't tab away
                if (moved && key !== "\t") {
                    const { selectionStart, selectionEnd } = input;
                    input.focus();
                    input.selectionStart = selectionStart;
                    input.selectionEnd = selectionEnd;
                }
                // Adjust the level numbers again
                for (let i = 0; i < levelItemList.children.length; ++i) {
                    levelItemList.children[i].children[0].textContent = i + 1;
                }
            });
        });
    }

    open() {
        this.$("scheme-details-frame").hide();
        this.$("choose-scheme-info").show();
        this.$("schemes-list").empty();
        for (const schemeOptions of dataManager.srs.schemes) {
            const item = document.createElement("div");
            item.textContent = schemeOptions.name;
            this.schemeItemToOptions.set(item, schemeOptions);
            this.$("schemes-list").appendChild(item);
        }
    }

    close() {
        this.exitEditMode();
        this.hideSchemeDetails();
    }

    showSchemeDetails(scheme) {
        this.invalidTimeSpans.clear();
        this.$("choose-scheme-info").hide();
        this.$("scheme-details-frame").show();
        this.$("scheme-name").textContent = scheme.name;
        this.$("scheme-description").textContent = scheme.description;
        this.selectedScheme = scheme;
        this.$("scheme-levels").empty();
        // Create level nodes
        for (let i = 0; i < scheme.intervals.length; ++i) {
            const interval = scheme.intervals[i];
            this.$("scheme-levels").innerHTML += `
              <div>
                <div class="level">${i + 1}</div>
                <div class="interval">${interval}</div>
                <input class="interval-input">
                <i class="fa fa-remove remove-level-button"></i>
              </div>
            `;
        }
        // Map level node to its corresponding interval in seconds
        for (let i = 0; i < scheme.intervals.length; ++i) {
            const interval = scheme.intervals[i];
            const item = this.$("scheme-levels").children[i];
            const seconds = utility.timeSpanStringToSeconds(interval);
            this.levelItemToSeconds.set(item, seconds);
        }
    }

    createSrsLevelItem(level, interval) {
        this.$("scheme-levels").empty()
    }

    hideSchemeDetails(scheme) {
        this.$("scheme-details-frame").hide();
        this.$("choose-scheme-info").show();
        this.selectedSchemeItem = null;
        this.selectedScheme = null
    }

    openEditMode() {
        if (this.editModeActive) return;
        this.editModeActive = true;
        this.$("scheme-levels").classList.add("edit-mode");
        // Swap buttons
        this.$("save-scheme-button").show();
        this.$("cancel-edit-button").show();
        this.$("edit-scheme-button").hide();
        this.$("copy-scheme-button").hide();
        this.$("remove-scheme-button").hide();
        // Replace scheme name with input
        this.$("scheme-name").hide();
        this.$("scheme-name-input").show();
        this.$("scheme-name-input").value =
            this.$("scheme-name").textContent;
        // Replace scheme description with input
        this.$("scheme-description").hide();
        this.$("scheme-description-input").show();
        this.$("scheme-description-input").value =
            this.$("scheme-description").textContent;
        // Replace intervals with inputs
        const levelItems = this.$("scheme-levels").children;
        for (const { children: [, interval, intervalInput] } of levelItems) {
            intervalInput.value = interval.textContent;
            // interval.hide();
            // intervalInput.show();
        }
        // Show button to add levels
        this.$("add-level-button").show();
    }

    exitEditMode() {
        if (!this.editModeActive) return;
        this.editModeActive = false;
        this.$("scheme-levels").classList.remove("edit-mode");
        // Swap buttons
        this.$("save-scheme-button").hide();
        this.$("cancel-edit-button").hide();
        this.$("edit-scheme-button").show();
        this.$("copy-scheme-button").show();
        this.$("remove-scheme-button").show();
        // Restore name and description labels
        this.$("scheme-name").show();
        this.$("scheme-name-input").hide();
        this.$("scheme-description").show();
        this.$("scheme-description-input").hide();
        // Restore interval labels
        const levelItems = this.$("scheme-levels").children;
        for (const { children: [, interval, intervalInput] } of levelItems) {
            interval.show();
            intervalInput.hide();
        }
        this.$("add-level-button").hide();
        // If the edited scheme does not exist
        if (this.selectedSchemeItem === null) {
            this.hideSchemeDetails();
        }
    }
    
    /**
    * If all entered values in edit mode are valid, save changes and return
    * true. Otherwise return false.
    * @returns {bool} Whether values in the input entries are valid.
    */
    saveChanges() {
        if (!this.editModeActive) {
            throw new Error("Changes can only be saved in edit mode.");
        }
        if (this.$("scheme-name-input").value.trim().length === 0) {
            dialogWindow.info("Scheme name cannot be empty.");
            return false;
        }
        if (this.invalidTimeSpans.size > 0) {
            // TODO: Link to open help
            dialogWindow.info("Some of the entered time spans are invalid."
                + " See [TODO] for information on correct formatting.");
            return false;
        }
        if (this.$("scheme-levels").children.length === 0) {
            dialogWindow.info("An SRS scheme requires at least one level.");
            return false;
        }
        let oldName = this.selectedScheme.name;
        const newName = this.$("scheme-name-input").value;
        // If the scheme does not exist yet, create it
        if (this.selectedSchemeItem === null) {
            if (!dataManager.srs.createScheme(newName)) {
                dialogWindow.info(`A scheme with the name '${newName}' ` +
                                  `already exists.`);
                return false;
            }
            this.selectedSchemeItem = document.createElement("div");
            this.selectedSchemeItem.classList.add("selected");
            this.$("schemes-list").appendChild(this.selectedSchemeItem);
            oldName = newName;
            events.emit("srs-scheme-created", newName);
        } else {
            // TODO: Rewrite this with async/await
            // If scheme is being used by languages, migrate SRS items first
            dataManager.srs.getNonEmptyLanguagesUsingScheme(oldName).then(
            (languagesUsingScheme) => {
                // If scheme is in use, let user migrate SRS items
                if (languagesUsingScheme.length > 0) {
                    overlay.open("migrate-srs", "edit-scheme",
                        { schemeName: oldName })
                    .then((migrated) => {
                        if (migrated) {
                            // TODO: Continue
                        }
                    });
                }
            });
        }
        // Save changed name
        this.$("scheme-name").textContent = newName;
        this.selectedSchemeItem.textContent = newName;
        // Save changed description
        const newDescription = this.$("scheme-description-input").value;
        this.$("scheme-description").textContent = newDescription;
        // Save intervals (also transform to standard notation)
        const newIntervals = [];
        const levelItems = this.$("scheme-levels").children;
        for (const { children: [,intervalLabel,intervalInput] } of levelItems) {
            const input = intervalInput.value.trim();
            const timeSpanObject = utility.timeSpanStringToObject(input);
            const intervalText = utility.timeSpanObjectToString(timeSpanObject);
            intervalLabel.textContent = intervalText;
            newIntervals.push(intervalText);
        }
        // Apply changes to data
        this.selectedScheme = dataManager.srs.editScheme(
            oldName, newName, newDescription, newIntervals);
        this.schemeItemToOptions.set(
            this.selectedSchemeItem, this.selectedScheme);
        const languagesUsingScheme =
            dataManager.srs.getLanguagesUsingScheme(newName);
        if (languagesUsingScheme.includes(dataManager.currentLanguage)) {
            events.emit("current-srs-scheme-edited");
        }
        dataManager.srs.saveSchemes();
        return true;
    }
}

customElements.define("srs-schemes-overlay", SrsSchemesOverlay);
module.exports = SrsSchemesOverlay;
