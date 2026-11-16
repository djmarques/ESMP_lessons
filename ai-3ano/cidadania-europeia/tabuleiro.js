/* ==========================================================================
   Aula 3 · "O tabuleiro da Europa": a 3D board-game animation that shows
   how the European Coal and Steel Community came about.
   Slide: #tabuleiro. Needs assets/vendor/three.min.js (three.js, 3D drawing).

   How it works
   - The board is a small scene: country tiles, factories, coal, steel, a
     border, and one pawn per person or country.
   - SCRIPT (below) says where every piece stands at each build of the slide.
     The arrow keys change the build; the pieces then walk (hop) to their new
     places and the camera glides to its new position. Nothing is recorded:
     going back a build simply sends the pieces back.
   - Names and portraits are ordinary HTML placed over the 3D picture, so the
     text stays sharp.

   To change the story, edit SCRIPT and CAMERA. Distances are in board units:
   x runs left to right (France is negative, Germany positive), z runs from
   the back (negative) to the front, y is height.
   ========================================================================== */
(function tabuleiro() {
  const slide = document.getElementById("tabuleiro");
  const stage = slide && slide.querySelector(".palco");
  if (!stage) return;
  const T = window.THREE;
  let renderer;
  try {
    if (!T) throw new Error("three.js missing");
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    stage.classList.add("sem-3d");                               // the captions still tell the story
    return;
  }

  /* ---------- Colours (the site's palette, plus four muted country colours) ---------- */
  const C = {
    board: 0x2a3640, edge: 0x1a232b, france: 0x2f6e9e, germany: 0x6b7680, uk: 0xa44a16,
    italy: 0x5e7a3a, belgium: 0xc9a227, netherlands: 0xd9824a, luxembourg: 0x7fb0d0,
    cream: 0xf6f3ec, apricot: 0xf0a673, coal: 0x1c1c1e, steel: 0xb9c2ca, brick: 0xb8623a,
  };

  /* ---------- Scene, light, camera ---------- */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  stage.append(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, 0.1, 120);
  scene.add(new T.HemisphereLight(0xffffff, 0x27323b, 1.9));
  const sun = new T.DirectionalLight(0xfff0dc, 2.6);             // warm key light from the front left
  sun.position.set(-7, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  sun.shadow.radius = 5;
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

  /** A classic game pawn, about 1.4 units tall, standing on y = 0 of its own group. */
  function pawn(color) {
    const outline = [[0, 0], [0.44, 0], [0.46, 0.09], [0.31, 0.18], [0.2, 0.52], [0.16, 0.8], [0.28, 0.86], [0.28, 0.93], [0.14, 0.97]];
    const body = mesh(new T.LatheGeometry(outline.map(([x, y]) => new T.Vector2(x, y)), 40), clay(color, { roughness: 0.55 }));
    const head = mesh(new T.SphereGeometry(0.27, 32, 24), clay(color, { roughness: 0.55 }), 0, 1.16, 0);
    const group = new T.Group();
    group.add(body, head);
    return group;
  }
  function factory(x, z) {
    const group = new T.Group();
    group.add(box(1.3, 0.7, 0.9, C.cream, 0, 0.35, 0), box(1.36, 0.12, 0.96, C.brick, 0, 0.76, 0));
    for (const dx of [-0.35, 0.1]) group.add(mesh(new T.CylinderGeometry(0.11, 0.14, 0.9, 16), clay(C.brick), dx, 1.2, 0.1));
    group.position.set(x, 0.3, z);
    return group;
  }
  function coal() {
    const group = new T.Group();
    const material = clay(C.coal, { flatShading: true, roughness: 0.6 });
    for (const [x, y, z, r] of [[0, 0.2, 0, 0.3], [0.38, 0.16, 0.12, 0.24], [-0.3, 0.15, 0.2, 0.22], [0.1, 0.42, 0.08, 0.2]]) {
      group.add(mesh(new T.IcosahedronGeometry(r, 0), material, x, y, z));
    }
    return group;
  }
  function steel() {
    const group = new T.Group();
    const material = clay(C.steel, { metalness: 0.65, roughness: 0.35 });
    for (const [x, y, z] of [[0, 0.08, -0.14], [0, 0.08, 0.14], [0, 0.24, 0]]) group.add(mesh(new T.BoxGeometry(1, 0.15, 0.24), material, x, y, z));
    return group;
  }

  /* ---------- The fixed board ---------- */
  scene.add(box(14.4, 0.5, 11.6, C.board, 0, -0.25, 0), box(14.9, 0.3, 12.1, C.edge, 0, -0.5, 0));
  scene.add(box(5.9, 0.3, 5.6, C.france, -3.35, 0.15, 0), box(5.9, 0.3, 5.6, C.germany, 3.35, 0.15, 0));
  scene.add(box(2.8, 0.5, 2.2, C.board, -9.6, -0.25, -3.6), box(2.4, 0.3, 1.8, C.uk, -9.6, 0.15, -3.6));   // the United Kingdom: an island off the board
  scene.add(factory(-5, 1.7), factory(5, 1.7));

  /* ---------- The pieces that move. Every piece gets a name used in SCRIPT. ---------- */
  const pieces = {};
  const add = (name, object, walks = false) => { object.userData.walks = walks; scene.add(object); pieces[name] = object; return object; };
  add("churchill", pawn(C.uk), true);
  add("monnet", pawn(C.apricot), true);
  add("schuman", pawn(0x7fb0d0), true);
  add("adenauer", pawn(0xd8dde2), true);
  add("italia", pawn(C.italy), true);
  add("belgica", pawn(C.belgium), true);
  add("holanda", pawn(C.netherlands), true);
  add("luxemburgo", pawn(C.luxembourg), true);
  add("carvaoF", coal()); add("acoF", steel()); add("carvaoA", coal()); add("acoA", steel());
  add("autoridade", mesh(new T.CylinderGeometry(1.75, 1.85, 0.34, 48), clay(C.cream)));
  add("anel", mesh(new T.TorusGeometry(1.75, 0.07, 12, 64), clay(C.apricot, { emissive: C.apricot, emissiveIntensity: 0.5 }))).rotation.x = Math.PI / 2;
  add("tItalia", box(4.2, 0.3, 1.9, C.italy)); add("tBelgica", box(2.4, 0.3, 1.9, C.belgium));
  add("tHolanda", box(2.4, 0.3, 1.9, C.netherlands)); add("tLuxemburgo", box(2.4, 0.3, 1.9, C.luxembourg));
  const border = new T.Group();                                 // the border: a row of posts between France and Germany
  for (let i = 0; i < 9; i++) border.add(box(0.2, 0.75, 0.2, i % 2 ? C.cream : C.uk, 0, 0.37, -2.6 + i * 0.65));
  border.add(box(0.08, 0.1, 5.4, C.cream, 0, 0.55, 0));
  add("fronteira", border);

  /* ---------- SCRIPT: where each piece stands, from which build on ----------
     Each entry: [first build, { x, y, z, s }]. s is the size (0 = not on the board yet).
     A piece keeps its place until its next entry. "fala" lists who bounces (is "speaking") at each build. */
  const OFF = { s: 0 };
  const SCRIPT = {
    churchill:  [[0, { x: -9.6, y: 0.3, z: -3.6, s: 0 }], [1, { s: 1 }]],
    monnet:     [[0, { x: -8.5, y: 0.3, z: 0.4, s: 0 }], [2, { x: -3.2, z: 0.2, s: 1 }], [3, { x: -2.9, z: -1.1 }], [5, { x: -3.5, z: -1.2 }], [6, { x: 0, y: 0.64, z: 0.1 }]],
    schuman:    [[0, { x: -8.5, y: 0.3, z: 1.2, s: 0 }], [3, { x: -1.3, z: 0.5, s: 1 }], [4, { x: -0.85, z: 0.4 }], [5, { x: -2.5, z: 1 }]],
    adenauer:   [[0, { x: 8.5, y: 0.3, z: 0.8, s: 0 }], [4, { x: 0.85, z: 0.4, s: 1 }], [5, { x: 2.5, z: 1 }]],
    fronteira:  [[0, { x: 0, y: 0.3, z: 0, s: 1 }], [5, { y: -1.2 }]],
    autoridade: [[0, { x: 0, y: 0.1, z: 0, s: 1 }], [5, { y: 0.47 }]],
    anel:       [[0, { x: 0, y: 0.1, z: 0, s: 0.9 }], [5, { y: 0.66, s: 1 }]],
    carvaoF:    [[0, { x: -4.3, y: 0.3, z: -1.7, s: 1 }], [5, { x: -0.75, y: 0.64, z: -0.55 }]],
    acoF:       [[0, { x: -5.2, y: 0.3, z: -0.4, s: 1 }], [5, { x: -0.6, y: 0.64, z: 0.75 }]],
    carvaoA:    [[0, { x: 4.3, y: 0.3, z: -1.7, s: 1 }], [5, { x: 0.75, y: 0.64, z: -0.55 }]],
    acoA:       [[0, { x: 5.2, y: 0.3, z: -0.4, s: 1 }], [5, { x: 0.6, y: 0.64, z: 0.75 }]],
    tBelgica:   [[0, { x: -2.7, y: -0.4, z: -4.2, s: 1 }], [6, { y: 0.15 }]],
    tHolanda:   [[0, { x: 0, y: -0.4, z: -4.2, s: 1 }], [6, { y: 0.15 }]],
    tLuxemburgo:[[0, { x: 2.7, y: -0.4, z: -4.2, s: 1 }], [6, { y: 0.15 }]],
    tItalia:    [[0, { x: 0, y: -0.4, z: 4.2, s: 1 }], [6, { y: 0.15 }]],
    belgica:    [[0, { x: -2.7, y: 0.3, z: -4.2, s: 0 }], [6, { s: 0.85 }]],
    holanda:    [[0, { x: 0, y: 0.3, z: -4.2, s: 0 }], [6, { s: 0.85 }]],
    luxemburgo: [[0, { x: 2.7, y: 0.3, z: -4.2, s: 0 }], [6, { s: 0.85 }]],
    italia:     [[0, { x: 0, y: 0.3, z: 4.2, s: 0 }], [6, { s: 0.85 }]],
  };
  const SPEAKING = [[], ["churchill"], ["monnet"], ["schuman"], ["adenauer"], ["schuman", "adenauer"], ["monnet"]];
  /* CAMERA: for each build, where the camera is and what it looks at. */
  const CAMERA = [
    { from: [-1.2, 18, 19], at: [-1.2, 0, 1.8] },          // 0 the whole board
    { from: [-13, 7, 6.5], at: [-8, 1.7, -2.6] },    // 1 the island
    { from: [-6, 7, 10.5], at: [-3.2, 1.6, 0] },     // 2 France
    { from: [-4.5, 6.8, 10.5], at: [-1.5, 1.6, 0] },     // 3 towards the border
    { from: [0, 6, 11], at: [0, 1.7, 0] },       // 4 the meeting at the border
    { from: [0, 9, 11.5], at: [0, 1.5, 0] },         // 5 coal and steel in common
    { from: [-0.8, 19, 16.6], at: [-0.8, 0, 1.1] },          // 6 the six
  ];

  /** The place of a piece at a build: its entries up to that build, merged in order. */
  function placeAt(name, step) {
    const place = {};
    for (const [from, values] of SCRIPT[name]) if (from <= step) Object.assign(place, values);
    return place;
  }
  // Start every piece where the story begins.
  for (const name in SCRIPT) {
    const p = placeAt(name, 0);
    pieces[name].position.set(p.x, p.y, p.z);
    pieces[name].scale.setScalar(Math.max(p.s, 0.001));
    pieces[name].userData.ground = p.y;
  }

  /* ---------- Labels: HTML over the 3D picture ---------- */
  const labels = [];
  /** Put a label over a piece (or a fixed point [x, y, z]); `from`/`to` = builds in which it shows. */
  function label(html, target, height, className, from = 0, to = 99) {
    const el = document.createElement("div");
    el.className = "etiqueta " + className;
    el.innerHTML = html;
    stage.append(el);
    labels.push({ el, target, height, from, to });
  }
  const face = (file, name) => `<img src="assets/fundadores/${file}.webp" alt=""><b>${name}</b>`;
  label(face("churchill", "Churchill"), pieces.churchill, 1.75, "pessoa-et");
  label(face("monnet", "Monnet"), pieces.monnet, 1.75, "pessoa-et");
  label(face("schuman", "Schuman"), pieces.schuman, 1.75, "pessoa-et");
  label(face("adenauer", "Adenauer"), pieces.adenauer, 1.75, "pessoa-et");
  label("França", [-5.2, 0.3, 2.6], 0, "pais-et");
  label("Alemanha Ocidental", [5, 0.3, 2.6], 0, "pais-et");
  label("Reino Unido", [-9.6, 0.3, -2.5], 0, "pais-et", 0, 5);
  label("fronteira", [0, 1.2, -2.8], 0, "nota-et", 0, 4);
  label("carvão", pieces.carvaoF, 0.95, "nota-et", 0, 4); label("aço", pieces.acoF, 0.7, "nota-et", 0, 4);
  label("carvão", pieces.carvaoA, 0.95, "nota-et", 0, 4); label("aço", pieces.acoA, 0.7, "nota-et", 0, 4);
  label("Alta Autoridade comum", [0, 0.7, 2.1], 0, "comum-et", 5, 5);
  label("Comunidade Europeia do Carvão e do Aço", [0, 0.7, 2.2], 0, "comum-et", 6);
  label("Itália", pieces.italia, 1.5, "pais-et", 6); label("Bélgica", pieces.belgica, 1.5, "pais-et", 6);
  label("Países Baixos", pieces.holanda, 1.5, "pais-et", 6); label("Luxemburgo", pieces.luxemburgo, 1.5, "pais-et", 6);

  /* ---------- Animation ---------- */
  const look = new T.Vector3(-1.2, 0, 1.8);
  const eye = new T.Vector3(-1.2, 18, 19);
  const point = new T.Vector3();
  let width = 1, height = 1, lastTime = 0, running = false;
  camera.position.copy(eye);

  function resize() {
    width = stage.clientWidth || 1;
    height = stage.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function frame(time) {
    if (!slide.classList.contains("current")) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min((time - lastTime) / 1000 || 0.016, 0.05);
    lastTime = time;
    const step = Math.min(Number(slide.dataset.at || 0), CAMERA.length - 1);
    const ease = 1 - Math.exp(-dt * 3.2);                          // smooth approach, independent of frame rate

    for (const name in SCRIPT) {
      const piece = pieces[name], goal = placeAt(name, step), pos = piece.position;
      const dx = goal.x - pos.x, dz = goal.z - pos.z, distance = Math.hypot(dx, dz);
      let lift = 0;
      if (piece.userData.walks) {
        // Pawns walk at a steady speed and hop as they go, like a piece moved along a board.
        const stride = Math.min(distance, 3.4 * dt);
        if (distance > 0.001) { pos.x += (dx / distance) * stride; pos.z += (dz / distance) * stride; }
        if (distance > 0.05) lift = Math.abs(Math.sin(time / 130)) * 0.38;
        else if (SPEAKING[step].includes(name)) lift = Math.abs(Math.sin(time / 260)) * 0.16;   // gentle bounce: "speaking"
      } else {
        pos.x += dx * ease; pos.z += dz * ease;
      }
      piece.userData.ground += (goal.y - piece.userData.ground) * ease;
      pos.y = piece.userData.ground + lift;
      const size = piece.scale.x + (Math.max(goal.s, 0.001) - piece.scale.x) * Math.min(ease * 2, 1);
      piece.scale.setScalar(size);
      piece.visible = size > 0.02;
    }

    // Camera: glide to the build's position; step back on tall, narrow screens; drift a little, always.
    const shot = CAMERA[step];
    const back = Math.max(1, 1.5 / camera.aspect);
    point.set(shot.at[0], shot.at[1], shot.at[2]);
    look.lerp(point, ease * 0.7);
    point.set(shot.at[0] + (shot.from[0] - shot.at[0]) * back + Math.sin(time / 4200) * 0.5,
              shot.at[1] + (shot.from[1] - shot.at[1]) * back,
              shot.at[2] + (shot.from[2] - shot.at[2]) * back + Math.cos(time / 5200) * 0.3);
    eye.lerp(point, ease * 0.7);
    camera.position.copy(eye);
    camera.lookAt(look);
    renderer.render(scene, camera);

    // Labels follow their pieces.
    for (const item of labels) {
      const isPiece = !Array.isArray(item.target);
      if (isPiece) point.copy(item.target.position).setY(item.target.position.y + item.height * item.target.scale.x);
      else point.set(item.target[0], item.target[1], item.target[2]);
      point.project(camera);
      const shown = step >= item.from && step <= item.to && point.z < 1 && (!isPiece || item.target.scale.x > 0.5);
      item.el.classList.toggle("visivel", shown);
      item.el.style.transform = `translate(-50%, -100%) translate(${((point.x + 1) / 2) * width}px, ${((1 - point.y) / 2) * height}px)`;
    }
  }

  function start() {
    if (running || !slide.classList.contains("current")) return;
    running = true;
    resize();
    requestAnimationFrame(frame);
  }
  new ResizeObserver(resize).observe(stage);
  new MutationObserver(start).observe(slide, { attributes: true, attributeFilter: ["class"] });
  start();
})();
