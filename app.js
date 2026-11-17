(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const PAGES = window.PAGES, MODALS = window.MODALS, SIZES = window.MODAL_SIZES;
  const ROUTES = [
    ['cover', 'Обложка'], ['overview', 'Концепции'], ['c1', '1 · Для всей семьи'], ['c2', '2 · Стена упаковок'], ['c3', '3 · Город 2.5D'],
    ['color', 'Цвет'], ['windows', 'Все окна'],
  ];
  const WHERE = { c1d: 3420, c2d: 3420, c3d: 3840, c1m: 2960, c2m: 3104, c3m: 3034 };
  const main = $('#main'), nav = $('#nav');
  let cleanup = [], current = null, view = innerWidth < 760 ? 'mobile' : 'desktop', showZones = false, ctx = null;

  // ---------- navigation ----------
  ROUTES.forEach(([id, label]) => { const a = el('a', null, label); a.href = '#/' + id; a.dataset.r = id; nav.append(a); });
  const routeIndex = id => ROUTES.findIndex(r => r[0] === id);
  function go(delta) { const i = routeIndex(current); const j = Math.min(ROUTES.length - 1, Math.max(0, i + delta)); if (j !== i) location.hash = '#/' + ROUTES[j][0]; }
  $('#prev').onclick = () => go(-1);
  $('#next').onclick = () => go(1);

  function render() {
    const [id, v] = (location.hash.replace(/^#\/?/, '') || 'cover').split('/');
    current = ROUTES.some(r => r[0] === id) ? id : 'cover';
    if (v === 'mobile' || v === 'desktop') view = v;
    closeOverlay(true);
    cleanup.forEach(f => f()); cleanup = []; ctx = null;
    main.innerHTML = ''; main.className = 'sec-' + current;
    nav.querySelectorAll('a').forEach(a => a.setAttribute('aria-current', a.dataset.r === current ? 'page' : 'false'));
    const act = nav.querySelector('[aria-current="page"]'); if (act) act.scrollIntoView({ block: 'nearest', inline: 'center' });
    ({ cover, overview, windows, color }[current] || concept)(current);
    $('#prev').disabled = routeIndex(current) === 0;
    $('#next').disabled = routeIndex(current) === ROUTES.length - 1;
    scrollTo(0, 0);
    document.title = (ROUTES[routeIndex(current)][1]) + ' — ВИТАНИУМ · концепции сайта';
  }
  addEventListener('hashchange', render);

  // ---------- sections ----------
  const thumb = (pid) => `assets/pages/${pid}/thumb.jpg`;
  function cover() {
    const s = el('section', 'cover');
    s.innerHTML = `<div class="cover-in">
      <p class="eyebrow">Главная страница сайта · ноябрь 2026</p>
      <h1>ВИТАНИУМ<sup>®</sup></h1>
      <p class="lead">Три концепции главной страницы, цветовая схема и все окна сайта — в живом виде, с анимациями.</p>
      <a class="btn" href="#/overview">Смотреть <span aria-hidden="true">→</span></a>
      <p class="keys">Листайте разделы стрелками <kbd>←</kbd> <kbd>→</kbd></p>
    </div>
    <div class="cover-thumbs">${CONCEPTS.map(c => `<a href="#/${c.id}"><img src="${thumb(c.desktop)}" alt="Концепция ${c.n}: ${c.title}"></a>`).join('')}</div>`;
    main.append(s);
  }
  function overview() {
    const s = el('section', 'wrap');
    s.innerHTML = `<h2 class="h">Три концепции</h2><p class="sub">Все три построены на одной структуре страницы и одних окнах — отличаются первым экраном, иллюстрациями и движением.</p>
      <div class="cards">${CONCEPTS.map(c => `<article class="card">
        <a href="#/${c.id}" class="card-img"><img src="${thumb(c.desktop)}" alt=""></a>
        <div class="card-body"><p class="num">Концепция ${c.n}</p><h3>${c.title}</h3><p>${c.idea}</p>
        <a class="btn small" href="#/${c.id}">Открыть <span aria-hidden="true">→</span></a></div></article>`).join('')}</div>`;
    main.append(s);
  }
  function color() {
    const C = window.COLOR;
    const head = el('section', 'wrap');
    head.innerHTML = `<h2 class="h">${C.title}</h2><p class="sub">${C.text}</p>
      <div class="compare"><figure><img src="${thumb(C.base)}" alt="Концепция 3 в фиолетовой гамме"><figcaption>Основная гамма</figcaption></figure>
      <figure><img src="${thumb(C.page)}" alt="Концепция 3 в гамме «абрикос»"><figcaption>«Абрикос»</figcaption></figure></div>
      <p class="sub small">Ниже — вся страница в этой гамме. Схема сделана для десктопа.</p>`;
    main.append(head);
    mountPage(C.page, 'desktop', { hotspots: false });
  }
  function concept(id) {
    const c = CONCEPTS.find(x => x.id === id);
    const i = CONCEPTS.indexOf(c), prev = CONCEPTS[i - 1], next = CONCEPTS[i + 1];
    const head = el('section', 'chead');
    head.innerHTML = `<div class="chead-text"><p class="num">Концепция ${c.n}</p><h2>${c.title}</h2><p>${c.idea}</p><p class="muted">${c.moves}</p></div>
      <div class="chead-ctl">
        <div class="seg" role="group" aria-label="Экран"><button data-v="desktop">Десктоп</button><button data-v="mobile">Мобильный</button></div>
        <button class="ghost" id="replay" title="Повторить анимации на экране (R)">Повторить</button>
        <button class="ghost" id="zones" aria-pressed="${showZones}" title="Показать кликабельные места (H)">Кликабельные места</button>
      </div>
      <p class="hint">Нажимайте на кнопки, упаковки, плитки каталога и меню — откроются окна, как на сайте.</p>`;
    main.append(head);
    head.querySelectorAll('[data-v]').forEach(b => { b.setAttribute('aria-pressed', b.dataset.v === view); b.onclick = () => { location.hash = `#/${id}/${b.dataset.v}`; }; });
    $('#replay').onclick = () => ctx && ctx.run.replay();
    $('#zones').onclick = toggleZones;
    mountPage(view === 'mobile' ? c.mobile : c.desktop, view, { wall: c.wall, hotspots: true });
    const foot = el('nav', 'cfoot');
    foot.innerHTML = `${prev ? `<a href="#/${prev.id}/${view}">← ${prev.n} · ${prev.title}</a>` : '<a href="#/overview">← Все концепции</a>'}
      ${next ? `<a href="#/${next.id}/${view}">${next.n} · ${next.title} →</a>` : '<a href="#/color">Цветовая схема →</a>'}`;
    main.append(foot);
  }
  function windows() {
    const s = el('section', 'wrap');
    s.innerHTML = `<h2 class="h">Все окна</h2><p class="sub">Окна и состояния, которые открываются со страницы. Нажмите, чтобы посмотреть в натуральную величину.</p>`;
    for (const [title, ids] of GALLERY) {
      const g = el('div', 'gal-group'); g.append(el('h3', null, title));
      const grid = el('div', 'gal');
      for (const id of ids) {
        const m = MODALS[id], mob = m.kind === 'sheet';
        const b = el('button', 'gal-item' + (mob ? ' mob' : ''));
        b.innerHTML = `<span class="gal-img"><img src="assets/modals/${m.img || id}.webp" alt="" loading="lazy"></span><span class="gal-t">${m.title}${mob ? ' <em>мобильный</em>' : ''}</span><span class="gal-c">${m.caption}</span>`;
        b.onclick = () => openOverlay(id, { gallery: true });
        grid.append(b);
      }
      g.append(grid); s.append(g);
    }
    main.append(s);
  }
  // ---------- page viewer ----------
  function mountPage(pid, v, opts) {
    const P = PAGES[pid], dir = `assets/pages/${pid}`;
    const stage = el('div', 'stage ' + v);
    main.append(stage);
    const root = buildPage(P, dir, { alt: '' });
    let scrollRoot = null, scaler = null, phone = null;
    if (v === 'mobile') {
      const pf = el('div', 'phonefit'); phone = el('div', 'phone'); const screen = el('div', 'screen');
      screen.append(el('div', 'status'), root); phone.append(screen); pf.append(phone); stage.append(pf);
      scrollRoot = screen;
    } else {
      scaler = el('div', 'scaler'); scaler.append(root); stage.append(scaler);
    }
    if (opts.wall) cleanup.push(buildWall(root, v, 'assets/pages/wall', null, t => { const m = WALL_LINKS[v][t]; if (m) openOverlay(m); }));
    if (opts.hotspots) for (const h of (HOTSPOTS[pid] || []).concat(advHotspots(pid))) {
      addHot(root, h);
    }
    const fit = () => {
      if (phone) {
        const avail = innerHeight - $('.bar').offsetHeight - 24;
        const s = Math.min(1, avail / 860, (stage.clientWidth) / 406);
        const pf = phone.parentNode; pf.style.transform = `scale(${s})`; pf.style.width = 406 * s + 'px'; pf.style.height = 860 * s + 'px';
        ctx && (ctx.scale = s);
      } else {
        const s = Math.min(1, stage.clientWidth / P.w);
        scaler.style.transform = `scale(${s})`; scaler.style.width = P.w * s + 'px'; scaler.style.height = P.h * s + 'px';
        ctx && (ctx.scale = s);
      }
    };
    ctx = { pid, view: v, root, phone, scrollRoot, scale: 1, P };
    if (opts.hotspots) { ctx.adv = v === 'mobile' ? advMobile(root, pid, P) : advDesktop(root, pid); ctx.tab = catalogTabs(root, pid); }
    fit(); addEventListener('resize', fit); cleanup.push(() => removeEventListener('resize', fit));
    const run = runPage(root, scrollRoot); ctx.run = run; cleanup.push(() => run.destroy());
  }
  function doAction(act) {
    if (act.startsWith('m:')) return openOverlay(act.slice(2));
    if (act.startsWith('y:')) return scrollPageTo(+act.slice(2));
    if (act.startsWith('adv:')) return ctx && ctx.adv && ctx.adv(+act.slice(4));
    if (act.startsWith('tab:')) return ctx && ctx.tab && ctx.tab(+act.slice(4));
  }

  // ---------- advantages: the item opens in place (prototype: smart animate 250 ms ease-out) ----------
  const EASE_OUT = 'cubic-bezier(0,0,.58,1)', ADV_MS = 250;
  function advHotspots(pid) {
    const D = ADV.desk[pid], M = ADV.mob[pid];
    if (D) return ADV.text.map(([t], i) => [D.x + (i % 2) * 620, D.y + Math.floor(i / 2) * D.ch, 580, D.ch, 'adv:' + i, t]);
    if (M) return ADV.text.map(([t], i) => [16, M.y + i * 89, 358, 88, 'adv:' + i, t]);
    return [];
  }
  // Desktop: the item grows from its cell to the whole row and covers its neighbour; the row height stays.
  function advDesktop(root, pid) {
    const A = ADV.desk[pid]; if (!A) return null;
    let open = null;
    const rect = (i, full) => {
      const col = i % 2, y = A.y + Math.floor(i / 2) * A.ch;
      return full ? { left: A.x - 24, top: y, width: 1248 } : { left: A.x + col * 620 - 24, top: y, width: 628 };
    };
    function make(i) {
      const r = rect(i, true), c = el('div', 'adv-card');
      Object.assign(c.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: A.ch + 'px' });
      const [off, sz] = (A.big && A.big[i]) || [0, A.icon];
      const ic = el('img', 'adv-ic'); ic.src = `assets/adv/${pid}-${i}.webp`; ic.alt = '';
      Object.assign(ic.style, { left: 24.5 + off + 'px', top: A.iy + .5 + off + 'px', width: sz + 'px', height: sz + 'px' });
      const tx = 26 + A.icon + 18, t = el('div', 'adv-t', `<h4>${ADV.text[i][0]}</h4><p>${ADV.text[i][1]}</p>`);
      Object.assign(t.style, { left: tx + 'px', width: 1149 - tx + 'px' });
      const x = el('span', 'adv-x', '<svg viewBox="0 0 56 56" aria-hidden="true"><path d="M16.5 16.5l23 23M39.5 16.5l-23 23"/></svg>');
      c.append(ic, t, x);
      c.setAttribute('role', 'button'); c.setAttribute('aria-label', 'Свернуть: ' + ADV.text[i][0]);
      c.onclick = () => toggle(i);
      return c;
    }
    function animate(c, i, opening) {
      const a = rect(i, false), b = rect(i, true);
      const from = { left: a.left + 'px', width: a.width + 'px', opacity: 0 }, to = { left: b.left + 'px', width: b.width + 'px', opacity: 1 };
      const kf = opening ? [from, to] : [to, from];
      const an = c.animate(kf, { duration: ADV_MS, easing: EASE_OUT, fill: 'both' });
      c.querySelector('.adv-t').animate([{ opacity: opening ? 0 : 1 }, { opacity: opening ? 1 : 0 }], { duration: ADV_MS, easing: EASE_OUT, fill: 'both' });
      return an;
    }
    function close() {
      if (!open) return;
      const { i, c } = open; open = null;
      c.style.pointerEvents = 'none';
      animate(c, i, false).finished.then(() => c.remove(), () => c.remove());
    }
    function toggle(i) {
      const same = open && open.i === i;
      close();
      if (same) return;
      const c = make(i); root.append(c); animate(c, i, true); open = { i, c };
    }
    return toggle;
  }
  // Mobile: accordion — the text opens under the row and everything below moves down.
  function advMobile(root, pid, P) {
    const A = ADV.mob[pid]; if (!A) return null;
    const base = root.querySelector('img.base'), N = ADV.text.length, Y = k => A.y + k * 89 + 88;
    const H = new Array(N).fill(0);
    const pluses = ADV.text.map((_, i) => {
      const y = A.y + i * 89 + 28, d = el('div', 'adv-plus');
      Object.assign(d.style, { left: '342px', top: y + 'px', backgroundImage: `url(${base.getAttribute('src')})`, backgroundPosition: `-342px -${y}px`, backgroundSize: `${P.w}px ${P.h}px` });
      root.append(d); return d;
    });
    const segOf = top => { let k = -1; for (let j = 0; j < N; j++) if (top >= Y(j)) k = j; return k; };
    const movers = [...root.children].filter(n => n !== base && n.style.top !== '' && segOf(parseFloat(n.style.top)) >= 0)
      .map(n => { n.classList.add('adv-shift'); return [n, segOf(parseFloat(n.style.top))]; });
    const segs = [], gaps = [];
    for (let k = 0; k < N; k++) {
      const top = Y(k), bot = k < N - 1 ? Y(k + 1) : P.h;
      const s = el('div', 'adv-seg'); Object.assign(s.style, { top: top + 'px', height: bot - top + 'px' });
      const im = el('img'); im.src = base.getAttribute('src'); im.alt = ''; im.width = P.w; im.style.top = -top + 'px';
      s.append(im, el('div', 'adv-line')); segs.push(s);
      const g = el('div', 'adv-gap'); g.style.top = top + 'px'; g.append(el('p', null, ADV.text[k][1])); gaps.push(g);
    }
    base.after(...segs, ...gaps);
    const S = k => { let t = 0; for (let j = 0; j <= k; j++) t += H[j]; return t; };
    function apply() {
      segs.forEach((s, k) => { s.style.translate = `0 ${S(k)}px`; s.classList.toggle('on', H[k] > 0); });
      gaps.forEach((g, k) => { g.style.translate = `0 ${S(k - 1)}px`; g.style.height = H[k] + 'px'; g.classList.toggle('on', H[k] > 0); });
      pluses.forEach((p, k) => p.classList.toggle('on', H[k] > 0));
      movers.forEach(([n, k]) => { n.style.translate = `0 ${S(k)}px`; });
      root.style.height = P.h + S(N - 1) + 'px';
    }
    return i => {
      const was = H[i] > 0;
      H.fill(0);
      if (!was) H[i] = gaps[i].firstChild.offsetHeight + 20;
      apply();
    };
  }

  // ---------- catalog: tabs switch the block in place (prototype: dissolve 200 ms) ----------
  function catalogTabs(root, pid) {
    const C = CATALOG[pid]; if (!C) return null;
    const layers = C.t.map(id => {
      const L = el('div', 'tabstate'); L.style.top = C.top + 204 + 'px';
      const im = el('img'); im.src = `assets/modals/${id}.webp`; im.alt = MODALS[id].title; L.append(im);
      [[416, 0, 'Для чего'], [816, 1, 'Для кого'], [1216, 2, 'Формы выпуска']].forEach(([x, k, l]) => addHot(L, [x, 0, 288, 60, 'tab:' + k, 'Таб «' + l + '»']));
      MODALS[id].links.forEach(([x, y, w, h, m]) => addHot(L, [x, y - 204, w, h, 'm:' + m, MODALS[m].title]));
      root.append(L); return L;
    });
    return k => layers.forEach((L, j) => L.classList.toggle('on', j === k - 1));
  }
  function addHot(host, [x, y, w, h, act, label]) {
    const b = el('button', 'hot'); Object.assign(b.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    b.setAttribute('aria-label', label); b.title = label;
    b.onclick = e => { e.stopPropagation(); doAction(act); };
    host.append(b); return b;
  }
  function scrollPageTo(y) {
    if (!ctx) return;
    if (ctx.scrollRoot) ctx.scrollRoot.scrollTo({ top: y, behavior: 'smooth' });
    else { const r = ctx.root.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + y * ctx.scale - $('.bar').offsetHeight, behavior: 'smooth' }); }
  }
  function toggleZones() { showZones = !showZones; document.body.classList.toggle('zones', showZones); const z = $('#zones'); if (z) z.setAttribute('aria-pressed', showZones); }

  // ---------- windows (overlay) ----------
  let ov = null;
  function closeOverlay(silent) {
    if (!ov) return;
    ov.remove(); ov = null; document.body.classList.remove('ov-open');
    $('#cap').hidden = true;
    if (!silent && lastFocus) lastFocus.focus();
  }
  let lastFocus = null;
  function openOverlay(id, o = {}) {
    const m = MODALS[id]; if (!m) return;
    if (!ov) lastFocus = document.activeElement;
    if (ov) ov.remove();
    const inPhone = m.kind === 'sheet' && !o.gallery && ctx && ctx.phone;
    const s = o.gallery ? null : (ctx && ctx.view === 'desktop' ? ctx.scale : null);
    const link = act => {
      if (act === 'close') return closeOverlay();
      if (act === 'y:where') { closeOverlay(); return ctx && scrollPageTo(WHERE[ctx.pid]); }
      openOverlay(act, o);
    };
    const addLinks = (host, links) => links.forEach(([x, y, w, h, act]) => {
      const b = el('button', 'hot'); Object.assign(b.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      b.setAttribute('aria-label', act === 'close' ? 'Закрыть' : (MODALS[act] ? MODALS[act].title : 'Перейти'));
      b.onclick = e => { e.stopPropagation(); link(act); }; host.append(b);
    });
    if (inPhone) {
      ov = el('div', 'sheet-layer');
      const sc = el('div', 'sheet-scroll');
      if (m.head) { const hd = el('img', 'sheet-head'); hd.src = `assets/modals/${m.head}.webp`; hd.alt = ''; sc.append(hd); }
      const body = el('div', 'sheet-body'); const im = el('img'); im.src = `assets/modals/${m.img || id}.webp`; im.alt = m.title; body.append(im);
      addLinks(body, m.links); sc.append(body);
      if (m.cta) { const cta = el('button', 'sheet-cta'); cta.innerHTML = `<img src="assets/modals/${m.cta}.webp" alt="Где купить">`; cta.onclick = () => link(m.ctaLink); sc.append(cta); }
      const x = el('button', 'sheet-x' + (m.noX ? ' vis' : ''), '×'); x.setAttribute('aria-label', 'Закрыть'); x.onclick = () => closeOverlay();
      ov.append(sc, x);
      ctx.phone.append(ov);
    } else {
      ov = el('div', 'ov ov-' + m.kind + (o.gallery ? ' ov-gallery' : ''));
      ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', m.title);
      const [iw, ih] = SIZES[m.img || id];
      const fitS = Math.min(1, (innerWidth - 32) / (m.kind === 'dialog' ? iw - 128 : iw), m.kind === 'sheet' ? 1 : 10);
      const sc = s || fitS;
      const frame = el('div', 'ov-frame'); frame.style.width = iw * sc + 'px'; frame.style.height = (m.kind === 'sheet' ? Math.min(ih, 844) : ih) * sc + 'px';
      const inner = el('div', 'ov-inner'); inner.style.width = iw + 'px'; inner.style.height = ih + 'px'; inner.style.transform = `scale(${sc})`;
      const im = el('img'); im.src = `assets/modals/${m.img || id}.webp`; im.alt = m.title; im.width = iw; im.height = ih;
      if (m.head) { const hd = el('img', 'sheet-head'); hd.src = `assets/modals/${m.head}.webp`; hd.alt = ''; inner.append(hd); inner.style.height = ih + 103 + 'px'; }
      inner.append(im); addLinks(inner, m.links);
      frame.append(inner);
      if (m.kind === 'sheet') frame.classList.add('frame-sheet');
      if (m.kind === 'dropdown' && ctx && !o.gallery) {
        const r = ctx.root.getBoundingClientRect();
        frame.style.marginLeft = Math.max(0, r.left) + 'px'; frame.style.marginTop = $('.bar').offsetHeight + 'px';
      }
      ov.append(frame);
      ov.addEventListener('click', e => { if (e.target === ov) closeOverlay(); });
      const x = el('button', 'ov-x', '×'); x.setAttribute('aria-label', 'Закрыть (Esc)'); x.onclick = () => closeOverlay(); ov.append(x);
      document.body.append(ov); document.body.classList.add('ov-open');
      x.focus({ preventScroll: true });
    }
    const cap = $('#cap'); cap.hidden = false;
    cap.innerHTML = `<strong>${m.title}</strong><span>${m.caption}</span>`;
  }

  // ---------- keys ----------
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') { if (ov) { closeOverlay(); e.preventDefault(); } return; }
    if (ov) return;
    if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
    else if (/^c\d$/.test(current)) {
      const k = e.key.toLowerCase();
      if (k === 'd' || k === 'в') location.hash = `#/${current}/desktop`;
      else if (k === 'm' || k === 'ь') location.hash = `#/${current}/mobile`;
      else if (k === 'r' || k === 'к') ctx && ctx.run.replay();
      else if (k === 'h' || k === 'р') toggleZones();
    }
  });

  render();
})();
