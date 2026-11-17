/* =====================================================================
   widgets.js — simulações e animações interativas de CLC 6 (DR1 a DR4)
   ---------------------------------------------------------------------
   Each widget is a <div class="wg" data-widget="name"></div> in
   index.html; this file finds it and builds its drawing (SVG) and its
   controls. Widgets that follow the presenter's clicks read the slide's
   ge1…geN classes («step is at least n», set by app.js).
   No libraries, no build. Colours are the deck palette.
   Widgets:
     contagio   a price rise spreads to the neighbouring houses
     oferta     supply and demand: what moves the price of houses
     renda      land rent (bid rent) by distance to the centre
     quinze     the 15-minute city: what is within reach
     pendular   commuting into the centre over a day
     elastico   distance in km, in minutes and in euros
     crescimento  a metropolitan area growing from 1900 to 2025
     turismo    short-term rentals in a neighbourhood (illustrative)
     ruralurb   from village to city
     rua        one street in 1975, 1995, 2012 and 2025
     dialetos   map of the Portuguese dialects (Lindley Cintra)
     travagem   stopping distance at different speeds
     pdm        plan a municipality on a grid
     decibeis   noise levels and the legal limits
     pushpull   why people leave (push and pull factors)
     fluxos     who leaves Portugal and who arrives
     falantes   Portuguese-speaking countries
     tabs       generic tabs (used for the urban models)
   ===================================================================== */
(function () {
  'use strict';
  const C = { navy: '#1E2A33', orange: '#A44A16', acc: '#F0A673', peach: '#F1CDB0', ol: '#FBE3D2',
    cream: '#F6F3EC', blue: '#2F6E9E', bl: '#DCE8F2', green: '#556B3C', gl: '#E9EEE2', muted: '#6F7880',
    line: '#C9D1D8', white: '#FFFFFF', gray: '#B9C1C8', red: '#B3261E' };
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- helpers ------------------------------------------------ */
  function el(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (tag === 'text' && !(attrs && 'fill' in attrs)) e.setAttribute('fill', C.navy);   // CSS fill would override per-text colours
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function svg(w, h, parent, label) {
    const s = el('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'wg-svg', role: 'img' });
    if (label) s.setAttribute('aria-label', label);
    parent.appendChild(s);
    return s;
  }
  function html(parent, markup) { const d = document.createElement('div'); d.innerHTML = markup; while (d.firstChild) parent.appendChild(d.firstChild); }
  const nf = (v, d) => Number(v).toLocaleString('pt-PT', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function mix(c1, c2, t) {
    t = clamp(t, 0, 1);
    const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
    const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
    const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }
  /** deterministic pseudo-random numbers, so every projection looks the same */
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** true while the widget's slide is the one on screen */
  const visible = w => { const s = w.closest('.slide'); return !s || s.classList.contains('current'); };
  /** current build step of the widget's slide (from the ge1…geN classes) */
  function stepOf(w) { const s = w.closest('.slide'); if (!s) return 99; let k = 0; while (s.classList.contains('ge' + (k + 1))) k++; return k; }
  /** call fn(step) whenever the slide's step changes */
  function onStep(w, fn) {
    const s = w.closest('.slide'); if (!s) return;
    let last = -1;
    new MutationObserver(() => { const k = stepOf(w); if (k !== last) { last = k; fn(k); } }).observe(s, { attributes: true, attributeFilter: ['class'] });
    fn(stepOf(w));
  }
  /** a range slider row: label, input, value */
  function slider(parent, o) {
    const row = document.createElement('label'); row.className = 'rng';
    row.innerHTML = '<span></span><input type="range"><output></output>';
    row.firstChild.textContent = o.label;
    const inp = row.querySelector('input');
    inp.min = o.min; inp.max = o.max; inp.step = o.step || 1; inp.value = o.value;
    const out = row.querySelector('output');
    const paint = () => { out.textContent = o.fmt ? o.fmt(Number(inp.value)) : inp.value; };
    inp.addEventListener('input', () => { paint(); o.onInput(Number(inp.value)); });
    inp.addEventListener('keydown', e => e.stopPropagation());
    paint(); parent.appendChild(row);
    return inp;
  }
  function buttons(parent, list, cls) {
    const box = document.createElement('div'); box.className = 'wg-btns' + (cls ? ' ' + cls : '');
    list.forEach(b => {
      const x = document.createElement('button'); x.type = 'button'; x.className = 'btn ' + (b.cls || 'ghost'); x.textContent = b.t;
      x.addEventListener('click', e => { e.stopPropagation(); b.f(x, box); });
      if (b.key) x.dataset.key = b.key;
      box.appendChild(x);
    });
    parent.appendChild(box); return box;
  }
  function pick(box, btn) { box.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b === btn)); }
  function house(g, x, y, w, h, fill, stroke) {
    el('path', { d: `M${x - 4},${y + h * .42} L${x + w / 2},${y} L${x + w + 4},${y + h * .42} Z`, fill: stroke || C.orange }, g);
    el('rect', { x: x, y: y + h * .4, width: w, height: h * .6, rx: 2, fill: fill || C.cream, stroke: stroke || C.orange, 'stroke-width': 1.5 }, g);
  }
  /** a person (same figure as in the work lessons: Ana is orange with a white dot) */
  function person(g, x, y, s, fill, dot) {
    const p = el('g', { transform: `translate(${x},${y}) scale(${s})` }, g);
    el('path', { d: 'M-12,0 L-8,-28 Q0,-36 8,-28 L12,0 Z', fill: fill }, p);
    el('circle', { cx: 0, cy: -42, r: 10, fill: fill }, p);
    if (dot) el('circle', { cx: 0, cy: -18, r: 3.2, fill: '#fff' }, p);
    return p;
  }
  const W = {};

  /* ---------- 1. contagio: one sale lifts the whole street ------------- */
  W.contagio = function (w) {
    const COLS = 8, ROWS = 4, N = COLS * ROWS;
    const base = Array.from({ length: N }, (_, i) => 180 + ((i * 37) % 41));
    let p = base.slice(), anim = null, sold = new Set();
    const s = svg(820, 330, w, 'Bairro com 32 casas e os seus preços');
    el('rect', { x: 0, y: 0, width: 820, height: 330, fill: C.white }, s);
    for (let r = 0; r <= ROWS; r++) el('rect', { x: 0, y: 8 + r * 80 - 8, width: 820, height: 6, fill: C.gl }, s);
    const cells = [];
    for (let i = 0; i < N; i++) {
      const cx = 18 + (i % COLS) * 100, cy = 12 + Math.floor(i / COLS) * 80;
      const g = el('g', { class: 'wg-click', tabindex: 0, role: 'button', 'aria-label': 'Casa ' + (i + 1) }, s);
      el('path', { d: `M${cx},${cy + 26} L${cx + 40},${cy} L${cx + 80},${cy + 26} Z`, fill: C.orange }, g);
      const body = el('rect', { x: cx + 4, y: cy + 24, width: 72, height: 42, rx: 3, fill: C.cream, stroke: C.orange, 'stroke-width': 1.5 }, g);
      const t = el('text', { x: cx + 40, y: cy + 52, 'text-anchor': 'middle', class: 'wg-t', 'font-weight': 700 }, g, '');
      const tag = el('text', { x: cx + 40, y: cy + 17, 'text-anchor': 'middle', class: 'wg-s', fill: '#fff' }, g, '');
      g.addEventListener('click', e => { e.stopPropagation(); sell(i); });
      g.addEventListener('keydown', e => { if (e.key === 'Enter') { e.stopPropagation(); sell(i); } });
      cells.push({ body, t, tag });
    }
    const info = document.createElement('div'); info.className = 'wg-read'; w.appendChild(info);
    buttons(w, [
      { t: 'Abre uma estação de metro', f: () => metro() },
      { t: 'Repor o bairro', f: () => { if (anim) clearInterval(anim); p = base.slice(); sold.clear(); paint(); } }
    ]);
    function paint() {
      let sum = 0, up = 0;
      for (let i = 0; i < N; i++) {
        const r = p[i] / base[i];
        cells[i].body.setAttribute('fill', r < 1.005 ? C.cream : mix(C.ol, C.orange, (r - 1) / 0.45));
        cells[i].t.setAttribute('fill', r > 1.25 ? '#fff' : C.navy);
        cells[i].t.textContent = Math.round(p[i]) + ' k€';
        cells[i].tag.textContent = sold.has(i) ? 'VENDIDA' : (r > 1.01 ? '+' + Math.round((r - 1) * 100) + '%' : '');
        sum += p[i]; if (r > 1.01 && !sold.has(i)) up++;
      }
      const b = base.reduce((a, c) => a + c, 0);
      info.innerHTML = '<span>Preço médio do bairro: <b>' + nf(sum / N) + ' mil €</b> (' + (sum > b ? '+' : '') + nf((sum / b - 1) * 100, 1) + '%)</span><span>Casas que subiram <b>sem obras nenhumas</b>: <b>' + up + '</b></span>';
    }
    function spread() {
      if (anim) clearInterval(anim);
      let rounds = 0;
      anim = setInterval(() => {
        const q = p.slice();
        for (let i = 0; i < N; i++) {
          if (sold.has(i)) continue;
          const c = i % COLS, r = Math.floor(i / COLS); let s2 = 0, n = 0;
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue; const rr = r + dr, cc = c + dc;
            if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue; s2 += p[rr * COLS + cc] / base[rr * COLS + cc]; n++;
          }
          const avgRatio = s2 / n, mine = p[i] / base[i];
          if (avgRatio > mine) q[i] = base[i] * (mine + 0.32 * (avgRatio - mine));   // owners ask what the neighbours got
        }
        p = q; paint();
        if (++rounds >= 9) clearInterval(anim);
      }, reduced ? 30 : 420);
    }
    function sell(i) { p[i] = p[i] * 1.4; sold.add(i); paint(); spread(); }
    function metro() { [27, 28, 19, 20].forEach(i => { p[i] *= 1.18; }); paint(); spread(); }
    paint();
  };

  /* ---------- 2. oferta: supply and demand ---------------------------- */
  W.oferta = function (w) {
    const s = svg(560, 360, w, 'Gráfico de oferta e procura de casas');
    const X = q => 60 + q * 4.6, Y = pr => 320 - pr * 2.9;
    el('line', { x1: 60, y1: 320, x2: 530, y2: 320, stroke: C.navy, 'stroke-width': 2 }, s);
    el('line', { x1: 60, y1: 320, x2: 60, y2: 20, stroke: C.navy, 'stroke-width': 2 }, s);
    el('text', { x: 530, y: 345, 'text-anchor': 'end', class: 'wg-s' }, s, 'quantidade de casas vendidas →');
    el('text', { x: 50, y: 18, 'text-anchor': 'end', class: 'wg-s', transform: 'rotate(-90 50 18)' }, s, '');
    el('text', { x: 66, y: 30, class: 'wg-s' }, s, '↑ preço');
    const ghost = el('g', { opacity: .25 }, s);
    const gD = el('line', { stroke: C.orange, 'stroke-width': 3, 'stroke-dasharray': '6 6' }, ghost);
    const gS = el('line', { stroke: C.blue, 'stroke-width': 3, 'stroke-dasharray': '6 6' }, ghost);
    const D = el('line', { stroke: C.orange, 'stroke-width': 4, 'stroke-linecap': 'round' }, s);
    const S = el('line', { stroke: C.blue, 'stroke-width': 4, 'stroke-linecap': 'round' }, s);
    const lD = el('text', { class: 'wg-t', fill: C.orange, 'font-weight': 700 }, s, 'procura');
    const lS = el('text', { class: 'wg-t', fill: C.blue, 'font-weight': 700 }, s, 'oferta');
    const gh = el('line', { stroke: C.muted, 'stroke-dasharray': '4 4' }, s), gv = el('line', { stroke: C.muted, 'stroke-dasharray': '4 4' }, s);
    const dot = el('circle', { r: 9, fill: C.navy, stroke: '#fff', 'stroke-width': 3 }, s);
    const v = { d: 50, o: 50, j: 3 };
    function lines(d, o, j) {
      const dD = (d - 50) * 0.6 - (j - 3) * 6, sS = (o - 50) * 0.6;
      return { dD, sS, Q: (80 + dD + sS) / 1.6, P: 10 - sS + 0.8 * ((80 + dD + sS) / 1.6) };
    }
    const b = lines(50, 50, 3);
    function seg(line, a, sl, label, lx) {
      // P = a + sl*Q, drawn for Q in [0,100] clipped to P in [0,100]
      let q1, q2; const pAt = q => a + sl * q;
      if (sl < 0) { q1 = Math.max(0, (a - 100) / -sl); q2 = Math.min(100, a / -sl); }
      else { q1 = Math.max(0, -a / sl); q2 = Math.min(100, (100 - a) / sl); }
      line.setAttribute('x1', X(q1)); line.setAttribute('y1', Y(pAt(q1))); line.setAttribute('x2', X(q2)); line.setAttribute('y2', Y(pAt(q2)));
      if (label) { const qq = sl < 0 ? q1 : q2; label.setAttribute('x', X(qq) + (sl < 0 ? 12 : -60)); label.setAttribute('y', Y(pAt(qq)) + (sl < 0 ? 4 : -10)); }
    }
    seg(gD, 90, -0.8); seg(gS, 10, 0.8);
    const read = document.createElement('div'); read.className = 'wg-read'; w.appendChild(read);
    const ctr = document.createElement('div'); ctr.className = 'wg-ctr'; w.appendChild(ctr);
    function paint() {
      const r = lines(v.d, v.o, v.j);
      seg(D, 90 + r.dD, -0.8, lD); seg(S, 10 - r.sS, 0.8, lS);
      dot.setAttribute('cx', X(r.Q)); dot.setAttribute('cy', Y(r.P));
      gh.setAttribute('x1', 60); gh.setAttribute('x2', X(r.Q)); gh.setAttribute('y1', Y(r.P)); gh.setAttribute('y2', Y(r.P));
      gv.setAttribute('x1', X(r.Q)); gv.setAttribute('x2', X(r.Q)); gv.setAttribute('y1', Y(r.P)); gv.setAttribute('y2', 320);
      const dp = (r.P / b.P - 1) * 100, dq = (r.Q / b.Q - 1) * 100;
      read.innerHTML = '<span>Preço: <b>' + (dp >= 0 ? '+' : '') + nf(dp) + '%</b></span><span>Casas vendidas: <b>' + (dq >= 0 ? '+' : '') + nf(dq) + '%</b></span><span class="muted">face ao ponto de partida (tracejado)</span>';
    }
    slider(ctr, { label: 'Procura (famílias, imigração, turismo)', min: 0, max: 100, value: 50, fmt: x => x < 35 ? 'baixa' : x > 65 ? 'alta' : 'média', onInput: x => { v.d = x; paint(); } });
    slider(ctr, { label: 'Oferta (casas novas no mercado)', min: 0, max: 100, value: 50, fmt: x => x < 35 ? 'pouca' : x > 65 ? 'muita' : 'média', onInput: x => { v.o = x; paint(); } });
    slider(ctr, { label: 'Juros do crédito à habitação', min: 0, max: 8, step: .5, value: 3, fmt: x => nf(x, 1) + '%', onInput: x => { v.j = x; paint(); } });
    paint();
  };

  /* ---------- 3. renda: bid rent by distance to the centre ------------ */
  W.renda = function (w) {
    const s = svg(1000, 380, w, 'Renda locativa: quanto cada atividade está disposta a pagar pelo solo, conforme a distância ao centro');
    const X = d => 70 + d * 27, Y = r => 330 - r * 2.7;
    el('line', { x1: 70, y1: 330, x2: 620, y2: 330, stroke: C.navy, 'stroke-width': 2 }, s);
    el('line', { x1: 70, y1: 330, x2: 70, y2: 20, stroke: C.navy, 'stroke-width': 2 }, s);
    for (let d = 0; d <= 20; d += 5) { el('text', { x: X(d), y: 352, 'text-anchor': 'middle', class: 'wg-s' }, s, d + ' km'); }
    el('text', { x: 620, y: 374, 'text-anchor': 'end', class: 'wg-s' }, s, 'distância ao centro →');
    el('text', { x: 78, y: 30, class: 'wg-s' }, s, '↑ quanto se paga pelo solo (renda locativa)');
    const uses = [
      { k: 'com', name: 'comércio e escritórios', col: C.orange, a: 100, b: 9, bump: 34 },
      { k: 'hab', name: 'habitação', col: C.blue, a: 62, b: 3.1, bump: 16 },
      { k: 'ind', name: 'indústria e armazéns', col: C.muted, a: 36, b: 1.4, bump: 0 },
      { k: 'agr', name: 'agricultura', col: C.green, a: 14, b: 0.1, bump: 0 }
    ];
    let metro = null;
    const R = (u, d) => Math.max(0, u.a - u.b * d + (metro !== null ? u.bump * Math.exp(-Math.pow(d - metro, 2) / 1.4) : 0));
    const env = el('path', { fill: C.cream, stroke: 'none' }, s);
    uses.forEach(u => { u.p = el('path', { fill: 'none', stroke: u.col, 'stroke-width': 4, 'stroke-linecap': 'round', class: 'wg-curve' }, s); u.l = el('text', { class: 'wg-t', fill: u.col, 'font-weight': 700 }, s, u.name); });
    const strip = el('g', {}, s);
    const mk = el('g', { class: 'wg-hide' }, s);
    el('line', { x1: 0, y1: 40, x2: 0, y2: 330, stroke: C.navy, 'stroke-dasharray': '3 5' }, mk);
    el('circle', { cx: 0, cy: 330, r: 9, fill: C.navy }, mk);
    el('text', { x: 0, y: 324, 'text-anchor': 'middle', fill: '#fff', class: 'wg-s', 'font-weight': 700 }, mk, 'M');
    // top view: rings
    const top = el('g', { transform: 'translate(810,185)' }, s);
    el('text', { x: 0, y: -160, 'text-anchor': 'middle', class: 'wg-t', 'font-weight': 700 }, top, 'Vista de cima: quem fica com cada anel?');
    const rings = el('g', {}, top);
    const cbd = el('text', { x: 0, y: 5, 'text-anchor': 'middle', class: 'wg-s', fill: '#fff', 'font-weight': 700 }, top, 'centro');
    const ctr = document.createElement('div'); ctr.className = 'wg-ctr'; w.appendChild(ctr);
    const metroBox = buttons(ctr, [
      { t: 'Sem metro', key: 'off', cls: 'ghost sel', f: (b, box) => { metro = null; pick(box, b); paint(); } },
      { t: 'Nova estação de metro a 8 km', key: '8', f: (b, box) => { metro = 8; pick(box, b); paint(); } },
      { t: 'Estação a 13 km', key: '13', f: (b, box) => { metro = 13; pick(box, b); paint(); } }
    ]);
    let step = 99;
    function path(u) { let d = ''; for (let x = 0; x <= 20; x += .25) d += (x ? 'L' : 'M') + X(x).toFixed(1) + ',' + Y(R(u, x)).toFixed(1); return d; }
    function winner(x, shown) { let best = null, v = -1; shown.forEach(u => { const r = R(u, x); if (r > v) { v = r; best = u; } }); return best; }
    function paint() {
      const shown = uses.filter((u, i) => step >= i + 1);
      uses.forEach((u, i) => {
        u.p.setAttribute('d', path(u)); u.p.style.opacity = step >= i + 1 ? 1 : 0;
        const lx = { com: 3.2, hab: 8.5, ind: 9.6, agr: 16.4 }[u.k];
        u.l.setAttribute('x', X(lx) + 6); u.l.setAttribute('y', Y(R(u, lx)) + (u.k === 'agr' ? 24 : -10)); u.l.style.opacity = step >= i + 1 ? 1 : 0;
      });
      // envelope (who wins) shaded, from step 5
      let d = 'M' + X(0) + ',330', segs = [];
      for (let x = 0; x <= 20; x += .25) { const u = winner(x, uses); d += 'L' + X(x).toFixed(1) + ',' + Y(R(u, x)).toFixed(1); segs.push(u); }
      env.setAttribute('d', d + 'L' + X(20) + ',330Z'); env.style.opacity = step >= 5 ? 1 : 0;
      strip.innerHTML = ''; rings.innerHTML = '';
      if (step >= 5) {
        for (let i = 0; i < segs.length; i++) el('rect', { x: X(i * .25), y: 334, width: 7.2, height: 8, fill: segs[i].col }, strip);
        for (let x = 20; x > 0; x -= .25) { const u = winner(x - .125, uses); el('circle', { r: x * 7.2, fill: u.col, opacity: .9 }, rings); }
        el('circle', { r: 16, fill: C.navy }, rings);
      } else {
        el('circle', { r: 144, fill: C.cream, stroke: C.line }, rings); el('circle', { r: 16, fill: C.navy }, rings);
      }
      mk.classList.toggle('wg-hide', metro === null); if (metro !== null) mk.setAttribute('transform', 'translate(' + X(metro) + ',0)');
      metroBox.style.visibility = step >= 6 ? 'visible' : 'hidden';
    }
    onStep(w, k => { step = k; paint(); });
  };

  /* ---------- 4. quinze: the 15-minute city ---------------------------- */
  W.quinze = function (w) {
    const PX = 92, CX = 330, CY = 210;
    const pts = [
      ['padaria', .25, -.2], ['farmácia', -.3, .5], ['escola básica', .65, .62], ['jardim', -.6, -.5], ['mercado', .9, -.4],
      ['centro de saúde', -1.15, .05], ['biblioteca', 1.3, .8], ['estação', -1.5, -.9], ['ginásio', 1.6, -1.1], ['escola secundária', -2.1, .9],
      ['cinema', 2.4, .3], ['hospital', -2.7, -1.2], ['centro de emprego', 2.9, -1.6], ['universidade', -3.3, 1.6]
    ];
    const s = svg(660, 420, w, 'Mapa à volta de casa com os equipamentos e um círculo do que se alcança');
    el('rect', { x: 0, y: 0, width: 660, height: 420, fill: C.white }, s);
    for (let x = 15; x < 660; x += 46) el('line', { x1: x, y1: 0, x2: x + 30, y2: 420, stroke: C.gl, 'stroke-width': 9 }, s);
    for (let y = 18; y < 420; y += 52) el('line', { x1: 0, y1: y, x2: 660, y2: y - 20, stroke: C.gl, 'stroke-width': 9 }, s);
    const circ = el('circle', { cx: CX, cy: CY, r: 50, fill: 'rgba(240,166,115,.18)', stroke: C.orange, 'stroke-width': 3, 'stroke-dasharray': '8 6', class: 'wg-ring' }, s);
    const items = pts.map(p => {
      const g = el('g', { transform: `translate(${CX + p[1] * PX},${CY + p[2] * PX})` }, s);
      const c = el('circle', { r: 11, fill: C.gray, stroke: '#fff', 'stroke-width': 2 }, g);
      const right = CX + p[1] * PX > 470; const t = el('text', { x: right ? -15 : 15, y: 5, 'text-anchor': right ? 'end' : 'start', class: 'wg-s', fill: C.muted }, g, p[0]);
      return { d: Math.hypot(p[1], p[2]), c, t, n: p[0] };
    });
    const hg = el('g', {}, s); house(hg, CX - 14, CY - 22, 28, 30, C.navy, C.navy);
    el('text', { x: CX, y: CY + 26, 'text-anchor': 'middle', class: 'wg-s', 'font-weight': 700 }, s, 'a tua casa');
    const read = document.createElement('div'); read.className = 'wg-read'; w.appendChild(read);
    const ctr = document.createElement('div'); ctr.className = 'wg-ctr'; w.appendChild(ctr);
    let speed = 5, min = 15;
    buttons(ctr, [
      { t: 'A pé (5 km/h)', cls: 'ghost sel', f: (b, box) => { speed = 5; pick(box, b); paint(); } },
      { t: 'Bicicleta (15 km/h)', f: (b, box) => { speed = 15; pick(box, b); paint(); } },
      { t: 'Carro na cidade (20 km/h)', f: (b, box) => { speed = 20; pick(box, b); paint(); } }
    ]);
    slider(ctr, { label: 'Minutos', min: 5, max: 30, step: 5, value: 15, fmt: x => x + ' min', onInput: x => { min = x; paint(); } });
    function paint() {
      const km = speed * min / 60; circ.setAttribute('r', Math.min(900, km * PX));
      let n = 0;
      items.forEach(i => { const ok = i.d <= km; if (ok) n++; i.c.setAttribute('fill', ok ? C.orange : C.gray); i.t.setAttribute('fill', ok ? C.navy : C.muted); i.t.setAttribute('font-weight', ok ? 700 : 400); });
      read.innerHTML = '<span>Raio: <b>' + nf(km, 1) + ' km</b></span><span>Equipamentos ao alcance: <b>' + n + ' de ' + items.length + '</b></span>';
    }
    paint();
  };

  /* ---------- 5. pendular: commuting over one day ---------------------- */
  W.pendular = function (w) {
    const s = svg(760, 430, w, 'Área metropolitana: movimentos pendulares ao longo do dia');
    el('rect', { x: 0, y: 0, width: 760, height: 430, fill: C.white }, s);
    el('path', { d: 'M0,300 C120,280 220,330 330,300 C420,276 470,250 560,262 C640,272 700,240 760,236 L760,268 C700,272 640,300 560,292 C470,282 420,306 330,330 C220,360 120,310 0,332 Z', fill: C.bl }, s);
    el('text', { x: 600, y: 286, class: 'wg-s', fill: C.blue, 'font-style': 'italic' }, s, 'rio');
    const centre = { x: 360, y: 250, n: 'Centro' };
    const subs = [
      { n: 'Sintra', x: 90, y: 200 }, { n: 'Amadora', x: 230, y: 205 }, { n: 'Odivelas', x: 300, y: 130 }, { n: 'Loures', x: 410, y: 95 },
      { n: 'Vila Franca', x: 600, y: 90 }, { n: 'Cascais', x: 60, y: 285 }, { n: 'Oeiras', x: 190, y: 268 },
      { n: 'Almada', x: 340, y: 385 }, { n: 'Seixal', x: 470, y: 395 }, { n: 'Barreiro', x: 610, y: 360 }
    ];
    subs.forEach(p => { el('line', { x1: p.x, y1: p.y, x2: centre.x, y2: centre.y, stroke: C.gl, 'stroke-width': 6, 'stroke-linecap': 'round' }, s); });
    subs.forEach(p => { el('circle', { cx: p.x, cy: p.y, r: 16, fill: C.cream, stroke: C.line }, s); el('text', { x: p.x, y: p.y - 22, 'text-anchor': 'middle', class: 'wg-s' }, s, p.n); });
    el('circle', { cx: centre.x, cy: centre.y, r: 36, fill: C.navy }, s);
    el('text', { x: centre.x, y: centre.y + 5, 'text-anchor': 'middle', class: 'wg-s', fill: '#fff', 'font-weight': 700 }, s, 'centro');
    const r = rng(7), people = [];
    const dots = el('g', {}, s);
    for (let i = 0; i < 180; i++) {
      const home = subs[Math.floor(r() * subs.length)];
      const car = r() < 0.7;
      const dur = (car ? .45 : .8) + r() * .3;
      people.push({ home, car, out: 7.6 + gauss(r) * .55, back: 17.8 + gauss(r) * .7, dur, j: (r() - .5) * 14, k: (r() - .5) * 14,
        c: el('circle', { r: 4.2, fill: car ? C.orange : C.blue, opacity: .9 }, dots) });
    }
    const clock = el('text', { x: 740, y: 40, 'text-anchor': 'end', class: 'wg-big' }, s, '');
    const inCentre = el('text', { x: 740, y: 422, 'text-anchor': 'end', class: 'wg-t', 'font-weight': 700 }, s, '');
    el('circle', { cx: 24, cy: 26, r: 6, fill: C.orange }, s); el('text', { x: 36, y: 31, class: 'wg-s' }, s, 'automóvel');
    el('circle', { cx: 24, cy: 48, r: 6, fill: C.blue }, s); el('text', { x: 36, y: 53, class: 'wg-s' }, s, 'transporte coletivo');
    let t = 6, playing = false, last = 0;
    const ctr = document.createElement('div'); ctr.className = 'wg-ctr'; w.appendChild(ctr);
    const inp = slider(ctr, { label: 'Hora do dia', min: 5, max: 22, step: .25, value: 6, fmt: x => String(Math.floor(x)).padStart(2, '0') + ':' + String(Math.round((x % 1) * 60)).padStart(2, '0'), onInput: x => { t = x; paint(); } });
    const pb = buttons(ctr, [{ t: '▶ Ver o dia a passar', cls: 'orange', f: b => { playing = !playing; b.textContent = playing ? '❚❚ Pausa' : '▶ Ver o dia a passar'; if (playing && t >= 21.9) t = 5; last = 0; requestAnimationFrame(loop); } }]);
    function pos(pp, tt) {
      // 0 = at home, 1 = in the centre
      let f;
      if (tt < pp.out) f = 0; else if (tt < pp.out + pp.dur) f = (tt - pp.out) / pp.dur;
      else if (tt < pp.back) f = 1; else if (tt < pp.back + pp.dur) f = 1 - (tt - pp.back) / pp.dur; else f = 0;
      return f;
    }
    function paint() {
      let n = 0, moving = 0;
      people.forEach(pp => {
        const f = pos(pp, t); if (f === 1) n++; else if (f > 0) moving++;
        const x = pp.home.x + (centre.x - pp.home.x) * f + (f === 1 ? pp.j : pp.j * .4), y = pp.home.y + (centre.y - pp.home.y) * f + (f === 1 ? pp.k : pp.k * .4);
        pp.c.setAttribute('cx', x.toFixed(1)); pp.c.setAttribute('cy', y.toFixed(1));
      });
      clock.textContent = String(Math.floor(t)).padStart(2, '0') + ':' + String(Math.round((t % 1) * 60) % 60).padStart(2, '0');
      inCentre.textContent = n + ' no centro · ' + moving + ' a caminho';
      inp.value = t;
      inp.parentNode.querySelector('output').textContent = clock.textContent;
    }
    function loop(ts) {
      if (!playing) return;
      if (!visible(w)) { playing = false; pb.firstChild.textContent = '▶ Ver o dia a passar'; return; }
      if (last) t += (ts - last) / 1000 * 1.1; last = ts;
      if (t >= 22) { t = 22; playing = false; pb.firstChild.textContent = '▶ Ver o dia a passar'; }
      paint(); if (playing) requestAnimationFrame(loop);
    }
    paint();
  };

  /* ---------- 6. elastico: km, minutes, euros -------------------------- */
  W.elastico = function (w) {
    const places = [
      { n: 'Bairro com metro', km: 8, min: 15, eur: 1.9, col: C.blue },
      { n: 'Cidade com comboio', km: 25, min: 30, eur: 3.5, col: C.green },
      { n: 'Subúrbio de carro, na hora de ponta', km: 10, min: 45, eur: 6.5, col: C.orange },
      { n: 'Aldeia com um autocarro de 2 em 2 horas', km: 12, min: 70, eur: 2.6, col: C.muted }
    ];
    const s = svg(900, 300, w, 'Quatro lugares e a distância ao centro em quilómetros, minutos ou euros');
    el('line', { x1: 70, y1: 40, x2: 70, y2: 270, stroke: C.navy, 'stroke-width': 3 }, s);
    el('text', { x: 70, y: 30, 'text-anchor': 'middle', class: 'wg-t', 'font-weight': 700 }, s, 'centro');
    const axis = el('line', { x1: 70, y1: 270, x2: 870, y2: 270, stroke: C.line, 'stroke-width': 2 }, s);
    const ticks = el('g', {}, s);
    const gs = places.map((p, i) => {
      const y = 70 + i * 52;
      el('line', { x1: 70, y1: y, x2: 870, y2: y, stroke: C.cream, 'stroke-width': 10, 'stroke-linecap': 'round' }, s);
      const g = el('g', { class: 'wg-move' }, s);
      el('circle', { cx: 0, cy: y, r: 13, fill: p.col }, g);
      const t = el('text', { x: 0, y: y - 18, 'text-anchor': 'middle', class: 'wg-s', 'font-weight': 700 }, g, p.n);
      const v = el('text', { x: 0, y: y + 5, 'text-anchor': 'middle', class: 'wg-s', fill: '#fff', 'font-weight': 700 }, g, '');
      return { g, v, p, t };
    });
    let mode = 'km';
    const scale = { km: [32, 'km'], min: [80, 'min'], eur: [8, '€'] };
    function paint() {
      const [mx, u] = scale[mode];
      ticks.innerHTML = '';
      for (let k = 0; k <= 4; k++) { const val = mx * k / 4; el('text', { x: 70 + 800 * k / 4, y: 292, 'text-anchor': 'middle', class: 'wg-s' }, ticks, nf(val, mode === 'eur' ? 0 : 0) + ' ' + u); }
      gs.forEach(o => {
        const val = o.p[mode], x = 70 + 800 * val / mx;
        o.g.style.transform = 'translateX(' + x + 'px)';
        o.v.textContent = '';
        o.t.textContent = o.p.n + ' · ' + nf(val, mode === 'eur' ? 2 : 0).replace(',00', '') + ' ' + u;
        const anchor = x > 700 ? 'end' : x < 160 ? 'start' : 'middle'; o.t.setAttribute('text-anchor', anchor); o.t.setAttribute('x', anchor === 'end' ? 12 : anchor === 'start' ? -12 : 0);
      });
    }
    buttons(w, [
      { t: 'Distância absoluta (km)', cls: 'ghost sel', f: (b, box) => { mode = 'km'; pick(box, b); paint(); } },
      { t: 'Distância-tempo (minutos)', f: (b, box) => { mode = 'min'; pick(box, b); paint(); } },
      { t: 'Distância-custo (euros por viagem)', f: (b, box) => { mode = 'eur'; pick(box, b); paint(); } }
    ]);
    paint();
  };

  /* ---------- 7. crescimento: a metropolis from 1900 to 2025 ----------- */
  W.crescimento = function (w) {
    const s = svg(760, 440, w, 'Crescimento de uma área metropolitana entre 1900 e 2025');
    el('rect', { x: 0, y: 0, width: 760, height: 440, fill: C.white }, s);
    el('path', { d: 'M0,330 C150,300 260,350 380,318 C470,295 560,300 760,280 L760,330 C560,350 470,345 380,360 C260,390 150,350 0,372 Z', fill: C.bl }, s);
    const cx = 380, cy = 300;
    const axes = [[-160, -1], [-110, -18], [-50, -95], [10, -150], [60, -38], [200, -10]]; // directions (dx,dy) of rail lines
    const rails = el('g', { opacity: 0 }, s);
    axes.slice(0, 4).forEach(a => el('line', { x1: cx, y1: cy, x2: cx + a[0] * 2.4, y2: cy + a[1] * 2.4, stroke: C.muted, 'stroke-width': 2, 'stroke-dasharray': '10 4' }, rails));
    const roads = el('g', { opacity: 0 }, s);
    el('path', { d: `M${cx - 210},${cy - 10} C${cx - 230},${cy - 190} ${cx + 160},${cy - 230} ${cx + 250},${cy - 30}`, fill: 'none', stroke: C.acc, 'stroke-width': 4 }, roads);
    el('path', { d: `M${cx - 330},${cy - 40} C${cx - 360},${cy - 290} ${cx + 250},${cy - 330} ${cx + 360},${cy - 60}`, fill: 'none', stroke: C.acc, 'stroke-width': 4 }, roads);
    const r = rng(11), dots = [], g = el('g', {}, s);
    function add(x, y, year, kind) { if (y > 318 && y < 362 && x > 0) return; dots.push({ x, y, year, kind, c: null }); }
    for (let i = 0; i < 260; i++) { const a = r() * Math.PI, d = Math.sqrt(r()) * (20 + 70 * r()); add(cx + Math.cos(a) * d * 1.3, cy - Math.sin(a) * d, 1872 + d * .7 + r() * 12, 'core'); }
    axes.slice(0, 4).forEach(a => { for (let i = 0; i < 90; i++) { const t = .3 + r() * 1.9; add(cx + a[0] * t + gauss(r) * 9, cy + a[1] * t + gauss(r) * 9, 1945 + t * 18 + r() * 12, 'axis'); } });
    for (let i = 0; i < 260; i++) { const a = r() * Math.PI, d = 100 + r() * 120; add(cx + Math.cos(a) * d * 1.45, cy - Math.sin(a) * d, 1965 + (d - 100) * .2 + r() * 20, 'fill'); }
    for (let k = 0; k < 26; k++) { const a = r() * Math.PI, d = 220 + r() * 120, px = cx + Math.cos(a) * d * 1.5, py = cy - Math.sin(a) * d * .95; for (let i = 0; i < 9; i++) add(px + gauss(r) * 8, py + gauss(r) * 6, 1988 + r() * 35, 'peri'); }
    // south bank
    for (let i = 0; i < 120; i++) add(cx - 160 + r() * 380, 375 + r() * 60, 1960 + r() * 50, 'axis');
    dots.sort((a, b) => a.year - b.year).forEach(d => { d.c = el('circle', { cx: d.x.toFixed(1), cy: d.y.toFixed(1), r: d.kind === 'peri' ? 3.4 : 3, fill: C.navy, opacity: 0 }, g); });
    const yearT = el('text', { x: 740, y: 44, 'text-anchor': 'end', class: 'wg-big' }, s, '1900');
    const era = document.createElement('div'); era.className = 'wg-read'; w.appendChild(era);
    const ctr = document.createElement('div'); ctr.className = 'wg-ctr'; w.appendChild(ctr);
    let Y = 1900, playing = false, last = 0;
    const inp = slider(ctr, { label: 'Ano', min: 1900, max: 2025, step: 1, value: 1900, onInput: x => { Y = x; paint(); } });
    const pb = buttons(ctr, [{ t: '▶ Ver a cidade crescer', cls: 'orange', f: b => { playing = !playing; b.textContent = playing ? '❚❚ Pausa' : '▶ Ver a cidade crescer'; if (playing && Y >= 2025) Y = 1900; last = 0; requestAnimationFrame(loop); } }]);
    const eras = [
      [1900, 'Cidade compacta', 'quase toda a gente vive e trabalha perto do centro; desloca-se a pé ou de elétrico'],
      [1950, 'Suburbanização', 'o comboio leva a cidade para fora: crescem bairros ao longo das linhas (crescimento tentacular)'],
      [1975, 'Expansão em mancha de óleo', 'os espaços entre as linhas enchem-se; os subúrbios tornam-se dormitórios'],
      [1990, 'Periurbanização', 'autoestradas e automóvel: casas espalhadas no campo, longe de tudo; cada ida ao centro depende do carro']
    ];
    function paint() {
      dots.forEach(d => { const on = d.year <= Y; const fresh = on && Y - d.year < 6; d.c.setAttribute('opacity', on ? (fresh ? 1 : .8) : 0); d.c.setAttribute('fill', fresh ? C.orange : d.kind === 'peri' ? C.green : C.navy); });
      rails.setAttribute('opacity', Y >= 1890 ? clamp((Y - 1890) / 30, 0, .7) : 0);
      roads.setAttribute('opacity', clamp((Y - 1985) / 10, 0, 1));
      yearT.textContent = Y;
      let e = eras[0]; eras.forEach(x => { if (Y >= x[0]) e = x; });
      era.innerHTML = '<span><b>' + e[1] + '</b>: ' + e[2] + '</span>';
      inp.value = Y; inp.parentNode.querySelector('output').textContent = Y;
    }
    function loop(ts) {
      if (!playing) return;
      if (!visible(w)) { playing = false; pb.firstChild.textContent = '▶ Ver a cidade crescer'; return; }
      Y = Math.min(2025, Y + 1);
      if (Y >= 2025) { playing = false; pb.firstChild.textContent = '▶ Ver a cidade crescer'; }
      paint(); if (playing) setTimeout(() => requestAnimationFrame(loop), 70);
    }
    paint();
  };

  /* ---------- 8. turismo: short-term rentals (illustrative model) ------ */
  W.turismo = function (w) {
    const s = svg(820, 250, w, 'Um bairro de 40 casas e quantas passam a alojamento local');
    el('rect', { x: 0, y: 0, width: 820, height: 250, fill: C.white }, s);
    const order = Array.from({ length: 40 }, (_, i) => i).sort((a, b) => ((a * 17) % 40) - ((b * 17) % 40));
    const hs = [];
    for (let i = 0; i < 40; i++) {
      const x = 14 + (i % 10) * 80, y = 10 + Math.floor(i / 10) * 60;
      const g = el('g', {}, s);
      el('path', { d: `M${x},${y + 18} L${x + 30},${y} L${x + 60},${y + 18} Z`, fill: C.orange }, g);
      const b = el('rect', { x: x + 4, y: y + 17, width: 52, height: 30, rx: 2, fill: C.cream, stroke: C.orange }, g);
      const t = el('text', { x: x + 30, y: y + 41, 'text-anchor': 'middle', 'font-size': 20 }, g, '');
      hs.push({ b, t });
    }
    const read = document.createElement('div'); read.className = 'wg-read'; w.appendChild(read);
    const ctr = document.createElement('div'); ctr.className = 'wg-ctr'; w.appendChild(ctr);
    function paint(pct) {
      const k = Math.round(40 * pct / 100);
      order.forEach((idx, j) => { const al = j < k; hs[idx].b.setAttribute('fill', al ? C.bl : C.cream); hs[idx].b.setAttribute('stroke', al ? C.blue : C.orange); hs[idx].t.textContent = al ? '🧳' : '👪'; });
      const f = pct / 100;
      const rent = 100 * (1 + 1.1 * Math.pow(f, 1.25));
      const res = Math.round((40 - k) * 2.3);
      const shops = Math.max(0, Math.round(6 - Math.max(0, f - .15) * 14));
      const jobs = Math.round(k * 0.6);
      read.innerHTML = '<span>Residentes: <b>' + res + '</b></span><span>Renda pedida a quem procura casa: <b>' + nf(rent) + '</b> (era 100)</span><span>Comércio de bairro: <b>' + shops + '</b> lojas</span><span>Empregos no turismo (limpeza, receção, manutenção): <b>' + jobs + '</b></span>';
    }
    slider(ctr, { label: 'Casas em alojamento local', min: 0, max: 60, step: 5, value: 0, fmt: x => x + '%', onInput: paint });
    paint(0);
  };

  /* ---------- 9. ruralurb: from village to city ------------------------- */
  W.ruralurb = function (w) {
    const s = svg(820, 300, w, 'Paisagem que passa de aldeia a cidade');
    const sky = el('rect', { x: 0, y: 0, width: 820, height: 300, fill: '#FBFAF7' }, s);
    el('rect', { x: 0, y: 240, width: 820, height: 60, fill: C.gl }, s);
    const fields = el('g', {}, s), trees = el('g', {}, s), blds = el('g', {}, s);
    const r = rng(5);
    const F = Array.from({ length: 10 }, (_, i) => ({ x: i * 82, c: i % 2 ? '#C9D7A8' : '#B5C98A' }));
    const T = Array.from({ length: 26 }, () => ({ x: r() * 800 + 10, y: 236 - r() * 8, s: .7 + r() * .6, th: r() }));
    const B = Array.from({ length: 40 }, (_, i) => ({ x: 20 + ((i * 53) % 780), w: 26 + r() * 30, h: 1 + r(), th: i / 40 }));
    const read = document.createElement('div'); read.className = 'wg-read'; w.appendChild(read);
    const ctr = document.createElement('div'); ctr.className = 'wg-ctr'; w.appendChild(ctr);
    const labels = ['aldeia', 'vila', 'cidade média', 'grande cidade'];
    function paint(v) {
      const f = v / 100;
      fields.innerHTML = ''; trees.innerHTML = ''; blds.innerHTML = '';
      F.forEach((p, i) => { if (i / 10 >= f * 1.1) el('rect', { x: p.x, y: 240, width: 80, height: 60, fill: p.c }, fields); });
      T.forEach(t => { if (t.th > f * .95) { el('rect', { x: t.x - 2, y: t.y - 10 * t.s, width: 4, height: 12 * t.s, fill: '#7A5A3A' }, trees); el('circle', { cx: t.x, cy: t.y - 16 * t.s, r: 10 * t.s, fill: C.green }, trees); } });
      const n = Math.round(5 + f * 35);
      B.slice(0, n).forEach(b => {
        const h = 22 + Math.pow(f, 1.6) * 170 * b.h * (b.th < .3 ? 1.3 : .8);
        if (f < .25) house(blds, b.x, 240 - 30, b.w * .8, 30, C.cream, C.orange);
        else {
          el('rect', { x: b.x, y: 240 - h, width: b.w, height: h, fill: f > .7 ? mix(C.bl, C.navy, b.h - 1) : C.cream, stroke: f > .7 ? C.blue : C.orange, 'stroke-width': 1.2 }, blds);
          for (let yy = 240 - h + 8; yy < 232; yy += 14) for (let xx = b.x + 5; xx < b.x + b.w - 6; xx += 10) el('rect', { x: xx, y: yy, width: 4, height: 6, fill: f > .7 ? '#F6E7B0' : C.peach }, blds);
        }
      });
      const lab = labels[Math.min(3, Math.floor(f * 3.999))];
      const lvl = (a, b, c) => f < .33 ? a : f < .66 ? b : c;
      read.innerHTML = '<span><b>' + lab + '</b></span><span>Densidade: <b>' + lvl('baixa', 'média', 'muito alta') + '</b></span><span>Quem trabalha na agricultura: <b>' + lvl('muitos', 'alguns', 'quase ninguém') + '</b></span><span>Serviços (saúde, escolas, lojas, cultura): <b>' + lvl('poucos', 'alguns', 'muitos e variados') + '</b></span>';
    }
    slider(ctr, { label: 'De rural a urbano', min: 0, max: 100, value: 0, fmt: x => x + '%', onInput: paint });
    paint(0);
  };

  /* ---------- 10. rua: one street through time ------------------------- */
  W.rua = function (w) {
    const eras = {
      1975: { shops: ['mercearia', 'sapateiro', 'tasca', 'retrosaria', 'barbeiro', 'padaria'], res: 12, tur: 0, fac: C.cream, note: 'Rua cheia de moradores; quase tudo se compra a pé.' },
      1995: { shops: ['mercearia', '— vazia —', 'tasca', '— vazia —', 'barbeiro', 'pastelaria'], res: 6, tur: 0, fac: '#E4DED2', note: 'Os jovens mudaram-se para os subúrbios; prédios degradados, lojas fechadas.' },
      2012: { shops: ['mercearia', 'hostel', 'tasca', 'souvenirs', 'barbeiro', 'café'], res: 5, tur: 4, fac: C.ol, note: 'Reabilitação dos prédios; chegam os turistas.' },
      2025: { shops: ['minimercado', 'alojamento local', 'restaurante turístico', 'souvenirs', 'barbearia', 'café de especialidade'], res: 3, tur: 10, fac: '#FFFFFF', note: 'Prédios renovados e caros; poucos moradores antigos ficaram.' }
    };
    const s = svg(900, 300, w, 'Uma rua imaginária de um bairro histórico em quatro épocas');
    el('rect', { x: 0, y: 250, width: 900, height: 50, fill: '#E2DCD0' }, s);
    const fronts = [], sTxt = [];
    for (let i = 0; i < 6; i++) {
      const x = 12 + i * 148;
      fronts.push(el('rect', { x, y: 40, width: 140, height: 210, fill: C.cream, stroke: C.line, 'stroke-width': 1.5, class: 'wg-fade' }, s));
      for (let k = 0; k < 3; k++) { el('rect', { x: x + 16 + k * 40, y: 60, width: 26, height: 36, fill: C.bl, stroke: C.line }, s); el('rect', { x: x + 16 + k * 40, y: 110, width: 26, height: 36, fill: C.bl, stroke: C.line }, s); }
      el('rect', { x: x + 10, y: 168, width: 120, height: 26, rx: 4, fill: C.navy }, s);
      sTxt.push(el('text', { x: x + 70, y: 186, 'text-anchor': 'middle', class: 'wg-s', fill: '#fff', 'font-weight': 700 }, s, ''));
      el('rect', { x: x + 50, y: 200, width: 40, height: 50, fill: C.muted }, s);
    }
    const people = el('g', {}, s);
    const note = document.createElement('div'); note.className = 'wg-read'; w.appendChild(note);
    function paint(y) {
      const e = eras[y];
      fronts.forEach(f => f.setAttribute('fill', e.fac));
      sTxt.forEach((t, i) => { t.textContent = e.shops[i]; t.setAttribute('font-size', e.shops[i].length > 16 ? 12 : 15); });
      people.innerHTML = '';
      for (let i = 0; i < e.res; i++) person(people, 40 + i * 70, 290, .62, C.orange, i === 0);
      for (let i = 0; i < e.tur; i++) { const p = person(people, 75 + i * 80, 292, .62, C.blue, false); el('rect', { x: 10, y: -14, width: 12, height: 14, rx: 2, fill: C.navy }, p); }
      note.innerHTML = '<span><b>' + y + '</b>: ' + e.note + '</span><span>Moradores: <b>' + e.res + '</b> · Turistas: <b>' + e.tur + '</b></span>';
    }
    buttons(w, Object.keys(eras).map((y, i) => ({ t: y, cls: i ? 'ghost' : 'ghost sel', f: (b, box) => { pick(box, b); paint(y); } })));
    paint('1975');
  };

  /* ---------- 11. dialetos: Lindley Cintra's map ----------------------- */
  W.dialetos = function (w) {
    const P = ll => [(ll[0] + 9.6) * 118 + 20, (42.25 - ll[1]) * 118 + 20];
    const coast = [[-8.87, 41.87], [-8.64, 42.04], [-8.2, 42.14], [-7.9, 41.88], [-7.42, 41.98], [-6.95, 41.95], [-6.55, 41.93], [-6.2, 41.6], [-6.85, 41.05], [-6.8, 40.6], [-6.95, 40.25], [-7.0, 39.95], [-7.35, 39.65], [-7.2, 39.25], [-7.05, 38.9], [-7.25, 38.6], [-6.95, 38.2], [-7.3, 37.98], [-7.5, 37.55], [-7.42, 37.18], [-7.95, 36.98], [-8.6, 37.08], [-8.98, 37.02], [-8.8, 37.5], [-8.85, 38.0], [-8.75, 38.45], [-9.2, 38.42], [-9.0, 38.65], [-9.48, 38.72], [-9.45, 39.0], [-9.38, 39.37], [-9.05, 39.6], [-8.9, 40.1], [-8.75, 40.65], [-8.68, 41.15], [-8.82, 41.6], [-8.87, 41.87]];
    const divide = [[-8.72, 40.5], [-8.2, 40.42], [-7.75, 40.3], [-7.35, 40.15], [-7.0, 40.05]];
    const s = svg(760, 680, w, 'Mapa de Portugal com as zonas dos dialetos');
    const toD = pts => pts.map((p, i) => (i ? 'L' : 'M') + P(p).map(v => v.toFixed(1)).join(',')).join('') ;
    // north polygon = coast from divide start northwards to divide end; built simply by clipping with the divide polyline
    const clip = el('clipPath', { id: 'pt-clip' }, el('defs', {}, s)); el('path', { d: toD(coast) + 'Z' }, clip);
    const regions = {
      norte: { name: 'Dialetos setentrionais', col: C.blue, fea: ['não distinguem <b>b</b> de <b>v</b>: «<i>binho</i>» por «vinho»', 'no Minho e em Trás-os-Montes, «chave» soa «<i>tchave</i>»', 'o <b>s</b> soa entre <b>s</b> e <b>x</b>', 'mantêm os ditongos: «<i>ouro</i>», «<i>peixe</i>»'], ex: 'Porto, Braga, Bragança, Viseu' },
      sul: { name: 'Dialetos centro-meridionais', col: C.orange, fea: ['distinguem <b>b</b> de <b>v</b>', '«ouro» soa «<i>ôro</i>»', 'no Sul, «peixe» soa «<i>pêxe</i>»; em Lisboa, «<i>pâixe</i>»', 'no Alentejo e no Algarve: «<i>estou fazendo</i>»'], ex: 'Lisboa, Coimbra, Évora, Faro' },
      ilhas: { name: 'Dialetos insulares', col: C.green, fea: ['<b>Açores</b>: em São Miguel, um <b>u</b> como o francês (<i>ü</i>)', '<b>Madeira</b>: «<i>semilha</i>» por «batata»', 'entoação e vocabulário próprios, guardados pelo isolamento'], ex: 'Ponta Delgada, Funchal' }
    };
    const eastToWest = [...divide].reverse();
    const nPoly = el('path', { d: toD([[-10, 43], [-5, 43], [-5, 40.05], ...eastToWest, [-10, 40.5]]) + 'Z', fill: regions.norte.col, opacity: .75, 'clip-path': 'url(#pt-clip)', class: 'wg-click' }, s);
    const sPoly = el('path', { d: toD([[-10, 40.5], ...divide, [-5, 40.05], [-5, 36], [-10, 36]]) + 'Z', fill: regions.sul.col, opacity: .75, 'clip-path': 'url(#pt-clip)', class: 'wg-click' }, s);
    el('path', { d: toD(coast) + 'Z', fill: 'none', stroke: C.navy, 'stroke-width': 2 }, s);
    el('path', { d: toD(divide), fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-dasharray': '8 5' }, s);
    // islands inset
    const ins = el('g', { class: 'wg-click' }, s);
    el('rect', { x: 480, y: 450, width: 260, height: 200, rx: 10, fill: C.gl, stroke: C.line }, ins);
    el('text', { x: 610, y: 476, 'text-anchor': 'middle', class: 'wg-t', 'font-weight': 700 }, ins, 'Açores e Madeira');
    [[510, 530], [540, 538], [556, 520], [580, 546], [612, 550], [632, 538]].forEach(p => el('ellipse', { cx: p[0], cy: p[1], rx: 13, ry: 6, fill: regions.ilhas.col }, ins));
    el('ellipse', { cx: 640, cy: 610, rx: 24, ry: 10, fill: regions.ilhas.col }, ins); el('ellipse', { cx: 682, cy: 600, rx: 7, ry: 4, fill: regions.ilhas.col }, ins);
    [['Porto', -8.61, 41.15], ['Lisboa', -9.14, 38.72], ['Coimbra', -8.43, 40.2], ['Bragança', -6.76, 41.8], ['Évora', -7.91, 38.57], ['Faro', -7.93, 37.02], ['Viseu', -7.91, 40.66], ['Braga', -8.42, 41.55]].forEach(c => {
      const [x, y] = P([c[1], c[2]]); el('circle', { cx: x, cy: y, r: 5, fill: C.navy }, s); el('text', { x: x + 8, y: y + 5, class: 'wg-s', 'font-weight': 700, fill: '#fff', stroke: C.navy, 'stroke-width': 3, 'paint-order': 'stroke' }, s, c[0]);
    });
    const card = document.createElement('div'); card.className = 'wg-card'; w.appendChild(card);
    function show(k) {
      const r = regions[k];
      [nPoly, sPoly].forEach(p => p.setAttribute('opacity', .45)); ins.setAttribute('opacity', .6);
      ({ norte: nPoly, sul: sPoly, ilhas: ins })[k].setAttribute('opacity', 1);
      card.innerHTML = '<p class="label" style="color:' + r.col + '">' + r.name + '</p><ul>' + r.fea.map(f => '<li>' + f + '</li>').join('') + '</ul><p class="sm">Por exemplo: ' + r.ex + '.</p>';
    }
    nPoly.addEventListener('click', e => { e.stopPropagation(); show('norte'); });
    sPoly.addEventListener('click', e => { e.stopPropagation(); show('sul'); });
    ins.addEventListener('click', e => { e.stopPropagation(); show('ilhas'); });
    card.innerHTML = '<p class="label">Clica numa zona do mapa</p><p class="sm">A linha branca é aproximada: os sotaques mudam aos poucos, de aldeia para aldeia.</p>';
  };

  /* ---------- 12. travagem: stopping distance -------------------------- */
  W.travagem = function (w) {
    const s = svg(1000, 230, w, 'Estrada com um carro a travar e uma pessoa a atravessar');
    const M = 8.4, X0 = 40, X = m => X0 + m * M; // 110 m visible
    el('rect', { x: 0, y: 110, width: 1000, height: 80, fill: '#D9DEE3' }, s);
    for (let m = 0; m <= 110; m += 10) { el('line', { x1: X(m), y1: 196, x2: X(m), y2: 204, stroke: C.muted }, s); el('text', { x: X(m), y: 222, 'text-anchor': 'middle', class: 'wg-s' }, s, m + ' m'); }
    for (let x = 0; x < 1000; x += 40) el('rect', { x, y: 148, width: 22, height: 4, fill: '#fff' }, s);
    const zebra = el('g', {}, s);
    const ped = person(s, 0, 0, .9, C.orange, true);
    const reac = el('rect', { y: 92, height: 12, fill: C.acc, rx: 3 }, s), brk = el('rect', { y: 92, height: 12, fill: C.blue, rx: 3 }, s);
    const lr = el('text', { y: 84, class: 'wg-s', fill: C.orange, 'font-weight': 700 }, s, ''), lb = el('text', { y: 84, class: 'wg-s', fill: C.blue, 'font-weight': 700 }, s, '');
    const car = el('g', {}, s);
    el('rect', { x: -58, y: 122, width: 58, height: 26, rx: 7, fill: C.navy }, car); el('rect', { x: -44, y: 112, width: 32, height: 16, rx: 5, fill: C.navy }, car);
    el('circle', { cx: -46, cy: 150, r: 7, fill: '#333' }, car); el('circle', { cx: -12, cy: 150, r: 7, fill: '#333' }, car);
    const read = document.createElement('div'); read.className = 'wg-read'; w.appendChild(read);
    const ctr = document.createElement('div'); ctr.className = 'wg-ctr'; w.appendChild(ctr);
    let v = 50, tr = 1, mu = .7, dPed = 30, anim = null;
    const pedAt = () => { zebra.innerHTML = ''; for (let k = 0; k < 5; k++) el('rect', { x: X(dPed) - 10, y: 114 + k * 15, width: 20, height: 9, fill: '#fff' }, zebra); ped.setAttribute('transform', `translate(${X(dPed)},128) scale(.9)`); };
    function calc() { const ms = v / 3.6, dr = ms * tr, db = ms * ms / (2 * mu * 9.81); return { ms, dr, db, tot: dr + db }; }
    function paint() {
      const c = calc(); pedAt();
      reac.setAttribute('x', X(0)); reac.setAttribute('width', c.dr * M); brk.setAttribute('x', X(c.dr)); brk.setAttribute('width', Math.min(1000, c.db * M));
      lr.setAttribute('x', X(0)); lr.textContent = 'reação ' + nf(c.dr) + ' m'; lb.setAttribute('x', X(c.dr) + 4); lb.textContent = 'travagem ' + nf(c.db) + ' m';
      car.setAttribute('transform', 'translate(' + X(0) + ',0)');
      let res;
      if (c.tot <= dPed) res = '<span class="ok">Para a tempo: sobram <b>' + nf(dPed - c.tot) + ' m</b>.</span>';
      else {
        const left = dPed - c.dr; const vi = left <= 0 ? c.ms : Math.sqrt(Math.max(0, c.ms * c.ms - 2 * mu * 9.81 * left));
        const h = vi * vi / (2 * 9.81);
        res = '<span class="bad">Não para a tempo: bate a <b>' + nf(vi * 3.6) + ' km/h</b>, como cair de <b>' + nf(h, 1) + ' m</b> (cerca de ' + Math.max(1, Math.round(h / 3)) + '.º andar).</span>';
      }
      read.innerHTML = '<span>Distância total de paragem: <b>' + nf(c.tot) + ' m</b></span>' + res;
    }
    function go() {
      if (anim) cancelAnimationFrame(anim);
      const c = calc(); let t0 = null; const tb = c.ms / (mu * 9.81);
      const step = ts => {
        if (!t0) t0 = ts; const t = (ts - t0) / 1000 * (reduced ? 50 : 1);
        let d; if (t < tr) d = c.ms * t; else { const u = Math.min(t - tr, tb); d = c.dr + c.ms * u - .5 * mu * 9.81 * u * u; }
        car.setAttribute('transform', 'translate(' + X(Math.min(d, 118)) + ',0)');
        if (t < tr + tb && d < 118) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }
    slider(ctr, { label: 'Velocidade', min: 30, max: 120, step: 10, value: 50, fmt: x => x + ' km/h', onInput: x => { v = x; paint(); } });
    buttons(ctr, [
      { t: 'Atento (1 s)', cls: 'ghost sel', f: (b, box) => { tr = 1; pick(box, b); paint(); } },
      { t: 'A olhar para o telemóvel (2 s)', f: (b, box) => { tr = 2; pick(box, b); paint(); } }
    ]);
    buttons(ctr, [
      { t: 'Piso seco', cls: 'ghost sel', f: (b, box) => { mu = .7; pick(box, b); paint(); } },
      { t: 'Piso molhado', f: (b, box) => { mu = .4; pick(box, b); paint(); } }
    ]);
    buttons(ctr, [{ t: 'Travar!', cls: 'orange', f: () => { paint(); go(); } }]);
    paint();
  };

  /* ---------- 13. pdm: plan a municipality ----------------------------- */
  W.pdm = function (w) {
    const COLS = 12, ROWS = 7, S = 52;
    const USES = {
      hab: { n: 'Habitação', c: C.peach }, com: { n: 'Comércio e serviços', c: C.acc }, ind: { n: 'Indústria', c: C.gray },
      ver: { n: 'Espaço verde', c: '#8DB360' }, agr: { n: 'Agrícola', c: '#D9E4B8' }, equ: { n: 'Equipamento (saúde, escola)', c: C.bl }, '': { n: 'Apagar', c: '#fff' }
    };
    const river = new Set(); for (let c = 0; c < COLS; c++) { river.add(Math.min(ROWS - 1, 4 + Math.round(Math.sin(c / 2) * .8)) * COLS + c); }
    const grid = Array(COLS * ROWS).fill('');
    [[1, 2], [1, 3], [2, 2], [2, 3], [1, 4]].forEach(([r, c]) => { grid[r * COLS + c] = 'hab'; });
    grid[1 * COLS + 5] = 'equ';
    let brush = 'hab';
    const lay = document.createElement('div'); lay.className = 'wg-pdm'; w.appendChild(lay);
    const s = svg(COLS * S + 2, ROWS * S + 2, lay, 'Grelha para planear os usos do solo de um concelho');
    const side = document.createElement('div'); lay.appendChild(side);
    const rects = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = 1 + (i % COLS) * S, y = 1 + Math.floor(i / COLS) * S;
      const g = el('g', { class: 'wg-click' }, s);
      const r = el('rect', { x, y, width: S - 2, height: S - 2, rx: 4, stroke: C.line, fill: '#fff' }, g);
      if (river.has(i)) el('path', { d: `M${x},${y + S / 2} q${S / 4},-8 ${S / 2},0 t${S / 2},0`, stroke: C.blue, 'stroke-width': 4, fill: 'none', opacity: .7 }, g);
      const t = el('text', { x: x + S / 2 - 1, y: y + S / 2 + 6, 'text-anchor': 'middle', class: 'wg-s', 'font-weight': 700 }, g, '');
      g.addEventListener('click', e => { e.stopPropagation(); grid[i] = brush; paint(); });
      g.addEventListener('mouseenter', e => { if (e.buttons === 1) { grid[i] = brush; paint(); } });
      rects.push({ r, t });
    }
    const pal = document.createElement('div'); pal.className = 'wg-pal'; side.appendChild(pal);
    Object.keys(USES).forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'wg-sw' + (k === brush ? ' sel' : '');
      b.innerHTML = '<i style="background:' + USES[k].c + '"></i>' + USES[k].n;
      b.addEventListener('click', e => { e.stopPropagation(); brush = k; pal.querySelectorAll('.wg-sw').forEach(x => x.classList.toggle('sel', x === b)); });
      pal.appendChild(b);
    });
    const rep = document.createElement('div'); rep.className = 'wg-rep'; side.appendChild(rep);
    const near = (i, k, d) => { const r0 = Math.floor(i / COLS), c0 = i % COLS; for (let r = r0 - d; r <= r0 + d; r++) for (let c = c0 - d; c <= c0 + d; c++) { if (r < 0 || c < 0 || r >= ROWS || c >= COLS || (r === r0 && c === c0)) continue; if (k.includes(grid[r * COLS + c])) return true; } return false; };
    function paint() {
      const warn = new Set();
      let hab = 0, green = 0, close = 0, flood = 0, noise = 0, agr = 0, urb = 0;
      grid.forEach((u, i) => {
        if (u === 'hab') { hab++; if (near(i, ['ver'], 2)) green++; if (near(i, ['com', 'equ'], 2)) close++; if (river.has(i)) { flood++; warn.add(i); } if (near(i, ['ind'], 1)) { noise++; warn.add(i); } }
        if (u === 'equ' && river.has(i)) { flood++; warn.add(i); }
        if (u === 'agr' || u === 'ver' || u === '') agr++; else urb++;
      });
      rects.forEach((o, i) => { o.r.setAttribute('fill', USES[grid[i]].c); o.r.setAttribute('stroke', warn.has(i) ? C.red : C.line); o.r.setAttribute('stroke-width', warn.has(i) ? 4 : 1); o.t.textContent = warn.has(i) ? '!' : ''; o.t.setAttribute('fill', C.red); });
      const pc = (a, b) => b ? Math.round(a / b * 100) : 0;
      const bar = (label, v, good) => '<div class="wg-bar"><span>' + label + '</span><div><i style="width:' + v + '%;background:' + (good ? C.green : C.orange) + '"></i></div><b>' + v + '%</b></div>';
      rep.innerHTML = bar('Casas com jardim a 2 quadrados', pc(green, hab), pc(green, hab) >= 70) + bar('Casas com serviços perto («15 minutos»)', pc(close, hab), pc(close, hab) >= 70) + bar('Solo que fica rústico ou verde', pc(agr, COLS * ROWS), pc(agr, COLS * ROWS) >= 40) +
        (flood ? '<p class="bad">⚠ ' + flood + ' construção(ões) no leito de cheia do rio: a Reserva Ecológica Nacional não o permite.</p>' : '') +
        (noise ? '<p class="bad">⚠ ' + noise + ' casa(s) encostada(s) à indústria: ruído e poluição.</p>' : '') +
        (!flood && !noise && hab > 8 ? '<p class="ok">Sem conflitos graves. Pronto para a discussão pública!</p>' : '');
    }
    paint();
  };

  /* ---------- 14. decibeis: noise and the law -------------------------- */
  W.decibeis = function (w) {
    const ex = [[20, 'folhas a mexer'], [30, 'sussurro'], [40, 'biblioteca'], [60, 'conversa normal'], [70, 'aspirador'], [80, 'rua com trânsito intenso'], [90, 'camião a passar'], [100, 'martelo pneumático'], [110, 'concerto'], [120, 'sirene perto']];
    const s = svg(1000, 230, w, 'Escala de decibéis com exemplos e os limites da lei');
    const X = d => 40 + (d - 20) * 9.2;
    const grad = el('linearGradient', { id: 'dbg' }, el('defs', {}, s));
    el('stop', { offset: 0, 'stop-color': C.gl }, grad); el('stop', { offset: .45, 'stop-color': C.ol }, grad); el('stop', { offset: 1, 'stop-color': C.orange }, grad);
    el('rect', { x: X(20), y: 100, width: X(120) - X(20), height: 26, rx: 13, fill: 'url(#dbg)' }, s);
    ex.forEach(e => { el('line', { x1: X(e[0]), y1: 126, x2: X(e[0]), y2: 136, stroke: C.muted }, s); el('text', { x: X(e[0]), y: 152, 'text-anchor': 'middle', class: 'wg-s', 'font-weight': 700 }, s, e[0] + ' dB'); el('text', { x: X(e[0]), y: 170 + (ex.indexOf(e) % 2) * 18, 'text-anchor': 'middle', class: 'wg-s', fill: C.muted }, s, e[1]); });
    [[55, 'zona sensível (dia, tarde e noite)', C.green, 40], [65, 'zona mista', C.blue, 66], [85, 'risco para a audição, com exposição prolongada', C.red, 40]].forEach(l => {
      el('line', { x1: X(l[0]), y1: l[3] + 6, x2: X(l[0]), y2: 128, stroke: l[2], 'stroke-width': 3, 'stroke-dasharray': '5 4' }, s);
      el('text', { x: X(l[0]) + 6, y: l[3], class: 'wg-s', fill: l[2], 'font-weight': 700 }, s, '≤ ' + l[0] + ' dB · ' + l[1]);
    });
    const knob = el('g', {}, s); el('circle', { cx: 0, cy: 113, r: 18, fill: C.navy, stroke: '#fff', 'stroke-width': 4 }, knob);
    const kt = el('text', { x: 0, y: 118, 'text-anchor': 'middle', class: 'wg-s', fill: '#fff', 'font-weight': 700 }, knob, '');
    const read = document.createElement('div'); read.className = 'wg-read'; w.appendChild(read);
    const ctr = document.createElement('div'); ctr.className = 'wg-ctr'; w.appendChild(ctr);
    function paint(d) {
      knob.setAttribute('transform', 'translate(' + X(d) + ',0)'); kt.textContent = d;
      const times = Math.pow(2, (d - 60) / 10);
      read.innerHTML = d === 60 ? '<span>É o ruído de uma <b>conversa normal</b></span><span class="muted">cada +10 dB soa cerca do dobro</span>' : '<span>Parece <b>' + (times >= 1 ? nf(times, times < 10 ? 1 : 0) + ' vezes mais alto' : nf(1 / times, 1) + ' vezes mais baixo') + '</b> do que uma conversa (60 dB)</span><span class="muted">cada +10 dB soa cerca do dobro</span>';
    }
    slider(ctr, { label: 'Ruído', min: 20, max: 120, step: 5, value: 60, fmt: x => x + ' dB', onInput: paint });
    paint(60);
  };

  /* ---------- 15. pushpull: why people leave --------------------------- */
  W.pushpull = function (w) {
    const s = svg(760, 300, w, 'Balança entre ficar e partir');
    el('path', { d: 'M380,280 L350,300 L410,300 Z', fill: C.navy }, s); el('rect', { x: 374, y: 120, width: 12, height: 162, fill: C.navy }, s);
    const beam = el('g', { class: 'wg-beam' }, s);
    el('rect', { x: 120, y: 114, width: 520, height: 12, rx: 6, fill: C.navy }, beam);
    const L = el('g', {}, beam), Rg = el('g', {}, beam);
    [[L, 150, 'FICAR', C.blue], [Rg, 610, 'PARTIR', C.orange]].forEach(([g, x, t, c]) => {
      el('line', { x1: x, y1: 126, x2: x - 60, y2: 210, stroke: C.muted }, g); el('line', { x1: x, y1: 126, x2: x + 60, y2: 210, stroke: C.muted }, g);
      el('path', { d: `M${x - 80},210 Q${x},272 ${x + 80},210 Z`, fill: c }, g);
      el('text', { x, y: 232, 'text-anchor': 'middle', class: 'wg-t', fill: '#fff', 'font-weight': 700 }, g, t);
    });
    const verdict = el('text', { x: 380, y: 60, 'text-anchor': 'middle', class: 'wg-big' }, s, '');
    const ctr = document.createElement('div'); ctr.className = 'wg-ctr wg-3'; w.appendChild(ctr);
    const v = {};
    const groups = [
      ['Repulsão (no lugar de origem)', [['des', 'Falta de emprego'], ['sal', 'Salários baixos'], ['ins', 'Insegurança ou guerra']]],
      ['Atração (no destino)', [['emp', 'Emprego à espera'], ['fam', 'Família ou amigos lá'], ['vid', 'Melhor qualidade de vida']]],
      ['Obstáculos (pelo caminho)', [['cus', 'Custo da viagem e dos papéis'], ['lin', 'Língua diferente'], ['sau', 'Deixar a família']]]
    ];
    groups.forEach(([title, items]) => {
      const box = document.createElement('div'); box.className = 'card'; box.innerHTML = '<p class="label">' + title + '</p>'; ctr.appendChild(box);
      items.forEach(([k, n]) => { v[k] = 2; slider(box, { label: n, min: 0, max: 5, value: 2, fmt: x => '●'.repeat(x) || '—', onInput: x => { v[k] = x; paint(); } }); });
    });
    function paint() {
      const go = v.des + v.sal + v.ins * 1.6 + v.emp + v.fam + v.vid, stay = (v.cus + v.lin + v.sau) * 1.5 + 6;
      const diff = go - stay, ang = clamp(diff * 1.6, -14, 14);
      beam.setAttribute('transform', 'rotate(' + ang + ' 380 120)');
      verdict.textContent = diff > 3 ? 'A pessoa parte' : diff < -3 ? 'A pessoa fica' : 'A pessoa hesita…';
      verdict.setAttribute('fill', diff > 3 ? C.orange : diff < -3 ? C.blue : C.muted);
    }
    paint();
  };

  /* ---------- 16. fluxos: who leaves, who arrives ---------------------- */
  W.fluxos = function (w) {
    const s = svg(1000, 460, w, 'Fluxos migratórios de e para Portugal');
    el('rect', { x: 0, y: 0, width: 1000, height: 460, fill: C.white }, s);
    for (let r = 80; r <= 240; r += 80) el('circle', { cx: 450, cy: 230, r, fill: 'none', stroke: C.cream, 'stroke-width': 2 }, s);
        const sets = {
      out: { title: 'Saíram de Portugal em 2024 (principais destinos)', dir: -1, unit: 'entradas', src: 'Observatório da Emigração',
        d: [['Suíça', 12388, 70, -150], ['Espanha', 11332, -40, 130], ['Luxemburgo', 3469, 150, -110], ['Reino Unido', 2900, -40, -200, 'menos de 3 000']] },
      in: { title: 'Estrangeiros a viver em Portugal no fim de 2025 (por nacionalidade)', dir: 1, unit: 'residentes', src: 'AIMA, Relatório de Migrações e Asilo 2025',
        d: [['Brasil', 493622, -330, 150], ['Angola', 99050, 30, 210], ['Índia', 91405, 330, 50], ['Ucrânia', 84889, 260, -160], ['Cabo Verde', 71005, -230, 80], ['Bangladesh', 55579, 290, 140], ['Nepal', 53304, 320, -50], ['Guiné-Bissau', 51935, -120, 190], ['Reino Unido', 47726, -60, -200]] },
      sixties: { title: 'Anos 60 e 70: a grande vaga de emigração portuguesa', dir: -1, unit: '', src: '',
        d: [['França', 1, 100, -170], ['Alemanha', .6, 230, -150], ['Luxemburgo', .4, 170, -100], ['Brasil', .5, -320, 140], ['Venezuela', .35, -340, 40], ['Canadá e EUA', .45, -260, -140]] }
    };
    const g = el('g', {}, s);
    const cap = document.createElement('div'); cap.className = 'wg-read'; w.appendChild(cap);
    function paint(k) {
      const set = sets[k]; g.innerHTML = '';
      const mx = Math.max(...set.d.map(x => x[1]));
      set.d.forEach((d, i) => {
        const x = 450 + d[2], y = 230 + d[3];
        const wdt = k === 'sixties' ? 4 + d[1] * 14 : 3 + Math.sqrt(d[1] / mx) * 24;
        const mxp = (450 + x) / 2 + (y - 230) * .25, myp = (230 + y) / 2 - (x - 450) * .25;
        const p = set.dir < 0 ? `M450,230 Q${mxp},${myp} ${x},${y}` : `M${x},${y} Q${mxp},${myp} 450,230`;
        el('path', { d: p, fill: 'none', stroke: set.dir < 0 ? C.blue : C.orange, 'stroke-width': wdt, 'stroke-linecap': 'round', opacity: .35 }, g);
        const fl = el('path', { d: p, fill: 'none', stroke: set.dir < 0 ? C.blue : C.orange, 'stroke-width': Math.max(2, wdt * .35), 'stroke-dasharray': '2 16', 'stroke-linecap': 'round', class: 'wg-flow' }, g);
        fl.style.animationDelay = (i * .2) + 's';
        el('circle', { cx: x, cy: y, r: 7, fill: C.navy }, g);
        const lbl = d[0] + (k === 'sixties' ? '' : ' · ' + (d[4] || nf(d[1])));
        el('text', { x: x + (x > 450 ? 12 : -12), y: y + 5, 'text-anchor': x > 450 ? 'start' : 'end', class: 'wg-s', 'font-weight': 700, fill: C.navy, stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke' }, g, lbl);
      });
      el('circle', { cx: 450, cy: 230, r: 34, fill: C.navy }, g); el('text', { x: 450, y: 235, 'text-anchor': 'middle', class: 'wg-s', fill: '#fff', 'font-weight': 700 }, g, 'Portugal');
      cap.innerHTML = '<span><b>' + set.title + '</b></span>' + (set.src ? '<span class="muted">Fonte: ' + set.src + '. Posições no esquema não estão à escala.</span>' : '<span class="muted">Esquema sem números: França foi o principal destino.</span>');
    }
    buttons(w, [
      { t: 'Anos 60 e 70: saídas', f: (b, box) => { pick(box, b); paint('sixties'); } },
      { t: '2024: quem sai', f: (b, box) => { pick(box, b); paint('out'); } },
      { t: '2025: quem cá vive', cls: 'ghost sel', f: (b, box) => { pick(box, b); paint('in'); } }
    ]);
    paint('in');
  };

  /* ---------- 17. falantes: Portuguese-speaking countries -------------- */
  W.falantes = function (w) {
    const d = [['Brasil', 212, -175, 30], ['Angola', 37.9, 95, 95], ['Moçambique', 34.6, 200, 20], ['Portugal', 11.4, 40, -120], ['Guiné-Bissau', 2.2, -20, 70], ['Guiné Equatorial', 1.9, 0, -20], ['Timor-Leste', 1.4, 230, -120], ['Cabo Verde', .52, -90, -150], ['São Tomé e Príncipe', .24, 120, -40]];
    const s = svg(660, 430, w, 'Bolhas com a população dos países de língua oficial portuguesa');
    const g = el('g', { transform: 'translate(330,215)' }, s);
    d.forEach((x, i) => {
      const r = Math.sqrt(x[1]) * 7.2 + 5;
      const b = el('g', { class: 'wg-pop', transform: `translate(${x[2]},${x[3]})` }, g);
      b.style.animationDelay = (i * .12) + 's';
      el('circle', { r, fill: i === 0 ? C.orange : i === 3 ? C.navy : C.blue, opacity: .9 }, b);
      const inside = r > 36;
      el('text', { y: inside ? -2 : -r - 24, 'text-anchor': 'middle', class: 'wg-t', 'font-weight': 700, fill: inside ? '#fff' : C.navy }, b, x[0]);
      el('text', { y: inside ? 20 : -r - 6, 'text-anchor': 'middle', class: 'wg-s', fill: inside ? '#fff' : C.muted }, b, (x[1] < 1 ? nf(x[1] * 1000) + ' mil' : nf(x[1], x[1] < 10 ? 1 : 0) + ' milhões'));
    });
  };

  /* ---------- 18. tabs: generic ------------------------------------- */
  W.tabs = function (w) {
    const btns = w.querySelectorAll('[data-tab]'), panes = w.querySelectorAll('[data-pane]');
    btns.forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      btns.forEach(x => x.classList.toggle('sel', x === b));
      panes.forEach(p => p.classList.toggle('show', p.dataset.pane === b.dataset.tab));
    }));
    if (btns[0]) btns[0].click();
  };

  /* ---------- start ------------------------------------------------- */
  document.querySelectorAll('[data-widget]').forEach(w => {
    const f = W[w.dataset.widget];
    if (!f) return;
    try { f(w); } catch (err) { console.error('widget ' + w.dataset.widget, err); }
    // clicks inside a widget never advance the slide
    w.addEventListener('click', e => e.stopPropagation());
  });
})();
