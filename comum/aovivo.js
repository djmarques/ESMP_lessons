/* =====================================================================
   comum/aovivo.js — o lado do PROFESSOR (projetor) dos jogos ao vivo.
   Carregado pelo comum/aula.js em todos os sites das aulas.
   ---------------------------------------------------------------------
   1. Questionário ao vivo: qualquer questionário ou jogo dos slides, uma
      pergunta de cada vez para a turma toda. O professor avança; os
      telemóveis seguem (respostas/vivo.js). Depois de cada pergunta: as
      barras das respostas, a resposta certa e a classificação.
   2. Classificação de uma atividade feita ao ritmo de cada um (com nomes,
      só com a chave do professor).
   3. Jogos de turma (comum/jogos.js): mariposas e fábrica de sapatos.
   Tudo passa pelo Google Apps Script de respostas/config.js (versão 4):
   ver comum/vivo.js para a explicação da ligação e dos seus limites.
   Sons e animações (comum/efeitos.js): música na sala de espera e durante
   cada pergunta (pára quando se revela a resposta, para o professor poder
   explicar), tiques nos últimos 5 segundos, quem foi o mais rápido, quem
   subiu na classificação, tambores e papelinhos no pódio.
   ===================================================================== */
(function () {
  'use strict';
  const E = window.ESMP, X = window.ESMP_CTX;
  if (!E || !X || window.ESMP_VIVO) return;
  const J = E.jogos, esc = E.esc, el = X.el;
  const urlScript = () => (X.cfg().SCRIPT_URL || '').trim();
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const FORMAS = ['▲', '◆', '●', '■'], CORES = ['#A44A16', '#2F6E9E', '#5E7A3A', '#1E2A33'];
  // sons e animações: se o comum/efeitos.js não carregou, o jogo funciona na mesma, em silêncio
  const nada = () => {}, oco = new Proxy({}, { get: () => nada });
  const S = E.som || { fx: oco, musica: oco, botoes: () => document.createElement('span'), acordar: nada };
  const Festa = E.festa || oco;
  const primeiro = n => String(n).split(' + ').map(x => { const p = x.trim().split(/\s+/); return p[0] + (p.length > 1 ? ' ' + p[p.length - 1][0] + '.' : ''); }).join(' + ');

  /* ---------- a sala: janela a toda a largura, com o código QR e quem entrou ---------- */
  async function abrirSala(titulo, sub) {
    S.acordar();                 // dentro do clique que abriu a sala: o navegador só deixa tocar som depois de um clique
    const ov = el('<div class="esmp-ov esmp-vivo"><div class="ev-topo"><div><p class="ev-k">Ao vivo · ' + esc(sub || '') + '</p><h3>' + esc(titulo) + '</h3></div>' +
      '<div class="ev-sala"><span>sala</span><b></b></div><div class="ev-gente"><b>0</b><span>na sala</span></div><span class="ev-som"></span><button type="button" class="ev-x">Fechar ✕</button></div><div class="ev-corpo"><p class="ev-aviso">A abrir a sala…</p></div></div>');
    ov.querySelector('.ev-som').appendChild(S.botoes());
    const corpo = ov.querySelector('.ev-corpo');
    const ctx = { ov: ov, corpo: corpo, lista: {}, fora: [], v: 0, vivo: true, aoFechar: null, aoEntrar: null };
    X.abrir(ov, () => { ctx.vivo = false; S.musica.parar(); if (ctx.aoFechar) ctx.aoFechar(); if (ctx.sala && ctx.S) ctx.sala.fechar(ctx.S, ctx.K); });
    ov.querySelector('.ev-x').addEventListener('click', () => { if (!ctx.aMeio || confirm('Fechar a sala? O jogo acaba para todos.')) X.fechar(ov); });
    ctx.tecla = f => { const a = X.abertas[X.abertas.length - 1]; if (a && a.ov === ov) a.tecla = f; };
    await X.config;
    if (!urlScript()) { corpo.innerHTML = '<p class="ev-aviso">Falta o endereço do Google Apps Script em respostas/config.js.</p>'; return null; }
    if (!X.PUBLICADO) { corpo.innerHTML = '<p class="ev-aviso">Os jogos ao vivo só funcionam com o site publicado (GitHub Pages): os telemóveis precisam de um endereço para abrir.</p>'; return null; }
    ctx.sala = E.sala(urlScript());
    if ((await ctx.sala.versao()) < 4) {
      corpo.innerHTML = '<div class="ev-aviso"><b>É preciso atualizar o script no Google (versão 4).</b><br>Abre o projeto em script.google.com, apaga o código antigo e cola o de <code>respostas/apps-script.gs</code>. Depois: Implementar → Gerir implementações → lápis → Versão: Nova versão → Implementar. O endereço não muda.<br><span>Se já o fizeste, verifica a ligação à internet e volta a abrir.</span></div>';
      return null;
    }
    ctx.K = E.codigo(16);
    for (let t = 0; t < 4 && !ctx.S; t++) {
      const s = E.codigo(4);
      try { const j = await ctx.sala.abrir(s, ctx.K, { fase: 'espera', v: 0 }); if (j && j.ok) ctx.S = s; } catch (e) { /* tenta outro código */ }
    }
    if (!ctx.S) { corpo.innerHTML = '<p class="ev-aviso">Não foi possível abrir a sala. Verifica a ligação à internet.</p>'; return null; }
    ov.querySelector('.ev-sala b').textContent = ctx.S;
    ctx.url = X.RAIZ + 'respostas/?f=' + X.PASTA + '&s=' + ctx.S;
    ctx.presentes = () => Object.keys(ctx.lista).filter(u => ctx.fora.indexOf(u) < 0);
    ctx.publicar = e => { e.v = ++ctx.v; e.fora = ctx.fora; ctx.estado = e; return ctx.sala.publicar(ctx.S, ctx.K, e).catch(() => {}); };
    ctx.recolher = async r => {
      try {
        const j = await ctx.sala.recolher(ctx.S, ctx.K, r || '');
        if (j && j.ok) { ctx.lista = j.lista || {}; ov.querySelector('.ev-gente b').textContent = ctx.presentes().length; if (ctx.aoEntrar) ctx.aoEntrar(); return j.msgs || {}; }
      } catch (e) { /* sem ligação: fica com o que tinha */ }
      return null;
    };
    return ctx;
  }

  /** Sala de espera: código QR à esquerda, quem entrou à direita, e os botões do jogo por baixo. */
  function espera(ctx, htmlControlos, textoEspera) {
    ctx.corpo.innerHTML = '<div class="ev-espera"><div class="ev-qr"><div class="code"></div><p class="ev-url"></p><p>Lê o código com a câmara · escreve o teu nome · «Entrar»</p><p class="ev-pc">No computador ou no tablet: no slide do jogo, «Jogar» e escreve o código da sala, <b>' + esc(ctx.S) + '</b></p></div>' +
      '<div class="ev-lado"><p class="ev-k">Quem já entrou (clica num nome para o tirar da sala)</p><div class="ev-nomes"></div><div class="ev-controlos">' + htmlControlos + '</div></div></div>';
    E.qr(ctx.corpo.querySelector('.code'), ctx.url, 460);
    ctx.corpo.querySelector('.ev-url').textContent = ctx.url.replace(/^https?:\/\//, '');
    const box = ctx.corpo.querySelector('.ev-nomes');
    S.musica.tocar('espera');
    ctx.vistos = ctx.vistos || {};
    const pintar = () => {
      if (!box.isConnected) return;
      const us = ctx.presentes(), marca = us.map(u => u + ':' + ctx.lista[u]).join('|');
      if (marca === box.dataset.marca) return;
      box.dataset.marca = marca;
      if (us.filter(u => !ctx.vistos[u]).length) { S.fx.entrou(); us.forEach(u => { ctx.vistos[u] = 1; }); }
      box.innerHTML = us.length ? us.map(u => '<button type="button" data-u="' + u + '">' + esc(ctx.lista[u] || '?') + '</button>').join('') : '<p class="ev-vazio">' + esc(textoEspera || 'À espera dos telemóveis…') + '</p>';
    };
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (confirm('Tirar «' + b.textContent + '» da sala?')) { ctx.fora.push(b.dataset.u); ctx.publicar(Object.assign({}, ctx.estado || { fase: 'espera' })); pintar(); }
    });
    ctx.aoEntrar = pintar; pintar();
    if (!ctx.rodaEspera) {
      ctx.rodaEspera = true;
      (async function roda() { while (ctx.vivo) { if (!ctx.aMeio) await ctx.recolher(''); await esperar(2000); } })();
    }
    return ctx.corpo.querySelector('.ev-controlos');
  }

  function tabela(linhas, max) {
    return '<ol class="ev-rank">' + linhas.slice(0, max).map((l, k) => '<li class="p' + (k + 1) + '"><span class="ev-pos">' + (k + 1) + '</span><span class="ev-nome">' + esc(l.nome) + (l.mov > 0 ? ' <i class="ev-mov" title="subiu ' + l.mov + (l.mov === 1 ? ' lugar' : ' lugares') + '">▲' + l.mov + '</i>' : '') + (l.seq >= 3 ? ' <i class="ev-seq" title="' + l.seq + ' certas seguidas">🔥' + l.seq + '</i>' : '') + '</span>' + (l.ganho ? '<span class="ev-ganho">+' + l.ganho + '</span>' : '<span></span>') + '<b>' + l.pontos + '</b></li>').join('') + '</ol>';
  }

  /* =====================================================================
     1. Questionário ao vivo
     ===================================================================== */
  async function quiz(def) {
    const qs = E.perguntasVivo(def);
    if (!qs.length) return alert('Esta atividade não tem perguntas de escolha com resposta certa.');
    const ctx = await abrirSala(def.titulo, 'uma pergunta de cada vez');
    if (!ctx) return;
    const pont = {};            // u → { pontos, certas, resp: [{pergunta, resposta, certa}] }
    let i = -1, relogio = null;
    ctx.aoFechar = () => clearInterval(relogio);

    const c = espera(ctx, '<p class="ev-info">' + qs.length + ' perguntas · pontos pela resposta certa e pela rapidez · quem joga em equipa escreve os nomes todos no mesmo telemóvel</p><button type="button" class="ev-ir">Começar →</button>');
    c.querySelector('.ev-ir').addEventListener('click', () => { if (!ctx.presentes().length && !confirm('Ainda ninguém entrou. Começar mesmo assim?')) return; pergunta(0); });
    ctx.tecla(e => { if (e.key === 'Enter') { const b = ctx.corpo.querySelector('.ev-ir'); if (b) { e.preventDefault(); b.click(); } } });
    ctx.publicar({ fase: 'espera' });

    function classificacao() {
      const l = ctx.presentes().map(u => ({ u: u, nome: ctx.lista[u], pontos: (pont[u] || {}).pontos || 0, certas: (pont[u] || {}).certas || 0, ganho: (pont[u] || {}).ganho || 0, seq: (pont[u] || {}).seq || 0 }));
      l.sort((a, b) => b.pontos - a.pontos || b.certas - a.certas || String(a.nome).localeCompare(String(b.nome), 'pt'));
      l.forEach((x, k) => { x.pos = k && l[k - 1].pontos === x.pontos ? l[k - 1].pos : k + 1; });
      return l;
    }
    const placar = l => { const p = {}; l.forEach(x => { p[x.u] = [x.pontos, x.pos, x.ganho, 0]; }); return p; };

    async function pergunta(n) {
      i = n; ctx.aMeio = true; ctx.aoEntrar = null;
      const q = qs[i], dur = (q.s || 25) * 1000, fim = ctx.sala.agora() + dur + 2500;     // 2,5 s para o estado chegar aos telemóveis
      ctx.publicar({ fase: 'pergunta', i: i, n: qs.length, p: q.p, o: q.o, fim: fim, dur: dur });
      ctx.corpo.innerHTML = '<div class="ev-perg"><div class="ev-linha"><span class="ev-num">Pergunta ' + (i + 1) + ' / ' + qs.length + '</span><div class="ev-tempo"><span></span></div><output class="ev-seg"></output></div>' +
        '<h2>' + esc(q.p) + '</h2><div class="ev-ops n' + q.o.length + '">' + q.o.map((t, j) => '<div class="ev-op" style="--c:' + CORES[j % 4] + '"><span class="ev-forma">' + FORMAS[j % 4] + '</span><span class="ev-tx">' + esc(t) + '</span><b class="ev-cont"></b><i class="ev-barra"></i></div>').join('') + '</div>' +
        '<div class="ev-pe"><span class="ev-resp">Responderam <b>0</b> de ' + ctx.presentes().length + '</span><button type="button" class="ev-ir">Revelar a resposta</button></div></div>';
      const barra = ctx.corpo.querySelector('.ev-tempo span'), seg = ctx.corpo.querySelector('.ev-seg'), resp = ctx.corpo.querySelector('.ev-resp b');
      S.musica.tocar('jogo'); if (n === 0) S.fx.inicio();
      let msgs = {}, revelado = false, ultimoSeg = null, jaResponderam = 0;
      const revelarJa = () => { if (!revelado) { revelado = true; clearInterval(relogio); revelar(q, dur, msgs); } };
      ctx.corpo.querySelector('.ev-ir').addEventListener('click', revelarJa);
      clearInterval(relogio);
      relogio = setInterval(() => {
        const resto = fim - ctx.sala.agora();
        const sg = Math.max(0, Math.ceil(resto / 1000));
        seg.textContent = sg; barra.style.width = Math.max(0, Math.min(100, resto / dur * 100)) + '%';
        if (sg !== ultimoSeg && !revelado) {                 // uma vez por segundo: aviso aos 10, tiques e música mais rápida nos últimos 5
          ultimoSeg = sg;
          if (sg === 10 && dur >= 15000) S.fx.aviso();
          if (sg >= 1 && sg <= 5) { S.fx.tique(sg); S.musica.tensao(true); const pq = ctx.corpo.querySelector('.ev-perg'); if (pq) pq.classList.add('pressa'); }
        }
        if (resto < -1800) revelarJa();                     // tempo esgotado, mais uma folga para as últimas respostas chegarem
      }, 200);
      while (ctx.vivo && !revelado && i === n) {
        const m = await ctx.recolher('q' + i);
        if (revelado || i !== n) break;
        if (m) { msgs = m; const k = ctx.presentes().filter(u => m[u]).length; if (k > jaResponderam) { S.fx.entrou(); Festa.saltar(resp); } jaResponderam = k; resp.textContent = k; resp.parentNode.lastChild.textContent = ' de ' + ctx.presentes().length; if (k && k >= ctx.presentes().length) { await esperar(400); revelarJa(); break; } }
        await esperar(1300);
      }
    }

    async function revelar(q, dur, msgs) {
      const ultimas = await ctx.recolher('q' + i);          // respostas que chegaram no último segundo
      if (ultimas) msgs = ultimas;
      const cont = q.o.map(() => 0);
      ctx.presentes().forEach(u => {
        const p = pont[u] = pont[u] || { pontos: 0, certas: 0, resp: [] }, m = msgs[u];
        while (p.resp.length < i) p.resp.push({ pergunta: qs[p.resp.length].p, resposta: '(não estava)', certa: false });
        const j = m && typeof m.r === 'number' ? m.r : null, certa = j === q.c;
        if (j != null && cont[j] != null) cont[j]++;
        p.ganho = certa ? E.pontosVivo(Number(m.ms) || 0, dur) : 0;
        p.pontos += p.ganho; if (certa) p.certas++;
        p.seq = certa ? (p.seq || 0) + 1 : 0;                  // respostas certas seguidas
        p.resp[i] = { pergunta: q.p, resposta: j == null ? '(sem resposta)' : q.o[j], certa: certa };
      });
      const l = classificacao(), pl = placar(l), ultima = i === qs.length - 1;
      l.forEach(x => { const p = pont[x.u]; x.mov = p && p.pos && i > 0 ? p.pos - x.pos : 0; if (p) p.pos = x.pos; });      // quem subiu desde a pergunta anterior
      // o que aconteceu nesta pergunta: quantos acertaram, quem foi o mais rápido, a maior série
      const certos = ctx.presentes().filter(u => pont[u].resp[i].certa), presentes = ctx.presentes().length;
      const pc = presentes ? Math.round(certos.length / presentes * 100) : 0;
      const rapido = certos.map(u => ({ u: u, ms: Number((msgs[u] || {}).ms) || 0 })).sort((a, b) => a.ms - b.ms)[0];
      const serie = l.filter(x => x.seq >= 3).sort((a, b) => b.seq - a.seq)[0];
      const factos = ['<b>' + pc + ' %</b> ' + (certos.length === 1 ? 'acertou' : 'acertaram') + (pc === 100 && presentes > 1 ? ': a turma toda!' : pc === 0 ? ': esta era difícil' : '')];
      if (rapido && presentes > 1) factos.push('⚡ mais rápido: <b>' + esc(primeiro(ctx.lista[rapido.u] || '?')) + '</b> (' + (rapido.ms < 1000 ? 'menos de 1 s' : (rapido.ms / 1000).toLocaleString('pt-PT', { maximumFractionDigits: 1 }) + ' s') + ')');
      if (serie) factos.push('🔥 <b>' + esc(primeiro(serie.nome || '?')) + '</b>: ' + serie.seq + ' seguidas');
      S.musica.parar(); S.fx.revelar();                         // silêncio depois do toque: é a altura de explicar a resposta
      if (pc >= 50) setTimeout(() => { if (ctx.vivo) Festa.confete({ x: 0.5, y: 0.35, n: pc === 100 ? 160 : 80, abertura: 2.6 }); }, 350);
      ctx.presentes().forEach(u => { if (pl[u]) { pl[u][3] = pont[u].resp[i].certa ? 1 : 0; pl[u][4] = pont[u].seq || 0; } });
      ctx.publicar({ fase: 'revelar', i: i, n: qs.length, p: q.p, o: q.o, c: q.c, f: q.f, placar: pl, total: l.length });
      const total = cont.reduce((a, b) => a + b, 0) || 1;
      ctx.corpo.querySelectorAll('.ev-op').forEach((op, j) => {
        op.classList.add(j === q.c ? 'certa' : 'errada'); op.querySelector('.ev-cont').textContent = cont[j];
        requestAnimationFrame(() => { op.querySelector('.ev-barra').style.width = (cont[j] / total * 100) + '%'; });
      });
      ctx.corpo.querySelector('.ev-linha').innerHTML = '<span class="ev-num">Pergunta ' + (i + 1) + ' / ' + qs.length + '</span><span class="ev-fb">' + esc(q.f || '') + '</span>';
      const pq = ctx.corpo.querySelector('.ev-perg'); if (pq) pq.classList.remove('pressa');
      ctx.corpo.querySelector('.ev-pe').insertAdjacentHTML('beforebegin', '<p class="ev-factos">' + factos.map(f => '<span>' + f + '</span>').join('') + '</p>');
      ctx.corpo.querySelector('.ev-pe').innerHTML = '<div class="ev-top5"><p class="ev-k">Classificação</p>' + tabela(l, 5) + '</div><button type="button" class="ev-ir">' + (ultima ? 'Ver o pódio →' : 'Pergunta seguinte →') + '</button>';
      ctx.corpo.querySelector('.ev-ir').addEventListener('click', () => (ultima ? fim() : pergunta(i + 1)));
    }

    async function fim() {
      ctx.aMeio = false;
      const l = classificacao();
      ctx.publicar({ fase: 'fim', placar: placar(l), total: l.length });
      l.forEach(x => { x.ganho = 0; x.mov = 0; x.seq = 0; });
      S.musica.parar(); S.fx.rufar(2.7);
      setTimeout(() => { if (!ctx.vivo) return; S.fx.podio(); Festa.confete({ chuva: true, n: 240 }); const f = ctx.corpo.querySelector('.ev-fim'); if (f) f.classList.add('revelado'); }, 2750);
      ctx.corpo.innerHTML = '<div class="ev-fim suspense"><div class="ev-podio">' + [1, 0, 2].map(k => l[k] ? '<div class="ev-degrau d' + (k + 1) + '"><span>' + esc(l[k].nome) + '</span><b>' + l[k].pontos + '</b><i>' + (k + 1) + '.º</i></div>' : '').join('') + '</div>' +
        '<div class="ev-todos"><p class="ev-k">Classificação final · ' + l.length + (l.length === 1 ? ' jogador' : ' jogadores ou equipas') + '</p>' + tabela(l, 40) + '<p class="ev-guardar">A guardar na folha «Avaliação contínua»…</p></div></div>';
      const g = ctx.corpo.querySelector('.ev-guardar');
      const linhas = l.map(x => { const p = pont[x.u] || { resp: [] }; return { nomes: String(x.nome).split(' + '), pontos: x.pontos, certas: x.certas, total: qs.length, jogo: qs.map((q, k) => p.resp[k] || { pergunta: q.p, resposta: '(não estava)', certa: false }), escrita: [] }; });
      async function guardar() {
        if (!linhas.length) { g.textContent = 'Ninguém jogou: nada para guardar.'; return; }
        try { const j = await ctx.sala.lote(def.disciplina || X.disciplina(), def.titulo, linhas); if (!j || !j.ok) throw 0; g.textContent = 'Guardado na folha «Avaliação contínua», separador «' + def.titulo + '».'; }
        catch (e) { g.innerHTML = 'Não foi possível guardar na folha. <button type="button">Tentar outra vez</button>'; g.querySelector('button').onclick = () => { g.textContent = 'A guardar…'; guardar(); }; }
      }
      guardar();
    }
  }

  /* =====================================================================
     2. Classificação de uma atividade feita ao ritmo de cada um
     ===================================================================== */
  function ranking(def) {
    const ov = el('<div class="esmp-ov esmp-vivo"><div class="ev-topo"><div><p class="ev-k">Classificação · ' + esc(def.disciplina || '') + '</p><h3>' + esc(def.titulo) + '</h3></div><span></span><span></span><span></span><button type="button" class="ev-x">Fechar ✕</button></div><div class="ev-corpo"></div></div>');
    const corpo = ov.querySelector('.ev-corpo'); let vivo = true, timer = null;
    X.abrir(ov, () => { vivo = false; clearInterval(timer); });
    ov.querySelector('.ev-x').addEventListener('click', () => X.fechar(ov));
    const K = 'esmp-chave-prof';
    const lerChave = () => { try { return localStorage.getItem(K) || ''; } catch (e) { return ''; } };
    function pedirChave(msg) {
      corpo.innerHTML = '<form class="ev-chave"><p>' + msg + '</p><input type="password" autocomplete="off" minlength="4" maxlength="60" placeholder="Chave do professor" required><button class="ev-ir">Ver a classificação</button><p class="ev-sm">A classificação mostra nomes, por isso só abre com a tua chave. Fica guardada neste computador; na primeira vez, a chave que escreveres passa a ser a tua.</p></form>';
      const f = corpo.querySelector('form'); f.querySelector('input').focus();
      f.addEventListener('submit', e => { e.preventDefault(); try { localStorage.setItem(K, f.querySelector('input').value.trim()); } catch (x) { /* sem armazenamento */ } carregar(f.querySelector('input').value.trim()); });
    }
    async function carregar(chave) {
      await X.config;
      const sala = E.sala(urlScript());
      async function uma() {
        try {
          const j = await sala.ranking(def.disciplina || X.disciplina(), def.titulo, chave);
          if (!vivo) return false;
          if (j && j.erro === 'chave') { clearInterval(timer); try { localStorage.removeItem(K); } catch (x) { /* nada */ } pedirChave('Essa não é a chave guardada no script. Tenta outra vez.'); return false; }
          if (!j || !j.ok) throw 0;
          const l = j.linhas.map(x => ({ nome: x.nomes.join(' + '), pontos: x.pontos, certas: x.certas }));
          corpo.innerHTML = l.length ? '<div class="ev-fim"><div class="ev-podio">' + [1, 0, 2].map(k => l[k] ? '<div class="ev-degrau d' + (k + 1) + '"><span>' + esc(l[k].nome) + '</span><b>' + l[k].pontos + '</b><i>' + (k + 1) + '.º</i></div>' : '').join('') + '</div><div class="ev-todos"><p class="ev-k">' + j.n + (j.n === 1 ? ' resposta' : ' alunos ou equipas') + ' · atualiza de 6 em 6 segundos</p>' + tabela(l, 60) + '</div></div>'
            : '<p class="ev-aviso">Ainda não há respostas com pontos nesta atividade.</p>';
          return true;
        } catch (e) { if (vivo && !corpo.querySelector('.ev-fim')) corpo.innerHTML = '<p class="ev-aviso">Não foi possível ir buscar a classificação. É preciso o script na versão 4 e ligação à internet.</p>'; return true; }
      }
      corpo.innerHTML = '<p class="ev-aviso">A carregar…</p>';
      if (await uma()) timer = setInterval(uma, 6000);
    }
    const ch = lerChave();
    ch ? carregar(ch) : pedirChave('Escreve a tua chave de professor.');
  }

  /* =====================================================================
     3a. Mariposas com a turma toda
     ===================================================================== */
  async function mariposas() {
    const M = J.mariposas;
    const ctx = await abrirSala('Sê o pássaro: a turma toda', 'jogo de turma');
    if (!ctx) return;
    const soma = { limpo: { c: 0, e: 0, n: 0 }, fuligem: { c: 0, e: 0, n: 0 } };
    let ronda = 0, tronco = 'limpo';
    const controlos = () => '<div class="ev-modos">' + ['limpo', 'fuligem'].map(t => '<button type="button" data-t="' + t + '" class="' + (t === tronco ? 'sel' : '') + '">' + M.NOMES[t] + '</button>').join('') + '</div><button type="button" class="ev-ir">Largar as mariposas · 10 segundos</button>';
    function ligar(c) {
      c.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { tronco = b.dataset.t; c.querySelectorAll('[data-t]').forEach(x => x.classList.toggle('sel', x === b)); }));
      c.querySelector('.ev-ir').addEventListener('click', jogar);
    }
    ligar(espera(ctx, '<p class="ev-info">Cada telemóvel recebe um tronco com 12 mariposas claras e 12 escuras. Todos caçam ao mesmo tempo, durante 10 segundos. Depois, o ecrã repete a caçada da turma inteira.</p>' + controlos()));
    ctx.publicar({ fase: 'espera', titulo: 'Estás dentro!', msg: 'Vais ser um pássaro. Olha para o ecrã da sala.' });

    const barras = () => ['limpo', 'fuligem'].map(t => {
      const s = soma[t], tot = s.n * M.POR_TIPO;
      return '<div class="ev-conta' + (t === tronco ? ' agora' : '') + '"><p>' + M.NOMES[t] + '</p>' + ['c', 'e'].map(k => '<span class="ev-m ' + k + '"></span><i><b style="width:' + (tot ? s[k] / tot * 100 : 0) + '%"></b></i><output>' + s[k] + ' de ' + tot + (tot ? ' · ' + Math.round(s[k] / tot * 100) + ' %' : '') + '</output>').join('') + '</div>';
    }).join('');

    async function jogar() {
      const n = ctx.presentes().length;
      if (!n) return alert('Ainda ninguém entrou na sala.');
      ctx.aMeio = true; ctx.aoEntrar = null; ronda++;
      const inicio = ctx.sala.agora() + 6000, r = 'm' + ronda;
      ctx.publicar({ fase: 'jogo', jogo: 'mariposas', ronda: ronda, tronco: tronco, inicio: inicio, dur: M.DUR });
      ctx.corpo.innerHTML = '<div class="ev-jogo"><div class="ev-palco"><div class="ev-tronco"></div><div class="ev-grande"></div></div><div class="ev-lado2"><p class="ev-estado">Prepara-te…</p><div class="ev-tempo"><span></span></div><div class="ev-barras">' + barras() + '</div><div class="ev-controlos"></div></div></div>';
      const palco = M.palco(ctx.corpo.querySelector('.ev-tronco')), grande = ctx.corpo.querySelector('.ev-grande'), estado = ctx.corpo.querySelector('.ev-estado'), barra = ctx.corpo.querySelector('.ev-tempo span');
      palco.preparar(tronco, n);
      S.musica.parar(); let bip = null;
      while (ctx.vivo) {                                   // contagem e os 10 segundos, pelo relógio do servidor
        const t = ctx.sala.agora() - inicio;
        const cs = t < 0 ? Math.ceil(-t / 1000) : 0;
        if (cs !== bip) { bip = cs; if (cs <= 3) S.fx.contagem(cs); if (cs === 0) { S.musica.tocar('jogo'); S.musica.tensao(true); } }
        if (t < 0) { grande.textContent = Math.ceil(-t / 1000); estado.textContent = n + (n === 1 ? ' pássaro pronto' : ' pássaros prontos') + '…'; }
        else if (t < M.DUR) { grande.textContent = ''; estado.textContent = 'A turma está a caçar!'; barra.style.width = (100 - t / M.DUR * 100) + '%'; }
        else break;
        await esperar(100);
      }
      S.musica.parar(); S.fx.fim(true);
      barra.style.width = '0%'; estado.textContent = 'A juntar as caçadas de todos…';
      let msgs = {};
      for (let k = 0; k < 5 && ctx.vivo; k++) {            // os telemóveis enviam no fim: espera até 7 segundos por todos
        await esperar(1400);
        const m = await ctx.recolher(r);
        if (m) { msgs = m; if (Object.keys(m).length >= ctx.presentes().length) break; }
      }
      if (!ctx.vivo) return;
      const res = ctx.presentes().map(u => msgs[u]).filter(x => x && Array.isArray(x.t));
      if (!res.length) { estado.textContent = 'Não chegou nenhuma caçada. Verifica a ligação e joga outra vez.'; }
      else {
        if (res.length !== n) palco.preparar(tronco, res.length);
        estado.textContent = 'Repetição: ' + res.length + (res.length === 1 ? ' pássaro' : ' pássaros') + ' ao mesmo tempo';
        const total = res.length * M.POR_TIPO;
        const conta = await palco.repetir(res, M.DUR, (c, p) => { barra.style.width = (100 - p * 100) + '%'; grande.textContent = ''; estado.innerHTML = 'Repetição · claras <b>' + c.c + '</b> de ' + total + ' · escuras <b>' + c.e + '</b> de ' + total; });
        soma[tronco].c += conta.c; soma[tronco].e += conta.e; soma[tronco].n += res.length;
        const sobra = 2 * total - conta.c - conta.e;
        estado.innerHTML = sobra === 0 ? 'A turma apanhou <b>todas</b> as mariposas.' : 'Escaparam <b>' + (total - conta.c) + '</b> claras e <b>' + (total - conta.e) + '</b> escuras (nos círculos).';
      }
      ctx.aMeio = false;
      ctx.publicar({ fase: 'espera', titulo: 'Fim da caçada', msg: 'Olha para o ecrã da sala: a caçada da turma inteira.' });
      ctx.corpo.querySelector('.ev-barras').innerHTML = barras();
      const c = ctx.corpo.querySelector('.ev-controlos'); c.innerHTML = controlos(); ligar(c);
    }
  }

  /* =====================================================================
     3b. A fábrica de sapatos
     ===================================================================== */
  async function fabrica() {
    const F = J.fabrica;
    const ctx = await abrirSala('A fábrica de sapatos', 'jogo de turma');
    if (!ctx) return;
    const historia = []; let ronda = 0, modo = 'artesaos';
    const MODOS = { artesaos: 'Todos artesãos', linha: 'Todos na linha de montagem', metade: 'Metade artesãos, metade linha' };
    const controlos = () => '<div class="ev-modos">' + Object.keys(MODOS).map(m => '<button type="button" data-m="' + m + '" class="' + (m === modo ? 'sel' : '') + '">' + MODOS[m] + '</button>').join('') + '</div><button type="button" class="ev-ir">Começar o turno · ' + F.DUR / 1000 + ' segundos</button>';
    function ligar(c) {
      c.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { modo = b.dataset.m; c.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('sel', x === b)); }));
      c.querySelector('.ev-ir').addEventListener('click', turno);
    }
    ligar(espera(ctx, '<p class="ev-info"><b>Artesão</b>: faz o sapato inteiro, quatro tarefas seguidas. <b>Linha de montagem</b>: cada um repete uma só tarefa; a linha só produz tantos sapatos quantas as peças do posto mais lento. Joguem um turno de cada maneira e comparem.</p>' + controlos()));
    ctx.publicar({ fase: 'espera', titulo: 'Estás dentro!', msg: 'Vais trabalhar numa fábrica de sapatos. Olha para o ecrã da sala.' });

    const tabelaTurnos = () => historia.length ? '<table class="ev-turnos"><thead><tr><th>Turno</th><th>Como</th><th>Pessoas</th><th>Sapatos</th><th>Por pessoa</th></tr></thead><tbody>' + historia.map((h, k) => '<tr><td>' + (k + 1) + '</td><td>' + h.como + '</td><td>' + h.n + '</td><td><b>' + h.sapatos + '</b></td><td>' + (h.n ? (h.sapatos / h.n).toLocaleString('pt-PT', { maximumFractionDigits: 1 }) : '–') + '</td></tr>').join('') + '</tbody></table>' : '';

    async function turno() {
      const ids = ctx.presentes();
      if (!ids.length) return alert('Ainda ninguém entrou na sala.');
      ctx.aMeio = true; ctx.aoEntrar = null; ronda++;
      const papeis = F.repartir(ids, modo), inicio = ctx.sala.agora() + 6000, r = 'f' + ronda;
      ctx.publicar({ fase: 'jogo', jogo: 'fabrica', ronda: ronda, inicio: inicio, dur: F.DUR, papeis: papeis });
      const nA = ids.filter(u => papeis[u] === 'A').length, nL = ids.length - nA;
      ctx.corpo.innerHTML = '<div class="ev-fab"><div class="ev-linha"><span class="ev-num">Turno ' + ronda + ' · ' + MODOS[modo] + '</span><div class="ev-tempo"><span></span></div><output class="ev-seg"></output></div><div class="ev-fab2">' +
        (nA ? '<div class="ev-oficina"><p class="ev-k">Oficina · ' + nA + (nA === 1 ? ' artesão' : ' artesãos') + '</p><b class="ev-n" data-o="A">0</b><span>sapatos prontos</span><div class="ev-sapatos" data-o="sA"></div></div>' : '') +
        (nL ? '<div class="ev-linha-m"><p class="ev-k">Linha de montagem · ' + nL + (nL === 1 ? ' pessoa' : ' pessoas') + '</p><div class="ev-postos">' + F.TAREFAS.map((t, k) => '<div class="ev-posto" data-p="' + k + '"><span>' + (k + 1) + '. ' + t.nome + '</span><i><b></b></i><output>0</output></div>').join('') + '</div><b class="ev-n" data-o="L">0</b><span>sapatos prontos (o posto mais lento manda)</span></div>' : '') +
        '</div><div class="ev-pe"><div class="ev-hist">' + tabelaTurnos() + '</div><div class="ev-controlos"></div></div></div>';
      const barra = ctx.corpo.querySelector('.ev-tempo span'), seg = ctx.corpo.querySelector('.ev-seg');
      let contas = F.contas(papeis, {});
      const pintar = () => {
        const a = ctx.corpo.querySelector('[data-o="A"]'), l = ctx.corpo.querySelector('[data-o="L"]');
        if (a) { a.textContent = contas.artesaos; ctx.corpo.querySelector('[data-o="sA"]').textContent = '👞'.repeat(Math.min(60, contas.artesaos)); }
        if (l) {
          l.textContent = contas.linha; const max = Math.max(1, ...contas.postos);
          ctx.corpo.querySelectorAll('.ev-posto').forEach((p, k) => { p.querySelector('b').style.width = (contas.postos[k] / max * 100) + '%'; p.querySelector('output').textContent = contas.postos[k]; p.classList.toggle('gargalo', k === contas.gargalo && max > 1); });
        }
      };
      let proxima = 0, bip = null, tic = null;
      S.musica.parar();
      while (ctx.vivo) {
        const t = ctx.sala.agora() - inicio;
        const cs = t < 0 ? Math.ceil(-t / 1000) : 0, falta = Math.ceil((F.DUR - t) / 1000);
        if (cs !== bip) { bip = cs; if (cs <= 3) S.fx.contagem(cs); if (cs === 0) S.musica.tocar('jogo'); }
        if (t >= 0 && falta <= 5 && falta >= 1 && falta !== tic) { tic = falta; S.fx.tique(falta); S.musica.tensao(true); }
        if (t < 0) seg.textContent = 'começa em ' + Math.ceil(-t / 1000);
        else if (t < F.DUR) { seg.textContent = Math.ceil((F.DUR - t) / 1000) + ' s'; barra.style.width = (100 - t / F.DUR * 100) + '%'; }
        else break;
        if (t > 3000 && Date.now() > proxima) { proxima = Date.now() + 2500; ctx.recolher(r).then(m => { if (m) { contas = F.contas(papeis, m); pintar(); } }); }
        await esperar(150);
      }
      S.musica.parar(); S.fx.fim(true);
      barra.style.width = '0%'; seg.textContent = 'a contar…';
      for (let k = 0; k < 3 && ctx.vivo; k++) { await esperar(1500); const m = await ctx.recolher(r); if (m) { contas = F.contas(papeis, m); pintar(); } }
      if (!ctx.vivo) return;
      seg.textContent = 'fim do turno';
      if (nA) historia.push({ como: 'Artesãos', n: nA, sapatos: contas.artesaos });
      if (nL) historia.push({ como: 'Linha de montagem', n: nL, sapatos: contas.linha });
      ctx.aMeio = false;
      ctx.publicar({ fase: 'espera', titulo: 'Fim do turno', msg: 'Olha para o ecrã da sala: quantos sapatos fez a fábrica?' });
      ctx.corpo.querySelector('.ev-hist').innerHTML = tabelaTurnos();
      const c = ctx.corpo.querySelector('.ev-controlos'); c.innerHTML = controlos(); ligar(c);
    }
  }

  /* ---------- menu «Ao vivo» (tecla J) e botões nos slides ---------- */
  function defDoSlide() {
    const slide = document.querySelector('.slide.current'); if (!slide) return null;
    const comps = E.componentes(document), n = comps.findIndex(c => slide.contains(c));
    if (n < 0) return null;
    const def = E.extrair(document, n); if (def) def.disciplina = X.disciplina();
    return def;
  }
  function menu() {
    const def = defDoSlide();
    const ov = el('<div class="esmp-ov esmp-rapida"><div class="es-caixa ev-menu"><header><div><p class="es-k">Ao vivo · a turma toda ao mesmo tempo</p><h3>O que queres jogar?</h3></div><button type="button" class="es-x">Fechar ✕</button></header>' +
      '<button type="button" data-j="quiz"' + (def ? '' : ' disabled') + '><b>Questionário deste slide</b><span>' + (def ? esc(def.titulo) + ': uma pergunta de cada vez, com classificação' : 'este slide não tem questionário nem jogo') + '</span></button>' +
      '<button type="button" data-j="mariposas"><b>Sê o pássaro</b><span>a turma caça mariposas claras e escuras durante 10 segundos (seleção natural)</span></button>' +
      '<button type="button" data-j="fabrica"><b>A fábrica de sapatos</b><span>artesãos contra linha de montagem (divisão do trabalho, produtividade)</span></button></div></div>');
    X.abrir(ov);
    ov.querySelector('.es-x').addEventListener('click', () => X.fechar(ov));
    ov.addEventListener('click', e => {
      if (e.target === ov) return X.fechar(ov);
      const b = e.target.closest('[data-j]'); if (!b || b.disabled) return;
      X.fechar(ov); ({ quiz: () => quiz(def), mariposas: mariposas, fabrica: fabrica })[b.dataset.j]();
    });
  }
  document.querySelectorAll('[data-esmp-jogo]').forEach(b => {
    X.isolar(b);
    b.addEventListener('click', () => ({ mariposas: mariposas, fabrica: fabrica })[b.dataset.esmpJogo]());
  });

  window.ESMP_VIVO = { quiz: quiz, ranking: ranking, mariposas: mariposas, fabrica: fabrica, menu: menu };
})();
