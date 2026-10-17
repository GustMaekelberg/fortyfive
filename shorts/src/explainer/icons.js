/* explainer/icons.js — faceted "wireframe CGI" hero icons for the explainer theme.
   Each icon is a function of local time returning strokes in a 0..1 box: {strokes:[{p:[[x,y]..], closed?, k, f?}], rot?}
     k = main (accent, glow) | dim (accent, faint) | inner (white, thin) | accent (secondary colour, glow) | accentDim
     f = fill alpha for closed shapes (appears after the trace)
   X.drawIcon(c, name, cx, cy, size, lt) traces the strokes on over ~1 s, batches them per style (one glow pass each) and returns
   {anchor(side, y) -> [x,y]} so callouts can point at a vertex on the icon. Hero names: wolf elk beaver willow river dna cell bacteria
   virus molecule leaf gear (anything else gets a rotating icosahedron). */
(() => {
  const V = window.V, X = V.X;
  const { PI2, clamp, lerp, rgba } = V;
  const P = X.P;

  const mir = (h) => h.concat(h.slice(1, -1).reverse().map(([x, y]) => [1 - x, y]));     // symmetric closed outline from a right half
  const flip = (pts) => pts.map(([x, y]) => [1 - x, y]);
  const S = (p, k = 'main', extra) => Object.assign({ p, k }, extra);
  const both = (p, k = 'inner', extra) => [S(p, k, extra), S(flip(p), k, extra)];
  const ring = (cx, cy, rx, ry, n = 24, a0 = 0, rot = 0) => Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * PI2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
  });
  const rotPts = (pts, a, cx = 0.5, cy = 0.5) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);

  const ICONS = {};

  /* ---- wolf: front-facing head, two ears, long muzzle ------------------------------------------------------------ */
  ICONS.wolf = () => {
    const half = [[0.50, 0.21], [0.60, 0.19], [0.72, 0.01], [0.79, 0.27], [0.85, 0.37], [0.96, 0.47], [0.87, 0.55], [0.94, 0.69], [0.79, 0.67], [0.70, 0.78], [0.62, 0.85], [0.57, 0.93], [0.50, 0.97]];
    const st = [S(mir(half), 'main', { closed: true, f: 0.05 })];
    st.push(...both([[0.62, 0.20], [0.71, 0.08], [0.75, 0.26]], 'inner', { closed: true }));
    st.push(S([[0.50, 0.21], [0.50, 0.80]], 'inner'));
    st.push(...both([[0.60, 0.19], [0.58, 0.40]], 'inner'), ...both([[0.79, 0.27], [0.70, 0.37]], 'inner'), ...both([[0.85, 0.37], [0.70, 0.37]], 'inner'));
    st.push(...both([[0.58, 0.41], [0.71, 0.37], [0.66, 0.47]], 'accent', { closed: true, f: 0.35 }));
    st.push(...both([[0.66, 0.47], [0.79, 0.67]], 'inner'), ...both([[0.66, 0.47], [0.58, 0.63], [0.50, 0.80]], 'inner'), ...both([[0.58, 0.63], [0.70, 0.78]], 'inner'), ...both([[0.87, 0.55], [0.66, 0.47]], 'inner'));
    st.push(S([[0.44, 0.82], [0.56, 0.82], [0.50, 0.91]], 'accent', { closed: true, f: 0.5 }));
    return { strokes: st };
  };

  /* ---- elk: head with a big branching rack of antlers ------------------------------------------------------------- */
  ICONS.elk = () => {
    const half = [[0.50, 0.47], [0.58, 0.46], [0.66, 0.48], [0.85, 0.43], [0.71, 0.56], [0.65, 0.63], [0.63, 0.77], [0.58, 0.87], [0.55, 0.93], [0.50, 0.97]];
    const st = [S(mir(half), 'main', { closed: true, f: 0.05 })];
    st.push(S([[0.50, 0.47], [0.50, 0.84]], 'inner'), ...both([[0.58, 0.46], [0.57, 0.62], [0.65, 0.63]], 'inner'), ...both([[0.57, 0.62], [0.55, 0.86]], 'inner'), ...both([[0.66, 0.48], [0.71, 0.56]], 'inner'));
    st.push(...both([[0.55, 0.59], [0.62, 0.57], [0.60, 0.65]], 'accent', { closed: true, f: 0.35 }));
    st.push(S([[0.45, 0.85], [0.55, 0.85], [0.50, 0.92]], 'accent', { closed: true, f: 0.5 }));
    // antlers: main beam sweeping up and out + tines
    st.push(...both([[0.57, 0.46], [0.60, 0.37], [0.66, 0.29], [0.73, 0.21], [0.81, 0.14], [0.90, 0.09], [0.97, 0.12]], 'main'));
    st.push(...both([[0.60, 0.37], [0.54, 0.25], [0.55, 0.12], [0.52, 0.05]], 'main'));
    st.push(...both([[0.66, 0.29], [0.62, 0.17], [0.65, 0.06]], 'main'));
    st.push(...both([[0.73, 0.21], [0.74, 0.08], [0.79, 0.02]], 'main'));
    st.push(...both([[0.81, 0.14], [0.86, 0.25], [0.93, 0.28]], 'main'));
    st.push(...both([[0.90, 0.09], [0.96, 0.02]], 'main'));
    return { strokes: st };
  };

  /* ---- beaver: front-facing head, round ears, wide nose, two big incisors, whiskers ------------------------------------ */
  ICONS.beaver = () => {
    const half = [[0.50, 0.15], [0.64, 0.17], [0.76, 0.25], [0.85, 0.38], [0.88, 0.52], [0.84, 0.65], [0.74, 0.76], [0.62, 0.82], [0.55, 0.85], [0.50, 0.86]];
    const st = [S(mir(half), 'main', { closed: true, f: 0.05 })];
    st.push(...both([[0.72, 0.22], [0.77, 0.10], [0.88, 0.11], [0.91, 0.23], [0.85, 0.33]], 'main', { closed: true, f: 0.05 }));
    st.push(...both([[0.75, 0.21], [0.80, 0.16], [0.86, 0.24]], 'inner', { closed: true }));
    st.push(S([[0.50, 0.15], [0.50, 0.55]], 'inner'), ...both([[0.64, 0.17], [0.60, 0.40]], 'inner'), ...both([[0.76, 0.25], [0.70, 0.37]], 'inner'), ...both([[0.85, 0.38], [0.70, 0.37]], 'inner'));
    st.push(...both([[0.70, 0.37], [0.88, 0.52]], 'inner'), ...both([[0.68, 0.46], [0.84, 0.65]], 'inner'), ...both([[0.68, 0.46], [0.60, 0.60], [0.74, 0.76]], 'inner'));
    st.push(...both([[0.60, 0.41], [0.70, 0.37], [0.68, 0.46]], 'accent', { closed: true, f: 0.4 }));
    st.push(S([[0.42, 0.55], [0.58, 0.55], [0.62, 0.61], [0.50, 0.68], [0.38, 0.61]], 'accent', { closed: true, f: 0.35 }));
    st.push(S([[0.50, 0.68], [0.50, 0.75]], 'inner'), ...both([[0.50, 0.73], [0.60, 0.77]], 'inner'));
    st.push(...both([[0.62, 0.60], [0.99, 0.54]], 'inner'), ...both([[0.62, 0.64], [1.00, 0.66]], 'inner'), ...both([[0.62, 0.68], [0.97, 0.78]], 'inner'));
    st.push(S([[0.435, 0.74], [0.50, 0.74], [0.50, 0.95], [0.445, 0.93]], 'main', { closed: true, f: 0.5 }), S([[0.565, 0.74], [0.50, 0.74], [0.50, 0.95], [0.555, 0.93]], 'main', { closed: true, f: 0.5 }));
    return { strokes: st };
  };

  /* ---- willow: scalloped dome with long drooping strands (they sway) ---------------------------------------------------- */
  ICONS.willow = (lt) => {
    const trunk = [[0.47, 0.36], [0.45, 0.55], [0.41, 0.80], [0.35, 0.95], [0.65, 0.95], [0.59, 0.80], [0.55, 0.55], [0.53, 0.36]];
    const dome = [[0.05, 0.54], [0.07, 0.38], [0.15, 0.25], [0.28, 0.15], [0.42, 0.09], [0.50, 0.08], [0.58, 0.09], [0.72, 0.15], [0.85, 0.25], [0.93, 0.38], [0.95, 0.54]];
    const st = [S(trunk, 'main', { closed: true, f: 0.04 }), S(dome, 'main')];
    st.push(S([[0.50, 0.46], [0.31, 0.30], [0.22, 0.30]], 'fine'), S([[0.50, 0.44], [0.69, 0.27], [0.79, 0.28]], 'fine'), S([[0.50, 0.42], [0.50, 0.14]], 'fine'), S([[0.50, 0.34], [0.40, 0.20]], 'fine'), S([[0.50, 0.34], [0.60, 0.19]], 'fine'));
    st.push(S([[0.08, 0.95], [0.92, 0.95]], 'dim'));
    const domeY = (x) => { for (let i = 1; i < dome.length; i++) if (x <= dome[i][0]) return lerp(dome[i - 1][1], dome[i][1], (x - dome[i - 1][0]) / (dome[i][0] - dome[i - 1][0])); return 0.54; };
    const tips = [];
    for (let i = 0; i < 21; i++) {
      const x = 0.07 + (i / 20) * 0.86, edge = Math.abs(x - 0.5) * 2, y0 = domeY(x) + 0.015, yEnd = 0.70 + 0.20 * edge + 0.04 * Math.sin(i * 2.3), dir = x < 0.5 ? -1 : 1;
      const pts = []; for (let k = 0; k <= 7; k++) { const v = k / 7; pts.push([x + dir * 0.03 * Math.pow(v, 1.6) * (0.4 + edge) + 0.02 * Math.sin(lt * 0.9 + i * 0.8 + v * 1.5) * v * v, y0 + v * (yEnd - y0)]); }
      st.push(S(pts, 'fine')); tips.push(pts[pts.length - 1]);
    }
    return { strokes: st, dots: tips.concat(dome) };
  };

  /* ---- river: meanders receding to a mountain horizon ----------------------------------------------------------------- */
  ICONS.river = (lt) => {
    const L = [], R = [], M = [];
    for (let i = 0; i <= 30; i++) {
      const v = i / 30, y = 0.44 + 0.53 * v, c = 0.5 + 0.17 * Math.sin(v * 5.2 + 0.7) * (0.3 + v * 0.9), hw = 0.03 + 0.25 * v;
      L.push([c - hw, y]); R.push([c + hw, y]); M.push([c, y, hw]);
    }
    const st = [S(L.concat(R.slice().reverse()), 'accentDim', { closed: true, f: 0.10 }), S(L, 'main'), S(R, 'main')];
    const peaks = [[0.0, 0.44], [0.09, 0.30], [0.17, 0.38], [0.31, 0.17], [0.43, 0.35], [0.56, 0.23], [0.68, 0.37], [0.80, 0.14], [0.92, 0.36], [1.0, 0.44]];
    st.push(S(peaks, 'accent'), S([[0.0, 0.44], [1.0, 0.44]], 'dim'));
    [[0.31, 0.17, 0.26, 0.44], [0.31, 0.17, 0.40, 0.44], [0.56, 0.23, 0.50, 0.44], [0.56, 0.23, 0.64, 0.44], [0.80, 0.14, 0.73, 0.44], [0.80, 0.14, 0.87, 0.44], [0.09, 0.30, 0.04, 0.44], [0.09, 0.30, 0.15, 0.44]].forEach(([a, b, c2, d]) => st.push(S([[a, b], [c2, d]], 'inner')));
    for (let k = 0; k < 8; k++) {                                       // flow chevrons drifting down the river
      const v = ((k / 8 + lt * 0.06) % 1), i = Math.min(29, Math.floor(v * 30)), m = M[i], hw = m[2];
      st.push(S([[m[0] - hw * 0.5, m[1] - 0.014], [m[0], m[1] + 0.014], [m[0] + hw * 0.5, m[1] - 0.014]], 'inner'));
    }
    for (let i = 4; i < 30; i += 4) { const m = M[i], e = 0.04 + 0.06 * i / 30; st.push(S([[m[0] - m[2], m[1]], [m[0] - m[2] - e, m[1] + 0.02]], 'inner'), S([[m[0] + m[2], m[1]], [m[0] + m[2] + e, m[1] + 0.02]], 'inner')); }
    return { strokes: st, dots: peaks.slice(1, -1) };
  };

  /* ---- dna: rotating double helix with rungs ------------------------------------------------------------------------ */
  ICONS.dna = (lt) => {
    const N = 30, A = [], B = [];
    for (let i = 0; i < N; i++) {
      const y = 0.04 + 0.92 * i / (N - 1), ph = i * 0.42 + lt * 1.1, s = Math.sin(ph), c = Math.cos(ph);
      A.push([0.5 + 0.19 * s, y, c]); B.push([0.5 - 0.19 * s, y, -c]);
    }
    const st = [];
    for (let i = 0; i < N - 1; i++) {
      st.push(S([[A[i][0], A[i][1]], [A[i + 1][0], A[i + 1][1]]], A[i][2] + A[i + 1][2] > 0 ? 'main' : 'dim'));
      st.push(S([[B[i][0], B[i][1]], [B[i + 1][0], B[i + 1][1]]], B[i][2] + B[i + 1][2] > 0 ? 'accent' : 'accentDim'));
      if (i % 2 === 0) st.push(S([[A[i][0], A[i][1]], [B[i][0], B[i][1]]], 'inner'));
    }
    return { strokes: st, rot: 0.2, dots: A.filter((_, i) => i % 2 === 0).map((q) => [q[0], q[1]]).concat(B.filter((_, i) => i % 2 === 0).map((q) => [q[0], q[1]])) };
  };

  /* ---- cell: membrane, nucleus, mitochondria, ER ----------------------------------------------------------------------- */
  ICONS.cell = (lt) => {
    const wob = (i) => 0.93 + 0.07 * Math.sin(i * 2.7 + 1.3) * 1.0, n = 17;
    const outer = Array.from({ length: n }, (_, i) => { const a = i / n * PI2; return [0.5 + Math.cos(a) * 0.44 * wob(i), 0.5 + Math.sin(a) * 0.40 * wob(i)]; });
    const st = [S(outer, 'main', { closed: true, f: 0.04 }), S(outer.map(([x, y]) => [0.5 + (x - 0.5) * 0.9, 0.5 + (y - 0.5) * 0.9]), 'inner', { closed: true })];
    const nuc = ring(0.44, 0.47, 0.17, 0.16, 7, 0.4);
    st.push(S(nuc, 'accent', { closed: true, f: 0.12 }), S(ring(0.44, 0.47, 0.07, 0.065, 5, 1.0), 'accent', { closed: true, f: 0.5 }));
    for (let i = 0; i < nuc.length; i++) st.push(S([nuc[i], [0.44, 0.47]], 'inner'));
    const mito = (cx, cy, a, l = 0.11, w = 0.05) => { const p = ring(0, 0, l, w, 10); return rotPts(p.map(([x, y]) => [cx + x, cy + y]), a, cx, cy); };
    [[0.70, 0.36, 0.6], [0.69, 0.66, -0.5], [0.30, 0.74, 0.2]].forEach(([x, y, a]) => { const m = mito(x, y, a); st.push(S(m, 'main', { closed: true, f: 0.08 })); st.push(S([[x - 0.06 * Math.cos(a), y - 0.06 * Math.sin(a)], [x, y + 0.02], [x + 0.06 * Math.cos(a), y + 0.06 * Math.sin(a)]], 'inner')); });
    st.push(S([[0.22, 0.34], [0.26, 0.30], [0.30, 0.34], [0.34, 0.28]], 'inner'), S([[0.55, 0.77], [0.60, 0.80], [0.65, 0.76], [0.70, 0.79]], 'inner'), S([[0.60, 0.50], [0.64, 0.47], [0.67, 0.52], [0.72, 0.49]], 'inner'));
    return { strokes: st, rot: lt * 0.07, dots: [[0.28, 0.5], [0.33, 0.62], [0.58, 0.28], [0.78, 0.5], [0.52, 0.66], [0.24, 0.60]] };
  };

  /* ---- bacteria: rod with nucleoid, plasmid ring, pili and a flagellum --------------------------------------------- */
  ICONS.bacteria = (lt) => {
    const ang = -0.45, cx = 0.50, cy = 0.50, Lh = 0.30, W2 = 0.115;
    const capsule = (cx2, cy2, lh, w, a, k = 7) => {
      const pts = [];
      for (let i = 0; i <= k; i++) { const t = -Math.PI / 2 + Math.PI * i / k; pts.push([lh + Math.cos(t) * w, Math.sin(t) * w]); }
      for (let i = 0; i <= k; i++) { const t = Math.PI / 2 + Math.PI * i / k; pts.push([-lh + Math.cos(t) * w, Math.sin(t) * w]); }
      return rotPts(pts.map(([x, y]) => [cx2 + x, cy2 + y]), a, cx2, cy2);
    };
    const body = capsule(cx, cy, Lh, W2, ang);
    const st = [S(body, 'main', { closed: true, f: 0.05 })];
    st.push(S(capsule(cx, cy, Lh - 0.035, W2 - 0.03, ang), 'inner', { closed: true }));
    const loc = (u, v) => { const x = u * Lh, y = v * W2; return [cx + x * Math.cos(ang) - y * Math.sin(ang), cy + x * Math.sin(ang) + y * Math.cos(ang)]; };
    st.push(S([loc(-0.8, 0.1), loc(-0.5, -0.35), loc(-0.2, 0.4), loc(0.1, -0.4), loc(0.4, 0.35), loc(0.65, -0.1)], 'accent'));
    st.push(S(ring(...loc(0.35, -0.2), 0.035, 0.035, 8), 'accent', { closed: true, f: 0.4 }));
    for (let i = 0; i < 9; i++) { const u = -0.9 + i * 0.22, side = i % 2 ? 1 : -1, a = loc(u, side * 1.0), b = loc(u + 0.05, side * 1.0 + 0.0), tipx = loc(u, side * 1.55); st.push(S([a, tipx], 'inner')); }
    const fl = []; const base = loc(-1.12, 0.0);
    for (let k = 0; k <= 16; k++) { const t = k / 16, x = base[0] - t * 0.30 * Math.cos(ang), y = base[1] - t * 0.30 * Math.sin(ang), w = Math.sin(t * 9 - lt * 5) * 0.022 * t; fl.push([x - w * Math.sin(ang), y + w * Math.cos(ang)]); }
    st.push(S(fl, 'main'));
    const b2 = capsule(0.80, 0.22, 0.09, 0.045, 0.6, 5), b3 = capsule(0.25, 0.78, 0.08, 0.04, -0.2, 5);
    st.push(S(b2, 'dim', { closed: true }), S(b3, 'dim', { closed: true }));
    return { strokes: st };
  };

  /* ---- virus: bacteriophage — rotating icosahedral head, tail sheath, base plate and legs --------------------------- */
  ICONS.virus = (lt) => {
    const yaw = lt * 0.55, pitch = 0.32, cx = 0.5, cy = 0.27, s = 0.155;
    const pts = X.icosa.v.map((p) => X.proj(p, yaw, pitch, cx, cy, s, 0.0));
    const st = [];
    for (const [i, j] of X.icosa.e) { const a = pts[i], b = pts[j]; st.push(S([[a[0], a[1]], [b[0], b[1]]], (a[2] + b[2]) / 2 > -0.2 ? 'main' : 'dim')); }
    const tx0 = 0.47, tx1 = 0.53;
    st.push(S(ring(0.5, 0.485, 0.06, 0.016, 12), 'accent', { closed: true, f: 0.3 }));
    st.push(S([[tx0, 0.50], [tx0, 0.80]], 'main'), S([[tx1, 0.50], [tx1, 0.80]], 'main'));
    for (let k = 0; k < 8; k++) { const y = 0.52 + k * 0.038; st.push(S([[tx0 - 0.004, y], [tx1 + 0.004, y + 0.012]], 'inner')); }
    st.push(S([[0.38, 0.84], [0.44, 0.79], [0.56, 0.79], [0.62, 0.84], [0.56, 0.89], [0.44, 0.89]], 'main', { closed: true, f: 0.1 }));
    [[0.42, 0.87, 0.28, 0.92, 0.20, 0.99], [0.46, 0.89, 0.38, 0.95, 0.34, 1.0], [0.40, 0.84, 0.24, 0.84, 0.14, 0.90]].forEach(([a, b, c2, d, e, f]) => { st.push(S([[a, b], [c2, d], [e, f]], 'accent')); st.push(S([[1 - a, b], [1 - c2, d], [1 - e, f]], 'accent')); });
    st.push(S([[0.5, 0.89], [0.5, 0.97]], 'main'));
    return { strokes: st, dots: pts.filter((q) => q[2] > 0).map((q) => [q[0], q[1]]) };
  };

  /* ---- molecule: N≡N — two faceted globes joined by a triple bond, with an orbit ---------------------------------------- */
  ICONS.molecule = (lt) => {
    const st = [], r = 0.165, ax = 0.27, bx = 0.73, y = 0.5;
    [ax, bx].forEach((cx) => {
      st.push(S(ring(cx, y, r, r, 20), 'main', { closed: true, f: 0.06 }));
      st.push(S(ring(cx, y, r, r * 0.34, 20), 'inner', { closed: true }), S(ring(cx, y - r * 0.55, r * 0.84, r * 0.26, 18), 'inner', { closed: true }), S(ring(cx, y + r * 0.55, r * 0.84, r * 0.26, 18), 'inner', { closed: true }));
      const m = Math.cos(lt * 0.8 + cx * 9);
      st.push(S(ring(cx, y, r * Math.abs(m) + 0.001, r, 20), 'inner', { closed: true }));
      st.push(S(ring(cx - r * 0.35, y - r * 0.35, 0.028, 0.028, 8), 'accent', { closed: true, f: 0.7 }));
    });
    [-0.045, 0, 0.045].forEach((dy) => st.push(S([[ax + r * 0.98, y + dy], [bx - r * 0.98, y + dy]], 'accent')));
    const orb = ring(0.5, 0.5, 0.48, 0.2, 40, 0, lt * 0.25);
    st.push(S(orb, 'dim', { closed: true }));
    const e1 = ring(0.5, 0.5, 0.48, 0.2, 40, lt * 0.9, lt * 0.25)[0];
    return { strokes: st, rot: Math.sin(lt * 0.5) * 0.07, dots: [e1] };
  };

  /* ---- leaf ---------------------------------------------------------------------------------------------------------------- */
  ICONS.leaf = () => {
    const half = [[0.50, 0.03], [0.62, 0.13], [0.72, 0.27], [0.78, 0.43], [0.75, 0.59], [0.66, 0.73], [0.55, 0.84], [0.50, 0.89]];
    const st = [S(mir(half), 'main', { closed: true, f: 0.06 }), S([[0.50, 0.03], [0.50, 0.97]], 'main')];
    [0.2, 0.32, 0.44, 0.56, 0.68].forEach((y, i) => { const reach = [0.20, 0.26, 0.28, 0.24, 0.17][i]; st.push(...both([[0.50, y + 0.07], [0.50 + reach, y - 0.05]], 'inner')); });
    st.push(...both([[0.62, 0.13], [0.50, 0.20]], 'inner'));
    st.push(S([[0.50, 0.97], [0.47, 1.0]], 'accent'));
    return { strokes: st, rot: 0.5 };
  };

  /* ---- gear: 10 teeth, ring, hub and spokes, turning ---------------------------------------------------------------------------- */
  ICONS.gear = (lt) => {
    const N = 10, d = PI2 / N, outer = [];
    for (let k = 0; k < N; k++) { const a = k * d; [[-0.30, 0.34], [-0.15, 0.45], [0.15, 0.45], [0.30, 0.34]].forEach(([o, r]) => outer.push([0.5 + Math.cos(a + o * d * 1.6) * r, 0.5 + Math.sin(a + o * d * 1.6) * r])); }
    const st = [S(outer, 'main', { closed: true, f: 0.05 }), S(ring(0.5, 0.5, 0.25, 0.25, 30), 'inner', { closed: true }), S(ring(0.5, 0.5, 0.115, 0.115, 6), 'accent', { closed: true, f: 0.4 })];
    for (let k = 0; k < 5; k++) { const a = k * PI2 / 5; st.push(S([[0.5 + Math.cos(a) * 0.115, 0.5 + Math.sin(a) * 0.115], [0.5 + Math.cos(a) * 0.25, 0.5 + Math.sin(a) * 0.25]], 'inner')); }
    for (let k = 0; k < 5; k++) { const a = k * PI2 / 5 + PI2 / 10; st.push(S(ring(0.5 + Math.cos(a) * 0.185, 0.5 + Math.sin(a) * 0.185, 0.035, 0.035, 6), 'dim', { closed: true })); }
    return { strokes: st, rot: lt * 0.28 };
  };

  /* ---- fallback: rotating icosahedron ---------------------------------------------------------------------------------------------- */
  ICONS.fallback = (lt) => {
    const pts = X.icosa.v.map((p) => X.proj(p, lt * 0.5, 0.45, 0.5, 0.5, 0.23, 0.0));
    return { strokes: X.icosa.e.map(([i, j]) => S([[pts[i][0], pts[i][1]], [pts[j][0], pts[j][1]]], (pts[i][2] + pts[j][2]) / 2 > -0.2 ? 'main' : 'dim')) };
  };

  /* ---------------------------------------------------------------------------------------------------------------------------------------
     drawing */
  const STYLE = {
    main: { col: () => P.A, w: 2.8, glow: 20, a: 1 }, dim: { col: () => P.A, w: 1.8, glow: 0, a: 0.32 },
    inner: { col: () => P.text, w: 1.4, glow: 0, a: 0.36 }, fine: { col: () => P.A, w: 1.7, glow: 0, a: 0.8 }, accent: { col: () => P.B, w: 2.4, glow: 14, a: 0.95 }, accentDim: { col: () => P.B, w: 1.6, glow: 0, a: 0.3 },
  };
  const anchorCache = {};
  X.drawIcon = (c, name, cx, cy, size, lt) => {
    const def = ICONS[name] || ICONS.fallback, sh = def(lt), strokes = sh.strokes, n = strokes.length;
    const prog = clamp(lt / 1.15), rot = sh.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot);
    const tx = ([x, y]) => { const dx = (x - 0.5) * size, dy = (y - 0.5) * size; return [cx + dx * cr - dy * sr, cy + dx * sr + dy * cr]; };
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    const groups = {}; const fills = [];
    strokes.forEach((s, i) => {
      const u = clamp((prog - (i / n) * 0.5) / 0.5);
      if (u <= 0) return;
      let pts = s.p.map(tx); if (s.closed) pts = pts.concat([pts[0]]);
      const part = u >= 1 ? pts : X.partial(pts, u).pts;
      (groups[s.k] = groups[s.k] || []).push(part);
      if (s.f && u >= 1) fills.push([pts, s.k.indexOf('accent') === 0 ? P.B : P.A, s.f]);
    });
    // soft fills (after the trace)
    const fa = clamp((prog - 0.75) / 0.25);
    if (fa > 0) fills.forEach(([pts, col, f]) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = rgba(col, f * fa); c.fill(); });
    ['inner', 'dim', 'accentDim', 'fine', 'accent', 'main'].forEach((k) => {
      const g = groups[k]; if (!g) return;
      const st = STYLE[k]; c.beginPath();
      g.forEach((pts) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); });
      c.lineWidth = st.w; c.strokeStyle = st.col(); c.globalAlpha = st.a;
      if (st.glow) { c.shadowColor = st.col(); c.shadowBlur = st.glow; c.stroke(); c.shadowBlur = 0; c.globalAlpha = Math.min(1, st.a); }
      c.stroke(); c.globalAlpha = 1;
    });
    // vertex dots on the main outline(s)
    const dots = sh.dots || (groups.main || []).flatMap((pts) => (pts.length <= 26 ? pts : []));
    if (prog > 0.55) {
      const da = clamp((prog - 0.55) / 0.45);
      c.fillStyle = P.A; c.globalAlpha = 0.85 * da; c.beginPath();
      (sh.dots ? sh.dots.map(tx) : dots).forEach((p) => { c.moveTo(p[0] + 2.6, p[1]); c.arc(p[0], p[1], 2.6, 0, PI2); });
      c.fill(); c.globalAlpha = 1;
    }
    c.restore();
    // anchor for callouts: a vertex on the outline (static snapshot so leaders do not jitter on turning icons)
    const key = name;
    if (!anchorCache[key]) {
      const snap = def(0).strokes.filter((s) => s.k === 'main' || s.k === 'accent').flatMap((s) => s.p);
      anchorCache[key] = snap;
    }
    const verts = anchorCache[key];
    return {
      anchor: (side, ty) => {
        const want = clamp(ty, cy - size * 0.38, cy + size * 0.38);
        let best = null;
        verts.forEach((v) => {
          const p = [cx + (v[0] - 0.5) * size, cy + (v[1] - 0.5) * size];
          if ((p[0] - cx) * side < size * 0.16) return;
          const outer = (p[0] - cx) * side;
          const sc2 = Math.abs(p[1] - want) - outer * 0.9;
          if (!best || sc2 < best.s) best = { s: sc2, p };
        });
        return best ? best.p : [cx + side * size * 0.3, cy];
      },
    };
  };
})();
