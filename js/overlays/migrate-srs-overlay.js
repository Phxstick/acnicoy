"use strict";

class MigrateSrsOverlay extends Overlay {
    constructor() {
        super("migrate-srs");
        this.backupInfo = {};
        this.draggingConnection = false;
        this.draggedConnection = null;
        this.hoveringOverConnector = false;
        this.connectorHoveredOver = null;
        this.startConnector = null;
        this.arrowTriangle = null;
        this.levelItemHeight = 32;
        this.connectorRadius = this.levelItemHeight / 2 - 3;
        this.migrateAreaWidth = 130;
        this.connectorToInterval = new WeakMap();
        this.connectorToLevel = new WeakMap();
        this.connectionToModifierLabel = new WeakMap();
        this.connectionToOldLevel = new WeakMap();
        this.connectionToNewLevel = new WeakMap();
        this.connections = new Map();
        this.languagesAffected = [];
        this.oldSchemeIntervals = [];
        this.newSchemeIntervals = [];
        // Add event listeners
        this.$("close-button").addEventListener("click", () => {
            this.resolve(false);
        });
        this.$("cancel-button").addEventListener("click", () => {
            this.resolve(false);
        });
        this.$("migrate-button").addEventListener("click", () => {
            this.migrate();
        });
        this.$("help-link").addEventListener("click", () => {
            dialogWindow.info("Not yet implemented.");
            // TODO: Link to open help
        });
        // Display intervals for selected scheme
        this.$("select-new-scheme").addEventListener("change", () => {
            if (this.$("select-new-scheme").selectedIndex === 0) return;
            const selectedScheme = this.$("select-new-scheme").value;
            this.displayNewScheme(
                dataManager.srs.getIntervalTextsForScheme(selectedScheme));
        });
        // Start dragging a connection when clicking a connector at old scheme
        const previousSchemeConnectors = this.$("previous-scheme-connectors");
        previousSchemeConnectors.addEventListener("mousedown", (event) => {
            if (event.target.parentNode === previousSchemeConnectors) {
                // Create a line starting from clicked connector
                const connector = event.target;
                const startX = connector.getAttribute("cx");
                const startY = connector.getAttribute("cy");
                const connection = utility.createSvgNode("line", {
                    x1: startX, y1: startY, x2: startX, y2: startY
                });
                // Create a triangle to make line into an arrow
                connection.classList.add("connection");
                const arrowBottomWidth = 14;
                const arrowHeight = 18;
                const arrowTriangle = utility.createSvgNode("polygon", {
                    points: `${-arrowBottomWidth / 2},${arrowHeight / 3}
                             ${arrowBottomWidth / 2},${arrowHeight / 3}
                             ${0},${-2 * arrowHeight / 3}`,
                    transform: `translate(${startX} ${startY}) rotate(90)`
                });
                arrowTriangle.classList.add("connection-arrow");
                this.$("scheme-connections").appendChild(connection);
                this.$("connection-arrow-triangles").appendChild(arrowTriangle);
                // Start dragging operation by setting variables
                this.startConnector = connector;
                this.draggedConnection = connection;
                this.arrowTriangle = arrowTriangle;
                this.draggingConnection = true;
            }
        });
        // Implement dragging a connection when hovering over migration-area
        this.$("migrate-srs-area").addEventListener("mousemove", (event) => {
            if (this.draggingConnection) {
                // Get start and end of connection line (in svg coords)
                const startX = this.startConnector.getAttribute("cx");
                const startY = this.startConnector.getAttribute("cy");
                const endX = event.offsetX;
                const endY = event.offsetY;
                // Set position of line end
                this.draggedConnection.setAttribute("x2", endX);
                this.draggedConnection.setAttribute("y2", endY);
                // Calculate angle for the arrow rotation
                const hypotenuse = Math.sqrt(Math.pow(endX - startX, 2) +
                                             Math.pow(endY - startY, 2));
                const oppositeLeg = endY - startY;
                const radians = Math.asin(oppositeLeg / hypotenuse);
                const degrees = (radians / Math.PI) * 180;
                // Position and rotate arrow
                this.arrowTriangle.setAttribute("transform",
                    `translate(${endX} ${endY}) rotate(${90 + degrees})`);
            }
        });
        // Add a connection when dragging on a connector at new scheme
        window.addEventListener("mouseup", (event) => {
            if (this.draggingConnection) {
                this.draggingConnection = false;
                if (this.hoveringOverConnector) {
                    this.hoveringOverConnector = false;
                    // Only add connection if it doesn't exist already
                    if (!this.connections.get(this.startConnector)
                                         .has(this.connectorHoveredOver)) {
                        const connection = this.draggedConnection;
                        const startConnector = this.startConnector;
                        const endConnector = this.connectorHoveredOver;
                        const oldLevel =
                            this.connectorToLevel.get(startConnector);
                        const newLevel =
                            this.connectorToLevel.get(endConnector);
                        const x1 = parseInt(startConnector.getAttribute("cx"));
                        const y1 = parseInt(startConnector.getAttribute("cy"));
                        const x2 = parseInt(endConnector.getAttribute("cx"));
                        const y2 = parseInt(endConnector.getAttribute("cy"));
                        // Don't allow connection to cross another
                        const connList = this.$("scheme-connections").children;
                        for (const otherConnection of connList) {
                            const otherOldLevel =
                                this.connectionToOldLevel.get(otherConnection);
                            const otherNewLevel =
                                this.connectionToNewLevel.get(otherConnection);
                            if ((otherOldLevel < oldLevel &&
                                    otherNewLevel > newLevel) ||
                                   (otherOldLevel > oldLevel &&
                                    otherNewLevel < newLevel)) {
                                this.draggedConnection.remove();
                                this.arrowTriangle.remove();
                                dialogWindow.info("Connection lines may not " +
                                    "cross each other!");
                                return;
                            }
                        }
                        // Connect line to endpoint and register connection
                        connection.setAttribute("x2", x2);
                        connection.setAttribute("y2", y2);
                        this.connections.get(startConnector).add(endConnector);
                        this.connectionToOldLevel.set(connection, oldLevel);
                        this.connectionToNewLevel.set(connection, newLevel);
                        // Add a little sign for choosing modifier in the middle
                        const xMiddle = x1 + (x2 - x1) / 2;
                        const yMiddle = y1 + (y2 - y1) / 2;
                        const modifierLabel = utility.createSvgNode("g");
                        modifierLabel.setAttribute("transform",
                            `translate(${xMiddle} ${yMiddle})`);
                        modifierLabel.classList.add("modifier-label");
                        const modifierCircle = utility.createSvgNode("circle", {
                            r: this.levelItemHeight / 4, cx: 0, cy: 0
                        });
                        modifierLabel.appendChild(modifierCircle);
                        this.connectionToModifierLabel.set(
                            connection, modifierLabel);
                        this.$("modifier-labels").appendChild(modifierLabel);
                        // Remove connection when right clicking it or its label
                        const remove = () => {
                            this.connections.get(startConnector)
                                            .delete(endConnector);
                            connection.remove();
                            modifierLabel.remove();
                        };
                        connection.addEventListener("contextmenu", remove);
                        modifierLabel.addEventListener("contextmenu", remove);
                        // Create textnode for modifier symbol
                        const modifierSymbol = utility.createSvgNode("text", {
                            x: 0, y: 0, transform: "translate(-0.5 -0.5)"
                        });
                        modifierSymbol.classList.add("modifier-symbol");
                        modifierLabel.appendChild(modifierSymbol);
                        // Find fitting modifiers for this connection
                        const oldLevelInterval =
                            this.connectorToInterval.get(startConnector);
                        const newLevelInterval =
                            this.connectorToInterval.get(endConnector);
                        let modifierIndex;
                        const modifiers = ["="];
                        if (oldLevelInterval === newLevelInterval) {
                            modifierIndex = 0;
                        } else if (oldLevelInterval < newLevelInterval) {
                            modifiers.push("+");
                            modifierIndex = 1;
                        } else if (oldLevelInterval > newLevelInterval ){
                            modifiers.push("-", "\u223c");
                            modifierIndex = 1;
                        }
                        modifierSymbol.textContent = modifiers[modifierIndex];
                        // Allow cycling through modifiers on left click
                        modifierLabel.addEventListener("click", () => {
                            modifierIndex =
                                (modifierIndex + 1) % modifiers.length;
                            const nextModifier = modifiers[modifierIndex];
                            modifierSymbol.textContent = nextModifier;
                            if (nextModifier === "\u223c") {
                                modifierSymbol.classList.add("small");
                            } else {
                                modifierSymbol.classList.remove("small");
                            }
                        });
                    } else {
                        this.draggedConnection.remove();
                    }
                } else {
                    this.draggedConnection.remove();
                }
                this.arrowTriangle.remove();
            }
        });
        // Register hovering over connectors at new scheme
        const newSchemeConnectors = this.$("new-scheme-connectors");
        newSchemeConnectors.addEventListener("mouseover", (event) => {
            if (event.target.parentNode === newSchemeConnectors) {
                if (this.draggingConnection) {
                    this.hoveringOverConnector = true;
                    this.connectorHoveredOver = event.target;
                    this.connectorHoveredOver.classList.add("hovering");
                }
            }
        });
        newSchemeConnectors.addEventListener("mouseout", (event) => {
            if (event.target.parentNode === newSchemeConnectors) {
                event.target.classList.remove("hovering");
                this.hoveringOverConnector = false;
            }
        });
    }

    open(mode, info) {
        if (mode === "edit-scheme") {
            this.languagesAffected =
                dataManager.srs.getLanguagesUsingScheme(info.schemeName);
            this.$("info-message").textContent = "The SRS scheme to be "
                + "edited is used by the following languages: "
                + this.languagesAffected.join(", ") + ". "
                + "You can choose how to migrate all SRS items to fit into "
                + "the new scheme.";
            this.$("select-new-scheme-frame").hide();
        } else if (mode === "switch-scheme") {
            this.languagesAffected = [info.language];
            this.$("info-message").textContent = "You can choose a new scheme "
                + "for this language and specify how to migrate SRS items to "
                + "the selected scheme.";
            this.$("select-new-scheme-frame").show();
        } else if (mode === "delete-scheme") {
            this.languagesAffected =
                dataManager.srs.getLanguagesUsingScheme(info.schemeName);
            this.$("info-message").textContent = "The SRS scheme to be "
                + "deleted is used by the following languages: "
                + this.languagesAffected.join(", ") + ". "
                + "You can choose a new scheme for these languages and "
                + "specify how to migrate all SRS items to the new scheme.";
            this.$("select-new-scheme-frame").show();
        }
        this.displayPreviousScheme(
            dataManager.srs.getIntervalTextsForScheme(info.schemeName));
        this.$("previous-scheme-connectors").style.display = "none";
        this.$("select-new-scheme").empty();
        this.$("select-new-scheme").appendChild(
            utility.createDefaultOption("Select other SRS scheme"));
        for (const { name } of dataManager.srs.schemes) {
            if (name === info.schemeName) continue;
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            this.$("select-new-scheme").appendChild(option);
        }
        this.backupInfo = {
            event: "srs-items-migration",
            mode: mode,
            schemeName: info.schemeName
        };
    }

    close() {
        this.resetConnections();
        this.resetNewScheme();
    }

    resetConnections() {
        // Map each connector from the old scheme to an empty set
        for (const newLevelConnectorSet of this.connections.values()) {
            newLevelConnectorSet.clear();
        }
        this.$("scheme-connections").empty();
        this.$("modifier-labels").empty();
    }

    displayPreviousScheme(intervalTexts) {
        this.$("previous-scheme").empty();
        this.$("previous-scheme-connectors").empty();
        this.connections.clear();
        this.oldSchemeIntervals.clear();
        for (let level = 1; level < intervalTexts.length; ++level) {
            const intervalText = intervalTexts[level];
            const interval = utility.timeSpanStringToSeconds(intervalText)
                             - utility.timeSpanStringToSeconds(
                                 dataManager.settings.srs.intervalModifier);
            this.oldSchemeIntervals.push(interval);
            // Display interval text
            const levelItem = document.createElement("div");
            levelItem.textContent = intervalText;
            this.$("previous-scheme").appendChild(levelItem);
            // Create connector circle for setting migration plan
            const offset = level - 1;
            const connector = utility.createSvgNode("circle", {
                r: this.connectorRadius,
                cx: 0,
                cy: this.levelItemHeight * offset +
                    this.levelItemHeight / 2 - offset
            });
            this.$("previous-scheme-connectors").appendChild(connector);
            // Register connector
            this.connections.set(connector, new Set());
            this.connectorToInterval.set(connector, interval);
            this.connectorToLevel.set(connector, level);
        }
    }

    resetNewScheme() {
        this.$("new-scheme").empty();
        this.$("new-scheme-connectors").empty();
        this.newSchemeIntervals.clear();
    }

    displayNewScheme(intervalTexts) {
        this.resetNewScheme();
        for (let level = 1; level < intervalTexts.length; ++level) {
            const intervalText = intervalTexts[level];
            const interval = utility.timeSpanStringToSeconds(intervalText)
                             - utility.timeSpanStringToSeconds(
                                 dataManager.settings.srs.intervalModifier);
            this.newSchemeIntervals.push(interval);
            // Display interval text
            const levelItem = document.createElement("div");
            levelItem.textContent = intervalText;
            this.$("new-scheme").appendChild(levelItem);
            // Create connector circle for setting migration plan
            const offset = level - 1;
            const connector = utility.createSvgNode("circle", {
                r: this.connectorRadius,
                cx: this.migrateAreaWidth,
                cy: this.levelItemHeight * offset +
                    this.levelItemHeight / 2 - offset
            });
            this.$("new-scheme-connectors").appendChild(connector);
            // Register connector
            this.connectorToInterval.set(connector, interval);
            this.connectorToLevel.set(connector, level);
        }
        this.resetConnections();
        this.$("previous-scheme-connectors").style.display = "block";
        // TODO: Create default connections for new scheme
    }
    
    migrate() {
        // Check if new scheme was selected (irrelevant for "edit-scheme" mode)
        if (this.$("new-scheme-connectors").children.length === 0) {
            dialogWindow.info("No SRS scheme has been selected.");
            return;
        }
        // Check if all levels from the old scheme have at least one connection
        for (const newLevelConnectorSet of this.connections.values()) {
            if (newLevelConnectorSet.size === 0) {
                dialogWindow.info("Every level from the old scheme (which "
                + "has associated SRS items) must be connected with at least "
                + "one level from the new scheme!");
                return;
            }
        }
        // Parse connection information to get a migration plan
        const migrationPlan = new Map();
        const numLevelsOldScheme =
            this.$("previous-scheme-connectors").children.length;
        for (let level = 1; level <= numLevelsOldScheme; ++level) {
            migrationPlan.set(level, []);
        }
        for (const connection of this.$("scheme-connections").children) {
            const oldLevel = this.connectionToOldLevel.get(connection);
            const newLevel = this.connectionToNewLevel.get(connection);
            const modifier =
                this.connectionToModifierLabel.get(connection).textContent;
            migrationPlan.get(oldLevel).push([newLevel, modifier]);
        }
        // Sort arrays in migration plan by new level
        for (const [,newLevelsArray] of migrationPlan) {
            newLevelsArray.sort(([lvl1, mod1], [lvl2, mod2]) => lvl1 - lvl2);
        }
        // Create user data backup before migrating
        this.backupInfo.oldSchemeIntervals = this.oldSchemeIntervals;
        this.backupInfo.newSchemeIntervals = this.newSchemeIntervals;
        this.backupInfo.languagesAffected = this.languagesAffected;
        const migrationPlanObject = {};
        for (const [oldLevel, newLevels] of migrationPlan) {
            migrationPlanObject[oldLevel] = newLevels;
        }
        this.backupInfo.migrationPlan = migrationPlanObject;
        if (this.backupInfo.mode === "switch-scheme" ||
                this.backupInfo.mode === "delete-scheme") {
            this.backupInfo.newSchemeName = this.$("select-new-scheme").value;
        }
        return dataManager.createBackup(this.backupInfo).then(() => {
            console.log("Beginning migration...");
            // Migrate items for all languages affected, according to the plan
            const migrationPromises = [];
            const startTime = performance.now();
            for (const language of this.languagesAffected) {
                const migrationPromise = dataManager.srs.migrateItems(
                    language, this.oldSchemeIntervals, this.newSchemeIntervals,
                    migrationPlan).then(() => {
                        // After migration, switch language to new scheme
                        if (this.backupInfo.mode === "switch-scheme" ||
                                this.backupInfo.mode === "delete-scheme") {
                            return dataManager.srs.switchScheme(
                                language, this.backupInfo.newSchemeName)
                            .then(() => {
                                if (language === dataManager.currentLanguage) {
                                    events.emit("current-srs-scheme-edited");
                                }
                            });
                        }
                    });
                migrationPromises.push(migrationPromise);
            }
            // TODO: Loading screen necessary? Took 1+ sec for ~8000 items
            return Promise.all(migrationPromises).then(() => {
                const totalTime = performance.now() - startTime;
                console.log("Finished migration after %f ms", totalTime);
                this.resolve(true);
            });
        });
    }
}

customElements.define("migrate-srs-overlay", MigrateSrsOverlay);
module.exports = MigrateSrsOverlay;
