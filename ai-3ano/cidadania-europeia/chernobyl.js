/* ==========================================================================
   Aula 4 · Extra: «Chernobyl e o fim da União Soviética».
   The simulations of the extra lesson, drawn on a 2D canvas. Loaded after app.js and fundadores.js.

   Which slides: every slide with the class "rad". Inside it, one element
     <div class="palco rad-palco" data-sim="NAME"></div>
   receives a canvas, and NAME picks one of the simulations below:

     onda       a travelling wave: shorter wavelength → higher frequency → more energy per photon
     espectro   the electromagnetic spectrum, from radio to gamma rays, with a cursor
     tipos      alpha, beta and gamma leaving a nucleus and meeting paper, aluminium and lead
     corpo      the three radiations meeting a human body ("atomic bullets"), outside and inside
     reator     a reactor of the Chernobyl type: how it works (data-cena="funciona") and the
                accident, step by step (data-cena="acidente")
     mapa       a map from Portugal to the Pacific (outlines in chernobyl-mapa.js): the cloud
                (data-cena="nuvem"), the end of the Soviet Union ("fim") and the road to the
                European Union ("ue")

   How a simulation follows the lesson: app.js records the number of builds shown in the slide's
   data-at. Every frame, the simulation receives that number ("passo") and draws the matching
   moment, so going back a build, or opening the slide from the sidebar, always shows the right
   picture. The captions (one per build) are HTML, in index.html.

   Controls are ordinary HTML inside the slide (class "rad-controlos"): a range input or a button
   with data-ctl="name"; a simulation reads them with ctl("name").

   Drawing space: the canvas fills the slide, behind the title and the caption. Each simulation
   draws in the free rectangle between them, in "virtual" units: the rectangle is always at least
   760 wide and 520 high, whatever the screen (600 by 500 on a phone), so sizes written here look
   alike on a projector and on a laptop.

   Code comments in English; every text students read is in European Portuguese.
   ========================================================================== */
(function chernobyl() {
  "use strict";
  const radSlides = [...document.querySelectorAll(".slide.rad")];
  if (!radSlides.length) return;

  /* ---------- Palette (the site's tokens, plus one colour per radiation) ---------- */
  const C = {
    fundo: "#12191F", tinta: "#F6F3EC", areia: "#DDD5C6", cinza: "#8A929A", ardosia: "#4A5560",
    laranja: "#A44A16", alperce: "#F0A673", azul: "#2F6E9E", ceu: "#7FB0D0", ouro: "#E8C65A",
    alfa: "#F0A673", beta: "#7FB0D0", gama: "#E8C65A", grafite: "#3A4550", agua: "#2F6E9E", vapor: "#DCE8F2",
  };
  const SERIF = 'Cambria, Caladea, Georgia, serif';
  const SANS = 'Calibri, Carlito, "Segoe UI", Arial, sans-serif';
  const MONO = 'ui-monospace, Menlo, Consolas, monospace';
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;   // no shaking or flashing for those who ask

  /* ---------- Small helpers ---------- */
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  /** Move `v` towards `target` so that most of the distance is covered in about 1/k seconds. */
  const approach = (v, target, dt, k = 4) => v + (target - v) * (1 - Math.exp(-dt * k));
  const TAU = Math.PI * 2;
  /** "#RRGGBB" → "rgba(r, g, b, a)". */
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  /** Blend two "#RRGGBB" colours. */
  function mix(h1, h2, t) {
    const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    const ch = (s) => Math.round(lerp((a >> s) & 255, (b >> s) & 255, clamp(t)));
    return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
  }
  /** Portuguese number: decimal comma, at most `d` decimals. */
  const num = (v, d = 0) => v.toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: d });

  /**
   * Write text on the canvas.
   * @param {CanvasRenderingContext2D} g
   * @param {string} s        the text
   * @param {number} x, y     position (see `align` and `base`)
   * @param {object} o        size (px), weight, family, color, align, base, alpha, plate (dark box behind the text)
   */
  function text(g, s, x, y, o = {}) {
    const size = o.size || 18;
    g.save();
    g.font = `${o.weight || 400} ${size}px ${o.family || SANS}`;
    g.textAlign = o.align || "left";
    g.textBaseline = o.base || "alphabetic";
    g.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
    if (o.plate) {
      const w = g.measureText(s).width, px = size * 0.45, py = size * 0.28;
      const left = g.textAlign === "center" ? x - w / 2 : g.textAlign === "right" ? x - w : x;
      const top = g.textBaseline === "middle" ? y - size / 2 : g.textBaseline === "top" ? y : y - size * 0.82;
      g.fillStyle = typeof o.plate === "string" ? o.plate : "rgba(18, 25, 31, .82)";
      rr(g, left - px, top - py, w + px * 2, size + py * 2, size * 0.25);
      g.fill();
    }
    g.fillStyle = o.color || C.tinta;
    g.fillText(s, x, y);
    g.restore();
  }
  /** Path of a rounded rectangle. */
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }
  /** A filled circle, optionally with a soft halo. */
  function dot(g, x, y, r, color, glow = 0) {
    if (glow) {
      const halo = g.createRadialGradient(x, y, 0, x, y, r * (1 + glow));
      halo.addColorStop(0, rgba(color, 0.55)); halo.addColorStop(1, rgba(color, 0));
      g.fillStyle = halo;
      g.beginPath(); g.arc(x, y, r * (1 + glow), 0, TAU); g.fill();
    }
    g.fillStyle = color;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  /** A straight line with an arrow head at the end (and at the start, if `both`). */
  function arrow(g, x1, y1, x2, y2, color, width = 2, both = false) {
    const a = Math.atan2(y2 - y1, x2 - x1), s = 5 + width * 2;
    g.save();
    g.strokeStyle = g.fillStyle = color; g.lineWidth = width; g.lineCap = "round";
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    const head = (x, y, ang) => {
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x - s * Math.cos(ang - 0.45), y - s * Math.sin(ang - 0.45));
      g.lineTo(x - s * Math.cos(ang + 0.45), y - s * Math.sin(ang + 0.45));
      g.closePath(); g.fill();
    };
    head(x2, y2, a);
    if (both) head(x1, y1, a + Math.PI);
    g.restore();
  }
  /** The little burst that stands for one ionisation (an electron torn from an atom). */
  function spark(g, x, y, r, color, life) {
    g.save();
    g.globalAlpha *= clamp(life);
    g.strokeStyle = color; g.lineWidth = Math.max(1, r * 0.22); g.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 + 0.4, r1 = r * (1.1 - life) * 0.9, r2 = r * (1.5 - life * 0.5);
      g.beginPath(); g.moveTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); g.stroke();
    }
    g.restore();
  }

  /* ==========================================================================
     The simulations. Each one is a function that receives its tools (`api`) and
     returns frame(g, W, H, t, dt, passo): draw one picture in a W × H rectangle
     (virtual units), `t` seconds since the slide was opened, `dt` since the last
     picture, with `passo` builds shown.
     ========================================================================== */
  const SIMS = {};

  /* ---------- onda: wavelength, frequency, energy ---------- */
  SIMS.onda = (api) => {
    let offset = 0;          // how far the wave has travelled (virtual px)
    let pulse = 0;           // 1 when a crest has just passed the gate, fading to 0
    let lastCrest = 0;
    return (g, W, H, t, dt, passo) => {
      const s = api.ctl("lambda") / 100;                      // 0 = long wave, 1 = short wave
      const lambda = W * 0.46 * Math.pow(0.075 / 0.46, s);    // crest-to-crest distance on screen
      const speed = W * 0.2;                                  // the same for every wave: that is the point
      const freq = speed / lambda;                            // crests per second through any point
      const energy = clamp((freq - 0.43) / (2.67 - 0.43));    // 0…1 for the meter (energy grows with frequency)
      const hue = lerp(8, 268, s);                            // red for long waves, violet for short ones
      const color = `hsl(${hue}, 85%, 66%)`;
      offset += speed * dt;
      const x0 = W * 0.03, x1 = W * (passo >= 2 ? 0.8 : 0.97), midY = H * 0.43, amp = H * 0.17;
      const yAt = (x) => midY - amp * Math.cos((x - offset) / lambda * TAU);

      // axis and wave
      g.strokeStyle = rgba(C.tinta, 0.18); g.lineWidth = 1.5; g.setLineDash([6, 8]);
      g.beginPath(); g.moveTo(x0, midY); g.lineTo(x1, midY); g.stroke(); g.setLineDash([]);
      g.strokeStyle = color; g.lineWidth = 5; g.lineJoin = "round"; g.shadowColor = color; g.shadowBlur = 14;
      g.beginPath();
      for (let x = x0; x <= x1; x += 3) (x === x0 ? g.moveTo(x, yAt(x)) : g.lineTo(x, yAt(x)));
      g.stroke(); g.shadowBlur = 0;

      // the wavelength, measured between two neighbouring crests (the pair that is nearest the left third)
      let crest = offset % lambda + Math.ceil((W * 0.16 - offset % lambda) / lambda) * lambda;
      if (crest + lambda > x1 - 10) crest -= lambda;
      const top = midY - amp - 26;
      g.strokeStyle = rgba(C.tinta, 0.5); g.lineWidth = 1.5;
      for (const x of [crest, crest + lambda]) { g.beginPath(); g.moveTo(x, midY - amp - 6); g.lineTo(x, top - 8); g.stroke(); }
      arrow(g, crest + 4, top, crest + lambda - 4, top, C.tinta, 2.5, true);
      text(g, "comprimento de onda", crest + lambda / 2, top - 14, { size: 22, weight: 700, align: "center", plate: true });

      // from the first build on: a gate that counts the crests that pass in one second
      if (passo >= 1) {
        const gate = x1 - W * 0.07;
        const crestsPassed = Math.floor((offset - gate) / lambda);
        if (crestsPassed !== lastCrest) { lastCrest = crestsPassed; pulse = 1; }
        pulse = Math.max(0, pulse - dt * 3.5);
        g.strokeStyle = rgba(C.alperce, 0.9); g.lineWidth = 3; g.setLineDash([10, 7]);
        g.beginPath(); g.moveTo(gate, midY - amp - 14); g.lineTo(gate, midY + amp + 14); g.stroke(); g.setLineDash([]);
        dot(g, gate, midY - amp, 7 + pulse * 9, C.alperce, 0.6 + pulse * 2);
        text(g, "frequência", gate, midY + amp + 46, { size: 22, weight: 700, align: "center", color: C.alperce, plate: true });
        text(g, `${num(freq, 1)} cristas por segundo`, gate, midY + amp + 76, { size: 20, align: "center", plate: true });
      }

      // from the second build on: the energy of each packet of light (photon)
      if (passo >= 2) {
        const bx = W * 0.88, bw = W * 0.06, by = H * 0.14, bh = H * 0.6;
        rr(g, bx, by, bw, bh, 8); g.fillStyle = rgba(C.tinta, 0.1); g.fill();
        const fill = bh * lerp(0.06, 1, energy);
        rr(g, bx, by + bh - fill, bw, fill, 8); g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 18; g.fill(); g.shadowBlur = 0;
        text(g, "energia de", bx + bw / 2, by - 34, { size: 19, align: "center", color: C.areia });
        text(g, "cada fotão", bx + bw / 2, by - 12, { size: 19, weight: 700, align: "center" });
        text(g, "muita", bx - 10, by + 8, { size: 16, align: "right", base: "middle", color: C.areia });
        text(g, "pouca", bx - 10, by + bh - 8, { size: 16, align: "right", base: "middle", color: C.areia });
        // the photons themselves: as many per second for every wave, but each one carries more when the wave is short
        const py = H * 0.9, gap = W * 0.11, r = lerp(5, 15, energy);
        for (let x = x0 + (offset % gap); x < x1; x += gap) dot(g, x, py, r, color, 1.2 + energy);
        text(g, "fotões: pacotes de energia", x0, py - 30, { size: 18, color: C.areia });
      }
    };
  };

  /* ---------- espectro: from radio waves to gamma rays ---------- */
  SIMS.espectro = (api) => {
    // Regions by wavelength, as powers of ten of a metre (limits are conventions; NASA's and Britannica's are used here).
    const BANDS = [
      { nome: "Rádio", de: 3, a: -0.52, cor: "#B5553C" },
      { nome: "Micro-ondas", de: -0.52, a: -3, cor: "#C4703A" },
      { nome: "Infravermelho", de: -3, a: -6.155, cor: "#D08A3A" },
      { nome: "Luz visível", de: -6.155, a: -6.398, cor: "#FFFFFF" },
      { nome: "Ultravioleta", de: -6.398, a: -8, cor: "#8E6FD0" },
      { nome: "Raios X", de: -8, a: -11, cor: "#6F8FD8" },
      { nome: "Raios gama", de: -11, a: -13, cor: "#7FD0C4" },
    ];
    const IONIZA = -6.9;        // about 124 nm: photons of 10 electron-volts, enough to tear an electron from an atom
    const TICKS = [[3, "1 km"], [0, "1 m"], [-3, "1 mm"], [-6, "1 µm"], [-9, "1 nm"], [-12, "1 pm"]];
    // Everyday things about as large as the wave.
    const SIZES = [[1.7, "um campo de futebol"], [0.6, "um autocarro"], [-0.05, "uma pessoa"], [-0.6, "um braço"], [-1.3, "uma mão"],
      [-2.3, "uma abelha"], [-3.3, "a cabeça de um alfinete"], [-4.5, "a espessura de um cabelo"], [-5.5, "uma célula do corpo"],
      [-6.5, "uma bactéria"], [-7.7, "um vírus"], [-9.3, "uma molécula"], [-10.5, "um átomo"]];
    const USES = [[1.5, "rádio de onda média (AM)"], [0.3, "rádio FM (ondas de 3 m)"], [-0.52, "televisão, telemóvel"],
      [-1.5, "Wi-Fi e forno micro-ondas (12 cm)"], [-3, "radares"], [-5.5, "o calor que o teu corpo emite"],
      [-6.155, "comando da televisão"], [-6.398, "as cores: do vermelho ao violeta"], [IONIZA, "sol: bronzeado e escaldão"],
      [-8, "ultravioleta extremo"], [-11, "radiografias"], [-14, "núcleos radioativos, como o césio-137"]];
    const CESIO = -11.73;       // the gamma ray of caesium-137 (662 keV): 1.87 picometres
    const toSlider = (log) => (3 - log) / 16 * 100;
    let lastPasso = -1, offset = 0;

    /** Wavelength in a unit people can picture: "3 m", "12 cm", "550 nm". */
    function nice(log) {
      const m = Math.pow(10, log);
      const pick = [[1e3, "km"], [1, "m"], [1e-2, "cm"], [1e-3, "mm"], [1e-6, "µm"], [1e-9, "nm"], [1e-12, "pm"]];
      const [unit, name] = pick.find(([u]) => m >= u) || pick[pick.length - 1];
      const v = m / unit;
      return `${num(v, v < 10 ? 1 : 0)} ${name}`;
    }
    /** Energy of a photon compared with one of green light (550 nm), in words. */
    function energyWords(log) {
      const r = 550e-9 / Math.pow(10, log);
      if (r > 0.6 && r < 1.7) return "como a da luz que vemos";
      const big = (v) => (v < 1e3 ? num(+v.toPrecision(1)) : v < 1e6 ? `${num(+(v / 1e3).toPrecision(1))} mil`
        : v < 1e9 ? `${num(+(v / 1e6).toPrecision(1))} ${v < 1.5e6 ? "milhão" : "milhões"} de` : `${num(+(v / 1e9).toPrecision(1))} mil milhões de`);
      return r >= 1 ? `${big(r)} vezes a da luz visível` : `${big(1 / r)} vezes menos que a luz visível`;
    }
    const below = (table, log) => (table.find(([limit]) => log >= limit) || table[table.length - 1])[1];

    return (g, W, H, t, dt, passo) => {
      // On the last build the cursor goes to the gamma ray of caesium-137 (the class can still move it afterwards).
      if (passo !== lastPasso) { if (passo === 3) api.setCtl("lambda", toSlider(CESIO)); lastPasso = passo; }
      const s = api.ctl("lambda") / 100, log = 3 - 16 * s;
      const band = BANDS.find((b) => log <= b.de && log >= b.a) || BANDS[BANDS.length - 1];
      const bx = W * 0.03, bw = W * 0.94, by = H * 0.6, bh = H * 0.12;
      const xOf = (l) => bx + (3 - l) / 16 * bw;
      const ion = log <= IONIZA;

      // the wave for the chosen wavelength (drawn shorter and shorter, on a scale of its own)
      const lambda = W * 0.4 * Math.pow(0.02 / 0.4, s), midY = H * 0.36, amp = H * 0.085;
      offset += W * 0.16 * dt;
      const color = band.nome === "Luz visível" ? `hsl(${lerp(0, 270, (band.de - log) / (band.de - band.a))}, 90%, 65%)` : band.cor;
      const rows = [["comprimento de onda", nice(log)],
        ["do tamanho de", log < -10.5 ? "menos do que um átomo" : below(SIZES, log)],
        ["onde a encontras", below(USES, log)],
        ["energia de cada fotão", energyWords(log)]];
      g.font = `700 21px ${SANS}`;
      const wx0 = Math.max(W * 0.5, bx + 190 + Math.max(...rows.map(([, v]) => g.measureText(v).width)) + 26), wx1 = W * 0.97;
      g.strokeStyle = color; g.lineWidth = 4; g.shadowColor = color; g.shadowBlur = 12; g.lineJoin = "round";
      g.beginPath();
      for (let x = wx0; x <= wx1; x += 1.5) { const y = midY - amp * Math.cos((x - offset) / lambda * TAU); (x === wx0 ? g.moveTo(x, y) : g.lineTo(x, y)); }
      g.stroke(); g.shadowBlur = 0;

      // what the cursor is pointing at
      text(g, band.nome, bx, H * 0.1, { size: 44, weight: 700, family: SERIF, color: ion ? C.alperce : C.tinta });
      rows.forEach(([k, v], i) => {
        const y = H * 0.2 + i * 31;
        text(g, k, bx, y, { size: 17, color: C.areia });
        text(g, v, bx + 190, y, { size: 21, weight: 700, color: i === 3 && ion ? C.alperce : C.tinta });
      });

      // the band itself, one block per region; visible light is a thin rainbow
      for (const b of BANDS) {
        const xa = xOf(b.de), xb = xOf(b.a);
        if (b.nome === "Luz visível") {
          const rainbow = g.createLinearGradient(xa, 0, xb, 0);
          ["#E0453A", "#E8A13A", "#E8DC4A", "#58B85C", "#4A8FE0", "#7A56C8"].forEach((c, i) => rainbow.addColorStop(i / 5, c));
          g.fillStyle = rainbow; g.fillRect(xa - 1, by - 10, xb - xa + 2, bh + 20);
          g.strokeStyle = rgba(C.tinta, 0.6); g.lineWidth = 1.5;
          g.beginPath(); g.moveTo((xa + xb) / 2, by - 10); g.lineTo((xa + xb) / 2, by - 30); g.stroke();
          text(g, "luz visível", (xa + xb) / 2, by - 38, { size: 17, weight: 700, align: "center" });
        } else {
          g.fillStyle = rgba(b.cor, b === band ? 0.95 : 0.5); g.fillRect(xa, by, xb - xa - 2, bh);
          text(g, b.nome, (xa + xb) / 2, by + bh / 2, { size: xb - xa > 130 ? 20 : 16, weight: 700, align: "center", base: "middle", color: b === band ? C.fundo : C.tinta });
        }
      }
      for (const [l, label] of TICKS) {
        g.fillStyle = rgba(C.tinta, 0.5); g.fillRect(xOf(l) - 1, by + bh, 2, 9);
        text(g, label, xOf(l), by + bh + 28, { size: 16, align: l === 3 ? "left" : "center", color: C.areia });
      }
      text(g, "←  ondas mais longas", bx, by - 34, { size: 15, color: C.cinza });
      text(g, "ondas mais curtas  →", bx + bw, by - 34, { size: 15, align: "right", color: C.cinza });

      // builds 1 and 2: which side of the family can tear electrons from atoms
      const brace = (xa, xb, label, col, on) => {
        if (!on) return;
        const y = by + bh + 52;
        g.strokeStyle = col; g.lineWidth = 3;
        g.beginPath(); g.moveTo(xa, y - 8); g.lineTo(xa, y); g.lineTo(xb, y); g.lineTo(xb, y - 8); g.stroke();
        text(g, label, (xa + xb) / 2, y + 26, { size: 20, weight: 700, align: "center", color: col });
      };
      const wide = W > 850;                                         // on a phone only the two words fit
      brace(bx, xOf(IONIZA) - 5, wide ? "não ionizante: aquece ou faz vibrar, mas não arranca eletrões" : "não ionizante", C.ceu, passo >= 1);
      brace(xOf(IONIZA) + 5, bx + bw, wide ? "ionizante: arranca eletrões aos átomos" : "ionizante", C.alperce, passo >= 2);

      // the cursor
      const cx = xOf(log);
      g.fillStyle = C.tinta;
      g.beginPath(); g.moveTo(cx, by - 4); g.lineTo(cx - 11, by - 22); g.lineTo(cx + 11, by - 22); g.closePath(); g.fill();
      g.fillRect(cx - 1.5, by - 4, 3, bh + 8);
    };
  };

  /* ---------- tipos: alpha, beta and gamma against paper, aluminium and lead ---------- */
  SIMS.tipos = () => {
    const KINDS = [
      { id: "alfa", letra: "α", nome: "alfa", sub: "2 protões + 2 neutrões", cor: C.alfa, passo: 1, vel: 0.13, para: 0, cada: 0.9 },
      { id: "beta", letra: "β", nome: "beta", sub: "1 eletrão muito rápido", cor: C.beta, passo: 2, vel: 0.42, para: 1, cada: 0.5 },
      { id: "gama", letra: "γ", nome: "gama", sub: "onda (fotão), sem massa", cor: C.gama, passo: 3, vel: 0.6, para: 2, cada: 0.4 },
    ];
    const WALLS = [
      { nome: "papel", x: 0.5, w: 0.012, cor: C.tinta },
      { nome: "alumínio", sub: "alguns milímetros", x: 0.665, w: 0.03, cor: "#A9B6C2" },
      { nome: "chumbo ou betão", sub: "espesso", x: 0.83, w: 0.085, cor: "#5B6773" },
    ];
    const parts = [], sparks = [], clock = { alfa: 0, beta: 0, gama: 0 };
    // The nucleus: protons and neutrons packed in a ball (positions fixed once, so it only trembles).
    const nucleons = Array.from({ length: 34 }, (_, i) => {
      const a = i * 2.4, r = Math.sqrt(i / 34);
      return { x: Math.cos(a) * r, y: Math.sin(a) * r, p: i % 2 };
    });
    return (g, W, H, t, dt, passo) => {
      const nx = W * 0.09, ny = H * 0.5, nr = H * 0.11;
      const lane = (i) => H * (0.27 + i * 0.27);
      // barriers
      for (const wall of WALLS) {
        const x = W * wall.x, w = W * wall.w;
        g.fillStyle = rgba(wall.cor, 0.85); rr(g, x, H * 0.08, w, H * 0.84, 4); g.fill();
        text(g, W < 700 ? wall.nome.replace(" ou betão", "") : wall.nome, x + w / 2, H * 0.045, { size: W < 700 ? 17 : 21, weight: 700, align: "center" });
        if (wall.sub) text(g, wall.sub, x + w / 2, H * 0.97, { size: 16, align: "center", color: C.areia });
      }
      // the unstable nucleus
      const shake = passo >= 1 ? 2.2 : 1.2;
      for (const n of nucleons) {
        dot(g, nx + n.x * nr * 0.8 + Math.sin(t * 9 + n.x * 20) * shake, ny + n.y * nr * 0.8 + Math.cos(t * 8 + n.y * 20) * shake,
          nr * 0.17, n.p ? C.laranja : C.ardosia);
      }
      g.strokeStyle = rgba(C.alperce, 0.35 + 0.25 * Math.sin(t * 4)); g.lineWidth = 2;
      g.beginPath(); g.arc(nx, ny, nr * 1.25, 0, TAU); g.stroke();
      text(g, "núcleo instável", nx, ny + nr * 1.25 + 28, { size: 19, weight: 700, align: "center" });

      // send particles, each kind on its own lane, once its build has been reached
      KINDS.forEach((k, i) => {
        if (passo < k.passo) return;
        const y = lane(i);
        text(g, `${k.letra}  ${k.nome}`, W * 0.2, y - 54, { size: 30, weight: 700, family: SERIF, color: k.cor });
        text(g, k.sub, W * 0.2, y - 31, { size: 17, color: C.areia });
        clock[k.id] -= dt;
        if (clock[k.id] <= 0) {
          clock[k.id] = k.cada * rand(0.7, 1.3);
          // Lead weakens gamma rays, it does not stop every one: about one in six gets through here.
          parts.push({ k, i, x: nx + nr, y: ny, ty: y + rand(-14, 14), life: 1, stop: k.id === "gama" && Math.random() < 0.16 ? 9 : k.para, depth: rand(0.2, 0.8) });
        }
      });
      // move and draw them
      for (const p of parts) {
        const wall = WALLS[p.stop], k = p.k;
        const stopX = wall ? W * (wall.x + wall.w * (k.id === "alfa" ? 0 : p.depth)) : Infinity;
        if (p.life === 1) {
          p.x += W * k.vel * dt;
          p.y = lerp(ny, p.ty, ease((p.x - nx) / (W * 0.16)));
          if (p.x >= stopX) { p.x = stopX; p.life = 0.99; sparks.push({ x: p.x, y: p.y, life: 1, cor: k.cor }); }
          if (p.x > W + 40) p.life = 0;
        } else p.life -= dt * 2.5;
        g.save(); g.globalAlpha = clamp(p.life);
        if (k.id === "alfa") {
          for (const [dx, dy, pr] of [[-5, -5, 1], [5, 5, 1], [5, -5, 0], [-5, 5, 0]]) dot(g, p.x + dx, p.y + dy, 6.5, pr ? C.laranja : C.cinza);
          g.strokeStyle = rgba(k.cor, 0.6); g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 14, 0, TAU); g.stroke();
        } else if (k.id === "beta") {
          const trail = g.createLinearGradient(p.x - 46, 0, p.x, 0);
          trail.addColorStop(0, rgba(k.cor, 0)); trail.addColorStop(1, rgba(k.cor, 0.8));
          g.strokeStyle = trail; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x - 46, p.y); g.lineTo(p.x, p.y); g.stroke();
          dot(g, p.x, p.y, 5, k.cor, 1.5);
        } else {
          g.strokeStyle = k.cor; g.lineWidth = 3; g.shadowColor = k.cor; g.shadowBlur = 10;
          g.beginPath();
          for (let d = 0; d <= 54; d += 2) { const x = p.x - d, y = p.y + Math.sin(d * 0.42) * 7 * Math.sin(d / 54 * Math.PI); (d ? g.lineTo(x, y) : g.moveTo(x, y)); }
          g.stroke();
        }
        g.restore();
      }
      for (const s of sparks) { s.life -= dt * 1.8; spark(g, s.x, s.y, 13, s.cor, s.life); }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
      if (passo >= 4) text(g, W < 700 ? "cada faísca: uma ionização" : "cada faísca: uma ionização (um eletrão arrancado a um átomo)", 0, H * 0.97, { size: 18, color: C.alperce, weight: 700 });
    };
  };

  /* ---------- corpo: the three radiations as "atomic bullets" meeting a human body ----------
     Left: the whole body. Right: a patch of tissue 0.3 mm high, magnified, because the range of an
     alpha particle in the body (about 0.05 mm, two or three cells) cannot be seen at body scale.
     The class chooses the radiation (data-ctl="tipo") and where it comes from (data-ctl="onde"). */
  SIMS.corpo = (api) => {
    const COR = { alfa: C.alfa, beta: C.beta, gama: C.gama };
    const VEREDICTO = {
      "fora-alfa": "Não passa da camada morta da pele: nenhum dano.",
      "fora-beta": "Entra alguns milímetros: pode queimar a pele.",
      "fora-gama": "Atravessa o corpo todo e deixa ionizações pelo caminho.",
      "dentro-alfa": "Toda a energia fica em duas ou três células: o pior caso.",
      "dentro-beta": "Espalha ionizações por alguns milímetros de tecido.",
      "dentro-gama": "A maior parte sai do corpo; algumas ionizações ficam.",
    };
    const macro = [], tracks = [], sparksA = [], sparksB = [];
    let cells = [], modeKey = "", rate = 0, clockA = 0, clockB = 0, lastPasso = -1;

    return (g, W, H, t, dt, passo) => {
      // On the third build the scene becomes Chernobyl's: iodine-131 (a beta emitter) inside the thyroid.
      if (passo !== lastPasso) { if (passo >= 2 && lastPasso < 2) { api.setCtl("tipo", "beta"); api.setCtl("onde", "dentro"); } lastPasso = passo; }
      const tipo = api.ctl("tipo") || "alfa", onde = api.ctl("onde") || "fora", cor = COR[tipo];
      const tiroide = passo >= 2 && onde === "dentro";
      const key = `${onde}-${tipo}-${tiroide}`;

      /* ----- geometry of the body (units: fractions of its height) ----- */
      const bh = H * 0.9, by = H * 0.04, cx = W * 0.22;
      const X = (u) => cx + u * bh, Y = (v) => by + v * bh;
      const BOXES = [[-0.115, 0.165, 0.115, 0.52], [-0.185, 0.18, -0.13, 0.56], [0.13, 0.18, 0.185, 0.56], [-0.105, 0.5, -0.01, 1], [0.01, 0.5, 0.105, 1], [-0.025, 0.12, 0.025, 0.17]];
      const inBody = (x, y) => {
        const u = (x - cx) / bh, v = (y - by) / bh;
        return Math.hypot(u, v - 0.075) < 0.065 || BOXES.some(([a, b, c, d]) => u > a && u < c && v > b && v < d);
      };
      const src = onde === "fora" ? { x: X(-0.27), y: Y(0.33) } : tiroide ? { x: X(0), y: Y(0.152) } : { x: X(0.05), y: Y(0.27) };

      /* ----- the magnified patch ----- */
      const px = W * 0.47, py = H * 0.085, pw = W * 0.5, ph = H * 0.66, cs = ph / 13;
      const deadRows = onde === "fora" ? 3 : 0, deadY = py + deadRows * cs;
      const msrc = { x: px + pw * 0.4, y: py + ph * 0.5 };
      if (key !== modeKey) {
        modeKey = key; macro.length = tracks.length = sparksA.length = sparksB.length = 0; rate = 0;
        cells = [];
        for (let r = deadRows; r < 13; r++) for (let c = -1; c * cs < pw + cs; c++) cells.push({ x: px + (c + (r % 2 ? 0.5 : 0) + 0.5) * cs, y: py + (r + 0.5) * cs, d: 0 });
      }
      let hits = 0;
      /** One ionisation in the magnified patch: a spark, and damage to the living cell under it. */
      const ionise = (x, y, harm) => {
        if (x < px || x > px + pw || y < py || y > py + ph) return;
        sparksB.push({ x, y, life: 1 });
        if (y < deadY) return;                                   // dead skin: nothing alive to damage
        let best = null, bd = 1e9;
        for (const c of cells) { const d = (c.x - x) ** 2 + (c.y - y) ** 2; if (d < bd) { bd = d; best = c; } }
        if (best) { best.d = Math.min(1, best.d + harm); hits++; }
      };

      /* ----- body picture ----- */
      text(g, onde === "fora" ? "A fonte está fora do corpo" : tiroide ? "Iodo-131 na tiroide" : "A fonte está dentro do corpo", W * 0.02, H * 0.03, { size: 20, weight: 700, color: C.areia, base: "top" });
      g.fillStyle = rgba(C.tinta, 0.1); g.strokeStyle = rgba(C.tinta, 0.75); g.lineWidth = 2.5;
      g.beginPath(); g.arc(X(0), Y(0.075), 0.065 * bh, 0, TAU); g.fill(); g.stroke();
      for (const [a, b, c, d] of BOXES) { rr(g, X(a), Y(b), (c - a) * bh, (d - b) * bh, 0.03 * bh); g.fill(); g.stroke(); }
      // lungs, and the thyroid when the story reaches it
      g.fillStyle = rgba(C.ceu, 0.28);
      for (const side of [-1, 1]) { g.beginPath(); g.ellipse(X(side * 0.05), Y(0.27), 0.04 * bh, 0.075 * bh, 0, 0, TAU); g.fill(); }
      if (tiroide) {
        g.strokeStyle = C.alperce; g.lineWidth = 2;
        g.beginPath(); g.ellipse(X(0), Y(0.152), 0.03 * bh, 0.014 * bh, 0, 0, TAU); g.stroke();
        text(g, "tiroide", X(0.05), Y(0.15), { size: 17, color: C.alperce, weight: 700, base: "middle" });
      } else text(g, "pulmões", X(0.2), Y(0.27), { size: 15, color: C.cinza, base: "middle" });
      // the source
      dot(g, src.x, src.y, 6 + Math.sin(t * 6) * 1.5, cor, 3);
      if (onde === "fora") text(g, "poeira radioativa", src.x, src.y + 0.09 * bh, { size: 16, align: "center", color: C.areia });

      // fire the bullets
      const A = { alfa: [6, 0.13], beta: [8, 0.5], gama: [10, 0.9] }[tipo];           // [bullets per second, speed in body heights per second]
      clockA -= dt;
      while (clockA <= 0) {
        clockA += 1 / A[0];
        const ang = onde === "fora" ? rand(-0.55, 0.55) : rand(TAU);
        macro.push({ x: src.x, y: src.y, vx: Math.cos(ang) * A[1] * bh, vy: Math.sin(ang) * A[1] * bh, far: 0, life: 1, in: onde === "dentro",
          range: tipo === "alfa" ? (onde === "fora" ? 0.1 : 0.004) * bh : tipo === "beta" && onde === "dentro" ? rand(0.008, 0.02) * bh : 1e9, depth: rand(0.006, 0.014) * bh });
      }
      for (const p of macro) {
        if (p.life === 1) {
          const step = Math.hypot(p.vx, p.vy) * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.far += step;
          const inside = inBody(p.x, p.y);
          if (tipo === "alfa") {
            if (onde === "fora" && inside) p.life = 0.99;                         // stopped by the skin
            else if (p.far > p.range) { p.life = 0.99; if (onde === "dentro") sparksA.push({ x: p.x, y: p.y, life: 1 }); }
          } else if (tipo === "beta") {
            if (onde === "fora" && inside) { p.depth -= step; if (p.depth <= 0) { p.life = 0.99; sparksA.push({ x: p.x, y: p.y, life: 1 }); } }
            else if (p.far > p.range) { p.life = 0.99; sparksA.push({ x: p.x, y: p.y, life: 1 }); }
          } else if (inside && Math.random() < step / (0.22 * bh)) {              // a gamma ray meets an atom now and then
            sparksA.push({ x: p.x, y: p.y, life: 1 });
            if (Math.random() < 0.5) p.life = 0.99;
          }
          if (p.x < -20 || p.x > W * 0.45 || p.y < -20 || p.y > H + 20) p.life = 0;
        } else p.life -= dt * 3;
        g.save(); g.globalAlpha = clamp(p.life);
        const a = Math.atan2(p.vy, p.vx);
        if (tipo === "gama") {
          g.strokeStyle = cor; g.lineWidth = 2.5; g.shadowColor = cor; g.shadowBlur = 8;
          g.beginPath(); g.moveTo(p.x - Math.cos(a) * 20, p.y - Math.sin(a) * 20); g.lineTo(p.x, p.y); g.stroke();
        } else dot(g, p.x, p.y, tipo === "alfa" ? 5 : 3, cor, 1.2);
        g.restore();
      }
      for (const s of sparksA) { s.life -= dt * 1.6; spark(g, s.x, s.y, 8, C.tinta, s.life); }

      /* ----- magnified picture ----- */
      const lugar = onde === "fora" ? "pele" : tiroide ? "tiroide" : "pulmão";
      text(g, `Ampliação: 0,3 mm de ${lugar}`, px, py - 12, { size: 20, weight: 700, color: C.areia });
      // a line from the body to the patch, so the class sees what is being magnified
      const from = onde === "fora" ? { x: X(-0.185), y: Y(0.33) } : src;
      g.strokeStyle = rgba(C.tinta, 0.3); g.lineWidth = 1.5; g.setLineDash([5, 6]);
      g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(px, py); g.moveTo(from.x, from.y); g.lineTo(px, py + ph); g.stroke(); g.setLineDash([]);
      g.save();
      rr(g, px, py, pw, ph, 10); g.fillStyle = "#1B252E"; g.fill(); g.clip();
      if (deadRows) {
        // the outer layer of the skin: flat dead cells, no nucleus
        g.fillStyle = rgba(C.areia, 0.2); g.strokeStyle = rgba(C.areia, 0.35); g.lineWidth = 1;
        for (let r = 0; r < deadRows * 2; r++) for (let c = -1; c * cs * 1.6 < pw + cs; c++) {
          rr(g, px + (c + (r % 2 ? 0.5 : 0)) * cs * 1.6 + 2, py + r * cs / 2 + 2, cs * 1.6 - 4, cs / 2 - 3, 5); g.fill(); g.stroke();
        }
      }
      for (const c of cells) {
        c.d = Math.max(0, c.d - dt * 0.05);                                       // cells repair most damage, slowly
        g.fillStyle = c.d > 0.02 ? rgba(C.laranja, 0.15 + c.d * 0.8) : rgba(C.tinta, 0.07);
        g.strokeStyle = rgba(C.tinta, 0.28); g.lineWidth = 1.2;
        g.beginPath(); g.arc(c.x, c.y, cs * 0.46, 0, TAU); g.fill(); g.stroke();
        dot(g, c.x, c.y, cs * 0.15, c.d > 0.55 ? C.alperce : rgba(C.ceu, 0.75));
      }
      // new tracks
      const B = { alfa: 1.5, beta: 2.6, gama: 4.5 }[tipo];
      clockB -= dt;
      while (clockB <= 0) {
        clockB += 1 / B;
        const fromTop = onde === "fora";
        const tr = { tipo, x: fromTop ? px + rand(0.06, 0.94) * pw : msrc.x, y: fromTop ? py : msrc.y, a: fromTop ? Math.PI / 2 + rand(-0.28, 0.28) : rand(TAU),
          L: tipo === "alfa" ? (fromTop ? cs * rand(1.6, 2.4) : cs * rand(2.3, 2.9)) : pw * 1.3, at: 0, life: 1, next: 0, seed: rand(9),
          meet: tipo === "gama" && Math.random() < 0.18 ? rand(0.1, 0.5) * pw : -1 };
        tracks.push(tr);
      }
      const drawTrack = (tr) => {
        const speed = { alfa: cs * 5, beta: cs * 26, gama: cs * 40 }[tr.tipo];
        if (tr.at < tr.L) {
          const before = tr.at; tr.at = Math.min(tr.L, tr.at + speed * dt);
          // ionisations along the way: packed tight for alpha, far apart for beta, almost none for gamma
          const gap = tr.tipo === "alfa" ? cs * 0.2 : cs * 2.3;
          if (tr.tipo !== "gama") while (tr.next <= tr.at) { ionise(tr.x + Math.cos(tr.a) * tr.next, tr.y + Math.sin(tr.a) * tr.next, tr.tipo === "alfa" ? 0.3 : 0.22); tr.next += gap * rand(0.6, 1.4); }
          else if (tr.meet > before && tr.meet <= tr.at) {
            // the gamma ray hits an electron, which then does the damage over a short path of its own
            const mx = tr.x + Math.cos(tr.a) * tr.meet, my = tr.y + Math.sin(tr.a) * tr.meet;
            ionise(mx, my, 0.3);
            tracks.push({ tipo: "beta", x: mx, y: my, a: rand(TAU), L: cs * rand(3, 6), at: 0, life: 1, next: cs, seed: rand(9), meet: -1 });
            if (Math.random() < 0.5) tr.L = tr.meet;
          }
        } else tr.life -= dt * (tr.tipo === "alfa" ? 0.8 : 2);
        g.save(); g.globalAlpha = clamp(tr.life) * (tr.tipo === "alfa" ? 0.95 : 0.8);
        g.strokeStyle = COR[tr.tipo]; g.lineCap = "round"; g.lineWidth = tr.tipo === "alfa" ? 6 : 2;
        if (tr.tipo === "gama") g.setLineDash([7, 6]);
        g.beginPath();
        for (let d = 0; d <= tr.at; d += 6) {
          const wob = tr.tipo === "beta" ? Math.sin(d * 0.05 + tr.seed) * 5 : 0;
          const x = tr.x + Math.cos(tr.a) * d - Math.sin(tr.a) * wob, y = tr.y + Math.sin(tr.a) * d + Math.cos(tr.a) * wob;
          (d ? g.lineTo(x, y) : g.moveTo(x, y));
        }
        g.stroke();
        g.restore();
      };
      for (let i = 0; i < tracks.length; i++) drawTrack(tracks[i]);               // a gamma track may add a new one while we go
      for (const s of sparksB) { s.life -= dt * 1.5; spark(g, s.x, s.y, cs * 0.42, C.tinta, s.life); }
      if (onde === "dentro") dot(g, msrc.x, msrc.y, cs * 0.3, cor, 3);
      g.restore();
      if (deadRows) {
        g.strokeStyle = rgba(C.alperce, 0.8); g.lineWidth = 2; g.setLineDash([8, 6]);
        g.beginPath(); g.moveTo(px, deadY); g.lineTo(px + pw, deadY); g.stroke(); g.setLineDash([]);
        text(g, "camada morta da pele", px + pw - 10, py + cs * 1.5, { size: 17, weight: 700, align: "right", base: "middle", plate: true });
        text(g, "células vivas", px + pw - 10, deadY + cs * 1.2, { size: 17, weight: 700, align: "right", base: "middle", plate: true });
      } else text(g, "partícula radioativa", msrc.x, msrc.y - cs * 0.9, { size: 16, align: "center", plate: true });

      // verdict and damage meter
      rate = approach(rate, hits / Math.max(dt, 1e-3), dt, 1.5);
      const vy = py + ph + 34;
      text(g, VEREDICTO[`${onde}-${tipo}`], px, vy, { size: 22, weight: 700, color: cor });
      text(g, "ionizações nas células vivas", px, vy + 34, { size: 17, color: C.areia });
      const mx = px + 232, mw = pw - 232;
      rr(g, mx, vy + 21, mw, 14, 7); g.fillStyle = rgba(C.tinta, 0.12); g.fill();
      rr(g, mx, vy + 21, mw * clamp(rate / 26), 14, 7); g.fillStyle = mix(C.ceu, "#E0603A", rate / 20); g.fill();

      for (const list of [macro, tracks, sparksA, sparksB]) for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
    };
  };

  /* ---------- reator: a reactor of the Chernobyl type (RBMK), in section ----------
     data-cena="funciona": fission (build 0), chain reaction (1), then the reactor itself (2 and later),
                           with the control rods moved by the slider data-ctl="barras".
     data-cena="acidente": the night of 26 April 1986, one build per moment (see ROTEIRO).
     The picture is a diagram, not a scale drawing: six fuel channels and five control rods stand
     for the hundreds the real reactor had. What is kept true is what the story needs: water goes up and boils, graphite
     surrounds the channels, and each control rod has a graphite piece below the absorber, with a
     column of water under it when the rod is out. */
  SIMS.reator = (api) => {
    const acidente = api.host.dataset.cena === "acidente";
    // The accident, build by build. Values a build does not give are computed in state() below.
    const ROTEIRO = [
      { relogio: "25 de abril", P: 3200, barras: 0.55, agua: 1, vapor: 0.4, turbina: 1 },
      { relogio: "26 de abril · 00:28", P: 30, barras: 0.55, agua: 1, vapor: 0.02, turbina: 0.22 },
      { relogio: "01:03", P: 200, barras: 0.04, agua: 1.15, vapor: 0.08, turbina: 0.3 },
      { relogio: "01:23:04" }, { relogio: "01:23:40" }, { relogio: "01:24" }, { relogio: "26 de abril a 6 de maio" },
    ];
    const neutrons = [], bubbles = [], debris = [], smoke = [];
    const now = { logP: Math.log10(acidente ? 3200 : 3200), barras: 0.55, agua: 1, vapor: 0.4, turbina: 1 };
    let lastPasso = -1, tp = 0, spin = 0, pumpSpin = 0, flowPhase = 0, flash = 0, loopAt = 0;
    const chain = { born: 0 };

    /** What the reactor should be doing at this build, `tp` seconds after the build began. */
    function state(passo) {
      if (!acidente) {
        const barras = api.ctl("barras") / 100;
        const pct = clamp(Math.pow((1 - barras) / 0.45, 1.6), 0, 1.6);
        return { P: Math.max(1, 3200 * pct), barras, agua: 1, vapor: 0.4 * pct, turbina: pct, relogio: "" };
      }
      const s = Object.assign({}, ROTEIRO[Math.min(passo, ROTEIRO.length - 1)]);
      const k = ease(tp / 9);
      if (passo === 3) Object.assign(s, { P: 200 + 330 * k, barras: 0.04, agua: lerp(1.15, 0.6, k), vapor: lerp(0.08, 0.75, k), turbina: lerp(0.3, 0.08, k),
        relogio: `01:23:${String(Math.min(40, 4 + Math.floor(tp * 4))).padStart(2, "0")}` });
      if (passo === 4) Object.assign(s, { P: 530 * Math.pow(10, Math.min(tp, 7) / 7 * 2.78), barras: 0.04 + 0.46 * ease(tp / 7), agua: 0.5, vapor: 1, turbina: 0.05,
        relogio: `01:23:${40 + Math.min(7, Math.floor(tp))}` });
      if (passo >= 5) Object.assign(s, { P: 320000, barras: 0.5, agua: 0, vapor: 1, turbina: 0 });
      return s;
    }

    /** The first two builds of "funciona": one fission, then the chain reaction, without any reactor around them. */
    function drawChain(g, W, H, t, passo) {
      const nucleus = (x, y, r, n, wob = 0) => {
        for (let i = 0; i < n; i++) {
          const a = i * 2.4, d = Math.sqrt((i + 0.5) / n) * r * 0.85;
          dot(g, x + Math.cos(a) * d + Math.sin(t * 9 + i) * wob, y + Math.sin(a) * d + Math.cos(t * 8 + i) * wob, Math.max(2.2, r * 0.9 / Math.sqrt(n)), i % 2 ? C.laranja : C.ardosia);
        }
      };
      const neutron = (x, y) => dot(g, x, y, 6, "#FFF3B0", 2);
      if (passo === 0) {
        const T = t % 7, cx = W * 0.5, cy = H * 0.5, R = H * 0.14;
        if (T < 2.3) {
          nucleus(cx, cy, R, 46, T > 1.7 ? 5 : 1);
          text(g, "núcleo de urânio-235", cx, cy + R + 34, { size: 22, weight: 700, align: "center" });
          const nx = lerp(W * 0.1, cx - R, clamp(T / 1.7));
          if (T < 1.7) { neutron(nx, cy); text(g, "neutrão", nx, cy - 22, { size: 20, align: "center", color: "#FFF3B0" }); }
        } else {
          const k = ease((T - 2.3) / 2.2), fade = clamp((7 - T) / 0.8);
          g.save(); g.globalAlpha = fade;
          // heat: a ring that spreads
          g.strokeStyle = rgba("#E0603A", (1 - k) * 0.9); g.lineWidth = 10 * (1 - k) + 1;
          g.beginPath(); g.arc(cx, cy, R * (1 + k * 2.4), 0, TAU); g.stroke();
          nucleus(cx - W * 0.17 * k, cy - H * 0.13 * k, R * 0.72, 24, 1); nucleus(cx + W * 0.17 * k, cy + H * 0.13 * k, R * 0.68, 22, 1);
          for (const a of [-0.5, 0.75, 2.6]) neutron(cx + Math.cos(a) * W * 0.3 * k, cy + Math.sin(a) * H * 0.42 * k);
          if (k > 0.5) {
            text(g, "dois núcleos mais pequenos", cx - W * 0.17, cy - H * 0.13 - R * 0.9, { size: 20, align: "center", alpha: (k - 0.5) * 2 });
            text(g, "2 ou 3 neutrões novos", cx + W * 0.3, cy - H * 0.26, { size: 20, align: "center", color: "#FFF3B0", alpha: (k - 0.5) * 2 });
            text(g, "calor", cx, cy + 8, { size: 34, weight: 700, family: SERIF, align: "center", color: "#F08A5A", alpha: (k - 0.5) * 2 });
          }
          g.restore();
        }
        return;
      }
      // chain reaction: every fission sets off two more (generations of 1, 2, 4, 8 and 16 nuclei)
      const GEN = 5, LEG = 1.1, T = (t - chain.born) % (GEN * LEG + 2.5);
      const pos = (gen, i) => ({ x: lerp(W * 0.24, W * 0.94, gen / (GEN - 1)), y: H * (0.16 + 0.8 * (i + 0.5) / 2 ** gen) });
      let count = 0;
      for (let gen = 0; gen < GEN; gen++) {
        const hitAt = gen * LEG + 0.6, split = T > hitAt;
        for (let i = 0; i < 2 ** gen; i++) {
          const p = pos(gen, i), r = lerp(20, 9, gen / (GEN - 1));
          if (!split) nucleus(p.x, p.y, r, 9);
          else {
            const k = clamp((T - hitAt) / 0.6);
            nucleus(p.x - r * 0.7 * k, p.y - r * 0.5 * k, r * 0.62, 5); nucleus(p.x + r * 0.7 * k, p.y + r * 0.5 * k, r * 0.62, 4);
            g.strokeStyle = rgba("#E0603A", 1 - k); g.lineWidth = 4; g.beginPath(); g.arc(p.x, p.y, r * (1 + k * 1.8), 0, TAU); g.stroke();
            // its two neutrons, on their way to the next generation
            if (gen < GEN - 1) for (const child of [2 * i, 2 * i + 1]) {
              const q = pos(gen + 1, child), f = clamp((T - hitAt) / LEG);
              if (f < 1) neutron(lerp(p.x, q.x, f), lerp(p.y, q.y, f));
            }
          }
        }
        if (split) count += 2 ** gen;
        text(g, String(2 ** gen), pos(gen, 0).x, H * 0.07, { size: 30, weight: 700, family: SERIF, align: "center", color: split ? C.alperce : rgba(C.tinta, 0.25) });
      }
      if (T < 0.6) neutron(lerp(W * 0.04, pos(0, 0).x, T / 0.6), pos(0, 0).y);
      text(g, "fissões de cada vez", 0, H * 0.065, { size: 17, color: C.areia });
      text(g, `total: ${count}`, 0, H * 0.97, { size: 28, weight: 700, family: SERIF, color: C.alperce });
    }

    return (g, W, H, t, dt, passo) => {
      if (passo !== lastPasso) {
        tp = 0; lastPasso = passo; chain.born = t;
        if (acidente && passo === 5) { flash = 1; debris.length = 0; for (let i = 0; i < 46; i++) debris.push({ x: 0, y: 0, vx: rand(-1, 1) * 0.45, vy: -rand(0.25, 1), r: rand(3, 9), c: Math.random() < 0.5 ? C.grafite : "#E0603A", a: rand(TAU) }); }
      }
      tp += dt;
      if (!acidente && passo < 2) return drawChain(g, W, H, t, passo);

      const s = state(passo);
      const fast = acidente && passo >= 4;
      now.logP = approach(now.logP, Math.log10(s.P), dt, fast ? 9 : 2.2);
      for (const k of ["barras", "agua", "vapor", "turbina"]) now[k] = approach(now[k], s[k], dt, fast ? 6 : 2.5);
      const P = Math.pow(10, now.logP), heat = clamp((now.logP - 1.3) / 2.6);       // 0 at 20 MW, 1 near 8000 MW
      const boom = acidente && passo >= 5;

      /* ----- layout ----- */
      const cx = W * 0.1, cw = W * 0.38, cy = H * 0.34, ch = H * 0.4, slot = cw / 11;
      const ground = H * 0.92, roof = H * 0.07, wallL = cx - W * 0.045, wallR = cx + cw + W * 0.045;
      const shake = boom && tp < 0.9 && !calm ? (1 - tp / 0.9) * 9 : fast && !boom && !calm ? clamp(now.logP - 3.2, 0, 2) * 1.6 : 0;
      g.save(); g.translate(rand(-shake, shake), rand(-shake, shake));

      // building and ground
      g.strokeStyle = rgba(C.tinta, 0.4); g.lineWidth = 2.5; g.fillStyle = rgba(C.tinta, 0.03);
      g.beginPath(); g.moveTo(wallL, ground); g.lineTo(wallL, roof);
      if (boom) { g.lineTo(cx + cw * 0.12, roof); g.moveTo(cx + cw * 0.9, roof); }           // the roof is gone above the core
      g.lineTo(wallR, roof); g.lineTo(wallR, ground); g.stroke();
      g.strokeStyle = rgba(C.tinta, 0.25); g.beginPath(); g.moveTo(0, ground); g.lineTo(W, ground); g.stroke();

      // graphite stack (the moderator) and the glow of the core
      g.fillStyle = C.grafite; g.fillRect(cx, cy, cw, ch);
      g.strokeStyle = rgba(C.tinta, 0.07); g.lineWidth = 1;
      for (let y = cy + ch / 8; y < cy + ch - 1; y += ch / 8) { g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + cw, y); g.stroke(); }
      // lower header: where the water comes in
      g.fillStyle = rgba(C.agua, 0.55); g.fillRect(cx, cy + ch, cw, H * 0.05);
      const glow = g.createRadialGradient(cx + cw / 2, cy + ch * (fast ? 0.72 : 0.5), 0, cx + cw / 2, cy + ch / 2, cw * 0.62);
      glow.addColorStop(0, rgba("#FF7A30", 0.12 + heat * 0.55 + (fast ? clamp(now.logP - 3.5, 0, 1.5) * 0.25 : 0))); glow.addColorStop(1, rgba("#FF7A30", 0));
      g.fillStyle = glow; g.fillRect(cx - cw * 0.3, cy - ch * 0.4, cw * 1.6, ch * 1.9);

      // channels: even slots carry fuel and boiling water, odd slots carry a control rod
      flowPhase += dt * now.agua;
      for (let i = 0; i < 11; i++) {
        const x = cx + (i + 0.5) * slot;
        if (i % 2 === 0) {
          const w = slot * 0.52;
          const water = g.createLinearGradient(0, cy + ch, 0, cy);
          water.addColorStop(0, C.agua); water.addColorStop(clamp(1 - now.vapor * 1.1, 0.02, 0.98), C.agua); water.addColorStop(1, mix(C.agua, C.vapor, clamp(now.vapor * 1.6)));
          g.fillStyle = boom ? "#2A323A" : water; g.fillRect(x - w / 2, cy, w, ch);
          g.fillStyle = mix("#B5653A", "#FFD08A", heat); g.shadowColor = "#FF8A3A"; g.shadowBlur = heat * 18;
          g.fillRect(x - w * 0.14, cy + 4, w * 0.28, ch - 8); g.shadowBlur = 0;
        } else {
          const w = slot * 0.44, y0 = cy + now.barras * ch;
          g.save(); g.beginPath(); g.rect(x - w / 2 - 2, roof + 4, w + 4, cy + ch + H * 0.05 - roof - 4); g.clip();
          if (boom) g.globalAlpha = 0.45;
          g.fillStyle = rgba(C.agua, 0.7); g.fillRect(x - w / 2, cy, w, ch);                      // the channel is full of water…
          g.fillStyle = "#9AA3AB"; g.fillRect(x - w / 2, y0 + ch * 0.18, w, ch * 0.64);         // …except where the graphite piece sits
          g.fillStyle = C.tinta; g.fillRect(x - w / 2, y0 - ch, w, ch);                          // the absorber, above it
          g.fillStyle = C.fundo; for (let y = y0 - ch + 8; y < y0; y += 16) g.fillRect(x - w / 2, y, w, 3);
          g.fillStyle = rgba(C.tinta, 0.6); g.fillRect(x - 1.5, y0, 3, ch * 0.18);                // the link between the two
          g.restore();
        }
      }
      // steam bubbles in the fuel channels: more of them, and lower down, as the water boils harder
      const want = boom ? 0 : Math.round(now.vapor * 70);
      while (bubbles.length < want) bubbles.push({ ch: Math.floor(rand(6)) * 2, y: rand(1 - now.vapor, 1) * rand(), dx: rand(-1, 1) });
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.y -= dt * (0.25 + now.agua * 0.25);
        if (b.y < 0 || bubbles.length > want + 6) { bubbles.splice(i, 1); continue; }
        dot(g, cx + (b.ch + 0.5) * slot + b.dx * slot * 0.17, cy + b.y * ch, 2.2 + (1 - b.y) * 2.6, rgba(C.vapor, 0.85));
      }
      // neutrons: the more there are, the more power; when the rods fall their graphite ends light up the bottom
      const nWant = boom ? 0 : Math.round(clamp(8 + (now.logP - 1.5) * 34, 6, 190));
      while (neutrons.length < nWant) neutrons.push({ x: rand(), y: acidente && passo === 4 ? rand(0.6, 1) : rand(), a: rand(TAU) });
      if (neutrons.length > nWant) neutrons.length = nWant;
      for (const n of neutrons) {
        n.a += rand(-1, 1) * 0.6; n.x += Math.cos(n.a) * dt * 0.5; n.y += Math.sin(n.a) * dt * 0.5;
        if (n.x < 0 || n.x > 1) { n.a = Math.PI - n.a; n.x = clamp(n.x); }
        if (n.y < 0 || n.y > 1) { n.a = -n.a; n.y = clamp(n.y); }
        dot(g, cx + n.x * cw, cy + n.y * ch, 2.4, "#FFF3B0", 1.4);
      }

      // the lid ("tampa"): 1000 tonnes of steel and concrete, thrown aside by the steam
      const lidW = cw + W * 0.04, lidH = H * 0.045;
      let lx = cx - W * 0.02, ly = cy - lidH, la = 0;
      if (boom) {
        const k = passo === 5 ? clamp(tp / 1.6) : 1;                                       // flight, then rest
        ly += -H * 0.3 * Math.sin(k * Math.PI) * (passo === 5 ? 1 : 0) - H * 0.1 * k; la = 0.27 * k;
      }
      g.save(); g.translate(lx + lidW / 2, ly + lidH / 2); g.rotate(la);
      g.fillStyle = "#B9BFC4"; rr(g, -lidW / 2, -lidH / 2, lidW, lidH, 4); g.fill();
      g.restore();

      /* ----- the steam circuit: core → turbine → condenser → pumps → core ----- */
      const tx = W * 0.71, ty = H * 0.63, tr = H * 0.075, gx = W * 0.86, pxp = W * 0.6, pyp = H * 0.83;
      const pipe = (pts, color, speed) => {
        g.strokeStyle = rgba(color, 0.9); g.lineWidth = 9; g.lineJoin = "round"; g.lineCap = "butt"; g.setLineDash([]);
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        g.strokeStyle = rgba(C.fundo, 0.55); g.lineWidth = 3; g.setLineDash([10, 14]); g.lineDashOffset = -flowPhase * 60 * speed;
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
      };
      const live = boom ? 0 : 1;
      pipe([[cx + cw, cy + H * 0.035], [W * 0.585, cy + H * 0.035], [W * 0.585, ty - tr * 0.3], [tx - tr, ty - tr * 0.3]], C.vapor, live * (0.4 + now.vapor));
      pipe([[tx, ty + tr], [tx, pyp], [pxp + 16, pyp]], C.agua, live);
      pipe([[pxp - 16, pyp], [W * 0.535, pyp], [W * 0.535, cy + ch + H * 0.025], [cx + cw, cy + ch + H * 0.025]], C.agua, live);
      // turbine (a wheel of blades), generator and pump
      spin += dt * now.turbina * 7; pumpSpin += dt * now.agua * 5;
      const wheel = (x, y, r, angle, blades, color) => {
        g.fillStyle = "#22303A"; g.strokeStyle = color; g.lineWidth = 3;
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
        for (let b = 0; b < blades; b++) { const a = angle + b * TAU / blades; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86); g.stroke(); }
        dot(g, x, y, r * 0.16, color);
      };
      wheel(tx, ty, tr, spin, 8, C.vapor);
      wheel(pxp, pyp, H * 0.035, pumpSpin, 4, C.ceu);
      g.strokeStyle = C.cinza; g.lineWidth = 6; g.beginPath(); g.moveTo(tx + tr, ty); g.lineTo(gx - H * 0.06, ty); g.stroke();
      rr(g, gx - H * 0.06, ty - H * 0.055, H * 0.12, H * 0.11, 8); g.fillStyle = "#22303A"; g.fill(); g.strokeStyle = C.alperce; g.lineWidth = 3; g.stroke();
      const volts = clamp(now.turbina);
      g.fillStyle = rgba(C.ouro, 0.25 + volts * 0.75); g.shadowColor = C.ouro; g.shadowBlur = volts * 22;
      g.beginPath(); g.moveTo(gx + 5, ty - 26); g.lineTo(gx - 13, ty + 4); g.lineTo(gx - 1, ty + 4); g.lineTo(gx - 7, ty + 26); g.lineTo(gx + 13, ty - 6); g.lineTo(gx + 1, ty - 6); g.closePath(); g.fill(); g.shadowBlur = 0;
      const lab = (s2, x, y, on = true, o = {}) => { if (on) text(g, s2, x, y, Object.assign({ size: 17, align: "center", plate: true }, o)); };
      lab("turbina", tx, ty + tr + 24); lab("gerador", gx, ty + H * 0.055 + 24); lab("bombas", pxp, pyp + H * 0.035 + 22);
      lab("vapor", W * 0.585 + 34, cy + H * 0.035 - 16, !boom, { color: C.vapor }); lab("água", W * 0.535 - 28, pyp - 16, !boom && !(acidente && passo === 3), { color: C.ceu });

      /* ----- labels on the reactor, by build ----- */
      const rodX = cx + 1.5 * slot, fuelX = cx + 4.5 * slot;
      if (!acidente) {
        lab("barras de controlo: absorvem neutrões", cx + cw / 2, roof + 26, passo >= 2, { color: C.tinta, weight: 700 });
        lab("combustível: urânio", fuelX, cy + ch + H * 0.05 + 26, passo >= 2, { color: C.alperce });
        lab("grafite: abranda os neutrões", cx + cw / 2, cy + ch * 0.5, passo >= 4, { color: C.tinta, weight: 700 });
        lab("água: arrefece e absorve alguns neutrões", cx + cw / 2, cy + ch * 0.82, passo >= 4, { color: C.ceu, weight: 700 });
      } else {
        lab("quase todas as barras cá fora", cx + cw / 2, roof + 26, passo === 2 || passo === 3, { color: C.alperce, weight: 700 });
        if (passo === 3) {
          // the loop that feeds itself: the four labels light up one after the other
          loopAt = (t * 1.1) % 4;
          loopAt = (t * 1.1) % 3;
          const yTop = cy - H * 0.085, yBot = cy + ch + H * 0.11, xr = cx + cw + 14;
          const loop = [["mais vapor", cx + cw * 0.84, yTop], ["mais fissões", cx + cw * 0.16, yTop], ["mais calor", cx + cw * 0.16, yBot]];
          arrow(g, cx + cw * 0.66, yTop - 5, cx + cw * 0.37, yTop - 5, C.alperce, 3);              // vapor → fissões
          arrow(g, cx - 16, cy + ch * 0.1, cx - 16, cy + ch * 0.9, C.alperce, 3);                    // fissões → calor
          g.strokeStyle = C.alperce; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + cw * 0.34, yBot - 5); g.lineTo(xr, yBot - 5); g.stroke();
          arrow(g, xr, yBot - 5, xr, cy + ch * 0.12, C.alperce, 3);                                 // calor → ainda mais vapor
          loop.forEach(([s2, x, y], i) => lab(s2, x, y, true, { size: 20, weight: 700, color: Math.floor(loopAt) === i ? C.fundo : C.alperce, plate: Math.floor(loopAt) === i ? C.alperce : true }));
          lab("menos água", pxp, pyp - H * 0.035 - 16, true, { size: 19, weight: 700, color: C.fundo, plate: C.ceu });
        }
        if (passo === 4) {
          const yTip = cy + now.barras * ch + ch * 0.82;
          g.fillStyle = rgba("#FF7A30", 0.25 + 0.2 * Math.sin(t * 10)); g.fillRect(cx, cy + ch * 0.8, cw, ch * 0.2);
          lab("as barras descem devagar: 18 segundos até ao fundo", cx + cw / 2, roof + 26, true, { weight: 700 });
          lab("ponta de grafite: empurra a água e acelera a reação", cx + cw / 2, cy + ch + H * 0.11, true, { size: 19, weight: 700, color: C.fundo, plate: C.alperce });
          arrow(g, rodX + slot * 0.9, cy + ch + H * 0.075, rodX + 4, Math.min(yTip, cy + ch) - 4, C.alperce, 3);
        }
      }

      /* ----- explosion and what came after ----- */
      if (boom) {
        const ox = cx + cw / 2, oy = cy;
        if (passo === 5) for (const d of debris) {
          d.vy += dt * 1.5; d.x += d.vx * dt; d.y += d.vy * dt; d.a += dt * 6;
          g.save(); g.translate(ox + d.x * W * 0.5, oy + d.y * H * 0.55); g.rotate(d.a); g.fillStyle = d.c; g.fillRect(-d.r, -d.r * 0.6, d.r * 2, d.r * 1.2); g.restore();
        }
        // the open core burns and smokes; the wind carries the smoke away
        if (smoke.length < 70 && Math.random() < dt * 22) smoke.push({ x: rand(-0.4, 0.4) * cw, y: 0, r: rand(10, 22), life: 1, vx: rand(8, 40), vy: -rand(40, 85) });
        for (let i = smoke.length - 1; i >= 0; i--) {
          const p = smoke[i];
          p.x += p.vx * dt * (1.6 - p.life); p.y += p.vy * dt; p.r += dt * 16; p.life -= dt * 0.22;
          if (p.life <= 0) { smoke.splice(i, 1); continue; }
          dot(g, ox + p.x, oy + p.y, p.r, rgba(p.life > 0.8 ? "#E0603A" : "#77818A", p.life * 0.32));
        }
        const fire = g.createRadialGradient(ox, cy + ch * 0.2, 0, ox, cy + ch * 0.2, cw * 0.6);
        fire.addColorStop(0, rgba("#FFB040", 0.7 + 0.15 * Math.sin(t * 13))); fire.addColorStop(1, rgba("#FF5020", 0));
        g.fillStyle = fire; g.fillRect(cx - cw * 0.2, cy - ch * 0.5, cw * 1.4, ch * 1.3);
        lab("tampa: 1000 toneladas", lx + lidW / 2 + W * 0.02, ly - 26, passo === 5 && tp > 1.4, { weight: 700 });
        if (passo >= 6) {
          lab("iodo-131", ox + W * 0.1, roof + H * 0.02, true, { color: C.gama, weight: 700, size: 19 });
          lab("césio-137", ox + W * 0.22, roof - H * 0.03 + 30, true, { color: C.gama, weight: 700, size: 19 });
          lab("sem cúpula de contenção: tudo sai para o ar", cx + cw / 2, cy + ch + H * 0.11, true, { weight: 700, color: C.alperce });
        }
      } else smoke.length = 0;
      g.restore();   // end of the shaking

      /* ----- instruments ----- */
      const ix = W * 0.585, iw = W * 0.395;
      if (acidente) text(g, s.relogio, ix, H * 0.075, { size: 30, weight: 700, family: MONO, color: C.alperce });
      text(g, "POTÊNCIA DO REATOR", ix, H * (acidente ? 0.135 : 0.075), { size: 15, weight: 700, color: C.areia });
      const over = P > 3500, by2 = H * (acidente ? 0.2 : 0.14);
      const reading = boom && (passo > 5 || tp > 1.6) ? "reator destruído" : acidente ? `${num(P >= 1000 ? Math.round(P / 100) * 100 : Math.round(P / 10) * 10)} MW` : `${num(Math.round(P / 3200 * 100))} %`;
      text(g, reading, ix, by2 + 12, { size: reading.length > 12 ? 30 : 42, weight: 700, family: SERIF, color: over ? "#FF8A5A" : C.tinta });
      if (acidente && reading !== "reator destruído") {
        // a scale where each mark is ten times the one before, so 30 MW and 320 000 MW both fit
        const barY = by2 + 30, toX = (v) => ix + clamp((Math.log10(v) - 1) / 4.6) * iw;
        rr(g, ix, barY, iw, 12, 6); g.fillStyle = rgba(C.tinta, 0.12); g.fill();
        rr(g, ix, barY, Math.max(8, toX(P) - ix), 12, 6); g.fillStyle = over ? "#E0603A" : C.ceu; g.fill();
        g.fillStyle = C.tinta; g.fillRect(toX(3200) - 1.5, barY - 5, 3, 22);
        text(g, "normal: 3200 MW", toX(3200), barY + 36, { size: 15, align: "center", color: C.areia });
        if (passo === 4 || (passo === 5 && tp < 1.6)) text(g, "100 × o normal", ix + iw, barY + 36, { size: 15, align: "right", color: "#FF8A5A", weight: 700 });
      }
      if (flash > 0) { flash -= dt * 1.4; if (!calm) { g.fillStyle = rgba("#FFF3D0", clamp(flash) * 0.85); g.fillRect(-W, -H, W * 3, H * 3); } }
    };
  };

  /* ---------- mapa: from Portugal to the Pacific ----------
     Outlines come from chernobyl-mapa.js (longitude and latitude). They are projected here, while
     drawing, with the Lambert azimuthal equal-area projection (the one the European Union uses for
     its maps: areas compare honestly). Because the projection is computed on the spot, its centre
     can move: the "camera" glides from the whole Soviet Union to Europe.

     A scene (data-cena) is a list of builds. Each build says where the camera is and, through the
     functions below, how each country is painted and what is drawn on top. */
  SIMS.mapa = (api) => {
    const DATA = window.URSS_MAPA;
    const cena = api.host.dataset.cena;
    const RAD = Math.PI / 180, R = 6371;
    const URSS = ["RU", "UA", "BY", "MD", "EE", "LV", "LT", "GE", "AM", "AZ", "KZ", "UZ", "TM", "KG", "TJ"];
    const UE15 = ["BE", "FR", "DE", "IT", "LU", "NL", "DK", "IE", "UK", "GR", "PT", "ES", "AT", "FI", "SE"];
    const UE2004 = ["CY", "CZ", "EE", "HU", "LV", "LT", "MT", "PL", "SK", "SI"];
    const UE_DEPOIS = ["BG", "RO", "HR"];                      // 2007, 2007 and 2013
    // Where each name is written (longitude, latitude) and, for small countries, how far the name is pushed away (in units of text size).
    const NOME = {
      RU: [96, 62, "Rússia"], UA: [31.5, 49, "Ucrânia"], BY: [28, 53.4, "Bielorrússia"], MD: [28.6, 47.2, "Moldávia", -4, 2.6],
      EE: [25.6, 58.8, "Estónia", -5.5, -1.6], LV: [25, 57, "Letónia", -6, 0], LT: [23.9, 55.3, "Lituânia", -5.5, 1.5],
      GE: [43.5, 42.2, "Geórgia", -5, 1.6], AM: [44.9, 40.3, "Arménia", -3, 2.6], AZ: [48, 40.4, "Azerbaijão", 1.5, 3.2],
      KZ: [67, 48.5, "Cazaquistão"], UZ: [63.3, 41.9, "Usbequistão", -2, 2.6], TM: [59, 39.3, "Turquemenistão", -4, 3],
      KG: [74.8, 41.5, "Quirguistão", 5, -0.8], TJ: [71, 38.8, "Tajiquistão", 4, 2],
    };
    // One tint per republic for the moment they become fifteen countries (neighbours never share a tint).
    const TINTA = { RU: "#B5553C", UA: "#E8C65A", BY: "#8FBF8F", MD: "#F0A673", EE: "#7FB0D0", LV: "#B58AC4", LT: "#E8C65A", GE: "#8FBF8F",
      AM: "#B58AC4", AZ: "#7FB0D0", KZ: "#D9A066", UZ: "#8FBF8F", TM: "#7FB0D0", KG: "#B58AC4", TJ: "#E8C65A" };
    const SOVIET = "#A44A16", NEUTRO = "#48545F", FORA = "#2A343D", MEMBRO = "#2F6E9E";
    const PLACE = { chernobyl: [30.1, 51.39], kiev: [30.52, 50.45], moscovo: [37.62, 55.75], forsmark: [18.17, 60.4], lisboa: [-9.14, 38.72],
      berlim: [13.4, 52.52], tallinn: [24.75, 59.44], riga: [24.1, 56.95], vilnius: [25.28, 54.69], ignalina: [26.56, 55.6], minsk: [27.56, 53.9] };

    // Cameras: centre of the projection and the width and height, in km, that must fit in the free rectangle.
    const CAM = {
      europa: { lon: 13, lat: 54, w: 5200, h: 3000 }, urss: { lon: 92, lat: 58, w: 9900, h: 6300 },
      baltico: { lon: 25, lat: 55.5, w: 3300, h: 2000 }, uniao: { lon: 20, lat: 55, w: 5600, h: 3300 },
    };
    const CENAS = {
      nuvem: ["europa", "europa", "europa", "europa", "europa", "europa"],
      fim: ["urss", "baltico", "baltico", "urss", "urss", "urss"],
      ue: ["uniao", "baltico", "uniao", "uniao"],
    };

    /* ----- unpack the outlines once: radians, with the sines and cosines the projection needs ----- */
    const unpack = (polys) => polys.map((poly) => poly.map((ring) => {
      const n = ring.length / 2, lon = new Float32Array(n), sin = new Float32Array(n), cos = new Float32Array(n);
      for (let i = 0; i < n; i++) { lon[i] = ring[2 * i] / 100 * RAD; const lat = ring[2 * i + 1] / 100 * RAD; sin[i] = Math.sin(lat); cos[i] = Math.cos(lat); }
      return { n, lon, sin, cos };
    }));
    const shapes = {};
    if (DATA) { for (const code in DATA.paises) shapes[code] = unpack(DATA.paises[code]); shapes._ = unpack(DATA.fundo); }

    const first = CAM[CENAS[cena][0]];
    const cam = { lon: first.lon, lat: first.lat, w: first.w, h: first.h };
    const colour = {};                                           // current [r, g, b] of each country, gliding to its target
    let gap = 0, lastPasso = -1, tp = 0;
    const puffs = Array.from({ length: 270 }, (_, i) => ({ ri: i % 3, s: Math.random(), off: rand(-1, 1), wob: rand(TAU) }));
    const front = [0, 0, 0];                                     // how far along its route each arm of the cloud has got (0…1)
    const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

    /** The colour each country should have at this build of this scene. */
    function paint(code, passo) {
      const soviet = URSS.includes(code);
      if (cena === "nuvem") return soviet ? SOVIET : NEUTRO;
      if (cena === "fim") {
        if (!soviet) return NEUTRO;
        if (passo >= 5) return TINTA[code];
        if (passo >= 3) {
          // after the failed coup the republics leave one after the other, in the order of their declarations
          const order = ["LT", "GE", "EE", "LV", "UA", "BY", "MD", "AZ", "KG", "UZ", "TJ", "AM", "TM", "KZ", "RU"].indexOf(code);
          return passo >= 4 || tp * 2.2 > order ? TINTA[code] : SOVIET;
        }
        return passo >= 2 && code === "LT" ? TINTA.LT : SOVIET;
      }
      // scene "ue"
      if (UE15.includes(code)) return code === "UK" && passo >= 3 ? "#3A3532" : MEMBRO;
      if (UE2004.includes(code)) return passo >= 3 ? MEMBRO : passo === 2 ? (tp > 3.5 ? MEMBRO : "#D9692A") : ["EE", "LV", "LT"].includes(code) ? TINTA[code] : NEUTRO;
      if (UE_DEPOIS.includes(code)) return passo >= 3 ? MEMBRO : NEUTRO;
      if (passo >= 3 && ["UA", "MD"].includes(code)) return "#C9A227";
      if (passo >= 3 && code === "GE") return "#8A7A45";
      return soviet ? (code === "RU" || code === "BY" ? "#5A3A30" : mixHex(TINTA[code], NEUTRO, 0.55)) : NEUTRO;
    }
    const mixHex = (a, b, t) => { const x = hex(a), y = hex(b); return "#" + x.map((v, i) => Math.round(lerp(v, y[i], t)).toString(16).padStart(2, "0")).join(""); };

    /** The radiation warning sign (trefoil). */
    function trefoil(g, x, y, r, color) {
      dot(g, x, y, r * 1.45, C.fundo);
      g.fillStyle = color;
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; g.beginPath(); g.moveTo(x, y); g.arc(x, y, r * 1.2, a - 0.52, a + 0.52); g.closePath(); g.fill(); }
      dot(g, x, y, r * 0.42, C.fundo); dot(g, x, y, r * 0.24, color);
    }

    const frame = (g, cw, ch, box, t, dt, passo) => {
      if (!DATA) { text(g, "O mapa não está disponível (falta o ficheiro chernobyl-mapa.js).", box.x, box.y + 30, { size: 18 }); return; }
      const opening = lastPasso === -1;
      if (passo !== lastPasso) { tp = 0; lastPasso = passo; }
      tp += dt;
      const u = clamp(Math.min(box.w / 62, box.h / 26), 10, 24);          // text size that suits this screen

      /* ----- camera ----- */
      const target = CAM[CENAS[cena][Math.min(passo, CENAS[cena].length - 1)]];
      for (const k of ["lon", "lat", "w", "h"]) cam[k] = approach(cam[k], target[k], dt, 1.6);
      const scale = Math.min(box.w / cam.w, box.h / cam.h);              // px per km
      const ox = box.x + box.w / 2, oy = box.y + box.h / 2;
      const l0 = cam.lon * RAD, s0 = Math.sin(cam.lat * RAD), c0 = Math.cos(cam.lat * RAD);
      /** Lambert azimuthal equal-area: longitude and latitude (radians, with sine and cosine of the latitude) → pixels. */
      const projRaw = (lon, sin, cos) => {
        const dl = lon - l0, cdl = Math.cos(dl), k = Math.sqrt(2 / (1 + s0 * sin + c0 * cos * cdl)) * R * scale;
        return [ox + k * cos * Math.sin(dl), oy - k * (c0 * sin - s0 * cos * cdl)];
      };
      const proj = ([lon, lat]) => projRaw(lon * RAD, Math.sin(lat * RAD), Math.cos(lat * RAD));

      /* ----- land ----- */
      gap = approach(gap, cena === "fim" && passo >= 5 ? 1 : 0, dt, 1.4);
      const middle = proj([70, 58]);                                    // the republics move apart from here
      const draw = (shape, fill, dx = 0, dy = 0, seam = false) => {
        const path = new Path2D(), edge = seam ? new Path2D() : path;
        for (const poly of shape) for (const ring of poly) {
          let px = 0;
          for (let i = 0; i < ring.n; i++) {
            const [x, y] = projRaw(ring.lon[i], ring.sin[i], ring.cos[i]);
            if (i) path.lineTo(x + dx, y + dy); else path.moveTo(x + dx, y + dy);
            // Russia is stored in two pieces that meet on the 180° meridian: that seam is not a border, so it is not stroked.
            if (seam) { const onSeam = Math.abs(ring.lon[i] - Math.PI) < 2e-4 && Math.abs(px - Math.PI) < 2e-4; if (i && !onSeam) edge.lineTo(x + dx, y + dy); else edge.moveTo(x + dx, y + dy); px = ring.lon[i]; }
          }
          path.closePath();
        }
        g.fillStyle = fill; g.fill(path, "evenodd");
        g.strokeStyle = C.fundo; g.lineWidth = 1; g.stroke(edge);
      };
      draw(shapes._, FORA);
      const offsets = {};
      for (const code in shapes) {
        if (code === "_") continue;
        const want = hex(paint(code, passo)), have = colour[code] || (colour[code] = want.slice());
        for (let i = 0; i < 3; i++) have[i] = approach(have[i], want[i], dt, 3);
        let dx = 0, dy = 0;
        if (gap > 0.01 && NOME[code] && code !== "RU") {
          const p = proj(NOME[code]), d = Math.hypot(p[0] - middle[0], p[1] - middle[1]) || 1;
          dx = (p[0] - middle[0]) / d * gap * u * 0.7; dy = (p[1] - middle[1]) / d * gap * u * 0.7;
        }
        offsets[code] = [dx, dy];
        draw(shapes[code], `rgb(${have.map(Math.round).join(",")})`, dx, dy, code === "RU");
      }

      /* ----- things written and drawn on the map ----- */
      const label = (place, s, o = {}) => { const [x, y] = proj(place); text(g, s, x + (o.dx || 0) * u, y + (o.dy || 0) * u, Object.assign({ size: u, align: "center", base: "middle", plate: true }, o)); };
      const city = (place, s, o = {}) => { const [x, y] = proj(place); dot(g, x, y, u * 0.22, o.color || C.tinta); text(g, s, x + u * (o.dx === undefined ? 0.55 : o.dx), y + u * (o.dy || 0), Object.assign({ size: u * 0.9, base: "middle", plate: true }, o)); };
      const names = (codes, alpha = 1, note = {}) => {
        for (const code of codes) {
          const [lon, lat, nome, ax = 0, ay = 0] = NOME[code], s = nome + (note[code] || ""), [dx, dy] = offsets[code] || [0, 0], p = proj([lon, lat]);
          const x = p[0] + dx + ax * u, y = p[1] + dy + ay * u;
          if (ax || ay) { g.strokeStyle = rgba(C.tinta, 0.7 * alpha); g.lineWidth = 1.5; g.beginPath(); g.moveTo(p[0] + dx, p[1] + dy); g.lineTo(x, y); g.stroke(); dot(g, p[0] + dx, p[1] + dy, 2.5, C.tinta); }
          text(g, s, x, y, { size: code === "RU" ? u * 1.5 : u * 0.92, weight: 700, family: code === "RU" ? SERIF : SANS, align: "center", base: "middle", plate: !!(ax || ay) || code !== "RU", alpha });
        }
      };
      const chern = proj(PLACE.chernobyl);

      if (cena === "nuvem") {
        label([45.5, 50.5], "UNIÃO SOVIÉTICA", { size: u * 1.3, weight: 700, family: SERIF, plate: false, alpha: 0.75 });
        // The cloud, as a sketch: three routes the wind took in those days. "ate" says how far along each has got at each build.
        const ROUTES = [
          { ate: [0, 0.42, 1, 1, 1, 1], pts: [PLACE.chernobyl, [27.5, 53.9], [25.3, 54.9], [21, 57.6], PLACE.forsmark, [13, 62.5]] },
          { ate: [0, 0, 0, 0.5, 1, 1], pts: [PLACE.chernobyl, [22, 52], [15.5, 50], [12, 48], [6, 47.5], [-1.5, 52.5]] },
          { ate: [0, 0, 0, 0, 0.6, 1], pts: [PLACE.chernobyl, PLACE.kiev, [27, 46], [24, 42], [28, 39]] },
        ];
        ROUTES.forEach((route, ri) => {
          // The front creeps forward to where this build says the cloud has arrived (at once, if the slide opens on a later build).
          const reach = route.ate[Math.min(passo, 5)];
          front[ri] = opening ? route.ate[Math.max(0, Math.min(passo, 5) - 1)] : reach < front[ri] ? reach : Math.min(reach, front[ri] + dt * 0.16);
          for (const p of puffs) {
            if (p.ri !== ri) continue;
            p.s = (p.s + dt * 0.06) % 1;
            if (p.s > front[ri]) continue;
            const f = p.s * (route.pts.length - 1), i = Math.min(route.pts.length - 2, Math.floor(f)), a = proj(route.pts[i]), b = proj(route.pts[i + 1]), k = f - i;
            const spread = u * (0.4 + p.s * 4), x = lerp(a[0], b[0], k) + Math.cos(p.wob) * p.off * spread, y = lerp(a[1], b[1], k) + Math.sin(p.wob + 1) * p.off * spread;
            const fade = clamp((front[ri] - p.s) * 12) * clamp(p.s * 10) * clamp((1 - p.s) * 8);
            dot(g, x, y, u * (0.6 + p.s * 2.2), rgba(C.gama, (0.1 + p.s * 0.08) * fade));
          }
        });
        // places
        const pulse = (t * 0.7) % 1;
        g.strokeStyle = rgba(C.gama, 1 - pulse); g.lineWidth = 2.5; g.beginPath(); g.arc(chern[0], chern[1], u * (0.8 + pulse * 2.2), 0, TAU); g.stroke();
        trefoil(g, chern[0], chern[1], u * 0.62, C.gama);
        text(g, "Chernobyl · Pripyat", chern[0] + u * 1.1, chern[1] - u * 1.1, { size: u, weight: 700, color: C.gama, plate: true, base: "middle" });
        city(PLACE.kiev, passo >= 4 ? "Kiev: desfile do 1.º de Maio" : "Kiev", passo >= 4 ? { dy: 1.1, color: "#FFB08A", weight: 700 } : { dy: 1.1 });
        city(PLACE.moscovo, "Moscovo"); city(PLACE.lisboa, "Lisboa");
        if (passo >= 2) {
          const f = proj(PLACE.forsmark), ring = (t * 1.4) % 1;
          g.strokeStyle = rgba("#FF8A5A", 1 - ring); g.lineWidth = 3; g.beginPath(); g.arc(f[0], f[1], u * (0.4 + ring * 1.8), 0, TAU); g.stroke();
          dot(g, f[0], f[1], u * 0.28, "#FF8A5A");
          text(g, "Forsmark (Suécia): alarme", f[0] - u * 0.6, f[1] - u * 0.2, { size: u, weight: 700, color: "#FFB08A", align: "right", base: "middle", plate: true });
        }
        // the silence, in numbers
        const rows = [[1, "36 horas", "até evacuar Pripyat"], [3, "quase 3 dias", "até ao primeiro comunicado"], [5, "18 dias", "até Gorbachev falar ao país"]].filter(([from]) => passo >= from);
        rows.forEach(([, big, small], i) => {
          // written over the Atlantic, where the map is empty
          const x = box.x, y = box.y + box.h * 0.36 + i * u * 3.7;
          text(g, big, x, y, { size: u * 1.6, weight: 700, family: SERIF, color: C.alperce, plate: true });
          text(g, small, x, y + u * 1.15, { size: u * 0.9, plate: true });
        });
        text(g, "esquema: o percurso real da nuvem foi mais irregular", box.x, box.y + box.h * 0.36 - u * 2.6, { size: u * 0.72, color: C.cinza });
      }

      if (cena === "fim") {
        if (passo === 0) {
          label([85, 60], "UNIÃO SOVIÉTICA", { size: u * 2, weight: 700, family: SERIF, plate: false });
          label([85, 60], "um país · 15 repúblicas", { size: u, plate: false, dy: 1.7, color: C.areia });
          // Portugal at the same scale, for comparison (drawn where there is free sea, in the Arctic)
          const home = proj([40, 78]), kPt = R * scale, lPt = -8 * RAD, sPt = Math.sin(39.6 * RAD), cPt = Math.cos(39.6 * RAD);
          g.fillStyle = C.alperce; g.beginPath();
          // its own little projection, centred on Portugal, so the country keeps the shape the class knows
          for (const ring of shapes.PT[0]) for (let i = 0; i < ring.n; i++) {
            const dl = ring.lon[i] - lPt, x = home[0] + kPt * ring.cos[i] * Math.sin(dl), y = home[1] - kPt * (cPt * ring.sin[i] - sPt * ring.cos[i] * Math.cos(dl));
            if (i) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.fill();
          text(g, "Portugal, à mesma escala", home[0] + u * 0.8, home[1], { size: u * 0.85, base: "middle", plate: true });
        }
        if (passo === 1 || passo === 2) {
          // the Baltic Way: a chain of people from Tallinn to Vilnius
          const way = [PLACE.tallinn, [24.5, 58.38], PLACE.riga, [24.2, 56.2], [24.36, 55.73], PLACE.vilnius].map(proj);
          g.strokeStyle = C.tinta; g.lineWidth = u * 0.22; g.lineCap = "round"; g.setLineDash([1, u * 0.42]); g.lineDashOffset = -t * 6;
          g.beginPath(); way.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]);
          city(PLACE.tallinn, "Tallinn"); city(PLACE.riga, "Riga"); city(PLACE.vilnius, "Vilnius");
          label([24.3, 57.7], "Via Báltica · 2 milhões de pessoas", { dx: -9.5, weight: 700, color: C.alperce });
          city(PLACE.berlim, passo === 1 ? "Berlim: cai o Muro, 9 de novembro de 1989" : "Berlim"); city(PLACE.moscovo, "Moscovo");
          if (passo === 2) label([23.9, 55.3], "Lituânia · 11 de março de 1990", { dx: -8.5, dy: 1.6, weight: 700, color: TINTA.LT });
        }
        if (passo === 3) { city(PLACE.moscovo, "Moscovo · golpe falhado, 19 a 21 de agosto", { weight: 700, color: C.alperce }); }
        if (passo === 4) {
          // the three places are close together at this scale: the labels are spread out, each with a line to its dot
          const far = (place, s, dx, dy, color) => { const [x, y] = proj(place); g.strokeStyle = rgba(C.tinta, 0.7); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * u, y + dy * u); g.stroke(); city(place, s, { dx, dy, weight: 700, color }); };
          far(PLACE.kiev, "Ucrânia · 1 dez: mais de 90 % pela independência", 3, 3.2, TINTA.UA);
          far(PLACE.minsk, "Bielorrússia · 8 dez: «a URSS deixou de existir»", 4.5, -2.6, C.tinta);
          far(PLACE.moscovo, "Moscovo · 25 dez: Gorbachev demite-se", 5, 0.6, C.alperce);
        }
        if (passo >= 5) names(URSS, clamp(tp - 0.4));
      }

      if (cena === "ue") {
        if (passo <= 2) names(["EE", "LV", "LT"]);
        if (passo === 0) label([24.5, 61.6], "pedem a adesão em 1995", { color: C.alperce, weight: 700 });
        if (passo === 1) {
          const ig = proj(PLACE.ignalina);
          trefoil(g, ig[0], ig[1], u * 0.6, C.gama);
          text(g, "Ignalina: dois reatores como o de Chernobyl", ig[0] + u, ig[1] - u * 0.1, { size: u, weight: 700, color: C.gama, base: "middle", plate: true });
          text(g, "fechados em 2004 e 2009", ig[0] + u, ig[1] + u * 1.25, { size: u * 0.9, base: "middle", plate: true });
          trefoil(g, chern[0], chern[1], u * 0.45, C.cinza);
          text(g, "Chernobyl", chern[0] + u * 0.8, chern[1], { size: u * 0.85, base: "middle", color: C.areia, plate: true });
        }
        if (passo === 2) {
          // the twelve stars arrive over the three Baltic countries
          const c = proj([24.6, 57]), k = ease(tp / 1.5);
          for (let i = 0; i < 12; i++) { const a = i * TAU / 12 - Math.PI / 2, r = u * lerp(9, 4.2, k); star(g, c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, u * 0.36, rgba(C.ouro, k)); }
          text(g, "1 de maio de 2004: de 15 para 25 países", box.x + box.w, box.titleBottom + u * 1.4, { size: u * 1.15, weight: 700, color: C.alperce, align: "right", plate: true });
        }
        if (passo >= 3) {
          names(["UA", "MD", "GE"], 1, { UA: ": candidata, a negociar", MD: ": candidata, a negociar", GE: ": candidata, processo parado" });
          label([38, 56], "Rússia", { plate: false, weight: 700, family: SERIF, size: u * 1.2, alpha: 0.8 }); label([28, 53.4], "Bielorrússia", { size: u * 0.85 });
          label([-2.5, 53.6], "Reino Unido: saiu em 2020", { size: u * 0.8 });
          // key
          const kx = box.x, ky = box.titleBottom + u * 0.6;
          [[MEMBRO, "União Europeia: 27 países"], ["#C9A227", "candidatos a negociar (antigas repúblicas soviéticas)"], ["#8A7A45", "candidata, com o processo parado"]].forEach(([c, s], i) => {
            g.fillStyle = c; g.fillRect(kx, ky + i * u * 1.45 - u * 0.4, u * 0.9, u * 0.9);
            text(g, s, kx + u * 1.3, ky + i * u * 1.45 + u * 0.05, { size: u * 0.85, base: "middle", plate: true });
          });
        }
      }
    };
    /** A five-pointed star, as on the European flag. */
    function star(g, x, y, r, color) {
      g.fillStyle = color; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.4 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
      g.closePath(); g.fill();
    }
    return { raw: true, frame };
  };

  /* ==========================================================================
     The engine: one canvas per .rad-palco, drawn only while its slide is shown.
     ========================================================================== */
  const stages = [];

  /** Value of a control of this slide: a number for a range input, the chosen value for a group of buttons. */
  function readCtl(slide, name) {
    const el = slide.querySelector(`[data-ctl="${name}"]`);
    if (!el) return 0;
    if (el.matches("input")) return Number(el.value);
    return (slide.querySelector(`[data-ctl="${name}"][aria-pressed="true"]`) || el).dataset.valor;
  }
  /** Set a control from the simulation itself (for example when a build moves the cursor). */
  function writeCtl(slide, name, value) {
    for (const el of slide.querySelectorAll(`[data-ctl="${name}"]`)) {
      if (el.matches("input")) el.value = value; else el.setAttribute("aria-pressed", String(el.dataset.valor === String(value)));
    }
  }

  for (const slide of radSlides) {
    for (const host of slide.querySelectorAll(".rad-palco")) {
      const make = SIMS[host.dataset.sim];
      if (!make) continue;
      const canvas = document.createElement("canvas");
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Animação: o que mostra está descrito na legenda por baixo.");
      host.append(canvas);
      const sim = make({ host, slide, ctl: (name) => readCtl(slide, name), setCtl: (name, value) => writeCtl(slide, name, value) });
      stages.push({ slide, host, canvas, g: canvas.getContext("2d"), frame: sim.frame || sim, raw: Boolean(sim.raw), t0: 0, box: null, boxAt: -1 });
    }
    for (const row of slide.querySelectorAll(".rad-controlos")) {
      // app.js turns a horizontal swipe into "next slide": a finger on a slider must not do that.
      row.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
      row.addEventListener("touchend", (e) => e.stopPropagation());
      // Buttons with the same data-ctl form a group: one is chosen at a time.
      row.addEventListener("click", (e) => { const b = e.target.closest("button[data-ctl]"); if (b) writeCtl(slide, b.dataset.ctl, b.dataset.valor); });
      // After the mouse lets go of a slider, give the arrow keys back to the slides.
      row.addEventListener("pointerup", (e) => { if (e.target.matches("input[type=range]")) e.target.blur(); });
    }
  }

  /** The free rectangle of a slide: below the title, above the controls and the caption, clear of the teacher's tools on the right. */
  function freeBox(st) {
    const host = st.host.getBoundingClientRect(), rem = parseFloat(getComputedStyle(document.documentElement).fontSize), phone = host.width < 700;
    const edge = (sel, side) => { const el = st.slide.querySelector(sel); return el && el.offsetParent ? el.getBoundingClientRect()[side] - host.top : null; };
    // A map is land from edge to edge, so it may also use the space beside the title; the other pictures start below it.
    const top = Math.max(st.raw ? 0 : edge(".rad-topo", "bottom") || 0, edge(".capitulos", "bottom") || 0) + rem * 0.6;
    const bottom = Math.min(edge(".rad-controlos", "top") ?? host.height, edge(".legendas", "top") ?? host.height) - rem * 0.7;
    const left = rem * (phone ? 0.8 : 2), right = host.width - rem * (phone ? 0.8 : 4.6);
    // titleBottom: where the title ends, for a map's key and notes (a map itself may run beside the title).
    return { x: left, y: top, w: Math.max(120, right - left), h: Math.max(100, bottom - top), cw: host.width, ch: host.height, titleBottom: (edge(".rad-topo", "bottom") || top) + rem * 0.5 };
  }

  function drawStage(st, nowS, dt) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (nowS - st.boxAt > 0.25) { st.box = freeBox(st); st.boxAt = nowS; }
    const { box, canvas, g } = st;
    if (canvas.width !== Math.round(box.cw * dpr) || canvas.height !== Math.round(box.ch * dpr)) { canvas.width = Math.round(box.cw * dpr); canvas.height = Math.round(box.ch * dpr); }
    const passo = Number(st.slide.dataset.at || 0), t = nowS - st.t0;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, box.cw, box.ch);
    g.save();
    if (st.raw) st.frame(g, box.cw, box.ch, box, t, dt, passo);
    else {
      // virtual units: at least 760 × 520, whatever the real size of the free rectangle (600 × 500 on a phone, so text stays readable)
      const s = box.w < 520 ? Math.min(box.w / 600, box.h / 500) : Math.min(box.w / 760, box.h / 520);
      g.translate(box.x, box.y); g.scale(s, s);
      st.frame(g, box.w / s, box.h / s, t, dt, passo);
    }
    g.restore();
  }

  let running = false, last = 0;
  function tick(nowMs) {
    const active = stages.filter((st) => st.slide.classList.contains("current"));
    if (!active.length) { running = false; return; }
    const dt = Math.min(0.05, Math.max(0.001, (nowMs - last) / 1000));
    last = nowMs;
    for (const st of active) drawStage(st, nowMs / 1000, dt);
    requestAnimationFrame(tick);
  }
  // app.js marks the visible slide with the class "current": start drawing when one of ours is shown.
  const watcher = new MutationObserver((changes) => {
    for (const change of changes) {
      if (!change.target.classList.contains("current")) continue;
      for (const st of stages) if (st.slide === change.target && !st.live) { st.t0 = performance.now() / 1000; st.boxAt = -1; }
    }
    for (const st of stages) st.live = st.slide.classList.contains("current");
    if (!running && stages.some((st) => st.live)) { running = true; last = performance.now(); requestAnimationFrame(tick); }
  });
  for (const slide of radSlides) watcher.observe(slide, { attributes: true, attributeFilter: ["class"] });
  addEventListener("resize", () => stages.forEach((st) => (st.boxAt = -1)));
  if (stages.some((st) => (st.live = st.slide.classList.contains("current")))) { running = true; last = performance.now(); requestAnimationFrame(tick); }
})();
