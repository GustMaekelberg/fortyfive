/* scene.js — entry point. Builds the timeline from window.STORY and exposes window.renderFrame(t).
   renderFrame is a pure function of t: no timers, no Math.random, no hidden state (caches only memoise pure results).
   Art lives in src/*.js (util, chars, draw, overlay, scenes_a, scenes_b) and registers into window.V.
   Themes: story.theme picks V.THEMES[name] (src/explainer/theme.js). No theme -> the original stickocalypse pipeline below, untouched.
   A theme supplies init(story, TL), background(g,t,env), scene(type)->fn|null, fallbackType, overlay(g,env), finish(g,env), grain(g,env,userAmount),
   optionally mix(k)->[prevAlpha,newAlpha], and the numbers xfade/fadeIn/fadeOut. env = {TL,i,sc,prev,lt,t,frame,k,total}. */
(() => {
  const V = window.V;
  const { W, H, clamp, lerp, sstep } = V;
  const XF = 0.35;                                  // crossfade length (s)
  const DIP_INTO = new Set(['basement_heater', 'dog_morning', 'end_card']);   // these are entered via dip-to-black
  const OPTS = Object.assign({ grain: 0.08, fadeIn: 0.7, fadeOut: 0.45 }, window.RENDER_OPTS || {});
  OPTS.__userGrain = !!(window.RENDER_OPTS && isFinite(window.RENDER_OPTS.grain));   // --grain given on the command line overrides a theme's own grain

  let TL = null, storyRef = null, main = null, bufA = null, bufB = null, TH = null;

  function normalize(story) {
    let cursor = 0, factIndex = 0;
    const scenes = (story.scenes || []).map((s0, idx) => {
      const s = Object.assign({}, s0);
      const nWords = String(s.narration || '').split(/\s+/).filter(Boolean).length;
      const est = isFinite(s.est_seconds) ? +s.est_seconds : Math.max(2.2, nWords / 2.6 + 0.7);
      s.start = isFinite(s.start) ? +s.start : cursor;
      s.end = isFinite(s.end) && s.end > s.start + 0.2 ? +s.end : s.start + est;
      cursor = s.end;
      s.dur = s.end - s.start; s.idx = idx;
      const known = (TH && TH.scene && TH.scene(s.type)) || V.SCENES[s.type] || s.type === 'title' || s.type === 'end_card';
      s.type = known ? s.type : (TH && TH.fallbackType) || 'highway_jam';
      if (s.type === 'fact_card') s.factIndex = factIndex++;
      s.words = V.ensureWords(s);
      s.titleText = story.title; s.subtitleText = story.subtitle;
      return s;
    });
    const lastWord = scenes.length ? Math.max(...scenes.map((s) => (s.words.length ? s.words[s.words.length - 1].t : 0))) : 0;
    return { scenes, total: scenes.length ? Math.max(scenes[scenes.length - 1].end, lastWord) : 0, fps: story.fps || 30 };
  }

  function init() {
    if (TL && storyRef === window.STORY) return;
    storyRef = window.STORY;
    TH = (V.THEMES && V.THEMES[storyRef.theme]) || null;
    TL = normalize(storyRef);
    const cv = document.getElementById('c');
    main = cv.getContext('2d', { alpha: false });
    // themed scenes are drawn on transparent layers (the theme owns the background), legacy scenes on opaque ones
    bufA = V.mk(W, H).getContext('2d', { alpha: !!TH }); bufB = V.mk(W, H).getContext('2d', { alpha: !!TH });
    if (TH) TH.init(storyRef, TL);
    window.TIMELINE = { total: TL.total, fps: TL.fps, scenes: TL.scenes.map((s) => ({ id: s.id, type: s.type, start: s.start, end: s.end })) };
  }

  function sceneAt(t) {
    let i = 0;
    for (let k = 0; k < TL.scenes.length; k++) if (TL.scenes[k].start <= t + 1e-6) i = k;
    return i;
  }

  function drawWorld(g, sc, lt, gt) {
    g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.beginPath(); g.rect(0, 0, W, H); g.clip();
    const fn = V.SCENES[sc.type] || V.SCENES.highway_jam;
    const meta = fn(g, lt, sc, gt) || {};
    g.restore();
    return meta;
  }

  function overlays(g, sc, lt, gt, meta) {
    if (sc.type === 'title') { V.drawTitleCard(g, sc, lt); return; }
    if (sc.type === 'end_card') { V.drawEndCard(g, sc, lt); return; }
    if (sc.type === 'fact_card') { V.drawFactFrame(g, sc, lt); V.drawCaption(g, sc, lt, { y: 880, start: 0.3 }); }
    else V.drawCaption(g, sc, lt, { y: 760 });
    V.drawSubtitles(g, sc, gt);
  }

  // ---- themed path: background -> crossfaded scene layers -> theme overlay (chrome, captions, subtitles) -> finish (vignette, grain)
  function drawLayer(g, sc, lt, gt) {
    g.clearRect(0, 0, W, H);
    const fn = (TH.scene && TH.scene(sc.type)) || V.SCENES[sc.type] || V.SCENES.highway_jam;
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    fn(g, lt, sc, gt);
    g.restore();
  }
  function renderThemed(t) {
    const g = main, fps = TL.fps, frame = Math.round(t * fps), xf = TH.xfade ?? XF;
    const i = sceneAt(t), sc = TL.scenes[i], lt = t - sc.start, prev = i > 0 ? TL.scenes[i - 1] : null;
    const k = prev && lt < xf && lt >= 0 ? sstep(0, xf, lt) : 1;     // 0..1 progress of the crossfade (1 = no transition)
    const env = { TL, i, sc, prev, lt, t, frame, k, total: TL.total };
    TH.background(g, t, env);
    if (k < 1) {
      const [ap, an] = TH.mix ? TH.mix(k) : [1 - k, k];            // layer opacities during the crossfade
      drawLayer(bufA, prev, t - prev.start, t); g.globalAlpha = ap; g.drawImage(bufA.canvas, 0, 0);
      drawLayer(bufB, sc, lt, t); g.globalAlpha = an; g.drawImage(bufB.canvas, 0, 0); g.globalAlpha = 1;
    } else {
      drawLayer(bufB, sc, lt, t); g.drawImage(bufB.canvas, 0, 0);
    }
    TH.finish(g, env);                                          // vignette + transition flash
    TH.overlay(g, env);
    TH.grain(g, env, OPTS.__userGrain ? OPTS.grain : null);
    const fi = 1 - sstep(0, TH.fadeIn ?? OPTS.fadeIn, t), fo = sstep(TL.total - (TH.fadeOut ?? OPTS.fadeOut), TL.total, t);
    const f = Math.max(fi, fo);
    if (f > 0.001) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
  }

  window.renderFrame = function (t) {
    init();
    if (TH && TL.scenes.length) { renderThemed(t); return; }
    const g = main, fps = TL.fps, frame = Math.round(t * fps);
    if (!TL.scenes.length) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
    const i = sceneAt(t), sc = TL.scenes[i], lt = t - sc.start;
    let vig = 1;
    const prev = i > 0 ? TL.scenes[i - 1] : null;
    if (prev && lt < XF && lt >= 0) {
      const k = sstep(0, XF, lt);
      if (DIP_INTO.has(sc.type)) {
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        if (k < 0.5) { const m = drawWorld(bufA, prev, t - prev.start, t); g.globalAlpha = 1 - k * 2; g.drawImage(bufA.canvas, 0, 0); vig = m.vig || 1; }
        else { const m = drawWorld(bufB, sc, lt, t); g.globalAlpha = k * 2 - 1; g.drawImage(bufB.canvas, 0, 0); vig = m.vig || 1; }
        g.globalAlpha = 1;
      } else {
        const ma = drawWorld(bufA, prev, t - prev.start, t), mb = drawWorld(bufB, sc, lt, t);
        g.drawImage(bufA.canvas, 0, 0); g.globalAlpha = k; g.drawImage(bufB.canvas, 0, 0); g.globalAlpha = 1;
        vig = lerp(ma.vig || 1, mb.vig || 1, k);
      }
    } else {
      const m = drawWorld(g, sc, lt, t); vig = m.vig || 1;
    }
    V.vignette(g, vig);
    overlays(g, sc, lt, t);
    V.grain(g, frame, OPTS.grain);
    // fade in from black / out to black
    const fi = 1 - sstep(0, OPTS.fadeIn, t), fo = sstep(TL.total - OPTS.fadeOut, TL.total, t);
    const f = Math.max(fi, fo);
    if (f > 0.001) { g.fillStyle = `rgba(0,0,0,${f})`; g.fillRect(0, 0, W, H); }
  };
})();
