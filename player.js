// Figma motion player: rebuilds a page from its base render + animated units (exported layers)
// and replays the units' real Figma keyframe tracks with the Web Animations API.
(function () {
  // The presentation exists to show the motion, so it ignores the OS «reduce motion» setting
  // (the client's machines have it on). The production site should still respect it.
  const REDUCED = false;
  const FPS = 30;

  // ---- easing ----
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => { let t = x; for (let i = 0; i < 8; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-5 || !d) break; t -= e / d; } return Y(Math.min(1, Math.max(0, t))); };
  }
  const NAMED = { 0: t => t, o: bezier(0, 0, .58, 1), io: bezier(.42, 0, .58, 1), i: bezier(.42, 0, 1, 1) };
  const cache = new Map();
  const ease = e => { if (!Array.isArray(e)) return NAMED[e] || NAMED[0]; const k = e.join(); if (!cache.has(k)) cache.set(k, bezier(...e)); return cache.get(k); };
  const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  function lerp(a, b, p) {
    if (typeof a === 'number') return a + (b - a) * p;
    if (Array.isArray(a)) return a.map((v, i) => v + (b[i] - v) * p);
    if (typeof a === 'string') { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * p)).join(',')})`; }
    return b;
  }
  function value(tr, t) {
    const kf = tr.kf;
    if (t <= kf[0][0]) return kf[0][1];
    for (let i = 1; i < kf.length; i++) if (t <= kf[i][0]) {
      const [t0, v0] = kf[i - 1], [t1, v1, e] = kf[i];
      return lerp(v0, v1, ease(e)((t - t0) / Math.max(1e-6, t1 - t0)));
    }
    return kf[kf.length - 1][1];
  }
  function style(u, t) {
    const T = u.tr, g = (k, d) => (T[k] ? value(T[k], t) : d), s = {};
    s.opacity = T.OPACITY ? g('OPACITY') : u.op;
    let sx = 1, sy = 1;
    if (T.SCALE_XY) [sx, sy] = g('SCALE_XY');
    if (T.SCALE_X) sx = g('SCALE_X');
    if (T.SCALE_Y) sy = g('SCALE_Y');
    s.transform = `translate(${g('TRANSLATION_X', 0)}px,${g('TRANSLATION_Y', 0)}px) scale(${sx},${sy})`;
    if (T.PATH_TRIM_END) s.clipPath = `inset(0 ${((1 - g('PATH_TRIM_END')) * 100).toFixed(2)}% 0 0)`;
    if (T.HEIGHT) s.height = g('HEIGHT') + 'px';
    if (T['fills.0.color']) { const c = g('fills.0.color'); s.backgroundColor = c[0] === '#' ? c : c; }
    return s;
  }
  function keyframes(u, D) {
    const n = Math.max(2, Math.round(D * FPS)), out = [];
    for (let i = 0; i <= n; i++) { const k = style(u, D * i / n); k.offset = i / n; out.push(k); }
    return out;
  }

  const el = (tag, cls, css) => { const n = document.createElement(tag); if (cls) n.className = cls; if (css) Object.assign(n.style, css); return n; };
  const box = (x, y, w, h) => ({ left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });

  // Build a page. Returns { root, groups, destroy }.
  window.buildPage = function (P, dir, opts = {}) {
    const D = P.duration || 2;
    const root = el('div', 'page', { width: P.w + 'px', height: P.h + 'px' });
    const base = el('img', 'base'); base.src = `${dir}/base.jpg`; base.width = P.w; base.height = P.h; base.alt = opts.alt || ''; base.decoding = 'async';
    root.append(base);
    const nodes = [], anims = [];
    P.units.forEach((u, i) => {
      const parent = u.p != null ? P.units[u.p] : null;
      const ox = parent ? parent.x : 0, oy = parent ? parent.y : 0;
      const n = el('div', 'unit', box(u.x - ox, u.y - oy, u.w, u.h));
      if (u.img) { const im = el('img'); im.src = `${dir}/${u.img}`; im.alt = ''; im.decoding = 'async'; n.append(im); }
      if (u.shape) { n.style.background = u.shape.fill; n.style.borderRadius = u.shape.radius + 'px'; }
      if (u.o) n.style.transformOrigin = `${u.o[0]}px ${u.o[1]}px`;
      let host = parent ? nodes[u.p] : root, mount = n;
      if (u.clip && !parent) {
        const [cx, cy, cw, ch, r] = u.clip;
        const c = el('div', 'clip', { ...box(cx, cy, cw, ch), borderRadius: r + 'px' });
        n.style.left = (u.x - cx) + 'px'; n.style.top = (u.y - cy) + 'px';
        c.append(n); mount = c;
      }
      host.append(mount);
      nodes[i] = n;
      const a = n.animate(keyframes(u, D), { duration: D * 1000, fill: 'both' });
      a.pause(); a.currentTime = REDUCED ? D * 1000 : 0;
      anims[i] = a;
    });
    // groups: top-level units clustered by vertical position; each plays when it comes into view
    const tops = P.units.map((u, i) => i).filter(i => P.units[i].p == null).sort((a, b) => P.units[a].y - P.units[b].y);
    const groups = [];
    for (const i of tops) {
      const u = P.units[i], g = groups[groups.length - 1];
      if (g && u.y < g.y1 + 220) { g.items.push(i); g.y1 = Math.max(g.y1, u.y + u.h); g.y0 = Math.min(g.y0, u.y); }
      else groups.push({ items: [i], y0: u.y, y1: u.y + u.h });
    }
    const all = i => [i, ...P.units.map((v, j) => j).filter(j => P.units[j].p === i)];
    for (const g of groups) {
      g.anims = g.items.flatMap(all).map(j => anims[j]);
      g.scrub = g.items.some(i => P.units[i].tr.HEIGHT);
      const s = el('div', 'sentinel', box(0, g.y0, P.w, Math.max(40, g.y1 - g.y0)));
      s._g = g; g.sentinel = s; root.append(s);
    }
    root._groups = groups;
    root._D = D;
    return root;
  };

  // Start observing groups inside a scroll root (null = window). Returns cleanup.
  window.runPage = function (root, scrollRoot) {
    const D = root._D, groups = root._groups;
    let raf = 0;
    const set = (g, t) => { for (const a of g.anims) a.currentTime = t; };
    const play = g => {
      if (REDUCED) { set(g, g.scrub ? 1000 : D * 1000); g.state = 'done'; return; }
      set(g, 0);
      for (const a of g.anims) a.play();
      g.state = 'play';
      if (g.scrub) { g.cur = 0; setTimeout(() => { if (g.state === 'play') { for (const a of g.anims) a.pause(); set(g, 1000); g.cur = 1000; g.state = 'scrub'; } }, 1000); }
    };
    const reset = g => { for (const a of g.anims) a.pause(); set(g, REDUCED ? (g.scrub ? 1000 : D * 1000) : 0); g.state = null; };
    const io = new IntersectionObserver(es => {
      for (const e of es) {
        const g = e.target._g;
        if (e.isIntersecting && e.intersectionRatio >= .35 && !g.state) play(g);
        else if (!e.isIntersecting && g.state) reset(g);
      }
    }, { root: scrollRoot, threshold: [0, .35] });
    for (const g of groups) io.observe(g.sentinel);
    // mobile statistics: the fact nearest the middle of the screen is active (Figma steps at 1.6 / 2.6 / 3.6 / 4.6 s)
    const scrubs = groups.filter(g => g.scrub);
    let last = performance.now();
    function tick(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      for (const g of scrubs) {
        if (g.state !== 'scrub') continue;
        const vr = scrollRoot ? scrollRoot.getBoundingClientRect() : { top: 0, height: innerHeight };
        const r = g.sentinel.getBoundingClientRect();
        const cy = (r.top + r.height / 2 - vr.top) / vr.height;
        const p = Math.min(1, Math.max(0, (.85 - cy) / .7));
        const idx = Math.min(4, Math.floor(p * 5));
        const target = idx === 0 ? 1000 : 1900 + (idx - 1) * 1000;
        if (REDUCED) { g.cur = target; set(g, target); continue; }
        const diff = target - g.cur, stepMs = dt * 1000 * 3.3;
        if (Math.abs(diff) > .5) { g.cur += Math.sign(diff) * Math.min(Math.abs(diff), stepMs); set(g, g.cur); }
      }
      raf = requestAnimationFrame(tick);
    }
    if (scrubs.length) raf = requestAnimationFrame(tick);
    return {
      replay() { for (const g of groups) { const r = g.sentinel.getBoundingClientRect(); const vr = scrollRoot ? scrollRoot.getBoundingClientRect() : { top: 0, bottom: innerHeight }; if (r.bottom > vr.top && r.top < vr.bottom) { reset(g); play(g); } } },
      destroy() { io.disconnect(); cancelAnimationFrame(raf); },
    };
  };

  // ---- packaging wall (concept 2), motion as in previews/itogi-animations ----
  const WALL = {
    desktop: { clip: { x: 1000, y: 96, w: 920, h: 1080 }, pad: 36, gap: 18, heroTop: 96, cols: [
      { x: 1074, y0: 40, dir: -1, tiles: [['carnitine', 300], ['kmg', 300], ['echinacea', 300]] },
      { x: 1322, y0: -100, dir: 1, tiles: [['calcium', 300], ['coenzyme', 300], ['glycine', 300]] },
      { x: 1570, y0: 90, dir: -1, tiles: [['ascorbic', 300], ['all', 160], ['alpha', 300]] },
    ], a: [22, 16, 28], b: { slow: 8, jump: 318 } },
    mobile: { clip: { x: 0, y: 342, w: 390, h: 590 }, pad: 36, gap: 16, heroTop: 0, cols: [
      { x: 16, y0: 343, dir: -1, tiles: [['carnitine', 210], ['echinacea', 210], ['amber', 210]] },
      { x: 203, y0: 373, dir: 1, tiles: [['kmg', 210], ['calcium', 210], ['glycine', 210]] },
    ], a: [16, 12], b: { slow: 6, jump: 226 } },
  };
  window.buildWall = function (root, view, dir, _unused, onTile) {
    const W = WALL[view], v = view === 'desktop' ? 'd' : 'm';
    const wall = el('div', 'wall' + (view === 'mobile' ? ' m' : ''), box(W.clip.x, W.clip.y, W.clip.w, W.clip.h));
    const cols = W.cols.map((c, ci) => {
      const period = c.tiles.reduce((s, t) => s + t[1] + W.gap, 0);
      const col = el('div', 'col', { left: (c.x - W.pad - W.clip.x) + 'px' });
      for (let k = -2; k <= 2; k++) {
        let y = c.y0 + k * period;
        for (const [name, h] of c.tiles) {
          const img = el('img', '', { top: (W.heroTop + y - W.pad - W.clip.y) + 'px' });
          img.src = `${dir}/tile-${v}-${name}.webp`; img.alt = ''; img.dataset.tile = name; img.draggable = false;
          col.append(img); y += h + W.gap;
        }
      }
      wall.append(col);
      return { col, dir: c.dir, period, speed: W.a[ci], lag: ci * .06 };
    });
    root.append(wall);
    if (view === 'mobile') root.append(el('div', 'wallfade', box(0, W.clip.y + W.clip.h - 24, 390, 24)));
    wall.addEventListener('click', e => { const t = e.target.dataset && e.target.dataset.tile; if (t) onTile(t, e); });
    let tau = 0, rate = 1, target = 1, last = performance.now(), raf = 0;
    wall.addEventListener('mouseenter', () => { target = 0; });
    wall.addEventListener('mouseleave', () => { target = 1; });
    wall.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') target = 0; });
    for (const ev of ['pointerup', 'pointercancel']) wall.addEventListener(ev, e => { if (e.pointerType !== 'mouse') target = 1; });
    const easeS = x => -(Math.cos(Math.PI * x) - 1) / 2;
    const B = W.b, SLOW = 3.5, WHOOP = .9, CYC = SLOW + WHOOP; // slow creep 3.5 s, then a one-tile dash
    const offB = t => { const n = Math.floor(t / CYC), p = t - n * CYC; return n * (B.slow * CYC + B.jump) + B.slow * p + (p <= SLOW ? 0 : B.jump * easeS((p - SLOW) / WHOOP)); };
    function frame(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      rate += (target - rate) * Math.min(1, dt / .25 * 3); if (Math.abs(target - rate) < .01) rate = target;
      tau += dt * rate;
      for (const c of cols) {
        const off = offB(Math.max(0, tau - c.lag));
        c.col.style.transform = `translateY(${(((c.dir * off) % c.period) + c.period) % c.period}px)`;
      }
      raf = requestAnimationFrame(frame);
    }
    if (!REDUCED) raf = requestAnimationFrame(frame); else frame(performance.now()) || cancelAnimationFrame(raf);
    return () => cancelAnimationFrame(raf);
  };
})();
