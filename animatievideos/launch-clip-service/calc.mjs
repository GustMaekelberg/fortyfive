// Build-time only: every number shown in the video comes from here (or is a format name).
// Run from this folder: node calc.mjs > calc-output.txt
//
// Source of the offer: research_notes/Producten voor animatievideos gemaakt met code/animatievaardigheid_verkopen.md,
// section 8, offer 1 "Launch Clip in 72 hours": price $290 intro (rising to $490 later), delivered as
// 16:9 + 9:16 + 1:1, first customers won with a free 10-second teaser of *their* product.

const OFFER = { introPrice: 290, laterPrice: 490, deliveryHours: 72, teaserSeconds: 10 };
const FORMATS = [
  { name: "16:9", w: 16, h: 9 },
  { name: "1:1", w: 1, h: 1 },
  { name: "9:16", w: 9, h: 16 },
];

// --- CTA price: the intro price the research recommends for the first clients
console.log(`// price shown: $${OFFER.introPrice} flat (intro; research: later $${OFFER.laterPrice})`);
console.log(`// teaser shown: free ${OFFER.teaserSeconds}-second teaser`);
console.log(`// formats: ${FORMATS.length}  (${FORMATS.map((f) => f.name).join(", ")})`);

// --- Result timeline: 3 beats over the 72-hour window. Positions as fraction of the bar.
const BEATS = [
  { label: "Send link", h: 0 },
  { label: "Storyboard", h: 24 },
  { label: "Clip delivered", h: OFFER.deliveryHours },
];
BEATS.forEach((b) => console.log(`// beat "${b.label}" at ${b.h}h -> ${(b.h / OFFER.deliveryHours * 100).toFixed(2)}% of bar`));

// --- Format frames: fit each aspect ratio into a shared 260px-tall row, max 360px wide
const ROW_H = 260, MAX_W = 360;
const frames = FORMATS.map((f) => {
  let h = ROW_H, w = Math.round(ROW_H * f.w / f.h);
  if (w > MAX_W) { w = MAX_W; h = Math.round(MAX_W * f.h / f.w); }
  return { ...f, pw: w, ph: h };
});
console.log("const FRAMES = " + JSON.stringify(frames.map(({ name, pw, ph }) => ({ name, pw, ph }))) + ";");
const gap = 20;
console.log(`// frames row width: ${frames.reduce((s, f) => s + f.pw, 0) + gap * (frames.length - 1)}px (row may bleed 40px left of the safe box; labels stay inside)`);

// --- WCAG contrast of the palette pairs used for text
const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (s) => { const [r, g, b] = hex(s).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
[["#ffffff", "#6a4dff"], ["#ffffff", "#5a3df0"], ["#14143a", "#ff4d8d"], ["#14143a", "#19c99a"], ["#14143a", "#ffd23f"], ["#14143a", "#eef1ff"], ["#ffffff", "#14143a"], ["#4a4a6a", "#eef1ff"]]
  .forEach(([fg, bg]) => console.log(`// contrast ${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}:1`));
