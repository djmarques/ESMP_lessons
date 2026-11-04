/* =====================================================================
   app.js — comportamento do site da aula (sem frameworks, sem build).
   ---------------------------------------------------------------------
   Everything here is generic: slides, steps and components are found
   through classes and data attributes in index.html, so a new slide is
   added by writing HTML only. Sections:
     1. Slide registry and sidebar
     2. Navigation (slides + step builds) and address fragments
     3. Components: counters, flip cards, polls, quizzes, timers,
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
