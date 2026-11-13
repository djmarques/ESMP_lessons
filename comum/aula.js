/* =====================================================================
   comum/aula.js — ferramentas do professor, iguais em todos os sites das aulas.
   ---------------------------------------------------------------------
   Basta que o index.html da aula tenha, no fim do <body>:
       <script src="../comum/partilhado.js"></script>
       <script src="../comum/aula.js"></script>
   (com ../../ nas pastas de dois níveis, como ai-2ano/o-trabalho).

   O que acrescenta, sem mexer nos slides:
     1. Um botão «Responder no telemóvel» em TODOS os questionários (.quiz) e
        jogos (.game) que ainda não o tinham. O telemóvel lê as perguntas
        diretamente dos slides (respostas/?f=<pasta>&q=<n>).
     2. «Respostas da turma»: ao lado do código QR, gráficos de barras ao vivo
        com as respostas que vão chegando à folha «Avaliação contínua».
     3. Uma barra de ferramentas (canto inferior direito):
          D  desenhar por cima do slide
          Q  quadro em branco
          G  grafo de vocabulário (palavras = nós, ligações = arestas)
          P  pergunta rápida (nuvem de palavras, verdadeiro/falso, escala,
             escolha múltipla), respondida no telemóvel
        Esc fecha qualquer uma.
   ===================================================================== */
(function () {
  'use strict';
  const E = window.ESMP;
  if (!E || window.ESMP_AULA) return;
  window.ESMP_AULA = true;

  const eu = document.currentScript;
  const RAIZ = new URL('..', eu.src).href;                           // …/ESMP_lessons/
  const PASTA = decodeURI(location.href.split(/[?#]/)[0]).replace(decodeURI(RAIZ), '').replace(/index\.html$/, '').replace(/\/+$/, '');
  const PUBLICADO = /^https?:/.test(location.href);
  const esc = E.esc;
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  const ler = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };

  // estilos e endereço do Apps Script
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = RAIZ + 'comum/aula.css'; document.head.appendChild(css);
  const carregar = src => new Promise((ok, erro) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = erro; document.head.appendChild(s); });
  const config = (window.CONFIG && window.CONFIG.SCRIPT_URL) ? Promise.resolve() : carregar(RAIZ + 'respostas/config.js').catch(() => {});
  const cfg = () => window.CONFIG || {};
  const disciplina = () => (cfg().DISCIPLINAS || {})[PASTA] || PASTA;

  /* ---------- camadas (uma por cima da outra; Esc fecha a de cima) ---------- */
  const abertas = [];
  // os toques e cliques dentro de uma camada não chegam ao slide (que avançaria ou mudaria com o deslizar do dedo)
  const isolar = x => ['touchstart', 'touchmove', 'touchend', 'click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'wheel'].forEach(t => x.addEventListener(t, e => e.stopPropagation()));
  function abrir(ov, aoFechar) { isolar(ov); document.body.appendChild(ov); abertas.push({ ov: ov, f: aoFechar }); return ov; }
  function fechar(ov) {
    const k = abertas.findIndex(a => a.ov === ov); if (k < 0) return;
    const a = abertas.splice(k, 1)[0]; if (a.f) a.f(); a.ov.remove();
  }
  // capturar as teclas antes do app.js da aula: com uma camada aberta, as setas não mudam de slide
  window.addEventListener('keydown', e => {
    const campo = e.target.closest && e.target.closest('input, textarea, select');
    if (abertas.length) {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); fechar(abertas[abertas.length - 1].ov); }
      else if (!campo && abertas[abertas.length - 1].tecla) abertas[abertas.length - 1].tecla(e);
      return;
    }
    if (campo || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    const f = { d: () => quadro(true), q: () => quadro(false), g: () => grafo({ id: 'livre', titulo: 'Grafo de vocabulário' }), p: rapida }[k];
    if (f) { e.preventDefault(); e.stopPropagation(); f(); }
  }, true);

  /* =====================================================================
     1 e 2. Telemóvel em todos os questionários + respostas da turma
     ===================================================================== */
  let grafoAberto = null;      // { pergunta, juntar(contagens) } quando o grafo foi aberto a partir de uma nuvem

  function sessao(def, url) {
    const ov = el('<div class="esmp-ov esmp-sessao"><div class="es-caixa">' +
      '<header><div><p class="es-k">Responder no telemóvel · ' + esc(def.disciplina || '') + '</p><h3>' + esc(def.titulo) + '</h3></div><button type="button" class="es-x">Fechar ✕</button></header>' +
      '<div class="es-cols"><div class="es-qr"><div class="code"></div><a target="_blank" rel="noopener"></a><p>Lê o código com a câmara · escreve o teu nome · responde</p><p class="es-sm">Quem não tem telemóvel responde com um colega: no primeiro ecrã, «Responder com um colega».</p></div>' +
      '<div class="es-res"><label class="es-rev"><input type="checkbox"> Mostrar as respostas certas</label><div class="es-painel"></div></div></div></div></div>');
    const link = ov.querySelector('.es-qr a'); link.href = url;
    if (!PUBLICADO) link.textContent = 'O código QR aparece quando o site estiver publicado (GitHub Pages).';
    else { link.textContent = url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70) + (url.length > 80 ? '…' : ''); E.qr(ov.querySelector('.code'), url, 520); }
    let painel = null;
    config.then(() => {
      if (!ov.isConnected) return;
      painel = E.painel(ov.querySelector('.es-painel'), def, {
        url: (cfg().SCRIPT_URL || '').trim(), auto: 5000, revelar: false,
        grafo: (perg, cont) => grafo({ id: 'n-' + def.titulo.slice(0, 40) + '-' + perg.slice(0, 40), titulo: perg, palavras: cont }),
        aoAtualizar: nuvens => { if (grafoAberto) { const n = nuvens.find(x => x.p === grafoAberto.pergunta); if (n) grafoAberto.juntar(n.c); } }
      });
    });
    const temCertas = E.passos(def).some(p => (p.tipo === 'jogo') || (p.tipo === 'classificar' && p.itens.some(i => typeof i.c === 'number')) || (p.tipo === 'escala' && E.itensEscala(p).some(i => i.c != null)));
    ov.querySelector('.es-rev').hidden = !temCertas;
    ov.querySelector('.es-rev input').addEventListener('change', e => painel && painel.revelar(e.target.checked));
    ov.querySelector('.es-x').addEventListener('click', () => fechar(ov));
    ov.addEventListener('click', e => { if (e.target === ov) fechar(ov); });
    abrir(ov, () => painel && painel.parar());
  }

  // (1) botão em todos os questionários e jogos que ainda não têm ligação ao telemóvel
  const JA_TEM = '.phone-btn, .phone-qr, a.act-btn[href*="respostas/"], .esmp-tel';
  E.componentes(document).forEach((c, n) => {
    const slide = c.closest('.slide');
    if (!slide || slide.querySelector(JA_TEM)) return;
    const b = el('<button type="button" class="esmp-tel">Responder no telemóvel</button>');
    c.parentNode.insertBefore(b, c);
    b.addEventListener('click', e => {
      e.stopPropagation();
      const def = E.extrair(document, n); if (!def) return;
      def.disciplina = disciplina();
      config.then(() => { def.disciplina = disciplina(); sessao(def, RAIZ + 'respostas/?f=' + PASTA + '&q=' + n); });
    });
  });

  // (2) «Respostas da turma» ao lado dos botões e códigos QR que já existiam
  const atividades = {};
  function atividade(f, a) {
    atividades[f] = atividades[f] || carregar(RAIZ + f + '/atividades.js').then(() => { const x = window.ATIVIDADES || {}; window.ATIVIDADES = undefined; return x; });
    return atividades[f].then(t => t[a]);
  }
  document.querySelectorAll('.phone-btn[data-path], .phone-qr[data-path], a.act-btn[href*="respostas/"]').forEach(orig => {
    const u = new URL(orig.dataset.path || orig.getAttribute('href'), location.href);
    const f = u.searchParams.get('f') || (/aluno\.html/.test(u.pathname) ? PASTA : ''), a = u.searchParams.get('a');
    if (!f || !a) return;
    const b = el('<button type="button" class="esmp-ver">Respostas da turma</button>');
    orig.classList.contains('phone-qr') ? orig.appendChild(b) : orig.insertAdjacentElement('afterend', b);
    b.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      atividade(f, a).then(act => {
        if (!act) return;
        sessao({ disciplina: act.disciplina || (cfg().DISCIPLINAS || {})[f] || 'CP 4', titulo: act.titulo, passos: act.passos, jogo: act.jogo, escrita: act.escrita }, u.href);
      }).catch(() => {});
    });
  });

  /* =====================================================================
     3a. Pergunta rápida
     ===================================================================== */
  function rapida() {
    const K = 'esmp-rapidas-' + PASTA, antigas = ler(K, []);
    const ov = el('<div class="esmp-ov esmp-rapida"><form class="es-caixa" autocomplete="off">' +
      '<header><div><p class="es-k">Pergunta rápida · respondida no telemóvel</p><h3>O que queres perguntar à turma?</h3></div><button type="button" class="es-x">Fechar ✕</button></header>' +
      '<div class="er-tipos">' +
      '<label><input type="radio" name="t" value="nuvem" checked><span>Nuvem de palavras</span></label>' +
      '<label><input type="radio" name="t" value="vf"><span>Verdadeiro ou falso</span></label>' +
      '<label><input type="radio" name="t" value="escala"><span>Escala (cursor)</span></label>' +
      '<label><input type="radio" name="t" value="mc"><span>Escolha múltipla</span></label></div>' +
      '<label class="er-l">Pergunta ou afirmação<textarea name="p" rows="2" maxlength="160" required placeholder="Ex.: Que palavras associas a «trabalho»?"></textarea></label>' +
      '<div class="er-op" data-t="nuvem"><label class="er-l">Palavras por aluno<select name="max"><option>1</option><option>2</option><option selected>3</option></select></label></div>' +
      '<div class="er-op" data-t="vf" hidden><label class="er-l">Resposta certa<select name="vf"><option value="">Sem resposta certa (opinião)</option><option value="V">Verdadeiro</option><option value="F">Falso</option></select></label></div>' +
      '<div class="er-op er-grelha" data-t="escala" hidden><label class="er-l">De<input name="min" type="number" value="1"></label><label class="er-l">Até<input name="max2" type="number" value="10"></label>' +
      '<label class="er-l">Legenda do mínimo<input name="e0" maxlength="30" placeholder="Discordo totalmente"></label><label class="er-l">Legenda do máximo<input name="e1" maxlength="30" placeholder="Concordo totalmente"></label>' +
      '<label class="er-l">Valor certo (opcional)<input name="c" type="number" placeholder="só para estimativas"></label><label class="er-l">Tolerância<input name="tol" type="number" value="0" min="0"></label></div>' +
      '<div class="er-op" data-t="mc" hidden><label class="er-l">Opções, uma por linha (2 a 4). Põe * antes da certa, se houver.<textarea name="o" rows="4" placeholder="*Opção certa&#10;Outra opção&#10;Outra opção"></textarea></label></div>' +
      '<p class="er-erro" hidden></p><button class="er-ir">Lançar a pergunta</button>' +
      (antigas.length ? '<div class="er-ant"><p class="es-k">Perguntas lançadas antes (abrir as respostas)</p>' + antigas.map((r, k) => '<button type="button" data-k="' + k + '">' + esc(r.def.titulo) + '</button>').join('') + '</div>' : '') +
      '</form></div>');
    const f = ov.querySelector('form');
    const tipo = () => f.querySelector('input[name=t]:checked').value;
    f.querySelectorAll('input[name=t]').forEach(r => r.addEventListener('change', () => f.querySelectorAll('.er-op').forEach(d => { d.hidden = d.dataset.t !== tipo(); })));
    const erro = m => { const e = f.querySelector('.er-erro'); e.textContent = m; e.hidden = !m; };
    f.addEventListener('submit', e => {
      e.preventDefault(); erro('');
      const p = f.p.value.replace(/\s+/g, ' ').trim(), t = tipo(); let passo;
      if (!p) return erro('Escreve a pergunta.');
      if (t === 'nuvem') passo = { tipo: 'nuvem', p: p, max: Number(f.max.value) };
      else if (t === 'vf') passo = f.vf.value ? { tipo: 'vf', afirmacoes: [{ t: p, c: f.vf.value === 'V' }] } : { tipo: 'opiniao', p: p, o: ['Verdadeiro', 'Falso'], semPorque: true };
      else if (t === 'escala') {
        const min = Number(f.min.value), max = Number(f.max2.value);
        if (!(max > min)) return erro('O valor «Até» tem de ser maior do que o valor «De».');
        passo = { tipo: 'escala', titulo: 'Escolhe um valor', p: p, min: min, max: max, passo: (max - min) > 200 ? Math.round((max - min) / 100) : 1 };
        if (f.e0.value.trim() || f.e1.value.trim()) passo.etiquetas = [f.e0.value.trim() || String(min), f.e1.value.trim() || String(max)];
        if (f.c.value !== '') { passo.c = Number(f.c.value); passo.tolerancia = Number(f.tol.value) || 0; }
      } else {
        const linhas = f.o.value.split('\n').map(s => s.trim()).filter(s => s.replace(/^\*/, '').trim());
        if (linhas.length < 2 || linhas.length > 4) return erro('Escreve entre 2 e 4 opções, uma por linha.');
        const certa = linhas.findIndex(s => s[0] === '*'), o = linhas.map(s => s.replace(/^\*\s*/, ''));
        passo = certa >= 0 ? { tipo: 'jogo', segundos: 0, perguntas: [{ p: p, o: o, c: certa }] } : { tipo: 'opiniao', p: p, o: o, semPorque: true };
      }
      const agora = new Date(), dd = n => String(n).padStart(2, '0');
      // o título é o nome do separador na folha: a pergunta e a hora, para não se misturar com outra
      const def = { titulo: 'Pergunta rápida ' + dd(agora.getDate()) + '-' + dd(agora.getMonth() + 1) + ' ' + dd(agora.getHours()) + 'h' + dd(agora.getMinutes()) + ' · ' + p.slice(0, 40), passos: [passo] };
      const url = RAIZ + 'respostas/?f=' + PASTA + '&x=' + E.codificar(def);
      guardar(K, [{ def: def, url: url }].concat(antigas).slice(0, 8));
      fechar(ov);
      config.then(() => { def.disciplina = disciplina(); sessao(def, url); });
    });
    f.querySelectorAll('.er-ant button').forEach(b => b.addEventListener('click', () => {
      const r = antigas[Number(b.dataset.k)]; fechar(ov);
      config.then(() => { r.def.disciplina = disciplina(); sessao(r.def, r.url); });
    }));
    ov.querySelector('.es-x').addEventListener('click', () => fechar(ov));
    ov.addEventListener('click', e => { if (e.target === ov) fechar(ov); });
    abrir(ov);
    f.p.focus();
  }

  /* =====================================================================
     3b. Grafo de vocabulário: palavras = nós, ligações entre conceitos = arestas
     ---------------------------------------------------------------------
     Tocar numa palavra seleciona-a; tocar noutra a seguir liga as duas (ou
     desliga, se já estavam ligadas). Arrastar muda a palavra de sítio. Tocar
     numa ligação permite dar-lhe uma etiqueta («causa», «é um tipo de»…).
     O grafo fica guardado neste computador, por aula.
     ===================================================================== */
  const SVG = 'http://www.w3.org/2000/svg', W = 1600, H = 900;
  function grafo(o) {
    const K = 'esmp-grafo-' + PASTA + '-' + o.id;
    const g = ler(K, { nos: [], arestas: [], seq: 1 });
    const salvar = () => guardar(K, g);
    const ov = el('<div class="esmp-ov esmp-grafo"><div class="eg-barra">' +
      '<b class="eg-tit"></b><form class="eg-nova"><input maxlength="28" placeholder="Nova palavra" aria-label="Nova palavra"><button>Acrescentar</button></form>' +
      '<span class="eg-dica"></span><span class="eg-sel"></span>' +
      '<span class="eg-fim"><button type="button" data-a="arrumar">Arrumar</button><button type="button" data-a="limpar">Apagar ligações</button><button type="button" data-a="png">Guardar imagem</button><button type="button" data-a="fechar">Fechar ✕</button></span></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet"><g class="eg-arestas"></g><g class="eg-nos"></g></svg></div>');
    ov.querySelector('.eg-tit').textContent = o.titulo || 'Grafo de vocabulário';
    const svg = ov.querySelector('svg'), gA = svg.querySelector('.eg-arestas'), gN = svg.querySelector('.eg-nos');
    const dica = ov.querySelector('.eg-dica'), selBox = ov.querySelector('.eg-sel');
    let sel = null;                       // { tipo: 'no' | 'aresta', id | k }

    // tamanho da letra e da caixa de uma palavra (as mais repetidas são maiores)
    const maxN = () => Math.max(1, ...g.nos.map(n => n.n));
    const letra = (n, max) => 26 + Math.round(22 * (max > 1 ? (n.n - 1) / (max - 1) : 0));
    const caixa = (n, max) => { const fs = letra(n, max); return { w: n.t.length * fs * 0.56 + 40, h: fs + 24 }; };
    /** Primeiro sítio livre numa espiral a partir do centro: as palavras nunca ficam umas por cima das outras. */
    function lugarLivre(novo, outros) {
      const max = Math.max(maxN(), novo.n), c = caixa(novo, max);
      for (let i = 0; i < 600; i++) {
        const ang = i * 2.39996, r = 34 * Math.sqrt(i);
        const x = W / 2 + r * 1.75 * Math.cos(ang), y = H / 2 + r * Math.sin(ang);
        if (x - c.w / 2 < 20 || x + c.w / 2 > W - 20 || y - c.h / 2 < 20 || y + c.h / 2 > H - 20) continue;
        if (outros.every(o => { const k = caixa(o, max); return Math.abs(o.x - x) > (k.w + c.w) / 2 + 34 || Math.abs(o.y - y) > (k.h + c.h) / 2 + 30; })) return { x: x, y: y };
      }
      return { x: 100 + Math.random() * (W - 200), y: 60 + Math.random() * (H - 120) };
    }
    function novoNo(t, n) {
      t = E.palavra(t); if (!t) return null;
      let no = g.nos.find(x => x.t === t);
      if (no) { if (n != null) no.n = n; return no; }
      no = { id: g.seq++, t: t, n: n || 1 };
      const p = lugarLivre(no, g.nos); no.x = p.x; no.y = p.y;
      g.nos.push(no); return no;
    }
    function juntar(cont) {               // palavras vindas da nuvem: novas entram, contagens atualizam-se
      const antes = g.nos.length + '|' + g.nos.map(n => n.n).join(',');
      Object.keys(cont || {}).sort((a, b) => cont[b] - cont[a]).forEach(w => novoNo(w, cont[w]));
      if (antes !== g.nos.length + '|' + g.nos.map(n => n.n).join(',')) { salvar(); pintar(); }
    }
    const no = id => g.nos.find(n => n.id === id);
    const s = (nome, attrs, pai) => { const e = document.createElementNS(SVG, nome); Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k])); if (pai) pai.appendChild(e); return e; };

    function pintar() { desenhar(); barra(); }
    function desenhar() {
      gA.innerHTML = ''; gN.innerHTML = '';
      const max = maxN();
      g.arestas.forEach((a, k) => {
        const A = no(a.a), B = no(a.b); if (!A || !B) return;
        const eSel = sel && sel.tipo === 'aresta' && sel.k === k;
        s('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, stroke: eSel ? '#FFFFFF' : '#F0A673', 'stroke-width': eSel ? 6 : 4, 'stroke-linecap': 'round' }, gA);
        const hit = s('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, stroke: 'transparent', 'stroke-width': 30, 'data-aresta': k, style: 'cursor:pointer' }, gA);
        hit.dataset.aresta = k;
        if (a.r) { const tx = s('text', { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 - 10, 'text-anchor': 'middle', 'font-size': 24, 'font-style': 'italic', fill: '#F6F3EC', stroke: '#1E2A33', 'stroke-width': 8, 'paint-order': 'stroke', 'font-family': 'Carlito, Calibri, Arial, sans-serif', style: 'pointer-events:none' }, gA); tx.textContent = a.r; }
      });
      g.nos.forEach(n => {
        const fs = letra(n, max);
        const grp = s('g', { transform: 'translate(' + n.x + ',' + n.y + ')', style: 'cursor:grab' }, gN); grp.dataset.no = n.id;
        const eSel = sel && sel.tipo === 'no' && sel.id === n.id;
        const r = s('rect', { rx: 22, ry: 22, fill: eSel ? '#F0A673' : '#F6F3EC', stroke: eSel ? '#FFFFFF' : '#F0A673', 'stroke-width': 3 }, grp);
        const t = s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': fs, 'font-weight': 700, fill: '#1E2A33', 'font-family': 'Caladea, Cambria, Georgia, serif', style: 'pointer-events:none;user-select:none' }, grp);
        t.textContent = n.t;
        let w = 0; try { w = t.getComputedTextLength(); } catch (e) { /* ainda não desenhado */ }
        w = (w || n.t.length * fs * 0.55) + 36; const h = fs + 24;
        r.setAttribute('x', -w / 2); r.setAttribute('y', -h / 2); r.setAttribute('width', w); r.setAttribute('height', h);
        if (n.n > 1) { const c = s('text', { x: w / 2 - 4, y: -h / 2 - 6, 'text-anchor': 'end', 'font-size': 18, fill: '#F0A673', 'font-family': 'Carlito, Calibri, Arial, sans-serif', style: 'pointer-events:none' }, grp); c.textContent = n.n + '×'; }
      });
    }
    function barra() {                    // o que se pode fazer agora
      selBox.innerHTML = '';
      if (!g.nos.length) dica.textContent = 'Escreve uma palavra e carrega em «Acrescentar».';
      else if (!sel) dica.textContent = 'Toca numa palavra e depois noutra para as ligar. Arrasta para mudar de sítio.';
      else if (sel.tipo === 'no') {
        dica.textContent = '«' + no(sel.id).t + '»: toca noutra palavra para ligar.';
        const b = el('<button type="button">Apagar palavra</button>');
        b.onclick = () => { g.arestas = g.arestas.filter(a => a.a !== sel.id && a.b !== sel.id); g.nos = g.nos.filter(n => n.id !== sel.id); sel = null; salvar(); pintar(); };
        selBox.appendChild(b);
      } else {
        const a = g.arestas[sel.k];
        dica.textContent = '«' + no(a.a).t + '» — «' + no(a.b).t + '»';
        const i = el('<input maxlength="24" placeholder="Etiqueta (ex.: causa)" aria-label="Etiqueta da ligação">'); i.value = a.r || '';
        i.addEventListener('input', () => { a.r = i.value.trim(); salvar(); desenhar(); });   // só o desenho: a caixa mantém o cursor
        i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sel = null; pintar(); } });
        const b = el('<button type="button">Apagar ligação</button>');
        b.onclick = () => { g.arestas.splice(sel.k, 1); sel = null; salvar(); pintar(); };
        selBox.appendChild(i); selBox.appendChild(b);
      }
    }

    const ponto = e => { const m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 }; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); return { x: p.x, y: p.y }; };
    let arr = null;
    svg.addEventListener('pointerdown', e => {
      const gn = e.target.closest('[data-no]'), ga = e.target.closest('[data-aresta]');
      if (gn) {
        const n = no(Number(gn.dataset.no)), p = ponto(e);
        arr = { n: n, dx: n.x - p.x, dy: n.y - p.y, x0: e.clientX, y0: e.clientY, mexeu: false };
        svg.setPointerCapture(e.pointerId);
      } else if (ga) { sel = { tipo: 'aresta', k: Number(ga.dataset.aresta) }; pintar(); const i = selBox.querySelector('input'); if (i) i.focus(); }
      else if (sel) { sel = null; pintar(); }
      e.preventDefault();
    });
    svg.addEventListener('pointermove', e => {
      if (!arr) return;
      if (!arr.mexeu && Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) < 6) return;
      arr.mexeu = true;
      const p = ponto(e);
      arr.n.x = Math.max(40, Math.min(W - 40, p.x + arr.dx)); arr.n.y = Math.max(30, Math.min(H - 30, p.y + arr.dy));
      desenhar();
    });
    const largar = () => {
      if (!arr) return;
      const a = arr; arr = null;
      if (a.mexeu) { salvar(); return; }
      // toque sem arrastar: selecionar, ou ligar à palavra já selecionada
      if (sel && sel.tipo === 'no' && sel.id !== a.n.id) {
        const k = g.arestas.findIndex(x => (x.a === sel.id && x.b === a.n.id) || (x.b === sel.id && x.a === a.n.id));
        if (k >= 0) g.arestas.splice(k, 1); else g.arestas.push({ a: sel.id, b: a.n.id, r: '' });
        sel = null; salvar();
      } else sel = (sel && sel.tipo === 'no' && sel.id === a.n.id) ? null : { tipo: 'no', id: a.n.id };
      pintar();
    };
    svg.addEventListener('pointerup', largar); svg.addEventListener('pointercancel', () => { arr = null; });

    ov.querySelector('.eg-nova').addEventListener('submit', e => {
      e.preventDefault(); const i = e.target.querySelector('input');
      i.value.split(/[,;]/).forEach(w => novoNo(w));        // várias de uma vez, separadas por vírgulas
      i.value = ''; salvar(); pintar(); i.focus();
    });
    ov.querySelector('.eg-fim').addEventListener('click', e => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'fechar') fechar(ov);
      else if (a === 'arrumar') { const postos = []; g.nos.slice().sort((x, y) => y.n - x.n).forEach(n => { const p = lugarLivre(n, postos); n.x = p.x; n.y = p.y; postos.push(n); }); salvar(); pintar(); }
      else if (a === 'limpar') { if (e.target.dataset.certo) { g.arestas = []; sel = null; salvar(); pintar(); e.target.textContent = 'Apagar ligações'; delete e.target.dataset.certo; } else { e.target.dataset.certo = 1; e.target.textContent = 'Apagar todas? Carrega outra vez'; setTimeout(() => { e.target.textContent = 'Apagar ligações'; delete e.target.dataset.certo; }, 3000); } }
      else if (a === 'png') {
        const antes = sel; sel = null; pintar();
        const c = svg.cloneNode(true); c.setAttribute('xmlns', SVG); c.setAttribute('width', W); c.setAttribute('height', H);
        c.insertBefore(s('rect', { width: W, height: H, fill: '#1E2A33' }), c.firstChild);
        const img = new Image();
        img.onload = () => { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(img, 0, 0); descarregar(cv, 'grafo-' + (o.titulo || 'vocabulario')); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c));
        sel = antes; pintar();
      }
    });
    abrir(ov, () => { if (grafoAberto && grafoAberto.ov === ov) grafoAberto = null; });
    if (o.palavras) { juntar(o.palavras); grafoAberto = { ov: ov, pergunta: o.titulo, juntar: juntar }; }
    pintar();
    requestAnimationFrame(pintar);        // segunda passagem: agora já se pode medir a largura das palavras
  }

  function descarregar(canvas, nome) {
    canvas.toBlob(b => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b);
      a.download = nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) + '.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  }

  /* =====================================================================
     3c. Quadro: desenhar por cima do slide (D) ou num quadro em branco (Q)
     ---------------------------------------------------------------------
     Funciona com rato, dedo ou caneta. Os riscos por cima de um slide ficam
     guardados enquanto a página estiver aberta e voltam a aparecer quando se
     carrega em D nesse slide; o quadro em branco também se mantém.
     ===================================================================== */
  const riscos = {};                      // chave (slide ou «quadro») → lista de riscos
  const CORES = ['#FFFFFF', '#1E2A33', '#E0732B', '#3C8DC9', '#6FA13F', '#D64541', '#F2C230'];
  let fundoQuadro = 'escuro';
  function quadro(sobreSlide) {
    const chave = sobreSlide ? 's:' + location.hash : 'quadro';
    const lista = riscos[chave] = riscos[chave] || [];
    const ov = el('<div class="esmp-ov esmp-quadro"><canvas></canvas><div class="eq-barra">' +
      '<span class="eq-cores">' + CORES.map(c => '<button type="button" class="eq-cor" data-cor="' + c + '" style="--c:' + c + '" aria-label="Cor"></button>').join('') + '</span>' +
      '<span class="eq-esp"><button type="button" data-esp="3" aria-label="Traço fino"><i style="height:3px"></i></button><button type="button" data-esp="6" aria-label="Traço médio"><i style="height:6px"></i></button><button type="button" data-esp="12" aria-label="Traço grosso"><i style="height:12px"></i></button></span>' +
      '<button type="button" data-a="borracha">Borracha</button><button type="button" data-a="desfazer">Desfazer</button><button type="button" data-a="limpar">Limpar</button>' +
      '<button type="button" data-a="fundo">' + (sobreSlide ? 'Quadro em branco' : 'Fundo claro/escuro') + '</button><button type="button" data-a="png">Guardar imagem</button><button type="button" data-a="fechar">Fechar ✕</button></div></div>');
    const cv = ov.querySelector('canvas'), ctx = cv.getContext('2d');
    let cor = sobreSlide ? '#E0732B' : '#FFFFFF', esp = 6, borracha = false, atual = null;
    const fundo = () => { ov.dataset.fundo = sobreSlide ? 'slide' : fundoQuadro; if (!sobreSlide && !borracha && (cor === '#FFFFFF' || cor === '#1E2A33')) cor = fundoQuadro === 'escuro' ? '#FFFFFF' : '#1E2A33'; marcar(); };
    function marcar() {
      ov.querySelectorAll('.eq-cor').forEach(b => b.classList.toggle('on', !borracha && b.dataset.cor === cor));
      ov.querySelectorAll('[data-esp]').forEach(b => b.classList.toggle('on', Number(b.dataset.esp) === esp));
      ov.querySelector('[data-a=borracha]').classList.toggle('on', borracha);
    }
    function risco(r) {
      if (!r.p.length) return;
      ctx.globalCompositeOperation = r.b ? 'destination-out' : 'source-over';
      ctx.strokeStyle = r.c; ctx.fillStyle = r.c; ctx.lineWidth = r.e; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      if (r.p.length === 1) { ctx.arc(r.p[0][0], r.p[0][1], r.e / 2, 0, 7); ctx.fill(); return; }
      ctx.moveTo(r.p[0][0], r.p[0][1]);
      for (let i = 1; i < r.p.length - 1; i++) ctx.quadraticCurveTo(r.p[i][0], r.p[i][1], (r.p[i][0] + r.p[i + 1][0]) / 2, (r.p[i][1] + r.p[i + 1][1]) / 2);   // curva suave pelos pontos médios
      const u = r.p[r.p.length - 1]; ctx.lineTo(u[0], u[1]); ctx.stroke();
    }
    function tudo() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); const d = window.devicePixelRatio || 1; ctx.setTransform(d, 0, 0, d, 0, 0); lista.forEach(risco); }
    function medir() { const d = window.devicePixelRatio || 1; cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d); tudo(); }
    cv.addEventListener('pointerdown', e => {
      if (e.button) return;
      cv.setPointerCapture(e.pointerId);
      atual = { c: cor, e: borracha ? esp * 5 : esp, b: borracha, p: [[e.clientX, e.clientY]] }; lista.push(atual); risco(atual); e.preventDefault();
    });
    cv.addEventListener('pointermove', e => {
      if (!atual) return;
      (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]).forEach(x => { const u = atual.p[atual.p.length - 1]; if (Math.hypot(x.clientX - u[0], x.clientY - u[1]) >= 1.5) atual.p.push([x.clientX, x.clientY]); });
      tudo();
    });
    const fim = () => { atual = null; };
    cv.addEventListener('pointerup', fim); cv.addEventListener('pointercancel', fim);
    ov.querySelector('.eq-barra').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.cor) { cor = b.dataset.cor; borracha = false; }
      else if (b.dataset.esp) esp = Number(b.dataset.esp);
      else if (b.dataset.a === 'borracha') borracha = !borracha;
      else if (b.dataset.a === 'desfazer') { lista.pop(); tudo(); }
      else if (b.dataset.a === 'limpar') { lista.length = 0; tudo(); }
      else if (b.dataset.a === 'fechar') return fechar(ov);
      else if (b.dataset.a === 'fundo') { if (sobreSlide) { fechar(ov); return quadro(false); } fundoQuadro = fundoQuadro === 'escuro' ? 'claro' : 'escuro'; fundo(); }
      else if (b.dataset.a === 'png') {
        const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const x = c2.getContext('2d');
        x.fillStyle = sobreSlide ? '#F6F3EC' : (fundoQuadro === 'escuro' ? '#1E2A33' : '#F6F3EC'); x.fillRect(0, 0, c2.width, c2.height); x.drawImage(cv, 0, 0);
        descarregar(c2, 'quadro-' + new Date().toISOString().slice(0, 16));
      }
      marcar();
    });
    window.addEventListener('resize', medir);
    abrir(ov, () => window.removeEventListener('resize', medir));
    abertas[abertas.length - 1].tecla = e => { if ((e.key === 'z' || e.key === 'Z') || e.key === 'Backspace') { lista.pop(); tudo(); } };
    fundo(); medir();
  }

  /* ---------- barra de ferramentas ---------- */
  const ic = d => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const doca = el('<div class="esmp-doca" role="toolbar" aria-label="Ferramentas do professor">' +
    '<button type="button" data-f="d" title="Desenhar por cima do slide (D)">' + ic('<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>') + '<span>Desenhar</span></button>' +
    '<button type="button" data-f="q" title="Quadro em branco (Q)">' + ic('<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M8 21l4-4 4 4"/>') + '<span>Quadro</span></button>' +
    '<button type="button" data-f="g" title="Grafo de vocabulário (G)">' + ic('<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="8" r="2.5"/><circle cx="11" cy="18" r="2.5"/><path d="M7.3 7l9.3 .7M6.2 8.2l3.7 7.6M17.6 10l-5 6"/>') + '<span>Grafo</span></button>' +
    '<button type="button" data-f="p" title="Pergunta rápida no telemóvel (P)">' + ic('<path d="M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.2-1.5 2.4"/><circle cx="12" cy="18" r=".6" fill="currentColor"/><rect x="5" y="2" width="14" height="20" rx="2.5"/>') + '<span>Pergunta</span></button></div>');
  doca.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    ({ d: () => quadro(true), q: () => quadro(false), g: () => grafo({ id: 'livre', titulo: 'Grafo de vocabulário' }), p: rapida })[b.dataset.f]();
  });
  isolar(doca);
  document.body.appendChild(doca);
})();
