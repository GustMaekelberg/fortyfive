/* explainer/theme.js — the "explainer" theme: dark CGI-hall motion graphics (thin glowing lines, perspective grid floor,
   letter-spaced technical labels, big numbers, amber / cyan accents on near-black navy).

   Registers V.THEMES.explainer, which scene.js consults when story.theme === 'explainer':
     init(story, TL)        palette from story.accent, dust / stamp state from the timeline
     background(g, t, env)  gradient, stage light, perspective floor grid, dust  (continuous across scenes)
     scene(type)            -> wrapped scene fn (scene content + its caption, drawn on a transparent layer) or null
     overlay(g, env)        frame chrome, progress line, karaoke subtitles
     finish / grain         vignette, transition flash, film grain
   Helpers shared by icons.js / scenes.js / scenes_data.js live on V.X. Everything is a pure function of t. */
(() => {
  const V = window.V;
  const { W, H, PI2, clamp, lerp, sstep, easeOut, rng, rgba } = V;
  const X = (V.X = V.X || {});
  V.THEMES = V.THEMES || {};

  /* ------------------------------------------------------------------ palette & fonts */
  const ACCENTS = { amber: ['#FFB13B', '#4FD1FF'], cyan: ['#4FD1FF', '#FFB13B'], green: ['#7CFF9B', '#FFB13B'] };
  const P = (X.P = { A: '#FFB13B', B: '#4FD1FF', text: '#E8ECF4', muted: '#8A93A8', line: 'rgba(232,236,244,0.35)', neg: '#FF6B6B', ink: '#05070D', panel: 'rgba(7,11,22,0.86)' });
  X.setAccent = (name) => { const a = ACCENTS[String(name || 'amber').toLowerCase()] || ACCENTS.amber; P.A = a[0]; P.B = a[1]; };
  X.MONO = '"DejaVu Sans Mono","Liberation Mono",Menlo,Consolas,monospace';
  X.SANS = 'Archivo, "Arial Black", sans-serif';
  X.fSans = (wt, px) => `${wt} ${px}px ${X.SANS}`;
  X.fMono = (wt, px) => `${wt} ${px}px ${X.MONO}`;
  const HOR = (X.HOR = 1180);                       // horizon line of the floor grid
  X.story = null;

  /* ------------------------------------------------------------------ text helpers */
  const mc = V.mk(8, 8).getContext('2d');
  X.meas = (str, font, lsPx = 0) => { mc.font = font; mc.letterSpacing = lsPx + 'px'; return mc.measureText(str).width - lsPx; };
  // upper-case words, but leave tokens with digits / sub- & superscripts alone (m³, N₂, 2³⁰, mg/l, °C)
  X.up = (s) => String(s == null ? '' : s).split(/(\s+)/).map((w) => (/[0-9²³¹⁰⁴-⁹₀-₉°]/.test(w) ? w : w.toUpperCase())).join('');

  /* X.text(c, str, x, y, o): y is the visual centre of the capitals (not the baseline).
     o: size, wt, mono, ls (em), color, alpha, align(left|center|right), glow (blur px), glowColor, shadow, up (uppercase) */
  X.text = (c, str, x, y, o = {}) => {
    const size = o.size || 40, ls = (o.ls || 0) * size;
    const font = o.mono ? X.fMono(o.wt || 400, size) : X.fSans(o.wt || 800, size);
    str = o.up ? X.up(str) : String(str);
    c.save();
    c.font = font; c.letterSpacing = ls + 'px'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const w = c.measureText(str).width - ls;
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    const by = y + (o.mono ? 0.365 : 0.35) * size;
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.shadow) { c.shadowColor = o.shadow.color || 'rgba(0,0,0,0.7)'; c.shadowBlur = o.shadow.blur ?? 12; c.shadowOffsetY = o.shadow.dy ?? 3; }
    if (o.glow) {
      c.shadowColor = o.glowColor || rgba(P.A, 0.5); c.shadowBlur = o.glow; c.shadowOffsetY = 0;
      c.fillStyle = o.color || P.text; c.fillText(str, x0, by);
      if (o.glow2) c.fillText(str, x0, by);
      c.shadowColor = 'transparent'; c.shadowBlur = 0;
    }
    c.fillStyle = o.color || P.text; c.fillText(str, x0, by);
    c.restore();
    return w;
  };
  // technical label: mono, letter-spaced, uppercase, muted by default
  X.tech = (c, str, x, y, o = {}) => X.text(c, str, x, y, Object.assign({ size: 26, mono: true, wt: 400, ls: 0.16, color: P.muted, up: true }, o));
  // shrink a size so that str fits maxW; returns the size
  X.fit = (str, o, maxW, size0, minSize = 24) => {
    const font = (s) => (o.mono ? X.fMono(o.wt || 400, s) : X.fSans(o.wt || 800, s));
    const w = X.meas(str, font(size0), (o.ls || 0) * size0);
    return w <= maxW ? size0 : Math.max(minSize, size0 * maxW / w);
  };
  // greedy word wrap to maxW (Archivo / mono per o); returns lines
  X.wrap = (str, o, maxW, size) => {
    const font = o.mono ? X.fMono(o.wt || 400, size) : X.fSans(o.wt || 800, size), ls = (o.ls || 0) * size;
    const words = String(str).split(/\s+/).filter(Boolean), lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (cur && X.meas(t, font, ls) > maxW) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  /* ------------------------------------------------------------------ 3D helpers (icosahedron wireframe) */
  X.icosa = (() => {
    const p = (1 + Math.sqrt(5)) / 2, v = [];
    for (const a of [-1, 1]) for (const b of [-p, p]) { v.push([0, a, b]); v.push([a, b, 0]); v.push([b, 0, a]); }
    const e = [];
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) {
      const d = Math.hypot(v[i][0] - v[j][0], v[i][1] - v[j][1], v[i][2] - v[j][2]);
      if (Math.abs(d - 2) < 1e-6) e.push([i, j]);
    }
    return { v, e };
  })();
  // rotate a 3-vector by yaw (y axis) and pitch (x axis), then perspective-project around (cx,cy) with scale s
  X.proj = (p, yaw, pitch, cx, cy, s, persp = 0.18) => {
    let [x, y, z] = p;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw); [x, z] = [x * cyw + z * syw, -x * syw + z * cyw];
    const cp = Math.cos(pitch), sp = Math.sin(pitch); [y, z] = [y * cp - z * sp, y * sp + z * cp];
    const k = 1 / (1 - z * persp * 0.5);
    return [cx + x * s * k, cy + y * s * k, z];
  };
  /* ------------------------------------------------------------------ number formatting */
  X.fmtInt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  X.fmtVal = (v) => {
    const a = Math.abs(v);
    if (a >= 1000) return X.fmtInt(v);
    if (a >= 100) return String(Math.round(v));
    if (a >= 10) return String(+v.toFixed(1));
    if (a >= 1) return String(+v.toFixed(2));
    if (a === 0) return '0';
    return String(+v.toPrecision(2));
  };
  // "nice" axis ticks for 0..max (or min..max): returns {ticks:[...], dec}
  X.niceTicks = (min, max) => {
    const span = max - min; let best = null;
    for (let e = -4; e <= 7; e++) for (const m of [1, 1.5, 2, 2.5, 3, 4, 5]) {
      const step = m * Math.pow(10, e), n = Math.floor(span / step + 1e-9) + 1;
      if (n < 4 || n > 6) continue;
      const aligned = Math.abs(min + (n - 1) * step - max) < 1e-9 * Math.max(1, Math.abs(max));
      const score = Math.abs(n - 5) + (n === 5 ? 0 : 0.01) - (aligned ? 1.5 : 0);
      if (!best || score < best.score) best = { step, n, score };
    }
    if (!best) best = { step: span / 4, n: 5 };
    const ticks = []; for (let i = 0; i < best.n; i++) ticks.push(+(min + i * best.step).toFixed(10));
    let dec = 0; for (const v of ticks) { const t = String(+v.toFixed(4)), k = t.indexOf('.') < 0 ? 0 : t.length - t.indexOf('.') - 1; dec = Math.max(dec, k); }
    return { ticks, dec };
  };
  X.fmtTick = (v, dec) => { const s = Math.abs(v) >= 1000 ? X.fmtInt(v) : v.toFixed(dec); return s; };

  /* ------------------------------------------------------------------ geometry / stroke helpers */
  X.polyLen = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  // the first fraction u of a polyline: {pts, head}
  X.partial = (pts, u) => {
    u = clamp(u);
    if (u <= 0) return { pts: [pts[0]], head: pts[0] };
    const target = X.polyLen(pts) * u; let acc = 0; const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + seg >= target - 1e-9) {
        const f = seg ? (target - acc) / seg : 0, p = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
        out.push(p); return { pts: out, head: p };
      }
      acc += seg; out.push(pts[i]);
    }
    return { pts: out, head: pts[pts.length - 1] };
  };
  // point + tangent at fraction u along a polyline
  X.along = (pts, u) => {
    const total = X.polyLen(pts), target = clamp(u) * total; let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], seg = Math.hypot(dx, dy);
      if (acc + seg >= target - 1e-9 || i === pts.length - 1) { const f = seg ? clamp((target - acc) / seg) : 0; return { x: pts[i - 1][0] + dx * f, y: pts[i - 1][1] + dy * f, ang: Math.atan2(dy, dx) }; }
      acc += seg;
    }
    return { x: pts[0][0], y: pts[0][1], ang: 0 };
  };
  /* X.path(c, pts, o): o.w, o.color, o.alpha, o.glow (blur), o.closed, o.fill, o.dash [on,off], o.dashOff, o.cap */
  X.path = (c, pts, o = {}) => {
    if (!pts || pts.length < 2) return;
    c.save();
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (o.closed) c.closePath();
    c.lineJoin = o.join || 'round'; c.lineCap = o.cap || 'round';
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
    if (o.dash) { c.setLineDash(o.dash); c.lineDashOffset = o.dashOff || 0; }
    c.lineWidth = o.w || 2; c.strokeStyle = o.color || P.text;
    if (o.glow) { c.shadowColor = o.glowColor || o.color || P.A; c.shadowBlur = o.glow; c.stroke(); if (o.glow2) c.stroke(); c.shadowBlur = 0; c.shadowColor = 'transparent'; }
    c.stroke();
    c.restore();
  };
  X.circle = (c, x, y, r, o = {}) => {
    c.save(); c.beginPath(); c.arc(x, y, Math.max(0.01, r), 0, PI2);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.fill) { c.fillStyle = o.fill; if (o.glow) { c.shadowColor = o.glowColor || o.fill; c.shadowBlur = o.glow; } c.fill(); c.shadowBlur = 0; }
    if (o.color) { c.lineWidth = o.w || 2; c.strokeStyle = o.color; if (o.glow && !o.fill) { c.shadowColor = o.glowColor || o.color; c.shadowBlur = o.glow; } c.stroke(); }
    c.restore();
  };
  X.rrect = (c, x, y, w, h, r, o = {}) => {
    c.save(); c.beginPath(); V.rr(c, x, y, w, h, r);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (o.fill) { c.fillStyle = o.fill; c.fill(); }
    if (o.color) { c.lineWidth = o.w || 2; c.strokeStyle = o.color; if (o.glow) { c.shadowColor = o.glowColor || o.color; c.shadowBlur = o.glow; } c.stroke(); }
    c.restore();
  };
  // small L-shaped corner bracket at (x,y); sx,sy = ±1 point the arms inward
  X.bracket = (c, x, y, sx, sy, len = 36) => { c.beginPath(); c.moveTo(x + sx * len, y); c.lineTo(x, y); c.lineTo(x, y + sy * len); c.stroke(); };
  /* ------------------------------------------------------------------ caches: base gradient, vignette */
  let bgCv = null, vigCv = null;
  function initCaches() {
    bgCv = V.mk(W, H); let c = bgCv.getContext('2d');
    c.fillStyle = V.lg(c, 0, 0, 0, H, [[0, '#05070D'], [1, '#0B1020']]); c.fillRect(0, 0, W, H);
    vigCv = V.mk(W, H); c = vigCv.getContext('2d');
    c.translate(W / 2, H * 0.5); c.scale(0.78, 1);
    const g = c.createRadialGradient(0, 0, 420, 0, 0, 1180);
    g.addColorStop(0, 'rgba(2,3,8,0)'); g.addColorStop(0.45, 'rgba(2,3,8,0.22)'); g.addColorStop(0.78, 'rgba(2,3,8,0.58)'); g.addColorStop(1, 'rgba(2,3,8,0.90)');
    c.fillStyle = g; c.fillRect(-W, -H, W * 2, H * 2);
  }

  /* ------------------------------------------------------------------ background: stage light, floor grid, dust */
  const STAMP_T = 0.4;                               // caption / stamp lands this long after the scene starts
  let stamps = [], DUST = [];
  function stampState(t) {
    let dark = 0, pulse = 0, wave = -1, pull = 0;
    for (const s of stamps) {
      const d = sstep(s.start - 0.1, s.start + 0.45, t) * (1 - sstep(s.end - 0.1, s.end + 0.35, t));
      dark = Math.max(dark, d);
      const dt = t - (s.start + STAMP_T);
      if (dt >= 0 && dt < 2.2) {
        const pl = Math.exp(-dt * 2.6) * sstep(0, 0.06, dt);
        if (pl > pulse) { pulse = pl; wave = clamp(dt / 1.1); }
      }
      if (dt >= 0) pull = Math.max(pull, 0.09 * sstep(0, 0.7, dt) * (1 - sstep(s.end - 0.1, s.end + 0.4, t)));
    }
    return { dark, pulse, wave, pull };
  }

  const GRID = { K: 500, DZ: 0.42, SPEED: 0.15, GX: 215 };
  function drawGrid(g, t, st) {
    const { K, DZ, SPEED, GX } = GRID, sway = Math.sin(t * 0.21) * 9, vx = 540 + sway;
    const base = 0.115 * (1 + st.pulse * 1.6);
    const zOff = (t * SPEED) % DZ;
    g.save();
    g.beginPath(); g.rect(0, HOR + 1, W, H - HOR); g.clip();
    g.lineWidth = 1.5; g.lineCap = 'butt';
    // radial (depth) lines
    const gr = g.createLinearGradient(0, HOR, 0, H);
    gr.addColorStop(0, 'rgba(120,140,190,0)'); gr.addColorStop(0.28, `rgba(120,140,190,${(base * 0.95).toFixed(4)})`); gr.addColorStop(1, `rgba(120,140,190,${(base * 1.15).toFixed(4)})`);
    g.strokeStyle = gr; g.beginPath();
    for (let m = -10; m <= 10; m++) { g.moveTo(vx, HOR); g.lineTo(vx + (m + 0.5) * GX, H); }
    g.stroke();
    // horizontal lines, scrolling toward the camera (z decreases)
    for (let n = 0; n < 60; n++) {
      const z = 0.5 + n * DZ - zOff, y = HOR + K / z;
      if (y > H + 4) continue;
      if (y < HOR + 1.5) break;
      const off = y - HOR;
      let a = base * sstep(2, 240, off) * (0.9 + 0.1 * sstep(300, 700, off));
      if (st.wave >= 0) { const yw = HOR + (H - HOR) * st.wave * st.wave; a += 0.42 * st.pulse * Math.exp(-Math.pow((y - yw) / 80, 2)) * sstep(30, 280, off); }
      if (a < 0.004) continue;
      g.strokeStyle = `rgba(120,140,190,${Math.min(0.9, a).toFixed(4)})`;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }
    g.restore();
  }

  X.background = (g, t, env) => {
    if (!bgCv) initCaches();
    const st = stampState(t);
    g.drawImage(bgCv, 0, 0);
    // stage light behind the subject + a pool on the floor
    const breathe = 1 + 0.10 * Math.sin(t * 0.7);
    V.glow(g, 540, 800, 700, P.A, 0.08 * breathe, 1.12, 1);
    V.glow(g, 540, HOR + 70, 520, P.A, 0.07 * breathe, 1.0, 0.16);
    // horizon haze + line
    g.fillStyle = V.lg(g, 0, HOR - 120, 0, HOR, [[0, 'rgba(79,209,255,0)'], [1, 'rgba(79,209,255,0.035)']]); g.fillRect(0, HOR - 120, W, 120);
    g.fillStyle = V.lg(g, 0, HOR, 0, HOR + 260, [[0, 'rgba(120,140,190,0.05)'], [1, 'rgba(120,140,190,0)']]); g.fillRect(0, HOR, W, 260);
    drawGrid(g, t, st);
    if (st.wave >= 0 && st.pulse > 0.01) V.glow(g, 540, HOR + (H - HOR) * st.wave * st.wave, 640, P.A, 0.11 * st.pulse * sstep(10, 200, HOR + (H - HOR) * st.wave * st.wave - HOR), 1.6, 0.05);
    g.save();
    g.strokeStyle = V.lg(g, 0, 0, W, 0, [[0, 'rgba(170,190,240,0)'], [0.5, `rgba(170,190,240,${0.32 + 0.4 * st.pulse})`], [1, 'rgba(170,190,240,0)']]);
    g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, HOR); g.lineTo(W, HOR); g.stroke();
    g.restore();
    V.glow(g, 540, HOR, 460, P.A, 0.10 + 0.12 * st.pulse, 1, 0.045);
    // dust
    g.save();
    for (const d of DUST) {
      let x = ((d.x0 + t * d.vx + Math.sin(t * d.f + d.ph) * d.sw) % (W + 40) + W + 40) % (W + 40) - 20;
      let y = ((d.y0 - t * d.vy) % (H + 40) + H + 40) % (H + 40) - 20;
      if (st.pull > 0) { x += (540 - x) * st.pull; y += (900 - y) * st.pull; }
      const a = d.a * (0.65 + 0.35 * Math.sin(t * d.tw + d.ph * 3));
      g.fillStyle = d.acc ? rgba(P.A, a) : `rgba(200,214,255,${a.toFixed(3)})`;
      g.beginPath(); g.arc(x, y, d.r, 0, PI2); g.fill();
    }
    g.restore();
    if (st.dark > 0.002) { g.fillStyle = `rgba(2,3,8,${0.16 * st.dark})`; g.fillRect(0, 0, W, H); }
  };

  /* ------------------------------------------------------------------ chrome, subtitles */
  const labelOf = (s) => (s.type === 'title_card' || s.type === 'end_card' ? '' : String(s.label || (X.story && X.story.kicker) || ''));
  function chromeLabel(g, text, a) {
    if (!text || a <= 0.003) return;
    g.save(); g.globalAlpha *= a;
    let size = 30; const ls = 0.18;
    const w = X.meas(X.up(text), X.fMono(400, size), ls * size);
    if (w > 640) size = 30 * 640 / w;
    X.circle(g, 92, 338, 5.5, { fill: P.A, glow: 14 });
    X.text(g, text, 112, 338, { size, mono: true, ls, color: P.text, up: true, alpha: 0.92 });
    g.restore();
  }
  function chrome(g, env) {
    const { sc, prev, k, t, total } = env;
    let a = 1;
    if (sc.type === 'end_card') a = prev ? 1 - k : 0;
    else if (prev && prev.type === 'end_card') a = k;
    if (a <= 0.003) return;
    g.save(); g.globalAlpha = a;
    g.strokeStyle = P.line; g.lineWidth = 2; g.lineCap = 'butt';
    X.bracket(g, 60, 300, 1, 1); X.bracket(g, 1020, 300, -1, 1); X.bracket(g, 60, 1620, 1, -1); X.bracket(g, 1020, 1620, -1, -1);
    // top-left: scene label (crossfades between scenes), top-right: channel
    const lc = labelOf(sc), lp = prev ? labelOf(prev) : lc;
    if (k < 1 && lp !== lc) { chromeLabel(g, lp, clamp(1 - k * 2.2)); chromeLabel(g, lc, clamp(k * 2.2 - 1.2)); } else chromeLabel(g, lc, 1);
    if (X.story && X.story.channel) X.text(g, X.story.channel, 988, 338, { size: 25, mono: true, ls: 0.14, color: P.muted, align: 'right', alpha: 0.9 });
    // progress line
    const prog = clamp(t / total), x1 = 60 + 960 * prog;
    g.lineCap = 'round'; g.lineWidth = 2;
    g.strokeStyle = 'rgba(232,236,244,0.09)'; g.beginPath(); g.moveTo(60, 1640); g.lineTo(1020, 1640); g.stroke();
    if (x1 > 61) { g.strokeStyle = 'rgba(138,147,168,0.55)'; g.beginPath(); g.moveTo(60, 1640); g.lineTo(x1, 1640); g.stroke(); }
    X.circle(g, x1, 1640, 3.4, { fill: P.A, glow: 14 });
    g.restore();
  }

  const SUBSTYLE = { px: 64, wt: 700, maxW: 920, softChars: 24 };
  function subtitles(g, sc, gt) {
    let scn = sc;
    if (sc.type === 'end_card') scn = endCardSubScene(sc);
    if (!scn || !scn.words.length) return;
    const st = V.subtitleAt(scn, gt, SUBSTYLE);
    if (!st) return;
    const { ch, age, active } = st, { lines, widths } = ch.lay;
    const alpha = clamp(age / 0.09), pop = 0.965 + 0.035 * easeOut(age / 0.14);
    const lh = SUBSTYLE.px * 1.2, cy = 1500, y0 = cy - (lines.length - 1) * lh / 2;
    const maxw = Math.max(...widths);
    g.save(); g.globalAlpha = alpha;
    // soft dark backdrop glow, no box
    V.glow(g, 540, cy, Math.max(420, maxw * 0.75), '#02030A', 0.62, 1.0, (lines.length * lh + 60) / (Math.max(420, maxw * 0.75) * 1.0));
    g.translate(540, cy); g.scale(pop, pop); g.translate(-540, -cy);
    g.font = X.fSans(700, SUBSTYLE.px); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.letterSpacing = '0px';
    const sp = X.meas(' ', X.fSans(700, SUBSTYLE.px)) + 0;
    g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 16; g.shadowOffsetY = 3;
    lines.forEach((ln, li) => {
      let x = 540 - widths[li] / 2;
      const by = y0 + li * lh + 0.35 * SUBSTYLE.px;
      ln.forEach((wd) => {
        const on = wd.i === active;
        g.fillStyle = on ? P.A : '#F2F5FB';
        g.fillText(wd.w, x, by);
        x += wd.ww + sp;
      });
    });
    g.restore();
  }
  // end card: the first sentence is the headline, the subtitles carry the rest of the narration
  function endCardSubScene(sc) {
    if (sc.__subScene) return sc.__subScene;
    const idx = sc.words.findIndex((w) => /[.!?…]["')”]?$/.test(w.w));
    const rest = idx >= 0 ? sc.words.slice(idx + 1) : [];
    return (sc.__subScene = Object.assign({}, sc, { words: rest, subTrack: null, __subScene: null }));
  }
  X.endCardSubScene = endCardSubScene;

  /* ------------------------------------------------------------------ caption (white, faint accent glow, accent underline) */
  const CAP_BUILD = new Set(['map', 'chart_line', 'chart_bar', 'flow', 'compare']);   // scenes whose graphic needs the screen first
  X.capStart = (sc) => (sc.dur > 8 && CAP_BUILD.has(sc.type) ? sc.dur * 0.65 : STAMP_T);
  const CAP_SPEC = {
    map: { y: 430, size: 130, lines: 1 }, chart_line: { y: 438, size: 140, lines: 1 }, chart_bar: { y: 438, size: 140, lines: 1 },
    flow: { y: 440, size: 130, lines: 1 }, compare: { y: 440, size: 130, lines: 1 }, hero: { y: 1262, size: 110, lines: 1 },
    fact_stamp: { y: 880, size: 190, lines: 2 },
  };
  X.layoutCaption = (text, maxW, size0, maxLines) => {
    const f = (s) => X.fSans(800, s), w1 = X.meas(text, f(size0), 0), s1 = Math.min(size0, size0 * maxW / w1);
    const words = text.split(/\s+/);
    if (maxLines < 2 || words.length < 2 || s1 > size0 * 0.72) return { size: s1, lines: [text] };
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const wm = Math.max(X.meas(a, f(size0), 0), X.meas(b, f(size0), 0)), s2 = Math.min(size0, size0 * maxW / wm);
      if (!best || s2 > best.size) best = { size: s2, lines: [a, b] };
    }
    return best && best.size > s1 * 1.15 ? best : { size: s1, lines: [text] };
  };
  // dt = seconds since the caption landed; spec {y,size,lines}
  X.drawCaption = (c, text, dt, spec) => {
    if (dt < 0 || !text) return;
    text = X.up(text);
    const L = X.layoutCaption(text, 940, spec.size, spec.lines), n = L.lines.length, lh = L.size * 1.02;
    const a = easeOut(dt / 0.35), sc = lerp(1.06, 1, easeOut(dt / 0.35));
    const capH = L.size * 0.7, wmax = Math.max(...L.lines.map((l) => X.meas(l, X.fSans(800, L.size), 0)));
    c.save();
    c.translate(540, spec.y); c.scale(sc, sc); c.globalAlpha *= a;
    V.glow(c, 0, 0, 520, '#02030A', 0.35, 1.5, (n * lh + 120) / 520 * 0.6);
    L.lines.forEach((l, i) => {
      const y = (i - (n - 1) / 2) * lh;
      X.text(c, l, 0, y, { size: L.size, wt: 800, align: 'center', color: P.text, glow: 26, glowColor: rgba(P.A, 0.40 + 0.07 * Math.sin(dt * 2.2)) });
    });
    // accent underline, draws left -> right
    const bw = Math.min(wmax, 560) * easeOut((dt - 0.08) / 0.3), by = ((n - 1) / 2) * lh + capH / 2 + Math.max(22, L.size * 0.2);
    if (bw > 0.5) { c.fillStyle = P.A; c.shadowColor = rgba(P.A, 0.7); c.shadowBlur = 14; c.fillRect(-Math.min(wmax, 560) / 2, by, bw, 6); }
    c.restore();
  };

  /* ------------------------------------------------------------------ the theme hook */
  const EXPL_TYPES = new Set(['title_card', 'map', 'chart_line', 'chart_bar', 'flow', 'hero', 'fact_stamp', 'compare', 'end_card']);
  const NO_CAPTION = new Set(['title_card', 'fact_stamp', 'end_card']);
  const DRIFT = new Set(['map', 'chart_line', 'chart_bar', 'flow', 'compare']);
  const wrapCache = {};
  function sceneFn(type) {
    if (!EXPL_TYPES.has(type)) return null;
    if (wrapCache[type]) return wrapCache[type];
    return (wrapCache[type] = (c, lt, sc, gt) => {
      const fn = type === 'end_card' ? X.endCard : V.SCENES[type];
      if (!fn) return;
      if (DRIFT.has(type)) {                                   // very slow push-in on the graphic (caption and chrome stay put)
        const z = 1 + 0.02 * clamp(lt / Math.max(0.5, sc.dur));
        c.save(); c.translate(540, 900); c.scale(z, z); c.translate(-540, -900); fn(c, lt, sc, gt); c.restore();
      } else fn(c, lt, sc, gt);
      if (!NO_CAPTION.has(type) && sc.caption) X.drawCaption(c, sc.caption, lt - X.capStart(sc), CAP_SPEC[type] || { y: 720, size: 150, lines: 2 });
    });
  }

  V.THEMES.explainer = {
    name: 'explainer',
    mix: (k) => [clamp(1 - k * 1.3), clamp((k - 0.15) * 1.18)],     // previous scene clears a little before the next one is fully in
    xfade: 0.3, fadeIn: 0.5, fadeOut: 0.45, grainAmount: 0.022, fallbackType: 'fact_stamp',
    scene: sceneFn,
    init(story, TL) {
      X.story = story; X.setAccent(story.accent);
      if (!bgCv) initCaches();
      stamps = TL.scenes.filter((s) => s.type === 'fact_stamp');
      const R = rng('explainer-dust');
      DUST = Array.from({ length: 52 }, () => ({
        x0: R() * W, y0: R() * H, r: 0.7 + R() * 1.4, a: 0.14 + R() * 0.34, vx: (R() - 0.5) * 5, vy: 5 + R() * 13,
        sw: 8 + R() * 22, f: 0.1 + R() * 0.35, ph: R() * PI2, tw: 0.6 + R() * 1.6, acc: R() < 0.2,
      }));
    },
    background: X.background,
    overlay(g, env) { chrome(g, env); subtitles(g, env.sc, env.t); },
    finish(g, env) {
      g.drawImage(vigCv, 0, 0);
      if (env.k < 1) { const f = Math.pow(Math.sin(Math.PI * env.k), 2) * 0.05; g.fillStyle = rgba(P.A, f); g.fillRect(0, 0, W, H); }
    },
    grain(g, env, userAmount) { V.grain(g, env.frame, userAmount != null ? userAmount : 0.022); },
  };
})();
