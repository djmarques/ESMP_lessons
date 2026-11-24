/* =====================================================================
   comum/jogos.js — os jogos de turma (desenho e regras), usados pelo
   projetor (comum/aovivo.js) e pelo telemóvel (respostas/vivo.js).
   ---------------------------------------------------------------------
   ESMP.jogos.mariposas   «Sê o pássaro», com a turma toda: cada telemóvel tem
                          um tronco com 12 mariposas claras e 12 escuras e 10
                          segundos. O projetor junta as caçadas de todos e
                          repete-as num só tronco.
   ESMP.jogos.fabrica     A fábrica de sapatos: artesãos (cada um faz o sapato
                          inteiro, quatro tarefas) contra a linha de montagem
                          (cada um repete uma só tarefa). A produção da linha
                          é a do posto mais lento.
   Os desenhos são feitos aqui, com as cores escritas no próprio SVG, para
   ficarem iguais em qualquer site de aula e no telemóvel.
   ===================================================================== */
(function () {
  'use strict';
  const E = window.ESMP = window.ESMP || {};
  const J = E.jogos = {};
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  /** Números ao acaso que se repetem com a mesma semente (o tronco fica igual em todos os ecrãs). */
  function sorte(semente) { let a = semente >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let audio = null;
  function som(freq, dur, vol) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
      o.frequency.value = freq; o.type = 'triangle'; g.gain.setValueAtTime(vol || 0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.12));
      o.connect(g).connect(audio.destination); o.start(); o.stop(t + (dur || 0.12) + 0.02);
    } catch (e) { /* sem som: o jogo funciona na mesma */ }
  }
  J.som = som;

  /* ================= 1. Mariposas ================= */
  const ASA = 'M0,-13 C-7,-15 -24,-9 -35,11 C-26,17 -9,15 0,10 C9,15 26,17 35,11 C24,-9 7,-15 0,-13 Z';
  const TONS = {
    limpo: { base: '#CFCBBB', racha: '#8E8A79', manchas: ['#E4E6D6', '#D9DEC4', '#EEEBDD', '#C9CCB8'], pontos: '#5E5C52' },
    fuligem: { base: '#3B3935', racha: '#1C1B19', manchas: ['#45423D', '#33312E', '#4A4741', '#2A2927'], pontos: '#565249' }
  };
  const COR = { c: { asa: '#DEDDCC', orla: '#C2BFAE', pinta: '#5E5C52', corpo: '#CFCCBA' }, e: { asa: '#2F2E2B', orla: '#262523', pinta: '#4A4741', corpo: '#262523' } };
  const M = J.mariposas = { POR_TIPO: 12, DUR: 10000, NOMES: { limpo: 'Tronco limpo · cerca de 1800', fuligem: 'Tronco com fuligem · cerca de 1890' } };

  M.tronco = function (g, tipo, W, H, rnd) {
    const tn = TONS[tipo], r = (a, b) => a + rnd() * (b - a);
    g.replaceChildren();
    svgEl('rect', { width: W, height: H, fill: tn.base }, g);
    const nR = Math.round(W / 56);
    for (let i = 0; i < nR; i++) {
      const x = (i + r(0.2, 0.8)) * W / nR; let d = 'M' + x.toFixed(0) + ',0';
      for (let y = 60; y <= H + 30; y += 60) d += ' Q' + (x + r(-16, 16)).toFixed(0) + ',' + (y - 30) + ' ' + (x + r(-8, 8)).toFixed(0) + ',' + y;
      svgEl('path', { d: d, fill: 'none', stroke: tn.racha, 'stroke-width': r(2, 6).toFixed(1), opacity: 0.45 }, g);
    }
    const area = W * H / 387000;
    for (let i = 0; i < 110 * area; i++) svgEl('ellipse', { cx: r(0, W).toFixed(0), cy: r(0, H).toFixed(0), rx: r(10, 42).toFixed(0), ry: r(8, 26).toFixed(0), fill: tn.manchas[i % 4], opacity: r(0.45, 0.9).toFixed(2), transform: 'rotate(' + r(0, 180).toFixed(0) + ' ' + r(0, W).toFixed(0) + ' ' + r(0, H).toFixed(0) + ')' }, g);
    for (let i = 0; i < 420 * area; i++) svgEl('circle', { cx: r(0, W).toFixed(0), cy: r(0, H).toFixed(0), r: r(0.8, 2.2).toFixed(1), fill: tn.pontos, opacity: 0.7 }, g);
  };
  M.mariposa = function (parent, tipo, rnd) {
    const c = COR[tipo], g = svgEl('g', { 'data-tipo': tipo }, parent);
    svgEl('path', { d: ASA, fill: c.asa, stroke: c.orla, 'stroke-width': 1 }, g);
    for (let i = 0; i < (tipo === 'c' ? 16 : 7); i++) {
      const y = -8 + rnd() * 19, x = (rnd() * 2 - 1) * (y + 14) * 1.25;
      svgEl('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (0.9 + rnd() * 1.1).toFixed(1), fill: c.pinta }, g);
    }
    svgEl('ellipse', { cx: 0, cy: 0, rx: 3.4, ry: 12, fill: c.corpo }, g);
    return g;
  };
  /** Espalha n pontos sem ficarem em cima uns dos outros. */
  function espalhar(n, W, H, margem, dist, rnd) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      let x, y, t = 0;
      do { x = margem + rnd() * (W - 2 * margem); y = margem + rnd() * (H - 2 * margem); t++; } while (t < 120 && pts.some(p => Math.hypot(p[0] - x, p[1] - y) < dist));
      pts.push([x, y]);
    }
    return pts;
  }

  /**
   * Telemóvel: uma caçada. Devolve uma promessa com { c, e, t: [[ms, 'c'|'e'], …] }.
   *   o.tronco 'limpo' | 'fuligem' · o.dur ms · o.espera ms até começar (contagem 3, 2, 1)
   */
  M.jogar = function (host, o) {
    const W = 600, H = 700, rnd = sorte((Math.random() * 1e9) | 0);
    host.innerHTML = '<div class="jg-topo"><b class="jg-conta">Prepara-te…</b><div class="jg-tempo"><span></span></div></div><svg class="jg-tronco" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="A casca de um tronco com mariposas pousadas"></svg><p class="jg-msg">Tu és o pássaro: quando começar, toca nas mariposas que vires.</p>';
    const svg = host.querySelector('svg'), gB = svgEl('g', {}, svg), gM = svgEl('g', {}, svg);
    const conta = host.querySelector('.jg-conta'), barra = host.querySelector('.jg-tempo span');
    M.tronco(gB, o.tronco, W, H, rnd);
    svg.style.touchAction = 'none';
    return new Promise(resolve => {
      const res = { c: 0, e: 0, t: [] };
      let t0 = 0, vivo = false;
      const tipos = []; for (let i = 0; i < M.POR_TIPO; i++) tipos.push('c', 'e');
      tipos.sort(() => rnd() - 0.5);
      const pts = espalhar(tipos.length, W, H, 52, 96, rnd);
      function largar() {
        tipos.forEach((tp, i) => {
          const m = M.mariposa(gM, tp, rnd);
          m.setAttribute('transform', 'translate(' + pts[i][0].toFixed(0) + ',' + pts[i][1].toFixed(0) + ') rotate(' + (rnd() * 140 - 70).toFixed(0) + ') scale(1.25)');
          svgEl('circle', { r: 40, fill: 'transparent' }, m);           // área de toque maior do que a mariposa
          m.style.cursor = 'pointer';
          m.addEventListener('pointerdown', ev => {
            ev.preventDefault();
            if (!vivo || m.dataset.fora) return;
            m.dataset.fora = '1'; m.style.transition = 'opacity .18s'; m.style.opacity = '0';
            res[tp]++; res.t.push([Math.round(performance.now() - t0), tp]); som(tp === 'c' ? 880 : 660);
            conta.textContent = 'Apanhadas: ' + (res.c + res.e);
            if (res.c + res.e === tipos.length) fim();
          });
        });
      }
      function fim() {
        if (!vivo) return; vivo = false;
        barra.style.width = '0%';
        gM.querySelectorAll('g').forEach(m => { if (!m.dataset.fora) svgEl('circle', { r: 40, fill: 'none', stroke: '#F0A673', 'stroke-width': 4, 'stroke-dasharray': '9 7' }, m); });
        conta.textContent = 'Apanhaste ' + res.c + ' claras e ' + res.e + ' escuras';
        host.querySelector('.jg-msg').textContent = 'As do círculo escaparam-te. Agora olha para o ecrã da sala.';
        resolve(res);
      }
      const ate = performance.now() + Math.max(0, o.espera || 0);
      (function antes() {
        const falta = ate - performance.now();
        if (falta > 0) { conta.textContent = falta > 3200 ? 'Prepara-te…' : String(Math.ceil(falta / 1000)); return requestAnimationFrame(antes); }
        largar(); vivo = true; t0 = performance.now(); conta.textContent = 'Já!'; som(1040, 0.2, 0.1);
        (function tic() {
          if (!vivo) return;
          const resto = o.dur - (performance.now() - t0);
          barra.style.width = Math.max(0, resto / o.dur * 100) + '%';
          if (resto <= 0) return fim();
          requestAnimationFrame(tic);
        })();
      })();
    });
  };

  /**
   * Projetor: um tronco grande com as mariposas de toda a turma.
   *   palco.preparar(tronco, n)   desenha 24 × n mariposas
   *   palco.repetir(resultados, dur, aoContar)   repete as caçadas de todos, ao mesmo tempo
   */
  M.palco = function (host) {
    const W = 1200, H = 520;
    host.innerHTML = '<svg class="jg-tronco" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="O tronco da turma"></svg>';
    const svg = host.querySelector('svg'), gB = svgEl('g', {}, svg), gM = svgEl('g', {}, svg);
    let pecas = [];
    return {
      preparar: function (tronco, n) {
        const rnd = sorte(n * 7919 + (tronco === 'limpo' ? 1 : 2) + ((Math.random() * 1e6) | 0));
        M.tronco(gB, tronco, W, H, rnd); gM.replaceChildren(); pecas = [];
        const total = 2 * M.POR_TIPO * Math.max(1, n);
        // tamanho de cada mariposa conforme o espaço que lhe cabe: 24 mariposas grandes, 600 pequenas
        const esc = Math.max(0.22, Math.min(1.1, 0.55 * Math.sqrt(W * H / total) / 70));
        const pts = espalhar(total, W, H, 30, 66 * esc, rnd);
        for (let j = 0; j < Math.max(1, n); j++) for (let i = 0; i < 2 * M.POR_TIPO; i++) {
          const tp = i % 2 ? 'e' : 'c', k = j * 2 * M.POR_TIPO + i;
          const m = M.mariposa(gM, tp, rnd);
          m.setAttribute('transform', 'translate(' + pts[k][0].toFixed(0) + ',' + pts[k][1].toFixed(0) + ') rotate(' + (rnd() * 140 - 70).toFixed(0) + ') scale(' + esc.toFixed(2) + ')');
          pecas.push({ el: m, tipo: tp, dono: j });
        }
      },
      /** resultados: [{ c, e, t }] por telemóvel. Devolve uma promessa que acaba com a repetição. */
      repetir: function (resultados, dur, aoContar) {
        const fila = [];
        resultados.forEach((r, j) => {
          const livres = { c: pecas.filter(p => p.dono === j && p.tipo === 'c'), e: pecas.filter(p => p.dono === j && p.tipo === 'e') };
          (r.t || []).forEach(x => { const p = livres[x[1]] && livres[x[1]].pop(); if (p) fila.push({ ms: Math.min(dur, Math.max(0, x[0])), p: p }); });
        });
        fila.sort((a, b) => a.ms - b.ms);
        const conta = { c: 0, e: 0 };
        return new Promise(resolve => {
          const t0 = performance.now(); let k = 0, ultimoSom = 0;
          (function tic() {
            const t = performance.now() - t0;
            while (k < fila.length && fila[k].ms <= t) {
              const p = fila[k++].p; p.el.style.transition = 'opacity .25s'; p.el.style.opacity = '0'; p.fora = true; conta[p.tipo]++;
              if (t - ultimoSom > 45) { som(p.tipo === 'c' ? 880 : 660, 0.08, 0.04); ultimoSom = t; }
            }
            if (aoContar) aoContar(conta, Math.min(1, t / dur));
            if (t < dur) return requestAnimationFrame(tic);
            pecas.forEach(p => { if (!p.fora) svgEl('circle', { r: 40, fill: 'none', stroke: '#F0A673', 'stroke-width': 5, 'stroke-dasharray': '9 7' }, p.el); });
            resolve(conta);
          })();
        });
      }
    };
  };

  /* ================= 2. A fábrica de sapatos ================= */
  const F = J.fabrica = {
    DUR: 45000,
    TAREFAS: [
      { nome: 'Cortar a sola', verbo: 'corta', pts: [[45, 156], [100, 160], [160, 160], [220, 160], [266, 153]] },
      { nome: 'Coser a gáspea', verbo: 'cose', pts: [[50, 134], [50, 96], [100, 86], [150, 112], [232, 124]] },
      { nome: 'Pôr os atacadores', verbo: 'enfia', pts: [[106, 98], [136, 82], [140, 114], [170, 98], [174, 130]] },
      { nome: 'Engraxar', verbo: 'engraxa', pts: [[66, 116], [112, 128], [158, 134], [204, 138], [250, 142]] }
    ],
    // As quatro tarefas têm o mesmo número de pontos: a diferença entre artesãos e linha vem de TROCAR
    // de ferramenta. O artesão perde tempo entre tarefas (Adam Smith: «o tempo que se perde ao passar de
    // um trabalho para outro»); quem está na linha repete a mesma tarefa sem parar.
    TROCA: 1200, FERRAMENTAS: ['a faca', 'a agulha', 'os atacadores', 'a escova']
  };
  /** Desenha o sapato até à tarefa `ate` (0 nada … 4 pronto). */
  F.sapato = function (g, ate, cor) {
    g.replaceChildren();
    svgEl('path', { d: 'M40,145 L40,95 Q40,80 60,80 L110,80 L150,110 L235,120 Q272,125 275,145 Z', fill: ate >= 2 ? (cor || '#7A4A2A') : 'none', stroke: '#B9B2A6', 'stroke-width': 2, 'stroke-dasharray': ate >= 2 ? '0' : '5 5' }, g);
    svgEl('path', { d: 'M30,145 L275,145 L275,150 Q275,166 250,166 L50,166 Q30,166 30,150 Z', fill: ate >= 1 ? '#1E2A33' : 'none', stroke: '#B9B2A6', 'stroke-width': 2, 'stroke-dasharray': ate >= 1 ? '0' : '5 5' }, g);
    if (ate >= 2) svgEl('path', { d: 'M50,134 L50,96 Q50,88 60,87 L100,86', fill: 'none', stroke: '#F6F3EC', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, g);
    if (ate >= 3) [[110, 94, 130, 84], [128, 108, 150, 98], [148, 122, 170, 112], [130, 84, 128, 108], [150, 98, 148, 122]].forEach(l => svgEl('line', { x1: l[0], y1: l[1], x2: l[2], y2: l[3], stroke: '#F6F3EC', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g));
    if (ate >= 4) { svgEl('path', { d: 'M70,112 Q150,128 255,136', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.55 }, g); [[262, 100], [286, 122], [248, 84]].forEach(p => svgEl('path', { d: 'M' + p[0] + ',' + (p[1] - 9) + ' L' + (p[0] + 3) + ',' + (p[1] - 3) + ' L' + (p[0] + 9) + ',' + p[1] + ' L' + (p[0] + 3) + ',' + (p[1] + 3) + ' L' + p[0] + ',' + (p[1] + 9) + ' L' + (p[0] - 3) + ',' + (p[1] + 3) + ' L' + (p[0] - 9) + ',' + p[1] + ' L' + (p[0] - 3) + ',' + (p[1] - 3) + ' Z', fill: '#F0A673' }, g)); }
  };
  /** Reparte os telemóveis pelos papéis. modo: 'artesaos' | 'linha' | 'metade'.
      Devolve { id: 'A' } para artesãos ou { id: [postos] } para a linha (um posto, ou vários se forem poucos). */
  F.repartir = function (ids, modo) {
    const l = ids.slice().sort(() => Math.random() - 0.5), papeis = {};
    let linha = modo === 'linha' ? l : (modo === 'artesaos' ? [] : l.slice(0, Math.max(Math.min(4, l.length - 1), Math.floor(l.length / 2))));
    if (modo === 'metade' && l.length < 2) linha = [];
    l.forEach(u => { if (linha.indexOf(u) < 0) papeis[u] = 'A'; });
    const L = linha.length;
    linha.forEach((u, i) => { papeis[u] = L >= 4 ? [i % 4] : [0, 1, 2, 3].filter(k => k % L === i); });
    return papeis;
  };
  /** Produção: artesãos = soma dos sapatos; linha = o posto que fez menos peças. */
  F.contas = function (papeis, msgs) {
    const r = { artesaos: 0, nA: 0, postos: [0, 0, 0, 0], nL: 0, linha: 0, gargalo: -1 };
    Object.keys(papeis).forEach(u => {
      const m = msgs[u] || {};
      if (papeis[u] === 'A') { r.nA++; r.artesaos += Number(m.sapatos) || 0; }
      else { r.nL++; (m.pecas || []).forEach((n, k) => { r.postos[k] += Number(n) || 0; }); }
    });
    if (r.nL) { r.linha = Math.min.apply(null, r.postos); r.gargalo = r.postos.indexOf(r.linha); }
    return r;
  };
  /**
   * Telemóvel: um turno de trabalho.
   *   o.papel 'A' (artesão) ou [postos] · o.dur · o.espera · o.aoProgredir(estado)
   * Devolve uma promessa com { sapatos } ou { pecas: [n0, n1, n2, n3] }.
   */
  F.jogar = function (host, o) {
    const artesao = o.papel === 'A', postos = artesao ? [0, 1, 2, 3] : o.papel;
    host.innerHTML = '<div class="jg-topo"><b class="jg-conta">Prepara-te…</b><div class="jg-tempo"><span></span></div></div>' +
      '<p class="jg-papel">' + (artesao ? '<b>És artesão.</b> Fazes o sapato inteiro: quatro tarefas, e trocas de ferramenta entre cada uma.' : '<b>Estás na linha de montagem.</b> O teu posto: ' + postos.map(k => F.TAREFAS[k].nome.toLowerCase()).join(' e ') + '. Sempre a mesma tarefa.') + '</p>' +
      '<svg class="jg-sapato" viewBox="0 0 300 200" role="img" aria-label="Um sapato em construção"></svg><p class="jg-msg">Quando começar, toca nos pontos pela ordem dos números.</p>';
    const svg = host.querySelector('svg'), gS = svgEl('g', {}, svg), gP = svgEl('g', {}, svg);
    const conta = host.querySelector('.jg-conta'), barra = host.querySelector('.jg-tempo span'), msg = host.querySelector('.jg-msg');
    svg.style.touchAction = 'none';
    const res = artesao ? { sapatos: 0 } : { pecas: [0, 0, 0, 0] };
    const CORES = ['#7A4A2A', '#2F6E9E', '#5E7A3A', '#8A2F2F', '#444'];
    return new Promise(resolve => {
      let vivo = false, t0 = 0, vez = 0, proximo = 0, feitos = 0;
      function tarefa() {
        const k = postos[vez % postos.length], T = F.TAREFAS[k];
        F.sapato(gS, artesao ? k : k, CORES[feitos % CORES.length]);          // o que já está feito quando a peça chega a este posto
        gP.replaceChildren(); proximo = 0;
        msg.innerHTML = '<b>' + T.nome + '</b>: toca nos pontos, do 1 ao ' + T.pts.length + '.';
        T.pts.forEach((p, i) => {
          const g = svgEl('g', { transform: 'translate(' + p[0] + ',' + p[1] + ')' }, gP);
          svgEl('circle', { r: 26, fill: 'transparent' }, g);
          const c = svgEl('circle', { r: 13, fill: i === 0 ? '#A44A16' : '#fff', stroke: '#A44A16', 'stroke-width': 3 }, g);
          const tx = svgEl('text', { y: 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, 'font-family': 'Arial, sans-serif', fill: i === 0 ? '#fff' : '#A44A16', 'pointer-events': 'none' }, g); tx.textContent = i + 1;
          g.addEventListener('pointerdown', ev => {
            ev.preventDefault();
            if (!vivo || i !== proximo) return;
            proximo++; g.style.opacity = '0.15'; som(520 + 60 * i, 0.07, 0.05);
            const nx = gP.children[proximo];
            if (nx) { nx.children[1].setAttribute('fill', '#A44A16'); nx.children[2].setAttribute('fill', '#fff'); }
            else pronta(k);
          });
          void c;
        });
      }
      function pronta(k) {
        if (artesao) {
          if (k === 3) { res.sapatos++; feitos++; F.sapato(gS, 4, CORES[(feitos - 1) % CORES.length]); som(1040, 0.18, 0.09); }
          conta.textContent = 'Sapatos prontos: ' + res.sapatos;
        } else { res.pecas[k]++; feitos++; conta.textContent = 'Peças feitas: ' + res.pecas.reduce((a, b) => a + b, 0); F.sapato(gS, k + 1, CORES[(feitos - 1) % CORES.length]); }
        vez++; gP.replaceChildren();
        if (o.aoProgredir) o.aoProgredir(res);
        if (artesao) msg.innerHTML = 'A trocar de ferramenta: pousas ' + F.FERRAMENTAS[k] + ', pegas n' + F.FERRAMENTAS[(k + 1) % 4] + '…';
        setTimeout(() => { if (vivo) tarefa(); }, artesao ? F.TROCA : 160);
      }
      function fim() {
        if (!vivo) return; vivo = false; barra.style.width = '0%'; gP.replaceChildren();
        conta.textContent = artesao ? 'Fizeste ' + res.sapatos + (res.sapatos === 1 ? ' sapato' : ' sapatos') : 'Fizeste ' + res.pecas.reduce((a, b) => a + b, 0) + ' peças';
        msg.textContent = 'Acabou o turno. Olha para o ecrã da sala.';
        resolve(res);
      }
      const ate = performance.now() + Math.max(0, o.espera || 0);
      (function antes() {
        const falta = ate - performance.now();
        if (falta > 0) { conta.textContent = falta > 3200 ? 'Prepara-te…' : String(Math.ceil(falta / 1000)); F.sapato(gS, 0); return requestAnimationFrame(antes); }
        vivo = true; t0 = performance.now(); conta.textContent = artesao ? 'Sapatos prontos: 0' : 'Peças feitas: 0'; som(1040, 0.2, 0.1); tarefa();
        (function tic() {
          if (!vivo) return;
          const resto = o.dur - (performance.now() - t0);
          barra.style.width = Math.max(0, resto / o.dur * 100) + '%';
          if (resto <= 0) return fim();
          requestAnimationFrame(tic);
        })();
      })();
    });
  };
})();
