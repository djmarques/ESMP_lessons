/* ==========================================================================
   Aulas 4 e 5 · «O tabuleiro da União»: one 3D board for two lessons.
   Needs assets/vendor/three.min.js (three.js, 3D drawing). Loaded after app.js.

   The story is one continuous film, cut into chapters (slides):
     Aula 4  alargar-aprofundar · dos-seis-aos-doze · da-comunidade-a-uniao · entrar-e-sair
     Aula 5  quatro-vozes · nasce-uma-lei · tribunais-banco
   The board stays the same from the first chapter to the last: a schematic map
   of Europe (one square tile per country), a tower in the Atlantic (what the
   countries put in common) and, further south, a square where the institutions
   rise. There is ONE renderer: on each chapter the canvas moves into that
   slide's .palco, and the camera keeps gliding from where it was, so passing
   from one chapter to the next is a camera move, not a cut.

   How the story is written: FRAMES (below) has one entry per build of each
   chapter, in order. Each entry lists only what changes (countries that join,
   a new block on the tower, a treaty, the camera…). The state of the board at
   any build is everything that changed up to it, so going back a build, or
   jumping to a chapter from the sidebar, simply puts every piece where that
   moment says, and the pieces glide there.

   Text is HTML (captions in index.html, labels over the picture here).
   Code comments in English; every text students read in European Portuguese.
   ========================================================================== */
(function europa3d() {
  "use strict";
  const slideEls = [...document.querySelectorAll(".slide.eu3d")];
  if (!slideEls.length) return;
  const T = window.THREE;
  let renderer;
  try {
    if (!T) throw new Error("three.js missing");
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    slideEls.forEach((s) => s.querySelector(".palco").classList.add("sem-3d"));   // the captions still tell the story
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  const layer = document.createElement("div");                 // labels over the picture
  layer.className = "eu-camada";
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(28, 1.6, 0.1, 300);
  scene.add(new T.HemisphereLight(0xffffff, 0x27323b, 1.8));
  const sun = new T.DirectionalLight(0xfff0dc, 2.5);
  sun.position.set(-10, 22, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 4;
  scene.add(sun);

  /* ---------- Colours: the site's palette ---------- */
  const C = {
    board: 0x2a3640, edge: 0x1a232b, nao: 0x3d4a55, cand: 0x7a7258, membro: 0x2f6e9e, novo: 0xa44a16, pt: 0xf0a673,
    cream: 0xf6f3ec, apricot: 0xf0a673, sky: 0x7fb0d0, navy: 0x1e2a33, grey: 0x6b7680, gold: 0xd9b24c, plaza: 0xd8d1c2,
  };

  /* ---------- Building blocks ---------- */
  const clay = (color, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0 }, extra));
  function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
  const box = (w, h, d, color, x, y, z) => mesh(new T.BoxGeometry(w, h, d), typeof color === "number" ? clay(color) : color, x, y, z);
  const cyl = (r, h, color, x, y, z, seg = 32) => mesh(new T.CylinderGeometry(r, r, h, seg), typeof color === "number" ? clay(color) : color, x, y, z);
  const group = (...kids) => { const g = new T.Group(); kids.forEach((k) => g.add(k)); return g; };
  const PAWN = [[0, 0], [0.44, 0], [0.46, 0.09], [0.31, 0.18], [0.2, 0.52], [0.16, 0.8], [0.28, 0.86], [0.28, 0.93], [0.14, 0.97]];
  const pawnGeo = new T.LatheGeometry(PAWN.map(([x, y]) => new T.Vector2(x, y)), 20);
  const headGeo = new T.SphereGeometry(0.27, 16, 12);
  function pawn(color, size = 0.5) {
    const m = clay(color, { roughness: 0.55 });
    const g = group(mesh(pawnGeo, m), mesh(headGeo, m, 0, 1.16, 0));
    g.scale.setScalar(size);
    g.userData = { size, mat: m };
    return g;
  }
  function textTexture(text, bg, fg, w = 256, h = 128, font = "bold 72px Carlito, Calibri, sans-serif") {
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const g = cv.getContext("2d");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 4);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  function swarm(n, color, size, opts = {}) {
    const im = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), new T.MeshStandardMaterial(Object.assign({ color }, opts)), n);
    im.instanceMatrix.setUsage(T.DynamicDrawUsage);
    im.frustumCulled = false;
    scene.add(im);
    const d = new T.Object3D();
    return {
      n,
      set(i, x, y, z, s = 1) { d.position.set(x, y, z); d.scale.setScalar(size * s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); },
      hide(i) { d.position.set(0, -99, 0); d.scale.setScalar(0.0001); d.updateMatrix(); im.setMatrixAt(i, d.matrix); },
      done() { im.instanceMatrix.needsUpdate = true; },
    };
  }
  const colorGoal = new T.Color();
  const ease = (v, goal, dt, k = 3) => v + (goal - v) * (1 - Math.exp(-dt * k));
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  /* ======================================================================
     The map: one tile per country (a schematic map, not to scale).
     [name, column, row]: columns run west → east, rows north → south.
     ====================================================================== */
  const COUNTRIES = {
    NO: ["Noruega", 5, 0], SE: ["Suécia", 6, 0], FI: ["Finlândia", 7, 0], EE: ["Estónia", 8, 0],
    UK: ["Reino Unido", 2, 1], DK: ["Dinamarca", 5, 1], LV: ["Letónia", 8, 1],
    IE: ["Irlanda", 1, 2], NL: ["Países Baixos", 4, 2], DE: ["Alemanha", 5, 2], PL: ["Polónia", 6, 2], LT: ["Lituânia", 7, 2],
    BE: ["Bélgica", 4, 3], LU: ["Luxemburgo", 5, 3], CZ: ["Chéquia", 6, 3], SK: ["Eslováquia", 7, 3], UA: ["Ucrânia", 8, 3],
    FR: ["França", 3, 4], CH: ["Suíça", 4, 4], AT: ["Áustria", 5, 4], HU: ["Hungria", 6, 4], RO: ["Roménia", 7, 4], MD: ["Moldávia", 8, 4],
    PT: ["Portugal", 1, 5], ES: ["Espanha", 2, 5], IT: ["Itália", 4, 5], SI: ["Eslovénia", 5, 5], HR: ["Croácia", 6, 5], RS: ["Sérvia", 7, 5], BG: ["Bulgária", 8, 5], GE: ["Geórgia", 10, 5],
    BA: ["Bósnia-Herzegovina", 6, 6], MK: ["Macedónia do Norte", 7, 6], GR: ["Grécia", 8, 6], TR: ["Turquia", 9, 6],
    MT: ["Malta", 4, 7], ME: ["Montenegro", 6, 7], AL: ["Albânia", 7, 7], CY: ["Chipre", 10, 7],
  };
  const CANDIDATES = ["AL", "BA", "GE", "MD", "ME", "MK", "RS", "TR", "UA"];
  const S = 1.75;                                              // distance between tiles
  const tx = (col) => (col - 5.5) * S, tz = (row) => (row - 3.5) * S;
  const TOWER = { x: -10.7, z: 1.9 };
  const DOOR = { x: -8.6, z: tz(1) };
  const UK_OUT = { x: -10.4, z: tz(1) };

  // the board: the sea, a rim, and (south) the square of the institutions
  scene.add(box(22.4, 0.5, 17.4, C.board, -1.5, -0.25, 1.2), box(22.9, 0.3, 17.9, C.edge, -1.5, -0.52, 1.2));
  const PLAZA_Z = 16.2;
  const plaza = group(box(21, 0.5, 10.4, C.board, 0, -0.25, 0), box(21.5, 0.3, 10.9, C.edge, 0, -0.52, 0), box(19.6, 0.06, 9.2, C.plaza, 0, 0.03, 0));
  plaza.position.set(-1, -3, PLAZA_Z); plaza.visible = false; scene.add(plaza);
  const coeIsland = group(box(5, 0.5, 4.6, C.board, 0, -0.25, 0), box(4.4, 0.06, 4, C.plaza, 0, 0.03, 0));
  coeIsland.position.set(13.6, -3, PLAZA_Z + 0.4); coeIsland.visible = false; scene.add(coeIsland);

  const tiles = {};
  for (const code in COUNTRIES) {
    const [name, col, row] = COUNTRIES[code];
    const m = mesh(new T.BoxGeometry(1.5, 0.5, 1.5), clay(C.nao, { roughness: 0.7 }), tx(col), 0, tz(row));
    scene.add(m);
    tiles[code] = { m, name, x: tx(col), z: tz(row), y: 0, color: new T.Color(C.nao), hop: 0, glow: 0 };
  }

  // the tower: one block per thing the countries started doing together
  const BLOCKS = [
    ["Carvão e aço", "1952", 0x6b7680], ["Mercado comum", "1958", 0x2f6e9e], ["Eleições diretas para o Parlamento Europeu", "1979", 0x7fb0d0],
    ["Mercado único e cidadania europeia", "1993", 0xf0a673], ["Schengen: sem controlos nas fronteiras", "1995", 0x5e7a3a],
    ["Notas e moedas de euro", "2002", 0xc9a227], ["Carta dos Direitos Fundamentais obrigatória", "2009", 0xa44a16],
  ];
  scene.add(box(2.9, 0.12, 2.9, C.edge, TOWER.x, 0.06, TOWER.z));
  const blocks = BLOCKS.map(([, , color], i) => {
    const b = mesh(new T.BoxGeometry(2.3, 0.5, 2.3), clay(color, { roughness: 0.6 }), TOWER.x, 6 + i, TOWER.z);
    b.visible = false; scene.add(b);
    return { b, home: 0.38 + i * 0.53, y: 6 + i };
  });

  // the treaty tablet (it flies onto the tower when the treaty adds a block)
  const tablet = group(box(1.7, 1.1, 0.14, C.cream, 0, 0, 0), box(1.3, 0.08, 0.02, C.apricot, 0, 0.32, 0.08), box(1.3, 0.05, 0.02, C.grey, 0, 0.08, 0.08), box(1.3, 0.05, 0.02, C.grey, 0, -0.1, 0.08), box(0.9, 0.05, 0.02, C.grey, -0.2, -0.28, 0.08));
  const TABLET_HOME = new T.Vector3(-7.4, 4.4, -3.2);
  tablet.position.copy(TABLET_HOME); tablet.scale.setScalar(0.001); scene.add(tablet);
  const spark = mesh(new T.SphereGeometry(0.28, 16, 12), clay(C.apricot, { emissive: C.apricot, emissiveIntensity: 1 }));
  spark.visible = false; scene.add(spark);
  const SPARK_START = 1.2, SPARK_END = 2.2;                   // seconds after the build: the spark flies, then the block drops

  // border barriers on a few internal borders (they open when Schengen starts)
  const BARRIERS = [["BE", "LU"], ["LU", "DE"], ["NL", "DE"], ["BE", "NL"], ["FR", "BE"], ["FR", "LU"], ["PT", "ES"], ["ES", "FR"]];
  const barriers = BARRIERS.map(([a, b]) => {
    const A = tiles[a], B = tiles[b];
    const g = group(box(0.12, 0.6, 0.12, C.cream, 0, 0.3, 0), box(0.85, 0.09, 0.09, 0xb3261e, 0.4, 0.55, 0));
    g.position.set((A.x + B.x) / 2, 0.5, (A.z + B.z) / 2);
    g.rotation.y = Math.atan2(B.z - A.z, B.x - A.x) + Math.PI / 2;
    g.scale.setScalar(0.001); scene.add(g);
    return { g, a, b, s: 0, arm: g.children[1] };
  });

  // euro coins: a small stack on each country that uses the euro (12 in 2002, 21 in 2026)
  const EURO_2002 = ["BE", "DE", "IE", "GR", "ES", "FR", "IT", "LU", "NL", "AT", "PT", "FI"];
  // later members of the euro area and the year they adopted it (European Central Bank)
  const EURO_LATER = { SI: 2007, CY: 2008, MT: 2008, SK: 2009, EE: 2011, LV: 2014, LT: 2015, HR: 2023, BG: 2026 };
  const coinMat = clay(C.gold, { metalness: 0.6, roughness: 0.35 });
  const coins = EURO_2002.concat(Object.keys(EURO_LATER)).map((code) => {
    const g = group(cyl(0.3, 0.08, coinMat, 0, 0.04, 0, 24), cyl(0.3, 0.08, coinMat, 0.06, 0.13, 0.03, 24), cyl(0.3, 0.08, coinMat, -0.03, 0.22, -0.02, 24));
    g.position.set(tiles[code].x + 0.35, 0.55, tiles[code].z + 0.35); g.scale.setScalar(0.001); scene.add(g);
    return { g, code, s: 0, from: EURO_LATER[code] || 2002 };
  });

  // the exit door (Treaty of Lisbon, article 50) on the west of the map
  const door = group(box(0.18, 1.5, 0.18, C.cream, 0, 0.75, -0.75), box(0.18, 1.5, 0.18, C.cream, 0, 0.75, 0.75), box(0.18, 0.18, 1.7, C.cream, 0, 1.5, 0), box(0.06, 1.3, 1.3, C.apricot, 0, 0.65, 0));
  door.position.set(DOOR.x, 0, DOOR.z); door.scale.setScalar(0.001); scene.add(door);
  const doorLeaf = door.children[3];

  // the three gates of the Copenhagen criteria, by the candidates
  const GATES = [["Critérios políticos", 1.4], ["Critérios económicos", 4.2], ["Critérios jurídicos", 7]];
  const gates = GATES.map(([, x]) => {
    const g = group(box(0.25, 1.6, 0.25, C.cream, -0.7, 0.8, 0), box(0.25, 1.6, 0.25, C.cream, 0.7, 0.8, 0), box(1.7, 0.25, 0.3, C.apricot, 0, 1.65, 0));
    g.position.set(x, 0, 8.6); g.scale.setScalar(0.001); scene.add(g);
    return g;
  });

  /* ---------- The square of the institutions (lesson 5) ---------- */
  const PZ = PLAZA_Z;
  const INST = {};
  const rise = (name, obj, x, z) => { obj.position.set(x, -3, z); obj.visible = false; scene.add(obj); INST[name] = { obj, x, z, y: -3 }; return obj; };
  // European Council: a round hall with a round table
  rise("ce", group(cyl(2.1, 0.25, C.cream, 0, 0.12, 0, 48), cyl(1.25, 0.12, 0x8a6a46, 0, 0.62, 0, 40), cyl(0.18, 0.5, 0x8a6a46, 0, 0.31, 0, 12)), -7.6, PZ - 2.2);
  // European Parliament: a hemicycle of tiers
  const hemi = group();
  for (let r = 0; r < 3; r++) {
    const ring = mesh(new T.CylinderGeometry(1.4 + r * 0.55, 1.4 + r * 0.55, 0.2 + r * 0.2, 40, 1, false, Math.PI / 2, Math.PI), clay(r % 2 ? 0x5f8fb5 : C.sky), 0, 0.1 + r * 0.1, 0);
    hemi.add(ring);
  }
  hemi.add(box(0.7, 0.4, 0.4, C.cream, 0, 0.2, 1.0));
  rise("pe", hemi, -2.4, PZ - 1.6);
  // Council of the European Union: a long table
  rise("cue", group(box(3.6, 0.12, 1.3, 0x8a6a46, 0, 0.6, 0), box(0.25, 0.55, 0.25, 0x8a6a46, -1.4, 0.28, 0), box(0.25, 0.55, 0.25, 0x8a6a46, 1.4, 0.28, 0), box(4.6, 0.12, 2.6, C.cream, 0, 0.06, 0)), 2.8, PZ - 2.2);
  // European Commission: a tall office block
  const comm = group(box(2.4, 3.4, 1.6, C.cream, 0, 1.7, 0), box(2.5, 0.15, 1.7, C.navy, 0, 3.47, 0));
  for (let f = 0; f < 5; f++) comm.add(box(2.42, 0.12, 1.62, 0x9fb9cc, 0, 0.5 + f * 0.62, 0));
  rise("com", comm, 7.6, PZ - 3);
  // Court of Justice: a small temple
  const temple = (c = C.cream) => { const g = group(box(2.4, 0.2, 1.6, c, 0, 0.1, 0), box(2.4, 0.2, 1.6, c, 0, 1.5, 0)); for (let i = 0; i < 4; i++) g.add(cyl(0.12, 1.2, c, -0.9 + i * 0.6, 0.8, 0.5, 12)); const gable = new T.Shape([new T.Vector2(-1.3, 0), new T.Vector2(1.3, 0), new T.Vector2(0, 0.55)]); const roofGeo = new T.ExtrudeGeometry(gable, { depth: 1.6, bevelEnabled: false }); roofGeo.translate(0, 0, -0.8); g.add(mesh(roofGeo, clay(C.apricot), 0, 1.6, 0)); return g; };
  rise("tj", temple(), -6.8, PZ + 2.6);
  // Court of Auditors: a desk with coins and a magnifying glass
  const audit = group(box(2.2, 0.8, 1.4, C.cream, 0, 0.4, 0), cyl(0.3, 0.3, coinMat, -0.4, 0.95, 0, 20), cyl(0.3, 0.45, coinMat, 0.3, 1.02, -0.1, 20));
  const lens = mesh(new T.TorusGeometry(0.42, 0.07, 10, 28), clay(C.navy), 0.1, 1.9, 0.3); audit.add(lens, box(0.1, 0.7, 0.1, C.navy, 0.45, 1.35, 0.3));
  rise("tc", audit, -2, PZ + 2.6);
  // European Central Bank: a tower of coins
  const bank = group(); for (let i = 0; i < 9; i++) bank.add(cyl(0.9 - i * 0.04, 0.32, coinMat, (i % 2) * 0.05, 0.16 + i * 0.33, 0, 32));
  bank.add(mesh(new T.PlaneGeometry(0.9, 0.9), new T.MeshStandardMaterial({ map: textTexture("€", "#d9b24c", "#1e2a33", 128, 128, "bold 100px Carlito, sans-serif"), transparent: true }), 0, 1.6, 0.92));
  rise("bce", bank, 2.8, PZ + 2.6);
  // the other bodies: four small pavilions
  const pav = group(); [[-1.2, -0.7], [1.2, -0.7], [-1.2, 0.9], [1.2, 0.9]].forEach(([x, z], i) => pav.add(box(1.4, 0.8, 1.1, [C.sky, C.apricot, 0x5e7a3a, 0xc9a227][i], x, 0.4, z)));
  rise("org", pav, 7.6, PZ + 2.6);
  // Council of Europe (not part of the Union), on its own island: the Court of Human Rights
  rise("coe", temple(0xd9d3c4), 13.6, PZ + 0.4);
  INST.coe.obj.scale.setScalar(0.85);

  // people: 27 leaders (one per member country), 60 members of Parliament, 27 ministers, 27 commissioners
  const MEMBERS_TODAY = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"];
  const leaders = MEMBERS_TODAY.map((code, i) => {
    const p = pawn(code === "PT" ? C.pt : C.navy, 0.42);
    const a = (i / 27) * Math.PI * 2;
    p.position.set(tiles[code].x, 0.55, tiles[code].z); p.scale.setScalar(0.001); scene.add(p);
    return { p, code, home: new T.Vector3(tiles[code].x, 0.55, tiles[code].z), seat: new T.Vector3(INST.ce.x + Math.cos(a) * 1.6, 0.25, INST.ce.z + Math.sin(a) * 1.6), u: 0 };
  });
  const president = pawn(C.cream, 0.5); president.position.set(INST.ce.x, 0.25, INST.ce.z + 0.0); president.scale.setScalar(0.001); scene.add(president);
  const deputies = [];
  for (let r = 0; r < 3; r++) {
    const n = 14 + r * 6, rad = 1.4 + r * 0.55;
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + Math.PI * ((i + 0.5) / n);
      const p = pawn(r % 2 ? 0xdce8f2 : C.cream, 0.26);
      p.userData.base = new T.Vector3(INST.pe.x + Math.sin(a) * rad, 0.2 + r * 0.2, INST.pe.z + Math.cos(a) * rad);
      p.position.copy(p.userData.base); p.scale.setScalar(0.001); scene.add(p); deputies.push(p);
    }
  }
  const ministers = MEMBERS_TODAY.map((code, i) => {
    const side = i < 14 ? -1 : 1, k = i < 14 ? i : i - 14, n = i < 14 ? 14 : 13;
    const p = pawn(code === "PT" ? C.pt : 0xc9a227, 0.3);
    p.userData.base = new T.Vector3(INST.cue.x - 1.7 + (k + 0.5) * (3.4 / n), 0.12, INST.cue.z + side * 0.95);
    p.position.copy(p.userData.base); p.scale.setScalar(0.001); scene.add(p);
    return p;
  });
  const commissioners = MEMBERS_TODAY.map((code, i) => {
    const row = Math.floor(i / 9), k = i % 9;
    const p = pawn(code === "PT" ? C.pt : 0x5e7a3a, 0.3);
    p.userData.base = new T.Vector3(INST.com.x - 2 + k * 0.5, 0.06, INST.com.z + 1.6 + row * 0.55);
    p.position.copy(p.userData.base); p.scale.setScalar(0.001); scene.add(p);
    return p;
  });
  const comPresident = pawn(C.cream, 0.36); comPresident.userData.base = new T.Vector3(INST.com.x, 0.06, INST.com.z + 3.4);
  comPresident.position.copy(comPresident.userData.base); comPresident.scale.setScalar(0.001); scene.add(comPresident);
  // votes from the member countries to the Parliament (build: Parliament)
  const votes = swarm(54, C.apricot, 0.09, { emissive: C.apricot, emissiveIntensity: 0.6 });
  // the law: a sheet of paper with a USB-C plug on it, and 27 copies that fly to the countries
  const law = group(box(1.1, 1.4, 0.05, C.cream, 0, 0, 0), box(0.9, 0.12, 0.02, C.apricot, 0, 0.5, 0.035), box(0.7, 0.05, 0.02, C.grey, 0, 0.3, 0.035),
    box(0.36, 0.5, 0.12, C.grey, 0, -0.2, 0.08), box(0.2, 0.22, 0.06, 0xb9c2ca, 0, 0.14, 0.08));   // a page with a USB-C plug on it
  law.position.set(INST.com.x, -3, INST.com.z); law.scale.setScalar(0.001); scene.add(law);
  const stamp = group(cyl(0.35, 0.18, C.navy, 0, 0, 0, 24), cyl(0.12, 0.5, 0x8a6a46, 0, 0.33, 0, 12));
  stamp.scale.setScalar(0.001); scene.add(stamp);
  const copies = swarm(27, C.cream, 0.22, {});

  /* ======================================================================
     Labels (HTML over the picture). show(state) says when each one shows.
     ====================================================================== */
  const labels = [];
  function label(html, cls, target, dy, show, align) {
    const el = document.createElement("div");
    el.className = "etiqueta " + cls;
    el.innerHTML = html;
    layer.append(el);
    const item = { el, target, dy, show, align: align || "centro" };
    labels.push(item);
    return item;
  }
  for (const code in tiles) {
    const t = tiles[code];
    label(code === "DE" ? '<span class="de-nome">Alemanha</span>' : t.name, "pais-et eu-pais", t.m, 0.3, (st) =>
      st.novos.includes(code) || (code === "PT" && st.membros.has("PT") && !st.praca) || (st.cand && CANDIDATES.includes(code) && st.cam === "candidatos") || (code === "UK" && st.ukFora && !st.praca && st.ukLabel));
  }
  BLOCKS.forEach(([name, year], i) => label(`${name} <b>${year}</b>`, "eu-bloco", [TOWER.x - 1.35, 0, TOWER.z], 0, (st) => st.blocos > i && (st.torre || (st.ultimoBloco === i && !st.praca)), "direita"));
  blocks.forEach((b, i) => { labels[labels.length - BLOCKS.length + i].block = b; });
  const tabletLabel = label("", "comum-et eu-tabua", tablet, 0.85, (st) => !!st.tabua && !st.praca);
  const nameLabel = label("", "eu-nome", [-1.5, 0.05, 8.25], 0, (st) => !!st.nome && !st.praca && !st.cand);
  label("fronteiras abertas", "nota-et", [tiles.DE.x - 0.9, 1.4, tiles.DE.z + 0.4], 0, (st) => st.schengenAgora);
  label("euro: 12 países", "nota-et", [tiles.FR.x, 1.3, tiles.FR.z], 0, (st) => st.euroAgora);
  label("Saída: artigo 50.º", "nota-et", [DOOR.x, 2.2, DOOR.z], 0, (st) => st.porta && !st.praca && (st.portaAgora || st.ukLabel));
  GATES.forEach(([name], i) => label(name, "comum-et", gates[i], 2.2, (st) => st.gates && st.cam === "candidatos"));
  const inst = (key, html, dy) => label(html, "eu-inst", INST[key].obj, dy, (st) => st.inst.has(key) &&
    (st.foco === key || st.foco === "todas" || (st.foco === "lei" && ["com", "pe", "cue"].includes(key))));
  inst("ce", "<b>Conselho Europeu</b><span>Bruxelas</span>", 1.6);
  inst("pe", "<b>Parlamento Europeu</b><span>Estrasburgo e Bruxelas</span>", 1.4);
  inst("cue", '<b>Conselho da União Europeia</b><span>Bruxelas e Luxemburgo</span><em class="eu-tema"></em>', 1.3);
  inst("com", "<b>Comissão Europeia</b><span>Bruxelas</span>", 4.1);
  inst("tj", "<b>Tribunal de Justiça</b><span>Luxemburgo</span>", 2.3);
  inst("tc", "<b>Tribunal de Contas</b><span>Luxemburgo</span>", 2.4);
  inst("bce", "<b>Banco Central Europeu</b><span>Frankfurt</span>", 3.4);
  inst("org", "<b>Outros órgãos</b><span>comités, provedor, banco de investimento</span>", 1.3);
  label("<b>Conselho da Europa</b><span>Estrasburgo · não pertence à União</span>", "eu-inst eu-fora", INST.coe.obj, 2.2, (st) => st.inst.has("coe") && st.foco === "nomes");
  label("<b>Tribunal Europeu dos Direitos Humanos</b><span>Conselho da Europa · Estrasburgo · não pertence à União</span>", "eu-inst eu-fora", INST.coe.obj, 2.2, (st) => st.inst.has("coe") && (st.foco === "coe" || st.foco === "todas"));
  label("presidente", "nota-et", president, 0.75, (st) => st.foco === "ce");
  label("presidente", "nota-et", comPresident, 0.7, (st) => st.foco === "com");
  const topicEl = layer.querySelector(".eu-tema");
  label("Conselho Europeu: os líderes", "nota-et", [INST.ce.x, 2.3, INST.ce.z], 0, (st) => st.foco === "nomes");
  label("Conselho da União Europeia: os ministros", "nota-et", [INST.cue.x, 2.1, INST.cue.z], 0, (st) => st.foco === "nomes");
  const lawLabel = label("", "comum-et", law, 1.3, (st) => st.lei >= 0 && st.lei <= 3);

  /* ======================================================================
     FRAMES: one entry per build, in the order of the slides.
     Fields (only what changes): ano, entram, saem, bloco (number of blocks),
     tabua [treaty, year], nome (the community's name), schengen, euro, porta,
     ukFora, cand, gates, de (name of Germany), praca, inst (institutions that
     rise), lideres ("mesa" = at the round table), foco, lei (step of the law),
     cam (camera shot), torre (show every block's label).
     ====================================================================== */
  const TODAY = { membros: MEMBERS_TODAY, bloco: 7, nome: "União Europeia", schengen: true, euro: true, porta: true, ukFora: true, de: "Alemanha", ano: "Hoje" };
  const FRAMES = {
    "alargar-aprofundar": [
      { set: TODAY, cam: "mapa" },
      { brilho: "membros", cam: "mapa" },
      { torre: true, cam: "torre" },
      { set: { membros: [], bloco: 0, nome: "", schengen: false, euro: false, porta: false, ukFora: false, de: "Alemanha Ocidental", ano: "1950" }, cam: "mapa" },
    ],
    "dos-seis-aos-doze": [
      { ano: "1951", entram: ["BE", "FR", "DE", "IT", "LU", "NL"], bloco: 1, tabua: ["Tratado de Paris", "1951"], nome: "Comunidade Europeia do Carvão e do Aço", cam: "mapa" },
      { ano: "1957", bloco: 2, tabua: ["Tratados de Roma", "1957"], nome: "Comunidade Económica Europeia", cam: "mapa" },
      { ano: "1973", entram: ["DK", "IE", "UK"], cam: "mapa" },
      { ano: "1979", bloco: 3, cam: "mapa" },
      { ano: "1981", entram: ["GR"], cam: "mapa" },
      { ano: "1986", entram: ["PT", "ES"], tabua: ["Ato Único Europeu", "1986"], cam: "mapa" },
    ],
    "da-comunidade-a-uniao": [
      { ano: "1992", bloco: 4, tabua: ["Tratado de Maastricht", "1992"], nome: "União Europeia", de: "Alemanha", cam: "mapa" },
      { ano: "1995", entram: ["AT", "FI", "SE"], bloco: 5, schengen: true, cam: "mapa" },
      { ano: "1997", tabua: ["Tratado de Amesterdão", "1997"], cam: "mapa" },
      { ano: "2002", bloco: 6, euro: true, cam: "mapa" },
      { ano: "2004", entram: ["CY", "CZ", "EE", "HU", "LV", "LT", "MT", "PL", "SK", "SI"], tabua: ["Tratado de Nice", "2001"], cam: "mapa" },
      { ano: "2007", entram: ["BG", "RO"], cam: "mapa" },
      { ano: "2009", bloco: 7, tabua: ["Tratado de Lisboa", "2007"], porta: true, cam: "mapa" },
    ],
    "entrar-e-sair": [
      { ano: "2013", entram: ["HR"], cam: "mapa" },
      { ano: "2020", saem: ["UK"], ukFora: true, ukLabel: true, cam: "oeste" },
      { ano: "Hoje", cand: true, gates: true, cam: "candidatos" },
      { ano: "Hoje", cam: "final", torre: true },
    ],
    "quatro-vozes": [
      { praca: true, cam: "praca", foco: "" },
      { inst: ["ce"], lideres: "mesa", foco: "ce", cam: "ce" },
      { inst: ["pe"], foco: "pe", cam: "pe" },
      { inst: ["cue"], foco: "cue", cam: "cue" },
      { inst: ["com"], foco: "com", cam: "com" },
      { inst: ["coe"], foco: "nomes", cam: "nomes" },
    ],
    "nasce-uma-lei": [
      { lei: 0, foco: "lei", cam: "lei" },
      { lei: 1, foco: "lei", cam: "lei" },
      { lei: 2, foco: "lei", cam: "lei" },
      { lei: 3, foco: "lei", cam: "tudo" },
      { lei: 4, inst: ["tj"], foco: "tj", cam: "tj" },
    ],
    "tribunais-banco": [
      { lei: -1, inst: ["tj", "tc"], foco: "tc", cam: "tribunais" },
      { inst: ["bce"], foco: "bce", cam: "bce" },
      { inst: ["org"], foco: "org", cam: "org" },
      { foco: "coe", cam: "coe" },
      { foco: "todas", cam: "pracafinal" },
    ],
  };
  const ORDER = slideEls.map((s) => s.id).filter((id) => FRAMES[id]);

  /** The state of the board at build `step` of chapter `id`: every change up to it. */
  function stateAt(id, step) {
    const st = { ano: "", membros: new Set(), bloco: 0, nome: "", schengen: false, euro: false, porta: false, ukFora: false, de: "Alemanha Ocidental",
      cand: false, gates: false, praca: false, inst: new Set(), lideres: "", lei: -1 };
    let local = {};
    for (const sid of ORDER) {
      const frames = FRAMES[sid];
      const last = sid === id ? Math.min(step, frames.length - 1) : frames.length - 1;
      for (let k = 0; k <= last; k++) {
        const f = frames[k];
        if (f.set) { Object.assign(st, f.set); st.membros = new Set(f.set.membros); }
        for (const key of ["ano", "bloco", "nome", "schengen", "euro", "porta", "ukFora", "de", "cand", "gates", "praca", "lideres", "lei"]) if (key in f) st[key] = f[key];
        (f.entram || []).forEach((c) => st.membros.add(c));
        (f.saem || []).forEach((c) => st.membros.delete(c));
        (f.inst || []).forEach((c) => st.inst.add(c));
        local = f;
        if (sid === id && k === last) break;
      }
      if (sid === id) break;
    }
    // what belongs to this build only
    st.novos = local.entram || local.saem || [];
    if (local.set && local.set.membros && local.set.membros.length) st.novos = [];
    st.tabua = local.tabua || null;
    st.cam = local.cam || "mapa";
    st.foco = local.foco !== undefined ? local.foco : (st.praca ? "todas" : "");
    st.brilho = local.brilho || "";
    st.torre = !!local.torre;
    st.ukLabel = !!local.ukLabel;
    st.ultimoBloco = "bloco" in local && !local.set ? local.bloco - 1 : -1;
    st.schengenAgora = "schengen" in local && local.schengen;
    st.euroAgora = "euro" in local && local.euro;
    st.portaAgora = "porta" in local && local.porta;
    st.blocos = st.bloco;
    return st;
  }

  /* ---------- Camera shots: a box to keep in view, and where to look from ---------- */
  const SHOTS = {
    mapa: { box: [-12, 0, -6.6, 9, 3, 8.6], dir: [0, 1.5, 1] },
    final: { box: [-17, 0, -6.6, 9, 4, 8.6], dir: [0.1, 1.3, 1] },
    torre: { box: [-16.5, 0, 0, -8.8, 4.4, 3.8], dir: [0.45, 0.45, 1] },
    oeste: { box: [-12.5, 0, -7, -1, 4, 3.2], dir: [0.1, 1.25, 1] },
    candidatos: { box: [-1, 0, -2.5, 9.5, 3, 9.6], dir: [0.1, 1.2, 1] },
    praca: { box: [-12, 0, -2, 16, 4, 21.6], dir: [0, 1.25, 1] },
    ce: { box: [-12, 0, -6.6, -3.5, 2.4, 15.6], dir: [0.25, 1.5, 1] },
    pe: { box: [-12, 0, -6.6, 9, 2.4, 15.6], dir: [0, 1.45, 1] },
    cue: { box: [-0.5, 0, 12.2, 6.2, 2.6, 15.8], dir: [0.1, 1.4, 1] },
    com: { box: [4.6, 0, 11.6, 10.8, 4.6, 18.6], dir: [-0.15, 1.1, 1] },
    nomes: { box: [-10, 0, 11, 16.5, 3.5, 19.5], dir: [0, 1.0, 1] },
    lei: { box: [-5.5, 0, 11.6, 10.5, 4.2, 17.6], dir: [0, 1.35, 1] },
    tudo: { box: [-12, 0, -6.6, 11, 4, 18], dir: [0, 1.5, 1] },
    tj: { box: [-9.6, 0, 15.6, -3.8, 3.4, 21], dir: [0.15, 1.1, 1] },
    tribunais: { box: [-9.6, 0, 15.6, 0.8, 3.4, 21.2], dir: [0.1, 1.1, 1] },
    bce: { box: [-0.2, 0, 15.6, 6, 4.4, 21], dir: [0.1, 1.0, 1] },
    org: { box: [4.6, 0, 15.6, 11, 2.6, 21.2], dir: [0, 1.2, 1] },
    pracafinal: { box: [-11.5, 0, 10.8, 16.5, 4, 21.4], dir: [0, 1.35, 1] },
    coe: { box: [10.6, 0, 14, 16.6, 3.6, 19.6], dir: [-0.2, 0.6, 1] },
  };

  /* ---------- Sounds (synthesised; shares the on/off choice of the games, «jogo-som») ---------- */
  const SOM = (() => {
    let ctx = null, muted = false;
    try { muted = localStorage.getItem("jogo-som") === "off"; } catch (e) { /* storage unavailable */ }
    function ac() { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); return ctx; }
    function tone(f, start, dur, type = "sine", vol = 0.1, f2) {
      const a = ac(), t = a.currentTime + start, o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(start, dur, freq = 800, vol = 0.12, q = 1) {
      const a = ac(), t = a.currentTime + start, len = Math.ceil(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      src.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(a.destination); src.start(t); src.stop(t + dur + 0.02);
    }
    const SOUNDS = {
      entra: () => [523, 659, 784].forEach((f, k) => tone(f, k * 0.09, 0.3, "triangle", 0.08)),
      sai: () => [784, 659, 523, 392].forEach((f, k) => tone(f, k * 0.11, 0.3, "triangle", 0.07)),
      bloco: () => { noise(0, 0.12, 180, 0.2, 0.8); tone(110, 0, 0.2, "sine", 0.15, 70); },
      tratado: () => { noise(0, 0.25, 3000, 0.04, 0.6); tone(880, 0.05, 0.25, "sine", 0.05, 1320); },
      moedas: () => [0, 0.08, 0.17, 0.27].forEach((s) => tone(2600 + Math.random() * 600, s, 0.12, "triangle", 0.05)),
      cancela: () => { tone(300, 0, 0.3, "square", 0.03, 600); },
      passos: () => { for (let k = 0; k < 6; k++) noise(k * 0.13, 0.05, 1600, 0.05, 2); },
      voto: () => { for (let k = 0; k < 5; k++) noise(k * 0.09, 0.03, 2500, 0.06, 4); },
      carimbo: () => { noise(0, 0.08, 400, 0.25, 0.7); tone(90, 0, 0.15, "sine", 0.15); },
      sobe: () => { noise(0, 0.6, 250, 0.06, 0.5); tone(220, 0, 0.6, "sine", 0.05, 330); },
    };
    return {
      play(name, delay = 0) { if (muted || !SOUNDS[name]) return; const go = () => { try { SOUNDS[name](); } catch (e) { /* no audio */ } }; delay ? setTimeout(go, delay) : go(); },
      get muted() { return muted; },
      toggle() { muted = !muted; try { localStorage.setItem("jogo-som", muted ? "off" : "on"); } catch (e) { /* ignore */ } return muted; },
    };
  })();

  /* ======================================================================
     Engine
     ====================================================================== */
  let current = null;                 // { el, id, st, step, t0 }
  let width = 1, height = 1, running = false, lastTime = 0, shot = null;
  const look = new T.Vector3(-1.5, 0, 1), eye = new T.Vector3(-1.5, 30, 28), tmp = new T.Vector3();
  let firstEnter = true;
  const probe = new T.PerspectiveCamera();
  const stepOf = (el) => Number(el.dataset.at || 0);
  const placar = document.createElement("div");
  placar.className = "eu-placar";

  /** The part of the picture not hidden by the title (top) and the caption (bottom). */
  function freeArea() {
    const el = current.el, r = canvas.getBoundingClientRect();
    let y0 = -0.94, y1 = 0.9;
    const head = el.querySelector(".cine-corpo > div:not(.palco):not(.legendas)"), cap = el.querySelector(".legendas");
    if (head) {
      let bottom = head.getBoundingClientRect().bottom;
      if (!placar.hidden && placar.offsetHeight) bottom = Math.max(bottom, placar.getBoundingClientRect().bottom);
      y1 = Math.min(y1, 1 - 2 * (bottom - r.top + 8) / r.height);
    }
    if (cap) { const b = cap.getBoundingClientRect(); if (b.height) y0 = Math.max(y0, 1 - 2 * (b.top - r.top - 8) / r.height); }
    if (y1 - y0 < 0.6) { y0 = -0.94; y1 = 0.9; }
    return { x0: -0.95, x1: 0.95, y0, y1 };
  }
  function fitBox(b, dir) {
    const A = freeArea();
    const corners = [];
    for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) corners.push(new T.Vector3(x, y, z));
    const at = new T.Vector3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
    const d = new T.Vector3(...dir).normalize();
    const bounds = (from, target) => {
      probe.copy(camera); probe.position.copy(from); probe.lookAt(target); probe.updateMatrixWorld(); probe.updateProjectionMatrix();
      const r = { x0: 9, x1: -9, y0: 9, y1: -9 };
      for (const p of corners) { tmp.copy(p).project(probe); r.x0 = Math.min(r.x0, tmp.x); r.x1 = Math.max(r.x1, tmp.x); r.y0 = Math.min(r.y0, tmp.y); r.y1 = Math.max(r.y1, tmp.y); }
      return r;
    };
    let dist = 30;
    for (let pass = 0; pass < 3; pass++) {
      let lo = 2, hi = 400;
      for (let k = 0; k < 28; k++) { const mid = (lo + hi) / 2, r = bounds(at.clone().addScaledVector(d, mid), at); if (r.x1 - r.x0 <= A.x1 - A.x0 && r.y1 - r.y0 <= A.y1 - A.y0) hi = mid; else lo = mid; }
      dist = hi;
      const r = bounds(at.clone().addScaledVector(d, dist), at);
      const h = dist * Math.tan(T.MathUtils.degToRad(camera.fov / 2)), w = h * camera.aspect;
      const right = new T.Vector3().setFromMatrixColumn(probe.matrixWorld, 0), up = new T.Vector3().setFromMatrixColumn(probe.matrixWorld, 1);
      at.addScaledVector(right, ((r.x0 + r.x1) / 2 - (A.x0 + A.x1) / 2) * w).addScaledVector(up, ((r.y0 + r.y1) / 2 - (A.y0 + A.y1) / 2) * h);
    }
    return { at, from: at.clone().addScaledVector(d, dist) };
  }
  function resize() {
    if (!canvas.parentElement) return;
    width = canvas.clientWidth || 1; height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    if (current) { const s = SHOTS[current.st.cam]; shot = fitBox(s.box, s.dir); }
  }
  const ro = new ResizeObserver(() => resize());

  // members over time, for the small chart in the score box
  const HISTORY = [[1951, 6], [1973, 9], [1981, 10], [1986, 12], [1995, 15], [2004, 25], [2007, 27], [2013, 28], [2020, 27], [2026, 27]];
  function paintScore(st) {
    if (st.praca || !st.ano) { placar.hidden = true; return; }
    placar.hidden = false;
    const year = st.ano === "Hoje" ? 2026 : Number(st.ano);
    const n = st.membros.size;
    const X = (y) => 4 + (y - 1950) / 76 * 152, Y = (v) => 37 - v / 28 * 33;
    let d = "", prev = 0;
    for (const [y, v] of HISTORY) { if (y > year) break; d += (d ? ` L${X(y).toFixed(1)},${Y(prev).toFixed(1)}` : `M${X(y).toFixed(1)},${Y(0).toFixed(1)}`) + ` L${X(y).toFixed(1)},${Y(v).toFixed(1)}`; prev = v; }
    if (d) d += ` L${X(year).toFixed(1)},${Y(prev).toFixed(1)}`;
    const html = `<p><b>${st.ano}</b><span>${n} ${n === 1 ? "país" : "países"}</span></p><svg viewBox="0 0 160 40" preserveAspectRatio="none" aria-hidden="true"><path d="M4,37 H156" class="eixo"/><path d="${d}" class="linha"/></svg>`;
    if (placar._h !== html) { placar.innerHTML = html; placar._h = html; }
  }

  function setState(newSt, fresh) {
    const old = current.st;
    current.st = newSt; current.t0 = performance.now() / 1000;
    const s = SHOTS[newSt.cam]; shot = fitBox(s.box, s.dir);
    tabletLabel.el.innerHTML = newSt.tabua ? `${newSt.tabua[0]} <small>${newSt.tabua[1]}</small>` : "";
    nameLabel.el.textContent = newSt.nome;
    layer.querySelectorAll(".de-nome").forEach((e) => { e.textContent = newSt.de; });
    paintScore(newSt);
    if (fresh || !old) return;
    // sounds for what changed
    if (newSt.membros.size > old.membros.size) SOM.play("entra");
    if (newSt.membros.size < old.membros.size) SOM.play("sai");
    if (newSt.bloco > old.bloco) SOM.play("bloco", newSt.tabua ? 2200 : 0);
    if (newSt.tabua) SOM.play("tratado");
    if (newSt.euro && !old.euro) SOM.play("moedas", 300);
    if (newSt.schengen && !old.schengen) SOM.play("cancela", 400);
    if (newSt.inst.size > old.inst.size || (newSt.praca && !old.praca)) SOM.play("sobe");
    if (newSt.lideres === "mesa" && old.lideres !== "mesa") SOM.play("passos", 300);
    if (newSt.foco === "pe" && old.foco !== "pe") SOM.play("voto", 500);
    if (newSt.lei === 3 && old.lei !== 3) SOM.play("carimbo", 200);
  }

  const TOPICS = ["Ambiente", "Agricultura", "Finanças"];         // the Council meets in different line-ups
  function frame(time) {
    if (!current || !current.el.classList.contains("current")) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min((time - lastTime) / 1000 || 0.016, 0.1);   // capped, so a pause (another tab) does not make pieces jump
    lastTime = time;
    const t = time / 1000;
    const step = stepOf(current.el);
    if (step !== current.step) { current.step = step; setState(stateAt(current.id, step)); }
    const st = current.st, since = t - current.t0;

    // tiles: height and colour
    for (const code in tiles) {
      const tl = tiles[code];
      const member = st.membros.has(code), isNew = st.novos.includes(code) && member;
      const cand = CANDIDATES.includes(code) && st.cand;
      const goalY = member ? 0.3 : code === "UK" && st.ukFora ? -0.05 : 0;
      const goalC = isNew ? C.novo : member ? (code === "PT" ? C.pt : C.membro) : cand ? C.cand : C.nao;
      tl.y = ease(tl.y, goalY, dt, 3);
      tl.color.lerp(colorGoal.setHex(goalC), 1 - Math.exp(-dt * 3));
      tl.m.material.color.copy(tl.color);
      const hop = isNew ? Math.max(0, Math.sin(Math.min(since, 1.2) / 1.2 * Math.PI)) * 0.6 : 0;
      const pulse = (st.brilho === "membros" && member) || (cand && st.gates) ? 0.25 + 0.2 * Math.sin(t * 3) : 0;
      tl.m.material.emissive.setHex(isNew || pulse ? (cand ? C.cand : isNew ? C.novo : C.membro) : 0x000000);
      tl.m.material.emissiveIntensity = isNew ? 0.35 : pulse;
      let x = tl.x, z = tl.z;
      if (code === "UK" && st.ukFora) {                       // the UK slides out through the door
        const u = clamp((since - 0.6) / 2.2);
        const k = st.cam === "oeste" ? u : 1;
        x = tl.x + (UK_OUT.x - tl.x) * k; z = tl.z;
      }
      tl.m.position.set(x, tl.y + hop, z);
    }
    // the tower
    blocks.forEach((b, i) => {
      const want = st.bloco > i;
      const delay = st.ultimoBloco === i && st.tabua ? SPARK_END : 0;   // a treaty's block drops when its spark arrives
      const goal = want && since >= delay ? b.home : b.home + 7;
      b.y = want ? ease(b.y, goal, dt, 5) : ease(b.y, b.home + 7, dt, 4);
      b.b.position.y = b.y;
      b.b.visible = b.y < b.home + 6.5;
    });
    // the treaty tablet: appears and floats; if the treaty adds a block, a spark flies from it to the tower
    if (st.tabua) {
      const sc = clamp(since / 0.4);
      tablet.scale.setScalar(Math.max(0.001, sc)); tablet.visible = true;
      tablet.position.copy(TABLET_HOME); tablet.position.y += Math.sin(t * 2) * 0.06;
      tablet.rotation.y = Math.sin(t * 0.8) * 0.15;
    } else { tablet.scale.setScalar(Math.max(0.001, ease(tablet.scale.x, 0, dt, 6))); tablet.visible = tablet.scale.x > 0.02; }
    const u = clamp((since - SPARK_START) / (SPARK_END - SPARK_START));
    spark.visible = st.ultimoBloco >= 0 && u > 0 && u < 1;
    if (spark.visible) {
      const top = blocks[st.ultimoBloco].home + 0.8;
      spark.position.set(TABLET_HOME.x + (TOWER.x - TABLET_HOME.x) * u, TABLET_HOME.y + (top - TABLET_HOME.y) * u + Math.sin(u * Math.PI) * 2.2, TABLET_HOME.z + (TOWER.z - TABLET_HOME.z) * u);
    }
    // barriers, coins, door, gates
    barriers.forEach((b) => {
      const want = st.membros.has(b.a) && st.membros.has(b.b);
      b.s = ease(b.s, want ? 1 : 0, dt, 4);
      b.g.scale.setScalar(Math.max(0.001, b.s)); b.g.visible = b.s > 0.02;
      b.arm.rotation.z = ease(b.arm.rotation.z, st.schengen ? 1.35 : 0, dt, 3);   // the bar lifts
    });
    const yearNow = st.ano === "Hoje" ? 2026 : Number(st.ano) || 0;
    coins.forEach((c) => { c.s = ease(c.s, st.euro && st.membros.has(c.code) && yearNow >= c.from ? 1 : 0, dt, 4); c.g.scale.setScalar(Math.max(0.001, c.s)); c.g.visible = c.s > 0.02; });
    door.scale.setScalar(Math.max(0.001, ease(door.scale.x, st.porta ? 1 : 0, dt, 4))); door.visible = door.scale.x > 0.02;
    doorLeaf.rotation.y = ease(doorLeaf.rotation.y, st.ukFora && st.cam === "oeste" && since < 3.2 ? -1.3 : 0, dt, 3);
    gates.forEach((g, i) => { const s = ease(g.scale.x, st.gates ? 1 : 0, dt, 3 - i * 0.6); g.scale.setScalar(Math.max(0.001, s)); g.visible = s > 0.02; });
    // the square and the institutions rise from below
    for (const key in INST) {
      const I = INST[key];
      I.y = ease(I.y, st.inst.has(key) ? 0 : -3, dt, 3);
      I.obj.position.y = I.y; I.obj.visible = I.y > -2.9;
    }
    plaza.position.y = ease(plaza.position.y, st.praca ? 0 : -3, dt, 3); plaza.visible = plaza.position.y > -2.9;
    coeIsland.position.y = ease(coeIsland.position.y, st.inst.has("coe") ? 0 : -3, dt, 3); coeIsland.visible = coeIsland.position.y > -2.9;
    // leaders: walk from their country to the round table (and back)
    leaders.forEach((L, i) => {
      const atTable = st.lideres === "mesa";
      L.u = atTable ? Math.min(1, L.u + dt / 2.6) : Math.max(0, L.u - dt / 1.4);   // about 2.6 s to walk to the table
      const show = st.praca && (atTable || L.u > 0.02);
      L.p.position.lerpVectors(L.home, L.seat, L.u * L.u * (3 - 2 * L.u));
      L.p.position.y += Math.abs(Math.sin(t * 9 + i)) * 0.25 * (L.u > 0.03 && L.u < 0.97 ? 1 : 0);
      const sc = ease(L.p.scale.x, show ? 0.42 : 0.001, dt, 4); L.p.scale.setScalar(Math.max(0.001, sc)); L.p.visible = sc > 0.02;
    });
    const sPres = ease(president.scale.x, st.lideres === "mesa" ? 0.5 : 0.001, dt, 3); president.scale.setScalar(Math.max(0.001, sPres)); president.visible = sPres > 0.02;
    // members of Parliament, ministers, commissioners appear with their institution
    const people = (arr, on, size, bob) => arr.forEach((p, i) => {
      const s = ease(p.scale.x, on ? size : 0.001, dt, 2.5 + (i % 7) * 0.3);
      p.scale.setScalar(Math.max(0.001, s)); p.visible = s > 0.02;
      p.position.copy(p.userData.base); p.position.y += bob(i);
    });
    const voting = st.lei === 1;
    people(deputies, st.inst.has("pe"), 0.26, (i) => (voting && (i % 3 === 0) ? Math.abs(Math.sin(t * 5 + i)) * 0.18 : 0));
    const topic = Math.floor(t / 3) % 3;
    const council = st.lei === 2;
    people(ministers, st.inst.has("cue"), 0.3, (i) => (st.foco === "cue" && Math.floor(t / 3) !== Math.floor((t - 0.4) / 3) ? 0.25 : council && i % 2 ? Math.abs(Math.sin(t * 5 + i)) * 0.15 : 0));
    const topicText = st.foco === "cue" ? "hoje reúnem os ministros: " + TOPICS[topic] : "";
    if (topicEl.textContent !== topicText) topicEl.textContent = topicText;
    people(commissioners, st.inst.has("com"), 0.3, () => 0);
    people([comPresident], st.inst.has("com"), 0.36, () => 0);
    // votes fly from the member countries to the Parliament
    for (let i = 0; i < votes.n; i++) {
      if (st.foco !== "pe") { votes.hide(i); continue; }
      const code = MEMBERS_TODAY[i % 27], u = (t * 0.35 + i / votes.n) % 1;
      const a = tiles[code], b = INST.pe;
      votes.set(i, a.x + (b.x - a.x) * u, 0.8 + Math.sin(u * Math.PI) * 3, a.z + (b.z - a.z) * u, 1);
    }
    votes.done();
    // the law: Commission → Parliament → Council ↔ Parliament → approved → 27 copies to the countries
    const L = st.lei;
    const pCom = new T.Vector3(INST.com.x - 1.6, 1.6, INST.com.z + 1.2), pPE = new T.Vector3(INST.pe.x, 2.0, INST.pe.z), pCUE = new T.Vector3(INST.cue.x, 1.8, INST.cue.z);
    pCom.y += 0.6; pPE.y += 0.6; pCUE.y += 0.6;                // the page floats above each institution
    let lawGoal = null, lawText = "";
    if (L === 0) { lawGoal = pCom; lawText = "proposta: um carregador comum (USB-C)"; }
    else if (L === 1) { lawGoal = pPE; lawText = "o Parlamento debate e vota"; }
    else if (L === 2) { const k = Math.floor(since / 1.6) % 2; lawGoal = k ? pPE : pCUE; lawText = "Parlamento e Conselho negociam"; }
    else if (L === 3) { lawGoal = pCUE.clone().setY(1.2); lawText = "aprovada: Diretiva (UE) 2022/2380"; }
    if (lawGoal) {
      law.position.lerp(lawGoal, 1 - Math.exp(-dt * 2.6));
      law.rotation.y = Math.sin(t) * 0.2;
      law.scale.setScalar(Math.max(0.001, ease(law.scale.x, 1.5, dt, 4))); law.visible = true;
      if (lawLabel.el.textContent !== lawText) lawLabel.el.textContent = lawText;
    } else { law.scale.setScalar(Math.max(0.001, ease(law.scale.x, 0, dt, 4))); law.visible = law.scale.x > 0.02; }
    // the stamp comes down on the approved law
    const stampOn = L === 3 && since < 1.6;
    stamp.position.set(pCUE.x, 1.2 + (stampOn ? Math.max(0.2, 2.2 - since * 3) : 3), pCUE.z);
    stamp.scale.setScalar(stampOn ? 1 : 0.001); stamp.visible = stampOn;
    // the 27 copies fly to the member countries
    for (let i = 0; i < 27; i++) {
      if (L < 3 || L > 4) { copies.hide(i); continue; }
      const u = L === 4 ? 1 : clamp((since - 1.2 - i * 0.03) / 1.6);
      const a = tiles[MEMBERS_TODAY[i]];
      if (u <= 0) { copies.hide(i); continue; }
      copies.set(i, pCUE.x + (a.x - pCUE.x) * u, 1.2 + Math.sin(u * Math.PI) * 4 + (u >= 1 ? -0.3 : 0), pCUE.z + (a.z - pCUE.z) * u, 1);
    }
    copies.done();

    // camera: glide to this build's shot (never a cut), with a slow drift
    const k = 1 - Math.exp(-dt * 1.8);
    look.lerp(shot.at, k);
    tmp.copy(shot.from); const dist = shot.from.distanceTo(shot.at);
    tmp.x += Math.sin(t / 5) * dist * 0.01; tmp.y += Math.cos(t / 6.5) * dist * 0.006;
    eye.lerp(tmp, k);
    camera.position.copy(eye); camera.lookAt(look);
    renderer.render(scene, camera);

    // labels: project, keep inside the picture, push apart any that would overlap
    const placed = [];
    const r = canvas.getBoundingClientRect();
    const keepOut = [];                                        // the title, the caption and the score box are not to be covered
    for (const sel of [".cine-corpo > div:not(.palco):not(.legendas)", ".legendas", ".capitulos"]) {
      const e = current.el.querySelector(sel); if (!e) continue;
      const b = e.getBoundingClientRect(); if (b.width && b.height) keepOut.push({ x0: b.left - r.left - 4, x1: b.right - r.left + 4, y0: b.top - r.top - 4, y1: b.bottom - r.top + 4 });
    }
    for (const e of document.querySelectorAll(".esmp-doca, .menu-btn, #controls .pill")) {   // the shared teacher tools, the menu button and the navigation pill
      const b = e.getBoundingClientRect(); if (b.width && b.height) keepOut.push({ x0: b.left - r.left - 4, x1: b.right - r.left + 4, y0: b.top - r.top - 4, y1: b.bottom - r.top + 4 });
    }
    if (!placar.hidden && placar.offsetWidth) { const b = placar.getBoundingClientRect(); keepOut.push({ x0: b.left - r.left - 4, x1: b.right - r.left + 4, y0: b.top - r.top - 4, y1: b.bottom - r.top + 4 }); }
    for (const item of labels) {
      let show = item.show(st);
      let vis = false;
      if (show) {
        const tg = item.target;
        if (item.block) tmp.set(TOWER.x - 1.2, item.block.b.position.y, TOWER.z + 1.15);   // front-left edge of the block
        else if (Array.isArray(tg)) tmp.set(...tg); else { tg.getWorldPosition(tmp); tmp.y += item.dy; }
        tmp.project(camera);
        vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
      }
      item.el.classList.toggle("visivel", vis);
      if (!vis) { item.y = undefined; continue; }
      const w = item.el.offsetWidth || 80, h = item.el.offsetHeight || 22;
      let px = (tmp.x + 1) / 2 * width, py = (1 - tmp.y) / 2 * height;
      // box of the label for a given anchor point
      if (item.align === "direita") px -= 8;                   // a small gap between the label and the block
      const rect = (ax, ay) => item.align === "direita" ? { x0: ax - w, x1: ax, y0: ay - h / 2, y1: ay + h / 2 } : { x0: ax - w / 2, x1: ax + w / 2, y0: ay - h, y1: ay };
      const fix = (ax) => { const b = rect(ax, 0); if (b.x0 < 4) ax += 4 - b.x0; if (b.x1 > width - 4) ax -= b.x1 - (width - 4); return ax; };
      px = fix(px);
      const free = (ay) => { const b = rect(px, ay); if (b.y0 < 2 || b.y1 > height - 2) return false; return placed.concat(keepOut).every((o) => b.x1 <= o.x0 || b.x0 >= o.x1 || b.y1 <= o.y0 || b.y0 >= o.y1); };
      let best = py;
      if (!free(py)) {
        best = null;
        // tower labels are placed bottom block first, so they only move up and stay in the tower's order
        for (let s = 1; s < 60 && best === null; s++) { if (free(py - s * 5)) best = py - s * 5; else if (!item.block && free(py + s * 5)) best = py + s * 5; }
        if (best === null) { item.el.classList.remove("visivel"); item.el.classList.add("sem-lugar"); item.y = undefined; continue; }   // no room: better hidden than on top of text
      }
      item.el.classList.remove("sem-lugar");
      item.y = best;                                           // no easing: an easing label lags behind and can cross another
      const b = rect(px, best); placed.push({ x0: b.x0 - 3, x1: b.x1 + 3, y0: b.y0 - 3, y1: b.y1 + 3 });   // reserve the place the label is going to
      item.el.style.transform = item.align === "direita" ? `translate(${(px - w).toFixed(1)}px, ${(item.y - h / 2).toFixed(1)}px)` : `translate(${(px - w / 2).toFixed(1)}px, ${(item.y - h).toFixed(1)}px)`;
    }
  }

  function enter(el) {
    const palco = el.querySelector(".palco");
    const id = el.id;
    current = { el, id, step: stepOf(el), st: null, t0: performance.now() / 1000 };
    palco.append(canvas, layer);
    const head = el.querySelector(".cine-corpo > div:not(.palco):not(.legendas)");
    (head || palco).append(placar);
    ro.disconnect(); ro.observe(palco);
    width = canvas.clientWidth || 1; height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    setState(stateAt(id, current.step), true);
    if (firstEnter) {                                          // the first time: start from the shot (later: keep gliding)
      look.copy(shot.at); eye.copy(shot.from); firstEnter = false;
      // and put every piece directly in place
      const st = current.st;
      for (const code in tiles) { const tl = tiles[code], m = st.membros.has(code); tl.y = m ? 0.3 : 0; tl.color.set(m ? (code === "PT" ? C.pt : C.membro) : CANDIDATES.includes(code) && st.cand ? C.cand : C.nao); }
      blocks.forEach((b, i) => { b.y = st.bloco > i ? b.home : b.home + 7; });
      for (const key in INST) INST[key].y = st.inst.has(key) ? 0 : -3;
      plaza.position.y = st.praca ? 0 : -3; coeIsland.position.y = st.inst.has("coe") ? 0 : -3;
      leaders.forEach((L) => { L.u = st.lideres === "mesa" ? 1 : 0; });
    }
    if (!running) { running = true; lastTime = performance.now(); requestAnimationFrame(frame); }
  }

  slideEls.forEach((el) => {
    const palco = el.querySelector(".palco");
    const sb = document.createElement("button");
    sb.type = "button"; sb.className = "eu-som";
    const paint = () => { sb.textContent = SOM.muted ? "🔇" : "🔊"; sb.setAttribute("aria-label", SOM.muted ? "Ligar o som" : "Desligar o som"); sb.title = sb.getAttribute("aria-label"); };
    sb.addEventListener("click", (e) => { e.stopPropagation(); SOM.toggle(); document.querySelectorAll(".eu-som").forEach((x) => x.dispatchEvent(new Event("pintar"))); });
    sb.addEventListener("pintar", paint);
    paint();
    const bar = el.querySelector(".capitulos");                // the chapter bar made by fundadores.js
    if (bar) bar.insertBefore(sb, bar.querySelector(".tocar")); else palco.append(sb);
    new MutationObserver(() => { if (el.classList.contains("current") && (!current || current.el !== el || !running)) enter(el); })
      .observe(el, { attributes: true, attributeFilter: ["class"] });
    if (el.classList.contains("current")) enter(el);
  });
  window.addEventListener("resize", () => resize());
})();
