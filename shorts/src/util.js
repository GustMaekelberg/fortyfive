/* util.js — math, seeded RNG, colour and path helpers. Everything is pure / deterministic. */
(() => {
  const V = (window.V = window.V || {});
  V.W = 1080; V.H = 1920; V.PI2 = Math.PI * 2;

  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  V.clamp = clamp;
  V.lerp = (a, b, t) => a + (b - a) * t;
  V.sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  V.easeOut = (t) => { t = clamp(t); return 1 - (1 - t) * (1 - t) * (1 - t); };
  V.easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  V.easeOutBack = (t, s = 1.5) => { t = clamp(t); const c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };

  // ---- seeded randomness -------------------------------------------------
  V.hash = (s) => {
    s = String(s); let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  V.rng = (seed) => {
    let a = (typeof seed === 'number' ? seed : V.hash(seed)) >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  // stateless per-index noise in [0,1)
  V.h1 = (i, s = 0) => {
    let x = Math.imul((i | 0) ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul((s | 0) + 0x7F4A7C15, 0xC2B2AE35);
    x ^= x >>> 15; x = Math.imul(x, 0x2C1B3C6D); x ^= x >>> 12; x = Math.imul(x, 0x297A2D39); x ^= x >>> 15;
    return (x >>> 0) / 4294967296;
  };

  // ---- colour --------------------------------------------------------------
  const cache = new Map();
  V.rgb = (c) => {
    if (Array.isArray(c)) return c;
    let r = c[0] === '#' ? cache.get(c) : null;
    if (r) return r;
    if (c[0] === '#') {
      let h = c.slice(1); if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      r = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      cache.set(c, r);
    } else r = c.match(/[\d.]+/g).slice(0, 3).map(Number);
    return r;
  };
  V.mix = (a, b, t) => {
    const A = V.rgb(a), B = V.rgb(b); t = clamp(t);
    return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
  };
  V.rgba = (c, a) => { const C = V.rgb(c); return `rgba(${C[0]},${C[1]},${C[2]},${a})`; };
  V.shade = (c, amt) => (amt < 0 ? V.mix(c, '#000000', -amt) : V.mix(c, '#ffffff', amt));

  // ---- paths & gradients -----------------------------------------------------
  V.rr = (c, x, y, w, h, r) => {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  };
  V.poly = (c, pts) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
  V.fillPoly = (c, pts, fill) => { c.beginPath(); V.poly(c, pts); c.fillStyle = fill; c.fill(); };
  V.fillRR = (c, x, y, w, h, r, fill) => { c.beginPath(); V.rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); };
  V.fillEll = (c, x, y, rx, ry, fill, rot = 0) => { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, V.PI2); c.fillStyle = fill; c.fill(); };
  V.lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); for (const [p, col] of stops) g.addColorStop(p, col); return g; };
  V.rg = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); for (const [p, col] of stops) g.addColorStop(p, col); return g; };
  // soft radial glow (same-rgb alpha ramp avoids dark fringes)
  V.glow = (c, x, y, r, color, a = 1, rx = 1, ry = 1) => {
    if (a <= 0.003 || r <= 0) return;
    c.save(); c.translate(x, y); c.scale(rx, ry);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, V.rgba(color, a)); g.addColorStop(0.35, V.rgba(color, a * 0.42));
    g.addColorStop(0.7, V.rgba(color, a * 0.1)); g.addColorStop(1, V.rgba(color, 0));
    c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2); c.restore();
  };
  V.line = (c, pts, w, col, cap = 'round') => {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = cap; c.lineJoin = 'round'; c.stroke();
  };

  // two-bone IK: returns [kneeX, kneeY, targetX, targetY]. dir = ±1 chooses the bend side.
  V.ik2 = (hx, hy, tx, ty, l1, l2, dir = -1) => {
    let dx = tx - hx, dy = ty - hy, d = Math.hypot(dx, dy);
    const maxd = l1 + l2 - 0.05, mind = Math.abs(l1 - l2) + 0.05;
    if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
    if (d < mind) d = mind;
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const ux = dx / (d || 1), uy = dy / (d || 1);
    return [hx + ux * a + dir * -uy * h, hy + uy * a + dir * ux * h, hx + dx, hy + dy];
  };

  // camera: translate/scale the world around a pivot. spec: {z0,z1,x0,x1,y0,y1,px,py}
  V.camera = (c, u, spec = {}) => {
    const z = V.lerp(spec.z0 ?? 1, spec.z1 ?? 1.06, u);
    const dx = V.lerp(spec.x0 ?? 0, spec.x1 ?? 0, u), dy = V.lerp(spec.y0 ?? 0, spec.y1 ?? 0, u);
    const px = spec.px ?? V.W / 2, py = spec.py ?? V.H / 2;
    c.translate(px + dx, py + dy); c.scale(z, z); c.translate(-px, -py);
    return z;
  };
})();
