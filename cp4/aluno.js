/* =====================================================================
   aluno.js — o formando joga no telemóvel e envia as respostas.
   ---------------------------------------------------------------------
   1. Lê a atividade do endereço (aluno.html?a=navio) em window.ATIVIDADES.
   2. Pede o nome; corre o jogo (20 s por pergunta, pontos, som).
   3. Mostra as perguntas de resposta escrita.
   4. Envia tudo, em JSON, para o Google Apps Script de config.js, que
      regista numa folha de cálculo e manda um email ao formador.
   O envio usa mode 'no-cors' (o Apps Script não aceita o pedido prévio
   CORS), por isso a página não consegue ler a resposta: considera-se
   enviado quando o pedido sai sem erro de rede. Uma cópia fica guardada
   no telemóvel para se poder reenviar.
   ===================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const key = params.get('a');
  const act = (window.ATIVIDADES || {})[key];
  const url = (window.CONFIG && window.CONFIG.SCRIPT_URL || '').trim();

  if (!act) {
    $('titulo').textContent = 'Atividade não encontrada';
    $('ecra-nome').innerHTML = '<p>Volta a ler o código QR do slide.</p>';
    return;
  }
  document.title = 'CP 4 · ' + act.titulo;
  $('titulo').textContent = act.titulo;
  if (!url) $('aviso-config').hidden = false;
  try { $('nome').value = localStorage.getItem('cp4-nome') || ''; } catch (e) { /* sem armazenamento */ }

  const show = id => document.querySelectorAll('.ecra').forEach(s => { s.hidden = s.id !== id; });

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
    } catch (e) { /* sem som: o jogo continua */ }
  }
  const sfx = {
    right: () => { tone(659, 0, .12, 'triangle', .25); tone(988, .11, .25, 'triangle', .25); },
    wrong: () => tone(220, 0, .35, 'sawtooth', .12),
    tick: () => tone(1200, 0, .05, 'square', .05)
  };
  $('som').addEventListener('click', () => { muted = !muted; $('som').textContent = muted ? '🔇' : '🔊'; });

  /* ---- estado da resposta ---- */
  const record = { nome: '', jogo: [], pontos: 0, certas: 0 };
  const TOTAL = 20;
  let i = -1, left = TOTAL, timer = null, answered = false;

  $('comecar').addEventListener('click', () => {
    const nome = $('nome').value.trim();
    if (nome.length < 2) { $('nome').focus(); $('nome').placeholder = 'Escreve o teu nome primeiro'; return; }
    record.nome = nome;
    try { localStorage.setItem('cp4-nome', nome); } catch (e) {}
    tone(523, 0, .14, 'triangle', .2);       // desbloqueia o áudio no iPhone (tem de ser num toque)
    if (act.jogo.length) { show('ecra-jogo'); $('g-total').textContent = act.jogo.length; ask(0); }
    else toWriting();
  });

  function ask(n) {
    i = n; left = TOTAL; answered = false;
    const q = act.jogo[n];
    $('g-n').textContent = n + 1;
    $('g-pergunta').textContent = q.p;
    $('g-fb').textContent = '';
    $('g-seguinte').hidden = true;
    const box = $('g-opcoes'); box.innerHTML = '';
    q.o.forEach((txt, k) => {
      const b = document.createElement('button');
      b.className = 't' + k; b.textContent = txt;
      b.addEventListener('click', () => reveal(k));
      box.appendChild(b);
    });
    paintClock(); clearInterval(timer);
    timer = setInterval(() => {
      left = Math.max(0, left - 1); paintClock();
      if (left > 0 && left <= 5) sfx.tick();
      if (!left) reveal(null);
    }, 1000);
  }
  function paintClock() {
    $('g-tempo').textContent = left;
    $('g-barra').style.width = (left / TOTAL * 100) + '%';
    $('ecra-jogo').classList.toggle('hurry', left <= 5 && !answered);
  }
  function reveal(k) {
    if (answered) return;
    answered = true; clearInterval(timer);
    const q = act.jogo[i], ok = k === q.c;
    const btns = $('g-opcoes').querySelectorAll('button');
    btns.forEach(b => { b.disabled = true; });
    btns[q.c].classList.add('right');
    if (k !== null && !ok) btns[k].classList.add('wrong');
    let gain = 0;
    if (ok) { gain = 100 + Math.round(50 * left / TOTAL); record.pontos += gain; record.certas++; sfx.right(); }
    else sfx.wrong();
    record.jogo.push({ pergunta: q.p, resposta: k === null ? '(sem resposta)' : q.o[k], certa: ok, segundos: TOTAL - left });
    $('g-pontos').textContent = record.pontos;
    $('g-fb').innerHTML = '<b class="' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Certo! +' + gain : (k === null ? 'Acabou o tempo!' : 'Errado.')) + '</b> ' + escapeHtml(q.f || '');
    $('g-seguinte').hidden = false;
    $('g-seguinte').textContent = i === act.jogo.length - 1 ? 'Continuar' : 'Seguinte →';
  }
  $('g-seguinte').addEventListener('click', () => (i < act.jogo.length - 1 ? ask(i + 1) : toWriting()));

  function toWriting() {
    show('ecra-escrita');
    $('resultado').textContent = act.jogo.length ? 'Jogo: ' + record.certas + ' / ' + act.jogo.length + ' certas · ' + record.pontos + ' pontos' : 'Responde às perguntas.';
    const form = $('form-escrita');
    form.innerHTML = '';
    act.escrita.forEach((q, k) => {
      const lab = document.createElement('label'); lab.htmlFor = 'e' + k; lab.textContent = (k + 1) + '. ' + q;
      const ta = document.createElement('textarea'); ta.id = 'e' + k; ta.maxLength = 3000;
      form.append(lab, ta);
    });
    if (!act.escrita.length) $('enviar').textContent = 'Enviar resultado ao formador';
  }

  /* ---- envio ---- */
  let payload = null;
  $('enviar').addEventListener('click', () => {
    payload = {
      atividade: act.titulo, chave: key, nome: record.nome,
      data: new Date().toISOString(), pontos: record.pontos, certas: record.certas, total: act.jogo.length,
      jogo: record.jogo,
      escrita: act.escrita.map((q, k) => ({ pergunta: q, resposta: $('e' + k).value.trim() }))
    };
    try { localStorage.setItem('cp4-ultimo-' + key, JSON.stringify(payload)); } catch (e) {}
    send();
  });
  $('reenviar').addEventListener('click', send);

  function send() {
    show('ecra-fim');
    $('resumo').textContent = summary(payload);
    if (!url) {
      $('fim-titulo').textContent = 'Mostra este ecrã ao formador';
      $('fim-texto').textContent = 'O envio automático ainda não está configurado.';
      return;
    }
    $('fim-titulo').textContent = 'A enviar…'; $('fim-texto').textContent = ''; $('reenviar').hidden = true;
    fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(() => {
        $('fim-titulo').textContent = 'Enviado!';
        $('fim-texto').textContent = 'Obrigado, ' + payload.nome.split(' ')[0] + '. O formador recebeu as tuas respostas.';
      })
      .catch(() => {
        $('fim-titulo').textContent = 'Não foi possível enviar';
        $('fim-texto').textContent = 'Verifica a ligação à internet e tenta outra vez. As tuas respostas estão guardadas.';
        $('reenviar').hidden = false;
      });
  }
  function summary(p) {
    let t = p.nome + ' · ' + new Date(p.data).toLocaleString('pt-PT') + '\n';
    if (p.total) t += 'Jogo: ' + p.certas + ' / ' + p.total + ' certas · ' + p.pontos + ' pontos\n';
    p.escrita.forEach((e, k) => { t += '\n' + (k + 1) + '. ' + e.pergunta + '\n' + (e.resposta || '(em branco)') + '\n'; });
    return t;
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
})();
