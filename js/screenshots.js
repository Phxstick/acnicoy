"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const arrowNext = document.getElementById("arrow-next");
    const arrowPrev = document.getElementById("arrow-prev");
    const pageWrapper = document.getElementById("screenshots");
    const screenshots = document.querySelectorAll(".screenshot");
    const navbarHeight = document.getElementById("nav-bar").offsetHeight;
    const gallery = new Viewer(pageWrapper, {
        toolbar: false,
        rotatable: false,
        zoomable: false,
        movable: false,
        title: false,
        tooltip: false,
        transition: false,
        navbar: false,
        loop: false,
        viewed: (event) => {
            // Get the image and its wrapper
            const viewerCanvas = document.querySelector(".viewer-canvas");
            const viewerContainer = viewerCanvas.parentNode;
            const image = viewerCanvas.querySelector("img");

            // Get dimensions of screen and image and calculate margin inbetween
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const imageWidth = image.offsetWidth;
            const imageHeight = image.offsetHeight;
            const availableMarginX = (screenWidth - imageWidth) / 2;
            let availableMarginY = (screenHeight - imageHeight) / 2;

            // ================================================================
            //   Arrows for cycling between screenshots in the gallery
            // ================================================================

            // Calculate arrow positions (unresponsive design for now)
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

            // ================================================================
            //   Description of screenshot
            // ================================================================

            // Create description element
            const description = document.createElement("div");
            description.classList.add("description");
            description.innerHTML = screenshots[index].dataset.description;

            // Position the description horizontally and display it
            description.style.left = `${availableMarginX}px`;
            description.style.right = `${availableMarginX}px`;
            viewerCanvas.appendChild(description);

            // Move the image and description up so that everything is centered
            const descriptionHeight = description.offsetHeight;
            let moveOffsetY = Math.min(availableMarginY, descriptionHeight / 2);
            if (moveOffsetY < descriptionHeight / 2) {
                // If there's not enough space, at least make sure that the
                // description is fully visible by moving the image further up
                moveOffsetY = descriptionHeight - availableMarginY;
            }
            const descOffsetTop = imageHeight + availableMarginY;
            description.style.top = `${descOffsetTop - moveOffsetY}px`;
            let imageOffsetY = -moveOffsetY;

            // ================================================================
            //   Title of screenshot
            // ================================================================

            // Remove last linebreak from title if given (to compress text)
            let titleText = screenshots[index].dataset.title;
            const lastBreakPos = titleText.lastIndexOf("<br>");
            if (lastBreakPos > 0) titleText = titleText.slice(0, lastBreakPos)
                + " " + titleText.slice(lastBreakPos + 4);

            // Create title element
            const title = document.createElement("div");
            title.classList.add("title");
            title.innerHTML = titleText;

            // Position the title horizontally and display it
            title.style.left = `${availableMarginX}px`;
            title.style.right = `${availableMarginX}px`;
            viewerCanvas.appendChild(title);

            // Calculate Y-position of title and offset of image and description
            availableMarginY -= descriptionHeight / 2;
            const titleHeight = title.offsetHeight;
            const navbarVisHeight = Math.max(0, navbarHeight - window.scrollY);
            // If there's enough space, center between navbar and screen bottom
            if (availableMarginY - titleHeight / 2 >= 0) {
                moveOffsetY = titleHeight / 2 + navbarVisHeight / 2;
                // Extend background gradient of the title up to the navbar
                title.style.paddingTop = `${availableMarginY - moveOffsetY+1}px`
            // If the title doesn't fit in completely, align to bottom of screen
            } else {
                moveOffsetY = availableMarginY;
            }
            // Set position of title and move image and description
            if (availableMarginY > 0) {
                const titleOffsetBottom =
                    imageHeight + availableMarginY + descriptionHeight;
                title.style.bottom = `${titleOffsetBottom - moveOffsetY}px`;
                imageOffsetY += moveOffsetY;
                description.style.top =
                    `${description.offsetTop + moveOffsetY + 1}px`;

                // If the description is close to bottom, extend BG all way down
                if (availableMarginY - titleHeight / 2 < 80) {
                    description.style.bottom = "0";
                }
            } else {
                title.remove();
            }
            image.style.transform=`translate(0, ${Math.floor(imageOffsetY)}px)`;
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
