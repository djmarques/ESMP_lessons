/* ==========================================================================
   Aula 3 · Os fundadores: portraits and the short "film".
   Loaded after app.js. Two jobs:

   1. Portraits: when a photograph is missing from assets/fundadores/, show
      the person's initials instead (so the page never shows a broken image).
      To add a photograph later, save it with the file name the <img> asks
      for, for example assets/fundadores/delors.webp.

   2. The film (#filme-fundadores): each scene is one "build" of the slide,
      so → and ← move scene by scene like any other slide. The Reproduzir
      button plays the scenes by themselves; each scene's data-dur says how
      many seconds it stays on screen.
   ========================================================================== */

/* ---------- 1. Portraits: initials when the photograph is missing ---------- */
function semFoto(img) {
  const frame = img.closest(".retrato");
  frame.classList.add("sem-foto");
  frame.dataset.iniciais = img.dataset.iniciais || "";
  frame.setAttribute("role", "img");
  frame.setAttribute("aria-label", img.alt);
  img.remove();
}
for (const img of document.querySelectorAll(".retrato img")) {
  if (img.complete && img.naturalWidth === 0) semFoto(img);     // already failed before this script ran
  else img.addEventListener("error", () => semFoto(img));
}

/* ---------- 2. The film ---------- */
(function filme() {
  const slide = document.getElementById("filme-fundadores");
  if (!slide || typeof setStep !== "function") return;

  const screen = slide.querySelector(".ecra");
  const scenes = [...screen.querySelectorAll(".cena")];          // scene 0 is the title card
  const marks = [...screen.querySelectorAll(".fita li")];        // timeline buttons, each with data-cenas="first last"
  const bar = screen.querySelector(".tempo");
  const playButton = slide.querySelector(".tocar");
  const label = slide.querySelector(".cena-n");
  const last = scenes.length - 1;
  let playing = false;
  let timer = null;

  const sceneNow = () => Number(slide.dataset.at || 0);

  /** Start or stop automatic play. */
  function setPlaying(on) {
    playing = on;
    clearTimeout(timer);
    screen.classList.toggle("a-tocar", on);
    playButton.textContent = on ? "❚❚ Pausa" : (sceneNow() === last ? "↺ Ver outra vez" : "▶ Reproduzir");
    bar.style.animation = "none";
    if (on) schedule();
  }

  /** While playing: run the thin time bar and move on when the scene's time is up. */
  function schedule() {
    const n = sceneNow();
    if (n >= last) { setPlaying(false); return; }
    const seconds = Number(scenes[n].dataset.dur || 8);
    bar.style.animation = "none";
    void bar.offsetWidth;                                        // restart the bar's animation
    bar.style.animation = `tempo ${seconds}s linear both`;
    clearTimeout(timer);
    timer = setTimeout(() => setStep(slide, n + 1), seconds * 1000);
  }

  /** Show the scene that matches the slide's current build. */
  function paint() {
    if (!slide.classList.contains("current")) {                  // left the slide: stop and rewind the animations
      if (playing) setPlaying(false);
      scenes.forEach((scene) => scene.classList.remove("ativa"));
      return;
    }
    const n = sceneNow();
    scenes.forEach((scene, i) => scene.classList.toggle("ativa", i === n));
    for (const mark of marks) {
      const [from, to] = mark.dataset.cenas.split(" ").map(Number);
      mark.classList.toggle("agora", n >= from && n <= to);
      mark.classList.toggle("visto", n > to);
    }
    label.textContent = n === 0 ? `${last} cenas` : `Cena ${n} / ${last}`;
    if (playing) schedule();
    else playButton.textContent = n === last ? "↺ Ver outra vez" : "▶ Reproduzir";
  }

  playButton.addEventListener("click", () => {
    if (playing) { setPlaying(false); return; }
    if (sceneNow() === last) setStep(slide, 0);
    setPlaying(true);
  });
  for (const mark of marks) {
    mark.querySelector("button").addEventListener("click", () => setStep(slide, Number(mark.dataset.cenas.split(" ")[0])));
  }

  // app.js records the current build in data-at and the visible slide in the class "current".
  new MutationObserver(paint).observe(slide, { attributes: true, attributeFilter: ["data-at", "class"] });
  paint();
})();
