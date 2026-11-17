/* ==========================================================================
   bairro3d.js — Aula 3 · «O bairro da D. Rosa»: one 3D neighbourhood board
   that runs through the whole lesson.
   Needs assets/vendor/three.min.js (three.js release 160, 3D drawing).

   The same board appears on four slides (see SLIDES below):
     a3-escalas    the house, the street, the neighbourhood (no prices)
     a3-preco      what sets the price: the house, the place, the market
     a3-oferta     supply and demand with houses and buyers
     a3-contagio   one dear sale, a metro station, a supermarket, a viaduct
   There is ONE renderer: when one of these slides is shown, the canvas and
   its labels move into that slide's .b3d-palco. Each slide has a `layout`
   function that says, for the current build and the buttons pressed, where
   every piece stands, where the camera is and which price "shocks" apply.

   Prices: 32 houses with the same prices, colours and readout as the 2D
   widget «contagio» in widgets.js (cream when unchanged, then towards burnt
   orange as the price rises). A shock (a dear sale, a metro station, a
   change in demand or supply) changes a house's price by a percentage that
   fades with distance; the change travels outwards as a wave, so the class
   sees it spread from house to house. Going back a build removes the shock
   and the wave runs back.

   If WebGL is not available, the slides keep their original 2D drawing
   (the .b3d-fallback block), which is what shows by default.
   Code comments in English; every text students read in European Portuguese.
   ========================================================================== */
(function bairro3d() {
  'use strict';
  const T = window.THREE;
  if (!T) return;

  /* ---------- Grid and board geometry (board units) ---------- */
  const COLS = 8, ROWS = 4, N = COLS * ROWS;
  const DX = 1.75, DZ = 2.3;                            // distance between houses
  const HX = c => (c - 3.5) * DX, HZ = r => (r - 1.5) * DZ;
  const BASE = Array.from({ length: N }, (_, i) => 180 + ((i * 37) % 41));   // same prices as the 2D widget, mil €
  const BASE_MEAN = BASE.reduce((a, b) => a + b, 0) / N;
  const ROSA = 10;                                      // D. Rosa's house: row 1, column 2
  const at = i => ({ c: i % COLS, r: Math.floor(i / COLS), x: HX(i % COLS), z: HZ(Math.floor(i / COLS)) });
  const FRONT = 5.45, BACK = -5.3;                     // the strips in front of and behind the houses
  const PLACES = {                                      // where the amenities stand (x, z)
    jardim: [-6.1, FRONT], paragem: [-3.4, FRONT], escola: [-0.4, FRONT], super: [3.0, FRONT], saude: [6.0, FRONT],
    predio: [-5.6, BACK], metro: [0, HZ(2.5)], viaduto: [0, BACK],
  };
  const gridOf = ([x, z]) => ({ c: x / DX + 3.5, r: z / DZ + 1.5 });

  /* ---------- Colours: the deck's palette ---------- */
  const C = {
    navy: 0x1e2a33, orange: 0xa44a16, apricot: 0xf0a673, peach: 0xf1cdb0, ol: 0xfbe3d2, cream: 0xf6f3ec,
    blue: 0x2f6e9e, bl: 0xdce8f2, green: 0x556b3c, gl: 0xe9eee2, white: 0xffffff, gray: 0xb9c1c8,
    slab: 0xdce3d0, street: 0xf3efe6, lot: 0xcbd6bb, rim: 0x1e2a33, tree: 0x6e8550, trunk: 0x8a6a4a,
    buyer: [0x34495a, 0x56718a, 0x8197a8],
  };
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  function mixHex(a, b, t) {                            // same colour formula as widgets.js
    t = Math.max(0, Math.min(1, t));
    const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
    const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
    const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
    return (r << 16) | (g << 8) | bl;
  }
  const nf = (v, d) => Number(v).toLocaleString('pt-PT', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });

  /* ======================================================================
     THE STORY: one layout function per slide.
     layout(step, user) returns:
       cam      { from: [x, y, z], at: [x, y, z] }
       pieces   { name: { x, y, z, s } }   pieces not listed are put away (s = 0)
       shocks   [{ id, kind, E, ... }]     price changes in force (see priceGoal)
       prices   true to show the price of every house
       ring     true to mark D. Rosa's house
       speak    names of pawns that bounce gently ("speaking")
       forSale  house numbers with a «à venda» tag
     ====================================================================== */
  const WIDE = { from: [0, 13.2, 12.6], at: [0, 0, 0.3], fit: true };
  const rosaHouse = at(ROSA);
  const CLOSE_ROSA = { from: [rosaHouse.x - 2.6, 7.4, rosaHouse.z + 9.6], at: [rosaHouse.x, 0.4, rosaHouse.z + 0.4] };
  const rosaSpot = { x: rosaHouse.x + 0.95, y: 0, z: rosaHouse.z + 0.95, s: 1 };
  const tiagoSpot = { x: rosaHouse.x - DX - 0.2, y: 0, z: rosaHouse.z + 1.0, s: 1 };
  const AMENITIES = ['jardim', 'paragem', 'escola', 'saude'];
  const placeOf = name => ({ x: PLACES[name][0], y: 0, z: PLACES[name][1], s: 1 });

  /** Supply and demand on the board. Same straight lines as the graph on the
      slide «a3-curvas»: demand Qd = B − (P − 200)/12,5 and supply
      Qs = S + (P − 200)/12,5, so the price where they meet is
      P = 200 + 6,25 × (B − S) mil € (B buyers, S houses for sale). */
  const marketPrice = (B, S) => 200 + 6.25 * (B - S);
  const SALE_HOUSES = [9, 13, 18, 22];                  // the four houses for sale at the start

  /** Interest rates: each point above 3% makes about 4/3 of a buyer give up
      (credit gets dear); each point below brings buyers in. */
  const lostToRates = j => Math.round((j - 3) * 4 / 3);
  /** What each build of slide a3-oferta shows; the sliders start from it. */
  const ofertaSeed = step => ({ B: step >= 1 ? 12 : 4, S: step >= 2 ? 12 : 4, j: step >= 3 ? 6 : 3 });

  function oferta(step, user) {
    const st = user.state || ofertaSeed(step);
    const S = st.S;
    const B = Math.max(1, Math.min(20, st.B - lostToRates(st.j)));   // buyers who can still pay
    const P = marketPrice(B, S);
    const pieces = { tiago: null };
    const newFlats = S - 4;
    if (newFlats > 0) pieces.predio = placeOf('predio');
    // Buyers stand in front of the houses for sale; when there are more
    // buyers than houses they crowd round the same doors.
    const slots = SALE_HOUSES.map(i => ({ x: at(i).x, z: at(i).z + 0.95 }));
    for (let k = 0; k < newFlats; k++) slots.push({ x: PLACES.predio[0] + 1.3 + (k % 8) * 0.58, z: BACK + 0.1 + Math.floor(k / 8) * 0.55 });
    for (let k = 0; k < 20; k++) {
      const name = 'c' + k;
      if (k < B) {
        const slot = slots[k % slots.length], layer = Math.floor(k / slots.length);
        const angle = layer * 2.2, rad = layer ? 0.55 : 0;
        pieces[name] = { x: slot.x + Math.sin(angle) * rad, y: 0, z: slot.z + Math.cos(angle) * rad * 0.6, s: 1 };
      } else if (k < st.B) {
        pieces[name] = { x: (k % 2 ? 1 : -1) * 9.5, y: 0, z: HZ(3.5), s: 0 };      // gave up: credit got dear
      } else {
        pieces[name] = { x: -3 + (k % 6), y: 0, z: 8, s: 0 };               // not here yet
      }
    }
    pieces.tiago = { ...pieces.c0 };                    // Tiago is the first buyer
    pieces.c0 = { ...pieces.c0, s: 0 };
    return {
      cam: { from: [0, 13.2, 12.6], at: [0, 0, 0.1], fit: true },
      pieces, prices: true, forSale: SALE_HOUSES, market: { B, S, P, j: st.j },
      texts: { predio: 'Prédio novo: ' + newFlats + (newFlats === 1 ? ' casa' : ' casas') + ' à venda' },
      shocks: [{ id: 'mercado', kind: 'market', E: P / 200 - 1, src: SALE_HOUSES }],
      speak: [],
    };
  }

  /* The housing numbers (slide a3-numeros), as bar charts next to the board.
     INE: prices of homes actually sold (2nd quarter of 2026) and rents of
     new contracts (2nd quarter of 2026). idealista: prices asked in the
     adverts (Portugal, October 2026; Lisbon, September 2026). Net minimum
     wage: 920 € minus 11% social security = 818,80 €. */
  const NUM = {
    m2: { titulo: 'Preço por m² (euros)', max: 6600, linhas: [
      { rotulo: 'Portugal · casas vendidas', valor: 2445, cor: '#A44A16', nota: '+18,4% num ano' },
      { rotulo: 'Lisboa · casas vendidas', valor: 5299, cor: '#A44A16' } ] },
    m2b: { titulo: 'Preço por m² (euros)', max: 6600, linhas: [
      { rotulo: 'Portugal · casas vendidas', valor: 2445, cor: '#A44A16', nota: '+18,4% num ano' },
      { rotulo: 'Portugal · preço pedido nos anúncios', valor: 3249, cor: '#F0A673' },
      { rotulo: 'Lisboa · casas vendidas', valor: 5299, cor: '#A44A16' },
      { rotulo: 'Lisboa · preço pedido nos anúncios', valor: 6256, cor: '#F0A673' } ] },
    t2: { titulo: 'Comprar o T2 da D. Rosa (80 m²)', max: 200000, linhas: [
      { rotulo: 'Preço: 80 m² × 2 445 €', valor: 195600, cor: '#A44A16' },
      { rotulo: 'Um ano de salário mínimo, líquido', valor: 11463, cor: '#556B3C', nota: '14 × 818,80 €' } ] },
    renda: { titulo: 'Por mês (euros)', max: 1400, linhas: [
      { rotulo: 'Salário mínimo, líquido', valor: 819, cor: '#556B3C' },
      { rotulo: 'Renda de um T2 de 80 m² · Portugal', valor: 814, cor: '#A44A16', nota: '80 × 10,17 €' },
      { rotulo: 'Renda de um T2 de 80 m² · Lisboa', valor: 1375, cor: '#A44A16', nota: '80 × 17,19 €' } ] },
  };

  const SLIDES = {
    'a3-escalas': {
      layout(step) {
        const p = { rosa: rosaSpot };
        let cam = WIDE;
        if (step === 1) cam = CLOSE_ROSA;
        if (step === 2) {
          cam = { from: [rosaHouse.x - 1, 8, rosaHouse.z + 11], at: [rosaHouse.x, 0.3, rosaHouse.z + 0.5] };
          p.viz1 = { x: at(ROSA - 1).x + 0.6, y: 0, z: rosaHouse.z + 0.95, s: 1 };
          p.viz2 = { x: at(ROSA + 1).x - 0.6, y: 0, z: rosaHouse.z + 0.95, s: 1 };
        }
        if (step === 3) cam = { from: [rosaHouse.x - 8.5, 7.2, rosaHouse.z + 8.8], at: [rosaHouse.x + 2.5, 0, rosaHouse.z + 1.15] };
        if (step >= 3) { p.carro1 = { x: 0, y: 0, z: 0, s: 1 }; p.carro2 = { x: 0, y: 0, z: 0, s: 1 }; p.candeeiros = { x: 0, y: 0, z: 0, s: 1 }; }
        if (step >= 4) AMENITIES.forEach(n => { p[n] = placeOf(n); });
        return { cam, pieces: p, ring: step >= 1 && step <= 2, prices: false, speak: step === 0 ? ['rosa'] : step === 2 ? ['viz1', 'viz2'] : [] };
      },
    },

    'a3-numeros': {
      layout(step) {
        const p = { rosa: rosaSpot };
        const cam = step >= 3 ? CLOSE_ROSA : WIDE;
        const chart = step >= 4 ? NUM.renda : step === 3 ? NUM.t2 : step === 2 ? NUM.m2b : step === 1 ? NUM.m2 : null;
        return { cam, pieces: p, ring: step >= 3, prices: true, chart, speak: step === 0 ? ['rosa'] : [], tag: step >= 3 ? 'T2 · 80 m²' : null };
      },
    },

    'a3-preco': {
      layout(step) {
        const p = { rosa: rosaSpot };
        let cam = WIDE;
        if (step === 1) cam = CLOSE_ROSA;
        if (step >= 2) AMENITIES.forEach(n => { p[n] = placeOf(n); });
        if (step >= 3) for (let k = 0; k < 6; k++) p['c' + k] = { x: -4.4 + k * 1.75, y: 0, z: HZ(3.5) - 0.05, s: 1 };
        else for (let k = 0; k < 6; k++) p['c' + k] = { x: -4.4 + k * 1.75, y: 0, z: 8.5, s: 0 };
        return { cam, pieces: p, ring: step === 1, prices: true, speak: step === 0 ? ['rosa'] : [] };
      },
    },

    'a3-oferta': {
      layout: oferta,
      /** Sliders: they start from what the current build shows; moving one changes the board. */
      sliders: [
        { key: 'B', label: 'Querem comprar (procura)', min: 1, max: 20, fmt: v => v + ' pessoas' },
        { key: 'S', label: 'Casas à venda (oferta)', min: 4, max: 20, fmt: v => v + ' casas' },
        { key: 'j', label: 'Juros do crédito', min: 1, max: 7, fmt: v => v + '%' },
      ],
      seed: ofertaSeed,
    },

    'a3-contagio': {
      layout(step, user) {
        const p = { rosa: rosaSpot, tiago: tiagoSpot };
        const shocks = [];
        (user.sales || []).forEach((i, n) => shocks.push({ id: 'venda' + n, kind: 'sale', house: i, E: 0.4 }));
        if (user.metro) { p.metro = placeOf('metro'); shocks.push({ id: 'metro', kind: 'point', at: gridOf(PLACES.metro), E: 0.22, lam: 2, delay: 2200 }); }
        if (user.super) { p.super = placeOf('super'); shocks.push({ id: 'super', kind: 'point', at: gridOf(PLACES.super), E: 0.08, lam: 1.6, delay: 2200 }); }
        if (user.viaduto) { p.viaduto = placeOf('viaduto'); shocks.push({ id: 'viaduto', kind: 'rows', table: [-0.15, -0.06, -0.02, 0], E: 1, delay: 2200 }); }
        const cam = step >= 3 ? { from: [rosaHouse.x + 1, 6.5, rosaHouse.z + 9.5], at: [rosaHouse.x + 1, 0.8, rosaHouse.z + 0.3] } : WIDE;
        return { cam, pieces: p, shocks, prices: true, ring: step >= 3, speak: step >= 3 ? ['rosa', 'tiago'] : [] };
      },
      click(i, user) { (user.sales = user.sales || []).push(i); },
      hint: 'Clica numa casa: vende-se por mais 40% do que valia.',
      buttons: [
        { t: 'Abre uma estação de metro', f: u => { u.metro = true; }, sel: u => u.metro },
        { t: 'Abre um supermercado', f: u => { u.super = true; }, sel: u => u.super },
        { t: 'Constrói-se um viaduto', f: u => { u.viaduto = true; }, sel: u => u.viaduto },
        { t: 'Repor o bairro', reset: true },
      ],
    },
  };

  const slideEls = Object.keys(SLIDES).map(id => document.getElementById(id)).filter(Boolean);
  if (!slideEls.length) return;

  /* ---------- Renderer (one for the whole lesson) ---------- */
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (error) { return; }                            // the 2D fallback stays visible
  document.documentElement.classList.add('b3d-ok');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  const layer = document.createElement('div');          // HTML labels over the picture
  layer.className = 'b3d-camada';
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(24, 1.6, 0.1, 200);   // a long lens: less distortion, the board reads like a plan
  scene.add(new T.HemisphereLight(0xffffff, 0xb8b0a0, 2.0));
  const sun = new T.DirectionalLight(0xfff0dc, 2.3);    // warm key light from the front left
  sun.position.set(-8, 16, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 45 });
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 4;
  scene.add(sun);

  /* ---------- Building blocks ---------- */
  const clay = (color, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0 }, extra));
  function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
  const box = (w, h, d, color, x, y, z) => mesh(new T.BoxGeometry(w, h, d), clay(color), x, y, z);
  const group = (...kids) => { const g = new T.Group(); kids.forEach(k => g.add(k)); return g; };
  /** A game pawn, about 0.8 units tall (smaller than in the history board: here houses matter). */
  function pawn(color) {
    const outline = [[0, 0], [0.44, 0], [0.46, 0.09], [0.31, 0.18], [0.2, 0.52], [0.16, 0.8], [0.28, 0.86], [0.28, 0.93], [0.14, 0.97]];
    const m = clay(color, { roughness: 0.55 });
    const g = group(mesh(new T.LatheGeometry(outline.map(([x, y]) => new T.Vector2(x, y)), 32), m), mesh(new T.SphereGeometry(0.27, 24, 18), m, 0, 1.16, 0));
    g.children.forEach(k => k.scale.setScalar(0.58));
    g.children[1].position.y = 1.16 * 0.58;
    return g;
  }
  /** A gable roof seen from the front, like the houses of the 2D drawing. */
  function roofGeometry(w, h, d) {
    const s = new T.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
    const g = new T.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
    g.translate(0, 0, -d / 2);
    return g;
  }
  const HOUSE = { w: 1.3, h: 0.8, d: 0.95 };
  const roofGeo = roofGeometry(HOUSE.w + 0.16, 0.55, HOUSE.d + 0.08);
  const bodyGeo = new T.BoxGeometry(HOUSE.w, HOUSE.h, HOUSE.d);
  const roofMat = clay(C.orange, { roughness: 0.7 });
  /** A tiny label texture (for the metro sign and the shop sign). */
  function textTexture(text, bg, fg, w = 128, h = 128, font = 'bold 92px Calibri, Carlito, sans-serif') {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }

  /* ---------- The fixed board ---------- */
  scene.add(box(16, 0.5, 13.6, C.slab, 0, -0.25, 0.1), box(16.5, 0.3, 14.1, C.rim, 0, -0.52, 0.1));
  for (let r = 0; r <= ROWS; r++) {                     // streets between the rows of houses
    const z = HZ(r - 0.5);
    scene.add(box(15.4, 0.04, DZ - HOUSE.d - 0.35, C.street, 0, 0.02, z));
  }
  scene.add(box(15.2, 0.03, 1.9, C.lot, 0, 0.015, FRONT), box(15.2, 0.03, 1.5, C.lot, 0, 0.015, BACK));   // lots in front and behind (green)

  /* ---------- The 32 houses (fixed; only their colour and price change) ---------- */
  const houses = [];
  for (let i = 0; i < N; i++) {
    const { x, z } = at(i);
    const mat = clay(C.cream, { roughness: 0.75 });
    const body = mesh(bodyGeo, mat, x, HOUSE.h / 2, z);
    const roof = mesh(roofGeo, roofMat, x, HOUSE.h, z);
    body.userData.house = roof.userData.house = i;
    scene.add(body, roof);
    houses.push({ mat, meshes: [body, roof], shown: C.cream });
  }

  /* ---------- Pieces that move or appear ---------- */
  const pieces = {};
  const add = (name, object, opts = {}) => { Object.assign(object.userData, opts); object.scale.setScalar(0.001); object.visible = false; scene.add(object); pieces[name] = object; return object; };
  add('rosa', pawn(C.apricot), { walks: true });
  add('tiago', pawn(C.blue), { walks: true });
  add('viz1', pawn(C.buyer[2]), { walks: true });
  add('viz2', pawn(C.buyer[2]), { walks: true });
  for (let k = 0; k < 20; k++) add('c' + k, pawn(C.buyer[k % 3]), { walks: true });

  // A ring that marks D. Rosa's house.
  const ring = mesh(new T.TorusGeometry(1.0, 0.06, 10, 48), clay(C.apricot, { emissive: C.apricot, emissiveIntensity: 0.6 }), rosaHouse.x, 0.05, rosaHouse.z);
  ring.rotation.x = Math.PI / 2; ring.scale.set(1, 0.8, 1); ring.visible = false; scene.add(ring);

  // Amenities. Buildings that appear during the story are "built" (they grow from the ground with a crane beside them).
  function tree(x, z, s = 1) {
    return group(mesh(new T.CylinderGeometry(0.07, 0.09, 0.4 * s, 8), clay(C.trunk), x, 0.2 * s, z),
      mesh(new T.SphereGeometry(0.38 * s, 16, 12), clay(C.tree, { roughness: 0.9 }), x, 0.6 * s, z));
  }
  add('jardim', group(mesh(new T.CylinderGeometry(1.15, 1.15, 0.06, 32), clay(0xb4c49b), 0, 0.03, 0), tree(-0.6, -0.3), tree(0.55, -0.45, 1.2), tree(0.1, 0.6, 0.9), box(0.6, 0.12, 0.18, C.trunk, -0.5, 0.2, 0.6)), { build: false });
  add('escola', group(box(2.1, 0.9, 1.3, C.cream, 0, 0.45, 0), box(2.2, 0.12, 1.4, C.blue, 0, 0.96, 0), box(0.04, 0.9, 0.04, C.navy, 0.9, 1.4, 0.5), box(0.36, 0.22, 0.02, C.orange, 1.08, 1.74, 0.5),
    box(0.4, 0.45, 0.04, C.navy, 0, 0.23, 0.66)));
  add('saude', group(box(1.7, 0.8, 1.2, C.white, 0, 0.4, 0), box(0.5, 0.13, 0.04, C.orange, 0, 0.55, 0.62), box(0.13, 0.5, 0.04, C.orange, 0, 0.55, 0.62), box(1.8, 0.1, 1.3, C.bl, 0, 0.85, 0)));
  add('paragem', group(box(1.1, 0.05, 0.45, C.navy, 0, 0.75, 0), box(0.05, 0.75, 0.05, C.navy, -0.5, 0.375, -0.15), box(0.05, 0.75, 0.05, C.navy, 0.5, 0.375, -0.15),
    box(1.0, 0.5, 0.03, C.bl, 0, 0.45, -0.2), box(0.8, 0.08, 0.2, C.trunk, 0, 0.25, -0.05)));
  // Metro station: a stair entrance in the street and a sign with an M.
  const mSign = new T.Mesh(new T.CircleGeometry(0.26, 32), new T.MeshBasicMaterial({ map: textTexture('M', '#A44A16', '#FFFFFF') }));
  mSign.position.set(0.75, 1.3, 0.03);
  add('metro', group(box(1.3, 0.1, 0.8, C.navy, 0, 0.05, 0), box(1.0, 0.3, 0.05, C.gray, 0, 0.2, -0.38), box(0.05, 0.3, 0.75, C.gray, -0.5, 0.2, 0), box(0.05, 0.3, 0.75, C.gray, 0.5, 0.2, 0),
    box(0.06, 1.1, 0.06, C.navy, 0.75, 0.55, 0), mSign), { build: true });
  const shopSign = new T.Mesh(new T.PlaneGeometry(1.5, 0.3), new T.MeshBasicMaterial({ map: textTexture('SUPERMERCADO', '#2F6E9E', '#FFFFFF', 512, 100, 'bold 62px Calibri, Carlito, sans-serif') }));
  shopSign.position.set(0, 0.95, 0.76);
  add('super', group(box(2.3, 0.85, 1.4, C.cream, 0, 0.43, 0), box(2.4, 0.12, 1.5, C.navy, 0, 0.9, 0), box(1.4, 0.45, 0.03, C.bl, 0, 0.35, 0.71), shopSign), { build: true });
  // New block of flats: eight homes for sale.
  const predio = group(box(1.6, 2.6, 1.2, C.peach, 0, 1.3, 0), box(1.7, 0.12, 1.3, C.navy, 0, 2.66, 0));
  for (let f = 0; f < 4; f++) for (let w = 0; w < 2; w++) predio.add(box(0.42, 0.34, 0.03, C.bl, -0.38 + w * 0.76, 0.5 + f * 0.58, 0.61));
  add('predio', predio, { build: true });
  // Viaduct (the access road to a new bridge) along the back of the board.
  const viaduto = group(box(16, 0.22, 1.1, 0xcfc8ba, 0, 1.55, 0), box(16, 0.12, 0.08, C.navy, 0, 1.72, 0.5), box(16, 0.12, 0.08, C.navy, 0, 1.72, -0.5));
  for (let k = -2; k <= 2; k++) viaduto.add(box(0.35, 1.45, 0.5, 0xbdb5a6, k * 3.2, 0.72, 0));
  const vCars = [box(0.6, 0.28, 0.36, C.orange, -6, 1.8, 0.22), box(0.6, 0.28, 0.36, C.blue, 3, 1.8, -0.22), box(0.6, 0.28, 0.36, C.cream, 8, 1.8, 0.22)];
  vCars.forEach(c => viaduto.add(c));
  add('viaduto', viaduto, { build: true });
  // Street details for «a rua»: two cars driving and street lamps.
  const car = color => group(box(0.7, 0.28, 0.4, color, 0, 0.22, 0), box(0.4, 0.2, 0.36, 0xdce8f2, -0.05, 0.45, 0));
  add('carro1', car(C.orange)); add('carro2', car(C.blue));
  const lamps = new T.Group();
  for (let k = 0; k < 5; k++) lamps.add(group(box(0.05, 0.9, 0.05, C.navy, -6 + k * 3, 0.45, 0.62), mesh(new T.SphereGeometry(0.1, 12, 8), clay(0xfff1c9, { emissive: 0xffe7a8, emissiveIntensity: 0.8 }), -6 + k * 3, 0.95, 0.62)));
  add('candeeiros', lamps);
  // The crane that builds the metro, the shop, the flats and the viaduct.
  const grua = group(box(0.14, 3.2, 0.14, C.apricot, 0, 1.6, 0), box(2.6, 0.12, 0.12, C.apricot, 0.7, 3.2, 0), box(0.5, 0.25, 0.25, C.navy, -0.45, 3.0, 0), box(0.02, 1.0, 0.02, C.navy, 1.6, 2.7, 0));
  grua.visible = false; scene.add(grua);

  /* ---------- Labels (HTML over the picture) ---------- */
  const labels = [];
  function label(html, cls, target, height) {
    const el = document.createElement('div');
    el.className = 'b3d-et ' + cls;
    el.innerHTML = html;
    layer.append(el);
    const item = { el, target, height, shown: false };
    labels.push(item);
    return item;
  }
  const priceLabels = [], tagLabels = [];
  for (let i = 0; i < N; i++) {
    const h = at(i);
    priceLabels.push(label('', 'b3d-preco', [h.x, HOUSE.h * 0.5, h.z + HOUSE.d / 2], 0));
    priceLabels[i].center = true;
    tagLabels.push(label('', 'b3d-tag', [h.x, HOUSE.h + 0.24, h.z + 0.22], 0));
    tagLabels[i].center = true;
  }
  const person = (name, color) => `<b><i style="background:${hex(color)}"></i>${name}</b>`;
  label(person('D. Rosa', C.apricot), 'b3d-pessoa', pieces.rosa, 0.9);
  label(person('Tiago', C.blue), 'b3d-pessoa', pieces.tiago, 0.9);
  label(person('vizinhos', C.buyer[2]), 'b3d-pessoa', pieces.viz1, 0.9);
  label('Jardim', 'b3d-nota', pieces.jardim, 1.4);
  label('Escola', 'b3d-nota', pieces.escola, 1.95);
  label('Centro de saúde', 'b3d-nota', pieces.saude, 1.2);
  label('Paragem de autocarro', 'b3d-nota', pieces.paragem, 1.05);
  label('Estação de metro', 'b3d-nota b3d-forte', pieces.metro, 1.65);
  label('Supermercado', 'b3d-nota b3d-forte', pieces.super, 1.25);
  label('Prédio novo', 'b3d-nota b3d-forte', pieces.predio, 3.05).key = 'predio';
  const tagRosa = label('', 'b3d-nota b3d-forte', [rosaHouse.x, HOUSE.h + 1.0, rosaHouse.z], 0);
  label('Viaduto: acesso a uma ponte nova', 'b3d-nota b3d-forte', [3.5, 2.3, BACK], 0).piece = pieces.viaduto;
  label('ruído', 'b3d-nota', pieces.carro1, 0.9);


  /* ---------- Sounds (synthesised with the Web Audio API; no files) ----------
     Share the on/off choice with the lesson's games (localStorage «jogo-som»). */
  const SOM = (() => {
    let ctx = null, muted = false;
    try { muted = localStorage.getItem('jogo-som') === 'off'; } catch (e) { /* storage unavailable */ }
    const last = {};
    function ac() { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    function tone(f, start, dur, type = 'sine', vol = 0.12, f2) {
      const a = ac(), t = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(start, dur, freq = 800, vol = 0.15, q = 1) {
      const a = ac(), t = a.currentTime + start, len = Math.ceil(a.sampleRate * dur);
      const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(a.destination); src.start(t); src.stop(t + dur + 0.02);
    }
    const SOUNDS = {
      pop: () => { tone(520, 0, 0.12, 'sine', 0.1, 900); },
      passos: () => { for (let k = 0; k < 5; k++) noise(k * 0.13, 0.05, 1600, 0.06, 2); },
      obras: () => { for (let k = 0; k < 3; k++) { noise(0.15 + k * 0.32, 0.07, 2400, 0.16, 3); tone(110, 0.15 + k * 0.32, 0.1, 'triangle', 0.12); } tone(1046, 1.3, 0.5, 'sine', 0.07); },
      venda: () => { noise(0, 0.05, 3000, 0.1, 2); tone(1318, 0.05, 0.6, 'sine', 0.1); tone(1760, 0.14, 0.8, 'sine', 0.09); },
      sobe: () => { [523, 659, 784, 1046].forEach((f, k) => tone(f, k * 0.11, 0.22, 'triangle', 0.07)); },
      desce: () => { [784, 659, 523, 392].forEach((f, k) => tone(f, k * 0.12, 0.24, 'triangle', 0.07)); },
      transito: () => { noise(0, 1.8, 220, 0.12, 0.7); noise(0.3, 1.2, 500, 0.05, 1); },
    };
    return {
      play(name, delay = 0) {
        if (muted || !SOUNDS[name]) return;
        const now = performance.now();
        if (last[name] && now - last[name] < 250 && !delay) return;   // no pile-ups
        last[name] = now;
        const go = () => { try { SOUNDS[name](); } catch (e) { /* no audio: the board still works */ } };
        delay ? setTimeout(go, delay) : go();
      },
      get muted() { return muted; },
      toggle() { muted = !muted; try { localStorage.setItem('jogo-som', muted ? 'off' : 'on'); } catch (e) { /* ignore */ } return muted; },
    };
  })();

  /* ======================================================================
     Engine
     ====================================================================== */
  let current = null;            // { el, cfg, user, step, L }
  const shockState = new Map();  // id -> { s (latest shock), Eprev, t0 }
  const shown = new Float64Array(N).fill(1);   // price ratio on screen, per house
  const look = new T.Vector3(), eye = new T.Vector3(), point = new T.Vector3();
  let width = 1, height = 1, running = false, lastTime = 0, lastRead = 0;
  const state = new Map();       // per slide: its user state (kept while the lesson is open)

  function stepOf(el) { let k = 0; while (el.classList.contains('ge' + (k + 1))) k++; return k; }

  /** Distance (in houses) from house i to where a shock starts. */
  function distance(s, i) {
    const h = at(i);
    if (s.kind === 'sale') { const o = at(s.house); return Math.hypot(h.c - o.c, h.r - o.r); }
    if (s.kind === 'point') return Math.hypot(h.c - s.at.c, h.r - s.at.r);
    if (s.kind === 'rows') return h.r + 0.5;
    if (s.kind === 'market') return Math.min(...s.src.map(j => { const o = at(j); return Math.hypot(h.c - o.c, h.r - o.r); }));
    return 0;
  }
  /** How strongly a shock reaches house i (1 where it starts). */
  function reach(s, i) {
    const d = distance(s, i);
    if (s.kind === 'sale') return d < 0.01 ? 1 : Math.exp(-d / 1.2);
    if (s.kind === 'point') return Math.exp(-d / s.lam);
    if (s.kind === 'rows') return s.table[at(i).r];
    return 1;                                            // market: the whole neighbourhood
  }

  /** Recompute the layout after a new build, a button or a click. */
  function refresh(snap) {
    if (!current) return;
    const { cfg, user } = current;
    const L = cfg.layout(current.step, user);
    current.L = L;
    current.shot = solveShot(L.cam);
    const now = performance.now();
    const seen = new Set();
    for (const s of L.shocks || []) {
      seen.add(s.id);
      const old = shockState.get(s.id);
      if (!old) {
        shockState.set(s.id, { s, Eprev: snap ? s.E : 0, t0: snap ? -1e9 : now });
        if (!snap && s.E) {
          if (s.kind === 'sale') SOM.play('venda');
          if (s.kind === 'rows') SOM.play('transito', 1500);
          SOM.play(s.E > 0 ? 'sobe' : 'desce', (s.delay || 0) + (s.kind === 'sale' ? 500 : 300));
        }
      } else if (old.s.E !== s.E || snap) {
        if (!snap) SOM.play(s.E > old.s.E ? 'sobe' : 'desce', 400);
        const p = snap ? 1 : progressMax(old, now);
        shockState.set(s.id, { s, Eprev: snap ? s.E : old.Eprev + (old.s.E - old.Eprev) * p, t0: snap ? -1e9 : now });
      } else old.s = s;
    }
    for (const [id, old] of shockState) {               // shocks that ended run back to zero
      if (seen.has(id)) continue;
      if (snap || old.s.E === 0) { if (snap || progressMax(old, now) >= 1) shockState.delete(id); continue; }
      const p = progressMax(old, now);
      shockState.set(id, { s: { ...old.s, E: 0, delay: 0 }, Eprev: old.Eprev + (old.s.E - old.Eprev) * p, t0: now });
    }
    // Buttons that stay pressed.
    current.el.querySelectorAll('.b3d-btns button').forEach((b, k) => {
      const def = (cfg.buttons || [])[k];
      b.classList.toggle('sel', !!(def && def.sel && def.sel(user, L)));
    });
    // Sliders show the state in force (the build's, or what was moved).
    if (cfg.sliders) {
      const st = user.state || cfg.seed(current.step);
      current.el.querySelectorAll('.b3d-rng').forEach((row, k) => {
        const def = cfg.sliders[k], v = st[def.key], inp = row.querySelector('input');
        if (Number(inp.value) !== v) inp.value = v;
        row.querySelector('output').textContent = def.fmt ? def.fmt(v) : v;
      });
    }
    if (snap) snapPieces(L);
  }
  const ease3 = t => t * t * (3 - 2 * t);
  function progress(rec, i, now) {
    const s = rec.s;
    const delay = (s.delay || 0) + distance(s, i) * 340;   // the wave: farther houses change later
    return ease3(Math.max(0, Math.min(1, (now - rec.t0 - delay) / 650)));
  }
  function progressMax(rec, now) {                       // has the wave finished everywhere?
    let p = 1;
    for (let i = 0; i < N; i++) p = Math.min(p, progress(rec, i, now));
    return p;
  }
  /** Price ratio each house is heading for (1 = unchanged). */
  function goalRatio(i, now) {
    let r = 1;
    for (const rec of shockState.values()) {
      const E = rec.Eprev + (rec.s.E - rec.Eprev) * progress(rec, i, now);
      r *= 1 + E * reach(rec.s, i);
    }
    return r;
  }
  const soldHouses = now => {
    const set = new Set();
    for (const rec of shockState.values()) if (rec.s.kind === 'sale' && rec.s.E > 0 && progress(rec, rec.s.house, now) > 0) set.add(rec.s.house);
    return set;
  };

  function targetOf(name, L) { return (L.pieces && L.pieces[name]) || null; }
  function snapPieces(L) {
    for (const name in pieces) {
      const p = pieces[name], g = targetOf(name, L);
      if (g) { p.position.set(g.x, g.y, g.z); p.scale.setScalar(Math.max(g.s, 0.001)); p.userData.builtAt = -1e9; }
      else p.scale.setScalar(0.001);
      p.userData.ground = g ? g.y : 0;
      p.visible = p.scale.x > 0.02;
      p.userData.wasOn = !!(g && g.s > 0.5);
    }
    look.set(...current.shot.at);
    eye.set(...current.shot.from);
    for (let i = 0; i < N; i++) shown[i] = goalRatio(i, performance.now());
  }

  /** Make the board as tall as the window allows, leaving room for the bar and the navigation pill. */
  function fitHeight(el) {
    const palco = el.querySelector('.b3d-palco');
    if (!palco || matchMedia('(max-width: 900px)').matches) { if (palco) palco.style.height = ''; return; }
    const top = palco.getBoundingClientRect().top;
    const bar = el.querySelector('.b3d-barra');
    const stage = el.closest('.stage');
    const pad = stage ? parseFloat(getComputedStyle(stage).paddingBottom) || 0 : 0;
    const foot = el.querySelector('.b3d-fonte');
    const below = (bar ? bar.offsetHeight + 10 : 0) + (foot ? foot.offsetHeight + 6 : 0) + Math.max(pad, 70) + 6;
    palco.style.height = Math.max(320, Math.min(820, window.innerHeight - top - below)) + 'px';
  }
  window.addEventListener('resize', () => { if (current) fitHeight(current.el); });

  function resize() {
    if (!canvas.parentElement) return;
    width = canvas.clientWidth || 1;                     // the picture's own size (on phones the cards sit under it)
    height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Wide screens: the cards sit on the left, so move the picture right.
    // Narrow screens: the cards sit at the bottom, so move the picture up.
    camera.updateProjectionMatrix();
    if (current && current.L) current.shot = solveShot(current.L.cam);
  }

  /* ---------- Framing: keep the board clear of the cards ----------
     The picture area free of cards (in screen units, −1 to 1): on wide
     screens the cards are a column on the left; on narrow screens they sit
     at the bottom. A shot with `fit` is moved closer or farther until the
     whole board fills that area; every shot is then slid sideways so that
     what it looks at sits in the middle of the area. */
  const CORNERS = [];
  for (const x of [-8, 8]) for (const z of [-6.6, 6.8]) for (const y of [0, 1.4]) CORNERS.push(new T.Vector3(x, z < 0 && y ? 2.4 : y, z));   // back corners higher: the viaduct and the new flats
  function freeArea() {
    if (!current) return { x0: -1, x1: 1, y0: -1, y1: 1 };
    const lado = current.el.querySelector('.b3d-lado');
    const busy = lado && lado.offsetHeight > 0 && [...lado.children].some(c => c.offsetHeight > 0 && getComputedStyle(c).opacity !== '0' && getComputedStyle(c).display !== 'none');
    const full = { x0: -0.94, x1: 0.94, y0: -0.94, y1: 0.92 };
    if (!busy) return full;
    // Where is the caption box? A column on the left (projector) or a strip at the bottom (phone).
    const top = lado.offsetTop + [...lado.children].reduce((m, c) => (c.offsetHeight > 0 && getComputedStyle(c).opacity !== '0' && getComputedStyle(c).display !== 'none') ? Math.min(m, c.offsetTop) : m, 1e9);
    if (top >= height - 10) return full;                 // cards under the picture (phones)
    if (lado.offsetWidth < 0.6 * width) return { ...full, x0: -1 + 2 * (lado.offsetLeft + lado.offsetWidth + 10) / width };
    return { ...full, y0: Math.min(0.5, 1 - 2 * (top - 8) / height) };
  }
  const probe = new T.PerspectiveCamera();
  function bounds(points, from, at) {
    probe.copy(camera); probe.position.copy(from); probe.lookAt(at); probe.updateMatrixWorld(); probe.updateProjectionMatrix();
    const b = { x0: 9, x1: -9, y0: 9, y1: -9 };
    for (const p of points) { point.copy(p).project(probe); b.x0 = Math.min(b.x0, point.x); b.x1 = Math.max(b.x1, point.x); b.y0 = Math.min(b.y0, point.y); b.y1 = Math.max(b.y1, point.y); }
    return b;
  }
  function solveShot(shot) {
    if (!shot.fit && width / height <= 1.25) shot = { ...shot, fit: true };   // narrow screens: always show the whole board
    const A = freeArea();
    const at = new T.Vector3(...shot.at), from = new T.Vector3(...shot.from);
    const dir = from.clone().sub(at).normalize();
    let dist = from.distanceTo(at) * (shot.fit ? 1 : 1.26);   // 1.26: the close shots were set for a 30° lens
    const pts = shot.fit ? CORNERS : [at.clone()];   // a copy: `at` itself moves below
    for (let pass = 0; pass < 3; pass++) {
      if (shot.fit) {                                    // closest distance at which the board fits the area
        let lo = 4, hi = 90;
        for (let k = 0; k < 26; k++) {
          const mid = (lo + hi) / 2, b = bounds(pts, at.clone().addScaledVector(dir, mid), at);
          if (b.x1 - b.x0 <= A.x1 - A.x0 && b.y1 - b.y0 <= A.y1 - A.y0) hi = mid; else lo = mid;
        }
        dist = hi;
      }
      const eyeAt = at.clone().addScaledVector(dir, dist);
      const b = bounds(pts, eyeAt, at);
      const bx = (b.x0 + b.x1) / 2, by = (b.y0 + b.y1) / 2, cx = (A.x0 + A.x1) / 2, cy = (A.y0 + A.y1) / 2;
      const h = dist * Math.tan(T.MathUtils.degToRad(camera.fov / 2)), w = h * camera.aspect;
      const right = new T.Vector3().setFromMatrixColumn(probe.matrixWorld, 0), up = new T.Vector3().setFromMatrixColumn(probe.matrixWorld, 1);
      at.addScaledVector(right, (bx - cx) * w).addScaledVector(up, (by - cy) * h);
    }
    return { at: [at.x, at.y, at.z], from: [at.x + dir.x * dist, at.y + dir.y * dist, at.z + dir.z * dist] };
  }
  const ro = new ResizeObserver(resize);

  function frame(time) {
    if (!current || !current.el.classList.contains('current')) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min((time - lastTime) / 1000 || 0.016, 0.05);
    lastTime = time;
    const step = stepOf(current.el);
    if (step !== current.step) {                         // a new build: start from what the build shows
      current.step = step;
      if (current.cfg.seed) current.user.state = null;
      refresh(false);
    }
    const L = current.L, now = performance.now();
    const ease = 1 - Math.exp(-dt * 3.2);

    /* Pieces: pawns walk and hop; props glide; new buildings grow with the crane. */
    let building = null;
    for (const name in pieces) {
      const piece = pieces[name], goal = targetOf(name, L), pos = piece.position, u = piece.userData;
      const g = goal || { x: pos.x, y: pos.y, z: pos.z, s: 0 };
      const on = g.s > 0.5;
      if (on && !u.wasOn) {
        u.builtAt = now;
        SOM.play(u.walks ? 'passos' : u.build ? 'obras' : 'pop');
      }
      u.wasOn = on;
      const dx = g.x - pos.x, dz = g.z - pos.z, dist = Math.hypot(dx, dz);
      let lift = 0;
      if (u.walks) {
        const stride = Math.min(dist, 3.6 * dt);
        if (dist > 0.001) { pos.x += (dx / dist) * stride; pos.z += (dz / dist) * stride; }
        if (dist > 0.05) lift = Math.abs(Math.sin(time / 120)) * 0.25;
        else if ((L.speak || []).includes(name)) lift = Math.abs(Math.sin(time / 260)) * 0.1;
      } else { pos.x += dx * ease; pos.z += dz * ease; }
      u.ground = (u.ground ?? g.y) + (g.y - (u.ground ?? g.y)) * ease;
      pos.y = u.ground + lift;
      if (u.build && on && now - u.builtAt < 2400) {     // grows from the ground, crane beside it
        const t = Math.max(0, Math.min(1, (now - u.builtAt - 500) / 1500));
        piece.scale.set(1, Math.max(0.001, ease3(t)), 1);
        building = piece;
      } else {
        const size = piece.scale.x + (Math.max(g.s, 0.001) - piece.scale.x) * Math.min(ease * 2.2, 1);
        piece.scale.setScalar(size);
      }
      piece.visible = piece.scale.x > 0.02 && piece.scale.y > 0.002;
    }
    if (building) { grua.visible = true; grua.position.set(building.position.x - 1.6, 0, building.position.z - 0.4); }
    else grua.visible = false;
    // Cars drive along the street; on the viaduct too.
    const tt = time / 1000;
    pieces.carro1.position.set(-7.5 + ((tt * 2.2) % 15), 0.02, HZ(1.5) - 0.3);
    pieces.carro2.position.set(7.5 - ((tt * 1.7 + 6) % 15), 0.02, HZ(1.5) + 0.3);
    pieces.carro2.rotation.y = Math.PI;
    vCars.forEach((c, k) => { c.position.x = ((tt * (2.4 + k * 0.4) + k * 5) % 15.6) - 7.8; });
    ring.visible = !!L.ring;
    ring.scale.setScalar(1 + Math.sin(time / 300) * 0.04); ring.scale.y = 0.8;

    /* Prices and colours. */
    for (let i = 0; i < N; i++) {
      const goal = goalRatio(i, now);
      shown[i] += (goal - shown[i]) * Math.min(1, dt * 7);
      const r = shown[i];
      const col = r < 1.005 ? (r > 0.995 ? C.cream : mixHex(C.cream, C.bl, (1 - r) / 0.2)) : mixHex(C.ol, C.orange, (r - 1) / 0.45);
      if (col !== houses[i].shown) { houses[i].mat.color.setHex(col); houses[i].shown = col; }
    }

    /* Camera: glide to the build's shot; step back on tall screens; drift a little, always. */
    const shot = current.shot;
    point.set(...shot.at);
    look.lerp(point, ease * 0.75);
    point.set(shot.from[0] + Math.sin(time / 4200) * 0.25, shot.from[1], shot.from[2] + Math.cos(time / 5200) * 0.15);
    eye.lerp(point, ease * 0.75);
    camera.position.copy(eye);
    camera.lookAt(look);
    renderer.render(scene, camera);

    /* Labels. */
    const sold = soldHouses(now), forSale = new Set(L.forSale || []);
    for (let i = 0; i < N; i++) {
      const r = shown[i], pct = Math.round((r - 1) * 100);
      const p = priceLabels[i], tg = tagLabels[i];
      const txt = Math.round(BASE[i] * r) + ' k€';
      if (p.el.textContent !== txt) p.el.textContent = txt;
      p.el.classList.toggle('claro', r > 1.25);
      let tag = sold.has(i) ? 'VENDIDA' : pct >= 1 ? '+' + pct + '%' : pct <= -1 ? '−' + Math.abs(pct) + '%' : forSale.has(i) ? 'À VENDA' : '';
      tag = tag.trim();
      if (tg.el.textContent !== tag) tg.el.textContent = tag;
      tg.el.classList.toggle('desce', pct <= -1 && !sold.has(i));
      tg.el.classList.toggle('venda', forSale.has(i) && !sold.has(i));
      tg.el.classList.toggle('so-venda', tag === 'À VENDA');
      p.on = !!L.prices; tg.on = !!L.prices && tag !== '';
    }
    for (const item of labels) if (item.key && L.texts && L.texts[item.key] && item.el.textContent !== L.texts[item.key]) item.el.textContent = L.texts[item.key];
    if (tagRosa.el.textContent !== (L.tag || '')) tagRosa.el.textContent = L.tag || '';
    tagRosa.on = !!L.tag;
    for (const item of labels) {
      const isPiece = item.target && !Array.isArray(item.target);
      if (isPiece) point.copy(item.target.position).setY(item.target.position.y + item.height * item.target.scale.y);
      else point.set(...item.target);
      point.project(camera);
      let on;
      if ('on' in item) on = item.on;
      else if (item.piece) on = item.piece.scale.x > 0.5 && item.piece.scale.y > 0.9;
      else on = isPiece && item.target.scale.x > 0.5 && item.target.scale.y > 0.9;
      on = on && point.z < 1 && point.x > -1.1 && point.x < 1.1 && point.y > -1.1 && point.y < 1.1;
      if (on !== item.shown) { item.el.classList.toggle('visivel', on); item.shown = on; }
      item.el.style.transform = `translate(-50%, ${item.center ? -50 : -100}%) translate(${((point.x + 1) / 2 * width).toFixed(1)}px, ${((1 - point.y) / 2 * height).toFixed(1)}px)`;
    }

    if (time - lastRead > 120) { lastRead = time; readout(sold); }
  }

  /** The readout under the board: the same sentences as the 2D widget. */
  function readout(sold) {
    const box = current.el.querySelector('.b3d-read');
    if (!box) { drawChart(current.el, current.L.chart); return; }
    const L = current.L;
    if (!L.prices) { box.innerHTML = ''; return; }
    let sum = 0, up = 0, down = 0;
    for (let i = 0; i < N; i++) {
      sum += BASE[i] * shown[i];
      if (sold.has(i)) continue;
      if (shown[i] > 1.01) up++; else if (shown[i] < 0.99) down++;
    }
    const mean = sum / N, ch = (mean / BASE_MEAN - 1) * 100;
    let html = '<span>Preço médio do bairro: <b>' + nf(mean) + ' mil €</b> (' + (ch > 0.05 ? '+' : '') + nf(ch, 1) + '%)</span>' +
      '<span>Casas que subiram <b>sem obras nenhumas</b>: <b>' + up + '</b></span>';
    if (down) html += '<span class="desce">Casas que desceram: <b>' + down + '</b></span>';
    if (L.market) html += '<span>Conseguem comprar: <b>' + L.market.B + '</b> · Casas à venda: <b>' + L.market.S + '</b></span>';
    if (box.innerHTML !== html) box.innerHTML = html;
    if (L.market) drawMini(current.el.querySelector('.b3d-mini'), L.market);
    drawChart(current.el, L.chart);
  }

  /** Bar chart in the caption column (slide a3-numeros). Redrawn when the chart changes; the bars grow from zero. */
  function drawChart(el, chart) {
    const svg = el.querySelector('.b3d-grafico');
    if (!svg) return;
    const key = chart ? chart.titulo + chart.linhas.length : '';
    if (svg.dataset.key === key) return;
    svg.dataset.key = key;
    svg.classList.toggle('vazio', !chart);
    if (!chart) { svg.innerHTML = ''; return; }
    const W = 440, rowH = 72, H = 48 + chart.linhas.length * rowH, num = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let out = `<text x="0" y="24" class="gr-tit">${chart.titulo}</text>`;
    chart.linhas.forEach((r, k) => {
      const y = 48 + k * rowH, w = Math.max(4, (W - 150) * r.valor / chart.max);
      out += `<text x="0" y="${y + 18}" class="gr-rot">${r.rotulo}</text>` +
        `<rect class="gr-barra" x="0" y="${y + 27}" width="${w}" height="28" rx="5" fill="${r.cor}" style="animation-delay:${k * 0.25}s"/>` +
        `<text x="${w + 8}" y="${y + 49}" class="gr-val" style="animation-delay:${k * 0.25 + 0.5}s">${num(r.valor)}${r.nota ? ' <tspan class="gr-nota">' + r.nota + '</tspan>' : ''}</text>`;
    });
    svg.innerHTML = out;
  }

  /** A small supply-and-demand graph next to the board (same lines as slide a3-curvas). */
  function drawMini(svg, m) {
    if (!svg) return;
    const X = q => 30 + q * 9.5, Y = p => 120 - (p - 100) * 0.5;   // q 0–20 houses, p 100–300 mil €
    const line = (q1, p1, q2, p2) => `x1="${X(q1)}" y1="${Y(p1)}" x2="${X(q2)}" y2="${Y(p2)}"`;
    const clipD = (B) => { const q1 = Math.max(0, B - 8), q2 = Math.min(20, B + 8); return [q1, 200 + 12.5 * (B - q1), q2, 200 + 12.5 * (B - q2)]; };
    const clipS = (S) => { const q1 = Math.max(0, S - 8), q2 = Math.min(20, S + 8); return [q1, 200 + 12.5 * (q1 - S), q2, 200 + 12.5 * (q2 - S)]; };
    const Q = (m.B + m.S) / 2;
    const key = m.B + '-' + m.S;
    if (svg.dataset.key === key) return;
    svg.dataset.key = key;
    svg.innerHTML =
      `<line x1="30" y1="120" x2="225" y2="120" stroke="#1E2A33" stroke-width="1.5"/><line x1="30" y1="120" x2="30" y2="14" stroke="#1E2A33" stroke-width="1.5"/>` +
      `<text x="34" y="12" class="mini-t">preço</text><text x="225" y="136" text-anchor="end" class="mini-t">casas</text>` +
      `<line ${line(...clipD(4))} stroke="#A44A16" stroke-width="2" stroke-dasharray="4 4" opacity=".35"/><line ${line(...clipS(4))} stroke="#2F6E9E" stroke-width="2" stroke-dasharray="4 4" opacity=".35"/>` +
      `<line ${line(...clipD(m.B))} stroke="#A44A16" stroke-width="3" stroke-linecap="round"/><line ${line(...clipS(m.S))} stroke="#2F6E9E" stroke-width="3" stroke-linecap="round"/>` +
      `<line x1="30" y1="${Y(m.P)}" x2="${X(Q)}" y2="${Y(m.P)}" stroke="#6F7880" stroke-dasharray="3 3"/>` +
      `<circle cx="${X(Q)}" cy="${Y(m.P)}" r="6" fill="#1E2A33" stroke="#fff" stroke-width="2"/>` +
      `<text x="${X(Q) + 9}" y="${Y(m.P) - 6}" class="mini-t" font-weight="700">${nf(m.P)} mil €</text>`;
  }

  window.__b3d = { get current() { return current; }, solveShot, freeArea, camera, get size() { return [width, height]; } };   // for debugging in the console

  /* ---------- Slides: entering, buttons, clicks ---------- */
  function enter(el) {
    const cfg = SLIDES[el.id];
    const palco = el.querySelector('.b3d-palco');
    if (!palco) return;
    if (!state.has(el.id)) state.set(el.id, {});
    current = { el, cfg, user: state.get(el.id), step: stepOf(el), L: null };
    if (cfg.seed) current.user.state = null;
    palco.append(canvas, layer);
    fitHeight(el);
    ro.disconnect(); ro.observe(palco);
    resize();
    shockState.clear();
    refresh(true);
    if (!running) { running = true; lastTime = performance.now(); requestAnimationFrame(frame); }
  }

  slideEls.forEach(el => {
    const cfg = SLIDES[el.id];
    // Buttons under the board.
    const btns = el.querySelector('.b3d-btns');
    const palcoEl = el.querySelector('.b3d-palco');
    if (palcoEl) {
      const sb = document.createElement('button');
      sb.type = 'button'; sb.className = 'b3d-som';
      const paint = () => { sb.textContent = SOM.muted ? '🔇' : '🔊'; sb.setAttribute('aria-label', SOM.muted ? 'Ligar o som' : 'Desligar o som'); sb.title = sb.getAttribute('aria-label'); };
      sb.addEventListener('click', e => { e.stopPropagation(); SOM.toggle(); document.querySelectorAll('.b3d-som').forEach(x => x.dispatchEvent(new Event('pintar'))); });
      sb.addEventListener('pintar', paint);
      paint(); palcoEl.append(sb);
    }
    if (cfg.hint && btns) { const h = document.createElement('p'); h.className = 'b3d-dica'; h.textContent = cfg.hint; btns.before(h); }
    if (btns && cfg.sliders) cfg.sliders.forEach(def => {
      const row = document.createElement('label');
      row.className = 'b3d-rng';
      row.innerHTML = '<span></span><input type="range"><output></output>';
      row.firstChild.textContent = def.label;
      const inp = row.querySelector('input');
      inp.min = def.min; inp.max = def.max; inp.step = def.step || 1;
      inp.dataset.key = def.key;
      inp.addEventListener('input', e => {
        e.stopPropagation();
        if (!current || current.el !== el) return;
        const u = current.user;
        if (!u.state) u.state = cfg.seed(current.step);
        u.state[def.key] = Number(inp.value);
        refresh(false);
      });
      inp.addEventListener('keydown', e => e.stopPropagation());          // arrow keys move the slider, not the slide
      inp.addEventListener('change', () => inp.blur());                    // …until it is let go
      inp.addEventListener('click', e => e.stopPropagation());
      btns.append(row);
    });
    if (btns && cfg.buttons) cfg.buttons.forEach(def => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn ghost'; b.textContent = def.t;
      b.addEventListener('click', e => {
        e.stopPropagation();
        if (!current || current.el !== el) return;
        const u = current.user;
        if (def.reset) { for (const k in u) delete u[k]; }
        else {
          if (cfg.seed && !u.state) u.state = cfg.seed(current.step);
          def.f(u);
        }
        refresh(false);
      });
      btns.append(b);
    });
    new MutationObserver(() => {
      if (el.classList.contains('current') && (!current || current.el !== el || !running)) enter(el);
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
    if (el.classList.contains('current')) enter(el);
  });

  // Clicking a house (slides with a `click` rule): pick the house under the pointer.
  const ray = new T.Raycaster(), mouse = new T.Vector2();
  const clickable = houses.flatMap(h => h.meshes);
  function houseAt(e) {
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(clickable, false)[0];
    return hit ? hit.object.userData.house : null;
  }
  canvas.addEventListener('click', e => {
    if (!current || !current.cfg.click) return;
    const i = houseAt(e);
    if (i == null) return;
    e.stopPropagation();
    current.cfg.click(i, current.user);
    refresh(false);
  });
  canvas.addEventListener('pointermove', e => {
    canvas.style.cursor = current && current.cfg.click && houseAt(e) != null ? 'pointer' : '';
  });
})();
