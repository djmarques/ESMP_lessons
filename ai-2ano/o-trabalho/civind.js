/* ==========================================================================
   civind.js — «A civilização industrial»: the 2D pieces (no 3D needed).
     1. Steam physics: F = p × A with sliders (slide s-ci-vapor-fisica)
     2. The three economic cycles, drawn in Manim style (s-ci-ciclos)
     3. The crisis cascade: a small model of an economy, drawn as a network
        with money flowing between its parts, and a live chart (s-ci-cascata)
   Each piece looks for its own element and does nothing if it is absent.
   Code comments in English; every text students read in European Portuguese.
   ========================================================================== */
(function civind() {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  /** Portuguese number format: comma for decimals, space between thousands (also for 4 digits). */
  const fmt = (v, dec = 0) => {
    const s = Math.abs(v).toFixed(dec).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + s.join(',');
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const stopNav = node => {                                // sliders and buttons do not change slides
    ['keydown', 'touchstart', 'touchend', 'click'].forEach(ev => node.addEventListener(ev, e => e.stopPropagation(), { passive: ev !== 'keydown' }));
    if (node.matches('input')) node.addEventListener('change', () => node.blur());
  };

  /* ---------- 1. Steam physics: F = p × A ---------- */
  document.querySelectorAll('[data-civ="forca"]').forEach(box => {
    const p = box.querySelector('[name="p"]'), d = box.querySelector('[name="d"]');
    const out = k => box.querySelectorAll('[data-out="' + k + '"]');
    function paint() {
      const bar = Number(p.value), cm = Number(d.value);
      const Pa = bar * 100000, r = cm / 200, A = Math.PI * r * r, F = Pa * A;
      const set = (k, v) => out(k).forEach(o => { o.textContent = v; });
      set('p', fmt(bar, 1) + ' bar');
      set('pa', fmt(Pa) + ' Pa');
      set('d', fmt(cm) + ' cm');
      set('A', fmt(A, 3) + ' m²');
      set('F', fmt(F) + ' N');
      set('kg', fmt(F / 9.8, 0) + ' kg');
      const W = F * 0.432;                                  // stroke of 0,432 m (Rocket, 1829)
      set('W', fmt(W) + ' J');
      set('P', fmt(W * 4 / 1000, 1) + ' kW');               // 4 strokes per second (2 turns, both sides)
    }
    [p, d].forEach(i => { stopNav(i); i.addEventListener('input', paint); });
    paint();
  });

  /* ---------- 2. The three economic cycles ---------- */
  document.querySelectorAll('[data-civ="ciclos"]').forEach(svg => {
    // Illustrative waves (not data): Kitchin 4 years, Juglar 8, Kondratieff 50.
    const X0 = 70, X1 = 980, YEARS = 100, sx = (X1 - X0) / YEARS;
    const waves = [
      { k: 'kitchin', per: 4, amp: 0.25, col: '#DCE8F2' },
      { k: 'juglar', per: 9, amp: 0.55, col: '#F0A673' },
      { k: 'kondratieff', per: 50, amp: 1.1, col: '#F1CDB0' },
    ];
    const pathOf = (f, y0, scale, x0 = X0) => {
      const k = (X1 - x0) / YEARS;
      let dStr = '';
      for (let i = 0; i <= 400; i++) { const t = i / 400 * YEARS; dStr += (i ? 'L' : 'M') + (x0 + t * k).toFixed(1) + ',' + (y0 - f(t) * scale).toFixed(1); }
      return dStr;
    };
    const trend = t => 0.035 * t - 1.6;
    const total = t => trend(t) + waves.reduce((s, w) => s + w.amp * Math.sin(2 * Math.PI * t / w.per), 0) * 0.55;
    // top panel: the trend and what actually happened
    el('path', { d: pathOf(trend, 150, 50), class: 'draw mn-linha', pathLength: 1, stroke: '#F6F3EC', 'stroke-width': 3, fill: 'none' }, svg.querySelector('[data-k="trend"]'));
    el('path', { d: pathOf(total, 150, 50), class: 'draw', pathLength: 1, stroke: '#F0A673', 'stroke-width': 4, fill: 'none' }, svg.querySelector('[data-k="real"]'));
    // three lanes below, one per cycle (labels in a column on the left)
    waves.forEach((w, i) => {
      const y0 = 318 + i * 80;
      el('path', { d: pathOf(t => Math.sin(2 * Math.PI * t / w.per), y0, 26, 300), class: 'draw', pathLength: 1, stroke: w.col, 'stroke-width': 3.5, fill: 'none' }, svg.querySelector('[data-k="' + w.k + '"]'));
    });
  });

  /* ---------- 3. The crisis cascade ----------
     A teaching model, not a model of any real economy. Indices, 100 = normal.
       Y  production of the factories        E  workers employed in the factories
       M  production (and jobs) in the mines and the cotton trade (raw materials)
       S  goods made but not sold (stock)    p  price level
       G  "other buyers" (exports, investment, other firms): the part of demand that can change suddenly
     Households spend c of their wage income (wages follow jobs: E and M).
       D  = (c · income + G) · (1 + e · (1 − p/100))        sales (lower prices sell a little more)
       dS/dt = Y − D                                          unsold goods pile up
       dY/dt = a · (D − b · (S − S0) − Y)                     firms produce what they sell, less to clear the stock
       dE/dt = k · (Y − E)      dM/dt = k · (Y − M)           jobs follow production; mines follow the factories
       dp/dt = −m · (S − S0) / S0 · p                         full warehouses push prices down
     Time unit: one month. */
  document.querySelectorAll('[data-civ="cascata"]').forEach(root => {
    const slide = root.closest('.slide');
    const net = root.querySelector('.cs-rede'), chart = root.querySelector('.cs-grafico');
    const P = { c: 0.4, a: 0.7, b: 0.25, k: 0.3, m: 0.03, S0: 20, e: 0.25 };
    const G0 = 60;
    const stockIdx = S => 100 + (S - P.S0) * 2.5;          // unsold goods as an index: 100 = the normal stock
    let st, hist, gUser, tMonth;
    function reset() {
      st = { Y: 100, E: 100, M: 100, S: P.S0, p: 100 };
      tMonth = 0; gUser = 0;
      hist = [];                                             // 60 calm months already on the chart
      for (let t = -60; t <= 0; t += 0.5) hist.push({ t, D: 100, Y: 100, E: 100, p: 100, S: 100, dY: 0 });
    }
    reset();
    const qIn = root.querySelector('[name="quebra"]');
    const shock = () => (stepOf(slide) >= 1 ? Number(qIn.value) : 0);
    function G() { return Math.max(0, G0 - shock() + gUser); }
    function demand(s) { const inc = 0.5 * s.E + 0.5 * s.M; return (P.c * inc + G()) * (1 + P.e * (1 - s.p / 100)); }
    function deriv(s) {
      const D = demand(s);
      return { Y: P.a * (D - P.b * (s.S - P.S0) - s.Y), E: P.k * (s.Y - s.E), M: P.k * (s.Y - s.M), S: s.Y - D, p: -P.m * (s.S - P.S0) / P.S0 * s.p };
    }
    function stepModel(h) {                                  // fourth-order Runge–Kutta
      const add = (a, b, f) => { const o = {}; for (const k in a) o[k] = a[k] + b[k] * f; return o; };
      const k1 = deriv(st), k2 = deriv(add(st, k1, h / 2)), k3 = deriv(add(st, k2, h / 2)), k4 = deriv(add(st, k3, h));
      for (const k in st) st[k] += (k1[k] + 2 * k2[k] + 2 * k3[k] + k4[k]) * h / 6;
      st.S = Math.max(0, st.S);
      tMonth += h;
    }
    function stepOf(sl) { let k = 0; while (sl.classList.contains('ge' + (k + 1))) k++; return k; }

    // --- the network: five places, money flowing between them as coins ---
    const NODES = {
      fam: { x: 130, y: 250, t: 'Famílias' },
      loj: { x: 440, y: 95, t: 'Lojas' },
      fab: { x: 760, y: 250, t: 'Fábricas' },
      min: { x: 440, y: 395, t: 'Minas e algodão' },
      out: { x: 850, y: 110, t: 'Outros compradores' },
    };
    // simple drawn icons (no emoji: they do not show on every computer)
    const ICONS = {
      fam: 'M-26,22 L-22,-2 Q-16,-8 -10,-2 L-6,22 Z M-16,-12 m-7,0 a7,7 0 1,0 14,0 a7,7 0 1,0 -14,0 M6,22 L9,4 Q14,-1 19,4 L22,22 Z M14,-6 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0',
      loj: 'M-26,-8 L26,-8 L22,-20 L-22,-20 Z M-22,-8 L-22,22 L22,22 L22,-8 Z M-8,4 L8,4 L8,22 L-8,22 Z',
      fab: 'M-28,22 L-28,-4 L-14,-14 L-14,-4 L0,-14 L0,-4 L14,-14 L14,22 Z M16,22 L16,-26 L24,-26 L24,22 Z',
      min: 'M-24,-14 Q0,-30 24,-14 L20,-10 Q0,-22 -20,-10 Z M-3,-18 L3,-18 L3,24 L-3,24 Z',
      out: 'M0,-24 a24,24 0 1,0 0.1,0 Z M-24,0 L24,0 M0,-24 Q-14,0 0,24 Q14,0 0,-24',
    };
    const EDGES = [
      { a: 'fam', b: 'loj', t: 'compras', f: s => P.c * (0.5 * s.E + 0.5 * s.M) },
      { a: 'loj', b: 'fab', t: 'vendas', f: s => demand(s) - G(), bend: -30 },
      { a: 'out', b: 'fab', t: 'encomendas', f: () => G() },
      { a: 'fab', b: 'fam', t: 'salários', f: s => 0.5 * s.E, bend: 60 },
      { a: 'fab', b: 'min', t: 'matérias-primas', f: s => 0.5 * s.Y },
      { a: 'min', b: 'fam', t: 'salários', f: s => 0.5 * s.M },
    ];
    const gEdges = el('g', {}, net), gCoins = el('g', {}, net), gNodes = el('g', {}, net);
    EDGES.forEach(e => {
      const A = NODES[e.a], B = NODES[e.b];
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
      const bend = e.bend || 26, cx = mx - dy / len * bend, cy = my + dx / len * bend;
      e.path = el('path', { d: `M${A.x},${A.y} Q${cx},${cy} ${B.x},${B.y}`, class: 'cs-aresta', fill: 'none' }, gEdges);
      e.len = e.path.getTotalLength ? e.path.getTotalLength() : len;
      const lx = 0.25 * A.x + 0.5 * cx + 0.25 * B.x, ly = 0.25 * A.y + 0.5 * cy + 0.25 * B.y;
      e.lab = el('text', { x: lx, y: ly - 10, class: 'cs-rot', 'text-anchor': 'middle' }, gEdges);
      e.lab.textContent = e.t;
      e.pct = el('text', { x: lx, y: ly + 24, class: 'cs-pct', 'text-anchor': 'middle' }, gEdges);
      e.coins = Array.from({ length: 10 }, (_, i) => ({ u: i / 10, c: el('circle', { r: 9, class: 'cs-moeda' }, gCoins) }));
      e.base = e.f({ Y: 100, E: 100, M: 100, S: P.S0, p: 100 });
    });
    for (const k in NODES) {
      const n = NODES[k];
      n.g = el('g', { transform: `translate(${n.x},${n.y})`, class: 'cs-no' }, gNodes);
      el('circle', { r: 54, class: 'cs-bola' }, n.g);
      el('path', { d: ICONS[k], class: 'cs-ic', transform: 'scale(1.35)' }, n.g);
      const tt = el('text', { y: k === 'min' ? 86 : -66, 'text-anchor': 'middle', class: 'cs-nome' }, n.g); tt.textContent = n.t;
    }
    // workers (10 small figures) under the factories and the mines; stock boxes beside the factories
    const people = (n, dx, dy) => Array.from({ length: 10 }, (_, i) => el('circle', { cx: dx + (i % 5) * 20, cy: dy + Math.floor(i / 5) * 22, r: 8, class: 'cs-pessoa' }, n.g));
    NODES.fab.people = people(NODES.fab, -40, 72);
    NODES.min.people = people(NODES.min, 70, -14);
    NODES.fab.boxes = Array.from({ length: 12 }, (_, i) => el('rect', { x: 66 + (i % 3) * 24, y: 14 - Math.floor(i / 3) * 24, width: 21, height: 21, class: 'cs-caixa' }, NODES.fab.g));
    const priceTag = el('text', { x: 0, y: -100, 'text-anchor': 'middle', class: 'cs-preco' }, NODES.fab.g);
    priceTag.setAttribute('y', 150);

    // --- the chart: last 60 months ---
    const CW = 1000, CH = 300, L = 60, R = 990, TOP = 20, BOT = 260;
    const SERIES = [
      { k: 'D', t: 'Vendas', col: '#F0A673', f: s => demand(s) },
      { k: 'Y', t: 'Produção', col: '#F6F3EC', f: s => s.Y },
      { k: 'E', t: 'Emprego', col: '#8FB8DA', f: s => 0.5 * s.E + 0.5 * s.M },
      { k: 'p', t: 'Preços', col: '#C7D59F', f: s => s.p },
      { k: 'S', t: 'Por vender (100 = normal)', col: '#B88A6A', f: s => stockIdx(s.S), dash: '8 6' },
    ];
    const yOf = v => BOT - (clamp(v, 40, 160) - 40) / 120 * (BOT - TOP);
    const gBg = el('g', {}, chart);
    el('line', { x1: L, x2: R, y1: yOf(100), y2: yOf(100), class: 'cs-cem' }, chart);
    const t100 = el('text', { x: L - 8, y: yOf(100) + 6, 'text-anchor': 'end', class: 'cs-eixo' }, chart); t100.textContent = '100';
    const t60 = el('text', { x: L - 8, y: yOf(60) + 6, 'text-anchor': 'end', class: 'cs-eixo' }, chart); t60.textContent = '60';
    const t140 = el('text', { x: L - 8, y: yOf(140) + 6, 'text-anchor': 'end', class: 'cs-eixo' }, chart); t140.textContent = '140';
    const tx = el('text', { x: R, y: CH - 8, 'text-anchor': 'end', class: 'cs-eixo' }, chart); tx.textContent = 'meses →';
    SERIES.forEach(s => { s.line = el('polyline', { fill: 'none', stroke: s.col, 'stroke-width': s.k === 'Y' ? 4 : 3, 'stroke-dasharray': s.dash || 'none', class: 'cs-serie' }, chart); });
    const leg = root.querySelector('.cs-legenda');
    if (leg) leg.innerHTML = SERIES.map(s => `<span><i style="background:${s.col}${s.dash ? ';background:repeating-linear-gradient(90deg,' + s.col + ' 0 6px,transparent 6px 10px)' : ''}"></i>${s.t}</span>`).join('');
    const phaseEl = root.querySelector('.cs-fase');

    // --- buttons ---
    root.querySelectorAll('[data-acao]').forEach(b => {
      stopNav(b);
      b.addEventListener('click', () => {
        const a = b.dataset.acao;
        if (a === 'invencao') gUser += 25;
        if (a === 'reconversao') gUser = Math.max(gUser, shock());
        if (a === 'corte') { st.Y *= 0.6; st.S = P.S0 * 0.6; }
        if (a === 'repor') { reset(); qIn.value = 20; root.querySelector('[data-out="quebra"]').textContent = '20 %'; }
      });
    });
    stopNav(qIn);
    qIn.addEventListener('input', () => { root.querySelector('[data-out="quebra"]').textContent = qIn.value + ' %'; });

    let lastStep = -1, last = 0, running = false;
    function frame(now) {
      if (!slide.classList.contains('current')) { running = false; return; }
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000 || 0.016, 0.05); last = now;
      const step = stepOf(slide);
      if (step !== lastStep) { if (step === 0) reset(); if (step < 3) gUser = 0; lastStep = step; }
      // two months of model time per second of real time
      const h = dt * 2;
      for (let i = 0; i < 4; i++) stepModel(h / 4);
      hist.push({ t: tMonth, D: demand(st), Y: st.Y, E: 0.5 * st.E + 0.5 * st.M, p: st.p, S: stockIdx(st.S), dY: deriv(st).Y });
      while (hist.length && tMonth - hist[0].t > 60) hist.shift();
      // chart
      const t0 = tMonth - 60, xOf = t => L + (t - t0) / 60 * (R - L);
      SERIES.forEach(s => { s.line.setAttribute('points', hist.map(q => xOf(q.t).toFixed(1) + ',' + yOf(q[s.k]).toFixed(1)).join(' ')); });
      // background bands: depressive phase (production falling) and expansive phase (rising)
      if (!frame.n || frame.n++ % 6 === 0) {
        frame.n = frame.n || 1;
        gBg.replaceChildren();
        let start = null, kind = null;
        const flush = (endT) => { if (start === null || kind === null) return; el('rect', { x: xOf(start), y: TOP, width: Math.max(0, xOf(endT) - xOf(start)), height: BOT - TOP, class: kind === 'd' ? 'cs-depr' : 'cs-expa' }, gBg); };
        hist.forEach(q => {
          const k = q.dY < -0.15 ? 'd' : q.dY > 0.15 ? 'e' : null;
          if (k !== kind) { flush(q.t); start = q.t; kind = k; }
        });
        flush(tMonth);
      }
      const dY = deriv(st).Y;
      if (phaseEl) {
        const txt = dY < -0.15 ? 'Fase depressiva: a produção desce' : dY > 0.15 ? 'Fase expansiva: a produção sobe' : st.Y < 95 ? 'Depressão: a produção ficou em baixo' : st.Y > 105 ? 'Mais produção do que antes da crise' : 'Equilíbrio';
        if (phaseEl.textContent !== txt) { phaseEl.textContent = txt; phaseEl.className = 'cs-fase ' + (dY < -0.15 || st.Y < 95 ? 'd' : dY > 0.15 || st.Y > 105 ? 'e' : ''); }
      }
      // network: coins move along each edge; how many show depends on the flow
      EDGES.forEach(e => {
        const ratio = e.f(st) / e.base;
        const shown = Math.round(clamp(ratio, 0, 2) * 6);
        e.coins.forEach((c, i) => {
          c.u = (c.u + dt * 0.18) % 1;
          if (i >= shown) { c.c.setAttribute('visibility', 'hidden'); return; }
          const pt = e.path.getPointAtLength(c.u * e.len);
          c.c.setAttribute('cx', pt.x.toFixed(1)); c.c.setAttribute('cy', pt.y.toFixed(1)); c.c.setAttribute('visibility', 'visible');
        });
        const pc = Math.round((ratio - 1) * 100);
        e.pct.textContent = Math.abs(pc) < 1 ? '' : (pc > 0 ? '+' : '−') + Math.abs(pc) + ' %';
        e.pct.setAttribute('class', 'cs-pct ' + (pc < 0 ? 'neg' : 'pos'));
        e.path.setAttribute('class', 'cs-aresta' + (pc <= -5 ? ' cai' : pc >= 5 ? ' sobe' : ''));
      });
      const jobs = (arr, v) => arr.forEach((c, i) => c.setAttribute('class', 'cs-pessoa' + (i >= Math.round(v / 10) ? ' sem' : '')));
      jobs(NODES.fab.people, st.E); jobs(NODES.min.people, st.M);
      const nb = Math.round(clamp(st.S / P.S0 * 3, 0, 12));
      NODES.fab.boxes.forEach((b, i) => b.setAttribute('visibility', i < nb ? 'visible' : 'hidden'));
      priceTag.textContent = 'preços ' + fmt(st.p, 0);
      const read = root.querySelector('.cs-num');
      if (read && (!frame.r || now - frame.r > 300)) {
        frame.r = now;
        read.innerHTML = `<span>Produção <b>${fmt(st.Y)}</b></span><span>Emprego <b>${fmt(0.5 * st.E + 0.5 * st.M)}</b></span><span>Preços <b>${fmt(st.p)}</b></span><span>Por vender <b>${fmt(stockIdx(st.S))}</b></span>`;
      }
    }
    new MutationObserver(() => {
      if (slide.classList.contains('current') && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    }).observe(slide, { attributes: true, attributeFilter: ['class'] });
    if (slide.classList.contains('current')) { running = true; requestAnimationFrame(frame); }
  });
})();
