"use strict";

/**
 * Visualizes data given as a tree. Can be built from a JSON object and
 * vise-versa. The JSON object is an array of nodes, which are objects.
 *
 * Every object defining a node must at least contain a "name" property (used
 * to build the path to the node, must be unique across siblings). Optionally,
 * there may be additional properties:
 * - "children" (array of objects, each defining a child node, order is kept)
 * - "open" (bool, whether the list of children should be visible initially)
 * - "data" (arbitrary raw data associated with this node)
 *
 * The tree then consists of nodes which are objects with several properties:
 * - "name" (the label of the node, which is displayed in the view)
 * - "parent" (the parent node)
 * - "domNode" (the corresponding DOM node in the view)
 * - "children" (an object mapping each name to the child node with that name)
 * - "childrenArray" (an array containing the name of the children in order)
 * - "data" (arbitrary processed data associated with this node)
 * Additionally, some descendant nodes of the DOM nodes are also stored as
 * properties for easy access in other functions.
 *
 * When building the tree, data in the JSON object is passed to the callback
 * "loadData" and the return value is stored in the tree node. When saving,
 * the data in the tree node is passed to the "saveData" callback, which should
 * return a JSON object that can be stored again.
 *
 * Nodes can be opened (which means that their children are listed below them)
 * by clicking the arrow in front of their label. Clicking on the name label
 * invokes a callback which can be set by the method "onSelect".
 */
class TreeView extends Widget {
    constructor() {
        super("tree-view");
        this.callbacks = {
            canDrop: (node, dragData) => false,
            onDrop: (node, dragData) => { },
            onSelect: (node) => { },
            onDeselect: (node) => { },
            onModify: () => { }
        };
        this.selectedNode = null;
        this.rootNode = null;
        this.domLabelToNode = new WeakMap();
        this.isEditable = false;
        this.contextMenu(menuItems, ["add-group"], { treeView: this });
    }

    /**
     * Build the tree defined by the given JSON object.
     * @param {Object} structure - Array of nodes (as defined above).
     * @param {Function} [loadData] - A callback which is called for every node.
     *     Takes the data given in the JSON definition of the node as argument,
     *     and returns arbitrary processed data which is saved in the tree node.
     */
    build(structure, loadData) {
        this.$("root").empty();
        this.rootNode = { domNode: null, parent: null,
                          children: {}, childrenArray: [] };
        this.selectedNode = null;
        this.callbacks.loadData = loadData;
        for (const nodeInfo of structure) {
            const node = this.buildNode(nodeInfo, this.rootNode);
            this.$("root").appendChild(node.domNode);
        }
    }

    /**
     * Create a tree node from the given definition.
     * @param {Object} nodeInfo - Properties the node (as defined above).
     * @param {Object} parentNode - Parent node
     * @returns {Object}
     */
    buildNode(nodeInfo, parentNode) {
        const { name, children, open, data } = nodeInfo;

        // Create the node and register it as child in its parent node
        const node = { name, parent: parentNode,
                       children: {}, childrenArray: [] };
        parentNode.children[name] = node;
        parentNode.childrenArray.push(name);

        // Process and attach associated data (if given)
        if (this.callbacks.loadData !== undefined) {
            node.data = this.callbacks.loadData(data);
        }

        // Create an associated DOM node for the view
        const domNode = document.createElement("div");
        domNode.classList.add("node");
        node.domNode = domNode;

        // Create a container for the arrow button and name label
        const nameFrameNode = document.createElement("div");
        nameFrameNode.classList.add("node-name-frame");
        domNode.appendChild(nameFrameNode);

        // Create the name label and attach a callback
        const nameNode = document.createElement("span");
        nameNode.classList.add("node-name")
        nameNode.textContent = name;
        nameNode.addEventListener("click", (event) => {
            this.select(node);
            event.stopPropagation();
        });
        nameFrameNode.appendChild(nameNode);
        node.labelNode = nameNode;
        this.domLabelToNode.set(nameNode, node);

        // Create the arrow button and attach a callback for opening the node
        const openNodeButton = document.createElement("button");
        openNodeButton.classList.add("open-node-button");
        nameFrameNode.prependChild(openNodeButton);
        openNodeButton.addEventListener("click", () => {
            childrenContainer.toggleDisplay();
            domNode.classList.toggle("open");
        });
        node.openButton = openNodeButton;

        // Create a container of children to be shown when clicking the arrow
        const childrenContainer = document.createElement("div");
        childrenContainer.classList.add("children-container");
        domNode.appendChild(childrenContainer);
        node.childrenContainer = childrenContainer;
        
        if (children !== undefined && children.length > 0) {
            // Recursively create child nodes and add them to the container
            for (const childInfo of children) {
                const childNode = this.buildNode(childInfo, node);
                childrenContainer.appendChild(childNode.domNode);
            }
            // Initially show the children container if the "open" flag is set
            childrenContainer.toggleDisplay(open === true);
            domNode.classList.toggle("open", open === true);
        } else {
            // Hide the arrow button if there are currently no children
            openNodeButton.classList.add("hidden");
        }

        // Add contextmenu with edit operations to name label
        if (this.isEditable) {
            nameNode.contextMenu(menuItems,
                ["add-subgroup", "delete-group", "rename-group"],
                { node, treeView: this });
        }

        return node;
    }

    /**
     * Select the given node by marking its associated DOM node and invoking the
     * callback assigned by the "setOnSelect"-method.
     * @param {Object} node
     */
    select(node) {
        this.deselect();
        this.selectedNode = node;
        this.selectedNode.domNode.classList.add("selected");
        this.callbacks.onSelect(node);
    }

    /**
     * Deselect the currently selected node by unmarking its associated DOM node
     * and invoking the callback assigned by the "setOnDeselect"-method.
     * @param {Object} node
     */
    deselect() {
        if (this.selectedNode !== null) {
            this.selectedNode.domNode.classList.remove("selected");
            this.callbacks.onDeselect(this.selectedNode);
        }
        this.selectedNode = null;
    }

    /**
     * Select the node with the given path.
     * @param {Array} path - Array of strings (names of nodes).
     */
    selectByPath(path) {
        let node = this.rootNode;
        for (const name of path) {
            node = node.children[name];
            if (node === undefined) {
                const pathStr = path.join(", ");
                throw new Error(`Path [${pathStr}] does not exist in the tree!`)
            }
        }
        this.select(node);
    }

    /**
     * Get the path of the given node.
     * @param {Object} node - Tree node.
     * @returns {Array} - Array of strings (names of nodes).
     */
    getPath(node) {
        const path = [];
        let currentNode = node;
        while (currentNode !== this.rootNode) {
            path.push(currentNode.name);
            currentNode = currentNode.parent;
        }
        path.reverse();
        return path;
    }

    /**
     * Converts the tree to a JSON object.
     * @param {Function} saveData - A callback which is called for every node.
     *     It is given the data associated to the node and should return data
     *     for the node in form of a JSON object.
     * @returns {Object}
     */
    toJsonObject(saveData) {
        const rootArray = [];
        for (const name of this.rootNode.childrenArray) {
            rootArray.push(this.nodeToJsonObject(
                this.rootNode.children[name], saveData));
        }
        return rootArray;
    }

    /**
     * Converts the given node to a JSON object.
     * @param {Object} node - Tree node
     * @param {Function} saveData - See "toJSON"-method
     * @returns {Object}
     */
    nodeToJsonObject(node, saveData) {
        const { name, domNode, children, childrenArray, data } = node;
        const jsonObject = { name, children: [] };
        jsonObject.open = domNode.classList.contains("open");

        // Attach data if available
        if (data !== undefined) {
            jsonObject.data = saveData(data);
        }

        // Recursively turn children nodes into JSON objects
        for (const childName of childrenArray) {
            const childObject =
                this.nodeToJsonObject(children[childName], saveData);
            jsonObject.children.push(childObject);
        }

        return jsonObject;
    }

    /**
     * Add an event listener to every node in the tree.
     * @param {String} eventType - Event type to add a listener for.
     * @param {Function} callback - Callback taking (event, node) as argument.
     */
    addListener(eventType, callback) {
        this.$("root").addEventListener(eventType, (event) => {
            const labelNode = this.domLabelToNode.get(event.target);
            if (labelNode !== undefined) {
                callback(event, labelNode);
            }
        });
    }

    // =========================================================================
    //    Setters
    // =========================================================================

    /**
     * Set the callback which is invoked when clicking a node label.
     * @param {Function} callback - A function, the node is passed as argument.
     */
    setOnSelect(callback) {
        this.callbacks.onSelect = callback;
    }

    /**
     * Set the callback which is invoked when the selected node is deselected.
     * @param {Function} callback - A function, the node is passed as argument.
     */
    setOnDeselect(callback) {
        this.callbacks.onDeselect = callback;
    }

    /**
     * Set the callback which is invoked when dragging an item over the label
     * of a node. The callback should return true if the item can be dropped.
     * @param {Function} callback - A function which gets the node and drag
     *     data store passed as arguments.
     */
    setCanDrop(callback) {
        this.callbacks.canDrop = callback;
    }

    /**
     * Set the callback which is invoked when a compatible item is dropped on
     * the name label of a node.
     * @param {Function} callback - A function which gets the node and drag
     *     data store passed as arguments.
     */
    setOnDrop(callback) {
        this.callbacks.onDrop = callback;
    }

    /**
     * Set the callback which is invoked when the tree view has been modified
     * by adding, deleting or removing tree nodes.
     * @param {Function} callback - A callback function without any arguments.
     */
    setOnModify(callback) {
        this.callbacks.onModify = callback;
    }

    // =========================================================================
    //   HTMAttributes
    // =========================================================================

    static get observedAttributes() {
        return ["editable"];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "editable") {
            this.isEditable = newValue !== null;
        }
    }
}

const menuItems = contextMenu.registerItems({
    "add-group": {
        label: "Add group",
        click: ({ currentNode, data: { treeView } }) => {
            const inputContainer = document.createElement("div");
            inputContainer.classList.add("input-container");
            const inputNode = document.createElement("input");
            inputContainer.appendChild(inputNode);
            inputNode.placeholder = "Enter name";
            inputNode.classList.add("light");
            // Escape or focussing out cancels the action
            inputNode.addEventListener("focusout", () => {
                inputContainer.remove();
            });
            inputNode.addEventListener("keydown", (event) => {
                if (event.key === "Escape") inputNode.blur();
            });
            // Process input when Enter key is pressed
            inputNode.addEventListener("keypress", async (event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                const newGroupName = inputNode.value.trim();
                // If the input value is empty, just remove the input node again
                if (newGroupName.length === 0) {
                    inputNode.blur();
                    return;
                }
                // Check if a group with this name already exists
                if (treeView.rootNode.children.hasOwnProperty(newGroupName)) {
                    await dialogWindow.info(
                        `A group with the name '${newGroupName}' already ` +
                        `exists!`);
                    inputNode.blur();
                    return;
                }
                // Otherwise add the new group and remove the input node
                const node = treeView.buildNode({ name: newGroupName },
                                                treeView.rootNode);
                treeView.$("root").appendChild(node.domNode);
                inputNode.blur();
                treeView.callbacks.onModify();
            });
            treeView.$("root").appendChild(inputContainer);
            inputNode.focus();
        }
    },
    "add-subgroup": {
        label: "Add subgroup",
        click: ({ currentNode, data: { node, treeView } }) => {
            const inputContainer = document.createElement("div");
            inputContainer.classList.add("input-container");
            const inputNode = document.createElement("input");
            inputContainer.appendChild(inputNode);
            inputNode.placeholder = "Enter name";
            inputNode.classList.add("light");
            // Escape or focussing out cancels the action
            inputNode.addEventListener("focusout", () => {
                inputContainer.remove();
                if (node.childrenArray.length === 0) {
                    node.openButton.classList.add("hidden");
                }
            });
            inputNode.addEventListener("keydown", (event) => {
                if (event.key === "Escape") inputNode.blur();
            });
            // Process input when Enter key is pressed
            inputNode.addEventListener("keypress", async (event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                const newGroupName = inputNode.value.trim();
                // If the input value is empty, just remove the input node again
                if (newGroupName.length === 0) {
                    inputNode.blur();
                    return;
                }
                // Check if a sibling group with this name already exists
                if (node.children.hasOwnProperty(newGroupName)) {
                    await dialogWindow.info(
                        `A subgroup with the name '${newGroupName}' already ` +
                        `exists!`);
                    inputNode.blur();
                    return;
                }
                // Otherwise add the new subgroup and remove the input node
                const child = treeView.buildNode({ name: newGroupName }, node);
                node.childrenContainer.appendChild(child.domNode);
                // If this subgroup is the first, show it by opening the parent
                if (node.childrenArray.length === 1) {
                    node.domNode.classList.add("open");
                    node.open = true;
                }
                inputNode.blur();
                treeView.callbacks.onModify();
            });
            node.childrenContainer.show();
            node.openButton.classList.remove("hidden");
            node.childrenContainer.appendChild(inputContainer);
            inputNode.focus();
        }
    },
    "delete-group": {
        label: "Delete group",
        click: async ({ currentNode, data: { node, treeView } }) => {
            const confirmed = await dialogWindow.confirm(
                `Are you sure you want to delete the group '${node.name}' and` +
                ` all its contents and descendants?`);
            if (!confirmed) return;
            if (node.domNode.contains(treeView.selectedNode.domNode)) {
                treeView.deselect();
            }
            delete node.parent.children[node.name];
            node.parent.childrenArray.remove(node.name);
            node.domNode.remove();
            // If this subgroup was the only one, close the parent group
            if (node.parent.childrenArray.length === 0) {
                node.parent.domNode.classList.remove("open");
                node.parent.open = false;
                node.parent.openButton.classList.add("hidden");
            }
            treeView.callbacks.onModify();
        }
    },
    "rename-group": {
        label: "Rename group",
        click: ({ currentNode, data: { node } }) => {
            const oldGroupName = node.name;
            const nameNode = node.labelNode;
            nameNode.setAttribute("contenteditable", "");
            let cancelCallback;  // Forward declaration for renameCallback
            const renameCallback = async (event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                const newGroupName = nameNode.textContent.trim();
                // The group name may not be empty
                if (newGroupName.length === 0) {
                    await dialogWindow.info(`Group names can not be empty.`);
                    nameNode.focus();
                    return;
                }
                // Check if a sibling group with this name already exists
                if (node.parent.children.hasOwnProperty(newGroupName) &&
                        newGroupName !== oldGroupName) {
                    await dialogWindow.info(
                        `A subgroup with the name '${newGroupName}' already ` +
                        `exists!`);
                    nameNode.focus();
                    return;
                }
                // If the new name is valid, make the label non-editable again
                nameNode.removeEventListener("keypress", renameCallback);
                nameNode.removeEventListener("keydown", cancelCallback);
                nameNode.removeEventListener("focusout", cancelCallback);
                nameNode.removeAttribute("contenteditable");
                // Do nothing more if the group name didn't change
                if (newGroupName === oldGroupName) {
                    return;
                }
                // If the name changed, also change it in the internal tree data
                const childIndex = node.parent.childrenArray.indexOf(node.name);
                node.parent.childrenArray[childIndex] = newGroupName;
                node.parent.children[newGroupName] =
                    node.parent.children[oldGroupName];
                delete node.parent.children[oldGroupName];
                node.name = newGroupName;
                treeView.callbacks.onModify();
            };
            // Escape cancels renaming (keep old name)
            cancelCallback = (event) => {
                if (event.type === "keydown" && event.key !== "Escape") return;
                nameNode.removeEventListener("keypress", renameCallback);
                nameNode.removeEventListener("keydown", cancelCallback);
                nameNode.removeEventListener("focusout", cancelCallback);
                nameNode.removeAttribute("contenteditable");
                nameNode.textContent = oldGroupName;
            };
            nameNode.addEventListener("keypress", renameCallback);
            nameNode.addEventListener("keydown", cancelCallback);
            nameNode.addEventListener("focusout", cancelCallback);
            nameNode.focus();
        }
    }
});

customElements.define("tree-view", TreeView);
module.exports = TreeView;
