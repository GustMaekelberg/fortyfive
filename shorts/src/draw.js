/* draw.js — world building blocks: sky, sun, clouds, city skyline, cars, trees, haze, particles. */
(() => {
  const V = window.V;
  const { W, H, PI2, clamp, lerp, mix, rgba, shade, rr, lg, glow, rng, h1, fillPoly, fillRR, fillEll } = V;

  /* ------------------------------------------------------------------ sky */
  V.MOODS = {
    dusk: ['#2A1540', '#7A2E5A', '#E2583A', '#FFB347'],
    deep: ['#120A24', '#431B48', '#A83D3E', '#E57A38'],
    night: ['#04050E', '#0A0E2A', '#181A44', '#2B2A5C'],
    morning: ['#7D9FC6', '#CFAEB4', '#F4C99B', '#FFE4B5'],
    storm: ['#17122A', '#352646', '#85484F', '#CF6F46'],
    ember: ['#190B20', '#53204C', '#C13E30', '#FF9A3C'],
  };
  V.moodMix = (a, b, t) => V.MOODS[a].map((c, i) => mix(c, V.MOODS[b][i], t));

  V.sky = (c, o) => {
    const cols = Array.isArray(o.mood) ? o.mood : V.MOODS[o.mood || 'dusk'];
    const top = o.top ?? -120, hor = o.hor;
    const g = c.createLinearGradient(0, top, 0, hor);
    g.addColorStop(0, cols[0]); g.addColorStop(0.4, cols[1]); g.addColorStop(0.75, cols[2]); g.addColorStop(1, cols[3]);
    c.fillStyle = g; c.fillRect(-400, -600, W + 800, hor + 600 + 2);
  };

  V.sun = (c, x, y, r, o = {}) => {
    const a = o.a ?? 1;
    V.glow(c, x, y, r * 9, '#FF8A4A', 0.30 * a);
    V.glow(c, x, y, r * 4.2, '#FFB060', 0.42 * a);
    V.glow(c, x, y, r * 2.2, '#FFD08A', 0.55 * a);
    c.beginPath(); c.arc(x, y, r, 0, PI2); c.fillStyle = '#FFE08A'; c.fill();
    c.beginPath(); c.arc(x, y, r * 0.78, 0, PI2); c.fillStyle = '#FFF0B8'; c.globalAlpha *= 0.55; c.fill(); c.globalAlpha /= 0.55;
  };

  // flat streaky clouds, lit from below
  V.clouds = (c, t, o) => {
    const R = rng(o.seed || 1), n = o.n || 8, span = W + 900;
    for (let i = 0; i < n; i++) {
      const y = lerp(o.y0, o.y1, R()), w = lerp(280, 760, R()) * (o.big || 1), h = lerp(14, 38, R()) * (o.hs || 1);
      const sp = (o.speed ?? 6) * lerp(0.6, 1.4, R());
      const x = ((R() * span + t * sp) % span) - 450;
      const a = (o.a ?? 0.5) * lerp(0.55, 1, R());
      c.beginPath(); c.ellipse(x, y, w / 2, h / 2, 0, 0, PI2); c.ellipse(x - w * 0.2, y - h * 0.3, w * 0.28, h * 0.62, 0, 0, PI2);
      c.ellipse(x + w * 0.22, y - h * 0.15, w * 0.24, h * 0.5, 0, 0, PI2);
      c.fillStyle = rgba(o.dark || '#4A1C4E', a); c.fill();
      c.beginPath(); c.ellipse(x + w * 0.04, y + h * 0.3, w * 0.42, h * 0.16, 0, 0, PI2); c.fillStyle = rgba(o.lit || '#FF8F4A', a * 0.85); c.fill();
    }
  };

  V.haze = (c, y0, y1, color, a0, a1, x0 = -300, x1 = W + 300) => {
    c.fillStyle = lg(c, 0, y0, 0, y1, [[0, rgba(color, a0)], [1, rgba(color, a1)]]);
    c.fillRect(x0, Math.min(y0, y1), x1 - x0, Math.abs(y1 - y0));
  };

  V.stars = (c, t, o) => {
    const R = rng(o.seed || 5);
    for (let i = 0; i < o.n; i++) {
      const x = R() * (W + 200) - 100, y = lerp(o.y0, o.y1, Math.pow(R(), 1.4)), r = lerp(0.9, 2.4, R()), ph = R() * 10;
      const a = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * lerp(0.8, 2.2, R()) + ph))) * (o.a ?? 1);
      c.fillStyle = `rgba(255,245,225,${a})`; c.beginPath(); c.arc(x, y, r, 0, PI2); c.fill();
    }
  };

  V.motes = (c, t, o) => {
    // drifting dust: o:{seed,n,x0,y0,x1,y1,r,color,a,vx,vy,clip?}
    const R = rng(o.seed || 3), w = o.x1 - o.x0, h = o.y1 - o.y0;
    for (let i = 0; i < o.n; i++) {
      const bx = R() * w, by = R() * h, sp = lerp(0.5, 1.4, R()), ph = R() * 10, r = lerp(0.7, 1.0, R()) * (o.r || 2);
      const x = o.x0 + ((bx + t * (o.vx ?? 6) * sp + Math.sin(t * 0.6 + ph) * 14) % w + w) % w;
      const y = o.y0 + ((by + t * (o.vy ?? -4) * sp + Math.cos(t * 0.5 + ph) * 10) % h + h) % h;
      const a = (o.a ?? 0.6) * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.7 + ph * 3)));
      c.fillStyle = rgba(o.color || '#FFF3C8', a); c.beginPath(); c.arc(x, y, r, 0, PI2); c.fill();
    }
  };

  /* ----------------------------------------------------------------- city */
  function flame(c, x, y, w, h, t, ph) {
    const sw = Math.sin(t * 7 + ph) * w * 0.28, sw2 = Math.sin(t * 11 + ph * 2) * w * 0.12;
    c.beginPath(); c.moveTo(x - w, y);
    c.bezierCurveTo(x - w * 0.95, y - h * 0.4, x - w * 0.25 + sw2, y - h * 0.62, x + sw * 1.5, y - h);
    c.bezierCurveTo(x + w * 0.3 + sw, y - h * 0.58, x + w * 0.95, y - h * 0.38, x + w, y); c.closePath();
  }
  V.fire = (c, t, x, y, size, ph = 0, o = {}) => {
    const f = 0.85 + 0.1 * Math.sin(t * 9 + ph) + 0.07 * Math.sin(t * 15 + ph * 2);
    V.glow(c, x, y - size * 0.5, size * 3.4 * f, '#FF6A2A', 0.5 * (o.a ?? 1));
    V.glow(c, x, y - size * 0.4, size * 1.6 * f, '#FFB04A', 0.45 * (o.a ?? 1));
    for (const [k, col] of [[1, '#D8442A'], [0.78, '#FF7A2E'], [0.5, '#FFD27A']]) {
      c.fillStyle = col;
      flame(c, x, y, size * 0.45 * k, size * 0.95 * k * f, t, ph); c.fill();
      flame(c, x - size * 0.32 * k, y, size * 0.26 * k, size * 0.6 * k * f, t + 1, ph + 2); c.fill();
      flame(c, x + size * 0.3 * k, y, size * 0.24 * k, size * 0.55 * k * f, t + 2, ph + 4); c.fill();
    }
  };
  V.smoke = (c, t, x, y, o = {}) => {
    const n = o.n || 11, rise = o.rise || 26, col = o.color || '#2a1a30';
    for (let j = n; j >= 0; j--) {
      const age = j + ((t * (o.speed ?? 0.5)) % 1);
      const px = x + Math.sin(t * 0.35 + j * 0.6 + (o.ph || 0)) * 6 * age + (o.drift ?? 7) * age;
      const py = y - age * rise;
      const r = (o.r0 ?? 12) + age * (o.grow ?? 5.5);
      const a = (o.a ?? 0.34) * (1 - age / (n + 1)) * Math.min(1, age * 1.2);
      c.fillStyle = rgba(col, a); c.beginPath(); c.arc(px, py, r, 0, PI2); c.fill();
    }
  };

  // skyline layer. o:{hor,x0,x1,seed,wmin,wmax,hmin,hmax,color,haze,hazeAmt,win,winP,fires,smoke,flick}
  V.city = (c, t, o) => {
    const R = rng(o.seed), B = [];
    let x = o.x0;
    while (x < o.x1) {
      const w = lerp(o.wmin, o.wmax, R()), h = lerp(o.hmin, o.hmax, Math.pow(R(), 1.5));
      B.push({ x, w, h, st: R(), r: R() }); x += w * lerp(0.62, 1.02, R());
    }
    const bot = o.hor + 10;
    c.fillStyle = lg(c, 0, o.hor - o.hmax, 0, o.hor, [[0, o.color], [1, mix(o.color, o.haze, o.hazeAmt)]]);
    c.beginPath();
    for (const b of B) {
      const top = o.hor - b.h, x0 = b.x, w = b.w;
      let pts;
      if (b.st < 0.45) pts = [[x0, bot], [x0, top], [x0 + w, top], [x0 + w, bot]];
      else if (b.st < 0.62) pts = [[x0, bot], [x0, top + 20], [x0 + w * 0.2, top + 20], [x0 + w * 0.2, top], [x0 + w * 0.8, top], [x0 + w * 0.8, top + 20], [x0 + w, top + 20], [x0 + w, bot]];
      else if (b.st < 0.78) pts = [[x0, bot], [x0, top + 12], [x0 + w * 0.22, top], [x0 + w * 0.4, top + 24], [x0 + w * 0.6, top + 8], [x0 + w * 0.8, top + 34], [x0 + w, top + 16], [x0 + w, bot]];
      else if (b.st < 0.9) pts = [[x0, bot], [x0, top + 16], [x0 + w, top], [x0 + w, bot]];
      else pts = [[x0, bot], [x0, top], [x0 + w * 0.46, top], [x0 + w * 0.46, top - 46], [x0 + w * 0.54, top - 46], [x0 + w * 0.54, top], [x0 + w, top], [x0 + w, bot]];
      V.poly(c, pts);
    }
    c.fill();
    if (o.win) {
      c.fillStyle = rgba(o.win, 0.92); c.beginPath();
      B.forEach((b, i) => {
        const cols = Math.floor((b.w - 10) / 11), rows = Math.floor((b.h - 28) / 17);
        for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
          const hv = h1(i * 131 + r * 17 + q, o.seed);
          let lit = hv < o.winP;
          if (hv > 0.965) lit = Math.sin(t * 2.4 + hv * 90) > 0.1;
          if (lit) c.rect(b.x + 6 + q * 11 + (b.w - 10 - cols * 11) / 2, o.hor - b.h + 20 + r * 17, 5, 8);
        }
      });
      c.fill();
    }
    if (o.fires) {
      const R2 = rng(o.seed + 77);
      for (let i = 0; i < o.fires; i++) {
        const b = B[Math.floor(R2() * B.length)];
        const fx = b.x + b.w * (0.3 + 0.4 * R2()), fy = o.hor - b.h + 14, sz = lerp(26, 52, R2()) * (o.fireScale || 1);
        if (fx < -80 || fx > W + 80) continue;
        V.fire(c, t, fx, fy, sz, R2() * 10);
        if (o.smoke) V.smoke(c, t, fx, fy - sz * 0.6, { ph: i * 2, n: 12, rise: 30, r0: 12, grow: 6.5, a: 0.3, drift: 8 + i * 3 });
      }
    }
  };

  /* ----------------------------------------------------------------- cars */
  V.CAR_COLORS = ['#8A3B3B', '#3B5A8A', '#C9B458', '#DDDDDD', '#4A4A4A', '#5E7A56', '#7A5A8A', '#B5642B'];
  const REAR = {
    sedan: { w: 200, bh: 60, ch: 42, cw: 0.74, wh: 20 },
    hatch: { w: 190, bh: 64, ch: 50, cw: 0.78, wh: 20 },
    suv: { w: 212, bh: 76, ch: 54, cw: 0.86, wh: 22 },
    truck: { w: 224, bh: 100, ch: 66, cw: 0.92, wh: 24 },
    van: { w: 214, bh: 124, ch: 46, cw: 0.92, wh: 22 },
  };
  V.CAR_KINDS = ['sedan', 'sedan', 'hatch', 'suv', 'suv', 'truck', 'van', 'sedan'];

  // rear view car. o:{x,y(ground),k,color,kind,fog,fogAmt,glowA,tilt}
  V.carRear = (c, o) => {
    const k = o.k; if (k < 0.012) return;
    const d = REAR[o.kind || 'sedan'];
    const w = d.w * k, bh = d.bh * k, ch = d.ch * k, wh = d.wh * k, x = o.x, y = o.y;
    const body = o.fogAmt ? mix(o.color, o.fog || '#8a4a5a', o.fogAmt) : o.color;
    if (k < 0.05) {
      const H2 = bh + ch + wh;
      c.fillStyle = body; c.fillRect(x - w / 2, y - H2, w, H2 * 0.95);
      c.fillStyle = 'rgba(10,8,20,.55)'; c.fillRect(x - w * 0.36, y - H2, w * 0.72, Math.max(1, ch * 0.7));
      c.fillStyle = '#FF3B30'; const ty = y - wh - bh * 0.72, th = Math.max(1.2, bh * 0.22);
      c.fillRect(x - w * 0.47, ty, w * 0.2, th); c.fillRect(x + w * 0.27, ty, w * 0.2, th);
      return;
    }
    if (o.tilt) { c.save(); c.translate(x, y); c.rotate(o.tilt); c.translate(-x, -y); }
    fillEll(c, x, y - 1 * k, w * 0.58, 10 * k, 'rgba(8,4,14,.55)');
    if (k > 0.1) fillEll(c, x, y + 6 * k, w * 0.5, 11 * k, rgba('#FF3B30', 0.10 * (o.glowA ?? 1)));
    fillRR(c, x - w * 0.41, y - wh, w * 0.18, wh, 3 * k, '#100d16'); fillRR(c, x + w * 0.23, y - wh, w * 0.18, wh, 3 * k, '#100d16');
    // lower body
    const by = y - wh - bh;
    c.beginPath(); rr(c, x - w / 2, by, w, bh, 13 * k);
    c.fillStyle = lg(c, 0, by, 0, by + bh, [[0, shade(body, 0.1)], [0.35, body], [1, shade(body, -0.34)]]); c.fill();
    // cabin
    const cbw = w * (d.cw + 0.05), ctw = w * (d.cw - 0.1), yt = by - ch + 3 * k, yb = by + 3 * k;
    fillPoly(c, [[x - cbw / 2, yb], [x - ctw / 2, yt], [x + ctw / 2, yt], [x + cbw / 2, yb]], shade(body, -0.06));
    if (o.kind === 'truck') {
      for (let i = 1; i < 5; i++) { c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(x - cbw / 2 + 4 * k, yt + (yb - yt) * i / 5, cbw - 8 * k, Math.max(1, 1.6 * k)); }
    } else {
      const ins = 7 * k;
      fillPoly(c, [[x - cbw / 2 + ins, yb - 4 * k], [x - ctw / 2 + ins * 1.1, yt + 6 * k], [x + ctw / 2 - ins * 1.1, yt + 6 * k], [x + cbw / 2 - ins, yb - 4 * k]], lg(c, 0, yt, 0, yb, [[0, '#2a3150'], [1, '#12162a']]));
      fillPoly(c, [[x - cbw * 0.34, yb - 4 * k], [x - cbw * 0.2, yt + 6 * k], [x - cbw * 0.06, yt + 6 * k], [x - cbw * 0.2, yb - 4 * k]], 'rgba(255,255,255,.07)');
    }
    // light rim on top edge
    c.fillStyle = 'rgba(255,190,130,.22)'; c.fillRect(x - w / 2 + 8 * k, by + 1.5 * k, w - 16 * k, Math.max(1, 2 * k));
    // trunk seam + plate + bumper
    c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(x - w * 0.42, by + bh * 0.46, w * 0.84, Math.max(1, 2 * k));
    fillRR(c, x - w * 0.1, by + bh * 0.54, w * 0.2, bh * 0.2, 1.5 * k, '#E6DFC8');
    fillRR(c, x - w / 2 - 1 * k, by + bh * 0.8, w + 2 * k, bh * 0.2, 5 * k, '#24212c');
    // tail lights
    const ty = by + bh * 0.16, tw = w * 0.2, th = bh * 0.26;
    const ga = (o.glowA ?? 0.55);
    if (ga > 0 && k > 0.07) {
      c.globalCompositeOperation = 'lighter';
      V.glow(c, x - w * 0.37, ty + th / 2, w * 0.6, '#FF3B30', ga);
      V.glow(c, x + w * 0.37, ty + th / 2, w * 0.6, '#FF3B30', ga);
      c.globalCompositeOperation = 'source-over';
    }
    fillRR(c, x - w * 0.47, ty, tw, th, 3 * k, '#FF3B30'); fillRR(c, x + w * 0.27, ty, tw, th, 3 * k, '#FF3B30');
    if (k > 0.14) { fillRR(c, x - w * 0.45, ty + th * 0.2, tw * 0.55, th * 0.3, 2 * k, '#FF8F80'); fillRR(c, x + w * 0.29, ty + th * 0.2, tw * 0.55, th * 0.3, 2 * k, '#FF8F80'); }
    if (o.tilt) c.restore();
  };

  const SIDE = {
    sedan: { L: 420, body: [[0, -40], [3, -64], [16, -80], [84, -86], [116, -130], [262, -132], [320, -88], [392, -82], [416, -64], [420, -40], [412, -26], [8, -26]], win: [[[122, -124], [190, -124], [190, -92], [98, -92]], [[200, -124], [258, -124], [304, -92], [200, -92]]], wheels: [96, 322] },
    hatch: { L: 400, body: [[0, -40], [3, -70], [10, -120], [40, -130], [250, -132], [304, -88], [374, -82], [396, -64], [400, -40], [392, -26], [8, -26]], win: [[[34, -124], [120, -124], [120, -90], [16, -90]], [[130, -124], [246, -124], [290, -90], [130, -90]]], wheels: [88, 306] },
    suv: { L: 440, body: [[0, -44], [3, -70], [8, -150], [34, -160], [300, -160], [340, -100], [418, -90], [436, -68], [440, -42], [432, -26], [8, -26]], win: [[[20, -150], [116, -150], [116, -104], [12, -104]], [[126, -150], [212, -150], [212, -104], [126, -104]], [[222, -150], [292, -150], [328, -104], [222, -104]]], wheels: [98, 346] },
    pickup: { L: 480, body: [[0, -40], [0, -98], [196, -98], [202, -98], [222, -148], [330, -148], [372, -102], [452, -92], [474, -68], [478, -42], [468, -26], [8, -26]], win: [[[234, -142], [322, -142], [354, -106], [234, -106]]], wheels: [100, 372], bed: [6, 196] },
    van: { L: 470, body: [[0, -40], [3, -76], [8, -176], [40, -192], [340, -192], [384, -136], [448, -100], [468, -74], [470, -42], [460, -26], [8, -26]], win: [[[250, -182], [336, -182], [372, -138], [250, -138]], [[40, -150], [110, -150], [110, -120], [40, -120]]], wheels: [104, 378] },
  };
  V.SIDE_KINDS = ['sedan', 'hatch', 'suv', 'pickup', 'van', 'sedan'];
  V.carLen = (kind, s) => SIDE[kind || 'sedan'].L * s;

  // side view car, facing +x unless flip. o:{x(left end), y(ground), s, color, kind, flip, tail, head, glowA, dim}
  V.carSide = (c, o) => {
    const P = SIDE[o.kind || 'sedan'], s = o.s;
    c.save();
    if (o.flip) { c.translate(o.x + P.L * s, o.y); c.scale(-s, s); } else { c.translate(o.x, o.y); c.scale(s, s); }
    const body = o.color;
    // shadow
    fillEll(c, P.L / 2, -2, P.L * 0.56, 10, 'rgba(8,4,14,.5)');
    const g = lg(c, 0, -196, 0, -26, [[0, shade(body, 0.16)], [0.42, body], [1, shade(body, -0.38)]]);
    c.beginPath(); V.poly(c, P.body); c.fillStyle = g; c.fill();
    c.lineJoin = 'round'; c.lineWidth = 9; c.strokeStyle = g; c.stroke();
    // bed (pickup)
    if (P.bed) { fillRR(c, P.bed[0], -102, P.bed[1] - P.bed[0], 8, 2, shade(body, -0.55)); }
    c.save(); c.beginPath(); V.poly(c, P.body); c.clip();
    for (const wx of P.wheels) { c.beginPath(); c.arc(wx, -34, 41, 0, PI2); c.fillStyle = '#100d16'; c.fill(); }
    // sill shadow + belt-line highlight
    c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(0, -40, P.L, 16);
    c.fillStyle = 'rgba(255,200,150,.22)'; c.fillRect(0, -92, P.L, 3);
    c.restore();
    // windows
    for (const w of P.win) {
      const ys = w.map((p) => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
      fillPoly(c, w, lg(c, 0, y0, 0, y1, [[0, o.dim ? '#20263f' : '#38405f'], [1, '#14182b']]));
      c.save(); c.beginPath(); V.poly(c, w); c.clip(); c.fillStyle = 'rgba(255,255,255,.09)';
      c.beginPath(); c.moveTo(w[0][0] + 10, y0); c.lineTo(w[0][0] + 34, y0); c.lineTo(w[0][0] + 6, y1); c.lineTo(w[0][0] - 18, y1); c.fill(); c.restore();
    }
    // door seams + handles
    c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 2;
    for (let i = 0; i < P.win.length - 1; i++) { const xx = (Math.max(...P.win[i].map((p) => p[0])) + Math.min(...P.win[i + 1].map((p) => p[0]))) / 2; c.beginPath(); c.moveTo(xx, -92); c.lineTo(xx, -32); c.stroke(); }
    for (const w of P.win) { const hx = Math.min(...w.map((p) => p[0])) + 56; fillRR(c, hx, -80, 22, 5, 2, 'rgba(0,0,0,.38)'); }
    // lights
    if (o.tail !== false) {
      if (o.glowA) { c.globalCompositeOperation = 'lighter'; V.glow(c, 4, -62, 70, '#FF3B30', o.glowA); c.globalCompositeOperation = 'source-over'; }
      fillRR(c, -1, -76, 12, 22, 3, '#FF3B30');
    }
    if (o.head) { c.globalCompositeOperation = 'lighter'; V.glow(c, P.L, -64, 120, '#FFF2B0', o.head); c.globalCompositeOperation = 'source-over'; }
    fillRR(c, P.L - 12, -72, 13, 17, 4, o.head ? '#FFF7D0' : '#CFC49A');
    // wheels
    for (const wx of P.wheels) {
      c.beginPath(); c.arc(wx, -34, 34, 0, PI2); c.fillStyle = '#17141d'; c.fill();
      c.beginPath(); c.arc(wx, -34, 19, 0, PI2); c.fillStyle = '#8b8b98'; c.fill();
      c.beginPath(); c.arc(wx, -34, 11, 0, PI2); c.fillStyle = '#4a4a56'; c.fill();
      c.beginPath(); c.arc(wx, -34, 3.5, 0, PI2); c.fillStyle = '#c9c9d4'; c.fill();
    }
    c.restore();
  };

  /* ---------------------------------------------------------------- trees */
  V.pine = (c, x, y, h, c1 = '#27504A', c2 = '#1F3B3A') => {
    const w = h * 0.4, tiers = 4;
    fillRR(c, x - h * 0.035, y - h * 0.16, h * 0.07, h * 0.18, 2, '#2a1c1c');
    for (let i = 0; i < tiers; i++) {
      const base = y - h * 0.12 - i * h * 0.2, top = base - h * 0.34, ww = w * (1 - i * 0.2) / 2;
      fillPoly(c, [[x, top], [x - ww, base], [x + ww, base]], c1);
      fillPoly(c, [[x, top], [x + ww, base], [x, base]], c2);
    }
  };
  V.roundTree = (c, x, y, h, col, trunk = '#2a1c1c') => {
    fillRR(c, x - h * 0.04, y - h * 0.45, h * 0.08, h * 0.47, 2, trunk);
    for (const [dx, dy, r] of [[0, 0.68, 0.28], [-0.2, 0.52, 0.2], [0.21, 0.55, 0.2], [0.02, 0.88, 0.2]]) {
      c.beginPath(); c.arc(x + dx * h, y - dy * h, r * h, 0, PI2); c.fillStyle = col; c.fill();
    }
  };
  V.grassTufts = (c, x0, x1, y, seed, col, size = 1, step = 26) => {
    const R = rng(seed); c.fillStyle = col;
    for (let x = x0; x < x1; x += step * lerp(0.6, 1.4, R())) {
      const h = lerp(8, 20, R()) * size, w = lerp(7, 12, R()) * size;
      c.beginPath(); c.moveTo(x - w, y + 2); c.quadraticCurveTo(x - w * 0.4, y - h * 0.5, x - w * 0.55, y - h);
      c.quadraticCurveTo(x, y - h * 0.4, x, y - h * 1.2); c.quadraticCurveTo(x + w * 0.2, y - h * 0.5, x + w * 0.6, y - h * 0.9);
      c.quadraticCurveTo(x + w * 0.3, y - h * 0.3, x + w, y + 2); c.closePath(); c.fill();
    }
  };

  V.lamp = (c, x, y, h, o = {}) => {
    const col = o.color || '#1B1530';
    V.line(c, [[x, y], [x, y - h]], Math.max(2, h * 0.025), col);
    V.line(c, [[x, y - h], [x + (o.arm ?? 0) * h, y - h]], Math.max(2, h * 0.02), col);
    const lx = x + (o.arm ?? 0) * h;
    if (o.on !== false) { c.globalCompositeOperation = 'lighter'; V.glow(c, lx, y - h + h * 0.02, h * 0.55, '#FFC97A', o.glowA ?? 0.5); c.globalCompositeOperation = 'source-over'; }
    fillRR(c, lx - h * 0.04, y - h - h * 0.012, h * 0.08, h * 0.03, 1.5, o.on === false ? '#4a4a55' : '#FFE9B0');
  };
})();
