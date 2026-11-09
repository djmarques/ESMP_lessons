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
      .reduce((m, el) => Math.max(m, Number(el.dataset.step)), 0);
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

  /* ---------- Psychology simulations (Module 4) ------------------------ */
  /* Each simulation is switched on by its class and needs no per-slide code.
     They reuse tone() from the games (Web Audio, muted with the speaker button). */
  const onSlide = el => el.closest('.slide').classList.contains('current');

  /** Habituation: every press of "Tocar" plays the same sound; the startle
      response (a new bar) shrinks each time. "Outro som" restores it. */
  document.querySelectorAll('.habit').forEach(sim => {
    const chart = sim.querySelector('.hbarsv'), out = sim.querySelector('output');
    let level = 100, n = 0;
    const add = () => {
      if (n >= 10) return;
      n++; tone(880, 0, 0.35, 'square', 0.12, 660);
      const b = document.createElement('span');
      b.style.setProperty('--h', level + '%'); b.title = 'susto: ' + Math.round(level);
      chart.append(b);
      out.textContent = n === 1 ? 'Primeiro som: grande susto.' : level < 15 ? 'Já quase não reage: habituou-se.' : 'O susto diminui…';
      level = Math.max(4, level * 0.6);
    };
    sim.querySelector('[data-act=tocar]').addEventListener('click', add);
    sim.querySelector('[data-act=reset]').addEventListener('click', () => { chart.innerHTML = ''; level = 100; n = 0; out.textContent = 'Carrega em «Tocar a sirene».'; });
  });

  /** Classical conditioning: bell, food, or both. Each pairing strengthens the
      bell→food association; the bell alone weakens it (extinction). */
  document.querySelectorAll('.pavlov').forEach(sim => {
    let assoc = 0, pairs = 0;
    const $ = s => sim.querySelector(s);
    const show = (saliva, what) => {
      sim.style.setProperty('--saliva', saliva);
      sim.style.setProperty('--assoc', assoc);
      $('.p-pairs').textContent = pairs;
      const cond = assoc >= 0.5;
      $('.p-bell').textContent = cond ? 'estímulo condicionado (EC)' : 'estímulo neutro (EN)';
      $('.p-bell').classList.toggle('learned', cond);
      $('.p-msg').innerHTML = what;
      sim.classList.remove('drool'); void sim.offsetWidth; if (saliva > 0.15) sim.classList.add('drool');
    };
    const bell = () => { tone(1320, 0, 0.5, 'sine', 0.2); tone(1760, 0.05, 0.45, 'sine', 0.1); };
    sim.querySelector('[data-act=bell]').addEventListener('click', () => {
      bell(); const s = assoc;
      assoc = Math.max(0, assoc * 0.8);                                  // extinction
      show(s, s >= 0.5 ? 'Só a campainha, e o cão saliva: <b>resposta condicionada (RC)</b>.' : s > 0.15 ? 'Só a campainha: saliva um pouco. A associação ainda é fraca.' : 'Só a campainha: nada. Ainda é um <b>estímulo neutro</b>.');
    });
    sim.querySelector('[data-act=food]').addEventListener('click', () => show(1, 'Só a comida: saliva logo. <b>EI → RI</b>, sem aprendizagem.'));
    sim.querySelector('[data-act=both]').addEventListener('click', () => {
      bell(); pairs++; assoc = Math.min(1, assoc + (1 - assoc) * 0.3);
      show(1, 'Campainha logo antes da comida: a associação fica mais forte.');
    });
    sim.querySelector('[data-act=reset]').addEventListener('click', () => { assoc = 0; pairs = 0; show(0, 'Experimenta: começa só com a campainha.'); });
    show(0, 'Experimenta: começa só com a campainha.');
  });

  /** Operant conditioning in a Skinner box. The rat (an SVG drawing) wanders,
      walks to the lever, rears up and presses it; then the chosen consequence
      happens: food drops into the tray (with a sound), a loud noise stops, a
      shock, or food is taken away. Pressing becomes more or less likely. */
  document.querySelectorAll('.skinner').forEach(sim => {
    let p = 0.12, id = null, presses = 0, hist = [], busy = false, mode = 'rp';
    const $ = s => sim.querySelector(s);
    const modeBtns = sim.querySelectorAll('[data-mode]');
    const msgs = { rp: 'Cada vez que carrega, cai comida no comedouro (acrescenta algo agradável).', rn: 'O som alto só para quando carrega na alavanca (retira algo desagradável).', pp: 'Cada vez que carrega, apanha um choque (acrescenta algo desagradável).', pn: 'Cada vez que carrega, a comida que estava no comedouro é retirada (retira algo agradável).' };
    const at = (x, rot = 0) => { sim.style.setProperty('--rx', x); sim.style.setProperty('--rot', rot + 'deg'); };
    const idleX = () => 320 - p * 190;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const sfx2 = {
      click: () => tone(320, 0, 0.05, 'square', 0.06),
      food: () => { tone(1500, 0, 0.08, 'sine', 0.25); tone(2100, 0.07, 0.14, 'sine', 0.2); tone(1700, 0.2, 0.08, 'triangle', 0.08); },
      crunch: () => { for (let k = 0; k < 3; k++) tone(260 + k * 40, k * 0.12, 0.05, 'square', 0.04); },
      shock: () => tone(95, 0, 0.35, 'sawtooth', 0.09),
      take: () => tone(520, 0, 0.35, 'triangle', 0.12, 260),
      buzz: () => tone(150, 0, 0.12, 'sawtooth', 0.025)
    };
    const paint = () => {
      $('.s-p').textContent = Math.round(p * 100) + ' %';
      $('.s-n').textContent = presses;
      $('.s-line').setAttribute('points', hist.map((v, i) => `${(i / 59) * 300},${70 - v * 66}`).join(' '));
    };
    const setMode = m => {
      mode = m; modeBtns.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mode === m)));
      $('.s-msg').textContent = msgs[m];
      sim.classList.toggle('noise', m === 'rn');
      sim.classList.toggle('stocked', m === 'pn');
    };
    async function press() {
      busy = true;
      at(88, 0); sim.classList.add('walk'); await wait(650); sim.classList.remove('walk');
      at(88, 45); await wait(300);                                         // rears up
      sim.classList.add('ldown', 'lit'); sfx2.click(); presses++;
      await wait(250);
      if (mode === 'rp') {
        sim.classList.add('drop'); await wait(550); sfx2.food();           // food lands in the tray
        at(88, 0); sim.classList.remove('ldown'); await wait(250);
        at(209, 0); await wait(500); sim.classList.add('eat'); sfx2.crunch(); await wait(900);
        sim.classList.remove('eat', 'drop');
        p += (0.92 - p) * 0.18;
      } else if (mode === 'rn') {
        sim.classList.remove('noise'); await wait(300); at(88, 0); sim.classList.remove('ldown'); await wait(1300);
        p += (0.92 - p) * 0.18;
        if (mode === 'rn') sim.classList.add('noise');
      } else if (mode === 'pp') {
        sim.classList.add('shock'); sfx2.shock(); at(88, -10); await wait(200); at(250, 0); sim.classList.remove('ldown'); await wait(700);
        sim.classList.remove('shock');
        p = Math.max(0.02, p * 0.7);
      } else {
        sim.classList.add('takeaway'); sfx2.take(); at(88, 0); sim.classList.remove('ldown'); await wait(900);
        sim.classList.remove('takeaway');
        p = Math.max(0.02, p * 0.72);
      }
      sim.classList.remove('ldown', 'lit');
      at(idleX(), 0); await wait(500);
      busy = false;
    }
    const tick = () => {
      if (!onSlide(sim) || busy) return;
      if (mode === 'rn' && sim.classList.contains('noise')) sfx2.buzz();
      if (Math.random() < p) press().then(paint);
      else at(Math.max(130, Math.min(320, idleX() + (Math.random() * 40 - 20))), 0);
      hist.push(p); if (hist.length > 60) hist.shift();
      paint();
    };
    modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('[data-act=run]').addEventListener('click', e => {
      if (id) { clearInterval(id); id = null; e.target.textContent = 'Continuar'; return; }
      id = setInterval(tick, 750); e.target.textContent = 'Pausar';
    });
    $('[data-act=one]').addEventListener('click', () => { if (!busy) press().then(paint); });
    $('[data-act=reset]').addEventListener('click', () => { p = 0.12; presses = 0; hist = []; at(idleX(), 0); paint(); });
    setMode('rp'); at(idleX(), 0); paint();
  });

  /** Motivation and performance (inverted U): the slider moves a dot along
      the curve; the label names the zone. */
  document.querySelectorAll('.yd').forEach(sim => {
    const r = sim.querySelector('input'), lab = sim.querySelector('.yd-zone');
    const up = () => {
      const m = Number(r.value), y = 1 - ((m - 50) / 50) ** 2;
      sim.style.setProperty('--x', m); sim.style.setProperty('--y', y.toFixed(3));
      lab.textContent = m < 30 ? 'Motivação fraca: aprende-se devagar.' : m > 70 ? 'Motivação muito forte: a ansiedade atrapalha.' : 'Motivação média: a aprendizagem corre melhor.';
    };
    r.addEventListener('input', up); up();
  });

  /** Reinforcement or punishment? Two questions, one answer cell. */
  document.querySelectorAll('.matrix2').forEach(m => {
    const pick = () => {
      const a = m.querySelector('[name$=stim]:checked'), b = m.querySelector('[name$=beh]:checked');
      m.querySelectorAll('.cell').forEach(c => c.classList.toggle('hit', !!a && !!b && c.dataset.cell === a.value + b.value));
      m.classList.toggle('done', !!a && !!b);
    };
    m.querySelectorAll('input').forEach(i => i.addEventListener('change', pick));
  });

  /** Learning-style questionnaire (Kolb): six choices, two axes, one quadrant. */
  document.querySelectorAll('.kolb').forEach(k => {
    const res = k.querySelector('.k-res');
    const up = () => {
      let doo = 0, see = 0, feel = 0, think = 0;
      k.querySelectorAll('input:checked').forEach(i => { ({ fazer: () => doo++, observar: () => see++, sentir: () => feel++, pensar: () => think++ })[i.value](); });
      const answered = k.querySelectorAll('input:checked').length;
      const style = (feel >= think ? (doo > see ? 'adaptador' : 'divergente') : (doo > see ? 'convergente' : 'assimilador'));
      k.querySelectorAll('.k-quad').forEach(q => q.classList.toggle('hit', answered === 6 && q.dataset.style === style));
      res.textContent = answered < 6 ? `Responde às seis (${answered}/6).` : `A tua preferência parece ser o estilo ${style}. Não é um diagnóstico: todos passamos pelos quatro momentos.`;
    };
    k.querySelectorAll('input').forEach(i => i.addEventListener('change', up));
    k.querySelector('[data-act=reset]').addEventListener('click', () => { k.querySelectorAll('input').forEach(i => { i.checked = false; }); up(); });
    up();
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
    if (!btn) return;                      // a QR code alone (no question to answer)
    btn.addEventListener('click', () => {
      const open = ans.classList.toggle('open');
      btn.textContent = open ? 'Esconder' : btn.dataset.label;
    });
    btn.dataset.label = btn.textContent;
  });

  /** Simulations: each range input inside a .sim writes its value to a CSS
      custom property (--name) on the .sim, so the drawing reacts in CSS; every
      [data-calc] element shows a small formula of those values. Only names,
      numbers and + - * / ( ) are allowed in a formula. Inputs marked data-deg
      also expose name_cos (cosine of the angle in degrees). */
  const nf = (v, dec) => v.toLocaleString('pt-PT', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/\u00A0|\u202F/g, '\u00A0');
  function calc(expr, vars) {
    const js = expr.replace(/[A-Za-z_]\w*/g, k => (k in vars ? '(' + vars[k] + ')' : 'NaN'));
    if (!/^[\d.\s+\-*/()NaN]+$/.test(js)) return NaN;
    return Function('return ' + js)();
  }
  document.querySelectorAll('.sim').forEach(sim => {
    const inputs = Array.from(sim.querySelectorAll('input[type=range]'));
    const outs = Array.from(sim.querySelectorAll('[data-calc]'));
    const update = () => {
      const v = {};
      inputs.forEach(i => {
        v[i.name] = Number(i.value);
        if (i.hasAttribute('data-deg')) v[i.name + '_cos'] = Math.cos(v[i.name] * Math.PI / 180);
        sim.style.setProperty('--' + i.name, i.value);
      });
      outs.forEach(o => { o.textContent = nf(calc(o.dataset.calc, v), Number(o.dataset.dec || 0)); });
    };
    inputs.forEach(i => i.addEventListener('input', update));
    update();
  });

  /** Checklists: each item toggles its own aria-pressed state. */
  document.querySelectorAll('.check').forEach(c => c.addEventListener('click', () => {
    c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
  }));

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
