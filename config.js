// =============================================================================
// PHOTOS BY SYL — SITE CONFIGURATION
// =============================================================================
// This is the ONLY file you need to edit to change site-wide settings.
// Save the file and refresh your browser to see changes.
// =============================================================================

window.SITE_CONFIG = {

  // ---- YOUR IDENTITY -------------------------------------------------------
  siteName: "Photos by Syl",
  tagline: "Light, distance, and wild things.",
  ownerName: "Syl",                         // Used in copyright + watermarks
  copyrightYear: 2026,

  // ---- SOCIAL (leave blank to hide) ----------------------------------------
  social: {
    instagram: "photosby_syl",              // your Instagram handle (no @)
    flickr: "",
    "500px": ""
  },

  // ---- COLOR ALBUMS --------------------------------------------------------
  // Each album has a slug, a display name, a description, and a hex color
  // used as the *anchor* for AUTOMATIC photo classification.
  // The optimizer script analyzes each photo's dominant color and assigns
  // it to whichever album anchor it's closest to.
  //
  // To add an album: add a new entry below. Photos will be re-classified
  // into it automatically the next time you run the optimizer.
  // ---------------------------------------------------------------------------
  colorAlbums: [
    { slug: "azure",      name: "Azure",      hex: "#3a6ea5", description: "Skies, water, distance." },
    { slug: "amber",      name: "Amber",      hex: "#c8893a", description: "Golden hour, warmth, dust." },
    { slug: "verdant",    name: "Verdant",    hex: "#4a7c59", description: "Forests, moss, life." },
    { slug: "crimson",    name: "Crimson",    hex: "#a23b3b", description: "Fire, autumn, blood-orange skies." },
    { slug: "monochrome", name: "Monochrome", hex: "#888888", description: "Black, white, and the silence between." },
    { slug: "earth",      name: "Earth",      hex: "#7a5c3a", description: "Rock, sand, the colors of patience." }
  ],

  // ---- IMAGE PROTECTION ----------------------------------------------------
  protection: {
    disableRightClick: true,
    disableDrag: true,
    disableKeyboardShortcuts: true,
    showWatermark: true
  },

  // ---- SHOP ----------------------------------------------------------------
  shop: {
    enabled: true,
    placeholderText: "Limited-edition prints coming soon. For commissions or current availability, please get in touch."
  },

  // ---- PROJECTS ------------------------------------------------------------
  // Each project has a type:
  //   - "panorama"  : ONE wide-format image with scroll-driven horizontal pan
  //                   (drop a single file into images/originals-projects/<slug>.jpg)
  //   - "gallery"   : a COLLECTION of photos shown in a masonry grid
  //                   (drop photos into images/originals-projects/<slug>/)
  // ---------------------------------------------------------------------------
  projects: [
    {
      slug: "nathan-road",
      type: "panorama",
      title: "Nathan Road",
      subtitle: "Hong Kong",
      description: "A long, slow look at one of Hong Kong's most photographed streets. Scroll to walk it, end to end."
    },
    {
      slug: "sky",
      type: "gallery",
      title: "Sky",
      subtitle: "After dark",
      description: "Long exposures, patient nights. Photographs taken when most people had gone to bed."
    }
    // Add more projects here as you make them.
  ]
};
