#!/usr/bin/env python3
"""
Copy + web-optimise the curated tungsten-reconstruction visuals into the
IFE-Symposium-2026 assets directory.

Stills  -> WebP, capped at 2600 px wide, quality 86.  Measured on
           process_08_summary.png: 1.32 MB PNG -> 0.25 MB WebP at 2200 px,
           i.e. a 5x saving with no visible loss on plot text.
Videos  -> h264 at half linear resolution, crf 30.  The source stage.mp4 files
           are 2080x1960 at 12.4 Mbps (14-83 MB each); that is a research
           artefact, not something to serve over the web.

Nothing is written outside DEST.  Sources are read-only, and every asset this
script writes is an independent file -- no symlinks, no hardlinks back into the
research tree -- so the published site does not depend on that tree continuing to
exist.

SRC points at the CONSOLIDATED run archive in the HP_ARBCDI main checkout, not at
the HP_ARBCDI_bcc worktree the campaign originally ran in: that worktree was torn
down once its branch merged, and its gitignored run data survives only because it
was hardlinked into main beforehand.  Run this on the BYU cluster, where SRC exists.
"""
import os, subprocess, sys, json
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

SRC  = "/home/nbuhrley/BYU_CXI/HP_ARBCDI/runs/tungsten/bcc"
DEST = "/home/nbuhrley/nelsbuhrley.github.io/IFE-Symposium-2026/assets"
FFMPEG = subprocess.run([sys.executable, "-c",
    "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"],
    capture_output=True, text=True).stdout.strip()

MAXW, QUALITY = 2600, 86

# ---------------------------------------------------------------- the curation
# run directory -> (asset slug, which per-run figures to publish)
CORE = ["process_08_summary", "process_07_convergence", "process_01_diffraction",
        "process_04_phasing", "process_06_seed", "process_09_residual_field"]
# process_05_support_budget is deliberately NOT published (support-oversizing
# content excluded by request).

FEATURED = [
    ("10k_s13",                            "10k-s13",             CORE + ["defect_slices"]),
    ("10k_s14",                            "10k-s14",             CORE + ["defect_slices"]),
    ("he/25k/25k_g04_FLU30x100_focus_s2",  "he-25k-g04-flu30",    CORE + ["defect_slices"]),
    ("he/25k/25k_g01_E3200x3_spread_s1",   "he-25k-g01-e3200",    CORE),
    ("lib_5k_g15_L3deep_E1000_s2",         "lib-5k-g15-deep",     CORE + ["damage_slabs"]),
    ("lib_5k_g03_L0",                      "lib-5k-g03-pristine", CORE),
    ("large/lgE_25k_g01_L1_E150_s2",       "lg-25k-g01-e150",     CORE),
    ("25kD_s42",                           "25kD-s42",            CORE + ["defect_slices"]),
]

CROSS = [  # cross-run diagnostics from _figures/
    "holes_04_good_vs_bad", "holes_05_failure_modes", "holes_06_metric_traps",
    "holes_01_selector",    "holes_08_registry_lockin", "holes_09_limit_cycle",
    "chart_convergence",
]
# holes_07_support and holes_11_refuted are skipped: both are support-oversizing
# boards, excluded by the same request as process_05.

# Two animations exist per run and they show different things, so both are published:
#   stage.mp4    -- rotating atom cloud, a-CNA coloured (blue lattice / amber interior
#                   non-BCC / open true-site rings).  2080x1960 @ 12.4 Mbps at source.
#   dashboard.gif-- multi-panel: atom cloud, predicted-vs-true real-space slices, the
#                   predicted-vs-true diffraction pattern, and four live convergence
#                   curves.  1440x810 GIF; transcoding to h264 is a 7-15x saving.
VIDEOS = [  # (run dir, output name)
    ("10k_s13",                           "10k-s13-stage"),
    ("10k_s14",                           "10k-s14-stage"),
    ("he/25k/25k_g04_FLU30x100_focus_s2", "he-25k-g04-flu30-stage"),
    ("25kD_s42",                          "25kD-s42-stage"),
    ("lib_5k_g15_L3deep_E1000_s2",        "lib-5k-g15-deep-stage"),
]

DASHBOARDS = [  # (run dir, output name) -- source is dashboard.gif
    ("10k_s13",                           "10k-s13-dashboard"),
    ("10k_s14",                           "10k-s14-dashboard"),
    ("he/25k/25k_g04_FLU30x100_focus_s2", "he-25k-g04-flu30-dashboard"),
    ("lib_5k_g15_L3deep_E1000_s2",        "lib-5k-g15-deep-dashboard"),
    ("25kD_s42",                          "25kD-s42-dashboard"),
]

# ------------------------------------------------------------------- utilities
def webp(src, dst, maxw=MAXW, q=QUALITY):
    if not os.path.isfile(src):
        return None, f"MISSING {src}"
    im = Image.open(src).convert("RGB")
    w0, h0 = im.size
    if w0 > maxw:
        im = im.resize((maxw, round(h0 * maxw / w0)), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, "WEBP", quality=q, method=6)
    return (os.path.getsize(dst), f"{w0}x{h0} -> {im.width}x{im.height}")

def encode(src, dst, scale=2, crf=30):
    if not os.path.isfile(src):
        return None, f"MISSING {src}"
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    cmd = [FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", src,
           "-vf", f"scale=iw/{scale}:ih/{scale}:flags=lanczos",
           "-c:v", "libx264", "-crf", str(crf), "-preset", "slow",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", dst]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return None, f"ffmpeg failed: {r.stderr[-300:]}"
    return os.path.getsize(dst), "ok"

def encode_gif(src, dst, crf=26):
    """GIF -> h264.  Dimensions are forced even (yuv420p requires it); the source
    1440x810 is already a sensible web size so resolution is preserved."""
    if not os.path.isfile(src):
        return None, f"MISSING {src}"
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    r = subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", src,
        "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-c:v", "libx264", "-crf", str(crf),
        "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", dst],
        capture_output=True, text=True)
    if r.returncode != 0:
        return None, f"ffmpeg failed: {r.stderr[-300:]}"
    return os.path.getsize(dst), "ok"

def poster_frame(mp4, dst, at=0.65, maxw=1400, q=80):
    """Still from 65% through the clip, for the <video poster> attribute.  A frame
    from the run itself beats a black rectangle or an unrelated plot."""
    probe = subprocess.run([FFMPEG, "-hide_banner", "-i", mp4],
                           capture_output=True, text=True).stderr
    line = [l for l in probe.splitlines() if "Duration" in l]
    if not line:
        return None, "no duration"
    h, m, sec = line[0].split("Duration:")[1].split(",")[0].strip().split(":")
    secs = int(h) * 3600 + int(m) * 60 + float(sec)
    tmp = dst + ".tmp.png"
    r = subprocess.run([FFMPEG, "-y", "-hide_banner", "-loglevel", "error",
                        "-ss", f"{max(0.1, secs*at):.2f}", "-i", mp4,
                        "-frames:v", "1", tmp], capture_output=True, text=True)
    if r.returncode != 0:
        return None, f"ffmpeg failed: {r.stderr[-200:]}"
    im = Image.open(tmp).convert("RGB")
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    im.save(dst, "WEBP", quality=q, method=6)
    os.remove(tmp)
    return os.path.getsize(dst), "ok"

# ----------------------------------------------------------------------- build
total = 0
manifest = {"runs": {}, "cross": {}, "video": {}}

print("=== per-run stills ===")
for run, slug, figs in FEATURED:
    for fig in figs:
        s = os.path.join(SRC, run, "figures", fig + ".png")
        d = os.path.join(DEST, "runs", slug, fig + ".webp")
        size, note = webp(s, d)
        if size is None:
            print(f"  !! {slug}/{fig}: {note}")
            continue
        total += size
        manifest["runs"].setdefault(slug, {})[fig] = size
        print(f"  {slug}/{fig:<28} {size/1e6:6.3f} MB   {note}")

print("\n=== cross-run stills ===")
for fig in CROSS:
    s = os.path.join(SRC, "_figures", fig + ".png")
    d = os.path.join(DEST, "cross", fig + ".webp")
    size, note = webp(s, d)
    if size is None:
        print(f"  !! {fig}: {note}")
        continue
    total += size
    manifest["cross"][fig] = size
    print(f"  {fig:<32} {size/1e6:6.3f} MB   {note}")

print("\n=== poster preview ===")
poster = os.path.join(DEST, "BCDI-poster-48x36-250dpi_2.png")
size, note = webp(poster, os.path.join(DEST, "poster-preview.webp"), maxw=2600, q=82)
if size:
    total += size
    print(f"  poster-preview.webp              {size/1e6:6.3f} MB   {note}")

print("\n=== videos (this is the slow part) ===")
for run, name in VIDEOS:
    s = os.path.join(SRC, run, "figures", "stage.mp4")
    d = os.path.join(DEST, "video", name + ".mp4")
    size, note = encode(s, d)
    if size is None:
        print(f"  !! {name}: {note}")
        continue
    total += size
    manifest["video"][name] = size
    src_mb = os.path.getsize(s) / 1e6
    print(f"  {name:<32} {src_mb:6.1f} MB -> {size/1e6:6.3f} MB")

print("\n=== dashboards (GIF -> h264) ===")
for run, name in DASHBOARDS:
    s_ = os.path.join(SRC, run, "figures", "dashboard.gif")
    d_ = os.path.join(DEST, "video", name + ".mp4")
    size, note = encode_gif(s_, d_)
    if size is None:
        print(f"  !! {name}: {note}")
        continue
    total += size
    manifest["video"][name] = size
    print(f"  {name:<34} {os.path.getsize(s_)/1e6:6.2f} MB gif -> {size/1e6:6.3f} MB")

print("\n=== video poster frames ===")
for f in sorted(os.listdir(os.path.join(DEST, "video"))):
    if not f.endswith(".mp4"):
        continue
    mp4 = os.path.join(DEST, "video", f)
    dst = os.path.join(DEST, "video", f[:-4] + "-poster.webp")
    size, note = poster_frame(mp4, dst)
    if size is None:
        print(f"  !! {f}: {note}")
        continue
    total += size
    print(f"  {f[:-4] + '-poster.webp':<44} {size/1e3:6.1f} KB")

json.dump(manifest, open("/tmp/asset_manifest.json", "w"), indent=1)
print(f"\nTOTAL NEW ASSETS: {total/1e6:.1f} MB (poster PNG itself is a further "
      f"{os.path.getsize(poster)/1e6:.1f} MB, already in place)")
