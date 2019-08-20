
// Don't focus links or buttons upon click (so that :focus css is not applied)
window.addEventListener("click", (event) => {
    console.log("yo")
    console.log(event.target);
    if (event.target.tagName === "A" || event.target.tagName === "BUTTON") {
        event.target.blur();
    }
});
