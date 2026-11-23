/* ==========================================================================
   civind.js — «A civilização industrial»: the 2D pieces (no 3D needed).
     1. Steam physics, one equation at a time, with sliders (s-ci-vapor-fisica)
     2. The three economic cycles, drawn in Manim style (s-ci-ciclos)
     3. The loop of the crisis: six boxes in a ring (shared by 4 and 5)
     4. The crisis cascade: the loop driven by a small model, and a live chart (s-ci-cascata)
     5. The equations of the cascade, lighting up the loop one part at a time (s-ci-modelo)
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

  /* ---------- 1. Steam physics, one equation at a time ----------
     p (pressure) → F = p × A (force) → W = F × d (work) → P = W ÷ t (power) → η (efficiency).
     Every result is computed from the two sliders, so each equation uses the number
     the one before it produced. */
  document.querySelectorAll('[data-civ="forca"]').forEach(box => {
    const p = box.querySelector('[name="p"]'), d = box.querySelector('[name="d"]');
    const round = (v, step) => Math.round(v / step) * step;
    function paint() {
      const bar = Number(p.value), cm = Number(d.value);
      const Pa = bar * 100000, r = cm / 200, A = Math.PI * r * r, F = Pa * A;
      const W = F * 0.432;                                   // stroke of 0,432 m (Rocket, 1829)
      const P = W * 4;                                       // 4 pushes per second (a round number for the sums)
      const vals = {
        p: fmt(bar, 1) + ' bar', pa: fmt(Pa) + ' Pa', d: fmt(cm) + ' cm', A: fmt(A, 3) + ' m²',
        F: fmt(round(F, 10)) + ' N', kg: fmt(round(F / 9.8, 10)) + ' kg',
        W: fmt(round(W, 10)) + ' J', alt: fmt(W / (70 * 9.8), 1) + ' m',
        P: fmt(round(P, 100)) + ' W', kW: fmt(P / 1000, 0) + ' kW', cv: fmt(P / 735.5, 0),
        fogo: fmt(round(P / 0.03 / 1000, 10)) + ' kW',
      };
      for (const k in vals) box.querySelectorAll('[data-out="' + k + '"]').forEach(o => { o.textContent = vals[k]; });
      const face = box.querySelector('.pz-face');            // the piston face grows with the diameter
      if (face) face.setAttribute('ry', (30 + cm * 1.6).toFixed(1));
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


  /* ---------- 3. The loop of the crisis (drawn by the cascade and by the equations slide) ----------
     Six boxes in a ring, read clockwise: sales → warehouse → production → jobs → wages →
     household purchases → sales again. «Other buyers» feed the sales from outside (that is where
     the drop comes from) and full warehouses push prices down. Each box shows its level against
     normal (100): blue when below, orange when above. */
  const RING = {
    ven: { x: 500, y: 92, t: 'Vendas', s: 'o que as fábricas vendem' },
    arm: { x: 820, y: 190, t: 'Armazéns', s: 'mercadorias por vender' },
    pro: { x: 820, y: 352, t: 'Produção', s: 'o que as fábricas fazem' },
    emp: { x: 500, y: 446, t: 'Emprego', s: 'nas fábricas e nas minas' },
    sal: { x: 180, y: 352, t: 'Salários', s: 'o que as famílias ganham' },
    com: { x: 180, y: 190, t: 'Compras', s: 'o que as famílias gastam' },
    pre: { x: 500, y: 270, t: 'Preços', s: '', small: true },
    out: { x: 850, y: 30, t: 'Outros compradores', s: '', tag: true },
  };
  const LINKS = [
    { a: 'ven', b: 'arm', t: 'o que sobra\nfica guardado' },
    { a: 'arm', b: 'pro', t: 'armazém cheio:\nproduz-se menos' },
    { a: 'pro', b: 'emp', t: 'decide quantos\ntrabalham' },
    { a: 'emp', b: 'sal', t: 'quem trabalha\nrecebe' },
    { a: 'sal', b: 'com', t: 'parte do salário\né gasta' },
    { a: 'com', b: 'ven', t: 'cada compra\né uma venda' },
    { a: 'out', b: 'ven', t: '', side: true },
    { a: 'arm', b: 'pre', t: 'armazém cheio:\npreços descem', side: true },
    { a: 'pre', b: 'ven', t: '', side: true, faint: true },
  ];
  function buildRing(svg) {
    const W = 236, H = 92;
    const size = n => (n.small ? [170, 64] : n.tag ? [250, 44] : [W, H]);
    el('defs', {}, svg).innerHTML = '<marker id="cs-ponta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="context-stroke"/></marker>';
    const gL = el('g', {}, svg), gD = el('g', {}, svg), gN = el('g', {}, svg);
    // where a line from a box's centre towards a point leaves the box
    const edge = (n, tx, ty) => {
      const [w, h] = size(n), dx = tx - n.x, dy = ty - n.y;
      const k = Math.min(Math.abs((w / 2 + 6) / (dx || 1e-6)), Math.abs((h / 2 + 6) / (dy || 1e-6)));
      return [n.x + dx * k, n.y + dy * k];
    };
    const links = LINKS.map(l => {
      const A = RING[l.a], B = RING[l.b];
      const [x1, y1] = edge(A, B.x, B.y), [x2, y2] = edge(B, A.x, A.y);
      const g = el('g', { class: 'cs-lig' + (l.side ? ' lado' : '') + (l.faint ? ' tenue' : ''), 'data-l': l.a + '-' + l.b }, gL);
      const path = el('path', { d: `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`, 'marker-end': 'url(#cs-ponta)' }, g);
      if (l.t) {
        // label on the outer side of the ring (the one about prices sits inside), one or two lines
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ox = mx - 500, oy = my - 268, len = Math.hypot(ox, oy) || 1;
        const inside = l.b === 'pre';
        let tx = mx + ox / len * 40, ty = my + oy / len * 40, anchor = Math.abs(ox) < 60 ? 'middle' : ox > 0 ? 'start' : 'end';
        if (inside) { tx = mx + 30; ty = my + 44; anchor = 'middle'; }
        const lines = l.t.split('\n');
        const t = el('text', { x: tx.toFixed(1), y: (ty - (lines.length - 1) * 12 + 7).toFixed(1), 'text-anchor': anchor, class: 'cs-lrot' }, g);
        lines.forEach((ln, i) => { const sp = el('tspan', { x: tx.toFixed(1), dy: i ? 25 : 0 }, t); sp.textContent = ln; });
      }
      const dots = l.faint ? [] : [0, 1, 2].map(i => ({ u: i / 3, c: el('circle', { r: 6, class: 'cs-ponto' }, gD) }));
      return { ...l, g, path, x1, y1, x2, y2, dots };
    });
    const nodes = {};
    for (const k in RING) {
      const n = RING[k], [w, h] = size(n);
      const g = el('g', { class: 'cs-caixa' + (n.small ? ' peq' : '') + (n.tag ? ' tag' : ''), 'data-n': k, transform: `translate(${n.x - w / 2},${n.y - h / 2})` }, gN);
      el('rect', { width: w, height: h, rx: 14, class: 'cs-fundo' }, g);
      const tt = el('text', { x: 16, y: n.tag ? 29 : 32, class: 'cs-tit' }, g); tt.textContent = n.t;
      const nodeRef = { g, n, w, h };
      if (!n.tag) {
        nodeRef.val = el('text', { x: w - 16, y: 32, 'text-anchor': 'end', class: 'cs-val' }, g);
        if (n.s) { const s = el('text', { x: 16, y: 56, class: 'cs-sub' }, g); s.textContent = n.s; }
        const by = n.small ? 44 : 70, bw = w - 32;
        el('rect', { x: 16, y: by, width: bw, height: 10, rx: 5, class: 'cs-trilho' }, g);
        nodeRef.bar = el('rect', { x: 16, y: by, width: bw * 100 / 150, height: 10, rx: 5, class: 'cs-barra' }, g);
        el('line', { x1: 16 + bw * 100 / 150, x2: 16 + bw * 100 / 150, y1: by - 4, y2: by + 14, class: 'cs-cem' }, g);
        nodeRef.bw = bw;
      }
      nodes[k] = nodeRef;
    }
    return { nodes, links };
  }
  function paintNode(nd, v) {
    if (!nd.bar) return;
    nd.val.textContent = fmt(v);
    nd.bar.setAttribute('width', (nd.bw * clamp(v, 0, 150) / 150).toFixed(1));
    const st = v < 97 ? 'baixo' : v > 103 ? 'alto' : '';
    nd.g.setAttribute('class', nd.g.getAttribute('class').replace(/ (baixo|alto)/g, '') + (st ? ' ' + st : ''));
    return st;
  }

  /* ---------- 4. The crisis cascade: the loop driven by a small model ----------
     A teaching model, not a model of any real economy. Indices, 100 = normal.
       Y  production of the factories        E  workers in the factories
       M  production (and jobs) in the mines and the cotton trade (raw materials)
       S  goods made but not sold (stock)    p  price level
       G  "other buyers" (exports, investment, other firms): the part of demand that can change suddenly
       D  = (c · R + G) · (1 + e · (1 − p/100))     sales; R = wage income = (E + M) / 2
       dS/dt = Y − D                                unsold goods pile up
       dY/dt = a · (D − b · (S − S0) − Y)           firms aim at their sales, less to clear the stock
       dE/dt = k · (Y − E)   dM/dt = k · (Y − M)    jobs follow production, more slowly
       dp/dt = −m · (S − S0) / S0 · p               full warehouses push prices down
     Time unit: one month; the animation runs one month per second. */
  document.querySelectorAll('[data-civ="cascata"]').forEach(root => {
    const slide = root.closest('.slide');
    const P = { c: 0.4, a: 0.7, b: 0.25, k: 0.3, m: 0.03, S0: 20, e: 0.25 };
    const G0 = 60, WIN = 48;
    const stockIdx = S => 100 + (S - P.S0) * 2.5;            // unsold goods as an index: 100 = the normal stock
    const ring = buildRing(root.querySelector('.cs-anel'));
    const chart = root.querySelector('.cs-grafico');
    let st, hist, gUser, tMonth, paused = false;
    function reset() {
      st = { Y: 100, E: 100, M: 100, S: P.S0, p: 100 };
      tMonth = 0; gUser = 0;
      hist = [];
      for (let t = -WIN; t <= 0; t += 0.5) hist.push({ t, D: 100, Y: 100, E: 100, p: 100, dY: 0 });
    }
    reset();
    const qIn = root.querySelector('[name="quebra"]');
    const shock = () => (stepOf(slide) >= 1 ? Number(qIn.value) : 0);
    const G = () => Math.max(0, G0 - shock() + gUser);
    const income = s => 0.5 * s.E + 0.5 * s.M;
    const demand = s => (P.c * income(s) + G()) * (1 + P.e * (1 - s.p / 100));
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
    // what each box shows (100 = normal)
    const values = s => ({
      ven: demand(s), arm: stockIdx(s.S), pro: s.Y, emp: income(s), sal: income(s),
      com: income(s), pre: s.p,          // purchases = c · R: as an index it moves exactly like the wages
    });

    // --- the chart: four lines and, under them, a strip that names the phase ---
    const L = 110, R = 990, TOP = 8, BOT = 90, STRIP = 98;
    const SERIES = [
      { k: 'D', t: 'Vendas', col: '#F0A673' },
      { k: 'Y', t: 'Produção', col: '#F6F3EC' },
      { k: 'E', t: 'Emprego', col: '#8FB8DA' },
      { k: 'p', t: 'Preços', col: '#C7D59F' },
    ];
    const yOf = v => BOT - (clamp(v, 50, 150) - 50) / 100 * (BOT - TOP);
    [50, 100, 150].forEach(v => {
      if (v !== 100) { el('line', { x1: L, x2: R, y1: yOf(v), y2: yOf(v), class: 'cs-grelha' }, chart); return; }
      el('line', { x1: L, x2: R, y1: yOf(v), y2: yOf(v), class: v === 100 ? 'cs-cem' : 'cs-grelha' }, chart);
      const t = el('text', { x: L - 10, y: yOf(v) + 7, 'text-anchor': 'end', class: 'cs-eixo' }, chart); t.textContent = v === 100 ? '100 normal' : v;
    });
    const tx = el('text', { x: L - 10, y: 119, 'text-anchor': 'end', class: 'cs-eixo' }, chart); tx.textContent = 'meses →';
    SERIES.forEach(s => { s.line = el('polyline', { fill: 'none', stroke: s.col, 'stroke-width': s.k === 'Y' ? 5 : 3.5, class: 'cs-serie' }, chart); });
    const gStrip = el('g', {}, chart);
    const leg = root.querySelector('.cs-legenda');
    if (leg) leg.innerHTML = SERIES.map(s => `<span><i style="background:${s.col}"></i>${s.t}</span>`).join('') + '<span><i class="d"></i>fase depressiva</span><span><i class="e"></i>fase expansiva</span>';
    const phaseEl = root.querySelector('.cs-fase');
    const pauseBtn = root.querySelector('[data-acao="pausa"]');

    root.querySelectorAll('[data-acao]').forEach(b => {
      stopNav(b);
      b.addEventListener('click', () => {
        const a = b.dataset.acao;
        if (a === 'invencao') gUser += 25;
        if (a === 'reconversao') gUser = Math.max(gUser, shock());
        if (a === 'corte') { st.Y *= 0.6; st.S = P.S0 * 0.6; }
        if (a === 'repor') { reset(); qIn.value = 20; root.querySelector('[data-out="quebra"]').textContent = '20 %'; }
        if (a === 'pausa') { paused = !paused; b.textContent = paused ? 'Continuar' : 'Pausa'; b.classList.toggle('sel', paused); }
      });
    });
    stopNav(qIn);
    qIn.addEventListener('input', () => { root.querySelector('[data-out="quebra"]').textContent = qIn.value + ' %'; });

    let lastStep = -1, last = 0, running = false, prevVals = null, rates = {};
    function frame(now) {
      if (!slide.classList.contains('current')) { running = false; return; }
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000 || 0.016, 0.05); last = now;
      const step = stepOf(slide);
      if (step !== lastStep) { if (step === 0) reset(); if (step < 3) gUser = 0; lastStep = step; }
      const h = paused ? 0 : dt;                               // one month of model time per second
      for (let i = 0; i < 4 && h > 0; i++) stepModel(h / 4);
      if (h > 0) {
        hist.push({ t: tMonth, D: demand(st), Y: st.Y, E: income(st), p: st.p, dY: deriv(st).Y });
        while (hist.length && tMonth - hist[0].t > WIN) hist.shift();
      }
      // boxes: level, colour, and which one is changing fastest right now
      const v = values(st);
      let best = null, bestRate = 0.9;                         // index points per month
      for (const k in v) {
        if (prevVals && h > 0) rates[k] = 0.85 * (rates[k] || 0) + 0.15 * Math.abs(v[k] - prevVals[k]) / h;
        if ((rates[k] || 0) > bestRate) { bestRate = rates[k]; best = k; }
      }
      prevVals = v;
      for (const k in ring.nodes) {
        const nd = ring.nodes[k];
        if (k in v) paintNode(nd, v[k]);
        nd.g.classList.toggle('agora', k === best && !paused);
      }
      // arrows: dots move from cause to effect, coloured like the cause
      ring.links.forEach(l => {
        const src = ring.nodes[l.a].g.classList;
        const cls = src.contains('baixo') ? 'baixo' : src.contains('alto') ? 'alto' : '';
        l.g.setAttribute('class', 'cs-lig' + (l.side ? ' lado' : '') + (l.faint ? ' tenue' : '') + (cls ? ' ' + cls : ''));
        l.dots.forEach(d => {
          if (!paused) d.u = (d.u + dt * 0.45) % 1;
          d.c.setAttribute('cx', (l.x1 + (l.x2 - l.x1) * d.u).toFixed(1));
          d.c.setAttribute('cy', (l.y1 + (l.y2 - l.y1) * d.u).toFixed(1));
          d.c.setAttribute('class', 'cs-ponto ' + cls);
        });
      });
      // chart
      const t0 = tMonth - WIN, xOf = t => L + (t - t0) / WIN * (R - L);
      SERIES.forEach(s => { s.line.setAttribute('points', hist.map(q => xOf(q.t).toFixed(1) + ',' + yOf(q[s.k]).toFixed(1)).join(' ')); });
      frame.n = (frame.n || 0) + 1;
      if (frame.n % 6 === 0) {
        gStrip.replaceChildren();
        let start = null, kind = null;
        const flush = endT => {
          if (start === null || !kind) return;
          const x0 = xOf(start), w = Math.max(0, xOf(endT) - x0);
          el('rect', { x: x0, y: STRIP, width: w, height: 28, rx: 6, class: kind === 'd' ? 'cs-depr' : 'cs-expa' }, gStrip);
          if (w > 190) { const tt = el('text', { x: x0 + w / 2, y: STRIP + 21, 'text-anchor': 'middle', class: 'cs-faixa' }, gStrip); tt.textContent = kind === 'd' ? 'fase depressiva' : 'fase expansiva'; }
        };
        hist.forEach(q => { const k = q.dY < -0.25 ? 'd' : q.dY > 0.25 ? 'e' : null; if (k !== kind) { flush(q.t); start = q.t; kind = k; } });
        flush(tMonth);
      }
      if (phaseEl && frame.n % 10 === 0) {
        const dY = deriv(st).Y;
        const txt = paused ? 'Em pausa' : dY < -0.25 ? 'Fase depressiva: a produção desce' : dY > 0.25 ? 'Fase expansiva: a produção sobe' : st.Y < 95 ? 'Depressão: a produção ficou em baixo' : st.Y > 105 ? 'Mais produção do que antes da crise' : 'Equilíbrio: tudo no normal';
        if (phaseEl.textContent !== txt) { phaseEl.textContent = txt; phaseEl.className = 'cs-fase ' + (dY < -0.25 || st.Y < 95 ? 'd' : dY > 0.25 || st.Y > 105 ? 'e' : ''); }
      }
    }
    new MutationObserver(() => {
      if (slide.classList.contains('current') && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    }).observe(slide, { attributes: true, attributeFilter: ['class'] });
    if (slide.classList.contains('current')) { running = true; requestAnimationFrame(frame); }
  });

  /* ---------- 5. The equations slide: the same loop, lighting up the part each equation describes ---------- */
  document.querySelectorAll('[data-civ="anel"]').forEach(svg => {
    const slide = svg.closest('.slide');
    const ring = buildRing(svg);
    Object.values(ring.nodes).forEach(nd => { if (nd.val) nd.val.textContent = ''; });
    // build → boxes and arrows to light up
    const LIT = [
      ['ven', 'out', 'com', 'out-ven', 'com-ven'],
      ['arm', 'ven-arm'],
      ['pro', 'arm-pro'],
      ['pro', 'arm-pro'],
      ['emp', 'pro-emp'],
      ['sal', 'com', 'ven', 'emp-sal', 'sal-com', 'com-ven'],
      ['pre', 'arm-pre', 'pre-ven'],
    ];
    const stepOf = sl => { let k = 0; while (sl.classList.contains('ge' + (k + 1))) k++; return k; };
    const paint = () => {
      const lit = LIT[Math.min(stepOf(slide), LIT.length - 1)];
      for (const k in ring.nodes) ring.nodes[k].g.classList.toggle('ativo', lit.includes(k));
      ring.links.forEach(l => l.g.classList.toggle('ativo', lit.includes(l.a + '-' + l.b)));
    };
    new MutationObserver(paint).observe(slide, { attributes: true, attributeFilter: ['class'] });
    paint();
  });
})();
