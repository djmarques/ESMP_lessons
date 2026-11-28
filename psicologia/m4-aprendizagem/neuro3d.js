/* =====================================================================
   neuro3d.js — the 3D scenes of Psicologia, Módulo 4: «Por dentro do cérebro»,
   the five degraus of learning and Kolb's cycle. Loaded after app.js.

   A scene lives in <div class="palco3d" data-cena="NAME"> inside a slide:

     caixa      the «black box» opens: skull → cortex → prefrontal → deep structures
     memoria    how a memory is stored: areas of the cortex, real fibre bundles, the hippocampus, consolidation
     piramidal  two neurons of the cortex: dendrites, spines, cell body, axon; three signals are not enough, seven are
     sinapse    one synapse, very close: vesicles, transmitter, receptors, sodium coming in
     potencial  the action potential: sodium channels, potassium channels, and the voltage plotted beside the stage
     hebb       mini-game: a student learns a new way to school; groups of neurons that fire together wire together
     cortex     the brain cut across: the cortex is the outer ribbon, thinner from 3 to 20 years (Piccolo and colleagues, 2016)
     medir      how brain activity is measured: EEG, fMRI, and a sound followed through thousands of neurons
     sirene     habituation: play the alarm and watch thousands of neurons answer, the amygdala less each time
     lesma      Kandel's sea slug (Aplysia) at three scales: the animal, the circuit of the reflex, the synapse
     pavlov     degrau 2 · ring the bell, give the food: the dog learns to salivate at the bell
     medo       degrau 2 · the little Albert in the brain: rat and noise meet in the amygdala
     skinner    degrau 3 · a Skinner box with four consequences (reinforcement and punishment)
     dopamina   degrau 3 · dopamine neurons signal «better or worse than predicted»
     kohler     degrau 4 · the chimpanzee, the stick and the banana: insight
     tolman     degrau 4 · mini-game: explore a maze without cheese, then run for the cheese
     regiao     one idea on the real brain: data-regiao="hipocampo" (place cells) or "espelho"
     bobo       degrau 5 · Bandura's doll: data-modo="1961" (imitation) or "1965" (model rewarded or punished)
     kolb       lesson 8 · the four moments of Kolb's cycle and the four styles between them

   Anatomy is real, not drawn: cortex and deep structures (FreeSurfer fsaverage) and skull (BodyParts3D)
   come from cp4/cerebro3d-dados.js, the fibre bundles (HCP1065 tractography atlas) from neuro-feixes.js;
   all in millimetres of the MNI305 template (x → right, y → front, z → up). The firing of the «neurons»,
   the pyramidal cells, the synapse, the membrane, the sea slug, the animals, the people and Kolb's ring are models.

   How scenes follow the lesson: app.js puts the classes ge1, ge2… on the slide as the teacher
   clicks («step is at least n»). Every frame a scene reads the step and eases towards what
   that step shows, so going back, or opening the slide at any step, always works.
   Buttons and sliders are plain HTML in the slide (data-act, data-ctl); captions are the
   <p data-step> inside .leg3d (over the stage) or .leg3d.fora (under it, when a panel sits beside the stage).

   Code comments in English; every text students read is in European Portuguese.
   ===================================================================== */
(function () {
  'use strict';
  const T = window.THREE, D = window.CEREBRO3D;
  const boxes = [...document.querySelectorAll('.palco3d')];
  if (!boxes.length) return;
  if (!T) { boxes.forEach(b => b.classList.add('sem-3d')); return; }

  const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  /** Move v towards goal; most of the way in about 1/k seconds. */
  const toward = (v, goal, dt, k = 4) => calm ? goal : v + (goal - v) * (1 - Math.exp(-dt * k));
  const S = 0.02;                                   // 1 scene unit = 50 mm
  /** Millimetres (MNI305: x right, y front, z up) → scene units (y up). */
  const W = p => new T.Vector3(p[0] * S, p[2] * S, -p[1] * S);
  const COR = {
    tecido: 0xD7B2A4, osso: 0xE9E0C9, prefrontal: 0xB8501C, cerebelo: 0x9C7E9A, tronco: 0xA7B0B8,
    talamo: 0xF2C14E, hipocampo: 0xC57BA6, amigdala: 0xE0603A, sinal: 0xFFE28A, laranja: 0xF0A673, azul: 0x7FB0D0, creme: 0xF6F3EC,
  };
  const mat = (color, extra) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.7, metalness: 0, transparent: true }, extra || {}));

  /* ---------- 1. Decoding the anatomy (same format as cp4/cerebro3d.js) ---------- */
  function bytes(b64) { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
  const geoCache = {};
  /** BufferGeometry of one mesh of the data file, in millimetres. */
  function geometry(name) {
    if (geoCache[name]) return geoCache[name];
    const m = D.meshes[name], q = new Int16Array(bytes(m.p)), pos = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) pos[i] = q[i] / 100;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setIndex(new T.BufferAttribute(m.i32 ? new Uint32Array(bytes(m.i)) : new Uint16Array(bytes(m.i)), 1));
    g.computeVertexNormals(); g.computeBoundingBox();
    if (m.lobe) g.userData = { flag: new Uint8Array(bytes(m.flag)), sulc: new Int8Array(bytes(m.sulc)) };
    return (geoCache[name] = g);
  }
  /** Middle of a mesh, in millimetres (where its label and its signals go). */
  const centre = name => { const c = new T.Vector3(); geometry(name).boundingBox.getCenter(c); return [c.x, c.y, c.z]; };

  /**
   * A real point of the surface of a mesh, in millimetres: the vertex nearest to `hint` (or to the middle of the mesh).
   * It is where the arrow of a label ends, so that the arrow always touches the structure it names.
   */
  function onMesh(name, hint) {
    const pos = geometry(name).getAttribute('position'), h = hint || centre(name); let best = 0, bestD = Infinity;
    for (let i = 0; i < pos.count; i++) { const d = (pos.getX(i) - h[0]) ** 2 + (pos.getY(i) - h[1]) ** 2 + (pos.getZ(i) - h[2]) ** 2; if (d < bestD) { bestD = d; best = i; } }
    return [pos.getX(best), pos.getY(best), pos.getZ(best)];
  }
  /**
   * One head for one scene: cortex (two hemispheres with their own colours), cerebellum,
   * brainstem, thalamus, hippocampus, amygdala and skull. Everything sits in `group`,
   * which turns millimetres into scene units.
   */
  function buildHead() {
    const group = new T.Group(); group.rotation.x = -Math.PI / 2; group.scale.setScalar(S);
    const h = { group, cortex: [], mats: {} };
    h.mats.cortex = mat(0xffffff, { vertexColors: true, roughness: 0.62 });
    for (const side of ['lh', 'rh']) {
      const g = geometry(side).clone(); g.userData = geometry(side).userData;
      g.setAttribute('color', new T.BufferAttribute(new Float32Array(g.getAttribute('position').count * 3), 3));
      const m = new T.Mesh(g, h.mats.cortex); m.renderOrder = 3; group.add(m); h.cortex.push(m);
    }
    const add = (key, names, color, order) => {
      h.mats[key] = mat(color);
      h[key] = names.map(n => { const m = new T.Mesh(geometry(n), h.mats[key]); m.renderOrder = order; group.add(m); return m; });
    };
    add('cerebelo', ['cerebelo'], COR.cerebelo, 2); add('tronco', ['tronco'], COR.tronco, 2);
    add('talamo', ['talamo_e', 'talamo_d'], COR.talamo, 1); add('hipocampo', ['hipocampo_e', 'hipocampo_d'], COR.hipocampo, 1);
    add('amigdala', ['amigdala_e', 'amigdala_d'], COR.amigdala, 1);
    h.mats.osso = mat(COR.osso, { roughness: 0.85, side: T.DoubleSide });
    h.osso = ['cranio', 'mandibula'].map(n => { const m = new T.Mesh(geometry(n), h.mats.osso); m.renderOrder = 4; group.add(m); return m; });
    /** Invisible point (millimetres) that labels and signals can follow. */
    h.anchor = p => { const o = new T.Object3D(); o.position.set(p[0], p[1], p[2]); group.add(o); return o; };
    paint(h, null);
    return h;
  }
  /**
   * Colour the cortex. `base(prefrontal)` gives the colour of the tissue ([r, g, b], 0…1; null = natural);
   * `glows` is a list of { c: [x, y, z] mm, r: radius mm, a: strength 0…1, cor: [r, g, b] } that light up
   * the cortex around a point (activity). Folds are shaded from the depth map, as on a real brain.
   */
  const tmp = new T.Color();
  const rgb = hex => { tmp.setHex(hex); return [tmp.r, tmp.g, tmp.b]; };
  const TECIDO = rgb(COR.tecido);
  function paint(h, base, glows) {
    for (const m of h.cortex) {
      const g = m.geometry, pos = g.getAttribute('position').array, col = g.getAttribute('color'), u = g.userData, n = col.count;
      for (let i = 0; i < n; i++) {
        let c = (base && base((u.flag[i] & 1) === 1)) || TECIDO;
        let r = c[0], gg = c[1], b = c[2];
        if (glows) for (const gl of glows) {
          if (gl.a < 0.01) continue;
          const dx = pos[i * 3] - gl.c[0], dy = pos[i * 3 + 1] - gl.c[1], dz = pos[i * 3 + 2] - gl.c[2];
          const k = gl.a * Math.exp(-(dx * dx + dy * dy + dz * dz) / (gl.r * gl.r));
          if (k > 0.01) { r += (gl.cor[0] - r) * k; gg += (gl.cor[1] - gg) * k; b += (gl.cor[2] - b) * k; }
        }
        const shade = 1 - 0.38 * clamp((u.sulc[i] / 127 + 0.25) / 1.1);
        col.setXYZ(i, r * shade, gg * shade, b * shade);
      }
      col.needsUpdate = true;
    }
  }
  /** Ease a material's opacity; hide its meshes when it reaches zero. */
  function fade(material, goal, dt, meshes) {
    material.opacity = toward(material.opacity, goal, dt, 4);
    if (Math.abs(goal - material.opacity) < 0.004) material.opacity = goal;
    material.depthWrite = material.opacity > 0.95;
    for (const m of meshes) m.visible = material.opacity > 0.01;
  }

  /* ---------- 2. Stage: renderer, lights, camera, labels, the frame loop ---------- */
  /**
   * @param {Element} box      the .palco3d element
   * @param {Function} update  update(step, dt, time, sinceStep) called every frame while the slide is shown
   * @returns {{scene, camera, label, slide, ctl}} or null when the browser has no WebGL
   */
  /**
   * ONE WebGL renderer (and one canvas) for the whole page. A browser keeps only a few WebGL contexts alive
   * (about 16 on a computer, fewer on phones) and silently kills the oldest when a page asks for more: with
   * one renderer per scene, the first scenes of the lesson went blank as soon as the page had more scenes
   * than that. Only one slide is shown at a time, so the scene of the current slide borrows the canvas.
   */
  let shared, arrowCount = 0;
  function sharedRenderer() {
    if (shared !== undefined) return shared;
    try {
      shared = new T.WebGLRenderer({ antialias: true, alpha: true, stencil: true });
      shared.localClippingEnabled = true;                              // the cortex scene cuts the brain with a plane
      shared.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      shared.domElement.className = 'c3d';
      // if the graphics card resets, let the browser give the context back instead of leaving a dead canvas
      shared.domElement.addEventListener('webglcontextlost', e => e.preventDefault());
    } catch (e) { shared = null; }
    return shared;
  }
  function makeStage(box, update) {
    const slide = box.closest('.slide'), renderer = sharedRenderer();
    if (!renderer) { box.classList.add('sem-3d'); return null; }
    const canvas = renderer.domElement;
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(30, 1, 0.05, 400);
    scene.add(new T.HemisphereLight(0xffffff, 0x2a3540, 1.5));
    const key = new T.DirectionalLight(0xfff0dc, 2.2); key.position.set(-4, 6, 6); scene.add(key);
    const rim = new T.DirectionalLight(0x9ec3e6, 1.1); rim.position.set(4, 3, -6); scene.add(rim);
    const labels = [], p = new T.Vector3(), tip = new T.Vector3(), SVG = 'http://www.w3.org/2000/svg';
    let arrows = null;
    /**
     * HTML label that follows a 3D object; `when(step)` says in which steps it shows.
     * With `aim` (another 3D object: the exact place the label talks about), an arrow is drawn from the label to that place.
     */
    function label(html, target, when, cls, aim) {
      const el = document.createElement('div'); el.className = 'et3d ' + (cls || ''); el.innerHTML = html; box.append(el);
      const item = { el, target, when };
      if (aim) {
        if (!arrows) {                                                  // one SVG layer per stage, under the labels
          const id = 'seta3d-' + (++arrowCount);
          arrows = document.createElementNS(SVG, 'svg'); arrows.setAttribute('class', 'setas3d'); arrows.setAttribute('aria-hidden', 'true'); arrows.dataset.ponta = id;
          arrows.innerHTML = `<defs><marker id="${id}" markerUnits="userSpaceOnUse" markerWidth="15" markerHeight="15" refX="13" refY="7.5" orient="auto"><path d="M0 0 L15 7.5 L0 15 Z"/></marker></defs>`;
          box.insertBefore(arrows, box.querySelector('.et3d'));
        }
        item.aim = aim; item.line = document.createElementNS(SVG, 'line'); item.line.setAttribute('marker-end', `url(#${arrows.dataset.ponta})`); arrows.append(item.line);
      }
      labels.push(item); return el;
    }
    let width = 1, height = 1, last = 0, running = false, step = -1, stepAt = 0;
    const mine = () => canvas.parentNode === box;                       // is the shared canvas in this stage right now?
    function resize() {
      if (!mine()) return;                                              // a hidden stage must not resize the canvas another slide is using
      width = box.clientWidth || 1; height = box.clientHeight || 1; renderer.setSize(width, height, false); camera.aspect = width / height;
      // the caption covers the bottom of the stage: the picture is drawn a little higher than the middle
      // (data-dy replaces that 14%; data-dx="0.2" moves the picture 20% of the width to the left, away from a card on the right, except on phones)
      const dy = box.dataset.dy !== undefined ? Number(box.dataset.dy) : box.querySelector('.leg3d') ? 0.14 : 0;
      camera.setViewOffset(width, height, width * Number(box.dataset.dx || 0) * (width < 700 ? 0 : 1), height * dy, width, height); camera.updateProjectionMatrix();
    }
    const currentStep = () => { let k = 0; while (slide.classList.contains('ge' + (k + 1))) k++; return k; };
    function frame(time) {
      if (!slide.classList.contains('current') || !mine()) { running = false; return; }
      requestAnimationFrame(frame);
      const dt = Math.min((time - last) / 1000 || 0.016, 0.05); last = time;
      const s = currentStep();
      if (s !== step) {
        step = s; stepAt = time;
        // an element with data-em="2 3" is shown only in steps 2 and 3 (cards and plots laid over the stage)
        box.querySelectorAll('[data-em]').forEach(el => el.classList.toggle('agora', el.dataset.em.split(' ').includes(String(s))));
      }
      update(step, dt, time / 1000, (time - stepAt) / 1000);
      renderer.render(scene, camera);
      for (const item of labels) {
        item.target.getWorldPosition(p); p.project(camera);
        const shown = item.when(step) && p.z < 1, ly = ((1 - p.y) / 2) * height; let lx = ((p.x + 1) / 2) * width;
        item.el.classList.toggle('visivel', shown);
        const w = item.aim ? item.el.offsetWidth : 0, h = item.aim ? item.el.offsetHeight : 0, c = item.el.classList;
        if (item.aim && !c.contains('lado') && w < width - 8) lx = clamp(lx, w / 2 + 4, width - w / 2 - 4);   // a label with an arrow never leaves the stage sideways
        item.el.style.transform = `translate(-50%, -100%) translate(${lx}px, ${ly}px)`;
        if (!item.aim) continue;
        // the arrow: from the edge of the label nearest to the place, to the place itself
        item.aim.getWorldPosition(tip).project(camera);
        const ax = ((tip.x + 1) / 2) * width, ay = ((1 - tip.y) / 2) * height;
        const x0 = lx - w / 2 + (c.contains('lado') ? w / 2 : 0), y0 = ly - h + (c.contains('baixo') ? 1.18 * h : c.contains('lado') ? h / 2 : 0);
        const sx = clamp(ax, x0, x0 + w), sy = clamp(ay, y0, y0 + h), far = Math.hypot(ax - sx, ay - sy) > 16;
        item.line.style.opacity = shown && far ? 1 : 0;                 // no arrow when the label already sits on the place
        if (far) { item.line.setAttribute('x1', sx); item.line.setAttribute('y1', sy); item.line.setAttribute('x2', ax); item.line.setAttribute('y2', ay); }
      }
    }
    function start() {
      if (running || !slide.classList.contains('current')) return;
      if (!mine()) box.prepend(canvas);                                 // borrow the canvas from the slide that had it
      running = true; last = performance.now(); resize(); requestAnimationFrame(frame);
    }
    new ResizeObserver(resize).observe(box);
    new MutationObserver(start).observe(slide, { attributes: true, attributeFilter: ['class'] });
    setTimeout(start, 0);
    /** Value of a slider of this slide (data-ctl="name"). */
    const ctl = name => { const el = slide.querySelector(`[data-ctl="${name}"]`); return el ? Number(el.value) : 0; };
    /** Run fn when a button of this slide (data-act="name") is pressed. */
    const on = (name, fn) => slide.querySelectorAll(`[data-act="${name}"]`).forEach(b => b.addEventListener('click', fn));
    return { scene, camera, label, slide, ctl, on, box, pixels: () => height * renderer.getPixelRatio() };
  }
  /**
   * Camera that eases towards shots[step] = { at, from } (already in scene units), with a slow sway.
   * `span` says how wide the scene is: on screens narrower than that (phones held upright) the camera steps back.
   */
  function director(camera, shots, span) {
    const look = shots[0].at.clone(), eye = shots[0].from.clone(), q = new T.Vector3();
    camera.position.copy(eye);
    return function (step, dt, time) {
      const shot = shots[Math.min(step, shots.length - 1)], k = calm ? 1 : 1 - Math.exp(-dt * 2.2);
      look.lerp(shot.at, k);
      q.copy(shot.from).sub(shot.at).multiplyScalar(Math.max(1, (span || 1.15) / camera.aspect)).add(shot.at);   // step back on tall, narrow screens
      if (!calm) q.x += Math.sin(time / 4.2) * 0.12;
      eye.lerp(q, k); camera.position.copy(eye); camera.lookAt(look);
    };
  }
  const shotsMm = list => list.map(s => ({ at: W(s[0]), from: W(s[1]) }));

  /* ---------- 3. Sound (synthesised: no audio files) ---------- */
  let audio = null;
  function tone(freq, start, dur, type, vol, slideTo) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime + start, o = audio.createOscillator(), g = audio.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* no audio: the scene still works */ }
  }
  const som = {
    sirene: () => { for (let i = 0; i < 3; i++) { tone(620, i * 0.42, 0.22, 'sawtooth', 0.16, 940); tone(940, i * 0.42 + 0.2, 0.22, 'sawtooth', 0.16, 620); } },
    apito: () => { tone(1500, 0, 0.5, 'square', 0.12, 1750); tone(1750, 0.5, 0.45, 'square', 0.12, 1500); },
    toque: () => tone(240, 0, 0.12, 'triangle', 0.15),
    passo: () => tone(880, 0, 0.07, 'sine', 0.08),
    // a sudden, loud, harsh blast (three horns slightly out of tune): meant to startle
    alarme: () => { for (const f of [311, 370, 466]) { tone(f, 0, 0.9, 'sawtooth', 0.3, f * 0.97); tone(f * 2.01, 0, 0.9, 'square', 0.08); } },
  };

  /* ---------- 4. Signals: glowing dots that travel along a path ---------- */
  /** A reusable set of small glowing spheres added to `parent` (positions in the parent's own units). */
  function makeSparks(parent, n, size, color) {
    const m = new T.MeshBasicMaterial({ color, transparent: true, depthTest: false });
    const list = Array.from({ length: n }, () => { const s = new T.Mesh(new T.SphereGeometry(size, 12, 10), m.clone()); s.visible = false; s.renderOrder = 9; parent.add(s); return s; });
    return list;
  }

  const SCENES = {};

  /* ---------- 5. caixa: the black box opens ---------- */
  SCENES.caixa = box => {
    if (!D) return box.classList.add('sem-3d');
    const head = buildHead(); let painted = -1;
    const stage = makeStage(box, (step, dt, time) => {
      cam(step, dt, time);
      fade(head.mats.osso, step === 0 ? 1 : 0, dt, head.osso);
      fade(head.mats.cortex, step >= 3 ? 0.1 : 1, dt, head.cortex);
      for (const k of ['talamo', 'hipocampo', 'amigdala']) fade(head.mats[k], step >= 3 ? 1 : 0, dt, head[k]);
      const want = step === 2 ? 1 : 0;
      if (want !== painted) { painted = want; paint(head, want ? pf => (pf ? rgb(COR.prefrontal) : null) : null); }
    });
    if (!stage) return;
    stage.scene.add(head.group);
    const cam = director(stage.camera, shotsMm([[[0, -5, 2], [-460, 460, 100]], [[0, -15, 26], [-370, 215, 100]], [[0, 5, 20], [-215, 385, 100]], [[0, -30, 2], [-350, -25, 25]]]));
    stage.label('<b>caixa negra</b>só se vê o que entra e o que sai', head.anchor([0, 0, 70]), s => s === 0);
    stage.label('<b>córtex</b>2 a 4 mm de espessura', head.anchor([-35, -10, 78]), s => s === 1);
    stage.label('<b>córtex pré-frontal</b>planear, decidir, travar impulsos', head.anchor([-22, 62, 30]), s => s === 2);
    const at = (name, dz) => { const c = centre(name); return head.anchor([c[0], c[1], c[2] + dz]); };
    // seen from the left side, the front of the head is on the left of the screen: the four labels are kept apart
    // every label has an arrow that ends on a real point of the structure it names (left side: the one facing the camera)
    const real = (name, hint) => head.anchor(onMesh(name, hint));
    stage.label('<b>tálamo</b>a portaria dos sentidos', at('talamo_e', 32), s => s >= 3, '', real('talamo_e'));
    stage.label('<b>hipocampo</b>guardar memórias novas', head.anchor([-30, -80, 34]), s => s >= 3, '', real('hipocampo_e', [-28, -36, -6]));
    stage.label('<b>amígdala</b>o alarme: medo', head.anchor([-24, 40, -6]), s => s >= 3, '', real('amigdala_e', centre('amigdala_e').map((v, i) => v + (i === 1 ? 7 : 0))));   // its front part: the back is behind the hippocampus
    stage.label('<b>cerebelo</b>movimentos treinados', head.anchor([-20, -130, -26]), s => s >= 3, '', real('cerebelo', [-42, -68, -34]));
    stage.label('tronco cerebral', head.anchor([-10, 36, -52]), s => s >= 3, 'peq', real('tronco', [-12, -22, -38]));
  };

  /* ---------- 6. Small building blocks shared by the schematic scenes ---------- */
  const V = (x, y, z) => new T.Vector3(x, y, z || 0);
  const tube = (pts, r, material, seg) => new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), seg || 24, r, 8), material);
  const ball = (r, material, x, y, z) => { const m = new T.Mesh(new T.SphereGeometry(r, 24, 16), material); m.position.set(x || 0, y || 0, z || 0); return m; };
  /** Seeded random numbers: the same picture on every computer. */
  const lcg = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  /** Rises in the first quarter, holds until x = 1, then dies away (the shape of a burst of activity). */
  const burst = x => x < 0 ? 0 : x < 0.25 ? x / 0.25 : x < 1 ? 1 : Math.exp(-(x - 1) * 2.6);

  /* ---------- 7. Real fibre bundles (neuro-feixes.js) and paths drawn the same way ---------- */
  const FX = window.NEURO_FEIXES;
  const FIBRE_VS = 'attribute float u; varying float vu; void main(){ vu = u; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const FIBRE_FS = 'uniform vec3 cor; uniform float base, pulso, forca; varying float vu; void main(){ float d = (vu - pulso) / 0.13; float p = forca * exp(-d * d); gl_FragColor = vec4(mix(cor, vec3(1.0, 0.95, 0.72), clamp(p, 0.0, 1.0)), base + p); }';
  /**
   * Thin lines (millimetres) on which a pulse of light can travel. `lines` = array of arrays of [x, y, z].
   * Returns { obj, u, first, last }: u.base = how visible the fibres are at rest; u.pulso = where the pulse is
   * (0 = start of every line, 1 = end); u.forca = how bright it is; first/last = mean start and end points.
   */
  function makeFibres(parent, lines, color) {
    let nseg = 0; for (const l of lines) nseg += l.length - 1;
    const pos = new Float32Array(nseg * 6), u = new Float32Array(nseg * 2), first = [0, 0, 0], last = [0, 0, 0]; let j = 0;
    for (const l of lines) {
      for (let a = 0; a < 3; a++) { first[a] += l[0][a] / lines.length; last[a] += l[l.length - 1][a] / lines.length; }
      for (let i = 0; i < l.length - 1; i++) for (let e = 0; e < 2; e++) { const p = l[i + e]; pos[j * 3] = p[0]; pos[j * 3 + 1] = p[1]; pos[j * 3 + 2] = p[2]; u[j++] = (i + e) / (l.length - 1); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('u', new T.BufferAttribute(u, 1));
    const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexShader: FIBRE_VS, fragmentShader: FIBRE_FS,
      uniforms: { cor: { value: new T.Color(color) }, base: { value: 0 }, pulso: { value: -1 }, forca: { value: 0 } } });
    const obj = new T.LineSegments(g, m); obj.renderOrder = 6; obj.frustumCulled = false; parent.add(obj);
    return { obj, u: m.uniforms, first, last };
  }
  /** A real bundle of the HCP1065 atlas; `part` keeps only the first fraction of every streamline. */
  function makeBundle(parent, name, color, part) {
    const t = FX[name], q = new Int16Array(bytes(t.p)), k = Math.max(2, Math.round(t.k * (part || 1))), lines = [];
    for (let l = 0; l < t.n; l++) { const line = []; for (let i = 0; i < k; i++) { const s = (l * t.k + i) * 3; line.push([q[s] / 100, q[s + 1] / 100, q[s + 2] / 100]); } lines.push(line); }
    return makeFibres(parent, lines, color);
  }
  /** A simplified path: n gently curved lines from around `a` to around `b` (used where the atlas has no reliable bundle). */
  function makePath(parent, a, b, n, spread, color, lift) {
    const rnd = lcg(Math.round(Math.abs(a[0] * 31 + b[1] * 17 + n)) + 5), lines = [];
    for (let l = 0; l < n; l++) {
      const j = () => (rnd() - 0.5) * spread, p0 = [a[0] + j() * 0.5, a[1] + j() * 0.5, a[2] + j() * 0.5], p1 = [b[0] + j(), b[1] + j(), b[2] + j()], line = [];
      for (let i = 0; i <= 12; i++) { const s = i / 12, h = Math.sin(s * Math.PI) * (lift || 0); line.push([lerp(p0[0], p1[0], s), lerp(p0[1], p1[1], s), lerp(p0[2], p1[2], s) + h]); }
      lines.push(line);
    }
    return makeFibres(parent, lines, color);
  }

  /* ---------- 8. Thousands of neurons: a cloud of points that flash when they fire ---------- */
  /** Points of a mesh (millimetres): its vertices pushed `depth` mm inwards, or (fill) scattered through its inside. */
  function meshPoints(name, opt) {
    const g = geometry(name), pos = g.getAttribute('position'), nor = g.getAttribute('normal'), c = centre(name), rnd = lcg(name.length * 97 + 11), out = [];
    for (let pass = 0; pass < (opt.times || 1); pass++) for (let i = 0; i < pos.count; i++) {
      if (opt.fill) { const f = Math.cbrt(rnd()); out.push(c[0] + (pos.getX(i) - c[0]) * f, c[1] + (pos.getY(i) - c[1]) * f, c[2] + (pos.getZ(i) - c[2]) * f); }
      else out.push(pos.getX(i) - nor.getX(i) * opt.depth, pos.getY(i) - nor.getY(i) * opt.depth, pos.getZ(i) - nor.getZ(i) * opt.depth);
    }
    return out;
  }
  /**
   * A cloud of «neurons». Each point has a firing rate (0…1) that the scene sets every frame; the cloud then makes
   * each point flash at random, more often the higher its rate, as real neurons do (a flash lasts about a quarter of a second).
   * Tens of thousands of points stand for the billions of real neurons: the picture shows where and when, not how many.
   */
  function makeCloud(parent) {
    const P = [], cloud = { groups: {}, n: 0 };
    cloud.add = (name, pts) => { cloud.groups[name] = { from: P.length / 3, n: pts.length / 3 }; for (let i = 0; i < pts.length; i++) P.push(pts[i]); };
    cloud.build = size => {
      const n = cloud.n = P.length / 3, g = new T.BufferGeometry();
      cloud.pos = new Float32Array(P); cloud.rate = new Float32Array(n); cloud.glow = new Float32Array(n);
      g.setAttribute('position', new T.BufferAttribute(cloud.pos, 3));
      cloud.attr = new T.BufferAttribute(cloud.glow, 1); cloud.attr.setUsage(T.DynamicDrawUsage); g.setAttribute('glow', cloud.attr);
      cloud.mat = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending,
        uniforms: { px: { value: 6 }, size: { value: size || 1 }, dim: { value: 0.07 }, alpha: { value: 1 } },
        vertexShader: 'attribute float glow; uniform float px, size; varying float vg; void main(){ vg = glow; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.3, size * (1.0 + 1.5 * glow) * px / -mv.z); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform float dim, alpha; varying float vg; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25) discard; vec3 c = mix(vec3(0.40, 0.56, 0.78), vec3(1.0, 0.78, 0.34), vg); gl_FragColor = vec4(c, alpha * (dim + (0.8 - dim) * vg) * (1.0 - r * 4.0)); }' });
      cloud.obj = new T.Points(g, cloud.mat); cloud.obj.renderOrder = 7; cloud.obj.frustumCulled = false; parent.add(cloud.obj);
    };
    /** Points of a group within reach of a centre, with a weight that falls with distance: { idx, w }. */
    cloud.near = (name, c, r) => {
      const gr = cloud.groups[name], idx = [], w = [], p = cloud.pos;
      for (let i = gr.from; i < gr.from + gr.n; i++) { const d = (p[i * 3] - c[0]) ** 2 + (p[i * 3 + 1] - c[1]) ** 2 + (p[i * 3 + 2] - c[2]) ** 2, k = Math.exp(-d / (r * r)); if (k > 0.03) { idx.push(i); w.push(k); } }
      return { idx: Int32Array.from(idx), w: Float32Array.from(w) };
    };
    /** Set every rate to the resting level, or the rates of one group. */
    cloud.rest = (level, name) => { const gr = name ? cloud.groups[name] : { from: 0, n: cloud.n }; cloud.rate.fill(level, gr.from, gr.from + gr.n); };
    /** Add activity to a set of points returned by near(). */
    cloud.drive = (set, amount) => { if (amount < 0.004) return; const r = cloud.rate; for (let i = 0; i < set.idx.length; i++) r[set.idx[i]] += amount * set.w[i]; };
    /** One frame of random firing; `stage` gives the camera and the height of the picture, for the size of the points. */
    cloud.step = (dt, stage) => {
      const r = cloud.rate, gl = cloud.glow, k = dt * 2.4, f = dt * 4.5;       // at rate 1 a neuron flashes about 2.4 times a second
      for (let i = 0; i < cloud.n; i++) { const v = gl[i] - f; gl[i] = Math.random() < r[i] * k ? 1 : v > 0 ? v : 0; }
      cloud.attr.needsUpdate = true;
      cloud.mat.uniforms.px.value = S * stage.pixels() / (2 * Math.tan(stage.camera.fov * Math.PI / 360));
    };
    return cloud;
  }
  /** The usual cloud: both hemispheres of the cortex plus the deep structures named in `deep`. */
  function brainCloud(head, deep) {
    const cloud = makeCloud(head.group);
    cloud.add('cortex', meshPoints('lh', { depth: 1.5 }).concat(meshPoints('rh', { depth: 1.5 })));
    for (const [key, names] of Object.entries(deep)) { let pts = []; for (const n of names) pts = pts.concat(meshPoints(n, { fill: true, times: 2 })); cloud.add(key, pts); }
    cloud.build(1);
    return cloud;
  }
  const DEEP = { tronco: ['tronco'], talamo: ['talamo_e', 'talamo_d'], amigdala: ['amigdala_e', 'amigdala_d'], hipocampo: ['hipocampo_e', 'hipocampo_d'] };
  /** Show a head as a faint ghost, so that the cloud of neurons inside it can be seen. */
  function ghost(head, cortex, deep) {
    head.osso.forEach(m => (m.visible = false)); head.cerebelo.forEach(m => (m.visible = false));
    head.mats.cortex.opacity = cortex; head.mats.cortex.depthWrite = false;
    for (const k of ['tronco', 'talamo', 'amigdala', 'hipocampo']) { head.mats[k].opacity = deep; head.mats[k].depthWrite = false; }
  }

  /* ---------- 9. Hearing: a sound travels from the ear to the auditory cortex (shared by «medir» and «sirene») ---------- */
  /**
   * The stations of the pathway, on both sides: [group of the cloud, centre (mm), radius (mm), start (s), duration (s), gain, role].
   * Places are approximate centres in the space of the model; times are in slow motion (the real journey takes hundredths of a second).
   */
  function makeHearing(head) {
    const cloud = brainCloud(head, DEEP), stations = [], fibres = [];
    for (const s of [-1, 1]) {
      const amy = centre(s < 0 ? 'amigdala_e' : 'amigdala_d');
      for (const [g, c, r, t0, dur, gain, role] of [
        ['tronco', [9 * s, -40, -40], 8, 0.45, 0.5, 0.9, 'via'],       // cochlear nucleus: where the nerve enters the brainstem
        ['tronco', [7 * s, -37, -26], 6.5, 0.75, 0.5, 0.8, 'via'],     // on the way up
        ['tronco', [6 * s, -34, -11], 6.5, 1.05, 0.5, 0.9, 'via'],     // inferior colliculus, at the top of the brainstem
        ['talamo', [16 * s, -27, -5], 7, 1.5, 0.6, 1, 'via'],          // medial geniculate body, at the back of the thalamus
        ['cortex', [46 * s, -20, 8], 11, 2.35, 0.9, 1, 'cortex'],      // primary auditory cortex (Heschl's gyrus)
        ['cortex', [54 * s, -24, 5], 25, 2.75, 1.0, 0.3, 'cortex'],    // the auditory areas around it, later and weaker
        ['amigdala', amy, 14, 2.0, 0.9, 1, 'alarme'],                  // the alarm, reached from the thalamus
      ]) stations.push({ set: cloud.near(g, c, r), t0, dur, gain, role });
      const nerve = makeBundle(head.group, s < 0 ? 'CNVIII_L' : 'CNVIII_R', 0x8FC4E8, 0.36);           // real nerve: inner ear → brainstem
      const rad = makePath(head.group, [16 * s, -27, -5], [44 * s, -20, 8], 46, 9, 0x8FC4E8, 4);         // thalamus → auditory cortex (simplified path)
      fibres.push({ f: nerve, t0: 0, dur: 0.5 }, { f: rad, t0: 1.85, dur: 0.6 });
    }
    const H = { cloud, t: 99, via: 1, cortex: 1, alarme: 1, base: 0.03, show: 1 };
    /** A sound arrives. via / cortex / alarme = how strongly each part of the pathway answers (0…1). */
    H.fire = (via, cortex, alarme) => { H.t = 0; H.via = via; H.cortex = cortex; H.alarme = alarme; };
    H.update = (dt, stage, extra) => {
      H.t += dt; cloud.rest(H.base);
      for (const st of stations) cloud.drive(st.set, st.gain * H[st.role] * burst((H.t - st.t0) / st.dur));
      for (const fb of fibres) { fb.f.u.base.value = 0.16 * H.show; fb.f.u.pulso.value = (H.t - fb.t0) / fb.dur; fb.f.u.forca.value = H.t < fb.t0 + fb.dur * 1.3 ? H.show : 0; }
      if (extra) extra();
      cloud.mat.uniforms.alpha.value = H.show; cloud.step(dt, stage);
    };
    return H;
  }

  /* ---------- 10. medir: EEG, fMRI and a sound followed through thousands of neurons ---------- */
  SCENES.medir = box => {
    if (!D) return box.classList.add('sem-3d');
    const head = buildHead(), eeg = box.querySelector('canvas.eeg'), real = (name, hint) => head.anchor(onMesh(name, hint));
    head.cerebelo.forEach(m => (m.visible = false));
    for (const k of ['tronco', 'talamo', 'amigdala', 'hipocampo']) head.mats[k].depthWrite = false;
    // electrodes: points on the skull, found by shooting rays outwards from the middle of the head
    const dots = new T.Group(); head.group.add(dots);
    const ray = new T.Raycaster(), skull = new T.Mesh(geometry('cranio'), new T.MeshBasicMaterial({ side: T.DoubleSide }));
    const elMat = new T.MeshBasicMaterial({ color: COR.laranja, transparent: true, depthWrite: false });
    for (let i = 0; i < 21; i++) {
      const lat = [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 1.15, 1.15, 1.15, 1.15, 1.5, 1.5, 1.5][i], lon = i * 2.4;
      const dir = new T.Vector3(Math.cos(lon) * Math.cos(lat), Math.sin(lon) * Math.cos(lat), Math.sin(lat)).normalize();
      ray.set(new T.Vector3(0, -18, 5), dir); ray.far = 400;
      const hits = ray.intersectObject(skull);
      if (hits.length) { const e = new T.Mesh(new T.SphereGeometry(4.5, 12, 10), elMat); e.position.copy(hits[hits.length - 1].point).addScaledVector(dir, 2); dots.add(e); }
    }
    const H = makeHearing(head), cortexAll = { idx: Int32Array.from({ length: H.cloud.groups.cortex.n }, (_, i) => i), w: new Float32Array(H.cloud.groups.cortex.n).fill(1) };
    const blobs = [{ c: [58, -22, 8], r: 30, a: 0, cor: rgb(0xFF7A30) }, { c: [-58, -22, 8], r: 30, a: 0, cor: rgb(0xFF7A30) }];
    let cycle = 9, eegT = 0, painted = '';
    const stage = makeStage(box, (step, dt, time, since) => {
      cam(step, dt, time);
      fade(head.mats.osso, step === 0 ? 0.3 : 0, dt, head.osso);
      elMat.opacity = toward(elMat.opacity, step === 0 ? 1 : 0, dt, 5); dots.visible = elMat.opacity > 0.02;
      fade(head.mats.cortex, step === 1 ? 1 : step === 0 ? 0.22 : 0.1, dt, head.cortex);
      for (const k of ['tronco', 'talamo', 'amigdala', 'hipocampo']) fade(head.mats[k], step >= 2 ? 0.22 : 0, dt, head[k]);
      H.show = toward(H.show, step === 1 ? 0 : 1, dt, 5);
      // EEG: the cortex fires in slow waves, all together; the trace on the right is the sum that the electrodes pick up
      const wave = 0.5 + 0.5 * Math.sin(time * 2 * Math.PI * 0.9);
      if (step >= 2) { cycle += dt; if (cycle > 5) { cycle = 0; H.fire(1, 1, 0); som.passo(); } } else H.t = 99;
      H.update(dt, stage, step === 0 ? () => H.cloud.drive(cortexAll, 0.14 * wave * wave) : null);
      if (step === 1) {
        // fMRI: the coloured map appears seconds after the sound (it measures blood, not electricity)
        const k = ease((since % 9 - 2.5) / 2.5) * (1 - ease((since % 9 - 7) / 1.5));
        blobs[0].a = blobs[1].a = k * 0.9; paint(head, null, blobs); painted = 'mapa';
      } else if (painted) { paint(head, null); painted = ''; }
      if (eeg) {
        eeg.style.opacity = step === 0 ? 1 : 0; eegT += dt;
        const g = eeg.getContext('2d'); g.clearRect(0, 0, eeg.width, eeg.height); g.strokeStyle = '#F0A673'; g.lineWidth = 2;
        for (let r = 0; r < 4; r++) { g.beginPath(); for (let x = 0; x < eeg.width; x += 2) { const t = time - (eeg.width - x) * 0.012, y = 18 + r * 30 - Math.sin(t * 2 * Math.PI * 0.9 + r * 0.25) * 9 + Math.sin(t * 31 + r * 2) * 2.5 + Math.sin(t * 57 + r) * 1.5; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      }
    });
    if (!stage) return;
    stage.scene.add(head.group);
    const cam = director(stage.camera, shotsMm([[[0, -15, 20], [330, 230, 150]], [[0, -15, 10], [380, 60, 90]], [[14, -22, 6], [250, 296, 92]], [[14, -22, 6], [250, 296, 92]]]));
    const topDot = dots.children.reduce((m, e) => (e.position.z > m.position.z ? e : m), dots.children[0]);
    stage.label('<b>elétrodos</b>somam a eletricidade de milhões de neurónios', head.anchor([84, -104, 66]), s => s === 0, '', topDot ? head.anchor(topDot.position.toArray()) : undefined);
    stage.label('<b>córtex auditivo</b>mais sangue com oxigénio', head.anchor([66, -22, 30]), s => s === 1, '', real('rh', [60, -22, 8]));
    stage.label('<b>1 · nervo auditivo</b>vem do ouvido', head.anchor([84, -54, -34]), s => s >= 2, '', head.anchor([20, -33, -41]));
    stage.label('<b>2 · tronco cerebral</b>', head.anchor([-44, 20, -44]), s => s >= 2, '', real('tronco', [-4, -34, -30]));
    stage.label('<b>3 · tálamo</b>', head.anchor([-6, -40, 40]), s => s >= 2, '', real('talamo_d', [16, -27, -5]));
    stage.label('<b>4 · córtex auditivo</b>', head.anchor([80, -34, 40]), s => s >= 2, '', real('rh', [48, -20, 8]));
  };

  /* ---------- 11. sirene: habituation, seen in thousands of neurons ---------- */
  SCENES.sirene = box => {
    const slide = box.closest('.slide'), bars = slide.querySelector('.sustos'), say = sayIn(slide);
    const n = { sirene: 0, apito: 0 };
    /** Size of the alarm response to the n-th repetition of the same harmless sound (illustrative: it falls by about a third each time). */
    const response = k => Math.max(0.05, Math.pow(0.66, k - 1));
    let H = null;
    function play(kind) {
      n[kind]++; const r = response(n[kind]); som[kind === 'sirene' ? 'alarme' : 'apito']();
      // the sound always reaches the brain; the auditory cortex answers a little less each time, the alarm much less
      if (H) H.fire(1, 0.45 + 0.55 * r, r);
      if (bars) { const b = document.createElement('span'); b.className = kind; b.style.setProperty('--h', Math.round(r * 100) + '%'); b.dataset.n = kind === 'sirene' ? n.sirene + '.º' : 'novo'; bars.append(b); if (bars.children.length > 10) bars.firstChild.remove(); }
      say(kind === 'apito' && n.apito === 1 && n.sirene > 2 ? 'Som novo: o alarme volta a disparar em força. A habituação é <b>a este som</b>, não a todos.'
        : n[kind] === 1 ? 'Primeira vez: o alarme dispara em força. Susto!' : r < 0.2 ? 'O som chega ao córtex auditivo, mas o alarme quase não reage: <b>habituou-se</b>.' : 'O alarme reage menos…');
    }
    slide.querySelector('[data-act="sirene"]').addEventListener('click', () => play('sirene'));
    slide.querySelector('[data-act="apito"]').addEventListener('click', () => play('apito'));
    slide.querySelector('[data-act="repor"]').addEventListener('click', () => { n.sirene = n.apito = 0; if (bars) bars.innerHTML = ''; say('Carrega em «Tocar o alarme».'); });
    if (!D) return box.classList.add('sem-3d');
    const head = buildHead(), real = (name, hint) => head.anchor(onMesh(name, hint)); ghost(head, 0.1, 0.22);
    H = makeHearing(head);
    const stage = makeStage(box, (step, dt, time) => { cam(0, dt, time); H.update(dt, stage); });
    if (!stage) return;
    stage.scene.add(head.group);
    const cam = director(stage.camera, shotsMm([[[4, -18, 12], [166, 188, 62]]]));
    stage.label('tronco cerebral', head.anchor([60, -50, -40]), () => true, 'peq', real('tronco', [6, -38, -30]));
    stage.label('<b>tálamo</b>', head.anchor([-6, -40, 40]), () => true, '', real('talamo_d', [16, -27, -5]));
    stage.label('<b>córtex auditivo</b>ouve o som', head.anchor([86, -42, 22]), () => true, '', real('rh', [48, -20, 8]));
    stage.label('<b>amígdala</b>o alarme: susto', head.anchor([-44, 64, -22]), () => true, 'conceito', real('amigdala_e'));
  };

  /* ---------- 12. memoria: how a memory is stored (hippocampus first, cortex little by little) ---------- */
  SCENES.memoria = box => {
    if (!D || !FX) return box.classList.add('sem-3d');
    const head = buildHead(); ghost(head, 0.1, 0.12);
    head.talamo.forEach(m => (m.visible = false)); head.amigdala.forEach(m => (m.visible = false)); head.tronco.forEach(m => (m.visible = false));
    const cloud = brainCloud(head, { hipocampo: ['hipocampo_e', 'hipocampo_d'] });
    // three parts of one memory (a goal you scored), each in its own area of the left cortex, and the bundle that links it to the hippocampus
    const PARTS = [
      { nome: 'o que viste', sub: 'a baliza, a bola', c: [-24, -92, 4], r: 20, feixe: 'ILF_L', cor: 0x8FC4E8, at: [-40, -132, -8] },
      { nome: 'onde estavas', sub: 'à entrada da área', c: [-12, -70, 46], r: 20, feixe: 'C_PHP_L', cor: 0x7BB98A, at: [-30, -126, 64] },
      { nome: 'o que pensaste', sub: '«remato já!»', c: [-24, 44, -8], r: 20, feixe: 'UF_L', cor: 0xE58FB5, at: [-34, 96, 22] },
    ].map(p => Object.assign(p, { set: cloud.near('cortex', p.c, p.r), f: makeBundle(head.group, p.feixe, p.cor), a: 0 }));
    const hip = cloud.near('hipocampo', centre('hipocampo_e'), 40), fornix = makeBundle(head.group, 'F_L', 0xC57BA6);
    // cortex to cortex: the bundles that end up carrying the memory without the hippocampus
    const direct = [makeBundle(head.group, 'IFOF_L', 0xF0A673), makeBundle(head.group, 'SLF2_L', 0xF0A673)];
    let hipA = 0, wired = 0;
    const stage = makeStage(box, (step, dt, time, since) => {
      cam(step, dt, time);
      const T0 = step === 4 ? 2.6 : 5, t = since % T0, on = [0, 0, 0]; let hipOn = 0;
      const toHip = [-1, -1, -1], fromHip = [-1, -1, -1], dir = [-1, -1];           // where the pulse is on each bundle (−1 = none)
      if (step === 1) on.fill(burst((t - 0.3) / 3.2));
      if (step === 2) { on.fill(burst((t - 0.2) / 3.4)); for (let i = 0; i < 3; i++) toHip[i] = (t - 0.6) / 1.3; hipOn = burst((t - 1.9) / 1.8); }
      if (step === 3) {                                                            // a cue: you see the goal again; the hippocampus relights the rest
        on[0] = burst((t - 0.2) / 3.6); toHip[0] = (t - 0.5) / 1.1; hipOn = burst((t - 1.6) / 1.6);
        fromHip[1] = fromHip[2] = (t - 2.0) / 1.1; on[1] = on[2] = burst((t - 3.1) / 1.4);
      }
      if (step === 4) { hipOn = burst((t - 0.1) / 0.7); for (let i = 0; i < 3; i++) { fromHip[i] = (t - 0.3) / 0.7; on[i] = burst((t - 1.0) / 0.9); } dir[0] = dir[1] = (t - 1.1) / 0.8; }
      if (step >= 5) { on[0] = burst((t - 0.2) / 3.6); dir[0] = (t - 0.6) / 1.2; on[2] = burst((t - 1.8) / 2.4); dir[1] = 1 - (t - 1.9) / 1.2; on[1] = burst((t - 3.1) / 1.6); hipOn = 0.12 * burst((t - 1.5) / 1.5); }
      wired = toward(wired, step < 4 ? 0 : step === 4 ? clamp(since / 10) : 1, dt, 3);         // cortex-to-cortex links grow night after night
      cloud.rest(0.022); cloud.rest(step >= 5 ? 0.01 : 0.03, 'hipocampo');
      PARTS.forEach((p, i) => {
        cloud.drive(p.set, on[i]);
        const pulse = toHip[i] >= 0 && toHip[i] <= 1.2 ? toHip[i] : fromHip[i] >= 0 && fromHip[i] <= 1.2 ? 1 - fromHip[i] : -1;
        p.f.u.base.value = toward(p.f.u.base.value, step >= 2 && step <= 4 ? 0.3 : step >= 5 ? 0.08 : 0, dt, 4); p.f.u.pulso.value = pulse; p.f.u.forca.value = pulse >= 0 ? 1 : 0;
      });
      cloud.drive(hip, hipOn);
      fornix.u.base.value = toward(fornix.u.base.value, step === 0 ? 0.3 : 0, dt, 4);
      direct.forEach((f, i) => { f.u.base.value = 0.05 + 0.4 * wired; f.u.base.value *= step >= 4 ? 1 : 0; f.u.pulso.value = dir[i]; f.u.forca.value = dir[i] >= 0 && dir[i] <= 1.2 ? 0.4 + 0.6 * wired : 0; });
      hipA = toward(hipA, step === 0 ? 1 : step >= 5 ? 0.15 : 0.5, dt, 4); head.mats.hipocampo.opacity = hipA; head.mats.hipocampo.depthWrite = false;
      cloud.step(dt, stage);
    });
    if (!stage) return;
    stage.scene.add(head.group);
    const cam = director(stage.camera, shotsMm([[[0, -14, 22], [-400, 120, 70]], [[0, -14, 30], [-480, 40, 90]]]));
    const hipReal = head.anchor(onMesh('hipocampo_e'));
    stage.label('<b>hipocampo</b>um de cada lado, dentro do lobo temporal', head.anchor([-40, 118, -8]), s => s === 0, '', hipReal);
    stage.label('fórnix: a saída do hipocampo', head.anchor([-10, -96, 30]), s => s === 0, 'peq', head.anchor([-6, -24, 16]));
    PARTS.forEach(p => stage.label(`<b>${p.nome}</b>${p.sub}`, head.anchor(p.at), s => s >= 1, '', head.anchor(onMesh('lh', p.c))));
    stage.label('<b>hipocampo</b>regista o que disparou junto', head.anchor([-40, 118, -8]), s => s === 2 || s === 3, 'conceito', hipReal);
    stage.label('<b>hipocampo</b>repete o padrão, vezes sem conta', head.anchor([-40, 118, -8]), s => s === 4, 'conceito', hipReal);
    stage.label('<b>hipocampo</b>já faz menos falta', head.anchor([-40, 118, -8]), s => s >= 5, '', hipReal);
    stage.label('<b>ligações diretas no córtex</b>cada vez mais fortes', head.anchor([-50, 92, 82]), s => s >= 4, 'conceito', head.anchor([-40, -4, 46]));
  };

  /* ---------- 13. cortex: the outer layer of the brain gets thinner from 3 to 20 years (Piccolo and colleagues, 2016) ---------- */
  // Curves redrawn from figure 1a of the article (approximate): mean cortical thickness, in mm, by age.
  const ESP = {
    baixo: a => 3.3149 - 0.07367 * a + 0.001869 * a * a,       // low family income: steep at first, then levels off
    alto: a => 3.171 - 0.03176 * a,                            // high family income: steady
    todos: a => (ESP.baixo(a) + ESP.alto(a)) / 2,
  };
  SCENES.cortex = box => {
    const slide = box.closest('.slide'), plotBox = slide.querySelector('.plot3d'), lupa = slide.querySelector('.lupa');
    /* --- the simplified plot (SVG), built here so that it always agrees with the curves above --- */
    const X = a => 70 + (a - 3) / 18 * 400, Y = mm => 30 + (3.25 - mm) / 0.85 * 290;
    const path = fn => { let d = ''; for (let a = 3.5; a <= 20.5; a += 0.5) d += (d ? 'L' : 'M') + X(a).toFixed(1) + ' ' + Y(fn(a)).toFixed(1); return d; };
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    let dots = '';
    for (let i = 0; i < 170; i++) { const a = 3.5 + rnd() * 17, n = (rnd() + rnd() + rnd() - 1.5) * 0.17; dots += `<circle cx="${X(a).toFixed(1)}" cy="${Y(ESP.todos(a) + n).toFixed(1)}" r="4"/>`; }
    if (plotBox) plotBox.innerHTML = `<svg viewBox="0 0 500 380" role="img" aria-label="Gráfico simplificado: a espessura média do córtex desce de cerca de 3 milímetros aos 4 anos para cerca de 2,6 aos 20">
      <g class="eixos"><line x1="70" y1="320" x2="480" y2="320"/><line x1="70" y1="20" x2="70" y2="320"/>
        ${[4, 8, 12, 16, 20].map(a => `<text x="${X(a)}" y="343" text-anchor="middle">${a}</text>`).join('')}
        ${[2.5, 2.75, 3].map(m => `<text x="60" y="${Y(m) + 6}" text-anchor="end">${String(m).replace('.', ',')}</text><line class="grade" x1="70" y1="${Y(m)}" x2="480" y2="${Y(m)}"/>`).join('')}
        <text class="tit" x="275" y="372" text-anchor="middle">idade (anos)</text><text class="tit" transform="translate(18 170) rotate(-90)" text-anchor="middle">espessura do córtex (mm)</text></g>
      <g class="pl-pontos">${dots}</g>
      <g class="pl-um"><line x1="${X(8)}" y1="${Y(2.9)}" x2="${X(8)}" y2="320"/><line x1="70" y1="${Y(2.9)}" x2="${X(8)}" y2="${Y(2.9)}"/><circle cx="${X(8)}" cy="${Y(2.9)}" r="8"/><text x="${X(8) + 14}" y="${Y(2.9) - 10}">uma pessoa: 8 anos, 2,9 mm</text></g>
      <path class="pl-todos" d="${path(ESP.todos)}"/>
      <g class="pl-dois"><path class="baixo" d="${path(ESP.baixo)}"/><path class="alto" d="${path(ESP.alto)}"/>
        <text class="alto" x="${X(10.2)}" y="${Y(3.04)}">famílias com mais rendimento</text><text class="baixo" x="${X(3.8)}" y="${Y(2.52)}">famílias com menos rendimento</text></g>
      <g class="pl-idade"><line y1="20" y2="320"/><circle r="7"/></g></svg>`;
    const mark = plotBox && plotBox.querySelector('.pl-idade');
    if (!D) return box.classList.add('sem-3d');
    /* --- the brain, cut across so that the cortex shows as what it is: the outer layer ---
       The front part of the head is clipped away by a plane. The cut face is painted with the «stencil» trick:
       wherever the plane is inside a closed surface, a flat colour is drawn. Two surfaces are capped, one inside the other:
       the real surface of the brain (orange cap) and a copy pushed inwards by the thickness of the cortex (cream cap, drawn on top).
       What is left of the orange is a ribbon exactly as thick as the cortex. */
    const CUT = -16, GAIN = 5;                                     // where the cut is (mm behind the middle); how much the change with age is magnified
    const head = buildHead(), plane = new T.Plane(new T.Vector3(0, 0, 1), CUT * S);
    for (const k of ['osso', 'cerebelo', 'tronco', 'talamo', 'hipocampo', 'amigdala']) head[k].forEach(m => (m.visible = false));
    head.mats.cortex.transparent = false; head.mats.cortex.clippingPlanes = [plane];
    const outer = head.cortex.map(m => m.geometry), inner = outer.map(g => { const c = new T.BufferGeometry(); c.setAttribute('position', g.getAttribute('position').clone()); c.setIndex(g.getIndex()); return c; });
    function setThickness(mm) {
      outer.forEach((g, k) => { const p = g.getAttribute('position'), n = g.getAttribute('normal'), q = inner[k].getAttribute('position');
        for (let i = 0; i < p.count; i++) q.setXYZ(i, p.getX(i) - n.getX(i) * mm, p.getY(i) - n.getY(i) * mm, p.getZ(i) - n.getZ(i) * mm); q.needsUpdate = true; });
    }
    const caps = [];
    function cap(geoms, color, order) {
      for (const g of geoms) for (const [side, op] of [[T.BackSide, T.IncrementWrapStencilOp], [T.FrontSide, T.DecrementWrapStencilOp]]) {
        const m = new T.Mesh(g, new T.MeshBasicMaterial({ depthWrite: false, depthTest: false, colorWrite: false, side, clippingPlanes: [plane], stencilWrite: true, stencilFunc: T.AlwaysStencilFunc, stencilFail: op, stencilZFail: op, stencilZPass: op }));
        m.renderOrder = order; m.frustumCulled = false; head.group.add(m);
      }
      const face = new T.Mesh(new T.PlaneGeometry(5, 5), new T.MeshBasicMaterial({ color, side: T.DoubleSide, depthTest: order < 2, stencilWrite: true, stencilRef: 0, stencilFunc: T.NotEqualStencilFunc, stencilFail: T.ReplaceStencilOp, stencilZFail: T.ReplaceStencilOp, stencilZPass: T.ReplaceStencilOp }));
      face.position.z = -CUT * S; face.renderOrder = order + 0.1; face.onAfterRender = r => r.clearStencil(); caps.push(face);
    }
    cap(outer, 0xE2875A, 1); cap(inner, 0xF4ECDD, 2);
    let shown = -1;
    const stage = makeStage(box, (step, dt, time) => {
      cam(0, dt, time);
      const age = stage.ctl('idade'), mmNow = ESP.todos(age);
      if (Math.abs(mmNow - shown) > 0.004) {
        shown = mmNow; setThickness(2.6 + (mmNow - 2.6) * GAIN);
        if (lupa) { lupa.style.setProperty('--esp', (mmNow * 26).toFixed(1) + 'px'); lupa.querySelector('output').textContent = mmNow.toFixed(2).replace('.', ',') + ' mm'; lupa.querySelector('b').textContent = Math.round(age) + ' anos'; }
        if (mark) { mark.setAttribute('transform', `translate(${X(age)} 0)`); mark.querySelector('circle').setAttribute('cy', Y(mmNow)); }
      }
    });
    if (!stage) return;
    stage.scene.add(head.group); caps.forEach(c => stage.scene.add(c));
    const cam = director(stage.camera, shotsMm([[[0, CUT, 24], [-84, 270, 98]]]));
    const top = onMesh('rh', [52, CUT, 60]);
    stage.label('<b>córtex</b>a camada de fora', head.anchor([104, CUT, 58]), () => true, 'conceito', head.anchor([top[0], CUT, top[2] - 2]));
    stage.label('<b>substância branca</b>os «cabos» entre zonas', head.anchor([-92, CUT, -40]), () => true, '', head.anchor([-26, CUT, 26]));
  };

  /* ---------- 14. Neurons of the cortex: pyramidal cells, one synapse, the action potential ---------- */
  /**
   * A pyramidal neuron, the commonest cell of the cortex: a cone-shaped body, one long dendrite going up (apical),
   * several around the base (basal), all covered with tiny spines, and (drawn by the scene) a thin axon leaving from the base.
   * Returns { group, mat, spines }: the group has the body at its origin and is about 5 units tall (from −1.5 to 3.7); spines = their positions.
   */
  function makePyramidal(color, seed) {
    const g = new T.Group(), m = mat(color, { roughness: 0.55, emissive: color, emissiveIntensity: 0 }), rnd = lcg(seed), spines = [];
    const body = new T.Mesh(new T.ConeGeometry(0.42, 0.95, 18), m), under = ball(0.37, m, 0, -0.34, 0); under.scale.y = 0.6; g.add(body, under);
    const bend = () => (rnd() - 0.5);
    function grow(from, dir, len, r, depth) {
      const to = from.clone().addScaledVector(dir, len), mid = from.clone().lerp(to, 0.5).add(V(bend() * len * 0.2, bend() * len * 0.2, bend() * len * 0.2));
      g.add(tube([from, mid, to], r, m, 10));
      for (let s = 0.22; s < 1; s += 0.17 + rnd() * 0.1) spines.push(from.clone().lerp(to, s).add(V(bend(), bend(), bend()).normalize().multiplyScalar(r + 0.065)));
      if (depth > 0) for (let k = 0; k < 2; k++) grow(to, dir.clone().add(V(bend() * 1.3, bend() * 0.9, bend() * 1.3)).normalize(), len * (0.6 + rnd() * 0.2), r * 0.68, depth - 1);
    }
    let p = V(0, 0.4, 0);                                                             // the apical dendrite: a trunk with side branches…
    for (let i = 0; i < 3; i++) {
      const q = p.clone().add(V(bend() * 0.25, 0.72, bend() * 0.25)); g.add(tube([p, p.clone().lerp(q, 0.5), q], 0.085 - i * 0.012, m, 8));
      grow(q, V(i % 2 ? -1 : 1, 0.35, bend()).normalize(), 0.9, 0.035, 1); p = q;
    }
    for (let k = 0; k < 3; k++) grow(p, V((k - 1) * 0.8, 1, bend() * 0.8).normalize(), 0.7, 0.04, 1);     // …that ends in a tuft
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + rnd(); grow(V(Math.cos(a) * 0.25, -0.4, Math.sin(a) * 0.25), V(Math.cos(a), -0.3 - rnd() * 0.3, Math.sin(a) * 0.7).normalize(), 1.0, 0.045, 1); }   // basal dendrites
    const inst = new T.InstancedMesh(new T.SphereGeometry(0.036, 8, 6), m, spines.length), M4 = new T.Matrix4();
    spines.forEach((s, i) => { M4.makeTranslation(s.x, s.y, s.z); inst.setMatrixAt(i, M4); }); g.add(inst);
    return { group: g, mat: m, spines };
  }

  SCENES.piramidal = box => {
    const world = new T.Group(), A = makePyramidal(0x7FB0D0, 5), B = makePyramidal(0xF0A673, 23);
    A.group.position.set(-2.7, 0.2, 0); B.group.position.set(2.5, -0.1, 0); world.add(A.group, B.group);
    // the cortex around them: many more cells, far away and out of focus
    const far = new T.InstancedMesh(new T.ConeGeometry(0.3, 0.7, 8), mat(0x3B4A57, { opacity: 0.55 }), 46), M4 = new T.Matrix4(), rnd = lcg(9);
    for (let i = 0; i < 46; i++) { M4.makeTranslation((rnd() - 0.5) * 22, (rnd() - 0.5) * 9, -4 - rnd() * 7); far.setMatrixAt(i, M4); } world.add(far);
    // the axon of A: leaves the base, runs down, and one branch reaches a dendrite of B
    const inB = p => p.clone().add(B.group.position), target = B.spines.map(inB).reduce((best, s) => (s.distanceTo(V(1.2, -0.9, 0.2)) < best.distanceTo(V(1.2, -0.9, 0.2)) ? s : best));
    const axonPts = [V(-2.7, -0.35, 0), V(-2.65, -1.2, 0.1), V(-1.9, -1.95, 0.15), V(-0.5, -1.95, 0.2), V(0.5, -1.45, 0.2), target.clone().add(V(-0.1, -0.05, 0.02))], axon = new T.CatmullRomCurve3(axonPts);
    world.add(tube(axonPts, 0.03, A.mat, 60), ball(0.075, A.mat, axonPts[5].x, axonPts[5].y, axonPts[5].z));
    world.add(tube([V(-1.9, -1.95, 0.15), V(-1.6, -3.0, 0.1), V(-1.7, -4.6, 0)], 0.03, A.mat, 20));              // the main axon goes on, to other areas
    // signals arriving at A from other neurons: seven of its spines, lit one after the other
    const inA = p => p.clone().add(A.group.position), inputs = [3, 11, 19, 27, 36, 44, 52].map(i => inA(A.spines[i % A.spines.length]));
    const flashes = makeSparks(world, inputs.length, 0.1, COR.sinal), impulse = makeSparks(world, 1, 0.11, COR.sinal)[0], hitB = makeSparks(world, 1, 0.12, COR.sinal)[0];
    let charge = 0, chargeB = 0;
    const stage = makeStage(box, (step, dt, time, since) => {
      cam(step, dt, time);
      const T0 = 6.5, t = since % T0, n = step === 1 ? 3 : step >= 2 ? 7 : 0;         // 3 signals are not enough; 7 are
      let got = 0;
      flashes.forEach((f, i) => { const k = (t - 0.4 - i * 0.28) / 0.5; f.visible = i < n && k > 0 && k < 1; if (f.visible) { f.position.copy(inputs[i]).lerp(inA(V(0, 0, 0)), ease(k) * 0.85); f.material.opacity = 1 - k * 0.5; } if (i < n && k >= 1) got++; });
      const fired = step >= 2 && got >= 7, tf = t - (0.4 + 6 * 0.28 + 0.5);            // time since the neuron fired
      charge = toward(charge, fired && tf > 0.25 ? 0 : t > 4 ? 0 : got / 7, dt, 6);
      A.mat.emissiveIntensity = charge * 0.75 + (fired && tf < 0.25 ? 0.6 : 0);
      const k = fired ? tf / 1.5 : -1; impulse.visible = k > 0 && k < 1; if (impulse.visible) impulse.position.copy(axon.getPoint(k));
      const arrived = fired && step >= 3 && tf > 1.5 && tf < 2.4; hitB.visible = arrived; if (arrived) { hitB.position.copy(target); hitB.scale.setScalar(1 + (tf - 1.5)); hitB.material.opacity = 1 - (tf - 1.5) / 0.9; }
      chargeB = toward(chargeB, arrived ? 0.3 : 0, dt, 4); B.mat.emissiveIntensity = chargeB;
    });
    if (!stage) return;
    stage.scene.add(world);
    // the caption covers the lower third of the stage, so every shot is framed for the band above it
    const cam = director(stage.camera, [{ at: V(-0.2, 0.95, 0), from: V(-0.2, 1.5, 19.5) }, { at: V(-1.6, 1.35, 0), from: V(-1.6, 1.8, 16.5) }, { at: V(-0.8, 0.95, 0), from: V(-0.8, 1.5, 19) }, { at: V(1.5, -0.75, 0), from: V(1.5, -0.4, 8) }], 1.9);
    const spot2 = (x, y, z) => spot(world, x, y, z), near = (x, y) => inA(A.spines.reduce((m, q) => (q.distanceTo(V(x, y, 0)) < m.distanceTo(V(x, y, 0)) ? q : m))), left = near(-1.0, 2.3), soma = spot2(-2.95, 0.15);
    stage.label('<b>dendrites</b>recebem sinais de milhares de neurónios', spot2(-6.6, 3.3), s => s === 0, '', spot(world, left.x, left.y, left.z));
    stage.label('<b>espinhas</b>onde chegam os sinais', spot2(-5.9, 3.1), s => s === 1, '', spot(world, inputs[1].x, inputs[1].y, inputs[1].z));
    stage.label('<b>corpo celular</b>soma os sinais', spot2(-6.0, 0.1), s => s <= 2, '', soma);
    stage.label('<b>axónio</b>leva o impulso', spot2(-5.3, -1.75), s => s === 0 || s === 2, '', spot2(-2.5, -1.6));
    stage.label('<b>sinapse</b>', spot2(0.1, 0.75), s => s === 0, '', spot(world, target.x - 0.1, target.y - 0.05, target.z));
    stage.label('<b>outro neurónio</b>', spot2(5.6, 2.6), s => s === 0, 'peq');
    stage.label('<b>3 sinais: não chega</b>o neurónio fica calado', spot2(0.15, 3.6), s => s === 1, 'conceito azul');
    stage.label('<b>7 sinais juntos: dispara!</b>tudo ou nada', spot2(-0.1, 1.55), s => s === 2, 'conceito');
    stage.label('<b>sinapse</b>não se tocam', spot2(-0.4, 0.05), s => s === 3, 'conceito', spot(world, target.x - 0.1, target.y - 0.05, target.z));
    stage.label('<b>o neurónio seguinte</b>recebeu um sinal: precisa de muitos', spot2(4.4, 0.2), s => s >= 3, '', spot2(2.75, -0.05));
  };

  /**
   * One synapse, seen very close: the end of an axon (above) with its vesicles, the cleft, and the membrane of the next
   * neuron (below) with its receptors. release(n) empties n vesicles; update(dt, time) moves everything.
   * short = true cuts the two stalks, for when the synapse is shown inside a round lens (the sea slug).
   * After update: .bound = fraction of the transmitter that is on the receptors (0…1), and the receptors open in proportion.
   */
  function makeSynapse(colA, colB, short) {
    const g = new T.Group(), rnd = lcg(31);
    const shellA = mat(colA, { opacity: 0.3, depthWrite: false, side: T.DoubleSide }), solidA = mat(colA), shellB = mat(colB, { opacity: 0.34, depthWrite: false, side: T.DoubleSide, emissive: 0xFFD34E, emissiveIntensity: 0 }), solidB = mat(colB);
    // above: a bulb cut flat underneath (the membrane that faces the cleft), hanging from its axon
    const bulb = new T.Mesh(new T.SphereGeometry(1.5, 40, 24, 0, Math.PI * 2, 0, 2.62), shellA); bulb.position.y = 1.75;
    const faceA = new T.Mesh(new T.CircleGeometry(0.75, 32), mat(colA, { opacity: 0.75, side: T.DoubleSide })); faceA.rotation.x = Math.PI / 2; faceA.position.y = 0.45;
    g.add(bulb, faceA, tube(short ? [V(0, 3.2, 0), V(0.08, 3.7, 0), V(0.1, 4.2, 0)] : [V(0, 3.2, 0), V(0.15, 4.2, 0), V(-0.2, 5.6, 0)], 0.3, solidA, 12));
    // below: the head of a dendritic spine, cut flat on top, on its thin neck
    const head = new T.Mesh(new T.SphereGeometry(1.3, 40, 24, 0, Math.PI * 2, 0.52, Math.PI - 0.52), shellB); head.position.y = -1.18;
    g.add(head, tube(short ? [V(0, -2.4, 0), V(-0.05, -3.0, 0), V(0, -3.6, 0)] : [V(0, -2.4, 0), V(-0.1, -3.2, 0), V(0.15, -4.4, 0)], 0.24, solidB, 12));
    // receptors: channels across the lower membrane, closed until the transmitter binds
    const recM = mat(0xF6F3EC, { roughness: 0.4 }), receptors = [[-0.42, 0.1], [0, -0.28], [0.42, 0.1], [-0.18, 0.36], [0.2, 0.4]].map(([x, z]) => {
      const r = new T.Group(); r.position.set(x, -0.08, z);
      const halves = [0, Math.PI].map(a => { const h = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.3, 14, 1, false, a + 0.25, Math.PI - 0.5), recM); r.add(h); return h; });
      const plug = ball(0.075, recM); r.add(plug); g.add(r); return { r, halves, plug, x, z };
    });
    // vesicles full of transmitter, and the transmitter itself once it is out
    const vesM = mat(0xBFEFC2, { opacity: 0.9 }), vesicles = Array.from({ length: 10 }, (_, i) => {
      const home = V((rnd() - 0.5) * 1.5, 0.95 + rnd() * 1.6, (rnd() - 0.5) * 1.1), v = ball(0.19, vesM, home.x, home.y, home.z); g.add(v);
      return { v, home, dock: V((i % 5 - 2) * 0.26, 0.62, ((i / 5 | 0) - 0.5) * 0.4), t: -1 };
    });
    const bits = makeSparks(g, 80, 0.05, 0x7BE38A).map(s => ({ s, t: -1, from: V(0, 0, 0), to: V(0, 0, 0) }));
    // sodium waiting in the cleft; it enters when the receptors open
    const na = makeSparks(g, 14, 0.065, 0xFF9F2E).map((s, i) => ({ s, home: V((i % 2 ? 1 : -1) * (0.95 + rnd() * 0.5), 0.15 + rnd() * 0.25, (rnd() - 0.5) * 1.2), in: V((rnd() - 0.5) * 1.2, -0.7 - rnd() * 0.9, (rnd() - 0.5) * 0.8), k: 0, rec: receptors[i % 5] }));
    const syn = { group: g, bound: 0, charge: 0, full: 24 };       // full = how many molecules on the receptors count as «all of them»
    syn.release = n => vesicles.filter(v => !v.go).slice(0, n).forEach((v, i) => { v.go = true; v.spilt = false; v.t = -i * 0.07; });
    syn.update = (dt, time) => {
      // a released vesicle goes to the membrane, opens, and comes back refilled a little later
      for (const v of vesicles) {
        if (!v.go) { v.v.position.copy(v.home); v.v.position.y += Math.sin(time * 1.3 + v.home.x * 9) * 0.03; v.v.scale.setScalar(1); continue; }
        v.t += dt;
        const k = v.t / 0.4;
        if (k < 1) { v.v.position.copy(v.home).lerp(v.dock, ease(k)); v.v.scale.setScalar(1); }
        else if (v.t < 0.6) {
          v.v.scale.setScalar(Math.max(0.01, 1 - (v.t - 0.4) / 0.2));
          if (!v.spilt) { v.spilt = true; let made = 0; for (const b of bits) if (b.t < 0 && made < 8) { made++; b.t = 0; b.from.copy(v.dock).setY(0.42); const r = receptors[(made + (v.dock.x * 10 | 0) + 50) % 5]; b.to.set(r.x + (rnd() - 0.5) * 0.16, -0.02 + rnd() * 0.06, r.z + (rnd() - 0.5) * 0.16); } }
        } else if (v.t > 2.6) { v.go = false; v.spilt = false; v.t = -1; }
        else v.v.scale.setScalar(v.t > 2.2 ? (v.t - 2.2) / 0.4 : 0.01), v.v.position.copy(v.home);
      }
      // the transmitter crosses the cleft (0.5 s), stays on a receptor (1.2 s), and is taken away
      let on = 0;
      for (const b of bits) {
        if (b.t < 0) { b.s.visible = false; continue; }
        b.t += dt; b.s.visible = true;
        if (b.t < 0.5) b.s.position.copy(b.from).lerp(b.to, ease(b.t / 0.5)).add(V(Math.sin(b.t * 30 + b.to.x * 50) * 0.02, 0, 0));
        else if (b.t < 1.7) { b.s.position.copy(b.to); on++; }
        else if (b.t < 2.1) { b.s.position.copy(b.to).lerp(V(b.to.x * 2.6, 0.2, b.to.z * 2), (b.t - 1.7) / 0.4); b.s.material.opacity = 1 - (b.t - 1.7) / 0.4; }
        else { b.t = -1; b.s.material.opacity = 1; }
      }
      syn.bound = toward(syn.bound, clamp(on / syn.full), dt, 8);
      for (const r of receptors) { const o = syn.bound; r.halves[0].position.x = -0.035 * o; r.halves[1].position.x = 0.035 * o; r.plug.scale.setScalar(Math.max(0.01, 1 - o * 1.6)); }
      // sodium flows in while the receptors are open, and is pumped back out afterwards
      na.forEach((q, i) => {
        q.k = toward(q.k, syn.bound > 0.25 + (i % 7) * 0.07 ? 1 : 0, dt, syn.bound > 0.2 ? 3 : 0.8); q.s.visible = true;
        const top = V(q.rec.x, 0.12, q.rec.z), k = q.k;
        q.s.position.copy(k < 0.5 ? q.home.clone().lerp(top, ease(k * 2)) : top.clone().lerp(q.in, ease(k * 2 - 1)));
        if (k < 0.02) q.s.position.y += Math.sin(time * 2 + i) * 0.03;
      });
      syn.charge = toward(syn.charge, syn.bound, dt, 3); shellB.emissiveIntensity = syn.charge * 0.55;
    };
    return syn;
  }

  SCENES.sinapse = box => {
    const world = new T.Group(), syn = makeSynapse(0x7FB0D0, 0xF0A673); world.add(syn.group);
    const calcium = makeSparks(world, 8, 0.06, 0xCFE6FF), impulse = makeSparks(world, 1, 0.2, COR.sinal)[0];
    let fired = -1, mv = null, shownMv = '';
    const stage = makeStage(box, (step, dt, time, since) => {
      cam(step, dt, time);
      const T0 = 5.5, t = step >= 1 ? since % T0 : -1, cycle = Math.floor(since / T0);
      // the impulse comes down the axon; calcium enters; the vesicles open
      impulse.visible = t >= 0 && t < 0.7; if (impulse.visible) impulse.position.set(0, 5.4 - t / 0.7 * 3.2, 0.3);
      calcium.forEach((c, i) => { const k = (t - 0.6 - (i % 4) * 0.05) / 0.5, side = i % 2 ? 1 : -1; c.visible = t >= 0 && k > 0 && k < 1.6; if (c.visible) { c.position.set(side * lerp(2.3, 0.7, ease(clamp(k))), 1.1 + (i / 2 | 0) * 0.22, 0.3); c.material.opacity = clamp(1.6 - k); } });
      if (t > 0.95 && fired !== cycle && step >= 1) { fired = cycle; syn.release(4); som.passo(); }
      if (step < 1) fired = -1;
      syn.update(dt, time);
      const txt = Math.round(-70 + 8 * syn.charge) + ' mV'; if (mv && txt !== shownMv) { shownMv = txt; mv.innerHTML = `<b>${txt}</b>dentro da espinha`; }
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(0, 0.75, 0), from: V(0, 1.6, 14.5) }, { at: V(0, 1.15, 0), from: V(0, 1.8, 12.5) }, { at: V(0, -0.45, 0), from: V(0, 0.5, 10.5) }, { at: V(0, 0.75, 0), from: V(0, 1.6, 14.5) }], 1.2);
    const at = (x, y, z) => spot(world, x, y, z);
    stage.label('<b>fim do axónio</b>de um neurónio', at(-4.6, 2.5), s => s === 0 || s === 3, '', at(-1.25, 2.3));
    stage.label('<b>vesículas</b>cheias de neurotransmissor', at(4.7, 2.5), s => s <= 1, '', at(0.6, 1.9));
    stage.label('<b>fenda</b>20 milionésimos de milímetro', at(-4.8, 0.65), s => s === 0, '', at(-0.62, 0.2));
    stage.label('<b>recetores</b>canais fechados', at(4.4, 0.75), s => s === 0, '', at(0.5, -0.02));
    stage.label('<b>espinha da dendrite</b>do neurónio seguinte', at(4.6, -1.0), s => s === 0, '', at(1.1, -1.1));
    stage.label('<b>1 · chega o impulso</b>entra cálcio', at(-4.2, 2.6), s => s === 1, 'conceito azul', at(-1.45, 1.5));
    stage.label('<b>2 · as vesículas abrem-se</b>e largam o neurotransmissor', at(-4.4, 0.55), s => s === 1, 'conceito', at(-0.5, 0.48));
    stage.label('<b>3 · o neurotransmissor encaixa</b>e o recetor abre', at(-3.9, 0.55), s => s === 2, 'conceito', at(-0.5, 0.0));
    stage.label('<b>4 · entra sódio (Na⁺)</b>cargas positivas', at(3.6, 0.6), s => s === 2, 'conceito', at(0.75, -0.75));
    mv = stage.label('', at(3.3, -1.45), s => s >= 2, '');
  };

  /* --- the action potential: sodium in, potassium out --- */
  /** Voltage inside the axon (millivolts) at time t of the cycle (seconds, slow motion). */
  const AP = t => t < 0.6 ? -70 : t < 1.0 ? lerp(-70, -55, ease((t - 0.6) / 0.4)) : t < 1.45 ? lerp(-55, 40, ease((t - 1.0) / 0.45)) : t < 2.3 ? lerp(40, -78, ease((t - 1.45) / 0.85)) : t < 3.2 ? lerp(-78, -70, ease((t - 2.3) / 0.9)) : -70;
  SCENES.potencial = box => {
    const slide = box.closest('.slide'), plot = slide.querySelector('canvas.pot');
    const world = new T.Group(), rnd = lcg(77), M4 = new T.Matrix4();
    // the membrane: two layers of lipids, seen from the side; outside the cell is above, the inside of the axon below
    const CH = [[-3.6, 'na', 0], [-2.3, 'k', 0], [-0.6, 'na', 1], [0.7, 'k', 1], [2.4, 'na', 2], [3.7, 'k', 2]];
    const heads = []; for (let x = -5.6; x <= 5.6; x += 0.27) for (let z = -0.95; z <= 0.95; z += 0.27) if (!CH.some(c => Math.abs(c[0] - x) < 0.42 && Math.abs(z) < 0.42)) heads.push([x, z]);
    for (const y of [0.3, -0.3]) { const inst = new T.InstancedMesh(new T.SphereGeometry(0.115, 10, 8), mat(0xE9D7B8, { roughness: 0.5 }), heads.length); heads.forEach(([x, z], i) => { M4.makeTranslation(x, y, z); inst.setMatrixAt(i, M4); }); world.add(inst); }
    world.add(box3(11.4, 0.42, 2.1, mat(0xB58E63, { opacity: 0.55 }), 0, 0, 0));
    const inside = box3(11.4, 3.2, 2.1, mat(0x4A6A8A, { opacity: 0.22, depthWrite: false }), 0, -2.0, 0); world.add(inside);
    const cold = new T.Color(0x4A6A8A), warm = new T.Color(0xF0A040);
    // channels: sodium (orange) and potassium (violet), each with a gate that closes the pore
    const COL = { na: 0xF08A3C, k: 0x9C8CFF }, channels = CH.map(([x, kind, group]) => {
      const g = new T.Group(); g.position.set(x, 0, 0); const m = mat(COL[kind], { roughness: 0.45, side: T.DoubleSide });
      const halves = [0, Math.PI].map(a => { const h = new T.Mesh(new T.CylinderGeometry(0.36, 0.3, 1.05, 18, 1, true, a + 0.2, Math.PI - 0.4), m); g.add(h); return h; });
      const gate = ball(0.22, m, 0, -0.1, 0); g.add(gate); world.add(g); return { g, halves, gate, kind, group, x, open: 0 };
    });
    // ions: sodium mostly outside, potassium mostly inside; each one knows the channel it will cross by
    const ions = [];
    for (const kind of ['na', 'k']) { const sp = makeSparks(world, 46, 0.12, kind === 'na' ? 0xFF9F2E : 0xA99BFF), chs = channels.filter(c => c.kind === kind);
      sp.forEach((s, i) => { const out = kind === 'na' ? i < 40 : i >= 40, side = out ? 1 : -1, home = V((rnd() - 0.5) * 10.6, side * (0.9 + rnd() * 1.9), (rnd() - 0.5) * 1.6);
        const ch = chs.reduce((b, c) => (Math.abs(c.x - home.x) < Math.abs(b.x - home.x) ? c : b)), moves = (kind === 'na') === out && Math.abs(ch.x - home.x) < 1.5 && rnd() < 0.75;
        s.visible = true; ions.push({ s, kind, home, ch, moves, lag: rnd() * 0.3, far: V(ch.x + (rnd() - 0.5) * 1.6, -side * (1.0 + rnd() * 1.5), (rnd() - 0.5) * 1.4), side }); }); }
    const band = box3(0.9, 3.1, 2.0, new T.MeshBasicMaterial({ color: 0xFFD98A, transparent: true, opacity: 0, depthWrite: false }), 0, -2.0, 0); world.add(band);
    /* --- the plot beside the stage: the voltage inside the axon, drawn as the cycle goes --- */
    function draw(step, t) {
      if (!plot) return;
      const g = plot.getContext('2d'), W = plot.width, Hh = plot.height, L = 104, X = s => L + s / 3.6 * (W - L - 34), Y = v => 58 + (40 - v) / 118 * (Hh - 150);
      g.clearRect(0, 0, W, Hh); g.lineCap = 'round'; g.lineJoin = 'round'; g.textBaseline = 'middle';
      // three levels to read: the peak, the threshold and rest (large type: the canvas is shown at about half its size)
      g.font = 'bold 32px Carlito, Calibri, sans-serif'; g.textAlign = 'right';
      for (const [v, name, dash] of [[40, '+40', 0], [-55, '−55', 1], [-70, '−70', 0]]) {
        g.fillStyle = '#1E2A33'; g.fillText(name, L - 12, Y(v) + (v === -70 ? 9 : v === -55 ? -7 : 0)); g.strokeStyle = dash ? '#A44A16' : '#C9D1D8'; g.lineWidth = dash ? 3 : 2; g.setLineDash(dash ? [10, 9] : []); g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - 20, Y(v)); g.stroke(); }
      g.setLineDash([]); g.textAlign = 'right'; g.font = 'bold 28px Carlito, Calibri, sans-serif';
      g.fillStyle = '#A44A16'; g.fillText('limiar', W - 22, Y(-55) - 20); g.fillStyle = '#6F7880'; g.fillText('repouso', W - 22, Y(-70) + 24);
      g.strokeStyle = '#1E2A33'; g.lineWidth = 4; g.beginPath(); g.moveTo(L, 34); g.lineTo(L, Hh - 64); g.lineTo(W - 16, Hh - 64); g.stroke();
      g.fillStyle = '#1E2A33'; g.textAlign = 'left'; g.fillText('milivolts', L + 12, 22);
      g.textAlign = 'center'; g.fillText('tempo: cerca de 2 milésimos de segundo →', (W + L) / 2, Hh - 30);
      // the curve so far: orange while sodium enters, violet while potassium leaves
      const upto = step === 0 ? 0.55 : t;
      for (const [a, b, color] of [[0, 1.0, '#6F7880'], [1.0, 1.45, '#E0731A'], [1.45, 2.3, '#7A66F0'], [2.3, 3.6, '#6F7880']]) {
        if (upto <= a) break; g.strokeStyle = color; g.lineWidth = 9; g.beginPath();
        for (let s = a; s <= Math.min(b, upto) + 0.001; s += 0.02) { const x = X(s), y = Y(AP(s)); s === a ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
      }
      g.fillStyle = '#1E2A33'; g.beginPath(); g.arc(X(upto), Y(AP(upto)), 12, 0, 7); g.fill();
      g.font = 'bold 34px Carlito, Calibri, sans-serif';
      if (upto > 1.1 && step >= 1) { g.textAlign = 'right'; g.fillStyle = '#E0731A'; g.fillText('entra', X(1.2) - 10, Y(8)); g.fillText('sódio', X(1.2) - 10, Y(-13)); }
      if (upto > 1.8 && step >= 2) { g.textAlign = 'left'; g.fillStyle = '#7A66F0'; g.fillText('sai', X(1.95) + 18, Y(8)); g.fillText('potássio', X(1.95) + 18, Y(-13)); }
    }
    const stage = makeStage(box, (step, dt, time, since) => {
      cam(0, dt, time);
      const T0 = step === 1 ? 4.2 : 5.6, raw = step >= 1 ? since % T0 : 0, t = step === 1 ? Math.min(raw, 1.45) : raw;       // step 1 stops at the peak
      const local = c => step >= 3 ? t - c.group * 0.45 + 0.45 : t;                 // step 3: the three stretches of membrane fire one after the other
      for (const c of channels) {
        const tl = local(c), want = c.kind === 'na' ? (tl > 1.0 && tl < 1.6 ? 1 : 0) : (tl > 1.5 && tl < 2.5 ? 1 : 0);
        c.open = toward(c.open, want, dt, 14); c.halves[0].position.x = -0.1 * c.open; c.halves[1].position.x = 0.1 * c.open; c.gate.scale.setScalar(Math.max(0.01, 1 - c.open));
      }
      for (const q of ions) {
        const tl = local(q.ch), start = q.kind === 'na' ? 1.02 : 1.55, back = step >= 2 ? clamp((tl - 3.3 - q.lag) / 1.2) : raw > 3.6 ? clamp((raw - 3.6) / 0.5) : 0;
        const k = q.moves ? clamp((tl - start - q.lag) / 0.45) * (1 - ease(back)) : 0, top = V(q.ch.x, q.side * 0.75, 0), bot = V(q.ch.x, -q.side * 0.75, 0);
        const p = k < 0.35 ? q.home.clone().lerp(top, ease(k / 0.35)) : k < 0.65 ? top.clone().lerp(bot, (k - 0.35) / 0.3) : bot.clone().lerp(q.far, ease((k - 0.65) / 0.35));
        p.x += Math.sin(time * 1.7 + q.home.x * 7) * 0.05; p.y += Math.cos(time * 1.3 + q.home.y * 5) * 0.05; q.s.position.copy(p);
      }
      const v = AP(t); inside.material.color.copy(cold).lerp(warm, clamp((v + 70) / 110));
      // step 3: a band of light shows where along the axon the inside is positive at this moment
      const wave = step >= 3 ? (t - 0.75) / 1.35 : -1; band.material.opacity = wave > 0 && wave < 1 ? 0.35 : 0; band.position.x = lerp(-4.6, 4.6, clamp(wave));
      draw(step, Math.min(t, 3.6));
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(0, 0.4, 0), from: V(0, 2.2, 14.5) }], 1.6);
    const at = (x, y) => spot(world, x, y, 0.9);
    // names of the two sides at the left; what is happening, under the membrane at the right
    stage.label('<b>fora do neurónio</b>muito sódio (Na⁺)', at(-3.6, 3.7), () => true);
    stage.label('<b>dentro do axónio</b>muito potássio (K⁺)', at(-3.6, -3.05), () => true);
    stage.label('canal de sódio', at(-0.6, 2.5), s => s <= 1 || s === 3, 'peq', at(-0.6, 0.62));
    stage.label('canal de potássio', at(3.7, 2.5), s => s === 0 || s >= 2, 'peq', at(3.7, 0.62));
    stage.label('<b>canais fechados</b>em repouso', at(3.0, -3.05), s => s === 0, 'conceito azul');
    stage.label('<b>o sódio entra</b>o interior fica positivo', at(3.0, -3.05), s => s === 1, 'conceito');
    stage.label('<b>o potássio sai</b>o interior volta a negativo', at(2.9, -3.05), s => s === 2, 'conceito azul');
    stage.label('<b>a onda avança</b>cada troço dispara o seguinte', at(2.9, -3.05), s => s >= 3, 'conceito');
  };

  /* ---------- 15. hebb: neurons that fire together wire together (a student learns a new way to school) ---------- */
  SCENES.hebb = box => {
    const slide = box.closest('.slide'), say = sayIn(slide), state = slide.querySelector('.estado'), map = slide.querySelector('canvas.mapa');
    const PLACES = [{ nome: 'casa', cor: 0x8FC4E8, m: [0.14, 0.78] }, { nome: 'café', cor: 0x7BB98A, m: [0.4, 0.3] }, { nome: 'jardim', cor: 0xE58FB5, m: [0.66, 0.7] }, { nome: 'escola', cor: 0xF2C14E, m: [0.88, 0.24] }];
    const world = new T.Group(), rnd = lcg(41), cells = [], links = [];
    // one group of neurons for each place on the way
    PLACES.forEach((p, a) => { p.c = V(-4.2 + a * 2.8, a % 2 ? 0.9 : -0.7, 0); p.cells = []; p.fire = 0;
      for (let i = 0; i < 11; i++) { const pos = p.c.clone().add(V((rnd() - 0.5) * 1.7, (rnd() - 0.5) * 1.7, (rnd() - 0.5) * 1.5)), m = mat(p.cor, { roughness: 0.45, emissive: p.cor, emissiveIntensity: 0 }), s = ball(0.17, m, pos.x, pos.y, pos.z); world.add(s); const c = { pos, m, s, a, lit: 0 }; cells.push(c); p.cells.push(c); } });
    // connections: within a group (already there), from one group to the next (weak at first), and a few stray ones
    const edge = (a, b, kind, k) => { const m = mat(0x8A929A, { opacity: 0.5 }), mesh = new T.Mesh(new T.CylinderGeometry(1, 1, a.pos.distanceTo(b.pos), 6), m);
      mesh.position.copy(a.pos).lerp(b.pos, 0.5); mesh.quaternion.setFromUnitVectors(V(0, 1, 0), b.pos.clone().sub(a.pos).normalize()); world.add(mesh); links.push({ a, b, kind, k, mesh, m, show: 0 }); };
    PLACES.forEach((p, a) => { for (let i = 0; i < 11; i++) edge(p.cells[i], p.cells[(i + 3) % 11], 'dentro', a);
      if (a < 3) for (let i = 0; i < 9; i++) edge(p.cells[i], PLACES[a + 1].cells[(i * 4 + a) % 11], 'caminho', a); });
    for (let i = 0; i < 7; i++) edge(PLACES[i % 2 ? 0 : 1].cells[i], PLACES[i % 2 ? 2 : 3].cells[i + 2], 'solta', i);
    const w = [0.12, 0.12, 0.12], sparks = makeSparks(world, 9, 0.09, COR.sinal); let stray = 1, walks = 0, run = null;
    const grey = new T.Color(0x8A929A), hot = new T.Color(0xFFB45A);
    const report = s => { say(s); if (state) state.textContent = `feito ${walks} ${walks === 1 ? 'vez' : 'vezes'} · ligações a ${Math.round((w[0] + w[1] + w[2]) / 3 * 100)}\u00A0%`; };
    function stageless() { report('Façam o caminho, de casa até à escola.'); }
    slide.querySelector('[data-act="andar"]').addEventListener('click', () => { if (!run) run = { kind: 'andar', t: 0 }; });
    slide.querySelector('[data-act="lembrar"]').addEventListener('click', () => { if (!run) run = { kind: 'lembrar', t: 0, reach: 0 }; });
    slide.querySelector('[data-act="tempo"]').addEventListener('click', () => { for (let i = 0; i < 3; i++) w[i] = Math.max(0.05, w[i] * 0.72); stray = Math.max(0, stray - 0.5); report('Semanas sem o fazer: as ligações enfraquecem.'); });
    slide.querySelector('[data-act="repor"]').addEventListener('click', () => { w.fill(0.12); stray = 1; walks = 0; run = null; stageless(); });
    stageless();
    /* --- the map beside the stage: the way from home to school, and where the student is --- */
    let where = 0, known = 0;
    function drawMap(time) {
      if (!map) return; const g = map.getContext('2d'), W = map.width, Hh = map.height, P = p => [p.m[0] * W, p.m[1] * Hh];
      g.clearRect(0, 0, W, Hh); g.lineCap = 'round';
      g.strokeStyle = '#E4E9EE'; g.lineWidth = 26; for (const y of [0.24, 0.5, 0.76]) { g.beginPath(); g.moveTo(0, y * Hh); g.lineTo(W, y * Hh); g.stroke(); } for (const x of [0.14, 0.4, 0.66, 0.88]) { g.beginPath(); g.moveTo(x * W, 0); g.lineTo(x * W, Hh); g.stroke(); }
      for (let i = 0; i < 3; i++) { const a = P(PLACES[i]), b = P(PLACES[i + 1]); g.strokeStyle = `rgba(164, 74, 22, ${0.18 + 0.82 * w[i]})`; g.lineWidth = 5 + 11 * w[i]; g.setLineDash(w[i] < 0.5 ? [4, 16] : []); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
      g.setLineDash([]); g.textAlign = 'center'; g.font = 'bold 38px Carlito, Calibri, sans-serif';
      PLACES.forEach((p, i) => { const [x, y] = P(p); g.fillStyle = '#' + p.cor.toString(16).padStart(6, '0'); g.strokeStyle = '#1E2A33'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 24 + 8 * p.fire, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#1E2A33'; g.fillText(p.nome, x, y + (i % 2 ? -50 : 64)); });
      const i = Math.min(2, Math.floor(where)), f = where - i, a = P(PLACES[i]), b = P(PLACES[i + 1]), x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f) + Math.sin(time * 9) * 3;
      g.fillStyle = '#1E2A33'; g.beginPath(); g.arc(x, y - 40, 15, 0, 7); g.fill(); g.fillRect(x - 12, y - 25, 24, 34);                       // the student
    }
    const stage = makeStage(box, (step, dt, time) => {
      cam(0, dt, time);
      PLACES.forEach(p => (p.want = 0)); let lit = [0, 0, 0];
      if (run && run.kind === 'andar') {
        // 1.6 s from each place to the next; near a place its neurons fire, and between two places both groups fire together
        run.t += dt; where = clamp(run.t / 1.6, 0, 3);
        PLACES.forEach((p, a) => (p.want = clamp(1.25 - Math.abs(where - a) * 1.5)));
        for (let i = 0; i < 3; i++) { const both = Math.min(PLACES[i].want, PLACES[i + 1].want); lit[i] = both; if (both > 0.3) w[i] = Math.min(1, w[i] + dt * 0.22 * (1 - w[i]) * 2.2); }
        if (run.t > 5.4) { run = null; walks++; where = 0; report('Chegou à escola.'); }
      } else if (run) {
        // remembering: only «casa» is given; each group wakes the next one if the connection between them is strong enough
        run.t += dt; let reach = 0; for (let i = 0; i < 3 && w[i] > 0.5; i++) reach = i + 1;
        PLACES.forEach((p, a) => (p.want = a <= reach ? clamp(1.3 - Math.abs(run.t / 0.9 - a) * 1.2) : 0)); for (let i = 0; i < reach; i++) lit[i] = Math.min(PLACES[i].want, PLACES[i + 1].want);
        where = Math.min(reach, run.t / 0.9);
        if (run.t > 0.9 * reach + 1.4) { run = null; where = 0; report(reach === 3 ? 'Lembrou-se de tudo: <b>já sabe o caminho</b>.' : reach === 0 ? 'Não veio mais nada: ainda não sabe o caminho.' : `Lembrou-se até ${reach === 1 ? 'ao café' : 'ao jardim'}; depois perdeu-se.`); }
      }
      for (const p of PLACES) p.fire = toward(p.fire, p.want, dt, 9);
      for (const c of cells) { c.lit = Math.random() < PLACES[c.a].fire * dt * 9 ? 1 : Math.max(0, c.lit - dt * 5); c.m.emissiveIntensity = c.lit * 0.9; c.s.scale.setScalar(1 + c.lit * 0.35); }
      links.forEach((l, i) => {
        const goal = l.kind === 'dentro' ? 0.5 : l.kind === 'caminho' ? w[l.k] : 0.18 * stray; l.show = toward(l.show, goal, dt, 5);
        const r = 0.008 + 0.05 * l.show; l.mesh.scale.set(r, 1, r); l.mesh.visible = l.show > 0.02;
        const on = l.kind === 'caminho' ? lit[l.k] : l.kind === 'dentro' ? PLACES[l.k].fire * 0.5 : 0; l.m.color.copy(grey).lerp(hot, clamp(Math.max(on, l.kind === 'caminho' ? (l.show - 0.3) : 0))); l.m.opacity = 0.25 + 0.75 * clamp(l.show * 1.4);
      });
      sparks.forEach((s, i) => { const k = i % 3, l = links.filter(x => x.kind === 'caminho' && x.k === k)[(i / 3 | 0) * 2], ph = (time * 1.6 + i * 0.37) % 1; s.visible = lit[k] > 0.3; if (s.visible) s.position.copy(l.a.pos).lerp(l.b.pos, ph); });
      drawMap(time);
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(0, 0.15, 0), from: V(0, 1.2, 14) }], 1.55);
    PLACES.forEach((p, a) => stage.label(`<b>${p.nome}</b>`, spot(world, p.c.x + (a % 2 ? 0.9 : 0), p.c.y + (a % 2 ? 1.2 : -1.25), 0), () => true, a % 2 ? '' : 'baixo'));
    stage.label('<b>disparam juntos → ligam-se</b>', spot(world, 0, 2.7, 0), () => !!run && run.kind === 'andar', 'conceito');
  };
  /* ---------- 16. lesma: Kandel's sea slug (Aplysia) at three scales: the animal, the circuit, the synapse ---------- */
  /** A canvas painted with blotches, used as skin (and as its relief). */
  function blotchTexture(base, dark, light, seed) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'), rnd = lcg(seed);
    g.fillStyle = base; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 260; i++) { const x = rnd() * 512, y = rnd() * 256, r = 4 + rnd() * 22; g.globalAlpha = 0.10 + rnd() * 0.3; g.fillStyle = rnd() < 0.72 ? dark : light; g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rnd() * 0.6), rnd() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 900; i++) { g.globalAlpha = 0.25 + rnd() * 0.4; g.fillStyle = rnd() < 0.5 ? dark : light; g.fillRect(rnd() * 512, rnd() * 256, 2, 2); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; if ('colorSpace' in t) t.colorSpace = T.SRGBColorSpace; return t;
  }
  /** A sphere pulled into another shape: fn(x, y, z) of the unit sphere → [x, y, z]. */
  function shaped(fn, material) {
    const g = new T.SphereGeometry(1, 56, 36), p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) { const v = fn(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, v[0], v[1], v[2]); }
    g.computeVertexNormals(); return new T.Mesh(g, material);
  }
  SCENES.lesma = box => {
    const slide = box.closest('.slide'), bars = slide.querySelector('.sustos'), say = sayIn(slide);
    const world = new T.Group(), animal = new T.Group(); world.add(animal);
    const skinTex = blotchTexture('#6E4B3C', '#2E1B17', '#B98F6C', 3), phys = (extra) => new T.MeshPhysicalMaterial(Object.assign({ map: skinTex, bumpMap: skinTex, bumpScale: 0.6, roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.3, transparent: true }, extra));
    const skin = phys({}), flap = phys({ color: 0xE9C9B4, side: T.DoubleSide }), mantleM = phys({ color: 0xD9A7A0 }), gillM = mat(0xE98FA0, { roughness: 0.45, side: T.DoubleSide }), fades = [skin, flap, mantleM, gillM];
    /* --- the animal: head to the left, tail to the right, about 5 units long (a real one: some 15 centimetres) --- */
    const wrinkle = (x, z) => 1 + 0.035 * Math.sin(x * 23 + z * 7) + 0.025 * Math.sin(z * 31 - x * 11);
    animal.add(shaped((x, y, z) => { const k = wrinkle(x, z); return [x * 2.45, (y < 0 ? y * 0.28 : y * (0.74 + 0.26 * Math.exp(-(((x - 0.1) / 0.55) ** 2)))) * k + 0.3, z * 0.98 * (1 + 0.1 * x) * k]; }, skin));          // body, flat underneath
    const neck = shaped((x, y, z) => [x * 1.05 - 2.75, (y < 0 ? y * 0.3 : y * 0.52) * wrinkle(x, z) + 0.42 + 0.12 * -x, z * 0.56 * wrinkle(z, x)], skin); animal.add(neck);
    for (const s of [1, -1]) {
      const rhino = shaped((x, y, z) => [x * 0.1 * (1.2 - y) - 3.05 + y * -0.06, y * 0.34 + 1.22, z * 0.13 * (1.25 - y) + s * 0.21], skin), oral = shaped((x, y, z) => [x * 0.36 - 3.78, y * 0.13 + 0.36 + x * 0.05, z * 0.2 + s * (0.3 - x * 0.12)], skin);
      animal.add(rhino, oral, ball(0.03, mat(0x0E0E10), -3.4, 0.86, s * 0.2));
      // parapodia: the two «wings» that rise from the sides and fold over the back
      const gp = new T.PlaneGeometry(1, 1, 30, 8), pp = gp.getAttribute('position');
      for (let i = 0; i < pp.count; i++) { const u = pp.getX(i) + 0.5, v = pp.getY(i) + 0.5, x = -1.55 + u * 3.2, wide = Math.sin(Math.PI * clamp(u * 0.9 + 0.05));
        pp.setXYZ(i, x, 0.35 + wide * (0.95 * Math.sin(v * 1.75)) + 0.05 * Math.sin(u * 28) * v, s * (0.98 - 0.62 * v * v * wide + 0.05 * Math.sin(u * 19 + 1) * v) * (0.75 + 0.25 * wide)); }
      gp.computeVertexNormals(); animal.add(new T.Mesh(gp, flap));
    }
    animal.add(shaped((x, y, z) => [x * 1.0 + 0.1, y * 0.24 + 0.98, z * 0.5], mantleM));                                    // the mantle, a soft roof over the gill
    const gill = new T.Group(); gill.position.set(0.55, 0.86, 0.34); animal.add(gill);
    for (let i = 0; i < 13; i++) { const a = (i - 6) * 0.17, leaf = shaped((x, y, z) => [x * 0.07, y * 0.34 + 0.3, z * 0.035 + 0.05 * Math.sin(y * 6)], gillM); leaf.rotation.set(0.5 + (i % 2) * 0.15, 0, -a); leaf.position.set(Math.sin(a) * 0.55, 0, (i % 3 - 1) * 0.06); gill.add(leaf); }
    const siphon = new T.Mesh(new T.LatheGeometry([[0.13, 0], [0.15, 0.25], [0.19, 0.5], [0.27, 0.66]].map(p => new T.Vector2(p[0], p[1])), 24), phys({ color: 0xD9A7A0, side: T.DoubleSide })); siphon.position.set(1.25, 0.86, 0); siphon.rotation.z = -0.75; animal.add(siphon); fades.push(siphon.material);
    /* --- the sea floor, a few plants, things drifting in the water --- */
    const sandTex = blotchTexture('#8D8573', '#5E5848', '#B9B19C', 8); sandTex.repeat.set(7, 7);
    const sand = new T.Mesh(new T.CircleGeometry(16, 48), new T.MeshStandardMaterial({ map: sandTex, bumpMap: sandTex, bumpScale: 0.5, roughness: 1, color: 0x9FB0AE, transparent: true })); sand.rotation.x = -Math.PI / 2; sand.position.y = 0.02; world.add(sand);
    const weeds = [[-5.2, -2.2], [-4.6, -2.8], [4.9, -2.4], [5.4, -1.6], [3.2, -3.4]].map(([x, z], i) => { const w = new T.Mesh(new T.PlaneGeometry(0.22, 2.2 + (i % 3) * 0.5, 1, 6), mat(0x4F8F5C, { side: T.DoubleSide, opacity: 0.9 })); w.geometry.translate(0, 1.2, 0); w.position.set(x, 0, z); world.add(w); return w; });
    const drift = makeSparks(world, 40, 0.025, 0xCFE8E8); const dr = lcg(12); drift.forEach(d => { d.userData.p = V((dr() - 0.5) * 14, dr() * 5, (dr() - 0.5) * 6); d.visible = true; d.material.opacity = 0.35; d.material.depthTest = true; });
    const rod = new T.Group(); rod.add(new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 2.6, 8), mat(0xDDE6E8, { opacity: 0.8 }))); rod.add(ball(0.06, mat(0xF6F3EC), 0, -1.3, 0)); rod.rotation.z = -0.45; world.add(rod);
    /* --- the circuit of the reflex, inside the animal: one sensory neuron, one motor neuron (schematic) --- */
    const circuit = new T.Group(); world.add(circuit);
    const blue = mat(0x8FC4E8, { emissive: 0x8FC4E8, emissiveIntensity: 0.25 }), orange = mat(0xF0A040, { emissive: 0xF0A040, emissiveIntensity: 0.25 }), bag = mat(0xF2C14E, { opacity: 0.22, depthWrite: false });
    const SYN = V(-0.52, 0.5, 0.05), sensPts = [V(1.55, 1.25, 0), V(1.2, 0.8, 0.05), V(0.5, 0.5, 0.12), V(-0.25, 0.52, 0.1), SYN.clone().add(V(0.06, 0.02, 0))], motPts = [SYN.clone().add(V(-0.06, -0.02, 0)), V(-0.75, 0.42, 0), V(-0.4, 0.62, 0.22), V(0.2, 0.74, 0.32), V(0.55, 0.9, 0.34)];
    const sensC = new T.CatmullRomCurve3(sensPts), motC = new T.CatmullRomCurve3(motPts);
    circuit.add(tube(sensPts, 0.025, blue, 40), ball(0.1, blue, -0.25, 0.52, 0.1), tube(motPts, 0.03, orange, 40), ball(0.13, orange, -0.75, 0.42, 0));
    for (const d of [[0.12, 0.1], [-0.1, 0.12], [0.02, -0.12]]) circuit.add(tube([V(1.55, 1.25, 0), V(1.55 + d[0], 1.38, d[1])], 0.012, blue, 4));          // endings in the skin of the siphon
    const blob = shaped((x, y, z) => [x * 0.5 - 0.5, y * 0.24 + 0.47, z * 0.3 + 0.03], bag); circuit.add(blob);
    const gr = lcg(5); for (let i = 0; i < 12; i++) circuit.add(ball(0.045 + gr() * 0.04, mat(0xE8A24A, { opacity: 0.55 }), -0.5 + (gr() - 0.5) * 0.75, 0.47 + (gr() - 0.5) * 0.3, 0.03 + (gr() - 0.5) * 0.4));
    const pulses = makeSparks(circuit, 2, 0.07, COR.sinal);
    /* --- the synapse between the two, hugely magnified --- */
    const LENS = V(-0.7, 2.75, 1.2), LR = 2.0, SC = 0.47;
    const syn = makeSynapse(0x8FC4E8, 0xF0A040, true); syn.full = 64; syn.group.position.copy(LENS).add(V(0, -0.14, 0)); world.add(syn.group);
    const glass = new T.Mesh(new T.CircleGeometry(1, 64), new T.MeshBasicMaterial({ color: 0x0E2730, transparent: true, depthWrite: false })); glass.position.copy(LENS).add(V(0, 0, -0.9)); world.add(glass);
    const zoomM = new T.MeshBasicMaterial({ color: 0xF6F3EC, transparent: true }), zoomLine = new T.Group(); world.add(zoomLine);
    for (const side of [-1, 1]) zoomLine.add(tube([SYN, LENS.clone().add(V(side * LR * 0.72, -LR * 0.69, -0.9))], 0.01, zoomM, 4));       // the two lines of a magnifier call-out
    const lens = new T.Mesh(new T.TorusGeometry(1, 0.012, 8, 64), new T.MeshBasicMaterial({ color: 0xF6F3EC, transparent: true })); world.add(lens);
    /* --- what the class does --- */
    let n = 0, boost = 1, touchT = 9, r = 0, shown = 0, see = 0, micro = 0, shockT = 9;
    const response = k => Math.max(0.07, Math.pow(0.7, k - 1));                 // illustrative: about 30% less on each touch
    function bar(cls) { if (!bars) return; const b = document.createElement('span'); b.className = cls; b.style.setProperty('--h', Math.round(Math.min(1, r) * 100) + '%'); b.dataset.n = cls === 'apito' ? 'choque' : n + '.º'; bars.append(b); if (bars.children.length > 10) bars.firstChild.remove(); }
    slide.querySelector('[data-act="tocar"]').addEventListener('click', () => {
      n++; r = Math.min(1.2, response(n) * boost); touchT = 0; som.toque(); bar(boost > 1 ? 'apito' : 'sirene');
      setTimeout(() => syn.release(Math.max(1, Math.round(8 * Math.min(1.2, r)))), 650);
      say(boost > 1 ? 'Depois do choque, até um toque leve provoca uma resposta enorme: <b>sensitização</b>.' : n === 1 ? 'Primeiro toque: a brânquia encolhe-se toda.' : r < 0.2 ? 'Quase não se encolhe: <b>habituou-se</b> ao toque.' : 'Encolhe-se menos: a sinapse liberta menos neurotransmissor.');
      if (boost > 1 && n >= 3) boost = 1;
    });
    slide.querySelector('[data-act="choque"]').addEventListener('click', () => { boost = 1.7; n = 0; shockT = 0; som.choque(); say('Choque na cauda! Agora toca outra vez no sifão.'); });
    slide.querySelector('[data-act="repor"]').addEventListener('click', () => { n = 0; boost = 1; r = 0; if (bars) bars.innerHTML = ''; say('Descansou umas horas: a resposta volta ao início. Toca no sifão.'); });
    const tail = makeSparks(world, 1, 0.3, 0xFFF1A8)[0];
    const stage = makeStage(box, (step, dt, time) => {
      cam(step, dt, time); touchT += dt; shockT += dt;
      // the touch, and the gill pulling in (less each time)
      const down = touchT < 0.5 ? ease(touchT / 0.25) * (1 - ease((touchT - 0.3) / 0.2)) : 0; rod.position.set(2.37 - down * 0.2, 3.05 - down * 0.5, 0); rod.visible = micro < 0.5;
      const pull = touchT > 1.0 && touchT < 3.6 ? ease((touchT - 1.0) / 0.3) * (1 - ease((touchT - 2.5) / 1.0)) : 0;
      shown = toward(shown, pull * Math.min(1, r), dt, 9); gill.scale.setScalar(1 - 0.72 * shown); siphon.scale.setScalar(1 - 0.3 * shown);
      tail.visible = shockT < 0.5; if (tail.visible) { tail.position.set(2.5, 0.4, 0); tail.material.opacity = 1 - shockT * 2; }
      // inside: the same signal in the sensory neuron every time; a weaker one in the motor neuron as the synapse weakens
      see = toward(see, step >= 1 ? 1 : 0, dt, 3); micro = toward(micro, step >= 2 ? 1 : 0, dt, 2.5);
      const bodyA = lerp(1, 0.2, see) * lerp(1, 0.6, micro); fades.forEach(m => { m.opacity = bodyA; m.depthWrite = bodyA > 0.9; }); sand.material.opacity = lerp(1, 0.35, micro);
      circuit.visible = see > 0.02; circuit.scale.setScalar(1); [blue, orange].forEach(m => { m.opacity = see * lerp(1, 0.55, micro); }); bag.opacity = 0.22 * see * (1 - micro);
      const k1 = (touchT - 0.25) / 0.45, k2 = (touchT - 0.75) / 0.4;
      pulses[0].visible = see > 0.5 && k1 > 0 && k1 < 1; if (pulses[0].visible) pulses[0].position.copy(sensC.getPoint(k1));
      pulses[1].visible = see > 0.5 && k2 > 0 && k2 < 1; if (pulses[1].visible) { pulses[1].position.copy(motC.getPoint(k2)); pulses[1].scale.setScalar(0.35 + Math.min(1.2, r)); }
      // the magnified synapse grows out of the point where the two neurons meet
      const sc = 0.001 + SC * ease(micro); syn.group.scale.setScalar(sc); syn.group.visible = micro > 0.02; syn.update(dt, time);
      zoomLine.visible = lens.visible = glass.visible = micro > 0.05; zoomM.opacity = micro * 0.8; glass.material.opacity = micro * 0.88; lens.material.opacity = micro;
      lens.position.copy(LENS); lens.scale.setScalar(LR * ease(micro)); glass.scale.setScalar(LR * ease(micro)); lens.quaternion.copy(stage.camera.quaternion); glass.quaternion.copy(stage.camera.quaternion);
      weeds.forEach((w, i) => { w.rotation.z = Math.sin(time * 0.8 + i) * 0.12; });
      drift.forEach((d, i) => { const p = d.userData.p; d.position.set(p.x + Math.sin(time * 0.2 + i) * 0.4, (p.y + time * 0.05 * (1 + i % 3)) % 5, p.z); });
    });
    if (!stage) return;
    stage.scene.add(world); stage.scene.fog = new T.FogExp2(0x15343D, 0.028);
    const cam = director(stage.camera, [{ at: V(-0.3, 0.8, 0), from: V(-0.7, 2.9, 10.6) }, { at: V(0.45, 0.75, 0), from: V(0.55, 1.8, 7.6) }, { at: V(-0.2, 2.4, 1.2), from: V(-0.2, 2.7, 11.6) }, { at: V(-0.2, 2.4, 1.2), from: V(-0.2, 2.7, 11.6) }], 1.25);
    const at = (x, y, z) => spot(world, x, y, z);
    stage.label('<b>brânquia</b>por onde respira', at(-0.3, 2.6, 0.3), s => s === 0, '', at(0.55, 1.2, 0.34));
    stage.label('<b>sifão</b>onde se toca', at(2.3, 2.1, 0), s => s === 0, '', at(1.55, 1.3, 0));
    stage.label('cabeça', at(-3.2, 2.2, 0), s => s === 0, 'peq', at(-3.05, 1.3, 0));
    stage.label('cauda', at(3.1, -0.1, 0), s => s === 0, 'peq', at(2.4, 0.4, 0));
    stage.label('<b>1 · pele do sifão</b>sente o toque', at(2.3, 2.0, 0), s => s === 1, '', at(1.58, 1.33, 0));
    stage.label('<b>2 · neurónio sensorial</b>leva o sinal', at(1.7, -0.4, 0.5), s => s === 1, '', at(0.6, 0.5, 0.12));
    stage.label('<b>3 · sinapse</b>num gânglio', at(-1.3, -0.4, 0), s => s === 1, 'conceito', at(-0.52, 0.5, 0.05));
    stage.label('<b>4 · neurónio motor</b>encolhe a brânquia', at(-0.5, 2.0, 0.4), s => s === 1, '', at(0.1, 0.74, 0.3));
    stage.label('<b>neurónio sensorial</b>liberta neurotransmissor', at(2.5, 3.9, 1.2), s => s >= 2, '', at(-0.15, 3.5, 1.2));
    stage.label('<b>neurónio motor</b>recebe-o', at(2.5, 1.8, 1.2), s => s >= 2, '', at(-0.15, 2.1, 1.2));
  };

  /* ---------- 17. Building blocks for the scenes of degraus 2 to 5 ---------- */
  const box3 = (w, h, d, m, x, y, z) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x || 0, y || 0, z || 0); return b; };
  const cyl = (r1, r2, h, m, x, y, z) => { const c = new T.Mesh(new T.CylinderGeometry(r1, r2, h, 18), m); c.position.set(x || 0, y || 0, z || 0); return c; };
  /** A sphere stretched into an ellipsoid: s = half-sizes, p = centre. */
  const blob = (m, s, p) => { const b = ball(1, m, p[0], p[1], p[2]); b.scale.set(s[0], s[1], s[2]); return b; };
  const ground = (r, color, y) => { const g = new T.Mesh(new T.CircleGeometry(r, 48), mat(color, { roughness: 1 })); g.rotation.x = -Math.PI / 2; g.position.y = y || 0; return g; };
  /** Invisible point of a group, for labels to follow. */
  const spot = (parent, x, y, z) => { const o = new T.Object3D(); o.position.set(x, y, z || 0); parent.add(o); return o; };
  /** Flat ring that faces the camera of the schematic scenes (used for sound waves). */
  const ringMesh = (r, color) => new T.Mesh(new T.TorusGeometry(r, 0.025, 8, 40), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0 }));
  /**
   * Signals for the brain scenes. `legs` = [[from, to, start, duration, colour, size]] (millimetres, seconds);
   * the returned function shows where every signal is at time t.
   */
  function makeSignals(head, n) {
    const sparks = makeSparks(head.group, n, 4.2, COR.sinal);
    return (legs, t) => sparks.forEach((s, i) => {
      const L = legs[i], k = L ? (t - L[2]) / L[3] : -1;
      s.visible = k > 0 && k < 1;
      if (s.visible) { s.position.set(lerp(L[0][0], L[1][0], k), lerp(L[0][1], L[1][1], k), lerp(L[0][2], L[1][2], k)); s.material.color.setHex(L[4] || COR.sinal); s.scale.setScalar(L[5] || 1.3); }
    });
  }
  /** A straight connection between two points of a group; its thickness is set later with scale.set(r, 1, r). */
  function link(parent, a, b, color) {
    const A = new T.Vector3(a[0], a[1], a[2]), B = new T.Vector3(b[0], b[1], b[2]);
    const m = new T.Mesh(new T.CylinderGeometry(1, 1, A.distanceTo(B), 10), mat(color));
    m.position.copy(A).lerp(B, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize()); parent.add(m); return m;
  }
  /** A small schematic rat, nose towards +x, feet on y = 0. */
  function makeRat() {
    const g = new T.Group(), fur = mat(0xD3CCC0, { roughness: 0.85 }), pink = mat(0xE7A6A0), dark = mat(0x1E2A33);
    g.add(blob(fur, [0.5, 0.3, 0.3], [0, 0.32, 0]));
    const head = new T.Group(); head.position.set(0.5, 0.38, 0); g.add(head);
    head.add(blob(fur, [0.26, 0.2, 0.2], [0.04, 0, 0]), blob(pink, [0.05, 0.05, 0.05], [0.3, -0.02, 0]));
    for (const z of [0.15, -0.15]) head.add(blob(pink, [0.09, 0.11, 0.035], [-0.06, 0.2, z]), blob(dark, [0.035, 0.035, 0.035], [0.17, 0.08, z * 0.8]));
    g.add(tube([V(-0.46, 0.26, 0), V(-0.8, 0.14, 0.12), V(-1.15, 0.2, -0.06)], 0.03, pink, 10));
    for (const [x, z] of [[0.28, 0.2], [0.28, -0.2], [-0.28, 0.2], [-0.28, -0.2]]) g.add(blob(pink, [0.08, 0.05, 0.06], [x, 0.05, z]));
    return g;
  }
  /** Makes a group walk on the floor towards a target, turning its nose to where it goes. */
  function walker(g, speed) {
    const w = { g, x: 0, z: 0, tx: 0, tz: 0, moving: false };
    w.to = (x, z) => { w.tx = x; w.tz = z; };
    w.put = (x, z) => { w.x = w.tx = x; w.z = w.tz = z; };
    w.step = dt => {
      const dx = w.tx - w.x, dz = w.tz - w.z, d = Math.hypot(dx, dz); w.moving = d > 0.03;
      if (w.moving) {
        const s = Math.min(d, speed * dt); w.x += dx / d * s; w.z += dz / d * s;
        const diff = ((Math.atan2(-dz, dx) - g.rotation.y + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        g.rotation.y += diff * Math.min(1, dt * 12);
      }
      g.position.x = w.x; g.position.z = w.z;
    };
    return w;
  }
  /**
   * A schematic person, facing +x, feet on y = 0, about 2.5 units tall before scaling.
   * Arms hang from pivots at the shoulders: arm.rotation.z = 0 hangs down, π/2 points forwards, π points up.
   */
  function makePerson(scale, shirt) {
    const g = new T.Group(), mats = [mat(0xE2B48C), mat(shirt), mat(0x34424E)], [skin, cloth, legs] = mats;
    g.add(cyl(0.3, 0.34, 0.95, cloth, 0, 1.45, 0), ball(0.27, skin, 0, 2.25, 0), cyl(0.13, 0.12, 1.0, legs, 0, 0.5, 0.16), cyl(0.13, 0.12, 1.0, legs, 0, 0.5, -0.16));
    const arm = z => { const a = new T.Group(); a.position.set(0, 1.85, z); a.add(cyl(0.085, 0.075, 0.8, cloth, 0, -0.4, 0), ball(0.1, skin, 0, -0.84, 0)); g.add(a); return a; };
    const p = { group: g, mats, armR: arm(0.4), armL: arm(-0.4) };
    g.scale.setScalar(scale);
    return p;
  }
  /** A mallet held in a hand: it continues the arm. */
  function makeMallet(arm) {
    const wood = mat(0xC9A26B), g = new T.Group(); g.position.y = -0.84;
    g.add(cyl(0.035, 0.035, 0.7, wood, 0, -0.3, 0)); const headM = cyl(0.13, 0.13, 0.42, wood, 0, -0.68, 0); headM.rotation.z = Math.PI / 2; g.add(headM);
    arm.add(g); return g;
  }
  /** Small HTML helpers of the interactive scenes. */
  const sayIn = slide => { const out = slide.querySelector('.ctl3d output'); return s => { if (out) out.innerHTML = s; }; };
  som.sino = () => { tone(1320, 0, 0.5, 'sine', 0.2); tone(1760, 0.05, 0.45, 'sine', 0.1); };
  som.estrondo = () => { tone(110, 0, 0.3, 'sawtooth', 0.16, 60); tone(190, 0, 0.18, 'square', 0.08); };
  som.comida = () => { tone(1500, 0, 0.08, 'sine', 0.22); tone(2100, 0.07, 0.14, 'sine', 0.18); };
  som.choque = () => tone(95, 0, 0.35, 'sawtooth', 0.09);
  som.tirar = () => tone(520, 0, 0.35, 'triangle', 0.12, 260);
  som.zumbido = () => tone(150, 0, 0.12, 'sawtooth', 0.025);
  som.vitoria = () => { tone(660, 0, 0.12, 'triangle', 0.15); tone(880, 0.12, 0.12, 'triangle', 0.15); tone(1320, 0.24, 0.25, 'triangle', 0.15); };
  som.pancada = () => tone(150, 0, 0.12, 'triangle', 0.18, 80);

  /* ---------- 18. pavlov: teach the dog to salivate at the bell (degrau 2) ---------- */
  SCENES.pavlov = box => {
    const slide = box.closest('.slide'), say = sayIn(slide);
    const world = new T.Group(), fur = mat(0xC2925F, { roughness: 0.85 }), furDark = mat(0x7A5234, { roughness: 0.85 }), dark = mat(0x1E2A33), wood = mat(0x8A6B4A);
    const metal = mat(0xE6B84C, { roughness: 0.35, metalness: 0.45, side: T.DoubleSide });
    world.add(ground(9, 0x46525D, 0));
    /* --- the dog, nose towards the bowl (+x) --- */
    const dog = new T.Group(); world.add(dog);
    dog.add(blob(fur, [1.05, 0.55, 0.5], [0, 1.25, 0]));
    for (const [x, z] of [[-0.7, 0.28], [-0.7, -0.28], [0.7, 0.28], [0.7, -0.28]]) dog.add(cyl(0.13, 0.11, 0.9, fur, x, 0.45, z));
    const tail = new T.Group(); tail.position.set(-1.0, 1.45, 0); const tailCone = new T.Mesh(new T.ConeGeometry(0.09, 0.8, 10), furDark); tailCone.position.y = 0.4; tail.add(tailCone); dog.add(tail);
    const headG = new T.Group(); headG.position.set(1.05, 1.8, 0); dog.add(headG);
    headG.add(blob(fur, [0.46, 0.42, 0.42], [0, 0, 0]), blob(fur, [0.34, 0.2, 0.22], [0.5, -0.1, 0]), blob(dark, [0.08, 0.07, 0.08], [0.82, -0.05, 0]));
    const ears = [1, -1].map(side => { const e = new T.Group(); e.position.set(-0.1, 0.3, side * 0.36); e.add(blob(furDark, [0.14, 0.3, 0.08], [0, -0.22, 0])); headG.add(e); return { e, side }; });
    for (const z of [0.2, -0.2]) headG.add(blob(dark, [0.055, 0.055, 0.055], [0.33, 0.12, z]));
    const mouth = spot(headG, 0.62, -0.3, 0);
    /* --- the bell on its post, the bowl and the food --- */
    world.add(cyl(0.07, 0.09, 3.1, wood, -3.3, 1.55, 0), box3(1.5, 0.12, 0.12, wood, -2.65, 3.05, 0));
    const bell = new T.Group(); bell.position.set(-2.0, 3.0, 0); world.add(bell);
    const dome = new T.Mesh(new T.SphereGeometry(0.42, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), metal); dome.position.y = -0.62; dome.scale.y = 1.25;
    const rim = new T.Mesh(new T.TorusGeometry(0.43, 0.04, 8, 24), metal); rim.rotation.x = Math.PI / 2; rim.position.y = -0.62;
    bell.add(cyl(0.02, 0.02, 0.2, dark, 0, -0.1, 0), dome, rim, ball(0.09, dark, 0, -0.7, 0));
    const rings = [0, 1, 2].map(() => { const r = ringMesh(0.5, COR.sinal); r.position.set(-2.0, 2.4, 0); world.add(r); return r; });
    world.add(cyl(0.55, 0.4, 0.26, mat(0x7FB0D0), 2.45, 0.13, 0));
    const food = [[-0.18, 0], [0.16, 0.1], [0, -0.16], [0.05, 0.2], [-0.05, 0.02]].map(([x, z], i) => { const f = ball(0.13, mat(0x8A4B2A), 2.45 + x, 0.3 + (i === 4 ? 0.12 : 0), z); world.add(f); return f; });
    const drops = makeSparks(world, 10, 0.05, 0xBFE3FF), mouthAt = new T.Vector3();
    /* --- «inside the head»: the two paths that lead to salivating (schematic) --- */
    const net = new T.Group(); world.add(net);
    const nB = V(4.0, 3.45), nC = V(4.0, 2.25), nS = V(5.7, 2.85), cell = mat(0x7FB0D0, { roughness: 0.5 }), cellS = mat(COR.creme, { roughness: 0.5 });
    net.add(ball(0.24, cell, nB.x, nB.y, 0), ball(0.24, mat(COR.laranja, { roughness: 0.5 }), nC.x, nC.y, 0), ball(0.28, cellS, nS.x, nS.y, 0));
    const born = link(net, [nC.x, nC.y, 0], [nS.x, nS.y, 0], COR.laranja); born.scale.set(0.075, 1, 0.075);
    const learned = link(net, [nB.x, nB.y, 0], [nS.x, nS.y, 0], 0x7FB0D0);
    for (let i = 1; i <= 3; i++) net.add(ball(0.04 + i * 0.025, mat(COR.creme), 1.75 + i * 0.5, 2.25 + i * 0.16, 0));
    const pulses = makeSparks(net, 2, 0.13, COR.sinal);
    /* --- what the class does --- */
    let assoc = 0, shown = 0, pairs = 0, solo = 0, tBell = 9, tFood = 9, tAct = 9, goal = 0, drool = 0, kind = '', netShow = 0;
    function act(k) {
      kind = k; tAct = 0;
      if (k !== 'comida') { tBell = 0; som.sino(); }
      if (k !== 'campainha') tFood = k === 'ambos' ? -0.6 : 0;                 // with the bell, the food arrives 0.6 s later
      if (k === 'campainha') {
        const s = assoc; solo++; goal = s > 0.15 ? s : 0;
        assoc *= 0.8;                                                          // bell without food: the association weakens (extinction)
        say(s >= 0.5 ? (solo >= 3 ? 'Só a campainha, vez após vez: saliva cada vez menos. Chama-se <b>extinção</b>.' : 'Só a campainha, e o cão saliva: <b>resposta condicionada</b>.')
          : s > 0.15 ? (pairs && solo >= 2 ? 'Campainha sem comida: a resposta está a apagar-se (<b>extinção</b>).' : 'Só a campainha: saliva um pouco. A associação ainda é fraca.')
          : pairs && solo >= 2 ? 'Já não saliva: sem comida, a associação apagou-se (<b>extinção</b>).' : 'Só a campainha: levanta as orelhas, mas não saliva. É um <b>estímulo neutro</b>.');
      } else if (k === 'comida') { goal = 1; say('Só a comida: saliva logo, sem aprendizagem. <b>Estímulo incondicionado → resposta incondicionada</b>.'); }
      else { pairs++; solo = 0; assoc = Math.min(1, assoc + (1 - assoc) * 0.3); goal = 1; say(`Campainha logo antes da comida: <b>${pairs} ${pairs === 1 ? 'associação' : 'associações'}</b>. A ligação fica mais forte.`); }
      tags();
    }
    const stage = makeStage(box, (step, dt, time) => {
      cam(0, dt, time); tBell += dt; tFood += dt; tAct += dt;
      // bell and sound waves
      bell.rotation.z = tBell < 1.4 ? Math.sin(tBell * 16) * 0.45 * Math.exp(-tBell * 2.4) : 0;
      rings.forEach((r, i) => { const k = (tBell - i * 0.22) / 1.1; r.material.opacity = k > 0 && k < 1 ? (1 - k) * 0.8 : 0; r.scale.setScalar(1 + clamp(k) * 5); });
      // food: drops into the bowl, then is eaten bite by bite
      const fed = tFood >= 0 && tFood < 3;
      food.forEach((f, i) => { f.visible = fed && tFood < 1.3 + i * 0.3; f.position.y = (i === 4 ? 0.42 : 0.3) + Math.max(0, 0.9 - tFood * 4); });
      const eat = fed && tFood > 0.5 ? ease((tFood - 0.5) / 0.4) * (1 - ease((tFood - 2.5) / 0.5)) : 0;
      headG.rotation.z = toward(headG.rotation.z, -0.75 * eat + (eat > 0.5 ? Math.sin(time * 14) * 0.05 : 0), dt, 10);
      const perk = tBell < 1.6 ? ease(tBell / 0.15) * (1 - ease((tBell - 1.1) / 0.5)) : 0;
      ears.forEach(o => { o.e.rotation.x = -o.side * (0.2 + perk * 1.15); });
      tail.rotation.z = 0.9 + Math.sin(time * (4 + 14 * Math.max(eat, drool))) * (0.15 + 0.4 * Math.max(eat, drool));
      // saliva
      const wet = tAct > (kind === 'ambos' ? 0.9 : 0.4) && tAct < 3.2;
      drool = toward(drool, wet ? goal : 0, dt, 5);
      mouth.getWorldPosition(mouthAt);
      const count = Math.round(10 * drool);
      drops.forEach((d, i) => { const k = (time * 1.3 + i * 0.37) % 1; d.visible = i < count; d.position.set(mouthAt.x + ((i % 3) - 1) * 0.05, mouthAt.y - k * (mouthAt.y - 0.05), ((i % 2) - 0.5) * 0.12); d.material.opacity = 1 - k * 0.6; });
      // the two paths inside the head (from the second step of the slide on)
      netShow = toward(netShow, step >= 1 ? 1 : 0, dt, 5); net.visible = netShow > 0.02; net.scale.setScalar(0.6 + 0.4 * netShow);
      shown = toward(shown, assoc, dt, 4); learned.scale.set(0.012 + 0.085 * shown, 1, 0.012 + 0.085 * shown);
      const kB = (tBell - 0.15) / 0.6, kC = (tFood - 0.3) / 0.6;
      pulses[0].visible = kB > 0 && kB < 1 && shown > 0.12; if (pulses[0].visible) { pulses[0].position.copy(nB).lerp(nS, kB); pulses[0].scale.setScalar(0.5 + shown); }
      pulses[1].visible = kC > 0 && kC < 1; if (pulses[1].visible) pulses[1].position.copy(nC).lerp(nS, kC);
      cellS.color.setHex(COR.creme).lerp(tmp.setHex(0xBFE3FF), drool);
      box.style.setProperty('--saliva', drool.toFixed(3)); box.style.setProperty('--assoc', shown.toFixed(3));
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(1.3, 1.95, 0), from: V(1.3, 2.3, 11.2) }], 2.3);
    const bellTag = stage.label('', spot(world, -2.0, 3.25), () => true);
    const pairsOut = box.querySelector('.n-pares');
    function tags() {
      const cond = assoc >= 0.5;
      bellTag.innerHTML = cond ? '<b>campainha</b>estímulo condicionado' : '<b>campainha</b>estímulo neutro'; bellTag.classList.toggle('conceito', cond);
      if (pairsOut) pairsOut.textContent = pairs;
    }
    stage.label('<b>comida</b>estímulo incondicionado', spot(world, 2.45, 0.75), () => tFood >= 0 && tFood < 3);
    const wetTag = stage.label('', spot(world, 0.9, 2.75), () => { wetTag.innerHTML = kind === 'campainha' ? '<b>saliva</b>resposta condicionada' : '<b>saliva</b>resposta incondicionada'; wetTag.classList.toggle('conceito', kind === 'campainha'); return drool > 0.12; });
    stage.label('ouve a campainha', spot(net, nB.x, nB.y + 0.3), s => s >= 1, 'peq');
    stage.label('sente a comida', spot(net, nC.x, nC.y - 0.3), s => s >= 1, 'peq baixo');
    stage.label('<b>salivar</b>', spot(net, nS.x + 0.2, nS.y + 0.35), s => s >= 1);
    stage.label('ligação aprendida', spot(net, 4.85, 3.3), s => s >= 1 && shown > 0.3, 'peq');
    stage.on('campainha', () => act('campainha')); stage.on('comida', () => act('comida')); stage.on('ambos', () => act('ambos'));
    stage.on('repor', () => { assoc = 0; pairs = 0; solo = 0; goal = 0; tags(); say('Experimenta: começa só com a campainha.'); });
    tags();
  };

  /* ---------- 19. medo: the little Albert, seen in the brain (degrau 2) ---------- */
  SCENES.medo = box => {
    if (!D) return box.classList.add('sem-3d');
    const head = buildHead(); head.osso.forEach(m => (m.visible = false)); head.hipocampo.forEach(m => (m.visible = false));
    head.mats.cortex.opacity = 0.2; head.mats.cortex.depthWrite = false;
    const eyeMat = mat(0xF6F3EC); for (const n of ['olho_e', 'olho_d']) head.group.add(new T.Mesh(geometry(n), eyeMat));
    const eye = centre('olho_d'), thal = centre('talamo_d'), amy = centre('amigdala_d');
    const ear = [86, -8, -6], stem = [6, -36, -36], vis = [14, -92, 6], aud = [58, -22, 8], pf = [8, 48, -6];
    // the rat is seen (eye → thalamus → visual cortex); the noise is heard (ear → brainstem → thalamus → auditory cortex and amygdala)
    const SEE = [[eye, thal, 0.25, 0.45], [thal, vis, 0.7, 0.45]], HEAR = [[ear, stem, 0, 0.4], [stem, thal, 0.4, 0.3], [thal, aud, 0.7, 0.35], [thal, amy, 0.7, 0.3]];
    const LEARNED = [thal, amy, 0.7, 0.3], BRAKE = [pf, amy, 0.35, 0.6, 0x8FC4E8, 1.6];
    const play = makeSignals(head, 8), bond = link(head.group, thal, amy, COR.laranja);
    const glows = [{ c: vis, r: 30, a: 0, cor: rgb(0xFFD34E) }, { c: [-14, -92, 6], r: 30, a: 0, cor: rgb(0xFFD34E) }, { c: aud, r: 26, a: 0, cor: rgb(0xFFD34E) }];
    const calmCol = new T.Color(COR.amigdala), hot = new T.Color(0xFFF1A8), blue = rgb(0x6FA8D2), T0 = 3.6;
    let w = 0, alarm = 0, banged = '';
    const stage = makeStage(box, (step, dt, time, since) => {
      cam(step, dt, time);
      const t = since % T0, sees = step !== 1, hears = step === 1 || step === 2;
      play([].concat(sees ? SEE : [], hears ? HEAR : [], step >= 2 && sees ? [LEARNED] : [], step >= 4 ? [BRAKE] : []), t);
      w = toward(w, step < 2 ? 0 : step === 2 ? 0.15 + 0.85 * clamp(since / 7) : 1, dt, 3);       // the rat → alarm connection grows with every pairing
      bond.visible = w > 0.03; bond.scale.set(0.6 + 3 * w, 1, 0.6 + 3 * w);
      const power = step === 0 ? 0 : step === 4 ? 0.22 : 1, hit = t > 1.0 ? Math.exp(-(t - 1.0) * 1.2) : 0;
      alarm = toward(alarm, hit * power, dt, 12);
      head.mats.amigdala.color.copy(calmCol).lerp(hot, alarm); head.amigdala.forEach(m => m.scale.setScalar(1 + alarm * 0.3));
      glows[0].a = glows[1].a = sees && t > 1.15 ? Math.exp(-(t - 1.15) * 1.2) : 0;
      glows[2].a = hears && t > 1.05 ? Math.exp(-(t - 1.05) * 1.2) : 0;
      paint(head, step >= 4 ? front => (front ? blue : null) : null, glows);
      const key = step + ':' + Math.floor(since / T0);                                           // the bang, twice per step at most
      if (hears && since < T0 * 2 && key !== banged) { banged = key; som.estrondo(); }
    });
    if (!stage) return;
    stage.scene.add(head.group);
    const cam = director(stage.camera, shotsMm([[[8, -14, -12], [262, 164, 84]], [[8, -14, -12], [262, 164, 84]], [[8, -14, -12], [262, 164, 84]], [[8, -14, -12], [262, 164, 84]], [[8, 2, -8], [205, 245, 84]]]));
    const inFront = head.anchor([eye[0] + 12, eye[1] + 34, eye[2] + 6]);
    stage.label('<b>rato</b>estímulo neutro', inFront, s => s === 0);
    stage.label('<b>rato</b>', inFront, s => s === 2);
    stage.label('<b>rato</b>estímulo condicionado', inFront, s => s >= 3, 'conceito');
    stage.label('<b>ruído forte</b>estímulo incondicionado', head.anchor([104, -8, 6]), s => s === 1 || s === 2);
    const real = (name, hint) => head.anchor(onMesh(name, hint)), amyReal = real('amigdala_d');
    stage.label('<b>tálamo</b>', head.anchor([thal[0], thal[1], thal[2] + 26]), () => true, '', real('talamo_d'));
    stage.label('córtex visual', head.anchor([20, -100, 30]), s => s !== 1, 'peq', real('rh', vis));
    stage.label('córtex auditivo', head.anchor([78, -34, 36]), s => s === 1, 'peq', real('rh', aud));
    const amyAt = head.anchor([amy[0] + 4, amy[1] + 4, amy[2] - 20]);
    stage.label('<b>amígdala</b>calma', amyAt, s => s === 0, 'baixo', amyReal);
    stage.label('<b>amígdala</b>alarme: medo', amyAt, s => s >= 1 && s <= 3, 'baixo conceito', amyReal);
    stage.label('<b>amígdala</b>alarme mais fraco', amyAt, s => s >= 4, 'baixo', amyReal);
    stage.label('<b>córtex pré-frontal</b>trava o alarme', head.anchor([14, 70, 26]), s => s >= 4, 'conceito azul', real('rh', [16, 60, -4]));
  };

  /* ---------- 20. skinner: the box, the lever and four consequences (degrau 3) ---------- */
  SCENES.skinner = box => {
    const slide = box.closest('.slide'), say = sayIn(slide), bars = slide.querySelector('.sustos'), runBtn = slide.querySelector('[data-act="correr"]');
    const world = new T.Group(), steel = mat(0x9AA4AD, { roughness: 0.45, metalness: 0.3 }), wall = mat(0xC9D1D8, { roughness: 0.6 }), dark = mat(0x1E2A33);
    const glass = mat(0xBFE3FF, { opacity: 0.1, depthWrite: false }), grid = mat(0x6F7880, { roughness: 0.4, metalness: 0.4, emissive: 0x000000 });
    world.add(box3(6.6, 0.12, 3.8, dark, 0, -0.1, 0), box3(0.16, 3.1, 3.8, wall, -3.3, 1.5, 0), box3(6.6, 3.1, 0.1, wall, 0, 1.5, -1.9), box3(0.06, 3.1, 3.8, glass, 3.3, 1.5, 0), box3(6.6, 3.1, 0.06, glass, 0, 1.5, 1.9));
    for (let i = 0; i < 17; i++) { const b = cyl(0.035, 0.035, 3.7, grid, -3.1 + i * 0.39, 0, 0); b.rotation.x = Math.PI / 2; world.add(b); }
    const lever = new T.Group(); lever.position.set(-3.2, 1.0, 0.75); lever.add(box3(0.75, 0.1, 0.4, mat(COR.prefrontal), 0.38, 0, 0)); world.add(lever);
    const lamp = ball(0.13, new T.MeshBasicMaterial({ color: 0x55606A }), -3.18, 1.95, 0.75); world.add(lamp);
    world.add(box3(0.75, 0.3, 0.9, steel, -2.85, 0.15, -0.75), box3(0.6, 0.02, 0.75, dark, -2.85, 0.31, -0.75));
    const chute = cyl(0.13, 0.13, 1.3, steel, -3.05, 1.2, -0.75); chute.rotation.z = -0.25; world.add(chute);
    const pelletMat = mat(0x8A4B2A), pellet = ball(0.09, pelletMat), stock = [[-0.12, 0.1], [0.1, -0.08], [0, 0.22]].map(([x, z]) => { const s = ball(0.09, pelletMat, -2.85 + x, 0.4, -0.75 + z); world.add(s); return s; });
    world.add(pellet);
    const speaker = cyl(0.3, 0.3, 0.08, dark, 1.9, 2.3, -1.82); speaker.rotation.x = Math.PI / 2; world.add(speaker);
    const waves = [0, 1].map(() => { const r = ringMesh(0.3, 0xFF7A30); r.position.set(1.9, 2.3, -1.75); world.add(r); return r; });
    const rat = makeRat(), legs = walker(rat, 3.2); world.add(rat); legs.put(1.4, 0.3);
    const LEVER = [-1.95, 0.75], TRAY = [-1.95, -0.75];
    const MODES = {
      rp: { nome: 'reforço positivo', texto: 'acrescenta comida · carrega mais', frase: 'Cada vez que carrega, cai comida no comedouro: acrescenta-se algo agradável.' },
      rn: { nome: 'reforço negativo', texto: 'retira o som alto · carrega mais', frase: 'O som alto só para quando carrega na alavanca: retira-se algo desagradável.' },
      pp: { nome: 'punição positiva', texto: 'acrescenta um choque · carrega menos', frase: 'Cada vez que carrega, apanha um choque: acrescenta-se algo desagradável.' },
      pn: { nome: 'punição negativa', texto: 'retira a comida · carrega menos', frase: 'Cada vez que carrega, a comida do comedouro é retirada: retira-se algo agradável.' },
    };
    let mode = 'rp', p = 0.12, presses = 0, auto = false, st = 'idle', tSt = 0, decide = 0, done = false, quiet = 0, flash = 0, taken = 9, fed = false, buzz = 0, tag = null;
    const go = name => { st = name; tSt = 0; done = false; };
    const report = extra => say(`${extra ? extra + ' ' : ''}Carregou <b>${presses}</b> ${presses === 1 ? 'vez' : 'vezes'} · probabilidade de carregar: <b>${Math.round(p * 100)} %</b>`);
    function setMode(m) {
      mode = m; fed = false; slide.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
      if (tag) tag.innerHTML = `<b>${MODES[m].nome}</b>${MODES[m].texto}`;
      report((m === 'pp' || m === 'pn') && p < 0.3 ? 'O rato quase não carrega: há pouco para diminuir. Experimenta primeiro um reforço.' : MODES[m].frase);
    }
    function consequence() {
      presses++; tone(320, 0, 0.05, 'square', 0.06);
      if (mode === 'rp') { p += (0.92 - p) * 0.18; fed = true; }
      else if (mode === 'rn') { p += (0.92 - p) * 0.18; quiet = 2.8; }
      else if (mode === 'pp') { p = Math.max(0.02, p * 0.7); flash = 1; som.choque(); }
      else { p = Math.max(0.02, p * 0.72); taken = 0; som.tirar(); }
      if (bars) { const b = document.createElement('span'); b.className = mode === 'rp' || mode === 'rn' ? 'sirene' : 'apito'; b.style.setProperty('--h', Math.round(p * 100) + '%'); bars.append(b); if (bars.children.length > 16) bars.firstChild.remove(); }
      report();
    }
    const stage = makeStage(box, (step, dt, time) => {
      cam(0, dt, time); tSt += dt; quiet -= dt; taken += dt; flash = Math.max(0, flash - dt * 2.2);
      /* --- what the rat is doing --- */
      if (st === 'idle') {
        decide -= dt;
        if (auto && decide <= 0) { decide = 1.0; if (Math.random() < p) go('toLever'); else legs.to(-0.6 + Math.random() * 3.2 - p * 0.8, -1.1 + Math.random() * 2.2); }
      } else if (st === 'toLever') { legs.to(LEVER[0], LEVER[1]); if (!legs.moving && tSt > 0.2) go('press'); }
      else if (st === 'press') {
        if (tSt > 0.45 && !done) { done = true; consequence(); }
        if (mode === 'rp' && tSt > 1.15) go('toTray');
        else if (mode === 'pp' && tSt > 0.75) { legs.to(2.5, -0.4 + Math.random()); go('flee'); }
        else if (tSt > 1.5) { go('idle'); decide = 0.6; }
      } else if (st === 'toTray') { legs.to(TRAY[0], TRAY[1]); if (!legs.moving && tSt > 0.2) { go('eat'); som.comida(); } }
      else if (st === 'eat') { if (tSt > 1.0) { fed = false; go('idle'); decide = 0.5; } }
      else if (st === 'flee') { if (tSt > 1.1) { go('idle'); decide = 0.7; } }
      legs.step(dt);
      const rear = st === 'press' ? ease(tSt / 0.3) * (1 - ease((tSt - 1.0) / 0.4)) : 0, hop = st === 'press' && mode === 'pp' && done ? Math.sin(clamp((tSt - 0.45) / 0.3) * Math.PI) : 0;
      rat.rotation.z = toward(rat.rotation.z, rear * 0.55 + (st === 'eat' ? -0.2 + Math.sin(time * 16) * 0.05 : 0), dt, 12);
      rat.position.y = hop * 0.55 + (legs.moving ? Math.abs(Math.sin(time * 18)) * 0.04 : 0);
      /* --- the box reacts --- */
      const down = st === 'press' && tSt > 0.3 && tSt < 1.0 ? 1 : 0;
      lever.rotation.z = toward(lever.rotation.z, -0.5 * down, dt, 18); lamp.material.color.setHex(down ? 0xFFD34E : 0x55606A);
      const fall = st === 'press' ? clamp((tSt - 0.5) / 0.4) : 1;             // the pellet drops into the tray and waits to be eaten
      pellet.visible = fed && !(st === 'eat' && tSt > 0.6); pellet.position.set(-2.9 + 0.05 * fall, lerp(1.0, 0.4, fall * fall), -0.75);
      const has = mode === 'pn' && taken > 2.4;                                 // free food in the tray, taken away after a press
      stock.forEach((s, i) => { const k = mode === 'pn' && taken < 0.8 ? taken / 0.8 : 0; s.visible = has || k > 0 && k < 1; s.position.y = 0.4 + k * 1.2 + (i === 2 ? 0.02 : 0); });
      const noise = mode === 'rn' && quiet <= 0;
      waves.forEach((r, i) => { const k = (time * 1.4 + i * 0.5) % 1; r.material.opacity = noise ? (1 - k) * 0.9 : 0; r.scale.setScalar(1 + k * 3); });
      if (noise) { buzz -= dt; if (buzz <= 0) { buzz = 0.8; som.zumbido(); } }
      grid.emissive.setHex(0xFFD34E).multiplyScalar(flash);
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(0.7, 1.25, 0), from: V(1.9, 3.6, 13.2) }], 1.9);
    tag = stage.label('', spot(world, -1.6, 2.5, 0.75), () => true, 'conceito');
    stage.label('alavanca', spot(world, -2.6, 1.15, 0.75), () => true, 'peq');
    stage.label('comedouro', spot(world, -2.6, 0.1, -0.2), () => true, 'peq baixo');
    stage.label('som alto', spot(world, 1.9, 2.75, -1.8), () => mode === 'rn', 'peq');
    slide.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    stage.on('correr', () => { auto = !auto; if (runBtn) runBtn.textContent = auto ? 'Pausar' : 'Continuar'; decide = 0; });
    stage.on('uma', () => { if (st === 'idle') go('toLever'); });
    stage.on('repor', () => { p = 0.12; presses = 0; auto = false; if (runBtn) runBtn.textContent = 'Iniciar'; if (bars) bars.innerHTML = ''; go('idle'); legs.to(1.4, 0.3); setMode('rp'); });
    setMode('rp');
  };

  /* ---------- 21. dopamina: what Skinner could not see (degrau 3) ---------- */
  SCENES.dopamina = box => {
    const traco = box.querySelector('canvas.traco');
    const CUE = 1.2, REW = 3.0, T0 = 5;
    // per step of the slide: bursts (times), pause after the expected juice, and which signs are drawn
    const PLAN = [{}, { bursts: [REW], sumo: 1 }, { bursts: [CUE], luz: 1, sumo: 1 }, { bursts: [CUE], luz: 1, falta: 1 }, { bursts: [CUE], luz: 1, sumo: 1 }];
    /** Spike times of one dopamine neuron for a plan: slow steady firing, a burst after an event, silence when the juice fails. */
    function spikes(plan) {
      const list = []; let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let t = 0.12; t < T0; t += 0.24 + rnd() * 0.16) if (!(plan.falta && t > REW + 0.05 && t < REW + 0.8)) list.push([t, 0]);
      for (const b of plan.bursts || []) for (let i = 0; i < 9; i++) list.push([b + 0.08 + i * 0.032, 1]);
      return list;
    }
    const TRAINS = PLAN.map(spikes);
    function draw(step, t) {
      if (!traco) return;
      const g = traco.getContext('2d'), plan = PLAN[Math.min(step, PLAN.length - 1)], X = s => 40 + s / T0 * 640;
      traco.style.opacity = step >= 1 ? 1 : 0; g.clearRect(0, 0, 720, 300);
      g.font = 'bold 30px Carlito, Calibri, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4;
      const sign = (x, color, text, hollow) => { g.beginPath(); g.arc(x, 78, 20, 0, 7); g.setLineDash(hollow ? [7, 7] : []); g.strokeStyle = g.fillStyle = color; hollow ? g.stroke() : g.fill(); g.setLineDash([]); g.fillText(text, x, 38); };
      if (plan.luz) sign(X(CUE), '#FFD34E', 'luz');
      if (plan.sumo) sign(X(REW), '#8FC4E8', 'sumo');
      if (plan.falta) sign(X(REW), '#8FC4E8', 'sem sumo', true);
      for (const [s, strong] of TRAINS[Math.min(step, PLAN.length - 1)]) if (s < t) { g.strokeStyle = strong ? '#FFE28A' : '#F0A673'; g.beginPath(); g.moveTo(X(s), 130); g.lineTo(X(s), 222); g.stroke(); }
      g.strokeStyle = 'rgba(246,243,236,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 232); g.lineTo(680, 232); g.stroke();
      g.font = '24px Carlito, Calibri, sans-serif'; g.fillStyle = '#F1CDB0'; g.fillText('disparos de um neurónio da dopamina · tempo →', 360, 270);
    }
    if (!D) { draw(0, 0); return box.classList.add('sem-3d'); }
    const head = buildHead(); head.osso.forEach(m => (m.visible = false));
    head.mats.cortex.opacity = 0.14; head.mats.cortex.depthWrite = false;
    for (const k of ['talamo', 'hipocampo', 'amigdala', 'cerebelo']) head[k].forEach(m => (m.visible = false));
    const striMat = mat(0x7FB0D0); for (const n of ['caudado_e', 'caudado_d', 'putamen_e', 'putamen_d']) head.group.add(new T.Mesh(geometry(n), striMat));
    const vta = [0, -16, -14], accE = [-12, 10, -8], accD = [12, 10, -8], pf = [-22, 54, 10];
    const source = new T.Mesh(new T.SphereGeometry(5.5, 16, 12), new T.MeshBasicMaterial({ color: COR.sinal, transparent: true, depthTest: false })); source.position.set(vta[0], vta[1], vta[2]); source.renderOrder = 8; head.group.add(source);
    const play = makeSignals(head, 9), cool = new T.Color(0x7FB0D0), hot = new T.Color(0xFFF1A8);
    let ticked = '';
    const stage = makeStage(box, (step, dt, time, since) => {
      cam(0, dt, time); head.group.rotation.z = Math.sin(time / 5) * 0.25;
      const t = since % T0, plan = PLAN[Math.min(step, PLAN.length - 1)], legs = []; let glow = 0;
      for (const b of plan.bursts || []) {
        for (const d of [0.1, 0.3, 0.5]) legs.push([vta, accE, b + d, 0.5], [vta, accD, b + d, 0.5], [vta, pf, b + d, 0.8]);
        if (t > b + 0.6) glow = Math.max(glow, Math.exp(-(t - b - 0.6) * 1.4));
        const key = step + ':' + Math.floor(since / T0) + ':' + b; if (t > b && t < b + 0.3 && key !== ticked && since < T0 * 3) { ticked = key; som.passo(); }
      }
      play(legs, t);
      striMat.color.copy(cool).lerp(hot, glow);
      const silent = plan.falta && t > REW && t < REW + 0.8;                    // the pause: the neuron goes quiet
      source.material.opacity = silent ? 0.15 : 0.75 + 0.25 * Math.sin(time * 9); source.scale.setScalar(silent ? 0.7 : 1 + glow * 0.3);
      draw(step, t);
    });
    if (!stage) return;
    stage.scene.add(head.group);
    const cam = director(stage.camera, shotsMm([[[0, 12, 26], [-330, 95, 95]]]));      // almost from the side: prefrontal cortex, striatum and midbrain do not hide one another
    stage.label('<b>área tegmental ventral</b>neurónios da dopamina', head.anchor([0, -22, -32]), () => true, 'baixo', head.anchor(vta));
    stage.label('<b>estriado</b>recebe a dopamina', head.anchor([-36, 4, 44]), () => true, '', head.anchor(onMesh('putamen_e', [-30, 6, 6])));
    stage.label('<b>córtex pré-frontal</b>', head.anchor([-24, 66, 44]), () => true, '', head.anchor(onMesh('lh', pf)));
  };

  /* ---------- 22. kohler: the chimpanzee, the stick and the banana (degrau 4) ---------- */
  SCENES.kohler = box => {
    const world = new T.Group(), fur = mat(0x3A2E28, { roughness: 0.9 }), skin = mat(0xC49A7A), dark = mat(0x1E2A33), iron = mat(0x8A929A, { roughness: 0.4, metalness: 0.4 });
    world.add(ground(10, 0x46525D, -0.02), box3(5.7, 0.1, 4, mat(0x6A5A4A, { roughness: 1 }), -1.35, 0.03, 0));
    for (let i = 0; i < 9; i++) world.add(cyl(0.05, 0.05, 3.2, iron, 1.5, 1.6, -1.9 + i * 0.475));                 // the bars between the chimpanzee and the banana
    world.add(box3(0.12, 0.12, 4, iron, 1.5, 3.2, 0), box3(0.12, 0.12, 4, iron, 1.5, 0.1, 0));
    const faint = mat(0x8A929A, { opacity: 0.35, depthWrite: false }); for (let i = 0; i < 12; i++) world.add(cyl(0.035, 0.035, 3.2, faint, -4.1 + i * 0.5, 1.6, -1.95));
    /* --- the chimpanzee, facing +x --- */
    const ape = new T.Group(); world.add(ape);
    ape.add(blob(fur, [0.55, 0.72, 0.5], [0, 1.0, 0]), cyl(0.15, 0.14, 0.6, fur, 0.1, 0.3, 0.26), cyl(0.15, 0.14, 0.6, fur, 0.1, 0.3, -0.26));
    const apeHead = new T.Group(); apeHead.position.set(0.15, 1.98, 0); ape.add(apeHead);
    apeHead.add(blob(fur, [0.38, 0.38, 0.36], [0, 0, 0]), blob(skin, [0.2, 0.25, 0.27], [0.24, -0.05, 0]), blob(skin, [0.06, 0.12, 0.1], [0, 0.02, 0.38]), blob(skin, [0.06, 0.12, 0.1], [0, 0.02, -0.38]));
    for (const z of [0.12, -0.12]) apeHead.add(blob(dark, [0.04, 0.04, 0.04], [0.4, 0.06, z]));
    const arm = z => { const a = new T.Group(); a.position.set(0.1, 1.5, z); a.add(cyl(0.1, 0.09, 1.1, fur, 0, -0.55, 0), ball(0.12, skin, 0, -1.12, 0)); ape.add(a); return a; };
    const armR = arm(0.52), armL = arm(-0.52);
    const stick = cyl(0.04, 0.04, 1.9, mat(0xC9A26B)), bananaMat = mat(0xF2C14E, { roughness: 0.5 });
    const banana = tube([V(-0.3, 0.0, 0), V(-0.12, -0.1, 0), V(0.12, -0.1, 0), V(0.3, 0.0, 0)], 0.075, bananaMat, 12); world.add(banana, stick);
    const bulb = ball(0.2, new T.MeshBasicMaterial({ color: 0xFFE28A, transparent: true, opacity: 0 })); world.add(bulb);
    const body = walker(ape, 2.6); body.put(0.75, 0);
    let held = null, bx = 3.3, by = 0.12, bz = 0.2, reach = 0.15, rake = 0;
    const stage = makeStage(box, (step, dt, time, since) => {
      cam(step, dt, time);
      /* where the chimpanzee goes in each step */
      if (step === 0) body.to(0.75, 0); else if (step === 1) body.to(0.1, 0); else if (step === 2) body.to(since < 0.9 ? 0.1 : -2.45, 0.35); else body.to(0.75, 0);
      body.step(dt);
      // raking: once the stick touches the banana, the chimpanzee steps back and drags it in (without turning round)
      rake = toward(rake, step >= 4 ? 1 : step === 3 && !body.moving && since > 2 ? ease((since - 2) / 1.4) : 0, dt, 10);
      ape.position.x = body.x - 1.2 * rake;
      if (!body.moving) ape.rotation.y = toward(ape.rotation.y, step === 1 ? Math.sin(time * 0.8) * 1.3 : step === 2 ? Math.PI : 0, dt, 5);
      const hold = step === 3 || (step === 2 && body.x < -2.3);
      if (hold !== held) {
        held = hold; (hold ? armR : world).add(stick);
        if (hold) { stick.position.set(0, -1.95, 0); stick.rotation.set(0, 0, 0); }
        else { stick.rotation.set(0, 0, Math.PI / 2); stick.position.set(step >= 4 ? 2.3 : -3.3, 0.09, step >= 4 ? 0.9 : 0.6); }
      }
      // arm: stretching for the banana (step 0), resting (1), carrying the stick (2), raking (3), holding the banana (4)
      const goal = step === 0 ? 1.15 + Math.sin(time * 3.2) * 0.1 : step === 1 ? 0.12 : step === 2 ? (hold ? 0.75 : 0.25) : step === 3 ? 1.02 : 2.0;
      reach = toward(reach, goal, dt, 7); armR.rotation.z = reach; armL.rotation.z = step === 0 ? 0.5 : 0.12;
      ape.position.y = body.moving ? Math.abs(Math.sin(time * 9)) * 0.06 : 0;
      // the banana: out of reach, then raked in, then in the hand
      const got = step >= 4;
      bx = toward(bx, got ? ape.position.x + 0.1 + 1.2 * Math.sin(reach) : 3.3 - 1.2 * rake, dt, got ? 5 : 30);
      by = toward(by, got ? 1.6 - 1.2 * Math.cos(reach) : 0.12, dt, 5); bz = toward(bz, got ? 0.52 : 0.2, dt, 5);
      banana.position.set(bx, by, bz);
      const idea = step === 2 ? ease(since / 0.3) * (1 - ease((since - 2.2) / 0.8)) : 0;
      bulb.material.opacity = idea; bulb.position.set(ape.position.x + 0.15, 2.95 + Math.sin(time * 5) * 0.04, 0); bulb.scale.setScalar(0.8 + idea * 0.5);
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(0.6, 1.35, 0), from: V(1.2, 3.3, 12.5) }, { at: V(0.2, 1.35, 0), from: V(0.4, 3.3, 12.5) }, { at: V(-0.8, 1.35, 0), from: V(-0.6, 3.6, 12.5) }, { at: V(0.9, 1.3, 0), from: V(1.6, 3.2, 11.5) }, { at: V(0.6, 1.4, 0), from: V(1.2, 3.3, 12.5) }], 1.9);
    stage.label('<b>banana</b>fora do alcance', spot(world, 3.3, 0.55), s => s < 3);
    stage.label('<b>vara</b>ao fundo da jaula', spot(world, -3.3, 0.5, 0.6), s => s < 2 || (s === 2 && !held));
    stage.label('o braço não chega', spot(world, 2.1, 2.0), s => s === 0, 'peq');
    stage.label('para e olha em volta', spot(world, 0.2, 2.95), s => s === 1, 'peq');
    stage.label('<b>insight</b>compreensão súbita', bulb, s => s === 2, 'conceito');
    stage.label('<b>vara + banana</b>partes do mesmo problema', spot(world, 2.4, 1.5), s => s === 3, 'conceito');
  };

  /* ---------- 23. tolman: a maze to explore with and without cheese (degrau 4) ---------- */
  SCENES.tolman = box => {
    const slide = box.closest('.slide'), say = sayIn(slide), log = box.querySelector('.registo ol');
    const N = 6, DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0];                      // directions: 0 = away from us, 1 = right, 2 = towards us, 3 = left
    const START = [0, N - 1], EXIT = [N - 1, 0], id = (c, r) => c + r * N;
    /* --- the maze: always the same one (seeded), with a single path between any two cells and several blind alleys --- */
    const open = Array.from({ length: N * N }, () => [false, false, false, false]);
    (function carve() {
      let seed = 2; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const seen = new Set([id(START[0], START[1])]), stack = [START];
      while (stack.length) {
        const [c, r] = stack[stack.length - 1];
        const free = [0, 1, 2, 3].filter(d => { const c2 = c + DX[d], r2 = r + DZ[d]; return c2 >= 0 && r2 >= 0 && c2 < N && r2 < N && !seen.has(id(c2, r2)); });
        if (!free.length) { stack.pop(); continue; }
        const d = free[Math.floor(rnd() * free.length)], c2 = c + DX[d], r2 = r + DZ[d];
        open[id(c, r)][d] = true; open[id(c2, r2)][(d + 2) % 4] = true; seen.add(id(c2, r2)); stack.push([c2, r2]);
      }
    })();
    /** Number of steps of the shortest path from the start to the exit. */
    const shortest = (function () {
      const dist = new Array(N * N).fill(-1), queue = [START]; dist[id(START[0], START[1])] = 0;
      while (queue.length) { const [c, r] = queue.shift(); for (let d = 0; d < 4; d++) if (open[id(c, r)][d]) { const k = id(c + DX[d], r + DZ[d]); if (dist[k] < 0) { dist[k] = dist[id(c, r)] + 1; queue.push([c + DX[d], r + DZ[d]]); } } }
      return dist[id(EXIT[0], EXIT[1])];
    })();
    const px = c => c - (N - 1) / 2, pz = r => r - (N - 1) / 2;
    const world = new T.Group(), UNKNOWN = new T.Color(0x36444F), KNOWN = new T.Color(0xE9E0C9), TRAIL = new T.Color(0xF0A673);
    const tiles = [], walls = [], wallMat = mat(0xA44A16, { roughness: 0.7 });
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const m = mat(0x36444F, { roughness: 0.9 }); tiles[id(c, r)] = { m, shade: 0 }; world.add(box3(0.95, 0.08, 0.95, m, px(c), -0.04, pz(r)));
      // every closed side gets a wall; shared walls are made once (from the cell above or on the left)
      for (let d = 0; d < 4; d++) {
        const c2 = c + DX[d], r2 = r + DZ[d], inside = c2 >= 0 && r2 >= 0 && c2 < N && r2 < N;
        if (open[id(c, r)][d] || (inside && (d === 0 || d === 3))) continue;
        const w = box3(d % 2 ? 0.09 : 1.06, 0.45, d % 2 ? 1.06 : 0.09, wallMat, px(c) + DX[d] * 0.5, 0.2, pz(r) + DZ[d] * 0.5); w.visible = false; world.add(w);
        walls.push({ w, cells: inside ? [id(c, r), id(c2, r2)] : [id(c, r)] });
      }
    }
    const rat = makeRat(); rat.scale.setScalar(0.55); world.add(rat); const legs = walker(rat, 6);
    const cheese = new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 0.24, 3), mat(0xF2C14E, { roughness: 0.5 })); cheese.position.set(px(EXIT[0]), 0.14, pz(EXIT[1])); world.add(cheese);
    let known, trail, cell, phase, steps, blind, knownAtStart, runs = 0, bump = 0, bumpDir = 0;
    const nKnown = () => known.filter(Boolean).length;
    function reveal() { const k = id(cell[0], cell[1]); known[k] = true; if (phase === 'queijo') trail[k] = true; for (const w of walls) if (w.cells.includes(k)) w.w.visible = true; }
    function home() { cell = START.slice(); legs.put(px(cell[0]), pz(cell[1])); rat.rotation.y = Math.PI / 2; steps = 0; blind = 0; trail = new Array(N * N).fill(false); reveal(); }
    function forget() { known = new Array(N * N).fill(false); walls.forEach(w => (w.w.visible = false)); phase = 'explorar'; home(); say('Explora o labirinto à vontade: <b>ainda não há queijo</b>. Usa as setas do ecrã, ou Shift + setas no teclado.'); }
    function move(d) {
      if (legs.moving || !slide.classList.contains('current')) return;
      if (!open[id(cell[0], cell[1])][d]) { bump = 0.22; bumpDir = d; som.toque(); return; }
      cell = [cell[0] + DX[d], cell[1] + DZ[d]]; legs.to(px(cell[0]), pz(cell[1])); steps++; reveal(); som.passo();
      const atExit = cell[0] === EXIT[0] && cell[1] === EXIT[1];
      if (!atExit && open[id(cell[0], cell[1])].filter(Boolean).length === 1) blind++;
      if (phase === 'queijo' && atExit) {
        som.vitoria(); phase = 'explorar'; runs++;
        if (log) { const li = document.createElement('li'); li.innerHTML = `conhecia <b>${knownAtStart}</b> casas → <b>${steps}</b> passos`; log.append(li); if (log.children.length > 4) log.firstChild.remove(); }
        say(`Chegou ao queijo em <b>${steps} passos</b>, com ${blind} ${blind === 1 ? 'beco' : 'becos'} sem saída. À partida conhecia ${knownAtStart} de ${N * N} casas. O caminho mais curto tem ${shortest} passos.`);
      } else say(phase === 'queijo' ? `Com queijo à saída: <b>${steps}</b> passos · ${blind} ${blind === 1 ? 'beco' : 'becos'} sem saída.` : `A explorar, sem queijo: conhece <b>${nKnown()} de ${N * N}</b> casas.`);
    }
    const stage = makeStage(box, (step, dt, time) => {
      cam(0, dt, time); legs.step(dt); bump = Math.max(0, bump - dt);
      rat.position.x += DX[bumpDir] * Math.sin(bump / 0.22 * Math.PI) * 0.18; rat.position.z += DZ[bumpDir] * Math.sin(bump / 0.22 * Math.PI) * 0.18;
      rat.position.y = legs.moving ? Math.abs(Math.sin(time * 22)) * 0.05 : 0;
      tiles.forEach((t, k) => { const goal = trail[k] ? 2 : known[k] ? 1 : 0; t.shade = toward(t.shade, goal, dt, 6); t.m.color.copy(UNKNOWN).lerp(KNOWN, clamp(t.shade)).lerp(TRAIL, clamp(t.shade - 1)); });
      cheese.visible = phase === 'queijo'; cheese.rotation.y = time * 0.8;
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(0, 0, 0.15), from: V(0, 11.6, 6.4) }]);
    stage.label('partida', spot(world, px(START[0]) - 0.75, 0.2, pz(START[1])), () => true, 'peq');
    stage.label('<b>saída</b>', spot(world, px(EXIT[0]) + 0.9, 0.3, pz(EXIT[1])), () => true);
    stage.label('<b>mapa cognitivo</b>o que já conhece do labirinto', spot(world, 0, 0.3, -3.3), s => s >= 1 && nKnown() > 6, 'conceito');
    ['cima', 'dir', 'baixo', 'esq'].forEach((name, d) => stage.on(name, () => move(d)));
    // Keyboard: Shift + arrow keys. Plain arrows change slide (app.js) and the letters D, Q, G, P and J open the
    // shared class tools (comum/aula.js), so this listener runs first (capture) and keeps the key to itself.
    window.addEventListener('keydown', e => {
      if (!slide.classList.contains('current') || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      const d = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key];
      if (d !== undefined) { e.preventDefault(); e.stopImmediatePropagation(); move(d); }
    }, true);
    stage.on('queijo', () => { phase = 'queijo'; knownAtStart = nKnown(); home(); say(`<b>Há queijo à saída!</b> Leva o rato até lá. À partida conhece ${knownAtStart} de ${N * N} casas.`); });
    stage.on('repor', forget);
    forget();
  };

  /* ---------- 24. regiao: one idea shown on the real brain (place cells; doing and watching) ---------- */
  SCENES.regiao = box => {
    if (!D) return box.classList.add('sem-3d');
    const head = buildHead(); head.osso.forEach(m => (m.visible = false));
    const place = box.dataset.regiao === 'hipocampo', arena = box.querySelector('canvas.arena');
    if (place) {
      /* --- place cells: each lights up when the rat is in «its» corner of the arena (O'Keefe and Dostrovsky, 1971) --- */
      head.mats.cortex.opacity = 0.12; head.mats.cortex.depthWrite = false;
      for (const k of ['talamo', 'amigdala', 'cerebelo']) head[k].forEach(m => (m.visible = false));
      const FIELDS = [{ x: 0.25, y: 0.27, cor: 0xF0A673 }, { x: 0.74, y: 0.3, cor: 0xFFD34E }, { x: 0.7, y: 0.75, cor: 0x8FC4E8 }, { x: 0.27, y: 0.72, cor: 0xE58FB5 }];
      // four real points of the surface of the right hippocampus (the one nearer to the camera), from front to back
      const cells = [];
      for (const name of ['hipocampo_d']) {
        const pos = geometry(name).getAttribute('position'), order = Array.from({ length: pos.count }, (_, i) => i).sort((a, b) => pos.getY(b) - pos.getY(a));
        FIELDS.forEach((f, i) => { const v = order[Math.floor((0.12 + i * 0.25) * pos.count)]; const s = makeSparks(head.group, 1, 4.6, f.cor)[0]; s.position.set(pos.getX(v), pos.getY(v), pos.getZ(v) + 2); s.visible = true; cells.push({ s, i }); });
      }
      const stage = makeStage(box, (step, dt, time) => {
        cam(step, dt, time);
        const rx = 0.5 + 0.36 * Math.sin(time * 0.55), ry = 0.5 + 0.36 * Math.sin(time * 0.83 + 1);       // the rat wanders around the arena
        const fire = FIELDS.map(f => step >= 1 ? Math.exp(-((rx - f.x) ** 2 + (ry - f.y) ** 2) / 0.022) : 0);
        cells.forEach(c => { c.s.material.opacity = step >= 1 ? 0.12 + 0.88 * fire[c.i] : 0; c.s.scale.setScalar(0.7 + fire[c.i] * 1.1); });
        if (arena) {
          const g = arena.getContext('2d'), S2 = arena.width; arena.style.opacity = step >= 1 ? 1 : 0; g.clearRect(0, 0, S2, S2);
          g.strokeStyle = 'rgba(246,243,236,.8)'; g.lineWidth = 6; g.strokeRect(14, 14, S2 - 28, S2 - 28);
          FIELDS.forEach((f, i) => { g.globalAlpha = 0.25 + 0.75 * fire[i]; g.fillStyle = '#' + f.cor.toString(16).padStart(6, '0'); g.beginPath(); g.arc(14 + f.x * (S2 - 28), 14 + f.y * (S2 - 28), S2 * 0.15, 0, 7); g.fill(); });
          g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(14 + rx * (S2 - 28), 14 + ry * (S2 - 28), 13, 0, 7); g.fill();
          g.font = 'bold 26px Carlito, Calibri, sans-serif'; g.textAlign = 'center'; g.fillText('rato', 14 + rx * (S2 - 28), 14 + ry * (S2 - 28) - 20);
        }
      });
      if (!stage) return;
      stage.scene.add(head.group);
      const c = centre('hipocampo_d'), cam = director(stage.camera, shotsMm([[[0, -20, 12], [330, 150, 80]], [[6, -22, 2], [300, 95, 55]]]));
      const above = head.anchor([c[0] + 6, c[1] - 6, c[2] + 30]), onIt = head.anchor(onMesh('hipocampo_d'));
      stage.label('<b>hipocampo</b>guardar memórias novas', above, s => s === 0, '', onIt);
      stage.label('<b>células de lugar</b>cada uma dispara num sítio', above, s => s >= 1, 'conceito', onIt);
    } else {
      /* --- doing and watching: the same areas answer (premotor and inferior parietal cortex) --- */
      const spots = [[-50, 8, 30], [50, 8, 30], [-54, -36, 42], [54, -36, 42]].map(c => ({ c, r: 24, a: 0, cor: rgb(0xFF8A30) }));
      const eyes = [[-16, -94, 6], [16, -94, 6]].map(c => ({ c, r: 28, a: 0, cor: rgb(0xFFD34E) }));
      const stage = makeStage(box, (step, dt, time) => {
        cam(step, dt, time);
        const beat = 0.55 + 0.4 * Math.sin(time * 3.2);
        spots.forEach(s => { s.a = toward(s.a, beat, dt, 8); }); eyes.forEach(s => { s.a = toward(s.a, step === 1 ? beat : 0, dt, 5); });
        paint(head, null, spots.concat(eyes));
      });
      if (!stage) return;
      stage.scene.add(head.group);
      const cam = director(stage.camera, shotsMm([[[0, -16, 16], [-400, 110, 150]], [[0, -26, 16], [-390, -40, 170]], [[0, -16, 16], [-400, 110, 150]]]));
      const real = hint => head.anchor(onMesh('lh', hint));
      stage.label('<b>córtex pré-motor</b>prepara o gesto', head.anchor([-62, 40, -4]), () => true, 'baixo', real([-50, 8, 30]));
      stage.label('<b>córtex parietal inferior</b>', head.anchor([-62, -14, 88]), () => true, '', real([-54, -36, 42]));
      stage.label('córtex visual', head.anchor([-22, -112, 34]), s => s === 1, 'peq', real([-16, -94, 6]));
    }
  };

  /* ---------- 25. bobo: Bandura's doll, in 1961 and in 1965 (degrau 5) ---------- */
  SCENES.bobo = box => {
    const late = box.dataset.modo === '1965';
    // per step: is the adult model there? how often does the child hit (hits per second; 0 = only watches)? is the child next to the doll?
    const PLAN = late
      ? [{ adult: 1 }, { hit: 0.85, near: 1 }, { adult: 1 }, { near: 1 }, { hit: 0.7, near: 1 }]
      : [{ adult: 1 }, { hit: 0.7, near: 1 }, { hit: 0.7, near: 1 }];
    const world = new T.Group(); world.add(ground(10, 0x46525D, 0), box3(7.5, 0.06, 4.4, mat(0xC9B79A, { roughness: 1 }), -0.9, 0.03, 0));
    /* --- the doll: a weighted base makes it get up again --- */
    const doll = new T.Group(); world.add(doll);
    const white = mat(0xF6F3EC, { roughness: 0.4 }), red = mat(0xC8452C, { roughness: 0.4 }), dark = mat(0x1E2A33);
    doll.add(blob(dark, [0.5, 0.22, 0.5], [0, 0.2, 0]), blob(white, [0.62, 0.95, 0.62], [0, 1.1, 0]), blob(white, [0.42, 0.42, 0.42], [0, 2.15, 0]), blob(red, [0.11, 0.11, 0.11], [-0.4, 2.12, 0]));
    const belt = new T.Mesh(new T.TorusGeometry(0.6, 0.06, 8, 30), red); belt.rotation.x = Math.PI / 2; belt.position.y = 1.25; doll.add(belt);
    for (const z of [0.16, -0.16]) doll.add(blob(dark, [0.045, 0.06, 0.045], [-0.36, 2.28, z]));
    const adult = makePerson(1, 0x2F6E9E), child = makePerson(0.58, 0xB8501C); world.add(adult.group, child.group);
    adult.group.position.set(-1.55, 0, 0); makeMallet(adult.armR); const childMallet = makeMallet(child.armR);
    const kid = walker(child.group, 2.4); kid.put(-4.6, 1.3);
    let wobble = 9, lastHit = -1, fadeA = 1, swingA = 0, swingK = 0;
    /** Arm angle of a hit that lands at phase 0.5 of each cycle (raised → down → raised). */
    const swing = ph => 2.75 - 1.55 * Math.pow(Math.sin(clamp(ph) * Math.PI), 3);
    const stage = makeStage(box, (step, dt, time, since) => {
      const plan = PLAN[Math.min(step, PLAN.length - 1)]; wobble += dt;
      cam(plan.adult ? 0 : 1, dt, time);
      fadeA = toward(fadeA, plan.adult ? 1 : 0, dt, 4); adult.mats.forEach(m => { m.opacity = fadeA; }); adult.group.visible = fadeA > 0.02;
      // the adult hits every 1.7 s; the child, when it imitates, at its own rate
      const phA = plan.adult ? (since % 1.7) / 1.7 : 0; swingA = toward(swingA, plan.adult ? swing(phA) : 0.15, dt, 14); adult.armR.rotation.z = swingA;
      kid.to(plan.near ? -1.05 : -4.6, plan.near ? 0.25 : 1.3); kid.step(dt);
      const ready = plan.hit && !kid.moving, period = plan.hit ? 1 / plan.hit : 1, phK = ready ? (since % period) / period : 0;
      swingK = toward(swingK, ready ? swing(phK) : plan.near && !kid.moving ? 0.15 : 0.1, dt, 14); child.armR.rotation.z = swingK;
      childMallet.visible = !!plan.near;
      if (!kid.moving) child.group.rotation.y = toward(child.group.rotation.y, 0, dt, 6);
      child.group.position.y = kid.moving ? Math.abs(Math.sin(time * 10)) * 0.05 : 0;
      const beat = plan.adult ? Math.floor(since / 1.7 + 0.5) : ready ? Math.floor(since / period + 0.5) : -1;        // a blow lands at mid-cycle
      const hitKey = step * 1000 + beat;
      if (hitKey !== lastHit) { lastHit = hitKey; if (beat > 0) { wobble = 0; som.pancada(); } }
      doll.rotation.z = -0.5 * Math.exp(-wobble * 1.6) * Math.cos(wobble * 5.5) * (wobble < 4 ? 1 : 0);
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(-1.6, 1.45, 0), from: V(-1.2, 3.4, 13) }, { at: V(-0.6, 1.3, 0), from: V(-0.4, 3.0, 10.5) }], 1.5);
    const overAdult = spot(world, -1.75, 2.95), overKid = spot(child.group, -2.6, 3.9), step0 = s => s === 0;
    stage.label('<b>Bobo</b>boneco insuflável', spot(world, 1.7, 2.1), step0);
    if (!late) {
      stage.label('<b>modelo</b>bate e grita', overAdult, step0);
      stage.label('<b>observa</b>', overKid, step0);
      stage.label('<b>imita</b>os mesmos gestos e palavras', overKid, s => s === 1);
      stage.label('<b>aprendizagem por observação</b>ninguém a premiou nem castigou', overKid, s => s >= 2, 'conceito');
    } else {
      stage.label('<b>modelo premiado</b>doces e elogios', overAdult, s => s === 0, 'conceito');
      stage.label('<b>imita muito</b>reforço vicariante', overKid, s => s === 1, 'conceito');
      stage.label('<b>modelo castigado</b>ralhete', overAdult, s => s === 2, 'conceito azul');
      stage.label('<b>quase não imita</b>punição vicariante', overKid, s => s === 3, 'conceito azul');
      stage.label('<b>«Mostra-me o que viste e ganhas um autocolante»</b>', spot(world, -1.0, 3.3), s => s >= 4);
      stage.label('<b>afinal sabe fazer</b>aprender não é o mesmo que fazer', overKid, s => s >= 4, 'conceito');
      stage.label('observa', overKid, s => s === 0 || s === 2, 'peq');
    }
  };

  /* ---------- 26. kolb: learning goes round a cycle of four moments (lesson 8) ---------- */
  SCENES.kolb = box => {
    const world = new T.Group(), R = 2.7;
    const ringM = mat(0x55606A), ring = new T.Mesh(new T.TorusGeometry(R, 0.045, 10, 96), ringM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; world.add(ring, ground(6.2, 0x3A4651, 0));
    // the four moments, clockwise seen from above: far (top of the screen), right, near, left
    const STOPS = [
      { nome: 'sentir', tipo: 'Experiência concreta', ex: 'rematas o penálti: a bola sai ao lado', cor: 0xE0603A },
      { nome: 'observar', tipo: 'Observação reflexiva', ex: 'revês o remate: onde estava o pé de apoio?', cor: 0x7FB0D0 },
      { nome: 'pensar', tipo: 'Conceptualização abstrata', ex: 'tiras uma regra: pé de apoio ao lado da bola', cor: 0xF2C14E },
      { nome: 'fazer', tipo: 'Experimentação ativa', ex: 'testas a regra no remate seguinte', cor: 0x7BB98A },
    ].map((s, i) => {
      const a = i * Math.PI / 2, x = Math.sin(a) * R, z = -Math.cos(a) * R, m = mat(s.cor, { roughness: 0.45, emissive: s.cor, emissiveIntensity: 0 });
      const g = new T.Group(); g.position.set(x, 0, z); g.add(cyl(0.5, 0.58, 0.4, mat(0x55606A), 0, 0.2, 0), ball(0.36, m, 0, 0.78, 0)); world.add(g);
      return Object.assign(s, { a, g, m, lit: 0 });
    });
    // the four styles sit between two moments: a quarter of the floor each
    const STYLES = ['Divergente', 'Assimilador', 'Convergente', 'Adaptador'].map((nome, i) => {
      const m = mat([0xB8501C, 0x2F6E9E, 0x8A6B1E, 0x3F7A52][i], { opacity: 0, depthWrite: false, side: T.DoubleSide });
      const wedge = new T.Mesh(new T.RingGeometry(0.5, R - 0.55, 24, 1, 0, Math.PI / 2 - 0.16), m); wedge.rotation.x = -Math.PI / 2; wedge.rotation.z = -(i * Math.PI / 2) + 0.08; wedge.position.y = 0.03; wedge.renderOrder = 2; world.add(wedge);
      const mid = (i + 0.5) * Math.PI / 2; return { nome, m, at: spot(world, Math.sin(mid) * 1.55, 0.5, -Math.cos(mid) * 1.55) };
    });
    const runner = ball(0.2, new T.MeshBasicMaterial({ color: COR.sinal })); world.add(runner);
    const turns = makeSparks(world, 14, 0.05, COR.sinal);
    let angle = 0;
    const stage = makeStage(box, (step, dt, time) => {
      cam(step >= 6 ? 1 : 0, dt, time);
      // the ball stops at one moment per step, then keeps going round
      if (step >= 5) angle += dt * 1.1; else { const goal = Math.max(0, step - 1) * Math.PI / 2, back = Math.round((angle - goal) / (2 * Math.PI)) * 2 * Math.PI; angle = toward(angle, goal + back, dt, 4); }
      runner.visible = step >= 1; runner.position.set(Math.sin(angle) * R, 0.2 + 0.12 * Math.abs(Math.sin(time * 4)), -Math.cos(angle) * R);
      turns.forEach((s, i) => { const a = angle - 0.1 - i * 0.07; s.visible = step >= 5; s.position.set(Math.sin(a) * R, 0.2, -Math.cos(a) * R); s.material.opacity = 1 - i / 14; });
      const here = ((angle / (Math.PI / 2)) % 4 + 4) % 4;
      STOPS.forEach((s, i) => {
        const close = Math.min(Math.abs(here - i), 4 - Math.abs(here - i)) < 0.3 && step >= 1;
        s.lit = toward(s.lit, close ? 1 : step >= i + 1 ? 0.25 : 0, dt, 6); s.m.emissiveIntensity = s.lit * 0.9; s.g.scale.setScalar(1 + 0.18 * s.lit);
        s.g.children[1].position.y = 0.78 + s.lit * 0.15;
      });
      ringM.color.setHex(0x55606A).lerp(tmp.setHex(COR.laranja), step >= 5 ? 1 : 0);
      STYLES.forEach(s => { s.m.opacity = toward(s.m.opacity, step >= 6 ? 0.55 : 0, dt, 4); });
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(0, 0.95, 0), from: V(0, 6.6, 11.2) }, { at: V(0, 0.75, 0.2), from: V(0, 8.6, 9.2) }], 1.6);
    STOPS.forEach((s, i) => {
      // the nearest moment is named beside its ball, not over it; the side ones a little outwards, away from the far one
      const top = i === 2 ? spot(s.g, 0.55, 0.8, 0.3) : spot(s.g, i === 1 ? 1.0 : i === 3 ? -0.8 : 0, 1.4, 0);
      stage.label(`<b>${s.nome}</b>${s.tipo}`, top, st => st >= i + 1 && st !== i + 1 && st < 6, i === 2 ? 'lado' : '');
      stage.label(`<b>${s.nome}</b>${s.tipo}<br><i>${s.ex}</i>`, top, st => st === i + 1, 'conceito' + (i === 2 ? ' lado' : ''));
      stage.label(`<b>${s.nome}</b>`, top, st => st >= 6, i === 2 ? 'lado' : '');
    });
    STYLES.forEach(s => stage.label(`<b>${s.nome}</b>`, s.at, st => st >= 6, 'conceito'));
    stage.label('cada volta melhora a seguinte', spot(world, 0, 0.9, 0), st => st === 5, 'peq');
    stage.label('<b>quatro momentos</b>um clique para cada um', spot(world, 0, 1.1, 0), st => st === 0);
  };

  /* ---------- 27. Start every scene present in the page ---------- */
  for (const box of boxes) { const make = SCENES[box.dataset.cena]; if (make) make(box); }
})();
