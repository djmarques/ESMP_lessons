/**
 * Recetor de respostas dos sites das aulas (Google Apps Script).
 * ---------------------------------------------------------------------
 * Recebe as respostas que os alunos enviam do telemóvel (respostas/ e
 * cp4/aluno.html), escreve-as numa folha de cálculo do Google (um separador
 * por disciplina e atividade) e responde {ok:true} ao telemóvel, que só
 * então mostra «Respostas recebidas». O email por envio está desligado.
 *
 * Novembro de 2026 (versão 3):
 *  - um envio pode trazer vários nomes (colegas sem telemóvel): cada nome
 *    fica com a sua linha, com as mesmas respostas e a mesma pontuação;
 *  - o endereço /exec?acao=resultados&d=<disciplina>&a=<atividade> devolve
 *    as respostas da turma já contadas e SEM NOMES, para os gráficos do
 *    telemóvel e do projetor. Só saem as colunas de escolha (perguntas de
 *    jogo, opiniões, escalas e nuvens de palavras); as colunas «Escrita»
 *    (textos livres) nunca saem daqui.
 *
 * Novembro de 2026 (versão 4): jogos ao vivo e classificação
 *  - «salas» para os jogos ao vivo (o professor avança, os telemóveis seguem):
 *    o estado de cada sala vive na memória temporária do script (CacheService,
 *    4 horas) e não na folha. O professor publica o estado; os telemóveis
 *    leem-no de 2 em 2 segundos e enviam as respostas de cada ronda.
 *    Só quem abriu a sala (tem o segredo dela) vê os nomes e muda o estado.
 *  - acao=lote: no fim de um jogo ao vivo, o projetor grava de uma vez as
 *    linhas de todos os alunos no separador da atividade.
 *  - acao=ranking: classificação COM nomes, só com a chave do professor
 *    (a primeira chave usada fica guardada; para a mudar, apaga a propriedade
 *    CHAVE_PROF em Definições do projeto → Propriedades do script).
 *  - acao=posicao: o lugar de uma pontuação na turma, sem nomes.
 *
 * Como instalar: ver respostas/LEIA-ME.md. Para atualizar: colar este código
 * por cima do anterior → Implementar → Gerir implementações → lápis →
 * Versão: Nova versão → Implementar (o endereço /exec mantém-se).
 */

// Para onde vão os emails. Vazio = o email da conta Google que instalou o script.
const EMAIL_FORMADOR = '';
// Nome da folha de cálculo no Google Drive (se a folha já existir com outro nome, é renomeada).
const NOME_FOLHA = 'Avaliação contínua';
// Pôr false para deixar de receber um email por cada envio (as respostas continuam a ir para a folha).
const ENVIAR_EMAIL = false;

/** Chamado pelo telemóvel do formando quando carrega em «Enviar». */
function doPost(e) {
  // Sem trancar o script inteiro: appendRow já é seguro com vários envios ao mesmo tempo.
  // (Antes, 20 telemóveis a enviar no fim do mesmo jogo ficavam em fila; os últimos
  // esperavam mais de 20 s, o pedido falhava e o telemóvel dizia «Enviado!» na mesma.)
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.acao === 'sala') return resposta(salaPost(d));
    if (d.acao === 'lote') return resposta(lote(d));
    // vários nomes = alunos a responder juntos no mesmo telemóvel: uma linha para cada um
    let nomes = (Array.isArray(d.nomes) && d.nomes.length ? d.nomes : [d.nome])
      .map(n => limpar(n, 80).trim()).filter(n => n).slice(0, 6);
    if (!nomes.length) nomes = ['(sem nome)'];
    const nome = nomes.join(' + ');
    // pedidos antigos do CP 4 não trazem disciplina
    const disciplina = limpar(d.disciplina, 40) || 'CP 4';
    const atividade = limpar(d.atividade, 80) || 'Atividade';
    const jogo = Array.isArray(d.jogo) ? d.jogo.slice(0, 30) : [];
    const escrita = Array.isArray(d.escrita) ? d.escrita.slice(0, 20) : [];
    const agora = new Date();

    // 1. Folha de cálculo: um separador por atividade, uma linha por formando
    const folha = separador(nomeSeparador(disciplina, atividade), jogo, escrita);
    const respostas = jogo.map(j => (j.certa ? '✓ ' : '✗ ') + limpar(j.resposta, 200))
      .concat(escrita.map(x => limpar(x.resposta, 3000)));
    nomes.forEach(n => {
      const linha = [agora, n, Number(d.pontos) || 0, (Number(d.certas) || 0) + ' / ' + (Number(d.total) || 0)].concat(respostas);
      folha.appendRow(linha.map(seguro));
    });

    // 2. Email (desligado por defeito)
    if (ENVIAR_EMAIL && MailApp.getRemainingDailyQuota() > 0) {
      const data = Utilities.formatDate(agora, 'Europe/Lisbon', 'dd/MM/yyyy HH:mm');
      let corpo = nome + '\n' + disciplina + ' · ' + atividade + ' · ' + data + '\n\n';
      if (jogo.length) {
        corpo += 'CERTO / ERRADO: ' + d.certas + ' / ' + d.total + ' certas · ' + d.pontos + ' pontos\n';
        jogo.forEach((j, k) => { corpo += (k + 1) + '. ' + limpar(j.pergunta, 200) + '\n   ' + (j.certa ? '✓ ' : '✗ ') + limpar(j.resposta, 200) + '\n'; });
        corpo += '\n';
      }
      if (escrita.length) {
        corpo += 'RESPOSTAS ESCRITAS E OPINIÕES\n';
        escrita.forEach((x, k) => { corpo += '\n' + (k + 1) + '. ' + limpar(x.pergunta, 300) + '\n' + (limpar(x.resposta, 3000) || '(em branco)') + '\n'; });
      }
      corpo += '\nTodas as respostas: ' + planilha().getUrl();
      MailApp.sendEmail(EMAIL_FORMADOR || Session.getEffectiveUser().getEmail(), disciplina + ' · ' + atividade + ' · ' + nome + ' · ' + data, corpo);
    }
    return resposta({ ok: true });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });   // o telemóvel lê isto e tenta outra vez
  }
}

/** Abrir o endereço /exec no navegador mostra a mensagem: serve para confirmar que está a funcionar.
    Com ?acao=resultados&d=<disciplina>&a=<atividade> devolve as respostas da turma, contadas e sem nomes. */
function doGet(e) {
  const q = (e && e.parameter) || {};
  try {
    if (q.acao === 'resultados') return resposta(resultados(limpar(q.d, 40) || 'CP 4', limpar(q.a, 80) || 'Atividade'));
    if (q.acao === 'sala') return resposta(salaVer(q));
    if (q.acao === 'ranking') return resposta(ranking(limpar(q.d, 40) || 'CP 4', limpar(q.a, 80) || 'Atividade', q.k));
    if (q.acao === 'posicao') return resposta(posicao(limpar(q.d, 40) || 'CP 4', limpar(q.a, 80) || 'Atividade', Number(q.p) || 0));
    if (q.acao === 'versao') return resposta({ ok: true, versao: 4 });
  } catch (err) { return resposta({ ok: false, erro: String(err) }); }
  return ContentService.createTextOutput('O recetor de respostas das aulas está a funcionar (versão 4: jogos ao vivo e classificação).');
}

/** Conta as respostas de um separador. Cada aluno conta uma vez (a última resposta que enviou). */
function resultados(disciplina, atividade) {
  const vazio = { ok: true, n: 0, colunas: [] };
  const id = PropertiesService.getScriptProperties().getProperty('FOLHA_ID');
  if (!id) return vazio;                                   // ainda não há folha: nada para mostrar
  const sh = planilha().getSheetByName(nomeSeparador(disciplina, atividade).replace(/[\[\]\*\?\/\\:]/g, ' ').slice(0, 90));
  if (!sh || sh.getLastRow() < 2) return vazio;
  const v = sh.getDataRange().getDisplayValues(), cab = v[0];
  const ultima = {};                                        // nome → última linha desse aluno
  for (let r = 1; r < v.length; r++) ultima[String(v[r][1]).trim().toLowerCase()] = r;
  const linhas = Object.keys(ultima).map(k => v[ultima[k]]);
  const colunas = [];
  for (let c = 4; c < cab.length; c++) {
    const h = String(cab[c]);
    let m, tipo;
    if ((m = h.match(/^\d+: ([\s\S]*)$/))) tipo = 'jogo';
    else if ((m = h.match(/^(Opinião|Escala|Nuvem) \d+: ([\s\S]*)$/))) { tipo = { 'Opinião': 'opiniao', 'Escala': 'escala', 'Nuvem': 'nuvem' }[m[1]]; m = [0, m[2]]; }
    else continue;                                          // «Escrita …»: texto livre, não sai daqui
    const cont = {};
    const soma = k => { k = String(k).trim().slice(0, 200); if (k && (cont[k] || Object.keys(cont).length < 300)) cont[k] = (cont[k] || 0) + 1; };
    linhas.forEach(l => {
      const x = String(l[c] == null ? '' : l[c]);
      if (!x) return;
      if (tipo === 'jogo') soma(x.replace(/^[✓✗] /, ''));
      else if (tipo === 'opiniao') soma(x.split(' — ')[0]);   // só a escolha; o «porquê» fica na folha
      else if (tipo === 'nuvem') x.split(';').forEach(w => soma(w.toLowerCase()));
      else soma(x);
    });
    colunas.push({ tipo: tipo, pergunta: m[1], contagens: cont });
  }
  return { ok: true, n: linhas.length, colunas: colunas };
}
function nomeSeparador(disciplina, atividade) {
  return disciplina === 'CP 4' ? atividade : disciplina + ' · ' + atividade;   // os separadores antigos do CP 4 não têm prefixo
}

/* =====================================================================
   Versão 4 · Salas ao vivo
   ---------------------------------------------------------------------
   Chaves na memória temporária (CacheService), por sala s:
     sk:s          segredo de quem abriu a sala (o projetor do professor)
     se:s          estado publicado pelo professor (JSON): é o que os telemóveis leem
     sr:s          lista de quem entrou: { id do telemóvel: nomes }
     sm:s:r:u      mensagem do telemóvel u na ronda r (a resposta a uma pergunta,
                   o resultado de um jogo…)
   O script não sabe nada sobre os jogos: guarda e devolve. As regras estão
   em comum/aovivo.js (projetor) e respostas/vivo.js (telemóvel).
   ===================================================================== */
const SALA_TTL = 4 * 3600;          // segundos
const SALA_MAX = 80;                // telemóveis por sala
function mem() { return CacheService.getScriptCache(); }
function idSala(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); }
function idCurto(u, n) { return String(u || '').replace(/[^A-Za-z0-9]/g, '').slice(0, n || 16); }

/** Telemóveis (e projetor): ler o estado da sala. Com entrar=1 fica na lista de presenças. */
function salaVer(q) {
  const s = idSala(q.s), e = s && mem().get('se:' + s);
  if (e == null) return { ok: false, erro: 'sala', t: Date.now() };
  const u = idCurto(q.u);
  if (q.entrar && u) {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const lista = JSON.parse(mem().get('sr:' + s) || '{}');
      if (lista[u] !== undefined || Object.keys(lista).length < SALA_MAX) {
        lista[u] = limpar(q.n, 200);
        mem().put('sr:' + s, JSON.stringify(lista), SALA_TTL);
      }
    } finally { lock.releaseLock(); }
  }
  return { ok: true, e: JSON.parse(e), t: Date.now() };
}

function salaPost(d) {
  const s = idSala(d.s), c = mem();
  if (!s) return { ok: false, erro: 'sala' };
  if (d.op === 'env') {                                   // um telemóvel envia a sua jogada
    const u = idCurto(d.u), r = idCurto(d.r, 12);
    if (!u || !r || c.get('sk:' + s) == null) return { ok: false, erro: 'sala' };
    const txt = JSON.stringify(d.d == null ? null : d.d);
    if (txt.length > 6000) return { ok: false, erro: 'grande' };
    c.put('sm:' + s + ':' + r + ':' + u, txt, SALA_TTL);
    return { ok: true, t: Date.now() };
  }
  const k = limpar(d.k, 60), dono = c.get('sk:' + s);
  if (d.op === 'abrir') {
    if (k.length < 8) return { ok: false, erro: 'segredo' };
    if (dono != null && dono !== k) return { ok: false, erro: 'ocupada' };
    c.put('sk:' + s, k, SALA_TTL);
    c.put('se:' + s, JSON.stringify(d.e || { fase: 'espera' }), SALA_TTL);
    if (dono == null) c.put('sr:' + s, '{}', SALA_TTL);
    return { ok: true, t: Date.now() };
  }
  if (dono == null || dono !== k) return { ok: false, erro: 'segredo' };
  if (d.op === 'pub') {                                   // o professor muda o estado
    const txt = JSON.stringify(d.e || {});
    if (txt.length > 90000) return { ok: false, erro: 'grande' };
    c.put('se:' + s, txt, SALA_TTL);
    return { ok: true, t: Date.now() };
  }
  if (d.op === 'rec') {                                   // o professor recolhe as jogadas de uma ronda
    const lista = JSON.parse(c.get('sr:' + s) || '{}'), us = Object.keys(lista), r = idCurto(d.r, 12);
    const msgs = {};
    if (r && us.length) {
      const lidas = c.getAll(us.map(u => 'sm:' + s + ':' + r + ':' + u));
      us.forEach(u => { const x = lidas['sm:' + s + ':' + r + ':' + u]; if (x != null) msgs[u] = JSON.parse(x); });
    }
    return { ok: true, lista: lista, msgs: msgs, t: Date.now() };
  }
  if (d.op === 'fechar') { c.removeAll(['sk:' + s, 'se:' + s, 'sr:' + s]); return { ok: true }; }
  return { ok: false, erro: 'op' };
}

/** Fim de um jogo ao vivo: o projetor grava as linhas de todos de uma vez. */
function lote(d) {
  const disciplina = limpar(d.disciplina, 40) || 'CP 4', atividade = limpar(d.atividade, 80) || 'Atividade';
  const linhas = (Array.isArray(d.linhas) ? d.linhas : []).slice(0, SALA_MAX);
  if (!linhas.length) return { ok: true, n: 0 };
  const jogo0 = Array.isArray(linhas[0].jogo) ? linhas[0].jogo.slice(0, 30) : [];
  const esc0 = Array.isArray(linhas[0].escrita) ? linhas[0].escrita.slice(0, 20) : [];
  const folha = separador(nomeSeparador(disciplina, atividade), jogo0, esc0), agora = new Date();
  let n = 0;
  linhas.forEach((l, i) => {
    const jogo = Array.isArray(l.jogo) ? l.jogo.slice(0, 30) : [], escrita = Array.isArray(l.escrita) ? l.escrita.slice(0, 20) : [];
    const resp = jogo.map(j => (j.certa ? '✓ ' : '✗ ') + limpar(j.resposta, 200)).concat(escrita.map(x => limpar(x.resposta, 3000)));
    const quando = new Date(agora.getTime() + i * 1000);   // um segundo de diferença por equipa: é assim que a classificação as distingue
    (Array.isArray(l.nomes) ? l.nomes : [l.nome]).map(x => limpar(x, 80).trim()).filter(x => x).slice(0, 6).forEach(nome => {
      folha.appendRow([quando, nome, Number(l.pontos) || 0, (Number(l.certas) || 0) + ' / ' + (Number(l.total) || 0)].concat(resp).map(seguro));
      n++;
    });
  });
  return { ok: true, n: n };
}

/** A chave do professor: a primeira que for usada fica guardada nas propriedades do script. */
function chaveCerta(k) {
  k = limpar(k, 60);
  if (k.length < 4) return false;
  const p = PropertiesService.getScriptProperties(), guardada = p.getProperty('CHAVE_PROF');
  if (!guardada) { p.setProperty('CHAVE_PROF', k); return true; }
  return guardada === k;
}
/** Linhas de um separador, uma por aluno (a última que enviou). */
function ultimasLinhas(disciplina, atividade) {
  if (!PropertiesService.getScriptProperties().getProperty('FOLHA_ID')) return [];
  const sh = planilha().getSheetByName(nomeSeparador(disciplina, atividade).replace(/[\[\]\*\?\/\\:]/g, ' ').slice(0, 90));
  if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getValues(), ultima = {};
  for (let r = 1; r < v.length; r++) ultima[String(v[r][1]).trim().toLowerCase()] = r;
  return Object.keys(ultima).map(k => v[ultima[k]]);
}
/** Classificação com nomes (só para o projetor do professor). Quem respondeu no mesmo
    telemóvel (mesma data e mesmas respostas) aparece junto, como equipa. */
function ranking(disciplina, atividade, chave) {
  if (!chaveCerta(chave)) return { ok: false, erro: 'chave' };
  const grupos = {};
  ultimasLinhas(disciplina, atividade).forEach(l => {
    const quando = l[0] instanceof Date ? l[0].getTime() : String(l[0]);
    const id = quando + '|' + l[2] + '|' + l.slice(4).join('|');
    const g = grupos[id] = grupos[id] || { nomes: [], pontos: Number(l[2]) || 0, certas: String(l[3]), t: quando };
    g.nomes.push(String(l[1]));
  });
  const lista = Object.keys(grupos).map(k => grupos[k]).sort((a, b) => b.pontos - a.pontos || parseInt(b.certas, 10) - parseInt(a.certas, 10) || (a.t > b.t ? 1 : -1));
  return { ok: true, n: lista.length, linhas: lista.slice(0, 60).map(g => ({ nomes: g.nomes, pontos: g.pontos, certas: g.certas })) };
}
/** O lugar de uma pontuação na turma, sem nomes (para o telemóvel). */
function posicao(disciplina, atividade, pontos) {
  const l = ultimasLinhas(disciplina, atividade);
  return { ok: true, n: l.length, pos: 1 + l.filter(x => (Number(x[2]) || 0) > pontos).length };
}

/** Executar uma vez no editor (botão «Executar») para autorizar e testar: cria a folha e manda um email de teste. */
function testar() {
  const r = doPost({ postData: { contents: JSON.stringify({
    nome: 'Formando de teste', nomes: ['Formando de teste', 'Colega sem telemóvel'], atividade: 'Teste', pontos: 140, certas: 1, total: 1,
    jogo: [{ pergunta: 'Pergunta de teste?', resposta: 'Resposta certa', certa: true }],
    escrita: [{ pergunta: 'Pergunta escrita de teste', resposta: 'Isto é um teste.' }]
  }) } });
  Logger.log('Resultado: ' + r.getContent());   // {"ok":true} = tudo bem; {"ok":false,...} mostra o erro
  Logger.log('Folha: ' + planilha().getUrl());
}

/* ---- auxiliares ---- */
let _ss = null;
function planilha() {
  if (_ss) return _ss;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLHA_ID');
  if (id) {
    try {
      const ss = SpreadsheetApp.openById(id);
      if (ss.getName() !== NOME_FOLHA) ss.rename(NOME_FOLHA);   // acompanha uma mudança de NOME_FOLHA
      return (_ss = ss);
    } catch (e) { /* foi apagada: cria outra */ }
  }
  const ss = SpreadsheetApp.create(NOME_FOLHA);
  props.setProperty('FOLHA_ID', ss.getId());
  return (_ss = ss);
}
function separador(atividade, jogo, escrita) {
  const ss = planilha();
  const nome = atividade.replace(/[\[\]\*\?\/\\:]/g, ' ').slice(0, 90);
  let sh = ss.getSheetByName(nome);
  if (sh) return sh;
  // Só a criação do separador precisa de tranca: dois telemóveis podiam tentar criá-lo ao mesmo tempo.
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    sh = ss.getSheetByName(nome);           // outro envio pode tê-lo criado enquanto esperávamos
    if (sh) return sh;
    sh = ss.insertSheet(nome);
    const cab = ['Data', 'Nome', 'Pontos', 'Certas']
      .concat(jogo.map((j, k) => (k + 1) + ': ' + limpar(j.pergunta, 100)))
      // «Opinião», «Escala» e «Nuvem» podem aparecer nos gráficos da turma; «Escrita» nunca
      .concat(escrita.map((x, k) => (({ opiniao: 'Opinião', escala: 'Escala', nuvem: 'Nuvem' })[x.tipo] || 'Escrita') + ' ' + (k + 1) + ': ' + limpar(x.pergunta, 100)));
    sh.appendRow(cab.map(seguro));   // o cabeçalho segue a primeira resposta recebida
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, cab.length).setFontWeight('bold');
    const vazia = ss.getSheetByName('Sheet1') || ss.getSheetByName('Folha1') || ss.getSheetByName('Página1');
    if (vazia && ss.getSheets().length > 1) ss.deleteSheet(vazia);
    SpreadsheetApp.flush();
    return sh;
  } finally {
    lock.releaseLock();
  }
}
function limpar(s, max) { return String(s == null ? '' : s).slice(0, max); }
/** Impede que um texto começado por = + - @ seja lido como fórmula na folha. */
function seguro(v) { return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v; }
function resposta(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
