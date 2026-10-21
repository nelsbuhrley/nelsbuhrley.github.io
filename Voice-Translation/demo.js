(function () {
    "use strict";

    var PLACEHOLDER = "Recording coming soon";
    var ICON_PLAY = "<svg viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\"><path class=\"i-play\" d=\"M4 2.2v11.6L13.4 8z\"/><path class=\"i-pause\" d=\"M4 2.5h3v11H4zM9 2.5h3v11H9z\"/></svg>";

    var dataEl = document.getElementById("demo-data");
    var source = document.getElementById("demo-source");
    var grid = document.getElementById("lang-grid");
    var playAllBtn = document.getElementById("play-all");
    var playAllLabel = document.getElementById("play-all-label");
    var note = document.getElementById("demo-note");
    var live = document.getElementById("demo-live");

    if (!dataEl || !source || !grid || !playAllBtn) {
        return;
    }

    var data;
    try {
        data = JSON.parse(dataEl.textContent);
    } catch (err) {
        source.textContent = "The demo data could not be read.";
        playAllBtn.disabled = true;
        return;
    }

    var items = [];
    var seq = null;

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        if (text) {
            node.textContent = text;
        }
        return node;
    }

    function textBlock(tag, className, text, lang) {
        var node = el(tag, className);
        if (text) {
            node.textContent = text;
            node.lang = lang;
        } else {
            node.textContent = PLACEHOLDER;
            node.lang = "en";
            node.classList.add("is-placeholder");
        }
        return node;
    }

    function canPlay(item) {
        return item.hasSrc && !item.failed;
    }

    function prefersReducedMotion() {
        return document.documentElement.classList.contains("reduce-motion") ||
            (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    function announce(message) {
        if (live) {
            live.textContent = message;
        }
    }

    function setProgress(item, fraction) {
        if (item.bar) {
            item.bar.style.setProperty("--p", (fraction * 100).toFixed(1) + "%");
        }
    }

    function setPlaying(item, on) {
        item.card.classList.toggle("is-playing", on);
        if (item.btn) {
            item.btn.setAttribute("aria-pressed", String(on));
            item.btn.setAttribute("aria-label", (on ? "Pause " : "Play ") + item.label);
        }
    }

    function updatePlayAll() {
        var any = items.some(canPlay);
        playAllBtn.disabled = !any && !seq;
    }

    function endSeq() {
        seq = null;
        playAllBtn.setAttribute("aria-pressed", "false");
        playAllLabel.textContent = "Play all";
        updatePlayAll();
    }

    function markFailed(item) {
        if (item.failed) {
            return;
        }
        item.failed = true;
        item.card.classList.add("is-unavailable");
        if (item.btn) {
            item.btn.disabled = true;
            item.btn.setAttribute("aria-label", item.name + " audio unavailable");
        }
        if (item.status) {
            item.status.textContent = "Audio unavailable";
            item.status.hidden = false;
            item.track.hidden = true;
        }
        if (seq && seq.current === item) {
            advance();
        } else {
            updatePlayAll();
        }
    }

    function safePlay(item) {
        var promise = item.audio.play();
        if (promise && promise.catch) {
            promise.catch(function (err) {
                if (err && err.name !== "AbortError") {
                    markFailed(item);
                }
            });
        }
    }

    function advance() {
        if (!seq) {
            return;
        }
        var next = seq.index + 1;
        while (next < items.length && !canPlay(items[next])) {
            next += 1;
        }
        if (next >= items.length) {
            endSeq();
            announce("Finished");
            return;
        }
        seq.index = next;
        seq.current = items[next];
        announce("Playing " + items[next].name);
        items[next].card.scrollIntoView({
            block: "nearest",
            behavior: prefersReducedMotion() ? "auto" : "smooth"
        });
        items[next].audio.currentTime = 0;
        safePlay(items[next]);
    }

    function wire(item) {
        var audio = item.audio;

        audio.addEventListener("play", function () {
            if (seq && seq.current !== item) {
                endSeq();
            }
            items.forEach(function (other) {
                if (other !== item && !other.audio.paused) {
                    other.audio.pause();
                }
            });
            setPlaying(item, true);
        });

        audio.addEventListener("pause", function () {
            setPlaying(item, false);
            if (seq && seq.current === item && !audio.ended) {
                endSeq();
            }
        });

        audio.addEventListener("ended", function () {
            setProgress(item, 0);
            if (seq && seq.current === item) {
                advance();
            }
        });

        audio.addEventListener("timeupdate", function () {
            if (audio.duration) {
                setProgress(item, audio.currentTime / audio.duration);
            }
        });

        audio.addEventListener("error", function () {
            if (item.hasSrc) {
                markFailed(item);
            }
        });
    }

    function buildSource(english) {
        var audioUrl = english.audio || "";
        var wrap = source;
        wrap.appendChild(el("p", "demo-label", "Original recording · English"));
        wrap.appendChild(textBlock("p", "demo-quote", english.text, "en"));

        var audio = document.createElement("audio");
        audio.controls = true;
        audio.preload = "none";
        audio.setAttribute("aria-label", "Original English recording");
        if (audioUrl) {
            audio.src = audioUrl;
        } else {
            wrap.classList.add("is-pending");
        }
        wrap.appendChild(audio);

        var item = {
            name: "the original English recording",
            label: "the original English recording",
            audio: audio,
            card: wrap,
            btn: null,
            bar: null,
            hasSrc: Boolean(audioUrl),
            failed: false
        };
        items.push(item);
        wire(item);
    }

    function buildCard(lang) {
        var audioUrl = lang.audio || "";
        var li = el("li", "lang-card");
        li.setAttribute("data-code", lang.code);

        var head = el("div", "lang-card__head");
        var titles = el("div", "lang-card__titles");
        titles.appendChild(el("h3", "lang-card__name", lang.name));
        var native = el("span", "lang-card__native", lang.native);
        native.lang = lang.code;
        titles.appendChild(native);
        head.appendChild(titles);
        var eq = el("span", "eq");
        eq.setAttribute("aria-hidden", "true");
        for (var i = 0; i < 4; i += 1) {
            eq.appendChild(document.createElement("span"));
        }
        head.appendChild(eq);
        li.appendChild(head);

        li.appendChild(textBlock("p", "lang-card__text", lang.text, lang.code));

        if (lang.text && lang.back_translation) {
            var back = el("p", "lang-card__back");
            back.appendChild(el("span", "lang-card__back-label", "Independent back-translation"));
            var quote = el("q", null, lang.back_translation);
            quote.lang = "en";
            back.appendChild(quote);
            li.appendChild(back);
        }

        var row = el("div", "lang-card__player");
        var btn = el("button", "play-btn");
        btn.type = "button";
        btn.setAttribute("aria-pressed", "false");
        btn.innerHTML = ICON_PLAY;
        row.appendChild(btn);

        var track = el("div", "play-track");
        track.setAttribute("aria-hidden", "true");
        var bar = document.createElement("span");
        track.appendChild(bar);
        row.appendChild(track);

        var status = el("span", "play-status");
        status.hidden = true;
        row.appendChild(status);

        var audio = document.createElement("audio");
        audio.preload = "none";
        if (audioUrl) {
            audio.src = audioUrl;
        }
        row.appendChild(audio);
        li.appendChild(row);

        var label = lang.name + " translation";
        var item = {
            name: lang.name,
            label: label,
            audio: audio,
            card: li,
            btn: btn,
            bar: bar,
            track: track,
            status: status,
            hasSrc: Boolean(audioUrl),
            failed: false
        };

        btn.setAttribute("aria-label", "Play " + label);
        if (!item.hasSrc) {
            btn.disabled = true;
            btn.setAttribute("aria-label", label + " audio coming soon");
            track.hidden = true;
            status.textContent = "Audio coming soon";
            status.hidden = false;
            li.classList.add("is-pending");
        }

        btn.addEventListener("click", function () {
            if (audio.paused) {
                safePlay(item);
            } else {
                audio.pause();
            }
        });

        items.push(item);
        wire(item);
        grid.appendChild(li);
    }

    playAllBtn.addEventListener("click", function () {
        if (seq) {
            var current = seq.current;
            endSeq();
            if (current) {
                current.audio.pause();
            }
            announce("Stopped");
            return;
        }
        seq = { index: -1, current: null };
        playAllBtn.setAttribute("aria-pressed", "true");
        playAllLabel.textContent = "Stop";
        advance();
    });

    buildSource(data.english || {});
    (data.languages || []).forEach(buildCard);

    var pending = items.filter(function (item) {
        return !item.hasSrc;
    }).length;
    if (note && pending === items.length) {
        note.hidden = false;
    }
    updatePlayAll();
})();
