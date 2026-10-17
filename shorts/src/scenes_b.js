/* scenes_b.js — bike_ride, farm_roads, barn_sunset, basement_heater, dog_morning, end_card */
(() => {
  const V = window.V;
  const { W, H, PI2, clamp, lerp, mix, rgba, shade, lg, glow, rng, h1, fillPoly, fillRR, fillEll, sstep, easeOut } = V;
  const SC = (V.SCENES = V.SCENES || {});
  const u01 = (lt, sc) => clamp(lt / sc.dur, 0, 1.25);
  const dusk = (col, amt = 0.22) => mix(col, '#2a1838', amt);

  /* ---------- soft dust puffs trailing behind a wheel ---------------------------- */
  function dust(c, t, o) {
    // o: {x0 (screen x of emit point), y, speed (px/s world scroll), life, rate}
    const rate = o.rate || 0.06, life = o.life || 0.9;
    const n0 = Math.floor(t / rate);
    for (let i = n0 - Math.ceil(life / rate); i <= n0; i++) {
      const te = i * rate, age = t - te; if (age < 0 || age > life) continue;
      const q = age / life, r1 = h1(i, 3), r2 = h1(i, 4);
      const x = o.x0 - o.speed * age + (r1 - 0.5) * 14, y = o.y - 6 - q * 46 * (0.6 + r2) - r2 * 6;
      V.glow(c, x, y, 20 + q * 56 * (0.8 + r1 * 0.5), o.color || '#E6BE88', 0.62 * (1 - q) * (1 - q * 0.4));
    }
  }

  /* ---------- barn ---------------------------------------------------------------- */
  V.barn = (c, o) => {
    const w = o.w || 440, wh = o.wh || 250, x = o.x, gy = o.gy, y0 = gy - wh, tn = o.tone || 0;
    const col = (k) => (tn ? mix(k, '#070a22', tn) : k);
    const red = col('#B5342B'), redD = col('#7E241F'), roof = col('#3B2A2A'), roofL = col('#52403E'), trim = col('#F2EDE4');
    const dx = o.dx ?? 210, dy = o.dy ?? -54, rk = wh / 250;
    const roofPts = [[x - w / 2 - 12, y0 + 10], [x - 0.36 * w - 6, y0 - 97 * rk], [x, y0 - 181 * rk], [x + 0.36 * w + 6, y0 - 97 * rk], [x + w / 2 + 12, y0 + 10]];
    // right side wall + roof planes
    fillPoly(c, [[x + w / 2, gy], [x + w / 2 + dx, gy + dy], [x + w / 2 + dx, y0 + dy], [x + w / 2, y0]], lg(c, x + w / 2, 0, x + w / 2 + dx, 0, [[0, redD], [1, shade(redD, -0.25)]]));
    c.save(); c.beginPath(); V.poly(c, [[x + w / 2, gy], [x + w / 2 + dx, gy + dy], [x + w / 2 + dx, y0 + dy], [x + w / 2, y0]]); c.clip();
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2; c.beginPath(); for (let i = 1; i < 10; i++) { const px = x + w / 2 + dx * i / 10; c.moveTo(px, 0); c.lineTo(px, H); } c.stroke(); c.restore();
    fillPoly(c, [[x + w / 2 + 12, y0 + 10], [x + 0.36 * w + 6, y0 - 97 * rk], [x + 0.36 * w + 6 + dx, y0 - 97 * rk + dy], [x + w / 2 + 12 + dx, y0 + 10 + dy]], roof);
    fillPoly(c, [[x + 0.36 * w + 6, y0 - 97 * rk], [x, y0 - 181 * rk], [x + dx, y0 - 181 * rk + dy], [x + 0.36 * w + 6 + dx, y0 - 97 * rk + dy]], roofL);
    c.strokeStyle = rgba('#000', 0.2); c.lineWidth = 2; c.beginPath(); for (let i = 1; i < 7; i++) { const f = i / 7; c.moveTo(lerp(x + w / 2 + 12, x + 0.36 * w + 6, f), lerp(y0 + 10, y0 - 97 * rk, f)); c.lineTo(lerp(x + w / 2 + 12, x + 0.36 * w + 6, f) + dx, lerp(y0 + 10, y0 - 97 * rk, f) + dy); } c.stroke();
    // facade (gable end)
    const fac = [[x - w / 2, gy], [x - w / 2, y0], [x - 0.36 * w, y0 - 95 * rk], [x, y0 - 175 * rk], [x + 0.36 * w, y0 - 95 * rk], [x + w / 2, y0], [x + w / 2, gy]];
    fillPoly(c, fac, lg(c, 0, y0 - 175 * rk, 0, gy, [[0, shade(red, 0.05)], [1, shade(red, -0.2)]]));
    c.save(); c.beginPath(); V.poly(c, fac); c.clip();
    c.strokeStyle = 'rgba(0,0,0,.16)'; c.lineWidth = 2; c.beginPath(); for (let px = x - w / 2 + 20; px < x + w / 2; px += 22) { c.moveTo(px, y0 - 180 * rk); c.lineTo(px, gy); } c.stroke();
    c.fillStyle = 'rgba(0,0,0,.20)'; c.fillRect(x - w / 2, gy - 14, w, 14);
    c.restore();
    // roof fascia + white trim
    V.line(c, roofPts, 15, roof); V.line(c, roofPts.map((p) => [p[0], p[1] + 15]), 5, trim);
    V.line(c, [[x - w / 2 + 8, y0 + 4], [x - w / 2 + 8, gy]], 5, trim); V.line(c, [[x + w / 2 - 8, y0 + 4], [x + w / 2 - 8, gy]], 5, trim);
    // hayloft
    const hy = y0 - 66 * rk, hs = rk;
    fillRR(c, x - 34 * hs, hy, 68 * hs, 62 * hs, 3, col('#120a0c')); c.strokeStyle = trim; c.lineWidth = Math.max(2, 5 * hs); c.strokeRect(x - 34 * hs, hy, 68 * hs, 62 * hs);
    if (o.lantern) { V.glow(c, x, hy + 34 * hs, 90 * hs, '#FFB04A', 0.55 * o.lantern); fillRR(c, x - 8 * hs, hy + 22 * hs, 16 * hs, 24 * hs, 4, rgba('#FFE08A', 0.95 * o.lantern)); }
    // doors: dark opening + leaves flat against the wall with white X trim
    const dw = o.doorW || 150, dh = o.doorH || 172, dyy = gy - dh;
    fillRR(c, x - dw / 2, dyy, dw, dh, 0, lg(c, 0, dyy, 0, gy, [[0, col('#0a0507')], [0.7, col('#170c0c')], [1, col('#3a2014')]]));
    if (!tn || tn < 0.5) { // sunlight spilling onto the barn floor
      const a = 0.35 * (1 - tn);
      fillPoly(c, [[x - dw / 2, gy], [x + dw / 2 - 24, gy], [x + dw / 2 - 6, gy - 22], [x - dw / 2 + 36, gy - 22]], `rgba(255,170,80,${a})`);
      // hay bale + ladder silhouettes inside
      fillRR(c, x + 6, gy - 46, 56, 46, 3, col('#3b2a14')); fillRR(c, x - 60, gy - 30, 44, 30, 3, col('#2d2010'));
      V.line(c, [[x + 54, dyy + 12], [x + 54, gy - 40]], 3, col('#20150e')); V.line(c, [[x + 38, dyy + 12], [x + 38, gy - 40]], 3, col('#20150e'));
      for (let i = 0; i < 6; i++) V.line(c, [[x + 38, dyy + 26 + i * 18], [x + 54, dyy + 26 + i * 18]], 2.4, col('#20150e'));
    }
    for (const side of [-1, 1]) {
      const lx = side < 0 ? x - dw / 2 - 76 : x + dw / 2, lw = 76;
      fillRR(c, lx, dyy + 2, lw, dh - 2, 1, shade(red, side < 0 ? 0.03 : -0.12));
      c.strokeStyle = trim; c.lineWidth = 5; c.strokeRect(lx + 4, dyy + 6, lw - 8, dh - 10);
      c.lineWidth = 4; c.beginPath(); c.moveTo(lx + 4, dyy + 6); c.lineTo(lx + lw - 4, dyy + dh - 4); c.moveTo(lx + lw - 4, dyy + 6); c.lineTo(lx + 4, dyy + dh - 4); c.stroke();
    }
    c.strokeStyle = trim; c.lineWidth = 6; c.strokeRect(x - dw / 2 - 1, dyy - 1, dw + 2, dh + 1);
    // silo
    if (o.silo !== false) {
      const sx = x + w / 2 + dx + 52, base = gy + dy + 10, sw = 118, sh = 380;
      c.fillStyle = lg(c, sx - sw / 2, 0, sx + sw / 2, 0, [[0, col('#D8C6B0')], [0.45, col('#A6948C')], [1, col('#4e4252')]]); c.fillRect(sx - sw / 2, base - sh, sw, sh);
      c.beginPath(); c.ellipse(sx, base - sh, sw / 2, 36, 0, Math.PI, 0); c.fillStyle = lg(c, sx - sw / 2, 0, sx + sw / 2, 0, [[0, col('#C9B8A4')], [1, col('#5a4c5e')]]); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.22)'; c.lineWidth = 3; c.beginPath(); for (let i = 1; i < 8; i++) { c.moveTo(sx - sw / 2, base - sh + i * 46); c.lineTo(sx + sw / 2, base - sh + i * 46); } c.stroke();
    }
  };

  /* ============================== bike_ride ======================================== */
  const bmp = new Map();
  function carRow(c, t, o) {
    const sp = 540 * o.s, i0 = Math.floor((o.camX * o.par - 460 * o.s) / sp), i1 = Math.ceil((o.camX * o.par + W + 200) / sp);
    for (let i = i0; i <= i1; i++) {
      const kind = V.SIDE_KINDS[Math.floor(h1(i, o.seed) * V.SIDE_KINDS.length)], col = V.CAR_COLORS[Math.floor(h1(i, o.seed + 1) * V.CAR_COLORS.length)];
      const L = V.carLen(kind, o.s), x = i * sp + (sp - L) / 2 + (h1(i, o.seed + 2) - 0.5) * 24 * o.s - o.camX * o.par;
      const b = mix(dusk(col, o.dusk ?? 0.2), o.fog, o.fogAmt);
      V.carSide(c, { x, y: o.gy, s: o.s, color: b, kind, glowA: 0.4 });
    }
  }
  SC.bike_ride = (c, lt, sc, gt) => {
    const u = u01(lt, sc), hor = 1120, vB = 420, camX = 2600 + vB * lt;
    c.save(); V.camera(c, u, { z0: 1.03, z1: 1.09, px: 430, py: 1300, x1: -10 });
    V.sky(c, { hor, mood: 'dusk' });
    V.clouds(c, lt, { seed: 77, n: 9, y0: 330, y1: hor - 90, a: 0.55, speed: -8 });
    V.sun(c, 830 - camX * 0.01 % 80, hor - 36, 66);
    V.birds(c, lt, { seed: 12, n: 4, y0: 480, y1: 760, speed: 40, s: 1 });
    // skyline (very slow parallax)
    V.city(c, lt, { hor, x0: -160 - (camX * 0.05) % 200, x1: W + 200, seed: 91, wmin: 28, wmax: 78, hmin: 40, hmax: 200, color: '#4B2A55', haze: '#E2583A', hazeAmt: 0.6, win: null, gapX: 830, gapW: 220 });
    V.city(c, lt, { hor, x0: -160 - (camX * 0.09) % 260, x1: W + 260, seed: 92, wmin: 34, wmax: 90, hmin: 28, hmax: 130, color: '#2E1F3D', haze: '#C8452F', hazeAmt: 0.45, win: '#FFD27A', winP: 0.18, fires: 2, smoke: true });
    c.fillStyle = lg(c, 0, hor, 0, H, [[0, '#7a3a48'], [0.12, '#2E1F3D'], [1, '#17112a']]); c.fillRect(-10, hor - 2, W + 20, H);
    // road
    c.save(); c.translate(0, -30);
    c.fillStyle = lg(c, 0, hor + 20, 0, H, [[0, mix('#3A3A48', '#C0502F', 0.4)], [0.3, '#3A3A48'], [1, '#2a2a36']]); c.fillRect(-10, hor + 20, W + 20, H + 80);
    const dashes = (y, par, w, th, a) => { c.fillStyle = `rgba(207,200,184,${a})`; const sp = w * 2.1; for (let i = Math.floor(camX * par / sp) - 1; i < (camX * par + W) / sp + 1; i++) c.fillRect(i * sp - camX * par, y, w, th); };
    dashes(1196, 0.4, 36, 3, 0.3); dashes(1262, 0.55, 50, 4, 0.35); dashes(1338, 0.8, 74, 5, 0.4);
    const F = '#B85A48';
    carRow(c, lt, { camX, par: 0.4, s: 0.46, gy: 1182, seed: 201, fog: F, fogAmt: 0.5, dusk: 0.3 });
    carRow(c, lt, { camX, par: 0.55, s: 0.6, gy: 1246, seed: 211, fog: F, fogAmt: 0.22, dusk: 0.42 });
    carRow(c, lt, { camX, par: 0.8, s: 0.82, gy: 1334, seed: 221, fog: F, fogAmt: 0.08, dusk: 0.6 });
    // shoulder (bike lane) + edge line
    c.fillStyle = lg(c, 0, 1372, 0, H, [[0, '#4d4a58'], [1, '#2c2a38']]); c.fillRect(-10, 1372, W + 20, H + 80);
    c.fillStyle = 'rgba(207,200,184,.6)'; c.fillRect(-10, 1372, W + 20, 6);
    c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = Math.floor(camX / 90) - 1; i < (camX + W) / 90 + 1; i++) c.fillRect(i * 90 - camX + h1(i, 5) * 40, 1480 + h1(i, 6) * 200, 30 + h1(i, 7) * 40, 3);
    // zombies drift between the stopped cars
    V.zombieRow(c, lt, { camX, par: 0.8, gy: 1352, s: 0.84, seed: 411, spacing: 520, prob: 0.55, dir: -1, fog: '#3a2236', fogAmt: 0.22, jy: 14 });
    V.zombieRow(c, lt, { camX, par: 0.55, gy: 1262, s: 0.62, seed: 421, spacing: 430, prob: 0.5, dir: -1, fog: '#5a2a38', fogAmt: 0.4 });
    // bike
    const gy = 1424, bx = 430, s = 1.0, bob = Math.sin(lt * 7.2) * 1.2;
    V.groundShadow(c, bx, gy + 4, 108, 12, 0.45);
    dust(c, lt, { x0: bx - 62, y: gy, speed: vB });
    c.save(); c.translate(bx, gy); c.rotate(-0.012 + 0.008 * Math.sin(lt * 2.3)); c.translate(-bx, -gy);
    V.drawBike(c, { x: bx, y: gy + bob * 0.3, s, t: lt, dist: camX / s, cadence: 1.2 });
    c.restore();
    // foreground guard-rail posts racing past
    for (let i = Math.floor(camX * 1.45 / 360) - 1; i < (camX * 1.45 + W) / 360 + 1; i++) { const px = i * 360 - camX * 1.45; fillRR(c, px, 1738, 22, 240, 3, '#1b1626'); fillRR(c, px - 8, 1738, 38, 8, 3, '#2a2236'); }
    fillRR(c, -10, 1752, W + 20, 26, 0, '#241d30');
    c.restore();
    c.restore();
    return { vig: 1.1 };
  };

  /* ============================== farm_roads ======================================== */
  SC.farm_roads = (c, lt, sc, gt) => {
    const u = u01(lt, sc), hor = 1130, camX = 3000 + 110 * lt;
    const par = (p, x) => x - camX * p;
    c.save(); V.camera(c, u, { z0: 1.0, z1: 1.07, px: 540, py: 1250, x0: 0, x1: -26 });
    V.sky(c, { hor, mood: 'dusk' });
    V.clouds(c, lt, { seed: 88, n: 11, y0: 280, y1: hor - 70, a: 0.62, speed: 5, big: 1.3 });
    V.sun(c, 790 - camX * 0.02 % 200, hor - 62, 82);
    V.clouds(c, lt, { seed: 89, n: 5, y0: hor - 150, y1: hor - 40, a: 0.5, speed: 3, hs: 0.8 });
    V.birds(c, lt, { seed: 5, n: 7, y0: 420, y1: 800, speed: 26, s: 1.1 });
    // two ridges
    for (const [p, base, amp, col, k2] of [[0.05, hor - 6, 34, '#5E2F55', 0.02], [0.11, hor + 6, 26, '#3E2750', 0.03]]) {
      c.beginPath(); c.moveTo(-20, hor + 40);
      for (let x = -20; x <= W + 20; x += 16) c.lineTo(x, base - amp - amp * 0.7 * Math.sin((x + camX * p) / 260 + p * 40) - amp * 0.35 * Math.sin((x + camX * p) / 95 + 2));
      c.lineTo(W + 20, hor + 40); c.closePath(); c.fillStyle = lg(c, 0, base - amp * 2, 0, base + 10, [[0, col], [1, mix(col, '#E2583A', 0.55)]]); c.fill();
    }
    // far pines
    for (let i = Math.floor((camX * 0.16 - 60) / 46); i < (camX * 0.16 + W + 60) / 46; i++) {
      if (h1(i, 11) < 0.35) continue;
      const x = i * 46 - camX * 0.16 + h1(i, 12) * 30, hh = 60 + h1(i, 13) * 46;
      V.pine(c, x, hor + 18, hh, mix('#27504A', '#C0502F', 0.45), mix('#1F3B3A', '#C0502F', 0.45));
    }
    // windmill + barn silhouette (par .32)
    for (let k = Math.floor((camX * 0.32 - 300) / 1500); k <= Math.ceil((camX * 0.32 + W + 300) / 1500); k++) {
      const x = k * 1500 + 760 - camX * 0.32, base = hor + 40, hgt = 300 + 40 * h1(k, 1);
      const sil = mix('#2a1a30', '#a04a48', 0.28);
      fillPoly(c, [[x - 26, base], [x - 7, base - hgt], [x + 7, base - hgt], [x + 26, base]], sil);
      c.strokeStyle = mix(sil, '#000', 0.2); c.lineWidth = 2.4; c.beginPath(); for (let i = 1; i < 6; i++) { const f = i / 6, hw = lerp(26, 7, f); c.moveTo(x - hw, base - hgt * f); c.lineTo(x + hw, base - hgt * f); } c.stroke();
      const hx = x, hy = base - hgt - 6, ang = lt * 0.9 + k;
      for (let b = 0; b < 4; b++) {
        const a = ang + b * Math.PI / 2; c.save(); c.translate(hx, hy); c.rotate(a);
        fillPoly(c, [[6, -3], [hgt * 0.42, -9], [hgt * 0.42, 5], [6, 4]], sil); c.restore();
      }
      c.beginPath(); c.arc(hx, hy, 8, 0, PI2); c.fillStyle = sil; c.fill();
      // little barn next to the mill
      V.barn(c, { x: x + 220, gy: base + 4, w: 110, wh: 62, dx: 48, dy: -14, tone: 0.55, silo: false, doorW: 36, doorH: 44, dy2: 0 });
    }
    // field bands
    const fy = [hor, hor + 120, 1400, 1480];
    c.fillStyle = lg(c, 0, hor, 0, 1480, [[0, mix('#E3A840', '#E2583A', 0.5)], [0.35, '#D9A441'], [1, '#B8782C']]); c.fillRect(-10, hor, W + 20, 1480 - hor);
    // crop rows converging to the horizon
    c.save(); c.beginPath(); c.rect(-10, hor, W + 20, 1480 - hor); c.clip();
    c.strokeStyle = 'rgba(120,70,20,.22)'; c.lineWidth = 3; c.beginPath();
    for (let i = -14; i <= 14; i++) { const xb = 540 + i * 190 - (camX * 1.0) % 190; c.moveTo(540 + (xb - 540) * 0.04 - camX * 0.02 % 40, hor); c.lineTo(xb, 1480); }
    c.stroke(); c.restore();
    c.fillStyle = 'rgba(255,190,90,.16)'; c.fillRect(-10, hor, W + 20, 40);
    V.glow(c, 790 - camX * 0.02 % 200, hor + 10, 620, '#FFC070', 0.4, 1.7, 0.28);
    // wheat tufts (mid + near)
    V.grassTufts(c, -10, W + 10, hor + 160, 21, 'rgba(160,100,30,.55)', 0.8, 34); V.grassTufts(c, -10, W + 10, 1260, 22, 'rgba(150,90,24,.6)', 1.1, 40);
    // dirt road crossing the frame
    const roadY = (x) => 1356 + 16 * Math.sin((x + camX) / 330) + 6 * Math.sin((x + camX) / 120);
    c.beginPath(); c.moveTo(-10, roadY(-10) - 44); for (let x = -10; x <= W + 10; x += 20) c.lineTo(x, roadY(x) - 44 - 0.0); for (let x = W + 10; x >= -10; x -= 20) c.lineTo(x, roadY(x) + 46); c.closePath();
    c.fillStyle = lg(c, 0, 1300, 0, 1410, [[0, '#9a6a44'], [0.5, '#B07E52'], [1, '#8a5a3a']]); c.fill();
    c.strokeStyle = 'rgba(70,40,20,.38)'; c.lineWidth = 4; for (const off of [-12, 18]) { c.beginPath(); for (let x = -10; x <= W + 10; x += 20) { const y = roadY(x) + off; x < 0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); }
    // lone zombies out in the wheat
    V.zombieRow(c, lt, { camX, par: 0.7, gy: 1268, s: 0.3, seed: 511, spacing: 700, prob: 0.5, dir: -1, fog: '#8a4a30', fogAmt: 0.45, speedMul: 0.8, jy: 16 });
    // road-edge grass
    V.grassTufts(c, -10, W + 10, 1306, 31, '#B8782C', 0.9, 30);
    // near field
    c.fillStyle = lg(c, 0, 1410, 0, H, [[0, '#B8782C'], [0.35, '#8e5a22'], [1, '#2a1c14']]); c.fillRect(-10, 1410, W + 20, H);
    V.grassTufts(c, -10, W + 10, 1500, 41, 'rgba(110,64,20,.7)', 1.5, 46);
    // fence (par 1.15)
    const fp = 1.15, fsp = 170;
    c.strokeStyle = 'rgba(30,18,26,.9)'; c.lineWidth = 2.2;
    for (const wy of [-62, -40, -18]) { c.beginPath(); for (let i = Math.floor(camX * fp / fsp) - 1; i < (camX * fp + W) / fsp + 2; i++) { const x0 = i * fsp - camX * fp, x1 = x0 + fsp; c.moveTo(x0, 1470 + wy); c.quadraticCurveTo((x0 + x1) / 2, 1470 + wy + 9, x1, 1470 + wy); } c.stroke(); }
    for (let i = Math.floor(camX * fp / fsp) - 1; i < (camX * fp + W) / fsp + 2; i++) { const x = i * fsp - camX * fp; fillRR(c, x - 6, 1390, 12, 90, 2, '#2a1c1c'); fillPoly(c, [[x - 6, 1390], [x + 6, 1390], [x, 1382]], '#2a1c1c'); }
    // the bike: small, riding right along the dirt road
    const s = 0.5, bw = camX + 260 + 70 * lt, bx = bw - camX, by = roadY(bx) + 28;
    V.groundShadow(c, bx, by + 3, 54, 7, 0.4);
    dust(c, lt, { x0: bx - 32, y: by, speed: 110 + 70, rate: 0.08, life: 1.0, color: '#E0B27A' });
    V.drawBike(c, { x: bx, y: by, s, t: lt, dist: bw / s, cadence: 1.0, sil: null });
    // tall foreground grass
    c.fillStyle = '#1e1410'; V.grassTufts(c, -10, W + 10, 1840, 51, '#1e1410', 3.2, 38);
    c.restore();
    return { vig: 1.05 };
  };

  /* ============================== barn_sunset ======================================= */
  SC.barn_sunset = (c, lt, sc, gt) => {
    const dur = sc.dur, u = u01(lt, sc), hor = 1150;
    c.save(); V.camera(c, u, { z0: 1.0, z1: 1.16, px: 640, py: 1230 });
    V.sky(c, { hor, mood: 'dusk' });
    V.clouds(c, lt, { seed: 5, n: 10, y0: 320, y1: hor - 70, a: 0.6, speed: 4, big: 1.2 });
    V.sun(c, 230, hor - 38, 74);
    V.clouds(c, lt, { seed: 6, n: 5, y0: hor - 160, y1: hor - 40, a: 0.5, speed: 3, hs: 0.9 });
    // ridges + pines
    for (const [base, amp, col, p] of [[hor - 4, 36, '#5E2F55', 0.3], [hor + 10, 28, '#3E2750', 0.9]]) {
      c.beginPath(); c.moveTo(-20, hor + 50);
      for (let x = -20; x <= W + 20; x += 16) c.lineTo(x, base - amp - amp * 0.7 * Math.sin(x / 250 + p * 10) - amp * 0.3 * Math.sin(x / 83 + 2));
      c.lineTo(W + 20, hor + 50); c.closePath(); c.fillStyle = lg(c, 0, base - 80, 0, base + 10, [[0, col], [1, mix(col, '#E2583A', 0.55)]]); c.fill();
    }
    for (let i = 0; i < 26; i++) { const x = i * 44 + h1(i, 3) * 28 - 20; if (h1(i, 5) < 0.4) continue; V.pine(c, x, hor + 22, 70 + h1(i, 4) * 60, mix('#27504A', '#C0502F', 0.5), mix('#1F3B3A', '#C0502F', 0.5)); }
    // field
    c.fillStyle = lg(c, 0, hor, 0, H, [[0, mix('#E3A840', '#E2583A', 0.55)], [0.12, '#D9A441'], [0.5, '#B8782C'], [1, '#4a2e1c']]); c.fillRect(-10, hor, W + 20, H);
    V.glow(c, 230, hor + 14, 760, '#FFC070', 0.5, 1.9, 0.22);
    // distant fence line
    c.fillStyle = 'rgba(60,34,40,.5)'; for (let x = 0; x < W + 30; x += 60) c.fillRect(x, hor + 26, 4, 24); c.fillRect(0, hor + 32, W, 2);
    // long shadows (barn) cast right
    const gy = 1296, bx = 640;
    fillPoly(c, [[bx - 220, gy], [bx + 420, gy + 150], [bx + 520, gy + 150], [bx + 230, gy]], 'rgba(60,28,40,.32)');
    V.barn(c, { x: bx, gy, w: 440, wh: 252, lantern: 0 });
    // field edge details
    V.grassTufts(c, -10, W + 10, gy + 6, 7, 'rgba(120,70,20,.7)', 1.2, 36);
    V.grassTufts(c, -10, W + 10, 1420, 8, 'rgba(120,70,20,.75)', 1.8, 44);
    // dirt path to the barn
    fillPoly(c, [[bx - 60, gy + 4], [bx + 60, gy + 4], [bx + 340, H], [bx - 520, H]], 'rgba(150,100,60,.35)');
    // Sam walks in from the left toward the open doors
    const s = 0.92, x0 = -90, xT = bx - 240, dist = xT - x0;
    const f = 1.35, P = { legAmp: 0.4 }, v = V.WALK_SPEED(s, f, { legAmp: 0.4 }) * 0.92;
    const tA = dist / v, tau = 0.5, tc = Math.max(0, tA - tau);
    const sx = lt <= tc ? v * lt : v * tc + v * tau * (() => { const q = clamp((lt - tc) / tau); return q - q * q / 2; })();
    const arrived = lt >= tA + 0.06;
    const fig = { x: x0 + sx, y: 1394, s, t: lt, facing: 1, minPx: 3 };
    let J;
    const wp = V.pose('walk', lt, { f, P: { legAmp: 0.4 } });
    if (lt < tA - 0.05) J = wp; else J = V.blendJ(wp, V.pose('stand', lt), V.sstep(0, 1, clamp((lt - (tA - 0.05)) / 0.2)));
    V.groundShadow(c, fig.x - 4, fig.y + 2, 52, 8, 0.4);
    V.castShadow(c, Object.assign({ J, dir: 1 }, fig), 0.3, 2.4, 0.18);
    V.figure(c, Object.assign({}, fig, { J }));
    // warm rim light over Sam's side facing the sun is implied by colours; add dust motes in the low sun
    V.motes(c, lt, { seed: 21, n: 40, x0: 0, y0: 760, x1: W, y1: 1380, r: 2.2, color: '#FFD59A', a: 0.55, vx: 7, vy: -5 });
    c.restore();
    return { vig: 1.1 };
  };

  /* ============================== basement_heater =================================== */
  let maskCv = null;
  SC.basement_heater = (c, lt, sc, gt) => {
    const u = u01(lt, sc), gy = 1400;
    c.save(); V.camera(c, u, { z0: 1.0, z1: 1.08, px: 600, py: 1100, x0: 0, x1: 6 });
    // --- the room, drawn "lit" ---
    c.fillStyle = lg(c, 0, 0, 0, gy, [[0, '#2c2b36'], [1, '#55525e']]); c.fillRect(-20, -20, W + 40, gy + 20);
    c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 3; c.beginPath();
    for (let y = 120; y < gy; y += 86) { c.moveTo(0, y); c.lineTo(W, y); const off = ((y / 86) | 0) % 2 ? 0 : 90; for (let x = off; x < W; x += 180) { c.moveTo(x, y); c.lineTo(x, y + 86); } }
    c.stroke();
    c.fillStyle = lg(c, 0, gy, 0, H, [[0, '#4a464f'], [1, '#2a2730']]); c.fillRect(-20, gy, W + 40, H);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-20, gy, W + 40, 8);
    // ceiling pipes + joist
    fillRR(c, -20, 150, W + 40, 38, 0, '#3d3a46'); V.line(c, [[-20, 214], [W + 20, 214]], 20, '#6e7684'); V.line(c, [[-20, 214], [W + 20, 214]], 6, '#9aa3b0');
    // shelves (left, in the dark)
    for (const sy of [760, 940, 1120]) { fillRR(c, 30, sy, 250, 12, 2, '#5a3d28'); for (let i = 0; i < 5; i++) fillRR(c, 44 + i * 46, sy - 46 - (i % 2) * 8, 34, 46 + (i % 2) * 8, 4, ['#a33', '#cb7', '#69a', '#8a6', '#bbb'][i]); }
    fillRR(c, 30, 740, 12, 420, 2, '#3a281a'); fillRR(c, 268, 740, 12, 420, 2, '#3a281a');
    // staircase to the door above (light leak)
    fillPoly(c, [[760, 0], [1000, 0], [1000, 140], [760, 140]], '#1a1822'); fillRR(c, 830, 8, 6, 130, 0, 'rgba(255,230,170,.9)');
    // --- water heater (right) ---
    const tx = 800, tw = 200, ttop = 880, tb = gy - 28, tcx = tx;
    // pipes
    V.line(c, [[tx - 40, ttop - 30], [tx - 40, 230]], 16, '#B87333'); V.line(c, [[tx - 40, ttop - 30], [tx - 40, 230]], 5, '#E7A065');
    V.line(c, [[tx + 40, ttop - 28], [tx + 40, 320], [tx + 250, 320], [tx + 250, 214]], 16, '#6e7684'); V.line(c, [[tx + 40, ttop - 28], [tx + 40, 320], [tx + 250, 320], [tx + 250, 214]], 5, '#a9b2bf');
    fillRR(c, tx - 52, 380, 24, 30, 4, '#8a2a24'); fillRR(c, tx - 44, 366, 8, 18, 2, '#d33');
    // tank body
    const g = lg(c, tx - tw / 2, 0, tx + tw / 2, 0, [[0, '#59636f'], [0.22, '#9aa6b4'], [0.35, '#d5dde8'], [0.55, '#8a95a3'], [1, '#3d4550']]);
    c.beginPath(); c.moveTo(tx - tw / 2, tb); c.lineTo(tx - tw / 2, ttop + 40); c.quadraticCurveTo(tx - tw / 2, ttop, tx, ttop - 6); c.quadraticCurveTo(tx + tw / 2, ttop, tx + tw / 2, ttop + 40); c.lineTo(tx + tw / 2, tb); c.closePath(); c.fillStyle = g; c.fill();
    // bands + label + gauge + valve
    c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(tx - tw / 2, ttop + 60, tw, 8); c.fillRect(tx - tw / 2, tb - 70, tw, 8);
    fillRR(c, tx - 62, ttop + 120, 124, 150, 6, '#E8E2D0'); fillRR(c, tx - 52, ttop + 132, 104, 22, 3, '#C0392B');
    c.fillStyle = '#44403c'; for (let i = 0; i < 5; i++) c.fillRect(tx - 52, ttop + 168 + i * 16, 80 - (i % 2) * 22, 6);
    c.beginPath(); c.arc(tx + 76, ttop + 150, 22, 0, PI2); c.fillStyle = '#e8e4da'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#2a2a33'; c.stroke();
    V.line(c, [[tx + 76, ttop + 150], [tx + 88, ttop + 138]], 3, '#C0392B');
    fillRR(c, tx - 96, tb - 40, 36, 14, 4, '#7a828e'); fillRR(c, tx - 112, tb - 46, 22, 26, 4, '#C0392B');
    fillRR(c, tx - tw / 2 - 6, tb - 2, tw + 12, 30, 5, '#333842'); fillRR(c, tx - 80, tb + 26, 20, 12, 2, '#222'); fillRR(c, tx + 60, tb + 26, 20, 12, 2, '#222');
    const pilot = 0.7 + 0.3 * Math.sin(lt * 9); fillEll(c, tx + 10, tb - 14, 9 * pilot, 14 * pilot, '#6aa7ff'); fillRR(c, tx - 24, tb - 28, 70, 32, 6, 'rgba(10,10,20,.5)'); fillEll(c, tx + 10, tb - 12, 5 * pilot, 9 * pilot, '#bfe0ff');
    // puddle of water shine on the floor
    fillEll(c, tx - 30, gy + 30, 170, 20, 'rgba(160,190,230,.18)');
    // --- Sam with the flashlight ---
    const s = 1.2, sx = 250, fig = { x: sx, y: gy + 8, s, t: lt, facing: 1, minPx: 3 };
    const base = V.buildJ({ legs: [{ th: 0.1, sh: 0.07 }, { th: -0.12, sh: -0.1 }], lean: 0.05 + 0.006 * Math.sin(lt * 1.75), headLean: 0.08,
      arms: [{ a: 1.4, f: 1.55 }, { a: -0.06, f: 0.1 }], item: 'light', blink: false });
    base.blink = (lt / 3.4) % 1 < 0.04;
    V.groundShadow(c, sx - 4, fig.y + 2, 64, 10, 0.5);
    V.figure(c, Object.assign({}, fig, { J: base, over: { pack: '#4A4A3A' } }));
    const hand = V.toWorld(fig, base.arms[0].h), elb = V.toWorld(fig, base.arms[0].e);
    const dxh = hand[0] - elb[0], dyh = hand[1] - elb[1], dl = Math.hypot(dxh, dyh), ux = dxh / dl, uy = dyh / dl;
    const Lx = hand[0] + ux * 38 * s, Ly = hand[1] + uy * 38 * s;
    // aim at the tank, with a little hand wobble
    const aim = Math.atan2((ttop + 250) - Ly, tx - Lx) + 0.012 * Math.sin(lt * 1.3), half = 0.27, len = 900;
    c.restore();
    // --- darkness mask with the flashlight cone cut out ---
    c.save(); V.camera(c, u, { z0: 1.0, z1: 1.08, px: 600, py: 1100, x0: 0, x1: 6 });
    const camM = c.getTransform();
    if (!maskCv) maskCv = V.mk(W, H);
    const m = maskCv.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, W, H);
    m.fillStyle = 'rgba(3,2,7,0.92)'; m.fillRect(0, 0, W, H);
    m.setTransform(camM); m.globalCompositeOperation = 'destination-out';
    const flick = 0.93 + 0.07 * Math.sin(lt * 17) * Math.sin(lt * 3.1);
    // ambient: faint around Sam, door light-leak at the top
    V.glow(m, sx + 10, gy - 120, 400, '#fff', 0.85 * flick); V.glow(m, 830, 50, 240, '#fff', 0.5); V.glow(m, tx, ttop + 60, 330, '#fff', 0.34 * flick, 0.8, 1.2);
    // soft cone: stacked polygons of different widths
    for (let i = 0; i < 6; i++) {
      const hw = half * (1 - i * 0.13), a = 0.2 + i * 0.03;
      const g2 = m.createLinearGradient(Lx, Ly, Lx + Math.cos(aim) * len, Ly + Math.sin(aim) * len);
      g2.addColorStop(0, `rgba(0,0,0,${a * 1.6 * flick})`); g2.addColorStop(0.7, `rgba(0,0,0,${a * 1.2 * flick})`); g2.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = g2; m.beginPath(); m.moveTo(Lx, Ly); m.lineTo(Lx + Math.cos(aim - hw) * len, Ly + Math.sin(aim - hw) * len); m.lineTo(Lx + Math.cos(aim + hw) * len, Ly + Math.sin(aim + hw) * len); m.closePath(); m.fill();
    }
    // pool of light where the beam lands
    const hx = tx - 20, hy = ttop + 250;
    V.glow(m, hx, hy, 420, '#fff', 0.7 * flick, 0.8, 1.3);
    m.globalCompositeOperation = 'source-over'; m.setTransform(1, 0, 0, 1, 0, 0);
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(maskCv, 0, 0);
    c.restore();
    // volumetric beam + hotspot + dust
    c.save(); V.camera(c, u, { z0: 1.0, z1: 1.08, px: 600, py: 1100, x0: 0, x1: 6 });
    c.globalCompositeOperation = 'lighter';
    const gb = c.createLinearGradient(Lx, Ly, Lx + Math.cos(aim) * len, Ly + Math.sin(aim) * len);
    gb.addColorStop(0, `rgba(255,236,180,${0.38 * flick})`); gb.addColorStop(0.55, `rgba(255,226,160,${0.14 * flick})`); gb.addColorStop(1, 'rgba(255,220,150,0)');
    c.fillStyle = gb; c.beginPath(); c.moveTo(Lx, Ly); c.lineTo(Lx + Math.cos(aim - half * 0.85) * len, Ly + Math.sin(aim - half * 0.85) * len); c.lineTo(Lx + Math.cos(aim + half * 0.85) * len, Ly + Math.sin(aim + half * 0.85) * len); c.closePath(); c.fill();
    V.glow(c, Lx, Ly, 70, '#FFF3C8', 0.9 * flick);
    // dust motes inside the cone
    for (let i = 0; i < 70; i++) {
      const r1 = h1(i, 1), r2 = h1(i, 2), r3 = h1(i, 3);
      const d = 40 + ((r1 * 800 + lt * lerp(6, 18, r3)) % 780), lat = (r2 * 2 - 1) * Math.tan(half * 0.85) * d + Math.sin(lt * 0.7 + i) * 8;
      const px = Lx + Math.cos(aim) * d - Math.sin(aim) * lat, py = Ly + Math.sin(aim) * d + Math.cos(aim) * lat - lt * 3 * r3 % 30;
      const a = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(lt * 2 + i * 1.7))) * (1 - d / 880);
      c.fillStyle = `rgba(255,244,210,${a})`; c.beginPath(); c.arc(px, py, 1.2 + r3 * 1.6, 0, PI2); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    c.restore();
    return { vig: 1.5 };
  };

  /* ============================== dog_morning ======================================= */
  SC.dog_morning = (c, lt, sc, gt) => {
    const dur = sc.dur, u = u01(lt, sc), gy = 1405;
    c.save(); V.camera(c, u, { z0: 1.05, z1: 1.09, px: 560, py: 1250, x0: 24, x1: -22 });
    // wall
    c.fillStyle = lg(c, 0, 0, 0, 1330, [[0, '#E2BE92'], [1, '#C79C70']]); c.fillRect(-30, -30, W + 60, 1360);
    c.strokeStyle = 'rgba(90,50,20,.10)'; c.lineWidth = 3; c.beginPath(); for (let x = 20; x < W + 30; x += 90) { c.moveTo(x, 0); c.lineTo(x, 1330); } c.stroke();
    // window
    const wx = 110, wy = 420, ww = 330, wh = 470;
    fillRR(c, wx - 22, wy - 22, ww + 44, wh + 44, 6, '#6b4a2e');
    c.fillStyle = lg(c, 0, wy, 0, wy + wh, [[0, '#9fc1e0'], [0.6, '#F2D3AE'], [1, '#FFE6B8']]); c.fillRect(wx, wy, ww, wh);
    V.sun(c, wx + 220, wy + wh - 70, 40, { a: 0.8 });
    c.save(); c.beginPath(); c.rect(wx, wy, ww, wh); c.clip();
    V.pine(c, wx + 60, wy + wh + 10, 160, '#5a6a58', '#4a5a4a'); V.pine(c, wx + 270, wy + wh + 10, 220, '#5a6a58', '#4a5a4a');
    V.clouds(c, lt, { seed: 9, n: 3, y0: wy + 60, y1: wy + 200, a: 0.5, speed: 6, dark: '#d8b9c0', lit: '#fff0d8', big: 0.5 });
    c.restore();
    c.strokeStyle = '#6b4a2e'; c.lineWidth = 12; c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh * 0.46); c.lineTo(wx + ww, wy + wh * 0.46); c.stroke();
    fillRR(c, wx - 30, wy + wh + 20, ww + 60, 16, 3, '#5a3c24');
    // curtain
    fillPoly(c, [[wx - 22, wy - 22], [wx + 40, wy - 22], [wx + 20, wy + wh * 0.75], [wx - 22, wy + wh * 0.8]], 'rgba(190,90,70,.85)');
    // framed photo + hanging lantern
    fillRR(c, 880, 470, 110, 138, 4, '#5a3c24'); fillRR(c, 892, 482, 86, 114, 2, '#E8D6B0'); fillEll(c, 935, 520, 14, 14, '#8a6a4a'); fillRR(c, 915, 536, 40, 50, 14, '#8a6a4a');
    V.line(c, [[620, 0], [620, 240]], 4, '#3a2a1c'); fillRR(c, 596, 240, 48, 70, 8, '#3a2a1c'); fillRR(c, 604, 252, 32, 48, 6, 'rgba(255,214,140,.75)'); V.glow(c, 620, 276, 180, '#FFD08A', 0.28);
    // calendar + shelf
    fillRR(c, 620, 470, 120, 150, 4, '#EFE8D6'); fillRR(c, 620, 470, 120, 28, 4, '#B5342B');
    c.fillStyle = 'rgba(40,30,30,.5)'; for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) c.fillRect(630 + q * 26, 508 + r * 26, 18, 18);
    c.strokeStyle = '#B5342B'; c.lineWidth = 3.5; c.beginPath(); for (let q = 0; q < 2; q++) { c.moveTo(630 + q * 26, 508); c.lineTo(648 + q * 26, 526); c.moveTo(648 + q * 26, 508); c.lineTo(630 + q * 26, 526); } c.stroke();
    fillRR(c, 790, 800, 250, 14, 2, '#6b4a2e');
    for (let i = 0; i < 4; i++) fillRR(c, 806 + i * 44, 744 + (i % 2) * 6, 34, 56 - (i % 2) * 6, 5, ['#a8783e', '#7a8a5a', '#b5342b', '#cfc7b0'][i]);
    fillRR(c, 985, 752, 36, 48, 6, rgba('#fff', 0.5)); fillRR(c, 990, 770, 26, 30, 4, '#c9a050');
    // floor
    c.fillStyle = lg(c, 0, 1330, 0, H, [[0, '#9a6a3e'], [1, '#5d3b22']]); c.fillRect(-30, 1330, W + 60, H);
    c.fillStyle = 'rgba(40,20,8,.22)'; c.fillRect(-30, 1330, W + 60, 8);
    c.strokeStyle = 'rgba(40,20,8,.22)'; c.lineWidth = 3; c.beginPath(); for (let y = 1380, i = 0; y < H; y += 54 + i * 9, i++) { c.moveTo(-30, y); c.lineTo(W + 30, y); } c.stroke();
    // rug
    fillEll(c, 330, 1470, 330, 56, '#7a3a34'); fillEll(c, 330, 1470, 280, 42, 'rgba(230,200,150,.25)'); fillEll(c, 330, 1470, 240, 30, '#8a4a3c');
    // window light shaft on the wall/floor
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const [ins, a] of [[0, 0.07], [40, 0.07], [90, 0.06]]) {
      c.fillStyle = lg(c, 0, wy + wh, 0, 1700, [[0, `rgba(255,225,160,${a * 2.2})`], [1, `rgba(255,225,160,${a * 0.5})`]]);
      c.beginPath(); c.moveTo(wx + ins * 0.5, wy + wh); c.lineTo(wx + ww - ins * 0.5, wy + wh); c.lineTo(wx + ww + 520 - ins, 1720); c.lineTo(wx + 300 + ins, 1720); c.closePath(); c.fill();
    }
    V.glow(c, wx + ww / 2, wy + wh / 2, 420, '#FFE2A8', 0.22);
    c.restore();
    // chair + table
    const sx = 470;
    V.line(c, [[sx - 46, gy], [sx - 46, 1190]], 12, '#5a3c24'); V.line(c, [[sx - 46, 1230], [sx - 10, 1230]], 9, '#5a3c24'); V.line(c, [[sx - 46, 1270], [sx - 14, 1270]], 9, '#5a3c24');
    fillRR(c, sx - 52, 1334, 120, 16, 4, '#6e4a2c');
    V.line(c, [[sx - 38, 1348], [sx - 40, gy]], 10, '#4a301c'); V.line(c, [[sx + 58, 1348], [sx + 60, gy]], 10, '#4a301c');
    // dog (behind Sam's legs, in front of the rug)
    V.drawDog(c, { x: 262, y: 1432, s: 1.22, t: lt, pose: 'curl', wagF: 2.2, wagAmp: 0.35 + 0.2 * sstep(dur * 0.45, dur * 0.7, lt) });
    // table (drawn after Sam's chair, before Sam's hands)
    const tl = 520, tw2 = 400;
    V.line(c, [[tl + 24, 1316], [tl + 24, gy + 4]], 20, '#5a3c24'); V.line(c, [[tl + tw2 - 24, 1316], [tl + tw2 - 24, gy + 4]], 20, '#4a301c');
    fillRR(c, tl - 18, 1290, tw2 + 36, 24, 5, lg(c, 0, 1290, 0, 1314, [[0, '#C28A52'], [1, '#8a5a30']]));
    fillRR(c, tl, 1310, tw2, 12, 0, '#6e4a2a');
    fillRR(c, tl - 18, 1290, tw2 + 36, 5, 3, 'rgba(255,225,170,.55)');
    // items on the table
    fillRR(c, tl + 200, 1256, 40, 34, 5, '#cfc7b0'); fillRR(c, tl + 200, 1262, 40, 8, 2, '#B5342B');                    // tin can
    fillRR(c, tl + 270, 1262, 54, 28, 8, '#7a4a2a'); fillRR(c, tl + 278, 1266, 38, 8, 4, '#c9a050');                      // bowl w/ food
    fillRR(c, tl + 346, 1244, 36, 46, 5, 'rgba(230,230,240,.55)'); fillRR(c, tl + 352, 1272, 24, 16, 3, '#c9a050');
    V.glow(c, tl + 364, 1262, 60, '#FFD08A', 0.25);
    // water jugs along the wall ("enough for weeks")
    for (const [jx, jy, js] of [[982, 1404, 1.0], [1046, 1404, 1.0], [1010, 1344, 0.8]]) {
      fillRR(c, jx - 30 * js, jy - 96 * js, 60 * js, 96 * js, 12 * js, 'rgba(120,190,230,.78)'); fillRR(c, jx - 30 * js, jy - 50 * js, 60 * js, 50 * js, 10 * js, 'rgba(70,140,200,.55)');
      fillRR(c, jx - 12 * js, jy - 112 * js, 24 * js, 18 * js, 3, '#f2ede4'); fillRR(c, jx + 14 * js, jy - 88 * js, 8 * js, 30 * js, 4, 'rgba(255,255,255,.45)');
    }
    // Sam's backpack slumped by the chair
    fillRR(c, 338, gy - 72, 62, 72, 16, '#4A4A3A'); fillRR(c, 346, gy - 40, 46, 26, 6, '#3a3a2c'); fillRR(c, 338, gy - 72, 62, 18, 9, '#5a5a48');
    // Sam sits
    const J = V.pose('sit', lt, { item: 'mug', handX: 74, handY: -112, seed: 1 });
    const fig = { x: sx, y: gy, s: 1.0, t: lt, facing: 1, minPx: 3, J, over: { pack: null } };
    V.groundShadow(c, sx + 30, gy + 4, 110, 12, 0.35);
    V.figure(c, fig);
    // steam
    const hand = V.toWorld(fig, J.arms[0].h);
    for (let i = 0; i < 3; i++) {
      c.beginPath(); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 3.2; c.lineCap = 'round';
      for (let k = 0; k <= 16; k++) { const q = k / 16, age = (lt * 0.55 + i / 3) % 1; const px = hand[0] + 2 + (i - 1) * 9 + Math.sin(q * 5 + lt * 2 + i * 2) * 5 * q, py = hand[1] - 18 - q * 62 - age * 22; k ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.globalAlpha = 0.55; c.stroke(); c.globalAlpha = 1;
    }
    // tabletop in front of Sam's hands (hides lower forearm)
    fillRR(c, tl - 18, 1290, 30, 24, 5, '#B07A48');
    // dust motes in the light
    V.motes(c, lt, { seed: 33, n: 50, x0: 100, y0: 880, x1: 900, y1: 1700, r: 2.2, color: '#FFF1C8', a: 0.6, vx: 5, vy: -4 });
    c.restore();
    // warm grade
    c.fillStyle = 'rgba(255,170,90,.07)'; c.fillRect(0, 0, W, H);
    return { vig: 0.75 };
  };

  /* ============================== end_card ========================================== */
  SC.end_card = (c, lt, sc, gt) => {
    const u = u01(lt, sc), hor = 1330;
    c.save(); V.camera(c, u, { z0: 1.02, z1: 1.07, px: 540, py: 1200, x0: 14, x1: -14 });
    V.sky(c, { hor, mood: 'night' });
    V.stars(c, lt, { seed: 71, n: 130, y0: 0, y1: hor - 160 });
    // moon
    c.beginPath(); c.arc(840, 470, 54, 0, PI2); c.fillStyle = '#F2EBD0'; c.fill();
    c.beginPath(); c.arc(862, 458, 50, 0, PI2); c.fillStyle = '#0c1030'; c.fill();
    V.glow(c, 830, 470, 260, '#9fb0ff', 0.2);
    V.clouds(c, lt, { seed: 66, n: 6, y0: 700, y1: hor - 100, a: 0.5, speed: 3, dark: '#0a0c26', lit: '#3a3a78' });
    for (const [base, amp, col] of [[hor - 8, 40, '#0f1230'], [hor + 6, 30, '#0a0c22']]) {
      c.beginPath(); c.moveTo(-20, hor + 60);
      for (let x = -20; x <= W + 20; x += 16) c.lineTo(x, base - amp - amp * 0.7 * Math.sin(x / 240 + amp) - amp * 0.3 * Math.sin(x / 80 + 2));
      c.lineTo(W + 20, hor + 60); c.closePath(); c.fillStyle = col; c.fill();
    }
    for (let i = 0; i < 26; i++) { if (h1(i, 5) < 0.4) continue; V.pine(c, i * 44 + h1(i, 3) * 28 - 20, hor + 24, 80 + h1(i, 4) * 70, '#0c1a24', '#091219'); }
    c.fillStyle = lg(c, 0, hor, 0, H, [[0, '#0b1224'], [1, '#04050c']]); c.fillRect(-10, hor, W + 20, H);
    V.barn(c, { x: 500, gy: 1600, w: 440, wh: 252, tone: 0.76, lantern: 0.75 + 0.25 * Math.sin(lt * 2.7) * Math.sin(lt * 1.1), dx: 210, dy: -54 });
    V.grassTufts(c, -10, W + 10, 1612, 17, '#070a14', 2.0, 36);
    V.motes(c, lt, { seed: 29, n: 16, x0: 0, y0: 1150, x1: W, y1: 1650, r: 3.2, color: '#C8F080', a: 0.8, vx: 4, vy: -3 });
    c.fillStyle = 'rgba(4,5,14,.35)'; c.fillRect(-10, -10, W + 20, H + 20);
    c.restore();
    return { vig: 1.5 };
  };
})();
