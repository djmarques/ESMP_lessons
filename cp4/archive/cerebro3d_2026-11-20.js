/* =====================================================================
   cerebro3d.js — three 3D slides of block DR1.3 (Phineas Gage)
   ---------------------------------------------------------------------
   One procedural brain model, three scenes:
     #s-cerebro-3d     interactive: drag to turn, click a lobe to read
                       what it does, look inside (thalamus, corpus callosum)
     #s-gage-3d        step-driven animation of the 1848 accident
     #s-lobotomia-3d   step-driven animation of prefrontal leucotomy and
                       lobotomy (cutting the prefrontal–thalamus fibres)

   How the step-driven scenes work (same idea as tabuleiro.js in
   ai-3ano/cidadania-europeia): app.js puts the classes ge1…geN on the slide
   («step is at least k»). Every frame, the scene reads the current step and
   eases the camera, colours, opacities and moving parts towards what that
   step asks for. Going back a step therefore just works, and changing the
   story means editing the tables (CAMERA, captions in index.html), not the
   animation code.

   Text (labels, captions) is HTML positioned over the canvas, so it stays
   sharp on a projector and can be edited in index.html / here.

   Units: 1 unit ≈ 5 cm. Axes: x = the person's left (+) / right (−),
   y = up, z = forwards (towards the face).

   Requires assets/vendor/three.min.js (three.js release 160, classic build).
   ===================================================================== */
(function () {
  'use strict';
  const T = window.THREE;

  /* ---------- 1. Small helpers ----------------------------------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Seeded random numbers, so the brain's folds and fibres are the same on every load. */
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /** 3D gradient noise (classic Perlin), used to draw the gyri and sulci. */
  const noise3 = (function () {
    const r = rng(7), p = new Uint8Array(512), perm = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a, b, t) => a + t * (b - a);
    function grad(h, x, y, z) {
      const u = (h & 15) < 8 ? x : y, v = (h & 15) < 4 ? y : ((h & 15) === 12 || (h & 15) === 14) ? x : z;
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }
    return function (x, y, z) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z);
      const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
      return lerp(lerp(lerp(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u),
        lerp(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u), v),
        lerp(lerp(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u),
          lerp(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u), v), w);
    };
  })();

  /** Matte «clay» material, the look of Daniel's other 3D slides. */
  const clay = (color, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.78, metalness: 0 }, extra));

  /* ---------- 2. The brain model ---------------------------------------- */
  // Region codes stored per vertex. Prefrontal is the front part of the frontal lobe.
  const R = { FRONTAL: 0, PREFRONTAL: 1, PARIETAL: 2, TEMPORAL: 3, OCCIPITAL: 4, CEREBELO: 5, TRONCO: 6 };
  // Palette of the site (navy, burnt orange, apricot, blue, green) plus muted extras.
  const LOBE_COLOR = {
    [R.FRONTAL]: 0xE59A63, [R.PREFRONTAL]: 0xE59A63, [R.PARIETAL]: 0x4F86B3, [R.TEMPORAL]: 0x7E9A5A,
    [R.OCCIPITAL]: 0xD9B26F, [R.CEREBELO]: 0x9C7E9A, [R.TRONCO]: 0xA7B0B8,
  };
  const TISSUE = 0xD8A9A0;          // neutral «brain» pink, used before the lobes are coloured

  /** Sylvian (lateral) fissure height at a given front–back position c (−1 back … 1 front). */
  const sylvian = c => -0.12 + (0.5 - c) * 0.33;
  /** Front–back position of the central sulcus at height Y. */
  const central = Y => -0.02 + (1 - Y) * 0.16;

  /**
   * One cerebral hemisphere: a sphere pushed into a brain shape, with the
   * lateral and central sulci carved in and ridged noise for the folds.
   * side = +1 for the left hemisphere (x > 0), −1 for the right.
   * Each vertex records its region in `regions` (used for colour and picking).
   */
  function hemisphere(side) {
    const geo = new T.SphereGeometry(1, 200, 140);
    // keep the sphere's seam on the inner (medial) face, where it is hidden
    if (side < 0) geo.rotateY(Math.PI);
    const pos = geo.attributes.position, n = pos.count;
    const regions = new Uint8Array(n), v = new T.Vector3(), dir = new T.Vector3();
    for (let i = 0; i < n; i++) {
      const a = pos.getX(i), b = pos.getY(i), c = pos.getZ(i);
      const u = a * side;                                         // > 0 on the outer (lateral) face
      let X = u > 0 ? 0.80 * u : 0.10 * u;                        // flat inner face
      let Y = b, Z = c * 1.62;
      const temporal = Math.exp(-(((c - 0.05) / 0.42) ** 2)) * clamp((u - 0.1) * 1.6, 0, 1);
      if (Y < 0) Y *= 0.55 + 0.45 * temporal;                     // temporal lobe hangs lower than frontal and occipital
      else Y *= 0.96;
      X *= 1 - 0.18 * clamp(-c - 0.45, 0, 1) - 0.12 * clamp(c - 0.6, 0, 1);   // narrower at both poles
      const ys = sylvian(c), cc = central(Y);
      // region: decided on the smooth shape, before the folds are added
      let r;
      if (c < -0.6 + 0.06 * Y) r = R.OCCIPITAL;
      else if (Y < ys && c < 0.6 && (u > -0.05 || Y < ys - 0.12)) r = R.TEMPORAL;
      else if (c > cc) r = c > 0.4 ? R.PREFRONTAL : R.FRONTAL;
      else r = R.PARIETAL;
      regions[i] = r;
      // carve: lateral fissure, central sulcus, then the gyri
      const lateral = clamp(u * 2.2, 0, 1);
      const syl = Math.exp(-(((Y - ys) / 0.05) ** 2)) * smooth(-0.5, -0.3, c) * (1 - smooth(0.45, 0.6, c)) * lateral;
      const cen = Math.exp(-(((c - cc) / 0.028) ** 2)) * (Y > ys + 0.04 ? 1 : 0) * clamp(u * 3 + 0.3, 0, 1);
      const ridge = 1 - Math.abs(noise3(X * 4 + 11, Y * 4, Z * 4));   // ridged noise: narrow sulci, wide gyri
      const fold = u > -0.2 ? 1 : 0.5;                                          // shallower folds on the inner face
      dir.set(X, Y, Z).normalize();
      v.set(X, Y, Z).addScaledVector(dir, -0.11 * syl - 0.05 * cen + 0.065 * fold * (ridge * ridge - 0.55));
      pos.setXYZ(i, side * (0.11 + v.x), v.y, v.z);
    }
    geo.computeVertexNormals();
    return { geo, regions };
  }

  /** Cerebellum: a flattened ball with fine horizontal folds (folia). */
  function cerebellum() {
    const geo = new T.SphereGeometry(1, 120, 80), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const a = pos.getX(i), b = pos.getY(i), c = pos.getZ(i);
      let x = a * 0.82, y = b * 0.40, z = c * 0.55;
      if (b > 0) y *= 0.7;                                          // flat top, under the occipital lobe
      const k = 1 + 0.035 * Math.sin(b * 34 + c * 6) - 0.05 * Math.exp(-((a / 0.08) ** 2));   // folia + vermis groove
      pos.setXYZ(i, x * k, y * k - 0.82, z * k - 1.05);
    }
    geo.computeVertexNormals();
    return geo;
  }

  /** Brain stem: a tapering column with the pons as a bulge in front. */
  function brainstem() {
    const geo = new T.CylinderGeometry(0.2, 0.15, 1.35, 40, 30), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const pons = 1 + 0.45 * Math.exp(-(((y - 0.2) / 0.22) ** 2)) * (z > 0 ? 1 : 0.4);
      pos.setXYZ(i, x * pons, y, z * pons);
    }
    geo.rotateX(-0.28);
    geo.translate(0, -1.05, -0.42);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Build the whole brain. Returns the group plus what scenes need:
   *  parts    meshes with a per-vertex region (for colouring and picking)
   *  paint    set the colour each vertex should ease towards
   *  tick     ease colours (call every frame)
   *  surface  random points on the cortex of a region (for fibre ends)
   *  thalamus, callosum  deep structures, hidden until a scene shows them
   */
  function buildBrain() {
    const group = new T.Group(), parts = [];
    const material = clay(0xffffff, { vertexColors: true, roughness: 0.7, transparent: true, opacity: 1 });
    function addPart(geo, regionOf, side) {
      const n = geo.attributes.position.count;
      const regions = regionOf instanceof Uint8Array ? regionOf : new Uint8Array(n).fill(regionOf);
      const now = new Float32Array(n * 3), goal = new Float32Array(n * 3);
      geo.setAttribute('color', new T.BufferAttribute(now, 3));
      const mesh = new T.Mesh(geo, material);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = { regions, now, goal, side };
      group.add(mesh); parts.push(mesh);
      return mesh;
    }
    const left = hemisphere(1), right = hemisphere(-1);
    const hemiL = addPart(left.geo, left.regions, 1);
    const hemiR = addPart(right.geo, right.regions, -1);
    addPart(cerebellum(), R.CEREBELO, 0);
    addPart(brainstem(), R.TRONCO, 0);

    // Deep structures: thalamus (one egg per hemisphere) and corpus callosum.
    const thalamus = new T.Group();
    const thMat = clay(0xF0A673, { emissive: 0xA44A16, emissiveIntensity: 0.35, transparent: true, opacity: 0 });
    for (const s of [1, -1]) {
      const egg = new T.Mesh(new T.SphereGeometry(1, 40, 30), thMat);
      egg.scale.set(0.16, 0.15, 0.27);
      egg.position.set(s * 0.17, -0.06, -0.15);
      thalamus.add(egg);
    }
    const ccCurve = new T.CatmullRomCurve3([[0, 0.18, 0.78], [0, 0.42, 0.42], [0, 0.5, -0.1], [0, 0.42, -0.55], [0, 0.22, -0.8]].map(p => new T.Vector3(...p)));
    const callosum = new T.Mesh(new T.TubeGeometry(ccCurve, 60, 0.07, 16), clay(0xF6F3EC, { transparent: true, opacity: 0 }));
    callosum.scale.x = 3.2;
    group.add(thalamus, callosum);

    const color = new T.Color();
    /** paint(fn): fn(region, x, y, z, side) returns a colour number (or a THREE.Color). */
    function paint(fn) {
      for (const mesh of parts) {
        const { regions, goal, side } = mesh.userData, pos = mesh.geometry.attributes.position;
        for (let i = 0; i < regions.length; i++) {
          const out = fn(regions[i], pos.getX(i), pos.getY(i), pos.getZ(i), side);
          (out instanceof T.Color ? color.copy(out) : color.set(out));
          goal[i * 3] = color.r; goal[i * 3 + 1] = color.g; goal[i * 3 + 2] = color.b;
        }
      }
    }
    /** Ease the vertex colours towards their goal; instant the first time and with reduced motion. */
    let first = true;
    function tick(dt) {
      const k = first || reduced ? 1 : 1 - Math.exp(-dt * 4);
      for (const mesh of parts) {
        const { now, goal } = mesh.userData;
        let moved = false;
        for (let i = 0; i < now.length; i++) {
          const d = goal[i] - now[i];
          if (d > 0.002 || d < -0.002) { now[i] += d * k; moved = true; } else now[i] = goal[i];
        }
        if (moved || first) mesh.geometry.attributes.color.needsUpdate = true;
      }
      first = false;
    }
    /** `count` points on the cortex of `region` (and hemisphere side, if given), pushed `inset` towards the centre. */
    function surface(region, count, seed, side, inset = 0.12) {
      const r = rng(seed), out = [], meshes = side ? [side > 0 ? hemiL : hemiR] : [hemiL, hemiR];
      let guard = 0;
      while (out.length < count && guard++ < 200000) {
        const mesh = meshes[Math.floor(r() * meshes.length)], pos = mesh.geometry.attributes.position;
        const i = Math.floor(r() * pos.count);
        const reg = mesh.userData.regions[i];
        if (!(reg === region || (region === R.FRONTAL && reg === R.PREFRONTAL))) continue;
        const p = new T.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
        if (Math.abs(p.x) < 0.25) continue;                          // ends on the outer face, not the midline
        out.push(p.multiplyScalar(1 - inset));
      }
      return out;
    }
    return { group, parts, hemiL, hemiR, material, paint, tick, surface, thalamus, thMat, callosum };
  }

  /** A white-matter fibre: a gently curved tube between two points. */
  function fibre(from, to, bend, radius, material) {
    const mid = from.clone().lerp(to, 0.5).add(bend);
    const curve = new T.CatmullRomCurve3([from, mid, to]);
    const mesh = new T.Mesh(new T.TubeGeometry(curve, 40, radius, 8), material);
    mesh.userData.curve = curve;
    return mesh;
  }

  /* ---------- 3. Stage: renderer, lights, camera, labels, loop ---------- */
  /**
   * Set up a canvas in `box` for the slide `slide`. Draws only while the
   * slide is shown. `update(step, dt, time, sinceStep)` is called every frame.
   */
  function makeStage(slide, box, update) {
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (e) { box.classList.add('sem-3d'); return null; }   // the captions still tell the story
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    box.prepend(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(32, 1, 0.1, 200);
    scene.add(new T.HemisphereLight(0xffffff, 0x27323b, 1.7));
    const sun = new T.DirectionalLight(0xfff0dc, 2.4);          // warm key light from the front left
    sun.position.set(6, 9, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 30 });
    scene.add(sun);
    const rim = new T.DirectionalLight(0x9ec3e6, 1.1);          // cool light from behind, to separate shapes from the dark background
    rim.position.set(-6, 3, -7);
    scene.add(rim);

    const labels = [];
    /** HTML label over a 3D point (array or Object3D). `when(step)` says if it shows. */
    function label(html, target, cls, when) {
      const el = document.createElement('div');
      el.className = 'etiqueta ' + (cls || '');
      el.innerHTML = html;
      box.append(el);
      labels.push({ el, target, when });
      return el;
    }

    let width = 1, height = 1, last = 0, running = false, step = 0, stepAt = 0;
    const p = new T.Vector3();
    function resize() {
      width = box.clientWidth || 1; height = box.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    /** Current build of the slide, read from the ge1…geN classes set by app.js. */
    function currentStep() { let k = 0; while (slide.classList.contains('ge' + (k + 1))) k++; return k; }
    function frame(time) {
      if (!slide.classList.contains('current')) { running = false; return; }
      requestAnimationFrame(frame);
      const dt = Math.min((time - last) / 1000 || 0.016, 0.05);
      last = time;
      const s = currentStep();
      if (s !== step) { step = s; stepAt = time; }
      update(step, dt, time, (time - stepAt) / 1000);
      renderer.render(scene, camera);
      for (const item of labels) {
        if (item.target.isObject3D) item.target.getWorldPosition(p); else p.set(...item.target);
        p.project(camera);
        const shown = item.when(step) && p.z < 1;
        item.el.classList.toggle('visivel', shown);
        item.el.style.transform = `translate(-50%, -100%) translate(${((p.x + 1) / 2) * width}px, ${((1 - p.y) / 2) * height}px)`;
      }
    }
    function start() {
      if (running || !slide.classList.contains('current')) return;
      running = true; last = performance.now(); resize();
      requestAnimationFrame(frame);
    }
    new ResizeObserver(resize).observe(box);
    new MutationObserver(start).observe(slide, { attributes: true, attributeFilter: ['class'] });
    start();
    return { scene, camera, renderer, label, sun };
  }

  /**
   * Camera director for step-driven scenes: eases towards CAMERA[step] with
   * a slow drift; steps back on tall, narrow screens (phones).
   */
  function director(camera, shots, lift = 0.5, zoom = 0.85) {
    // lift: aim below the subject so it sits above the caption box; zoom < 1 moves closer
    shots = shots.map(s => ({ at: [s.at[0], s.at[1] - lift, s.at[2]], from: s.from.map((v, i) => s.at[i] + (v - s.at[i]) * zoom - (i === 1 ? lift : 0)) }));
    const look = new T.Vector3(...shots[0].at), eye = new T.Vector3(...shots[0].from), q = new T.Vector3();
    camera.position.copy(eye);
    return function (step, dt, time) {
      const shot = shots[Math.min(step, shots.length - 1)];
      const k = reduced ? 1 : 1 - Math.exp(-dt * 2.2);
      const back = Math.max(1, 1.45 / camera.aspect);
      q.set(...shot.at); look.lerp(q, k);
      const drift = reduced ? 0 : 1;
      q.set(shot.at[0] + (shot.from[0] - shot.at[0]) * back + Math.sin(time / 4200) * 0.35 * drift,
        shot.at[1] + (shot.from[1] - shot.at[1]) * back,
        shot.at[2] + (shot.from[2] - shot.at[2]) * back + Math.cos(time / 5200) * 0.25 * drift);
      eye.lerp(q, k);
      camera.position.copy(eye);
      camera.lookAt(look);
    };
  }

  /** Ease a material's opacity; hide the mesh when fully transparent. */
  function fade(material, goal, dt, meshes) {
    const k = reduced ? 1 : 1 - Math.exp(-dt * 4);
    material.opacity += (goal - material.opacity) * k;
    if (Math.abs(goal - material.opacity) < 0.003) material.opacity = goal;
    material.depthWrite = material.opacity > 0.95;          // materials are created transparent, so only depth writing changes
    if (meshes) for (const m of [].concat(meshes)) m.visible = material.opacity > 0.01;
  }

  /** Lobe colours as a paint function; `dim` greys out everything except `keep`. */
  function lobes(keep, highlightPrefrontal) {
    const grey = new T.Color(0x3d4750), c = new T.Color();
    return function (r) {
      c.set(r === R.PREFRONTAL && highlightPrefrontal ? 0xB8501C : LOBE_COLOR[r]);
      if (keep && !keep.includes(r)) c.lerp(grey, 0.8);
      return c;
    };
  }

  /** The skull and face, as a translucent clay shell. Returns { group, material }. */
  function head() {
    const material = clay(0xF1D2B5, { transparent: true, opacity: 0.36, depthWrite: false, roughness: 0.9 });
    const g = new T.Group();
    const part = (geo, x, y, z, sx, sy, sz) => { const m = new T.Mesh(geo, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; };
    const ball = new T.SphereGeometry(1, 48, 32);
    part(ball, 0, 0.08, 0.02, 1.22, 1.36, 1.95);                      // cranium
    part(ball, 0, -1.25, 0.95, 0.95, 1.05, 1.05);                     // face and jaw
    part(new T.ConeGeometry(0.16, 0.5, 24), 0, -1.05, 1.92, 1, 1, 1).rotation.x = Math.PI / 2.3;   // nose
    part(ball, 1.18, -0.55, 0.1, 0.12, 0.32, 0.22); part(ball, -1.18, -0.55, 0.1, 0.12, 0.32, 0.22);   // ears
    part(new T.CylinderGeometry(0.75, 0.85, 2.2, 32), 0, -2.6, -0.35, 1, 1, 1);   // neck
    return { group: g, material };
  }

  /** Two eyes (white with a dark iris), left eye first. */
  function eyes() {
    const g = new T.Group(), list = [];
    for (const s of [1, -1]) {
      const eye = new T.Mesh(new T.SphereGeometry(0.16, 24, 16), clay(0xF6F3EC, { roughness: 0.4 }));
      const iris = new T.Mesh(new T.CircleGeometry(0.075, 20), clay(0x1E2A33));
      iris.position.z = 0.161;
      eye.add(iris);
      eye.position.set(s * 0.45, -0.72, 1.5);
      g.add(eye); list.push(eye);
    }
    return { group: g, list };
  }

  /* ---------- 4. Scene: interactive brain (#s-cerebro-3d) --------------- */
  (function explorer() {
    const slide = document.getElementById('s-cerebro-3d');
    const box = slide && slide.querySelector('.palco');
    if (!box) return;
    if (!T) { box.classList.add('sem-3d'); return; }
    const panel = slide.querySelector('.cerebro-info');
    const buttons = Array.from(slide.querySelectorAll('[data-lobo]'));
    const insideBtn = slide.querySelector('[data-ver="dentro"]');
    const splitBtn = slide.querySelector('[data-ver="separar"]');
    const brain = buildBrain();
    let selected = null, inside = false, split = false, userTurned = 0;

    // What each region does: short, for vocational students. Shown when a region is chosen.
    const INFO = {
      frontal: ['Lobo frontal', 'Planear, decidir, controlar impulsos. Comanda os movimentos voluntários e a produção da fala (área de Broca, em geral no lado esquerdo).'],
      prefrontal: ['Córtex pré-frontal', 'A parte da frente do lobo frontal. Ajuda a pensar nas consequências, a controlar impulsos e a seguir as regras sociais. Foi a zona mais atingida em Phineas Gage.'],
      parietal: ['Lobo parietal', 'Tato, dor e temperatura. Saber onde está o corpo e onde estão as coisas à nossa volta.'],
      temporal: ['Lobo temporal', 'Audição e compreensão da linguagem (área de Wernicke). Na face de dentro fica o hipocampo, essencial para guardar memórias.'],
      occipital: ['Lobo occipital', 'Visão: é aqui que o cérebro trata o que os olhos captam.'],
      cerebelo: ['Cerebelo', 'Equilíbrio e coordenação dos movimentos.'],
      tronco: ['Tronco cerebral', 'Respirar, bater do coração, acordar e adormecer. Liga o cérebro à espinal medula.'],
      talamo: ['Tálamo', 'No centro do cérebro. Funciona como uma estação de retransmissão: recebe a informação dos sentidos (menos o olfato) e envia-a para o córtex.'],
      caloso: ['Corpo caloso', 'Um grande feixe de substância branca que liga o hemisfério esquerdo ao direito.'],
    };
    const CODE = { frontal: [R.FRONTAL, R.PREFRONTAL], prefrontal: [R.PREFRONTAL], parietal: [R.PARIETAL], temporal: [R.TEMPORAL], occipital: [R.OCCIPITAL], cerebelo: [R.CEREBELO], tronco: [R.TRONCO], talamo: [], caloso: [] };
    const NAME_OF = { [R.FRONTAL]: 'frontal', [R.PREFRONTAL]: 'prefrontal', [R.PARIETAL]: 'parietal', [R.TEMPORAL]: 'temporal', [R.OCCIPITAL]: 'occipital', [R.CEREBELO]: 'cerebelo', [R.TRONCO]: 'tronco' };

    /** Show region `name` (or nothing): colours, panel text, pressed button. */
    function choose(name) {
      selected = name;
      const keep = name ? CODE[name] : null;
      brain.paint(lobes(keep && keep.length ? keep : (name ? [] : null), name === 'prefrontal'));
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lobo === name)));
      if (name === 'talamo' || name === 'caloso') setInside(true);
      const [title, text] = INFO[name] || ['Escolhe uma parte', 'Clica num lobo do cérebro ou num dos botões. Arrasta para rodar; usa a roda do rato para aproximar.'];
      panel.querySelector('h3').textContent = title;
      panel.querySelector('p').textContent = text;
    }
    function setInside(on) { inside = on; insideBtn.setAttribute('aria-pressed', String(on)); }
    buttons.forEach(b => b.addEventListener('click', e => { e.stopPropagation(); choose(selected === b.dataset.lobo ? null : b.dataset.lobo); }));
    insideBtn.addEventListener('click', e => { e.stopPropagation(); setInside(!inside); });
    splitBtn.addEventListener('click', e => { e.stopPropagation(); split = !split; splitBtn.setAttribute('aria-pressed', String(split)); });

    const turn = new T.Group();                 // the user turns this group
    turn.add(brain.group);
    turn.rotation.set(0.2, -1.15, 0);           // three-quarter view of the left hemisphere
    let stage;
    const camGoal = { dist: 8.2 };
    stage = makeStage(slide, box, (step, dt, time) => {
      if (!userTurned && !reduced) turn.rotation.y += dt * 0.12;             // slow turn until someone drags
      const k = reduced ? 1 : 1 - Math.exp(-dt * 5);
      brain.hemiL.position.x += ((split ? 0.45 : 0) - brain.hemiL.position.x) * k;
      brain.hemiR.position.x += ((split ? -0.45 : 0) - brain.hemiR.position.x) * k;
      fade(brain.material, inside ? 0.28 : 1, dt);
      fade(brain.thMat, inside ? 1 : 0, dt, brain.thalamus.children);
      fade(brain.callosum.material, inside ? 0.9 : 0, dt, brain.callosum);
      const back = Math.max(1, 1.2 / stage.camera.aspect);
      stage.camera.position.set(0, 0.6, camGoal.dist * back);
      stage.camera.lookAt(0, -0.15, 0);
      brain.tick(dt);
    });
    if (!stage) return;
    stage.scene.add(turn);
    choose(null);

    // Labels for the deep structures, visible in «ver por dentro».
    stage.label('tálamo', brain.thalamus.children[0], 'nota-et', () => inside);
    stage.label('corpo caloso', brain.callosum, 'nota-et', () => inside);

    /* Pointer: drag turns the brain; a click without dragging picks a region.
       Touch events stop here so app.js does not read a drag as a slide swipe. */
    const canvas = stage.renderer.domElement, ray = new T.Raycaster(), ndc = new T.Vector2();
    let down = null;
    canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, rx: turn.rotation.x, ry: turn.rotation.y, moved: false }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > 5) { down.moved = true; userTurned = 1; }
      turn.rotation.y = down.ry + dx * 0.008;
      turn.rotation.x = clamp(down.rx + dy * 0.006, -1.2, 1.2);
    });
    canvas.addEventListener('pointerup', e => {
      if (down && !down.moved) {
        const rect = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        ray.setFromCamera(ndc, stage.camera);
        const targets = inside ? [...brain.thalamus.children, brain.callosum] : brain.parts;
        const hit = ray.intersectObjects(targets, false)[0];
        if (!hit) choose(null);
        else if (hit.object === brain.callosum) choose('caloso');
        else if (brain.thalamus.children.includes(hit.object)) choose('talamo');
        else {
          const name = NAME_OF[hit.object.userData.regions[hit.face.a]];
          choose(name === 'prefrontal' && selected !== 'prefrontal' && selected !== 'frontal' ? 'frontal' : name);
        }
      }
      down = null;
    });
    canvas.addEventListener('wheel', e => { e.preventDefault(); camGoal.dist = clamp(camGoal.dist + e.deltaY * 0.004, 5, 13); }, { passive: false });
    ['touchstart', 'touchend'].forEach(t => canvas.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  })();

  /* ---------- 5. Scene: Gage's accident (#s-gage-3d) -------------------- */
  (function gage() {
    const slide = document.getElementById('s-gage-3d');
    const box = slide && slide.querySelector('.palco');
    if (!box) return;
    if (!T) { box.classList.add('sem-3d'); return; }
    const brain = buildBrain();
    const skull = head(), eyePair = eyes();
    const world = new T.Group();
    world.add(brain.group, skull.group, eyePair.group);

    // The path of the tamping iron: in under the left cheekbone, behind the
    // left eye, out at the top of the head near the midline (Harlow 1848;
    // Van Horn and colleagues 2012). E = entry, X = exit.
    const E = new T.Vector3(0.95, -1.5, 1.55), X = new T.Vector3(0.25, 1.2, 0.7);
    const D = X.clone().sub(E), lenEX = D.length();
    D.normalize();
    // The iron: 1.09 m ≈ 21 units, 3.2 cm ≈ 0.31 units radius… thinner for
    // legibility; the last 30 cm taper to a point, and the pointed end went in first.
    const L = 21;
    const profile = [[0, 0], [0.3, 0], [0.31, 0.05], [0.31, L - 6], [0.06, L - 0.05], [0, L]].map(([x, y]) => new T.Vector2(x, y));
    const rod = new T.Mesh(new T.LatheGeometry(profile, 32), clay(0x6F7880, { metalness: 0.6, roughness: 0.35 }));
    rod.castShadow = true;
    const rodTag = new T.Object3D();                 // label anchor near the pointed end
    rodTag.position.y = L - 1.2;
    rod.add(rodTag);
    rod.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), D);
    world.add(rod);
    // The tunnel the iron leaves behind (grows with the iron's tip).
    const tunnel = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 1, 24, 1, true), clay(0x7A1F12, { transparent: true, opacity: 0.7, side: T.DoubleSide }));
    tunnel.quaternion.copy(rod.quaternion);
    world.add(tunnel);
    // Sparks of the explosion.
    const sparks = [], sparkMat = clay(0xF0A673, { emissive: 0xF0A673, emissiveIntensity: 1.2, transparent: true });
    const sr = rng(3);
    for (let i = 0; i < 40; i++) {
      const s = new T.Mesh(new T.SphereGeometry(0.06 + sr() * 0.06, 8, 6), sparkMat);
      s.userData.v = new T.Vector3(sr() - 0.5, sr() * 0.6, sr() - 0.5).normalize().multiplyScalar(2 + sr() * 4);
      sparks.push(s); world.add(s);
    }
    const flash = new T.PointLight(0xffb070, 0, 12);
    flash.position.copy(E).add(new T.Vector3(0, -0.6, 0.4));
    world.add(flash);

    // White matter fibres from the left frontal lobe to the rest of the brain.
    // Those that pass close to the iron's path are drawn as cut (red).
    const fibreOk = clay(0xF6F3EC, { transparent: true, opacity: 0, emissive: 0x9ec3e6, emissiveIntensity: 0.25 });
    const fibreCut = clay(0xC23B22, { transparent: true, opacity: 0, emissive: 0xC23B22, emissiveIntensity: 0.4 });
    const fibres = new T.Group();
    const starts = brain.surface(R.FRONTAL, 34, 21, 1, 0.18);
    const ends = [...brain.surface(R.PARIETAL, 10, 22), ...brain.surface(R.TEMPORAL, 8, 23, 1), ...brain.surface(R.OCCIPITAL, 6, 24), ...brain.surface(R.FRONTAL, 6, 25, -1)];
    const segDist = (p) => { const t = clamp(p.clone().sub(E).dot(D), 0, lenEX); return p.distanceTo(E.clone().addScaledVector(D, t)); };
    starts.forEach((a, i) => {
      const b = ends[i % ends.length], bend = new T.Vector3(0, 0.15, 0).add(a.clone().add(b).multiplyScalar(-0.25));
      const f = fibre(a, b, bend, 0.022, fibreOk);
      const cut = f.userData.curve.getPoints(30).some(p => segDist(p) < 0.42);
      if (cut) f.material = fibreCut;
      fibres.add(f);
    });
    brain.group.add(fibres);

    // Colours per step: neutral tissue, then lobes with the lesion in dark red.
    const lesion = new T.Color(0x5E140B), tissue = new T.Color(TISSUE), c = new T.Color();
    const nearPath = (x, y, z) => segDist(new T.Vector3(x, y, z)) < 0.45;
    const PAINT = [
      () => tissue, () => tissue, () => tissue,
      (r, x, y, z) => nearPath(x, y, z) ? lesion : c.set(r === R.PREFRONTAL ? 0xC9652E : LOBE_COLOR[r]),
      (r, x, y, z) => nearPath(x, y, z) ? lesion : c.set(LOBE_COLOR[r]),
    ];
    const CAMERA = [
      { from: [12.5, 0.5, 10.5], at: [0.2, -2.6, 0.6] },   // Gage at work, the iron under his face
      { from: [15, 2, 12], at: [0.3, 1.0, 0.4] },          // wide: the iron flies through
      { from: [8.4, 1.2, 7.6], at: [0.3, -0.4, 0.7] },     // the path through the head
      { from: [8, 1.8, 1.6], at: [0.2, 0.1, 0.1] },        // the damaged left frontal lobe, seen from the left
      { from: [5.2, 4.6, 3.6], at: [0, 0.1, 0] },          // fibres from above
    ];
    // Where the iron's tip is along its path, per step (0 = entry point).
    const TIP = [-0.35, lenEX + 9, lenEX + L + 40, lenEX + L + 40, lenEX + L + 40];

    let painted = -1, tip = TIP[0], move;
    const stage = makeStage(slide, box, (step, dt, time, since) => {
      move(step, dt, time);
      if (step !== painted) { brain.paint(PAINT[Math.min(step, PAINT.length - 1)]); painted = step; }
      // the iron travels fast (an explosion), in both directions
      const goal = TIP[Math.min(step, TIP.length - 1)], speed = reduced ? 1e9 : 40;
      tip += clamp(goal - tip, -speed * dt, speed * dt);
      rod.position.copy(E).addScaledVector(D, tip - L);
      rod.visible = tip < lenEX + L + 20;
      const done = clamp(tip / lenEX, 0, 1);
      tunnel.visible = done > 0.01 && step < 3;            // from step 3 the lesion itself is shown
      tunnel.scale.set(1, Math.max(done * lenEX, 0.001), 1);
      tunnel.position.copy(E).addScaledVector(D, done * lenEX / 2);
      // explosion: sparks and flash in the first second of step 1
      const boom = step === 1 && since < 1.2 && !reduced;
      sparks.forEach(s => {
        s.visible = boom;
        if (boom) s.position.copy(E).addScaledVector(s.userData.v, since * 0.6).add(new T.Vector3(0, -0.4, 0));
      });
      sparkMat.opacity = 1 - since / 1.2;
      flash.intensity = boom ? 40 * Math.max(0, 1 - since / 0.6) : 0;
      // the skull fades when we look at the brain itself; the brain fades for the fibres
      fade(skull.material, step <= 2 ? 0.36 : 0.05, dt);
      fade(brain.material, step >= 4 ? 0.22 : 1, dt);
      fade(fibreOk, step >= 4 ? 0.85 : 0, dt);
      fade(fibreCut, step >= 4 ? 1 : 0, dt);
      fibres.visible = fibreOk.opacity > 0.01;
      eyePair.group.visible = step <= 2;
      brain.tick(dt);
    });
    if (!stage) return;
    stage.scene.add(world);
    move = director(stage.camera, CAMERA, 0.35, 0.95);

    const mid = E.clone().addScaledVector(D, lenEX * 0.62).toArray();
    stage.label('entrada: por baixo da maçã do rosto', E.toArray(), 'nota-et', s => s === 2);
    stage.label('saída: topo da cabeça', X.clone().add(new T.Vector3(0, 0.15, 0)).toArray(), 'nota-et', s => s === 2);
    stage.label('olho esquerdo', eyePair.list[0], 'nota-et', s => s === 2);
    stage.label('barra de ferro · 1,09 m · 6 kg', rodTag, 'nota-et', s => s === 0);
    stage.label('lobo frontal esquerdo', [0.95, 0.75, 0.75], 'pais-et', s => s === 3);
    stage.label('córtex pré-frontal', mid, 'comum-et', s => s === 3);
    stage.label('parietal', [0.75, 0.9, -0.55], 'pais-et', s => s === 3);
    stage.label('temporal', [0.95, -0.55, -0.05], 'pais-et', s => s === 3);
    stage.label('occipital', [0.6, 0.15, -1.55], 'pais-et', s => s === 3);
    stage.label('ligações cortadas', mid, 'comum-et', s => s === 4);
  })();

  /* ---------- 6. Scene: lobotomy (#s-lobotomia-3d) ---------------------- */
  (function lobotomia() {
    const slide = document.getElementById('s-lobotomia-3d');
    const box = slide && slide.querySelector('.palco');
    if (!box) return;
    if (!T) { box.classList.add('sem-3d'); return; }
    const brain = buildBrain();
    const skull = head(), eyePair = eyes();
    const world = new T.Group();
    world.add(brain.group, skull.group, eyePair.group);
    brain.thMat.opacity = 1;

    // Thalamus → cortex fibres. The prefrontal ones are the ones that get cut.
    const centre = [new T.Vector3(0.17, -0.06, -0.12), new T.Vector3(-0.17, -0.06, -0.12)];
    const relayMat = clay(0xF6F3EC, { transparent: true, opacity: 0.55, emissive: 0x9ec3e6, emissiveIntensity: 0.2 });
    const pfMat = clay(0xF0A673, { transparent: true, opacity: 0.6, emissive: 0xA44A16, emissiveIntensity: 0.3 });
    const cutMat = clay(0x6F7880, { transparent: true, opacity: 0.35 });
    const lines = [];
    function addFibres(region, count, seed, isPf) {
      for (const side of [1, -1]) {
        brain.surface(region, count, seed + (side > 0 ? 0 : 50), side, 0.16).forEach(p => {
          const from = centre[side > 0 ? 0 : 1].clone();
          const f = fibre(from, p, new T.Vector3(side * 0.12, 0.12, 0), isPf ? 0.02 : 0.014, isPf ? pfMat : relayMat);
          f.userData.pf = isPf;
          brain.group.add(f); lines.push(f);
        });
      }
    }
    addFibres(R.PREFRONTAL, 5, 31, true);
    addFibres(R.FRONTAL, 2, 32, false);
    addFibres(R.PARIETAL, 4, 33, false);
    addFibres(R.TEMPORAL, 3, 34, false);
    addFibres(R.OCCIPITAL, 3, 35, false);
    const CUT_T = 0.58;                                        // where along a prefrontal fibre the cut falls

    // Signals: small glowing beads that run along the fibres.
    const beadMat = clay(0xFFE2C4, { emissive: 0xF0A673, emissiveIntensity: 1.4 });
    const beads = [];
    const br = rng(9);
    lines.forEach(f => { for (let k = 0; k < 2; k++) { const b = new T.Mesh(new T.SphereGeometry(0.04, 10, 8), beadMat); b.userData = { f, phase: br(), back: k === 1 }; brain.group.add(b); beads.push(b); } });

    // Cut marks on the prefrontal fibres (shown from step 2 on).
    const markMat = clay(0xC23B22, { emissive: 0xC23B22, emissiveIntensity: 0.5, transparent: true, opacity: 0 });
    const marks = lines.filter(f => f.userData.pf).map(f => {
      const m = new T.Mesh(new T.SphereGeometry(0.07, 12, 10), markMat);
      m.position.copy(f.userData.curve.getPoint(CUT_T));
      brain.group.add(m); return m;
    });

    // Instruments: a thin steel rod; one per method, shown in its step.
    const steel = clay(0xC9D1D8, { metalness: 0.7, roughness: 0.3 });
    function tool(from, to, length) {
      const dir = to.clone().sub(from).normalize();
      const g = new T.Group();
      const shaft = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, length, 12), steel);
      shaft.position.y = length / 2;
      const handle = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 0.6, 16), clay(0x1E2A33));
      handle.position.y = length + 0.3;
      g.add(shaft, handle);
      g.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), dir);   // local −y points along dir, so the shaft trails behind the tip
      // sweep axis: perpendicular to the tool, so the tip swings sideways
      const axis = new T.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.8 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0)).normalize();
      g.userData = { from, to, dir, axis };
      world.add(g);
      return g;
    }
    // Moniz and Almeida Lima: from holes at the top of the skull, into frontal white matter.
    const moniz = [1, -1].map(s => tool(new T.Vector3(s * 0.55, 1.35, 0.85), new T.Vector3(s * 0.4, 0.15, 0.95), 2.4));
    // Freeman and Watts: from the side of the skull, at the coronal suture.
    const freeman = [1, -1].map(s => tool(new T.Vector3(s * 1.4, 0.05, 0.6), new T.Vector3(s * 0.25, -0.05, 0.6), 2.4));
    // Transorbital: through the eye socket, above the eye, up into the frontal lobe.
    const orbital = [1, -1].map(s => tool(new T.Vector3(s * 0.42, -0.62, 2.4), new T.Vector3(s * 0.38, 0.05, 1.05), 2.4));
    const holes = [];
    const holeMat = clay(0x1E2A33);
    [[0.55, 1.33, 0.85], [-0.55, 1.33, 0.85], [1.21, 0.05, 0.6], [-1.21, 0.05, 0.6]].forEach(p => {
      const h = new T.Mesh(new T.SphereGeometry(0.1, 12, 8), holeMat); h.position.set(...p); world.add(h); holes.push(h);
    });

    const CAMERA = [
      { from: [5.4, 3.2, 5.6], at: [0, -0.1, 0] },          // thalamus relays to the whole cortex
      { from: [7, 1.8, 2.6], at: [0, 0, 0.35] },            // prefrontal ↔ thalamus, seen from the left
      { from: [3.6, 6, 5.6], at: [0, 0.4, 0.6] },           // Moniz: from above
      { from: [7, 1.6, 3.4], at: [0, 0.1, 0.4] },           // Freeman and Watts: from the side
      { from: [3.4, 0.2, 7.4], at: [0.2, -0.2, 0.9] },      // transorbital: from the front
      { from: [6.6, 2.8, 3.2], at: [0, -0.1, 0.1] },        // result
    ];
    const grey = new T.Color(0x56616b), cc = new T.Color();
    const PAINT = [
      lobes(null),
      lobes([R.PREFRONTAL], true),
      lobes([R.PREFRONTAL, R.FRONTAL], true),
      lobes([R.PREFRONTAL, R.FRONTAL], true),
      lobes([R.PREFRONTAL, R.FRONTAL], true),
      r => r === R.PREFRONTAL ? grey : cc.set(LOBE_COLOR[r]),
    ];
    let painted = -1, move;
    const stage = makeStage(slide, box, (step, dt, time, since) => {
      move(step, dt, time);
      if (step !== painted) { brain.paint(PAINT[Math.min(step, PAINT.length - 1)]); painted = step; }
      const cut = step >= 2;
      fade(brain.material, 0.2, dt);
      fade(skull.material, step >= 2 && step <= 4 ? 0.22 : 0, dt, skull.group.children);
      eyePair.group.visible = step === 4;
      fade(markMat, cut ? 1 : 0, dt);
      relayMat.opacity = step === 1 ? 0.12 : 0.55;
      lines.forEach(f => { if (f.userData.pf) f.material = step >= 5 ? cutMat : pfMat; });
      // signals: all fibres in steps 0 and 5 (not prefrontal in 5); only prefrontal in 1–4, stopping at the cut
      beads.forEach(b => {
        const { f, phase, back } = b.userData, pf = f.userData.pf;
        let show = step === 0 ? !back : step === 5 ? !pf && !back : pf;
        let t = (time / 1800 + phase) % 1;
        if (back) t = 1 - t;
        if (pf && cut) {                                         // the signal no longer gets past the cut
          if (step >= 5) show = false;
          else if (!back) t = Math.min(t, CUT_T); else t = Math.max(t, CUT_T);
        }
        b.visible = show && !reduced;
        if (b.visible) b.position.copy(f.userData.curve.getPoint(t));
      });
      // instruments: slide in through the hole, then sweep around it
      // (the cut was made by sweeping the blade from side to side)
      const sweep = reduced ? 0 : Math.sin(time / 500) * 0.3;
      const place = (list, on) => list.forEach(g => {
        const { from, to, dir, axis } = g.userData;
        g.visible = on;
        if (!on) return;
        const go = smooth(0, 1.5, since);
        const aim = dir.clone().applyAxisAngle(axis, go * sweep);
        const depth = -0.8 + go * (from.distanceTo(to) + 0.8);       // starts outside the head
        g.position.copy(from).addScaledVector(aim, depth);            // the group's origin is the tip
        g.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), aim);
      });
      place(moniz, step === 2);
      place(freeman, step === 3);
      place(orbital, step === 4);
      holes[0].visible = holes[1].visible = step === 2;
      holes[2].visible = holes[3].visible = step === 3;
      brain.tick(dt);
    });
    if (!stage) return;
    stage.scene.add(world);
    move = director(stage.camera, CAMERA);
    stage.label('tálamo', brain.thalamus.children[0], 'comum-et', s => s <= 1 || s === 5);
    stage.label('córtex pré-frontal', [0.55, 0.5, 1.5], 'pais-et', s => s >= 1);
    stage.label('corte', marks[0], 'nota-et', s => s >= 2 && s <= 4);
    stage.label('leucótomo', moniz[0].children[1], 'nota-et', s => s === 2);
    stage.label('leucótomo', freeman[0].children[1], 'nota-et', s => s === 3);
    stage.label('instrumento fino, pela órbita', orbital[0].children[1], 'nota-et', s => s === 4);
  })();
})();
