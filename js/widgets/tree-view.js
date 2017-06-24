"use strict";

class TreeView extends Widget {
    constructor() {
        super("tree-view");
        this.onSelect = (path, children) => { };
        this.selectedNode = null;
        this.treeObject = { node: null, children: {}, childrenArray: [] };
    }

    build(structure) {
        for (const nodeInfo of structure) {
            this.$("root").appendChild(this.buildNode(nodeInfo, []));
        }
    }

    buildNode(nodeInfo, path) {
        const { name, children, open } = nodeInfo;
        const nodePath = [...path, name];
        const node = document.createElement("div");
        node.classList.add("node");

        let parentObject = this.treeObject;
        for (const nodeName of path) {
            parentObject = parentObject.children[nodeName];
        }
        parentObject.children[name] = { node, children: {}, childrenArray: [] };
        parentObject.childrenArray.push(name);

        const nameFrameNode = document.createElement("div");
        nameFrameNode.classList.add("node-name-frame");
        node.appendChild(nameFrameNode);

        const nameNode = document.createElement("span");
        nameNode.classList.add("node-name")
        nameNode.textContent = name;
        nameNode.addEventListener("click", (event) => {
            this.select(nodePath);
            event.stopPropagation();
        });
        nameFrameNode.appendChild(nameNode);

        const openNodeButton = document.createElement("button");
        openNodeButton.classList.add("open-node-button");
        nameFrameNode.prependChild(openNodeButton);

        if (children !== undefined && children.length > 0) {
            const childrenContainer = document.createElement("div");
            childrenContainer.classList.add("children-container");
            for (const childInfo of children) {
                childrenContainer.appendChild(
                    this.buildNode(childInfo, nodePath));
            }
            node.appendChild(childrenContainer);

            openNodeButton.addEventListener("click", () => {
                childrenContainer.toggleDisplay();
                node.classList.toggle("open");
            });
            childrenContainer.toggleDisplay(open === true);
            node.classList.toggle("open", open === true);
        }
        openNodeButton.classList.toggle(
            "hidden", children === undefined || children.length === 0);
        return node;
    }

    select(nodePath) {
        let nodeObject = this.treeObject;
        for (const nodeName of nodePath) {
            nodeObject = nodeObject.children[nodeName];
            if (nodeObject === undefined) {
                throw new Error(
                    `Path [${nodePath}] does not exist in the tree!`);
            }
        }
        const { node, childrenArray: children } = nodeObject;
        this.onSelect(nodePath, children);
        if (this.selectedNode !== null) {
            this.selectedNode.classList.remove("selected");
        }
        this.selectedNode = node;
        this.selectedNode.classList.add("selected");
    }
}

customElements.define("tree-view", TreeView);
module.exports = TreeView;
