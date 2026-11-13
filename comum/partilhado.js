/* =====================================================================
   comum/partilhado.js — código comum ao telemóvel (respostas/) e aos sites
   das aulas (comum/aula.js). Define window.ESMP com:
     ESMP.extrair(doc, n)   lê o n-ésimo questionário (.quiz) ou jogo (.game)
                            de uma página de aula e devolve uma atividade
                            para o telemóvel. É assim que TODOS os testes de
                            TODAS as aulas ficam disponíveis no telemóvel sem
                            ser preciso escrevê-los em atividades.js.
     ESMP.painel(el, def, opcoes)   vai buscar ao Google Apps Script as
                            respostas da turma (sem nomes) e desenha um
                            gráfico de barras por pergunta, um histograma por
                            escala e uma nuvem por pergunta de palavras.
     ESMP.qr(el, texto, tamanho)    código QR (qrcodejs ou qrcode-generator).
     ESMP.codificar / ESMP.descodificar   perguntas rápidas no endereço (?x=).
   ===================================================================== */
(function () {
  'use strict';
  const E = window.ESMP = window.ESMP || {};
  const txt = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  E.esc = esc;

  /* ---------- 1. Ler os questionários e jogos de uma página de aula ---------- */
  E.componentes = doc => Array.from(doc.querySelectorAll('.quiz, .game'));

  function tituloDe(c) {
    const s = c.closest('.slide');
    return (s && (txt(s.querySelector('h2, h1')) || s.dataset.title || s.dataset.nav)) || 'Questionário';
  }
  /** Títulos de todos os componentes; os repetidos ficam «Título (2)», «Título (3)»…
      para que cada um tenha o seu separador na folha de cálculo. */
  E.titulos = function (doc) {
    const visto = {};
    return E.componentes(doc).map(c => {
      const t = tituloDe(c); visto[t] = (visto[t] || 0) + 1;
      return visto[t] > 1 ? t + ' (' + visto[t] + ')' : t;
    });
  };
  E.extrair = function (doc, n) {
    const c = E.componentes(doc)[n];
    if (!c) return null;
    const jogo = c.classList.contains('game');
    const perguntas = Array.from(c.querySelectorAll(jogo ? '.gq' : '.q')).map(q => {
      const btns = Array.from(q.querySelectorAll('.gopts button, .opts button'));
      const resp = q.dataset.answer;
      let o, certa;
      if (btns.length) {
        o = btns.map(b => txt(b.querySelector('.tx') || b));
        certa = btns.findIndex(b => b.hasAttribute('data-ok') || (resp != null && b.dataset.opt === resp));
      } else if (resp === 'V' || resp === 'F') {      // verdadeiro/falso sem botões escritos (AI 12.º)
        o = ['Verdadeiro', 'Falso']; certa = resp === 'V' ? 0 : 1;
      } else return null;
      const p = txt(q.querySelector('.stem') || q.querySelector('p:not(.why):not(.gfb)'));
      return { p: p, o: o, c: certa, f: txt(q.querySelector('.gfb, .why')) };
    }).filter(q => q && q.p && q.c >= 0);
    if (!perguntas.length) return null;
    return { titulo: E.titulos(doc)[n], passos: [{ tipo: 'jogo', perguntas: perguntas, segundos: jogo ? Number(c.dataset.seconds || 20) : 0 }] };
  };

  /** Passos como o telemóvel os percorre (aceita o formato antigo do CP 4 e
      transforma «vf» num jogo de Verdadeiro/Falso sem tempo). */
  E.passos = function (act) {
    let ps = act.passos || [{ tipo: 'jogo', perguntas: act.jogo || [] }, { tipo: 'escrita', perguntas: act.escrita || [] }];
    ps = ps.map(p => p.tipo !== 'vf' ? p : {
      tipo: 'jogo', titulo: p.titulo, intro: p.intro, segundos: p.segundos || 0,
      perguntas: (p.afirmacoes || []).map(a => ({ p: a.t, o: ['Verdadeiro', 'Falso'], c: a.c ? 0 : 1, f: a.f }))
    });
    return ps.filter(p => p.tipo === 'escala' || p.tipo === 'nuvem' || (p.perguntas || p.itens || p.o || []).length);
  };
  E.itensEscala = p => (p.itens || [p]).map(it => ({
    p: it.p, min: Number(it.min != null ? it.min : (p.min != null ? p.min : 1)), max: Number(it.max != null ? it.max : (p.max != null ? p.max : 10)),
    passo: Number(it.passo || p.passo || 1), etiquetas: it.etiquetas || p.etiquetas || null, unidade: it.unidade || p.unidade || '',
    c: typeof it.c === 'number' ? it.c : undefined, tolerancia: Number(it.tolerancia || 0), f: it.f || ''
  }));

  /* ---------- 2. Perguntas rápidas no endereço ---------- */
  E.codificar = function (obj) {
    const b = new TextEncoder().encode(JSON.stringify(obj)); let s = '';
    b.forEach(x => { s += String.fromCharCode(x); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  E.descodificar = function (s) {
    try {
      const bin = atob(String(s).replace(/-/g, '+').replace(/_/g, '/'));
      const o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
      return (o && typeof o.titulo === 'string' && Array.isArray(o.passos)) ? o : null;
    } catch (e) { return null; }
  };

  /* ---------- 3. Código QR ---------- */
  E.qr = function (el, texto, tamanho) {
    el.innerHTML = '';
    if (typeof window.QRCode === 'function') {
      // o qrcodejs 1.0.0 falha com alguns comprimentos de texto: nesse caso acrescenta-se um carácter e repete-se
      for (let k = 0; k < 6; k++) {
        try {
          el.innerHTML = '';
          new window.QRCode(el, { text: texto + (k ? '&_=' + '0'.repeat(k) : ''), width: tamanho, height: tamanho, colorDark: '#1E2A33', colorLight: '#FFFFFF', correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 0 });
          return true;
        } catch (e) { /* tenta com mais um carácter */ }
      }
    } else if (typeof window.qrcode === 'function') {
      try { const q = window.qrcode(0, 'M'); q.addData(texto); q.make(); el.innerHTML = q.createSvgTag({ scalable: true, margin: 0 }); return true; } catch (e) { /* sem QR */ }
    }
    el.innerHTML = ''; return false;
  };

  /* ---------- 4. Respostas da turma ---------- */
  const CORES = ['#A44A16', '#2F6E9E', '#5E7A3A', '#1E2A33', '#8A5A9E', '#B8860B'];
  const cortar = s => String(s == null ? '' : s).slice(0, 100);   // o cabeçalho da folha guarda 100 caracteres
  E.palavra = s => String(s).toLowerCase().replace(/^[\s.,;:!?«»"'()]+|[\s.,;:!?«»"'()]+$/g, '').replace(/\s+/g, ' ');

  function estilo() {
    if (document.getElementById('esmp-res-css')) return;
    const st = document.createElement('style'); st.id = 'esmp-res-css';
    st.textContent =
      '.esmp-res{font-family:Carlito,Calibri,Arial,sans-serif;color:#1E2A33;text-align:left}' +
      '.esmp-res .er-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 10px}' +
      '.esmp-res .er-n{font-family:Caladea,Cambria,Georgia,serif;font-size:1.25em}' +
      '.esmp-res .er-estado{font-size:.8em;color:#5B6670;flex:1}' +
      '.esmp-res button.er-at{font:inherit;font-size:.8em;font-weight:700;border:2px solid #C9D1D8;background:#fff;color:#1E2A33;border-radius:99px;padding:5px 14px;cursor:pointer;width:auto;margin:0}' +
      '.esmp-res .er-bloco{background:#fff;border:1px solid #E2DED7;border-radius:12px;padding:12px 14px;margin:0 0 12px}' +
      '.esmp-res .er-p{font-family:Caladea,Cambria,Georgia,serif;font-weight:700;font-size:1.05em;margin:0 0 10px;line-height:1.25}' +
      '.esmp-res .er-linha{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;margin:0 0 9px;font-size:.9em}' +
      '.esmp-res .er-linha .er-bar{grid-column:1/-1;height:16px;background:#EEF1F4;border-radius:6px;overflow:hidden}' +
      '.esmp-res .er-linha .er-bar i{display:block;height:100%;width:0;background:#2F6E9E;border-radius:6px;transition:width .6s cubic-bezier(.2,.7,.2,1)}' +
      '.esmp-res .er-linha.certa .er-bar i{background:#2E6B4F}.esmp-res .er-linha.certa .er-op{font-weight:700;color:#2E6B4F}' +
      '.esmp-res .er-linha.certa .er-op::after{content:" ✓"}' +
      '.esmp-res .er-linha.minha .er-op::before{content:"● ";color:#A44A16}' +
      '.esmp-res .er-num{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}' +
      '.esmp-res .er-leg{font-size:.78em;color:#5B6670;margin:6px 0 0}' +
      '.esmp-res .er-hist{display:flex;align-items:flex-end;gap:3px;height:150px;margin:6px 0 2px}' +
      '.esmp-res .er-hist .er-col{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;min-width:0}' +
      '.esmp-res .er-hist .er-col i{display:block;width:100%;background:#2F6E9E;border-radius:5px 5px 0 0;min-height:0;transition:height .6s cubic-bezier(.2,.7,.2,1)}' +
      '.esmp-res .er-hist .er-col.certa i{background:#2E6B4F}.esmp-res .er-hist .er-col.minha i{background:#A44A16}' +
      '.esmp-res .er-hist .er-col b{font-size:.72em;line-height:1.3}' +
      '.esmp-res .er-eixo{display:flex;gap:3px;font-size:.72em;color:#5B6670}.esmp-res .er-eixo span{flex:1;text-align:center;min-width:0;overflow:hidden}' +
      '.esmp-res .er-pontas{display:flex;justify-content:space-between;font-size:.78em;color:#5B6670;margin-top:2px}' +
      '.esmp-res .er-nuvem{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.15em .6em;padding:8px 0;line-height:1.15}' +
      '.esmp-res .er-nuvem span{font-family:Caladea,Cambria,Georgia,serif;font-weight:700;transition:font-size .5s}' +
      '.esmp-res .er-vazio{color:#5B6670;font-size:.9em;margin:0}' +
      '.esmp-res button.er-grafo{font:inherit;font-size:.85em;font-weight:700;border:0;background:#1E2A33;color:#fff;border-radius:99px;padding:7px 16px;cursor:pointer;margin-top:8px;width:auto}';
    document.head.appendChild(st);
  }

  /** Ordena as palavras para que as mais repetidas fiquem ao centro da nuvem. */
  E.ordemNuvem = function (cont) {
    const l = Object.keys(cont).map(k => [k, cont[k]]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt'));
    const out = [];
    l.forEach((x, i) => (i % 2 ? out.unshift(x) : out.push(x)));
    return out;
  };

  /**
   * Painel de respostas da turma.
   *   def      { disciplina, titulo, passos }
   *   o.url    endereço do Apps Script
   *   o.meu    (telemóvel) o registo do próprio aluno, para marcar «a tua resposta»
   *   o.revelar  mostrar qual é a opção certa (no telemóvel sim; no projetor o professor escolhe)
   *   o.auto   milissegundos entre atualizações automáticas (0 = só no botão)
   *   o.grafo  função(pergunta, contagens) chamada pelo botão «Abrir como grafo»
   * Devolve { atualizar, parar, revelar(bool), dados() }.
   */
  E.painel = function (host, def, o) {
    estilo();
    o = o || {};
    let revelar = !!o.revelar, ultimo = null, timer = null, vivo = true;
    host.classList.add('esmp-res');
    host.innerHTML = '<div class="er-top"><b class="er-n">A carregar…</b><span class="er-estado"></span><button type="button" class="er-at">Atualizar</button></div><div class="er-corpo"></div>';
    const corpo = host.querySelector('.er-corpo'), nEl = host.querySelector('.er-n'), est = host.querySelector('.er-estado');
    host.querySelector('.er-at').addEventListener('click', atualizar);
    const passos = E.passos(def);
    const meu = o.meu || null;
    const minha = perg => {
      if (!meu) return null;
      const x = (meu.jogo || []).concat(meu.escrita || []).find(r => r.pergunta === perg);
      return x ? String(x.resposta).split(' — ')[0] : null;
    };

    function barras(perg, mostrar, opcoes, cont, certa, m) {
      const total = Object.keys(cont).reduce((s, k) => s + cont[k], 0) || 0;
      const extra = Object.keys(cont).filter(k => opcoes.indexOf(k) < 0);     // «(sem resposta)» e afins
      let h = '<div class="er-bloco"><p class="er-p">' + esc(mostrar) + '</p>';
      opcoes.concat(extra).forEach((op, k) => {
        const n = cont[op] || 0, pc = total ? Math.round(100 * n / total) : 0;
        h += '<div class="er-linha' + (revelar && k === certa ? ' certa' : '') + (m != null && m === op ? ' minha' : '') + '"><span class="er-op">' + esc(op) + '</span><span class="er-num">' + n + ' · ' + pc + '%</span><span class="er-bar"><i data-w="' + pc + '"></i></span></div>';
      });
      if (m != null) h += '<p class="er-leg">● a tua resposta</p>';
      return h + '</div>';
    }
    function histograma(it, perg, cont, m) {
      // no máximo 21 colunas: escalas maiores são agrupadas em 10 intervalos
      const nPontos = Math.round((it.max - it.min) / it.passo) + 1;
      const cols = [];
      if (nPontos <= 21) for (let k = 0; k < nPontos; k++) { const v = +(it.min + k * it.passo).toFixed(6); cols.push({ de: v, ate: v, rot: String(v), n: 0 }); }
      else { const w = (it.max - it.min) / 10; for (let k = 0; k < 10; k++) cols.push({ de: it.min + k * w, ate: it.min + (k + 1) * w, rot: Math.round(it.min + k * w) + '–' + Math.round(it.min + (k + 1) * w), n: 0 }); }
      let soma = 0, total = 0;
      Object.keys(cont).forEach(k => {
        const v = Number(String(k).replace(',', '.')); if (!isFinite(v)) return;
        soma += v * cont[k]; total += cont[k];
        const c = nPontos <= 21 ? cols.find(x => Math.abs(x.de - v) < it.passo / 2) : cols.find((x, i) => v >= x.de && (v < x.ate || i === 9));
        if (c) c.n += cont[k];
      });
      const max = Math.max(1, ...cols.map(c => c.n));
      const dentro = (c, v) => v != null && isFinite(v) && (nPontos <= 21 ? Math.abs(c.de - v) < it.passo / 2 : (v >= c.de && v <= c.ate));
      const mv = m != null ? Number(m) : null;
      let h = '<div class="er-bloco"><p class="er-p">' + esc(it.p) + '</p><div class="er-hist">';
      cols.forEach(c => { h += '<div class="er-col' + (revelar && it.c != null && dentro(c, it.c) ? ' certa' : '') + (dentro(c, mv) ? ' minha' : '') + '"><b>' + (c.n || '') + '</b><i data-h="' + Math.round(100 * c.n / max) + '"></i></div>'; });
      h += '</div><div class="er-eixo">' + cols.map((c, i) => '<span>' + (cols.length > 12 && i % 2 ? '' : c.rot) + '</span>').join('') + '</div>';
      if (it.etiquetas) h += '<div class="er-pontas"><span>' + esc(it.etiquetas[0]) + '</span><span>' + esc(it.etiquetas[1]) + '</span></div>';
      h += '<p class="er-leg">' + (total ? 'Média da turma: <b>' + (soma / total).toLocaleString('pt-PT', { maximumFractionDigits: 1 }) + '</b>' + (it.unidade ? ' ' + esc(it.unidade) : '') : 'Ainda sem respostas') +
        (revelar && it.c != null ? ' · valor certo: <b>' + it.c + '</b> (verde)' : '') + (mv != null ? ' · a tua resposta a laranja' : '') + '</p></div>';
      return h;
    }
    function nuvem(perg, cont, idx) {
      const l = E.ordemNuvem(cont), max = Math.max(1, ...l.map(x => x[1]));
      let h = '<div class="er-bloco"><p class="er-p">' + esc(perg) + '</p>';
      if (!l.length) h += '<p class="er-vazio">Ainda sem palavras.</p>';
      else {
        h += '<div class="er-nuvem">' + l.map((x, i) => '<span title="' + x[1] + '×" style="font-size:' + (1 + 1.9 * (max > 1 ? (x[1] - 1) / (max - 1) : 0.35)).toFixed(2) + 'em;color:' + CORES[i % CORES.length] + '">' + esc(x[0]) + '</span>').join('') + '</div>';
      }
      if (o.grafo) h += '<button type="button" class="er-grafo" data-nuvem="' + idx + '">Abrir como grafo de vocabulário</button>';
      return h + '</div>';
    }

    const nuvens = [];
    function desenhar(j) {
      ultimo = j; nuvens.length = 0;
      const cols = j.colunas || [], usadas = {};
      const coluna = perg => { const k = cols.findIndex((c, i) => !usadas[i] && c.pergunta === cortar(perg)); if (k < 0) return {}; usadas[k] = 1; return cols[k].contagens || {}; };
      nEl.textContent = j.n === 1 ? '1 resposta' : (j.n || 0) + ' respostas';
      let h = '';
      passos.forEach(p => {
        if (p.tipo === 'jogo') p.perguntas.forEach(q => { h += barras(q.p, q.p, q.o, coluna(q.p), q.c, minha(q.p)); });
        else if (p.tipo === 'classificar') p.itens.forEach(it => { const perg = (p.titulo ? p.titulo + ': ' : '') + it.t; h += barras(perg, it.t, p.categorias, coluna(perg), typeof it.c === 'number' ? it.c : -1, minha(perg)); });
        else if (p.tipo === 'opiniao') h += barras(p.p, p.p, p.o, coluna(p.p), -1, minha(p.p));
        else if (p.tipo === 'escala') E.itensEscala(p).forEach(it => { h += histograma(it, it.p, coluna(it.p), minha(it.p)); });
        else if (p.tipo === 'nuvem') { const c = coluna(p.p); nuvens.push({ p: p.p, c: c }); h += nuvem(p.p, c, nuvens.length - 1); }
      });
      if (!h) h = '<p class="er-vazio">Esta atividade só tem respostas escritas: essas só o professor vê, na folha «Avaliação contínua».</p>';
      corpo.innerHTML = h;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        corpo.querySelectorAll('[data-w]').forEach(i => { i.style.width = i.dataset.w + '%'; });
        corpo.querySelectorAll('[data-h]').forEach(i => { i.style.height = i.dataset.h + '%'; });
      }));
    }
    corpo.addEventListener('click', e => {
      const b = e.target.closest('.er-grafo'); if (!b || !o.grafo) return;
      const nv = nuvens[Number(b.dataset.nuvem)]; if (nv) o.grafo(nv.p, nv.c);
    });

    let pedido = 0;
    async function atualizar() {
      if (!o.url) { nEl.textContent = 'Respostas da turma'; est.textContent = 'O envio ainda não está configurado (respostas/config.js).'; return; }
      const meuPedido = ++pedido;
      est.textContent = 'a atualizar…';
      try {
        const r = await fetch(o.url + (o.url.indexOf('?') < 0 ? '?' : '&') + 'acao=resultados&d=' + encodeURIComponent(def.disciplina || '') + '&a=' + encodeURIComponent(def.titulo) + '&t=' + Date.now(), { redirect: 'follow' });
        const j = await r.json();
        if (!j || !j.ok) throw new Error('sem dados');
        if (!vivo || meuPedido !== pedido) return;
        desenhar(j);
        est.textContent = 'atualizado às ' + new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (o.aoAtualizar) o.aoAtualizar(nuvens);
      } catch (e) {
        if (!vivo) return;
        if (!ultimo) { nEl.textContent = 'Respostas da turma'; corpo.innerHTML = '<p class="er-vazio">Não foi possível ir buscar as respostas da turma. Verifica a ligação à internet e carrega em «Atualizar».</p>'; }
        est.textContent = 'sem ligação';
      }
    }
    atualizar();
    if (o.auto) timer = setInterval(() => { if (document.visibilityState !== 'hidden') atualizar(); }, o.auto);
    return {
      atualizar: atualizar,
      parar: () => { vivo = false; clearInterval(timer); },
      revelar: v => { revelar = !!v; if (ultimo) desenhar(ultimo); },
      nuvens: () => nuvens
    };
  };
})();
