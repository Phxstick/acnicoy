In Acnicoy, each language can use a different SRS scheme. You can switch a language to another scheme by opening the language settings and clicking on the name of the currently assigned scheme in the corresponding table row.
Switching SRS schemes for a language requires a migration of its vocabulary items to the new scheme. Each level in the old scheme must be mapped to at least one level in the new one.

After selecting a new scheme in the dropdown-menu, it will be displayed below on the right side, with the old scheme on the left side. If a level in the old scheme has associated vocabulary items, a connector (gray half-circle) will appear next to it. Click & drag this connector and drop it on the connector of the level in the new scheme that you want to move the items to.

Each connection contains a modifier circle in the middle that can be used to adjust the dates that the items are scheduled for review. Clicking this modifier toggles the symbol within, which specifies the adjustment made to the review times:

- Equals sign ("="): the review dates are not modified.
- Plus sign ("+"): the review dates are *postponed* to fit the intervals in the levels of the new scheme.
- Minus sign ("-"): the review dates are *brought forward* to fit the intervals in the new scheme.
- Tilde sign ("∼"): conditional version of the "-" modifier. The review dates are brought forward, but only for items which have been on schedule for less than the time specified by the new intervals.

The last modifier might sound confusing, but basically, it's to prevent a bunch of items coming at you all at once when moved from a large interval to a small one. E.g. when moving items from "1 year" to "4 months" with the modifier "-", items which have already been on schedule for more than 4 months would all become available for review immediately. Using the "∼" modifier, these items will remain on schedule until 1 year has passed, just like in the old scheme.
