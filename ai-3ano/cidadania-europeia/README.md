# Cidadania europeia: interactive lessons

Área de Integração, 12.º ano, tema-problema 5.2 ("O que é a Europa e a União Europeia?").
Eight lessons built from the PowerPoint deck `Area_Integracao_12ano_tema_5.2_v2.pptx` and the pages of the refletE! textbook (Areal Editores) included in it: the textbook content is rewritten in short form and cited, not reproduced as page images. The site has step-by-step
animations, quizzes, research tasks with a QR code and a timer, and the teacher's speaker notes.

Plain HTML, CSS and JavaScript: no build step and nothing to install. It works on GitHub Pages and
also when you open `index.html` directly from your computer (internet is still needed for the
fonts, icons and QR codes, which load from Google Fonts and cdnjs).

## Files

| File | What it holds |
|---|---|
| `index.html` | All the content: one `<article class="slide">` per slide, grouped by lesson |
| `style.css` | Appearance: the deck's palette (navy, burnt orange, sand) and typefaces (Cambria, Calibri) |
| `app.js` | Behaviour: navigation, step-by-step builds, quizzes, research tasks, sorting activity, notes |
| `fundadores.css`, `fundadores.js` | Lessons 3, 4 and 5, staged as films (each lesson is its own film): slides with the class `cine` get a dark screen, a large photograph, a year in the background that follows the builds (`data-ano`), a chapter bar and a Reproduzir button (seconds per build: `SECONDS_PER_BUILD` in `fundadores.js`) |
| `tabuleiro.js` | Lesson 3, slide `#tabuleiro`: the 3D board animation. `SCRIPT` says where each piece stands at each build and `CAMERA` where the camera is; the captions are in `index.html` |
| `europa3d.js` | Lessons 4 and 5: one 3D board for seven chapters (slides with the class `eu3d`). A 3D map of Europe (each country raised from its real outline), a tower of the things the countries share, and a square where the institutions rise. `FRAMES` lists, build by build, only what changes (countries that join, a block, a treaty, the camera shot); `SHOTS` are the camera shots. The canvas moves from chapter to chapter and the camera glides, so there is no cut. Captions are in `index.html`, one per build. Styles: section 5c of `fundadores.css` |
| `europa-mapa.js` | The country outlines for `europa3d.js`: Natural Earth 1:50m (public domain), via the world-atlas package, projected (Lambert azimuthal equal-area, centred on 52° N 10° E, as in the European Union's maps) and simplified. Made by `tools/build_map.js` (`npm i world-atlas@2 topojson-client@3`, then `node tools/build_map.js europa-mapa.js`) |
| `assets/vendor/three.min.js` | three.js (release 160, MIT licence), the library that draws the 3D board. Kept in the repository so the animation also works without internet |
| `assets/fundadores/` | The founders' portraits (`monnet.webp`, `schuman.webp`, `adenauer.webp`, `churchill.webp`, `delors.webp`) |
| `chernobyl.js`, `chernobyl.css` | The extra lesson after lesson 4, «Chernobyl e o fim da URSS»: the simulations (wave and energy, electromagnetic spectrum, alpha, beta and gamma, radiation in the body, the reactor and the accident, the maps) and their styles. See «Extra lesson» below |
| `chernobyl-mapa.js` | Country outlines from Portugal to the Pacific, in longitude and latitude, for the maps of the extra lesson: Natural Earth 1:50m (public domain). Made by `tools/build_mapa_urss.js` (`npm i world-atlas@2 topojson-client@3 topojson-simplify@3`, then `node tools/build_mapa_urss.js chernobyl-mapa.js`) |
| `notes.js` | Speaker notes from the PowerPoint deck (generated: do not edit by hand) |
| `assets/` | Images taken from the deck: the enlargement maps, the CE mark, the charger illustrations |
| `tools/extract_notes.py` | Rebuilds `notes.js` from a `.pptx` |
| `archive/` | Earlier versions of the files, by date (for example `index_2026-11-27.html`: the site before the extra lesson) |

## Publish on GitHub Pages

1. Create a repository on GitHub (for example `cidadania-europeia`) and upload every file and folder here, keeping the structure.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then branch `main` and folder `/ (root)`. Save.
4. After a minute the site is live at `https://<your-user>.github.io/cidadania-europeia/`.

The speaker notes are part of the site. On a public repository, anyone with the link can open them with the N key.
If you would rather keep them private, delete `notes.js` before uploading (the panel then says there are no notes).

## Presenting

| Key | Action |
|---|---|
| → · Space · Page Down | Next build, then the next slide |
| ← · Page Up | Previous build, then the previous slide (shown fully built) |
| Home / End | First / last slide |
| N | Teacher notes |
| F | Full screen |

The ☰ button hides the sidebar, which gives the slide more room on the projector. On phones it opens the sidebar as a drawer.
Every slide has its own address (`…/index.html#marca-ce`), so you can link students straight to a slide.

## Editing

**Change text:** edit it in `index.html`. The sidebar label is the slide's `<h2>`, or its `data-nav` attribute if it has one.

**Add a slide:** copy an `<article class="slide">…</article>`, give it a new `id`, and put it inside the right
`<section class="lesson">`. Set `data-src="12"` if it comes from slide 12 of the deck, so its notes appear.

**Click-by-click builds:** add `data-step="1"`, `data-step="2"`… to the elements that should appear on each press.
Several elements can share a number. Elements without `data-step` are visible from the start.

**Quiz:** inside `<div class="quiz">`, add one block per question.

```html
<!-- True/false: the Verdadeiro and Falso buttons are generated -->
<div class="q" data-answer="F"><p>Todos os países da União usam o euro.</p><p class="why">Falso: 21 dos 27.</p></div>

<!-- Multiple choice: mark the right option with data-ok -->
<div class="q"><p>Desde quando é Portugal membro?</p>
  <div class="opts"><button>1974</button><button data-ok>1986</button><button>1993</button></div>
  <p class="why">Desde 1 de janeiro de 1986.</p></div>
```

**Research task:** `data-url` becomes the QR code and the link; `data-minutes` sets the timer.

```html
<div class="task" data-url="https://european-union.europa.eu/index_pt" data-minutes="10">
  <ol class="steps-list big-list"><li>A pergunta…</li></ol>
  <details class="answer"><summary>Mostrar resposta</summary><p>A resposta…</p></details>
</div>
```

**Speaker notes:** edit them in PowerPoint, then rebuild `notes.js`:

```bash
pip install python-pptx
python tools/extract_notes.py Area_Integracao_12ano_tema_5.2_v2.pptx notes.js
```

## Other components (for reference)

| Markup | Effect |
|---|---|
| `data-keep` (with `data-step`) | The element stays visible; the step changes its state (used for the "morph" slides) |
| `class="stack"` | Children overlap; only the latest revealed one shows (map years, swapped titles) |
| `class="draw"` + `pathLength="1"` on an SVG line | The line draws itself |
| `class="grow"` with `style="--w:60%"` | A bar grows from the left |
| `data-count="27"` | The number counts up from 0 |
| `class="sort"` | Drag a chip into a column (Enter or Space moves it with the keyboard); "Repor cartões" resets. Give columns `data-bin="x"` and chips `data-answer="x"` to add a "Verificar" button; set the number of columns with `style="--n:4"` |
| `<details name="…">` in `.accordion` | Click-to-open panels; panels sharing a name open one at a time |

## Extra lesson: Chernobyl and the end of the Soviet Union

Added on 27 November 2026, after the students' questions in lesson 4. It is its own group in the sidebar («Aula 4 · Extra»),
right after «Revisão da aula 4», and it can be skipped without affecting lesson 5. Fifteen slides:

| Slide (`#id`) | What it is |
|---|---|
| `ch-abertura` | Opening, with the five chapters |
| `ch-onda`, `ch-espectro` | Simulations with a slider: shorter wavelength → higher frequency → more energy per photon (the formula E = h × f builds one term per press); the electromagnetic spectrum, with the ionising part marked |
| `ch-tipos`, `ch-corpo` | Alpha, beta and gamma against paper, aluminium and lead; then the three «atomic bullets» in a human body, chosen with buttons (from outside or from inside the body) |
| `ch-reator`, `ch-acidente` | Fission, chain reaction and a reactor in section (the slider moves the control rods); then the accident, one press per moment of the night |
| `ch-silencio` | Map: the cloud travels while the announcements are delayed (36 hours, almost 3 days, 18 days) |
| `ch-balanco`, `ch-confianca`, `ch-fatores` | Ordinary light slides: the figures, why it hurt the regime's credibility, and the other causes (a block that cracks) |
| `ch-fim`, `ch-ue` | Maps: one country becomes fifteen; three former Soviet republics join the European Union |
| `ch-debate`, `ch-quiz` | A timed debate in pairs and a revision quiz |

**How a simulation slide is written.** The slide has the classes `cine tabuleiro rad`. Inside it,
`<div class="palco rad-palco" data-sim="onda">` names the simulation (`onda`, `espectro`, `tipos`, `corpo`, `reator`, `mapa`;
`reator` and `mapa` also take `data-cena`). The captions in `<div class="stack legendas">` are the builds: the simulation reads
how many are shown and draws that moment, so the arrow keys, the sidebar and the Reproduzir button all work as in lessons 3 to 5.

**To change a caption**, edit its text in `index.html`. **To change what the picture does at a build**, look in `chernobyl.js` for
the simulation (`SIMS.reator`, `SIMS.mapa`…): the accident is the table `ROTEIRO`, the maps are `CENAS` (which camera at each
build) and the function `paint` (the colour of each country at each build). Every text drawn on the pictures is in that file too.

**Controls** are plain HTML in `<div class="rad-controlos">`: a range input or buttons with `data-ctl="name"` (buttons also carry
`data-valor`). The arrow keys go back to moving the slides as soon as the mouse lets go of a slider.

**Teacher notes** for these slides are at the end of `notes.js` (keys `ch-…`). If you regenerate `notes.js` from the PowerPoint
deck, copy them back from `archive/` or from the repository history.

**The maps** use today's borders. Crimea is drawn with Ukraine (the borders of 1991, recognised by the United Nations and the
European Union); Natural Earth, the source, draws it with Russia, and `tools/build_mapa_urss.js` moves it.

**To remove the lesson**, delete its `<section class="lesson" data-title="Aula 4 · Extra…">` in `index.html` and the three lines
that load `chernobyl.css`, `chernobyl-mapa.js` and `chernobyl.js`.

Sources for every figure are listed on the last slide («Onde confirmar») and, slide by slide, in the teacher notes.

## Licences

Map base: "Blank map of Europe cropped", Wikimedia Commons, CC BY-SA 3.0. Icons: Font Awesome Free.

Historical photographs (all from Wikimedia Commons; the credit is printed under each photo):

| File | Subject | Author and licence |
|---|---|---|
| `nagasaki-1945.webp` | Nagasaki, 9 August 1945 | Charles Levy, U.S. National Archives, public domain |
| `estrela-amarela.webp` | Yellow star ("Judenstern") | Daniel Ullrich, CC BY-SA 3.0 |
| `kristallnacht-dia-seguinte.webp` | The day after Kristallnacht, 10 November 1938 | Unknown author, public domain |
| `kristallnacht-1938.webp` | Magdeburg, November 1938 | Bundesarchiv, Bild 146-1970-083-42, CC BY-SA 3.0 DE |
| `birkenau-1945.webp` | Gate of Auschwitz II-Birkenau, 1945 | Stanisław Mucha, public domain |
| `camara-de-gas-1945.webp` | Gas chamber, Auschwitz I, January 1945 | Unknown author, public domain |

The CC BY-SA photos may be reused with the credit and the same licence; keep the captions if you copy them.
Fonts: Caladea and Carlito (Google Fonts), used where Cambria and Calibri are not installed.

## Jogos

Cada aula tem um jogo de escolha múltipla com 8 perguntas, antes do questionário (na aula 5, depois da pesquisa): uma pergunta de cada vez, 20 segundos por pergunta, pontos com bónus de rapidez e som de acerto e de erro. A turma responde de braço no ar (ou com os dedos, 1 a 4) e o professor clica na resposta mais votada, ou usa as teclas 1 a 4; Enter passa à seguinte. O botão do altifalante liga e desliga o som. Os questionários que já existiam ficaram como «Revisão», para estudar em casa.

Para mudar uma pergunta, procura o texto no `index.html`: cada pergunta é um `<div class="gq" data-answer="b">`, e `data-answer` diz qual dos botões (`a`, `b`, `c`, `d`) é o certo. A nota do professor dos jogos está no fim de `notes.js` (`window.NOTES.jogo`); se voltares a gerar esse ficheiro com `tools/extract_notes.py`, acrescenta-a de novo.
