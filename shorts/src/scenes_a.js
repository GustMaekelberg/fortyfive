/* scenes_a.js — title, suburb_run, highway_jam, fact_card, leaving_car, lanes_movement */
(() => {
  const V = window.V;
  const { W, H, PI2, clamp, lerp, mix, rgba, shade, lg, glow, rng, h1, fillPoly, fillRR, fillEll, sstep, easeOut } = V;
  const SC = (V.SCENES = V.SCENES || {});
  const u01 = (lt, sc) => clamp(lt / sc.dur, 0, 1.25);

  /* ---------- shared: skyline with fires --------------------------------------- */
  V.cityscape = (c, t, o) => {
    const big = o.big || 1, hor = o.hor;
    V.city(c, t, { hor, x0: -140, x1: W + 140, seed: o.seed, wmin: 26, wmax: 76, hmin: 50 * big, hmax: 250 * big, color: '#4B2A55', haze: '#E2583A', hazeAmt: 0.62, win: null, gapX: o.sunX, gapW: 250 });
    V.haze(c, hor - 120, hor, '#FF8A4A', 0, 0.32);
    V.city(c, t, { hor, x0: -140, x1: W + 140, seed: o.seed + 1, wmin: 34, wmax: 92, hmin: 36 * big, hmax: 205 * big, color: '#2E1F3D', haze: '#C8452F', hazeAmt: 0.5, win: '#FFD27A', winP: 0.2, fires: o.fires ?? 3, smoke: true, gapX: o.sunX, gapW: 200, fireScale: o.fireScale });
    V.city(c, t, { hor, x0: -140, x1: W + 140, seed: o.seed + 2, wmin: 44, wmax: 110, hmin: 22, hmax: 118 * big, color: '#1B1530', haze: '#8a3a2f', hazeAmt: 0.3, win: '#FFD27A', winP: 0.12, fires: o.fires2 ?? 1, smoke: false });
  };

  V.birds = (c, t, o) => {
    const R = rng(o.seed || 9), span = W + 400;
    c.strokeStyle = o.color || '#1B1530'; c.lineWidth = o.w || 2.4; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 0; i < o.n; i++) {
      const y0 = lerp(o.y0, o.y1, R()), sp = (o.speed ?? 30) * lerp(0.8, 1.3, R()), s = (o.s || 1) * lerp(0.7, 1.2, R()), ph = R() * 9;
      const x = ((R() * span + t * sp) % span) - 200, y = y0 + Math.sin(t * 0.7 + ph) * 8;
      const fl = Math.sin(t * 7 + ph) * 0.6;
      c.beginPath(); c.moveTo(x - 14 * s, y + (3 + fl * 8) * s); c.quadraticCurveTo(x - 6 * s, y - (5 - fl * 5) * s, x, y); c.quadraticCurveTo(x + 6 * s, y - (5 - fl * 5) * s, x + 14 * s, y + (3 + fl * 8) * s); c.stroke();
    }
  };

  /* ---------- highway world (one-point perspective) ----------------------------- */
  const hwCache = new Map();
  function hwItems(seed, gap) {
    const key = seed + ':' + gap; if (hwCache.has(key)) return hwCache.get(key);
    const lanes = [-800, -400, 0, 400, 800], items = [];
    lanes.forEach((lx, li) => {
      const R = rng(seed * 131 + li * 17 + 3);
      let d = 0.84 + R() * 0.5 + li * 0.11;
      while (d < 38) {
        const kind = V.CAR_KINDS[(R() * V.CAR_KINDS.length) | 0], col = V.CAR_COLORS[(R() * V.CAR_COLORS.length) | 0];
        const skip = R() < gap, jx = (R() - 0.5) * 64, tilt = (R() - 0.5) * 0.035, ph = R() * 9;
        if (!skip) items.push({ type: 'car', k: 1 / d, x: lx + jx, kind, col, tilt, ph, lane: li });
        d += lerp(0.5, 0.74, R()) * (kind === 'van' || kind === 'truck' ? 1.15 : 1);
      }
    });
    const R = rng(seed * 7 + 1);
    for (let n = 0; n < 24; n++) {
      const d = 1.5 + n * 1.25;
      items.push({ type: 'lamp', k: 1 / d, x: -1180 }); items.push({ type: 'lamp', k: 1 / (d + 0.6), x: 1180 });
      if (R() < 0.8) items.push({ type: 'tree', k: 1 / (d + R()), x: -(1400 + R() * 900), pine: R() < 0.6 });
      if (R() < 0.8) items.push({ type: 'tree', k: 1 / (d + R()), x: 1400 + R() * 900, pine: R() < 0.6 });
    }
    hwCache.set(key, items); return items;
  }

  // o: {hor, seed, mood, sunX, fires, big, gap, figs:[{lane x, d0, v, color}], zombies:n, samCar, storm}
  function highwayWorld(c, t, o) {
    const hor = o.hor, vpx = 540, span = H - hor;
    const Y = (k) => hor + span * k, X = (x, k) => vpx + x * k;
    const sx = o.sunX ?? vpx - 110;
    V.sky(c, { hor, mood: o.mood || 'dusk' });
    V.clouds(c, t, { seed: o.seed + 3, n: 9, y0: 250, y1: hor - 150, a: o.storm ? 0.85 : 0.55, speed: 4, dark: o.storm ? '#1d1530' : undefined, lit: o.storm ? '#B0503C' : undefined, big: o.storm ? 1.4 : 1, hs: o.storm ? 1.8 : 1 });
    V.sun(c, sx, hor - (o.sunLift ?? 40), o.sunR ?? 64, { a: o.sunA ?? 1 });
    V.clouds(c, t, { seed: o.seed + 9, n: 6, y0: hor - 190, y1: hor - 60, a: 0.45, speed: 3, hs: 0.7 });
    V.cityscape(c, t, { hor, seed: o.seed, big: o.big, sunX: sx, fires: o.fires, fireScale: o.fireScale });
    // ground
    c.fillStyle = lg(c, 0, hor, 0, H, [[0, '#6a3044'], [0.12, '#3a2340'], [0.35, '#251a36'], [1, '#17112a']]); c.fillRect(-300, hor - 4, W + 600, span + 304);
    // distant tree line along the horizon
    for (let i = 0; i < 40; i++) { const tx = i * 31 - 40 + h1(i, 8) * 18; if (Math.abs(tx - vpx) < 90) continue; const th = 26 + h1(i, 9) * 34; V.pine(c, tx, hor + 6, th, mix('#2a2038', '#A8503F', 0.4), mix('#201830', '#A8503F', 0.4)); }
    const k1 = 1.35;
    c.beginPath(); c.moveTo(vpx, hor); c.lineTo(X(-1060, k1), Y(k1)); c.lineTo(X(1060, k1), Y(k1)); c.closePath();
    c.fillStyle = lg(c, 0, hor, 0, H, [[0, mix('#3A3A48', '#E2583A', 0.58)], [0.16, mix('#3A3A48', '#C0502F', 0.32)], [0.5, '#3A3A48'], [1, '#262632']]); c.fill();
    // lane markings
    const quad = (x0, w, ka, kb, col) => fillPoly(c, [[X(x0 - w, ka), Y(ka)], [X(x0 + w, ka), Y(ka)], [X(x0 + w, kb), Y(kb)], [X(x0 - w, kb)  , Y(kb)]], col);
    quad(-1010, 9, k1, 0.006, 'rgba(201,166,64,.72)'); quad(1010, 9, k1, 0.006, 'rgba(207,200,184,.6)');
    for (let n = 0; n < 60; n++) {
      const d0 = 0.62 + n * 0.8, d1 = d0 + 0.36, ka = 1 / d0, kb = 1 / d1; if (kb < 0.016) break;
      for (const dx of [-600, -200, 200, 600]) quad(dx, 6.5, ka, kb, 'rgba(207,200,184,.52)');
    }
    // guard rails
    for (const sgn of [-1, 1]) {
      const x = sgn * 1100, ka = k1, kb = 0.008;
      fillPoly(c, [[X(x, ka), Y(ka) - 52 * ka], [X(x, kb), Y(kb) - 52 * kb], [X(x, kb), Y(kb) - 28 * kb], [X(x, ka), Y(ka) - 28 * ka]], '#4a4656');
      c.strokeStyle = 'rgba(255,170,110,.28)'; c.lineWidth = 2; c.beginPath(); c.moveTo(X(x, ka), Y(ka) - 52 * ka); c.lineTo(X(x, kb), Y(kb) - 52 * kb); c.stroke();
    }
    // sorted draw list
    const list = hwItems(o.seed, o.gap ?? 0.05).slice();
    (o.figs || []).forEach((f, i) => list.push({ type: 'fig', k: 1 / (f.d0 + f.v * t), x: f.x, f, i }));
    for (let i = 0; i < (o.zombies || 0); i++) {
      const R = rng(o.seed * 17 + i), d = 5 + R() * 6 - t * 0.05;
      list.push({ type: 'zom', k: 1 / d, x: [-600, -200, 200, 600][(R() * 4) | 0] + (R() - 0.5) * 60, i, ph: R() * 6 });
    }
    list.sort((a, b) => a.k - b.k);
    const fogC = '#B85A48';
    const samIdx = o.samCar ? list.findIndex((it) => it.type === 'car' && it.lane === 1 && it.k > 0.26 && it.k < 0.36) : -1;
    list.forEach((it, idx) => {
      const k = it.k, y = Y(k), x = X(it.x, k);
      if (x < -300 * k - 100 || x > W + 300 * k + 100) { if (it.type !== 'lamp' && it.type !== 'tree') return; }
      const fogAmt = clamp((0.5 - k) * 1.5, 0, 0.78);
      if (it.type === 'car') {
        const pulse = 0.5 + 0.1 * Math.sin(t * 1.3 + it.ph);
        if (idx === samIdx) {
          const a = 0.62 + 0.25 * Math.sin(t * 2.2), ring = (t * 0.7) % 1;
          c.globalCompositeOperation = 'lighter'; V.glow(c, x, y - 40 * k, 150 * k * 2.6, '#FFE08A', a, 1, 0.75); c.globalCompositeOperation = 'source-over';
          c.strokeStyle = `rgba(255,224,138,${0.5 * (1 - ring)})`; c.lineWidth = Math.max(1.5, 5 * k); c.beginPath(); c.ellipse(x, y + 4 * k, (110 + ring * 90) * k, (22 + ring * 18) * k, 0, 0, PI2); c.stroke();
        }
        V.carRear(c, { x, y, k, color: it.col, kind: it.kind, fog: fogC, fogAmt, glowA: pulse, tilt: it.tilt });
      } else if (it.type === 'lamp') {
        V.lamp(c, x, y, 640 * k, { arm: -Math.sign(it.x) * 0.2, glowA: 0.55 * clamp(k * 7), color: mix('#1B1530', fogC, fogAmt) });
      } else if (it.type === 'tree') {
        const col = mix('#1F3B3A', fogC, Math.min(0.85, fogAmt + 0.15));
        if (it.pine) V.pine(c, x, y, 640 * k, col, mix('#173031', fogC, fogAmt)); else V.roundTree(c, x, y, 560 * k, col);
      } else if (it.type === 'fig') {
        const f = it.f;
        V.drawFigureFront(c, { x, y, s: 0.78 * k * 1.7, t: t + i0(it.i), kind: 'civ', back: true, run: true, shirt: f.shirt, pants: f.pants, seed: it.i * 0.37, minPx: 3 });
      } else if (it.type === 'zom') {
        V.drawFigureFront(c, { x, y, s: 0.78 * k * 1.3, t, kind: 'zombie', back: false, seed: it.ph, sil: mix('#241a30', fogC, fogAmt * 0.9), alpha: 0.95 });
      }
    });
    // atmosphere
    V.haze(c, hor - 6, hor + 330, '#E0653F', 0.46, 0);
    c.fillStyle = lg(c, 0, H * 0.68, 0, H, [[0, 'rgba(10,6,20,0)'], [1, 'rgba(10,6,20,.55)']]); c.fillRect(-10, H * 0.68, W + 20, H * 0.32 + 10);
  }
  const i0 = (i) => i * 0.31;

  /* ============================== title ============================================== */
  SC.title = (c, lt, sc, gt) => {
    const u = u01(lt, sc), hor = 1010;
    c.save(); V.camera(c, u, { z0: 1.0, z1: 1.085, px: 540, py: 1000, y0: 0, y1: -20 });
    const runners = [
      { x: -200, d0: 2.6, v: 0.14, shirt: '#8A3B3B', pants: '#2E3A4E' }, { x: 200, d0: 2.1, v: 0.18, shirt: '#3B5A8A', pants: '#3A3A4A' },
      { x: 600, d0: 3.4, v: 0.16, shirt: '#C9B458', pants: '#3A2E3E' }, { x: -600, d0: 3.9, v: 0.15, shirt: '#DDDDDD', pants: '#2E3A4E' },
      { x: 0, d0: 5.0, v: 0.2, shirt: '#6B8E5A', pants: '#3A3A4A' }, { x: 400, d0: 6.2, v: 0.12, shirt: '#B5642B', pants: '#2E2E3A' },
    ];
    highwayWorld(c, lt, { hor, seed: 11, mood: 'ember', sunX: 540, sunR: 92, sunLift: 70, big: 1.5, fires: 5, fireScale: 1.4, gap: 0.3, figs: runners });
    V.motes(c, lt, { seed: 4, n: 40, x0: 0, y0: 620, x1: W, y1: 1300, r: 2.3, color: '#FFB060', a: 0.7, vx: 10, vy: -26 });
    c.restore();
    return { vig: 1.15 };
  };

  /* ============================== highway_jam ======================================== */
  SC.highway_jam = (c, lt, sc, gt) => {
    const u = u01(lt, sc);
    c.save(); V.camera(c, u, { z0: 1.0, z1: 1.09, px: 540, py: 1150, x0: -14, x1: 14 });
    highwayWorld(c, lt, { hor: 1130, seed: 23, mood: 'dusk', sunX: 470, sunR: 60, big: 1.1, fires: 3, gap: 0.04, samCar: true, zombies: 4 });
    V.birds(c, lt, { seed: 2, n: 5, y0: 420, y1: 760, speed: 24, s: 1.0 });
    V.motes(c, lt, { seed: 7, n: 26, x0: 0, y0: 700, x1: W, y1: 1400, r: 2, color: '#FFC080', a: 0.5, vx: 8, vy: -14 });
    c.restore();
    return { vig: 1.05 };
  };

  /* ============================== fact_card ========================================== */
  let factN = 0;
  SC.fact_card = (c, lt, sc, gt) => {
    const u = u01(lt, sc), variant = sc.factIndex % 2;
    c.save();
    if (variant === 0) V.camera(c, u, { z0: 1.06, z1: 1.1, px: 540, py: 1150, x0: -34, x1: 34 });
    else V.camera(c, u, { z0: 1.12, z1: 1.06, px: 540, py: 1150, x0: 30, x1: -30 });
    highwayWorld(c, lt, variant === 0
      ? { hor: 1150, seed: 41, mood: 'dusk', sunX: 700, sunR: 58, big: 1.0, fires: 2, gap: 0.05 }
      : { hor: 1120, seed: 58, mood: 'storm', sunX: 330, sunR: 50, sunA: 0.6, big: 1.1, fires: 2, gap: 0.12, storm: true });
    if (variant === 1) {
      // distant lightning flash
      const ph = (lt * 0.37 + 0.2) % 1, fl = ph < 0.03 ? 1 : ph < 0.06 ? 0.4 : ph < 0.075 ? 0.9 : 0;
      if (fl) { c.fillStyle = `rgba(210,215,255,${0.22 * fl})`; c.fillRect(-10, -10, W + 20, 1150); }
    }
    c.restore();
    // desaturated, cooler grade
    c.save(); c.globalCompositeOperation = 'saturation'; c.globalAlpha = 0.62; c.fillStyle = 'rgb(128,128,128)'; c.fillRect(0, 0, W, H); c.restore();
    c.fillStyle = 'rgba(20,20,40,0.45)'; c.fillRect(0, 0, W, H);
    return { vig: 1.2, factCard: true };
  };

  /* ============================== suburb_run ========================================= */
  function house(c, x, gy, w, h, seed, t) {
    const R = rng(seed), roofH = lerp(70, 110, R());
    const wallCols = ['#6B5A8A', '#8A5A6B', '#5A6B8A', '#8A6B5A', '#5A7A6B'];
    const wall = mix(wallCols[(R() * wallCols.length) | 0], '#1B1530', 0.55);
    fillRR(c, x, gy - h, w, h, 3, lg(c, 0, gy - h, 0, gy, [[0, shade(wall, 0.04)], [1, shade(wall, -0.35)]]));
    // roof (dark) with rim light on the sun side
    const rx0 = x - 16, rx1 = x + w + 16, peak = gy - h - roofH;
    fillPoly(c, [[rx0, gy - h + 2], [x + w / 2, peak], [rx1, gy - h + 2]], '#2A1D3A');
    c.strokeStyle = 'rgba(255,150,90,.55)'; c.lineWidth = 3; c.lineJoin = 'round'; c.beginPath(); c.moveTo(rx0, gy - h + 2); c.lineTo(x + w / 2, peak); c.stroke();
    if (R() < 0.7) fillRR(c, x + w * 0.68, peak + roofH * 0.18, 22, roofH * 0.55, 2, '#2A1D3A');
    // windows
    const nW = w > 270 ? 3 : 2, wy = gy - h + 28, ww = 42, wh = 56;
    const lit = [R() < 0.65, R() < 0.5, R() < 0.5];
    for (let i = 0; i < nW; i++) {
      const wx = x + w * (i + 0.5) / nW - ww / 2 + (i === 1 && nW === 3 ? 0 : 0);
      const isDoor = nW === 3 && i === 1;
      if (isDoor) { fillRR(c, wx - 2, gy - 84, ww + 4, 84, 3, shade(wall, -0.5)); c.fillStyle = '#FFD27A'; c.globalAlpha = 0.7; c.fillRect(wx + ww - 8, gy - 52, 5, 5); c.globalAlpha = 1; continue; }
      fillRR(c, wx - 4, wy - 4, ww + 8, wh + 8, 3, '#1b1428');
      const L = lit[i];
      fillRR(c, wx, wy, ww, wh, 2, L ? lg(c, 0, wy, 0, wy + wh, [[0, '#FFE6A0'], [1, '#F2A64A']]) : '#241f3a');
      if (L) { c.globalCompositeOperation = 'lighter'; V.glow(c, wx + ww / 2, wy + wh / 2, 70, '#FFB060', 0.28); c.globalCompositeOperation = 'source-over'; fillRR(c, wx + ww / 2 - 1.5, wy, 3, wh, 0, 'rgba(30,18,30,.65)'); }
      else { c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(wx, wy, ww, 4); }
    }
    if (nW === 2) { fillRR(c, x + w / 2 - 22, gy - 82, 44, 82, 3, shade(wall, -0.55)); }
  }

  SC.suburb_run = (c, lt, sc, gt) => {
    const dur = sc.dur, u = u01(lt, sc), s = 1.0, hor = 1090;
    const v = V.RUN_SPEED(s), tA = dur * 0.8, tau = 0.45;
    const tc = Math.max(0.3, tA - tau);
    const samX = (tt) => (tt <= tc ? v * tt : v * tc + v * tau * (() => { const q = clamp((tt - tc) / tau); return q - q * q / 2; })());
    const arrX = samX(tA + 5);
    const sxw = samX(lt), camX = sxw - 360;
    const carL = V.carLen('sedan', 0.92), carX = arrX - carL * 0.5 + 40 + 2;
    const gyHouse = 1262, gySide = 1412;
    const cam = (par, x) => x - camX * par;
    c.save(); V.camera(c, u, { z0: 1.0, z1: 1.07, px: 380, py: 1300 });
    V.sky(c, { hor, mood: 'dusk' });
    V.clouds(c, lt, { seed: 5, n: 10, y0: 300, y1: hor - 80, a: 0.55, speed: 6 });
    V.sun(c, cam(0.05, 590), hor - 46, 70);
    V.birds(c, lt, { seed: 3, n: 6, y0: 480, y1: 800, speed: 34 });
    // far hills + tree line
    const hillX = camX * 0.08;
    c.beginPath(); c.moveTo(-50, hor + 60);
    for (let x = -50; x <= W + 50; x += 20) c.lineTo(x, hor - 24 - 22 * Math.sin((x + hillX) / 210) - 12 * Math.sin((x + hillX) / 77 + 1));
    c.lineTo(W + 50, hor + 60); c.closePath(); c.fillStyle = lg(c, 0, hor - 70, 0, hor + 20, [[0, '#4B2A55'], [1, '#9a4a48']]); c.fill();
    for (let i = Math.floor((camX * 0.2 - 100) / 70); i < (camX * 0.2 + W + 100) / 70; i++) {
      const x = i * 70 - camX * 0.2 + h1(i, 3) * 30, hh = 90 + h1(i, 4) * 70;
      if (h1(i, 5) < 0.55) V.roundTree(c, x, hor + 14, hh, mix('#2A1D3A', '#9a4a48', 0.25)); else V.pine(c, x, hor + 14, hh * 1.1, mix('#26334a', '#9a4a48', 0.2), mix('#1d2a3d', '#9a4a48', 0.2));
    }
    // ground stack (shifted up so feet clear the subtitle band)
    c.save(); c.translate(0, -28);
    c.fillStyle = lg(c, 0, hor, 0, H, [[0, '#6a3a4a'], [0.12, '#2c2a44'], [1, '#17112a']]); c.fillRect(-10, hor + 10, W + 20, H + 80);
    // houses (par .5) with trees between
    const par = 0.5, cell = 430;
    for (let i = Math.floor((camX * par - 320) / cell); i <= Math.ceil((camX * par + W + 320) / cell); i++) {
      const hw = 250 + h1(i, 1) * 70, hh = 150 + h1(i, 2) * 40, hx = i * cell - camX * par + 40 + (cell - hw - 80) * h1(i, 7);
      house(c, hx, gyHouse, hw, hh, 100 + ((i % 7) + 7) % 7, lt);
      V.roundTree(c, hx + hw + 62, gyHouse + 4, 190 + h1(i, 9) * 60, mix('#1F2A3C', '#5a2a4a', 0.3));
      fillEll(c, hx + hw * 0.1, gyHouse - 12, 38, 22, '#1d2a36'); fillEll(c, hx + hw * 0.92, gyHouse - 10, 30, 18, '#1d2a36');
    }
    // lawn + fence + sidewalk
    c.fillStyle = lg(c, 0, gyHouse, 0, 1335, [[0, '#2a2f44'], [1, '#222036']]); c.fillRect(-10, gyHouse, W + 20, 1335 - gyHouse);
    c.fillStyle = '#7a6a8a'; c.globalAlpha = 0.55; c.beginPath();
    for (let x = -((camX * 0.75) % 26) - 26; x < W + 30; x += 26) c.rect(x, 1285, 12, 52);
    c.fill(); c.globalAlpha = 1; c.fillRect(-10, 1300, W + 20, 6); c.fillRect(-10, 1322, W + 20, 5);
    // sidewalk
    c.fillStyle = lg(c, 0, 1335, 0, 1428, [[0, '#7f6a86'], [1, '#5c4c6c']]); c.fillRect(-10, 1335, W + 20, 93);
    c.fillStyle = 'rgba(20,10,30,.35)'; for (let i = Math.floor(camX / 170) - 1; i < (camX + W) / 170 + 1; i++) c.fillRect(i * 170 - camX, 1335, 3, 93);
    c.fillStyle = '#9a86a0'; c.fillRect(-10, 1424, W + 20, 7);
    // street
    c.fillStyle = lg(c, 0, 1431, 0, H, [[0, '#4a4658'], [1, '#2a2834']]); c.fillRect(-10, 1431, W + 20, H + 80);
    c.fillStyle = 'rgba(201,166,64,.55)'; for (let i = Math.floor(camX / 220) - 1; i < (camX + W) / 220 + 1; i++) c.fillRect(i * 220 - camX, 1760, 120, 9);
    // lamp posts
    for (let i = Math.floor(camX / 640) - 1; i <= (camX + W) / 640 + 1; i++) V.lamp(c, i * 640 + 200 - camX, 1360, 330, { arm: 0.11, glowA: 0.6, color: '#1B1530' });
    // car in the driveway
    const flash = lt > tA + 0.05 ? (Math.floor((lt - tA - 0.05) / 0.22) < 4 && Math.floor((lt - tA - 0.05) / 0.22) % 2 === 0 ? 1 : 0) : 0;
    const cx = carX - camX;
    V.carSide(c, { x: cx, y: 1384, s: 0.92, color: '#3B5A8A', kind: 'sedan', glowA: 0.4 + 0.9 * flash, head: 0.15 + 0.8 * flash });
    if (flash) {
      V.glow(c, cx + carL + 20, 1300, 160, '#FFF2B0', 0.5);
      c.globalCompositeOperation = 'lighter'; V.glow(c, cx + carL + 160, 1330, 300, '#FFF2B0', 0.25, 1.4, 0.4); c.globalCompositeOperation = 'source-over';
    }
    // Sam
    const run = lt < tA;
    const fig = { x: sxw - camX, y: 1424, s, t: lt, facing: 1, minPx: 3 };
    V.groundShadow(c, fig.x - 6, fig.y + 2, 54, 9, 0.4);
    V.castShadow(c, Object.assign({ mode: run ? 'run' : 'stand', item: 'keys', dir: 1 }, fig), 0.28, 1.5, 0.2);
    let J;
    if (lt < tA - 0.05) J = V.pose('run', lt, { item: 'keys' });
    else { const k = clamp((lt - (tA - 0.05)) / 0.18); J = blendJ(V.pose('run', lt, { item: 'keys' }), V.pose('stand', lt, { item: 'keys' }), V.sstep(0, 1, k)); }
    V.figure(c, Object.assign({}, fig, { J, style: 'sam' }));
    c.restore();
    c.restore();
    return { vig: 1.1 };
  };

  // deep-lerp two joint sets
  function blendJ(a, b, k) {
    if (typeof a === 'number') return a + (b - a) * k;
    if (Array.isArray(a)) return a.map((v, i) => blendJ(v, b[i], k));
    if (a && typeof a === 'object') { const o = {}; for (const key in a) o[key] = blendJ(a[key], b[key], k); return o; }
    return b;
  }
  V.blendJ = blendJ;

  /* ============================== leaving_car ======================================== */
  const bmpCache = new Map();
  function sideBitmap(kind, color, o = {}) {
    const key = kind + color + (o.dim ? 'd' : '') + (o.flip ? 'f' : '');
    let b = bmpCache.get(key); if (b) return b;
    const L = V.carLen(kind, 1), cv = V.mk(Math.ceil(L) + 40, 230), g = cv.getContext('2d');
    V.carSide(g, { x: 20, y: 215, s: 1, color, kind, dim: o.dim, flip: o.flip, tail: true, glowA: 0.45 });
    if (o.dim) {
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = lg(g, 0, 20, 0, 215, [[0, 'rgba(10,6,20,.55)'], [1, 'rgba(10,6,20,.8)']]); g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = lg(g, 0, 20, 0, 215, [[0, 'rgba(255,150,80,.55)'], [0.16, 'rgba(255,140,80,.22)'], [0.34, 'rgba(255,140,80,0)']]); g.fillRect(0, 0, cv.width, cv.height);
      g.globalCompositeOperation = 'source-over';
    }
    b = { cv, L, ox: 20 }; bmpCache.set(key, b); return b;
  }

  function carRow(c, t, o) {
    // o: {camX, par, s, gy, seed, dim, fog, fogAmt, hornDur, honk}
    const sp = 540 * o.s;
    const i0 = Math.floor((o.camX * o.par - 460 * o.s) / sp), i1 = Math.ceil((o.camX * o.par + W + 200) / sp);
    for (let i = i0; i <= i1; i++) {
      const kind = V.SIDE_KINDS[Math.floor(h1(i, o.seed) * V.SIDE_KINDS.length)], col = V.CAR_COLORS[Math.floor(h1(i, o.seed + 1) * V.CAR_COLORS.length)];
      const L = V.carLen(kind, o.s), x = i * sp + (sp - L) / 2 + (h1(i, o.seed + 2) - 0.5) * 24 * o.s - o.camX * o.par;
      const body = mix(mix(col, '#2a1838', o.dusk ?? 0.2), o.fog, o.fogAmt);
      const honk = o.honk && h1(i, o.seed + 3) < 0.7 ? o.honk * (0.25 + 0.7 * h1(i, o.seed + 4)) : 0;
      const on = honk && t < honk;
      const wob = on ? Math.sin(t * 38 + i) * 0.9 * o.s : 0;
      V.carSide(c, { x, y: o.gy + wob, s: o.s, color: body, kind, glowA: 0.5, dim: false, flip: h1(i, o.seed + 5) < 0.0 });
      if (on) {
        const fx = x + L * 0.96, fy = o.gy - 125 * o.s;
        c.lineCap = 'round';
        for (let m = 0; m < 3; m++) {
          const age = ((t * 1.7 + h1(i, 9) * 3 + m / 3) % 1), r = (26 + age * 70) * o.s, a = (1 - age) * 0.85 * clamp((honk - t) / 0.4 + 0.3);
          c.strokeStyle = `rgba(255,240,200,${a})`; c.lineWidth = 5 * o.s + 1;
          c.beginPath(); c.arc(fx - r * 0.35, fy, r, -0.65, 0.65); c.stroke();
        }
      }
    }
  }

  SC.leaving_car = (c, lt, sc, gt) => {
    const dur = sc.dur, u = u01(lt, sc), hor = 1100;
    const vW = V.WALK_SPEED(1.0) * 0.9;
    const samDX = vW * lt;                       // distance walked
    const camX = samDX * 0.45;
    const mood = V.moodMix('dusk', 'deep', clamp(u * 1.1));
    c.save(); V.camera(c, u, { z0: 1.02, z1: 1.09, px: 520, py: 1250, x0: 0, x1: -10 });
    V.sky(c, { hor, mood });
    V.clouds(c, lt, { seed: 15, n: 8, y0: 300, y1: hor - 90, a: 0.5, speed: 3 });
    V.sun(c, 760 - camX * 0.04, hor - 30 + u * 60, 58, { a: 1 - u * 0.55 });
    V.cityscape(c, lt, { hor, seed: 31, big: 0.9, sunX: 760, fires: 3 });
    c.fillStyle = lg(c, 0, hor, 0, H, [[0, '#6a3446'], [0.15, '#2E1F3D'], [1, '#17112a']]); c.fillRect(-10, hor - 2, W + 20, H);
    c.save(); c.translate(0, -28);
    // road surface
    c.fillStyle = lg(c, 0, 1140, 0, H, [[0, mix('#3A3A48', '#C0502F', 0.35)], [0.35, '#3A3A48'], [1, '#262632']]); c.fillRect(-10, 1140, W + 20, H + 80);
    // lane lines per row (horizontal in side view)
    const dashes = (y, par, w, th, a) => { c.fillStyle = `rgba(207,200,184,${a})`; const sp = w * 2.1; for (let i = Math.floor(camX * par / sp) - 1; i < (camX * par + W) / sp + 1; i++) c.fillRect(i * sp - camX * par, y, w, th); };
    dashes(1198, 0.45, 40, 3, 0.35); dashes(1262, 0.62, 56, 4, 0.4); dashes(1335, 0.85, 80, 5, 0.45);
    fillRR(c, -10, 1452, W + 20, 6, 0, 'rgba(207,200,184,.55)');
    // rows far -> near
    carRow(c, lt, { camX, par: 0.45, s: 0.46, gy: 1186, seed: 61, fog: '#B85A48', fogAmt: 0.5, honk: dur * 0.5, dusk: 0.3 });
    carRow(c, lt, { camX, par: 0.62, s: 0.6, gy: 1250, seed: 71, fog: '#B85A48', fogAmt: 0.22, honk: dur * 0.75, dusk: 0.42 });
    carRow(c, lt, { camX, par: 0.85, s: 0.78, gy: 1326, seed: 81, fog: '#B85A48', fogAmt: 0.1, honk: dur * 0.9, dusk: 0.55 });
    // Sam's car in the near lane (par 1)
    const gy = 1412, carX = 150 - camX, kind = 'sedan', col = '#8A3B3B', cl = V.carLen(kind, 1.0);
    V.carSide(c, { x: carX, y: gy, s: 1.0, color: col, kind, glowA: 0.35 });
    // open driver door
    const hx = carX + 262;
    c.save(); c.beginPath(); V.poly(c, [[hx, gy - 90], [hx - 46, gy - 80], [hx - 46, gy - 22], [hx, gy - 32]]); c.fillStyle = lg(c, hx - 46, 0, hx, 0, [[0, shade(col, -0.2)], [1, shade(col, -0.05)]]); c.fill();
    fillPoly(c, [[hx - 3, gy - 86], [hx - 40, gy - 78], [hx - 40, gy - 54], [hx - 3, gy - 60]], '#222a44');
    c.restore();
    // something stirs: zombies emerge between the cars late in the scene
    V.zombieRow(c, lt, { camX, par: 0.85, gy: 1338, s: 0.78, seed: 311, spacing: 430, prob: 0.5, dir: -1, fog: '#3a2236', fogAmt: 0.25, alpha: sstep(0.45, 0.8, u), jy: 10 });
    V.zombieRow(c, lt, { camX, par: 0.62, gy: 1262, s: 0.6, seed: 321, spacing: 380, prob: 0.5, dir: -1, fog: '#5a2a38', fogAmt: 0.38, alpha: sstep(0.35, 0.7, u) });
    // Sam walks away (right)
    const fig = { x: hx - 30 + samDX - camX, y: gy + 8, s: 1.0, t: lt, facing: 1, minPx: 3 };
    const stepOut = clamp(lt / 0.5);
    V.groundShadow(c, fig.x - 4, fig.y + 2, 58, 9, 0.4);
    V.castShadow(c, Object.assign({ mode: 'walk', dir: 1 }, fig), 0.26, 1.5, 0.2);
    V.figure(c, Object.assign({}, fig, { mode: 'walk', f: 1.6, alpha: 1 }));
    // foreground shoulder
    c.fillStyle = lg(c, 0, 1620, 0, H, [[0, 'rgba(10,6,20,0)'], [1, 'rgba(10,6,20,.55)']]); c.fillRect(-10, 1620, W + 20, H + 80);
    c.restore();
    c.restore();
    // sky darkening overlay
    c.fillStyle = `rgba(10,5,24,${0.32 * u})`; c.fillRect(0, 0, W, H);
    return { vig: 1.1 + 0.2 * u };
  };

  /* ============================== lanes_movement ===================================== */
  SC.lanes_movement = (c, lt, sc, gt) => {
    const u = u01(lt, sc), hor = 1040, vpx = 540, G = 118, SY = 1.38;
    const Y = (k) => hor + G * k, X = (x, k) => vpx + x * k;
    c.save(); V.camera(c, u, { z0: 1.0, z1: 1.13, px: 540, py: 1050, x0: 0, x1: 6 });
    V.sky(c, { hor, mood: 'ember' });
    V.clouds(c, lt, { seed: 27, n: 9, y0: 260, y1: hor - 60, a: 0.7, speed: 3, dark: '#1d1030', lit: '#C8502F' });
    V.sun(c, 540, hor - 24, 70, { a: 0.9 });
    V.cityscape(c, lt, { hor, seed: 53, big: 1.5, sunX: 540, fires: 6, fireScale: 1.3 });
    c.fillStyle = lg(c, 0, 0, 0, hor, [[0, 'rgba(8,4,16,.55)'], [0.7, 'rgba(8,4,16,.28)'], [1, 'rgba(8,4,16,.05)']]); c.fillRect(-10, -10, W + 20, hor + 10);
    // floor
    const k1 = 7.6;
    c.fillStyle = lg(c, 0, hor, 0, H, [[0, '#2a1a28'], [0.2, '#161220'], [1, '#07050c']]); c.fillRect(-10, hor - 1, W + 20, H);
    c.beginPath(); c.moveTo(vpx, hor); c.lineTo(X(-760, k1), Y(k1)); c.lineTo(X(760, k1), Y(k1)); c.closePath();
    c.fillStyle = lg(c, 0, hor, 0, H, [[0, mix('#3A3A48', '#E2583A', 0.55)], [0.1, '#3a3040'], [0.35, '#1c1824'], [1, '#0a0810']]); c.fill();
    for (let n = 0; n < 60; n++) {                       // dashed lane line down the corridor
      const d0 = 0.55 + n * 0.62, d1 = d0 + 0.3, ka = 1 / d0, kb = 1 / d1; if (kb < 0.02) break;
      fillPoly(c, [[X(-6, ka), Y(ka)], [X(6, ka), Y(ka)], [X(6, kb), Y(kb)], [X(-6, kb), Y(kb)]], 'rgba(207,200,184,.5)');
    }
    // items: two columns of stopped cars + the horde in the middle
    const list = [];
    for (const side of [-1, 1]) {
      const R = rng(side > 0 ? 901 : 902); let d = 0.82 + (side > 0 ? 0.28 : 0);
      while (d < 42) {
        const kind = V.CAR_KINDS[(R() * V.CAR_KINDS.length) | 0], col = V.CAR_COLORS[(R() * V.CAR_COLORS.length) | 0];
        list.push({ type: 'car', k: 1 / d, x: side * (318 + R() * 26), kind, col, tilt: (R() - 0.5) * 0.03, ph: R() * 9 });
        d += lerp(0.52, 0.7, R()) * (kind === 'van' || kind === 'truck' ? 1.15 : 1);
      }
    }
    const Z = [[0.92, 14], [0.76, -128], [0.68, 132], [0.54, -52], [0.46, 84], [0.38, -118], [0.31, 40], [0.25, -70], [0.2, 98]];
    Z.forEach(([k0, xm], i) => list.push({ type: 'zom', k: Math.min(1.25, k0 * (1 + 0.15 * lt)), x: xm + Math.sin(lt * 0.8 + i * 2.1) * 6, i }));
    list.sort((a, b) => a.k - b.k);
    let glared = false;
    const glare = () => {
      c.globalCompositeOperation = 'lighter';
      V.glow(c, vpx, hor - 14, 560, '#FFE9B0', 0.85, 0.55, 0.8);
      V.glow(c, vpx, hor - 10, 240, '#FFFFFF', 0.95, 0.7, 0.7);
      V.glow(c, vpx, hor - 10, 780, '#FFB060', 0.3, 2.3, 0.16);
      c.globalCompositeOperation = 'source-over'; glared = true;
    };
    for (const it of list) {
      if (!glared && it.k > 0.1) glare();
      const k = it.k, y = Y(k), x = X(it.x, k), fog = clamp((0.42 - k) * 1.5, 0, 0.7);
      if (it.type === 'car') {
        V.carRear(c, { x, y, k, sy: SY, color: mix(it.col, '#0c0614', 0.76), kind: it.kind, fog: '#8a4038', fogAmt: fog, glowA: 0.7 + 0.15 * Math.sin(lt * 1.3 + it.ph), tilt: it.tilt });
      } else {
        const hgt = 332 * k, s = hgt / 262;
        c.save();
        c.globalCompositeOperation = 'lighter'; V.glow(c, x, y - hgt * 0.5, hgt * 0.9, '#FFB060', 0.2 * (1 - fog)); c.globalCompositeOperation = 'source-over';
        c.shadowColor = `rgba(255,190,110,${0.9 * (1 - fog * 0.6)})`; c.shadowBlur = Math.max(4, hgt * 0.04);
        V.drawFigureFront(c, { x, y: y + 6 * k, s, t: lt + it.i * 0.37, kind: 'zombie', sil: mix('#07050b', '#6a3a40', fog), seed: it.i * 0.7 });
        c.restore();
      }
    }
    if (!glared) glare();
    V.haze(c, hor - 26, hor + 170, '#C8502F', 0.3, 0);
    c.restore();
    return { vig: 1.5 };
  };
})();
