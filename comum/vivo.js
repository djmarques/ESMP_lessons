/* =====================================================================
   comum/vivo.js — «salas» ao vivo: a ligação entre o projetor do professor
   e os telemóveis da turma. Usado pelos dois lados:
     comum/aovivo.js     o projetor (abre a sala, publica o estado, recolhe)
     respostas/vivo.js   o telemóvel (lê o estado, envia as jogadas)
   ---------------------------------------------------------------------
   O site é só ficheiros (GitHub Pages): não há servidor próprio. A sala vive
   no Google Apps Script de respostas/config.js (versão 4), na memória
   temporária dele. Por isso a ligação é por perguntas repetidas e não por um
   canal aberto:
     - o professor PUBLICA um estado (um objeto pequeno: que pergunta está no
       ecrã, quando acaba o tempo, quem ganhou pontos…);
     - cada telemóvel LÊ o estado de 2 em 2 segundos e desenha o que ele diz;
     - cada telemóvel ENVIA a sua jogada de uma ronda (uma resposta, o
       resultado de um jogo);
     - o professor RECOLHE as jogadas de uma ronda, com os nomes.
   O atraso entre o professor carregar e o telemóvel mudar é de 1 a 3 segundos.
   Para começos ao mesmo tempo (jogos de 10 segundos), o estado traz a hora de
   início pelo relógio do servidor, e cada lado acerta o seu relógio por ele.
   ===================================================================== */
(function () {
  'use strict';
  const E = window.ESMP = window.ESMP || {};
  const esperar = ms => new Promise(r => setTimeout(r, ms));

  /** Letras e números fáceis de ler e de ditar (sem O/0, I/1). */
  E.codigo = function (n) {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = '';
    const r = new Uint32Array(n); (window.crypto || window.msCrypto).getRandomValues(r);
    for (let i = 0; i < n; i++) s += abc[r[i] % abc.length];
    return s;
  };

  E.sala = function (url) {
    let desvio = 0, acertado = false;                 // relógio do servidor − relógio deste aparelho
    function acertar(t0, j) {
      if (!j || typeof j.t !== 'number') return;
      const ida = Date.now() - t0;
      if (ida > 4000) return;                         // resposta muito lenta: não serve para acertar o relógio
      const d = j.t - (t0 + ida / 2);
      desvio = acertado ? desvio * 0.6 + d * 0.4 : d; acertado = true;
    }
    async function pedir(metodo, dados, tentativas) {
      let erro = null;
      for (let k = 0; k < (tentativas || 1); k++) {
        if (k) await esperar(600 * k + Math.random() * 500);
        const ctl = window.AbortController ? new AbortController() : null;
        const tm = ctl && setTimeout(() => ctl.abort(), 15000);
        const t0 = Date.now();
        try {
          let r;
          if (metodo === 'GET') {
            const qs = Object.keys(dados).map(x => encodeURIComponent(x) + '=' + encodeURIComponent(dados[x])).join('&');
            r = await fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + qs + '&_=' + t0, { redirect: 'follow', signal: ctl && ctl.signal });
          } else {
            // text/plain: pedido simples, sem a pergunta prévia CORS que o Apps Script não sabe responder
            r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(dados), redirect: 'follow', signal: ctl && ctl.signal });
          }
          const j = await r.json();
          acertar(t0, j);
          return j;
        } catch (e) { erro = e; } finally { clearTimeout(tm); }
      }
      throw erro || new Error('sem ligação');
    }
    return {
      /** Hora do servidor, em milissegundos (a mesma em todos os aparelhos, com erro de décimas de segundo). */
      agora: () => Date.now() + desvio,
      abrir: (s, k, e) => pedir('POST', { acao: 'sala', op: 'abrir', s: s, k: k, e: e }, 3),
      publicar: (s, k, e) => pedir('POST', { acao: 'sala', op: 'pub', s: s, k: k, e: e }, 4),
      recolher: (s, k, r) => pedir('POST', { acao: 'sala', op: 'rec', s: s, k: k, r: r }, 2),
      fechar: (s, k) => pedir('POST', { acao: 'sala', op: 'fechar', s: s, k: k }, 1).catch(() => {}),
      ver: (s) => pedir('GET', { acao: 'sala', s: s }, 1),
      entrar: (s, u, nomes) => pedir('GET', { acao: 'sala', s: s, u: u, n: nomes, entrar: 1 }, 4),
      enviar: (s, u, r, d) => pedir('POST', { acao: 'sala', op: 'env', s: s, u: u, r: r, d: d }, 5),
      lote: (disciplina, atividade, linhas) => pedir('POST', { acao: 'lote', disciplina: disciplina, atividade: atividade, linhas: linhas }, 4),
      ranking: (disciplina, atividade, chave) => pedir('GET', { acao: 'ranking', d: disciplina, a: atividade, k: chave }, 2),
      posicao: (disciplina, atividade, pontos) => pedir('GET', { acao: 'posicao', d: disciplina, a: atividade, p: pontos }, 2),
      versao: () => pedir('GET', { acao: 'versao' }, 1).then(j => (j && j.versao) || 0).catch(() => 0)
    };
  };

  /** Perguntas de uma atividade que se podem jogar ao vivo (escolha com resposta certa). */
  E.perguntasVivo = function (def) {
    const out = [];
    E.passos(def).forEach(p => {
      if (p.tipo === 'jogo') p.perguntas.forEach(q => { if (q.c >= 0) out.push({ p: q.p, o: q.o, c: q.c, f: q.f || '', s: p.segundos || 0 }); });
      else if (p.tipo === 'classificar') p.itens.forEach(it => { if (typeof it.c === 'number') out.push({ p: (p.titulo ? p.titulo + ': ' : '') + it.t, o: p.categorias, c: it.c, f: it.f || '', s: 0 }); });
    });
    return out;
  };
  /** Pontos de uma resposta certa: 100, mais até 50 pela rapidez (igual ao jogo individual). */
  E.pontosVivo = (ms, dur) => 100 + Math.round(50 * Math.max(0, Math.min(1, 1 - ms / dur)));
})();
