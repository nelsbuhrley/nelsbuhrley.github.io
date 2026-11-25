document.querySelectorAll(".oe-legend").forEach(function (legend) {
    var svg = document.getElementById(legend.dataset.for);
    if (!svg) return;
    var fills = {};
    svg.querySelectorAll(".oe-cell").forEach(function (cell) {
        fills[cell.dataset.c] = cell.querySelector("rect").getAttribute("fill");
    });

    function highlight(color) {
        if (color) svg.dataset.hl = color; else delete svg.dataset.hl;
        svg.querySelectorAll(".oe-cell").forEach(function (cell) {
            cell.classList.toggle("is-hl", cell.dataset.c === color);
        });
        legend.querySelectorAll("button").forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.dataset.c === color));
        });
    }

    var hint = document.createElement("p");
    hint.className = "oe-legend__hint";
    hint.textContent = "Pick a color to see where it sits; each one touches all the others.";
    legend.appendChild(hint);

    var n = Number(svg.dataset.colors);
    for (var i = 1; i <= n; i++) {
        var b = document.createElement("button");
        b.type = "button";
        b.dataset.c = String(i);
        b.textContent = String(i);
        b.style.background = fills[i];
        b.setAttribute("aria-pressed", "false");
        b.setAttribute("aria-label", "Highlight color " + i);
        b.addEventListener("click", function () {
            highlight(svg.dataset.hl === this.dataset.c ? null : this.dataset.c);
        });
        legend.appendChild(b);
    }
});
