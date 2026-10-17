#!/usr/bin/env node
// Deterministic frame renderer: node render.mjs --story story.json [--fps 30] [--start 0] [--end 999] [--step 1] [--out DIR] [--contact] [--workers N] [--at t1,t2,..]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = { story: path.join(here, 'story.json'), fps: null, start: 0, end: 999, step: 1, out: '/tmp/claude-0/-home-user-fortyfive/6d5226d3-2e56-52d2-afbb-5d90b31b8433/scratchpad/frames', contact: false, workers: Math.min(4, os.cpus().length), at: null, grain: null, quiet: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i], nx = () => argv[++i];
  if (a === '--story') opt.story = nx(); else if (a === '--fps') opt.fps = +nx(); else if (a === '--start') opt.start = +nx();
  else if (a === '--end') opt.end = +nx(); else if (a === '--step') opt.step = Math.max(1, +nx() | 0); else if (a === '--out') opt.out = nx();
  else if (a === '--contact') opt.contact = true; else if (a === '--workers') opt.workers = Math.max(1, +nx() | 0);
  else if (a === '--at') opt.at = nx().split(',').map(Number); else if (a === '--grain') opt.grain = +nx(); else if (a === '--quiet') opt.quiet = true;
  else { console.error('unknown arg', a); process.exit(2); }
}
const story = JSON.parse(fs.readFileSync(path.resolve(opt.story), 'utf8'));
if (opt.fps) story.fps = opt.fps; story.fps = story.fps || 30;
const fps = story.fps;
fs.mkdirSync(opt.out, { recursive: true });

const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-web-security', '--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
async function makePage() {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { console.error('PAGE ERROR:', e.message); });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('console.' + m.type() + ':', m.text()); });
  await page.addInitScript(({ s, g }) => { window.STORY = s; if (g != null) window.RENDER_OPTS = { grain: g }; }, { s: story, g: opt.grain });
  await page.goto('file://' + path.join(here, 'render.html'));
  const ok = await page.evaluate(() => window.__ready);
  if (!ok) throw new Error('Archivo font failed to load');
  return page;
}
const first = await makePage();
const tl = await first.evaluate(() => { window.renderFrame(0); return window.TIMELINE; });
const total = tl.total;
let frames = [];
if (opt.at) frames = opt.at.map((t) => Math.round(t * fps));
else {
  const i0 = Math.max(0, Math.round(opt.start * fps)), i1 = Math.min(Math.ceil(total * fps), Math.round(opt.end * fps));
  for (let i = i0; i < i1; i += opt.step) frames.push(i);
}
const nW = Math.min(opt.workers, Math.max(1, frames.length));
const pages = [first];
for (let i = 1; i < nW; i++) pages.push(await makePage());
let cursor = 0, done = 0;
const t0 = Date.now();
await Promise.all(pages.map(async (page) => {
  while (true) {
    const k = cursor++; if (k >= frames.length) break;
    const idx = frames[k];
    const url = await page.evaluate((t) => { window.renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }, idx / fps);
    await fs.promises.writeFile(path.join(opt.out, `frame_${String(idx).padStart(5, '0')}.png`), Buffer.from(url.slice(22), 'base64'));
    done++;
    if (!opt.quiet && done % 30 === 0) process.stderr.write(`\r${done}/${frames.length} frames  ${(done / ((Date.now() - t0) / 1000)).toFixed(1)} fps`);
  }
}));
const secs = (Date.now() - t0) / 1000;
console.error(`${opt.quiet ? '' : '\n'}rendered ${frames.length} frames in ${secs.toFixed(1)}s = ${(frames.length / secs).toFixed(2)} frames/s (${nW} workers) -> ${opt.out}`);
await browser.close();

if (opt.contact) {
  // one tile per scene (frame nearest to 55% of the scene that was rendered), or ~12 evenly spaced frames for long stories
  const have = new Set(frames);
  const pick = [];
  if (tl.scenes.length <= 20) {
    for (const sc of tl.scenes) {
      const target = Math.round((sc.start + (sc.end - sc.start) * 0.55) * fps);
      let best = null; for (const f of frames) if (f >= sc.start * fps - 1 && f <= sc.end * fps && (best === null || Math.abs(f - target) < Math.abs(best - target))) best = f;
      if (best !== null) pick.push([best, sc.type]);
    }
  }
  if (!pick.length) { const n = Math.min(12, frames.length); for (let i = 0; i < n; i++) pick.push([frames[Math.floor(i * (frames.length - 1) / Math.max(1, n - 1))], '']); }
  const args = ['-I', path.join(here, 'contact.py'), path.join(opt.out, 'contact.jpg'), ...pick.map(([f, l]) => `${path.join(opt.out, `frame_${String(f).padStart(5, '0')}.png`)}|${l} ${(f / fps).toFixed(1)}s`)];
  const r = spawnSync('python3', args, { stdio: 'inherit' });
  if (r.status !== 0) console.error('contact sheet failed');
  else console.error('contact sheet ->', path.join(opt.out, 'contact.jpg'));
}
