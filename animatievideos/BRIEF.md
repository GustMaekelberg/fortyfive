# Brief for building one HyperFrames test video (1080x1920, 18-22 s, silent)

You are building ONE short vertical advertising video for a product concept, entirely with code:
HTML/CSS/SVG + GSAP, rendered to MP4 by the HyperFrames CLI. No filmed footage, no generative AI
images or video, no network access at render time. The result is a *test video* that a solo seller
will post on Instagram Reels / TikTok / YouTube Shorts, so it must look finished and be honest.

## Where things are
- Workspace root: (de map animatievideos/ in deze repo)
- Your project folder: `videos/<your-slug>/` (already contains `assets/`, `package.json`, `hyperframes.json`, `meta.json`).
  You create `index.html` there. Do NOT edit files outside your own project folder.
- REFERENCE (read it fully first, it is the quality bar and shows every convention):
  `videos/debt-free-date/index.html`, plus `videos/debt-free-date/assets/kit.css` and `assets/kit.js`.
- HyperFrames CLI is installed in the workspace root: run it from inside your project folder as
  `npx hyperframes <command>` (it resolves to the local install). Built-in docs: `npx hyperframes docs <topic>`
  (topics: compositions, data-attributes, gsap, rendering, troubleshooting). Do not install skills, do not
  run `hyperframes init`, `publish`, `share`, `cloud`, `auth` or `telemetry`.
- GSAP 3.15 and plugins are vendored in `assets/vendor/` (gsap.min.js, DrawSVGPlugin.min.js,
  MotionPathPlugin.min.js, MorphSVGPlugin.min.js, SplitText.min.js, CustomEase.min.js). Fonts are in
  `assets/fonts/` and declared in kit.css (Archivo 500-900, Inter, Baloo 2, JetBrains Mono, DM Serif Display).
  If you need another npm package for a build-time calculation, install it in the workspace root
  (`npm install <pkg>` there) and use it only in a Node script, never at render time.

## Hard rules of the framework (see the reference)
1. Root: `<div id="root" data-composition-id="main" data-start="0" data-duration="N" data-width="1080" data-height="1920">`.
2. Every scene is a child with `class="clip"`, `data-start`, `data-duration`. The runtime shows a clip only inside its window.
3. ONE paused GSAP timeline registered as `window.__timelines["main"]`; end the script with `tl.seek(0)`.
   Pad the timeline to the full duration (`tl.to({}, {duration: 0.01}, N - 0.01)`).
4. Deterministic only: no `Math.random()`, no `Date`, no fetch. Use `K.rng(seed)` from kit.js for pseudo-random layouts.
5. Never put a CSS `transform` on an element whose same transform property GSAP animates with percent values
   (the wipe bug: CSS translate + GSAP yPercent add up). Let GSAP own it (`gsap.set`).
6. `fromTo()` tweens render their "from" state immediately; use `tl.set(..., 0)` for elements that must start hidden.
7. Animated numbers: use `K.count()` (onUpdate text). Any state changed in onUpdate must be a pure function of the tween value.

## Layout rules (these come from the platforms, not taste)
- TEXT-SAFE BOX: all text that must be read sits inside `.safe` (x 120-888, y 296-1248; 768 px wide, left-aligned).
  Below 544 px inside `.safe` keep text within the first 660 px of width (TikTok's button column).
  Illustrations and tiles may bleed outside the box; put pure decoration in a full-frame layer with `data-layout-ignore`.
- The first frame (t = 0) is the thumbnail: the hook text and the key image must already be visible at t = 0
  (animate them from a slightly offset/over-scaled state, never from opacity 0).
- Reading time: a line must stay on screen at least 0.5 s + 0.3 s per word.
- No dead air: something should be moving at all times (see the bobbing decoration in the reference), and no
  stretch longer than ~0.7 s without a new beat in the foreground.
- Minimum font sizes on the 1080-wide canvas: 28 px for fine print, 40 px for labels, 56 px+ for statements.
- Contrast: white text only on colours dark enough (the kit's green/red are tuned for this); check the tool's verdict.

## Story structure (keep this order)
1. HOOK (0-3 s): one concrete, true, slightly surprising statement + the key image. Present at frame 0.
2. PROBLEM (about 3-7 s): show the pain as a little cartoon/diagram, not as a paragraph.
3. PRODUCT DEMO (about 7-14 s): the product doing its job, animated: a sheet filling in, a poster drawing itself,
   a clip being assembled. This is the heart: make it satisfying to watch.
4. RESULT (about 14-17 s): one number or before/after that proves the point.
5. CTA (last ~3 s): invented product name, one-line promise, a button, "Link in bio", and a price hint if the brief gives one.
Use the full-screen wipe (`K.wipe`) between scenes like the reference does.

## Style
- Same family as the reference: flat cartoon look, thick ink outlines (6 px), hard offset shadows, rounded tiles,
  big left-aligned Archivo type, a slow-moving decoration layer. Override the CSS variables in your own `<style>`
  to use the palette given in your task so each video has its own identity.
- Give at least one object a bit of character (a face, a wobble, a reaction) where it suits the product.
- Draw illustrations as inline SVG (or CSS shapes). No emoji as illustration (font support differs), no external images.

## Honesty rules (non-negotiable)
- Every number on screen is either computed by a small Node script that you save in your project folder as
  `calc.mjs` (and whose output you copy into the video), or is obviously the viewer's own input in an example.
  Add a small "Example ..." line where numbers are illustrative.
- No invented reviews, star ratings, customer counts, "as seen on", "#1", "best", guarantees of results, or urgency
  ("only today"). No health, safety, legal, tax or investment advice; finance/tax videos carry "Not financial advice"
  or "Not tax advice" in the CTA scene.
- No real brand names, logos, race names, app names or people. Invent neutral names. Product names you invent must
  be generic-descriptive.
- The product is a concept: show a believable mock of it, never claim sales or users.

## Workflow (do all of it)
1. Read the reference files and the research notes named in your task; write a 5-scene storyboard with timings (in your head or as an HTML comment at the top of index.html).
2. Write `index.html`. Then loop:
   - `npx hyperframes check 2>&1 | grep -v "\[hyperframes\] check:"` until it prints "Check passed" with 0 errors.
     Fix every `outside_safe_zone`, `text_occluded`, `content_overlap`, contrast and `line_unread` finding properly
     (use the `data-layout-allow-*` escape hatches only for genuinely intentional, transient overlaps, as the reference does).
     These warnings are acceptable and can be ignored: `nested_structure_needs_subcomposition`,
     `timeline_track_too_dense`, `film_silent`, `audio_none`.
   - `npx hyperframes snapshot --at <12-14 timestamps spread over all scenes, including 0 and mid-transition moments>`
     then LOOK at the contact-sheet JPGs it prints (open them with the Read tool) and judge them like an art director:
     alignment, overlaps, cut-off text, empty areas, ugly shapes, anything that looks broken or amateur. Fix and repeat.
     Do at least two look-and-fix rounds.
3. Render: `npx hyperframes render -q standard -w 2 -o out/<your-slug>.mp4` and verify with
   `ffprobe -v error -show_entries format=duration,size -of default=nw=1 out/<your-slug>.mp4`.
4. Reply with: the MP4 path, duration, a one-line description of each scene, every number shown and where it comes
   from, the invented product name and price shown, and any imperfection you could not fix.
