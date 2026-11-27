/* =====================================================================
   neuro3d.js — the 3D scenes of Psicologia, Módulo 4: «Por dentro do cérebro»,
   the five degraus of learning and Kolb's cycle. Loaded after app.js.

   A scene lives in <div class="palco3d" data-cena="NAME"> inside a slide:

     caixa      the «black box» opens: skull → cortex → prefrontal → deep structures
     neuronio   one neuron talks to another: impulse, synapse, neurotransmitter
     rede       mini-game: practise a path and its connections grow; stop, and they are pruned
     cortex     the cortex gets thinner from 3 to 20 years (Piccolo and colleagues, 2016),
                with a simplified plot built step by step and an age slider
     medir      how brain activity is measured: EEG, fMRI, and the path of a sound
     sirene     habituation: play the siren and watch the brain's response shrink
     lesma      Kandel's sea slug (Aplysia): the gill-withdrawal reflex habituates
     pavlov     degrau 2 · ring the bell, give the food: the dog learns to salivate at the bell
     medo       degrau 2 · the little Albert in the brain: rat and noise meet in the amygdala
     skinner    degrau 3 · a Skinner box with four consequences (reinforcement and punishment)
     dopamina   degrau 3 · dopamine neurons signal «better or worse than predicted»
     kohler     degrau 4 · the chimpanzee, the stick and the banana: insight
     tolman     degrau 4 · mini-game: explore a maze without cheese, then run for the cheese
     regiao     one idea on the real brain: data-regiao="hipocampo" (place cells) or "espelho"
     bobo       degrau 5 · Bandura's doll: data-modo="1961" (imitation) or "1965" (model rewarded or punished)
     kolb       lesson 8 · the four moments of Kolb's cycle and the four styles between them

   Anatomy is real, not drawn: it is the file cp4/cerebro3d-dados.js (FreeSurfer fsaverage cortex
   and deep structures, BodyParts3D skull), in millimetres of the MNI305 template
   (x → right, y → front, z → up). Neurons, the network, the sea slug, the animals, the people and Kolb's ring are schematic models.

   How scenes follow the lesson: app.js puts the classes ge1, ge2… on the slide as the teacher
   clicks («step is at least n»). Every frame a scene reads the step and eases towards what
   that step shows, so going back, or opening the slide at any step, always works.
   Buttons and sliders are plain HTML in the slide (data-act, data-ctl); captions are the
   <p data-step> inside .leg3d.

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
  function makeStage(box, update) {
    const slide = box.closest('.slide');
    let renderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { box.classList.add('sem-3d'); return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    box.prepend(renderer.domElement);
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(30, 1, 0.05, 400);
    scene.add(new T.HemisphereLight(0xffffff, 0x2a3540, 1.5));
    const key = new T.DirectionalLight(0xfff0dc, 2.2); key.position.set(-4, 6, 6); scene.add(key);
    const rim = new T.DirectionalLight(0x9ec3e6, 1.1); rim.position.set(4, 3, -6); scene.add(rim);
    const labels = [], p = new T.Vector3();
    /** HTML label that follows a 3D object; `when(step)` says in which steps it shows. */
    function label(html, target, when, cls) {
      const el = document.createElement('div'); el.className = 'et3d ' + (cls || ''); el.innerHTML = html; box.append(el);
      labels.push({ el, target, when }); return el;
    }
    let width = 1, height = 1, last = 0, running = false, step = -1, stepAt = 0;
    function resize() { width = box.clientWidth || 1; height = box.clientHeight || 1; renderer.setSize(width, height, false); camera.aspect = width / height;
      // the caption covers the bottom of the stage: the picture is drawn a little higher than the middle
      // (data-dy replaces that 14%; data-dx="0.2" moves the picture 20% of the width to the left, away from a card on the right, except on phones)
      const dy = box.dataset.dy !== undefined ? Number(box.dataset.dy) : box.querySelector('.leg3d') ? 0.14 : 0;
      camera.setViewOffset(width, height, width * Number(box.dataset.dx || 0) * (width < 700 ? 0 : 1), height * dy, width, height); camera.updateProjectionMatrix(); }
    const currentStep = () => { let k = 0; while (slide.classList.contains('ge' + (k + 1))) k++; return k; };
    function frame(time) {
      if (!slide.classList.contains('current')) { running = false; return; }
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
        item.el.classList.toggle('visivel', item.when(step) && p.z < 1);
        item.el.style.transform = `translate(-50%, -100%) translate(${((p.x + 1) / 2) * width}px, ${((1 - p.y) / 2) * height}px)`;
      }
    }
    function start() { if (running || !slide.classList.contains('current')) return; running = true; last = performance.now(); resize(); requestAnimationFrame(frame); }
    new ResizeObserver(resize).observe(box);
    new MutationObserver(start).observe(slide, { attributes: true, attributeFilter: ['class'] });
    setTimeout(start, 0);
    /** Value of a slider of this slide (data-ctl="name"). */
    const ctl = name => { const el = slide.querySelector(`[data-ctl="${name}"]`); return el ? Number(el.value) : 0; };
    /** Run fn when a button of this slide (data-act="name") is pressed. */
    const on = (name, fn) => slide.querySelectorAll(`[data-act="${name}"]`).forEach(b => b.addEventListener('click', fn));
    return { scene, camera, label, slide, ctl, on, box };
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
    const cam = director(stage.camera, shotsMm([[[0, -5, -10], [-460, 460, 100]], [[0, -15, 12], [-370, 215, 100]], [[0, 5, 12], [-215, 385, 100]], [[0, -30, -8], [-350, -25, 25]]]));
    stage.label('<b>caixa negra</b>só se vê o que entra e o que sai', head.anchor([0, 0, 70]), s => s === 0);
    stage.label('<b>córtex</b>2 a 4 mm de espessura', head.anchor([-35, -10, 78]), s => s === 1);
    stage.label('<b>córtex pré-frontal</b>planear, decidir, travar impulsos', head.anchor([-22, 62, 30]), s => s === 2);
    const at = (name, dz) => { const c = centre(name); return head.anchor([c[0], c[1], c[2] + dz]); };
    // seen from the left side, the front of the head is on the left of the screen: the four labels are kept apart
    stage.label('<b>tálamo</b>a portaria dos sentidos', at('talamo_e', 34), s => s >= 3);
    stage.label('<b>hipocampo</b>guardar memórias novas', head.anchor([-30, -40, -24]), s => s >= 3, 'baixo');
    stage.label('<b>amígdala</b>o alarme: medo', head.anchor([-24, 26, -12]), s => s >= 3);
    stage.label('<b>cerebelo</b>movimentos treinados', head.anchor([-20, -98, -12]), s => s >= 3);
  };

  /* ---------- 6. cortex: thinner from 3 to 20 years (Piccolo and colleagues, 2016) ---------- */
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
    const head = buildHead(); let shown = -1;
    head.osso.forEach(m => (m.visible = false));
    const stage = makeStage(box, (step, dt, time) => {
      cam(0, dt, time);
      head.group.rotation.z = Math.sin(time / 5) * 0.5;
      const age = stage.ctl('idade'), mmNow = ESP.todos(age);
      if (Math.abs(mmNow - shown) > 0.004) {
        shown = mmNow;
        // thick cortex in warm orange, thin cortex in pale blue: the whole surface changes together (it is the mean)
        const k = clamp((mmNow - 2.55) / 0.5), c = [lerp(0.62, 0.95, k), lerp(0.74, 0.62, k), lerp(0.86, 0.42, k)];
        paint(head, () => c);
        if (lupa) { lupa.style.setProperty('--esp', (mmNow * 26).toFixed(1) + 'px'); lupa.querySelector('output').textContent = mmNow.toFixed(2).replace('.', ',') + ' mm'; lupa.querySelector('b').textContent = Math.round(age) + ' anos'; }
        if (mark) { mark.setAttribute('transform', `translate(${X(age)} 0)`); mark.querySelector('circle').setAttribute('cy', Y(mmNow)); }
      }
    });
    if (!stage) return;
    stage.scene.add(head.group);
    const cam = director(stage.camera, shotsMm([[[0, -15, 8], [-360, 150, 110]]]));
  };

  /* ---------- 7. The path of a sound, shared by «medir» and «sirene» ---------- */
  /**
   * Ear → brainstem → thalamus → auditory cortex (both sides), with a branch thalamus → amygdala.
   * Returns { fire(strength), update(dt), glows }: fire() sends one wave; `glows` is what paint() needs.
   */
  function soundPath(head) {
    const ear = [86, -8, -6], stem = [6, -36, -36], thal = centre('talamo_d'), amy = centre('amigdala_d');
    const cortexD = [58, -22, 8], cortexE = [-58, -22, 8], thalE = centre('talamo_e');
    const legs = [                                                   // [from, to, start time, duration]
      [ear, stem, 0, 0.5], [stem, thal, 0.5, 0.4], [stem, thalE, 0.5, 0.4], [thal, cortexD, 0.9, 0.4], [thalE, cortexE, 0.9, 0.4], [thal, amy, 0.9, 0.35],
    ];
    const sparks = makeSparks(head.group, legs.length, 4.2, COR.sinal);
    const glows = [{ c: cortexD, r: 26, a: 0, cor: rgb(0xFFD34E) }, { c: cortexE, r: 26, a: 0, cor: rgb(0xFFD34E) }];
    const state = { t: 9, strength: 1, alarm: 0, glows };
    const amyBase = new T.Color(COR.amigdala), hot = new T.Color(0xFFF1A8);
    state.fire = strength => { state.t = 0; state.strength = strength; };
    state.update = dt => {
      state.t += dt;
      legs.forEach(([a, b, t0, dur], i) => {
        const k = (state.t - t0) / dur, s = sparks[i];
        s.visible = k > 0 && k < 1;
        if (s.visible) { s.position.set(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)); s.scale.setScalar(0.5 + state.strength); s.material.opacity = 0.35 + 0.65 * state.strength; }
      });
      const arrived = state.t > 1.3 ? Math.exp(-(state.t - 1.3) * 1.1) : 0;       // the cortex lights up on arrival and fades
      glows[0].a = glows[1].a = arrived * state.strength;
      state.alarm = state.t > 1.25 ? Math.exp(-(state.t - 1.25) * 1.3) * state.strength : 0;
      head.mats.amigdala.color.copy(amyBase).lerp(hot, state.alarm);
      head.amigdala.forEach(m => m.scale.setScalar(1 + state.alarm * 0.35));
    };
    return state;
  }

  /* ---------- 8. medir: EEG, fMRI and the path of a sound ---------- */
  SCENES.medir = box => {
    if (!D) return box.classList.add('sem-3d');
    const head = buildHead(), eeg = box.querySelector('canvas.eeg');
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
    const path = soundPath(head); let cycle = 0, eegT = 0;
    const blobs = [{ c: [58, -22, 8], r: 30, a: 0, cor: rgb(0xFF7A30) }, { c: [-58, -22, 8], r: 30, a: 0, cor: rgb(0xFF7A30) }];
    const stage = makeStage(box, (step, dt, time, since) => {
      cam(step, dt, time);
      fade(head.mats.osso, step === 0 ? 0.92 : 0, dt, head.osso);
      elMat.opacity = toward(elMat.opacity, step === 0 ? 1 : 0, dt, 5); dots.visible = elMat.opacity > 0.02;
      fade(head.mats.cortex, step >= 2 ? 0.2 : 1, dt, head.cortex);
      for (const k of ['talamo', 'amigdala']) fade(head.mats[k], step >= 2 ? 1 : 0, dt, head[k]);
      if (step === 1) {
        // fMRI: the coloured map appears seconds after the sound (it measures blood, not electricity)
        const k = ease((since % 9 - 2.5) / 2.5) * (1 - ease((since % 9 - 7) / 1.5));
        blobs[0].a = blobs[1].a = k * 0.9; paint(head, null, blobs);
      } else if (step >= 2) {
        cycle += dt; if (cycle > 3.2) { cycle = 0; path.fire(1); if (stage.slide.classList.contains('current')) som.passo(); }
        path.update(dt); paint(head, null, path.glows);
      } else paint(head, null);
      if (eeg) {
        // EEG traces: fast wiggles, drawn while the electrodes are on
        eeg.style.opacity = step === 0 ? 1 : 0; eegT += dt;
        const g = eeg.getContext('2d'); g.clearRect(0, 0, eeg.width, eeg.height); g.strokeStyle = '#F0A673'; g.lineWidth = 2;
        for (let r = 0; r < 4; r++) { g.beginPath(); for (let x = 0; x < eeg.width; x += 2) { const t = eegT * 3 + x * 0.05; const y = 18 + r * 30 + Math.sin(t * (1.3 + r * 0.4)) * 6 + Math.sin(t * 4.1 + r) * 4 + Math.sin(t * 9.3 + r * 2) * 2; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      }
    });
    if (!stage) return;
    stage.scene.add(head.group);
    const cam = director(stage.camera, shotsMm([[[0, -15, 20], [330, 230, 150]], [[0, -15, 10], [380, 60, 90]], [[14, -18, -4], [195, 255, 95]], [[14, -18, -4], [195, 255, 95]]]));
    stage.label('<b>elétrodos</b>medem a eletricidade à superfície', head.anchor([60, 30, 62]), s => s === 0);
    stage.label('<b>córtex auditivo</b>mais sangue com oxigénio', head.anchor([66, -22, 22]), s => s === 1);
    stage.label('ouvido', head.anchor([92, -8, -2]), s => s >= 2, 'peq');
    stage.label('tronco cerebral', head.anchor([10, -40, -52]), s => s >= 2, 'peq');
    stage.label('<b>tálamo</b>', head.anchor(centre('talamo_d').map((v, i) => v + (i === 2 ? 14 : 0))), s => s >= 2);
    stage.label('<b>córtex auditivo</b>', head.anchor([72, -30, 30]), s => s >= 2);
  };

  /* ---------- 9. sirene: habituation, seen in the brain ---------- */
  SCENES.sirene = box => {
    const slide = box.closest('.slide'), bars = slide.querySelector('.sustos'), out = slide.querySelector('output');
    const n = { sirene: 0, apito: 0 };
    /** Size of the response to the n-th repetition of the same harmless sound (illustrative: it falls by about a third each time). */
    const response = k => Math.max(0.06, Math.pow(0.66, k - 1));
    let path = null;
    function play(kind) {
      n[kind]++; const r = response(n[kind]); som[kind](); if (path) path.fire(r);
      if (bars) { const b = document.createElement('span'); b.className = kind; b.style.setProperty('--h', Math.round(r * 100) + '%'); b.title = Math.round(r * 100) + '%'; bars.append(b); if (bars.children.length > 16) bars.firstChild.remove(); }
      if (out) out.textContent = kind === 'apito' && n.apito === 1 && n.sirene > 2 ? 'Som novo: o cérebro volta a reagir em força. A habituação é a este som, não a todos.'
        : n[kind] === 1 ? 'Primeira vez: resposta grande. Susto!' : r < 0.2 ? 'Quase não reage: habituou-se.' : 'A resposta diminui…';
    }
    slide.querySelector('[data-act="sirene"]').addEventListener('click', () => play('sirene'));
    slide.querySelector('[data-act="apito"]').addEventListener('click', () => play('apito'));
    slide.querySelector('[data-act="repor"]').addEventListener('click', () => { n.sirene = n.apito = 0; if (bars) bars.innerHTML = ''; if (out) out.textContent = 'Carrega em «Tocar a sirene».'; });
    if (!D) return box.classList.add('sem-3d');
    const head = buildHead(); head.osso.forEach(m => (m.visible = false));
    head.mats.cortex.opacity = 0.2; head.mats.cortex.depthWrite = false;
    path = soundPath(head);
    const stage = makeStage(box, (step, dt, time) => { cam(0, dt, time); path.update(dt); paint(head, null, path.glows); });
    if (!stage) return;
    stage.scene.add(head.group);
    const cam = director(stage.camera, shotsMm([[[14, -18, -4], [195, 255, 95]]]));
    stage.label('ouvido', head.anchor([92, -8, -2]), () => true, 'peq');
    stage.label('<b>tálamo</b>', head.anchor(centre('talamo_d').map((v, i) => v + (i === 2 ? 14 : 0))), () => true);
    stage.label('<b>córtex auditivo</b>', head.anchor([72, -30, 30]), () => true);
    stage.label('<b>amígdala</b>o alarme', head.anchor(centre('amigdala_d').map((v, i) => v - (i === 2 ? 16 : 0))), () => true);
  };

  /* ---------- 10. Building blocks for the schematic scenes (neurons, network, sea slug) ---------- */
  const V = (x, y, z) => new T.Vector3(x, y, z || 0);
  const tube = (pts, r, material, seg) => new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), seg || 24, r, 8), material);
  const ball = (r, material, x, y, z) => { const m = new T.Mesh(new T.SphereGeometry(r, 24, 16), material); m.position.set(x || 0, y || 0, z || 0); return m; };
  /**
   * A schematic neuron: cell body at `at`, dendrites fanning out to the side `dir` (−1 = left),
   * returns the group and the tips of its dendrites.
   */
  function soma(at, color, dir, n) {
    const g = new T.Group(), m = mat(color, { roughness: 0.5 }), tips = [];
    g.add(ball(0.36, m, at.x, at.y, at.z));
    for (let i = 0; i < (n || 6); i++) {
      const a = (i / ((n || 6) - 1) - 0.5) * 2.3, len = 0.95 + (i % 3) * 0.22;
      const tip = V(at.x + dir * Math.cos(a) * len, at.y + Math.sin(a) * len, at.z + ((i % 2) - 0.5) * 0.5);
      const mid = at.clone().lerp(tip, 0.55).add(V(0, ((i % 2) - 0.5) * 0.18, 0));
      g.add(tube([at, mid, tip], 0.05, m, 12)); tips.push(tip);
      const twig = tip.clone().add(V(dir * 0.3, (i % 2 ? 0.28 : -0.28), 0.1)); g.add(tube([mid, mid.clone().lerp(twig, 0.6), twig], 0.03, m, 8));
    }
    return { group: g, tips, mat: m };
  }

  /* ---------- 11. neuronio: how two neurons talk ---------- */
  SCENES.neuronio = box => {
    const world = new T.Group();
    const A = soma(V(-3.3, 0, 0), 0x7FB0D0, -1), B = soma(V(2.9, 0.1, 0), 0xF0A673, -1, 5);
    const axonPts = [V(-3.3, 0, 0), V(-2.2, -0.12, 0), V(-1, 0.1, 0), V(0.1, -0.05, 0), V(1.0, 0, 0)], axon = new T.CatmullRomCurve3(axonPts);
    world.add(A.group, B.group, tube(axonPts, 0.045, A.mat, 40));
    const myelin = mat(COR.creme, { roughness: 0.4 });
    for (let i = 0; i < 5; i++) { const a = 0.14 + i * 0.165, pts = [0, 0.5, 1].map(k => axon.getPoint(a + k * 0.13)); world.add(tube(pts, 0.11, myelin, 6)); }
    const bulb = ball(0.17, A.mat, 1.08, 0, 0), post = ball(0.2, B.mat, 1.5, 0, 0); post.scale.set(0.45, 1.25, 1.25);
    world.add(bulb, post, tube([V(1.5, 0, 0), V(2.1, 0.02, 0), V(2.9, 0.1, 0)], 0.05, B.mat, 12));
    const outPts = [V(2.9, 0.1, 0), V(4, 0.3, 0), V(5.6, 0.1, 0)]; world.add(tube(outPts, 0.045, B.mat, 20));
    const vesicles = makeSparks(world, 9, 0.036, 0xFFD34E), impulse = makeSparks(world, 2, 0.13, COR.sinal);
    vesicles.forEach((v, i) => { v.userData.home = V(1.02 + (i % 3) * 0.045, ((i / 3 | 0) - 1) * 0.07, ((i % 2) - 0.5) * 0.08); });
    const baseB = new T.Color(0xF0A673), hot = new T.Color(0xFFF1A8), out = new T.CatmullRomCurve3(outPts);
    const stage = makeStage(box, (step, dt, time, since) => {
      cam(step, dt, time);
      const T0 = step === 2 ? 4 : 3.4, t = step >= 1 ? since % T0 : -1;            // one message every few seconds
      const k = t / 1.5;                                                            // 1.5 s along the axon
      impulse[0].visible = t >= 0 && k < 1; if (impulse[0].visible) impulse[0].position.copy(axon.getPoint(clamp(k)));
      const rel = step >= 2 ? (t - 1.5) / 0.9 : -1;                                 // then the transmitter crosses the gap
      vesicles.forEach((v, i) => {
        v.visible = step >= 2;
        const go = clamp(rel * 1.4 - i * 0.04), h = v.userData.home;
        v.position.set(lerp(h.x, 1.4, ease(go)) + (go > 0 && go < 1 ? 0.06 : 0), h.y * (1 + go), h.z);
        v.material.opacity = go >= 1 ? clamp(2.2 - rel) : rel > 2.2 ? 0 : 1;
      });
      const fired = step >= 3 ? (t - 2.4) / 1.0 : -1;                               // and the next neuron fires
      B.mat.color.copy(baseB).lerp(hot, step >= 3 && fired > -0.3 && fired < 0.5 ? 1 - Math.abs(fired - 0.1) : 0);
      impulse[1].visible = fired > 0 && fired < 1; if (impulse[1].visible) impulse[1].position.copy(out.getPoint(fired));
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(0, 0, 0), from: V(0, 1.4, 12.5) }, { at: V(-0.6, 0, 0), from: V(-0.6, 1.2, 10) }, { at: V(1.28, 0, 0), from: V(1.28, 0.35, 2.3) }, { at: V(1, 0, 0), from: V(1, 1.4, 11.5) }]);
    const pin = (x, y) => { const o = new T.Object3D(); o.position.set(x, y, 0); world.add(o); return o; };
    stage.label('<b>dendrites</b>recebem sinais', pin(-4.3, 1.1), s => s < 2);
    stage.label('<b>corpo celular</b>', pin(-3.3, -0.55), s => s < 2, 'baixo');
    stage.label('<b>axónio</b>leva o impulso elétrico', pin(-1.2, 0.3), s => s < 2);
    stage.label('mielina: acelera', pin(0.2, -0.3), s => s === 1, 'peq baixo');
    stage.label('<b>sinapse</b>', pin(1.3, 0.35), s => s === 0 || s === 1 || s === 3);
    stage.label('<b>vesículas</b>com neurotransmissor', pin(1.02, 0.2), s => s === 2);
    stage.label('fenda', pin(1.3, -0.22), s => s === 2, 'peq baixo');
    stage.label('<b>recetores</b>do neurónio seguinte', pin(1.62, 0.28), s => s === 2);
    stage.label('soma os sinais: <b>dispara ou não</b>', pin(2.9, 0.65), s => s === 3);
  };

  /* ---------- 12. rede: practise a path, and its connections grow ---------- */
  SCENES.rede = box => {
    const slide = box.closest('.slide'), out = slide.querySelector('output');
    const world = new T.Group(), P = { in: V(-3.4, 0), a1: V(-1.2, 1.25), a2: V(1.1, 1.35), b1: V(-1.2, -1.25), b2: V(1.1, -1.35), c: V(0, 0.05), out: V(3.4, 0) };
    const cell = mat(0x7FB0D0, { roughness: 0.5 });
    Object.values(P).forEach(p => world.add(ball(0.27, cell, p.x, p.y, 0)));
    const ROUTE = { A: ['in', 'a1', 'a2', 'out'], B: ['in', 'b1', 'b2', 'out'] };
    const edges = [['in', 'a1'], ['a1', 'a2'], ['a2', 'out'], ['in', 'b1'], ['b1', 'b2'], ['b2', 'out'], ['in', 'c'], ['c', 'out'], ['a1', 'b2'], ['b1', 'a2']].map(([a, b]) => {
      const m = mat(0x8A929A), from = P[a], to = P[b], mesh = new T.Mesh(new T.CylinderGeometry(1, 1, from.distanceTo(to), 10), m);
      mesh.position.copy(from).lerp(to, 0.5); mesh.quaternion.setFromUnitVectors(V(0, 1, 0), to.clone().sub(from).normalize()); world.add(mesh);
      return { a, b, w: 0.3, show: 0.3, mesh, m };
    });
    const edge = (a, b) => edges.find(e => e.a === a && e.b === b);
    const spark = makeSparks(world, 1, 0.16, COR.sinal)[0], weak = new T.Color(0x8A929A), strong = new T.Color(0xF0A673);
    let run = null, trained = { A: 0, B: 0 };
    const routeTime = r => ROUTE[r].slice(1).reduce((s, b, i) => { const e = edge(ROUTE[r][i], b); return s + (e.w < 0.08 ? Infinity : 0.45 / (0.25 + e.w)); }, 0);
    const alive = () => edges.filter(e => e.w >= 0.08).length;
    const say = s => { if (out) out.textContent = s; };
    function practise(r) {
      if (run) return;
      if (!isFinite(routeTime(r))) return say(`O caminho ${r} foi podado: já não há ligação por aí.`);
      run = { r, i: 0, t: 0 };
    }
    stage0();
    function stage0() { say('Escolhe um caminho e pratica-o várias vezes. Repara na grossura das ligações e no tempo do sinal.'); }
    slide.querySelector('[data-act="a"]').addEventListener('click', () => practise('A'));
    slide.querySelector('[data-act="b"]').addEventListener('click', () => practise('B'));
    slide.querySelector('[data-act="tempo"]').addEventListener('click', () => {
      // months without practice: every connection weakens; the weakest are pruned
      edges.forEach(e => { e.w = Math.max(0, e.w - 0.11); });
      say(`Passaram meses sem praticar: ficam ${alive()} de 10 ligações. As que não se usam são podadas.`);
    });
    slide.querySelector('[data-act="repor"]').addEventListener('click', () => { edges.forEach(e => (e.w = 0.3)); trained = { A: 0, B: 0 }; run = null; stage0(); });
    const stage = makeStage(box, (step, dt, time) => {
      cam(0, dt, time);
      for (const e of edges) {
        e.show = toward(e.show, e.w, dt, 5);
        const r = 0.015 + 0.085 * e.show; e.mesh.scale.set(r, 1, r); e.mesh.visible = e.show > 0.05;
        e.m.color.copy(weak).lerp(strong, clamp((e.show - 0.3) / 0.6)); e.m.opacity = clamp(e.show * 5);
      }
      spark.visible = !!run;
      if (run) {
        const nodes = ROUTE[run.r], e = edge(nodes[run.i], nodes[run.i + 1]), dur = 0.45 / (0.25 + e.w);
        run.t += dt; spark.position.copy(P[nodes[run.i]]).lerp(P[nodes[run.i + 1]], clamp(run.t / dur));
        if (run.t >= dur) {
          run.t = 0; run.i++; som.passo();
          if (run.i >= nodes.length - 1) {
            // «neurons that fire together wire together»: every connection on the path gets stronger
            nodes.slice(1).forEach((b, i) => { const x = edge(nodes[i], b); x.w = Math.min(1, x.w + 0.14); });
            trained[run.r]++;
            say(`Caminho ${run.r}: ${trained[run.r]} ${trained[run.r] === 1 ? 'treino' : 'treinos'}. O sinal demora agora ${routeTime(run.r).toFixed(1).replace('.', ',')} s a chegar.`);
            run = null;
          }
        }
      }
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(0, 0, 0), from: V(0, 0.6, 12) }]);
    const pin = (p, dy) => { const o = new T.Object3D(); o.position.set(p.x, p.y + dy, 0); world.add(o); return o; };
    stage.label('<b>entrada</b>', pin(P.in, 0.45), () => true); stage.label('<b>saída</b>', pin(P.out, 0.45), () => true);
    stage.label('caminho A', pin(P.a1, 0.45), () => true, 'peq'); stage.label('caminho B', pin(P.b1, -0.4), () => true, 'peq baixo');
  };

  /* ---------- 13. lesma: Kandel's sea slug (Aplysia) ---------- */
  SCENES.lesma = box => {
    const slide = box.closest('.slide'), bars = slide.querySelector('.sustos'), out = slide.querySelector('output');
    const world = new T.Group(), skin = mat(0x7A4658, { roughness: 0.55 }), pale = mat(0xA8667A, { roughness: 0.5 });
    const part = (m, s, p) => { const b = ball(1, m, p[0], p[1], p[2]); b.scale.set(s[0], s[1], s[2]); world.add(b); return b; };
    part(skin, [2.1, 0.62, 0.95], [-1.6, 0, 0]); part(skin, [0.7, 0.5, 0.6], [-3.7, 0.12, 0]);                      // body and head
    part(pale, [1.25, 0.34, 0.3], [-1.3, 0.5, 0.62]); part(pale, [1.25, 0.34, 0.3], [-1.3, 0.5, -0.62]);             // the two flaps of the mantle
    for (const [x, z, h] of [[-4.0, 0.25, 0.55], [-4.0, -0.25, 0.55], [-4.35, 0.3, 0.3], [-4.35, -0.3, 0.3]]) { const c = new T.Mesh(new T.ConeGeometry(0.1, h, 10), skin); c.position.set(x, 0.45 + h / 2, z); world.add(c); }
    const gill = new T.Group(); gill.position.set(-1.1, 0.55, 0); world.add(gill);
    const gillMat = mat(0xF2A7B5, { roughness: 0.45 });
    for (let i = 0; i < 9; i++) { const leaf = new T.Mesh(new T.ConeGeometry(0.13, 0.75, 8), gillMat); const a = (i - 4) * 0.2; leaf.position.set(Math.sin(a) * 0.5, 0.3, (i % 3 - 1) * 0.16); leaf.rotation.z = -a; leaf.scale.z = 0.5; gill.add(leaf); }
    const siphon = new T.Mesh(new T.CylinderGeometry(0.16, 0.22, 0.7, 14, 1, true), mat(0x9A5A6E, { side: T.DoubleSide })); siphon.position.set(0.25, 0.62, 0); siphon.rotation.z = -0.5; world.add(siphon);
    const sand = new T.Mesh(new T.CircleGeometry(7, 48), mat(0x5B6773, { roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.y = -0.62; world.add(sand);
    const brush = new T.Group(); brush.add(new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 2.2, 8), mat(0xDDD5C6))); const tip = ball(0.09, mat(0xF6F3EC), 0, -1.1, 0); brush.add(tip); brush.rotation.z = -0.5; world.add(brush);
    // the synapse behind the reflex, drawn large on the right
    const sens = mat(0x7FB0D0), motor = mat(0xF0A673), syn = V(3.6, 0.55, 0);
    world.add(tube([V(3.0, 2.3, 0), V(3.45, 1.5, 0), syn.clone().add(V(0, 0.45, 0))], 0.08, sens, 14), ball(0.36, sens, syn.x, syn.y + 0.42, 0));
    const postM = ball(0.42, motor, syn.x, syn.y - 0.52, 0); postM.scale.set(1.3, 0.5, 1.2); world.add(postM, tube([syn.clone().add(V(0, -0.6, 0)), V(3.75, -0.2, 0), V(4.3, -0.55, 0)], 0.08, motor, 14));
    const drops = makeSparks(world, 14, 0.05, COR.sinal);
    let n = 0, boost = 1, touchT = 9, r = 0, shown = 0;
    const response = k => Math.max(0.07, Math.pow(0.7, k - 1));                 // illustrative: about 30% less on each touch
    const say = s => { if (out) out.textContent = s; };
    function bar(cls) { if (!bars) return; const b = document.createElement('span'); b.className = cls; b.style.setProperty('--h', Math.round(Math.min(1, r) * 100) + '%'); bars.append(b); if (bars.children.length > 18) bars.firstChild.remove(); }
    slide.querySelector('[data-act="tocar"]').addEventListener('click', () => {
      n++; r = Math.min(1.25, response(n) * boost); touchT = 0; som.toque(); bar(boost > 1 ? 'apito' : 'sirene');
      say(boost > 1 ? 'Depois do choque, até um toque leve provoca uma resposta enorme: sensitização.' : n === 1 ? 'Primeiro toque: a brânquia encolhe-se toda.' : r < 0.2 ? 'Quase não se encolhe: habituou-se ao toque.' : 'Encolhe-se menos: o neurónio sensorial liberta menos neurotransmissor.');
      if (boost > 1 && n >= 3) boost = 1;
    });
    slide.querySelector('[data-act="choque"]').addEventListener('click', () => { boost = 1.7; n = 0; som.apito(); say('Choque na cauda! Agora toca outra vez no sifão.'); });
    slide.querySelector('[data-act="repor"]').addEventListener('click', () => { n = 0; boost = 1; r = 0; if (bars) bars.innerHTML = ''; say('Descansou umas horas: a resposta volta ao início. Toca no sifão.'); });
    const stage = makeStage(box, (step, dt, time) => {
      cam(0, dt, time); touchT += dt;
      const down = touchT < 0.5 ? ease(touchT / 0.25) * (1 - ease((touchT - 0.3) / 0.2)) : 0;       // the brush comes down and goes back
      brush.position.set(0.95 - down * 0.35, 2.0 - down * 0.75, 0);
      const pull = touchT > 0.2 && touchT < 2.6 ? ease((touchT - 0.2) / 0.3) * (1 - ease((touchT - 1.6) / 1.0)) : 0;
      shown = toward(shown, pull * Math.min(1, r), dt, 9);
      gill.scale.setScalar(1 - 0.78 * shown); gill.position.y = 0.55 - 0.25 * shown;
      const count = Math.round(14 * Math.min(1, r)), go = (touchT - 0.25) / 0.7;
      drops.forEach((d, i) => {
        d.visible = i < count && go > 0 && go < 1.4;
        d.position.set(syn.x + ((i % 5) - 2) * 0.1, syn.y + 0.12 - clamp(go) * 0.42, ((i % 3) - 1) * 0.1); d.material.opacity = clamp((1.4 - go) * 3);
      });
    });
    if (!stage) return;
    stage.scene.add(world);
    const cam = director(stage.camera, [{ at: V(0.2, 0.5, 0), from: V(0.2, 3.4, 11.5) }]);
    const pin = (x, y) => { const o = new T.Object3D(); o.position.set(x, y, 0); world.add(o); return o; };
    stage.label('<b>brânquia</b>encolhe-se para se proteger', pin(-1.1, 1.25), () => true);
    stage.label('<b>sifão</b>onde se toca', pin(0.6, 0.2), () => true, 'baixo');
    stage.label('cabeça', pin(-4.2, 1.1), () => true, 'peq');
    stage.label('<b>neurónio sensorial</b>sente o toque', pin(3.3, 2.45), s => s >= 1);
    stage.label('<b>neurónio motor</b>encolhe a brânquia', pin(4.2, -0.75), s => s >= 1, 'baixo');
    stage.label('neurotransmissor', pin(4.25, 0.5), s => s >= 1, 'peq');
  };

  /* ---------- 14. Building blocks for the scenes of degraus 2 to 5 ---------- */
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

  /* ---------- 15. pavlov: teach the dog to salivate at the bell (degrau 2) ---------- */
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

  /* ---------- 16. medo: the little Albert, seen in the brain (degrau 2) ---------- */
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
    stage.label('<b>tálamo</b>', head.anchor([thal[0], thal[1], thal[2] + 16]), () => true);
    stage.label('córtex visual', head.anchor([20, -100, 24]), s => s !== 1, 'peq');
    stage.label('córtex auditivo', head.anchor([72, -30, 30]), s => s === 1 || s === 2, 'peq');
    const amyAt = head.anchor([amy[0] + 4, amy[1] + 4, amy[2] - 16]);
    stage.label('<b>amígdala</b>calma', amyAt, s => s === 0, 'baixo');
    stage.label('<b>amígdala</b>alarme: medo', amyAt, s => s >= 1 && s <= 3, 'baixo conceito');
    stage.label('<b>amígdala</b>alarme mais fraco', amyAt, s => s >= 4, 'baixo');
    stage.label('<b>córtex pré-frontal</b>trava o alarme', head.anchor([14, 66, 14]), s => s >= 4, 'conceito azul');
  };

  /* ---------- 17. skinner: the box, the lever and four consequences (degrau 3) ---------- */
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

  /* ---------- 18. dopamina: what Skinner could not see (degrau 3) ---------- */
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
    const cam = director(stage.camera, shotsMm([[[0, 10, 26], [-255, 225, 110]]]));
    stage.label('<b>área tegmental ventral</b>neurónios da dopamina', head.anchor([0, -22, -26]), () => true, 'baixo');
    stage.label('<b>estriado</b>recebe a dopamina', head.anchor([-26, 6, 22]), () => true);
    stage.label('córtex pré-frontal', head.anchor([-24, 62, 24]), () => true, 'peq');
  };

  /* ---------- 19. kohler: the chimpanzee, the stick and the banana (degrau 4) ---------- */
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

  /* ---------- 20. tolman: a maze to explore with and without cheese (degrau 4) ---------- */
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

  /* ---------- 21. regiao: one idea shown on the real brain (place cells; doing and watching) ---------- */
  SCENES.regiao = box => {
    if (!D) return box.classList.add('sem-3d');
    const head = buildHead(); head.osso.forEach(m => (m.visible = false));
    const place = box.dataset.regiao === 'hipocampo', arena = box.querySelector('canvas.arena');
    if (place) {
      /* --- place cells: each lights up when the rat is in «its» corner of the arena (O'Keefe and Dostrovsky, 1971) --- */
      head.mats.cortex.opacity = 0.12; head.mats.cortex.depthWrite = false;
      for (const k of ['talamo', 'amigdala', 'cerebelo']) head[k].forEach(m => (m.visible = false));
      const FIELDS = [{ x: 0.25, y: 0.27, cor: 0xF0A673 }, { x: 0.74, y: 0.3, cor: 0xFFD34E }, { x: 0.7, y: 0.75, cor: 0x8FC4E8 }, { x: 0.27, y: 0.72, cor: 0xE58FB5 }];
      // four real points of the surface of each hippocampus, from front to back
      const cells = [];
      for (const name of ['hipocampo_d', 'hipocampo_e']) {
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
      stage.label('<b>hipocampo</b>guardar memórias novas', head.anchor([c[0] + 6, c[1] - 6, c[2] + 20]), s => s === 0);
      stage.label('<b>células de lugar</b>cada uma dispara num sítio', head.anchor([c[0] + 6, c[1] - 6, c[2] + 20]), s => s >= 1, 'conceito');
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
      stage.label('<b>córtex pré-motor</b>prepara o gesto', head.anchor([-62, 26, 10]), () => true, 'baixo');
      stage.label('<b>córtex parietal inferior</b>', head.anchor([-62, -46, 62]), () => true);
      stage.label('córtex visual', head.anchor([-22, -104, 20]), s => s === 1, 'peq');
    }
  };

  /* ---------- 22. bobo: Bandura's doll, in 1961 and in 1965 (degrau 5) ---------- */
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

  /* ---------- 23. kolb: learning goes round a cycle of four moments (lesson 8) ---------- */
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
    const cam = director(stage.camera, [{ at: V(0, 0.95, 0), from: V(0, 6.6, 11.2) }, { at: V(0, 0.75, 0.2), from: V(0, 8.6, 9.2) }]);
    STOPS.forEach((s, i) => {
      const top = i === 2 ? spot(s.g, 0.55, 0.8, 0.3) : spot(s.g, 0, 1.4, 0);            // the nearest moment is named beside its ball, not over it
      stage.label(`<b>${s.nome}</b>${s.tipo}`, top, st => st >= i + 1 && st !== i + 1 && st < 6, i === 2 ? 'lado' : '');
      stage.label(`<b>${s.nome}</b>${s.tipo}<br><i>${s.ex}</i>`, top, st => st === i + 1, 'conceito' + (i === 2 ? ' lado' : ''));
      stage.label(`<b>${s.nome}</b>`, top, st => st >= 6, i === 2 ? 'lado' : '');
    });
    STYLES.forEach(s => stage.label(`<b>${s.nome}</b>`, s.at, st => st >= 6, 'conceito'));
    stage.label('cada volta melhora a seguinte', spot(world, 0, 0.9, 0), st => st === 5, 'peq');
  };

  /* ---------- 24. Start every scene present in the page ---------- */
  for (const box of boxes) { const make = SCENES[box.dataset.cena]; if (make) make(box); }
})();
