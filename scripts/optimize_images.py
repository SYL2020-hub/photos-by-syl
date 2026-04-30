#!/usr/bin/env python3
"""
PHOTOS BY SYL — Smart Image Optimizer

What this script does:
  1. Reads every photo from images/originals/  (one folder, no sorting needed)
  2. For each photo:
       - Records original dimensions before processing
       - Resizes the web copy to ~1600px on the long edge
       - Strips EXIF metadata from the web copy (privacy)
       - Analyzes dominant colors using K-means clustering
       - Classifies the photo into the closest color album from config.js
  3. Writes the web-ready image to images/galleries/<album>/display/
  4. Updates photos.js with classifications, dimensions, and color hue

Drop photos into images/originals/, run this script, refresh the browser.

Run by double-clicking optimize-images.bat (Windows) or:
    python scripts/optimize_images.py
"""

import re
import sys
import json
import base64
import io
from pathlib import Path

try:
    from PIL import Image, ImageOps
    Image.MAX_IMAGE_PIXELS = None
except ImportError:
    print("ERROR: Pillow is not installed.")
    print("Install it by running:  pip install Pillow")
    sys.exit(1)

# ---- SETTINGS -------------------------------------------------------------
MAX_LONG_EDGE = 1600
JPEG_QUALITY = 82
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp'}

# Blur placeholder settings — tiny thumbnail embedded as base64 in photos.js
# At 20px wide and JPEG quality 30, each placeholder is ~300-600 bytes.
# The browser shows it (CSS-blurred) instantly while the real image loads.
BLUR_LONG_EDGE = 20
BLUR_QUALITY = 30

# K-means settings (color analysis)
KMEANS_K = 5
KMEANS_SAMPLE_SIZE = 200
KMEANS_ITERATIONS = 10

# ---- PATHS ----------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ORIGINALS_DIR = PROJECT_ROOT / "images" / "originals"
GALLERIES_DIR = PROJECT_ROOT / "images" / "galleries"
ORIGINALS_PROJECTS_DIR = PROJECT_ROOT / "images" / "originals-projects"
PROJECTS_OUT_DIR = PROJECT_ROOT / "images" / "projects"
PHOTOS_JS = PROJECT_ROOT / "photos.js"
CONFIG_JS = PROJECT_ROOT / "config.js"

# Panorama: larger long-edge cap because these images need to allow scrolling
# at viewport-height with enough horizontal travel.
PANO_MAX_LONG_EDGE = 4200
PANO_QUALITY = 85


# ============================================================================
# COLOR ANALYSIS
# ============================================================================

def hex_to_rgb(h: str):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def rgb_to_hsl(r, g, b):
    """Convert RGB (0-255) to HSL (0-360, 0-1, 0-1)."""
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    mx = max(r, g, b)
    mn = min(r, g, b)
    l = (mx + mn) / 2.0
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        h = ((g - b) / d + (6 if g < b else 0))
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60, s, l


def color_distance_hsl(c1_rgb, c2_rgb):
    """Distance between two colors in HSL space, with hue weighted highest."""
    h1, s1, l1 = rgb_to_hsl(*c1_rgb)
    h2, s2, l2 = rgb_to_hsl(*c2_rgb)
    dh = min(abs(h1 - h2), 360 - abs(h1 - h2)) / 180.0
    ds = abs(s1 - s2)
    dl = abs(l1 - l2)
    if min(s1, s2) < 0.10:
        # Either color is near-grey: hue is meaningless, use sat/lum distance
        return ds * 2.5 + dl * 0.6 + dh * 0.4
    return dh * 1.5 + ds * 0.6 + dl * 0.4


def kmeans_dominant_colors(pixels, k=KMEANS_K, iterations=KMEANS_ITERATIONS):
    """Tiny pure-Python K-means. Pixels is a list of (r, g, b) tuples."""
    if len(pixels) <= k:
        return [(p, 1) for p in pixels]
    step = len(pixels) // k
    centroids = [list(pixels[i * step]) for i in range(k)]
    for _ in range(iterations):
        clusters = [[] for _ in range(k)]
        for p in pixels:
            best = 0
            best_d = float("inf")
            for i, c in enumerate(centroids):
                d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2
                if d < best_d:
                    best_d = d
                    best = i
            clusters[best].append(p)
        moved = False
        for i, cluster in enumerate(clusters):
            if not cluster:
                continue
            new_c = [
                sum(p[0] for p in cluster) / len(cluster),
                sum(p[1] for p in cluster) / len(cluster),
                sum(p[2] for p in cluster) / len(cluster),
            ]
            if [int(x) for x in new_c] != [int(x) for x in centroids[i]]:
                moved = True
            centroids[i] = new_c
        if not moved:
            break
    weighted = []
    for c, cluster in zip(centroids, clusters):
        if cluster:
            weighted.append(((int(c[0]), int(c[1]), int(c[2])), len(cluster) / len(pixels)))
    weighted.sort(key=lambda x: -x[1])
    return weighted


def analyze_image_color(img: Image.Image):
    """Returns (dominant_rgb, all_dominants_with_weights)."""
    sample = img.copy()
    sample.thumbnail((KMEANS_SAMPLE_SIZE, KMEANS_SAMPLE_SIZE), Image.LANCZOS)
    if sample.mode != "RGB":
        sample = sample.convert("RGB")
    pixels = [px for px in iter(sample.getdata())]
    clusters = kmeans_dominant_colors(pixels, k=KMEANS_K)
    if not clusters:
        return (128, 128, 128), []
    avg_sat = sum(rgb_to_hsl(*c)[1] * w for c, w in clusters)
    if avg_sat < 0.15:
        return clusters[0][0], clusters
    candidates = clusters[: min(3, len(clusters))]
    best = max(candidates, key=lambda cw: rgb_to_hsl(*cw[0])[1] * (cw[1] ** 0.5))
    return best[0], clusters


def classify_to_album(rgb, all_clusters, albums):
    best_slug = albums[0]["slug"]
    best_d = float("inf")
    for album in albums:
        anchor = hex_to_rgb(album["hex"])
        d = color_distance_hsl(rgb, anchor)
        if d < best_d:
            best_d = d
            best_slug = album["slug"]
    return best_slug, best_d


# ============================================================================
# CONFIG / MANIFEST PARSING
# ============================================================================

def load_albums_from_config():
    if not CONFIG_JS.exists():
        return []
    txt = CONFIG_JS.read_text(encoding="utf-8")
    m = re.search(r"colorAlbums:\s*\[(.*?)\]", txt, re.DOTALL)
    if not m:
        return []
    block = m.group(1)
    albums = []
    for entry in re.finditer(r"\{(.*?)\}", block, re.DOTALL):
        body = entry.group(1)
        slug = re.search(r'slug:\s*"([^"]+)"', body)
        name = re.search(r'name:\s*"([^"]+)"', body)
        hex_  = re.search(r'hex:\s*"([^"]+)"', body)
        desc = re.search(r'description:\s*"([^"]*)"', body)
        if slug and name and hex_:
            albums.append({
                "slug": slug.group(1),
                "name": name.group(1),
                "hex":  hex_.group(1),
                "description": desc.group(1) if desc else "",
            })
    return albums


def load_projects_from_config():
    """Read projects: slug + type from config.js."""
    if not CONFIG_JS.exists():
        return []
    txt = CONFIG_JS.read_text(encoding="utf-8")
    m = re.search(r"projects:\s*\[(.*?)\n\s*\]", txt, re.DOTALL)
    if not m:
        return []
    block = m.group(1)
    projects = []
    for entry in re.finditer(r"\{(.*?)\}", block, re.DOTALL):
        body = entry.group(1)
        slug = re.search(r'slug:\s*"([^"]+)"', body)
        ptype = re.search(r'type:\s*"([^"]+)"', body)
        if slug:
            projects.append({
                "slug": slug.group(1),
                "type": ptype.group(1) if ptype else "panorama",
            })
    return projects


def make_title_from_filename(name: str) -> str:
    stem = Path(name).stem
    cleaned = stem.replace("-", " ").replace("_", " ").strip()
    return cleaned.title()


def load_existing_manifest():
    """Parse photos.js to preserve manual edits across re-runs."""
    if not PHOTOS_JS.exists():
        return {}
    txt = PHOTOS_JS.read_text(encoding="utf-8")
    start = txt.find("{")
    end = txt.rfind("}")
    if start == -1 or end == -1:
        return {}
    blob = txt[start:end + 1]
    try:
        json_blob = re.sub(r'(\b\w+):', r'"\1":', blob)
        json_blob = re.sub(r',\s*}', '}', json_blob)
        json_blob = re.sub(r',\s*]', ']', json_blob)
        return json.loads(json_blob)
    except Exception:
        return {}


def js_escape(s: str) -> str:
    if s is None:
        return ""
    return str(s).replace("\\", "\\\\").replace('"', '\\"')


def _photo_entry(p: dict) -> str:
    """Format a single photo dict as a JS object literal line."""
    return (
        f'    {{ file: "{p["file"]}", '
        f'title: "{js_escape(p["title"])}", '
        f'featured: {"true" if p.get("featured") else "false"}, '
        f'origW: {p.get("origW", 0)}, '
        f'origH: {p.get("origH", 0)}, '
        f'dispW: {p.get("dispW", 0)}, '
        f'dispH: {p.get("dispH", 0)}, '
        f'hue: {p.get("hue", 0)}, '
        f'sat: {p.get("sat", 0):.2f}, '
        f'lum: {p.get("lum", 0):.2f}, '
        f'blur: "{p.get("blur", "")}" }}'
    )


def write_manifest(manifest: dict, project_manifest: dict = None):
    """Write photos.js. Both manifests are dicts of slug → list of photo dicts."""
    project_manifest = project_manifest or {}
    lines = [
        "// =============================================================================",
        "// PHOTO MANIFEST  (auto-generated by optimize-images.bat)",
        "// =============================================================================",
        "// To re-generate after adding photos, run: optimize-images.bat",
        "// You may freely edit titles and featured flags by hand —",
        "// the next run will preserve them.",
        "// =============================================================================",
        "",
        "window.PHOTOS = {",
    ]
    blocks = []
    for album, photos in manifest.items():
        if not photos:
            blocks.append(f'\n  {album}: [],')
        else:
            entries = [_photo_entry(p) for p in photos]
            blocks.append(f'\n  {album}: [\n' + ",\n".join(entries) + "\n  ],")
    lines.append("\n".join(blocks))
    lines.append("};\n")

    # Project galleries (e.g. Sky) get their own top-level object so they
    # don't pollute the main gallery's color albums.
    lines.append("")
    lines.append("// Project galleries — separate from the main gallery.")
    lines.append("window.PROJECT_PHOTOS = {")
    proj_blocks = []
    for slug, photos in project_manifest.items():
        if not photos:
            proj_blocks.append(f'\n  "{slug}": [],')
        else:
            entries = [_photo_entry(p) for p in photos]
            proj_blocks.append(f'\n  "{slug}": [\n' + ",\n".join(entries) + "\n  ],")
    lines.append("\n".join(proj_blocks))
    lines.append("};\n")

    PHOTOS_JS.write_text("\n".join(lines), encoding="utf-8")


# ============================================================================
# IMAGE PIPELINE
# ============================================================================

def make_blur_placeholder(img: Image.Image) -> str:
    """
    Generate a tiny base64 JPEG placeholder for the 'blur-up' loading effect.
    Returns a data URI like 'data:image/jpeg;base64,/9j/4AAQ...' — typically
    300-600 bytes. The browser shows this instantly (since it's embedded in
    photos.js) and CSS-blurs it while the full photo downloads.
    """
    thumb = img.copy()
    w, h = thumb.size
    scale = BLUR_LONG_EDGE / max(w, h)
    new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
    thumb = thumb.resize(new_size, Image.LANCZOS)

    buf = io.BytesIO()
    thumb.save(buf, "JPEG", quality=BLUR_QUALITY, optimize=True)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def optimize_and_classify(src_path: Path, albums):
    """Resize, strip EXIF, analyze color, generate blur placeholder.

    Returns:  slug, optimized_image, dominant_rgb, original_w, original_h, blur_data_uri
    """
    with Image.open(src_path) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        elif img.mode == "L":
            img = img.convert("RGB")

        orig_w, orig_h = img.size
        dominant_rgb, _all = analyze_image_color(img)
        slug, _d = classify_to_album(dominant_rgb, _all, albums)

        # Generate the blur placeholder BEFORE the resize so it's based on
        # the highest-quality source we have (better color sampling)
        blur = make_blur_placeholder(img)

        scale = MAX_LONG_EDGE / max(orig_w, orig_h)
        if scale < 1.0:
            img = img.resize((int(orig_w * scale), int(orig_h * scale)), Image.LANCZOS)

        return slug, img, dominant_rgb, orig_w, orig_h, blur


def optimize_panorama(src: Path, dest: Path) -> tuple[int, int, int, int, int]:
    """Resize and strip EXIF for a panorama.
    Returns (orig_w, orig_h, output_w, output_h, output_size_kb)."""
    with Image.open(src) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        elif img.mode == "L":
            img = img.convert("RGB")
        ow, oh = img.size
        scale = PANO_MAX_LONG_EDGE / max(ow, oh)
        if scale < 1.0:
            img = img.resize((int(ow * scale), int(oh * scale)), Image.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "JPEG", quality=PANO_QUALITY, optimize=True, progressive=True)
        nw, nh = img.size
    kb = dest.stat().st_size // 1024
    return ow, oh, nw, nh, kb


def process_panorama_project(slug: str) -> bool:
    """Process a panorama-type project. Looks for images/originals-projects/<slug>.<ext>.

    Skips re-processing if the output file is newer than the source — saves
    time on every run when nothing has changed.
    Returns True if a panorama was found (regardless of whether re-encoded).
    """
    if not ORIGINALS_PROJECTS_DIR.exists():
        return False
    candidates = [
        f for f in ORIGINALS_PROJECTS_DIR.iterdir()
        if f.is_file() and f.stem == slug
        and f.suffix.lower() in ALLOWED_EXTENSIONS
    ]
    if not candidates:
        print(f"  [panorama] {slug}: no source found in {ORIGINALS_PROJECTS_DIR.name}/")
        return False

    src = candidates[0]
    dest = PROJECTS_OUT_DIR / f"{slug}.jpg"

    # Skip if output is fresher than input
    if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
        print(f"  [panorama] {slug}: up-to-date (skipping)")
        return True

    try:
        ow, oh, nw, nh, kb = optimize_panorama(src, dest)
        print(f"  [panorama] {slug}: {src.name}")
        print(f"             {ow} x {oh}  →  {nw} x {nh}  ({kb} KB)")
    except Exception as e:
        print(f"  [panorama] {slug}: ERROR {e}")
        return False
    return True


def process_gallery_project(slug: str, albums, prior_metadata: dict) -> list:
    """Process a gallery-type project.
    Photos are read from images/originals-projects/<slug>/*.
    Output goes to images/projects/<slug>/display/*.jpg
    Returns a list of photo dicts for the manifest.
    """
    src_dir = ORIGINALS_PROJECTS_DIR / slug
    out_dir = PROJECTS_OUT_DIR / slug / "display"

    if not src_dir.exists() or not src_dir.is_dir():
        print(f"  [gallery]  {slug}: no folder at {src_dir.relative_to(PROJECT_ROOT)}/")
        return []

    files = sorted([
        f for f in src_dir.iterdir()
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS
    ])
    if not files:
        print(f"  [gallery]  {slug}: folder is empty")
        return []

    # Wipe output dir so deleted photos disappear
    if out_dir.exists():
        for f in out_dir.iterdir():
            if f.is_file():
                f.unlink()

    photos = []
    for src in files:
        dest_name = src.stem + ".jpg"
        try:
            _slug, img, dom_rgb, orig_w, orig_h, blur = optimize_and_classify(src, albums)
        except Exception as e:
            print(f"  [gallery]  {slug}: skipping {src.name} ({e})")
            continue

        dest = out_dir / dest_name
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        disp_w, disp_h = img.size
        img.close()

        h, s, l = rgb_to_hsl(*dom_rgb)
        prior = prior_metadata.get(dest_name, {})
        photos.append({
            "file": dest_name,
            "title": prior.get("title") or make_title_from_filename(dest_name),
            "featured": bool(prior.get("featured", False)),
            "origW": orig_w,
            "origH": orig_h,
            "dispW": disp_w,
            "dispH": disp_h,
            "hue": round(h, 1),
            "sat": s,
            "lum": l,
            "blur": blur,
        })

    print(f"  [gallery]  {slug}: {len(photos)} photo(s)")
    return photos


def load_existing_project_manifest():
    """Read PROJECT_PHOTOS from photos.js to preserve manual edits."""
    if not PHOTOS_JS.exists():
        return {}
    txt = PHOTOS_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PROJECT_PHOTOS\s*=\s*\{(.*?)\};", txt, re.DOTALL)
    if not m:
        return {}
    blob = "{" + m.group(1) + "}"
    try:
        json_blob = re.sub(r'(\b\w+):', r'"\1":', blob)
        json_blob = re.sub(r',\s*}', '}', json_blob)
        json_blob = re.sub(r',\s*]', ']', json_blob)
        return json.loads(json_blob)
    except Exception:
        return {}


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 60)
    print("PHOTOS BY SYL — Smart Image Optimizer")
    print("=" * 60)

    albums = load_albums_from_config()
    if not albums:
        print("ERROR: Could not read color albums from config.js. Aborting.")
        return
    print(f"Loaded {len(albums)} color albums from config.js")

    if not ORIGINALS_DIR.exists():
        ORIGINALS_DIR.mkdir(parents=True)
        print(f"\nCreated {ORIGINALS_DIR}.  Drop photos in here and re-run.")
        return

    files = sorted([
        f for f in ORIGINALS_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS
    ])
    if not files:
        print(f"\nNo photos found in {ORIGINALS_DIR}")
        print("Drop your high-res photos in and re-run this script.")
        return

    existing = load_existing_manifest()
    if "PHOTOS" in existing:
        existing = existing["PHOTOS"]

    metadata_lookup = {}
    for slug, plist in (existing or {}).items():
        for p in plist or []:
            metadata_lookup[p["file"]] = p

    # Wipe galleries clean — we re-classify everything each run so deletes propagate
    if GALLERIES_DIR.exists():
        for album_dir in GALLERIES_DIR.iterdir():
            if album_dir.is_dir():
                display = album_dir / "display"
                if display.exists():
                    for f in display.iterdir():
                        if f.is_file():
                            f.unlink()

    new_manifest = {a["slug"]: [] for a in albums}
    total = 0

    print(f"\nProcessing {len(files)} photo(s)...\n")

    for src in files:
        dest_name = src.stem + ".jpg"
        try:
            slug, img, dom_rgb, orig_w, orig_h, blur = optimize_and_classify(src, albums)
        except Exception as e:
            print(f"  ! {src.name}: {e}")
            continue

        dest = GALLERIES_DIR / slug / "display" / dest_name
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        disp_w, disp_h = img.size
        img.close()

        h, s, l = rgb_to_hsl(*dom_rgb)
        prior = metadata_lookup.get(dest_name, {})

        new_manifest[slug].append({
            "file": dest_name,
            "title": prior.get("title") or make_title_from_filename(dest_name),
            "featured": bool(prior.get("featured", False)),
            "origW": orig_w,
            "origH": orig_h,
            "dispW": disp_w,
            "dispH": disp_h,
            "hue": round(h, 1),
            "sat": s,
            "lum": l,
            "blur": blur,
        })

        album_name = next(a["name"] for a in albums if a["slug"] == slug)
        print(f"  {src.name:40s}  →  {album_name:12s}  {orig_w}×{orig_h}")
        total += 1

    # ---- PROCESS PROJECTS ----------------------------------------------------
    projects = load_projects_from_config()
    project_manifest = {}
    if projects:
        print("\n" + "-" * 60)
        print(f"Processing {len(projects)} project(s)...")
        print("-" * 60)

        # Existing per-photo metadata for project galleries (preserve manual edits)
        existing_proj = load_existing_project_manifest()

        for proj in projects:
            slug = proj["slug"]
            ptype = proj.get("type", "panorama")
            if ptype == "panorama":
                process_panorama_project(slug)
            elif ptype == "gallery":
                # Build per-file metadata lookup for this project
                prior = {}
                for p in (existing_proj.get(slug) or []):
                    prior[p["file"]] = p
                photos = process_gallery_project(slug, albums, prior)
                project_manifest[slug] = photos
            else:
                print(f"  [unknown]  {slug}: type '{ptype}' not recognized")

    write_manifest(new_manifest, project_manifest)

    print("\n" + "-" * 60)
    print("Main gallery distribution:")
    for a in albums:
        n = len(new_manifest[a["slug"]])
        bar = "█" * n
        print(f"  {a['name']:12s}  {n:3d}  {bar}")
    if project_manifest:
        print("\nProject gallery counts:")
        for slug, photos in project_manifest.items():
            print(f"  {slug:12s}  {len(photos):3d}")
    print("-" * 60)
    print(f"Done. {total} main photographs + {sum(len(v) for v in project_manifest.values())} project photographs.")
    print("Refresh your browser to see changes.")
    print("=" * 60)


if __name__ == "__main__":
    main()
