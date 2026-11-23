/* ==========================================================================
   civind.js — «A civilização industrial»: the 2D pieces (no 3D needed).
     1. Steam physics, one idea at a time; the drawing answers the sliders (s-ci-vapor-fisica)
     2. The three economic cycles, drawn in Manim style (s-ci-ciclos)
     3. The loop of the crisis: six boxes in a ring (shared by 4 and 5)
     4. The crisis cascade: the loop driven by a small model, and a live chart (s-ci-cascata)
     5. The equations of the cascade, lighting up the loop one part at a time (s-ci-modelo)
     6. Predictions: the class votes before the answer is shown (.ci-prev)
     7. The peppered moth: «be the bird» (s-ci-mariposa-caca)
     8. The peppered moth, generation after generation (s-ci-mariposa-geracoes)
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

  /* ---------- 1. Steam physics, one idea at a time, with a drawing that answers the sliders ----------
     Each build introduces ONE term, in the order the next one needs it:
       0 F force → 1 A area → 2 p pressure (p = F ÷ A) → 3 F = p × A → 4 d distance → 5 W = F × d
       → 6 t time → 7 P = W ÷ t → 8 η efficiency.
     The drawing is made here (not in the HTML) so that it can change:
       pressure  → more steam particles, moving faster; longer blue arrows; the needle of the gauge
       diameter  → a taller cylinder and piston face; more blue arrows on the face
       force     → the orange arrow: its length is F (= length of the blue arrows × how many there are)
       from build 4 the piston travels the stroke d; from build 6 it pushes four times a second.
     Every number comes from the two sliders, so each equation uses the result of the one before. */
  document.querySelectorAll('[data-civ="forca"]').forEach(box => {
    const slide = box.closest('.slide'), svg = box.querySelector('.vf-svg');
    const p = box.querySelector('[name="p"]'), d = box.querySelector('[name="d"]');
    const round = (v, step) => Math.round(v / step) * step;
    const stepOf = sl => { let k = 0; while (sl.classList.contains('ge' + (k + 1))) k++; return k; };
    const CY = 150, X0 = 222, PX = 300, STROKE = 80;        // cylinder axis; left end of the cylinder; piston at rest; stroke in drawing units
    // --- fixed parts and the groups that change ---
    el('defs', {}, svg).innerHTML = '<marker id="vf-ponta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="context-stroke"/></marker>';
    el('rect', { x: 20, y: 60, width: 170, height: 180, rx: 22, class: 'vf-caldeira' }, svg);
    const tCal = el('text', { x: 105, y: 262, 'text-anchor': 'middle', class: 'vf-rot' }, svg); tCal.textContent = 'caldeira';
    el('rect', { x: 190, y: CY - 11, width: 32, height: 22, class: 'vf-caldeira' }, svg);
    const steamCyl = el('rect', { x: X0, class: 'vf-vapor' }, svg);
    const gDots = el('g', { class: 'vf-pontos' }, svg);                       // steam particles (from build 2)
    const gWall = el('g', { class: 'vf-setas' }, svg);                        // arrows on the boiler walls
    const cyl = el('rect', { x: 220, width: 262, rx: 4, class: 'vf-cilindro' }, svg);
    const tCil = el('text', { 'text-anchor': 'middle', class: 'vf-rot' }, svg); tCil.textContent = 'cilindro';
    const gPist = el('g', {}, svg);                                           // everything that moves with the piston
    const rod = el('rect', { y: CY - 7, height: 14, class: 'vf-haste' }, gPist);
    const head = el('rect', { width: 24, class: 'vf-embolo' }, gPist);
    const gFace = el('g', { class: 'vf-setas' }, gPist);                      // blue arrows on the piston face
    const face = el('ellipse', { rx: 11, class: 'vf-face' }, gPist);
    const tA = el('text', { 'text-anchor': 'middle', class: 'vf-letra-in' }, gPist); tA.textContent = 'A';
    const gF = el('g', { transform: 'translate(300,0)' }, svg);            // the force arrow stays in place while the piston moves
    const arrowF = el('path', { class: 'vf-F' }, gF), tF = el('text', { class: 'vf-letra c2' }, gF);
    const tArea = el('text', { x: 226, class: 'vf-letra c3 peq' }, svg);
    // gauge on the boiler
    const gGauge = el('g', { transform: 'translate(105,34)' }, svg);
    el('line', { x1: 0, y1: 14, x2: 0, y2: 26, class: 'vf-relogio' }, gGauge);
    el('circle', { r: 24, class: 'vf-mano' }, gGauge);
    const needle = el('line', { x1: 0, y1: 0, x2: 0, y2: -18, class: 'vf-agulha' }, gGauge);
    const tGauge = el('text', { x: 34, y: 7, class: 'vf-letra c1 peq' }, gGauge);
    // stroke, clock, efficiency
    const gD = el('g', {}, svg);
    const cota = el('path', { class: 'vf-cota' }, gD), tD = el('text', { 'text-anchor': 'middle', class: 'vf-letra c5 peq' }, gD); tD.textContent = 'd = 0,43 m';
    const tW = el('text', { x: 400, 'text-anchor': 'start', class: 'vf-letra c4 peq' }, svg);
    const gT = el('g', { transform: 'translate(60,318)' }, svg);
    el('circle', { r: 24, class: 'vf-relogio' }, gT);
    const hand = el('line', { x1: 0, y1: 0, x2: 0, y2: -18, class: 'vf-agulha t' }, gT);
    const tT = el('text', { x: 36, y: -4, class: 'vf-letra c7 peq' }, gT); tT.textContent = 't = 1 s';
    const tN = el('text', { x: 36, y: 20, class: 'vf-rot' }, gT);
    const tP = el('text', { x: 300, y: 326, class: 'vf-letra c6 peq' }, svg);
    const gN = el('g', {}, svg);
    const tTot = el('text', { x: 20, y: 364, class: 'vf-rot' }, gN); tTot.textContent = 'energia do carvão: 100 %';
    el('rect', { x: 20, y: 372, width: 520, height: 12, rx: 4, class: 'vf-total' }, gN);
    el('rect', { x: 20, y: 372, width: 16, height: 12, rx: 3, class: 'vf-util' }, gN);
    const tUtil = el('text', { x: 540, y: 364, 'text-anchor': 'end', class: 'vf-rot c8t' }, gN); tUtil.textContent = 'útil: cerca de 3 %';

    // --- steam particles: a fixed pool; how many are shown, and how fast they go, depends on the pressure ---
    const mk = (n, zone) => Array.from({ length: n }, () => ({ zone, u: Math.random(), v: Math.random(), a: Math.random() * 6.283, c: el('circle', { r: 3.2 }, gDots) }));
    const dots = mk(40, 'b').concat(mk(26, 'c'));
    let S = {};                                              // the numbers of the moment (see compute)
    function compute() {
      const bar = Number(p.value), cm = Number(d.value);
      const Pa = bar * 100000, r = cm / 200, A = Math.PI * r * r, F = Pa * A;
      const W = F * 0.432;                                   // stroke of 0,432 m (Rocket, 1829)
      const P = W * 4;                                       // 4 pushes per second (a round number for the sums)
      S = { bar, cm, Pa, A, F, W, P, H: 60 + cm * 3 };
      const sheets = A / 0.0624;                             // an A4 sheet is 0,0624 m²
      const vals = {
        p: fmt(bar, 1) + ' bar', pa: fmt(Pa) + ' Pa', d: fmt(cm) + ' cm', A: fmt(A, 3) + ' m²',
        folhas: sheets < 0.4 ? 'um quarto de uma folha A4' : sheets < 0.75 ? 'meia folha A4' : sheets < 1.25 ? 'uma folha A4' : sheets < 1.75 ? 'uma folha A4 e meia' : 'duas folhas A4',
        F: fmt(round(F, 10)) + ' N', kg: fmt(round(F / 9.8, 10)) + ' kg',
        W: fmt(round(W, 10)) + ' J', alt: fmt(W / (70 * 9.8), 1) + ' m',
        P: fmt(round(P, 100)) + ' W', kW: fmt(P / 1000, 0) + ' kW', cv: fmt(P / 735.5, 0),
        fogo: fmt(round(P / 0.03 / 1000, 10)) + ' kW',
      };
      for (const k in vals) box.querySelectorAll('[data-out="' + k + '"]').forEach(o => { o.textContent = vals[k]; });
    }
    const show = (node, on) => { node.style.display = on ? '' : 'none'; };
    function layout(step) {                                  // what depends on the sliders and on the build, not on time
      const H = S.H, top = CY - H / 2;
      cyl.setAttribute('y', top); cyl.setAttribute('height', H);
      steamCyl.setAttribute('y', top + 2); steamCyl.setAttribute('height', H - 4);
      tCil.setAttribute('x', 430); tCil.setAttribute('y', top + H + 20);
      head.setAttribute('y', top + 2); head.setAttribute('height', H - 4);
      face.setAttribute('ry', H / 2 - 8); face.setAttribute('cy', CY); tA.setAttribute('y', CY + 7);
      // blue arrows: one for every 5 cm of diameter (the area), as long as the pressure
      const n = Math.max(2, Math.round(S.cm / 5)), len = 12 + S.bar * 11;
      gFace.replaceChildren();
      for (let i = 0; i < n; i++) { const y = top + 10 + (H - 20) * (n === 1 ? 0.5 : i / (n - 1)); el('path', { d: `M${-14 - len},${y.toFixed(1)} L${-14},${y.toFixed(1)}` }, gFace); }
      gWall.replaceChildren();
      [[105, 60, 0, -1], [105, 240, 0, 1], [20, 150, -1, 0], [60, 60, 0, -1], [150, 240, 0, 1], [20, 105, -1, 0], [20, 195, -1, 0], [150, 60, 0, -1], [60, 240, 0, 1]].forEach(([x, y, dx, dy]) => {
        const l = len * 0.8;
        el('path', { d: `M${x - dx * (l + 6)},${y - dy * (l + 6)} L${x - dx * 6},${y - dy * 6}` }, gWall);
      });
      // the orange arrow: its length is the force (50 000 N would take the whole width)
      const lf = 10 + S.F / 50265 * 190, yF = top - 18;
      arrowF.setAttribute('d', `M40,${yF - 4} L${40 + lf},${yF - 4} L${40 + lf},${yF - 11} L${58 + lf},${yF} L${40 + lf},${yF + 11} L${40 + lf},${yF + 4} L40,${yF + 4} Z`);
      tF.setAttribute('x', 40); tF.setAttribute('y', yF - 18); tF.textContent = 'F = ' + fmt(round(S.F, 10)) + ' N';
      tArea.setAttribute('y', top + H + 20); tArea.textContent = 'A = ' + fmt(S.A, 3) + ' m²';
      needle.setAttribute('transform', `rotate(${(-120 + (S.bar - 1) / 3 * 240).toFixed(0)})`);
      tGauge.textContent = fmt(S.bar, 1) + ' bar';
      const yD = top + H + 38;
      cota.setAttribute('d', `M${PX},${yD} L${PX + STROKE},${yD} M${PX},${yD - 8} L${PX},${yD + 8} M${PX + STROKE},${yD - 8} L${PX + STROKE},${yD + 8}`);
      tD.setAttribute('x', PX + STROKE / 2); tD.setAttribute('y', yD + 24);
      tW.setAttribute('y', yD + 24);
      tP.textContent = 'P = 4 × W ÷ t = ' + fmt(S.P / 1000, 0) + ' kW';
      // which parts exist at this build
      show(face, step >= 1); show(tA, step >= 1); show(tArea, step >= 1);
      show(gDots, step >= 2); show(gFace, step >= 2); show(gWall, step >= 2); show(gGauge, step >= 2);
      show(gD, step >= 4); show(tW, step === 5); show(gT, step >= 6); show(tP, step >= 7); show(gN, step >= 8);
      face.classList.toggle('agora', step === 1); gFace.classList.toggle('agora', step === 2 || step === 3);
      gF.classList.toggle('agora', step === 0 || step === 3);
    }
    let lastStep = -1, last = 0, running = false, clock = 0;
    function frame(now) {
      if (!slide.classList.contains('current')) { running = false; return; }
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000 || 0.016, 0.05); last = now; clock += dt;
      const step = stepOf(slide);
      if (step !== lastStep) { lastStep = step; clock = 0; layout(step); }
      // the piston: at rest; then one slow push at a time (builds 4 and 5); then four pushes a second
      let x = 0, pushes = 0, part = 0;
      if (step >= 6) { const u = clock * 4; pushes = Math.floor(u) % 4 + 1; const f = u % 1; x = Math.floor(u) % 2 ? 1 - f : f; }
      else if (step >= 4) { const u = clock % 3.2; part = clamp(u / 1.6, 0, 1); x = u < 1.6 ? part : u < 2.2 ? 1 : 1 - (u - 2.2); }
      const px = PX + x * STROKE;
      gPist.setAttribute('transform', `translate(${px.toFixed(1)},0)`);
      rod.setAttribute('x', 24); rod.setAttribute('width', 540 - px - 24);
      steamCyl.setAttribute('width', Math.max(0, px - X0));
      if (step === 5) tW.textContent = 'W = ' + fmt(round(S.W * part, 10)) + ' J';
      if (step >= 6) { hand.setAttribute('transform', `rotate(${((clock % 1) * 360).toFixed(0)})`); tN.textContent = 'empurrão ' + pushes + ' de 4'; }
      // steam: the particles wander inside the boiler and inside the cylinder, faster when the pressure is higher
      const nb = Math.round(S.bar * 10), nc = Math.round(S.bar * 6.5), sp = 0.25 + S.bar * 0.22, H = S.H;
      let ib = 0, ic = 0;
      for (const q of dots) {
        const on = q.zone === 'b' ? ib++ < nb : ic++ < nc;
        q.c.style.display = on ? '' : 'none';
        if (!on) continue;
        q.u += Math.cos(q.a) * sp * dt; q.v += Math.sin(q.a) * sp * dt;
        if (q.u < 0 || q.u > 1) { q.a = Math.PI - q.a; q.u = clamp(q.u, 0, 1); }
        if (q.v < 0 || q.v > 1) { q.a = -q.a; q.v = clamp(q.v, 0, 1); }
        const cx = q.zone === 'b' ? 32 + q.u * 146 : X0 + 6 + q.u * Math.max(4, px - X0 - 14);
        const cy = q.zone === 'b' ? 72 + q.v * 156 : CY - H / 2 + 8 + q.v * (H - 16);
        q.c.setAttribute('cx', cx.toFixed(1)); q.c.setAttribute('cy', cy.toFixed(1));
      }
    }
    const start = () => { if (!running) { running = true; last = performance.now(); lastStep = -1; requestAnimationFrame(frame); } };
    [p, d].forEach(i => { stopNav(i); i.addEventListener('input', () => { compute(); layout(stepOf(slide)); }); });
    new MutationObserver(() => { if (slide.classList.contains('current')) start(); }).observe(slide, { attributes: true, attributeFilter: ['class'] });
    compute(); layout(0);
    if (slide.classList.contains('current')) start();
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
    const real = el('path', { d: pathOf(total, 150, 50), class: 'draw', pathLength: 1, stroke: '#F0A673', 'stroke-width': 4, fill: 'none' }, svg.querySelector('[data-k="real"]'));
    // buttons (last build): switch each wave off and on; the orange line is the trend plus the waves that are on
    const quadro = svg.closest('.quadro');
    if (quadro) quadro.querySelectorAll('[data-onda]').forEach(b => {
      stopNav(b);
      b.addEventListener('click', () => {
        const w = waves.find(x => x.k === b.dataset.onda); w.off = !w.off; b.classList.toggle('sel', !w.off);
        const sum = t => trend(t) + waves.reduce((acc, x) => acc + (x.off ? 0 : x.amp * Math.sin(2 * Math.PI * t / x.per)), 0) * 0.55;
        real.setAttribute('d', pathOf(sum, 150, 50));
        const lane = svg.querySelector('[data-k="' + w.k + '"]'); if (lane) lane.style.opacity = w.off ? 0.25 : 1;
      });
    });
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
  /* ---------- 6. Predictions: the class votes before the answer is shown ----------
     <div class="ci-prev" data-certa="c"> buttons with data-o … <p class="ci-prev-exp"> <button class="ci-prev-ver">
     A click on an option marks it (what the class chose); «Ver a resposta» shows the right one. */
  document.querySelectorAll('.ci-prev').forEach(box => {
    const opts = Array.from(box.querySelectorAll('button[data-o]'));
    opts.forEach(b => {
      stopNav(b);
      b.classList.toggle('certa', b.dataset.o === box.dataset.certa);
      b.addEventListener('click', () => { if (box.classList.contains('rev')) return; opts.forEach(o => o.classList.toggle('esc', o === b && !b.classList.contains('esc'))); });
    });
    const ver = box.querySelector('.ci-prev-ver');
    if (ver) { stopNav(ver); ver.addEventListener('click', () => box.classList.add('rev')); }
    // leaving the slide puts the question back, so it can be asked again to another class
    const slide = box.closest('.slide');
    if (slide) new MutationObserver(() => { if (!slide.classList.contains('current')) { box.classList.remove('rev'); opts.forEach(o => o.classList.remove('esc')); } }).observe(slide, { attributes: true, attributeFilter: ['class'] });
  });
  /* ---------- 7. The peppered moth: «be the bird» (s-ci-mariposa-caca) ----------
     A tree trunk seen from close up, clean (pale lichens) or covered in soot. In each round
     12 pale and 12 dark moths land on it and the player has 10 seconds to catch as many as
     possible. The moths are the same on both trunks; only the background changes. The count
     adds up over several rounds, so several students can play and the class reads the totals. */
  const MOTH = 'M0,-13 C-7,-15 -24,-9 -35,11 C-26,17 -9,15 0,10 C9,15 26,17 35,11 C24,-9 7,-15 0,-13 Z';   // wings open, head at the top
  const rand = (a, b) => a + Math.random() * (b - a);
  /** One moth, drawn around (0,0), about 66 units wide. kind: 'c' pale, 'e' dark. */
  function drawMoth(parent, kind) {
    const g = el('g', { class: 'mar ' + (kind === 'c' ? 'cl' : 'es') }, parent);
    el('path', { d: MOTH, class: 'mar-asa' }, g);
    for (let i = 0; i < (kind === 'c' ? 16 : 7); i++) {                 // the «pepper» on the wings
      const y = rand(-8, 11), x = rand(-1, 1) * (y + 14) * 1.25;       // inside the triangle of the wings
      el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: rand(0.9, 2).toFixed(1), class: 'mar-pinta' }, g);
    }
    el('ellipse', { cx: 0, cy: 0, rx: 3.4, ry: 12, class: 'mar-corpo' }, g);
    return g;
  }
  let audio = null;
  function blip(freq) {                                                  // a short sound for each catch
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = freq; o.type = 'triangle'; g.gain.setValueAtTime(0.07, audio.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.13);
    } catch (e) { /* no sound: the game still works */ }
  }
  document.querySelectorAll('[data-civ="caca"]').forEach(root => {
    const slide = root.closest('.slide'), svg = root.querySelector('.cc-tronco');
    const W = 900, H = 430, PER = 12, SECONDS = 10;
    const gBark = el('g', {}, svg), gMoths = el('g', {}, svg);
    const tally = { limpo: { c: 0, e: 0, n: 0 }, fuligem: { c: 0, e: 0, n: 0 } };
    let bark = 'limpo', playing = false, endAt = 0, left = { c: 0, e: 0 }, caught = { c: 0, e: 0 };
    const go = root.querySelector('.cc-go'), bar = root.querySelector('.cc-tempo span'), msg = root.querySelector('.cc-msg');
    const TONES = {
      limpo: { base: ['#CFCBBB', '#BEB9A8'], crack: '#8E8A79', blobs: ['#E4E6D6', '#D9DEC4', '#EEEBDD', '#C9CCB8'], dots: '#5E5C52' },
      fuligem: { base: ['#3B3935', '#2C2B28'], crack: '#1C1B19', blobs: ['#45423D', '#33312E', '#4A4741', '#2A2927'], dots: '#565249' },
    };
    function paintBark() {
      const tn = TONES[bark];
      gBark.replaceChildren();
      el('rect', { width: W, height: H, fill: tn.base[0] }, gBark);
      for (let i = 0; i < 16; i++) {                                     // vertical cracks of the bark
        const x = (i + rand(0.2, 0.8)) * W / 16; let d = `M${x.toFixed(0)},0`;
        for (let y = 60; y <= H + 30; y += 60) d += ` Q${(x + rand(-16, 16)).toFixed(0)},${y - 30} ${(x + rand(-8, 8)).toFixed(0)},${y}`;
        el('path', { d, fill: 'none', stroke: tn.crack, 'stroke-width': rand(2, 6).toFixed(1), opacity: 0.45 }, gBark);
      }
      for (let i = 0; i < 110; i++) el('ellipse', { cx: rand(0, W).toFixed(0), cy: rand(0, H).toFixed(0), rx: rand(10, 42).toFixed(0), ry: rand(8, 26).toFixed(0), fill: tn.blobs[i % tn.blobs.length], opacity: rand(0.45, 0.9).toFixed(2), transform: `rotate(${rand(0, 180).toFixed(0)} ${rand(0, W).toFixed(0)} ${rand(0, H).toFixed(0)})` }, gBark);
      for (let i = 0; i < 420; i++) el('circle', { cx: rand(0, W).toFixed(0), cy: rand(0, H).toFixed(0), r: rand(0.8, 2.2).toFixed(1), fill: tn.dots, opacity: 0.7 }, gBark);
      svg.classList.toggle('fuligem', bark === 'fuligem');
    }
    function paintTally() {
      for (const b in tally) for (const k of ['c', 'e']) {
        const t = tally[b], total = t.n * PER;
        root.querySelector(`[data-out="${b}-${k}"]`).textContent = t[k] + ' de ' + total;
        root.querySelector(`[data-barra="${b}-${k}"]`).style.width = (total ? t[k] / total * 100 : 0) + '%';
      }
      root.querySelectorAll('.cc-conta').forEach(c => c.classList.toggle('agora', c.dataset.conta === bark));
    }
    function setBark(b) {
      if (playing) return;
      bark = b;
      root.querySelectorAll('[data-tronco]').forEach(x => x.classList.toggle('sel', x.dataset.tronco === b));
      gMoths.replaceChildren(); paintBark(); paintTally();
      go.textContent = 'Começar · ' + SECONDS + ' segundos';
    }
    function finish() {
      playing = false; root.classList.remove('a-jogar');
      const t = tally[bark]; t.c += caught.c; t.e += caught.e; t.n += 1;
      gMoths.querySelectorAll('.mar').forEach(m => { m.classList.add('ficou'); el('circle', { r: 40, class: 'mar-anel' }, m); });
      bar.style.width = '0%';
      msg.textContent = `Nesta jogada apanhaste ${caught.c} claras e ${caught.e} escuras. As do círculo escaparam.`;
      go.textContent = 'Jogar outra vez';
      paintTally();
    }
    function tick(now) {
      if (!playing) return;
      const rest = Math.max(0, endAt - now);
      bar.style.width = (rest / (SECONDS * 1000) * 100) + '%';
      if (rest <= 0 || left.c + left.e === 0 || !slide.classList.contains('current')) { finish(); return; }
      requestAnimationFrame(tick);
    }
    function start() {
      if (playing) return;
      gMoths.replaceChildren();
      const big = svg.getBoundingClientRect().width < 520 ? 1.45 : 1;    // larger moths on a phone
      const pts = [];
      const kinds = [];
      for (let i = 0; i < PER; i++) kinds.push('c', 'e');
      kinds.sort(() => Math.random() - 0.5);
      kinds.forEach(kind => {
        let x, y, tries = 0;
        do { x = rand(50, W - 50); y = rand(40, H - 40); tries++; } while (tries < 200 && pts.some(p => Math.hypot(p[0] - x, p[1] - y) < 74 * big));
        pts.push([x, y]);
        const m = drawMoth(gMoths, kind);
        m.setAttribute('transform', `translate(${x.toFixed(0)},${y.toFixed(0)}) rotate(${rand(-70, 70).toFixed(0)}) scale(${(0.86 * big).toFixed(2)})`);
        m.addEventListener('pointerdown', e => {
          e.stopPropagation();
          if (!playing || m.dataset.fora) return;
          m.dataset.fora = '1'; m.classList.add('apanhada');
          caught[kind]++; left[kind]--; blip(kind === 'c' ? 880 : 660);
          setTimeout(() => m.remove(), 220);
        });
      });
      caught = { c: 0, e: 0 }; left = { c: PER, e: PER };
      playing = true; root.classList.add('a-jogar');
      msg.textContent = 'Toca nas mariposas que vires!';
      endAt = performance.now() + SECONDS * 1000;
      requestAnimationFrame(tick);
    }
    [go, ...root.querySelectorAll('[data-tronco]'), root.querySelector('.cc-limpar'), svg].forEach(stopNav);
    go.addEventListener('click', start);
    root.querySelectorAll('[data-tronco]').forEach(b => b.addEventListener('click', () => setBark(b.dataset.tronco)));
    root.querySelector('.cc-limpar').addEventListener('click', () => { for (const b in tally) tally[b] = { c: 0, e: 0, n: 0 }; paintTally(); });
    // the builds choose the trunk: clean first, then soot
    const stepOf = sl => { let k = 0; while (sl.classList.contains('ge' + (k + 1))) k++; return k; };
    let lastStep = -1;
    new MutationObserver(() => {
      if (!slide.classList.contains('current')) { lastStep = -1; return; }
      const st = stepOf(slide);
      if (st !== lastStep) { const was = lastStep; lastStep = st; if (playing) finish(); if (st === 0 && was !== 0) setBark('limpo'); if (st === 1 && was < 1) setBark('fuligem'); }
    }).observe(slide, { attributes: true, attributeFilter: ['class'] });
    setBark('limpo');
  });

  /* ---------- 8. The peppered moth, generation after generation (s-ci-mariposa-geracoes) ----------
     A teaching model. One generation per year. Each year the birds eat 30 % of the moths that are
     easy to see and 15 % of those that are hard to see; «soot» (0 to 1) says which is which:
       eaten(pale) = 0,15 + 0,15 × soot      eaten(dark) = 0,15 + 0,15 × (1 − soot)
       p' = p × s_dark ÷ (p × s_dark + (1 − p) × s_pale)        (daughters keep the parents' colour)
     Real records are drawn as diamonds: Manchester 1848 (first dark moth recorded) and 1895 (98 %);
     near Cambridge 2001–2007 (12 % → 1 %; Cook and others, 2012). */
  document.querySelectorAll('[data-civ="geracoes"]').forEach(root => {
    const slide = root.closest('.slide');
    const pop = root.querySelector('.cg-pop'), graf = root.querySelector('.cg-graf'), soot = root.querySelector('[name="fuligem"]');
    const SCEN = {
      manchester: { y0: 1848, p0: 0.01, soot: 100, span: 52, real: [[1848, 1, '1848: a primeira escura'], [1895, 98, '1895: 98 %']] },
      cambridge: { y0: 2001, p0: 0.12, soot: 0, span: 12, real: [[2001, 12], [2002, 10], [2003, 6], [2004, 7], [2005, 4], [2006, 2], [2007, 1, '2007: 1 %']] },
    };
    let sc, year, p, hist, auto = null, busy = false;
    // the trunk and its hundred moths (a fixed random order decides which ones are dark)
    const order = Array.from({ length: 100 }, (_, i) => i).sort(() => Math.random() - 0.5);
    const rank = []; order.forEach((cell, r) => { rank[cell] = r; });
    const bg = el('rect', { width: 440, height: 440, rx: 14 }, pop);
    const cells = [];
    for (let i = 0; i < 100; i++) {
      const g = el('g', { transform: `translate(${(24 + (i % 10) * 43.5).toFixed(1)},${(26 + Math.floor(i / 10) * 43).toFixed(1)}) rotate(${rand(-40, 40).toFixed(0)}) scale(0.5)` }, pop);
      el('path', { d: MOTH, class: 'mar-asa' }, g); el('ellipse', { cx: 0, cy: 0, rx: 3.4, ry: 12, class: 'mar-corpo' }, g);
      cells.push(g);
    }
    const mix = (a, b, t) => '#' + [0, 2, 4].map(i => Math.round(parseInt(a.slice(1 + i, 3 + i), 16) * (1 - t) + parseInt(b.slice(1 + i, 3 + i), 16) * t).toString(16).padStart(2, '0')).join('');
    const f = () => Number(soot.value) / 100;
    const surv = () => ({ c: 1 - (0.15 + 0.15 * f()), e: 1 - (0.15 + 0.15 * (1 - f())) });
    const nDark = q => (q <= 0.004 ? 0 : q >= 0.996 ? 100 : clamp(Math.round(q * 100), 1, 99));
    const pct = q => (q < 0.1 && q > 0 ? fmt(q * 100, 1) : fmt(q * 100)) + ' %';
    const next = q => { const s = surv(); return q * s.e / (q * s.e + (1 - q) * s.c); };
    function paintPop(eaten) {
      const d = nDark(p);
      bg.setAttribute('fill', mix('#CFCBBB', '#34322F', f()));
      cells.forEach((g, i) => {
        const dark = rank[i] < d;
        g.setAttribute('class', 'mar ' + (dark ? 'es' : 'cl') + (eaten && eaten.has(i) ? ' comida' : ''));
      });
    }
    // chart
    const X0 = 58, X1 = 540, Y0 = 196, Y1 = 22;
    function paintChart() {
      const span = Math.max(sc.span, year - sc.y0 + 2), xOf = y => X0 + (y - sc.y0) / span * (X1 - X0), yOf = v => Y0 - v / 100 * (Y0 - Y1);
      graf.replaceChildren();
      [0, 50, 100].forEach(v => { el('line', { x1: X0, x2: X1, y1: yOf(v), y2: yOf(v), class: 'cg-grelha' }, graf); const t = el('text', { x: X0 - 8, y: yOf(v) + 6, 'text-anchor': 'end', class: 'cg-eixo' }, graf); t.textContent = v + ' %'; });
      const stepY = span > 30 ? 10 : span > 14 ? 5 : 2;
      for (let y = Math.ceil(sc.y0 / stepY) * stepY; y <= sc.y0 + span; y += stepY) { const t = el('text', { x: xOf(y), y: Y0 + 22, 'text-anchor': 'middle', class: 'cg-eixo' }, graf); t.textContent = y; el('line', { x1: xOf(y), x2: xOf(y), y1: Y0, y2: Y0 + 5, class: 'cg-grelha' }, graf); }
      const tt = el('text', { x: X0, y: 14, class: 'cg-eixo cg-tit' }, graf); tt.textContent = 'mariposas escuras, em cada 100';
      el('polyline', { points: hist.map(h => xOf(h[0]).toFixed(1) + ',' + yOf(h[1] * 100).toFixed(1)).join(' '), class: 'cg-linha' }, graf);
      el('circle', { cx: xOf(year), cy: yOf(p * 100), r: 6, class: 'cg-ponto' }, graf);
      sc.real.forEach(([y, v, label]) => {
        const x = xOf(y), yy = yOf(v);
        el('path', { d: `M${x},${yy - 9} L${x + 8},${yy} L${x},${yy + 9} L${x - 8},${yy} Z`, class: 'cg-real' }, graf);
        if (label) { const t = el('text', { x: v > 50 ? x - 12 : x + 12, y: v > 50 ? yy + 24 : yy - 12, 'text-anchor': v > 50 ? 'end' : 'start', class: 'cg-eixo cg-rot' }, graf); t.textContent = label; }
      });
      const lg = el('text', { x: X1, y: 14, 'text-anchor': 'end', class: 'cg-eixo' }, graf); lg.textContent = '— modelo   ◆ registos reais';
    }
    function paintNumbers() {
      const s = surv(), d = p * 100, nC = 100 - d, eC = nC * s.c, eE = d * s.e;   // per 100 moths, on average
      const vals = {
        fuligem: soot.value + ' %', nC: fmt(nC, 1), nE: fmt(d, 1), sC: fmt(s.c, 2), sE: fmt(s.e, 2), eC: fmt(eC, eC < 10 ? 2 : 1), eE: fmt(eE, eE < 10 ? 2 : 1),
        p: pct(p), pNovo: pct(eE + eC > 0 ? eE / (eE + eC) : 0), ano: String(year),
      };
      for (const k in vals) root.querySelectorAll('[data-out="' + k + '"]').forEach(o => { o.textContent = vals[k]; });
    }
    function paint(eaten) { paintPop(eaten); paintChart(); paintNumbers(); }
    function load(name) {
      stop(); sc = SCEN[name]; year = sc.y0; p = sc.p0; hist = [[year, p]]; soot.value = sc.soot; paint();
    }
    function generation(fast) {
      if (busy) return;
      busy = true;
      // who is eaten this year (shown for a moment), then the next generation takes its place
      const s = surv(), d = nDark(p), eaten = new Set();
      const pick = (dark, n) => { const ids = cells.map((_, i) => i).filter(i => (rank[i] < d) === dark).sort(() => Math.random() - 0.5); ids.slice(0, n).forEach(i => eaten.add(i)); };
      pick(false, Math.round((100 - d) * (1 - s.c))); pick(true, Math.round(d * (1 - s.e)));
      paintPop(eaten);
      setTimeout(() => {
        p = next(p); year += 1; hist.push([year, p]);
        busy = false; paint();
        if (auto && (year - sc.y0 >= 160 || p > 0.9995 || p < 0.0005)) stop();
      }, fast ? 170 : 650);
    }
    function stop() { if (auto) { clearInterval(auto); auto = null; } const b = root.querySelector('[data-acao="auto"]'); b.textContent = 'Avançar'; b.classList.remove('sel'); }
    root.querySelectorAll('[data-acao]').forEach(b => {
      stopNav(b);
      b.addEventListener('click', () => {
        const a = b.dataset.acao;
        if (a === 'uma') { stop(); generation(false); }
        if (a === 'auto') { if (auto) stop(); else { auto = setInterval(() => { if (!slide.classList.contains('current')) stop(); else generation(true); }, 260); b.textContent = 'Pausa'; b.classList.add('sel'); } }
        if (a === 'repor') load('manchester');
        if (a === 'limpo') load('cambridge');
      });
    });
    stopNav(soot);
    soot.addEventListener('input', () => paint());
    load('manchester');
  });
})();
