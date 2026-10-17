# Stickocalypse renderer

Deterministic, frame-accurate 2D renderer for 1080x1920 vertical shorts (canvas in headless Chromium, no timers, seeded noise only).

1. **Story**: `story.json` = `{title, subtitle, fps, scenes:[{id,type,narration,caption,start,end,words:[{w,t}],fact_label?,cta?}]}`. `start`/`end`/`words[].t` are absolute seconds; without `start`/`end` it falls back to accumulated `est_seconds` (or a word-count estimate), without `words` they are spread evenly. `story.draft.json` is a complete example.
2. **Scene types**: `title suburb_run highway_jam fact_card leaving_car lanes_movement bike_ride farm_roads barn_sunset basement_heater dog_morning end_card` (unknown types fall back to `highway_jam`).
3. **Preview sheet**: `node render.mjs --story story.json --step 15 --contact --out DIR` renders every 15th frame and builds `DIR/contact.jpg` (one tile per scene).
4. **Single frames**: `node render.mjs --story story.json --at 8.5,36,41.5 --out DIR` (times in seconds, file name = frame index `frame_%05d.png`).
5. **Full render**: `node render.mjs --story story.json --out FRAMES_DIR` (options: `--fps 30 --start S --end E` in seconds, `--step N`, `--workers 4`, `--grain 0.08`, `--quiet`).
6. **Encode**: `./encode.sh FRAMES_DIR narration.m4a out.mp4` (H.264 CRF 18, yuv420p, faststart; silent video if the audio file is missing; audio is clipped to the video length).
7. **Needs**: Node 22 with global playwright (`/opt/node22/lib/node_modules/playwright`), Chromium from `PLAYWRIGHT_BROWSERS_PATH`, ffmpeg, Python 3 + PIL (contact sheet only), fonts in `../fonts/` (Archivo 500/700/800).
8. **Layout**: `render.html` + `scene.js` (timeline, crossfades, `window.renderFrame(t)`) + `src/` (`util` math/RNG, `chars` Sam/zombies/dog/bike, `draw` sky/city/cars/trees, `overlay` captions/subtitles/cards/vignette/grain, `scenes_a|b` the `V.SCENES[type](ctx, localT, scene, globalT)` map).
9. **Determinism**: output depends only on `t` and the story (identical PNG bytes across runs, worker counts and render order); backgrounds, crowds, particles and grain are keyed by seeded hashes.
10. **Speed**: ~8-10 frames/s on 4 cores (PNG encode dominates); disk use is ~3 MB per frame, so keep frames out of the repo (`/tmp/.../frames`).

## Themes (`story.theme`)
- No theme / `"stickocalypse"` = the comic-apocalypse renderer described above (untouched, byte-identical frames). `"theme": "explainer"` = dark "CGI hall" science-explainer motion design (`src/explainer/{theme,icons,scenes,scenes_data}.js`, registered as `V.THEMES.explainer`; `scene.js` header documents the hook).
- Explainer story: `{theme, title, kicker, channel, accent: amber|cyan|green, scenes:[{id, type, narration, caption?, label?, est_seconds | start/end/words}]}`; types `title_card map chart_line chart_bar flow hero fact_stamp compare end_card`, data shapes in `explainer/*/story.json`; `hero` = wolf elk beaver willow river dna cell bacteria virus molecule leaf gear; `map.region` = yellowstone | europe | world; `accent` swaps the primary/secondary colours.
- Timing: real TTS timings (`explainer/wolves`) drive scenes, captions and karaoke subtitles; without `start/end/words` the renderer falls back to `est_seconds` (then word count) and spreads the words evenly. Captions land at +0.4 s, or at 65% of a map/chart/flow/compare scene longer than 8 s; the end card shows the first narration sentence as headline and the rest as subtitles.
- Preview: `node render.mjs --story explainer/wolves/story.json --step 15 --contact --workers 2 --out DIR` (saved sheet: `explainer/wolves/preview_contact.jpg`). Technical labels use the system mono font (DejaVu Sans Mono, then Liberation Mono), everything else Archivo; `--grain N` overrides the theme's 2% grain.
- Audio: `ambience.py` picks a clean tech bed (pad, soft 8th-note ticks in chart/flow scenes, whoosh+thump on title/stamp, swell on compare, decay on the end card; peak -16 dBFS) when `story.theme == "explainer"`; force it with `--theme explainer|stickocalypse`.
