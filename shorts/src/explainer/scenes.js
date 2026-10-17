/* explainer/scenes.js — title_card, hero, fact_stamp, compare, end_card for the explainer theme.
   Same contract as the other scene files: V.SCENES[type](ctx, localT, scene, globalT). They draw onto a transparent layer
   (theme.js wraps them: crossfade between scenes, caption on top). end_card collides with a stickocalypse scene name,
   so it is exposed as V.X.endCard and picked up by the theme only. */
(() => {
  const V = window.V, X = V.X;
  const { W, H, PI2, clamp, lerp, sstep, easeOut, easeInOut, rgba } = V;
  const SC = (V.SCENES = V.SCENES || {});
  const P = X.P;
  const T_CAP = 0.4;                                             // caption / stamp time (matches theme.js)

  /* ---------------------------------------------------------------- shared: balanced multi-line fit for headlines */
  // best split of text into <= maxLines lines (min of the widest line); returns {size, lines}
  X.fitLines = (text, wt, maxW, size0, maxLines, ls = 0, minGain = 1.0) => {
    const f = (s) => X.fSans(wt, s), meas = (str) => X.meas(str, f(size0), ls * size0);
    const words = text.split(/\s+/).filter(Boolean);
    let best = { size: Math.min(size0, size0 * maxW / Math.max(1, meas(text))), lines: [text] };
    const cand = (lines) => { const wm = Math.max(...lines.map(meas)), s = Math.min(size0, size0 * maxW / wm); if (s > best.size * minGain + 0.01) best = { size: s, lines }; };
    if (maxLines >= 2) for (let i = 1; i < words.length; i++) cand([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
    if (maxLines >= 3) for (let i = 1; i < words.length; i++) for (let j = i + 1; j < words.length; j++) cand([words.slice(0, i).join(' '), words.slice(i, j).join(' '), words.slice(j).join(' ')]);
    return best;
  };

  /* ---------------------------------------------------------------- wireframe backdrop (icosahedron + concentric arcs) */
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
  function wireBackdrop(c, lt, cx, cy, R, alpha) {
    const pts = X.icosa.v.map((p) => X.proj(p, lt * 0.16, 0.45 + Math.sin(lt * 0.11) * 0.12, cx, cy, R / 1.9));
    c.save(); c.globalAlpha = alpha; c.lineCap = 'round';
    for (const [i, j] of X.icosa.e) {
      const a = pts[i], b = pts[j], depth = (a[2] + b[2]) / 2;
      c.globalAlpha = alpha * (0.55 + 0.45 * clamp((depth + 1.8) / 3.6));
      c.strokeStyle = P.text; c.lineWidth = 1.5; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    c.globalAlpha = alpha * 1.4;
    for (const p of pts) X.circle(c, p[0], p[1], 3, { fill: P.A });
    // concentric arcs
    c.globalAlpha = alpha * 0.9; c.strokeStyle = P.B; c.lineWidth = 1.5;
    [[R * 1.18, 0.12, 1.5, 0], [R * 1.34, -0.08, 1.1, 2.1], [R * 1.52, 0.05, 0.7, 4.0]].forEach(([r, sp, len, ph]) => {
      const a0 = ph + lt * sp * 2; c.beginPath(); c.arc(cx, cy, r, a0, a0 + len * Math.PI); c.stroke();
    });
    c.setLineDash([3, 12]); c.beginPath(); c.arc(cx, cy, R * 1.66, lt * 0.03, lt * 0.03 + PI2); c.stroke();
    c.restore();
  }

  /* ---------------------------------------------------------------- title_card */
  SC.title_card = (c, lt, sc) => {
    const title = X.up(sc.title || sc.titleText || (X.story && X.story.title) || '');
    const kicker = sc.kicker || (X.story && X.story.kicker) || '';
    const u = clamp(lt / Math.max(1, sc.dur)), zoom = 1 + 0.05 * easeOut(u) + 0.01 * u;
    const cx = 540, cy = 820;
    c.save(); c.translate(cx, cy); c.scale(zoom, zoom); c.translate(-cx, -cy);
    wireBackdrop(c, lt, cx, cy - 10, 470, 0.11 * easeOut(lt / 1.2));
    const L = X.fitLines(title, 800, 940, 150, 2, -0.02), lh = L.size * 1.04, n = L.lines.length, blockH = n * lh;
    const top = cy - blockH / 2;
    // kicker
    const ka = easeOut((lt - 0.15) / 0.6);
    if (kicker && ka > 0) {
      const y = top - 66 + (1 - ka) * 10;
      X.circle(c, 540 - X.meas(X.up(kicker), X.fMono(400, 30), 0.2 * 30) / 2 - 26, y, 5.5, { fill: P.A, glow: 14, alpha: ka });
      X.text(c, kicker, 540, y, { size: 30, mono: true, ls: 0.2, color: P.A, align: 'center', up: true, alpha: ka, glow: 10, glowColor: rgba(P.A, 0.35) });
    }
    // title lines (rise + fade, staggered)
    L.lines.forEach((l, i) => {
      const a = easeOut((lt - 0.3 - i * 0.14) / 0.8);
      if (a <= 0) return;
      X.text(c, l, 540, top + lh * (i + 0.5) + (1 - a) * 26, { size: L.size, wt: 800, ls: -0.02, align: 'center', color: P.text, alpha: a, glow: 30, glowColor: rgba(P.A, 0.22) });
    });
    // hairline under the title, grows from the centre
    const ly = top + blockH + 34, la = easeOut((lt - 0.9) / 0.8), lw = 300 * la;
    if (la > 0) {
      c.strokeStyle = rgba(P.A, 0.85); c.lineWidth = 1.5; c.shadowColor = rgba(P.A, 0.6); c.shadowBlur = 10;
      c.beginPath(); c.moveTo(540 - lw, ly); c.lineTo(540 + lw, ly); c.stroke(); c.shadowBlur = 0;
      X.circle(c, 540, ly, 3.4, { fill: P.A, glow: 12, alpha: la });
    }
    c.restore();
  };

  /* ---------------------------------------------------------------- fact_stamp */
  SC.fact_stamp = (c, lt, sc) => {
    const dt = lt - T_CAP, text = sc.caption || '';
    const spec = { y: 880, size: 190, lines: 2 };
    if (dt >= 0 && text) {
      const L = X.layoutCaption(X.up(text), 940, spec.size, spec.lines), n = L.lines.length, lh = L.size * 1.02;
      const a = easeOut(dt / 0.35), blockH = n * lh;
      const wmax = Math.max(...L.lines.map((l) => X.meas(l, X.fSans(800, L.size), 0)));
      // stamp shock ring
      const rr = easeOut(dt / 1.4) * 760, ra = Math.exp(-dt * 2.2) * 0.35;
      if (ra > 0.004) X.circle(c, 540, spec.y, rr, { color: rgba(P.A, ra), w: 1.5 });
      // viewfinder brackets around the block
      const bx = wmax / 2 + 44, by = blockH / 2 + 44, s = lerp(1.14, 1, easeOut(dt / 0.45));
      c.save(); c.translate(540, spec.y); c.scale(s, s); c.globalAlpha = a * 0.8; c.strokeStyle = rgba(P.A, 0.9); c.lineWidth = 2; c.lineCap = 'butt';
      c.shadowColor = rgba(P.A, 0.5); c.shadowBlur = 10;
      X.bracket(c, -bx, -by, 1, 1, 34); X.bracket(c, bx, -by, -1, 1, 34); X.bracket(c, -bx, by, 1, -1, 34); X.bracket(c, bx, by, -1, -1, 34);
      c.restore();
      X.drawCaption(c, text, dt, spec);
      // sub line, technical style
      if (sc.sub) {
        const sa = easeOut((dt - 0.3) / 0.5), yb = spec.y + blockH / 2 + Math.max(22, L.size * 0.2) + 6 + 62;
        const lines = X.wrap(X.up(sc.sub), { mono: true, ls: 0.12 }, 880, 30);
        lines.slice(0, 3).forEach((l, i) => X.text(c, l, 540, yb + i * 46 + (1 - sa) * 8, { size: 30, mono: true, ls: 0.12, align: 'center', color: P.text, alpha: sa * 0.82 }));
      }
    }
  };

  /* ---------------------------------------------------------------- compare */
  // "1,000×" / "~150" / "97%" / "up to 1,000×" -> {pre, num, dec, post, comma, numeric}
  function parseValue(v) {
    const s = String(v == null ? '' : v).trim();
    const m = s.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!m) return { numeric: false, text: s };
    const raw = m[2], num = parseFloat(raw.replace(/,/g, '')), dec = raw.includes('.') ? raw.split('.')[1].length : 0;
    const year = !raw.includes(',') && !raw.includes('.') && raw.length === 4 && num >= 1000 && num <= 2100 && !m[1].trim() && !m[3].trim();
    return { numeric: !year, year, pre: m[1], num, dec, comma: raw.includes(','), post: m[3], text: s };
  }
  const fmtCount = (p, x) => (p.comma || (p.num >= 10000 && p.dec === 0) ? X.fmtInt(x) : p.dec ? x.toFixed(p.dec) : String(Math.round(x)));
  SC.compare = (c, lt, sc) => {
    const sides = [sc.left || {}, sc.right || {}], cxs = [300, 780], cy = 880;
    const pv = sides.map((s) => parseValue(s.value));
    const bothNum = pv.every((p) => p.numeric);
    const pct = bothNum && pv.every((p) => /%/.test(p.post));
    const vmax = Math.max(...pv.map((p) => (p.numeric ? p.num : 0)), 1e-9);
    // divider
    const da = easeOut(lt / 0.6);
    c.save();
    const gr = c.createLinearGradient(0, 640, 0, 1160);
    gr.addColorStop(0, 'rgba(232,236,244,0)'); gr.addColorStop(0.5, 'rgba(232,236,244,0.30)'); gr.addColorStop(1, 'rgba(232,236,244,0)');
    c.strokeStyle = gr; c.lineWidth = 1.5; c.globalAlpha = da; c.beginPath(); c.moveTo(540, 640); c.lineTo(540, 1160); c.stroke();
    c.restore();
    sides.forEach((s, i) => {
      const cx = cxs[i], p = pv[i], right = i === 1, t0 = 0.25 + i * 0.35, a = easeOut((lt - t0) / 0.6);
      if (a <= 0) return;
      const col = right ? P.A : P.text, colA = right ? 1 : 0.88;
      // label (technical, muted)
      const lines = X.wrap(X.up(s.label || ''), { mono: true, ls: 0.16 }, 420, 26);
      lines.slice(0, 2).forEach((l, k) => X.text(c, l, cx, 690 + k * 36, { size: 26, mono: true, ls: 0.16, align: 'center', color: right ? rgba(P.A, 0.85) : P.muted, alpha: a }));
      // value
      let shown = p.text, size = 140, pre = '';
      const ct = clamp((lt - t0 - 0.2) / 1.25);
      if (p.numeric) {
        const x = p.num * easeOut(ct);
        const hasWordPre = /[A-Za-z]/.test(p.pre);
        pre = hasWordPre ? p.pre.trim() : '';
        shown = (hasWordPre ? '' : p.pre) + fmtCount(p, x) + p.post;
      } else if (p.year) shown = p.text;
      else shown = p.text;
      const fullStr = p.numeric ? (/[A-Za-z]/.test(p.pre) ? '' : p.pre) + fmtCount(p, p.num) + p.post : p.text;   // size from the final string so it never jitters
      size = X.fit(fullStr, { wt: 800 }, 430, 140, 54);
      const vy = cy + (1 - a) * 14;
      if (pre) X.text(c, pre, cx, vy - size * 0.62 - 18, { size: 24, mono: true, ls: 0.18, align: 'center', color: P.muted, up: true, alpha: a });
      X.text(c, shown, cx, vy, { size, wt: 800, align: 'center', color: col, alpha: a * colA, glow: right ? 28 : 0, glowColor: rgba(P.A, 0.4), ls: -0.01 });
      // unit
      X.text(c, s.unit || '', cx, vy + size * 0.5 + 38, { size: 25, mono: true, ls: 0.14, align: 'center', color: P.muted, up: true, alpha: a });
      // magnitude bar
      if (bothNum) {
        const frac = clamp((pct ? p.num / 100 : p.num / vmax)), bw = 340, by = vy + size * 0.5 + 94;
        c.save(); c.globalAlpha = a;
        c.fillStyle = 'rgba(232,236,244,0.10)'; c.fillRect(cx - bw / 2, by, bw, 5);
        const fw = Math.max(5, bw * frac * easeOut(ct));
        c.fillStyle = right ? P.A : 'rgba(232,236,244,0.72)'; if (right) { c.shadowColor = rgba(P.A, 0.6); c.shadowBlur = 14; }
        c.fillRect(cx - bw / 2, by, fw, 5);
        c.restore();
      }
    });
    // chevron between the columns
    const ca = easeOut((lt - 0.7) / 0.5);
    if (ca > 0) {
      c.save(); c.globalAlpha = ca; c.translate(540, cy - 10);
      c.fillStyle = 'rgba(7,11,22,0.92)'; c.beginPath(); c.arc(0, 0, 40, 0, PI2); c.fill();
      X.circle(c, 0, 0, 40, { color: rgba(P.A, 0.85), w: 2, glow: 16 });
      const sh = Math.sin(lt * 2.4) * 3;
      c.strokeStyle = P.A; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-8 + sh, -15); c.lineTo(8 + sh, 0); c.lineTo(-8 + sh, 15); c.stroke();
      c.restore();
    }
  };

  /* ---------------------------------------------------------------- hero (icons.js draws the icon) */
  SC.hero = (c, lt, sc, gt) => {
    const name = String(sc.hero || 'gear').toLowerCase(), cx = 540, cy = 790 + Math.sin(lt * 1.1) * 8, size = 500;
    // pedestal rings on the floor
    const fa = easeOut(lt / 0.8);
    c.save(); c.globalAlpha = fa;
    for (let k = 0; k < 3; k++) {
      const rx = 250 + k * 90, ry = rx * 0.15, a = 0.34 - k * 0.1;
      c.strokeStyle = rgba(P.A, a); c.lineWidth = k === 0 ? 2 : 1.5;
      if (k === 0) { c.shadowColor = rgba(P.A, 0.5); c.shadowBlur = 14; }
      c.beginPath(); c.ellipse(540, 1150, rx, ry, 0, 0, PI2); c.stroke(); c.shadowBlur = 0;
    }
    // faint light column
    c.fillStyle = V.lg(c, 0, 500, 0, 1150, [[0, 'rgba(255,255,255,0)'], [1, rgba(P.A, 0.05)]]);
    c.beginPath(); c.moveTo(380, 500); c.lineTo(700, 500); c.lineTo(790, 1150); c.lineTo(290, 1150); c.closePath(); c.fill();
    c.restore();
    const info = X.drawIcon ? X.drawIcon(c, name, cx, cy, size, lt) : null;
    // callouts
    const cos = Array.isArray(sc.callouts) ? sc.callouts.slice(0, 4) : [];
    let li = 0, ri = 0;
    cos.forEach((co, i) => {
      const side = co.side === 'right' ? 1 : -1, slot = side < 0 ? li++ : ri++;
      const ta = easeOut((lt - (1.0 + i * 0.55)) / 0.6);
      if (ta <= 0) return;
      const ty = (side < 0 ? 600 : 960) + slot * 150;                     // staggered: left high, right low
      const tx = side < 0 ? 84 : 996;
      const text = X.up(co.text || '');
      let size2 = 27; const maxW = 440;
      let lines = X.wrap(text, { mono: true, ls: 0.14 }, maxW, size2);
      if (lines.length > 2) { size2 = 22; lines = X.wrap(text, { mono: true, ls: 0.14 }, maxW, size2); }
      lines = lines.slice(0, 3);
      const tw = Math.max(...lines.map((l) => X.meas(l, X.fMono(400, size2), 0.14 * size2)));
      const target = info && info.anchor ? info.anchor(side, ty) : [cx + side * 110, cy];
      c.save(); c.globalAlpha = ta;
      lines.forEach((l, k) => X.text(c, l, tx, ty - 22 - (lines.length - 1 - k) * (size2 * 1.45), { size: size2, mono: true, ls: 0.14, align: side < 0 ? 'left' : 'right', color: P.text }));
      // leader: underline the text, run to an elbow, then diagonal to the icon
      const x0 = side < 0 ? tx : tx - tw, x1 = side < 0 ? tx + tw + 24 : tx + 0, ex = side < 0 ? Math.max(tx + tw + 30, 300) : Math.min(tx - tw - 30, 780);
      const pts = [[side < 0 ? x0 : x0, ty], [ex, ty], target];
      const u = easeOut((lt - (1.0 + i * 0.55) - 0.1) / 0.7), part = X.partial(pts, u);
      X.path(c, part.pts, { w: 1.5, color: rgba(P.text, 0.55) });
      if (u > 0.98) { X.circle(c, target[0], target[1], 5, { fill: P.A, glow: 14 }); X.circle(c, target[0], target[1], 5 + 9 * ((lt * 0.8) % 1), { color: rgba(P.A, 0.5 * (1 - (lt * 0.8) % 1)), w: 1.5 }); }
      c.restore();
    });
  };

  /* ---------------------------------------------------------------- end_card */
  X.endCard = (c, lt, sc) => {
    const q = V.firstSentence(sc.narration) || (X.story && X.story.title) || '';
    const L = X.fitLines(q, 800, 920, 100, 3, -0.01, 1.0), n = L.lines.length, lh = L.size * 1.12;
    const cy = 740, a = easeOut((lt - 0.2) / 0.8);
    c.save();
    wireBackdrop(c, lt + 20, 540, 780, 420, 0.06 * a);
    L.lines.forEach((l, i) => {
      const la = easeOut((lt - 0.2 - i * 0.14) / 0.7);
      X.text(c, l, 540, cy + (i - (n - 1) / 2) * lh + (1 - la) * 22, { size: L.size, wt: 800, ls: -0.01, align: 'center', color: P.text, alpha: la, glow: 22, glowColor: rgba(P.A, 0.18) });
    });
    // pill button
    const pa = easeOut((lt - 0.9) / 0.6);
    if (pa > 0) {
      const label = String(sc.cta || 'Follow for more'), pulse = 1 + 0.02 * Math.sin(lt * 2.6);
      const size = 46, tw = X.meas(X.up(label), X.fSans(800, size), 0.03 * size), pw = tw + 150, ph = 112, py = 1085;
      c.save(); c.globalAlpha = pa; c.translate(540, py + (1 - pa) * 14); c.scale(pulse, pulse);
      V.glow(c, 0, 0, pw * 0.8, P.A, 0.20 + 0.06 * Math.sin(lt * 2.6), 1.2, 0.35);
      c.shadowColor = rgba(P.A, 0.55); c.shadowBlur = 30; X.rrect(c, -pw / 2, -ph / 2, pw, ph, ph / 2, { fill: P.A }); c.shadowBlur = 0;
      X.rrect(c, -pw / 2 + 4, -ph / 2 + 4, pw - 8, ph - 8, (ph - 8) / 2, { color: 'rgba(255,255,255,0.35)', w: 1.5 });
      X.text(c, label, -22, 2, { size, wt: 800, ls: 0.03, align: 'center', color: '#05070D', up: true });
      // arrow
      const ax = tw / 2 + 4; c.strokeStyle = '#05070D'; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(ax - 22 + 0, 2); c.lineTo(ax + 16, 2); c.moveTo(ax + 4, -11); c.lineTo(ax + 17, 2); c.lineTo(ax + 4, 15); c.stroke();
      c.restore();
    }
    const ha = easeOut((lt - 1.3) / 0.6);
    if (ha > 0 && X.story && X.story.channel) X.tech(c, X.story.channel, 540, 1205, { size: 30, ls: 0.2, align: 'center', color: P.text, alpha: ha * 0.8 });
    c.restore();
  };
})();
