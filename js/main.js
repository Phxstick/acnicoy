
// Don't focus links or buttons upon click (so that :focus css is not applied)
window.addEventListener("click", (event) => {
    if (event.target.tagName === "A" || event.target.tagName === "BUTTON") {
        event.target.blur();
    }
});

// Shortcut for getting elements
window.$ = (id) => document.getElementById(id);
