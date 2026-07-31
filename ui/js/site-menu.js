(function () {
    var themeStorageKey = "site-theme";
    var motionStorageKey = "site-motion";
    var mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    var navLinks = [
        { title: "Home", href: "/" },
        { title: "Computational Physics Portfolio", href: "/CPP-Numerical-Modeling/" },
        { title: "IFE Symposium 2026", href: "/IFE-Symposium-2026/" },
        { title: "CSE 450 — Machine Learning", href: "/CSE-450-Machine-learning/" },
        { title: "Visualizations", href: "/Visualizations/" },
        { title: "AI in Higher Education", href: "/AI-Ethics-and-Discussion/" }
    ];

    function getStoredTheme() {
        var value = localStorage.getItem(themeStorageKey);
        if (value === "light" || value === "dark" || value === "auto") {
            return value;
        }
        return "light";
    }

    function getStoredMotion() {
        var value = localStorage.getItem(motionStorageKey);
        if (value === "default" || value === "reduced") {
            return value;
        }
        return "default";
    }

    function normalizePath(pathname) {
        var path = pathname || "/";
        if (!path.endsWith("/")) {
            path += "/";
        }
        return path;
    }

    function getEffectiveTheme(themeChoice) {
        if (themeChoice === "light" || themeChoice === "dark") {
            return themeChoice;
        }
        return mediaQuery.matches ? "dark" : "light";
    }

    function applyTheme(themeChoice) {
        var effectiveTheme = getEffectiveTheme(themeChoice);
        document.documentElement.setAttribute("data-theme", effectiveTheme);
        document.documentElement.style.colorScheme = effectiveTheme;
    }

    function applyMotion(motionChoice) {
        var shouldReduce = motionChoice === "reduced";
        document.documentElement.classList.toggle("reduce-motion", shouldReduce);
    }

    function persistTheme(themeChoice) {
        localStorage.setItem(themeStorageKey, themeChoice);
    }

    function persistMotion(motionChoice) {
        localStorage.setItem(motionStorageKey, motionChoice);
    }

    function buildSelect(options, id, ariaLabel, selectedValue) {
        var select = document.createElement("select");
        select.id = id;
        select.setAttribute("aria-label", ariaLabel);

        options.forEach(function (item) {
            var option = document.createElement("option");
            option.value = item.value;
            option.textContent = item.text;
            if (item.value === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        return select;
    }

    function buildNavList() {
        var nav = document.createElement("nav");
        nav.className = "corner-menu-nav";
        nav.setAttribute("aria-label", "Site navigation");

        var currentPath = normalizePath(window.location.pathname);

        navLinks.forEach(function (item) {
            var link = document.createElement("a");
            var targetPath = normalizePath(item.href);
            link.href = item.href;
            link.textContent = item.title;
            if (currentPath === targetPath) {
                link.classList.add("is-active");
                link.setAttribute("aria-current", "page");
            }
            nav.appendChild(link);
        });

        return nav;
    }

    function buildMenu(themeChoice, motionChoice) {
        if (document.querySelector(".corner-menu")) {
            return;
        }

        var container = document.createElement("div");
        container.className = "corner-menu";
        container.setAttribute("data-pinned", "false");

        var toggleButton = document.createElement("button");
        toggleButton.className = "corner-menu-toggle";
        toggleButton.type = "button";
        toggleButton.setAttribute("aria-label", "Open site menu");
        toggleButton.setAttribute("aria-haspopup", "true");
        toggleButton.setAttribute("aria-expanded", "false");
        toggleButton.innerHTML = "<span>Menu</span><span aria-hidden=\"true\">&#9776;</span>";

        var panel = document.createElement("div");
        panel.className = "corner-menu-panel";

        var navSection = document.createElement("section");
        navSection.className = "corner-menu-section corner-menu-section--nav";

        var navTitle = document.createElement("p");
        navTitle.className = "corner-menu-title";
        navTitle.textContent = "Navigate";

        navSection.appendChild(navTitle);
        navSection.appendChild(buildNavList());

        var settingsSection = document.createElement("section");
        settingsSection.className = "corner-menu-section corner-menu-section--settings";

        var settingsTitle = document.createElement("p");
        settingsTitle.className = "corner-menu-title";
        settingsTitle.textContent = "Settings";

        var themeRow = document.createElement("div");
        themeRow.className = "corner-menu-row";

        var themeLabel = document.createElement("label");
        themeLabel.className = "corner-menu-label";
        themeLabel.setAttribute("for", "theme-select");
        themeLabel.textContent = "Theme";

        var themeSelect = buildSelect(
            [
                { value: "light", text: "Light" },
                { value: "dark", text: "Dark" },
                { value: "auto", text: "Auto" }
            ],
            "theme-select",
            "Choose theme",
            themeChoice
        );

        themeSelect.addEventListener("change", function () {
            var nextChoice = themeSelect.value;
            persistTheme(nextChoice);
            applyTheme(nextChoice);
        });

        themeRow.appendChild(themeLabel);
        themeRow.appendChild(themeSelect);

        var motionRow = document.createElement("div");
        motionRow.className = "corner-menu-row";

        var motionLabel = document.createElement("label");
        motionLabel.className = "corner-menu-label";
        motionLabel.setAttribute("for", "motion-select");
        motionLabel.textContent = "Motion";

        var motionSelect = buildSelect(
            [
                { value: "default", text: "Default" },
                { value: "reduced", text: "Reduced" }
            ],
            "motion-select",
            "Choose animation mode",
            motionChoice
        );

        motionSelect.addEventListener("change", function () {
            var nextChoice = motionSelect.value;
            persistMotion(nextChoice);
            applyMotion(nextChoice);
        });

        motionRow.appendChild(motionLabel);
        motionRow.appendChild(motionSelect);

        settingsSection.appendChild(settingsTitle);
        settingsSection.appendChild(themeRow);
        settingsSection.appendChild(motionRow);

        panel.appendChild(settingsSection);
        panel.appendChild(navSection);

        function isPinned() {
            return container.getAttribute("data-pinned") === "true";
        }

        function syncExpandedState() {
            var expanded = isPinned() || container.matches(":hover") || container.matches(":focus-within");
            toggleButton.setAttribute("aria-expanded", String(expanded));
        }

        function setPinned(nextPinned) {
            container.setAttribute("data-pinned", String(nextPinned));
            syncExpandedState();
        }

        toggleButton.addEventListener("click", function () {
            setPinned(!isPinned());
        });

        document.addEventListener("click", function (event) {
            if (!container.contains(event.target)) {
                setPinned(false);
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                setPinned(false);
            }
        });

        container.addEventListener("mouseenter", syncExpandedState);
        container.addEventListener("mouseleave", syncExpandedState);
        container.addEventListener("focusin", syncExpandedState);
        container.addEventListener("focusout", function (event) {
            var nextTarget = event.relatedTarget;
            if (nextTarget && container.contains(nextTarget)) {
                return;
            }
            syncExpandedState();
        });

        panel.addEventListener("click", function (event) {
            if (event.target && event.target.closest("a")) {
                setPinned(false);
            }
        });

        container.appendChild(toggleButton);
        container.appendChild(panel);
        document.body.appendChild(container);
        syncExpandedState();
    }

    function initializeMenu() {
        var themeChoice = getStoredTheme();
        var motionChoice = getStoredMotion();

        applyTheme(themeChoice);
        applyMotion(motionChoice);

        if (themeChoice === "auto") {
            mediaQuery.addEventListener("change", function () {
                applyTheme("auto");
            });
        }

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () {
                buildMenu(themeChoice, motionChoice);
            });
        } else {
            buildMenu(themeChoice, motionChoice);
        }
    }

    initializeMenu();
})();
