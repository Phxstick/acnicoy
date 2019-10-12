"use strict";

const fs = require("fs");
const marked = require("marked");

class HelpOverlay extends Overlay {
    constructor() {
        super("help");
        this.$("close-button").addEventListener("click", () => {
            this.resolve();
        });
        this.initializationFinished = false;
        this.$("tree").build(require(paths.helpStructure));
        this.loadedTreePath = [];
        this.$("tree").setOnSelect((node) => {
            let treePath = this.$("tree").getPath(node);
            const treeSubpath = treePath.slice(0, -1);
            const helpSubdirPath = paths.helpSubdir(treePath);
            const helpSectionPath = paths.helpSection(treePath);
            const helpSectionSubpath = paths.helpSection(treeSubpath);
            this.$("content").classList.remove("no-data");
            let newSectionLoaded = false;
            // If there's a markdown file for given path, render it to html
            if (fs.existsSync(helpSectionPath)) {
                if (!this.loadedTreePath.equals(treePath)) {
                    this.$("content").innerHTML =
                        marked(fs.readFileSync(helpSectionPath, "utf8"));
                    this.loadedTreePath = treePath;
                    newSectionLoaded = true;
                }
                this.$("content").scrollToTop();
            // If there's no markdown file for given path but a subdirectory of
            // the help tree, display a listing of its children
            } else if (fs.existsSync(helpSubdirPath)) {
                if (!this.loadedTreePath.equals(treePath)) {
                    let html = `<h2>${treePath.last()}</h2><ul class="large">`;
                    for (const childName of node.childrenArray) {
                        const lPath = 
                            "help#" + [...treePath, childName].join("#");
                        html += `<li><a href="${lPath}">${childName}</a></li>`;
                    }
                    html += "</ul>"
                    this.$("content").innerHTML = html;
                    this.loadedTreePath = treePath;
                    newSectionLoaded = true;
                }
                this.$("content").scrollToTop();
            // If there's no markdown file for given path, but for its subpath
            // with length - 1, render that file and scroll the header into view
            // whose textContent is equal to the last element in the path
            } else if (fs.existsSync(helpSectionSubpath)) {
                if (!this.loadedTreePath.equals(treeSubpath)) {
                    this.$("content").innerHTML =
                        marked(fs.readFileSync(helpSectionSubpath, "utf8"));
                    this.loadedTreePath = treeSubpath;
                    newSectionLoaded = true;
                }
                const headerName = treePath.last();
                const headers = this.$("content").querySelectorAll("h3");
                for (const header of headers) {
                    if (header.textContent === headerName) {
                        utility.finishEventQueue().then(() => {
                            header.scrollIntoView();
                            this.$("content").scrollTop -= 20;
                        });
                        break;
                    }
                }
                treePath = treeSubpath;
            // If neither of the above cases applied, there's no data available
            } else {
                this.$("content").classList.add("no-data");
                this.$("content").innerHTML = `<div>No help data found.</div>`;
                this.loadedTreePath = [];
            }
            // Display the path of the currently opened help section
            // and allow clicking segments of the path to jump there
            this.$("content-path").empty();
            for (let i = 1; i <= treePath.length; ++i) {
                const subPath = treePath.slice(0, i);
                const linkNode = document.createElement("button");
                linkNode.classList.add("link");
                linkNode.textContent = subPath.last();
                linkNode.addEventListener("click", () => {
                    this.$("tree").selectByPath(subPath);
                });
                this.$("content-path").appendChild(linkNode);
                if (i !== treePath.length) {
                    const separator = document.createElement("span");
                    separator.classList.add("separator");
                    this.$("content-path").appendChild(separator);
                }
            }
            // Convert <a> elements whose href-attribute value starts with a
            // certain sequence.
            if (newSectionLoaded) {
                const links = this.$("content").querySelectorAll("a");
                for (const link of links) {
                    const linkPath = link.getAttribute("href").split("#");
                    // 'help#' -> local link pointing to other help sections.
                    if (linkPath[0] === "help") {
                        link.addEventListener("click", () => {
                            this.$("tree").selectByPath(
                                linkPath.splice(1).map(
                                    (label) => label.replace("_", " ")));
                        });
                        link.removeAttribute("href");
                    // 'tour#' -> button to start an introduction tour
                    } else if (linkPath[0] === "tour") {
                        const button = document.createElement("button");
                        button.textContent = link.textContent;
                        button.classList.add("simple", "link");
                        button.addEventListener("click", () => {
                            main.startIntroTour(linkPath[1]);
                            overlays.closeTopmost();
                        });
                        link.parentNode.insertBefore(button, link);
                        link.parentNode.removeChild(link);
                        link.remove();
                        // Make sure that tour is not accessible before main
                        // window has loaded
                        button.toggleDisplay(this.initializationFinished);
                    }
                }
            }
        });
        this.$("tree").selectByPath(["Overview"]);
        // Can use any event here, as long as it's not fired before init is done
        events.once("settings-loaded", ()=>{ this.initializationFinished=true })
    }

    open(path) {
        if (path !== undefined) {
            this.$("tree").selectByPath(path);
        }
    }
}

customElements.define("help-overlay", HelpOverlay);
module.exports = HelpOverlay;
