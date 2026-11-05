/**
 * Cidadania europeia: behaviour of the lesson site.
 *
 * The page content lives in index.html; this file only reads it. Every feature
 * is a generic component switched on by markup, so adding a slide never needs
 * new JavaScript. Workflow at load time:
 *   1. collect the slides and build the sidebar from them;
 *   2. wire the components (quizzes, research tasks, sorting activities);
 *   3. open the slide named in the address (#id), or the first one.
 * After that, the presenter moves with "next" and "previous", which reveal the
 * current slide's steps one at a time before changing slide (like PowerPoint builds).
 *
 * State: `current` (index of the visible slide) and, on each slide element,
 * `data-at` (how many steps of that slide are revealed).
 */
"use strict";

/* ===================== Slides and sidebar ===================== */

const slides = [...document.querySelectorAll(".slide")];
const stage = document.getElementById("stage");
const nav = document.getElementById("nav");
const where = document.getElementById("where");
const notesPanel = document.getElementById("notes");
let current = -1;

/**
 * Label of a slide in the sidebar: its data-nav attribute if present,
 * otherwise the text of its first heading.
 */
function slideLabel(slide) {
  return slide.dataset.nav || slide.querySelector("h2").textContent.trim();
}

/** Build the sidebar: one group per <section class="lesson">, one link per slide. */
function buildNav() {
  const toc = document.getElementById("toc");
  for (const lesson of document.querySelectorAll(".lesson")) {
    const group = document.createElement("p");
    group.className = "toc-group";
    group.textContent = lesson.dataset.title;
    const list = document.createElement("ol");
    for (const slide of lesson.querySelectorAll(".slide")) {
      const item = document.createElement("li");
      item.innerHTML = `<a href="#${slide.id}"></a>`;
      item.firstChild.textContent = slideLabel(slide);
      list.append(item);
    }
    toc.append(group, list);
  }
}

/* ===================== Steps (click-by-click builds) ===================== */

/** Highest step number used on a slide (0 when the slide has no builds). */
function lastStep(slide) {
  const numbers = [...slide.querySelectorAll("[data-step]")].map((el) => Number(el.dataset.step));
  return Math.max(0, ...numbers);
}

/**
 * Reveal the first `step` builds of a slide: every [data-step] whose number is
 * at most `step` gets the class "on" (CSS turns that into a reveal or a morph).
 * Counters that have just become visible start counting.
 */
function setStep(slide, step) {
  slide.dataset.at = step;
  for (const el of slide.querySelectorAll("[data-step]")) {
    el.classList.toggle("on", Number(el.dataset.step) <= step);
  }
  for (const counter of slide.querySelectorAll("[data-count]")) {
    // A counter inside a step not yet reached stays hidden and keeps waiting.
    const hidden = counter.closest("[data-step]:not(.on):not([data-keep])");
    if (!hidden && !counter.dataset.done) countUp(counter);
  }
}

/* ===================== Moving between slides ===================== */

/**
 * Show slide number `index`. `atEnd` opens it fully built, which is what the
 * presenter expects when stepping backwards into it.
 */
function show(index, atEnd = false) {
  if (index < 0 || index >= slides.length) return;
  const slide = slides[index];
  slides[current]?.classList.remove("current");
  current = index;
  slide.classList.add("current");
  // Reset counters so they count again each time the slide is shown.
  slide.querySelectorAll("[data-count]").forEach((c) => delete c.dataset.done);
  setStep(slide, atEnd ? lastStep(slide) : 0);
  slide.scrollTop = 0;

  // Keep the address, sidebar, progress line and position text in step with the slide.
  history.replaceState(null, "", `#${slide.id}`);
  for (const link of nav.querySelectorAll("a")) {
    const here = link.hash === `#${slide.id}`;
    link.toggleAttribute("aria-current", here);
    if (here) link.scrollIntoView({ block: "nearest" });
  }
  document.documentElement.style.setProperty("--p", `${((index + 1) / slides.length) * 100}%`);
  where.textContent = `${index + 1} / ${slides.length}`;
  renderNotes();
}

/** Reveal the next build of the current slide, or go to the next slide if none is left. */
function next() {
  const slide = slides[current];
  const step = Number(slide.dataset.at);
  if (step < lastStep(slide)) setStep(slide, step + 1);
  else show(current + 1);
}

/** Hide the last revealed build, or go back to the previous slide (fully built). */
function previous() {
  const slide = slides[current];
  const step = Number(slide.dataset.at);
  if (step > 0) setStep(slide, step - 1);
  else show(current - 1, true);
}

/** Index of the slide named in the address (#id); the first slide if none matches. */
function slideFromHash() {
  return Math.max(0, slides.findIndex((s) => `#${s.id}` === location.hash));
}

/* ===================== Animated counters ===================== */

/**
 * Count from 0 to the element's data-count value in about one second, using
 * Portuguese number formatting (decimal comma, space between thousands).
 * The number of decimals is taken from how the target is written ("51.9" → 1).
 */
function countUp(el) {
  el.dataset.done = "1";
  const target = Number(el.dataset.count);
  const decimals = (el.dataset.count.split(".")[1] || "").length;
  const format = (n) => n.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  // Respect the reduced-motion setting: show the final value at once.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = format(target); return; }
  const start = performance.now();
  const duration = 1100;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;   // ease-out: fast at first, settling on the target
    el.textContent = format(target * eased);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ===================== Teacher notes (key N) ===================== */

/**
 * Fill the notes panel with the speaker notes of the original PowerPoint
 * slide(s) listed in the current slide's data-src (window.NOTES comes from notes.js).
 */
function renderNotes() {
  if (notesPanel.hidden) return;
  const sources = (slides[current].dataset.src || "").split(" ").filter(Boolean);
  const paragraphs = sources.flatMap((n) => window.NOTES?.[n] || []);
  notesPanel.innerHTML = "<h2>Notas do professor</h2>";
  if (!paragraphs.length) paragraphs.push("Sem notas para este diapositivo.");
  for (const text of paragraphs) {
    const p = document.createElement("p");
    p.textContent = text;
    notesPanel.append(p);
  }
}

/** Show or hide the notes panel. */
function toggleNotes() {
  notesPanel.hidden = !notesPanel.hidden;
  document.getElementById("notes-btn").setAttribute("aria-pressed", String(!notesPanel.hidden));
  renderNotes();
}

/** Enter or leave full screen (useful on the classroom projector). */
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

/* ===================== Quiz component ===================== */

/**
 * Prepare one .quiz block.
 * - A question with data-answer="V" or "F" is true/false: its two buttons are
 *   generated here, and the right one is marked with data-ok.
 * - Other questions carry their own option buttons, the right one marked data-ok.
 * Each question can be answered once; the explanation (.why) then appears and
 * the score is updated. "Repetir" clears every answer.
 */
function initQuiz(quiz) {
  const questions = [...quiz.querySelectorAll(".q")];
  for (const q of questions) {
    if (!q.dataset.answer) continue;
    const opts = document.createElement("div");
    opts.className = "opts";
    for (const [value, label] of [["V", "Verdadeiro"], ["F", "Falso"]]) {
      const button = document.createElement("button");
      button.textContent = label;
      button.toggleAttribute("data-ok", q.dataset.answer === value);
      opts.append(button);
    }
    q.querySelector(".why").before(opts);
  }
  quiz.querySelectorAll(".opts button").forEach((b) => (b.type = "button"));

  // Footer with the running score and a reset button.
  const foot = document.createElement("div");
  foot.className = "quiz-foot";
  foot.innerHTML = '<p class="score" aria-live="polite"></p><button type="button" class="btn">Repetir</button>';
  quiz.append(foot);
  const score = foot.querySelector(".score");
  const updateScore = () => {
    const answered = questions.filter((q) => q.classList.contains("done")).length;
    const right = quiz.querySelectorAll(".picked[data-ok]").length;   // chosen and correct
    score.textContent = `Certas: ${right} de ${questions.length}` + (answered < questions.length ? ` (respondidas: ${answered})` : "");
  };

  // One listener for the whole quiz: mark the choice and the right answer.
  quiz.addEventListener("click", (event) => {
    const choice = event.target.closest(".opts button");
    if (!choice) return;
    const q = choice.closest(".q");
    q.classList.add("done");
    // "picked" marks the student's own choice, so the score counts choices that were both picked and correct.
    choice.classList.add("picked", choice.hasAttribute("data-ok") ? "right" : "wrong");
    q.querySelector("[data-ok]").classList.add("right");
    q.querySelectorAll(".opts button").forEach((b) => (b.disabled = true));
    updateScore();
  });

  foot.querySelector("button").addEventListener("click", () => {
    for (const q of questions) {
      q.classList.remove("done");
      q.querySelectorAll(".opts button").forEach((b) => { b.disabled = false; b.classList.remove("picked", "right", "wrong"); });
    }
    updateScore();
  });
  updateScore();
}

/* ===================== Research task component ===================== */

/**
 * Prepare one .task block: a QR code and a short link to data-url, if given
 * (so students can open the source on their phones), and a countdown of
 * data-minutes that the teacher starts, pauses and resets.
 */
function initTask(task) {
  const url = task.dataset.url;
  const tools = document.createElement("aside");
  tools.className = "task-tools";
  // Tasks without a source to open (such as a classroom debate) get only the timer.
  if (url) {
    // QR code from the qrcode-generator library (type 0 = smallest size that fits, "M" = medium error correction).
    if (window.qrcode) {
      const qr = qrcode(0, "M");
      qr.addData(url);
      qr.make();
      tools.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    }
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = new URL(url).hostname.replace(/^www\./, "");   // short label; the full address is in the QR code
    tools.append(link);
  }

  // Timer: seconds left, and the interval handle while it runs.
  const total = Number(task.dataset.minutes) * 60;
  let left = total;
  let running = null;
  tools.insertAdjacentHTML("beforeend",
    '<p class="timer" role="timer"></p><button type="button" class="btn">Iniciar</button><button type="button" class="btn">Repor</button>');
  const display = tools.querySelector(".timer");
  const [startButton, resetButton] = tools.querySelectorAll("button");
  const draw = () => {
    const m = Math.floor(left / 60);
    const s = String(left % 60).padStart(2, "0");
    display.textContent = left > 0 ? `${m}:${s}` : "Tempo!";
    display.classList.toggle("late", left > 0 && left <= 60);   // last minute in orange
    display.classList.toggle("over", left === 0);
  };
  const stop = () => { clearInterval(running); running = null; startButton.textContent = "Continuar"; };

  startButton.addEventListener("click", () => {
    if (running) return stop();
    if (left === 0) left = total;
    startButton.textContent = "Pausa";
    running = setInterval(() => { left -= 1; draw(); if (left === 0) stop(); }, 1000);
  });
  resetButton.addEventListener("click", () => { stop(); left = total; startButton.textContent = "Iniciar"; draw(); });
  draw();

  // The tools sit beside the task text, before the "show answer" block.
  const answer = task.querySelector(".answer");
  if (answer) answer.before(tools); else task.append(tools);
}

/* ===================== Sorting activity ===================== */

/**
 * Prepare one .sort block: chips are dragged (mouse or finger) into a column,
 * or back to the tray. Keyboard users press Enter or Space on a chip to move it
 * to the next column instead. A "Repor cartões" button returns every chip to the tray.
 * When the chips carry data-answer (matching a column's data-bin), a "Verificar"
 * button marks each placed chip as right or wrong; activities without a right
 * answer (opinion sorting) simply leave data-answer out.
 */
function initSort(sort) {
  const bins = [...sort.querySelectorAll(".bin")];
  const tray = sort.querySelector(".tray");

  // Which column or tray lies under the pointer (the dragged chip itself is skipped).
  const dropZoneAt = (chip, x, y) => {
    chip.style.visibility = "hidden";
    const zone = document.elementFromPoint(x, y)?.closest(".bin, .tray");
    chip.style.visibility = "";
    return zone && sort.contains(zone) ? zone : null;
  };

  // Drag: the chip follows the pointer; on release it joins the column below it,
  // or snaps back to where it was if released elsewhere.
  sort.addEventListener("pointerdown", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip || event.button > 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    chip.classList.add("dragging");
    const move = (e) => {
      chip.style.transform = `translate(${e.clientX - startX}px, ${e.clientY - startY}px)`;
      const zone = dropZoneAt(chip, e.clientX, e.clientY);
      bins.forEach((bin) => bin.classList.toggle("over", bin === zone));   // highlight the target column
    };
    const drop = (e) => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", drop);
      removeEventListener("pointercancel", drop);
      const zone = e.type === "pointerup" ? dropZoneAt(chip, e.clientX, e.clientY) : null;
      chip.classList.remove("dragging");
      chip.style.transform = "";
      bins.forEach((bin) => bin.classList.remove("over"));
      if (zone) { zone.append(chip); chip.classList.remove("right", "wrong"); }   // a moved chip needs checking again
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", drop);
    addEventListener("pointercancel", drop);
  });

  // Keyboard alternative. A click with detail 0 comes from Enter or Space, not from a pointer.
  sort.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip || event.detail !== 0) return;
    const from = bins.indexOf(chip.parentElement);   // −1 while the chip is still in the tray
    bins[(from + 1) % bins.length].append(chip);
    chip.classList.remove("right", "wrong");
    chip.focus();
  });

  // Reset: every chip back to the tray, in its original order.
  const chips = [...tray.querySelectorAll(".chip")];
  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "btn";
  reset.textContent = "Repor cartões";
  reset.addEventListener("click", () => {
    tray.prepend(...chips);
    chips.forEach((chip) => chip.classList.remove("right", "wrong"));
  });
  const buttons = document.createElement("p");
  buttons.className = "sort-buttons";
  buttons.append(reset);

  // Check: compare each placed chip's data-answer with its column's data-bin; chips still in the tray are skipped.
  if (chips.some((chip) => chip.dataset.answer)) {
    const check = document.createElement("button");
    check.type = "button";
    check.className = "btn";
    check.textContent = "Verificar";
    check.addEventListener("click", () => {
      for (const chip of chips) {
        const bin = chip.closest(".bin");
        chip.classList.toggle("right", Boolean(bin) && bin.dataset.bin === chip.dataset.answer);
        chip.classList.toggle("wrong", Boolean(bin) && bin.dataset.bin !== chip.dataset.answer);
      }
    });
    buttons.prepend(check);
  }
  sort.after(buttons);
}

/* ===================== Games (timed multiple choice) ===================== */

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


/* ===================== Input: keys, buttons, swipes, address ===================== */

/** Keyboard: arrows, page keys and space move; Home/End jump; N notes; F full screen. */
function onKey(event) {
  // Leave keys alone while a button, field or summary has focus, so Space and Enter still work there.
  if (event.target.closest("input, textarea, summary") || event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key;
  // In a running game: keys 1 to 4 choose an option, Enter goes to the next question.
  const playing = slides[current]?.querySelector(".game.playing");
  if (playing && /^[1-4]$/.test(key)) { event.preventDefault(); playing._choose(Number(key) - 1); return; }
  if (playing && key === "Enter" && !event.target.closest("button")) { event.preventDefault(); playing._next(); return; }
  if (["ArrowRight", "PageDown"].includes(key) || (key === " " && !event.target.closest("button"))) next();
  else if (["ArrowLeft", "PageUp"].includes(key)) previous();
  else if (key === "Home") show(0);
  else if (key === "End") show(slides.length - 1);
  else if (key.toLowerCase() === "n") toggleNotes();
  else if (key.toLowerCase() === "f") toggleFullscreen();
  else return;
  event.preventDefault();
}

/** Horizontal swipes on touch screens: left = next, right = previous (at least 60 px). */
function enableSwipe() {
  let startX = null;
  // A touch that starts on a draggable chip is a drag, not a swipe.
  stage.addEventListener("touchstart", (e) => { startX = e.target.closest(".chip") ? null : e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 60) (dx < 0 ? next : previous)();
    startX = null;
  });
}

/* ===================== Start-up ===================== */

buildNav();
document.querySelectorAll(".quiz").forEach(initQuiz);
document.querySelectorAll(".task").forEach(initTask);
document.querySelectorAll(".sort").forEach(initSort);
// Icons are decoration: hide them from screen readers (the text beside them carries the meaning).
document.querySelectorAll("i.fa-solid").forEach((i) => i.setAttribute("aria-hidden", "true"));

document.getElementById("next").addEventListener("click", next);
document.getElementById("prev").addEventListener("click", previous);
document.getElementById("notes-btn").addEventListener("click", toggleNotes);
document.getElementById("full-btn").addEventListener("click", toggleFullscreen);
// The menu button hides the sidebar on wide screens and opens it as a drawer on small ones (see style.css).
const menu = document.getElementById("menu");
const setMenu = (toggled) => {
  document.body.classList.toggle("nav-toggled", toggled);
  menu.setAttribute("aria-expanded", String(!nav.checkVisibility || nav.checkVisibility()));
};
menu.addEventListener("click", () => setMenu(!document.body.classList.contains("nav-toggled")));
setMenu(false);   // report the starting state (open on wide screens, closed on small ones)
// On small screens, close the drawer once a slide has been chosen from it.
nav.addEventListener("click", (e) => { if (e.target.closest("a") && matchMedia("(max-width: 900px)").matches) setMenu(false); });
// On small screens, a tap on the slide also closes the open drawer.
stage.addEventListener("click", () => { if (document.body.classList.contains("nav-toggled") && matchMedia("(max-width: 900px)").matches) setMenu(false); });
addEventListener("hashchange", () => { const i = slideFromHash(); if (i !== current) show(i); });
addEventListener("keydown", onKey);
enableSwipe();

show(slideFromHash());
