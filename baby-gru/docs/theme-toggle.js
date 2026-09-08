// Manual dark/light toggle for the generated API reference. Shares the same
// localStorage key as the docs site so the theme stays in sync when navigating
// between the guides and the API reference.
(function () {
    var STORAGE_KEY = "moorhen-docs-theme";
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        document.documentElement.setAttribute("data-theme", saved);
    }

    document.addEventListener("DOMContentLoaded", function () {
        var link = document.getElementById("theme-toggle");
        if (!link) return;
        link.addEventListener("click", function (event) {
            event.preventDefault();
            var isDark = document.documentElement.getAttribute("data-theme")
                ? document.documentElement.getAttribute("data-theme") === "dark"
                : window.matchMedia("(prefers-color-scheme: dark)").matches;
            var next = isDark ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem(STORAGE_KEY, next);
        });
    });
})();
