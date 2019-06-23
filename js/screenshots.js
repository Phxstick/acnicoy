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

            // Get the image and its wrapper
            const viewerCanvas = document.querySelector(".viewer-canvas");
            const image = viewerCanvas.querySelector("img");

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
            const index = event.detail.index;
            if (index === 0) {
                viewerCanvas.removeChild(arrowPrev);
            }
            if (index === screenshots.length - 1) {
                viewerCanvas.removeChild(arrowNext);
            }

            // Create the description
            description = document.createElement("div");
            description.classList.add("description");
            description.innerHTML = screenshots[index].dataset.description;

            // Position and display the description
            const imageHeight = image.offsetHeight;
            const availableMarginX = (screenWidth - imageWidth) / 2;
            description.style.left = `${availableMarginX}px`;
            description.style.right = `${availableMarginX}px`;
            viewerCanvas.appendChild(description);

            // Move the image and description up so that everything is centered
            const descriptionHeight = description.offsetHeight;
            const availableMarginY = (screenHeight - imageHeight) / 2;
            let moveOffsetY = Math.min(availableMarginY, descriptionHeight / 2);
            if (moveOffsetY < descriptionHeight / 2) {
                // If there's not enough space, at least make sure that the
                // description is fully visible by moving the image further up
                moveOffsetY = descriptionHeight - availableMarginY;
            }
            const descOffsetTop = imageHeight + availableMarginY;
            description.style.top = `${descOffsetTop - moveOffsetY}px`;
            gallery.move(0, -moveOffsetY);
        },
        hide: () => {
            // Hide the arrows when the gallery is closed
            if (arrowNext.offsetParent !== null) arrowNext.remove();
            if (arrowPrev.offsetParent !== null) arrowPrev.remove();
        }
    });
    arrowNext.addEventListener("click", () => gallery.next(true));
    arrowPrev.addEventListener("click", () => gallery.prev(true));
    
    // Open the image viewer upon clicking one of the screenshot thumbnails
    for (let i = 0; i < screenshots.length; ++i) {
        const screenshot = screenshots[i];
        screenshot.addEventListener("click", () => {
            gallery.view(i);
        });
    }
});
