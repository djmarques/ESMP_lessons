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
    // data-steps on the slide adds steps that only move things (animated scenes)
    return Array.from(slide.querySelectorAll('[data-step]'))
      .reduce((m, el) => Math.max(m, Number(el.dataset.step)), Number(slide.dataset.steps || 0));
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
    // animated scenes: class ge1…geN = «step is at least k», so CSS can move
    // or transform things at a given step (see «Cenas animadas» in style.css)
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

  /** Phone QR codes (slides «No telemóvel»): a QR code for the shared student
      page (../../respostas/?f=…&a=…), resolved against the address the site
      is served from. Opened as a local file there is no web address to
      encode, so a hint is shown instead. */
  document.querySelectorAll('.phone-qr').forEach(box => {
    const url = new URL(box.dataset.path, location.href).href;
    const link = box.querySelector('a');
    link.href = url;
    if (!/^https?:/.test(url)) { link.textContent = 'O código QR aparece quando o site estiver publicado (GitHub Pages).'; return; }
    link.textContent = url.replace(/^https?:\/\/(www\.)?/, '');
    if (window.QRCode) new QRCode(box.querySelector('.code'), { text: url, width: 400, height: 400, colorDark: '#1E2A33', colorLight: '#FFFFFF' });
  });

  /** «Responder no telemóvel» buttons: open an overlay with a big QR code for
      the activity on the shared student page (data-path, relative to this
      site). Click anywhere or press Esc to close. */
  const phoneModal = document.createElement('div');
  phoneModal.className = 'phone-modal'; phoneModal.hidden = true;
  phoneModal.innerHTML = '<div class="box"><p class="kicker">Responder no telemóvel</p><div class="code"></div><a target="_blank" rel="noopener"></a><p class="sm">Lê o código com a câmara · escreve o teu nome · responde · Enviar</p><button class="btn ghost">Fechar</button></div>';
  document.body.appendChild(phoneModal);
  phoneModal.addEventListener('click', e => { if (e.target === phoneModal || e.target.matches('button')) phoneModal.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') phoneModal.hidden = true; });
  document.querySelectorAll('.phone-btn').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const url = new URL(btn.dataset.path, location.href).href;
    const code = phoneModal.querySelector('.code'), link = phoneModal.querySelector('a');
    code.innerHTML = ''; link.href = url;
    if (!/^https?:/.test(url)) link.textContent = 'O código QR aparece quando o site estiver publicado (GitHub Pages).';
    else {
      link.textContent = url.replace(/^https?:\/\/(www\.)?/, '');
      if (window.QRCode) new QRCode(code, { text: url, width: 520, height: 520, colorDark: '#1E2A33', colorLight: '#FFFFFF' });
    }
    phoneModal.hidden = false;
  }));

  /** Copy buttons: data-copy holds a selector; the text of every match is
      joined (one per line) and copied, e.g. the AI prompt on «Como pedir». */
  document.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const text = Array.from(document.querySelectorAll(btn.dataset.copy)).map(el => el.textContent.trim()).join('\n');
    const done = () => { const t = btn.textContent; btn.textContent = 'Copiado!'; setTimeout(() => { btn.textContent = t; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => {});
    else { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (err) {} ta.remove(); }
  }));

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
