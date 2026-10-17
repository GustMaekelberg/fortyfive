/* overlay.js — screen-space layers: vignette, film grain, stamped captions, karaoke subtitles, title / fact / end cards. */
(() => {
  const V = window.V;
  const { W, H, PI2, clamp, lerp, easeOut, easeOutBack, rgba, rng, fillRR } = V;

  V.mk = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
  const mcv = V.mk(8, 8), mctx = mcv.getContext('2d');
  const FONT = (wt, px) => `${wt} ${px}px Archivo, "Arial Black", sans-serif`;
  V.FONT = FONT;
  const measure = (str, wt, px, ls = 0) => { mctx.font = FONT(wt, px); mctx.letterSpacing = ls + 'px'; return mctx.measureText(str).width; };

  /* ----------------------------------------------------------- vignette / grain */
  let vigCv = null, grainCv = null;
  function initVig() {
    vigCv = V.mk(W, H); const c = vigCv.getContext('2d');
    c.translate(W / 2, H * 0.5); c.scale(0.74, 1);
    const g = c.createRadialGradient(0, 0, 330, 0, 0, 1230);
    g.addColorStop(0, 'rgba(8,4,16,0)'); g.addColorStop(0.35, 'rgba(8,4,16,0.10)'); g.addColorStop(0.7, 'rgba(8,4,16,0.42)'); g.addColorStop(1, 'rgba(8,4,16,0.86)');
    c.fillStyle = g; c.fillRect(-W, -H, W * 2, H * 2);
  }
  function initGrain() {
    grainCv = [];
    for (let k = 0; k < 4; k++) {
      const cv = V.mk(560, 980), c = cv.getContext('2d'), id = c.createImageData(cv.width, cv.height), R = rng(1000 + k);
      for (let i = 0; i < id.data.length; i += 4) {
        const n = 128 + Math.round((R() + R() - 1) * 62);
        id.data[i] = id.data[i + 1] = id.data[i + 2] = n; id.data[i + 3] = 255;
      }
      c.putImageData(id, 0, 0); grainCv.push(cv);
    }
  }
  V.vignette = (c, strength = 1) => {
    if (!vigCv) initVig();
    c.save(); c.globalAlpha = Math.min(1, strength); c.drawImage(vigCv, 0, 0);
    if (strength > 1) { c.globalAlpha = Math.min(1, strength - 1); c.drawImage(vigCv, 0, 0); }
    c.restore();
  };
  V.grain = (c, frame, amount = 0.08) => {
    if (amount <= 0) return;
    if (!grainCv) initGrain();
    const step = Math.floor(frame / 2);               // grain refreshes at 15 Hz (filmic, and kinder to the encoder)
    const k = step % grainCv.length, R = rng(step * 7919 + 13);
    const ox = Math.floor(R() * 20) * 1, oy = Math.floor(R() * 40) * 1;
    c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = amount; c.imageSmoothingEnabled = false;
    c.drawImage(grainCv[k], ox, oy, 560 - ox, 980 - oy, 0, 0, (560 - ox) * 2, (980 - oy) * 2); // 2x2 px grains
    c.restore();
  };

  /* --------------------------------------------------------- distressed text */
  const layerCache = new Map();
  // renders lines to an offscreen canvas with scratches/speckles erased. key makes it cacheable.
  function distressedLayer(key, lines, wt, px, lh, seed, fill, ls = 0) {
    const ck = key + '|' + px + '|' + wt;
    if (layerCache.has(ck)) return layerCache.get(ck);
    const w = Math.ceil(Math.max(...lines.map((l) => measure(l, wt, px, ls)))) + 80, h = Math.ceil(lh * lines.length) + 80;
    const cv = V.mk(w, h), c = cv.getContext('2d');
    c.font = FONT(wt, px); c.letterSpacing = ls + 'px'; c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((l, i) => {
      const y = 40 + lh * (i + 0.5);
      c.fillStyle = 'rgba(245,241,232,0.28)'; c.fillText(l, w / 2 + 4, y + 3);   // misregistered ghost
      c.fillStyle = fill; c.fillText(l, w / 2, y);
    });
    const R = rng(seed);
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 46; i++) {                                                   // scratches
      c.save(); c.translate(R() * w, 30 + R() * (h - 60)); c.rotate((R() - 0.5) * 0.5);
      c.fillStyle = `rgba(0,0,0,${0.35 + R() * 0.5})`; c.fillRect(0, 0, 20 + R() * 150, 1.2 + R() * 3); c.restore();
    }
    for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(0,0,0,${0.3 + R() * 0.6})`; c.beginPath(); c.arc(R() * w, R() * h, 0.7 + R() * 2.4, 0, PI2); c.fill(); }
    c.globalCompositeOperation = 'source-over';
    const out = { cv, w, h }; layerCache.set(ck, out); return out;
  }

  /* ------------------------------------------------------------------ captions */
  function layoutCaption(text, maxW, size0) {
    const words = text.split(/\s+/);
    const w1 = measure(text, 800, size0);
    const s1 = w1 > maxW ? size0 * maxW / w1 : size0;
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const wm = Math.max(measure(a, 800, size0), measure(b, 800, size0));
      const s2 = Math.min(size0, size0 * maxW / wm);
      if (!best || s2 > best.s || (s2 === best.s && Math.abs(a.length - b.length) < Math.abs(best.lines[0].length - best.lines[1].length))) best = { s: s2, lines: [a, b] };
    }
    if (best && s1 < 118 && best.s > s1 * 1.12) return { size: best.s, lines: best.lines };
    return { size: s1, lines: [text] };
  }

  // stamped caption. o:{y, start, dur(scene), fade}
  V.drawCaption = (c, scene, lt, o = {}) => {
    if (!scene.caption) return;
    const dur = scene.dur, text = String(scene.caption).toUpperCase();
    const t0 = o.start ?? (dur > 6.5 ? dur * 0.5 - 0.3 : 0.3);
    const dt = lt - t0; if (dt < 0) return;
    const fadeOut = clamp((dur - lt) / 0.3);
    if (fadeOut <= 0) return;
    const L = layoutCaption(text, 960, o.size || 150);
    const lh = L.size * 1.0, y = o.y ?? 760;
    const layer = distressedLayer('cap:' + text, L.lines, 800, L.size, lh, V.hash(text), '#F5F1E8');
    const sc = lerp(1.25, 1, easeOut(dt / 0.25)), alpha = clamp(dt / 0.09) * fadeOut;
    const shake = dt < 0.2 ? (1 - dt / 0.2) : 0;
    const sx = Math.sin(dt * 95) * 9 * shake, sy = Math.cos(dt * 120) * 5 * shake;
    const blockH = lh * L.lines.length;
    c.save();
    c.globalAlpha = alpha;
    // soft dark plate behind for legibility on bright sky
    V.glow(c, 540, y + (L.lines.length - 1) * 0 , 640, '#0b0614', 0.42 * alpha, 1.25, 0.34 * (blockH / 150 + 0.4));
    c.translate(540 + sx, y + sy); c.rotate(-2 * Math.PI / 180); c.scale(sc, sc);
    // dark outline pass
    c.shadowColor = 'rgba(8,3,14,0.75)'; c.shadowBlur = 22; c.shadowOffsetY = 8;
    c.drawImage(layer.cv, -layer.w / 2, -blockH / 2 - 40);
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.drawImage(layer.cv, -layer.w / 2, -blockH / 2 - 40);
    // red bar
    const barW = clamp(Math.max(...L.lines.map((l) => measure(l, 800, L.size))) * 0.46, 260, 480) * easeOut(dt / 0.3);
    fillRR(c, -barW / 2, blockH / 2 + 14, barW, 18, 3, '#C0392B');
    c.restore();
  };

  /* -------------------------------------------------------------- fact card */
  V.drawFactFrame = (c, scene, lt) => {
    const dur = scene.dur, a = clamp(lt / 0.4) * clamp((dur - lt) / 0.3);
    c.save(); c.globalAlpha = a * 0.7; c.strokeStyle = '#F5F1E8'; c.lineWidth = 3;
    const m = 44, x0 = m, y0 = 300 - 40, x1 = W - m, y1 = H - 250 + 20;
    c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.stroke();
    // corner ticks
    c.lineWidth = 8; c.strokeStyle = '#C0392B'; c.globalAlpha = a;
    for (const [px, py, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { c.beginPath(); c.moveTo(px, py + sy * 46); c.lineTo(px, py); c.lineTo(px + sx * 46, py); c.stroke(); }
    // kicker
    if (scene.fact_label) {
      const k = String(scene.fact_label).toUpperCase(), ka = clamp((lt - 0.15) / 0.3) * clamp((dur - lt) / 0.3);
      c.globalAlpha = ka; c.font = FONT(700, 40); c.letterSpacing = '9px'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const w = mctxW(k, 700, 40, 9);
      c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 12; c.shadowOffsetY = 3;
      c.fillStyle = '#F5F1E8'; c.fillText(k, 540 + 4, 640);
      c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
      c.strokeStyle = '#C0392B'; c.lineWidth = 3; c.beginPath(); c.moveTo(540 - w / 2 - 50, 640); c.lineTo(540 - w / 2 - 14, 640); c.moveTo(540 + w / 2 + 14, 640); c.lineTo(540 + w / 2 + 50, 640); c.stroke();
    }
    c.restore();
  };
  const mctxW = (s, wt, px, ls) => measure(s, wt, px, ls);

  /* ------------------------------------------------------------------ title */
  V.drawTitleCard = (c, scene, lt) => {
    const title = String(scene.titleText || 'DAY ONE').toUpperCase(), sub = String(scene.subtitleText || '').toUpperCase();
    const a = easeOut((lt - 0.35) / 0.9), sc = lerp(1.07, 1, easeOut((lt - 0.2) / 1.6));
    if (a <= 0) return;
    let px = 190; const w0 = measure(title, 800, px); if (w0 > 940) px = px * 940 / w0;
    const layer = distressedLayer('title:' + title, [title], 800, px, px * 1.05, V.hash(title) + 3, '#F5F1E8');
    const cy = 560;
    c.save(); c.globalAlpha = a; c.translate(540, cy); c.scale(sc, sc);
    V.glow(c, 0, 20, 620, '#0b0614', 0.45, 1.2, 0.32);
    c.shadowColor = 'rgba(8,3,14,0.8)'; c.shadowBlur = 28; c.shadowOffsetY = 10;
    c.drawImage(layer.cv, -layer.w / 2, -layer.h / 2);
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.drawImage(layer.cv, -layer.w / 2, -layer.h / 2);
    const bw = 360 * easeOut((lt - 0.7) / 0.5);
    c.shadowColor = 'rgba(8,3,14,.7)'; c.shadowBlur = 12; c.shadowOffsetY = 4; fillRR(c, -bw / 2, px * 0.52 + 22, bw, 24, 4, '#D03A2B'); c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    if (sub) {
      const sa = easeOut((lt - 0.9) / 0.6);
      c.globalAlpha = a * sa; c.font = FONT(700, 54); c.letterSpacing = '9px'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = 'rgba(8,3,14,0.8)'; c.shadowBlur = 14; c.shadowOffsetY = 4;
      c.fillStyle = '#F5F1E8'; c.fillText(sub, 4, px * 0.52 + 106);
    }
    c.restore();
  };

  /* --------------------------------------------------------------- end card */
  function balancedLines(text, maxW, px, wt = 800) {
    if (measure(text, wt, px) <= maxW) return [text];
    const words = text.split(/\s+/); let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const wm = Math.max(measure(a, wt, px), measure(b, wt, px));
      if (!best || wm < best.wm) best = { wm, lines: [a, b] };
    }
    return best ? best.lines : [text];
  }
  V.firstSentence = (s) => { const m = String(s || '').trim().match(/^.*?[.?!](?=\s|$)/); return (m ? m[0] : String(s || '')).trim(); };
  V.drawEndCard = (c, scene, lt) => {
    const q = V.firstSentence(scene.narration) || 'Would you have stayed?';
    let px = 112; let lines = balancedLines(q, 940, px);
    while (Math.max(...lines.map((l) => measure(l, 800, px))) > 940 && px > 60) px -= 4;
    const a = easeOut((lt - 0.2) / 0.7), lh = px * 1.12;
    c.save(); c.globalAlpha = a;
    const y0 = 780 - (lines.length - 1) * lh / 2 + (1 - a) * 24;
    V.glow(c, 540, 780, 640, '#05030a', 0.5, 1.2, 0.5);
    c.font = FONT(800, px); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineJoin = 'round'; c.lineWidth = 16; c.strokeStyle = 'rgba(10,5,18,.9)'; c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 24; c.shadowOffsetY = 8;
    lines.forEach((l, i) => c.strokeText(l, 540, y0 + i * lh));
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.fillStyle = '#F5F1E8'; lines.forEach((l, i) => c.fillText(l, 540, y0 + i * lh));
    c.restore();
    // pill
    const pa = easeOut((lt - 0.9) / 0.5), pulse = 1 + 0.028 * Math.sin(PI2 * 0.85 * lt);
    if (pa > 0) {
      const label = String(scene.cta || 'Follow for Part 2'), pw = 640, ph = 124, py = 1080;
      c.save(); c.globalAlpha = pa; c.translate(540, py); c.scale(pulse, pulse);
      V.glow(c, 0, 0, 480, '#C0392B', 0.28 + 0.1 * Math.sin(PI2 * 0.85 * lt), 1.3, 0.5);
      c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 26; c.shadowOffsetY = 10;
      fillRR(c, -pw / 2, -ph / 2, pw, ph, ph / 2, '#C0392B');
      c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
      c.beginPath(); V.rr(c, -pw / 2 + 3, -ph / 2 + 3, pw - 6, ph - 6, (ph - 6) / 2); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.28)'; c.stroke();
      c.font = FONT(800, 58); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(label, 0, 4);
      c.restore();
    }
  };

  /* -------------------------------------------------------------- subtitles */
  const SUB = { px: 72, maxW: 920, softChars: 24 };
  function layoutWords(ws) {
    // greedy wrap into lines using real text metrics
    const space = measure(' ', 800, SUB.px), lines = [[]], widths = [0];
    ws.forEach((w, i) => {
      const ww = measure(w, 800, SUB.px), L = lines.length - 1;
      const chars = lines[L].reduce((a, b) => a + b.w.length + 1, 0) + w.length;
      if (lines[L].length && (widths[L] + space + ww > SUB.maxW || chars > SUB.softChars + 2)) { lines.push([]); widths.push(0); }
      const l = lines.length - 1;
      widths[l] += (lines[l].length ? space : 0) + ww; lines[l].push({ w, i, ww });
    });
    return { lines, widths, space };
  }
  function buildChunks(words) {
    const chunks = []; let cur = [];
    const fits = (arr) => layoutWords(arr.map((x) => x.w)).lines.length <= 2;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (cur.length && !fits(cur.concat([w]))) { chunks.push(cur); cur = []; }
      cur.push(w);
      const end = /[.!?…]["')”]?$/.test(w.w), comma = /[,;:—–]$/.test(w.w);
      if (cur.length >= 5 || (end && cur.length >= 2) || (comma && cur.length >= 3)) { chunks.push(cur); cur = []; }
    }
    if (cur.length) {
      const last = chunks[chunks.length - 1];
      if (cur.length <= 1 && last && last.length + cur.length <= 6 && fits(last.concat(cur))) last.push(...cur); else chunks.push(cur);
    }
    return chunks;
  }
  V.buildSubtitleTrack = (scene) => {
    const words = scene.words;
    const chunks = buildChunks(words).map((ws) => ({ ws, lay: layoutWords(ws.map((x) => x.w)) }));
    chunks.forEach((ch, i) => {
      ch.t0 = ws0(ch) - 0.04;
      const next = chunks[i + 1] ? ws0(chunks[i + 1]) - 0.04 : Infinity;
      ch.t1 = Math.min(next, ch.ws[ch.ws.length - 1].t + 1.15, scene.end);
      if (!isFinite(ch.t1)) ch.t1 = scene.end;
    });
    return chunks;
  };
  const ws0 = (ch) => ch.ws[0].t;

  V.drawSubtitles = (c, scene, gt) => {
    const track = scene.subTrack || (scene.subTrack = V.buildSubtitleTrack(scene));
    let ch = null; for (const k of track) if (gt >= k.t0 && gt < k.t1) { ch = k; break; }
    if (!ch) return;
    const age = gt - ch.t0, pop = 0.9 + 0.1 * easeOutBack(age / 0.16, 1.7), alpha = clamp(age / 0.07);
    let active = 0; ch.ws.forEach((w, i) => { if (gt >= w.t) active = i; });
    const { lines, widths } = ch.lay, lh = SUB.px * 1.16, cy = 1480;
    const y0 = cy - (lines.length - 1) * lh / 2;
    c.save(); c.globalAlpha = alpha; c.translate(540, cy); c.scale(pop, pop); c.translate(-540, -cy);
    c.font = FONT(800, SUB.px); c.textAlign = 'left'; c.textBaseline = 'middle'; c.letterSpacing = '0px';
    c.lineJoin = 'round'; c.miterLimit = 2;
    const pass = (fn) => lines.forEach((ln, li) => {
      let x = 540 - widths[li] / 2;
      ln.forEach((wd) => { fn(wd, x, y0 + li * lh); x += wd.ww + (measure(' ', 800, SUB.px)); });
    });
    c.lineWidth = 12; c.strokeStyle = '#111'; c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
    pass((wd, x, y) => c.strokeText(wd.w, x, y));
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    pass((wd, x, y) => { c.fillStyle = wd.i === active ? '#FFD23F' : '#FFFFFF'; c.fillText(wd.w, x, y); });
    c.restore();
  };

  // ensure words exist & are sorted; fall back to evenly spread narration
  V.ensureWords = (scene) => {
    let ws = Array.isArray(scene.words) ? scene.words.filter((w) => w && typeof w.w === 'string' && isFinite(w.t)) : [];
    if (!ws.length) {
      const toks = String(scene.narration || '').split(/\s+/).filter(Boolean);
      const t0 = scene.start + 0.25, t1 = Math.max(t0 + 0.5, scene.end - 0.45);
      ws = toks.map((w, i) => ({ w, t: t0 + (t1 - t0) * i / Math.max(1, toks.length) }));
    }
    ws = ws.map((w) => ({ w: String(w.w), t: +w.t })).sort((a, b) => a.t - b.t);
    return ws;
  };
})();
