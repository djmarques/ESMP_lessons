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
| `notes.js` | Speaker notes from the PowerPoint deck (generated: do not edit by hand) |
| `assets/` | Images taken from the deck: the enlargement maps, the CE mark, the charger illustrations |
| `tools/extract_notes.py` | Rebuilds `notes.js` from a `.pptx` |

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
