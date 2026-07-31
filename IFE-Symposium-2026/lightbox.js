/* Minimal dependency-free lightbox for the figure cards.
 *
 * Every `<a class="fig__mat" href="<image>">` on the page becomes a click-to-zoom
 * trigger.  The anchor still carries a real href, so with JavaScript disabled a
 * click simply opens the full-resolution image -- the page degrades cleanly
 * rather than losing the zoom entirely.
 *
 * The figures here are 2600 px wide scientific plots whose panel text is only
 * legible when enlarged, which is the whole reason this exists. */
(function () {
    "use strict";

    var overlay, image, lastFocus;

    function build() {
        overlay = document.createElement("div");
        overlay.className = "lightbox";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "Enlarged figure");

        image = document.createElement("img");
        image.alt = "";
        overlay.appendChild(image);

        var hint = document.createElement("p");
        hint.className = "lightbox__hint";
        hint.textContent = "click anywhere or press Esc to close";
        overlay.appendChild(hint);

        overlay.addEventListener("click", close);
        document.body.appendChild(overlay);
    }

    function open(href, alt) {
        if (!overlay) { build(); }
        lastFocus = document.activeElement;
        image.src = href;
        image.alt = alt || "";
        overlay.setAttribute("data-open", "1");
        document.body.style.overflow = "hidden";
        overlay.focus();
    }

    function close() {
        if (!overlay) { return; }
        overlay.removeAttribute("data-open");
        document.body.style.overflow = "";
        /* Drop the src so a large WebP is not held decoded in memory while the
           visitor scrolls on -- these are 2600 px images and a page can hold
           thirty of them. */
        image.src = "";
        if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    }

    function onKey(event) {
        if (event.key === "Escape") { close(); }
    }

    function wire() {
        var triggers = document.querySelectorAll("a.fig__mat[href]");
        Array.prototype.forEach.call(triggers, function (anchor) {
            anchor.addEventListener("click", function (event) {
                /* Leave modified clicks alone: cmd/ctrl-click and middle-click
                   should still open the image in a new tab. */
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
                    return;
                }
                event.preventDefault();
                var img = anchor.querySelector("img");
                open(anchor.getAttribute("href"), img ? img.alt : "");
            });
        });
        document.addEventListener("keydown", onKey);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", wire);
    } else {
        wire();
    }
}());
