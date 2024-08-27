export function inici_pagines_amb_animacio() {
    const pages = document.querySelectorAll(".pagina");
    const fondos = document.querySelectorAll(".fondo");

    const miniBookImages = document.querySelectorAll(".mini-book img");
    const llibre = document.querySelector(".llibre");
    const scrollLeftButton = document.getElementById("scroll-left");
    const scrollRightButton = document.getElementById("scroll-right");
    const scrollTopButton = document.getElementById("bt-scroll-top"); // Added scroll-top button

    let currentPageIndex = 0; // Track the current page index

    // For swipe detection
    let touchStartX = 0; // Touch start X coordinate
    let touchStartY = 0; // Touch start Y coordinate

    // Function to update the height of the llibre container based on the current page
    function updateLlibreHeight() {
        const currentPage = pages[currentPageIndex];
        const newHeight = currentPage.offsetHeight;
        llibre.style.minHeight = `${newHeight}px`;
    }

    // Function to update page visibility based on the current index
    function updatePageVisibility() {
        pages.forEach((page, index) => {
            if (index === currentPageIndex) {
                page.classList.add("visible");
            } else {
                page.classList.remove("visible");
            }
        });
        fondos.forEach((fondo, index) => {
            if (index === currentPageIndex) {
                fondo.classList.add("visible");
            } else {
                fondo.classList.remove("visible");
            }
        });

        // Update the height of the llibre to match the current page
        updateLlibreHeight();
    }

    // Function to update the mini-book images based on the current page index
    function updateMiniBookImages() {
        miniBookImages.forEach((img, index) => {
            if (index < currentPageIndex) {
                img.style.transform = `rotateY(-140deg) translateZ(-${
                    index * 5
                }px)`;
                img.style.opacity = "0";
                img.style.transition = `transform 1s ease, opacity 0s ease 3s`;
            } else {
                img.style.transform = `rotateY(${0}deg) translateZ(-${
                    index * 5
                }px)`;
                img.style.opacity = "1";
                img.style.transition = `transform 1s ease, opacity 0s ease`;
            }
            img.style.zIndex = `${10 - index}`;
        });
    }

    // Function to scroll the body to the top
    function scrollToTop() {
        document.body.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Function to handle navigation by direction
    function scrollByDirection(direction) {
        const maxPageIndex = pages.length - 1;
        const slideInvite = document.getElementById("slide-invite");
        slideInvite.style.animationPlayState = "paused";
        slideInvite.style.opacity = "0";

        if (direction === "left" && currentPageIndex > 0) {
            currentPageIndex--;
        } else if (direction === "right" && currentPageIndex < maxPageIndex) {
            currentPageIndex++;
        } else if (currentPageIndex == maxPageIndex) currentPageIndex = 0;

        // Scroll to the top before updating page visibility
        scrollToTop();
        // Update the visibility of pages
        updatePageVisibility();
        // Update the mini-book images
        updateMiniBookImages();
    }

    // Scroll left (previous page)
    function scrollLeft() {
        scrollByDirection("left");
    }

    // Scroll right (next page)
    function scrollRight() {
        scrollByDirection("right");
    }

    // Handle swipe events
    function handleTouchStart(event) {
        const touch = event.touches[0];
        touchStartX = touch.clientX; // Capture touch start X coordinate
        touchStartY = touch.clientY; // Capture touch start Y coordinate
    }

    function handleTouchEnd(event) {
        const touch = event.changedTouches[0];
        const touchEndX = touch.clientX; // Capture touch end X coordinate
        const touchEndY = touch.clientY; // Capture touch end Y coordinate
        const swipeDistanceX = touchEndX - touchStartX;
        const swipeDistanceY = touchEndY - touchStartY;
        const absSwipeDistanceX = Math.abs(swipeDistanceX);
        const absSwipeDistanceY = Math.abs(swipeDistanceY);

        // Determine if the swipe is predominantly horizontal or vertical
        if (absSwipeDistanceX > 20 && absSwipeDistanceX > absSwipeDistanceY) {
            if (swipeDistanceX > 0) {
                // Swipe left
                scrollLeft();
            } else {
                // Swipe right
                scrollRight();
            }
        }
    }

    // Attach event listeners to the scroll buttons
    if (scrollLeftButton) {
        scrollLeftButton.addEventListener("click", scrollLeft);
    }

    if (scrollRightButton) {
        scrollRightButton.addEventListener("click", scrollRight);
    }

    // Attach event listener to the scroll-to-top button
    if (scrollTopButton) {
        scrollTopButton.addEventListener("click", scrollToTop);
    }

    // Function to handle scroll event and show/hide the scroll-to-top button
    function handleScroll() {
        if (scrollTopButton) {
            // Check if the user has scrolled down by 100 pixels
            if (
                document.body.scrollTop > 100 ||
                document.documentElement.scrollTop > 100
            ) {
                scrollTopButton.classList.add("appear");
            } else {
                scrollTopButton.classList.remove("appear");
            }
        }
    }

    // Attach the scroll event listener
    document.body.addEventListener("scroll", handleScroll);

    // Attach event listeners for touch events
    header.addEventListener("touchstart", handleTouchStart, {
        passive: true,
    });
    header.addEventListener("touchend", handleTouchEnd, { passive: true });

    // Initialize by showing the first page, updating mini-book images, and adjusting the height
    updatePageVisibility();
    updateMiniBookImages();
    updateLlibreHeight(); // Ensure the initial height is set correctly

    // Check if the device is touch-enabled
    if (!("ontouchstart" in window)) {
        document.addEventListener("mousemove", (event) => {
            const miniBook = document.querySelector(".mini-book");
            const rect = miniBook.getBoundingClientRect();

            // Get the center of the mini-book
            const miniBookCenterX = rect.left + rect.width / 2;
            const miniBookCenterY = rect.top + rect.height / 2;

            // Calculate the distance from the mouse to the center of the mini-book
            const deltaX = event.clientX - miniBookCenterX;
            const deltaY = event.clientY - miniBookCenterY;

            // Map these distances to rotations with sensitivity adjustment
            let rotateY = (deltaX / rect.width) * 20;
            let rotateX = (-deltaY / rect.height) * 20;

            // Limit the rotations to a maximum of 45 degrees
            rotateY = Math.max(-45, Math.min(45, rotateY));
            rotateX = Math.max(-45, Math.min(45, rotateX));

            // Apply the rotation
            miniBook.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });
    }
}
