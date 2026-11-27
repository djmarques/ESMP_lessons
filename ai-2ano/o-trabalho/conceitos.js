/* ==========================================================================
   conceitos.js — the definition under an animated scene, tied to the picture.

   In the animated scenes (.slide.cena) each concept is defined in a strip under
   the picture (.ddef). Students watch the picture, not the strip. So, at the
   click in which a definition appears:
     - the definition is shown larger (class «agora») until the next click;
     - an orange line is drawn from the definition (or from each of its parts)
       to the thing in the picture that it talks about, and that thing is
       outlined for a moment.
   Nothing is changed inside the slides: this file only reads them.

   Which slides: see ONDE (today, the lesson «6 · Do Toyotismo ao desemprego»).
   What each definition points at: by default, whatever the picture reveals at
   the same click (the elements with the same data-step). ALVO overrides that,
   per slide and per click:
     { termo: target }            one line, from the name of the concept (null = no line)
     { partes: [target, …] }      one line per part of the definition (null = none); each
                                  line, its part and its target share a colour
     lado: 'esquerda'             the lines arrive at the left of their targets (for
                                  targets stacked one above the other)
   A target is a click number (the elements revealed at that click), a CSS
   selector inside the slide, or a point [x, y, half-size] in the picture's own
   units (the drawing is 1000 wide and 300 high).
   While a definition is the one of the current click it also moves up, to sit
   right under the picture, so that its lines cross nothing else.
   Code comments in English; this file shows no text of its own.
   ========================================================================== */
(function conceitos() {
  'use strict';
  const ONDE = slide => (slide.dataset.lesson || '').startsWith('6 ·');      // () => true would switch it on everywhere
  const ALVO = {
    's-o-toyota':       { 1: { termo: 'ellipse' } },                         // the team's table
    's-o-teletrabalho': { 1: { termo: [188, 222, 46] }, 3: { termo: null } }, // the worker at the laptop, at home
    's-e-desempregado': { 5: { partes: [2, 3, 4], lado: 'esquerda' } },      // the three conditions, one line each
    's-e-taxa-cena':    { 4: { partes: [3, 2, null] } },                     // the unemployed; the active population
  };
  const NS = 'http://www.w3.org/2000/svg';
  const stepOf = el => { let k = 0; while (el.classList.contains('ge' + (k + 1))) k++; return k; };
  const make = (name, attrs) => { const n = document.createElementNS(NS, name); for (const a in attrs) n.setAttribute(a, attrs[a]); return n; };

  Array.from(document.querySelectorAll('.slide.cena')).filter(ONDE).forEach(slide => {
    const picture = slide.querySelector('.cena-svg');
    if (!picture || !slide.querySelector('.ddef[data-step]')) return;
    const overlay = make('svg', { class: 'cx-ligacoes', 'aria-hidden': 'true' });
    // the slide becomes a column whose rows keep their order, so that one row can be moved up for a while
    const rows = Array.from(slide.children);
    rows.forEach((row, i) => { row.style.order = i * 10; });
    const underPicture = rows.indexOf(slide.querySelector('.palco')) * 10 + 5;
    slide.classList.add('cx');
    slide.append(overlay);
    let timers = [], shown = -1;

    /** The box, on the screen, of what a target designates (or null). */
    function boxOf(target) {
      if (target === null || target === undefined) return null;
      if (Array.isArray(target)) {
        const r = picture.getBoundingClientRect(), vb = picture.viewBox.baseVal;
        const x = r.left + (target[0] - vb.x) / vb.width * r.width, y = r.top + (target[1] - vb.y) / vb.height * r.height;
        const half = (target[2] || 16) / vb.width * r.width;
        return { left: x - half, right: x + half, top: y - half, bottom: y + half };
      }
      const found = typeof target === 'number' ? picture.querySelectorAll('[data-step="' + target + '"]') : slide.querySelectorAll(target);
      let box = null;
      found.forEach(el => {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        box = box ? { left: Math.min(box.left, r.left), right: Math.max(box.right, r.right), top: Math.min(box.top, r.top), bottom: Math.max(box.bottom, r.bottom) }
                  : { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      });
      return box;
    }

    function draw(animated) {
      overlay.replaceChildren();
      const step = stepOf(slide), live = slide.classList.contains('current');
      slide.querySelectorAll('.ddef[data-step]').forEach(d => {
        const now = live && Number(d.dataset.step) === step;
        d.classList.toggle('agora', now);
        d.style.order = now ? underPicture : rows.indexOf(d) * 10;
        d.querySelectorAll('.part').forEach(part => part.classList.remove('cx-c0', 'cx-c1', 'cx-c2'));
      });
      const def = live && slide.querySelector('.ddef[data-step="' + step + '"]');
      if (!def) return;
      const own = (ALVO[slide.id] || {})[step];
      const rule = own || { termo: step };
      const pairs = rule.partes
        ? Array.from(def.querySelectorAll('.part')).map((part, i) => [part, rule.partes[i]])
        : [[def.querySelector('.term'), rule.termo]];
      const origin = slide.getBoundingClientRect();
      const seen = [];
      pairs.forEach(([from, target], n) => {
        const box = from && boxOf(target);
        if (!box) return;
        const f = from.getBoundingClientRect();
        const left = rule.lado === 'esquerda';
        const x1 = (f.left + f.right) / 2 - origin.left, y1 = f.top - origin.top - 2;
        const x2 = left ? box.left - origin.left - 9 : (box.left + box.right) / 2 - origin.left;
        const y2 = left ? (box.top + box.bottom) / 2 - origin.top : box.bottom - origin.top + 8;
        const bend = Math.max(24, (y1 - y2) * 0.45);
        const colour = rule.partes ? 'cx-c' + (n % 3) : 'cx-c0';
        if (rule.partes) from.classList.add(colour);
        const cls = colour + (animated ? ' cx-nova' : '');
        const key = [Math.round(box.left), Math.round(box.top)].join();
        if (!seen.includes(key)) {
          seen.push(key);
          overlay.append(make('rect', { class: 'cx-alvo ' + cls, x: box.left - origin.left - 7, y: box.top - origin.top - 7, width: box.right - box.left + 14, height: box.bottom - box.top + 14, rx: 10, style: '--n:' + n }));
        }
        overlay.append(make('path', { class: cls, pathLength: 1, style: '--n:' + n, d: `M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${(y1 - bend).toFixed(1)} ${(left ? x2 - Math.max(30, Math.abs(x2 - x1) * 0.5) : x2).toFixed(1)},${(left ? y2 : y2 + bend).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}` }));
        overlay.append(make('circle', { class: cls, cx: x2.toFixed(1), cy: y2.toFixed(1), r: 5.5, style: '--n:' + n }));
      });
    }

    function refresh() {
      timers.forEach(clearTimeout); timers = [];
      const step = slide.classList.contains('current') ? stepOf(slide) : -1;
      if (step === shown) return;
      shown = step;
      draw(false);                                            // new size for the definition at once; lines once things are in place
      overlay.replaceChildren();
      if (step < 0) return;
      timers.push(setTimeout(() => draw(true), 900));         // after the new elements have faded in
      timers.push(setTimeout(() => draw(false), 2300));       // again after the slow moves (1.5 s), without replaying the drawing
    }
    new MutationObserver(refresh).observe(slide, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', () => { if (slide.classList.contains('current')) draw(false); });
    refresh();
  });
})();
