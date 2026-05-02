// =============================================================================
// PHOTOS BY SYL — SITE LOGIC
// You should not need to edit this file. All settings are in config.js
// =============================================================================

(function () {
  'use strict';

  const cfg = window.SITE_CONFIG;
  const photos = window.PHOTOS || {};

  // ===========================================================================
  // PAGE TRANSITIONS
  //
  // Approach: the body starts invisible via CSS (opacity: 0). On page load,
  // JS adds .page-loaded to fade it in. On internal link click, JS adds
  // .page-leaving to fade it back out before navigating.
  //
  // Special case: navigating FROM the landing page TO any other page also
  // applies a brief grayscale → color filter transition on arrival, so
  // colored gallery photos feel like they're "developing" into view.
  // ===========================================================================
  const TRANSITION_DURATION = 350;       // fade in/out duration
  const COLOR_REVEAL_DURATION = 1800;     // landing→gallery B&W→color reveal

  function setupPageTransitions(activePage) {
    const cameFromLanding = sessionStorage.getItem('came-from-landing') === '1';
    sessionStorage.removeItem('came-from-landing');

    if (cameFromLanding && activePage !== 'landing') {
      document.documentElement.classList.add('color-reveal');
      // Hard cleanup: when the animation ends (or after the timeout, whichever
      // first), remove the class AND any inline filter to prevent the body
      // from being stuck with a filter stacking context on Android Chrome.
      const cleanup = () => {
        document.documentElement.classList.remove('color-reveal');
        document.body.style.filter = '';
      };
      document.body.addEventListener('animationend', cleanup, { once: true });
      setTimeout(cleanup, COLOR_REVEAL_DURATION + 100);
    }

    // Single rAF — fade in immediately on first paint, no double-frame delay
    requestAnimationFrame(() => {
      document.body.classList.add('page-loaded');
    });

    document.addEventListener('click', e => {
      const link = e.target.closest('a');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) return;
      if (link.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (!/\.html?(\?|$|#)/.test(href) && href !== '/') return;

      e.preventDefault();

      if (activePage === 'landing') {
        sessionStorage.setItem('came-from-landing', '1');
      }

      document.body.classList.remove('page-loaded');
      document.body.classList.add('page-leaving');
      setTimeout(() => {
        window.location.href = href;
      }, TRANSITION_DURATION);
    });

    window.addEventListener('pageshow', e => {
      if (e.persisted) {
        document.body.classList.remove('page-leaving');
        document.body.classList.add('page-loaded');
      }
    });
  }

  // ===========================================================================
  // IMAGE PROTECTION  — stops casual copying, NOT a determined thief
  // ===========================================================================
  function applyProtection() {
    if (!cfg.protection.disableRightClick) return;
    document.addEventListener('contextmenu', e => {
      if (e.target.tagName === 'IMG' || e.target.closest('.masonry-item, .lightbox, .image-shield, .landing-bg')) {
        e.preventDefault();
        return false;
      }
    });
    if (cfg.protection.disableDrag) {
      document.addEventListener('dragstart', e => {
        if (e.target.tagName === 'IMG') { e.preventDefault(); return false; }
      });
    }
    if (cfg.protection.disableKeyboardShortcuts) {
      document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'u')) {
          if (document.querySelector('.lightbox.open') || e.target.closest('.masonry, .home-gallery-wrap, .landing-bg')) {
            e.preventDefault();
            return false;
          }
        }
      });
    }
  }

  // ===========================================================================
  // NAVIGATION + FOOTER
  // ===========================================================================
  function injectChrome(activePage) {
    const logoSvg = `
      <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M4 4 L4 9 M4 4 L9 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
        <path d="M28 4 L28 9 M28 4 L23 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
        <path d="M4 28 L4 23 M4 28 L9 28" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
        <path d="M28 28 L28 23 M28 28 L23 28" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="square"/>
        <path d="M7 22 L13 14 L17 18 L21 12 L25 22 Z" fill="#c8893a" stroke="none"/>
        <circle cx="22" cy="9" r="1.4" fill="#f0ede7"/>
      </svg>`;

    const igHandle = (cfg.social && cfg.social.instagram) || '';
    const igLink = igHandle ? `
          <a href="https://www.instagram.com/${igHandle}/" target="_blank" rel="noopener noreferrer" class="nav-instagram" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>` : '';

    const navHtml = `
      <nav class="nav" role="navigation">
        <a href="index.html" class="nav-logo" aria-label="${cfg.siteName} home">
          ${logoSvg}<span>${cfg.siteName}</span>
        </a>
        <button class="nav-toggle" aria-label="Toggle menu">☰</button>
        <div class="nav-links">
          <a href="index.html"    ${activePage === 'landing'                       ? 'class="active"' : ''}>Home</a>
          <a href="gallery.html"  ${activePage === 'gallery'                       ? 'class="active"' : ''}>Gallery</a>
          <a href="projects.html" ${(activePage === 'projects' || activePage === 'project') ? 'class="active"' : ''}>Projects</a>
          <a href="about.html"    ${activePage === 'about'                         ? 'class="active"' : ''}>About</a>
          <a href="shop.html"     ${activePage === 'shop'                          ? 'class="active"' : ''}>Prints</a>
          <a href="contact.html"  ${activePage === 'contact'                       ? 'class="active"' : ''}>Contact</a>
          ${igLink}
        </div>
      </nav>`;
    document.body.insertAdjacentHTML('afterbegin', navHtml);
    document.querySelector('.nav-toggle').addEventListener('click', () => {
      document.querySelector('.nav-links').classList.toggle('open');
    });

    // Footer goes everywhere except the landing page (no scroll there)
    if (activePage !== 'landing') {
      const footer = `
        <footer class="footer">
          <div>© ${cfg.copyrightYear} ${cfg.ownerName}. All rights reserved.</div>
          <div class="footer-center">${cfg.siteName}</div>
          <div class="footer-right"><a href="contact.html">Contact</a></div>
        </footer>`;
      document.body.insertAdjacentHTML('beforeend', footer);
    }
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function fillTextSlots() {
    document.querySelectorAll('[data-site-name]').forEach(el => el.textContent = cfg.siteName);
    document.querySelectorAll('[data-tagline]').forEach(el => el.textContent = cfg.tagline);
    document.querySelectorAll('[data-owner]').forEach(el => el.textContent = cfg.ownerName);
    document.querySelectorAll('[data-email]').forEach(el => {
      el.textContent = cfg.email;
      if (el.tagName === 'A') el.href = 'mailto:' + cfg.email;
    });
    document.querySelectorAll('[data-shop-text]').forEach(el => el.textContent = cfg.shop.placeholderText);
    if (document.title.includes('{{site}}')) document.title = document.title.replace('{{site}}', cfg.siteName);
  }

  function suggestedPrintSize(origW, origH) {
    if (!origW || !origH) return null;
    const cmW = (origW / 300) * 2.54;
    const cmH = (origH / 300) * 2.54;
    return `prints up to ${Math.floor(cmW)} × ${Math.floor(cmH)} cm at 300 dpi`;
  }
  function aspectRatioLabel(w, h) {
    if (!w || !h) return null;
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const g = gcd(w, h);
    return `${w / g}:${h / g}`;
  }

  // ===========================================================================
  // ALL PHOTOS — flatten the manifest into one enriched list
  // ===========================================================================
  function getAllPhotos() {
    const albumByLevels = {};
    cfg.colorAlbums.forEach(a => albumByLevels[a.slug] = a);
    const all = [];
    Object.keys(photos).forEach(slug => {
      const album = albumByLevels[slug];
      if (!album) return;
      (photos[slug] || []).forEach(p => {
        all.push({
          ...p,
          album: slug,
          albumName: album.name,
          albumHex: album.hex
        });
      });
    });
    return all;
  }

  // Spectrum order: warm → cool → monochrome
  const SPECTRUM_ORDER = ['crimson', 'amber', 'earth', 'verdant', 'azure', 'monochrome'];
  function spectrumIndex(slug) {
    const i = SPECTRUM_ORDER.indexOf(slug);
    return i === -1 ? 99 : i;
  }

  // ===========================================================================
  // CROSS-FADE ENGINE (used by landing background and about portrait)
  // Cycles through a shuffled list of photos, swapping images between two
  // stacked layers with a soft opacity fade. Pre-loads each image so we
  // never fade to a half-loaded frame.
  // ===========================================================================
  function startCrossfade(opts) {
    const { layerA, layerB, photos, intervalMs = 7000, fadeMs = 2400, onChange } = opts;
    if (!layerA || !layerB || !photos || photos.length === 0) return;

    const pool = [...photos].sort(() => Math.random() - 0.5);
    let idx = 0;
    let activeLayer = layerA;
    let standbyLayer = layerB;

    function pathFor(p) { return `images/galleries/${p.album}/display/${p.file}`; }

    function setLayerImage(layer, p) {
      const img = new Image();
      img.onload = () => {
        layer.style.backgroundImage = `url('${pathFor(p)}')`;
        layer.classList.add('visible');
        const previous = (layer === layerA) ? layerB : layerA;
        setTimeout(() => previous.classList.remove('visible'), fadeMs);
        if (onChange) onChange(p);
      };
      img.onerror = () => {
        idx = (idx + 1) % pool.length;
        crossfade();
      };
      img.src = pathFor(p);
    }

    function crossfade() {
      const next = pool[idx];
      idx = (idx + 1) % pool.length;
      [activeLayer, standbyLayer] = [standbyLayer, activeLayer];
      setLayerImage(activeLayer, next);
    }

    // First image visible immediately (no fade)
    const first = pool[idx];
    idx = (idx + 1) % pool.length;
    layerA.style.backgroundImage = `url('${pathFor(first)}')`;
    layerA.classList.add('visible');
    if (onChange) onChange(first);

    if (pool.length > 1) {
      setInterval(crossfade, intervalMs);
    }
  }

  // ===========================================================================
  // LANDING PAGE — cross-fading B&W background
  // ===========================================================================
  function setupLanding() {
    const layerA = document.getElementById('bg-layer-a');
    const layerB = document.getElementById('bg-layer-b');
    const credit = document.getElementById('landing-photo-credit');
    if (!layerA || !layerB) return;

    const all = getAllPhotos();
    if (all.length === 0) {
      layerA.style.background = '#1a1a1a';
      if (credit) credit.textContent = 'Add photos to begin';
      return;
    }

    startCrossfade({
      layerA, layerB, photos: all,
      intervalMs: 7000,
      fadeMs: 2400,
      onChange: p => { if (credit) credit.textContent = p.albumName; }
    });
  }

  // ===========================================================================
  // ABOUT PAGE — cross-fading B&W portrait area
  // Reuses the landing's cross-fade engine on a smaller scale, with a slower
  // cadence so the image doesn't compete with the text being read.
  // ===========================================================================
  function setupAboutPortrait() {
    const layerA = document.getElementById('portrait-layer-a');
    const layerB = document.getElementById('portrait-layer-b');
    if (!layerA || !layerB) return;

    const all = getAllPhotos();
    if (all.length === 0) {
      layerA.style.background = '#1a1a1a';
      return;
    }

    startCrossfade({
      layerA, layerB, photos: all,
      intervalMs: 9000,   // slower than landing — visitor is reading text
      fadeMs: 2400
    });
  }

  // ===========================================================================
  // GALLERY PAGE — horizontal warm-to-cold bands
  // ===========================================================================
  function setupGallery() {
    const container = document.querySelector('#home-gallery');
    if (!container) return;

    const all = getAllPhotos();
    if (all.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="margin-top: 2rem;">
          No photographs yet. Drop photos into <code>images/originals/</code> and run <code>optimize-images.bat</code>.
        </div>`;
      return;
    }

    // Group by album, sorted by spectrum order. Photos within each band sort by hue.
    const groups = {};
    all.forEach(p => {
      if (!groups[p.album]) groups[p.album] = [];
      groups[p.album].push(p);
    });
    const slugs = Object.keys(groups).sort((a, b) => spectrumIndex(a) - spectrumIndex(b));
    const bands = slugs.map(slug => {
      const list = groups[slug].sort((a, b) => (a.hue || 0) - (b.hue || 0));
      return {
        name: list[0].albumName,
        hex: list[0].albumHex,
        photos: list
      };
    });

    // Flat list for lightbox navigation
    const photoOrder = [];
    bands.forEach(b => b.photos.forEach(p => photoOrder.push(p)));

    container.innerHTML = `<div class="gallery-bands">${bands.map(band => `
      <div class="gallery-band">
        <div class="home-band-label" style="--band-color: ${band.hex};">
          <span class="home-band-label-dot"></span>
          <span>${escapeHtml(band.name)}</span>
          <span class="home-band-label-count">${band.photos.length} ${band.photos.length === 1 ? 'photo' : 'photos'}</span>
        </div>
        <div class="gallery-band-row">
          ${band.photos.map(p => {
            const photoIdx = photoOrder.indexOf(p);
            const aspect = (p.dispW && p.dispH) ? (p.dispW / p.dispH) : 1.5;
            const basis = Math.round(280 * aspect);
            const blurStyle = p.blur ? `background-image: url('${p.blur}');` : '';
            return `
              <a class="masonry-item protected has-blur" data-spectrum-idx="${photoIdx}" href="#${photoIdx}"
                 style="flex-basis: ${basis}px; ${blurStyle}">
                <img src="images/galleries/${p.album}/display/${p.file}"
                     alt="${escapeHtml(p.albumName)}"
                     loading="lazy" draggable="false"
                     onload="this.parentElement.classList.add('img-loaded')">
                ${cfg.protection.showWatermark ? `<div class="watermark">© ${cfg.ownerName}</div>` : ''}
                <div class="image-shield"></div>
              </a>`;
          }).join('')}
        </div>
      </div>
    `).join('')}</div>`;

    bindMasonryClicks(photoOrder);
  }

  // ===========================================================================
  // LIGHTBOX  — photo + side metadata panel
  // ===========================================================================
  let _lightboxRefs = null;

  function ensureLightbox() {
    if (_lightboxRefs) return _lightboxRefs;
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = `
      <button class="lightbox-prev"  aria-label="Previous">‹</button>
      <button class="lightbox-next"  aria-label="Next">›</button>
      <button class="lightbox-close" aria-label="Close">×</button>

      <div class="lightbox-stage">
        <div class="lightbox-img-wrap">
          <div class="lightbox-photo-frame">
            <img src="" alt="" draggable="false">
            ${cfg.protection.showWatermark ? `<div class="lightbox-watermark">© ${cfg.ownerName}</div>` : ''}
            <div class="image-shield"></div>
          </div>
        </div>

        <aside class="lightbox-side">
          <div class="lightbox-side-block">
            <div class="lightbox-side-label">Original</div>
            <div class="lightbox-side-value" data-dimensions></div>
            <div class="lightbox-side-value-secondary" data-print></div>
          </div>

          <div class="lightbox-side-divider"></div>

          <div class="lightbox-side-block">
            <div class="lightbox-side-label" data-color-label>Color</div>
            <div class="lightbox-side-value">
              <span class="lightbox-side-color-dot" data-color-dot></span>
              <span data-album-name></span>
            </div>
          </div>
        </aside>
      </div>
    `;
    document.body.appendChild(lb);

    const refs = {
      lb,
      img:        lb.querySelector('img'),
      dimEl:      lb.querySelector('[data-dimensions]'),
      printEl:    lb.querySelector('[data-print]'),
      colorDot:   lb.querySelector('[data-color-dot]'),
      colorLabel: lb.querySelector('[data-color-label]'),
      albumName:  lb.querySelector('[data-album-name]'),
      side:       lb.querySelector('.lightbox-side'),
      photoFrame: lb.querySelector('.lightbox-photo-frame'),
    };

    refs.lb.querySelector('.lightbox-close').addEventListener('click', e => { e.stopPropagation(); closeLightbox(); });
    refs.lb.querySelector('.lightbox-prev').addEventListener('click',  e => { e.stopPropagation(); navigateLightbox(-1); });
    refs.lb.querySelector('.lightbox-next').addEventListener('click',  e => { e.stopPropagation(); navigateLightbox( 1); });
    refs.lb.addEventListener('click', e => {
      if (e.target === refs.lb || e.target.classList.contains('lightbox-stage')) closeLightbox();
    });

    document.addEventListener('keydown', e => {
      if (!refs.lb.classList.contains('open')) return;
      if (e.key === 'Escape')     closeLightbox();
      if (e.key === 'ArrowLeft')  navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox( 1);
    });

    _lightboxRefs = refs;
    return refs;
  }

  let _currentList = [];
  let _currentIdx = 0;

  function openLightbox(list, i) {
    _currentList = list;
    _currentIdx = i;
    showLightboxAt(i);
  }
  function navigateLightbox(delta) {
    if (!_currentList.length) return;
    showLightboxAt((_currentIdx + delta + _currentList.length) % _currentList.length);
  }
  function closeLightbox() {
    if (!_lightboxRefs) return;
    _lightboxRefs.lb.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showLightboxAt(i) {
    const refs = ensureLightbox();
    if (!_currentList[i]) return;
    _currentIdx = i;
    const p = _currentList[i];

    // Build image URL — project photos live in a different folder
    const photoPath = p._isProjectPhoto
      ? `images/projects/${p._projectSlug}/display/${p.file}`
      : `images/galleries/${p.album}/display/${p.file}`;
    refs.img.src = photoPath;
    refs.img.alt = p.albumName || '';

    // Original dims + suggested print size
    if (p.origW && p.origH) {
      const ratio = aspectRatioLabel(p.origW, p.origH);
      refs.dimEl.textContent = `${p.origW} × ${p.origH} px${ratio ? ' · ' + ratio : ''}`;
      const ps = suggestedPrintSize(p.origW, p.origH);
      refs.printEl.textContent = ps || '';
    } else {
      refs.dimEl.textContent = '—';
      refs.printEl.textContent = '';
    }

    // Color register: tint label + dot to match the photo's group
    refs.side.style.setProperty('--photo-color', p.albumHex || '#888');
    refs.colorDot.style.setProperty('--photo-color', p.albumHex || '#888');
    refs.albumName.textContent = p.albumName || '';
    // Replace generic "COLOR" label with the album name itself (your choice was BOTH)
    refs.colorLabel.textContent = (p.albumName || 'Color').toUpperCase();

    refs.lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function bindMasonryClicks(orderedList) {
    document.querySelectorAll('.masonry-item').forEach(el => {
      // Re-bind by cloning to drop any previous listeners
      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      clone.addEventListener('click', e => {
        e.preventDefault();
        const idx = parseInt(clone.dataset.spectrumIdx, 10);
        if (!isNaN(idx)) openLightbox(orderedList, idx);
      });
    });
  }

  // ===========================================================================
  // PROJECTS INDEX  (projects.html)
  // ===========================================================================
  function setupProjectsIndex() {
    const container = document.querySelector('#projects-list');
    if (!container) return;

    const projects = (cfg.projects || []);
    if (projects.length === 0) {
      container.innerHTML = `
        <div class="empty-state">No projects yet. Add one in <code>config.js</code>.</div>`;
      return;
    }

    container.innerHTML = projects.map(p => {
      // Cover image: panoramas use <slug>.jpg directly; galleries use the first photo
      let coverPath;
      if ((p.type || 'panorama') === 'gallery') {
        const projectPhotos = (window.PROJECT_PHOTOS && window.PROJECT_PHOTOS[p.slug]) || [];
        coverPath = projectPhotos.length > 0
          ? `images/projects/${p.slug}/display/${projectPhotos[0].file}`
          : ''; // empty gallery — card shows dark bg
      } else {
        coverPath = `images/projects/${p.slug}.jpg`;
      }
      const bgStyle = coverPath ? `background-image: url('${coverPath}');` : '';
      return `
        <a class="project-card" href="project.html?p=${encodeURIComponent(p.slug)}">
          <div class="project-card-image" style="${bgStyle}"></div>
          <div class="project-card-content">
            <div class="project-card-eyebrow">Project</div>
            <h2 class="project-card-title">${escapeHtml(p.title)}</h2>
            ${p.subtitle ? `<p class="project-card-subtitle">${escapeHtml(p.subtitle)}</p>` : ''}
          </div>
        </a>`;
    }).join('');
  }

  // ===========================================================================
  // SINGLE PROJECT PAGE  — scroll-driven horizontal panorama pan
  //
  // The interaction: page scrolls vertically. The .project-pano section is
  // tall (set by JS based on panorama width). Inside it is a sticky block
  // that fills the viewport. As the user scrolls past, we translate the
  // panorama image horizontally by an amount proportional to scroll progress,
  // so vertical scrolling reveals the panorama left-to-right.
  //
  // Pace ("Medium"): scrolling one viewport-height moves the pano one
  // viewport-width. Section height = vh * (panoWidth / vw).
  // ===========================================================================
  function setupProjectPage() {
    const slug = getQueryParam('p');
    const projects = cfg.projects || [];
    const project = projects.find(p => p.slug === slug) || projects[0];

    if (!project) {
      const header = document.querySelector('[data-project-header]');
      if (header) header.innerHTML = `
        <div class="project-header-inner">
          <h1 class="project-title">No project found</h1>
          <p class="project-description"><a href="projects.html" style="border-bottom: 1px solid var(--accent);">← Back to projects</a></p>
        </div>`;
      const pano = document.querySelector('#project-pano');
      if (pano) pano.style.display = 'none';
      const gal = document.querySelector('#project-gallery');
      if (gal) gal.style.display = 'none';
      return;
    }

    document.title = `${project.title} — ${cfg.siteName}`;
    document.querySelector('[data-project-title]').textContent = project.title;
    const sub = document.querySelector('[data-project-subtitle]');
    if (sub) sub.textContent = project.subtitle || '';
    const desc = document.querySelector('[data-project-description]');
    if (desc) desc.textContent = project.description || '';

    // Dispatch on project type
    const type = project.type || 'panorama';
    const pano = document.querySelector('#project-pano');
    const gallery = document.querySelector('#project-gallery');

    if (type === 'gallery') {
      if (pano) pano.style.display = 'none';
      if (gallery) {
        gallery.style.display = '';
        renderProjectGallery(gallery, project);
      }
      // Hide the scroll hint — there's no scroll-pan to invite
      const hint = document.querySelector('.project-scroll-hint');
      if (hint) hint.style.display = 'none';
      return;
    }

    // Default: panorama
    if (gallery) gallery.style.display = 'none';
    setupPanoramaProject(project);
  }

  function renderProjectGallery(container, project) {
    const projectPhotos = (window.PROJECT_PHOTOS && window.PROJECT_PHOTOS[project.slug]) || [];

    if (projectPhotos.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="margin: 4rem auto; max-width: 600px;">
          No photographs in this project yet. Drop photos into
          <code>images/originals-projects/${project.slug}/</code>
          and run <code>optimize-images.bat</code>.
        </div>`;
      return;
    }

    // Augment each photo with album metadata so the lightbox renders correctly
    const albumByLevels = {};
    cfg.colorAlbums.forEach(a => albumByLevels[a.slug] = a);

    // Project gallery photos live at images/projects/<slug>/display/<file>
    // We tag them with album="__project:<slug>" so the existing image
    // path-building knows where to look. We override the path builder via
    // a custom "fullPath" property on each enriched photo.
    const enriched = projectPhotos.map(p => ({
      ...p,
      // Use the photo's classified color album for hue-based sorting and color tints
      // (the optimizer still classifies project photos for the lightbox color register).
      // Photos without recognizable album fall back to a neutral one.
      album: '__project__',
      albumName: project.title,
      albumHex: '#888888',
      _projectSlug: project.slug,
      _isProjectPhoto: true,
    })).sort((a, b) => (a.hue || 0) - (b.hue || 0));

    // Render as a single masonry row (no color bands)
    container.innerHTML = `
      <div class="masonry">
        ${enriched.map((p, i) => {
          const aspect = (p.dispW && p.dispH) ? (p.dispW / p.dispH) : 1.5;
          const basis = Math.round(280 * aspect);
          const blurStyle = p.blur ? `background-image: url('${p.blur}');` : '';
          const path = `images/projects/${project.slug}/display/${p.file}`;
          return `
            <a class="masonry-item protected has-blur" data-spectrum-idx="${i}" href="#${i}"
               style="flex-basis: ${basis}px; ${blurStyle}">
              <img src="${path}"
                   alt="${escapeHtml(project.title)}"
                   loading="lazy" draggable="false"
                   onload="this.parentElement.classList.add('img-loaded')">
              ${cfg.protection.showWatermark ? `<div class="watermark">© ${cfg.ownerName}</div>` : ''}
              <div class="image-shield"></div>
            </a>`;
        }).join('')}
      </div>`;

    // Wire up the lightbox. The existing lightbox builds image URLs from
    // album/file, so we patch each photo with a special path resolver.
    bindMasonryClicks(enriched);
  }

  function setupPanoramaProject(project) {
    const pano = document.querySelector('#project-pano');
    const img  = document.querySelector('#project-pano-image');
    const wrap = document.querySelector('.project-pano-image-wrap');
    if (!pano || !img || !wrap) return;

    pano.classList.add('loading');
    img.alt = project.title;
    img.src = `images/projects/${project.slug}.jpg`;

    img.onerror = () => {
      pano.classList.remove('loading');
      pano.innerHTML = `
        <div class="project-pano-sticky">
          <div style="margin: auto; text-align: center; color: var(--ink-dim); font-family: var(--font-mono); font-size: 0.8rem; letter-spacing: 0.2em; text-transform: uppercase;">
            Panorama not found.<br><br>
            Drop the file into images/originals-projects/${project.slug}.jpg<br>
            and run optimize-images.bat
          </div>
        </div>`;
    };

    img.onload = () => {
      pano.classList.remove('loading');
      configurePanorama();
    };

    function configurePanorama() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const PANO_HEIGHT_FRACTION = 0.70;
      const renderedHeight = vh * PANO_HEIGHT_FRACTION;
      const aspectRatio = img.naturalWidth / img.naturalHeight;
      const renderedWidth = renderedHeight * aspectRatio;

      wrap.style.width = renderedWidth + 'px';

      const horizontalDistance = renderedWidth - vw;

      if (horizontalDistance < vw * 0.5) {
        pano.style.height = '100vh';
        wrap.style.transform = `translateX(${(vw - renderedWidth) / 2}px)`;
        return;
      }

      const scrollDistance = (horizontalDistance / vw) * vh;
      const sectionHeight = vh + scrollDistance;
      pano.style.height = sectionHeight + 'px';

      function update() {
        const rect = pano.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, -rect.top / scrollDistance));
        const x = -progress * horizontalDistance;
        wrap.style.transform = `translateX(${x}px)`;
      }

      let ticking = false;
      function onScroll() {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(() => {
            update();
            ticking = false;
          });
        }
      }
      window.removeEventListener('scroll', _projectScrollHandler);
      window.removeEventListener('resize', _projectResizeHandler);
      _projectScrollHandler = onScroll;
      _projectResizeHandler = configurePanorama;
      window.addEventListener('scroll', _projectScrollHandler, { passive: true });
      window.addEventListener('resize', _projectResizeHandler);

      update();
    }
  }
  let _projectScrollHandler = null;
  let _projectResizeHandler = null;

  // ===========================================================================
  // ALBUM-INDEX RENDERING (galleries.html — kept available)
  // ===========================================================================
  function renderAlbumGrid(container) {
    if (!container) return;
    const html = cfg.colorAlbums.map(album => {
      const count = (photos[album.slug] || []).length;
      return `
        <a class="album-card" href="album.html?album=${album.slug}" style="--album-color: ${album.hex};">
          <div class="album-card-content">
            <div class="album-swatch" style="--album-color: ${album.hex};"></div>
            <h3 class="album-name">${album.name}</h3>
            <p class="album-desc">${album.description}</p>
            <div class="album-count">${count} ${count === 1 ? 'photograph' : 'photographs'}</div>
          </div>
        </a>`;
    }).join('');
    container.innerHTML = html;
  }

  function renderSingleAlbum(container, slug) {
    if (!container) return;
    const album = cfg.colorAlbums.find(a => a.slug === slug);
    if (!album) {
      container.innerHTML = `<div class="empty-state">Album not found.</div>`;
      return;
    }
    const list = (photos[slug] || []).slice().sort((a, b) => (a.hue || 0) - (b.hue || 0))
      .map(p => ({ ...p, album: slug, albumName: album.name, albumHex: album.hex }));
    document.title = `${album.name} — ${cfg.siteName}`;

    const headerEl = document.querySelector('[data-album-header]');
    if (headerEl) {
      headerEl.innerHTML = `
        <div>
          <div class="section-eyebrow" style="color:${album.hex};">Album · ${album.name}</div>
          <h1 class="section-title">${album.description.replace(/\.$/, '')}<em>.</em></h1>
        </div>
        <p class="section-intro">${list.length} ${list.length === 1 ? 'photograph' : 'photographs'} curated around the color <strong style="color:${album.hex};">${album.name.toLowerCase()}</strong>.</p>`;
    }

    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state">No photographs in this album yet.</div>`;
      return;
    }
    container.classList.add('masonry');
    container.innerHTML = list.map((p, i) => {
      const aspectStyle = (p.dispW && p.dispH) ? `aspect-ratio: ${p.dispW}/${p.dispH};` : '';
      const blurStyle = p.blur ? `background-image: url('${p.blur}');` : '';
      return `
        <a class="masonry-item protected has-blur" data-spectrum-idx="${i}" href="#${i}"
           style="${aspectStyle} ${blurStyle}">
          <img src="images/galleries/${slug}/display/${p.file}"
               alt="${escapeHtml(album.name)}"
               loading="lazy" draggable="false"
               width="${p.dispW || ''}" height="${p.dispH || ''}"
               onload="this.parentElement.classList.add('img-loaded')">
          ${cfg.protection.showWatermark ? `<div class="watermark">© ${cfg.ownerName}</div>` : ''}
          <div class="image-shield"></div>
        </a>`;
    }).join('');
    bindMasonryClicks(list);
  }



  // ===========================================================================
  // INIT
  // ===========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page || '';
    fillTextSlots();
    injectChrome(page);
    applyProtection();
    setupPageTransitions(page);

    if (page === 'landing')   setupLanding();
    if (page === 'about')     setupAboutPortrait();
    if (page === 'gallery')   setupGallery();
    if (page === 'galleries') renderAlbumGrid(document.querySelector('#album-grid'));
    if (page === 'projects')  setupProjectsIndex();
    if (page === 'project')   setupProjectPage();
    if (page === 'album') {
      const slug = getQueryParam('album') || cfg.colorAlbums[0].slug;
      renderSingleAlbum(document.querySelector('#gallery'), slug);
    }
  });
})();
