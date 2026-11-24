/* vapor.js — a física da máquina a vapor, uma ideia por slide (novembro de 2026).

   Tudo parte do mesmo esquema, tirado do comboio: fornalha → caldeira → cilindro e pistão → roda.
     s-fv-ponte       o comboio desfaz-se e ficam só as quatro peças que interessam
     s-fv-pressao     caldeira: moléculas de água, barra da temperatura, manómetro
     s-fv-forca       pistão: F = p × A
     s-fv-trabalho    curso do pistão: W = F × d
     s-fv-potencia    roda: P = W ÷ t
     s-fv-rendimento  do combustível à roda: η = E útil ÷ E total
     s-fv-inducao     íman e bobina: V = N × ΔΦ ÷ Δt
   As barras (temperatura, diâmetro) são partilhadas: o valor escolhido num slide segue para o seguinte.

   Modelo (simplificado, ver as notas do professor):
     pressão  = pressão do vapor de água saturado à temperatura T, menos a do ar (é o que marca um manómetro)
     força    = pressão × área da face do pistão          (1 bar = 10 N em cada cm²)
     trabalho = força × curso (0,43 m, o da locomotiva Rocket)
     empurrões por segundo = 4 à pressão da Rocket (3,4 bar) e proporcionais à pressão: mais pressão, pistão mais rápido
     potência = trabalho de todos os empurrões de um segundo
   Para mudar um texto, edita o index.html; para mudar um número do modelo, edita as constantes abaixo. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const txt = (parent, x, y, s, cls, anchor) => { const t = el('text', { x: x, y: y, class: cls || 'fv-rot', 'text-anchor': anchor || 'middle' }, parent); t.textContent = s; return t; };
  const fmt = (v, dec) => { const s = Math.abs(v).toFixed(dec || 0).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (v < 0 ? '−' : '') + s.join(','); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const stepOf = sl => { let k = 0; while (sl.classList.contains('ge' + (k + 1))) k++; return k; };
  const stopNav = node => { ['keydown', 'touchstart', 'touchend', 'click'].forEach(ev => node.addEventListener(ev, e => e.stopPropagation(), { passive: ev !== 'keydown' })); if (node.matches('input')) node.addEventListener('change', () => node.blur()); };
  let uid = 0;

  /* ---------- o modelo ---------- */
  const CURSO = 0.43, ROCKET_P = 3.4, ROCKET_N = 4, AR = 1.013;
  const SAT = [[20, 0.023], [40, 0.074], [60, 0.199], [80, 0.474], [100, 1.013], [110, 1.433], [120, 1.985], [130, 2.701], [140, 3.614], [150, 4.76], [160, 6.18], [170, 7.92], [180, 10.03]];
  function psat(T) { for (let i = 1; i < SAT.length; i++) if (T <= SAT[i][0]) { const a = SAT[i - 1], b = SAT[i]; return a[1] + (b[1] - a[1]) * (T - a[0]) / (b[0] - a[0]); } return SAT[SAT.length - 1][1]; }
  const E = { T: 147, d: 20 };                               // estado partilhado pelos slides
  function contas() {
    const ps = psat(E.T), p = Math.max(0, Math.round((ps - AR) * 10) / 10);   // bar, acima do ar
    const A = Math.round(Math.PI * E.d * E.d / 4), F = Math.round(p * 10 * A), W = Math.round(F * CURSO);
    const n = Math.round(ROCKET_N * p / ROCKET_P * 10) / 10, P = Math.round(n * W);
    return { T: E.T, ps: ps, p: p, pn: Math.round(p * 10), d: E.d, r: E.d / 2, A: A, F: F, kg: Math.round(F / 10 / 10) * 10, W: W, n: n, Wt: P, P: P, kW: P / 1000, cv: P / 735.5 };
  }
  function pinta() {
    const c = contas();
    const v = { T: fmt(c.T) + ' °C', p: fmt(c.p, 1) + ' bar', pn: fmt(c.pn) + ' N', d: fmt(c.d) + ' cm', r: fmt(c.r, c.r % 1 ? 1 : 0) + ' cm', A: fmt(c.A) + ' cm²', F: fmt(c.F) + ' N', kg: fmt(c.kg) + ' kg', W: fmt(c.W) + ' J', n: fmt(c.n, 1), Wt: fmt(c.Wt) + ' J', P: fmt(c.P) + ' W', kW: fmt(c.kW, 1) + ' kW', cv: fmt(c.cv, c.cv < 10 ? 1 : 0),
      pnum: fmt(c.pn), Anum: fmt(c.A), Fnum: fmt(c.F), Wnum: fmt(c.W), Wtnum: fmt(c.Wt) };
    document.querySelectorAll('[data-fv]').forEach(o => { if (v[o.dataset.fv] != null) o.textContent = v[o.dataset.fv]; });
    document.querySelectorAll('[data-fv-in]').forEach(i => { if (+i.value !== E[i.dataset.fvIn]) i.value = E[i.dataset.fvIn]; });
    document.querySelectorAll('[data-fv-zero]').forEach(n => { n.hidden = c.p > 0; });
  }
  document.querySelectorAll('[data-fv-in]').forEach(i => { stopNav(i); i.addEventListener('input', () => { E[i.dataset.fvIn] = +i.value; pinta(); }); });
  document.querySelectorAll('[data-fv-set]').forEach(b => { stopNav(b); b.addEventListener('click', () => { const s = b.dataset.fvSet.split(':'); E[s[0]] = +s[1]; pinta(); }); });

  /* ---------- as peças do esquema (as mesmas em todos os slides) ---------- */
  const CY = 130, BX = 60, BY = 80, BW = 240, BH = 210, AGUA = 212;      // eixo do cilindro; caldeira; nível da água
  const RX = 850, RR = 110, MAN = 85, BIELA = 190, HASTE = 170;          // roda, manivela, biela, haste

  function pFogo(g) {
    el('rect', { x: BX + 8, y: 350, width: BW - 16, height: 20, rx: 10, class: 'fv-carvao' }, g);
    for (let i = 0; i < 9; i++) el('circle', { cx: BX + 26 + i * 24, cy: 352, r: 9, class: 'fv-carvao' }, g);
    const ch = []; for (let i = 0; i < 7; i++) ch.push(el('path', { class: i % 2 ? 'fv-chama b' : 'fv-chama' }, g));
    return (t, f) => ch.forEach((c, i) => {
      const x = BX + 30 + i * 30, h = (18 + 34 * f) * (0.8 + 0.2 * Math.sin(t * 9 + i * 1.7)), w = 13;
      c.setAttribute('d', 'M' + (x - w) + ',352 Q' + (x - w) + ',' + (352 - h * .5) + ' ' + (x + 3 * Math.sin(t * 7 + i)) + ',' + (352 - h) + ' Q' + (x + w) + ',' + (352 - h * .5) + ' ' + (x + w) + ',352 Z');
    });
  }
  function pCaldeira(g) {
    const id = 'fvc' + (++uid);
    el('clipPath', { id: id }, g).appendChild(el('rect', { x: BX, y: BY, width: BW, height: BH, rx: 26 }));
    el('rect', { x: BX, y: BY, width: BW, height: BH, rx: 26, class: 'fv-vapor-f' }, g);
    el('rect', { x: BX, y: AGUA, width: BW, height: BY + BH - AGUA, class: 'fv-agua', 'clip-path': 'url(#' + id + ')' }, g);
    const dentro = el('g', { 'clip-path': 'url(#' + id + ')' }, g);
    el('rect', { x: BX, y: BY, width: BW, height: BH, rx: 26, class: 'fv-cald' }, g);
    return dentro;
  }
  function pMec(g) {
    const vap = el('rect', { class: 'fv-vapor-c' }, g), gd = el('g', { class: 'fv-mol' }, g);
    const pts = []; for (let i = 0; i < 14; i++) pts.push({ n: el('circle', { r: 3.4 }, gd), a: Math.random(), b: Math.random(), f: Math.random() * 6.28 });
    const cil = el('rect', { x: 390, width: 212, rx: 6, class: 'fv-cil' }, g);
    const haste = el('rect', { y: CY - 6, height: 12, class: 'fv-haste' }, g), emb = el('rect', { width: 16, rx: 2, class: 'fv-emb' }, g);
    const roda = el('g', {}, g);
    el('circle', { cx: RX, cy: CY, r: RR, class: 'fv-roda' }, roda); el('circle', { cx: RX, cy: CY, r: RR - 12, class: 'fv-roda fina' }, roda);
    const raios = el('g', {}, roda); for (let i = 0; i < 8; i++) el('line', { x1: RX, y1: CY, x2: RX + (RR - 12) * Math.cos(i * Math.PI / 4), y2: CY + (RR - 12) * Math.sin(i * Math.PI / 4), class: 'fv-raio' }, raios);
    el('circle', { cx: RX, cy: CY, r: 12, class: 'fv-eixo' }, roda);
    const biela = el('line', { class: 'fv-biela' }, g), cruz = el('rect', { width: 22, height: 26, rx: 4, class: 'fv-cruz' }, g), pino = el('circle', { r: 9, class: 'fv-pino' }, g);
    const m = { g: g, roda: roda, biela: biela, pino: pino, cruz: cruz, px: 490, dir: 1 };
    m.set = (th, d, comVapor, t, dens) => {
      const h = 40 + (d - 10) * 2, y0 = CY - h / 2;
      const ax = RX + MAN * Math.cos(th), ay = CY + MAN * Math.sin(th), cx = ax - Math.sqrt(BIELA * BIELA - (ay - CY) * (ay - CY)), px = cx - HASTE;
      m.dir = Math.sin(th) > 0 ? 1 : -1; m.px = px; m.h = h;        // sin > 0: o pino vai para a direita, o pistão também
      cil.setAttribute('y', y0); cil.setAttribute('height', h);
      emb.setAttribute('x', px - 8); emb.setAttribute('y', y0 + 3); emb.setAttribute('height', h - 6);
      haste.setAttribute('x', px + 8); haste.setAttribute('width', cx - px - 8);
      cruz.setAttribute('x', cx - 11); cruz.setAttribute('y', CY - 13);
      biela.setAttribute('x1', cx); biela.setAttribute('y1', CY); biela.setAttribute('x2', ax); biela.setAttribute('y2', ay);
      pino.setAttribute('cx', ax); pino.setAttribute('cy', ay);
      raios.setAttribute('transform', 'rotate(' + (th * 180 / Math.PI) + ' ' + RX + ' ' + CY + ')');
      const x1 = m.dir > 0 ? 394 : px + 8, x2 = m.dir > 0 ? px - 8 : 598;
      vap.setAttribute('x', x1); vap.setAttribute('y', y0 + 3); vap.setAttribute('width', Math.max(0, x2 - x1)); vap.setAttribute('height', h - 6);
      vap.style.opacity = comVapor ? 1 : 0; gd.style.opacity = comVapor ? 1 : 0;
      const quantos = Math.round(clamp(dens, 0, 1) * pts.length);
      pts.forEach((q, i) => { q.n.style.display = i < quantos ? '' : 'none'; q.n.setAttribute('cx', x1 + 5 + (q.a * .9 + .05 * Math.sin(t * 5 + q.f)) * Math.max(0, x2 - x1 - 10)); q.n.setAttribute('cy', y0 + 9 + (q.b * .9 + .05 * Math.cos(t * 6 + q.f)) * (h - 18)); });
    };
    return m;
  }

  /* ---------- lista de cenas vivas: só a do slide que está no ecrã se mexe ---------- */
  const cenas = [];
  let antes = 0;
  function ciclo(agora) {
    const dt = Math.min(.05, (agora - antes) / 1000 || 0); antes = agora;
    cenas.forEach(c => { if (c.slide.classList.contains('current')) c.tick(dt, agora / 1000, stepOf(c.slide)); });
    requestAnimationFrame(ciclo);
  }

  /* ---------- a cena completa (caldeira com moléculas, cilindro, roda) ---------- */
  function Cena(svg) {
    const slide = svg.closest('.slide'), modo = svg.dataset.fvCena, o = svg.dataset;
    const mostra = (o.mostra || '').split(' ');                 // extras: face curso relogio forca energia
    const tem = k => mostra.indexOf(k) >= 0;
    const passo = k => +(o['passo' + k] || 0);                  // a partir de que clique aparece cada extra
    el('defs', {}, svg).innerHTML = '<marker id="fv-ponta' + (++uid) + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.4" markerHeight="3.4" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="context-stroke"/></marker>';
    const ponta = 'url(#fv-ponta' + uid + ')';
    const gF = el('g', {}, svg), fogo = pFogo(gF);
    const gC = el('g', {}, svg), dentro = pCaldeira(gC);
    // água: grelha de moléculas que tremem; vapor: moléculas livres
    const liq = [], NL = 14, ML = 4;
    const gl = el('g', { class: 'fv-mol liq' }, dentro);
    for (let j = 0; j < ML; j++) for (let i = 0; i < NL; i++) liq.push({ n: el('circle', { r: 4.2 }, gl), x: BX + 14 + i * (BW - 28) / (NL - 1) + (j % 2 ? 7 : 0), y: AGUA + 14 + j * 17, f: Math.random() * 6.28, g: Math.random() * 6.28 });
    const bolhas = []; const gb = el('g', {}, dentro); for (let i = 0; i < 6; i++) bolhas.push({ n: el('circle', { class: 'fv-bolha' }, gb), x: BX + 30 + Math.random() * (BW - 60), y: AGUA + 70 * Math.random(), v: 20 + 30 * Math.random(), r: 3 + 4 * Math.random() });
    const gv = el('g', { class: 'fv-mol' }, dentro), vap = [];
    for (let i = 0; i < 64; i++) vap.push({ n: el('circle', { r: 4.2 }, gv), on: false, x: 0, y: 0, vx: 0, vy: 0 });
    const gfl = el('g', {}, svg), fl = []; for (let i = 0; i < 26; i++) fl.push({ n: el('circle', { class: 'fv-pancada' }, gfl), vida: 0 });
    let ifl = 0;
    const pancada = (x, y) => { const f = fl[ifl = (ifl + 1) % fl.length]; f.vida = 1; f.n.setAttribute('cx', x); f.n.setAttribute('cy', y); };
    txt(svg, BX + BW / 2, 394, 'fornalha'); txt(svg, 118, 66, 'caldeira');
    // manómetro e termómetro
    const mx = +(o.manoX || 252), my = +(o.manoY || 42), mr = +(o.manoR || 26);
    const gm = el('g', { transform: 'translate(' + mx + ',' + my + ')' }, svg);
    if (!o.manoX) el('line', { x1: 0, y1: mr, x2: 0, y2: BY - my, class: 'fv-fio' }, gm);
    el('circle', { r: mr, class: 'fv-mano' }, gm);
    for (let i = 0; i <= 9; i++) { const a = (-210 + i * 240 / 9) * Math.PI / 180; el('line', { x1: Math.cos(a) * mr * .78, y1: Math.sin(a) * mr * .78, x2: Math.cos(a) * mr * .94, y2: Math.sin(a) * mr * .94, class: 'fv-traco' }, gm); }
    const agulha = el('line', { x1: 0, y1: 0, x2: 0, y2: -mr * .72, class: 'fv-agulha' }, gm); el('circle', { r: mr * .09, class: 'fv-eixo' }, gm);
    const tMano = txt(svg, o.manoX ? mx : mx + mr + 8, o.manoX ? my + mr + 34 : my + 8, '', 'fv-val c1', o.manoX ? 'middle' : 'start');
    if (o.manoX) { txt(svg, mx, my - mr - 14, 'manómetro'); el('path', { d: 'M' + (BX + BW) + ',' + (BY + 40) + ' H' + (mx - mr * .2) + ' V' + (my + mr), class: 'fv-fio' }, svg).parentNode.insertBefore(svg.lastChild, gm); }
    const gt = el('g', {}, svg);
    el('rect', { x: 22, y: 96, width: 14, height: 176, rx: 7, class: 'fv-termo' }, gt); el('circle', { cx: 29, cy: 280, r: 13, class: 'fv-termo-b' }, gt);
    const merc = el('rect', { x: 25, width: 8, class: 'fv-merc' }, gt), tT = txt(svg, 30, 86, '', 'fv-val c2 peq');
    // tubo, mecanismo
    const gMec = el('g', {}, svg);
    if (modo !== 'caldeira') { el('rect', { x: BX + BW, y: CY - 9, width: 392 - BX - BW, height: 18, class: 'fv-tubo' }, gMec); }
    const mec = modo !== 'caldeira' ? pMec(gMec) : null;
    let tCil = null, tRoda = null;
    if (mec) {
      tCil = txt(svg, 495, 0, 'cilindro e pistão');
      if (modo === 'pistao') { mec.roda.style.display = 'none'; mec.biela.style.display = 'none'; mec.pino.style.display = 'none'; }
      else { tRoda = txt(svg, RX, CY + RR + 30, 'roda'); el('line', { x1: RX - 150, y1: CY + RR + 3, x2: RX + 130, y2: CY + RR + 3, class: 'fv-carril' }, gMec); }
    }
    // extras
    const X = {};
    if (tem('forca')) { X.forca = el('g', {}, svg); X.fseta = el('path', { class: 'fv-F', 'marker-end': ponta }, X.forca); X.ftxt = txt(X.forca, 0, 0, '', 'fv-val c2', 'start'); }
    if (tem('face')) {
      X.face = el('g', {}, svg);
      const pid = 'fvg' + (++uid);
      el('defs', {}, X.face).innerHTML = '<pattern id="' + pid + '" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M4,0 H0 V4" class="fv-grelha"/></pattern>';
      X.liga = el('path', { class: 'fv-liga' }, X.face);
      X.disco = el('circle', { cx: 440, cy: 300, class: 'fv-face' }, X.face); X.disco2 = el('circle', { cx: 440, cy: 300, fill: 'url(#' + pid + ')' }, X.face);
      X.tA = txt(X.face, 0, 0, '', 'fv-val c3', 'start'); X.tA2 = txt(X.face, 0, 0, 'o pistão visto de frente', 'fv-rot peq', 'start'); X.tA3 = txt(X.face, 0, 0, 'cada quadradinho: 1 cm²', 'fv-rot peq', 'start');
    }
    if (tem('zoom')) {
      X.zoom = el('g', { transform: 'translate(' + (+(o.zoomX || 0)) + ',' + (+(o.zoomY || 0)) + ')' }, svg);
      el('rect', { x: 20, y: 300, width: 64, height: 64, class: 'fv-zoom' }, X.zoom); el('path', { d: 'M52,290 V250', class: 'fv-p', 'marker-start': ponta }, X.zoom);
      X.tz = txt(X.zoom, 94, 328, '', 'fv-val c1', 'start'); txt(X.zoom, 94, 352, 'em cada cm²', 'fv-rot peq', 'start'); txt(X.zoom, 52, 384, '1 cm²', 'fv-rot peq');
    }
    if (tem('curso')) { X.curso = el('g', {}, svg); X.cota = el('path', { class: 'fv-cota' }, X.curso); X.tD = txt(X.curso, 490, 0, 'd = 0,43 m', 'fv-val c5'); }
    if (tem('energia')) { X.energia = el('g', {}, svg); X.tE = txt(X.energia, 0, 0, '', 'fv-val c4'); X.tEt = txt(X.energia, 770, 352, '', 'fv-val c4 peq', 'start'); txt(X.energia, 770, 322, 'energia passada à roda:', 'fv-rot peq', 'start'); }
    if (tem('relogio')) {
      X.relogio = el('g', { transform: 'translate(372,322)' }, svg);
      el('circle', { r: 44, class: 'fv-mano' }, X.relogio); el('rect', { x: -7, y: -58, width: 14, height: 12, rx: 3, class: 'fv-eixo' }, X.relogio);
      X.pont = el('line', { x1: 0, y1: 0, x2: 0, y2: -34, class: 'fv-agulha c7' }, X.relogio);
      X.tR = txt(svg, 428, 312, '', 'fv-val c7 peq', 'start'); X.tR2 = txt(svg, 428, 344, '', 'fv-val c6 peq', 'start');
    }
    let th = Math.PI * .5, flu = 0, ult = 1, soma = 0, seg = 0, emp = 0, T0 = -1;
    const c = { slide: slide };
    c.tick = (dt, t, st) => {
      const k = contas(), T = k.T, quente = (T - 20) / 160;
      // fogo, termómetro, manómetro
      fogo(t, .15 + .85 * quente);
      const hm = 20 + 150 * quente; merc.setAttribute('y', 270 - hm); merc.setAttribute('height', hm + 6); tT.textContent = fmt(T) + ' °C';
      agulha.setAttribute('transform', 'rotate(' + (-120 + clamp(k.p, 0, 9) * 240 / 9) + ')'); tMano.textContent = fmt(k.p, 1) + ' bar';
      // água: treme mais com a temperatura
      const amp = 1 + 5 * quente, fr = 4 + 12 * quente;
      liq.forEach(q => { q.n.setAttribute('cx', q.x + amp * Math.sin(t * fr + q.f)); q.n.setAttribute('cy', q.y + amp * Math.cos(t * fr * 1.13 + q.g)); });
      bolhas.forEach(b => { b.y -= b.v * dt * (T >= 100 ? 1 : 0); if (b.y < AGUA + 4) { b.y = BY + BH - 6; b.x = BX + 30 + Math.random() * (BW - 60); } b.n.setAttribute('cx', b.x); b.n.setAttribute('cy', b.y); b.n.setAttribute('r', b.r); b.n.style.opacity = T >= 100 ? .8 : 0; });
      // vapor: mais moléculas e mais rápidas (velocidade exagerada para se ver)
      const alvo = clamp(Math.round(k.ps * 6.2), 1, vap.length), vel = 55 * (0.6 + 1.7 * quente);
      let vivos = 0; vap.forEach(q => { if (q.on) vivos++; });
      if (vivos < alvo) { const q = vap.find(z => !z.on); const a = -Math.PI * (.15 + .7 * Math.random()); q.on = true; q.x = BX + 20 + Math.random() * (BW - 40); q.y = AGUA - 5; q.vx = Math.cos(a); q.vy = Math.sin(a); }
      vap.forEach(q => {
        if (!q.on) { q.n.style.display = 'none'; return; }
        q.x += q.vx * vel * dt; q.y += q.vy * vel * dt;
        if (q.x < BX + 7) { q.x = BX + 7; q.vx = Math.abs(q.vx); pancada(BX + 2, q.y); }
        if (q.x > BX + BW - 7) { q.x = BX + BW - 7; q.vx = -Math.abs(q.vx); pancada(BX + BW - 2, q.y); }
        if (q.y < BY + 7) { q.y = BY + 7; q.vy = Math.abs(q.vy); pancada(q.x, BY + 2); }
        if (q.y > AGUA - 5) { if (vivos > alvo && Math.random() < .5) { q.on = false; vivos--; } else { q.y = AGUA - 5; q.vy = -Math.abs(q.vy); } }
        q.n.style.display = ''; q.n.setAttribute('cx', q.x); q.n.setAttribute('cy', q.y);
      });
      fl.forEach(f => { if (f.vida > 0) { f.vida -= dt * 2.6; f.n.setAttribute('r', 4 + 9 * (1 - f.vida)); f.n.style.opacity = Math.max(0, f.vida); } else f.n.style.opacity = 0; });
      if (X.zoom) { X.zoom.style.opacity = st >= passo('Zoom') ? 1 : 0; X.tz.textContent = fmt(k.pn) + ' N'; }
      if (!mec) return;
      // pistão: a rapidez depende da pressão (sem pressão acima do ar, não anda)
      const voltas = k.n / 4;                                    // voltas da roda por segundo (2 cilindros × 2 empurrões por volta)
      th += dt * voltas * 2 * Math.PI;
      mec.set(th, k.d, k.p > 0, t, k.p / 6);
      const h = mec.h, baixo = CY + h / 2;
      tCil.setAttribute('y', baixo + 26);
      if (mec.dir !== ult) { ult = mec.dir; emp++; soma += k.W; flu = 1; }
      if (X.forca) {
        X.forca.style.opacity = st >= passo('Forca') && k.p > 0 ? 1 : 0;
        const L = 26 + 120 * clamp(k.F / 60000, 0, 1), y = CY - h / 2 - 22, x0 = mec.dir > 0 ? mec.px - 10 : mec.px + 10, x1 = Math.max(404, x0 + mec.dir * L);
        X.fseta.setAttribute('d', 'M' + x0 + ',' + y + ' H' + x1); X.ftxt.setAttribute('x', 452); X.ftxt.setAttribute('y', Math.max(30, y - 26)); X.ftxt.textContent = 'F = ' + fmt(k.F) + ' N';
      }
      if (X.face) {
        X.face.style.opacity = st >= passo('Face') ? 1 : 0; tCil.style.opacity = st >= passo('Face') ? 0 : 1;
        const r = k.d * 2, cy = 380 - r - 4; [X.disco, X.disco2].forEach(n => { n.setAttribute('r', r); n.setAttribute('cy', cy); });
        X.liga.setAttribute('d', 'M' + mec.px + ',' + (baixo - 3) + ' L' + (440 - r) + ',' + cy + ' M' + mec.px + ',' + (CY - h / 2 + 3) + ' L' + (440 + r) + ',' + cy);
        X.tA.setAttribute('x', 440 + r + 16); X.tA.setAttribute('y', cy - 6); X.tA.textContent = 'A = ' + fmt(k.A) + ' cm²';
        X.tA2.setAttribute('x', 440 + r + 16); X.tA2.setAttribute('y', cy + 20); X.tA3.setAttribute('x', 440 + r + 16); X.tA3.setAttribute('y', cy + 42);
      }
      if (X.curso) { X.curso.style.opacity = st >= passo('Curso') ? 1 : 0; const y = baixo + 46; X.cota.setAttribute('d', 'M405,' + (y - 9) + ' V' + (y + 9) + ' M405,' + y + ' H575 M575,' + (y - 9) + ' V' + (y + 9)); X.tD.setAttribute('y', y + 34); tCil.style.opacity = st >= passo('Curso') ? 0 : 1; }
      if (X.energia) {
        X.energia.style.opacity = st >= passo('Energia') && k.p > 0 ? 1 : 0;
        flu = Math.max(0, flu - dt * 1.1); X.tE.setAttribute('x', 650 + (1 - flu) * 60); X.tE.setAttribute('y', CY + 112 - (1 - flu) * 40); X.tE.style.opacity = flu; X.tE.textContent = '+ ' + fmt(k.W) + ' J';
        X.tEt.textContent = fmt(soma) + ' J';
      }
      if (X.relogio) {
        const on = st >= passo('Relogio'); X.relogio.style.opacity = on ? 1 : 0; X.tR.style.opacity = on ? 1 : 0; X.tR2.style.opacity = on ? 1 : 0;
        if (T0 !== k.T + k.d * 1000) { T0 = k.T + k.d * 1000; seg = 0; emp = 0; soma = 0; }
        seg += dt; if (seg >= 10) { seg = 0; emp = 0; soma = 0; }
        X.pont.setAttribute('transform', 'rotate(' + (seg * 36) + ')');
        X.tR.textContent = fmt(seg, 1) + ' s · ' + emp + (emp === 1 ? ' empurrão' : ' empurrões'); X.tR2.textContent = fmt(k.n, 1) + ' empurrões por segundo';
      }
    };
    cenas.push(c);
  }
  document.querySelectorAll('svg[data-fv-cena]').forEach(Cena);

  /* ---------- a ponte: do comboio ao esquema ---------- */
  document.querySelectorAll('svg[data-fv-ponte]').forEach(svg => {
    const slide = svg.closest('.slide');
    const veste = el('g', { class: 'fv-veste' }, svg);                          // tudo o que NÃO interessa para a física
    const carris = el('line', { x1: 0, y1: 343, x2: 980, y2: 343, class: 'fv-carril' }, veste), trav = el('line', { x1: 0, y1: 350, x2: 980, y2: 350, class: 'fv-trav' }, veste);
    el('rect', { x: 40, y: 215, width: 176, height: 88, rx: 6, class: 'fv-chapa' }, veste); el('path', { d: 'M52,215 Q90,170 130,196 Q170,176 204,215 Z', class: 'fv-carvao' }, veste);
    const rodinhas = [[85, 318, 24], [172, 318, 24], [300, 306, 36]].map(r => { const g = el('g', {}, veste); el('circle', { cx: r[0], cy: r[1], r: r[2], class: 'fv-roda' }, g); const s = el('g', {}, g); for (let i = 0; i < 4; i++) el('line', { x1: r[0] - r[2] * Math.cos(i * Math.PI / 4), y1: r[1] - r[2] * Math.sin(i * Math.PI / 4), x2: r[0] + r[2] * Math.cos(i * Math.PI / 4), y2: r[1] + r[2] * Math.sin(i * Math.PI / 4), class: 'fv-raio' }, s); return { s: s, r: r }; });
    el('line', { x1: 216, y1: 290, x2: 256, y2: 290, class: 'fv-biela' }, veste);
    el('rect', { x: 256, y: 105, width: 80, height: 201, rx: 8, class: 'fv-chapa' }, veste);
    el('rect', { x: 710, y: 110, width: 38, height: 110, rx: 5, class: 'fv-chapa' }, veste); el('path', { d: 'M716,110 V40 L708,22 H750 L742,40 V110 Z', class: 'fv-chapa' }, veste);
    el('rect', { x: 250, y: 222, width: 512, height: 11, rx: 3, class: 'fv-chapa' }, veste);
    const fumo = []; for (let i = 0; i < 5; i++) fumo.push(el('circle', { class: 'fv-fumo' }, veste));
    const gC = el('g', {}, svg); pCaldeira(gC);
    const gF = el('g', {}, svg), fogo = pFogo(gF);
    const gT = el('g', {}, svg); el('rect', { x: BX + BW, y: CY - 9, width: 392 - BX - BW, height: 18, class: 'fv-tubo' }, gT);
    const gM = el('g', {}, svg), mec = pMec(gM);
    const rot = [['fornalha', 296, 96, 180, 394], ['caldeira', 520, 104, 180, 66], ['cilindro e pistão', 427, 322, 495, 196], ['roda', 640, 374, 850, 270]].map(r => ({ n: txt(svg, 0, 0, r[0], 'fv-rot gr'), r: r }));
    const mix = (a, b, k) => a + (b - a) * k;
    const pose = (g, tx, ty, sx, sy, k) => g.setAttribute('transform', 'translate(' + mix(tx, 0, k) + ',' + mix(ty, 0, k) + ') scale(' + mix(sx, 1, k) + ',' + mix(sy, 1, k) + ')');
    let k = 0, th = 0, dash = 0;
    cenas.push({ slide: slide, tick: (dt, t, st) => {
      const alvo = st >= 2 ? 1 : 0; k = clamp(k + Math.sign(alvo - k) * dt / 1.8, 0, 1);
      const e = k * k * (3 - 2 * k);
      th += dt * 2 * Math.PI * .7; dash -= dt * 290 * (1 - e);
      veste.style.opacity = st >= 2 ? Math.max(0, .14 * (1 - k * 2.5)) : st >= 1 ? .14 : 1;
      trav.setAttribute('stroke-dashoffset', dash);
      rodinhas.forEach(w => w.s.setAttribute('transform', 'rotate(' + (-dash / w.r[2] * 57.3) + ' ' + w.r[0] + ' ' + w.r[1] + ')'));
      fumo.forEach((f, i) => { const u = (t * .5 + i / fumo.length) % 1; f.setAttribute('cx', 729 - u * 130); f.setAttribute('cy', 14 - u * 26); f.setAttribute('r', 9 + u * 22); f.style.opacity = .55 * (1 - u); });
      pose(gC, 235, 85.7, 1.583, .4286, e); pose(gF, 248.8, -17, .27, .857, e); pose(gM, 130, 196, .6, .6, e);
      gT.style.opacity = Math.max(0, e * 2 - 1);
      fogo(t, .8); mec.set(th, 20, true, t, .6);
      rot.forEach(r => { r.n.setAttribute('x', mix(r.r[1], r.r[3], e)); r.n.setAttribute('y', mix(r.r[2], r.r[4], e)); r.n.style.opacity = st >= 1 ? 1 : 0; });
    } });
  });

  /* ---------- rendimento: 100 quadradinhos de energia ---------- */
  document.querySelectorAll('.fv-eta').forEach(box => {
    const gr = box.querySelector('.fv-eta-grelha'), qs = [];
    for (let i = 0; i < 100; i++) { const q = document.createElement('i'); q.style.transitionDelay = (i * 6) + 'ms'; gr.appendChild(q); qs.push(q); }
    const slide = box.closest('.slide'), bts = Array.from(slide.querySelectorAll('[data-fv-eta]'));
    const por = v => { bts.forEach(b => b.classList.toggle('on', +b.dataset.fvEta === v));
      qs.forEach((q, i) => q.classList.toggle('util', i < v));
      slide.querySelectorAll('[data-eta]').forEach(o => { o.textContent = o.dataset.eta === 'u' ? v : o.dataset.eta === 'p' ? 100 - v : o.dataset.eta === 'n' ? bts.find(b => +b.dataset.fvEta === v).dataset.nome : v + ' %'; }); };
    bts.forEach(b => { stopNav(b); b.addEventListener('click', () => por(+b.dataset.fvEta)); });
    por(3);
  });

  /* ---------- indução: um íman que entra e sai de uma bobina ---------- */
  document.querySelectorAll('svg[data-fv-inducao]').forEach(svg => {
    const slide = svg.closest('.slide'), E2 = { f: .5, N: 200 };
    const FMAX = 0.01;                                             // fluxo máximo numa volta, em weber (valor de exercício)
    slide.querySelectorAll('[data-ind-in]').forEach(i => { stopNav(i); i.addEventListener('input', () => { E2[i.dataset.indIn] = +i.value; }); });
    const gL = el('g', {}, svg), linhas = []; for (let i = 0; i < 5; i++) linhas.push(el('path', { class: 'fv-campo' }, gL));
    const gAtras = el('g', {}, svg), gIman = el('g', {}, svg), gFrente = el('g', {}, svg);
    el('rect', { x: -110, y: -32, width: 110, height: 64, rx: 6, class: 'fv-iman n' }, gIman); el('rect', { x: 0, y: -32, width: 110, height: 64, rx: 6, class: 'fv-iman s' }, gIman);
    txt(gIman, -55, 12, 'N', 'fv-polo'); txt(gIman, 55, 12, 'S', 'fv-polo');
    const BX2 = 520, BY2 = 170;
    let voltasDes = [];
    const desenhaBobina = n => { gAtras.innerHTML = ''; gFrente.innerHTML = ''; const m = Math.round(n / 50), w = 190; for (let i = 0; i < m; i++) { const x = BX2 - w / 2 + (m === 1 ? w / 2 : i * w / (m - 1)); el('path', { d: 'M' + x + ',' + (BY2 - 78) + ' A22,78 0 0 1 ' + x + ',' + (BY2 + 78), class: 'fv-fio-b tras' }, gAtras); el('path', { d: 'M' + x + ',' + (BY2 - 78) + ' A22,78 0 0 0 ' + x + ',' + (BY2 + 78), class: 'fv-fio-b' }, gFrente); } voltasDes = n; };
    txt(svg, BX2, BY2 + 112, 'bobina', 'fv-rot'); const tN = txt(svg, BX2, BY2 + 140, '', 'fv-val c2 peq');
    // voltímetro e lâmpada
    el('path', { d: 'M' + (BX2 - 95) + ',' + (BY2 - 78) + ' V40 H800 V' + (BY2 - 62) + ' M' + (BX2 + 95) + ',' + (BY2 + 78) + ' V330 H800 V' + (BY2 + 62), class: 'fv-fio' }, svg);
    const gV = el('g', { transform: 'translate(800,' + BY2 + ')' }, svg);
    el('circle', { r: 62, class: 'fv-mano' }, gV); for (let i = 0; i <= 8; i++) { const a = (-150 + i * 15) * Math.PI / 180; el('line', { x1: Math.cos(a) * 48, y1: Math.sin(a) * 48, x2: Math.cos(a) * 58, y2: Math.sin(a) * 58, class: 'fv-traco' }, gV); }
    txt(gV, 0, 34, 'V', 'fv-val c4 peq'); const ag = el('line', { x1: 0, y1: 0, x2: 0, y2: -46, class: 'fv-agulha' }, gV); el('circle', { r: 5, class: 'fv-eixo' }, gV);
    const tV = txt(svg, 800, BY2 + 100, '', 'fv-val c4'); txt(svg, 800, BY2 - 80, 'voltímetro', 'fv-rot');
    const lamp = el('circle', { cx: 660, cy: 40, r: 20, class: 'fv-lamp' }, svg), halo = el('circle', { cx: 660, cy: 40, r: 44, class: 'fv-halo' }, svg);
    // barras do fluxo
    txt(svg, 40, 318, 'Φ fluxo que atravessa a bobina', 'fv-rot peq', 'start'); el('rect', { x: 40, y: 330, width: 300, height: 18, rx: 9, class: 'fv-barra' }, svg); const bF = el('rect', { x: 40, y: 330, height: 18, rx: 9, class: 'fv-barra phi' }, svg);
    const tQ = txt(svg, 40, 386, '', 'fv-val c1 peq', 'start');
    let fase = 0, phiAnt = null, Vs = 0;
    const g = x => Math.exp(-Math.pow((x - BX2) / 120, 2));         // parte do campo do íman que atravessa a bobina
    cenas.push({ slide: slide, tick: (dt, t) => {
      if (voltasDes !== E2.N) desenhaBobina(E2.N);
      fase += dt * 2 * Math.PI * E2.f;
      const x = 330 + 190 * (0.5 - 0.5 * Math.cos(fase)), ponta = x + 110, phi = FMAX * g(ponta - 20);
      gIman.setAttribute('transform', 'translate(' + x + ',' + BY2 + ')');
      linhas.forEach((l, i) => { const a = (i - 2) * 26; l.setAttribute('d', 'M' + (x + 110) + ',' + (BY2 + a * .5) + ' C' + (x + 160) + ',' + (BY2 + a * .9) + ' ' + (x + 210) + ',' + (BY2 + a * 1.7) + ' ' + (x + 250) + ',' + (BY2 + a * 2.6)); });
      const V = phiAnt == null || dt <= 0 ? 0 : E2.N * (phi - phiAnt) / dt; phiAnt = phi; Vs += (V - Vs) * Math.min(1, dt * 14);
      const vmax = 40; ag.setAttribute('transform', 'rotate(' + clamp(Vs / vmax, -1, 1) * 60 + ')');
      tV.textContent = (Math.abs(Vs) < .05 ? '0,0' : fmt(Vs, 1)) + ' V'; tN.textContent = 'N = ' + E2.N + ' voltas';
      const br = clamp(Math.abs(Vs) / 20, 0, 1); lamp.style.fill = 'rgba(255,214,120,' + (.12 + .88 * br) + ')'; halo.style.opacity = br * .5;
      bF.setAttribute('width', 300 * phi / FMAX);
      tQ.textContent = E2.f === 0 ? 'íman parado: o fluxo não muda → 0 V' : 'o fluxo ' + (Math.abs(Vs) < .3 ? 'quase não muda' : 'está a mudar') + ' → ' + (Math.abs(Vs) < .05 ? '0,0' : fmt(Math.abs(Vs), 1)) + ' V';
      slide.querySelectorAll('[data-ind]').forEach(o => { o.textContent = o.dataset.ind === 'f' ? (E2.f === 0 ? 'parado' : fmt(E2.f, 1) + ' vaivéns por segundo') : E2.N + ' voltas'; });
    } });
  });

  pinta();
  requestAnimationFrame(ciclo);
})();
