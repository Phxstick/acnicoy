"use strict";

class TabbedFrame extends Widget {
    constructor() {
        super("tabbed-frame", true);
        this.selectedTabName = null;
        this.nameToTab = new Map();
        this.nameToPanel = new Map();
        for (const tabNode of this.$("tabs-slot").assignedNodes()) {
            const tabName = tabNode.dataset.tabName;
            if (tabNode.getAttribute("selected") !== null) {
                this.selectedTabName = tabName;
            }
            this.nameToTab.set(tabName, tabNode);
            // Open corresponding panel when clicking a tab
            tabNode.addEventListener("click", () => {
                if (this.selectedTabName !== null) {
                    const currentTab = this.nameToTab.get(this.selectedTabName);
                    currentTab.removeAttribute("selected");
                    this.nameToPanel.get(this.selectedTabName).hide();
                    tabNode.setAttribute("selected", "");
                }
                const container = this.nameToPanel.get(tabNode.dataset.tabName);
                container.show(container.dataset.displayType);
                this.selectedTabName = tabNode.dataset.tabName;
            });
        }
        for (const panelNode of this.$("panels-slot").assignedNodes()) {
            const tabName = panelNode.dataset.tabName;
            this.nameToPanel.set(tabName, panelNode);
            if (tabName !== this.selectedTabName) {
                panelNode.hide();
            }
        }
        // TODO Make sure adding new tabs dynamically works
        // this.$("tabs-slot").addEventListener("slotchange", (event) => {
        //     console.log("Tabs slot changed. Event object: ", event);
        // });
        // this.$("panels-slot").addEventListener("slotchange", (event) => {
        //     console.log("Panels slot changed. Event object: ", event);
        // });
    }
}

customElements.define("tabbed-frame", TabbedFrame);
module.exports = TabbedFrame;
