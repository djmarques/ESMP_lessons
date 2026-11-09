/**
 * Recetor de respostas do site CP 4 (Google Apps Script).
 * ---------------------------------------------------------------------
 * Recebe as respostas que os formandos enviam do telemóvel (aluno.html),
 * escreve-as numa folha de cálculo do Google (um separador por atividade)
 * e envia um email ao formador com o nome, a data e as respostas.
 *
 * Como instalar: ver LEIA-ME-telemovel.md. Em resumo: script.google.com →
 * Novo projeto → colar este código → Implementar → Nova implementação →
 * Aplicação Web (Executar como: Eu; Quem tem acesso: Qualquer pessoa).
 */

// Para onde vão os emails. Vazio = o email da conta Google que instalou o script.
const EMAIL_FORMADOR = '';
// Nome da folha de cálculo criada automaticamente no Google Drive.
const NOME_FOLHA = 'CP 4 · respostas dos formandos';
// Pôr false para deixar de receber um email por cada envio (as respostas continuam a ir para a folha).
const ENVIAR_EMAIL = true;

/** Chamado pelo telemóvel do formando quando carrega em «Enviar». */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);                       // dois envios ao mesmo tempo não se atropelam
  try {
    const d = JSON.parse(e.postData.contents);
    const nome = limpar(d.nome, 80) || '(sem nome)';
    const atividade = limpar(d.atividade, 80) || 'Atividade';
    const jogo = Array.isArray(d.jogo) ? d.jogo.slice(0, 30) : [];
    const escrita = Array.isArray(d.escrita) ? d.escrita.slice(0, 20) : [];
    const agora = new Date();

    // 1. Folha de cálculo: um separador por atividade, uma linha por formando
    const folha = separador(atividade, jogo, escrita);
    const linha = [agora, nome, Number(d.pontos) || 0, (Number(d.certas) || 0) + ' / ' + (Number(d.total) || 0)]
      .concat(jogo.map(j => (j.certa ? '✓ ' : '✗ ') + limpar(j.resposta, 200)))
      .concat(escrita.map(x => limpar(x.resposta, 3000)));
    folha.appendRow(linha.map(seguro));

    // 2. Email
    if (ENVIAR_EMAIL && MailApp.getRemainingDailyQuota() > 0) {
      const data = Utilities.formatDate(agora, 'Europe/Lisbon', 'dd/MM/yyyy HH:mm');
      let corpo = nome + '\n' + atividade + ' · ' + data + '\n\n';
      if (jogo.length) {
        corpo += 'JOGO: ' + d.certas + ' / ' + d.total + ' certas · ' + d.pontos + ' pontos\n';
        jogo.forEach((j, k) => { corpo += (k + 1) + '. ' + limpar(j.pergunta, 200) + '\n   ' + (j.certa ? '✓ ' : '✗ ') + limpar(j.resposta, 200) + '\n'; });
        corpo += '\n';
      }
      if (escrita.length) {
        corpo += 'RESPOSTAS ESCRITAS\n';
        escrita.forEach((x, k) => { corpo += '\n' + (k + 1) + '. ' + limpar(x.pergunta, 300) + '\n' + (limpar(x.resposta, 3000) || '(em branco)') + '\n'; });
      }
      corpo += '\nTodas as respostas: ' + planilha().getUrl();
      MailApp.sendEmail(EMAIL_FORMADOR || Session.getEffectiveUser().getEmail(), 'CP 4 · ' + atividade + ' · ' + nome + ' · ' + data, corpo);
    }
    return resposta({ ok: true });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Abrir o endereço /exec no navegador mostra esta mensagem: serve para confirmar que está a funcionar. */
function doGet() {
  return ContentService.createTextOutput('O recetor de respostas do CP 4 está a funcionar.');
}

/** Executar uma vez no editor (botão «Executar») para autorizar e testar: cria a folha e manda um email de teste. */
function testar() {
  const r = doPost({ postData: { contents: JSON.stringify({
    nome: 'Formando de teste', atividade: 'Teste', pontos: 140, certas: 1, total: 1,
    jogo: [{ pergunta: 'Pergunta de teste?', resposta: 'Resposta certa', certa: true }],
    escrita: [{ pergunta: 'Pergunta escrita de teste', resposta: 'Isto é um teste.' }]
  }) } });
  Logger.log('Resultado: ' + r.getContent());   // {"ok":true} = tudo bem; {"ok":false,...} mostra o erro
  Logger.log('Folha: ' + planilha().getUrl());
}

/* ---- auxiliares ---- */
function planilha() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLHA_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* foi apagada: cria outra */ } }
  const ss = SpreadsheetApp.create(NOME_FOLHA);
  props.setProperty('FOLHA_ID', ss.getId());
  return ss;
}
function separador(atividade, jogo, escrita) {
  const ss = planilha();
  const nome = atividade.replace(/[\[\]\*\?\/\\:]/g, ' ').slice(0, 90);
  let sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    const cab = ['Data', 'Nome', 'Pontos', 'Certas']
      .concat(jogo.map((j, k) => 'Jogo ' + (k + 1) + ': ' + limpar(j.pergunta, 100)))
      .concat(escrita.map((x, k) => 'Escrita ' + (k + 1) + ': ' + limpar(x.pergunta, 100)));
    sh.appendRow(cab.map(seguro));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, cab.length).setFontWeight('bold');
    const vazia = ss.getSheetByName('Sheet1') || ss.getSheetByName('Folha1') || ss.getSheetByName('Página1');
    if (vazia && ss.getSheets().length > 1) ss.deleteSheet(vazia);
  }
  return sh;
}
function limpar(s, max) { return String(s == null ? '' : s).slice(0, max); }
/** Impede que um texto começado por = + - @ seja lido como fórmula na folha. */
function seguro(v) { return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v; }
function resposta(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
