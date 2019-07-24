
/**
 * Turns given node into data view that displays provided data. The data can be
 * loaded dynamically, and can be parameterized to implement search functions.
 * The view will mangage the displayed data by only displaying parts and loading
 * more batches if the user scrolls down close to the bottom.
 *
 * === Main arguments defining view ===
 * @param {Function} createViewItem - Function which takes a data item as
 *     argument and returns an HTMLElement to be inserted into the view.
 * @param {Function|Array} [getData] - Array/list of data or function returning
 *     one. May be asynchronous. Receives arguments passed to the load function.
 *     If not provided, first argument passed to load function is used as data.
 *
 * === DOM elements ===
 * @param {HTMLElement} viewElement - Container which will display the data.
 * @param {HTMLElement} [scrollElement] - Node which will become scrollable to
 *     acommodate the view items. Defaults to the viewElement.
 * @param {HTMLElement} [placeholder] - Node to be displayed if an empty string
 *     has been passed to the load function.
 * @param {HTMLElement} [noDataPane] - Element to be displayed if an empty list
 *     has been returned by the load function.
 *
 * === Settings ===
 * @param {Integer} [initialDisplayAmount=10] - Amount of items to display
 *     initially after loading data.
 * @param {Integer} [displayAmount=10] - Amount of items to be displayed upon
 *     scrolling almost to the bottom of the view.
 * @param {Boolean} [deterministic=true] - If set to true, passing the same
 *     arguments to the load-function as previously will not trigger any change
 *     (loaded data is expected to be completely determined by the arguments).
 * @param {Boolean} [scrollOffsetThreshold=150] - Distance from the bottom of
 *     the container to the bottom of the viewPort (in number of pixels) which
 *     determines when the view is considered sufficiently filled.
 * @param {Boolean} [loadOnScroll=true] - Whether to automatically load more
 *     items when the user scrolls past the specified threshold offset.
 * @param {Boolean} [loadOnResize=true] - Whether to automatically load more
 *     items when the window has been resized (use for stretching elements).
 */

class View {
    constructor({ viewElement, scrollElement, placeholder, noDataPane, getData,
                  createViewItem, initialDisplayAmount=10, displayAmount=10,
                  deterministic=true, scrollOffsetThreshold=150,
                  loadOnScroll=true, loadOnResize=false }={}) {

        // DOM nodes (scrollElement, placeholder and noDataPane are optional)
        this.viewNode = viewElement;
        this.scrollElement = scrollElement !== undefined ? scrollElement :
                                                           viewElement;
        this.placeholder = placeholder;
        this.noDataPane = noDataPane;

        // Main callbacks defining data and items
        this.getData = getData === undefined ? (firstLoadArg) => firstLoadArg :
            (typeof getData === "function" ? getData : () => getData); 
        this.createViewItem = createViewItem;

        // Settings
        this.initialDisplayAmount = initialDisplayAmount;
        this.displayAmount = displayAmount;
        this.deterministic = deterministic;
        this.scrollOffsetThreshold = scrollOffsetThreshold;

        // State variables
        this.lastQuery = null;
        this.lastArgs = null;
        this.data = null;
        this.nextDataIndex = null;  // Is listitem/null in case of linked lists
        this.linkedListMode = false;
        this.dataLoaded = false;
        this.viewLoaded = true;
        this.currentDataId = 0;

        // If user scrolls almost to bottom of view, load more items
        if (loadOnScroll) {
            this.scrollElement.uponScrollingBelow(scrollOffsetThreshold, () => {
                this.displayBatch();
            });
        }

        // Fill up view as much as needed if window gets resized
        if (loadOnResize) {
            const resizeHandler = () => this.fillSufficiently();
            let resizeHandlerId = null;
            window.addEventListener("resize", () => {
                if (resizeHandlerId !== null) clearTimeout(resizeHandlerId);
                resizeHandlerId = window.setTimeout(resizeHandler, 800);
            });
        }
    }

    async displayBatch() {
        // Prevent multiple async calls running simultaneously on the same data
        if (!this.dataLoaded || !this.viewLoaded) return false;
        this.viewLoaded = false;

        // Do nothing if there are no more items to be displayed
        const lastIndex = this.linkedListMode ? null : this.data.length;
        if (this.nextDataIndex === lastIndex) return false;

        // Determine amount of items to be displayed
        const firstIndex = this.linkedListMode ? this.data.head : 0;
        const amount = this.nextDataIndex === firstIndex ?
            this.initialDisplayAmount : this.displayAmount;

        // Prepare to generate view items
        const viewItemPromises = [];
        let nextDataIndex;
        if (!this.linkedListMode) {
            const limit = Math.min(this.nextDataIndex+amount, this.data.length);
            for (let i = this.nextDataIndex; i < limit; ++i) {
                viewItemPromises.push(this.createViewItem(this.data[i]));
            }
            nextDataIndex = limit;
        } else {
            let counter = 0;
            let nextItem = this.nextDataIndex;
            while (counter < amount && nextItem !== null) {
                viewItemPromises.push(this.createViewItem(nextItem));
                nextItem = nextItem.next;
                ++counter;
            }
            nextDataIndex = nextItem;
        }

        // Generate view items and check if data hasn't changed in the meantime
        const dataId = this.currentDataId;  // Get local copy before async part
        const viewItems = await Promise.all(viewItemPromises);
        if (this.currentDataId !== dataId) return false;
        this.nextDataIndex = nextDataIndex;

        // Efficiently insert new batch of items into the view element
        const fragment = document.createDocumentFragment();
        for (const viewItem of viewItems) fragment.appendChild(viewItem);
        this.viewNode.appendChild(fragment);

        this.viewLoaded = true;
        return true;
    }

    // Displays more batches until view filled up to threshold or no more data
    async fillSufficiently() {
        if (!this.dataLoaded || !this.viewLoaded) return;
        while (!this.viewNode.isHidden()) {  // Can't get dimensions if hidden
            const distanceToBottom = this.scrollElement.scrollHeight -
                this.scrollElement.clientHeight - this.scrollElement.scrollTop;
            if (distanceToBottom > this.scrollOffsetThreshold) break;
            const successful = await this.displayBatch();
            if (!successful) break;
        }
    }

    async load(query, ...args) {
        // If query is empty, only display placeholder (if given)
        if (this.placeholder !== undefined && query.length === 0) {
            this.placeholder.show();
            this.viewNode.hide();
            if (this.noDataPane !== undefined)
                this.noDataPane.hide();
            return;
        }

        // If deterministic-flag is enabled and query is repeated, do nothing
        if (this.deterministic && query !== undefined && query.length > 0
                && query === this.lastQuery && args.equals(this.lastArgs)) {
            return;
        }

        // Set initial state
        this.lastQuery = query;
        this.lastArgs = args;
        this.dataLoaded = false;
        this.viewLoaded = true;
        this.currentDataId++;
        const dataId = this.currentDataId;

        // Get data and update state 
        const data = await this.getData(query, ...args);
        if (this.currentDataId !== dataId) return;  // Data changed in meantime?
        this.data = data;
        this.linkedListMode = !Array.isArray(this.data);
        this.nextDataIndex = this.linkedListMode ? this.data.head : 0;
        this.dataLoaded = true;

        // Display items until view is filled sufficiently or no more data left
        this.viewNode.empty();
        if (this.loadOnScroll) this.scrollElement.scrollToTop();
        await this.displayBatch();  // Display first batch even if hidden
        if (this.currentDataId !== dataId) return;
        await this.fillSufficiently();  // If view is visible, fill it up
        if (this.currentDataId !== dataId) return;

        // Adjust DOM elements
        if (this.placeholder !== undefined) {
            this.placeholder.hide();
        }
        if (this.noDataPane !== undefined) {
            const dataNotEmpty = this.linkedListMode ? this.data.size > 0 :
                                                       this.data.length > 0;
            this.viewNode.toggleDisplay(dataNotEmpty);
            this.noDataPane.toggleDisplay(!dataNotEmpty);
        }

        return this.data;
    }
}

module.exports = View;
