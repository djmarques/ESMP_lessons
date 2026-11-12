/* =====================================================================
   app.js — comportamento do site da aula (sem frameworks, sem build).
   ---------------------------------------------------------------------
   Everything here is generic: slides, steps and components are found
   through classes and data attributes in index.html, so a new slide is
   added by writing HTML only. Sections:
     1. Slide registry and sidebar
     2. Navigation (slides + step builds) and address fragments
     3. Components: counters, flip cards, polls, quizzes, games, timers,
        research tasks (QR codes), checklists
     4. Teacher notes panel
     5. Input: keyboard, buttons, swipe
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- 1. Slide registry and sidebar -------------------------- */
  const stage = document.querySelector('.stage');
  const slides = Array.from(document.querySelectorAll('.slide'));
  const toc = document.querySelector('.toc');
  const progress = document.querySelector('.progress span');
  const counter = document.querySelector('.nav .count');
  const notesPanel = document.querySelector('.notes');
  const notesBody = notesPanel.querySelector('.body');
  let index = 0;                       // current slide
  const stepOf = new Map();            // slide element -> current step number

  /** Highest data-step value inside a slide (0 if the slide has no builds). */
  function maxStep(slide) {
    return Array.from(slide.querySelectorAll('[data-step]'))
      .reduce((m, el) => Math.max(m, Number(el.dataset.step)), Number(slide.dataset.steps || 0));   // data-steps: steps that only move things
  }

  /** Build the sidebar: one heading per data-lesson, one link per slide. */
  function buildToc() {
    let lesson = null;
    slides.forEach((s, i) => {
      if (s.dataset.lesson !== lesson) {
        lesson = s.dataset.lesson;
        const h = document.createElement('h2');
        h.textContent = lesson;
        toc.appendChild(h);
      }
      const a = document.createElement('a');
      a.href = '#' + s.id;
      a.innerHTML = '<span class="n">' + (i + 1) + '</span><span></span>';
      a.lastChild.textContent = s.dataset.title || s.id;
      a.addEventListener('click', () => document.body.classList.remove('menu-open'));
      toc.appendChild(a);
    });
  }

  /* ---------- 2. Navigation ----------------------------------------- */

  /** Apply step n to a slide: reveal every [data-step] <= n and start the
      counters that have just become visible. */
  function setStep(slide, n) {
    stepOf.set(slide, n);
    // animated scenes: class ge1…geN = «step is at least k» (see «Cenas animadas» in style.css)
    for (let k = 1, m = maxStep(slide); k <= m; k++) slide.classList.toggle('ge' + k, n >= k);
    slide.querySelectorAll('[data-step]').forEach(el => {
      const on = Number(el.dataset.step) <= n;
      if (on && !el.classList.contains('on') && el.dataset.count) runCounter(el);
      el.classList.toggle('on', on);
    });
  }

  /** Show slide i. `atEnd` reveals all of its steps (used when going back). */
  function show(i, atEnd) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    const slide = slides[index];
    slides.forEach(s => s.classList.toggle('current', s === slide));
    setStep(slide, atEnd ? maxStep(slide) : 0);
    stage.classList.toggle('on-divider', slide.classList.contains('divider'));
    stage.classList.toggle('on-dark', slide.classList.contains('dark'));   // navy divider (title slide)
    stage.scrollTop = 0;
    toc.querySelectorAll('a').forEach((a, k) => a.setAttribute('aria-current', String(k === index)));
    const cur = toc.querySelector('a[aria-current="true"]');
    if (cur) cur.scrollIntoView({ block: 'nearest' });   // keep the current slide visible in a long index
    progress.style.width = ((index + 1) / slides.length * 100) + '%';
    counter.textContent = (index + 1) + ' / ' + slides.length;
    notesBody.textContent = (window.NOTES && window.NOTES[slide.id]) || 'Sem notas para este slide.';
    if (location.hash !== '#' + slide.id) history.replaceState(null, '', '#' + slide.id);
    // slides with no builds have nothing hidden, so counters start at once
    slide.querySelectorAll('[data-count]:not([data-step])').forEach(runCounter);
  }

  /** Next: reveal the next step if there is one, otherwise go to the next slide. */
  function next() {
    const slide = slides[index], n = stepOf.get(slide) || 0;
    if (n < maxStep(slide)) setStep(slide, n + 1); else if (index < slides.length - 1) show(index + 1);
  }

  /** Previous: hide the last step if any is shown, otherwise go back one slide
      with all of its steps visible (as the presenter left it). */
  function prev() {
    const slide = slides[index], n = stepOf.get(slide) || 0;
    if (n > 0) setStep(slide, n - 1); else if (index > 0) show(index - 1, true);
  }

  /** Slide index for the current address fragment (#s-...), or 0. */
  function fromHash() {
    const k = slides.findIndex(s => '#' + s.id === location.hash);
    return k < 0 ? 0 : k;
  }

  /* ---------- 3. Components ----------------------------------------- */

  /** Counter: animates from 0 to data-count, formatted with a space as the
      thousands separator (Portuguese convention: 14 476). */
  function runCounter(el) {
    const target = Number(el.dataset.count);
    const fmt = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(target); return; }
    const t0 = performance.now(), dur = 1400;
    (function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));   // ease-out cubic
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /** Flip cards: a click turns the card; the state lives in the .open class. */
  document.querySelectorAll('.flip').forEach(card => {
    card.setAttribute('aria-pressed', 'false');
    card.addEventListener('click', () => {
      const open = card.classList.toggle('open');
      card.setAttribute('aria-pressed', String(open));
    });
  });

  /** Polls: the teacher counts raised hands with + and −; each bar shows its
      share of the total votes. */
  document.querySelectorAll('.poll').forEach(poll => {
    const opts = Array.from(poll.querySelectorAll('.opt'));
    const redraw = () => {
      const counts = opts.map(o => Number(o.querySelector('output').value || 0));
      const total = counts.reduce((a, b) => a + b, 0);
      opts.forEach((o, k) => { o.querySelector('.track span').style.width = total ? (counts[k] / total * 100) + '%' : '0'; });
    };
    opts.forEach(o => {
      const out = o.querySelector('output');
      out.value = 0;
      o.querySelectorAll('button').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        out.value = Math.max(0, Number(out.value) + Number(b.dataset.d));
        redraw();
      }));
    });
  });

  /** Quizzes: each .q holds its answer in data-answer and the explanation in
      .why. One attempt per question; the score updates as students answer. */
  document.querySelectorAll('.quiz').forEach(quiz => {
    const qs = Array.from(quiz.querySelectorAll('.q'));
    const score = quiz.querySelector('.score output');
    const update = () => { score.value = qs.filter(q => q.classList.contains('correct')).length; };
    qs.forEach(q => q.querySelectorAll('.opts button').forEach(b => b.addEventListener('click', () => {
      if (q.classList.contains('done')) return;
      const right = b.dataset.opt === q.dataset.answer;
      b.classList.add(right ? 'right' : 'wrong');
      q.querySelector('[data-opt="' + q.dataset.answer + '"]').classList.add('right');
      q.querySelectorAll('.opts button').forEach(x => { x.disabled = true; });
      q.classList.add('done');
      q.classList.toggle('correct', right);
      right ? sfx.right() : sfx.wrong();   // same sounds as the games (sfx is defined further down)
      update();
    })));
    quiz.querySelector('[data-retry]').addEventListener('click', () => {
      qs.forEach(q => {
        q.classList.remove('done', 'correct');
        q.querySelectorAll('.opts button').forEach(x => { x.disabled = false; x.classList.remove('right', 'wrong'); });
      });
      update();
    });
    update();
  });

  /** Games: timed multiple choice, one question at a time, like a quiz show.
      Each .gq holds its answer in data-answer. Points: 100 for a right answer
      plus up to 50 for speed. Sounds are synthesised with the Web Audio API
      (no sound files); the speaker button mutes them for the whole site. */
  let audio = null, muted = false;
  try { muted = localStorage.getItem('jogo-som') === 'off'; } catch (e) { /* storage unavailable */ }
  function tone(freq, start, dur, type, vol, slideTo) {
    if (muted) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime + start, o = audio.createOscillator(), g = audio.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* no audio: the game still works */ }
  }
  const sfx = {
    right: () => { tone(659, 0, 0.12, 'triangle', 0.25); tone(988, 0.11, 0.25, 'triangle', 0.25); },
    wrong: () => { tone(220, 0, 0.35, 'sawtooth', 0.12, 110); },
    tick: () => tone(1200, 0, 0.05, 'square', 0.05),
    start: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.14, 'triangle', 0.2)),
    end: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, i === 3 ? 0.5 : 0.16, 'triangle', 0.22))
  };
  document.querySelectorAll('.game').forEach(game => {
    const qs = Array.from(game.querySelectorAll('.gq'));
    const total = Number(game.dataset.seconds || 20);
    const $ = sel => game.querySelector(sel);
    const bar = $('.gtimer span'), clock = $('.gtimer output'), nextBtn = $('.gnext');
    const slide = game.closest('.slide');
    let i = -1, left = total, id = null, points = 0, streak = 0, right = 0, answered = false;
    const paintHead = () => {
      $('.gcount b').textContent = Math.max(1, i + 1);
      $('.gscore b').textContent = points;
      $('.gstreak').textContent = streak >= 2 ? streak + ' seguidas!' : '';
    };
    const paintClock = () => {
      clock.textContent = left;
      bar.style.width = (left / total * 100) + '%';
      game.classList.toggle('hurry', left <= 5 && !answered);
    };
    const stop = () => { clearInterval(id); id = null; };
    function reveal(choice) {
      if (answered) return;
      answered = true; stop();
      const q = qs[i], ok = choice && choice.dataset.opt === q.dataset.answer;
      q.querySelector('[data-opt="' + q.dataset.answer + '"]').classList.add('right');
      if (choice && !ok) choice.classList.add('wrong');
      q.querySelectorAll('.gopts button').forEach(b => { b.disabled = true; });
      q.classList.add('done');
      const verdict = q.querySelector('.gverdict');
      if (ok) { right++; streak++; const gain = 100 + Math.round(50 * left / total); points += gain; verdict.textContent = 'Certo! +' + gain; sfx.right(); }
      else { streak = 0; verdict.textContent = choice ? 'Errado.' : 'Acabou o tempo!'; sfx.wrong(); }
      game.classList.toggle('was-right', !!ok); game.classList.toggle('was-wrong', !ok);
      game.classList.remove('hurry');
      paintHead();
      nextBtn.hidden = false;
      nextBtn.textContent = i === qs.length - 1 ? 'Ver resultado' : 'Seguinte →';
    }
    function ask(n) {
      qs.forEach((q, k) => { q.hidden = k !== n; });
      i = n; left = total; answered = false;
      game.classList.remove('was-right', 'was-wrong');
      nextBtn.hidden = true;
      paintHead(); paintClock(); stop();
      id = setInterval(() => {
        if (!slide.classList.contains('current')) return;      // paused while the slide is not shown
        left = Math.max(0, left - 1); paintClock();
        if (left > 0 && left <= 5) sfx.tick();
        if (!left) reveal(null);
      }, 1000);
    }
    function finish() {
      stop(); qs.forEach(q => { q.hidden = true; });
      game.classList.remove('playing', 'was-right', 'was-wrong'); game.classList.add('over');
      nextBtn.hidden = true;
      $('.gfinal').innerHTML = '<b>' + right + ' / ' + qs.length + '</b> certas · <b>' + points + '</b> pontos';
      $('.gend').hidden = false; sfx.end();
    }
    function begin() {
      points = 0; streak = 0; right = 0;
      qs.forEach(q => {
        q.classList.remove('done');
        q.querySelectorAll('.gopts button').forEach(b => { b.disabled = false; b.classList.remove('right', 'wrong'); });
      });
      $('.gstart').hidden = true; $('.gend').hidden = true;
      game.classList.remove('over'); game.classList.add('playing');
      sfx.start(); ask(0);
    }
    $('.gbegin').addEventListener('click', begin);
    $('.gagain').addEventListener('click', begin);
    nextBtn.addEventListener('click', () => (i < qs.length - 1 ? ask(i + 1) : finish()));
    qs.forEach(q => q.querySelectorAll('.gopts button').forEach(b => b.addEventListener('click', () => reveal(b))));
    game._choose = k => { const b = qs[i] && qs[i].querySelectorAll('.gopts button')[k]; if (b && !answered) reveal(b); };
    game._next = () => { if (!nextBtn.hidden) nextBtn.click(); };
    const snd = $('.gsound');
    const paintSound = () => { document.querySelectorAll('.gsound').forEach(x => { x.setAttribute('aria-pressed', String(!muted)); x.classList.toggle('off', muted); }); };
    snd.addEventListener('click', () => { muted = !muted; try { localStorage.setItem('jogo-som', muted ? 'off' : 'on'); } catch (e) {} paintSound(); });
    paintSound(); paintHead(); paintClock();
  });

  /** Timers: countdown from data-seconds. The last fifth turns orange and
      the display blinks at zero, so the room sees time running out. */
  document.querySelectorAll('.timer').forEach(timer => {
    const total = Number(timer.dataset.seconds);
    const out = timer.querySelector('output');
    const start = timer.querySelector('button:not([data-reset])');
    let left = total, id = null;
    const paint = () => {
      out.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      timer.classList.toggle('ending', left > 0 && left <= total / 5);
      timer.classList.toggle('over', left === 0);
    };
    const stop = () => { clearInterval(id); id = null; start.textContent = left ? 'Continuar' : 'Iniciar'; };
    start.addEventListener('click', () => {
      if (id) return stop();
      if (left === 0) left = total;
      start.textContent = 'Pausar';
      id = setInterval(() => { left = Math.max(0, left - 1); paint(); if (!left) stop(); }, 1000);
    });
    timer.querySelector('[data-reset]').addEventListener('click', () => { stop(); left = total; start.textContent = 'Iniciar'; paint(); });
    paint();
  });

  /** Research tasks: draw a QR code and a short link for data-url, and let
      the teacher reveal the answer. Without the QR library (offline) the
      link alone still works. */
  document.querySelectorAll('.research').forEach(task => {
    const url = task.dataset.url;
    const link = task.querySelector('.qr a');
    link.href = url;
    link.textContent = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    if (window.QRCode) new QRCode(task.querySelector('.qr .code'), { text: url, width: 400, height: 400, colorDark: '#1E2A33', colorLight: '#FFFFFF' });
    const btn = task.querySelector('[data-answer]'), ans = task.querySelector('.answer');
    btn.addEventListener('click', () => {
      const open = ans.classList.toggle('open');
      btn.textContent = open ? 'Esconder' : btn.dataset.label;
    });
    btn.dataset.label = btn.textContent;
  });

  /** Phone QR codes (slides «No telemóvel»): a QR code for the student page
      (aluno.html?a=…), resolved against the address the site is served from,
      so it works on GitHub Pages without hard-coding the site's URL. Opened
      as a local file, there is no web address to encode: show a hint instead. */
  document.querySelectorAll('.phone-qr').forEach(box => {
    const url = new URL(box.dataset.path, location.href).href;
    const link = box.querySelector('a');
    link.href = url;
    if (!/^https?:/.test(url)) { link.textContent = 'O código QR aparece quando o site estiver publicado (GitHub Pages).'; return; }
    link.textContent = url.replace(/^https?:\/\/(www\.)?/, '');
    if (window.QRCode) new QRCode(box.querySelector('.code'), { text: url, width: 400, height: 400, colorDark: '#1E2A33', colorLight: '#FFFFFF' });
  });

  /** Checklists: each item toggles its own aria-pressed state. */
  document.querySelectorAll('.check').forEach(c => c.addEventListener('click', () => {
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
  }));

  /** «Teoria do corpo»: the body as a ship of Theseus, at two levels of
      organization. Every dot is one «plank»: navy = original, orange =
      replaced, light = just swapped.
      Level 0, the body: skin swaps about every 4 weeks, red blood cells every
      120 days, about 10 % of the skeleton per year, cortical neurons never.
      Level 1, inside one of those neurons: water (half replaced in about a
      week), most proteins (days or weeks), a few very long-lived proteins of
      the nuclear pores (years), and the DNA, which stays in place but is
      repaired all the time, so its atoms change too, slowly (illustrative rate).
      Each kind has a mean lifetime `life` in years; `exp` kinds are replaced at
      random (exponential) times, the others after a fixed lifetime. A seeded
      generator fixes the times, so the slider can go back and forth. */
  document.querySelectorAll('.corpo-sim').forEach(sim => {
    const svg = sim.querySelector('svg'), NS = 'http://www.w3.org/2000/svg';
    const range = sim.querySelector('input[type=range]'), play = sim.querySelector('.corpo-play'), clock = sim.querySelector('.corpo-clock');
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const KIND = {
      pele: { life: 28 / 365 }, sangue: { life: 120 / 365 }, osso: { life: 1 / 0.105, exp: true, once: true }, neuro: { life: Infinity },
      agua: { life: 7.5 / 365 / Math.LN2, exp: true }, prot: { life: 30 / 365, exp: true }, poro: { life: 8, exp: true, once: true }, adn: { life: 40, exp: true, once: true }   // repair swaps nucleotides slowly; the rate is illustrative
    };
    const layer = [0, 1].map(v => { const g = document.createElementNS(NS, 'g'); svg.appendChild(g); return g; });
    const make = (v, tag, attrs) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); layer[v].appendChild(el); return el; };
    const dots = [];
    const dot = (v, t, x, y, r) => {
      const el = make(v, 'circle', { cx: x.toFixed(1), cy: y.toFixed(1), r }), k = KIND[t], u = rnd();
      const first = k.life === Infinity ? Infinity : k.exp ? -Math.log(1 - u) * k.life : u * k.life;
      dots.push({ el, v, t, first, r });
    };
    const rad = a => a * Math.PI / 180;
    // ----- level 0: the body (head and trunk, like the figures in the other scenes)
    const HX = 180, HY = 78, HR = 52, TOP = 150, BOT = 410, half = y => 48 + (y - TOP) / (BOT - TOP) * 52;
    for (let a = 0; a < 360; a += 12) dot(0, 'pele', HX + HR * Math.cos(rad(a)), HY + HR * Math.sin(rad(a)), 5);
    for (let y = TOP; y <= BOT; y += 13) { dot(0, 'pele', HX - half(y), y, 5); dot(0, 'pele', HX + half(y), y, 5); }
    for (let x = HX - 88; x <= HX + 88; x += 14.6) dot(0, 'pele', x, BOT + 6, 5);
    for (let x = HX - 38; x <= HX + 38; x += 12.6) dot(0, 'pele', x, TOP - 8, 5);
    for (let y = HY - 30; y <= HY + 30; y += 12) for (let x = HX - 30; x <= HX + 30; x += 12) if (Math.hypot(x - HX, y - HY) < 36) dot(0, 'neuro', x, y, 4.6);
    for (let y = TOP + 12; y <= BOT - 14; y += 14) { dot(0, 'osso', HX - 7, y, 5.4); dot(0, 'osso', HX + 7, y, 5.4); }
    for (let k = 0; k < 4; k++) for (let s = -1; s <= 1; s += 2) for (let j = 1; j <= 2; j++) dot(0, 'osso', HX + s * (7 + j * 15), TOP + 34 + k * 30 - j * 4, 4.6);
    for (let y = TOP + 14; y <= BOT - 14; y += 15) for (let x = HX - half(y) + 16; x <= HX + half(y) - 16; x += 15)
      if ((Math.abs(x - HX) > 44 || y > TOP + 150) && Math.abs(x - HX) > 16) dot(0, 'sangue', x + (rnd() - .5) * 5, y + (rnd() - .5) * 5, 3.6);
    // ----- level 1: one neuron (cell body, nucleus, dendrites above, axon below)
    const CX = 180, CY = 190, CR = 100, NR = 40;
    ['M110,118 L60,40 M60,40 L30,30 M60,40 L70,10', 'M250,118 L300,40 M300,40 L330,30 M300,40 L290,10', 'M180,90 L180,20', 'M180,290 L180,425']
      .forEach(d => make(1, 'path', { d, class: 'shape' }));
    make(1, 'circle', { cx: CX, cy: CY, r: CR, class: 'shape' }); make(1, 'circle', { cx: CX, cy: CY, r: NR, class: 'shape' });
    for (let y = CY - 90; y <= CY + 90; y += 14) for (let x = CX - 90; x <= CX + 90; x += 14) {                       // water, everywhere in the cytoplasm
      const d = Math.hypot(x - CX, y - CY); if (d < CR - 12 && d > NR + 20) dot(1, 'agua', x + (rnd() - .5) * 4, y + (rnd() - .5) * 4, 3.1);
    }
    for (let y = 300; y <= 420; y += 14) dot(1, 'agua', CX + (rnd() - .5) * 6, y, 3.1);                               // water along the axon
    for (let a = 0; a < 360; a += 15) dot(1, 'prot', CX + (CR - 1) * Math.cos(rad(a)), CY + (CR - 1) * Math.sin(rad(a)), 5.2);   // membrane proteins
    for (let a = 8; a < 360; a += 30) dot(1, 'prot', CX + 68 * Math.cos(rad(a)), CY + 68 * Math.sin(rad(a)), 4.6);                // proteins in the cytoplasm
    for (let a = 0; a < 360; a += 36) dot(1, 'poro', CX + NR * Math.cos(rad(a)), CY + NR * Math.sin(rad(a)), 4.4);                // nuclear pores
    for (let y = CY - 24; y <= CY + 24; y += 9.5) for (let x = CX - 24; x <= CX + 24; x += 9.5) if (Math.hypot(x - CX, y - CY) < 28) dot(1, 'adn', x, y, 3.4);   // DNA
    const C = { o: '#1E2A33', n: '#A44A16', f: '#F0A673' };
    const fmt = t => { if (t < 0.02) return 'Hoje'; const y = Math.floor(t + 1e-9), m = Math.floor((t - y) * 12 + 1e-9);
      return 'Daqui a ' + (y ? y + (y === 1 ? ' ano' : ' anos') : '') + (y && m ? ' e ' : '') + (m ? m + (m === 1 ? ' mês' : ' meses') : (y ? '' : 'menos de 1 mês')); };
    let T = 0, V = 0;   // years elapsed; level shown
    function paint() {
      const t = T, stat = {};
      dots.forEach(d => {
        const k = KIND[d.t], orig = t < d.first, since = orig || k.once ? Infinity : (t - d.first) % k.life;
        const flash = !orig && (k.once ? t - d.first < 0.06 : since < Math.min(0.045, k.life * 0.4));
        if (d.v === V) { d.el.setAttribute('fill', orig ? C.o : flash ? C.f : C.n); d.el.setAttribute('r', flash ? d.r * 1.35 : d.r); }
        const s = stat[d.t] = stat[d.t] || { n: 0, o: 0 }; s.n++; if (orig) s.o++;
      });
      sim.querySelectorAll('.corpo-row').forEach(row => {
        row.hidden = Number(row.dataset.v) !== V;
        const k = row.dataset.t, s = stat[k], pct = Math.round(s.o / s.n * 100), times = KIND[k].once ? 0 : Math.floor(t / KIND[k].life);
        row.querySelector('.tr i').style.width = pct + '%';
        if (k === 'adn') { row.classList.add('nobar'); row.querySelector('output').innerHTML = '<b>o mais lento de todos</b><br>não há um valor medido'; return; }
        row.querySelector('output').innerHTML = '<b>' + pct + ' %</b> de tábuas originais' + (times >= 1 ? '<br>já trocou ' + times + (times === 1 ? ' vez' : ' vezes') : '');
      });
      layer.forEach((g, v) => { g.style.display = v === V ? '' : 'none'; });
      clock.textContent = fmt(t);
    }
    let raf = null, last = 0;
    const stop = () => { cancelAnimationFrame(raf); raf = null; play.textContent = T >= 10 ? 'Ver outra vez' : 'Deixar passar o tempo'; };
    const tick = now => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      // the first months run slowly (skin, blood, water and proteins are the story), the rest faster
      const speed = T < 0.25 ? 0.05 : T < 1 ? 0.14 : 0.6;
      T = Math.min(10, T + dt * speed); range.value = T; paint();
      if (T >= 10 || !sim.closest('.slide').classList.contains('current')) return stop();
      raf = requestAnimationFrame(tick);
    };
    play.addEventListener('click', e => {
      e.stopPropagation();
      if (raf) return stop();
      if (T >= 10) { T = 0; range.value = 0; }
      play.textContent = 'Pausa'; last = performance.now(); raf = requestAnimationFrame(tick);
    });
    range.addEventListener('input', () => { T = Number(range.value); paint(); });
    sim.querySelectorAll('.corpo-level input').forEach(r => r.addEventListener('change', () => { V = Number(r.value); paint(); }));
    sim.querySelector('.corpo-reset').addEventListener('click', e => { e.stopPropagation(); stop(); T = 0; range.value = 0; play.textContent = 'Deixar passar o tempo'; paint(); });
    paint();
  });

  /* ---------- 4. Teacher notes -------------------------------------- */
  /** Toggle the notes panel (N key or the "Notas" button). */
  function toggleNotes() { notesPanel.classList.toggle('open'); }

  /* ---------- 5. Input ---------------------------------------------- */
  document.addEventListener('keydown', e => {
    // never hijack keys while a button or field has focus inside a component
    if (e.target.closest('input, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    // in a running game: keys 1–4 choose an option, Enter goes to the next question
    const g = slides[index] && slides[index].querySelector('.game.playing');
    if (g && /^[1-4]$/.test(k)) { e.preventDefault(); g._choose(Number(k) - 1); return; }
    if (g && k === 'Enter' && !e.target.closest('button')) { e.preventDefault(); g._next(); return; }
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.target.closest('button'))) { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(slides.length - 1, true);
    else if (k === 'n' || k === 'N') toggleNotes();
    else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }
  });
  document.querySelector('.nav .next').addEventListener('click', next);
  document.querySelector('.nav .prev').addEventListener('click', prev);
  document.querySelector('.notes-btn').addEventListener('click', toggleNotes);
  document.querySelector('.menu-btn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  window.addEventListener('hashchange', () => { if (fromHash() !== index) show(fromHash()); });

  // Swipe: a horizontal drag of more than 60 px changes step/slide
  let x0 = null;
  stage.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
  });

  buildToc();
  show(fromHash());
})();
