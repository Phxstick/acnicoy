"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const arrowNext = document.getElementById("arrow-next");
    const arrowPrev = document.getElementById("arrow-prev");
    const pageWrapper = document.getElementById("screenshots");
    const screenshots = document.querySelectorAll(".screenshot");
    let description;
    const gallery = new Viewer(pageWrapper, {
        toolbar: false,
        rotatable: false,
        title: false,
        tooltip: false,
        transition: false,
        navbar: false,
        loop: false,
        viewed: (event) => {
            // Show image with original dimensions
            gallery.zoomTo(1);

            // Get the image and its wrapper, add arrows as children
            const viewerCanvas = document.querySelector(".viewer-canvas");
            const image = viewerCanvas.querySelector("img");
            const index = event.detail.index;

            // Calculate arrow positions (unresponsive design for now)
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const imageWidth = image.offsetWidth;
            const arrowWidth = parseInt(arrowNext.getAttribute("width"));
            const arrowHeight = parseInt(arrowNext.getAttribute("height"));
            const maxOffset = screenWidth - arrowWidth;
            const xOffset = Math.min(screenWidth / 2 + imageWidth / 2 + 10,
                                     screenWidth - arrowWidth);
            const yOffset = screenHeight / 2 - arrowHeight / 2;

            // Apply positioning and display arrows
            arrowPrev.style.right = `${xOffset}px`;
            arrowPrev.style.top = `${yOffset}px`;
            arrowPrev.style.display = "block";
            viewerCanvas.appendChild(arrowPrev);
            arrowNext.style.left = `${xOffset}px`;
            arrowNext.style.top = `${yOffset}px`;
            arrowNext.style.display = "block";
            viewerCanvas.appendChild(arrowNext);

            // Remove one arrow if the start/end has been reached
            if (index === 0) {
                viewerCanvas.removeChild(arrowPrev);
            }
            if (index === screenshots.length - 1) {
                viewerCanvas.removeChild(arrowNext);
            }

            // // Create the description
            // description = document.createElement("div");
            // description.classList.add("description");
            // description.innerHTML = screenshots[index].dataset.description;
            // // Position and display the description
            // const imageHeight = image.offsetHeight;
            // const yMargin = (screenHeight - imageHeight) / 2;
            // const xMargin = (screenWidth - imageWidth) / 2;
            // description.style.left = `${xMargin}px`;
            // description.style.right = `${xMargin}px`;
            // description.style.bottom = `${yMargin}px`;
            // viewerCanvas.appendChild(description);
        },
        hide: () => {
            if (arrowNext.offsetParent !== null) arrowNext.remove();
            if (arrowPrev.offsetParent !== null) arrowPrev.remove();
            descriptionWrapper.remove();
        }
    });
    arrowNext.addEventListener("click", () => gallery.next(true));
    arrowPrev.addEventListener("click", () => gallery.prev(true));
    
    for (let i = 0; i < screenshots.length; ++i) {
        const screenshot = screenshots[i];
        screenshot.addEventListener("click", () => {
            gallery.view(i);
        });
    }
});
