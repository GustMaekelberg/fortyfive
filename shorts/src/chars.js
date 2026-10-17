/* chars.js — stick-figure characters: Sam, zombies, civilians, dog, bicycle.
   Local figure space: feet on y=0, up is -y, figure faces +x. Callers translate/scale/mirror. */
(() => {
  const V = window.V;
  const { clamp, lerp, shade, rgba, ik2, PI2 } = V;

  const D = { L1: 60, L2: 58, T: 78, neck: 8, hr: 27, A1: 46, A2: 44 };
  V.FIG = D;

  V.STYLES = {
    sam: { kind: 'sam', skin: '#F3E9DC', line: '#2B2B2B', cap: '#2F5D3A', torso: '#7A4B2A', sleeve: '#7A4B2A', pants: '#3A5A8C',
      pack: '#4A4A3A', shoe: '#26232B', lw: 14, aw: 12, tw: 32, outline: 4 },
    civ: { kind: 'sam', skin: '#F3E9DC', line: '#2B2B2B', cap: null, torso: '#8A3B3B', sleeve: '#8A3B3B', pants: '#3B3B4A',
      pack: null, shoe: '#26232B', lw: 14, aw: 12, tw: 32, outline: 4 },
    zombie: { kind: 'zombie', skin: '#8FA37A', line: '#2B2B2B', torso: '#3A3A3A', sleeve: '#3A3A3A', pants: '#4A4036', cloth2: '#5A4A3A',
      shoe: '#1d1a1a', lw: 13, aw: 11, tw: 30, outline: 4, spot: '#9B1C1C' },
  };
  V.CIV_COLORS = [['#8A3B3B', '#3B3B4A'], ['#3B5A8A', '#4A4A4A'], ['#C9B458', '#3A3A4A'], ['#DDDDDD', '#2E3A4E'], ['#6B8E5A', '#4A3A3A'], ['#B5642B', '#2E2E3A']];

  /* ---------------------------------------------------------------- skeleton */
  // spec: {legs:[{th,sh},{th,sh}] (angles from straight down, +forward), lean, headLean, arms:[{a,f},{a,f}], ...}
  function build(spec) {
    const legsA = spec.legs.map((l) => {
      const kx = D.L1 * Math.sin(l.th), ky = D.L1 * Math.cos(l.th);
      return { kx, ky, fx: kx + D.L2 * Math.sin(l.sh), fy: ky + D.L2 * Math.cos(l.sh) };
    });
    const hip = spec.hipAbs || [spec.hipX || 0, -Math.max(legsA[0].fy, legsA[1].fy) + (spec.hipLift || 0)];
    const lean = spec.lean || 0;
    const sh = [hip[0] + D.T * Math.sin(lean), hip[1] - D.T * Math.cos(lean)];
    const pivot = [hip[0] + (D.T - 7) * Math.sin(lean), hip[1] - (D.T - 7) * Math.cos(lean)];
    const hl = spec.headLean ?? lean, hs = spec.headScale || 1, hd = D.neck + D.hr * hs;
    const head = { x: sh[0] + hd * Math.sin(hl), y: sh[1] - hd * Math.cos(hl) + (spec.headDrop || 0), r: D.hr * hs, tilt: spec.headTilt ?? hl * 0.55 };
    const curve = spec.curve || 0;
    const ctrl = [(hip[0] + sh[0]) / 2 - curve * Math.cos(lean), (hip[1] + sh[1]) / 2 - curve * Math.sin(lean)];
    const legs = spec.legsAbs || legsA.map((l) => ({ k: [hip[0] + l.kx, hip[1] + l.ky], f: [hip[0] + l.fx, hip[1] + l.fy] }));
    const arms = spec.armsAbs || spec.arms.map((a) => {
      const e = [pivot[0] + D.A1 * Math.sin(a.a), pivot[1] + D.A1 * Math.cos(a.a)];
      return { e, h: [e[0] + D.A2 * Math.sin(a.f), e[1] + D.A2 * Math.cos(a.f)] };
    });
    return { hip, sh, pivot, head, lean, ctrl, legs, arms, item: spec.item || null, itemT: spec.itemT || 0, blink: !!spec.blink };
  }
  V.buildJ = build;

  function gaitSpec(t, P) {
    const w = PI2 * P.f * t + (P.phase || 0) + (P.stag ? P.stag * Math.sin(PI2 * P.f * t * 0.43 + 1.1) : 0);
    const legs = [], arms = [];
    for (let i = 0; i < 2; i++) {
      const a = w + i * Math.PI;
      const amp = P.legAmp * (i ? (P.amp2 ?? 1) : 1);
      const th = amp * Math.sin(a) + (P.legBias || 0);
      const kk = P.kneeK * (i ? (P.k2 ?? 1) : 1);
      const flex = P.kneeBase + kk * Math.pow(Math.max(0, Math.cos(a + 0.55)), 1.3);
      legs.push({ th, sh: th - flex });
      const sw = -P.armAmp * Math.sin(a) + (P.armBias || 0) + (P.armWob ? P.armWob * Math.sin(w * 0.5 + i * 2) : 0);
      arms.push({ a: sw, f: sw + P.elbow * (0.8 + 0.2 * Math.cos(a)) });
    }
    return { legs, arms, lean: P.lean + (P.leanSway || 0) * Math.sin(w), headLean: P.headLean, curve: P.curve, headDrop: P.headDrop, hipLift: P.hipLift };
  }

  const POSES = {
    walk: { f: 1.6, legAmp: 0.46, kneeK: 0.8, kneeBase: 0.07, armAmp: 0.5, elbow: 0.4, lean: 0.07, headLean: 0.05 },
    run: { f: 2.6, legAmp: 0.85, kneeK: 1.45, kneeBase: 0.2, armAmp: 1.0, elbow: 1.4, lean: 0.3, headLean: 0.18 },
    shamble: { f: 1.0, legAmp: 0.36, kneeK: 0.55, kneeBase: 0.18, armAmp: 0.1, elbow: 0.12, lean: 0.55, headLean: 1.0, headDrop: 4, curve: 16,
      armBias: 1.38, armWob: 0.14, stag: 0.55, amp2: 0.6, k2: 0.5, leanSway: 0.05, legBias: 0.04 },
  };
  V.WALK_SPEED = (s, f = 1.6, P = POSES.walk) => 4 * (D.L1 + D.L2) * Math.sin(P.legAmp) * f * s * 0.92; // px/s for no foot-skate
  V.RUN_SPEED = (s, f = 2.6, P = POSES.run) => 4 * (D.L1 + D.L2) * Math.sin(P.legAmp) * f * s * 0.82;
  V.SHAMBLE_SPEED = (s, f = 1.0, P = POSES.shamble) => 4 * (D.L1 + D.L2) * Math.sin(P.legAmp) * f * s * 0.8;

  // pose(mode, t, opts) -> joints
  V.pose = function (mode, t, o = {}) {
    if (mode === 'stand' || mode === 'light') {
      const br = Math.sin(PI2 * 0.28 * t);
      const spec = { legs: [{ th: 0.1, sh: 0.07 }, { th: -0.12, sh: -0.1 }], lean: 0.02 + 0.008 * br, headLean: 0.03,
        arms: [{ a: 0.12, f: 0.28 }, { a: -0.06, f: 0.1 }], blink: (t / 3.7 + (o.seed || 0)) % 1 < 0.035 };
      if (mode === 'light') { spec.arms[0] = { a: 1.2 + 0.03 * br, f: 1.42 }; spec.item = 'light'; spec.lean = 0.05; }
      if (o.item) spec.item = o.item;
      return build(spec);
    }
    if (mode === 'sit') return sitPose(t, o);
    const P = Object.assign({}, POSES[mode] || POSES.walk, o.P || {});
    if (o.f) P.f = o.f;
    if (o.phase) P.phase = o.phase;
    const spec = gaitSpec(t, P);
    spec.blink = false;
    if (o.item) {
      spec.item = o.item; spec.itemT = t;
      if (o.item === 'keys') spec.arms[0] = { a: 1.15 + 0.12 * Math.sin(PI2 * P.f * t * 2), f: 2.35 };
    }
    return build(spec);
  };

  function sitPose(t, o) {
    const br = Math.sin(PI2 * 0.25 * t);
    const hip = [-8, -64];
    const spec = {
      hipAbs: hip, lean: 0.03 + 0.01 * br, headLean: 0.12 + 0.01 * br, legs: [{ th: 0, sh: 0 }, { th: 0, sh: 0 }],
      legsAbs: [{ k: [hip[0] + 56, hip[1] + 4], f: [hip[0] + 62, 0] }, { k: [hip[0] + 66, hip[1] + 2], f: [hip[0] + 74, 0] }],
      arms: [], blink: (t / 3.1 + (o.seed || 0)) % 1 < 0.04, item: o.item || null, itemT: t,
    };
    const j = build(Object.assign({}, spec, { arms: [{ a: 0, f: 0 }, { a: 0, f: 0 }] }));
    const hx = o.handX ?? 92, hy = o.handY ?? -110;
    const [e0x, e0y, h0x, h0y] = ik2(j.pivot[0], j.pivot[1], hx + 2, hy + 3 * br, D.A1, D.A2, 1);
    const [e1x, e1y, h1x, h1y] = ik2(j.pivot[0], j.pivot[1], hx - 28, hy + 4, D.A1, D.A2, 1);
    spec.armsAbs = [{ e: [e0x, e0y], h: [h0x, h0y] }, { e: [e1x, e1y], h: [h1x, h1y] }];
    return build(spec);
  }

  /* ------------------------------------------------------------------ draw */
  function limb(c, pts, w, col) { V.line(c, pts, w, col); }
  function seg(c, p0, p1, a, b, w, col) {
    const f = (t) => [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
    V.line(c, [f(a), f(b)], w, col);
  }

  function drawShoe(c, S, f, k, back) {
    const ang = Math.atan2(f[0] - k[0], f[1] - k[1]);
    c.beginPath();
    c.ellipse(f[0] + 7, f[1] - 5, 14, 7.5, clamp(-ang * 0.5, -0.7, 0.7), 0, PI2);
    c.fillStyle = back ? shade(S.shoe, 0.0) : S.shoe; c.fill();
  }

  function drawHead(c, J, S) {
    const h = J.head, r = h.r, sil = S.sil;
    c.save(); c.translate(h.x, h.y); c.rotate(h.tilt);
    c.beginPath(); c.arc(0, 0, r, 0, PI2); c.fillStyle = sil || S.skin; c.fill();
    if (!sil) {
      if (S.kind === 'zombie') {
        // tufts of dead hair
        c.strokeStyle = '#3a3328'; c.lineWidth = 3; c.lineCap = 'round';
        for (const [a, l] of [[-2.2, 11], [-1.9, 9], [-2.6, 8]]) { c.beginPath(); c.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); c.lineTo(Math.cos(a - 0.12) * (r + l), Math.sin(a - 0.12) * (r + l)); c.stroke(); }
        // hollow eyes
        V.fillEll(c, r * 0.36, r * 0.02, 5.2, 6.4, '#141214');
        V.fillEll(c, r * 0.8, r * 0.02, 4.4, 5.6, '#141214');
        c.strokeStyle = '#2b2b2b'; c.lineWidth = 2.4;
        c.beginPath(); c.moveTo(r * 0.14, -r * 0.3); c.lineTo(r * 0.56, -r * 0.18); c.moveTo(r * 0.66, -r * 0.2); c.lineTo(r * 1.0, -r * 0.3); c.stroke();
        V.fillEll(c, r * 0.58, r * 0.5, 7.5, 4.8, '#1a0f10');
        c.fillStyle = '#d9d6c4'; c.fillRect(r * 0.5, r * 0.36, 3, 4); c.fillRect(r * 0.64, r * 0.36, 3, 4);
        c.beginPath(); c.arc(-r * 0.15, -r * 0.35, 3.6, 0, PI2); c.fillStyle = S.spot; c.fill();
      } else {
        // cap
        if (S.cap) {
          c.beginPath(); c.arc(0, 0, r + 1.5, Math.PI + 0.12, -0.1); c.closePath(); c.fillStyle = S.cap; c.fill();
          c.beginPath(); c.arc(0, -r - 1, 3, 0, PI2); c.fillStyle = shade(S.cap, -0.3); c.fill();
          V.line(c, [[r * 0.5, -r * 0.06], [r * 1.5, r * 0.04]], 6.4, shade(S.cap, -0.28));
        } else {
          c.beginPath(); c.arc(0, 0, r + 1.5, Math.PI + 0.3, -0.5); c.lineTo(0, -r * 0.4); c.closePath(); c.fillStyle = '#3a2c24'; c.fill();
        }
        // eyes + mouth
        if (J.blink) { c.strokeStyle = '#222'; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(r * 0.28, r * 0.16); c.lineTo(r * 0.46, r * 0.16); c.moveTo(r * 0.66, r * 0.16); c.lineTo(r * 0.84, r * 0.16); c.stroke(); }
        else { c.fillStyle = '#222'; c.beginPath(); c.arc(r * 0.36, r * 0.16, 3.4, 0, PI2); c.arc(r * 0.76, r * 0.16, 3.4, 0, PI2); c.fill(); }
        c.strokeStyle = '#4a2a2a'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.arc(r * 0.58, r * 0.4, 5, 0.15, Math.PI - 0.15); c.stroke();
      }
      c.beginPath(); c.arc(0, 0, r, 0, PI2); c.lineWidth = S.outline || 4; c.strokeStyle = S.line; c.stroke();
    }
    c.restore();
  }

  function drawItem(c, J, S, hand, elbow) {
    if (!J.item) return;
    const dx = hand[0] - elbow[0], dy = hand[1] - elbow[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    if (J.item === 'light') {
      const bx = hand[0] - ux * 6, by = hand[1] - uy * 6;
      V.line(c, [[bx, by], [bx + ux * 26, by + uy * 26]], 11, '#3b3b48');
      V.line(c, [[bx + ux * 22, by + uy * 22], [bx + ux * 30, by + uy * 30]], 14, '#9a9aa6');
      V.line(c, [[bx + ux * 31, by + uy * 31], [bx + ux * 32, by + uy * 32]], 11, '#FFF3C0');
    } else if (J.item === 'keys') {
      const sw = Math.sin(PI2 * 2.2 * J.itemT) * 0.5;
      c.save(); c.translate(hand[0], hand[1] + 2); c.rotate(sw);
      c.strokeStyle = '#E8C547'; c.lineWidth = 3; c.beginPath(); c.arc(0, 8, 5, 0, PI2); c.stroke();
      V.line(c, [[0, 12], [-4, 24]], 3, '#C9B458'); V.line(c, [[0, 12], [5, 22]], 3, '#C9B458');
      c.restore();
    } else if (J.item === 'mug') {
      V.fillRR(c, hand[0] - 9, hand[1] - 12, 20, 24, 4, '#E8E2D0');
      c.beginPath(); c.arc(hand[0] + 11, hand[1], 7, -1.2, 1.2); c.strokeStyle = '#E8E2D0'; c.lineWidth = 3.5; c.stroke();
      V.fillRR(c, hand[0] - 7, hand[1] - 10, 16, 4, 2, '#5a3a22');
    }
  }

  // drawFigure(c, J, S): S = style (+ optional sil colour for flat silhouette, s for min pixel widths)
  V.drawFigure = function (c, J, S) {
    const sil = S.sil || null;
    const mp = S.minPx ? S.minPx / (S.s || 1) : 0;
    const lw = Math.max(S.lw, mp), aw = Math.max(S.aw, mp), tw = Math.max(S.tw, mp * 1.4);
    const col = (x, back) => (sil ? sil : back ? shade(x, -0.2) : x);
    const arm = (A, back) => {
      const upper = col(S.sleeve, back);
      V.line(c, [J.pivot, A.e], aw, upper);
      const lower = S.kind === 'zombie' && !sil ? S.skin : S.sleeve;
      V.line(c, [A.e, A.h], aw, col(lower, back));
      c.beginPath(); c.arc(A.h[0], A.h[1], aw * 0.52, 0, PI2); c.fillStyle = col(S.kind === 'zombie' ? S.skin : S.skin, back); c.fill();
    };
    const leg = (L, back, torn) => {
      V.line(c, [J.hip, L.k, L.f], lw, col(S.pants, back));
      if (torn && !sil) seg(c, L.k, L.f, 0.55, 1, lw * 0.86, S.skin);
      if (!sil) drawShoe(c, S, L.f, L.k, back); else { c.beginPath(); c.ellipse(L.f[0] + 7, L.f[1] - 5, 14, 7.5, 0, 0, PI2); c.fillStyle = sil; c.fill(); }
    };
    arm(J.arms[1], true);
    leg(J.legs[1], true, false);
    if (S.pack && !sil) {
      const cx = J.hip[0] + (D.T * 0.58) * Math.sin(J.lean) - (tw / 2 + 9) * Math.cos(J.lean);
      const cy = J.hip[1] - (D.T * 0.58) * Math.cos(J.lean) - (tw / 2 + 9) * Math.sin(J.lean);
      c.save(); c.translate(cx, cy); c.rotate(J.lean);
      V.fillRR(c, -14, -28, 28, 52, 9, S.pack); V.fillRR(c, -14, -28, 28, 14, 7, shade(S.pack, 0.12));
      V.fillRR(c, -10, 0, 20, 14, 4, shade(S.pack, -0.18));
      c.restore();
    }
    // torso
    c.beginPath(); c.moveTo(J.hip[0], J.hip[1]); c.quadraticCurveTo(J.ctrl[0], J.ctrl[1], J.sh[0], J.sh[1]);
    c.strokeStyle = col(S.torso); c.lineWidth = tw; c.lineCap = 'round'; c.stroke();
    if (!sil) {
      c.beginPath(); c.moveTo(J.hip[0], J.hip[1]); c.quadraticCurveTo(J.ctrl[0], J.ctrl[1], J.sh[0], J.sh[1]);
      c.strokeStyle = rgba('#ffffff', 0.07); c.lineWidth = tw * 0.4; c.stroke();
      if (S.kind === 'zombie') {
        // torn hem + blood spots
        c.fillStyle = S.torso;
        for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(J.hip[0] + i * 9 - 4, J.hip[1] + 4); c.lineTo(J.hip[0] + i * 9 + 4, J.hip[1] + 4); c.lineTo(J.hip[0] + i * 9, J.hip[1] + 15 + (i & 1) * 4); c.closePath(); c.fill(); }
        c.beginPath(); c.arc(lerp(J.hip[0], J.sh[0], 0.55) + 4, lerp(J.hip[1], J.sh[1], 0.55), 5, 0, PI2); c.fillStyle = S.spot; c.fill();
        c.beginPath(); c.arc(lerp(J.hip[0], J.sh[0], 0.3) - 2, lerp(J.hip[1], J.sh[1], 0.3) + 3, 3.2, 0, PI2); c.fill();
      } else {
        // belt
        const b = [lerp(J.hip[0], J.sh[0], 0.1), lerp(J.hip[1], J.sh[1], 0.1)];
        V.line(c, [[b[0] - tw * 0.4 * Math.cos(J.lean), b[1] - tw * 0.4 * Math.sin(J.lean)], [b[0] + tw * 0.4 * Math.cos(J.lean), b[1] + tw * 0.4 * Math.sin(J.lean)]], 5, shade(S.torso, -0.35), 'butt');
      }
    }
    // neck
    V.line(c, [J.sh, [J.head.x, J.head.y]], 9, sil || S.skin);
    leg(J.legs[0], false, S.kind === 'zombie');
    drawHead(c, J, S);
    arm(J.arms[0], false);
    drawItem(c, J, S, J.arms[0].h, J.arms[0].e);
  };

  // convenience: figure at (x, y=feet) with scale s, facing +-1
  V.figure = function (c, o) {
    const style = Object.assign({}, V.STYLES[o.style || 'sam'], o.over || {});
    if (o.sil) style.sil = o.sil;
    style.s = o.s; style.minPx = o.minPx ?? 3.2;
    const J = o.J || V.pose(o.mode || 'walk', o.t || 0, o);
    c.save(); c.translate(o.x, o.y); c.scale(o.s * (o.facing || 1), o.s);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    V.drawFigure(c, J, style);
    c.restore();
    return J;
  };
  // local joint -> world coordinates for a figure placed with figure()
  V.toWorld = (o, p) => [o.x + (o.facing || 1) * o.s * p[0], o.y + o.s * p[1]];

  // zombie colours blended toward a fog colour (depth cue)
  V.zombieTint = (fog, amt) => {
    const b = V.STYLES.zombie, o = {};
    for (const k of ['skin', 'torso', 'sleeve', 'pants', 'shoe', 'spot', 'line', 'cloth2']) o[k] = V.mix(b[k], fog, amt);
    return o;
  };
  // a row of side-view zombies shambling through a scrolling world.
  // o:{camX,par,gy,s,seed,spacing,prob,dir(-1 walks left),fog,fogAmt,alpha,jy,speedMul}
  V.zombieRow = (c, t, o) => {
    const sp = o.spacing, vz = V.SHAMBLE_SPEED(o.s) * (o.speedMul ?? 1), base = o.camX * o.par - o.dir * vz * t;
    const tint = V.zombieTint(o.fog || '#3a2236', o.fogAmt ?? 0.2);
    for (let i = Math.floor((base - 260) / sp); i <= Math.ceil((base + V.W + 260) / sp); i++) {
      if (V.h1(i, o.seed) > o.prob) continue;
      const xw = i * sp + V.h1(i, o.seed + 1) * sp * 0.5 + o.dir * vz * t, x = xw - o.camX * o.par;
      const sc = o.s * (0.88 + 0.28 * V.h1(i, o.seed + 2)), y = o.gy + (V.h1(i, o.seed + 3) - 0.5) * (o.jy || 0);
      const a = o.alpha ?? 1; if (a <= 0.01) continue;
      c.save(); c.globalAlpha *= a; V.groundShadow(c, x, y + 2, 38 * sc, 6 * sc, 0.4); c.restore();
      V.figure(c, { style: 'zombie', mode: 'shamble', x, y, s: sc, facing: o.dir < 0 ? -1 : 1, t: t + V.h1(i, o.seed + 4) * 7, over: tint, alpha: a, minPx: 3 });
    }
  };

  V.groundShadow = (c, x, y, rx, ry, a = 0.35, color = '#0a0612') => {
    c.save(); c.translate(x, y); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, V.rgba(color, a)); g.addColorStop(0.6, V.rgba(color, a * 0.7)); g.addColorStop(1, V.rgba(color, 0));
    c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore();
  };
  // long cast shadow (flat, skewed copy of a silhouette) — dir: +1 shadow to the right
  V.castShadow = function (c, o, alpha = 0.32, len = 2.2, flat = 0.22) {
    c.save();
    c.translate(o.x, o.y);
    c.transform(1, 0, (o.dir || 1) * len, flat, 0, 0);
    c.scale(o.s * (o.facing || 1), o.s);
    const style = Object.assign({}, V.STYLES[o.style || 'sam']); style.sil = 'rgba(8,4,16,1)'; style.s = o.s; style.minPx = 2;
    c.globalAlpha = alpha;
    V.drawFigure(c, o.J || V.pose(o.mode || 'walk', o.t || 0, o), style);
    c.restore();
  };

  /* ---------------------------------------------- front / back view figures */
  // o: {x,y,s,t,kind:'zombie'|'civ', back:bool, run:bool, seed, sil, alpha}
  V.drawFigureFront = function (c, o) {
    const s = o.s, t = o.t || 0, z = o.kind === 'zombie';
    const f = o.f ?? (z ? 0.9 : o.run ? 2.4 : 1.6);
    const ph = (o.seed || 0) * 6.28;
    const w = PI2 * f * t + ph;
    const sil = o.sil || null;
    const st = V.STYLES[z ? 'zombie' : 'civ'];
    const pants = sil || (o.pants || st.pants), shirt = sil || (o.shirt || st.torso), skin = sil || st.skin;
    const mp = 3.2 / s;
    const lw = Math.max(13, mp), aw = Math.max(11, mp);
    const sway = z ? Math.sin(w * 0.5) * 5 : 0;
    const lift = (i) => Math.max(0, Math.sin(w + i * Math.PI)) * (z ? 9 : o.run ? 22 : 12);
    const bob = Math.abs(Math.sin(w)) * (z ? 2 : o.run ? 6 : 3);
    c.save(); c.translate(o.x, o.y); c.scale(s, s);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    const hipY = -116 - bob + (z ? 6 : 0);
    const lean = z ? 10 : 0;
    // legs
    for (const i of [1, 0]) {
      const hx = (i ? 8 : -8) + sway * 0.4, fx = (i ? 14 : -14) + sway * 0.5, fy = -lift(i);
      V.line(c, [[hx, hipY], [fx * 0.9 + (z ? 0 : 0), fy - 54 + (fy ? -lift(i) * 0.3 : 0) * 0], [fx, fy]], lw, i ? V.shade(pants, sil ? 0 : -0.15) : pants);
      V.fillEll(c, fx, fy - 5, 14, 8, sil || '#1f1b22');
    }
    // arms (behind torso)
    const shY = hipY - 72, shX = sway + lean * 0.4;
    const armPose = (i) => {
      const side = i ? 1 : -1;
      if (z) return [[shX + side * 17, shY + 6], [shX + side * 42, shY + 2 - Math.sin(w + i) * 3], [shX + side * 64, shY - 20 - Math.sin(w + i * 2) * 5]]; // arms thrown out toward us
      const sw = Math.sin(w + i * Math.PI) * (o.run ? 26 : 12);
      return [[shX + side * 17, shY + 6], [shX + side * 25, shY + 34 + (o.run ? -10 : 0)], [shX + side * 22, shY + 62 - sw * 0.9 + (o.run ? -26 : 0)]];
    };
    if (!o.back || true) { for (const i of [0, 1]) V.line(c, armPose(i), aw, i ? V.shade(sil || st.sleeve, sil ? 0 : -0.15) : (sil || o.sleeve || st.sleeve)); }
    // torso
    V.line(c, [[sway * 0.6, hipY], [shX, shY + 4]], 34, shirt);
    if (!sil) { V.line(c, [[sway * 0.6, hipY], [shX, shY + 4]], 12, rgba('#fff', 0.06)); if (z) { c.beginPath(); c.arc(shX + 5, shY + 36, 5, 0, PI2); c.fillStyle = st.spot; c.fill(); } }
    // hands
    if (!sil) for (const i of [0, 1]) { const p = armPose(i)[2]; c.beginPath(); c.arc(p[0], p[1], 6, 0, PI2); c.fillStyle = skin; c.fill(); }
    // head
    const hx = shX + lean * 0.3 + (z ? Math.sin(w * 0.5 + 1) * 3 : 0), hy = shY - 38 + (z ? 8 : 0);
    c.beginPath(); c.arc(hx, hy, 27, 0, PI2); c.fillStyle = skin; c.fill();
    if (!sil) {
      if (o.back) { c.beginPath(); c.arc(hx, hy, 28, Math.PI + 0.15, -0.15); c.closePath(); c.fillStyle = z ? '#3a3328' : (o.hair || '#3a2c24'); c.fill(); c.beginPath(); c.arc(hx, hy - 3, 27, 0.3, Math.PI - 0.3); c.fillStyle = z ? '#3a3328' : (o.hair || '#3a2c24'); c.fill(); }
      else if (s < 0.2) { /* too small for faces */ }
      else if (z) { V.fillEll(c, hx - 9, hy - 1, 5, 6.5, '#141214'); V.fillEll(c, hx + 9, hy - 1, 5, 6.5, '#141214'); V.fillEll(c, hx, hy + 14, 6.5, 4.5, '#1a0f10'); }
      else { c.fillStyle = '#222'; c.beginPath(); c.arc(hx - 9, hy + 1, 3.2, 0, PI2); c.arc(hx + 9, hy + 1, 3.2, 0, PI2); c.fill(); c.strokeStyle = '#4a2a2a'; c.lineWidth = 2.4; c.beginPath(); c.arc(hx, hy + 11, 5, 0.2, Math.PI - 0.2); c.stroke(); }
      c.beginPath(); c.arc(hx, hy, 27, 0, PI2); c.lineWidth = 4; c.strokeStyle = '#2B2B2B'; c.stroke();
    }
    c.restore();
  };

  /* ------------------------------------------------------------------ bike */
  // Bike + rider (side view, facing +x). o: {x,y,s,facing,t,dist,cadence}
  V.drawBike = function (c, o) {
    const s = o.s, t = o.t || 0, R = 46;
    const crank = PI2 * (o.cadence ?? 1.15) * t;
    const wheelA = (o.dist || 0) / R;
    const P = { R: [-64, -R], F: [64, -R], BB: [-4, -30], S: [-22, -100], H: [44, -98], H2: [52, -82] };
    c.save(); c.translate(o.x, o.y); c.scale(s * (o.facing || 1), s);
    const frameCol = o.frame || '#B5342B';
    const wheel = (p) => {
      c.beginPath(); c.arc(p[0], p[1], R, 0, PI2); c.strokeStyle = '#17141d'; c.lineWidth = 6; c.stroke();
      c.beginPath(); c.arc(p[0], p[1], R - 5, 0, PI2); c.strokeStyle = '#8c8c98'; c.lineWidth = 1.6; c.stroke();
      c.strokeStyle = 'rgba(200,200,215,.55)'; c.lineWidth = 1.4;
      c.beginPath(); for (let i = 0; i < 8; i++) { const a = wheelA + i * Math.PI / 4; c.moveTo(p[0], p[1]); c.lineTo(p[0] + Math.cos(a) * (R - 6), p[1] + Math.sin(a) * (R - 6)); } c.stroke();
      c.beginPath(); c.arc(p[0], p[1], 4, 0, PI2); c.fillStyle = '#555'; c.fill();
    };
    wheel(P.R); wheel(P.F);
    // frame
    const fw = 6;
    V.line(c, [P.R, P.BB, P.S, P.R], fw, frameCol);
    V.line(c, [P.S, P.H, P.H2, P.BB], fw, frameCol);
    V.line(c, [P.H2, P.F], 5, '#2a2a33');
    V.line(c, [P.H, [40, -112], [54, -116]], 5, '#2a2a33'); // stem + bars
    V.line(c, [P.S, [-24, -112]], 5, '#2a2a33');
    V.line(c, [[-38, -114], [-10, -114]], 8, '#17141d'); // saddle
    // chainring
    c.beginPath(); c.arc(P.BB[0], P.BB[1], 11, 0, PI2); c.strokeStyle = '#6d6d78'; c.lineWidth = 3; c.stroke();
    const ped = (a) => [P.BB[0] + Math.cos(a) * 24, P.BB[1] + Math.sin(a) * 24];
    const pn = ped(crank), pf = ped(crank + Math.PI);
    V.line(c, [P.BB, pf], 5, '#444450'); V.line(c, [[pf[0] - 8, pf[1]], [pf[0] + 8, pf[1]]], 5, '#222');
    // rider
    const hip = [-24, -118], lean = 0.8;
    const sh = [hip[0] + D.T * Math.sin(lean), hip[1] - D.T * Math.cos(lean)];
    const pivot = [hip[0] + (D.T - 7) * Math.sin(lean), hip[1] - (D.T - 7) * Math.cos(lean)];
    const grip = [54, -118];
    const knee0 = ik2(hip[0], hip[1], pn[0] - 3, pn[1] - 6, D.L1, D.L2, -1), knee1 = ik2(hip[0], hip[1], pf[0] - 3, pf[1] - 6, D.L1, D.L2, -1);
    const el0 = ik2(pivot[0], pivot[1], grip[0], grip[1], D.A1, D.A2, 1), el1 = ik2(pivot[0], pivot[1], grip[0] - 4, grip[1] + 2, D.A1, D.A2, 1);
    const J = V.buildJ({
      hipAbs: hip, lean, headLean: 0.55, legs: [{ th: 0, sh: 0 }, { th: 0, sh: 0 }], arms: [],
      legsAbs: [{ k: [knee0[0], knee0[1]], f: [knee0[2] - 0, knee0[3] + 5] }, { k: [knee1[0], knee1[1]], f: [knee1[2], knee1[3] + 5] }],
      armsAbs: [{ e: [el0[0], el0[1]], h: [el0[2], el0[3]] }, { e: [el1[0], el1[1]], h: [el1[2], el1[3]] }],
      blink: false,
    });
    const style = Object.assign({}, V.STYLES[o.style || 'sam']); style.s = s; style.minPx = 3;
    if (o.sil) style.sil = o.sil;
    V.drawFigure(c, J, style);
    V.line(c, [pn, [pn[0] + 0, pn[1]]], 1, 'rgba(0,0,0,0)');
    V.line(c, [P.BB, pn], 5, '#555560'); V.line(c, [[pn[0] - 8, pn[1]], [pn[0] + 8, pn[1]]], 5, '#222');
    c.restore();
    return J;
  };

  /* ------------------------------------------------------------------- dog */
  const DOGB = '#1E1E1E', DOGW = '#F2EDE4';
  // pose: 'curl' | 'sit' | 'trot' | 'stand'
  V.drawDog = function (c, o) {
    const t = o.t || 0, pose = o.pose || 'stand';
    c.save(); c.translate(o.x, o.y); c.scale(o.s * (o.facing || 1), o.s);
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    const wag = Math.sin(PI2 * (o.wagF ?? 2.6) * t) * (o.wagAmp ?? 0.5);
    const ear = (x, y, flip) => { V.fillPoly(c, [[x - 9, y], [x + (flip ? -2 : 2), y - 27], [x + 11, y + 1]], DOGB); };
    const headAt = (hx, hy, tilt, tongue) => {
      c.save(); c.translate(hx, hy); c.rotate(tilt);
      ear(-6, -12, false); ear(6, -13, true);
      c.beginPath(); c.ellipse(0, 0, 19, 17, 0, 0, PI2); c.fillStyle = DOGB; c.fill();
      V.line(c, [[10, 4], [32, 10]], 17, DOGB);
      V.line(c, [[3, -14], [8, -4], [30, 4]], 4.5, DOGW);
      c.beginPath(); c.ellipse(33, 9, 4.8, 4, 0, 0, PI2); c.fillStyle = '#26262e'; c.fill();
      V.fillEll(c, 6, -3, 3.3, 3.3, '#C48A2A'); V.fillEll(c, 6.4, -3.2, 1.6, 1.6, '#0b0b0b');
      if (tongue) V.fillEll(c, 26, 19, 3.6, 6, '#E0707A', 0.2);
      c.restore();
    };
    if (pose === 'curl') {
      const br = Math.sin(PI2 * 0.33 * t) * 0.025;
      c.save(); c.scale(1, 1 + br);
      V.groundShadow(c, 0, 0, 96, 14, 0.4);
      // body mound
      c.beginPath(); c.ellipse(0, -30, 72, 34, 0, 0, PI2); c.fillStyle = DOGB; c.fill();
      V.fillEll(c, -18, -44, 44, 16, '#2c2c34');
      c.beginPath(); c.ellipse(36, -22, 26, 16, 0.2, Math.PI * 0.9, Math.PI * 1.9); c.fillStyle = DOGW; c.fill(); // chest/paws patch
      // head resting on paws at the front
      c.save(); c.translate(52, -22); c.rotate(-0.04);
      V.fillEll(c, 28, 3, 16, 9, DOGB, 0.1); // forearm under chin
      V.fillEll(c, 40, 6, 7, 5, DOGW);
      c.beginPath(); c.ellipse(0, -6, 19, 17, 0.1, 0, PI2); c.fillStyle = DOGB; c.fill();
      V.line(c, [[10, -2], [30, 4]], 16, DOGB);
      V.line(c, [[2, -20], [8, -10], [26, 0]], 4, DOGW);
      c.beginPath(); c.ellipse(31, 5, 4.4, 3.6, 0, 0, PI2); c.fillStyle = '#26262e'; c.fill();
      c.strokeStyle = '#f2ede4'; c.lineWidth = 2.4; c.lineCap = 'round'; c.beginPath(); c.arc(7, -6, 4, 0.2, Math.PI - 0.2); c.stroke(); // closed eye
      ear(-10, -18, false); ear(2, -21, true);
      c.restore();
      // tail wrapping along the back
      c.beginPath(); c.moveTo(-62, -22); c.quadraticCurveTo(-70, 2, -30, 2 + wag * 3); c.strokeStyle = DOGB; c.lineWidth = 15; c.lineCap = 'round'; c.stroke();
      c.beginPath(); c.arc(-30, 2 + wag * 3, 7.5, 0, PI2); c.fillStyle = DOGW; c.fill();
      c.restore();
    } else if (pose === 'sit') {
      V.groundShadow(c, 0, 0, 60, 9, 0.4);
      // haunch + body
      c.beginPath(); c.ellipse(-22, -32, 30, 30, 0, 0, PI2); c.fillStyle = DOGB; c.fill();
      c.save(); c.translate(14, -62); c.rotate(-0.55); c.beginPath(); c.ellipse(0, 0, 26, 40, 0, 0, PI2); c.fillStyle = DOGB; c.fill(); c.restore();
      V.fillEll(c, 26, -62, 11, 24, DOGW, -0.15);
      V.fillEll(c, -4, -9, 18, 8, DOGB); V.fillEll(c, 10, -4, 9, 5, DOGW); // hind paw
      V.line(c, [[28, -52], [32, -6]], 12, DOGB); V.fillEll(c, 36, -4, 9, 6, DOGW);
      V.line(c, [[-52, -10], [-80 + wag * 10, -8 - wag * 4]], 12, DOGB); V.fillEll(c, -80 + wag * 10, -8 - wag * 4, 6, 6, DOGW);
      headAt(36, -112, -0.1, o.tongue);
    } else {
      // stand / trot
      const f = o.f ?? 2.0, ph = PI2 * f * t, moving = pose === 'trot';
      V.groundShadow(c, 0, 0, 78, 10, 0.4);
      const A = moving ? 22 : 0, B = moving ? 14 : 0;
      const foot = (hx, k) => { const a = ph + k * Math.PI; const sw = Math.sin(a); return [hx + A * Math.cos(a), sw < 0 ? sw * B : 0]; };
      const legF = (hx, hy, k, dir) => {
        const ft = foot(hx, k), kn = ik2(hx, hy, ft[0], ft[1] - 4, 27, 29, dir);
        V.line(c, [[hx, hy], [kn[0], kn[1]], [kn[2], kn[3]]], 11, DOGB); V.fillEll(c, kn[2] + 3, kn[3] - 1, 8, 5.5, DOGW);
      };
      legF(-40, -50, 1, -1); legF(36, -48, 0, 1);
      c.beginPath(); c.ellipse(-6, -64 + (moving ? Math.sin(ph * 2) * 1.5 : 0), 56, 26, 0, 0, PI2); c.fillStyle = DOGB; c.fill();
      c.beginPath(); c.ellipse(34, -60, 24, 28, 0, 0, PI2); c.fillStyle = DOGB; c.fill();
      V.fillEll(c, 44, -50, 11, 20, DOGW);
      V.line(c, [[38, -76], [62, -100]], 22, DOGB);
      V.line(c, [[52, -90], [64, -84]], 6, DOGW);
      legF(-30, -50, 0, -1); legF(30, -48, 1, 1);
      V.line(c, [[-56, -72], [-76 + wag * 8, -50], [-84 + wag * 22, -36 - wag * 6]], 12, DOGB); V.fillEll(c, -84 + wag * 22, -36 - wag * 6, 6.5, 6.5, DOGW);
      headAt(72, -102, -0.12, moving || o.tongue);
    }
    c.restore();
  };
})();
