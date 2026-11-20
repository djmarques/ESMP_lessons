/* ==========================================================================
   industria3d.js — «A civilização industrial»: five 3D scenes in clay style.
   Needs assets/vendor/three.min.js (three.js release 160, 3D drawing).

   Scenes (one per slide, see SCENES below):
     s-ci-vapor    a steam locomotive, cut open: fire, boiler, piston, wheels
     s-ci-motor    a four-stroke engine, cut open (and the Diesel variant)
     s-ci-dinamo   a turbine turns a coil between two magnets: electricity
     s-ci-fabrica  a cotton mill by day and by night: shifts, the overlooker
     s-ci-cidade   an industrial city: the river, the sewers, the moths

   How it works (same ideas as the board in clc6/bairro3d.js):
   - ONE renderer for the whole lesson. When one of these slides is shown,
     the canvas and its HTML labels move into that slide's .i3d-palco and
     that slide's scene is built (the first time) and drawn.
   - The story is driven by the slide's builds: app.js puts the classes
     ge1…geN on the slide, and each scene reads "which build is this?"
     every frame. Everything is a function of the build (and of the sliders
     a scene offers), so going back a build simply plays it backwards.
   - Text is HTML (captions under the picture, labels over it), never 3D,
     so it stays sharp on a projector and is easy to edit.
   - The camera frames a box per build (fitBox), so the picture adapts to
     any screen, from the projector to a phone held upright.
   If WebGL is not available, the captions still tell the story.
   Code comments in English; every text students read in European Portuguese.
   ========================================================================== */
(function industria3d() {
  'use strict';
  const slideEls = Array.from(document.querySelectorAll('.i3d-slide'));
  if (!slideEls.length) return;
  const T = window.THREE;
  let renderer;
  try {
    if (!T) throw new Error('three.js em falta');
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) { slideEls.forEach(el => el.classList.add('sem-3d')); return; }
  document.documentElement.classList.add('i3d-ok');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  const layer = document.createElement('div');           // HTML labels over the picture
  layer.className = 'i3d-camada';
  const camera = new T.PerspectiveCamera(28, 1.6, 0.1, 400);

  /* ---------- Colours: the deck's palette, plus a few materials ---------- */
  const C = {
    navy: 0x1E2A33, orange: 0xA44A16, apricot: 0xF0A673, cream: 0xF6F3EC, peach: 0xF1CDB0,
    blue: 0x2F6E9E, blueL: 0xDCE8F2, green: 0x556B3C, greenL: 0xE9EEE2, grey: 0x6F7880, line: 0xC9D1D8,
    brick: 0x9C5A3C, brickD: 0x7A4430, steel: 0x8C959D, iron: 0x3B434A, copper: 0xB87333, coal: 0x262626,
    water: 0x5B8DB8, dirty: 0x6E5A36, grass: 0xC9D3B4, sand: 0xE4DCCB, slab: 0xE9E3D6,
  };
  const hex = c => '#' + c.toString(16).padStart(6, '0');

  /* ---------- Building blocks ---------- */
  const clay = (color, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0 }, extra));
  const glass = (color, opacity) => new T.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1, transparent: true, opacity, depthWrite: false, side: T.DoubleSide });
  const glow = (color, intensity = 1) => new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.6 });
  function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = !material.transparent;
    return m;
  }
  const box = (w, h, d, color, x, y, z) => mesh(new T.BoxGeometry(w, h, d), typeof color === 'number' ? clay(color) : color, x, y, z);
  const group = (...kids) => { const g = new T.Group(); kids.forEach(k => g.add(k)); return g; };
  /** Cylinder along y (rotate it for other axes). */
  const cyl = (r, h, color, x, y, z, seg = 28) => mesh(new T.CylinderGeometry(r, r, h, seg), typeof color === 'number' ? clay(color) : color, x, y, z);
  /** A box stretched between two points (rods, belts, wires). */
  function rodBetween(m, a, b) {
    m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    const d = new T.Vector3().subVectors(b, a);
    m.scale.set(1, d.length(), 1);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
  }
  const unitRod = (r, color) => mesh(new T.CylinderGeometry(r, r, 1, 10), typeof color === 'number' ? clay(color, { roughness: 0.5, metalness: 0.4 }) : color);
  const tube = (points, r, color) => mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'catmullrom', 0.05), 48, r, 10, false), typeof color === 'number' ? clay(color, { roughness: 0.5, metalness: 0.3 }) : color);

  /** A game pawn about 1 unit tall. kind: homem | mulher | crianca | capataz. */
  const PAWN = [[0, 0], [0.44, 0], [0.46, 0.09], [0.31, 0.18], [0.2, 0.52], [0.16, 0.8], [0.28, 0.86], [0.28, 0.93], [0.14, 0.97]];
  const SKIRT = [[0, 0], [0.52, 0], [0.5, 0.1], [0.3, 0.45], [0.2, 0.58], [0.16, 0.8], [0.28, 0.86], [0.28, 0.93], [0.14, 0.97]];
  const pawnGeo = new T.LatheGeometry(PAWN.map(([x, y]) => new T.Vector2(x, y)), 24);
  const skirtGeo = new T.LatheGeometry(SKIRT.map(([x, y]) => new T.Vector2(x, y)), 24);
  const headGeo = new T.SphereGeometry(0.27, 18, 14);
  function pawn(color, size = 0.8) {
    const m = clay(color, { roughness: 0.55 });
    const body = mesh(pawnGeo, m), skirt = mesh(skirtGeo, m), head = mesh(headGeo, m, 0, 1.16, 0);
    skirt.visible = false;
    const hat = group(cyl(0.2, 0.36, C.navy, 0, 1.52, 0, 16), cyl(0.33, 0.04, C.navy, 0, 1.36, 0, 16));
    hat.visible = false;
    const inner = group(body, skirt, head, hat);
    inner.scale.setScalar(size);
    const g = group(inner);
    g.userData = { inner, body, skirt, head, hat, mat: m, size, kind: 'homem', base: color };
    return g;
  }
  function setKind(p, kind) {
    const u = p.userData;
    if (u.kind === kind) return;
    u.kind = kind;
    u.body.visible = kind !== 'mulher';
    u.skirt.visible = kind === 'mulher';
    u.hat.visible = kind === 'capataz';
    u.mat.color.setHex(kind === 'mulher' ? C.apricot : kind === 'crianca' ? 0xE8B98F : kind === 'capataz' ? C.navy : u.base);
    u.inner.scale.setScalar(u.size * (kind === 'crianca' ? 0.66 : 1));
  }
  /** A small label texture (letters on magnets, clock face). */
  function textTexture(text, bg, fg, w = 128, h = 128, font = 'bold 92px Carlito, Calibri, sans-serif') {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
    return t;
  }
  /** Many small particles in one draw call (sparks, steam, smoke, gas). */
  function swarm(scene, n, color, size = 0.06, opts = {}) {
    const mat = new T.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: 0.7 }, opts));
    const im = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), mat, n);
    im.instanceMatrix.setUsage(T.DynamicDrawUsage);
    const col = new T.Color(color);
    for (let i = 0; i < n; i++) im.setColorAt(i, col);
    im.frustumCulled = false;
    scene.add(im);
    const dummy = new T.Object3D(), tmp = new T.Color();
    return {
      im, n, size,
      set(i, x, y, z, s = 1, c) {
        dummy.position.set(x, y, z); dummy.scale.setScalar(size * s); dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        if (c !== undefined) { tmp.set(c); im.setColorAt(i, tmp); }
      },
      hide(i) { dummy.position.set(0, -999, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); },
      done() { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; },
    };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();   // repeatable "random"
  /** Move a value towards a goal at a fixed speed (units per second). */
  const toward = (v, goal, speed, dt) => (Math.abs(goal - v) <= speed * dt ? goal : v + Math.sign(goal - v) * speed * dt);
  const ease = (v, goal, dt, k = 3) => v + (goal - v) * (1 - Math.exp(-dt * k));

  /** Standard lights for a scene: sky, a warm sun with soft shadows. */
  function lights(scene, span = 14) {
    const hemi = new T.HemisphereLight(0xffffff, 0xb8b0a0, 1.9);
    const sun = new T.DirectionalLight(0xfff0dc, 2.2);
    sun.position.set(-8, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 60 });
    sun.shadow.bias = -0.0006;
    sun.shadow.radius = 4;
    scene.add(hemi, sun, sun.target);
    return { hemi, sun };
  }

  /* ---------- Sounds (synthesised with the Web Audio API; no files) ----------
     The on/off choice is shared with the lesson's games (localStorage «jogo-som»). */
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
    function noise(start, dur, freq = 800, vol = 0.15, q = 1, type = 'bandpass') {
      const a = ac(), t = a.currentTime + start, len = Math.ceil(a.sampleRate * dur);
      const buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      src.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(a.destination); src.start(t); src.stop(t + dur + 0.02);
    }
    const SOUNDS = {
      fogo: () => { noise(0, 1.2, 400, 0.08, 0.6, 'lowpass'); noise(0.2, 0.08, 2500, 0.05, 3); noise(0.55, 0.06, 3000, 0.04, 3); },
      ferver: () => { for (let k = 0; k < 8; k++) tone(300 + Math.random() * 500, k * 0.09, 0.07, 'sine', 0.04, 900); },
      vapor: () => { noise(0, 0.5, 4000, 0.07, 0.8, 'highpass'); },
      chug: () => { noise(0, 0.12, 900, 0.12, 0.7); },
      apito: () => { tone(740, 0, 0.9, 'triangle', 0.07); tone(932, 0, 0.9, 'triangle', 0.05); },
      clique: () => { noise(0, 0.03, 3000, 0.08, 4); },
      faisca: () => { noise(0, 0.04, 5000, 0.1, 5); tone(2600, 0, 0.05, 'square', 0.03); },
      explosao: () => { noise(0, 0.22, 180, 0.22, 0.8, 'lowpass'); tone(90, 0, 0.18, 'sine', 0.15, 50); },
      escape: () => { noise(0, 0.3, 700, 0.08, 0.6); },
      zumbido: () => { tone(100, 0, 0.8, 'sawtooth', 0.025); tone(200, 0, 0.8, 'sine', 0.02); },
      luz: () => { tone(880, 0, 0.12, 'sine', 0.06, 1320); },
      sino: () => { [0, 0.55, 1.1].forEach(s => { tone(660, s, 0.9, 'sine', 0.09); tone(1320, s, 0.6, 'sine', 0.03); }); },
      maquinas: () => { for (let k = 0; k < 10; k++) noise(k * 0.12, 0.05, 1500 + (k % 3) * 400, 0.05, 3); },
      passos: () => { for (let k = 0; k < 6; k++) noise(k * 0.14, 0.05, 1600, 0.05, 2); },
      apito2: () => { tone(1800, 0, 0.25, 'square', 0.03, 2200); },
      agua: () => { noise(0, 1.4, 600, 0.06, 0.4, 'lowpass'); },
      passaro: () => { tone(2400, 0, 0.08, 'sine', 0.05, 3200); tone(2600, 0.12, 0.1, 'sine', 0.05, 3400); },
      obras: () => { for (let k = 0; k < 3; k++) { noise(0.1 + k * 0.3, 0.07, 2400, 0.12, 3); tone(110, 0.1 + k * 0.3, 0.1, 'triangle', 0.1); } },
      sobe: () => { [523, 659, 784, 1046].forEach((f, k) => tone(f, k * 0.11, 0.22, 'triangle', 0.06)); },
      desce: () => { [784, 659, 523, 392].forEach((f, k) => tone(f, k * 0.12, 0.24, 'triangle', 0.06)); },
    };
    return {
      play(name, delay = 0) {
        if (muted || !SOUNDS[name]) return;
        const now = performance.now();
        if (last[name] && now - last[name] < 120 && !delay) return;    // no pile-ups
        last[name] = now;
        const go = () => { try { SOUNDS[name](); } catch (e) { /* no audio: the picture still works */ } };
        delay ? setTimeout(go, delay) : go();
      },
      get muted() { return muted; },
      toggle() { muted = !muted; try { localStorage.setItem('jogo-som', muted ? 'off' : 'on'); } catch (e) { /* ignore */ } return muted; },
    };
  })();

  /* ======================================================================
     Scenes. Each one: build(S) makes the objects; cam(step, S) gives the
     box to frame (and the direction to look from); frame(S, dt, t, step)
     moves things; labels are added with S.label(); controls (sliders and
     buttons) appear under the picture from a given build on.
     ====================================================================== */
  const SCENES = {};

  /* ---------- 1. The steam locomotive ---------- */
  SCENES['s-ci-vapor'] = {
    bg: 'dia',
    build(S) {
      const sc = S.scene;
      lights(sc, 16);
      sc.add(box(44, 0.2, 12, C.grass, 4, -0.1, 0));
      const RZ = 0.85, WY = 0.8, WR = 0.72, CR = 0.32, ROD = 1.6;
      S.k = { RZ, WY, WR, CR, ROD, W1: -1.2, W2: 0.4 };
      // track: two rails and sleepers that slide when the train moves
      for (const z of [-RZ, RZ]) sc.add(box(25, 0.08, 0.08, C.iron, -5.5, 0.12, z));
      S.sleepers = [];
      for (let i = 0; i < 26; i++) { const s = box(0.22, 0.06, 2.2, 0x7A5C3E, -16 + i * 0.9, 0.05, 0); sc.add(s); S.sleepers.push(s); }
      // scenery posts that slide past (they show that the train is moving)
      S.posts = [];
      for (let i = 0; i < 5; i++) { const p = group(cyl(0.06, 1.8, C.grey, 0, 0.9, 0, 8), box(0.5, 0.08, 0.08, C.grey, 0, 1.75, 0)); p.position.set(-14 + i * 4.6, 0, -2.6); sc.add(p); S.posts.push(p); }
      const loco = new T.Group(); sc.add(loco); S.loco = loco;
      // boiler (cut open: a see-through shell with water and steam inside)
      const BX0 = -1.6, BX1 = 3.0, BY = 1.75, BR = 0.75;
      const shell = mesh(new T.CylinderGeometry(BR, BR, BX1 - BX0, 36, 1, true), glass(C.steel, 0.22), (BX0 + BX1) / 2, BY, 0);
      shell.rotation.z = Math.PI / 2; loco.add(shell);
      const backShell = mesh(new T.CylinderGeometry(BR + 0.01, BR + 0.01, BX1 - BX0, 36, 1, true, Math.PI / 2, Math.PI), clay(0x4B555D, { side: T.BackSide }), (BX0 + BX1) / 2, BY, 0);
      backShell.rotation.z = Math.PI / 2; backShell.rotation.y = 0; loco.add(backShell);
      const water = mesh(new T.CylinderGeometry(BR - 0.04, BR - 0.04, BX1 - BX0 - 0.1, 36, 1, false, Math.PI, Math.PI), glass(C.water, 0.75), (BX0 + BX1) / 2, BY, 0);
      water.rotation.z = Math.PI / 2; loco.add(water); S.water = water;
      for (const x of [BX0, BX1]) { const ring = mesh(new T.TorusGeometry(BR, 0.05, 8, 36), clay(C.iron, { metalness: 0.4, roughness: 0.4 }), x, BY, 0); ring.rotation.y = Math.PI / 2; loco.add(ring); }
      const front = cyl(BR, 0.25, C.iron, BX1 + 0.12, BY, 0); front.rotation.z = Math.PI / 2; loco.add(front);
      const dome = cyl(0.26, 0.4, C.iron, 0.6, BY + BR + 0.1, 0); loco.add(dome);
      const chimney = mesh(new T.CylinderGeometry(0.3, 0.22, 1.0, 20), clay(C.iron), 2.6, BY + BR + 0.4, 0); loco.add(chimney);
      // firebox (open at the front so the fire shows)
      const fb = group(box(1.1, 1.6, 0.08, C.iron, 0, 0, -0.7), box(1.1, 0.08, 1.4, C.iron, 0, 0.8, 0), box(1.1, 0.1, 1.4, C.iron, 0, -0.8, 0), box(0.08, 1.6, 1.4, C.iron, -0.55, 0, 0), mesh(new T.BoxGeometry(1.1, 1.6, 1.4), glass(C.steel, 0.12)));
      fb.position.set(-2.15, 1.45, 0); loco.add(fb);
      S.coals = [];
      for (let i = 0; i < 9; i++) { const c = mesh(new T.IcosahedronGeometry(0.13 + rnd() * 0.06, 0), new T.MeshStandardMaterial({ color: C.coal, emissive: 0xff5a1a, emissiveIntensity: 0, flatShading: true, roughness: 0.9 }), -2.5 + (i % 3) * 0.3, 0.78 + Math.floor(i / 3) * 0.05, -0.35 + Math.floor(i / 3) * 0.32); loco.add(c); S.coals.push(c); }
      S.fireLight = new T.PointLight(0xff7a2a, 0, 6, 1.5); S.fireLight.position.set(-2.15, 1.2, 0.3); loco.add(S.fireLight);
      // cab and tender
      loco.add(box(1.4, 0.12, 1.8, C.navy, -3.3, 2.75, 0), box(0.1, 1.2, 1.7, C.orange, -2.65, 2.1, 0), box(1.4, 0.9, 0.1, C.orange, -3.3, 1.75, -0.85), box(1.4, 0.12, 1.8, C.iron, -3.3, 1.0, 0));
      const driver = pawn(C.apricot, 0.75); driver.position.set(-3.3, 1.06, 0.2); loco.add(driver); S.driver = driver;
      loco.add(box(2.3, 0.9, 1.6, C.orange, -5.3, 1.25, 0), box(2.3, 0.12, 1.7, C.iron, -5.3, 0.78, 0));
      for (let i = 0; i < 12; i++) loco.add(mesh(new T.IcosahedronGeometry(0.18, 0), clay(C.coal, { flatShading: true }), -6.2 + (i % 4) * 0.55, 1.78, -0.45 + Math.floor(i / 4) * 0.45));
      loco.add(box(7.4, 0.18, 1.3, C.iron, -1.2, 0.95, 0));             // frame
      // wheels (two driving wheels on each side, plus the tender's)
      S.wheels = [];
      const wheelGeo = new T.CylinderGeometry(WR, WR, 0.12, 32), wheelMat = clay(C.orange, { roughness: 0.5 });
      const spokes = () => { const g = new T.Group(); for (let k = 0; k < 6; k++) { const s = box(0.06, WR * 1.9, 0.05, C.iron, 0, 0, 0); s.rotation.z = k * Math.PI / 6; g.add(s); } return g; };
      for (const x of [S.k.W1, S.k.W2]) for (const z of [-RZ, RZ]) {
        const w = new T.Group(); const disc = mesh(wheelGeo, wheelMat); disc.rotation.x = Math.PI / 2; w.add(disc);
        const sp = spokes(); sp.position.z = z > 0 ? 0.07 : -0.07; w.add(sp);
        const pin = cyl(0.07, 0.2, C.iron, CR, 0, z > 0 ? 0.1 : -0.1, 10); pin.rotation.x = Math.PI / 2; w.add(pin);
        w.position.set(x, WY, z); loco.add(w); S.wheels.push(w);
      }
      for (const x of [-6.0, -4.6]) for (const z of [-RZ, RZ]) { const w = cyl(0.45, 0.1, C.iron, x, 0.53, z, 24); w.rotation.x = Math.PI / 2; loco.add(w); S.wheels.push(w); }
      // cylinder (see-through), piston, rods
      const CX0 = 2.1, CX1 = 3.1, CY = WY, CZ = RZ + 0.05;
      const cylShell = mesh(new T.CylinderGeometry(0.3, 0.3, CX1 - CX0, 24, 1, true), glass(C.steel, 0.25), (CX0 + CX1) / 2, CY, CZ);
      cylShell.rotation.z = Math.PI / 2; loco.add(cylShell);
      for (const x of [CX0, CX1]) { const cap = cyl(0.31, 0.04, C.iron, x, CY, CZ, 24); cap.rotation.z = Math.PI / 2; loco.add(cap); }
      S.piston = cyl(0.27, 0.12, C.copper, 2.5, CY, CZ, 24); S.piston.rotation.z = Math.PI / 2; loco.add(S.piston);
      S.pistonRod = unitRod(0.05, C.steel); loco.add(S.pistonRod);
      S.conRod = mesh(new T.BoxGeometry(0.12, 1, 0.06), clay(C.steel, { metalness: 0.5, roughness: 0.4 })); loco.add(S.conRod);
      S.coupRod = mesh(new T.BoxGeometry(0.1, 1, 0.05), clay(C.steel, { metalness: 0.5, roughness: 0.4 })); loco.add(S.coupRod);
      S.cross = box(0.18, 0.18, 0.14, C.iron, 0, CY, CZ); loco.add(S.cross);
      // steam pipe from the dome to the cylinder
      S.pipePts = [[0.6, BY + BR + 0.2, 0.25], [1.5, BY + BR + 0.15, 0.6], [2.4, BY + 0.3, CZ], [2.6, CY + 0.3, CZ]];
      loco.add(tube(S.pipePts, 0.07, glass(C.steel, 0.35)));
      S.pipeCurve = new T.CatmullRomCurve3(S.pipePts.map(p => new T.Vector3(...p)));
      // particles: fire sparks, bubbles in the boiler, steam in the pipe, smoke
      S.fire = swarm(sc, 40, 0xffa040, 0.05, { emissive: 0xff7a20, emissiveIntensity: 1.4 });
      S.bub = swarm(sc, 60, 0xffffff, 0.05, { transparent: true, opacity: 0.85 });
      S.steam = swarm(sc, 24, 0xffffff, 0.06, { transparent: true, opacity: 0.9 });
      S.smoke = swarm(sc, 40, 0x9aa1a8, 0.17, { transparent: true, opacity: 0.45, depthWrite: false });
      S.seeds = Array.from({ length: 60 }, () => [rnd(), rnd(), rnd()]);
      // the same engine in a factory (last build): a flywheel and a belt to three machines
      const fx = 12;
      sc.add(box(12.5, 0.1, 5, C.slab, fx + 3.6, 0.03, 0), box(12.5, 4.6, 0.25, C.brick, fx + 3.6, 2.3, -2.4));
      S.fly = new T.Group(); S.fly.position.set(fx, 1.6, 0);
      const flyDisc = mesh(new T.TorusGeometry(1.2, 0.12, 12, 40), clay(C.iron, { metalness: 0.4, roughness: 0.4 })); S.fly.add(flyDisc);
      for (let k = 0; k < 6; k++) { const s = box(0.08, 2.3, 0.08, C.iron); s.rotation.z = k * Math.PI / 6; S.fly.add(s); }
      sc.add(S.fly);
      sc.add(box(0.5, 1.4, 0.6, C.iron, fx, 0.7, -0.5), box(1.4, 0.8, 1.2, C.navy, fx - 2.2, 0.4, -0.2), cyl(0.5, 1.6, C.steel, fx - 2.2, 1.3, -0.2));
      S.shaft = cyl(0.07, 9, C.steel, fx + 4, 3.6, 0, 10); S.shaft.rotation.z = Math.PI / 2; sc.add(S.shaft);
      const belt1 = unitRod(0.04, C.navy); rodBetween(belt1, new T.Vector3(fx + 1.2, 1.6, 0.15), new T.Vector3(fx + 0.4, 3.6, 0.15)); sc.add(belt1);
      S.mach = [];
      for (let k = 0; k < 3; k++) {
        const mx = fx + 2.6 + k * 2.2;
        sc.add(box(1.5, 0.9, 0.9, C.blue, mx, 0.45, 0), unitRodAt(0.03, C.navy, [mx, 3.6, 0], [mx, 0.95, 0]));
        const sp = cyl(0.18, 1.2, C.cream, mx, 1.05, 0, 14); sp.rotation.z = Math.PI / 2; sc.add(sp); S.mach.push(sp);
      }
      function unitRodAt(r, c, a, b) { const m = unitRod(r, c); rodBetween(m, new T.Vector3(...a), new T.Vector3(...b)); return m; }
      S.theta = 0; S.speed = 0; S.travel = 0; S.boil = 0; S.heat = 0;
      // labels
      S.label('Fornalha: arde o carvão', 'i3d-nota', [-2.15, 2.4, 0.7], 0, st => st >= 1 && st <= 4);
      S.label('Caldeira: a água ferve', 'i3d-nota', [0.2, BY + BR + 0.25, 0.4], 0, st => st >= 2 && st <= 4);
      S.label('Vapor sob pressão', 'i3d-nota', [1.6, BY + BR + 0.35, 0.6], 0, st => st >= 2 && st <= 3);
      S.label('Cilindro e pistão', 'i3d-nota i3d-forte', [2.6, CY + 0.55, CZ + 0.2], 0, st => st === 3);
      S.label('Biela', 'i3d-nota', S.conRod, 0.2, st => st === 3);
      S.label('Roda', 'i3d-nota', [S.k.W2, WY - WR - 0.15, RZ + 0.2], 0, st => st === 3);
      S.label('Chaminé', 'i3d-nota', [2.6, BY + BR + 1.1, 0], 0, st => st === 4);
      S.label('Máquina a vapor fixa', 'i3d-nota i3d-forte', [fx - 1.2, 3.2, 0.5], 0, st => st >= 5);
      S.label('Veio e correias', 'i3d-nota', [fx + 4, 4.0, 0], 0, st => st >= 5);
      S.label('Máquinas de fiar', 'i3d-nota', [fx + 4.8, 1.7, 0.4], 0, st => st >= 5);
    },
    cam(step) {
      if (step === 0) return { box: [-7, 0, -1.5, 3.6, 3.2, 1.5], dir: [0.25, 0.32, 1] };
      if (step === 1) return { box: [-3.4, 0.4, -1, -0.8, 3.0, 1.2], dir: [0.15, 0.25, 1] };
      if (step === 2) return { box: [-2.8, 0.6, -1, 3.4, 3.4, 1.2], dir: [0.1, 0.3, 1] };
      if (step === 3) return { box: [-2.2, -0.1, -0.6, 3.4, 3.0, 1.4], dir: [0.12, 0.18, 1] };
      if (step === 4) return { box: [-7.2, 0, -1.5, 3.8, 4.4, 1.5], dir: [0.3, 0.3, 1] };
      return { box: [9, 0, -1.5, 19.8, 4.4, 1.5], dir: [-0.1, 0.3, 1] };
    },
    frame(S, dt, t, step) {
      const k = S.k;
      S.heat = ease(S.heat, step >= 1 ? 1 : 0, dt, 1.5);
      S.boil = ease(S.boil, step >= 2 ? 1 : 0, dt, 1.2);
      const targetSpeed = step >= 3 ? (step === 3 ? 1.1 : step === 4 ? 4.2 : 3) : 0;   // radians per second
      S.speed = ease(S.speed, targetSpeed, dt, 1.4);
      S.theta += S.speed * dt;
      const moving = step === 4 ? S.speed * k.WR : 0;
      S.travel = ease(S.travel, moving, dt, 2);
      // fire
      S.coals.forEach((c, i) => { c.material.emissiveIntensity = S.heat * (0.7 + 0.35 * Math.sin(t * 7 + i * 1.7)); });
      S.fireLight.intensity = S.heat * (4 + Math.sin(t * 11) * 0.8);
      for (let i = 0; i < S.fire.n; i++) {
        const sd = S.seeds[i], ph = (t * 0.9 + sd[0]) % 1;
        if (S.heat < 0.05) { S.fire.hide(i); continue; }
        S.fire.set(i, -2.55 + sd[1] * 0.8, 0.85 + ph * 1.2, -0.45 + sd[2] * 0.9, (1 - ph) * S.heat * 1.4);
      }
      S.fire.done();
      // boiling: bubbles rise from the water surface into the upper half
      const BY = 1.75;
      for (let i = 0; i < S.bub.n; i++) {
        const sd = S.seeds[i], ph = (t * (0.5 + sd[2] * 0.5) + sd[0]) % 1;
        if (S.boil < 0.05) { S.bub.hide(i); continue; }
        const x = -1.4 + sd[1] * 4.2, y = BY - 0.55 + ph * 1.15, z = (sd[2] - 0.5) * 0.9;
        S.bub.set(i, x, y, z, S.boil * (y < BY ? 0.6 : 1.1));
      }
      S.bub.done();
      // steam along the pipe (when the piston works)
      const flow = clamp(S.speed / 1.1);
      for (let i = 0; i < S.steam.n; i++) {
        if (flow < 0.05) { S.steam.hide(i); continue; }
        const p = S.pipeCurve.getPoint((t * 0.8 + i / S.steam.n) % 1);
        S.steam.set(i, p.x + S.loco.position.x, p.y, p.z, flow);
      }
      S.steam.done();
      // smoke from the chimney, blown back when the train moves
      for (let i = 0; i < S.smoke.n; i++) {
        const sd = S.seeds[i], ph = (t * 0.35 + sd[0]) % 1;
        const amount = step >= 4 && step < 5 ? 1 : S.heat * 0.35;
        if (amount < 0.05) { S.smoke.hide(i); continue; }
        S.smoke.set(i, 2.6 - ph * (0.6 + S.travel * 1.6) + (sd[1] - 0.5) * 0.4, 3.4 + ph * 2.2, (sd[2] - 0.5) * 0.6 * (1 + ph), (0.6 + ph * 1.6) * amount);
      }
      S.smoke.done();
      // crank, piston and rods (front side of the engine)
      const th = S.theta, z = k.RZ + 0.05;
      const pin2 = new T.Vector3(k.W2 + k.CR * Math.cos(th), k.WY + k.CR * Math.sin(th), z + 0.13);
      const pin1 = new T.Vector3(k.W1 + k.CR * Math.cos(th), k.WY + k.CR * Math.sin(th), z + 0.13);
      const crossX = pin2.x + Math.sqrt(k.ROD * k.ROD - Math.pow(pin2.y - k.WY, 2));
      const cross = new T.Vector3(crossX, k.WY, z + 0.13);
      S.cross.position.set(crossX, k.WY, z);
      rodBetween(S.conRod, pin2, cross); S.conRod.scale.x = 1; S.conRod.scale.z = 1;
      rodBetween(S.coupRod, pin1, pin2);
      S.piston.position.x = crossX + 0.6;
      rodBetween(S.pistonRod, new T.Vector3(crossX, k.WY, z), new T.Vector3(crossX + 0.6, k.WY, z));
      S.wheels.forEach((w, i) => { if (i < 4) w.rotation.z = th; else w.rotation.y = th * 1.6; });
      // the world slides past when the train runs
      for (const s of S.sleepers) { s.position.x -= S.travel * dt; if (s.position.x < -16) s.position.x += 23.4; }
      for (const p of S.posts) { p.position.x -= S.travel * dt; if (p.position.x < -16) p.position.x += 23; }
      // the factory engine (last build)
      const f = step >= 5 ? 1 : 0;
      S.fly.rotation.z = -th * f * 0.8;
      S.shaft.rotation.x = th * f * 2;
      S.mach.forEach(m => { m.rotation.x = th * f * 5; });
      // sounds: a chug every half turn when running
      if (S.speed > 0.6) { const half = Math.floor(th / Math.PI); if (half !== S.lastHalf) { S.lastHalf = half; SOM.play(step === 4 ? 'chug' : 'vapor'); } }
    },
    onStep(S, step, prev) {
      if (step === 1 && prev < 1) SOM.play('fogo');
      if (step === 2 && prev < 2) SOM.play('ferver');
      if (step === 4 && prev < 4) SOM.play('apito');
    },
    readout(S, step) {
      if (step < 2 || step >= 5) return '';
      const p = Math.round(S.boil * 100);
      return `<span>Pressão do vapor <i class="i3d-barra-mini"><b style="width:${p}%"></b></i></span>` + (step >= 3 ? `<span>Rodas: <b>${(S.speed / (2 * Math.PI)).toFixed(1).replace('.', ',')}</b> voltas por segundo</span>` : '');
    },
  };

  /* ---------- 2. The four-stroke engine ---------- */
  const STROKES = ['Admissão', 'Compressão', 'Explosão', 'Escape'];
  SCENES['s-ci-motor'] = {
    bg: 'dia',
    build(S) {
      const sc = S.scene;
      lights(sc, 8);
      const R = 1, CR = 0.9, ROD = 2.6, HEAD = 4.3;
      S.k = { R, CR, ROD, HEAD };
      sc.add(box(9, 0.2, 6, C.slab, 0, -1.6, 0));
      // crankcase (see-through) and cylinder walls (see-through)
      sc.add(mesh(new T.BoxGeometry(3.2, 2.6, 2.2), glass(C.grey, 0.12), 0, -0.3, 0));
      const walls = mesh(new T.CylinderGeometry(R + 0.04, R + 0.04, 2.8, 40, 1, true), glass(C.steel, 0.2), 0, HEAD - 1.4, 0); sc.add(walls);
      const backWall = mesh(new T.CylinderGeometry(R + 0.06, R + 0.06, 2.8, 40, 1, true, Math.PI / 2, Math.PI), clay(0x5B656D, { side: T.BackSide }), 0, HEAD - 1.4, 0); sc.add(backWall);
      for (const y of [HEAD - 2.8, HEAD]) { const r = mesh(new T.TorusGeometry(R + 0.05, 0.05, 8, 40), clay(C.iron, { metalness: 0.4 }), 0, y, 0); r.rotation.x = Math.PI / 2; sc.add(r); }
      sc.add(box(2.6, 0.6, 2.2, C.iron, 0, HEAD + 0.3, 0));
      // ports, valves, spark plug
      sc.add(tube([[-0.5, HEAD + 0.3, 0], [-1.1, HEAD + 0.8, 0], [-2.6, HEAD + 1.2, 0]], 0.28, glass(C.blue, 0.3)));
      sc.add(tube([[0.5, HEAD + 0.3, 0], [1.1, HEAD + 0.8, 0], [2.6, HEAD + 1.2, 0]], 0.28, glass(C.grey, 0.3)));
      const valve = color => group(cyl(0.3, 0.06, color, 0, 0, 0, 20), cyl(0.05, 1.2, C.steel, 0, 0.6, 0, 8));
      S.vIn = valve(C.blue); S.vIn.position.set(-0.5, HEAD - 0.03, 0); sc.add(S.vIn);
      S.vEx = valve(C.grey); S.vEx.position.set(0.5, HEAD - 0.03, 0); sc.add(S.vEx);
      S.plug = group(cyl(0.12, 0.7, C.cream, 0, 0.35, 0, 12), cyl(0.05, 0.15, C.steel, 0, -0.05, 0, 8));
      S.plug.position.set(0, HEAD, 0); sc.add(S.plug);
      S.flash = mesh(new T.SphereGeometry(0.22, 16, 12), new T.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0 }), 0, HEAD - 0.15, 0); sc.add(S.flash);
      S.flashLight = new T.PointLight(0xffc060, 0, 6, 1.5); S.flashLight.position.set(0, HEAD - 0.4, 0.4); sc.add(S.flashLight);
      // piston, rod, crankshaft
      S.piston = group(cyl(R - 0.03, 0.8, C.copper, 0, 0, 0, 36), cyl(R - 0.01, 0.05, C.iron, 0, 0.25, 0, 36), cyl(R - 0.01, 0.05, C.iron, 0, 0.12, 0, 36));
      sc.add(S.piston);
      S.rod = mesh(new T.BoxGeometry(0.22, 1, 0.16), clay(C.steel, { metalness: 0.5, roughness: 0.35 })); sc.add(S.rod);
      const shaft = cyl(0.16, 3.0, C.steel, 0, 0, 0, 16); shaft.rotation.x = Math.PI / 2; sc.add(shaft);
      S.crank = new T.Group(); sc.add(S.crank);
      const web = box(0.5, 1.3, 0.18, C.iron, 0, 0.3, 0.3); S.crank.add(web);
      const web2 = box(0.5, 1.3, 0.18, C.iron, 0, 0.3, -0.3); S.crank.add(web2);
      const cw = mesh(new T.CylinderGeometry(0.75, 0.75, 0.5, 24, 1, false, Math.PI / 2, Math.PI), clay(C.iron)); cw.rotation.x = Math.PI / 2; cw.position.y = -0.1; S.crank.add(cw);
      const cpin = cyl(0.13, 0.7, C.steel, 0, CR, 0, 12); cpin.rotation.x = Math.PI / 2; S.crank.add(cpin);
      // a flywheel at the back makes the rotation easy to see
      S.fw = group(mesh(new T.TorusGeometry(1.2, 0.1, 10, 40), clay(C.orange, { roughness: 0.5 })));
      for (let k = 0; k < 4; k++) { const s = box(0.08, 2.4, 0.08, C.orange); s.rotation.z = k * Math.PI / 4; S.fw.add(s); }
      S.fw.position.set(0, 0, -1.7); sc.add(S.fw);
      // gas particles
      S.gas = swarm(sc, 90, C.blue, 0.06, { emissive: 0x000000 });
      S.seeds = Array.from({ length: 90 }, () => [rnd() * Math.PI * 2, Math.sqrt(rnd()) * 0.86, rnd(), rnd()]);
      S.phi = 0; S.diesel = false;
      S.label('Válvula de admissão', 'i3d-nota', [-1.6, HEAD + 1.3, 0], 0, st => st >= 1);
      S.label('Válvula de escape', 'i3d-nota', [1.6, HEAD + 1.3, 0], 0, st => st >= 1);
      S.plugLabel = S.label('Vela: faz a faísca', 'i3d-nota i3d-forte', [0, HEAD + 0.9, 0.3], 0, st => st >= 2);
      S.label('Pistão', 'i3d-nota', S.piston, 0.9, st => st >= 0);
      S.label('Biela', 'i3d-nota', S.rod, 0.0, st => st >= 1);
      S.label('Cambota: o vaivém vira rotação', 'i3d-nota', [1.4, -1.2, 0.9], 0, st => st >= 4);
    },
    controls: [
      { type: 'slider', key: 'rpm', label: 'Rapidez do motor', min: 20, max: 300, step: 10, value: 60, from: 5, fmt: v => v + ' rotações por minuto' },
      { type: 'button', key: 'diesel', t: 'Motor Diesel (sem vela)', from: 5, f: S => { S.diesel = !S.diesel; } },
    ],
    cam(step) {
      if (step >= 5) return { box: [-2.8, -1.4, -2.2, 2.8, 6.5, 1.2], dir: [0.45, 0.2, 1] };
      return { box: [-2.8, -1.4, -1.2, 2.8, 6.5, 1.2], dir: [0.35, 0.18, 1] };
    },
    frame(S, dt, t, step) {
      const k = S.k;
      const goal = [0, 180, 360, 540, 720][Math.min(step, 4)];
      if (step >= 5) S.phi += (S.user.rpm || 60) * 6 * dt;          // degrees per second
      else {
        if (S.phi > 720) S.phi = 720;
        S.phi = toward(S.phi, goal, 130, dt);
      }
      const phiAbs = S.phi;
      const phi = ((phiAbs % 720) + 720) % 720;
      const rad = phi * Math.PI / 180;
      // crank and piston
      const px = k.CR * Math.sin(rad), py = k.CR * Math.cos(rad);
      const pinY = py + Math.sqrt(k.ROD * k.ROD - px * px);
      S.crank.rotation.z = -rad;
      S.fw.rotation.z = -rad;
      S.piston.position.set(0, pinY, 0);
      rodBetween(S.rod, new T.Vector3(px, py, 0.05), new T.Vector3(0, pinY, 0.05)); S.rod.scale.x = 1; S.rod.scale.z = 1;
      const top = pinY + 0.4;
      // valves: intake open in the first stroke, exhaust in the fourth
      const lift = (a, b) => (phi > a && phi < b ? Math.sin((phi - a) / (b - a) * Math.PI) * 0.32 : 0);
      S.vIn.position.y = k.HEAD - 0.03 - lift(0, 180);
      S.vEx.position.y = k.HEAD - 0.03 - lift(540, 720);
      // spark (petrol) or self-ignition (Diesel) at the start of the third stroke
      const fire = phi > 360.5 && phi < 424 ? 1 - (phi - 360) / 64 : 0;
      S.flash.material.opacity = S.diesel ? 0 : fire;
      S.flash.scale.setScalar(0.6 + fire);
      S.flashLight.intensity = fire * 8;
      S.plug.children[0].material.color.setHex(S.diesel ? C.grey : C.cream);
      S.plugLabel.el.textContent = S.diesel ? 'Injetor: entra o gasóleo' : 'Vela: faz a faísca';
      // a boundary belongs to the stroke that just ended (so the end of build 2 is still «compression»)
      const phiB = ((phiAbs - 1e-3) % 720 + 720) % 720, stroke = Math.min(3, Math.floor(phiB / 180)), p = clamp((phiB % 180) / 180 + (phiAbs < 1e-3 ? 0 : 0));
      const N = S.gas.n, H = k.HEAD - top;
      const inPort = new T.Vector3(-2.6, k.HEAD + 1.2, 0), exPort = new T.Vector3(2.6, k.HEAD + 1.2, 0);
      const valveIn = new T.Vector3(-0.5, k.HEAD - 0.1, 0), valveEx = new T.Vector3(0.5, k.HEAD - 0.1, 0);
      const cFuel = S.diesel ? 0xBFD3E6 : C.blue;
      const resting = S.phi < 1e-3;
      for (let i = 0; i < N; i++) {
        const [a, r, h] = S.seeds[i];
        const slot = new T.Vector3(r * Math.cos(a), top + 0.05 + h * Math.max(0.05, H - 0.12), r * Math.sin(a) * 0.9);
        const order = i / N * 0.85;
        if (resting) { S.gas.hide(i); continue; }
        if (stroke === 0) {
          const e = clamp((p - order) / 0.15);
          if (e <= 0) { S.gas.hide(i); continue; }
          const pos = e < 0.5 ? inPort.clone().lerp(valveIn, e * 2) : valveIn.clone().lerp(slot, (e - 0.5) * 2);
          S.gas.set(i, pos.x, pos.y, pos.z, 1, cFuel);
        } else if (stroke === 1) {
          let c = cFuel;
          if (S.diesel && p > 0.8 && i % 4 === 0) c = 0xF0A673;                // fuel sprayed in at the end
          S.gas.set(i, slot.x, slot.y, slot.z, 1 + p * 0.25, c);
        } else if (stroke === 2) {
          const c = new T.Color(0xFFD27A).lerp(new T.Color(C.apricot), clamp(p * 2)).lerp(new T.Color(0x8A8F94), clamp(p * 1.4 - 0.4));
          S.gas.set(i, slot.x, slot.y, slot.z, 1.3 - p * 0.3, c.getHex());
        } else {
          const e = clamp((p - order) / 0.15);
          const pos = e <= 0 ? slot : e < 0.5 ? slot.clone().lerp(valveEx, e * 2) : valveEx.clone().lerp(exPort, (e - 0.5) * 2);
          if (e >= 1) { S.gas.hide(i); continue; }
          S.gas.set(i, pos.x, pos.y, pos.z, 1, 0x8A8F94);
        }
      }
      S.gas.done();
      // sounds and the stroke shown under the picture
      if (stroke !== S.lastStroke) {
        if (S.lastStroke !== undefined && step >= 5) { if (stroke === 2) SOM.play('explosao'); }
        else if (S.lastStroke !== undefined && Math.abs(S.phi - goal) > 1) {
          if (stroke === 2) SOM.play(S.diesel ? 'explosao' : 'faisca'), SOM.play('explosao', 30);
          else if (stroke === 3) SOM.play('escape');
          else SOM.play('clique');
        }
        S.lastStroke = stroke;
      }
      S.stroke = resting ? -1 : stroke;
    },
    readout(S, step) {
      if (step === 0) return '<span>Quatro tempos: a cada duas voltas, uma explosão.</span>';
      return '<span class="i3d-tempos">' + STROKES.map((s, i) => `<b class="${i === S.stroke ? 'agora' : ''}">${i + 1} ${s}</b>`).join('') + '</span>';
    },
  };

  /* ---------- 3. Turbine and dynamo ---------- */
  SCENES['s-ci-dinamo'] = {
    bg: 'dia',
    build(S) {
      const sc = S.scene;
      lights(sc, 12);
      sc.add(box(24, 0.2, 8, C.slab, 3, -0.1, 0));
      const CY = 1.8;
      // the magnet: a C shape with the north pole above and the south pole below
      const nTex = textTexture('N', hex(C.orange), '#ffffff'), sTex = textTexture('S', hex(C.blue), '#ffffff');
      const poleMat = (c, tex) => [clay(c), clay(c), clay(c), clay(c), new T.MeshStandardMaterial({ map: tex, roughness: 0.8 }), clay(c)];
      sc.add(mesh(new T.BoxGeometry(2.2, 0.8, 2.0), poleMat(C.orange, nTex), 0, CY + 1.5, 0));
      sc.add(mesh(new T.BoxGeometry(2.2, 0.8, 2.0), poleMat(C.blue, sTex), 0, CY - 1.5, 0));
      sc.add(box(2.2, 3.8, 0.5, C.grey, 0, CY, -1.25));
      // field lines from N to S
      S.field = [];
      for (const x of [-0.75, 0, 0.75]) for (const z of [-0.8]) {
        const l = group(cyl(0.015, 2.2, glow(C.apricot, 0.3), 0, 0, 0, 6), mesh(new T.ConeGeometry(0.07, 0.18, 8), glow(C.apricot, 0.3), 0, -1.1, 0));
        l.children[1].rotation.x = Math.PI;
        l.position.set(x, CY, z); sc.add(l); S.field.push(l);
      }
      // the coil on a shaft along x
      S.coilGroup = new T.Group(); S.coilGroup.position.set(0, CY, 0); sc.add(S.coilGroup);
      S.loops = [];
      const cu = clay(0xD08A4A, { metalness: 0.5, roughness: 0.35, emissive: 0x3A1A00 });
      for (let n = 0; n < 3; n++) {
        const w = 1.5 - n * 0.12, h = 1.1 - n * 0.12, r = 0.05;
        const g = group(mesh(new T.BoxGeometry(w, r * 2, r * 2), cu, 0, h / 2, 0), mesh(new T.BoxGeometry(w, r * 2, r * 2), cu, 0, -h / 2, 0), mesh(new T.BoxGeometry(r * 2, h, r * 2), cu, -w / 2, 0, 0), mesh(new T.BoxGeometry(r * 2, h, r * 2), cu, w / 2, 0, 0));
        g.position.x = n * 0.04; S.coilGroup.add(g); S.loops.push(g);
      }
      const shaft = cyl(0.06, 7.2, C.steel, -1.5, CY, 0, 12); shaft.rotation.z = Math.PI / 2; sc.add(shaft); S.shaft = shaft;
      // slip rings and brushes
      for (const x of [1.3, 1.6]) { const r = mesh(new T.TorusGeometry(0.16, 0.05, 8, 24), cu, x, CY, 0); r.rotation.y = Math.PI / 2; sc.add(r); }
      sc.add(box(0.12, 0.5, 0.12, C.coal, 1.3, CY - 0.42, 0), box(0.12, 0.5, 0.12, C.coal, 1.6, CY - 0.42, 0));
      // turbine wheel with blades, and the jet that turns it
      S.turb = new T.Group(); S.turb.position.set(-4.4, CY, 0); sc.add(S.turb);
      S.turb.add(mesh(new T.CylinderGeometry(0.35, 0.35, 0.4, 20), clay(C.navy), 0, 0, 0)); S.turb.children[0].rotation.z = Math.PI / 2;
      for (let b = 0; b < 12; b++) { const bl = box(0.32, 1.1, 0.12, C.blue, 0, 0, 0); bl.position.set(0, Math.cos(b * Math.PI / 6) * 0.8, Math.sin(b * Math.PI / 6) * 0.8); bl.rotation.x = b * Math.PI / 6; bl.rotation.y = 0.5; S.turb.add(bl); }
      sc.add(tube([[-4.4, CY + 3.4, 1.6], [-4.4, CY + 2.6, 1.4], [-4.4, CY + 1.6, 1.0]], 0.16, C.grey));
      S.jet = swarm(sc, 50, 0xE8F2FA, 0.07, { transparent: true, opacity: 0.85 });
      S.seeds = Array.from({ length: 60 }, () => [rnd(), rnd(), rnd()]);
      // wires to a lamp, and the current as dots that go back and forth
      const wireA = [[1.3, CY - 0.7, 0.05], [1.3, 0.1, 0.4], [3.5, 0.1, 0.4], [4.6, 0.1, 0.4], [4.6, 1.1, 0.12]];
      const wireB = [[1.6, CY - 0.7, -0.05], [1.6, 0.1, -0.4], [3.5, 0.1, -0.4], [4.9, 0.1, -0.4], [4.9, 1.1, -0.12]];
      S.wires = [wireA, wireB].map(w => { sc.add(tube(w, 0.035, C.coal)); return new T.CatmullRomCurve3(w.map(p => new T.Vector3(...p))); });
      S.dots = swarm(sc, 36, 0xFFE08A, 0.055, { emissive: 0xFFC040, emissiveIntensity: 1.2 });
      sc.add(cyl(0.35, 0.3, C.navy, 4.75, 0.15, 0, 20), cyl(0.06, 1.0, C.steel, 4.75, 0.7, 0, 8));
      S.bulb = mesh(new T.SphereGeometry(0.42, 24, 18), new T.MeshStandardMaterial({ color: 0xFFF6E0, emissive: 0xFFC860, emissiveIntensity: 0, transparent: true, opacity: 0.9, roughness: 0.2 }), 4.75, 1.55, 0);
      sc.add(S.bulb);
      S.lampLight = new T.PointLight(0xFFC860, 0, 7, 1.6); S.lampLight.position.set(4.75, 1.6, 0.6); sc.add(S.lampLight);
      // a small town that lights up (last build)
      S.windows = [];
      for (let i = 0; i < 6; i++) {
        const x = 7.5 + (i % 3) * 2.2, z = -1.4 + Math.floor(i / 3) * 2.6;
        sc.add(box(1.4, 1.1, 1.2, C.cream, x, 0.55, z));
        const roof = mesh(new T.ConeGeometry(1.05, 0.7, 4), clay(C.orange), x, 1.45, z); roof.rotation.y = Math.PI / 4; sc.add(roof);
        const w = mesh(new T.PlaneGeometry(0.4, 0.4), new T.MeshStandardMaterial({ color: 0x3B434A, emissive: 0xFFC860, emissiveIntensity: 0 }), x, 0.6, z + 0.61); sc.add(w); S.windows.push(w);
      }
      sc.add(tube([[4.9, 0.1, -0.4], [6.2, 0.1, -0.4], [6.4, 1.6, 0], [12.4, 1.6, 0]], 0.03, C.coal));
      for (const x of [6.4, 9.4, 12.4]) sc.add(cyl(0.05, 1.6, 0x7A5C3E, x, 0.8, 0, 8));
      S.angle = 0; S.omega = 0;
      S.label('Íman: polo norte', 'i3d-nota', [1.4, CY + 1.9, 0.9], 0, st => st >= 0);
      S.label('Íman: polo sul', 'i3d-nota', [1.4, CY - 1.95, 0.9], 0, st => st >= 0);
      S.label('Campo magnético', 'i3d-nota', [-0.9, CY + 0.95, 0.6], 0, st => st === 0);
      S.label('Bobina (fio de cobre enrolado)', 'i3d-nota i3d-forte', [0, CY - 0.75, 0.9], 0, st => st <= 2);
      S.label('Turbina: a água ou o vapor fazem-na girar', 'i3d-nota i3d-forte', [-4.4, CY + 1.4, 0.4], 0, st => st >= 1 && st <= 3);
      S.label('Lâmpada', 'i3d-nota', [4.75, 2.15, 0], 0, st => st >= 2 && st <= 3);
      S.label('Corrente elétrica: vai e vem', 'i3d-nota', [3.0, 0.35, 0.7], 0, st => st >= 2 && st <= 3);
      S.label('A cidade iluminada', 'i3d-nota i3d-forte', [9.7, 2.3, 0], 0, st => st >= 4);
    },
    controls: [
      { type: 'slider', key: 'voltas', label: 'Rapidez da turbina', min: 0, max: 10, step: 0.5, value: 3, from: 3, fmt: v => String(v).replace('.', ',') + ' voltas por segundo' },
      { type: 'slider', key: 'espiras', label: 'Voltas de fio na bobina', min: 1, max: 3, step: 1, value: 3, from: 3, fmt: v => v + (v === 1 ? ' volta' : ' voltas') },
    ],
    cam(step) {
      if (step === 0) return { box: [-1.6, 0, -1.5, 1.8, 3.8, 1.2], dir: [0.5, 0.35, 1] };
      if (step === 1) return { box: [-5.6, 0, -1.5, 1.8, 5.4, 1.6], dir: [0.3, 0.3, 1] };
      if (step <= 3) return { box: [-5.6, 0, -1.5, 5.4, 4.6, 1.6], dir: [0.2, 0.35, 1] };
      return { box: [-5.6, 0, -2.4, 12.6, 4.6, 2.2], dir: [0.15, 0.55, 1] };
    },
    frame(S, dt, t, step) {
      const turns = step >= 3 ? (S.user.voltas ?? 3) : step >= 1 ? (step === 1 ? 1 : 2.5) : 0;    // turns per second
      const loops = step >= 3 ? (S.user.espiras ?? 3) : 3;
      S.omega = ease(S.omega, turns * 2 * Math.PI, dt, 1.6);
      S.angle += S.omega * dt;
      S.coilGroup.rotation.x = S.angle;
      S.turb.rotation.x = S.angle;
      S.shaft.rotation.x = S.angle;
      S.loops.forEach((l, i) => { l.visible = i < loops; });
      // voltage amplitude ∝ N·ω (B and A fixed); brightness ∝ voltage²
      const V = (S.omega / (2 * Math.PI)) * loops / 30;           // 1 at 10 turns/s and 3 loops
      const on = step >= 2 ? 1 : 0;
      const bright = on * clamp(V * V * 4, 0, 1.6);
      S.bulb.material.emissiveIntensity = bright * 2.2;
      S.lampLight.intensity = bright * 6;
      S.windows.forEach(w => { w.material.emissiveIntensity = step >= 4 ? bright * 1.6 : 0; });
      S.field.forEach(f => { f.children.forEach(c => { c.material.emissiveIntensity = 0.3 + 0.2 * Math.sin(t * 3); }); });
      // jet of water/steam hitting the blades
      for (let i = 0; i < S.jet.n; i++) {
        const sd = S.seeds[i], ph = (t * 1.6 + sd[0]) % 1;
        if (step < 1) { S.jet.hide(i); continue; }
        const y = 1.8 + 1.6 - ph * 2.6, z = 1.0 - ph * 1.1 + (sd[1] - 0.5) * 0.15;
        S.jet.set(i, -4.4 + (sd[2] - 0.5) * 0.25, y, z, 1 - ph * 0.4);
      }
      S.jet.done();
      // alternating current: the dots swing along the wires
      const swing = Math.sin(S.angle) * 0.06 * clamp(V * 3);
      for (let i = 0; i < S.dots.n; i++) {
        if (!on || V < 0.01) { S.dots.hide(i); continue; }
        const w = S.wires[i % 2], u = clamp(((Math.floor(i / 2) + 0.5) / (S.dots.n / 2)) + (i % 2 ? -swing : swing), 0, 1);
        const p = w.getPoint(u);
        S.dots.set(i, p.x, p.y, p.z, 1);
      }
      S.dots.done();
      S.V = V; S.bright = bright;
      if (S.omega > 2 && Math.floor(t * 1.2) !== S.lastHum) { S.lastHum = Math.floor(t * 1.2); if (step >= 1) SOM.play('zumbido'); }
    },
    onStep(S, step, prev) { if (step === 2 && prev < 2) SOM.play('luz'); if (step === 4 && prev < 4) SOM.play('sobe'); },
    readout(S, step) {
      if (step < 2) return '';
      const pct = Math.round(clamp(S.V) * 100);
      const din = S.el.querySelector('[data-din]');
      if (din && step >= 3) {                                // the equation under the picture, with today's numbers
        const n = S.user.espiras ?? 3, w = S.user.voltas ?? 3;
        const html = `Agora: <span class="v c2">N</span> = ${n} ${n === 1 ? 'volta' : 'voltas'} de fio, <span class="v c5">ω</span> = ${String(w).replace('.', ',')} voltas por segundo → tensão a <b>${pct} %</b> da máxima.`;
        if (din._h !== html) { din.innerHTML = html; din._h = html; }
      }
      return `<span>Tensão (em relação ao máximo) <i class="i3d-barra-mini"><b style="width:${pct}%"></b></i> <b>${pct} %</b></span>`;
    },
  };

  /* ---------- 4. The cotton mill, by day and by night ---------- */
  SCENES['s-ci-fabrica'] = {
    bg: 'fabrica',
    build(S) {
      const sc = S.scene;
      const L = lights(sc, 18); S.L = L;
      S.bgDay = new T.Color(0xEFF3F6); S.bgNight = new T.Color(0x1B2631);
      sc.add(box(30, 0.2, 14, C.sand, 1, -0.1, 1));
      // canal (the coal arrives by boat)
      sc.add(mesh(new T.BoxGeometry(30, 0.06, 1.8), clay(C.water, { roughness: 0.3 }), 1, 0.02, 4.4));
      const barge = group(box(2.6, 0.35, 1.0, 0x6B4A2E, 0, 0.2, 0));
      for (let i = 0; i < 6; i++) barge.add(mesh(new T.IcosahedronGeometry(0.2, 0), clay(C.coal, { flatShading: true }), -0.9 + i * 0.36, 0.48, (i % 2) * 0.2 - 0.1));
      barge.position.set(-6.5, 0, 4.4); sc.add(barge);
      const FL = [0.2, 1.7, 3.2], X0 = -3, X1 = 7;
      S.FL = FL;
      // the mill: back wall with windows, side walls, floors, iron columns, roof
      sc.add(box(X1 - X0, 4.7, 0.25, C.brick, (X0 + X1) / 2, 2.35, -1.6));
      sc.add(box(0.25, 4.7, 1.7, C.brick, X1 + 0.12, 2.35, -0.75), box(0.25, 4.7, 0.5, C.brick, X1 + 0.12, 2.35, 1.35));
      S.winMat = new T.MeshStandardMaterial({ color: 0x8FA7B8, emissive: 0xFFC060, emissiveIntensity: 0, roughness: 0.4 });
      for (const y of FL) for (let x = X0 + 0.7; x < X1; x += 1.3) sc.add(mesh(new T.PlaneGeometry(0.6, 0.8), S.winMat, x, y + 0.75, -1.46));
      for (const y of FL) sc.add(box(X1 - X0, 0.12, 3.2, 0xCBBFA8, (X0 + X1) / 2, y - 0.06, 0));
      sc.add(box(X1 - X0 + 0.3, 0.2, 3.4, C.navy, (X0 + X1) / 2, 4.75, 0));
      for (const y of FL) for (let x = X0 + 1.25; x < X1; x += 2.5) sc.add(cyl(0.05, 1.38, C.iron, x, y + 0.69, 1.45, 8));
      // external stair on the right
      for (let f = 0; f < 2; f++) {
        const a = new T.Vector3(X1 + 0.75, FL[f], 1.2), b = new T.Vector3(X1 + 0.75, FL[f + 1], -0.9);
        const st = box(0.7, 0.08, 1, C.iron, 0, 0, 0); rodBetween(st, a, b); st.scale.set(1, a.distanceTo(b), 1); sc.add(st);
      }
      // the engine house (steam engine, boiler, coal) on the left
      S.engine = new T.Group(); sc.add(S.engine);
      sc.add(box(2.4, 3.6, 0.25, C.brickD, X0 - 1.2, 1.8, -1.6), box(0.25, 3.6, 3.2, C.brickD, X0 - 2.4, 1.8, 0), box(2.7, 0.2, 3.4, C.navy, X0 - 1.2, 3.7, 0));
      const boiler = cyl(0.55, 1.8, C.iron, X0 - 1.6, 0.75, -0.6, 24); boiler.rotation.x = Math.PI / 2; S.engine.add(boiler);
      S.boilerFire = mesh(new T.SphereGeometry(0.25, 12, 10), glow(0xFF7A2A, 1.2), X0 - 1.6, 0.45, 0.35); S.engine.add(S.boilerFire);
      S.flywheel = group(mesh(new T.TorusGeometry(0.85, 0.09, 10, 32), clay(C.iron, { metalness: 0.4 })));
      for (let k = 0; k < 4; k++) { const s = box(0.06, 1.7, 0.06, C.iron); s.rotation.z = k * Math.PI / 4; S.flywheel.add(s); }
      S.flywheel.position.set(X0 - 0.75, 1.3, 0.6); S.engine.add(S.flywheel);
      S.engine.add(box(0.4, 1.0, 0.5, C.iron, X0 - 0.75, 0.5, 0.6));
      S.coalHeap = new T.Group();
      for (let i = 0; i < 16; i++) S.coalHeap.add(mesh(new T.IcosahedronGeometry(0.2 + rnd() * 0.1, 0), clay(C.coal, { flatShading: true }), -6.6 + rnd() * 1.6, 0.15 + (i > 9 ? 0.25 : 0), 2.2 + rnd() * 1.2));
      S.engine.add(S.coalHeap);
      const chim = mesh(new T.CylinderGeometry(0.3, 0.45, 7.5, 20), clay(C.brick), X0 - 2.0, 3.75, -1.0); sc.add(chim);
      S.smoke = swarm(sc, 40, 0x8A9096, 0.25, { transparent: true, opacity: 0.5, depthWrite: false });
      // vertical and horizontal line shafts
      S.shafts = [];
      for (const y of FL) { const s = cyl(0.05, X1 - X0, C.steel, (X0 + X1) / 2, y + 1.22, -0.6, 8); s.rotation.z = Math.PI / 2; sc.add(s); S.shafts.push(s); }
      sc.add(cyl(0.06, 4.5, C.steel, X0 + 0.1, 2.25, -0.6, 8));
      // machines: five per floor, each with a spinning roller and a belt from the shaft
      S.machines = [];
      const addMachine = (x, f, extra) => {
        const y = FL[f];
        const g = group(box(1.3, 0.55, 0.6, C.blue, 0, 0.28, 0), box(1.3, 0.06, 0.66, C.navy, 0, 0.58, 0));
        const roll = cyl(0.12, 1.2, C.cream, 0, 0.72, 0, 12); roll.rotation.z = Math.PI / 2; g.add(roll);
        const belt = unitRod(0.02, C.navy); g.add(belt);
        rodBetween(belt, new T.Vector3(0.45, 0.6, -0.05), new T.Vector3(0.45, 1.22, -0.6 + 0.3)); belt.position.z -= 0.25;
        g.position.set(x, y, -0.35); sc.add(g);
        const m = { g, roll, x, f, y, extra, speed: 0, slow: 0 };
        S.machines.push(m); return m;
      };
      for (let f = 0; f < 3; f++) for (let i = 0; i < 5; i++) addMachine(X0 + 1 + i * 2, f, false);
      // extra machines where the steam engine was (last build: electric motors)
      S.extraFloor = box(2.3, 0.12, 3.0, 0xCBBFA8, X0 - 1.2, FL[1] - 0.06, 0); S.extraFloor.scale.set(0.001, 1, 1); sc.add(S.extraFloor);
      for (const f of [0, 1]) for (const x of [X0 - 1.85, X0 - 0.55]) { const m = addMachine(x, f, true); m.g.scale.setScalar(0.001); }
      // workers: two shifts (day and night), one per machine
      const waypoints = (m) => {
        const y = m.y, SX = X1 + 0.75;
        const pts = [[9.4, 0.2, 2.2], [SX, 0.2, 2.0]];
        if (m.f === 0) pts.push([SX, 0.2, 0.9]);
        if (m.f >= 1) pts.push([SX, 0.2, 1.2], [SX, FL[1], -0.9]);
        if (m.f >= 2) pts.push([SX, FL[1], 1.2], [SX, FL[2], -0.9]);
        if (m.f >= 1) pts.push([SX, y, 0.9]);
        pts.push([X1 - 0.4, y, 0.9]);
        if (m.extra) pts.push([X0 + 0.3, y, 0.9]);
        pts.push([m.x, y, 0.9], [m.x, y, 0.45]);
        return pts.map(p => new T.Vector3(...p));
      };
      const KINDS = ['mulher', 'crianca', 'mulher', 'homem', 'crianca', 'mulher', 'homem', 'mulher', 'crianca', 'mulher', 'homem', 'mulher', 'crianca', 'mulher', 'homem', 'mulher', 'homem', 'crianca', 'mulher'];
      S.workers = [];
      for (const shift of ['dia', 'noite']) S.machines.forEach((m, i) => {
        const p = pawn(shift === 'dia' ? C.orange : 0x8A3A10, 0.42);
        const path = waypoints(m);
        const outside = new T.Vector3(10 + (i % 5) * 0.45 + (shift === 'noite' ? 2.5 : 0), 0.2, 1.4 + Math.floor(i / 5) * 0.5);
        path.unshift(outside);
        const lens = [0]; for (let k = 1; k < path.length; k++) lens.push(lens[k - 1] + path[k].distanceTo(path[k - 1]));
        p.position.copy(outside); sc.add(p);
        S.workers.push({ p, path, lens, len: lens[lens.length - 1], s: 0, goal: 0, wait: 0, shift, m, i, kind: KINDS[i % KINDS.length] });
      });
      // the overlooker (capataz) with a top hat, on the first floor
      S.boss = pawn(C.navy, 0.46); setKind(S.boss, 'capataz'); S.boss.position.set(13, 0.2, 2.5); sc.add(S.boss);
      S.bossX = 2;
      // clock on the roof (hands turn with the hour)
      const face = mesh(new T.CircleGeometry(0.55, 32), new T.MeshStandardMaterial({ color: C.cream, roughness: 0.7 }), 5.5, 5.55, 0.62);
      sc.add(box(1.4, 1.5, 1.1, C.brick, 5.5, 5.55, 0), face, mesh(new T.ConeGeometry(0.9, 0.6, 4), clay(C.navy), 5.5, 6.6, 0));
      sc.children[sc.children.length - 1].rotation.y = Math.PI / 4;
      for (let h = 0; h < 12; h++) sc.add(box(0.04, 0.1, 0.02, C.navy, 5.5 + Math.sin(h * Math.PI / 6) * 0.45, 5.55 + Math.cos(h * Math.PI / 6) * 0.45, 0.64));
      S.hHand = group(box(0.07, 0.3, 0.02, C.navy, 0, 0.15, 0)); S.hHand.position.set(5.5, 5.55, 0.66); sc.add(S.hHand);
      S.mHand = group(box(0.04, 0.45, 0.02, C.orange, 0, 0.22, 0)); S.mHand.position.set(5.5, 5.55, 0.67); sc.add(S.mHand);
      // lamps inside (gas, then electric)
      S.lamps = FL.map(y => { const l = new T.PointLight(0xFFB050, 0, 9, 1.4); l.position.set(2, y + 1.1, 0.6); sc.add(l); return l; });
      S.flames = [];
      for (const y of FL) for (let x = X0 + 1; x < X1; x += 2) { const fl = mesh(new T.SphereGeometry(0.07, 10, 8), glow(0xFFB050, 0)); fl.position.set(x, y + 1.15, 0.4); sc.add(fl); S.flames.push(fl); }
      S.hour = 5.5; S.prevInside = null;
      S.label('Casa da máquina a vapor', 'i3d-nota i3d-forte', [X0 - 1.2, 4.1, 0.6], 0, st => st === 0 || st === 1);
      S.label('Chaminé', 'i3d-nota', [X0 - 2.0, 7.7, -1.0], 0, st => st === 0);
      S.label('Canal: o carvão chega de barco', 'i3d-nota', [-6.5, 0.9, 4.4], 0, st => st === 0);
      S.label('Pisos de fiação', 'i3d-nota', [2, 4.5, 1.0], 0, st => st === 0);
      S.label('Veio: a máquina move todas as outras', 'i3d-nota', [3.0, FL[2] + 1.45, -0.4], 0, st => st === 1);
      S.label('Relógio e sino', 'i3d-nota i3d-forte', [5.5, 7.1, 0.6], 0, st => st === 2);
      S.bossLabel = S.label('Capataz', 'i3d-pessoa', S.boss, 0.85, st => st >= 2 && st <= 5);
      S.bubble = S.label('Mais depressa!', 'i3d-fala', [0, 0, 0], 0, st => st === 2);
      S.label('Iluminação a gás', 'i3d-nota i3d-forte', [-1, FL[2] + 1.5, 0.6], 0, st => st === 3);
      S.label('Mais máquinas no lugar da máquina a vapor', 'i3d-nota i3d-forte', [X0 - 0.6, 3.1, 1.0], 0, st => st >= 6);
    },
    controls: [
      { type: 'slider', key: 'hora', label: 'Hora do dia', min: 0, max: 23.5, step: 0.5, value: 22, from: 4, to: 4, fmt: v => String(Math.floor(v)).padStart(2, '0') + ':' + (v % 1 ? '30' : '00') },
    ],
    cam(step) {
      if (step === 0) return { box: [-7.6, 0, -1.8, 8.6, 7.6, 5.4], dir: [0.15, 0.4, 1] };
      if (step === 2) return { box: [-3.4, 0.2, -1.6, 7.6, 6.4, 1.6], dir: [0.1, 0.25, 1] };
      if (step === 6) return { box: [-5.8, 0, -1.6, 8.6, 5.2, 2.4], dir: [0.12, 0.3, 1] };
      return { box: [-5.8, 0, -1.8, 13.2, 7.0, 3.2], dir: [0.12, 0.33, 1] };
    },
    frame(S, dt, t, step) {
      // the hour the scene shows: set by the build, or by the slider in build 4
      const HOURS = [5.5, 6, 9.5, 22, null, 10, 21];
      const goalH = step === 4 ? (S.user.hora ?? 22) : HOURS[Math.min(step, 6)];
      let dh = ((goalH - S.hour) % 24 + 24) % 24;            // always forwards, like a clock…
      if (step === 4 || dh > 12) dh = goalH - S.hour;        // …except when scrubbing or going back
      S.hour += Math.sign(dh) * Math.min(Math.abs(dh), dt * 6);
      S.hour = (S.hour + 24) % 24;
      const h = S.hour;
      S.hHand.rotation.z = -(h % 12) / 12 * Math.PI * 2;
      S.mHand.rotation.z = -(h % 1) * Math.PI * 2;
      const night = clamp(Math.max(smooth((h - 17.5) / 2), smooth((6.5 - h) / 1.5)));
      S.scene.background = S.bgDay.clone().lerp(S.bgNight, night);
      S.L.sun.intensity = 2.2 * (1 - night * 0.9);
      S.L.hemi.intensity = 1.9 * (1 - night * 0.65);
      const electric = step >= 6;
      const lampsOn = step >= 3 ? night : 0;
      S.lamps.forEach(l => { l.intensity = lampsOn * 5; l.color.setHex(electric ? 0xFFF1D6 : 0xFFB050); });
      S.flames.forEach(fl => { fl.material.emissiveIntensity = lampsOn * 2; fl.material.emissive.setHex(electric ? 0xFFF6E0 : 0xFFB050); });
      S.winMat.emissiveIntensity = lampsOn * 0.9;
      S.winMat.emissive.setHex(electric ? 0xFFF1D6 : 0xFFC060);
      // which shift is inside
      const working = step >= 1;
      const dayShift = h >= 6 && h < 18;
      const inside = !working ? null : dayShift ? 'dia' : 'noite';
      if (inside !== S.prevInside) { if (S.prevInside !== null || inside) { SOM.play('sino'); SOM.play('passos', 400); } S.prevInside = inside; S.workers.forEach(w => { w.wait = (w.i % 19) * 0.06; }); }
      // the engine house is replaced by electric motors and machines in the last build
      const gone = electric ? 1 : 0;
      S.engineGone = ease(S.engineGone || 0, gone, dt, 2);
      S.engine.position.y = -4 * S.engineGone; S.engine.visible = S.engineGone < 0.98;
      S.extraFloor.scale.x = Math.max(0.001, S.engineGone);
      // machines turn when someone works at them
      S.machines.forEach((m, k) => {
        if (m.extra) m.g.scale.setScalar(Math.max(0.001, S.engineGone));
        const staffed = S.workers.some(w => w.m === m && w.s >= w.len - 0.01);
        m.speed = ease(m.speed, staffed ? (m.slow ? 0.25 : 1) : 0, dt, 2);
        m.roll.rotation.x += m.speed * dt * 14;
      });
      S.shafts.forEach(s => { s.rotation.x += (working ? 1 : 0) * dt * 6; });
      S.flywheel.rotation.z -= (working && !electric ? 1 : 0) * dt * 3;
      S.boilerFire.material.emissiveIntensity = working ? 1 + Math.sin(t * 9) * 0.3 : 0.2;
      // workers walk along their paths
      S.workers.forEach(w => {
        const wantIn = inside === w.shift && (!w.m.extra || electric);
        const goal = wantIn ? w.len : 0;
        if (w.wait > 0) { w.wait -= dt; return; }
        const prevS = w.s;
        w.s = toward(w.s, goal, 4, dt);
        let k = 1; while (k < w.lens.length - 1 && w.lens[k] < w.s) k++;
        const a = w.path[k - 1], b = w.path[k], u = (w.s - w.lens[k - 1]) / Math.max(1e-6, w.lens[k] - w.lens[k - 1]);
        w.p.position.lerpVectors(a, b, clamp(u));
        if (Math.abs(w.s - prevS) > 1e-4) w.p.position.y += Math.abs(Math.sin(t * 9 + w.i)) * 0.08;
        w.p.visible = step >= 1 || w.s > 0.05;
        setKind(w.p, step >= 5 ? w.kind : 'homem');
      });
      // the overlooker patrols the first floor; in build 2 a machine slows down and he goes to it
      const bossIn = step >= 2 && step <= 5;
      const f1 = S.FL[1];
      S.machines.forEach(m => { m.slow = 0; });
      let bx = 2 + Math.sin(t * 0.45) * 3.4, speech = false;
      const slowM = S.machines.find(m => m.f === 1 && !m.extra && Math.abs(m.x) < 0.01);
      if (step === 2) {
        const ph = t % 10;
        if (ph > 4 && ph < 8) { slowM.slow = ph < 6.5 ? 1 : 0; bx = slowM.x + 0.7; speech = ph > 5.2; }
      }
      S.bossX = ease(S.bossX, bx, dt, 1.6);
      S.boss.position.set(bossIn ? S.bossX : 11, bossIn ? f1 : 0.2, bossIn ? 0.95 : 2.5);
      S.boss.visible = bossIn;
      S.bubble.target = [S.bossX, f1 + 1.15, 1.0];
      S.bubble.el.style.visibility = speech ? 'visible' : 'hidden';
      // smoke while the steam engine works
      for (let i = 0; i < S.smoke.n; i++) {
        const ph = (t * 0.3 + i / S.smoke.n) % 1;
        if (!working || electric) { S.smoke.hide(i); continue; }
        S.smoke.set(i, -5 + ph * 2.5 + Math.sin(i) * 0.2, 7.6 + ph * 3, -1.0 + Math.cos(i * 1.3) * 0.3, 0.6 + ph * 1.8);
      }
      S.smoke.done();
      if (working && Math.floor(t / 1.4) !== S.lastClack) { S.lastClack = Math.floor(t / 1.4); SOM.play('maquinas'); }
      S.night = night; S.inside = inside;
    },
    onStep(S, step, prev) { if (step === 6 && prev < 6) SOM.play('luz'); },
    readout(S, step) {
      const h = S.hour, hh = String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60)).padStart(2, '0');
      const who = S.inside === 'dia' ? 'turno de dia (6:00–18:00)' : S.inside === 'noite' ? 'turno da noite (18:00–6:00)' : 'ninguém a trabalhar';
      return `<span class="i3d-relogio"><b>${hh}</b> ${who}</span>` + (step >= 4 && step <= 4 ? '<span>Dois turnos de 12 horas: a fábrica nunca para.</span>' : '');
    },
  };

  /* ---------- 5. The industrial city: river, sewers, moths ---------- */
  SCENES['s-ci-cidade'] = {
    bg: 'cidade',
    build(S) {
      const sc = S.scene;
      const L = lights(sc, 14); S.L = L;
      S.fog = new T.FogExp2(0x9A9A92, 0); sc.fog = S.fog;
      sc.add(box(20, 0.3, 13, C.grass, 0, -0.15, 0));
      // the river (its colour shows how dirty it is)
      S.river = mesh(new T.BoxGeometry(20, 0.08, 1.9), clay(C.water, { roughness: 0.25, metalness: 0.1 }), 0, 0.02, 1.5); sc.add(S.river);
      // embankments with the intercepting sewers (Bazalgette), raised in build 3
      S.embank = new T.Group();
      for (const z of [0.45, 2.55]) {
        S.embank.add(box(20, 0.45, 0.25, C.line, 0, 0.22, z));
        const sew = cyl(0.16, 20, glass(C.dirty, 0.6), 0, 0.22, z + (z < 1 ? -0.35 : 0.35), 14); sew.rotation.z = Math.PI / 2; S.embank.add(sew);
      }
      S.embank.position.y = -0.6; sc.add(S.embank);
      // houses on the north bank; more appear with the factories
      S.houses = [];
      const roofMat = clay(C.orange, { roughness: 0.7 });
      for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) {
        const x = -8.2 + c * 1.9 + (r % 2) * 0.6, z = -0.6 - r * 1.4;
        const late = r === 2 || c % 3 === 2;
        const g = group(box(1.1, 0.7, 0.9, C.cream, 0, 0.35, 0), mesh(new T.ConeGeometry(0.8, 0.45, 4), roofMat, 0, 0.92, 0));
        g.children[1].rotation.y = Math.PI / 4;
        g.position.set(x, 0, z); sc.add(g);
        S.houses.push({ g, late });
      }
      // factories with chimneys at the back
      S.factories = [];
      for (const [x, z] of [[-6, -5.2], [-0.5, -5.4], [5, -5.1]]) {
        const g = group(box(3.2, 1.6, 1.6, C.brick, 0, 0.8, 0), cyl(0.22, 4.2, C.brickD, 1.2, 2.1, -0.4, 14));
        g.position.set(x, 0, z); sc.add(g);
        S.factories.push(g);
      }
      S.smoke = swarm(sc, 60, 0x6E6E68, 0.35, { transparent: true, opacity: 0.45, depthWrite: false });
      // sewage pipes into the river, and the pump of Broad Street
      S.drains = [];
      for (let c = 0; c < 6; c++) { const x = -7.5 + c * 3; sc.add(box(0.12, 0.12, 0.5, C.iron, x, 0.12, 0.3)); S.drains.push(x); }
      S.sewage = swarm(sc, 60, C.dirty, 0.07);
      S.pump = group(cyl(0.12, 1.0, C.navy, 0, 0.5, 0, 12), cyl(0.18, 0.12, C.navy, 0, 1.05, 0, 12));
      S.handle = box(0.5, 0.05, 0.05, C.iron, 0.3, 0.85, 0); S.pump.add(S.handle);
      S.pump.position.set(-2.6, 0, -1.25); sc.add(S.pump);
      S.ring = mesh(new T.TorusGeometry(0.45, 0.05, 8, 32), new T.MeshBasicMaterial({ color: 0xB3261E, transparent: true, opacity: 0 }), -2.6, 0.05, -1.25); S.ring.rotation.x = Math.PI / 2; sc.add(S.ring);
      S.stink = swarm(sc, 50, 0x7C8A3C, 0.08, { transparent: true, opacity: 0.6 });
      S.flow = swarm(sc, 40, C.dirty, 0.06);
      // trees on the south bank, with moths on the trunks
      S.trunks = []; S.moths = [];
      const mothGeo = new T.CircleGeometry(0.15, 3);
      for (let i = 0; i < 8; i++) {
        const x = -7.9 + i * 2.25, z = 5.0;
        const trunk = cyl(0.2, 1.7, 0xC3C6B8, x, 0.85, z, 14); sc.add(trunk);
        sc.add(mesh(new T.SphereGeometry(0.72, 14, 10), clay(0x7E9B5E), x, 2.1, z));
        S.trunks.push(trunk);
        for (let k = 0; k < 3; k++) {
          const m = mesh(mothGeo, new T.MeshStandardMaterial({ color: 0xE6E2D6, roughness: 0.8, side: T.DoubleSide }), x + (k - 1) * 0.08, 0.45 + k * 0.42, z + 0.21);
          m.rotation.z = Math.PI / 2; m.scale.set(1, 1.6, 1); sc.add(m);
          S.moths.push({ m, r: rnd(), seen: 0 });
        }
      }
      // birds that circle over the trees
      S.birds = [];
      for (let i = 0; i < 3; i++) {
        const b = group(mesh(new T.ConeGeometry(0.1, 0.4, 8), clay(C.navy)), box(0.7, 0.03, 0.18, C.navy, 0, 0, 0));
        b.children[0].rotation.x = Math.PI / 2; sc.add(b); S.birds.push(b);
      }
      S.dirt = 0; S.smokeLv = 0; S.soot = 0; S.dark = 0.02; S.sewer = 0; S.growth = 0;
      S.label('Rio', 'i3d-nota', [7.5, 0.4, 1.5], 0, st => st <= 1);
      S.label('Fábricas a carvão', 'i3d-nota i3d-forte', [-0.5, 5.0, -5.4], 0, st => st === 1);
      S.label('Esgotos despejados no rio', 'i3d-nota i3d-forte', [4.5, 0.8, 0.6], 0, st => st === 2);
      S.label('Bomba de água de Broad Street, 1854', 'i3d-nota i3d-forte', [-2.6, 1.6, -1.25], 0, st => st === 2);
      S.label('Esgotos novos ao longo das margens', 'i3d-nota i3d-forte', [3.5, 0.9, 2.9], 0, st => st === 3);
      S.label('Troncos com fuligem', 'i3d-nota', [1.1, 0.25, 5.3], 0, st => st === 4);
      S.label('Troncos limpos', 'i3d-nota', [1.1, 0.25, 5.3], 0, st => st === 5);
      S.label('Mariposas', 'i3d-nota i3d-forte', [-0.4, 1.95, 5.3], 0, st => st >= 4);
      S.label('Pássaros', 'i3d-nota', S.birds[0], 0.4, st => st >= 4);
    },
    cam(step) {
      if (step === 2) return { box: [-6, 0, -2.2, 6, 1, 3], dir: [0.05, 1.6, 1] };
      if (step >= 4) return { box: [-3.6, 0, 4.7, 3.6, 2.8, 5.4], dir: [0.0, 0.22, 1] };
      return { box: [-9.6, 0, -6, 9.6, 3, 5.8], dir: [0.0, 1.25, 1] };
    },
    frame(S, dt, t, step) {
      // levels that change with the builds (all reversible)
      S.growth = ease(S.growth, step >= 1 ? 1 : 0, dt, 1.5);
      S.smokeLv = ease(S.smokeLv, step >= 1 && step <= 4 ? 1 : 0, dt, 1);
      S.dirt = ease(S.dirt, step === 2 ? 1 : step === 3 ? 0.25 : step >= 4 ? 0.2 : 0, dt, step === 3 ? 0.5 : 1.2);
      S.sewer = ease(S.sewer, step >= 3 ? 1 : 0, dt, 1.2);
      S.soot = ease(S.soot, step === 4 ? 1 : 0, dt, step === 5 ? 0.6 : 0.9);
      S.dark = ease(S.dark, step === 4 ? 0.95 : 0.04, dt, 0.6);
      // houses and factories
      S.houses.forEach(hs => { const s = hs.late ? Math.max(0.001, S.growth) : 1; hs.g.scale.setScalar(s); hs.g.visible = s > 0.02; });
      S.factories.forEach(f => { f.scale.y = Math.max(0.001, S.growth); f.visible = S.growth > 0.02; });
      // the river: clean blue → brown
      S.river.material.color.setHex(C.water).lerp(new T.Color(C.dirty), S.dirt);
      S.embank.position.y = -0.6 + 0.6 * S.sewer;
      S.fog.density = 0.028 * S.smokeLv;
      S.L.sun.intensity = 2.2 - 0.9 * S.smokeLv;
      for (let i = 0; i < S.smoke.n; i++) {
        const f = S.factories[i % 3], ph = (t * 0.25 + i / S.smoke.n * 3) % 1;
        if (S.smokeLv < 0.05) { S.smoke.hide(i); continue; }
        S.smoke.set(i, f.position.x + 1.2 + ph * 2.5, 4.3 + ph * 2.5, f.position.z - 0.4 + Math.sin(i) * 0.3, (0.6 + ph * 1.5) * S.smokeLv);
      }
      S.smoke.done();
      // sewage straight into the river (build 2); after the sewers, it flows along the banks and away
      for (let i = 0; i < S.sewage.n; i++) {
        const x = S.drains[i % S.drains.length], ph = (t * 0.8 + i / S.sewage.n * 6) % 1;
        if (step !== 2) { S.sewage.hide(i); continue; }
        S.sewage.set(i, x + Math.sin(i) * 0.05, 0.12 - ph * 0.1, 0.55 + ph * 0.8, 1 - ph * 0.5);
      }
      S.sewage.done();
      for (let i = 0; i < S.flow.n; i++) {
        if (S.sewer < 0.5) { S.flow.hide(i); continue; }
        const ph = (t * 0.12 + i / S.flow.n) % 1, z = i % 2 ? 0.1 : 2.9;
        S.flow.set(i, -10 + ph * 20, 0.22 + 0.6 * S.sewer - 0.6, z, 1);
      }
      S.flow.done();
      // the Great Stink (start of build 3)
      if (step === 3 && S.stepTime < 3.5) {
        for (let i = 0; i < S.stink.n; i++) {
          const ph = (t * 0.5 + i / S.stink.n) % 1;
          S.stink.set(i, -9 + (i * 0.37 % 1) * 18 + Math.sin(t * 2 + i) * 0.2, 0.2 + ph * 2.2, 1.0 + (i * 0.61 % 1) * 1.0, 1 - ph);
        }
      } else for (let i = 0; i < S.stink.n; i++) S.stink.hide(i);
      S.stink.done();
      // the pump: a red ring in build 2, the handle taken off after a moment
      S.ring.material.opacity = step === 2 ? 0.5 + 0.4 * Math.sin(t * 4) : 0;
      S.handle.visible = !(step === 2 && S.stepTime > 2.5) && step < 3;
      // soot on the trunks; the dark moths survive and spread
      const bark = new T.Color(0xC3C6B8).lerp(new T.Color(0x3A3A36), S.soot);
      S.trunks.forEach(tr => tr.material.color.copy(bark));
      const light = new T.Color(0xE6E2D6), darkC = new T.Color(0x2B2B2A);
      S.moths.forEach((mo, i) => {
        const isDark = mo.r < S.dark;
        mo.m.material.color.copy(isDark ? darkC : light);
        const contrast = isDark ? 1 - S.soot : S.soot;      // easy to see on this bark?
        mo.m.visible = !(step >= 4 && contrast > 0.6 && ((t + mo.r * 7) % 7) < 1.2);   // the birds catch the ones that stand out
      });
      S.birds.forEach((b, i) => {
        const a = t * (0.5 + i * 0.12) + i * 2.1;
        b.position.set(Math.cos(a) * (5 + i), 3.4 + Math.sin(a * 2) * 0.4, 4.0 + Math.sin(a) * 1.4);
        b.rotation.y = -a; b.children[1].rotation.x = Math.sin(t * 12 + i) * 0.5;
        b.visible = step >= 4;
      });
      if (step >= 4 && Math.floor(t / 3) !== S.lastTweet) { S.lastTweet = Math.floor(t / 3); SOM.play('passaro'); }
    },
    onStep(S, step, prev) {
      if (step === 1 && prev < 1) SOM.play('obras');
      if (step === 2 && prev < 2) SOM.play('agua');
      if (step === 3 && prev < 3) SOM.play('obras', 1500);
    },
    readout(S, step) {
      if (step < 4) return '';
      const pct = Math.round(S.dark * 100);
      return `<span>Mariposas escuras nesta animação: <b>${pct} %</b></span>`;
    },
  };

  /* ======================================================================
     Engine: one renderer, one scene at a time
     ====================================================================== */
  const states = new Map();         // slide id -> S (scene state, kept while the lesson is open)
  let current = null;               // { el, S }
  const look = new T.Vector3(), eye = new T.Vector3(), tmpV = new T.Vector3();
  let width = 1, height = 1, running = false, lastTime = 0;
  const probe = new T.PerspectiveCamera();

  function stepOf(el) { let k = 0; while (el.classList.contains('ge' + (k + 1))) k++; return k; }

  function makeState(el) {
    const cfg = SCENES[el.id];
    const S = { el, cfg, scene: new T.Scene(), labels: [], user: {}, step: -1, stepTime: 0 };
    (cfg.controls || []).forEach(c => { if (c.type === 'slider') S.user[c.key] = c.value; });
    S.label = (html, cls, target, dy, show) => {
      const item = { el: document.createElement('div'), target, dy, show };
      item.el.className = 'i3d-et ' + cls;
      item.el.innerHTML = html;
      S.labels.push(item);
      return item;
    };
    cfg.build(S);
    return S;
  }

  /** Where to put the camera so that a box fills the picture, seen from `dir`. */
  function fitBox(b, dir) {
    const corners = [];
    for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) corners.push(new T.Vector3(x, y, z));
    const at = new T.Vector3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
    const d = new T.Vector3(...dir).normalize();
    const M = 0.9;
    const bounds = (from, target) => {
      probe.copy(camera); probe.position.copy(from); probe.lookAt(target); probe.updateMatrixWorld(); probe.updateProjectionMatrix();
      const r = { x0: 9, x1: -9, y0: 9, y1: -9 };
      for (const p of corners) { tmpV.copy(p).project(probe); r.x0 = Math.min(r.x0, tmpV.x); r.x1 = Math.max(r.x1, tmpV.x); r.y0 = Math.min(r.y0, tmpV.y); r.y1 = Math.max(r.y1, tmpV.y); }
      return r;
    };
    let dist = 20;
    for (let pass = 0; pass < 3; pass++) {
      let lo = 1, hi = 300;
      for (let k = 0; k < 28; k++) {
        const mid = (lo + hi) / 2, r = bounds(at.clone().addScaledVector(d, mid), at);
        if (r.x1 - r.x0 <= 2 * M && r.y1 - r.y0 <= 2 * M) hi = mid; else lo = mid;
      }
      dist = hi;
      const r = bounds(at.clone().addScaledVector(d, dist), at);
      const h = dist * Math.tan(T.MathUtils.degToRad(camera.fov / 2)), w = h * camera.aspect;
      const right = new T.Vector3().setFromMatrixColumn(probe.matrixWorld, 0), up = new T.Vector3().setFromMatrixColumn(probe.matrixWorld, 1);
      at.addScaledVector(right, (r.x0 + r.x1) / 2 * w).addScaledVector(up, (r.y0 + r.y1) / 2 * h);
    }
    return { at, from: at.clone().addScaledVector(d, dist) };
  }

  /** Make the picture as tall as the window allows, leaving room for what sits under it. */
  function fitHeight(el) {
    const palco = el.querySelector('.i3d-palco');
    if (!palco) return;
    const leg = el.querySelector('.i3d-leg');
    if (leg && !leg.dataset.medido && leg.offsetWidth) {         // the captions keep the height of the longest one
      let max = 0;
      for (const p of leg.children) { const d = p.style.display; p.style.display = 'block'; max = Math.max(max, p.offsetHeight); p.style.display = d; }
      leg.style.minHeight = max + 'px'; leg.dataset.medido = '1';
    }
    if (matchMedia('(max-width: 860px)').matches) { palco.style.height = ''; return; }
    let below = 0;
    for (let n = palco.nextElementSibling; n; n = n.nextElementSibling) {
      if (n.offsetParent === null || getComputedStyle(n).visibility === 'hidden') continue;   // builds not shown yet take no room
      below += n.offsetHeight + 8;
    }
    const top = palco.getBoundingClientRect().top - (el.closest('.stage') || document.body).getBoundingClientRect().top;
    palco.style.height = Math.max(260, Math.min(780, window.innerHeight - top - below - 84)) + 'px';   // 84: room for the navigation pill
  }

  function resize() {
    if (!canvas.parentElement) return;
    width = canvas.clientWidth || 1; height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (current) current.shot = fitBox(...shotArgs(current.S));
  }
  const shotArgs = S => { const c = S.cfg.cam(Math.max(0, S.step), S); return [c.box, c.dir]; };
  const ro = new ResizeObserver(() => resize());

  function syncControls(S) {
    S.el.querySelectorAll('.i3d-ctl [data-from]').forEach(n => {
      const from = Number(n.dataset.from), to = n.dataset.to !== undefined ? Number(n.dataset.to) : 99;
      n.hidden = !(S.step >= from && S.step <= to);
    });
  }

  function frame(time) {
    if (!current || !current.el.classList.contains('current')) { running = false; return; }
    requestAnimationFrame(frame);
    const dt = Math.min((time - lastTime) / 1000 || 0.016, 0.05);
    lastTime = time;
    const t = time / 1000;
    const S = current.S;
    const step = stepOf(current.el);
    if (step !== S.step) {
      const prev = S.step;
      S.step = step; S.stepTime = 0;
      if (S.cfg.onStep && prev >= 0) S.cfg.onStep(S, step, prev);
      syncControls(S);
      fitHeight(current.el);
      resize();
    }
    S.stepTime += dt;
    S.cfg.frame(S, dt, t, step);
    // camera: glide to the shot for this build, with a slow drift
    const shot = current.shot;
    const k = 1 - Math.exp(-dt * 2.2);
    look.lerp(shot.at, k);
    tmpV.copy(shot.from);
    const dist = shot.from.distanceTo(shot.at);
    tmpV.x += Math.sin(t / 4.2) * dist * 0.012; tmpV.y += Math.cos(t / 5.3) * dist * 0.008;
    eye.lerp(tmpV, k);
    camera.position.copy(eye); camera.lookAt(look);
    renderer.render(S.scene, camera);
    // labels: project each one, then push apart any that would overlap (and keep them inside the picture)
    const placed = [];
    for (const item of S.labels) {
      const show = item.show(step, S) && item.el.style.visibility !== 'hidden';
      let vis = false;
      if (show) {
        const tg = item.target;
        if (Array.isArray(tg)) tmpV.set(...tg); else { tg.getWorldPosition(tmpV); tmpV.y += item.dy; }
        tmpV.project(camera);
        vis = tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1;
      }
      item.el.classList.toggle('visivel', vis);
      if (!vis) { item.y = undefined; continue; }
      const w = item.el.offsetWidth || 80, h = item.el.offsetHeight || 22;
      let cx = (tmpV.x + 1) / 2 * width, bottom = (1 - tmpV.y) / 2 * height;
      cx = Math.max(w / 2 + 4, Math.min(width - w / 2 - 4, cx));
      bottom = Math.max(h + 4, Math.min(height - 4, bottom));
      // try the natural place, then a little higher or lower, until it touches no label already placed
      const free = b => placed.every(o => b - h >= o.b + 3 || b <= o.b - o.h - 3 || cx + w / 2 <= o.x - o.w / 2 - 3 || cx - w / 2 >= o.x + o.w / 2 + 3);
      let best = bottom;
      if (!free(bottom)) {
        for (let k = 1; k < 40; k++) {
          const up = bottom - k * 6, down = bottom + k * 6;
          if (up - h >= 2 && free(up)) { best = up; break; }
          if (down <= height - 2 && free(down)) { best = down; break; }
        }
      }
      item.y = item.y === undefined ? best : item.y + (best - item.y) * 0.35;     // glide, do not jump
      placed.push({ x: cx, b: best, w, h });
      item.el.style.transform = `translate(-50%, -100%) translate(${cx.toFixed(1)}px, ${item.y.toFixed(1)}px)`;
    }
    // readout under the picture (4 times a second is enough)
    if (S.cfg.readout && time - (S.lastRead || 0) > 250) {
      S.lastRead = time;
      const r = S.el.querySelector('.i3d-read');
      if (r) { const html = S.cfg.readout(S, step); if (html !== r._html) { r.innerHTML = html; r._html = html; r.hidden = !html; } }
    }
  }

  function enter(el) {
    if (!states.has(el.id)) states.set(el.id, makeState(el));
    const S = states.get(el.id);
    const palco = el.querySelector('.i3d-palco');
    current = { el, S, shot: null };
    layer.replaceChildren(...S.labels.map(l => l.el));
    palco.prepend(canvas, layer);
    S.step = -1;
    fitHeight(el);
    ro.disconnect(); ro.observe(palco);
    width = canvas.clientWidth || 1; height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    S.step = stepOf(el);
    syncControls(S);
    current.shot = fitBox(...shotArgs(S));
    look.copy(current.shot.at); eye.copy(current.shot.from);
    if (!running) { running = true; lastTime = performance.now(); requestAnimationFrame(frame); }
  }

  /* ---------- Controls under the picture; the sound button ---------- */
  slideEls.forEach(el => {
    const cfg = SCENES[el.id];
    if (!cfg) return;
    const palco = el.querySelector('.i3d-palco');
    const sb = document.createElement('button');
    sb.type = 'button'; sb.className = 'i3d-som';
    const paint = () => { sb.textContent = SOM.muted ? '🔇' : '🔊'; sb.setAttribute('aria-label', SOM.muted ? 'Ligar o som' : 'Desligar o som'); sb.title = sb.getAttribute('aria-label'); };
    sb.addEventListener('click', e => { e.stopPropagation(); SOM.toggle(); document.querySelectorAll('.i3d-som').forEach(x => x.dispatchEvent(new Event('pintar'))); });
    sb.addEventListener('pintar', paint);
    paint(); palco.append(sb);
    const ctl = el.querySelector('.i3d-ctl');
    if (ctl && cfg.controls) cfg.controls.forEach(def => {
      let node;
      if (def.type === 'slider') {
        node = document.createElement('label');
        node.className = 'i3d-rng';
        node.innerHTML = '<span></span><input type="range"><output></output>';
        node.firstChild.textContent = def.label;
        const inp = node.querySelector('input'), out = node.querySelector('output');
        inp.min = def.min; inp.max = def.max; inp.step = def.step; inp.value = def.value;
        out.textContent = def.fmt(def.value);
        inp.addEventListener('input', e => {
          e.stopPropagation();
          const S = states.get(el.id); if (!S) return;
          S.user[def.key] = Number(inp.value); out.textContent = def.fmt(Number(inp.value));
        });
        inp.addEventListener('keydown', e => e.stopPropagation());
        inp.addEventListener('change', () => inp.blur());
      } else {
        node = document.createElement('button');
        node.type = 'button'; node.className = 'btn ghost'; node.textContent = def.t;
        node.addEventListener('click', e => {
          e.stopPropagation();
          const S = states.get(el.id); if (!S) return;
          def.f(S); node.classList.toggle('sel');
        });
      }
      node.dataset.from = def.from;
      if (def.to !== undefined) node.dataset.to = def.to;
      ['touchstart', 'touchend', 'click'].forEach(ev => node.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
      node.hidden = true;
      ctl.append(node);
    });
    new MutationObserver(() => {
      if (el.classList.contains('current') && (!current || current.el !== el || !running)) enter(el);
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
    if (el.classList.contains('current')) enter(el);
  });
  window.addEventListener('resize', () => { if (current) { fitHeight(current.el); resize(); } });
})();
