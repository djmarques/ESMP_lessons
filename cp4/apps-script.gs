/**
 * Recetor de respostas dos sites das aulas (Google Apps Script).
 * ---------------------------------------------------------------------
 * Recebe as respostas que os alunos enviam do telemóvel (respostas/ e
 * cp4/aluno.html), escreve-as numa folha de cálculo do Google (um separador
 * por disciplina e atividade) e responde {ok:true} ao telemóvel, que só
 * então mostra «Respostas recebidas». O email por envio está desligado.
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
    const nome = limpar(d.nome, 80) || '(sem nome)';
    // pedidos antigos do CP 4 não trazem disciplina
    const disciplina = limpar(d.disciplina, 40) || 'CP 4';
    const atividade = limpar(d.atividade, 80) || 'Atividade';
    const jogo = Array.isArray(d.jogo) ? d.jogo.slice(0, 30) : [];
    const escrita = Array.isArray(d.escrita) ? d.escrita.slice(0, 20) : [];
    const agora = new Date();

    // 1. Folha de cálculo: um separador por atividade, uma linha por formando
    const folha = separador(disciplina === 'CP 4' ? atividade : disciplina + ' · ' + atividade, jogo, escrita);
    const linha = [agora, nome, Number(d.pontos) || 0, (Number(d.certas) || 0) + ' / ' + (Number(d.total) || 0)]
      .concat(jogo.map(j => (j.certa ? '✓ ' : '✗ ') + limpar(j.resposta, 200)))
      .concat(escrita.map(x => limpar(x.resposta, 3000)));
    folha.appendRow(linha.map(seguro));

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

/** Abrir o endereço /exec no navegador mostra esta mensagem: serve para confirmar que está a funcionar. */
function doGet() {
  return ContentService.createTextOutput('O recetor de respostas das aulas está a funcionar.');
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
      .concat(escrita.map((x, k) => 'Escrita ' + (k + 1) + ': ' + limpar(x.pergunta, 100)));
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
