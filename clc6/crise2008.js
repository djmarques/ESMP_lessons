/* ==========================================================================
   crise2008.js — Aula 3 · «A crise de 2008»: animated scenes that explain
   the ideas behind the film «A Queda de Wall Street» (The Big Short, 2015).
   Needs assets/vendor/three.min.js (three.js release 160) for the 3D scenes.

   Each scene lives in a slide as <div class="c08-palco" data-cena="NAME">:
     longo        2D graph: long and short positions (works without 3D)
     acao         what a share is: a company cut into 100 equal parts
     short        short selling: borrow a share, sell it, buy it back cheaper
     obrigacao    a bond: a loan on paper that pays interest; risk and interest
     hipotecaria  mortgage bonds: thousands of mortgages in one package
     tranches     the package cut into slices; who is paid first (slider)
     cdo          risky slices repackaged: CDO and CDO of CDO (slider)
     apostas      insurance against default and bets on bets
     bolha        easy credit, rising prices, defaults, the dominoes of 2008

   HOW A SCENE IS WRITTEN
   A scene has two functions:
     build(S)        creates the pieces once: S.add(name, object3D)
     pose(step, ui)  says, for the current build of the slide (and the value
                     of the sliders), where everything is:
        cam     { from: [x, y, z], at: [x, y, z] }
        p       { name: { x, y, z, s, sy, rz, c, delay } }  pieces not listed
                are put away (s = 0). sy stretches a piece upwards (a pile of
                money, a price), c is a colour, delay waits before moving.
        labels  [{ id, on: name | [x, y, z], dy, html, cls }]  HTML over the 3D
        flows   [{ id, a, b, n, cor }]  coins travelling from a to b
        read    HTML for the readout in the top right corner
   Every frame the pieces move towards the place the current build gives
   them, so stepping backwards just works. There is ONE renderer: its canvas
   moves into the slide that is being shown.

   The numbers in the scenes (70/20/10 slices, interest of 4%, 8%, 15%, the
   bakery worth 10 000 €) are illustrative; the historical facts are in the
   captions of index.html, with sources in the last slide and in notes.js.
   Code comments in English; every text students read in European Portuguese.
   ========================================================================== */
(function crise2008() {
  'use strict';

  const palcos = Array.from(document.querySelectorAll('.c08-palco[data-cena]'));
  if (!palcos.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const eur = v => Math.round(v).toLocaleString('pt-PT').replace(/ /g, ' ') + ' €';
  const pct = v => Math.round(v * 100) + '%';

  /** Current build of a slide: app.js adds the classes ge1…geN («the build is at least k»). */
  function stepOf(slide) {
    let n = 0;
    while (slide.classList.contains('ge' + (n + 1))) n++;
    return n;
  }

  /* ---------- Sounds (same on/off switch as the games: localStorage «jogo-som») ---------- */
  let audio = null;
  function som(freq, dur, type, vol, slideTo, wait) {
    try {
      if (localStorage.getItem('jogo-som') === 'off') return;
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state !== 'running') return;          // browsers only allow sound after a click or key press
      const t = audio.currentTime + (wait || 0), o = audio.createOscillator(), g = audio.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* no sound: the animation still works */ }
  }
  const unlock = () => { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {} };
  document.addEventListener('keydown', unlock, { once: true });
  document.addEventListener('pointerdown', unlock, { once: true });
  const SFX = {
    passo: () => som(520, 0.09, 'triangle', 0.08),
    moeda: () => { som(1320, 0.07, 'square', 0.04); som(1760, 0.12, 'square', 0.04, null, 0.06); },
    sobe: () => som(330, 0.35, 'triangle', 0.1, 660),
    desce: () => som(440, 0.45, 'sawtooth', 0.07, 150),
    estoira: () => { som(900, 0.08, 'square', 0.12, 90); som(140, 0.5, 'sawtooth', 0.1, 50, 0.05); },
    domino: () => [0, 1, 2, 3, 4].forEach(i => som(190 - i * 22, 0.16, 'square', 0.1, 70, 0.25 + i * 0.38)),
  };

  /* ---------- Sliders shared by the 2D and 3D scenes ---------- */
  /** Draw the sliders of a scene under its stage. defs: [{ id, rotulo, min, max, passo, valor, desde, fmt }].
      Returns { values, show(step) }; `changed` runs when a slider moves. */
  function controls(palco, defs, changed) {
    const values = {};
    if (!defs || !defs.length) return { values, show() {} };
    const box = document.createElement('div');
    box.className = 'c08-ctr';
    const rows = defs.map(d => {
      values[d.id] = d.valor;
      const row = document.createElement('label');
      row.className = 'rng';
      row.innerHTML = '<span></span><input type="range"><output></output>';
      row.firstChild.textContent = d.rotulo;
      const input = row.querySelector('input'), out = row.querySelector('output');
      Object.assign(input, { min: d.min, max: d.max, step: d.passo, value: d.valor });
      const paint = () => { out.textContent = d.fmt(Number(input.value)); };
      input.addEventListener('input', () => { values[d.id] = Number(input.value); paint(); changed(); });
      paint();
      box.append(row);
      return { row, d };
    });
    // clicks and swipes on a slider must not change slide
    ['click', 'touchstart', 'touchend', 'pointerdown'].forEach(ev => box.addEventListener(ev, e => e.stopPropagation()));
    palco.after(box);
    return { values, show(step) { let any = false; rows.forEach(({ row, d }) => { const on = step >= d.desde; row.hidden = !on; any = any || on; }); box.hidden = !any; } };
  }

  /** Make the stage as tall as the window allows (legend, sliders and navigation pill stay visible). */
  function fitHeight(palco) {
    if (matchMedia('(max-width: 900px)').matches) { palco.style.height = ''; return; }
    const box = palco.closest('.c08'), slide = palco.closest('.slide');
    const below = box.getBoundingClientRect().bottom - palco.getBoundingClientRect().bottom;
    const fonte = slide.querySelector('.source');
    const h = window.innerHeight - palco.getBoundingClientRect().top - below - (fonte ? fonte.offsetHeight + 18 : 0) - 84;
    palco.style.height = clamp(h, 280, 760) + 'px';
  }

  /* ======================================================================
     2D SCENE «longo»: long and short positions on a price graph
     ====================================================================== */
  (function longo() {
    const palco = palcos.find(p => p.dataset.cena === 'longo');
    if (!palco) return;
    const slide = palco.closest('.slide');
    const NS = 'http://www.w3.org/2000/svg';
    const W = 1200, H = 520, X0 = 110, X1 = 640, Y0 = 450, PMAX = 300;
    const py = p => Y0 - (p / PMAX) * 390;
    palco.classList.add('c08-2d');
    palco.innerHTML =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico do preço de uma ação ao longo do tempo e do que ganha ou perde quem aposta na subida e quem aposta na descida">' +
      '<g class="eixos"><line x1="' + X0 + '" y1="' + Y0 + '" x2="' + (X1 + 40) + '" y2="' + Y0 + '"/><line x1="' + X0 + '" y1="' + Y0 + '" x2="' + X0 + '" y2="40"/>' +
      [0, 100, 200, 300].map(p => '<text class="tick" x="' + (X0 - 14) + '" y="' + (py(p) + 8) + '" text-anchor="end">' + p + ' €</text><line class="grade" x1="' + X0 + '" x2="' + (X1 + 40) + '" y1="' + py(p) + '" y2="' + py(p) + '"/>').join('') +
      '<text class="eixo" x="' + (X0 + 8) + '" y="34">preço de 1 ação</text><text class="eixo" x="' + (X1 + 40) + '" y="' + (Y0 + 44) + '" text-anchor="end">tempo →</text>' +
      '<text class="eixo" x="' + (X0 + 40) + '" y="' + (Y0 + 44) + '" text-anchor="middle">hoje</text></g>' +
      '<path class="linha" fill="none"/><circle class="hoje" r="13" cx="' + (X0 + 40) + '" cy="' + py(100) + '"/><circle class="fim" r="13"/><text class="pfim" text-anchor="middle"></text>' +
      '<g class="barras"><line class="zero" x1="760" x2="1170" y1="250" y2="250"/><text class="tick" x="752" y="258" text-anchor="end">0 €</text>' +
      '<g class="b longa"><rect x="790" width="130" rx="8"/><text class="nome" x="855" y="64" text-anchor="middle">Posição longa</text><text class="sub" x="855" y="92" text-anchor="middle">comprou a 100 €</text><text class="val" x="855" text-anchor="middle"></text></g>' +
      '<g class="b curta"><rect x="1025" width="130" rx="8"/><text class="nome" x="1090" y="64" text-anchor="middle">Posição curta</text><text class="sub" x="1090" y="92" text-anchor="middle">vendeu a 100 €</text><text class="val" x="1090" text-anchor="middle"></text></g></g></svg>';
    const svg = palco.firstChild, q = s => svg.querySelector(s);
    // a fixed wobble so that the line looks like a real price, always the same
    const wob = u => (Math.sin(u * 19) * 0.5 + Math.sin(u * 43 + 1) * 0.3 + Math.sin(u * 7 + 2) * 0.4) * Math.sin(Math.PI * u);
    const PRESET = [100, 150, 60, 60, 150];          // final price in builds 0 to 4
    let P = 100, anim = null;
    const ctr = controls(palco, [{ id: 'P', rotulo: 'Preço da ação, mais tarde', min: 0, max: 300, passo: 10, valor: 180, desde: 5, fmt: eur }], () => go());

    function draw() {
      const step = stepOf(slide);
      let d = '';
      for (let k = 0; k <= 80; k++) {
        const u = k / 80, e = u * u * (3 - 2 * u);
        const p = clamp(100 + (P - 100) * e + wob(u) * 16 * Math.min(1, Math.abs(P - 100) / 40 + 0.35), 0, PMAX);
        d += (k ? 'L' : 'M') + (X0 + 40 + u * (X1 - X0 - 40)).toFixed(1) + ' ' + py(p).toFixed(1);
      }
      q('.linha').setAttribute('d', d);
      q('.fim').setAttribute('cx', X1); q('.fim').setAttribute('cy', py(P));
      q('.pfim').setAttribute('x', X1 + 8); q('.pfim').setAttribute('y', py(P) - 26);
      q('.pfim').textContent = step ? eur(P) : '';
      q('.fim').style.opacity = step ? 1 : 0;
      const bars = [['.longa', P - 100, step === 1 || step === 2 || step >= 5], ['.curta', 100 - P, step >= 3]];
      bars.forEach(([sel, v, on]) => {
        const g = q(sel), h = Math.abs(v) * 0.9, r = g.querySelector('rect'), t = g.querySelector('.val');
        g.style.opacity = on ? 1 : 0.12;
        r.setAttribute('y', v >= 0 ? 250 - h : 250); r.setAttribute('height', Math.max(h, 2));
        g.classList.toggle('ganha', v > 0.5); g.classList.toggle('perde', v < -0.5);
        t.setAttribute('y', v >= 0 ? 250 - h - 16 : 250 + h + 44);
        t.textContent = on ? (v > 0.5 ? '+' : '') + eur(v) : '';
      });
    }
    /** Move the final price smoothly towards the value of the current build (or of the slider). */
    function go() {
      const step = stepOf(slide), goal = step >= 5 ? ctr.values.P : PRESET[step];
      ctr.show(step);
      cancelAnimationFrame(anim);
      if (reduced) { P = goal; draw(); return; }
      (function tick() {
        P += (goal - P) * 0.14;
        if (Math.abs(goal - P) < 0.4) P = goal;
        draw();
        if (P !== goal) anim = requestAnimationFrame(tick);
      })();
    }
    let last = -1;
    new MutationObserver(() => {
      if (!slide.classList.contains('current')) { last = -1; return; }
      const step = stepOf(slide);
      if (step !== last) { if (last >= 0) (PRESET[Math.min(step, 4)] > 100 ? SFX.sobe : SFX.desce)(); last = step; go(); fitHeight(palco); }
    }).observe(slide, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', () => { if (slide.classList.contains('current')) fitHeight(palco); });
    go();
    if (slide.classList.contains('current')) fitHeight(palco);
  })();

  /* ======================================================================
     3D ENGINE
     ====================================================================== */
  const T = window.THREE;
  const palcos3d = palcos.filter(p => p.dataset.cena !== 'longo');
  let renderer = null;
  try {
    if (!T) throw new Error('three.js missing');
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    palcos3d.forEach(p => p.classList.add('sem-3d'));     // the captions still tell the story
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  const layer = document.createElement('div');           // HTML labels, drawn over the canvas
  layer.className = 'c08-camada';
  const readout = document.createElement('div');
  readout.className = 'c08-read';
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 140);
  scene.add(new T.HemisphereLight(0xffffff, 0x27323b, 1.9));
  const sun = new T.DirectionalLight(0xfff0dc, 2.5);     // warm key light from the front left
  sun.position.set(-7, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 44 });
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 5;
  scene.add(sun);

  /* ---------- Colours: the deck's palette ---------- */
  const C = {
    slab: 0x2a3640, rim: 0x1a232b, cream: 0xf6f3ec, peach: 0xf1cdb0, apricot: 0xf0a673, orange: 0xa44a16,
    blue: 0x2f6e9e, sky: 0x8fb8d8, green: 0x7fa05a, gold: 0xe8b84a, gray: 0x77828b, dark: 0x3a4650, red: 0xc5543c, navy: 0x1e2a33,
  };

  /* ---------- Building blocks (matte clay pieces) ---------- */
  const clay = (color, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0 }, extra));
  function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
  const box = (w, h, d, color, x, y, z) => mesh(new T.BoxGeometry(w, h, d), clay(color), x, y, z);
  const group = (...parts) => { const g = new T.Group(); g.add(...parts); return g; };
  /** A box whose origin is at the centre of its base, so that `sy` makes it grow upwards. */
  function column(w, h, d, color, extra) {
    const g = new T.BoxGeometry(w, h, d);
    g.translate(0, h / 2, 0);
    return mesh(g, clay(color, extra));
  }
  /** A game pawn, about 1.4 units tall. `dot` adds Ana's white dot. */
  function pawn(color, dot) {
    const outline = [[0, 0], [0.44, 0], [0.46, 0.09], [0.31, 0.18], [0.2, 0.52], [0.16, 0.8], [0.28, 0.86], [0.28, 0.93], [0.14, 0.97]];
    const mat = clay(color, { roughness: 0.55 });
    const g = group(mesh(new T.LatheGeometry(outline.map(([x, y]) => new T.Vector2(x, y)), 36), mat), mesh(new T.SphereGeometry(0.27, 28, 20), mat, 0, 1.16, 0));
    if (dot) g.add(mesh(new T.SphereGeometry(0.09, 16, 12), clay(0xffffff), 0, 0.55, 0.2));
    g.userData = { walks: true, tint: mat };
    return g;
  }
  /** A small house; its walls can change colour (userData.tint) and it grows with `sy`. */
  function house(color) {
    const walls = column(1, 0.8, 1, color);
    const roof = mesh(new T.ConeGeometry(0.86, 0.5, 4), clay(C.orange), 0, 1.05, 0);
    roof.rotation.y = Math.PI / 4;
    const door = box(0.22, 0.4, 0.04, C.navy, 0, 0.2, 0.51);
    const g = group(walls, roof, door);
    g.userData = { tint: walls.material, roof: roof.material };
    return g;
  }
  /** A bank: steps, four columns and a roof. */
  function bank() {
    const g = group(box(2.6, 0.2, 1.7, C.cream, 0, 0.1, 0), box(2.3, 1.2, 1.2, 0xe4dccb, 0, 0.8, -0.15), box(2.6, 0.22, 1.7, C.cream, 0, 1.55, 0));
    for (let i = 0; i < 4; i++) g.add(mesh(new T.CylinderGeometry(0.12, 0.12, 1.25, 16), clay(C.cream), -0.9 + i * 0.6, 0.82, 0.62));
    const roof = mesh(new T.CylinderGeometry(0.02, 1.5, 0.55, 3, 1), clay(C.blue), 0, 1.94, 0);
    roof.rotation.y = Math.PI / 2; roof.scale.set(0.62, 1, 1.0);
    g.add(roof);
    return g;
  }
  /** The bakery «Pão Quente»: walls, a striped awning, a door, a chimney. */
  function bakery(color) {
    const walls = column(2.4, 1.5, 1.7, color || C.peach);
    const g = group(walls, box(2.6, 0.18, 1.9, C.orange, 0, 1.59, 0), box(0.5, 0.8, 0.05, C.navy, -0.55, 0.4, 0.86),
      box(0.9, 0.55, 0.05, C.sky, 0.45, 0.75, 0.86), box(0.35, 0.7, 0.35, C.dark, 0.75, 2.0, -0.4));
    for (let i = 0; i < 6; i++) {                        // awning
      const a = box(0.4, 0.06, 0.55, i % 2 ? C.cream : C.orange, -1.0 + i * 0.4, 1.22, 1.08);
      a.rotation.x = 0.35; g.add(a);
    }
    g.userData = { tint: walls.material };
    return g;
  }
  /** A pile of money: `sy` is its height (the amount). */
  function pile() {
    const g = new T.CylinderGeometry(0.34, 0.34, 1, 28);
    g.translate(0, 0.5, 0);
    return mesh(g, clay(C.gold, { roughness: 0.45, metalness: 0.35 }));
  }
  /** A paper (a bond): an upright sheet with a seal and three lines. */
  function paper() {
    const sheet = box(0.95, 1.25, 0.06, C.cream, 0, 0.7, 0);
    const g = group(sheet, box(0.6, 0.07, 0.02, C.navy, 0, 1.08, 0.04), box(0.6, 0.05, 0.02, C.gray, 0, 0.9, 0.04), box(0.6, 0.05, 0.02, C.gray, 0, 0.76, 0.04),
      mesh(new T.CylinderGeometry(0.14, 0.14, 0.03, 20), clay(C.orange), 0.22, 0.4, 0.045));
    g.children[4].rotation.x = Math.PI / 2;
    g.rotation.x = -0.18;
    g.userData = { tint: sheet.material };
    return g;
  }
  /** A parcel: the package of mortgages. */
  function parcel(color) {
    const body = column(1.5, 1.1, 1.2, color || C.apricot);
    const g = group(body, box(1.54, 0.12, 0.2, C.orange, 0, 0.6, 0), box(0.2, 1.14, 1.24, C.orange, 0, 0.57, 0));
    g.userData = { tint: body.material };
    return g;
  }

  /* ---------- Slices (tranches): a tower of three tanks that fill with money ---------- */
  const SLICES = [                                       // from the bottom up; share of the package
    { id: 'low', nome: 'Sem nota', part: 0.10, cor: C.orange, juro: '15%' },
    { id: 'bbb', nome: 'BBB', part: 0.20, cor: C.apricot, juro: '8%' },
    { id: 'aaa', nome: 'AAA', part: 0.70, cor: C.blue, juro: '4%' },
  ];
  const TH = 4.2, TW = 1.7, TD = 1.2;                    // tower height, width and depth
  /** What each slice receives (0 to 1) when a fraction `paid` of the money comes in: the top slice first. */
  function waterfall(paid) {
    let left = paid;
    const out = {};
    for (let i = SLICES.length - 1; i >= 0; i--) {
      const s = SLICES[i], got = Math.min(s.part, left);
      out[s.id] = got / s.part; left -= got;
    }
    return out;
  }
  /** Add a tower called `name` to scene S: a glass frame per slice and a coloured fill inside each. */
  function addTower(S, name) {
    const glass = new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, roughness: 0.3, depthWrite: false });
    const frame = new T.Group();
    let y = 0.02;
    SLICES.forEach(s => {
      const h = TH * s.part;
      const g = new T.BoxGeometry(TW, h - 0.05, TD);
      const m = new T.Mesh(g, glass); m.position.y = y + h / 2;
      const edge = new T.LineSegments(new T.EdgesGeometry(g), new T.LineBasicMaterial({ color: 0xf6f3ec, transparent: true, opacity: 0.55 }));
      edge.position.copy(m.position);
      frame.add(m, edge);
      S.add(name + '_' + s.id, column(TW - 0.1, h - 0.09, TD - 0.1, s.cor, { roughness: 0.6 }));
      y += h;
    });
    S.add(name, frame);
  }
  /** Poses of a tower at (x, z) with size s, where `got` says how full each slice is. */
  function towerPose(p, name, x, z, s, got) {
    p[name] = { x, y: 0, z, s };
    let y = 0.02;
    SLICES.forEach(sl => {
      const h = TH * sl.part;
      const f = got ? got[sl.id] : 0;
      p[name + '_' + sl.id] = { x, y: (y + 0.02) * s, z, s: s > 0.01 && f > 0.004 ? s : 0, sy: Math.max(0.001, f) };
      y += h;
    });
  }
  /** Y of the middle of a slice (for its label). */
  function sliceY(id) {
    let y = 0;
    for (const s of SLICES) { if (s.id === id) return y + TH * s.part / 2; y += TH * s.part; }
    return 0;
  }

  /* ---------- Houses that pay (or stop paying): shared by three scenes ---------- */
  const ORDER = [7, 12, 3, 16, 9, 0, 18, 5, 14, 11, 1, 19, 6, 13, 8, 2, 17, 10, 4, 15];   // which houses stop paying first
  function addHouses(S, n) { for (let i = 0; i < n; i++) S.add('casa' + i, house(C.cream)); }
  /** Poses of a 5 × 4 block of houses centred at (cx, cz); `bad` of them have stopped paying (grey). */
  function housesPose(p, cx, cz, gap, s, bad) {
    for (let i = 0; i < 20; i++) {
      const c = i % 5, r = Math.floor(i / 5), off = ORDER.indexOf(i) < bad;
      p['casa' + i] = { x: cx + (c - 2) * gap, y: 0, z: cz + (r - 1.5) * gap, s, c: off ? C.gray : C.cream };
    }
  }

  /* ======================================================================
     THE SCENES
     ====================================================================== */
  const WIDE = { from: [0, 9.2, 15.5], at: [0, 0.9, 0] };
  const SCENES = {};

  /* ---------- acao: a company cut into 100 shares; the price is the height ---------- */
  SCENES.acao = {
    build(S) {
      S.add('padaria', bakery());
      const geo = new T.BoxGeometry(0.34, 0.5, 0.34); geo.translate(0, 0.25, 0);
      const mat = clay(C.peach);
      for (let i = 0; i < 100; i++) S.add('a' + i, mesh(geo, i === 94 ? clay(C.apricot) : mat));
      S.add('ana', pawn(C.apricot, true));
    },
    pose(step) {
      const p = {}, price = [100, 100, 100, 130, 70, 100][step];
      const labels = [], cut = step >= 1;
      p.padaria = { x: 0, y: 0, z: 0, s: cut ? 0 : 1.5 };
      for (let i = 0; i < 100; i++) {
        const c = i % 10, r = Math.floor(i / 10);
        p['a' + i] = cut ? { x: (c - 4.5) * 0.42 - 1.2, y: 0, z: (r - 4.5) * 0.42, s: 1, sy: price / 100 } : { x: 0, y: 0.3, z: 0, s: 0 };
      }
      if (step >= 2) {
        p.a94 = { x: 3.1, y: 0, z: 1.7, s: 1.9, sy: price / 100 };
        p.ana = { x: 4.3, y: 0, z: 1.7, s: 1 };
        labels.push({ id: 'ana', on: 'ana', dy: 1.75, html: 'Ana', cls: 'nome' });
        labels.push({ id: 'uma', on: 'a94', dy: 1.25 * price / 100 + 0.25, html: '1 ação<small>' + eur(price) + '</small>', cls: 'valor' });
      } else p.ana = { x: 7.5, y: 0, z: 1.7, s: 0 };
      if (!cut) labels.push({ id: 'pad', on: [0, 3.5, 0], html: 'Padaria Pão Quente<small>vale 10 000 €</small>', cls: 'valor' });
      else labels.push({ id: 'cem', on: [-1.2, 0.9 * price / 100 + 0.5, -2.2], html: step >= 3 ? 'Preço de cada ação: <b>' + eur(price) + '</b>' : '100 partes iguais = <b>100 ações</b>', cls: 'nota' });
      if (step === 3) labels.push({ id: 'not', on: [-1.2, 0.2, 2.9], html: 'Boas notícias: mais gente quer comprar', cls: 'bom' });
      if (step === 4) labels.push({ id: 'not', on: [-1.2, 0.2, 2.9], html: 'Más notícias: mais gente quer vender', cls: 'mau' });
      return { cam: cut ? { from: [1.2, 8.2, 12.5], at: [0.9, 0.6, 0.2] } : { from: [0, 5.5, 11.5], at: [0, 1.5, 0] }, p, labels };
    },
    sound: (a, b) => (b === 3 ? SFX.sobe() : b === 4 ? SFX.desce() : SFX.passo()),
  };

  /* ---------- short: borrow a share, sell it, buy it back cheaper, give it back ---------- */
  SCENES.short = {
    build(S) {
      S.add('rosa', pawn(C.cream)); S.add('ana', pawn(C.apricot, true)); S.add('tiago', pawn(C.sky));
      S.add('bolsa', column(0.9, 1.4, 0.9, C.blue)); S.add('base', box(1.6, 0.14, 1.6, C.dark, 0, 0.07, 0));
      const cube = () => { const g = new T.BoxGeometry(0.55, 0.55, 0.55); g.translate(0, 0.275, 0); return mesh(g, clay(C.apricot)); };
      S.add('acao', cube()); S.add('acao2', cube());
      S.add('din', pile()); S.add('din2', pile());
    },
    pose(step) {
      const rosa = [-4.8, 0.8], ana = [0, 2.0], tiago = [4.8, 0.8], bol = [0, -3.2];
      const price = step === 6 ? 150 : step >= 3 ? 60 : 100;
      const near = (q, dx) => ({ x: q[0] + dx, y: 0, z: q[1] + 0.35, s: 1 });
      const p = {
        rosa: { x: rosa[0], y: 0, z: rosa[1], s: 1 }, ana: { x: ana[0], y: 0, z: ana[1], s: 1 }, tiago: { x: tiago[0], y: 0, z: tiago[1], s: 1 },
        base: { x: bol[0], y: 0, z: bol[1], s: 1 }, bolsa: { x: bol[0], y: 0.14, z: bol[1], s: 1, sy: price / 100 },
      };
      const labels = [
        { id: 'rosa', on: 'rosa', dy: 1.75, html: 'D. Rosa<small>dona da ação</small>', cls: 'nome' },
        { id: 'ana', on: 'ana', dy: 1.75, html: 'Ana', cls: 'nome' },
        { id: 'tiago', on: 'tiago', dy: 1.75, html: 'Tiago<small>comprador</small>', cls: 'nome' },
        { id: 'bolsa', on: [bol[0], 1.4 * price / 100 + 0.55, bol[1]], html: 'Bolsa · preço de 1 ação<small>' + eur(price) + '</small>', cls: 'valor' },
      ];
      // the borrowed share: D. Rosa → Ana → Tiago
      p.acao = step === 0 ? near(rosa, 0.95) : step === 1 ? near(ana, -0.95) : near(tiago, -0.95);
      // the 100 € that Tiago pays: Tiago → Ana; then 60 € (or 150 €) go to the stock exchange
      const left = step === 6 ? 0 : step >= 4 ? 40 : 100;
      p.din = step < 2 ? { ...near(tiago, 0.95), sy: 1 } : { ...near(ana, 0.95), sy: Math.max(left, 1) / 100, s: left ? 1 : 0 };
      if (step < 2) labels.push({ id: 'din', on: 'din', dy: 1.25, html: '100 €', cls: 'euro' });
      else if (left) labels.push({ id: 'din', on: 'din', dy: left / 100 + 0.3, html: eur(left), cls: 'euro' });
      // the share bought back at the stock exchange: exchange → Ana → D. Rosa
      p.acao2 = step < 4 ? { x: bol[0], y: 0.2, z: bol[1], s: 0 } : step === 4 ? near(ana, -0.95) : near(rosa, 0.95);
      p.din2 = step < 4 ? { x: ana[0] + 0.95, y: 0, z: ana[1], s: 0, sy: 0.6 } : { x: bol[0] + 1.3, y: 0, z: bol[1] + 0.2, s: 1, sy: step === 6 ? 1.5 : 0.6 };
      if (step >= 4) labels.push({ id: 'din2', on: 'din2', dy: (step === 6 ? 1.5 : 0.6) + 0.3, html: step === 6 ? '150 €' : '60 €', cls: 'euro' });
      if (step >= 1 && step <= 3) labels.push({ id: 'deve', on: [ana[0], 0.1, ana[1] + 1.5], html: 'deve 1 ação à D. Rosa', cls: 'mau' });
      if (step === 5 || step === 7) labels.push({ id: 'deve', on: [ana[0], 0.1, ana[1] + 1.5], html: 'lucro: <b>40 €</b>', cls: 'bom' });
      if (step === 6) labels.push({ id: 'deve', on: [ana[0], 0.1, ana[1] + 1.5], html: 'prejuízo: <b>50 €</b>', cls: 'mau' });
      return { cam: { from: [0, 8.4, 15], at: [0, 1.0, 0] }, p, labels };
    },
    sound: (a, b) => (b === 2 || b === 4 ? SFX.moeda() : b === 3 ? SFX.desce() : b === 6 ? SFX.sobe() : SFX.passo()),
  };

  /* ---------- obrigacao: a loan on paper; interest; selling debt; risk and interest ---------- */
  SCENES.obrigacao = {
    build(S) {
      S.add('padaria', bakery()); S.add('padaria2', bakery(0xcdb9a8));
      S.add('ana', pawn(C.apricot, true)); S.add('tiago', pawn(C.sky));
      S.add('papel', paper()); S.add('papel2', paper()); S.add('din', pile()); S.add('din3', pile());
    },
    pose(step) {
      const two = step >= 5 && step <= 6;               // builds 5 and 6 compare two bakeries
      const p = {}, labels = [], flows = [];
      const A = [2.6, 1.6], Tg = [5.7, -0.9];
      p.ana = { x: A[0], y: 0, z: A[1], s: 1 };
      labels.push({ id: 'ana', on: 'ana', dy: 1.75, html: 'Ana', cls: 'nome' });
      if (!two) {
        p.padaria = { x: -3.6, y: 0, z: 0, s: 1.15, c: C.peach };
        labels.push({ id: 'pad', on: [-3.6, 3.2, 0], html: step === 0 ? 'Padaria Pão Quente<small>precisa de 1 000 € para um forno novo</small>' : 'Padaria Pão Quente<small>deve 1 000 €</small>', cls: 'nota' });
        const lent = step >= 1 && step !== 3;
        p.din = lent ? { x: -1.5, y: 0, z: 1.2, s: 1, sy: 1.2 } : { x: A[0] - 1.0, y: 0, z: A[1] + 0.3, s: 1, sy: step === 3 ? 1.38 : 1.2 };
        labels.push({ id: 'din', on: 'din', dy: step === 3 ? 2.75 : 1.5, html: step === 3 ? '1 000 € + 150 € de juros' : '1 000 €', cls: 'euro' });
        const sold = step === 4 || step === 7;
        if (step >= 1) {
          p.papel = sold ? { x: Tg[0] - 0.9, y: 0, z: Tg[1] + 2.1, s: 1 } : step === 3 ? { x: -2.0, y: 0, z: 1.6, s: 0.7, c: C.gray } : { x: A[0] + 1.05, y: 0, z: A[1] + 0.4, s: 1 };
          labels.push({ id: 'papel', on: 'papel', dy: 1.65, html: step === 3 ? 'empréstimo pago' : sold ? 'Obrigação' : 'Obrigação<small>1 000 € · juro de 5% ao ano · 3 anos</small>', cls: 'valor' });
        }
        if (sold) {
          p.tiago = { x: Tg[0], y: 0, z: Tg[1], s: 1 };
          labels.push({ id: 'tiago', on: 'tiago', dy: 1.75, html: 'Tiago<small>comprou a dívida</small>', cls: 'nome' });
          p.din3 = { x: A[0] - 1.0, y: 0, z: A[1] + 0.3, s: 1, sy: 1.2 };
          labels.push({ id: 'din3', on: 'din3', dy: 1.5, html: '1 000 € já', cls: 'euro' });
          flows.push({ id: 'juros', a: [-2.6, 1.0, 0.9], b: [Tg[0], 1.5, Tg[1]], n: 4 });
        } else if (step === 2) flows.push({ id: 'juros', a: [-2.6, 1.0, 0.9], b: [A[0], 1.5, A[1]], n: 4 });
        if (step === 2) labels.push({ id: 'jur', on: [-0.2, 2.6, 1.0], html: 'juros: <b>50 € por ano</b>', cls: 'bom' });
      } else {
        const failed = step === 6;
        p.padaria = { x: -5.3, y: 0, z: -1.7, s: 0.72, c: C.peach };
        p.padaria2 = { x: -2.6, y: failed ? -0.5 : 0, z: 2.2, s: 0.72, c: failed ? C.gray : 0xcdb9a8 };
        labels.push({ id: 'pad', on: [-5.3, 2.1, -1.7], html: 'Padaria sólida<small>paga 3% de juro</small>', cls: 'nota' });
        labels.push({ id: 'pad2', on: [-2.6, 0.05, 3.7], html: failed ? 'Fechou: não paga' : 'Padaria em dificuldades<small>tem de oferecer 12% de juro</small>', cls: failed ? 'mau' : 'nota' });
        p.ana = { x: 2.2, y: 0, z: -1.6, s: 1 };
        p.tiago = { x: 3.4, y: 0, z: 2.3, s: 1 };
        labels.push({ id: 'tiago', on: 'tiago', dy: 1.75, html: 'Tiago', cls: 'nome' });
        p.papel = { x: 4.1, y: 0, z: -1.3, s: 1 };
        p.papel2 = { x: 5.3, y: 0, z: 2.6, s: 1, c: failed ? C.gray : C.cream };
        labels.push({ id: 'papel', on: 'papel', dy: 1.65, html: '30 € por ano', cls: 'euro' });
        labels.push({ id: 'papel2', on: 'papel2', dy: 1.65, html: failed ? 'vale 0 €' : '120 € por ano', cls: failed ? 'mau' : 'euro' });
        flows.push({ id: 'j1', a: [-4.4, 1.0, -1.3], b: [2.2, 1.5, -1.6], n: 2 });
        if (!failed) flows.push({ id: 'j2', a: [-1.7, 1.0, 2.6], b: [3.4, 1.5, 2.3], n: 7 });
      }
      return { cam: { from: [0.4, 8.6, 15], at: [0.4, 1.1, 0.2] }, p, labels, flows };
    },
    sound: (a, b) => (b === 6 ? SFX.desce() : b === 1 || b === 2 || b === 4 ? SFX.moeda() : SFX.passo()),
  };

  /* ---------- hipotecaria: mortgages, the package, the investors ---------- */
  SCENES.hipotecaria = {
    build(S) {
      addHouses(S, 20);
      S.add('fam', pawn(C.apricot)); S.add('banco', bank()); S.add('pacote', parcel()); S.add('emp', pile());
      [C.sky, C.green, C.cream].forEach((c, i) => S.add('inv' + i, pawn(c)));
    },
    pose(step) {
      const p = {}, labels = [], flows = [];
      const many = step >= 2, sold = step >= 3;
      if (many) housesPose(p, -4.9, 0.4, 1.0, 0.55, step >= 5 ? 3 : 0);
      else p.casa7 = { x: -4.4, y: 0, z: 0.6, s: 1.5, c: C.cream };
      p.fam = many ? { x: -4.4, y: 0, z: 3.4, s: 0 } : { x: -2.9, y: 0, z: 1.9, s: 1 };
      p.banco = { x: 0.2, y: 0, z: -2.0, s: 1 };
      labels.push({ id: 'banco', on: [0.2, 2.75, -2.0], html: ['Banco', 'Banco<small>espera 30 anos pelo dinheiro</small>', 'Banco<small>junta milhares de hipotecas</small>', 'Banco<small>recebe tudo já, mais uma comissão</small>', 'Banco', 'Banco<small>já recebeu: o risco não é dele</small>', 'Banco'][step], cls: 'nota' });
      if (!many) {
        labels.push({ id: 'fam', on: 'fam', dy: 1.75, html: step ? 'Família<small>paga a prestação todos os meses</small>' : 'Família', cls: 'nome' });
        p.emp = step === 0 ? { x: 2.1, y: 0, z: -0.6, s: 1, sy: 1.3 } : { x: -5.9, y: 0, z: 0.9, s: 1, sy: 1.3 };
        labels.push({ id: 'emp', on: 'emp', dy: 1.65, html: step ? 'recebeu 200 mil €' : '200 mil €', cls: 'euro' });
        if (step === 1) flows.push({ id: 'prest', a: [-3.6, 1.2, 0.8], b: [0.2, 1.4, -1.4], n: 4 });
      } else {
        labels.push({ id: 'casas', on: [-4.9, 0.1, 3.0], html: step >= 5 ? 'Algumas famílias deixam de pagar' : 'Milhares de famílias pagam a prestação', cls: step >= 5 ? 'mau' : 'nota' });
        p.pacote = sold ? { x: 1.6, y: 0, z: 1.3, s: 1.1 } : { x: -0.7, y: 0, z: 1.4, s: 1.1 };
        labels.push({ id: 'pac', on: 'pacote', dy: 1.75, html: sold ? 'Obrigação hipotecária' : 'Pacote de hipotecas', cls: 'valor' });
        if (!sold) flows.push({ id: 'prest', a: [-3.2, 1.0, 0.4], b: [0.2, 1.4, -1.4], n: 6 });
      }
      if (sold) {
        const names = ['Fundo de pensões', 'Banco europeu', 'Seguradora'];
        for (let i = 0; i < 3; i++) {
          p['inv' + i] = { x: 5.4, y: 0, z: -1.6 + i * 1.9, s: 1 };
          labels.push({ id: 'inv' + i, on: 'inv' + i, dy: 1.75, html: names[i], cls: 'nome' });
        }
        if (step === 3) flows.push({ id: 'compra', a: [5.0, 1.3, 0.3], b: [0.6, 1.5, -1.5], n: 8, cor: C.sky });
        else {
          flows.push({ id: 'prest', a: [-3.2, 1.0, 0.4], b: [1.4, 1.5, 1.3], n: step >= 5 ? 4 : 6 });
          flows.push({ id: 'paga', a: [1.9, 1.5, 1.3], b: [5.2, 1.4, 0.3], n: step >= 5 ? 4 : 6 });
        }
        if (step >= 5) labels.push({ id: 'risco', on: [5.4, 0.1, 3.9], html: 'ficam com o risco', cls: 'mau' });
      }
      return { cam: { from: [0.3, 11.2, 18.6], at: [0.3, 0.9, 0.3] }, p, labels, flows };
    },
    sound: (a, b) => (b === 5 ? SFX.desce() : b === 1 || b === 3 || b === 4 ? SFX.moeda() : SFX.passo()),
  };

  /* ---------- tranches: the package cut into three slices; who is paid first ---------- */
  const sliceLabel = (name, x, z, got, withRate, title, short) => SLICES.map(s => ({
    id: name + s.id, on: [x + TW / 2 + 0.25, sliceY(s.id) + (s.id === 'low' ? -0.2 : s.id === 'bbb' ? 0.12 : 0), z], cls: 'fatia ' + (got[s.id] < 0.995 ? 'falha' : ''),
    html: '<b>' + (title && s.id === 'aaa' ? title : s.nome) + '</b>' + (withRate ? ' · juro de ' + s.juro : '') + '<small>' + (short ? ' ' : ' · recebe ') + pct(got[s.id]) + '</small>',
  }));
  SCENES.tranches = {
    controls: [{ id: 'L', rotulo: 'Famílias que deixam de pagar', min: 0, max: 50, passo: 5, valor: 10, desde: 5, fmt: v => v / 5 + ' em 20 (' + v + '%)' }],
    build(S) { addHouses(S, 20); S.add('pacote', parcel()); addTower(S, 't'); },
    pose(step, ui) {
      const L = step >= 5 ? ui.L : step === 4 ? 10 : 0;
      const p = {}, labels = [], flows = [], got = waterfall(1 - L / 100), cut = step >= 1;
      housesPose(p, -4.6, 0.3, 1.05, 0.6, L / 5);
      p.pacote = { x: 1.2, y: 0, z: 0.3, s: cut ? 0 : 1.5 };
      towerPose(p, 't', 1.2, 0.3, cut ? 1 : 0, step >= 2 ? got : null);
      if (!cut) labels.push({ id: 'pac', on: [1.2, 2.3, 0.3], html: 'Obrigação hipotecária', cls: 'valor' });
      else {
        const lab = sliceLabel('t', 1.2, 0.3, step >= 2 ? got : { low: 1, bbb: 1, aaa: 1 }, step >= 3);
        if (step < 2) lab.forEach(l => { l.html = l.html.replace(/<small>.*<\/small>/, ''); });
        labels.push(...lab);
        labels.push({ id: 'cima', on: [1.2, TH + 0.75, 0.3], html: 'o dinheiro entra por cima', cls: 'nota' });
      }
      labels.push({ id: 'casas', on: [-4.6, 0.1, 3.1], html: L ? L / 5 + ' em 20 famílias não pagam' : '20 famílias pagam a prestação', cls: L ? 'mau' : 'nota' });
      const n = Math.round(8 * (1 - L / 100));
      if (n) flows.push({ id: 'prest', a: [-2.6, 1.0, 0.3], b: [1.2, cut ? TH + 0.3 : 1.9, 0.3], n });
      return { cam: { from: [-0.4, 9.6, 19], at: [-0.4, 2.0, 0.2] }, p, labels, flows };
    },
    sound: (a, b) => (b === 4 ? SFX.desce() : b === 2 ? SFX.moeda() : SFX.passo()),
  };

  /* ---------- cdo: the risky slices of many packages become a new package ---------- */
  SCENES.cdo = {
    controls: [{ id: 'L', rotulo: 'Famílias que deixam de pagar', min: 0, max: 40, passo: 5, valor: 20, desde: 4, fmt: v => v / 5 + ' em 20 (' + v + '%)' }],
    build(S) {
      addHouses(S, 20);
      ['a', 'a2', 'a3', 'b', 'c'].forEach(n => addTower(S, n));
      for (let i = 0; i < 3; i++) S.add('fat' + i, column(TW - 0.1, TH * 0.2 - 0.09, TD - 0.1, C.apricot));
    },
    pose(step, ui) {
      const L = step >= 4 ? ui.L : step === 3 ? 20 : 0;
      const p = {}, labels = [], flows = [];
      const gotA = waterfall(1 - L / 100);              // a package of mortgages
      const gotB = waterfall(gotA.bbb);                 // a CDO made of BBB slices: it receives what they receive
      const gotC = waterfall(gotB.bbb);                 // a CDO made of BBB slices of CDOs
      const XA = -2.3, XB = 1.5, XC = 5.3, Z = 0.5;
      housesPose(p, -6.3, 0.6, 0.72, 0.4, L / 5);
      towerPose(p, 'a', XA, Z, 1, gotA);
      towerPose(p, 'a2', XA - 0.9, Z - 2.3, step >= 2 ? 0 : 0.6, gotA);
      towerPose(p, 'a3', XA + 1.1, Z - 2.3, step >= 2 ? 0 : 0.6, gotA);
      towerPose(p, 'b', XB, Z, step >= 2 ? 1 : 0, gotB);
      towerPose(p, 'c', XC, Z, step >= 5 ? 1 : 0, gotC);
      for (let i = 0; i < 3; i++) {                      // the BBB slices that fly into the new package
        const from = [[XA, Z, 1], [XA - 0.9, Z - 2.3, 0.6], [XA + 1.1, Z - 2.3, 0.6]][i];
        p['fat' + i] = step === 0 ? { x: from[0], y: TH * 0.1 * from[2], z: from[1], s: 0 }
          : step === 1 ? { x: XB, y: 0.05 + i * TH * 0.2, z: Z, s: 1 } : { x: XB, y: 0.05 + i * 0.3, z: Z, s: 0 };
      }
      labels.push({ id: 'ta', on: [XA, TH + 0.6, Z], html: 'Pacote de hipotecas', cls: 'nota' });
      labels.push(...sliceLabel('a', XA, Z, gotA, false, null, true).filter(l => step >= 3 ? l.id !== 'alow' : l.id === 'abbb'));
      if (step === 0) labels.push({ id: 'sobra', on: [XA, -0.1, Z + 1.6], html: 'as fatias BBB são difíceis de vender', cls: 'mau' });
      if (step === 1) labels.push({ id: 'novo', on: [XB, TH * 0.6 + 0.6, Z], html: 'fatias BBB de centenas de pacotes', cls: 'valor' });
      if (step >= 2) {
        labels.push({ id: 'tb', on: [XB, TH + 0.6, Z], html: 'CDO', cls: 'valor' });
        labels.push(...sliceLabel('b', XB, Z, gotB, false, '«AAA»', true).filter(l => step >= 3 ? l.id === 'baaa' : true).map(l => (step < 3 ? { ...l, html: l.html.replace(/<small>.*<\/small>/, '') } : l)));
        if (step === 2) labels.push({ id: 'selo', on: [XB - 0.1, 1.9, Z + 0.7], html: 'AAA', cls: 'selo' });
      }
      if (step >= 5) {
        labels.push({ id: 'tc', on: [XC, TH + 0.6, Z], html: 'CDO de CDO', cls: 'valor' });
        labels.push(...sliceLabel('c', XC, Z, gotC, false, '«AAA»', true).filter(l => l.id === 'caaa'));
      }
      labels.push({ id: 'casas', on: [-6.3, 0.1, 2.5], html: L ? L / 5 + ' em 20 não pagam' : 'todas pagam', cls: L ? 'mau' : 'nota' });
      const n = Math.round(6 * (1 - L / 100));
      if (n) flows.push({ id: 'prest', a: [-5.0, 0.8, 0.6], b: [XA, TH + 0.3, Z], n });
      if (step >= 2 && gotA.bbb > 0.02) flows.push({ id: 'fb', a: [XA + 0.9, sliceY('bbb'), Z], b: [XB, TH + 0.3, Z], n: Math.max(1, Math.round(4 * gotA.bbb)) });
      if (step >= 5 && gotB.bbb > 0.02) flows.push({ id: 'fc', a: [XB + 0.9, sliceY('bbb'), Z], b: [XC, TH + 0.3, Z], n: Math.max(1, Math.round(4 * gotB.bbb)) });
      const line = (nome, v) => '<span class="' + (v < 0.995 ? 'falha' : '') + '">' + nome + ' <b>' + pct(v) + '</b></span>';
      const read = step >= 3 ? '<small>O que recebe a fatia de cima</small>' + line('Pacote · AAA', gotA.aaa) + line('CDO · «AAA»', gotB.aaa) + (step >= 5 ? line('CDO de CDO · «AAA»', gotC.aaa) : '') : '';
      return { cam: step >= 5 ? { from: [0.2, 9.6, 19.5], at: [0.2, 2.0, 0.3] } : { from: [-1.2, 9.2, 18], at: [-1.2, 2.0, 0.3] }, p, labels, flows, read };
    },
    sound: (a, b) => (b === 3 ? SFX.desce() : b === 1 ? SFX.sobe() : SFX.passo()),
  };

  /* ---------- apostas: insurance against default, then bets on that bet ---------- */
  SCENES.apostas = {
    build(S) {
      S.add('pacote', parcel()); S.add('inv', pawn(C.apricot)); S.add('banco', bank()); S.add('pote', pile());
      for (let i = 0; i < 12; i++) S.add('ap' + i, pawn([C.sky, C.green, C.cream, C.peach][i % 4]));
    },
    pose(step) {
      const p = {}, labels = [], flows = [], fell = step >= 5;
      p.pacote = { x: 0, y: fell ? -0.5 : 0, z: 0, s: 1.05, c: fell ? C.gray : C.apricot };
      labels.push({ id: 'pac', on: [0, fell ? 1.4 : 1.9, 0], html: fell ? 'As hipotecas falham' : 'Obrigações hipotecárias', cls: fell ? 'mau' : 'valor' });
      p.inv = { x: -3.6, y: 0, z: 1.3, s: 1 };
      labels.push({ id: 'inv', on: 'inv', dy: 1.75, html: 'Investidor<small>aposta que vão falhar</small>', cls: 'nome' });
      if (step >= 1) {
        p.banco = { x: 4.3, y: 0, z: 0.8, s: 0.85 };
        labels.push({ id: 'banco', on: [4.3, 2.45, 0.8], html: step === 2 ? 'Banco<small>«as casas nunca caíram»</small>' : 'Banco<small>aposta que vão pagar</small>', cls: 'nota' });
        if (!fell) flows.push({ id: 'premio', a: [-3.6, 1.5, 1.3], b: [4.0, 1.6, 1.0], n: 2 });
        else flows.push({ id: 'paga', a: [4.0, 1.6, 1.0], b: [-3.6, 1.5, 1.3], n: 12 });
      }
      const rings = step >= 4 ? 12 : step >= 3 ? 4 : 0;
      for (let i = 0; i < 12; i++) {
        const outer = i >= 4, loser = fell && i % 2 === 0;       // two rows of onlookers behind the table
        p['ap' + i] = { x: outer ? (i - 7.5) * 1.6 : (i - 1.5) * 2.4, y: loser ? -0.35 : 0, z: outer ? -4.9 : -3.0, s: i < rings ? 0.8 : 0, c: loser ? C.gray : [C.sky, C.green, C.cream, C.peach][i % 4] };
      }
      if (rings) labels.push({ id: 'r1', on: [-6.6, 0.9, -3.0], html: 'apostam sobre a aposta', cls: 'nota' });
      if (rings > 4) labels.push({ id: 'r2', on: [0, 1.75, -4.9], html: 'apostam sobre essas apostas', cls: 'nota' });
      const mult = step >= 4 ? 20 : step >= 3 ? 5 : step >= 1 ? 1 : 0;
      p.pote = { x: 0, y: 0, z: 2.7, s: mult ? 1.3 : 0, sy: Math.max(0.12, mult * 0.07) };
      if (mult) labels.push({ id: 'pote', on: [0, 0.05, 4.3], html: fell ? 'Perdas: <b>20 vezes</b> o valor das hipotecas' : mult === 1 ? 'Dinheiro em jogo' : 'Dinheiro em jogo: <b>' + mult + ' vezes</b> o valor das hipotecas', cls: fell ? 'mau' : 'euro' });
      return { cam: { from: [0, 11.5, 17], at: [0, 0.8, -0.4] }, p, labels, flows };
    },
    sound: (a, b) => (b === 5 ? SFX.estoira() : b === 1 ? SFX.moeda() : b === 3 || b === 4 ? SFX.sobe() : SFX.passo()),
  };

  /* ---------- bolha: easy credit, rising prices, defaults, the dominoes ---------- */
  const DOMINOS = ['Famílias', 'Obrigações', 'CDO', 'Apostas', 'Bancos'];
  SCENES.bolha = {
    build(S) {
      addHouses(S, 20);
      for (let i = 0; i < 8; i++) S.add('comp' + i, pawn([0x56718a, 0x8197a8, 0x34495a][i % 3]));
      S.add('bolha', mesh(new T.SphereGeometry(1, 40, 28), new T.MeshStandardMaterial({ color: 0xf0a673, transparent: true, opacity: 0.2, roughness: 0.15, depthWrite: false })));
      S.pieces.bolha.castShadow = false;
      DOMINOS.forEach((n, i) => S.add('dom' + i, column(0.42, 2.5, 1.4, [C.cream, C.apricot, C.orange, C.blue, C.navy][i], i === 4 ? { emissive: 0x2f6e9e, emissiveIntensity: 0.35 } : null)));
    },
    pose(step) {
      step = Math.min(step, 7);
      const p = {}, labels = [], idx = [100, 100, 150, 205, 205, 136, 136, 136][step];
      const bad = step >= 4 ? 6 : 0, CX = step >= 5 ? -3.4 : -1.2;
      for (let i = 0; i < 20; i++) {
        const c = i % 5, r = Math.floor(i / 5), off = ORDER.indexOf(i) < bad;
        const hot = clamp((idx - 100) / 105, 0, 1);
        p['casa' + i] = { x: CX + (c - 2) * 1.25, y: 0, z: 0.2 + (r - 1.5) * 1.35, s: 0.62, sy: idx / 100, c: off ? C.gray : mix(C.cream, C.apricot, hot) };
      }
      const buyers = step === 0 ? 2 : step <= 3 ? 8 : 0;
      for (let i = 0; i < 8; i++) p['comp' + i] = { x: CX - 3.2 + i * 0.92, y: 0, z: 3.0 + (i % 2) * 0.45, s: i < buyers ? 0.75 : 0 };
      if (buyers) labels.push({ id: 'comp', on: [CX, 1.5 + idx / 100, -2.6], html: step === 0 ? 'Poucos compradores: só quem consegue crédito' : 'Crédito para quase todos: muito mais compradores', cls: step === 0 ? 'nota' : 'bom' });
      p.bolha = { x: CX, y: 1.0, z: 0.2, s: step === 2 ? 3.6 : step === 3 || step === 4 ? 4.7 : step >= 5 ? 7 : 0.1, o: step >= 2 && step <= 4 ? 0.2 : 0 };
      if (step === 4 || step === 5) labels.push({ id: 'npaga', on: [CX, 0.1, 3.4], html: step === 4 ? 'As prestações sobem: 6 em 20 deixam de pagar' : 'Casas penhoradas à venda: mais oferta, menos procura', cls: 'mau' });
      const fallen = step >= 6;
      DOMINOS.forEach((n, i) => {
        p['dom' + i] = { x: 1.3 + i * 1.6, y: 0, z: 0.6, s: step >= 5 ? 1 : 0, rz: fallen ? -1.18 : 0, delay: fallen ? 0.25 + i * 0.38 : 0 };
        if (step >= 5) labels.push({ id: 'dom' + i, on: [1.3 + i * 1.6 + (fallen ? 0.8 : 0), (fallen ? 1.7 : 2.8) + (i % 2) * 0.75, 0.6], html: n, cls: 'dom' });
      });
      if (fallen) labels.push({ id: 'lehman', on: [4.6, 0.1, 3.6], html: '15 de setembro de 2008<small>o banco Lehman Brothers vai à falência</small>', cls: 'mau' });
      const ano = ['2000', 'início dos anos 2000', '2004', 'meados de 2006', '2007', 'início de 2012', 'início de 2012', 'início de 2012'][step];
      const read = '<small>Preço das casas nos Estados Unidos · ' + ano + '</small><span class="' + (step >= 5 ? 'falha' : '') + '">ano 2000 = 100 → <b>' + idx + '</b></span>';
      return { cam: step >= 5 ? { from: [0.8, 10.4, 18.5], at: [0.8, 1.2, 0.6] } : { from: [-1.2, 8.6, 14.5], at: [-1.2, 1.2, 0.6] }, p, labels, read };
    },
    sound: (a, b) => (b === 5 ? SFX.estoira() : b === 6 ? SFX.domino() : b === 2 || b === 3 ? SFX.sobe() : b === 4 ? SFX.desce() : SFX.passo()),
  };

  /** Mix two colours (0xRRGGBB): t = 0 gives a, t = 1 gives b. */
  function mix(a, b, t) {
    const ch = s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  }

  /* ======================================================================
     RUNNING THE SCENES (no need to change)
     ====================================================================== */
  const stages = palcos3d.filter(p => SCENES[p.dataset.cena]).map(palco => {
    const def = SCENES[palco.dataset.cena], slide = palco.closest('.slide');
    const st = { palco, slide, def, root: null, pieces: {}, state: {}, flows: new Map(), labels: new Map(), step: -1, since: 0, pose: null };
    st.ctr = controls(palco, def.controls, () => { st.pose = null; });
    st.ctr.show(0);
    return st;
  });
  let current = null;
  const look = new T.Vector3(), eye = new T.Vector3(), point = new T.Vector3(), tmpColor = new T.Color();
  let width = 1, height = 1, lastTime = 0, running = false;
  const coinGeo = new T.CylinderGeometry(0.13, 0.13, 0.05, 14);
  const coinMats = {};

  /** Build the pieces of a scene the first time its slide is shown. */
  function buildStage(st) {
    st.root = new T.Group();
    st.root.add(box(16.5, 0.5, 11.5, C.slab, 0, -0.25, 0), box(17, 0.3, 12, C.rim, 0, -0.5, 0));   // slab and rim
    st.root.children.forEach(m => { m.castShadow = false; });
    scene.add(st.root);
    const S = { pieces: st.pieces, add(name, obj) { obj.scale.setScalar(0.001); st.root.add(obj); st.pieces[name] = obj; st.state[name] = { g: 0 }; return obj; } };
    st.def.build(S);
  }

  function resize() {
    if (!current) return;
    fitHeight(current.palco);
    width = current.palco.clientWidth || 1; height = current.palco.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  /** Where a flow or a label is anchored: a piece (by name) or a fixed point. */
  function anchor(st, on, dy) {
    if (Array.isArray(on)) return point.set(on[0], on[1], on[2]);
    const o = st.pieces[on];
    return point.set(o.position.x, o.position.y + (dy || 0), o.position.z);
  }

  function frame(time) {
    const st = current;
    if (!st || !st.slide.classList.contains('current')) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min((time - lastTime) / 1000 || 0.016, 0.05);
    lastTime = time;
    const step = stepOf(st.slide);
    if (step !== st.step) {
      if (st.step >= 0 && st.def.sound) st.def.sound(st.step, step);
      st.step = step; st.since = time; st.pose = null; st.ctr.show(step);
      resize();
    }
    if (!st.pose) {
      st.pose = st.def.pose(step, st.ctr.values);
      readout.innerHTML = st.pose.read || '';
      readout.hidden = !st.pose.read;
      syncLabels(st);
    }
    const pose = st.pose, ease = reduced ? 1 : 1 - Math.exp(-dt * 3.4), waited = (time - st.since) / 1000;

    for (const name in st.pieces) {
      const obj = st.pieces[name], goal = pose.p[name], mem = st.state[name];
      if (goal && goal.delay && waited < goal.delay) continue;
      const gs = goal ? (goal.s === undefined ? 1 : goal.s) : 0;
      if (goal) {
        const dx = goal.x - obj.position.x, dz = goal.z - obj.position.z, dist = Math.hypot(dx, dz);
        if (obj.scale.x < 0.01 && gs > 0) { obj.position.set(goal.x, goal.y, goal.z); mem.g = goal.y; }   // appear in place
        obj.position.x += dx * ease; obj.position.z += dz * ease;
        mem.g += (goal.y - mem.g) * ease;
        // pawns hop while they walk
        obj.position.y = mem.g + (obj.userData.walks && dist > 0.08 && !reduced ? Math.abs(Math.sin(time / 130)) * 0.3 : 0);
        if (goal.rz !== undefined) obj.rotation.z += (goal.rz - obj.rotation.z) * Math.min(1, ease * 2.2);
        if (goal.c !== undefined && obj.userData.tint) obj.userData.tint.color.lerp(tmpColor.setHex(goal.c), ease);
        if (goal.c !== undefined && obj.userData.roof) obj.userData.roof.color.lerp(tmpColor.setHex(goal.c === C.gray ? 0x4d5861 : C.orange), ease);   // a house that stopped paying goes grey, roof and all
        if (goal.o !== undefined) obj.material.opacity += (goal.o - obj.material.opacity) * Math.min(1, ease * 3);
      }
      const k = Math.min(ease * 1.8, 1);
      const sx = obj.scale.x + (Math.max(gs, 0.001) - obj.scale.x) * k;
      const sy = obj.scale.y + (Math.max(gs * (goal && goal.sy !== undefined ? goal.sy : 1), 0.001) - obj.scale.y) * k;
      obj.scale.set(sx, sy, sx);
      obj.visible = sx > 0.02;
    }

    // coins travelling from a to b
    const wanted = new Set();
    (pose.flows || []).forEach(f => {
      wanted.add(f.id);
      let coins = st.flows.get(f.id);
      if (!coins) { coins = []; st.flows.set(f.id, coins); }
      const cor = f.cor || C.gold;
      while (coins.length < f.n) {
        const m = new T.Mesh(coinGeo, coinMats[cor] || (coinMats[cor] = clay(cor, { roughness: 0.4, metalness: 0.4 })));
        m.castShadow = true; st.root.add(m); coins.push(m);
      }
      const a = anchor(st, f.a).clone(), b = anchor(st, f.b).clone();
      coins.forEach((m, i) => {
        m.visible = i < f.n;
        if (!m.visible) return;
        const u = ((time / 2600) + i / f.n) % 1;
        m.position.lerpVectors(a, b, u);
        m.position.y += Math.sin(Math.PI * u) * 1.5;
        m.rotation.set(time / 300 + i, 0, 1.2);
      });
    });
    st.flows.forEach((coins, id) => { if (!wanted.has(id)) coins.forEach(m => { m.visible = false; }); });

    // camera: glide to the shot of this build; step back on tall, narrow screens
    const shot = pose.cam, back = 0.8 * Math.max(1, 2.3 / camera.aspect);   // 0.8: fill the stage; step back on narrow screens
    point.set(...shot.at); look.lerp(point, ease * 0.75);
    point.set(shot.at[0] + (shot.from[0] - shot.at[0]) * back + (reduced ? 0 : Math.sin(time / 4200) * 0.35),
      shot.at[1] + (shot.from[1] - shot.at[1]) * back, shot.at[2] + (shot.from[2] - shot.at[2]) * back + (reduced ? 0 : Math.cos(time / 5200) * 0.25));
    eye.lerp(point, ease * 0.75);
    camera.position.copy(eye);
    camera.lookAt(look);
    renderer.render(scene, camera);

    // HTML labels follow their pieces
    st.labels.forEach(item => {
      if (!item.spec) return;
      const piece = Array.isArray(item.spec.on) ? null : st.pieces[item.spec.on];
      anchor(st, item.spec.on, item.spec.dy).project(camera);
      const shown = point.z < 1 && (!piece || piece.scale.x > 0.4);
      item.el.classList.toggle('visivel', shown);
      item.el.style.transform = 'translate(-50%, -100%) translate(' + ((point.x + 1) / 2 * width).toFixed(1) + 'px, ' + ((1 - point.y) / 2 * height).toFixed(1) + 'px)';
    });
  }

  /** Create, update or hide the HTML labels so that they match the current pose. */
  function syncLabels(st) {
    st.labels.forEach(item => { item.spec = null; });
    (st.pose.labels || []).forEach(spec => {
      let item = st.labels.get(spec.id);
      if (!item) {
        item = { el: document.createElement('div'), html: '' };
        layer.append(item.el);
        st.labels.set(spec.id, item);
      }
      item.spec = spec;
      item.el.className = 'c08-et ' + (spec.cls || '') + (item.el.classList.contains('visivel') ? ' visivel' : '');
      if (item.html !== spec.html) { item.el.innerHTML = spec.html; item.html = spec.html; }
    });
    st.labels.forEach(item => { if (!item.spec) item.el.classList.remove('visivel'); });
  }

  /** Move the canvas into the slide that is now shown and start drawing. */
  function activate() {
    const st = stages.find(s => s.slide.classList.contains('current'));
    if (st !== current && current) {                    // put the scene that was showing away
      current.root.visible = false;
      current.labels.forEach(item => item.el.remove());
    }
    if (!st) { current = null; return; }
    if (st !== current) {
      current = st;
      if (!st.root) buildStage(st);
      st.root.visible = true;
      st.labels.forEach(item => layer.append(item.el));
      st.palco.append(canvas, layer, readout);
      st.step = -1; st.pose = null;
      const first = st.def.pose(stepOf(st.slide), st.ctr.values).cam;   // start at the shot, without gliding in from the last scene
      look.set(...first.at); eye.set(...first.from);
      resize();
      // put every piece where this build wants it, so that going back to a slide does not replay everything
      const pose = st.def.pose(stepOf(st.slide), st.ctr.values);
      for (const name in st.pieces) {
        const g = pose.p[name], o = st.pieces[name];
        if (g) { o.position.set(g.x, g.y, g.z); st.state[name].g = g.y; }
      }
    }
    if (!running) { running = true; lastTime = 0; requestAnimationFrame(frame); }
  }

  window.addEventListener('resize', resize);
  const watch = new MutationObserver(activate);
  stages.forEach(st => watch.observe(st.slide, { attributes: true, attributeFilter: ['class'] }));
  activate();
})();
