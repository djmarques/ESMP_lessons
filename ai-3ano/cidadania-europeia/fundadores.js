/* ==========================================================================
   Aula 3 · Os fundadores, staged as a film. Loaded after app.js.
   Works on every slide that has the class "cine" (see fundadores.css):

   1. Portraits: when a photograph is missing from assets/fundadores/, show
      the person's initials instead of a broken image.
   2. Chapter bar: links between the film's slides, plus a play button.
   3. Camera and year: on every build the photograph moves in a little and
      the big year in the background follows the builds (data-ano).
   4. Play: shows the builds and slides by themselves, SECONDS_PER_BUILD
      seconds each, until the film's last slide. The arrow keys still work.
   ========================================================================== */

const SECONDS_PER_BUILD = 7;

/* ---------- 1. Portraits: initials when the photograph is missing ---------- */
function semFoto(img) {
  const frame = img.closest(".retrato");
  frame.classList.add("sem-foto");
  frame.dataset.iniciais = img.dataset.iniciais || "";
  img.remove();
}
for (const img of document.querySelectorAll(".retrato img")) {
  if (img.complete && img.naturalWidth === 0) semFoto(img);     // already failed before this script ran
  else img.addEventListener("error", () => semFoto(img));
}

(function filme() {
  const film = [...document.querySelectorAll(".slide.cine")];
  if (!film.length || typeof next !== "function") return;       // next() comes from app.js
  let playing = false;
  let timer = null;

  /* ---------- 2. Chapter bar, time bar and background year on every film slide ---------- */
  for (const slide of film) {
    const body = slide.querySelector(".cine-corpo");
    const links = film.map((s) => `<a href="#${s.id}">${s.dataset.cap || s.querySelector("h2").textContent}</a>`).join("");
    body.insertAdjacentHTML("afterbegin", `<nav class="capitulos" aria-label="Capítulos do filme">${links}<button type="button" class="tocar"></button></nav>`);
    body.insertAdjacentHTML("beforeend", '<p class="marca-ano" aria-hidden="true"></p>');
    slide.insertAdjacentHTML("beforeend", '<div class="tempo" aria-hidden="true"></div>');
    slide.querySelector(".tocar").addEventListener("click", () => setPlaying(!playing));
    body.querySelectorAll(".capitulos a").forEach((a, i) => {
      a.classList.toggle("visto", i < film.indexOf(slide));
      a.toggleAttribute("aria-current", i === film.indexOf(slide));
    });
    // The quotation is typed word by word: wrap each word so CSS can delay it.
    const quote = slide.querySelector(".big-quote");
    if (quote && quote.firstChild.nodeType === Node.TEXT_NODE) {
      const words = quote.firstChild.textContent.trim().split(/\s+/);
      const spans = words.map((w, i) => `<span class="pal" style="--i:${i}">${w}</span>`).join(" ");
      quote.firstChild.remove();
      quote.insertAdjacentHTML("afterbegin", spans);
    }
  }

  const currentFilmSlide = () => film.find((s) => s.classList.contains("current"));

  /* ---------- 3. Camera and year follow the builds ---------- */
  function paint(slide) {
    const step = Number(slide.dataset.at || 0);
    slide.style.setProperty("--passo", step);
    // The year of the latest build that carries one; before that, the slide's own year.
    const dated = [...slide.querySelectorAll("[data-ano].on")].sort((a, b) => b.dataset.step - a.dataset.step)[0];
    const year = (dated || slide).dataset.ano || "";
    const mark = slide.querySelector(".marca-ano");
    if (mark.textContent !== year) {
      mark.textContent = year;
      mark.classList.remove("muda");
      void mark.offsetWidth;                                    // restart the animation
      mark.classList.add("muda");
    }
  }

  /* ---------- 4. Play ---------- */
  function setPlaying(on) {
    playing = on;
    clearTimeout(timer);
    document.body.classList.toggle("a-tocar", on);
    film.forEach((s) => {
      s.querySelector(".tocar").textContent = on ? "❚❚ Pausa" : "▶ Reproduzir";
      s.querySelector(".tempo").style.animation = "none";
    });
    if (on) schedule();
  }

  /** While playing: run the time bar, then show the next build (or the next slide). */
  function schedule() {
    const slide = currentFilmSlide();
    if (!slide) { setPlaying(false); return; }                  // the film is over (or the teacher left it)
    const bar = slide.querySelector(".tempo");
    bar.style.animation = "none";
    void bar.offsetWidth;
    bar.style.animation = `tempo ${SECONDS_PER_BUILD}s linear both`;
    clearTimeout(timer);
    timer = setTimeout(next, SECONDS_PER_BUILD * 1000);
  }

  // app.js records the current build in data-at and the visible slide in the class "current".
  const watcher = new MutationObserver((changes) => {
    for (const slide of new Set(changes.map((c) => c.target))) paint(slide);
    if (playing) schedule();
  });
  for (const slide of film) {
    watcher.observe(slide, { attributes: true, attributeFilter: ["data-at", "class"] });
    paint(slide);
  }
  setPlaying(false);
})();
