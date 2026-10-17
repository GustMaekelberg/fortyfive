/* explainer/scenes_data.js — the data scenes of the explainer theme: map, chart_line, chart_bar, flow.
   Same contract as scenes.js: V.SCENES[type](ctx, localT, scene, globalT) drawing on a transparent layer. */
(() => {
  const V = window.V, X = V.X;
  const { PI2, clamp, lerp, easeOut, easeInOut, rgba } = V;
  const SC = (V.SCENES = V.SCENES || {});
  const P = X.P;

  /* ---------------------------------------------------------------- shared helpers */
  // choose the candidate rect {x,y,w,h} that touches the fewest samples of polyline `pts` and stays inside `bounds`
  function pickRect(cands, polys, bounds, pad = 12) {
    const samples = [];
    for (const pts of polys) for (let i = 1; i < pts.length; i++) {
      const n = Math.max(1, Math.ceil(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) / 5));
      for (let k = 0; k <= n; k++) samples.push([lerp(pts[i - 1][0], pts[i][0], k / n), lerp(pts[i - 1][1], pts[i][1], k / n)]);
    }
    let best = null;
    cands.forEach((r, idx) => {
      let hit = 0;
      for (const p of samples) if (p[0] > r.x - pad && p[0] < r.x + r.w + pad && p[1] > r.y - pad && p[1] < r.y + r.h + pad) hit++;
      const out = r.x < bounds.x0 || r.x + r.w > bounds.x1 || r.y < bounds.y0 || r.y + r.h > bounds.y1 ? 5000 : 0;
      const s = hit + out + idx * 0.01;
      if (!best || s < best.s) best = { s, r, idx };
    });
    return best.r;
  }
  const yOnPoly = (pts, x) => {
    for (let i = 1; i < pts.length; i++) if ((pts[i - 1][0] <= x && pts[i][0] >= x) || (pts[i - 1][0] >= x && pts[i][0] <= x)) {
      const dx = pts[i][0] - pts[i - 1][0]; return dx ? lerp(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / dx) : pts[i][1];
    }
    return null;
  };

  /* ================================================================ chart frame (shared by chart_line / chart_bar) */
  const PL = { x0: 205, x1: 945, y0: 655, y1: 1155 };                // plot area inside the chart box (x 110-970, y 560-1230)
  function chartFrame(c, lt, ch, yMin, yMax) {
    const a = easeOut(lt / 0.6);
    c.save(); c.globalAlpha = a;
    // title + rule
    const title = X.up(ch.title || '');
    if (title) {
      const size = X.fit(title, { mono: true, ls: 0.14 }, 860, 25, 17);
      X.text(c, title, 110, 590, { size, mono: true, ls: 0.14, color: P.text, alpha: 0.92 });
    }
    X.path(c, [[110, 618], [110 + 860 * easeOut(lt / 0.8), 618]], { w: 1, color: 'rgba(232,236,244,0.28)', cap: 'butt' });
    // y axis: gridlines + ticks
    const tk = X.niceTicks(yMin, yMax);
    tk.ticks.forEach((v, i) => {
      const y = PL.y1 - (v - yMin) / (yMax - yMin) * (PL.y1 - PL.y0), g = easeOut((lt - 0.1 - i * 0.05) / 0.6);
      if (g <= 0) return;
      X.path(c, [[PL.x0, y], [PL.x0 + (PL.x1 - PL.x0) * g, y]], { w: 1, color: i === 0 ? 'rgba(232,236,244,0.45)' : 'rgba(232,236,244,0.10)', cap: 'butt', dash: i === 0 ? null : [2, 7] });
      X.text(c, X.fmtTick(v, tk.dec), PL.x0 - 20, y, { size: 21, mono: true, ls: 0.04, align: 'right', color: P.muted, alpha: g });
    });
    c.restore();
  }
  const yPx = (v, yMin, yMax) => PL.y1 - clamp((v - yMin) / (yMax - yMin), -0.05, 1.05) * (PL.y1 - PL.y0);

  /* ================================================================ chart_line */
  SC.chart_line = (c, lt, sc) => {
    const ch = sc.chart || {}, series = (ch.series || []).filter((s) => s && Array.isArray(s.points) && s.points.length);
    const all = series.flatMap((s) => s.points);
    const yMin = isFinite(ch.y_min) ? +ch.y_min : 0;
    const yMax = isFinite(ch.y_max) ? +ch.y_max : (all.length ? Math.max(...all.map((p) => p[1])) * 1.08 : 1);
    chartFrame(c, lt, ch, yMin, yMax);
    if (!series.length) return;
    let x0 = Math.min(...all.map((p) => p[0])), x1 = Math.max(...all.map((p) => p[0]));
    if (x1 - x0 < 1e-9) { x0 -= 1; x1 += 1; }
    const xPx = (x) => PL.x0 + 36 + (x - x0) / (x1 - x0) * (PL.x1 - PL.x0 - 72);
    const drawT0 = 0.55, drawT1 = Math.max(drawT0 + 1.2, sc.dur * 0.7);
    const p = easeInOut(clamp((lt - drawT0) / (drawT1 - drawT0)));
    const cols = [P.A, P.B, P.text];
    const mainPts = series[0].points.map((q) => [xPx(q[0]), yPx(q[1], yMin, yMax)]);

    // x ticks at the series x values; labels thinned so they never touch (the last one always wins)
    const xs = [...new Set(series.flatMap((s) => s.points.map((q) => q[0])))].sort((a, b) => a - b);
    const lbls = [];
    xs.forEach((x) => { const px = xPx(x); if (!lbls.length || px - lbls[lbls.length - 1].px >= 84) lbls.push({ x, px }); });
    const lastX = xs[xs.length - 1];
    if (lbls[lbls.length - 1].x !== lastX) { while (lbls.length > 1 && xPx(lastX) - lbls[lbls.length - 1].px < 84) lbls.pop(); lbls.push({ x: lastX, px: xPx(lastX) }); }
    const ta = easeOut((lt - 0.15) / 0.6);
    c.save(); c.globalAlpha = ta;
    xs.forEach((x) => X.path(c, [[xPx(x), PL.y1], [xPx(x), PL.y1 + 7]], { w: 1.5, color: 'rgba(232,236,244,0.5)', cap: 'butt' }));
    lbls.forEach((l) => X.text(c, X.fmtVal(l.x).replace(/,/g, ''), l.px, PL.y1 + 36, { size: 21, mono: true, ls: 0.04, align: 'center', color: P.muted }));
    c.restore();

    // annotations (vertical dashed line + small label); they appear when the drawing front reaches them
    (ch.annotations || []).forEach((an) => {
      if (!isFinite(an.x)) return;
      const ax = xPx(clamp(an.x, x0, x1)), prog = fracAtX(mainPts, ax), tReach = drawT0 + (drawT1 - drawT0) * invEase(prog);
      if (p < prog - 1e-6 || lt < tReach) return;
      const age = clamp((lt - tReach) / 0.5) * easeOut(lt / 0.6);
      const text = X.up(an.text || ''), size = 20, w = X.meas(text, X.fMono(400, size), 0.12 * size) + 4, h = 26;
      const mid = (PL.y0 + PL.y1) / 2;
      const cands = [
        { x: ax + 12, y: PL.y0 + 6, w, h }, { x: ax - 12 - w, y: PL.y0 + 6, w, h },
        { x: ax + 12, y: PL.y1 - 6 - h, w, h }, { x: ax - 12 - w, y: PL.y1 - 6 - h, w, h },
        { x: ax + 12, y: mid, w, h }, { x: ax - 12 - w, y: mid, w, h },
      ];
      const r = pickRect(cands, [mainPts], { x0: PL.x0 + 4, x1: PL.x1 + 22, y0: PL.y0, y1: PL.y1 });
      c.save(); c.globalAlpha = age;
      X.path(c, [[ax, PL.y1], [ax, lerp(PL.y1, PL.y0 - 14, easeOut(age))]], { w: 1.5, color: rgba(P.B, 0.75), dash: [6, 6], cap: 'butt' });
      const left = r.x < ax;
      X.text(c, text, left ? r.x + r.w - 4 : r.x, r.y + r.h / 2, { size, mono: true, ls: 0.12, align: left ? 'right' : 'left', color: P.B });
      const ay = yOnPoly(mainPts, ax);
      if (ay != null) X.circle(c, ax, ay, 7, { color: P.B, w: 2, glow: 10 });
      c.restore();
    });

    // series
    series.forEach((s, si) => {
      const pts = s.points.map((q) => [xPx(q[0]), yPx(q[1], yMin, yMax)]), col = cols[si % cols.length];
      const part = X.partial(pts, p);
      if (part.pts.length > 1) {
        // area under the line
        c.save(); c.beginPath(); c.moveTo(part.pts[0][0], PL.y1);
        part.pts.forEach((q) => c.lineTo(q[0], q[1])); c.lineTo(part.head[0], PL.y1); c.closePath();
        c.fillStyle = V.lg(c, 0, PL.y0, 0, PL.y1, [[0, rgba(col, 0.20)], [1, rgba(col, 0)]]); c.fill(); c.restore();
        X.path(c, part.pts, { w: 3.5, color: col, glow: 20, glow2: true });
      }
      // data points as small rings, popping as the line passes
      let acc = 0; const total = X.polyLen(pts);
      pts.forEach((q, i) => {
        if (i > 0) acc += Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]);
        const k = total ? acc / total : 0;
        if (p >= k - 1e-6) {
          const pop = easeOut((lt - (drawT0 + (drawT1 - drawT0) * invEase(k))) / 0.3 + (i === 0 ? 1 : 0));
          c.save(); c.fillStyle = '#070B16'; c.beginPath(); c.arc(q[0], q[1], 7 * pop, 0, PI2); c.fill(); c.restore();
          X.circle(c, q[0], q[1], 7 * pop, { color: col, w: 2.2 });
        }
      });
      if (p >= 0.999) { const ph = (((lt - drawT1) * 0.7) % 1 + 1) % 1, e = pts[pts.length - 1]; X.circle(c, e[0], e[1], 9 + 24 * ph, { color: rgba(col, 0.55 * (1 - ph)), w: 1.5 }); }
      if (p > 0 && p < 0.999) {
        const h = part.head;
        X.circle(c, h[0], h[1], 18, { color: rgba(col, 0.28), w: 1.5 });
        X.circle(c, h[0], h[1], 7.5, { fill: '#FFFFFF', glow: 24, glowColor: col });
      }
      // last value as a big number, placed where the line is not
      if (si === 0 && p > 0.985) {
        const end = pts[pts.length - 1], last = s.points[s.points.length - 1];
        const age = clamp((lt - drawT1) / 0.6), a = easeOut(age);
        const str = X.fmtVal(last[1]), size = 108, tw = X.meas(str, X.fSans(800, size), 0), uni = X.up((ch.unit || s.name || '') + (ch.unit ? ' · ' + X.fmtVal(last[0]).replace(/,/g, '') : ''));
        const w = Math.max(tw, 200), h = size * 0.71 + 54, g = 34;
        const cands = [
          { x: end[0] - 30 - w, y: end[1] - h / 2 - 6 },            // left of the end point
          { x: end[0] - w + 6, y: end[1] - g - h },                  // above
          { x: end[0] - w + 6, y: end[1] + g },                      // below
          { x: end[0] - 44 - w, y: end[1] + g * 0.5 },
          { x: end[0] - 44 - w, y: end[1] - g * 0.5 - h },
        ].map((r) => ({ x: r.x, y: r.y, w, h }));
        const r = pickRect(cands, [pts], { x0: PL.x0, x1: PL.x1 + 30, y0: PL.y0 - 10, y1: PL.y1 }, 16);
        c.save(); c.globalAlpha = a; c.translate(0, (1 - a) * 10);
        V.glow(c, r.x + r.w - tw / 2, r.y + h / 2, 260, '#02030A', 0.5, 1.2, 0.55);
        X.text(c, str, r.x + r.w, r.y + size * 0.37, { size, wt: 800, align: 'right', color: P.text, glow: 28, glowColor: rgba(col, 0.45), ls: -0.01 });
        X.text(c, uni, r.x + r.w, r.y + size * 0.71 + 32, { size: 21, mono: true, ls: 0.14, align: 'right', color: col });
        c.restore();
      }
    });
  };
  // arc-length fraction of a left-to-right polyline at screen x
  function fracAtX(pts, x) {
    const total = X.polyLen(pts) || 1; let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (pts[i][0] >= x) { const dx = pts[i][0] - pts[i - 1][0]; return (acc + seg * (dx ? clamp((x - pts[i - 1][0]) / dx) : 0)) / total; }
      acc += seg;
    }
    return 1;
  }
  // inverse of easeInOut (cubic) — used to time pops to the moment the drawing front passes a point
  function invEase(y) {
    y = clamp(y); let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (easeInOut(m) < y) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  /* ================================================================ chart_bar */
  SC.chart_bar = (c, lt, sc) => {
    const ch = sc.chart || {}, bars = (ch.bars || []).filter((b) => b && isFinite(b.value));
    const vmax = bars.length ? Math.max(...bars.map((b) => +b.value)) : 1;
    const yMin = 0, yMax = isFinite(ch.y_max) ? +ch.y_max : vmax * 1.15;
    chartFrame(c, lt, ch, yMin, yMax);
    const n = bars.length; if (!n) return;
    const slot = (PL.x1 - PL.x0) / n, bw = Math.min(250, slot * 0.58);
    bars.forEach((b, i) => {
      const cx = PL.x0 + slot * (i + 0.5), t0 = 0.55 + i * 0.5, u = easeOut((lt - t0) / 1.0);
      const last = i === n - 1, col = last ? P.A : 'rgba(232,236,244,0.78)', colGlow = last ? P.A : null;
      const hFull = (clamp(+b.value / yMax, 0, 1.05)) * (PL.y1 - PL.y0), h = hFull * u, top = PL.y1 - h;
      if (u > 0.002) {
        c.save();
        c.fillStyle = V.lg(c, 0, top, 0, PL.y1, [[0, last ? rgba(P.A, 0.34) : 'rgba(232,236,244,0.20)'], [1, last ? rgba(P.A, 0.04) : 'rgba(232,236,244,0.02)']]);
        c.fillRect(cx - bw / 2, top, bw, h);
        if (colGlow) { c.shadowColor = rgba(P.A, 0.7); c.shadowBlur = 20; }
        c.strokeStyle = col; c.lineWidth = 2.5; c.lineCap = 'butt';
        c.beginPath(); c.moveTo(cx - bw / 2, PL.y1); c.lineTo(cx - bw / 2, top); c.lineTo(cx + bw / 2, top); c.lineTo(cx + bw / 2, PL.y1); c.stroke();
        c.shadowBlur = 0; c.restore();
        // facet lines inside the bar (wireframe feel)
        c.save(); c.globalAlpha = 0.25 * u; c.strokeStyle = col; c.lineWidth = 1;
        for (let k = 1; k < 4; k++) { const y = PL.y1 - (PL.y1 - top) * k / 4; c.beginPath(); c.moveTo(cx - bw / 2, y); c.lineTo(cx + bw / 2, y); c.stroke(); }
        c.restore();
      }
      // value above (counts up), unit after it
      if (u > 0.02) {
        const v = +b.value * u, str = X.fmtVal(v), size = bw > 190 ? 72 : 60;
        const wN = X.meas(str, X.fSans(800, size), 0), uni = ch.unit ? X.up(ch.unit) : '', wU = uni ? X.meas(uni, X.fMono(400, 24), 3.4) + 12 : 0;
        const x0 = cx - (wN + wU) / 2, y = top - 46;
        c.save(); c.globalAlpha = clamp(u * 2);
        X.text(c, str, x0, y, { size, wt: 800, color: last ? P.A : P.text, glow: last ? 26 : 0, glowColor: rgba(P.A, 0.45), ls: -0.01 });
        if (uni) X.text(c, uni, x0 + wN + 12, y + size * 0.14, { size: 24, mono: true, ls: 0.14, color: P.muted });
        c.restore();
      }
      // bar label under the baseline
      const la = easeOut((lt - t0 + 0.1) / 0.5);
      const lines = X.wrap(X.up(b.label || ''), { mono: true, ls: 0.12 }, Math.min(slot - 20, 300), 21).slice(0, 3);
      lines.forEach((l, k) => X.text(c, l, cx, PL.y1 + 38 + k * 28, { size: 21, mono: true, ls: 0.12, align: 'center', color: last ? P.text : P.muted, alpha: la }));
      X.path(c, [[cx, PL.y1], [cx, PL.y1 + 8]], { w: 1.5, color: 'rgba(232,236,244,0.5)', cap: 'butt', alpha: la });
    });
  };

  /* ================================================================ flow */
  const SIGN_NEG = new Set(['−', '-', '–', '—']);
  function layoutFlow(nodes, edgesRaw) {
    const n = nodes.length, idx = new Map(nodes.map((nd, i) => [nd.id, i]));
    const edges = [];
    (edgesRaw || []).forEach((e) => {
      const a = idx.get(e[0]), b = idx.get(e[1]);
      if (a != null && b != null && a !== b) edges.push({ a, b, label: e[2] == null ? '' : String(e[2]), back: false });
    });
    // back edges: DFS from the roots, an edge into a node on the stack closes a cycle
    const out = nodes.map(() => []), indeg = nodes.map(() => 0);
    edges.forEach((e, i) => { out[e.a].push(i); indeg[e.b]++; });
    const state = nodes.map(() => 0);
    const dfs = (u) => { state[u] = 1; for (const ei of out[u]) { const v = edges[ei].b; if (state[v] === 1) edges[ei].back = true; else if (state[v] === 0) dfs(v); } state[u] = 2; };
    nodes.forEach((_, i) => { if (!indeg[i] && !state[i]) dfs(i); });
    nodes.forEach((_, i) => { if (!state[i]) dfs(i); });
    // layers = longest path over the forward edges
    const layer = nodes.map(() => 0);
    for (let it = 0; it < n; it++) edges.forEach((e) => { if (!e.back && layer[e.b] < layer[e.a] + 1) layer[e.b] = layer[e.a] + 1; });
    // nodes without any edge keep list order below the connected ones
    const touched = new Set(); edges.forEach((e) => { touched.add(e.a); touched.add(e.b); });
    let maxL = Math.max(0, ...nodes.map((_, i) => (touched.has(i) ? layer[i] : 0)));
    nodes.forEach((_, i) => { if (!touched.has(i)) layer[i] = (touched.size ? ++maxL : i); });
    return { edges, layer, rows: Math.max(...layer) + 1 };
  }

  SC.flow = (c, lt, sc) => {
    const nodes = (sc.nodes || []).slice(0, 8), n = nodes.length;
    if (!n) return;
    const { edges, layer, rows } = layoutFlow(nodes, sc.edges);
    const byRow = Array.from({ length: rows }, () => []);
    nodes.forEach((_, i) => byRow[layer[i]].push(i));
    const chain = byRow.every((r) => r.length === 1) && rows > 4;           // long single chain -> zigzag
    const top = 540, bot = 1340;
    const h = clamp((bot - top) / rows * 0.56, 80, 114), pitch = rows > 1 ? clamp((bot - top - h) / (rows - 1), h + 66, h + 124) : 0;
    const y0 = (top + bot) / 2 - (h + pitch * (rows - 1)) / 2 + h / 2;
    const pos = nodes.map(() => null);
    byRow.forEach((r, row) => {
      const m = r.length, w = m === 1 ? 560 : m === 2 ? 420 : 296, gap = 36;
      r.forEach((i, j) => {
        let cx = 540 + (j - (m - 1) / 2) * (w + gap);
        if (chain) cx = 540 + (row % 2 ? 1 : -1) * 112;
        pos[i] = { x: cx, y: y0 + row * pitch, w: chain ? 540 : w, h, row };
      });
    });
    // timing: nodes appear one after another across the first ~78% of the scene
    const t0 = 0.4, t1 = Math.max(t0 + 0.6 * n, sc.dur * 0.78);
    const order = nodes.map((_, i) => i).sort((a, b) => layer[a] - layer[b] || a - b);
    const tn = nodes.map((_, i) => t0 + (n > 1 ? (t1 - t0) * order.indexOf(i) / (n - 1) : 0));
    const sgn = (e) => (SIGN_NEG.has(e.label) ? 'neg' : e.label === '+' ? 'pos' : e.label === '?' ? 'q' : e.label ? 'text' : 'none');

    // ---- edges (under the nodes)
    const backCount = {};
    edges.forEach((e, ei) => {
      const A = pos[e.a], B = pos[e.b];
      let pts;
      if (e.back) {
        const lo = Math.min(A.row, B.row), hi = Math.max(A.row, B.row);
        let xr = 0; pos.forEach((q) => { if (q.row >= lo && q.row <= hi) xr = Math.max(xr, q.x + q.w / 2); });
        const k = (backCount[`${lo}-${hi}`] = (backCount[`${lo}-${hi}`] || 0) + 1) - 1, ox = Math.min(1004, xr + 58 + k * 34);
        pts = chamfer([[A.x + A.w / 2, A.y], [ox, A.y], [ox, B.y], [B.x + B.w / 2, B.y]], 22);
      } else if (A.row === B.row) pts = [[A.x + A.w / 2, A.y], [B.x - B.w / 2, B.y]];
      else pts = [[A.x, A.y + A.h / 2], [B.x, B.y - B.h / 2]];
      e.pts = pts;
      const ts = Math.max(tn[e.a], tn[e.b]) + 0.12, u = easeOut((lt - ts) / 0.5);
      if (u <= 0) return;
      const part = X.partial(pts, u);
      X.path(c, part.pts, { w: 2, color: 'rgba(232,236,244,0.5)' });
      if (u > 0.97) {
        // arrow head
        const q = pts[pts.length - 1], pr = pts[pts.length - 2], ang = Math.atan2(q[1] - pr[1], q[0] - pr[0]);
        c.save(); c.translate(q[0], q[1]); c.rotate(ang); c.strokeStyle = 'rgba(232,236,244,0.8)'; c.lineWidth = 2.2; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(-13, -8); c.lineTo(0, 0); c.lineTo(-13, 8); c.stroke(); c.restore();
        // travelling pulse (+ short trail)
        const kind = sgn(e), col = kind === 'neg' ? P.neg : kind === 'q' ? P.muted : P.A;
        const per = 1.8, ph = (((lt - ts) / per + ei * 0.31) % 1 + 1) % 1;
        for (let k = 5; k >= 0; k--) {
          const uu = ph - k * 0.022; if (uu < 0) continue;
          const pp = X.along(pts, uu);
          X.circle(c, pp.x, pp.y, k === 0 ? 5.5 : 4.2 - k * 0.4, { fill: k === 0 ? '#FFFFFF' : col, alpha: k === 0 ? 1 : 0.5 - k * 0.07, glow: k === 0 ? 16 : 0, glowColor: col });
        }
        // sign / label at the midpoint
        const m = X.along(pts, 0.5), la = easeOut((lt - ts - 0.5) / 0.4), kk = sgn(e);
        if (kk !== 'none' && la > 0) {
          c.save(); c.globalAlpha = la; c.translate(m.x, m.y);
          const colS = kk === 'neg' ? P.neg : kk === 'pos' ? P.A : kk === 'q' ? P.muted : P.A;
          if (kk === 'text') {
            const lab = X.up(e.label), size = 21, tw = X.meas(lab, X.fMono(400, size), 0.1 * size), pw = tw + 34, ph2 = 38;
            X.rrect(c, -pw / 2, -ph2 / 2, pw, ph2, ph2 / 2, { fill: 'rgba(7,11,22,0.95)', color: rgba(P.A, 0.7), w: 1.5 });
            X.text(c, lab, 0, 0, { size, mono: true, ls: 0.1, align: 'center', color: P.text });
          } else {
            X.circle(c, 0, 0, 25, { fill: 'rgba(7,11,22,0.95)' });
            X.circle(c, 0, 0, 25, { color: colS, w: 2, glow: kk === 'q' ? 0 : 14 });
            X.text(c, kk === 'neg' ? '−' : e.label, 0, kk === 'neg' ? -1 : 1, { size: 36, wt: 800, align: 'center', color: colS });
          }
          c.restore();
        }
      }
    });
    // ---- nodes
    nodes.forEach((nd, i) => {
      const q = pos[i], a = easeOut((lt - tn[i]) / 0.5);
      if (a <= 0) return;
      const flash = Math.exp(-Math.max(0, lt - tn[i]) * 3.0);
      c.save(); c.globalAlpha = a; c.translate(q.x, q.y + (1 - a) * 14);
      c.beginPath(); V.rr(c, -q.w / 2, -q.h / 2, q.w, q.h, 16);
      c.fillStyle = 'rgba(7,11,22,0.9)'; c.fill();
      c.fillStyle = V.lg(c, 0, -q.h / 2, 0, q.h / 2, [[0, rgba(P.A, 0.07)], [1, rgba(P.A, 0)]]); c.fill();
      c.lineWidth = 2; c.strokeStyle = rgba(P.A, 0.95); c.shadowColor = rgba(P.A, 0.5 + 0.4 * flash); c.shadowBlur = 14 + 14 * flash; c.stroke(); c.shadowBlur = 0;
      X.text(c, String(i + 1).padStart(2, '0'), -q.w / 2 + 20, -q.h / 2 + 22, { size: 16, mono: true, ls: 0.1, color: P.muted, alpha: 0.8 });
      const lab = String(nd.label || ''), sub = nd.sub == null ? '' : String(nd.sub);
      const size = X.fit(lab, { wt: 800 }, q.w - 90, Math.round(q.h * 0.41), 22);
      X.text(c, lab, 0, sub ? -q.h * 0.11 : 0, { size, wt: 800, align: 'center', color: P.text });
      if (sub) {
        const ss = X.fit(X.up(sub), { mono: true, ls: 0.12 }, q.w - 60, Math.max(18, Math.round(q.h * 0.2)), 14);
        X.tech(c, sub, 0, q.h * 0.27, { size: ss, ls: 0.12, align: 'center', color: P.muted });
      }
      c.restore();
    });
  };
  // cut the corners of a polyline (technical "chamfer" look)
  function chamfer(pts, r) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1], b = pts[i], d = pts[i + 1];
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(d[0] - b[0], d[1] - b[1]), rr = Math.min(r, l1 / 2, l2 / 2);
      out.push([b[0] + (a[0] - b[0]) * rr / l1, b[1] + (a[1] - b[1]) * rr / l1], [b[0] + (d[0] - b[0]) * rr / l2, b[1] + (d[1] - b[1]) * rr / l2]);
    }
    out.push(pts[pts.length - 1]); return out;
  }

  /* ================================================================ map */
  const BOX = { x: 120, y: 520, w: 840, h: 770 };
  // Yellowstone, stylised: unit-square polygon (x east, y south), NW corner stepped / notched, a bump on the east side
  const YELLOWSTONE = [
    [0.30, 0.20], [0.30, 0.07], [0.36, 0.0], [0.50, 0.0], [0.56, 0.08], [0.86, 0.08], [0.92, 0.17], [0.90, 0.36],
    [1.0, 0.42], [1.0, 0.62], [0.92, 0.69], [0.93, 0.93], [0.64, 1.0], [0.11, 1.0], [0.10, 0.60], [0.0, 0.40], [0.0, 0.26], [0.17, 0.20],
  ];
  // very coarse coasts as [lon, lat]
  const EUROPE = [
    [[-9.5, 43.0], [-9.0, 37.0], [-5.5, 36.0], [0.0, 38.8], [3.2, 42.0], [7.5, 43.8], [10.5, 43.0], [15.7, 38.0], [18.5, 40.2], [13.5, 43.7], [12.3, 45.2], [15.5, 44.0], [19.0, 41.8], [22.5, 36.5], [24.0, 40.5], [28.0, 41.2], [29.5, 45.2], [35.0, 46.5], [35.0, 62.0], [31.0, 70.0], [25.0, 71.0], [15.0, 68.5], [8.0, 63.5], [5.0, 61.0], [5.5, 58.5], [8.0, 57.0], [8.2, 55.0], [8.7, 53.8], [4.5, 52.5], [3.0, 51.2], [-1.5, 49.7], [-4.5, 48.5], [-1.5, 46.2], [-1.8, 43.4]],
    [[-5.5, 50.0], [1.5, 51.0], [1.8, 52.8], [-0.2, 54.5], [-2.0, 57.5], [-3.5, 58.6], [-6.0, 57.5], [-5.0, 55.5], [-3.2, 54.8], [-4.5, 53.3], [-5.0, 51.7]],
    [[-10.0, 51.8], [-6.0, 52.2], [-6.0, 54.6], [-8.5, 55.2], [-10.2, 53.5]],
    [[-24.0, 64.5], [-22.0, 66.2], [-16.0, 66.5], [-13.5, 65.0], [-18.0, 63.5]],
  ];
  const WORLD = [
    [[-168, 66], [-140, 70], [-100, 72], [-80, 73], [-62, 60], [-55, 50], [-70, 42], [-76, 35], [-81, 25], [-97, 26], [-105, 20], [-95, 16], [-83, 9], [-80, 8], [-92, 14], [-110, 24], [-117, 33], [-125, 42], [-125, 50], [-140, 59], [-160, 58]],
    [[-80, 8], [-60, 10], [-50, 0], [-35, -6], [-40, -22], [-55, -35], [-65, -42], [-70, -54], [-75, -45], [-72, -30], [-80, -5]],
    [[-10, 36], [-17, 15], [-10, 5], [8, 4], [10, -2], [14, -17], [20, -35], [30, -32], [40, -15], [51, 11], [43, 12], [35, 30], [32, 31], [10, 37], [-6, 36]],
    [[-10, 36], [-10, 44], [-2, 48], [5, 52], [8, 58], [5, 62], [15, 69], [30, 71], [60, 70], [100, 77], [140, 72], [170, 67], [160, 58], [142, 46], [130, 35], [122, 30], [120, 22], [108, 12], [100, 2], [92, 20], [80, 8], [72, 20], [58, 24], [50, 30], [36, 36], [28, 41], [22, 36], [12, 44], [0, 38]],
    [[114, -22], [122, -18], [136, -12], [146, -19], [153, -28], [147, -38], [135, -35], [116, -35]],
    [[-180, -70], [-120, -73], [-60, -76], [0, -72], [60, -68], [120, -66], [180, -70], [180, -85], [-180, -85]],
  ];
  const REGIONS = {
    yellowstone: { rect: { x: 245, y: 550, w: 590, h: 712 }, lon: [-111.16, -109.78], lat: [45.12, 44.12], unit: [YELLOWSTONE], gLat: 0.25, gLon: 0.5, dots: 27 },
    europe: { rect: { x: 163, y: 530, w: 754, h: 750 }, lon: [-26, 36], lat: [72, 34], polys: EUROPE, gLat: 10, gLon: 10, dots: 30 },
    world: { rect: { x: 120, y: 740, w: 840, h: 340 }, lon: [-180, 180], lat: [82, -88], polys: WORLD, gLat: 30, gLon: 30, dots: 24 },
  };
  const fmtLat = (v) => `${+Math.abs(v).toFixed(2)}°${v >= 0 ? 'N' : 'S'}`;
  const fmtLon = (v) => `${+Math.abs(v).toFixed(2)}°${v >= 0 ? 'E' : 'W'}`;
  function regionOf(name) {
    const r = REGIONS[String(name || '').toLowerCase()] || { rect: { x: BOX.x + 60, y: BOX.y + 40, w: BOX.w - 120, h: BOX.h - 80 }, lon: [-1, 1], lat: [1, -1], polys: [], gLat: 0.5, gLon: 0.5, dots: 28, generic: true };
    if (r.__ready) return r;
    const R = r.rect;
    r.toXY = (lon, lat) => [R.x + (lon - r.lon[0]) / (r.lon[1] - r.lon[0]) * R.w, R.y + (r.lat[0] - lat) / (r.lat[0] - r.lat[1]) * R.h];
    r.unitXY = (u, v) => [R.x + u * R.w, R.y + v * R.h];
    r.toLL = (u, v) => [r.lon[0] + u * (r.lon[1] - r.lon[0]), r.lat[0] - v * (r.lat[0] - r.lat[1])];
    r.shapes = r.unit ? r.unit.map((poly) => poly.map((q) => r.unitXY(q[0], q[1]))) : (r.polys || []).map((poly) => poly.map((q) => r.toXY(q[0], q[1])));
    if (r.generic) r.shapes = [[[R.x, R.y], [R.x + R.w, R.y], [R.x + R.w, R.y + R.h], [R.x, R.y + R.h]]];
    r.__ready = true; return r;
  }
  // Chaikin smoothing for river-like paths
  function smooth(pts, it = 2) {
    for (let k = 0; k < it; k++) {
      const o = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
      o.push(pts[pts.length - 1]); pts = o;
    }
    return pts;
  }

  SC.map = (c, lt, sc) => {
    const R = regionOf(sc.region), ra = easeOut(lt / 0.6);
    // ---- map box: hairline frame, graticule, tick labels
    c.save(); c.globalAlpha = ra;
    c.strokeStyle = 'rgba(232,236,244,0.16)'; c.lineWidth = 1; c.strokeRect(BOX.x + 0.5, BOX.y + 0.5, BOX.w, BOX.h);
    c.beginPath(); c.rect(BOX.x, BOX.y, BOX.w, BOX.h); c.clip();
    const latMax = R.lat[0] + (R.rect.y - BOX.y) / R.rect.h * (R.lat[0] - R.lat[1]), latMin = R.lat[1] - (BOX.y + BOX.h - R.rect.y - R.rect.h) / R.rect.h * (R.lat[0] - R.lat[1]);
    const lonMin = R.lon[0] - (R.rect.x - BOX.x) / R.rect.w * (R.lon[1] - R.lon[0]), lonMax = R.lon[1] + (BOX.x + BOX.w - R.rect.x - R.rect.w) / R.rect.w * (R.lon[1] - R.lon[0]);
    const lats = [], lons = [];
    for (let v = Math.ceil(latMin / R.gLat) * R.gLat; v <= latMax + 1e-9; v += R.gLat) lats.push(+v.toFixed(4));
    for (let v = Math.ceil(lonMin / R.gLon) * R.gLon; v <= lonMax + 1e-9; v += R.gLon) lons.push(+v.toFixed(4));
    c.lineWidth = 1; c.strokeStyle = 'rgba(232,236,244,0.075)';
    const gl = easeOut(lt / 1.0);
    lats.forEach((v, i) => { const y = R.toXY(0, v)[1]; if (R.generic) return; c.beginPath(); c.moveTo(BOX.x, y); c.lineTo(BOX.x + BOX.w * gl, y); c.stroke(); });
    lons.forEach((v) => { const x = R.toXY(v, 0)[0]; if (R.generic) return; c.beginPath(); c.moveTo(x, BOX.y); c.lineTo(x, BOX.y + BOX.h * gl); c.stroke(); });
    c.restore();
    c.save(); c.globalAlpha = ra * 0.85;
    if (!R.generic) {
      lats.forEach((v) => { const y = R.toXY(0, v)[1]; if (y > BOX.y + 24 && y < BOX.y + BOX.h - 14) X.text(c, fmtLat(v), BOX.x + 12, y - 13, { size: 17, mono: true, ls: 0.08, color: P.muted, alpha: 0.85 }); });
      lons.forEach((v) => { const x = R.toXY(v, 0)[0]; if (x > BOX.x + 70 && x < BOX.x + BOX.w - 70) X.text(c, fmtLon(v), x, BOX.y + BOX.h - 18, { size: 17, mono: true, ls: 0.08, color: P.muted, align: 'center', alpha: 0.85 }); });
    }
    c.restore();

    // ---- region: dotted fill + glowing outline that traces itself on
    const ou = easeInOut(clamp((lt - 0.25) / 1.5));
    R.shapes.forEach((poly, si) => {
      const closed = poly.concat([poly[0]]);
      c.save();
      c.beginPath(); poly.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath();
      c.fillStyle = rgba(P.A, 0.05 * easeOut((lt - 1.0) / 0.8)); c.fill();
      // dot lattice inside (clipped to the polygon)
      c.clip();
      const step = R.dots, da = easeOut((lt - 0.9) / 0.8) * 0.2;
      c.fillStyle = rgba(P.A, da);
      const bx0 = Math.min(...poly.map((q) => q[0])), bx1 = Math.max(...poly.map((q) => q[0])), by0 = Math.min(...poly.map((q) => q[1])), by1 = Math.max(...poly.map((q) => q[1]));
      for (let yy = by0, row = 0; yy < by1; yy += step * 0.866, row++) for (let xx = bx0 + (row % 2 ? step / 2 : 0); xx < bx1; xx += step) c.fillRect(xx - 1, yy - 1, 2, 2);
      c.restore();
      const part = X.partial(closed, ou);
      X.path(c, part.pts, { w: 2.5, color: P.A, glow: 20 });
      // faint inner outline for depth
      if (ou > 0.99 && !R.generic) {
        let cx = 0, cy = 0; poly.forEach((q) => { cx += q[0]; cy += q[1]; }); cx /= poly.length; cy /= poly.length;
        X.path(c, poly.map((q) => [cx + (q[0] - cx) * 0.965, cy + (q[1] - cy) * 0.965]), { w: 1, color: rgba(P.A, 0.28), closed: true });
        // travelling highlight along the outline
        const L = X.polyLen(closed), dash = 90;
        c.save(); c.setLineDash([dash, L]); c.lineDashOffset = -((lt * 140 + si * 300) % L) + 0; c.lineWidth = 3.5; c.strokeStyle = '#FFFFFF'; c.globalAlpha = 0.6; c.lineCap = 'round';
        c.beginPath(); closed.forEach((q, i) => (i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.stroke(); c.restore();
      } else if (part.pts.length > 1) X.circle(c, part.head[0], part.head[1], 5, { fill: '#FFFFFF', glow: 18, glowColor: P.A });
    });

    // ---- paths (rivers): draw on over the first 60% of the scene
    const pEnd = Math.max(2.0, sc.dur * 0.6);
    (sc.paths || []).forEach((pa, pi) => {
      if (!pa || !Array.isArray(pa.points) || pa.points.length < 2) return;
      const pts = smooth(pa.points.map((q) => R.unitXY(q[0], q[1])), 2), u = easeInOut(clamp((lt - 0.6) / (pEnd - 0.6)));
      const part = X.partial(pts, u);
      if (part.pts.length > 1) X.path(c, part.pts, { w: 3.5, color: P.B, glow: 18, glow2: true });
      if (u > 0 && u < 0.999) { X.circle(c, part.head[0], part.head[1], 14, { color: rgba(P.B, 0.35), w: 1.5 }); X.circle(c, part.head[0], part.head[1], 6, { fill: '#FFFFFF', glow: 20, glowColor: P.B }); }
      if (u >= 0.999 && pa.label) {
        const m = X.along(pts, 0.55), la = easeOut((lt - pEnd) / 0.6), left = m.x > 540;
        X.text(c, pa.label, left ? m.x - 24 : m.x + 24, m.y, { size: 19, mono: true, ls: 0.12, color: P.B, align: left ? 'right' : 'left', up: true, alpha: la });
      }
    });

    // ---- markers: dot + expanding rings + leader line + label (label side chosen so it avoids outlines, rivers and other labels)
    const obstacles = R.shapes.map((poly) => poly.concat([poly[0]]));
    (sc.paths || []).forEach((pa) => { if (pa && Array.isArray(pa.points) && pa.points.length > 1) obstacles.push(smooth(pa.points.map((q) => R.unitXY(q[0], q[1])), 2)); });
    const mks = (sc.markers || []).filter((mk) => mk && isFinite(mk.x) && isFinite(mk.y));
    mks.forEach((mk) => obstacles.push([R.unitXY(mk.x, mk.y), (() => { const q = R.unitXY(mk.x, mk.y); return [q[0] + 1, q[1] + 1]; })()]));
    mks.forEach((mk, i) => {
      const [mx, my] = R.unitXY(mk.x, mk.y), size = 23, text = X.up(mk.label || '');
      const coord = R.generic ? '' : (() => { const q = R.toLL(mk.x, mk.y); return `${fmtLat(+q[1].toFixed(2))} ${fmtLon(+q[0].toFixed(2))}`; })();
      const tw = Math.max(X.meas(text, X.fMono(400, size), 0.14 * size), coord ? X.meas(coord, X.fMono(400, 17), 0.08 * 17) : 0), w = tw + 4;
      const pref = mk.x > 0.5 ? -1 : 1, cands = [];
      [[34, 40], [34, 84], [78, 40], [78, 84]].forEach(([ox, oy]) => [[pref, -1], [pref, 1], [-pref, -1], [-pref, 1]].forEach(([d, v]) => {
        const kx = mx + d * ox, ky = my + v * oy, x = d > 0 ? kx + 8 : kx - 8 - w;
        cands.push({ x, y: ky - 36, w, h: 66, d, v, kx, ky, mx, my });
      }));
      const r = pickRect(cands, obstacles, { x0: BOX.x + 8, x1: BOX.x + BOX.w - 8, y0: BOX.y + 8, y1: BOX.y + BOX.h - 8 }, 10);
      obstacles.push([[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h], [r.x, r.y], [r.x + r.w, r.y + r.h]]);
      const t0 = 1.0 + i * 0.5, a = easeOut((lt - t0) / 0.5);
      if (a <= 0) return;
      c.save(); c.globalAlpha = a;
      for (let k = 0; k < 2; k++) {
        const ph = (((lt - t0) / 2.2 + k * 0.5 + i * 0.17) % 1 + 1) % 1;
        X.circle(c, mx, my, 8 + ph * 46, { color: rgba(P.A, 0.6 * (1 - ph)), w: 2 });
      }
      X.circle(c, mx, my, 7, { fill: P.A, glow: 20 });
      X.circle(c, mx, my, 3, { fill: '#FFFFFF' });
      const ll = easeOut((lt - t0 - 0.2) / 0.5);
      const lpts = X.partial([[mx + r.d * 8, my + r.v * 8], [r.kx, r.ky], [r.kx + r.d * (w + 18), r.ky]], ll);
      if (ll > 0.3) X.rrect(c, r.x - 8, r.y - 2, w + 16, 66, 8, { fill: 'rgba(5,7,14,0.80)', alpha: clamp((ll - 0.3) * 3) });
      X.path(c, lpts.pts, { w: 1.5, color: rgba(P.text, 0.7) });
      if (ll > 0.5) {
        const ta = clamp((ll - 0.5) * 2);
        X.text(c, text, r.x, r.ky - 18, { size, mono: true, ls: 0.14, color: P.text, align: 'left', alpha: ta });
        if (coord) X.text(c, coord, r.x, r.ky + 16, { size: 17, mono: true, ls: 0.08, color: P.muted, align: 'left', alpha: ta });
      }
      c.restore();
    });
  };
})();
