/* Shared helpers for HyperFrames shorts. Deterministic: no Math.random, no Date. */
(function () {
  const K = {};
  // Seeded PRNG (mulberry32) for deterministic "random" layouts.
  K.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  K.money = (v) => "$" + Math.round(v).toLocaleString("en-US");
  // Animated number: tl position t, duration d. fmt(value) -> string.
  K.count = function (tl, el, from, to, t, d, fmt, ease) {
    const node = typeof el === "string" ? document.querySelector(el) : el;
    const o = { v: from };
    const f = fmt || K.money;
    node.textContent = f(from);
    tl.to(o, { v: to, duration: d, ease: ease || "power2.out", onUpdate: () => { node.textContent = f(o.v); } }, t);
  };
  // Pop-in (scale from 0 with overshoot).
  K.pop = function (tl, sel, t, d, extra) {
    tl.fromTo(sel, Object.assign({ scale: 0, opacity: 0 }, (extra && extra.from) || {}),
      Object.assign({ scale: 1, opacity: 1, duration: d || 0.45, ease: "back.out(1.9)" }, (extra && extra.to) || {}), t);
  };
  // Slide-in from an offset.
  K.rise = function (tl, sel, t, d, dy, stagger) {
    tl.fromTo(sel, { y: dy == null ? 70 : dy, opacity: 0 }, { y: 0, opacity: 1, duration: d || 0.45, ease: "power3.out", stagger: stagger || 0 }, t);
  };
  // Full-screen wipe between scenes: covers at t (0.28s), uncovers after hold.
  K.wipe = function (tl, sel, t, color) {
    // NOTE: never give the wipe element a CSS transform; GSAP owns it (CSS translate + yPercent would add up).
    gsap.set(sel, { yPercent: 100 });
    if (color) tl.set(sel, { backgroundColor: color }, t - 0.01);
    tl.fromTo(sel, { yPercent: 100 }, { yPercent: 0, duration: 0.28, ease: "power3.in" }, t);
    tl.to(sel, { yPercent: -100, duration: 0.3, ease: "power3.out" }, t + 0.3);
  };
  // Deterministic confetti burst from (cx, cy) inside container.
  K.confetti = function (tl, container, cx, cy, t, opts) {
    const o = Object.assign({ n: 28, seed: 7, colors: ["#ff5a4f", "#19b36b", "#ffc93c", "#4d7cfe", "#8b5cf6"], spread: 520, d: 1.1 }, opts || {});
    const host = typeof container === "string" ? document.querySelector(container) : container;
    const r = K.rng(o.seed);
    for (let i = 0; i < o.n; i++) {
      const el = document.createElement("div");
      el.className = "confetti";
      el.style.left = cx + "px"; el.style.top = cy + "px";
      el.style.background = o.colors[i % o.colors.length];
      host.appendChild(el);
      const ang = r() * Math.PI * 2, dist = o.spread * (0.45 + r() * 0.55);
      tl.fromTo(el, { x: 0, y: 0, scale: 0, rotation: 0, opacity: 1 },
        { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist - 120, scale: 0.7 + r() * 0.8, rotation: (r() - 0.5) * 720, duration: o.d, ease: "power3.out" }, t);
      tl.to(el, { y: "+=220", opacity: 0, duration: 0.6, ease: "power2.in" }, t + o.d - 0.15);
    }
  };
  // Gentle idle wobble so nothing is ever completely still.
  K.wobble = function (tl, sel, t, total, deg, period) {
    const p = period || 1.2, n = Math.max(1, Math.round(total / p));
    tl.fromTo(sel, { rotation: -(deg || 2) }, { rotation: deg || 2, duration: p / 2, ease: "sine.inOut", yoyo: true, repeat: n * 2 - 1 }, t);
  };
  window.K = K;
})();
