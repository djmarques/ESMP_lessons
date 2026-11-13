/* =====================================================================
   aluno.js — o aluno responde no telemóvel e envia ao professor.
   ---------------------------------------------------------------------
   Endereço: respostas/?f=<pasta do site da aula>&a=<atividade>
   1. Carrega <pasta>/atividades.js, que define window.ATIVIDADES.
   2. Pede o nome e percorre os passos da atividade, por ordem:
        jogo         escolha múltipla com 20 s, pontos e som (certo/errado)
        classificar  um item de cada vez, escolher a categoria (certo/errado)
        opiniao      escolher uma opção, sem resposta certa
        escrita      caixas de texto
   3. Envia tudo, em JSON (Content-Type text/plain, sem pedido prévio CORS),
      para o Google Apps Script de config.js, que regista na folha de cálculo
      e responde {ok:true}. Só com essa resposta aparece «Respostas recebidas»;
      senão tenta mais vezes. Uma cópia fica no telemóvel até ser confirmada.
   ===================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const pasta = params.get('f') || '';
  const chave = params.get('a') || '';
  const url = (window.CONFIG && window.CONFIG.SCRIPT_URL || '').trim();
  const ecra = $('ecra-passo');
  const show = id => document.querySelectorAll('.ecra').forEach(s => { s.hidden = s.id !== id; });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Leitores de QR e apps (Facebook, Instagram…) abrem a página num navegador interno onde,
  // em alguns Android, o teclado não aparece nas caixas de texto. Mostrar como abrir no Chrome.
  (function navegadorInterno() {
    const ua = navigator.userAgent;
    if (!/; wv\)|FBAN|FBAV|Instagram|Line\/|MiuiBrowser|GSA\//.test(ua)) return;
    const box = $('aviso-wv'); if (!box) return;
    if (/Android/.test(ua)) {
      const alvo = location.host + location.pathname + location.search;
      $('abrir-chrome').href = 'intent://' + alvo + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(location.href) + ';end';
    } else $('abrir-chrome').hidden = true;
    box.hidden = false;
  })();

  function falha(msg) { $('titulo').textContent = msg; $('ecra-nome').innerHTML = '<p>Volta a ler o código QR do slide.</p>'; }

  // only plain folder names: no "..", no other sites
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(pasta) || !/^[a-z0-9-]+$/.test(chave)) return falha('Atividade não encontrada');
  const s = document.createElement('script');
  s.src = '../' + pasta + '/atividades.js';
  s.onload = iniciar;
  s.onerror = () => falha('Atividade não encontrada');
  document.head.appendChild(s);

  let act = null, passos = [];
  const registo = { nome: '', jogo: [], escrita: [], pontos: 0, certas: 0, total: 0 };

  function iniciar() {
    act = (window.ATIVIDADES || {})[chave];
    if (!act) return falha('Atividade não encontrada');
    // formato antigo (CP 4): { jogo: [...], escrita: [...] }
    passos = act.passos || [{ tipo: 'jogo', perguntas: act.jogo || [] }, { tipo: 'escrita', perguntas: act.escrita || [] }];
    passos = passos.filter(p => (p.perguntas || p.itens || p.o || []).length);
    document.title = act.titulo;
    $('titulo').textContent = act.titulo;
    $('disciplina').textContent = act.disciplina || '';
    $('passos').innerHTML = passos.map(() => '<span></span>').join('');
    if (!url) $('aviso-config').hidden = false;
    try { $('nome').value = localStorage.getItem('esmp-nome') || ''; } catch (e) { /* sem armazenamento */ }
  }

  /* ---- som (sintetizado, sem ficheiros) ---- */
  let audio = null, muted = false;
  function tone(f, start, dur, type, vol) {
    if (muted) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime + start, o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* sem som */ }
  }
  const sfx = {
    right: () => { tone(659, 0, .12, 'triangle', .25); tone(988, .11, .25, 'triangle', .25); },
    wrong: () => tone(220, 0, .35, 'sawtooth', .12),
    tick: () => tone(1200, 0, .05, 'square', .05)
  };

  $('comecar').addEventListener('click', () => {
    const nome = $('nome').value.trim();
    if (nome.length < 2) { $('nome').focus(); $('nome').placeholder = 'Escreve o teu nome primeiro'; return; }
    registo.nome = nome;
    try { localStorage.setItem('esmp-nome', nome); } catch (e) {}
    tone(523, 0, .14, 'triangle', .2);       // desbloqueia o áudio no iPhone (tem de ser num toque)
    passo(0);
  });

  /* ---- passos ---- */
  let atual = -1;
  function passo(n) {
    atual = n;
    $('passos').querySelectorAll('span').forEach((b, k) => { b.className = k < n ? 'feito' : (k === n ? 'atual' : ''); });
    if (n >= passos.length) return fimDosPassos();
    show('ecra-passo'); ecra.innerHTML = ''; window.scrollTo(0, 0);
    const p = passos[n];
    ({ jogo, classificar, opiniao, escrita })[p.tipo](p, () => passo(n + 1));
  }
  function intro(p) { if (p.intro) ecra.insertAdjacentHTML('beforeend', '<p class="intro">' + esc(p.intro) + '</p>'); }

  /* ---- caixas de texto ----
     Nalguns Android, as caixas de texto criadas a meio da atividade ficavam com o cursor
     mas sem teclado (o campo do nome, que já vem na página, funcionava). Três defesas:
     1. atributos explícitos de teclado (inputmode, autocapitalize…);
     2. ao tocar, a caixa perde e volta a ganhar o foco dentro do próprio toque, o que
        obriga o Android a abrir o teclado mesmo que a caixa já tivesse o cursor;
     3. por baixo de cada caixa, «O teclado não aparece?» troca a caixa por um campo
        de uma linha, igual ao do nome. */
  function caixa(id, max) {
    return '<textarea id="' + id + '" maxlength="' + max + '" inputmode="text" autocapitalize="sentences" autocomplete="off" autocorrect="on" spellcheck="true" rows="4"></textarea>' +
      '<button type="button" class="sem-teclado" data-para="' + id + '">O teclado não aparece? Toca aqui.</button>';
  }
  ecra.addEventListener('touchend', e => {
    const t = e.target;
    if (t.tagName !== 'TEXTAREA' && !(t.tagName === 'INPUT' && t.classList.contains('linha'))) return;
    if (document.activeElement !== t) return;          // primeiro toque: o navegador trata do foco
    t.blur(); t.focus();                                // toque numa caixa que já tem o cursor: tirar e
                                                        // devolver o foco, no próprio toque, reabre o teclado
  }, { passive: true });
  ecra.addEventListener('click', e => {
    const b = e.target.closest('.sem-teclado'); if (!b) return;
    const ta = $(b.dataset.para); if (!ta || ta.tagName !== 'TEXTAREA') return;
    const inp = document.createElement('input');
    inp.type = 'text'; inp.id = ta.id; inp.maxLength = ta.maxLength; inp.className = 'linha';
    inp.autocomplete = 'off'; inp.value = ta.value; inp.placeholder = 'Escreve aqui';
    ta.replaceWith(inp);
    b.textContent = 'Agora toca no campo acima e escreve.'; b.disabled = true;
    inp.focus();                      // dentro do toque: o Android abre o teclado
  });

  /* jogo: escolha múltipla com tempo */
  function jogo(p, next) {
    const TOTAL = p.segundos || 20, qs = p.perguntas;
    ecra.innerHTML = '<div class="ghead"><span>Pergunta <b class="n">1</b> / ' + qs.length + '</span><span>Pontos <b class="pts">' + registo.pontos + '</b></span>' +
      '<button class="som" aria-label="Som">' + (muted ? '🔇' : '🔊') + '</button></div>' +
      '<div class="gtimer"><div class="track"><span></span></div><output>' + TOTAL + '</output></div>' +
      '<p class="stem"></p><div class="opts"></div><p class="fb"></p><button class="btn seg" hidden>Seguinte →</button>';
    const q$ = sel => ecra.querySelector(sel);
    q$('.som').addEventListener('click', e => { muted = !muted; e.target.textContent = muted ? '🔇' : '🔊'; });
    let i = -1, left = TOTAL, timer = null, done = false;
    function paint() { q$('output').textContent = left; q$('.track span').style.width = (left / TOTAL * 100) + '%'; ecra.classList.toggle('hurry', left <= 5 && !done); }
    function ask(k) {
      i = k; left = TOTAL; done = false;
      const q = qs[k];
      q$('.n').textContent = k + 1; q$('.stem').textContent = q.p; q$('.fb').textContent = ''; q$('.seg').hidden = true;
      const box = q$('.opts'); box.innerHTML = '';
      q.o.forEach((t, j) => { const b = document.createElement('button'); b.className = 't' + j; b.textContent = t; b.onclick = () => reveal(j); box.appendChild(b); });
      paint(); clearInterval(timer);
      timer = setInterval(() => { left = Math.max(0, left - 1); paint(); if (left > 0 && left <= 5) sfx.tick(); if (!left) reveal(null); }, 1000);
    }
    function reveal(j) {
      if (done) return; done = true; clearInterval(timer);
      const q = qs[i], ok = j === q.c, btns = q$('.opts').querySelectorAll('button');
      btns.forEach(b => { b.disabled = true; }); btns[q.c].classList.add('right');
      if (j !== null && !ok) btns[j].classList.add('wrong');
      let gain = 0;
      if (ok) { gain = 100 + Math.round(50 * left / TOTAL); registo.pontos += gain; registo.certas++; sfx.right(); } else sfx.wrong();
      registo.total++;
      registo.jogo.push({ pergunta: q.p, resposta: j === null ? '(sem resposta)' : q.o[j], certa: ok });
      q$('.pts').textContent = registo.pontos;
      q$('.fb').innerHTML = '<b class="' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Certo! +' + gain : (j === null ? 'Acabou o tempo!' : 'Errado.')) + '</b> ' + esc(q.f || '');
      q$('.seg').hidden = false; q$('.seg').textContent = i === qs.length - 1 ? 'Continuar' : 'Seguinte →';
    }
    q$('.seg').addEventListener('click', () => (i < qs.length - 1 ? ask(i + 1) : (ecra.classList.remove('hurry'), next())));
    ask(0);
  }

  /* classificar: um item de cada vez, escolher a categoria */
  function classificar(p, next) {
    ecra.innerHTML = '<h2>' + esc(p.titulo || 'Classifica') + '</h2>';
    intro(p);
    ecra.insertAdjacentHTML('beforeend', '<p class="contador"></p><p class="stem"></p><div class="opts"></div><p class="fb"></p><button class="btn seg" hidden>Seguinte →</button>');
    const q$ = sel => ecra.querySelector(sel);
    let i = -1;
    function item(k) {
      i = k; const it = p.itens[k];
      q$('.contador').textContent = (k + 1) + ' de ' + p.itens.length;
      q$('.stem').textContent = it.t; q$('.fb').textContent = ''; q$('.seg').hidden = true;
      const box = q$('.opts'); box.innerHTML = '';
      p.categorias.forEach((c, j) => { const b = document.createElement('button'); b.className = 't' + j; b.textContent = c; b.onclick = () => escolher(j); box.appendChild(b); });
    }
    function escolher(j) {
      const it = p.itens[i], btns = q$('.opts').querySelectorAll('button');
      btns.forEach(b => { b.disabled = true; });
      const temCerta = typeof it.c === 'number', ok = temCerta && j === it.c;
      if (temCerta) {
        btns[it.c].classList.add('right'); if (!ok) btns[j].classList.add('wrong');
        ok ? sfx.right() : sfx.wrong(); registo.total++; if (ok) registo.certas++;
        registo.jogo.push({ pergunta: (p.titulo ? p.titulo + ': ' : '') + it.t, resposta: p.categorias[j], certa: ok });
        q$('.fb').innerHTML = '<b class="' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Certo!' : 'Não: é ' + esc(p.categorias[it.c]) + '.') + '</b> ' + esc(it.f || '');
      } else {
        btns[j].classList.add('right');
        registo.escrita.push({ pergunta: (p.titulo ? p.titulo + ': ' : '') + it.t, resposta: p.categorias[j] });
      }
      q$('.seg').hidden = false; q$('.seg').textContent = i === p.itens.length - 1 ? 'Continuar' : 'Seguinte →';
    }
    q$('.seg').addEventListener('click', () => (i < p.itens.length - 1 ? item(i + 1) : next()));
    item(0);
  }

  /* opiniao: escolher uma opção, sem resposta certa */
  function opiniao(p, next) {
    ecra.innerHTML = '<h2>A tua opinião</h2>';
    intro(p);
    ecra.insertAdjacentHTML('beforeend', '<p class="stem">' + esc(p.p) + '</p><div class="opts neutro"></div><label for="porque">' + esc(p.porque || 'Porquê? (opcional)') + '</label>' + caixa('porque', 1500) + '<button class="btn seg" disabled>Continuar</button>');
    let escolha = null;
    const box = ecra.querySelector('.opts');
    p.o.forEach(t => { const b = document.createElement('button'); b.textContent = t; b.onclick = () => { escolha = t; box.querySelectorAll('button').forEach(x => x.classList.toggle('escolhido', x === b)); ecra.querySelector('.seg').disabled = false; }; box.appendChild(b); });
    ecra.querySelector('.seg').addEventListener('click', () => {
      const pq = $('porque').value.trim();
      registo.escrita.push({ pergunta: p.p, resposta: escolha + (pq ? ' — ' + pq : '') });
      next();
    });
  }

  /* escrita: caixas de texto */
  function escrita(p, next) {
    ecra.innerHTML = (registo.total ? '<p class="resultado">' + registo.certas + ' / ' + registo.total + ' certas · ' + registo.pontos + ' pontos</p>' : '') + '<h2>' + esc(p.titulo || 'Agora, por palavras tuas') + '</h2>';
    intro(p);
    p.perguntas.forEach((q, k) => ecra.insertAdjacentHTML('beforeend', '<label for="e' + k + '">' + (k + 1) + '. ' + esc(q) + '</label>' + caixa('e' + k, 3000)));
    ecra.insertAdjacentHTML('beforeend', '<button class="btn seg">Continuar</button>');
    ecra.querySelector('.seg').addEventListener('click', () => {
      p.perguntas.forEach((q, k) => registo.escrita.push({ pergunta: q, resposta: $('e' + k).value.trim() }));
      next();
    });
  }

  /* ---- envio ---- */
  let payload = null;
  function fimDosPassos() {
    payload = {
      disciplina: act.disciplina || '', atividade: act.titulo, pasta: pasta, chave: chave, nome: registo.nome,
      data: new Date().toISOString(), pontos: registo.pontos, certas: registo.certas, total: registo.total,
      jogo: registo.jogo, escrita: registo.escrita
    };
    try { localStorage.setItem('esmp-ultimo-' + pasta + '-' + chave, JSON.stringify(payload)); } catch (e) {}
    enviar();
  }
  $('reenviar').addEventListener('click', () => enviar());

  /* O envio lê a resposta do Apps Script ({ok:true}). Só depois diz «Respostas recebidas».
     Se falhar, tenta mais 4 vezes, com esperas crescentes e um pouco aleatórias (para que
     20 telemóveis que acabam o mesmo jogo não batam à porta todos no mesmo segundo).
     Enquanto não chega a confirmação, a resposta fica guardada no telemóvel e é reenviada
     da próxima vez que o aluno abrir uma atividade. */
  const PEND = 'esmp-pendentes';
  const pendentes = () => { try { return JSON.parse(localStorage.getItem(PEND) || '[]'); } catch (e) { return []; } };
  const guardarPend = l => { try { localStorage.setItem(PEND, JSON.stringify(l.slice(-20))); } catch (e) {} };
  const idDe = p => p.nome + '|' + p.chave + '|' + p.data;
  const tirarPend = p => guardarPend(pendentes().filter(x => idDe(x) !== idDe(p)));
  const esperar = ms => new Promise(r => setTimeout(r, ms));

  async function post(p) {
    const ctl = window.AbortController ? new AbortController() : null;
    const t = ctl && setTimeout(() => ctl.abort(), 30000);   // sem resposta em 30 s: tenta outra vez
    let r;
    try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p), redirect: 'follow', signal: ctl && ctl.signal }); }
    finally { clearTimeout(t); }
    let j = null; try { j = await r.json(); } catch (e) { /* resposta que não é JSON = erro do lado do Google */ }
    if (!j || !j.ok) throw new Error(j && j.erro || 'sem confirmação');
  }

  let aEnviar = false;
  window.addEventListener('beforeunload', e => { if (aEnviar) { e.preventDefault(); e.returnValue = ''; } });

  async function enviar() {
    show('ecra-fim');
    $('resumo').textContent = resumo(payload);
    if (!url) { estado('aviso', 'Mostra este ecrã ao professor', 'O envio automático ainda não está configurado.'); return; }
    guardarPend(pendentes().filter(x => idDe(x) !== idDe(payload)).concat([payload]));
    aEnviar = true; $('reenviar').hidden = true;
    const esperas = [0, 2000, 4000, 8000, 12000];
    for (let k = 0; k < esperas.length; k++) {
      estado('envio', k ? 'A tentar outra vez… (' + (k + 1) + '/' + esperas.length + ')' : 'A enviar as tuas respostas…', 'Não feches esta página nem saias do navegador até aparecer o sinal verde.');
      await esperar(esperas[k] + (k ? Math.random() * 2000 : Math.random() * 800));
      try {
        await post(payload);
        aEnviar = false; tirarPend(payload);
        estado('ok', 'Respostas recebidas', 'Obrigado, ' + payload.nome.split(' ')[0] + '. O professor já tem as tuas respostas. Podes fechar esta página.');
        return;
      } catch (e) { /* tenta outra vez */ }
    }
    aEnviar = false;
    estado('erro', 'Ainda não foi enviado', 'Verifica a ligação à internet (dados móveis ou Wi-Fi) e carrega no botão. As tuas respostas estão guardadas neste telemóvel.');
    $('reenviar').hidden = false;
  }
  function estado(tipo, titulo, texto) {
    const f = $('ecra-fim'); f.dataset.estado = tipo;
    $('fim-titulo').textContent = titulo; $('fim-texto').textContent = texto;
  }
  // respostas que ficaram por enviar de uma vez anterior: reenviar em silêncio
  if (url) setTimeout(async () => {
    for (const p of pendentes()) {
      if (payload && idDe(p) === idDe(payload)) continue;
      try { await post(p); tirarPend(p); } catch (e) { break; }
    }
  }, 1500);

  function resumo(p) {
    let t = p.nome + ' · ' + new Date(p.data).toLocaleString('pt-PT') + '\n';
    if (p.total) t += p.certas + ' / ' + p.total + ' certas · ' + p.pontos + ' pontos\n';
    p.escrita.forEach((e, k) => { t += '\n' + (k + 1) + '. ' + e.pergunta + '\n' + (e.resposta || '(em branco)') + '\n'; });
    return t;
  }
})();
