/* =====================================================================
   neuro3d.js — the 3D scenes of «Por dentro do cérebro» and of Degrau 1
   (habituação), Psicologia, Módulo 4. Loaded after app.js.

   A scene lives in <div class="palco3d" data-cena="NAME"> inside a slide:

     caixa      the «black box» opens: skull → cortex → prefrontal → deep structures
     neuronio   one neuron talks to another: impulse, synapse, neurotransmitter
     rede       mini-game: practise a path and its connections grow; stop, and they are pruned
     cortex     the cortex gets thinner from 3 to 20 years (Piccolo and colleagues, 2016),
                with a simplified plot built step by step and an age slider
     medir      how brain activity is measured: EEG, fMRI, and the path of a sound
     sirene     habituation: play the siren and watch the brain's response shrink
     lesma      Kandel's sea slug (Aplysia): the gill-withdrawal reflex habituates

   Anatomy is real, not drawn: it is the file cp4/cerebro3d-dados.js (FreeSurfer fsaverage cortex
   and deep structures, BodyParts3D skull), in millimetres of the MNI305 template
   (x → right, y → front, z → up). Neurons, the network and the sea slug are schematic models.

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
      camera.setViewOffset(width, height, 0, height * (box.querySelector('.leg3d') ? 0.14 : 0), width, height); camera.updateProjectionMatrix(); }
    const currentStep = () => { let k = 0; while (slide.classList.contains('ge' + (k + 1))) k++; return k; };
    function frame(time) {
      if (!slide.classList.contains('current')) { running = false; return; }
      requestAnimationFrame(frame);
      const dt = Math.min((time - last) / 1000 || 0.016, 0.05); last = time;
      const s = currentStep(); if (s !== step) { step = s; stepAt = time; }
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
  /** Camera that eases towards shots[step] = { at, from } (already in scene units), with a slow sway. */
  function director(camera, shots) {
    const look = shots[0].at.clone(), eye = shots[0].from.clone(), q = new T.Vector3();
    camera.position.copy(eye);
    return function (step, dt, time) {
      const shot = shots[Math.min(step, shots.length - 1)], k = calm ? 1 : 1 - Math.exp(-dt * 2.2);
      look.lerp(shot.at, k);
      q.copy(shot.from).sub(shot.at).multiplyScalar(Math.max(1, 1.15 / camera.aspect)).add(shot.at);   // step back on tall, narrow screens
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

  /* ---------- 14. Start every scene present in the page ---------- */
  for (const box of boxes) { const make = SCENES[box.dataset.cena]; if (make) make(box); }
})();
