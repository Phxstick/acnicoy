"use strict";

class SrsSchemesOverlay extends Overlay {
    constructor() {
        super("srs-schemes");
        this.editModeActive = false;
        this.levelItemToSeconds = new WeakMap();
        this.schemeItemToOptions = new WeakMap();
        this.selectedScheme = null;
        this.selectedSchemeItem = null;
        this.hideSchemeDetails();
        // Add all event listeners
        this.$("done-button").addEventListener("click", async () => {
            if (this.editModeActive) {
                const confirmed = await dialogWindow.confirm(
                    `The current scheme has unsaved changes.
                     Do you want to save those changes?`)
                if (confirmed === null) return;
                if (confirmed && !(await this.saveChanges())) return;
            }
            this.resolve();
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
        this.$("save-scheme-button").addEventListener("click", async () => {
            if (await this.saveChanges()) {
                this.exitEditMode();
            }
        });
        this.$("cancel-edit-button").addEventListener("click", () => {
            this.exitEditMode();
            if (this.selectedScheme !== null) {
                this.showSchemeDetails(this.selectedScheme);
            }
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
        this.$("remove-scheme-button").addEventListener("click", async () => {
            const schemeName = this.selectedScheme.name;
            const confirmed = await dialogWindow.confirm(
                `Are you sure you want to delete the SRS scheme` +
                ` '${schemeName}'?`);
            if (!confirmed) return;
            const languagesUsingScheme =
                dataManager.srs.getLanguagesUsingScheme(schemeName);
            // If scheme is in use, let user choose new scheme + migrate
            if (languagesUsingScheme.length > 0) {
                const migrated = await overlays.open(
                    "migrate-srs", "delete-scheme", { schemeName });
                if (!migrated) return;
            }
            this.$("schemes-list").removeChild(this.selectedSchemeItem);
            dataManager.srs.schemes.remove(this.selectedScheme);
            dataManager.srs.saveSchemes();
            events.emit("srs-scheme-deleted", schemeName);
            this.hideSchemeDetails();
        });
        // Show scheme details when scheme has been selected
        this.$("schemes-list").addEventListener("click", async (event) => {
            if (event.target.parentNode !== this.$("schemes-list")) return;
            const item = event.target;
            if (this.selectedSchemeItem === item) return;
            if (this.editModeActive) {
                const confirmed = await dialogWindow.confirm(
                    `The current scheme has unsaved changes.
                     Do you want to save those changes?`);
                if (confirmed === null) return;
                if (confirmed && !(await this.saveChanges())) return;
                this.exitEditMode();
            }
            if (this.selectedSchemeItem !== null)
                this.selectedSchemeItem.classList.remove("selected");
            this.selectedSchemeItem = item;
            this.selectedSchemeItem.classList.add("selected");
            this.showSchemeDetails(this.schemeItemToOptions.get(item));
        });
        this.$("add-level-input").addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                this.addLevel();
            }
        });
        this.$("add-level-button").addEventListener("click", (event) => {
            this.addLevel();
        });
        // Remove SRS level if cross next to it was clicked
        this.$("scheme-levels").addEventListener("click", (event) => {
            if (!event.target.classList.contains("remove-level-button")) return;
            this.$("scheme-levels").removeChild(event.target.parentNode);
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
        this.$("choose-scheme-info").hide();
        this.$("scheme-details-frame").show();
        this.$("scheme-name").textContent = scheme.name;
        this.$("scheme-description").textContent = scheme.description;
        this.selectedScheme = scheme;
        this.$("scheme-levels").empty();
        // Display levels
        const fragment = document.createDocumentFragment();
        for (const intervalText of scheme.intervals) {
            const seconds = utility.timeSpanStringToSeconds(intervalText);
            fragment.appendChild(this.createLevelItem(intervalText, seconds));
        }
        this.$("scheme-levels").appendChild(fragment);
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
        this.$("scheme-frame").classList.add("edit-mode");
        this.$("scheme-name-input").value =
            this.$("scheme-name").textContent;
        this.$("scheme-description-input").value =
            this.$("scheme-description").textContent;
    }

    exitEditMode() {
        if (!this.editModeActive) return;
        this.editModeActive = false;
        this.$("scheme-frame").classList.remove("edit-mode");
        if (this.selectedSchemeItem === null) {
            this.hideSchemeDetails();
        }
    }
    
    /**
    * If all entered values in edit mode are valid, save changes and return
    * true. Otherwise return false.
    * @returns {Promise[bool]} Whether values in the input entries are valid.
    */
    async saveChanges() {
        if (!this.editModeActive) {
            throw new Error("Changes can only be saved in edit mode.");
        }
        if (this.$("scheme-name-input").value.trim().length === 0) {
            dialogWindow.info("Scheme name cannot be empty.");
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
            // If scheme is in use, let user migrate SRS items first
            const languagesUsingScheme =
                await dataManager.srs.getNonEmptyLanguagesUsingScheme(oldName);
            if (languagesUsingScheme.length > 0) {
                const migrated = await overlays.open(
                    "migrate-srs", "edit-scheme", { schemeName: oldName });
                if (!migrated) return false;
            }
        }
        // Gather new scheme data
        const newDescription = this.$("scheme-description-input").value;
        const newIntervals = [];
        const intervalLabels =
            this.$("scheme-levels").querySelectorAll(".interval");
        for (const { textContent: intervalText } of intervalLabels) {
            newIntervals.push(intervalText);
        }
        // Update view
        this.selectedSchemeItem.textContent = newName;
        this.$("scheme-name").textContent = newName;
        this.$("scheme-description").textContent = newDescription;
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

    createLevelItem(intervalText, intervalSeconds) {
        const node = utility.fragmentFromString(`
          <div>
            <div class="interval">${intervalText}</div>
            <button class="remove-level-button light no-shadow">
              <i class="fa fa-remove"></i>
            </button>
          </div>
        `).children[0];
        this.levelItemToSeconds.set(node, intervalSeconds);
        return node;
    }

    addLevel() {
        let intervalText = this.$("add-level-input").value.trim();
        let seconds;
        // If interval is not valid, display info window
        let invalid = intervalText.length === 0;
        try {
            seconds = utility.timeSpanStringToSeconds(intervalText);
        } catch (e) {
            invalid = true;
        } 
        if (invalid) {
            dialogWindow.info(
                `Valid interval units are: hours, days, weeks, months.
                 Multiple units can be seperated by comma. Example:<br><br>
                 1 month, 2 weeks, 12 hours`);
            return;
        }
        // Convert interval text to standard notation
        const timeSpanObject = utility.timeSpanStringToObject(intervalText);
        intervalText = utility.timeSpanObjectToString(timeSpanObject);
        // Insert view item at correct position
        const newLevelItem = this.createLevelItem(intervalText, seconds);
        for (const otherLevel of this.$("scheme-levels").children) {
            if (seconds < this.levelItemToSeconds.get(otherLevel)) {
                this.$("scheme-levels").insertBefore(newLevelItem, otherLevel);
                break;
            }
        }
        const lastLevelItem = this.$("scheme-levels").lastChild;
        if (seconds > this.levelItemToSeconds.get(lastLevelItem) ||
                this.$("scheme-levels").children.length === 0) {
            this.$("scheme-levels").appendChild(newLevelItem);
        }
        this.$("add-level-input").value = "";
    }
}

customElements.define("srs-schemes-overlay", SrsSchemesOverlay);
module.exports = SrsSchemesOverlay;
