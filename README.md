# Photos by Syl

A dark, editorial photography site.

- **Landing page** — a slow cross-fade of random photos from your gallery, in black and white. No scrolling.
- **Gallery** — every photograph in horizontal bands, ordered top-to-bottom from warmest reds down to monochrome. Photos are sorted into color albums automatically when you add them.
- **Smooth transitions** — pages fade gently into one another. Going from the home page to the gallery, photos "develop" from black-and-white into full color.

Drop photos into a single folder, double-click a script — your site updates.

---

## 1. First-time setup (do this once)

### 1.1 Install Python (5 minutes)

1. Go to <https://www.python.org/downloads/>
2. Download Python 3.11+ for Windows.
3. **CRITICAL**: tick **"Add Python to PATH"** in the installer.

### 1.2 Install the image library (1 minute)

Open Command Prompt (Windows key → type `cmd` → Enter) and run:

```
pip install Pillow
```

### 1.3 Done. ✓

---

## 2. Your daily workflow

### Adding photos

1. Drop photos into **`images/originals/`** — one folder, no sorting needed.
2. Double-click **`optimize-images.bat`**. It resizes, strips EXIF metadata, analyzes color, and sorts photos into the right album automatically.
3. Double-click **`preview-site.bat`** if not running.
4. Open <http://localhost:8000>.

### Removing photos

Delete from `images/originals/` and re-run `optimize-images.bat`.

### Stop the preview server

Press **Ctrl + C** in the black command-prompt window.

---

## 3. Customizing the site

### Site name, tagline, email, watermark

Edit **`config.js`** in any text editor. Save → refresh browser.

### Add or rename color albums

Edit `colorAlbums` in `config.js`. Example — adding "Twilight":

```js
{ slug: "twilight", name: "Twilight", hex: "#5a4a8a", description: "The blue hour, after the sun." }
```

Re-run the optimizer; photos that match get sorted in.

### Edit a photo's title

Open `photos.js` after running the optimizer. Edit the `title` field directly. The optimizer preserves your edits on subsequent runs.

---

## 4. Image protection

| Layer | What it does |
|---|---|
| **Resizing** | Originals never reach the web (only ~1600px copies do). |
| **EXIF stripping** | GPS / camera serial removed from web copies. |
| **Right-click disabled** | "Save image as" blocked on photos. |
| **Drag disabled** | Can't drag photos to the desktop. |
| **Visible watermark** | "© Syl" baked into every photo. |
| **Larger watermark in lightbox** | More prominent when zoomed in. |

**Honest limit**: nothing on the web prevents screenshots. These layers stop ~95% of casual theft.

---

## 5. Folder structure

```
photos-by-syl/
├── index.html              ← landing page
├── gallery.html            ← full gallery (color bands, warm→cool)
├── about.html
├── shop.html
├── contact.html
├── galleries.html          ← (legacy) album browsing index
├── album.html              ← (legacy) single album page
├── config.js               ← ⭐ site-wide settings
├── photos.js               ← auto-generated photo list
├── favicon.svg
│
├── optimize-images.bat     ← ⭐ run after adding photos
├── preview-site.bat        ← ⭐ run to view site locally
│
├── css/style.css
├── js/site.js
├── scripts/optimize_images.py
│
└── images/
    ├── about/              ← portrait.jpg for About page
    ├── originals/          ← ⭐ ALL YOUR HIGH-RES PHOTOS
    └── galleries/          ← auto-generated, sorted by color (don't touch)
```

⭐ = files you'll touch regularly.

---

## 6. Going live

Free hosting options when ready:

- **Cloudflare Pages** — fast, drag-and-drop.
- **Netlify** — easy, drag-and-drop.
- **GitHub Pages** — requires a free GitHub account.

Drag everything *except* `images/originals/` into the host. Buy a domain (~$12/year). Ask me when ready and I'll walk you through it.

**Important**: never upload `images/originals/` — those are your high-res files.

---

## 7. Troubleshooting

**"Pillow is not installed"** → run `pip install Pillow` in Command Prompt.

**Site looks broken / no photos** → use `preview-site.bat` (don't double-click `index.html` directly).

**A new photo doesn't appear** → did you run `optimize-images.bat`? Did you Ctrl+F5 to force-refresh the browser?

**A photo got classified into the wrong color album** → tweak the album's `hex` value in `config.js` to better match your idea of that color, then re-run the optimizer.

**Page transitions feel slow** → if your browser has reduced motion enabled (accessibility setting), transitions are deliberately shortened to 200ms. Otherwise, the 600ms duration is intentional.

---

Enjoy.
