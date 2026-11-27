/* ==========================================================================
   percurso3d.js — «Do Toyotismo ao desemprego»: ONE 3D board for a whole lesson.
   Needs assets/vendor/three.min.js (three.js release 160).

   The board has four stops (the factory, the home, the table where the rules
   are made, the unemployment queue). The worker (the orange pawn with the white
   dot) walks from stop to stop. The SAME scene is shown on five slides of the
   lesson, each one picking the story up where the previous one left it:

     s-sx-abertura  moments 0 to 2   the whole board; Ford's crisis; Toyota
     s-sx-casa      moments 2 to 3   from the factory to the home (telework)
     s-sx-mesa      moments 3 to 5   alone at the table; then together (collective agreement)
     s-sx-fila      moments 5 to 7   the factory leaves; the queue; the unemployment rate
     s-sx-fim       moment 8         the whole board again, one idea per stop

   How it works (same ideas as industria3d.js, whose look it shares):
   - The story is a table. SCRIPT says where each piece stands from a given
     moment on; SHOTS says what the camera frames at each moment. Every frame,
     pieces move towards the place the current moment gives them, so the left
     arrow simply plays the story backwards.
   - A slide shows moment BASE[slide id] + (number of builds revealed). app.js
     puts the classes ge1…geN on the slide; nothing else is needed from it.
   - Text is HTML (captions under the picture, labels over it), never 3D.
   If WebGL is not available, the captions still tell the story.
   Code comments in English; every text students read in European Portuguese.
   ========================================================================== */
(function percurso3d() {
  'use strict';
  const BASE = { 's-sx-abertura': 0, 's-sx-casa': 2, 's-sx-mesa': 3, 's-sx-fila': 5, 's-sx-fim': 8 };
  const slideEls = Object.keys(BASE).map(id => document.getElementById(id)).filter(Boolean);
  if (!slideEls.length) return;
  const T = window.THREE;
  let renderer;
  try {
    if (!T) throw new Error('three.js em falta');
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) { slideEls.forEach(el => el.classList.add('sem-3d')); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  const layer = document.createElement('div');           // HTML labels over the picture
  layer.className = 'i3d-camada';
  const camera = new T.PerspectiveCamera(28, 1.6, 0.1, 400);
  const scene = new T.Scene();

  /* ---------- Colours (the deck's palette) and building blocks ---------- */
  const C = {
    navy: 0x1E2A33, orange: 0xA44A16, apricot: 0xF0A673, cream: 0xF6F3EC, peach: 0xF1CDB0,
    blue: 0x2F6E9E, blueL: 0xDCE8F2, greenL: 0xDCE5CF, grey: 0x6F7880, greyL: 0xB4BBC1,
    brick: 0x9C5A3C, brickD: 0x7A4430, iron: 0x3B434A, wood: 0xC08A5A, white: 0xFBF8F1,
    sand: 0xE4DCCB, slab: 0xE9E3D6, rim: 0xD3CABA, road: 0xD9D1C0, glass: 0xF7E7B5,
  };
  const clay = (color, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0 }, extra));
  function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
  const box = (w, h, d, color, x, y, z) => mesh(new T.BoxGeometry(w, h, d), typeof color === 'number' ? clay(color) : color, x, y, z);
  const cyl = (r, h, color, x, y, z, seg = 28) => mesh(new T.CylinderGeometry(r, r, h, seg), typeof color === 'number' ? clay(color) : color, x, y, z);
  const group = (...kids) => { const g = new T.Group(); kids.forEach(k => g.add(k)); return g; };

  /** A game pawn (about 1.3 units tall). hat: who gives the orders; dot: the worker we follow. */
  const OUTLINE = [[0, 0], [0.44, 0], [0.46, 0.09], [0.31, 0.18], [0.2, 0.52], [0.16, 0.8], [0.28, 0.86], [0.28, 0.93], [0.14, 0.97]];
  const pawnGeo = new T.LatheGeometry(OUTLINE.map(([x, y]) => new T.Vector2(x, y)), 28);
  const headGeo = new T.SphereGeometry(0.27, 22, 16);
  function pawn(color, opts = {}) {
    const m = clay(color, { roughness: 0.55 });
    const inner = group(mesh(pawnGeo, m), mesh(headGeo, m, 0, 1.16, 0));
    if (opts.hat) inner.add(cyl(0.2, 0.36, C.apricot, 0, 1.54, 0, 18), cyl(0.33, 0.045, C.apricot, 0, 1.37, 0, 18));
    if (opts.dot) inner.add(mesh(new T.SphereGeometry(0.085, 14, 10), clay(0xFFFFFF, { roughness: 0.5 }), 0, 0.58, 0.19));
    inner.scale.setScalar(opts.size || 0.9);
    return group(inner);
  }

  /* ---------- Lights ---------- */
  scene.add(new T.HemisphereLight(0xffffff, 0xb8b0a0, 1.9));
  const sun = new T.DirectionalLight(0xfff0dc, 2.2);
  sun.position.set(-9, 18, 11);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 10, bottom: -10, near: 1, far: 60 });
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);

  /* ---------- STORY: the fixed board ---------- */
  const TOP = 0.3;                                          // height of the top of a tile
  scene.add(box(33, 0.5, 11, C.slab, 0, -0.25, 0), box(33.6, 0.3, 11.6, C.rim, 0, -0.5, 0));
  scene.add(box(31.4, 0.05, 1.3, C.road, 0, 0.025, 3.9));   // the road the worker walks along
  for (let x = -14.8; x <= 14.8; x += 1.6) scene.add(box(0.7, 0.012, 0.08, 0xFFFFFF, x, 0.057, 3.9));
  [[-12, C.peach], [-4, C.greenL], [4, C.blueL], [12, C.sand]].forEach(([x, color]) => scene.add(box(6.8, 0.3, 6.4, color, x, 0.15, -0.3)));

  // stop 2: the home (a house, a desk with a laptop) and, further back, the company
  const roof = mesh(new T.ConeGeometry(2.0, 1.0, 4), clay(C.orange), -5.0, TOP + 2.0, -2.3);
  roof.rotation.y = Math.PI / 4;
  scene.add(box(2.5, 1.5, 1.9, C.white, -5.0, TOP + 0.75, -2.3), roof,
    box(0.45, 0.8, 0.05, C.navy, -5.4, TOP + 0.4, -1.33), box(0.55, 0.5, 0.05, C.glass, -4.4, TOP + 0.85, -1.33));
  scene.add(box(1.5, 0.08, 0.75, C.wood, -3.3, TOP + 0.6, 0.4), box(0.08, 0.6, 0.6, C.wood, -3.95, TOP + 0.3, 0.4), box(0.08, 0.6, 0.6, C.wood, -2.65, TOP + 0.3, 0.4));
  const screenMat = new T.MeshStandardMaterial({ color: 0x9CC3E4, emissive: 0x5FA8E0, emissiveIntensity: 0.05, roughness: 0.4 });
  const screen = box(0.56, 0.38, 0.03, screenMat, -3.3, TOP + 0.86, 0.26);
  screen.rotation.x = -0.22;
  scene.add(box(0.56, 0.03, 0.38, C.iron, -3.3, TOP + 0.655, 0.45), screen);
  scene.add(box(1.4, 2.8, 1.4, C.blue, -1.5, TOP + 1.4, -2.3));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) scene.add(box(0.36, 0.42, 0.04, C.glass, -1.8 + c * 0.6, TOP + 0.75 + r * 0.8, -1.59));
  // the link between the laptop and the company: small beads running along an arc
  const linkCurve = new T.QuadraticBezierCurve3(new T.Vector3(-3.3, TOP + 1.1, 0.3), new T.Vector3(-2.5, 4.6, -1), new T.Vector3(-1.5, TOP + 2.95, -2.3));
  const beads = Array.from({ length: 6 }, () => { const b = mesh(new T.SphereGeometry(0.075, 10, 8), clay(C.blue, { emissive: C.blue, emissiveIntensity: 0.6 })); b.castShadow = false; scene.add(b); return b; });

  // stop 3: the table where the rules are made
  scene.add(box(3.0, 0.12, 1.2, C.wood, 4, TOP + 0.72, 0.2), box(0.14, 0.66, 1.0, C.wood, 2.8, TOP + 0.33, 0.2), box(0.14, 0.66, 1.0, C.wood, 5.2, TOP + 0.33, 0.2));

  // stop 4: the job centre
  scene.add(box(3.8, 1.7, 1.3, C.white, 12.6, TOP + 0.85, -2.6), box(3.8, 0.42, 0.08, C.navy, 12.6, TOP + 1.42, -1.93),
    box(0.5, 0.85, 0.05, C.blue, 12.6, TOP + 0.425, -1.94), box(4.0, 0.12, 1.5, C.navy, 12.6, TOP + 1.76, -2.6));

  /* ---------- STORY: the pieces that move ---------- */
  const pieces = {};
  const add = (name, object, walks = false) => { object.userData.walks = walks; scene.add(object); pieces[name] = object; return object; };

  // stop 1: the factory building (it leaves at moment 6), Ford's line and its stock, Toyota's round table
  const fabrica = group(box(4.6, 1.9, 1.7, C.brick, 0, 0.95, 0), cyl(0.26, 2.4, C.brickD, 1.85, 2.2, -0.3, 18));
  for (let k = 0; k < 3; k++) { const tooth = box(1.56, 0.5, 1.7, C.brickD, -1.52 + k * 1.52, 2.02, 0); tooth.rotation.z = 0.3; fabrica.add(tooth); }
  for (let k = 0; k < 4; k++) fabrica.add(box(0.5, 0.6, 0.05, C.glass, -1.65 + k * 1.0, 1.05, 0.86));
  add('fabrica', fabrica);
  const lineBoxes = [0, 1, 2].map(() => box(0.36, 0.36, 0.36, C.apricot, 0, 0.78, 0));
  add('linha', group(box(3.4, 0.3, 0.7, C.iron, 0, 0.45, 0), box(0.2, 0.3, 0.6, C.iron, -1.4, 0.15, 0), box(0.2, 0.3, 0.6, C.iron, 1.4, 0.15, 0), ...lineBoxes));
  const stock = group();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) for (let k = 0; k < 2; k++) stock.add(box(0.44, 0.44, 0.44, C.apricot, (j - (2 - i) / 2) * 0.5, 0.22 + i * 0.46, k * 0.52 - 0.26));
  add('stock', stock);
  add('mesaT', group(cyl(0.95, 0.12, C.wood, 0, 0.66, 0), cyl(0.14, 0.6, C.wood, 0, 0.3, 0, 14)));
  add('encomenda', group(box(0.62, 0.05, 0.44, 0xFFFFFF, 0, 0, 0), box(0.62, 0.055, 0.12, C.blue, 0, 0, -0.16)));
  add('produto', box(0.5, 0.5, 0.5, C.apricot, 0, 0, 0));

  // stop 3: the contract of one worker, then the collective agreement (it stands on the table like a sign)
  add('contratoI', box(0.5, 0.04, 0.36, 0xFFFFFF, 0, 0, 0));
  const contratoC = group(box(1.8, 1.2, 0.07, 0xFFFFFF, 0, 0.6, 0), box(1.8, 0.28, 0.09, C.orange, 0, 1.06, 0));
  [0.74, 0.52, 0.3].forEach((y, k) => contratoC.add(box(k === 2 ? 0.9 : 1.4, 0.07, 0.09, C.navy, k === 2 ? -0.25 : 0, y, 0)));
  add('contratoC', contratoC);

  // stop 4: the plates that group the people when the rate is counted
  add('tAtivos', box(6.9, 0.08, 2.6, 0xF6D3B8, 0, 0, 0));
  add('tInativos', box(6.4, 0.08, 1.25, 0xC9D1D8, 0, 0, 0));

  // the cast
  add('W', pawn(C.orange, { dot: true, size: 0.95 }), true);        // the worker we follow
  add('B', pawn(C.navy, { hat: true, size: 0.95 }), true);          // whoever gives the orders
  add('K', pawn(C.blue), true);                                     // the customer
  ['c1', 'c2', 's1', 's2', 's3', 's4', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'].forEach(n => add(n, pawn(C.apricot), true));
  ['b2', 'b3'].forEach(n => add(n, pawn(C.navy, { hat: true }), true));
  ['i1', 'i2', 'i3', 'i4', 'i5', 'i6'].forEach(n => add(n, pawn(C.greyL), true));

  /* ---------- STORY: SCRIPT ----------
     Per piece: [first moment, { x, y, z, s, d }]. s is size (0 = not on the board).
     A piece keeps each value until a later entry changes it. d (seconds) delays an
     entry inside its own moment, so that two things can happen one after the other. */
  const SCRIPT = {
    fabrica:   [[0, { x: -12.4, y: TOP, z: -2.5, s: 1 }], [6, { x: -27, d: 0.5 }]],
    linha:     [[0, { x: -12.6, y: TOP, z: -0.1, s: 1 }], [2, { s: 0 }]],
    stock:     [[0, { x: -9.9, y: TOP, z: -0.5, s: 1 }], [2, { s: 0 }]],
    mesaT:     [[0, { x: -12.3, y: TOP, z: 0.5, s: 0 }], [2, { s: 1 }], [6, { s: 0 }]],
    encomenda: [[0, { x: -9.4, y: 1.9, z: 2.1, s: 0 }], [2, { s: 1 }], [2, { x: -12.3, y: TOP + 0.76, z: 0.5, d: 1.2 }], [6, { s: 0 }]],
    produto:   [[0, { x: -12.3, y: TOP + 1.05, z: 0.5, s: 0 }], [2, { s: 1, d: 3.0 }], [2, { x: -9.6, y: TOP + 0.25, z: 0.9, d: 4.4 }], [6, { s: 0 }]],
    contratoI: [[0, { x: 4, y: TOP + 0.8, z: 0.2, s: 0 }], [4, { s: 1, d: 2.6 }], [5, { s: 0 }]],
    contratoC: [[0, { x: 4, y: TOP + 0.78, z: 0.2, s: 0 }], [5, { s: 1, d: 2.2 }]],
    tAtivos:   [[0, { x: 12.0, y: TOP + 0.04, z: -0.35, s: 0 }], [7, { s: 1 }]],
    tInativos: [[0, { x: 12.0, y: 0.1, z: 3.9, s: 0 }], [7, { s: 1 }]],
    W:  [[0, { x: -12.6, y: TOP, z: -1.05, s: 1 }], [2, { x: -11.05, z: 0.95 }], [3, { x: -4.5, z: 0.5 }], [4, { x: 6.0, z: 0.3 }], [6, { x: 13.6, z: -0.35 }]],
    B:  [[0, { x: -14.6, y: TOP, z: 1.0, s: 1 }], [2, { x: -11.75, z: -0.6 }], [3, { x: -1.5, z: -0.9 }], [4, { x: 2.0, z: 0.3 }]],
    K:  [[0, { x: -9.4, y: TOP, z: 2.1, s: 0 }], [2, { s: 1 }], [6, { s: 0 }]],
    c1: [[0, { x: -13.75, y: TOP, z: -1.05, s: 1 }], [2, { x: -13.55, z: 0.95 }], [6, { x: 14.6, z: -0.35 }]],
    c2: [[0, { x: -11.45, y: TOP, z: -1.05, s: 1 }], [2, { x: -12.85, z: -0.6 }], [6, { s: 0 }]],
    s1: [[0, { x: 8.6, y: TOP, z: 2.6, s: 0 }], [5, { x: 7.05, z: -0.55, s: 1 }]],
    s2: [[0, { x: 8.6, y: TOP, z: 2.6, s: 0 }], [5, { x: 7.05, z: 1.15, s: 1 }]],
    s3: [[0, { x: 8.6, y: TOP, z: 2.6, s: 0 }], [5, { x: 8.0, z: 0.3, s: 1 }]],
    s4: [[0, { x: 8.6, y: TOP, z: 2.6, s: 0 }], [5, { x: 6.1, z: -1.1, s: 1 }]],
    b2: [[0, { x: -0.4, y: TOP, z: 2.6, s: 0 }], [5, { x: 0.95, z: -0.55, s: 1 }]],
    b3: [[0, { x: -0.4, y: TOP, z: 2.6, s: 0 }], [5, { x: 0.95, z: 1.15, s: 1 }]],
  };
  // moment 7: eight employed people on the plate of the active population, six inactive people apart
  for (let k = 0; k < 8; k++) SCRIPT['e' + (k + 1)] = [[0, { x: 9.1 + (k % 4) * 0.96, y: TOP + 0.08, z: k < 4 ? -0.95 : 0.25, s: 0 }], [7, { s: 1 }]];
  for (let k = 0; k < 6; k++) SCRIPT['i' + (k + 1)] = [[0, { x: 9.6 + k * 0.96, y: 0.14, z: 3.9, s: 0 }], [7, { s: 1 }]];

  /* ---------- STORY: what the camera frames at each moment (a box, and the direction to look from) ---------- */
  const WIDE = { box: [-15.6, 0, -3.6, 15.6, 3.2, 4.4], dir: [0, 0.95, 1] };
  const SHOTS = [
    WIDE,
    { box: [-15.4, 0, -3.4, -8.8, 3.4, 1.9], dir: [-0.12, 0.55, 1] },    // 1 Ford's line and its stock
    { box: [-15.0, 0, -3.2, -8.4, 3.2, 2.9], dir: [-0.12, 0.55, 1] },    // 2 Toyota: the order, then the product
    { box: [-6.9, 0, -3.4, -0.4, 4.4, 2.2], dir: [-0.12, 0.5, 1] },      // 3 the home and the company
    { box: [0.8, 0, -2.2, 7.2, 3.0, 2.4], dir: [0, 0.45, 1] },           // 4 one worker, one employer
    { box: [-0.6, 0, -2.4, 9.2, 3.2, 2.8], dir: [0, 0.48, 1] },          // 5 the union and the employers' association
    WIDE,                                                                // 6 the factory leaves; the worker walks to the queue
    { box: [8.4, 0, -3.6, 15.6, 3.6, 4.8], dir: [-0.12, 0.62, 1] },      // 7 counting: active, unemployed, inactive
    WIDE,                                                                // 8 the four ideas
  ];
  const LAST = SHOTS.length - 1;

  /* ---------- STORY: labels (HTML over the 3D picture) ---------- */
  const labels = [];
  /** Label over a piece or a fixed point [x, y, z]; show(moment) says when. */
  function label(html, cls, target, dy, show) {
    const el = document.createElement('div');
    el.className = 'i3d-et ' + cls;
    el.innerHTML = html;
    layer.append(el);
    labels.push({ el, target, dy, show });
  }
  const at = (...ms) => m => ms.includes(m);
  const P = pieces;
  // the four stops, in the wide shots; one idea per stop at the end
  label('1 · a fábrica', 'i3d-nota i3d-forte', [-12.2, 3.3, -3.2], 0, at(0));
  label('2 · a casa', 'i3d-nota i3d-forte', [-4.4, 3.3, -3.2], 0, at(0, 6));
  label('3 · a mesa das regras', 'i3d-nota i3d-forte', [4, 3.3, -3.2], 0, at(0, 6));
  label('4 · a fila do desemprego', 'i3d-nota i3d-forte', [12.2, 3.3, -3.2], 0, at(0, 6));
  label('<b>Toyotismo</b><br>produzir só o que é pedido', 'i3d-nota p3d-ideia', [-12.2, 1.2, -4.6], 0, at(8));
  label('<b>Teletrabalho</b><br>trabalhar à distância', 'i3d-nota p3d-ideia', [-4.2, -0.3, 6.6], 0, at(8));
  label('<b>Contrato coletivo</b><br>sindicato + associação de empregadores', 'i3d-nota p3d-ideia', [4, 1.2, -4.6], 0, at(8));
  label('<b>Taxa de desemprego</b><br>desempregados ÷ população ativa × 100', 'i3d-nota p3d-ideia', [11.4, -0.3, 6.6], 0, at(8));
  // the cast
  label('trabalhador', 'i3d-pessoa', P.W, 1.5, m => m <= 6);
  label('quem manda', 'i3d-pessoa', P.B, 1.8, at(1, 2, 4));
  label('cliente', 'i3d-pessoa', P.K, 1.45, at(2));
  // 1 · Ford's crisis (the four reasons of the slide «A crise dos modelos»)
  label('linhas de montagem caras', 'i3d-nota', [-13.9, 3.4, -2.5], 0, at(1));
  label('armazém cheio: os clientes querem escolher', 'i3d-nota', [-9.9, 2.1, -0.5], 0, at(1));
  label('tarefas repetitivas: doenças profissionais', 'i3d-nota', [-12.6, 0.35, 1.6], 0, at(1));
  label('sem autonomia', 'i3d-nota', [-11.2, 2.15, -1.05], 0, at(1));
  // 2 · Toyota
  label('1.º a encomenda', 'i3d-fala', P.encomenda, 0.3, at(2));
  label('2.º o produto', 'i3d-fala', P.produto, 0.5, at(2));
  label('trabalho de equipa', 'i3d-nota', [-14.2, 2.2, 0.5], 0, at(2));
  // 3 · telework
  label('teletrabalho', 'i3d-nota i3d-forte', [-3.9, 2.5, 0.4], 0, at(3));
  label('computador + internet', 'i3d-nota', [-2.9, 1.2, 0.9], 0, at(3));
  label('a empresa', 'i3d-nota', [-1.5, 3.5, -2.3], 0, at(3));
  // 4 and 5 · the rules
  label('contrato individual', 'i3d-nota', P.contratoI, 0.3, at(4));
  label('sozinho: pouca força para negociar', 'i3d-fala', [6.0, 2.5, 0.3], 0, at(4));
  label('sindicato', 'i3d-nota i3d-forte', [7.3, 2.1, 0.3], 0, at(5));
  label('associação de empregadores', 'i3d-nota i3d-forte', [1.2, 2.5, 0.3], 0, at(5));
  label('contrato coletivo', 'i3d-fala', P.contratoC, 1.4, at(5));
  // 6 · the factory leaves
  label('a fábrica mudou de país', 'i3d-fala', [-12.2, 0.6, -0.4], 0, at(6));
  label('sem trabalho · disponível · à procura', 'i3d-nota', P.W, 2.2, at(6));
  // 7 · counting
  label('população ativa: 10', 'i3d-nota i3d-forte', [10.6, 2.5, -0.95], 0, at(7));
  label('empregados: 8', 'i3d-nota', [10.5, 1.7, 0.25], 0, at(7));
  label('desempregados: 2', 'i3d-nota', [14.1, 2.0, -0.35], 0, at(7));
  label('inativos: 6 · não entram na conta', 'i3d-nota', [12.0, 1.6, 3.9], 0, at(7));
  label('2 ÷ 10 × 100 = 20 %', 'i3d-fala p3d-conta', [12.6, 3.3, -2.6], 0, at(7));

  /* ---------- Engine (no need to change to tell another story) ---------- */
  const tmpV = new T.Vector3(), look = new T.Vector3(), eye = new T.Vector3();
  const probe = new T.PerspectiveCamera();
  let width = 1, height = 1, running = false, lastTime = 0;
  let current = null;                                       // { el, moment, time (seconds in this moment), shot }

  function stepOf(el) { let k = 0; while (el.classList.contains('ge' + (k + 1))) k++; return k; }
  const momentOf = el => Math.min(BASE[el.id] + stepOf(el), LAST);

  /** Where a piece should be at a moment, `time` seconds after that moment began. */
  function placeAt(name, moment, time) {
    const place = {};
    for (const [from, values] of SCRIPT[name]) if (from < moment || (from === moment && time >= (values.d || 0))) Object.assign(place, values);
    return place;
  }
  function snap(moment) {                                   // put everything where the moment says, at once
    for (const name in SCRIPT) {
      const p = placeAt(name, moment, 99), piece = pieces[name];
      piece.position.set(p.x, p.y, p.z);
      piece.scale.setScalar(Math.max(p.s, 0.001));
      piece.visible = p.s > 0.02;
      piece.userData.ground = p.y;
    }
  }
  function setSpeeds(moment) {                              // any walk, short or long, takes at most about 2.6 seconds
    for (const name in SCRIPT) {
      const piece = pieces[name], goal = placeAt(name, moment, 99);
      piece.userData.speed = Math.max(3.4, Math.hypot(goal.x - piece.position.x, goal.z - piece.position.z) / 2.6);
    }
  }

  /** Where to put the camera so that a box fills the picture, seen from `dir`. */
  function fitBox(b, dir) {
    const corners = [];
    for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) corners.push(new T.Vector3(x, y, z));
    const target = new T.Vector3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
    const d = new T.Vector3(...dir).normalize();
    const M = 0.92;
    const bounds = (from, to) => {
      probe.copy(camera); probe.position.copy(from); probe.lookAt(to); probe.updateMatrixWorld(); probe.updateProjectionMatrix();
      const r = { x0: 9, x1: -9, y0: 9, y1: -9 };
      for (const p of corners) { tmpV.copy(p).project(probe); r.x0 = Math.min(r.x0, tmpV.x); r.x1 = Math.max(r.x1, tmpV.x); r.y0 = Math.min(r.y0, tmpV.y); r.y1 = Math.max(r.y1, tmpV.y); }
      return r;
    };
    let dist = 20;
    for (let pass = 0; pass < 3; pass++) {
      let lo = 1, hi = 300;
      for (let k = 0; k < 28; k++) {
        const mid = (lo + hi) / 2, r = bounds(target.clone().addScaledVector(d, mid), target);
        if (r.x1 - r.x0 <= 2 * M && r.y1 - r.y0 <= 2 * M) hi = mid; else lo = mid;
      }
      dist = hi;
      const r = bounds(target.clone().addScaledVector(d, dist), target);
      const h = dist * Math.tan(T.MathUtils.degToRad(camera.fov / 2)), w = h * camera.aspect;
      const right = new T.Vector3().setFromMatrixColumn(probe.matrixWorld, 0), up = new T.Vector3().setFromMatrixColumn(probe.matrixWorld, 1);
      target.addScaledVector(right, (r.x0 + r.x1) / 2 * w).addScaledVector(up, (r.y0 + r.y1) / 2 * h);
    }
    return { at: target, from: target.clone().addScaledVector(d, dist) };
  }
  const shotFor = moment => fitBox(SHOTS[moment].box, SHOTS[moment].dir);

  /** Make the picture as tall as the window allows, leaving room for the caption under it. */
  function fitHeight(el) {
    const palco = el.querySelector('.i3d-palco'), leg = el.querySelector('.i3d-leg');
    if (leg && !leg.dataset.medido && leg.offsetWidth) {     // the captions keep the height of the longest one
      let max = 0;
      for (const p of leg.children) { const d = p.style.display; p.style.display = 'block'; max = Math.max(max, p.offsetHeight); p.style.display = d; }
      leg.style.minHeight = max + 'px'; leg.dataset.medido = '1';
    }
    if (matchMedia('(max-width: 860px)').matches) { palco.style.height = ''; return; }
    let below = 0;
    for (let n = palco.nextElementSibling; n; n = n.nextElementSibling) if (n.offsetParent !== null) below += n.offsetHeight + 8;
    const top = palco.getBoundingClientRect().top - (el.closest('.stage') || document.body).getBoundingClientRect().top;
    palco.style.height = Math.max(260, Math.min(780, window.innerHeight - top - below - 84)) + 'px';   // 84: room for the navigation pill
  }

  function resize() {
    if (!canvas.parentElement || !current) return;
    width = canvas.clientWidth || 1; height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    current.shot = shotFor(current.moment);
  }
  const ro = new ResizeObserver(resize);

  function frame(time) {
    if (!current || !current.el.classList.contains('current')) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min((time - lastTime) / 1000 || 0.016, 0.12);   // a slow computer skips frames, it does not slow the story down
    lastTime = time;
    const t = time / 1000;
    const moment = momentOf(current.el);
    if (moment !== current.moment) {
      current.time = moment > current.moment ? 0 : 99;      // going back: no delays, things simply return
      current.moment = moment;
      setSpeeds(moment);
      fitHeight(current.el);
      resize();
    }
    current.time += dt;
    const ease = 1 - Math.exp(-dt * 3.2);

    for (const name in SCRIPT) {
      const piece = pieces[name], goal = placeAt(name, moment, current.time), pos = piece.position;
      const dx = goal.x - pos.x, dz = goal.z - pos.z, distance = Math.hypot(dx, dz);
      let lift = 0;
      if (piece.userData.walks) {
        const stride = Math.min(distance, (piece.userData.speed || 3.4) * dt);
        if (distance > 0.001) { pos.x += dx / distance * stride; pos.z += dz / distance * stride; }
        if (distance > 0.05) lift = Math.abs(Math.sin(t * 7.5 + pos.x)) * 0.34;                 // hop while walking
      } else { pos.x += dx * ease; pos.z += dz * ease; }
      piece.userData.ground += (goal.y - piece.userData.ground) * ease;
      pos.y = piece.userData.ground + lift;
      const size = piece.scale.x + (Math.max(goal.s, 0.001) - piece.scale.x) * Math.min(ease * 2, 1);
      piece.scale.setScalar(size);
      piece.visible = size > 0.02;
    }
    // small loops that keep the board alive: boxes on Ford's line, the laptop, the beads of the link
    lineBoxes.forEach((b, k) => { b.position.x = -1.45 + ((t * 0.55 + k) % 3) * 0.97; });
    const online = moment >= 3 && moment !== 8 ? 1 : 0;
    screenMat.emissiveIntensity += ((online ? 1.3 : 0.05) - screenMat.emissiveIntensity) * ease;
    beads.forEach((b, k) => {
      linkCurve.getPoint((t * 0.28 + k / beads.length) % 1, b.position);
      const s = b.scale.x + ((moment >= 3 && moment <= 5 ? 1 : 0.001) - b.scale.x) * ease;
      b.scale.setScalar(s); b.visible = s > 0.05;
    });

    // camera: glide to the shot for this moment, with a slow drift
    const shot = current.shot, k = 1 - Math.exp(-dt * 2.2);
    look.lerp(shot.at, k);
    tmpV.copy(shot.from);
    const dist = shot.from.distanceTo(shot.at);
    tmpV.x += Math.sin(t / 4.2) * dist * 0.012; tmpV.y += Math.cos(t / 5.3) * dist * 0.008;
    eye.lerp(tmpV, k);
    camera.position.copy(eye); camera.lookAt(look);
    renderer.render(scene, camera);

    // labels: project each one, then push apart any that would overlap (and keep them inside the picture)
    const placed = [];
    for (const item of labels) {
      const isPiece = !Array.isArray(item.target);
      let vis = item.show(moment) && (!isPiece || item.target.scale.x > 0.6);
      if (vis) {
        if (isPiece) { tmpV.copy(item.target.position); tmpV.y += item.dy * item.target.scale.x; } else tmpV.set(...item.target);
        tmpV.project(camera);
        vis = tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1;
      }
      item.el.classList.toggle('visivel', vis);
      if (!vis) { item.y = undefined; continue; }
      const w = item.el.offsetWidth || 80, h = item.el.offsetHeight || 22;
      let cx = (tmpV.x + 1) / 2 * width, bottom = (1 - tmpV.y) / 2 * height;
      cx = Math.max(w / 2 + 4, Math.min(width - w / 2 - 4, cx));
      bottom = Math.max(h + 4, Math.min(height - 4, bottom));
      const free = b => placed.every(o => b - h >= o.b + 3 || b <= o.b - o.h - 3 || cx + w / 2 <= o.x - o.w / 2 - 3 || cx - w / 2 >= o.x + o.w / 2 + 3);
      let best = bottom;
      if (!free(bottom)) {
        for (let n = 1; n < 40; n++) {
          const up = bottom - n * 6, down = bottom + n * 6;
          if (up - h >= 2 && free(up)) { best = up; break; }
          if (down <= height - 2 && free(down)) { best = down; break; }
        }
      }
      item.y = item.y === undefined ? best : item.y + (best - item.y) * 0.35;     // glide, do not jump
      placed.push({ x: cx, b: best, w, h });
      item.el.style.transform = `translate(-50%, -100%) translate(${cx.toFixed(1)}px, ${item.y.toFixed(1)}px)`;
    }
  }

  /** A slide of the story has just been shown: bring the picture into it, at that slide's moment. */
  function enter(el) {
    const palco = el.querySelector('.i3d-palco');
    current = { el, moment: momentOf(el), time: 99, shot: null };
    palco.prepend(canvas, layer);
    fitHeight(el);
    ro.disconnect(); ro.observe(palco);
    width = canvas.clientWidth || 1; height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    snap(current.moment);                                    // the story continues from where this slide begins
    current.shot = shotFor(current.moment);
    look.copy(current.shot.at); eye.copy(current.shot.from);
    if (!running) { running = true; lastTime = performance.now(); requestAnimationFrame(frame); }
  }

  slideEls.forEach(el => {
    new MutationObserver(() => {
      if (el.classList.contains('current') && (!current || current.el !== el || !running)) enter(el);
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
    if (el.classList.contains('current')) enter(el);
  });
  window.addEventListener('resize', () => { if (current) { fitHeight(current.el); resize(); } });
})();
