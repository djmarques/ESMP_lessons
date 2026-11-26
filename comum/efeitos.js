/* =====================================================================
   comum/efeitos.js — sons, música de fundo e animações dos jogos.
   Usado pelos slides (comum/aula.js, comum/aovivo.js) e pela página do
   aluno (respostas/aluno.js, respostas/vivo.js).
   ---------------------------------------------------------------------
   Tudo é sintetizado no próprio navegador (Web Audio): não há ficheiros de
   som para carregar nem direitos de autor para respeitar.

   ESMP.som.fx.<nome>()      efeitos curtos:
        toque      escolher uma opção          certo / errado
        tempo      acabou o tempo («uá-uá-uá») inicio     começa o jogo
        contagem   3, 2, 1 (n) e «Já!» (0)     aviso      faltam 10 segundos
        tique      últimos 5 segundos: cada vez mais agudo; nos últimos 3 bate duas vezes
        seguidas   n respostas certas seguidas entrou     alguém entrou na sala
        revelar    mostra-se a resposta certa  rufar      tambores antes do pódio
        podio      fanfarra do pódio           fim        fim de um jogo (bom ou assim-assim)
        subiu      subir na classificação
   ESMP.som.musica.tocar('jogo' | 'espera')   música de fundo, em ciclo
   ESMP.som.musica.tensao(true)               acelera (o tempo está a acabar)
   ESMP.som.musica.baixar(true)               baixa o volume (lê-se a explicação)
   ESMP.som.musica.parar()
   ESMP.som.botoes()         dois botões: som dos efeitos e música. A escolha
                             fica guardada no aparelho ('jogo-som', 'jogo-musica').
   ESMP.som.acordar()        chamar dentro de um toque: o iPhone só deixa
                             tocar som depois de o utilizador tocar no ecrã.

   ESMP.festa.confete(opções)   papelinhos nas cores do site
   ESMP.festa.abanar(el)        abana um elemento (resposta errada)
   ESMP.festa.saltar(el)        dá um pequeno salto (os pontos sobem)
   ESMP.festa.contar(el, de, até)   conta os pontos a subir
   ESMP.festa.flutuar(el, texto)    «+135» a subir a partir de um elemento
   ESMP.festa.contagem(host)        3, 2, 1, Já! por cima de um elemento
   ESMP.festa.frase('certo' | 'errado')   uma frase diferente de cada vez
   Quem pediu ao sistema «reduzir movimento» vê menos papelinhos e nada abana.
   ===================================================================== */
(function () {
  'use strict';
  const E = window.ESMP = window.ESMP || {};
  if (E.som) return;
  const ler = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } };
  const estado = { efeitos: ler('jogo-som') !== 'off', musica: ler('jogo-musica') !== 'off' };
  const CALMO = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* =====================================================================
     1. Som
     ===================================================================== */
  let ac = null, canalFx = null, canalMus = null, ruidoBuf = null;
  function audio() {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
        const saida = ac.createDynamicsCompressor(); saida.connect(ac.destination);   // evita estalos quando vários sons coincidem
        canalFx = ac.createGain(); canalFx.gain.value = 0.9; canalFx.connect(saida);
        canalMus = ac.createGain(); canalMus.gain.value = 0.0001; canalMus.connect(saida);
        ruidoBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);                  // um segundo de ruído branco (pratos, tambores)
        const d = ruidoBuf.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
      }
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      return ac;
    } catch (e) { return null; }
  }
  function nota(dest, f, t, dur, tipo, vol, ate) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(f, t);
    if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function ruido(dest, t, dur, vol, freq, filtro) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = ruidoBuf; s.loop = true;
    f.type = filtro || 'highpass'; f.frequency.value = freq || 6000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  /** Toca uma lista de notas [frequência, início, duração, onda, volume, deslizar até]. */
  function tocar(notas, depois) {
    if (!estado.efeitos) return;
    const a = audio(); if (!a) return;
    try {
      const t = a.currentTime + 0.01;
      notas.forEach(n => nota(canalFx, n[0], t + n[1], n[2], n[3] || 'triangle', n[4] || 0.2, n[5]));
      if (depois) depois(t);
    } catch (e) { /* sem som: o jogo funciona na mesma */ }
  }
  const DO = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568];      // dó maior pentatónico, duas oitavas

  const fx = {
    toque: () => tocar([[720, 0, 0.07, 'triangle', 0.12]]),
    certo: () => tocar([[659, 0, 0.12, 'triangle', 0.25], [988, 0.11, 0.22, 'triangle', 0.25], [1319, 0.22, 0.32, 'sine', 0.13]]),
    errado: () => tocar([[233, 0, 0.2, 'sawtooth', 0.1, 185], [175, 0.2, 0.36, 'sawtooth', 0.1, 110]]),
    tempo: () => tocar([[392, 0, 0.24, 'sawtooth', 0.09, 370], [349, 0.26, 0.24, 'sawtooth', 0.09, 330], [311, 0.52, 0.24, 'sawtooth', 0.09, 294], [277, 0.78, 0.7, 'sawtooth', 0.1, 175]]),
    inicio: () => tocar([[523, 0, 0.14, 'triangle', 0.2], [659, 0.09, 0.14, 'triangle', 0.2], [784, 0.18, 0.14, 'triangle', 0.2], [1047, 0.27, 0.32, 'triangle', 0.22]]),
    contagem: n => tocar(n > 0 ? [[660, 0, 0.16, 'square', 0.07], [330, 0, 0.16, 'triangle', 0.14]] : [[990, 0, 0.45, 'square', 0.07], [1320, 0, 0.45, 'triangle', 0.14], [660, 0, 0.45, 'triangle', 0.12]]),
    aviso: () => tocar([[880, 0, 0.12, 'sine', 0.16], [660, 0.14, 0.22, 'sine', 0.16]]),
    tique: resto => {
      const f = 900 + (5 - Math.max(1, Math.min(5, resto))) * 140;
      tocar(resto <= 3 ? [[f, 0, 0.06, 'square', 0.07], [f * 1.19, 0.17, 0.06, 'square', 0.07]] : [[f, 0, 0.06, 'square', 0.06]]);
    },
    seguidas: n => { const k = Math.max(3, Math.min(8, n + 1)); tocar(DO.slice(0, k).map((f, j) => [f * 2, j * 0.055, j === k - 1 ? 0.3 : 0.09, 'triangle', 0.13])); },
    entrou: () => tocar([[520, 0, 0.09, 'sine', 0.13, 900]]),
    subiu: () => tocar([[440, 0, 0.22, 'sine', 0.1, 1320]]),
    revelar: () => tocar([[392, 0, 0.1, 'triangle', 0.16], [523, 0.09, 0.1, 'triangle', 0.16], [659, 0.18, 0.1, 'triangle', 0.16], [784, 0.27, 0.4, 'triangle', 0.18]], t => ruido(canalFx, t + 0.27, 0.5, 0.05, 7000)),
    /** Tambores a acelerar durante «dur» segundos (antes de se mostrar o pódio). */
    rufar: dur => tocar([], t => {
      let x = 0;
      while (x < dur) { const p = x / dur; ruido(canalFx, t + x, 0.05, 0.05 + 0.12 * p, 1600, 'bandpass'); x += 0.075 - 0.04 * p; }
    }),
    podio: () => tocar([[523, 0, 0.16, 'triangle', 0.2], [523, 0.18, 0.08, 'triangle', 0.2], [523, 0.27, 0.08, 'triangle', 0.2], [659, 0.36, 0.2, 'triangle', 0.2], [784, 0.58, 0.2, 'triangle', 0.2],
      [1047, 0.8, 0.9, 'triangle', 0.22], [784, 0.8, 0.9, 'triangle', 0.14], [659, 0.8, 0.9, 'triangle', 0.14], [262, 0.8, 0.9, 'sawtooth', 0.05]], t => { ruido(canalFx, t + 0.8, 0.9, 0.09, 6000); }),
    fim: bom => tocar(bom
      ? [[523, 0, 0.13, 'triangle', 0.2], [659, 0.12, 0.13, 'triangle', 0.2], [784, 0.24, 0.13, 'triangle', 0.2], [1047, 0.36, 0.5, 'triangle', 0.22], [1319, 0.36, 0.5, 'sine', 0.1]]
      : [[523, 0, 0.16, 'triangle', 0.18], [440, 0.16, 0.16, 'triangle', 0.18], [523, 0.32, 0.4, 'triangle', 0.18]])
  };

  /* ---------- música de fundo: um pequeno sequenciador de 16 passos por compasso ----------
     Quatro compassos em ciclo (dó, lá menor, fá, sol): bombo, palmas, pratos, baixo,
     arpejo e uma melodia curta. «espera» é mais lenta e mais calma (sala de espera);
     «tensao» acelera e enche os pratos, para se ouvir que o tempo está a acabar. */
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const ACORDES = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  const MELODIA = {
    jogo: [[[0, 76], [3, 79], [6, 81], [8, 79], [12, 76]], [[0, 72], [3, 76], [6, 79], [8, 76], [12, 72]], [[0, 77], [3, 81], [6, 84], [8, 81], [12, 77]], [[0, 79], [2, 81], [4, 83], [6, 86], [8, 84], [11, 83], [14, 79]]],
    espera: [[[0, 76], [6, 79], [10, 84]], [[0, 76], [6, 81], [10, 84]], [[0, 77], [6, 81], [10, 84]], [[0, 79], [6, 83], [10, 86], [14, 83]]]
  };
  const BAIXO = { jogo: { 0: 0, 3: 0, 6: 7, 8: 0, 11: 0, 14: 12 }, espera: { 0: 0, 8: 7 } };
  const mus = { pedido: null, modo: null, tensa: false, baixa: false, passo: 0, t: 0, relogio: null };

  function passoMusical(t) {
    const modo = mus.modo, s = mus.passo % 16, comp = Math.floor(mus.passo / 16) % 4, ac3 = ACORDES[comp], raiz = ac3[0] - 12;
    const jogo = modo === 'jogo';
    // bateria
    if (s === 0 || s === 8 || (jogo && comp === 3 && s === 10)) nota(canalMus, 120, t, 0.16, 'sine', jogo ? 0.5 : 0.28, 45);
    if (jogo && (s === 4 || s === 12)) ruido(canalMus, t, 0.09, 0.13, 1800, 'bandpass');
    if (mus.tensa || s % 2 === 0) ruido(canalMus, t, 0.03, (s % 4 === 2 ? 0.07 : 0.04) * (jogo ? 1 : 0.6), 7500);
    // baixo
    const b = BAIXO[modo][s];
    if (b != null) { nota(canalMus, hz(raiz + b), t, jogo ? 0.2 : 0.7, 'triangle', 0.22); nota(canalMus, hz(raiz + b + 12), t, jogo ? 0.14 : 0.5, 'sine', 0.07); }
    // arpejo (só no jogo) ou acorde longo (na sala de espera)
    if (jogo && [2, 5, 7, 10, 13, 15].indexOf(s) >= 0) nota(canalMus, hz(ac3[(s + comp) % 3] + 12), t, 0.11, 'square', 0.022);
    if (!jogo && s === 0) ac3.forEach(m => nota(canalMus, hz(m), t, 2.3, 'sine', 0.05));
    // melodia
    MELODIA[modo][comp].forEach(n => { if (n[0] === s) nota(canalMus, hz(n[1]), t, jogo ? 0.2 : 0.5, 'triangle', jogo ? 0.075 : 0.06); });
    // tempo a acabar: um aviso agudo em cada tempo
    if (mus.tensa && s % 4 === 0) nota(canalMus, hz(raiz + 36), t, 0.07, 'square', 0.03);
  }
  function agendar() {
    if (!ac || !mus.modo) return;
    if (document.visibilityState === 'hidden') return;
    if (mus.t < ac.currentTime) mus.t = ac.currentTime + 0.06;          // voltou de uma pausa: recomeça já
    while (mus.t < ac.currentTime + 0.3) {
      try { passoMusical(mus.t); } catch (e) { /* um passo falhado não pára a música */ }
      mus.passo++;
      mus.t += 60 / ((mus.modo === 'jogo' ? 108 : 92) * (mus.tensa ? 1.28 : 1)) / 4;
    }
  }
  function volume(v, tau) { if (ac) { try { canalMus.gain.cancelScheduledValues(ac.currentTime); canalMus.gain.setTargetAtTime(Math.max(0.0001, v), ac.currentTime, tau || 0.15); } catch (e) { /* nada */ } } }
  /** Põe a música de acordo com o que foi pedido e com os botões. */
  function acertar() {
    const quer = estado.musica ? mus.pedido : null;
    if (!quer) {
      if (mus.modo) { mus.modo = null; clearInterval(mus.relogio); mus.relogio = null; volume(0, 0.08); }
      return;
    }
    if (!audio()) return;
    if (mus.modo !== quer) { mus.modo = quer; mus.passo = 0; mus.t = 0; }
    volume(mus.baixa ? 0.16 : 0.55);
    if (!mus.relogio) { mus.relogio = setInterval(agendar, 90); agendar(); }
  }
  const musica = {
    tocar: modo => { mus.pedido = modo === 'espera' ? 'espera' : 'jogo'; mus.tensa = false; mus.baixa = false; acertar(); },
    parar: () => { mus.pedido = null; mus.tensa = false; mus.baixa = false; acertar(); },
    tensao: sim => { mus.tensa = !!sim; },
    baixar: sim => { mus.baixa = !!sim; if (mus.modo) volume(mus.baixa ? 0.16 : 0.55, 0.25); },
    ativa: () => !!mus.modo
  };
  document.addEventListener('visibilitychange', () => { if (mus.modo) volume(document.visibilityState === 'hidden' ? 0 : (mus.baixa ? 0.16 : 0.55)); });

  /* ---------- botões de som ---------- */
  const ICONES = {
    som: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path class="on" d="M15 8.5a4.5 4.5 0 0 1 0 7M17.5 5.5a8.5 8.5 0 0 1 0 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path class="off" d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    musica: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18.5a2.5 2.5 0 1 1-2-2.45V5l11-2v11.5a2.5 2.5 0 1 1-2-2.45V6.4L9 7.7v10.8z"/><path class="off" d="M4 3l16 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>'
  };
  const todos = [];
  function pintarBotoes() {
    todos.forEach(b => {
      const ligado = estado[b.dataset.som === 'som' ? 'efeitos' : 'musica'];
      b.classList.toggle('off', !ligado); b.setAttribute('aria-pressed', String(ligado));
    });
  }
  /** Devolve <span class="esmp-som"> com os dois botões (ou só o da música: botoes({ so: 'musica' })). */
  function botoes(o) {
    const s = document.createElement('span'); s.className = 'esmp-som';
    (o && o.so ? [o.so] : ['som', 'musica']).forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.som = k; b.innerHTML = ICONES[k];
      b.title = k === 'som' ? 'Sons do jogo' : 'Música de fundo'; b.setAttribute('aria-label', b.title + ': ligar ou desligar');
      b.addEventListener('click', e => { e.stopPropagation(); alternar(k === 'som' ? 'efeitos' : 'musica'); });
      s.appendChild(b); todos.push(b);
    });
    pintarBotoes();
    return s;
  }
  function alternar(qual) {
    estado[qual] = !estado[qual];
    gravar(qual === 'efeitos' ? 'jogo-som' : 'jogo-musica', estado[qual] ? 'on' : 'off');
    if (estado[qual]) audio();
    if (qual === 'musica') acertar(); else if (estado.efeitos) fx.toque();
    pintarBotoes();
  }
  E.som = {
    fx: fx, musica: musica, botoes: botoes, alternar: alternar,
    ligado: qual => estado[qual || 'efeitos'],
    acordar: () => { audio(); },
    /** Volta a ler a escolha guardada (o botão de som dos slides guarda-a por conta própria). */
    sincronizar: () => { estado.efeitos = ler('jogo-som') !== 'off'; estado.musica = ler('jogo-musica') !== 'off'; pintarBotoes(); acertar(); }
  };

  /* =====================================================================
     2. Animações
     ===================================================================== */
  const PALETA = ['#A44A16', '#F0A673', '#2F6E9E', '#5E7A3A', '#1E2A33', '#E9C46A'];
  const st = document.createElement('style');
  st.textContent =
    '.esmp-som{display:inline-flex;gap:6px;vertical-align:middle}' +
    '.esmp-som button{width:38px;height:38px;padding:7px;border-radius:10px;border:1px solid rgba(128,128,128,.45);background:none;color:inherit;cursor:pointer;line-height:0}' +
    '.esmp-som svg{width:100%;height:100%;fill:currentColor}.esmp-som .off{display:none}.esmp-som button.off{opacity:.55}.esmp-som button.off .on{display:none}.esmp-som button.off .off{display:inline}' +
    '.esmp-confete{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3000}' +
    '@keyframes esmp-abana{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}' +
    '.esmp-abana{animation:esmp-abana .45s both}' +
    '@keyframes esmp-salta{0%{transform:scale(1)}40%{transform:scale(1.3)}100%{transform:scale(1)}}' +
    '.esmp-salta{animation:esmp-salta .4s ease-out;display:inline-block}' +
    '@keyframes esmp-flutua{from{opacity:0;transform:translate(-50%,8px) scale(.7)}20%{opacity:1;transform:translate(-50%,-8px) scale(1.2)}to{opacity:0;transform:translate(-50%,-64px) scale(1)}}' +
    '.esmp-flutua{position:fixed;z-index:3001;pointer-events:none;font:700 26px Carlito,Calibri,Arial,sans-serif;color:#2E6B4F;text-shadow:0 1px 0 #fff,0 0 8px #fff;animation:esmp-flutua 1.1s ease-out forwards;white-space:nowrap}' +
    '.esmp-321{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:rgba(250,246,240,.94);border-radius:inherit}' +
    '.esmp-321 b{font:700 min(38vw,190px)/1 Caladea,Cambria,Georgia,serif;color:#A44A16;animation:esmp-321 .7s ease-out both}' +
    '.esmp-321 b.ja{color:#2E6B4F;font-size:min(26vw,130px)}' +
    '@keyframes esmp-321{from{opacity:0;transform:scale(2.2)}30%{opacity:1;transform:scale(1)}80%{opacity:1}to{opacity:0;transform:scale(.7)}}' +
    '@media (prefers-reduced-motion:reduce){.esmp-abana,.esmp-salta{animation:none}.esmp-321 b{animation-duration:.01s;animation-fill-mode:none}}';
  document.head.appendChild(st);

  let tela = null, pecas = [], aRodar = false;
  /** Papelinhos. x, y: de onde saem (0 a 1 do ecrã); n: quantos; chuva: caem de cima, a toda a largura. */
  function confete(o) {
    o = o || {};
    const n = Math.round((o.n || 60) * (CALMO ? 0.3 : 1));
    if (!tela) { tela = document.createElement('canvas'); tela.className = 'esmp-confete'; }
    if (!tela.isConnected) document.body.appendChild(tela);
    const W = tela.width = window.innerWidth, H = tela.height = window.innerHeight, u = Math.max(0.7, Math.min(1.6, W / 900));
    for (let k = 0; k < n; k++) {
      const ang = o.chuva ? Math.PI / 2 + (Math.random() - 0.5) * 0.6 : -Math.PI / 2 + (Math.random() - 0.5) * (o.abertura || 1.9);
      const v = (o.chuva ? 2 + Math.random() * 4 : 8 + Math.random() * 11) * u * (o.forca || 1);
      pecas.push({
        x: o.chuva ? Math.random() * W : (o.x == null ? 0.5 : o.x) * W, y: o.chuva ? -20 - Math.random() * H * 0.4 : (o.y == null ? 0.6 : o.y) * H,
        vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, r: (5 + Math.random() * 6) * u, cor: PALETA[k % PALETA.length],
        rot: Math.random() * 6.3, vr: CALMO ? 0 : (Math.random() - 0.5) * 0.4, forma: k % 3, vida: 0, max: (o.chuva ? 190 : 110) + Math.random() * 50
      });
    }
    if (aRodar) return;
    aRodar = true;
    const g = tela.getContext('2d');
    (function quadro() {
      g.clearRect(0, 0, tela.width, tela.height);
      pecas = pecas.filter(p => p.vida < p.max && p.y < tela.height + 30);
      pecas.forEach(p => {
        p.vida++; p.vy += 0.32 * u; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.globalAlpha = Math.min(1, (p.max - p.vida) / 25); g.fillStyle = p.cor;
        if (p.forma === 0) g.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
        else if (p.forma === 1) { g.beginPath(); g.arc(0, 0, p.r * 0.6, 0, 6.3); g.fill(); }
        else { g.beginPath(); g.moveTo(0, -p.r); g.lineTo(p.r * 0.9, p.r * 0.7); g.lineTo(-p.r * 0.9, p.r * 0.7); g.closePath(); g.fill(); }
        g.restore();
      });
      if (pecas.length) requestAnimationFrame(quadro); else { aRodar = false; tela.remove(); }
    })();
  }
  /** Papelinhos a sair de um elemento (por exemplo o botão da resposta certa). */
  function confeteDe(el, o) {
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    confete(Object.assign({ x: r ? (r.left + r.width / 2) / window.innerWidth : 0.5, y: r ? (r.top + r.height / 2) / window.innerHeight : 0.6 }, o || {}));
  }
  function animar(el, cls, ms) { if (!el || CALMO) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); }
  function contar(el, de, ate, ms) {
    if (!el) return;
    if (CALMO || de === ate) { el.textContent = ate; return; }
    const t0 = performance.now(), dur = ms || 600;
    (function passo(t) {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(de + (ate - de) * (1 - Math.pow(1 - p, 3)));
      if (p < 1 && el.isConnected) requestAnimationFrame(passo); else el.textContent = ate;
    })(t0);
  }
  function flutuar(el, texto, cor) {
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect(), s = document.createElement('span');
    s.className = 'esmp-flutua'; s.textContent = texto; if (cor) s.style.color = cor;
    s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top - 4) + 'px';
    document.body.appendChild(s); setTimeout(() => s.remove(), 1150);
  }
  /** 3, 2, 1, Já! por cima de «host» (que tem de ter position: relative). Devolve uma promessa. */
  function contagem(host, de) {
    return new Promise(feito => {
      const c = document.createElement('div'); c.className = 'esmp-321'; host.appendChild(c);
      let n = de || 3;
      (function bate() {
        if (!c.isConnected) return feito();
        c.innerHTML = '<b' + (n ? '' : ' class="ja"') + '>' + (n || 'Já!') + '</b>'; fx.contagem(n);
        if (n === 0) return setTimeout(() => { c.remove(); feito(); }, CALMO ? 250 : 520);
        n--; setTimeout(bate, CALMO ? 450 : 700);
      })();
    });
  }
  const FRASES = {
    certo: ['Certo!', 'Boa!', 'Isso mesmo!', 'Em cheio!', 'Exatamente!', 'Muito bem!'],
    errado: ['Não é essa.', 'Ainda não.', 'Desta vez não.']
  };
  const ultima = {};
  function frase(tipo) {
    const l = FRASES[tipo]; let k;
    do { k = Math.floor(Math.random() * l.length); } while (l.length > 1 && k === ultima[tipo]);
    ultima[tipo] = k; return l[k];
  }
  /** «3 seguidas!», com mais entusiasmo à medida que a série cresce. */
  const seguidas = n => (n < 2 ? '' : n + ' seguidas' + (n >= 5 ? '! Imparável!' : n >= 3 ? '! 🔥' : '!'));
  const vibrar = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sem vibração */ } };

  E.festa = {
    confete: confete, confeteDe: confeteDe, contar: contar, flutuar: flutuar, contagem: contagem, frase: frase, seguidas: seguidas, vibrar: vibrar,
    abanar: el => animar(el, 'esmp-abana', 460), saltar: el => animar(el, 'esmp-salta', 420), calmo: CALMO, PALETA: PALETA
  };
})();
