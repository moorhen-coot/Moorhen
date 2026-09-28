// Manual dark/light toggle for the Moorhen docs site. No dependencies.
(function () {
    var STORAGE_KEY = "moorhen-docs-theme";
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        document.documentElement.setAttribute("data-theme", saved);
    }

    function isDark() {
        var current = document.documentElement.getAttribute("data-theme");
        if (current) return current === "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    function updateLabel(btn) {
        btn.textContent = isDark() ? "\u2600 Light mode" : "\u{1F319} Dark mode";
    }

    document.addEventListener("DOMContentLoaded", function () {
        var btn = document.getElementById("theme-toggle");
        if (!btn) return;
        updateLabel(btn);
        btn.addEventListener("click", function () {
            var next = isDark() ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem(STORAGE_KEY, next);
            updateLabel(btn);
        });
    });
})();
