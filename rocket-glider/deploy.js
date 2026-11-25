(function () {
    var viewer = document.querySelector(".rg-viewer");
    if (!viewer || !window.requestAnimationFrame) return;

    var stage = viewer.querySelector(".rg-viewer__stage");
    var folded = document.getElementById("pose-folded");
    var deployed = document.getElementById("pose-deployed");
    var controls = viewer.querySelector(".rg-viewer__controls");
    var DURATION = 1050;
    var COUNT = 30;

    var frames = null;
    var loading = false;
    var canvas, ctx;
    var u = deployed.checked ? 1 : 0;
    var dir = 0;
    var last = 0;
    var raf = 0;

    function src(i) {
        if (i === 0) return stage.querySelector(".is-folded").currentSrc;
        if (i === COUNT - 1) return stage.querySelector(".is-deployed").currentSrc;
        return "img/deploy/f" + (i < 10 ? "0" : "") + i + ".webp";
    }

    function reducedMotion() {
        return document.documentElement.classList.contains("reduce-motion") ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function ease(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function draw() {
        var i = Math.round(ease(u) * (COUNT - 1));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frames[i], 0, 0, canvas.width, canvas.height);
    }

    function tick(now) {
        var dt = now - last;
        last = now;
        u = Math.min(1, Math.max(0, u + dir * dt / DURATION));
        draw();
        if ((dir > 0 && u >= 1) || (dir < 0 && u <= 0)) {
            dir = 0;
            raf = 0;
            viewer.classList.remove("is-animating");
            return;
        }
        raf = requestAnimationFrame(tick);
    }

    function onChange() {
        if (!frames) return;
        var target = deployed.checked ? 1 : 0;
        if (reducedMotion()) {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            dir = 0;
            u = target;
            viewer.classList.remove("is-animating");
            return;
        }
        if (u === target && !raf) return;
        dir = target ? 1 : -1;
        if (!raf) {
            draw();
            viewer.classList.add("is-animating");
            last = performance.now();
            raf = requestAnimationFrame(tick);
        }
    }

    function preload() {
        if (loading) return;
        loading = true;
        var list = [];
        for (var i = 0; i < COUNT; i++) {
            var img = new Image();
            img.decoding = "async";
            img.src = src(i);
            list.push(img.decode ? img.decode().then(null, function () {}) : null);
            list[i] = { img: img, p: list[i] };
        }
        Promise.all(list.map(function (x) { return x.p; })).then(function () {
            if (!list.every(function (x) { return x.img.complete && x.img.naturalWidth; })) return;
            frames = list.map(function (x) { return x.img; });
            canvas = document.createElement("canvas");
            canvas.width = 1400;
            canvas.height = 868;
            canvas.setAttribute("aria-hidden", "true");
            canvas.className = "rg-viewer__canvas";
            ctx = canvas.getContext("2d");
            stage.appendChild(canvas);
            u = deployed.checked ? 1 : 0;
            viewer.classList.add("rg-js");
        });
    }

    folded.addEventListener("change", onChange);
    deployed.addEventListener("change", onChange);
    controls.addEventListener("pointerenter", preload);
    controls.addEventListener("pointerdown", preload);
    controls.addEventListener("focusin", preload);
    folded.addEventListener("focus", preload);
    deployed.addEventListener("focus", preload);
})();
