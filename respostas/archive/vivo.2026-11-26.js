/* =====================================================================
   respostas/vivo.js — o telemóvel num jogo AO VIVO (todos ao mesmo tempo).
   ---------------------------------------------------------------------
   Endereço: respostas/?f=<pasta do site da aula>&s=<código da sala>
   O professor abre a sala no projetor (comum/aovivo.js) e é ele que manda:
   este ficheiro lê o estado da sala de 2 em 2 segundos e desenha o que ele
   diz (ver comum/vivo.js). Fases do estado:
     espera     «olha para o ecrã da sala»
     pergunta   uma pergunta de escolha, com tempo; a resposta é enviada logo
     revelar    a resposta certa, os pontos ganhos e o lugar na turma
     fim        o lugar final
     jogo       um jogo de turma (comum/jogos.js): mariposas ou fábrica
   O telemóvel nunca recebe os nomes dos colegas: só o seu lugar e os seus pontos.
   ===================================================================== */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const S = (params.get('s') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (!S) return;
  const $ = id => document.getElementById(id);
  const E = window.ESMP, J = E.jogos;
  const pasta = params.get('f') || '';
  const url = (window.CONFIG && window.CONFIG.SCRIPT_URL || '').trim();
  const sala = E.sala(url);
  const ecra = $('ecra-passo');
  const esc = E.esc;
  const show = id => document.querySelectorAll('.ecra').forEach(x => { x.hidden = x.id !== id; });
  const guardar = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } };
  const ler = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };

  document.title = 'Jogo ao vivo';
  $('titulo').textContent = 'Jogo ao vivo';
  $('disciplina').textContent = ((window.CONFIG && window.CONFIG.DISCIPLINAS) || {})[pasta] || 'Sala ' + S;
  $('passos').hidden = true;
  $('comecar').textContent = 'Entrar na sala ' + S;
  ecra.classList.add('vivo');
  try { $('nome').value = localStorage.getItem('esmp-nome') || ''; } catch (e) { /* sem armazenamento */ }

  // este telemóvel, nesta sala (fica igual se a página for recarregada)
  let U = ler('esmp-u-' + S);
  if (!U) { U = E.codigo(10); guardar('esmp-u-' + S, U); }
  let nomes = ler('esmp-n-' + S) || '';

  $('mais-nome').addEventListener('click', () => {
    const box = $('colegas');
    if (box.children.length >= 3) return;
    const d = document.createElement('div'); d.className = 'colega';
    d.innerHTML = '<input class="nome-extra" autocomplete="off" maxlength="80" placeholder="Nome e apelido do colega"><button type="button" aria-label="Tirar este colega">×</button>';
    d.querySelector('button').onclick = () => { d.remove(); $('mais-nome').hidden = false; };
    box.appendChild(d); d.querySelector('input').focus();
    if (box.children.length >= 3) $('mais-nome').hidden = true;
  });
  $('mais-nome').textContent = '+ Jogar em equipa (acrescentar um colega)';

  $('comecar').addEventListener('click', () => {
    const nome = $('nome').value.trim();
    if (nome.length < 2) { $('nome').focus(); $('nome').placeholder = 'Escreve o teu nome primeiro'; return; }
    const extra = Array.from(document.querySelectorAll('.nome-extra')).map(i => i.value.trim()).filter(n => n.length >= 2);
    nomes = [nome].concat(extra).join(' + ');
    try { localStorage.setItem('esmp-nome', nome); } catch (e) { /* sem armazenamento */ }
    J.som(523, 0.14, 0.08);                    // desbloqueia o som no iPhone (tem de ser num toque)
    entrar();
  });

  function aviso(titulo, texto) {
    show('ecra-passo');
    ecra.innerHTML = '<div class="vv-centro"><div class="vv-bola"></div><h2>' + esc(titulo) + '</h2><p>' + esc(texto || '') + '</p></div>';
  }

  async function entrar() {
    aviso('A entrar…', '');
    if (!url) return aviso('Sem ligação configurada', 'Falta o endereço em respostas/config.js.');
    try {
      const j = await sala.entrar(S, U, nomes);
      if (!j || !j.ok) return aviso('Esta sala já fechou', 'Lê outra vez o código QR que está no ecrã.');
      guardar('esmp-n-' + S, nomes);
      desenhar(j.e); ciclo();
    } catch (e) { aviso('Sem ligação', 'Verifica os dados móveis ou o Wi-Fi e recarrega a página.'); }
  }
  if (nomes) entrar();          // página recarregada a meio do jogo: volta a entrar sozinho

  /* ---- ler o estado, de 2 em 2 segundos ---- */
  let ultimo = '', ocupado = false, falhas = 0, parado = false;
  async function ciclo() {
    while (!parado) {
      await new Promise(r => setTimeout(r, document.visibilityState === 'hidden' ? 4000 : 2000));
      if (ocupado) continue;                    // a meio de um jogo de 10 segundos não é preciso perguntar
      try {
        const j = await sala.ver(S);
        if (j && j.ok) { falhas = 0; desenhar(j.e); }
        else if (j && j.erro === 'sala') { parado = true; aviso('A sala fechou', 'Obrigado por jogares.'); }
      } catch (e) { if (++falhas === 4 && !ocupado) aviso('À procura de ligação…', 'O jogo continua assim que a internet voltar.'); }
    }
  }

  const respondi = {};          // ronda → o que este telemóvel já enviou
  function desenhar(e) {
    if (!e) return;
    if ((e.fora || []).indexOf(U) >= 0) { parado = true; return aviso('Saíste da sala', 'O professor retirou este telemóvel do jogo.'); }
    const marca = e.fase + '|' + (e.v || 0);
    if (marca === ultimo) return;
    ultimo = marca;
    show('ecra-passo'); window.scrollTo(0, 0);
    ({ espera: fEspera, pergunta: fPergunta, revelar: fRevelar, fim: fFim, jogo: fJogo }[e.fase] || fEspera)(e);
  }

  function fEspera(e) {
    aviso(e.titulo || 'Estás dentro!', e.msg || 'Olha para o ecrã da sala. O jogo começa quando o professor carregar.');
    ecra.querySelector('.vv-centro').insertAdjacentHTML('beforeend', '<p class="vv-nome">' + esc(nomes) + '</p>');
  }

  /* ---- pergunta: escolher e enviar ---- */
  let relogio = null;
  function fPergunta(e) {
    clearInterval(relogio);
    const r = 'q' + e.i;
    ecra.innerHTML = '<div class="ghead"><span>Pergunta <b>' + (e.i + 1) + '</b> / ' + e.n + '</span></div>' +
      '<div class="gtimer"><div class="track"><span></span></div><output></output></div>' +
      '<p class="stem">' + esc(e.p) + '</p><div class="opts vv-opts"></div><p class="fb vv-estado"></p>';
    const box = ecra.querySelector('.opts'), est = ecra.querySelector('.vv-estado'), out = ecra.querySelector('output'), barra = ecra.querySelector('.track span');
    barra.style.transition = 'none';
    const FORMAS = ['▲', '◆', '●', '■'];
    e.o.forEach((t, j) => {
      const b = document.createElement('button'); b.className = 't' + j; b.innerHTML = '<span class="vv-forma">' + FORMAS[j % 4] + '</span> ' + esc(t);
      b.onclick = () => escolher(j, b); box.appendChild(b);
    });
    function marcar(j) {
      box.querySelectorAll('button').forEach((b, k) => { b.disabled = true; b.classList.toggle('escolhido', k === j); });
    }
    async function escolher(j, b) {
      if (respondi[r] != null) return;
      const ms = Math.max(0, Math.min(e.dur, e.dur - (e.fim - sala.agora())));
      respondi[r] = j; marcar(j); J.som(700, 0.08, 0.06);
      est.textContent = 'A enviar…';
      try { const x = await sala.enviar(S, U, r, { r: j, ms: Math.round(ms) }); if (!x || !x.ok) throw 0; est.innerHTML = '<b class="ok">Resposta enviada.</b> Espera pelos colegas.'; }
      catch (err) { delete respondi[r]; box.querySelectorAll('button').forEach(x => { x.disabled = false; x.classList.remove('escolhido'); }); est.innerHTML = '<b class="no">Não chegou.</b> Toca outra vez.'; }
    }
    if (respondi[r] != null) { marcar(respondi[r]); est.innerHTML = '<b class="ok">Resposta enviada.</b> Espera pelos colegas.'; }
    relogio = setInterval(() => {
      const resto = e.fim - sala.agora();
      out.textContent = Math.max(0, Math.ceil(resto / 1000));
      barra.style.width = Math.max(0, Math.min(100, resto / e.dur * 100)) + '%';
      ecra.classList.toggle('hurry', resto < 5000 && respondi[r] == null);
      if (resto <= 0) {
        clearInterval(relogio); ecra.classList.remove('hurry');
        if (respondi[r] == null) { box.querySelectorAll('button').forEach(b => { b.disabled = true; }); est.innerHTML = '<b class="no">Acabou o tempo.</b>'; }
      }
    }, 200);
  }

  const ordinal = n => n + '.º';
  function fRevelar(e) {
    clearInterval(relogio); ecra.classList.remove('hurry');
    const meu = respondi['q' + e.i], pl = (e.placar || {})[U] || [0, 0, 0, 0];
    const certo = meu === e.c;
    ecra.innerHTML = '<div class="vv-veredito ' + (certo ? 'ok' : 'no') + '"><b>' + (certo ? 'Certo!' : (meu == null ? 'Sem resposta' : 'Errado')) + '</b><span>' + (certo ? '+' + pl[2] + ' pontos' : 'a resposta certa está marcada') + '</span></div>' +
      '<p class="stem">' + esc(e.p) + '</p><div class="opts vv-opts"></div>' + (e.f ? '<p class="fb">' + esc(e.f) + '</p>' : '') +
      '<div class="vv-lugar"><span>' + pl[0] + ' pontos</span><b>' + (pl[1] ? ordinal(pl[1]) + ' lugar' : '') + '</b><span>' + (e.total ? 'de ' + e.total : '') + '</span></div>';
    const box = ecra.querySelector('.opts');
    e.o.forEach((t, j) => { const b = document.createElement('button'); b.className = 't' + j + (j === e.c ? ' right' : (j === meu ? ' wrong' : '')); b.disabled = true; b.textContent = t; box.appendChild(b); });
    J.som(certo ? 880 : 220, certo ? 0.25 : 0.3, 0.08);
  }
  function fFim(e) {
    clearInterval(relogio);
    const pl = (e.placar || {})[U] || [0, 0];
    ecra.innerHTML = '<div class="vv-centro"><div class="vv-taca">' + (pl[1] === 1 ? '🏆' : pl[1] === 2 ? '🥈' : pl[1] === 3 ? '🥉' : '✓') + '</div><h2>' + (pl[1] ? ordinal(pl[1]) + ' lugar' : 'Fim do jogo') + '</h2>' +
      '<p>' + pl[0] + ' pontos' + (e.total ? ' · ' + e.total + (e.total === 1 ? ' jogador' : ' jogadores') : '') + '</p><p class="vv-nome">' + esc(nomes) + '</p><p class="sm">As tuas respostas ficaram registadas na folha do professor.</p></div>';
  }

  /* ---- jogos de turma ---- */
  function fJogo(e) {
    clearInterval(relogio);
    const r = (e.jogo === 'mariposas' ? 'm' : 'f') + e.ronda;
    if (respondi[r]) return aviso('Jogada enviada', 'Olha para o ecrã da sala.');
    const espera = e.inicio - sala.agora();
    if (espera < -2500) return aviso('Esta ronda já começou', 'Entras na próxima. Olha para o ecrã da sala.');
    ocupado = true;
    const fimJogo = async res => {
      respondi[r] = true;
      try { await sala.enviar(S, U, r, res); } catch (err) { /* o projetor conta sem este telemóvel */ }
      ocupado = false;
    };
    if (e.jogo === 'mariposas') {
      J.mariposas.jogar(ecra, { tronco: e.tronco, dur: e.dur, espera: espera }).then(fimJogo);
    } else {
      const papel = (e.papeis || {})[U];
      if (!papel) { ocupado = false; return aviso('Entraste depois de os postos serem distribuídos', 'Jogas na próxima ronda.'); }
      let ultimoEnvio = 0;
      J.fabrica.jogar(ecra, {
        papel: papel, dur: e.dur, espera: espera,
        aoProgredir: res => { const t = Date.now(); if (t - ultimoEnvio > 3500) { ultimoEnvio = t; sala.enviar(S, U, r, res).catch(() => {}); } }
      }).then(fimJogo);
    }
  }
})();
