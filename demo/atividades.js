/* demo/atividades.js — uma atividade de demonstração com todos os tipos de
   pergunta, para experimentar no telemóvel:  respostas/?f=demo&a=experimentar
   Serve também de modelo para copiar para o atividades.js de uma aula.
   As respostas vão para o separador «Demonstração · Experimentar…» da folha. */
window.ATIVIDADES = {
  experimentar: {
    disciplina: 'Demonstração',
    titulo: 'Experimentar os tipos de pergunta',
    passos: [
      // nuvem: até `max` palavras por aluno; no projetor aparece a nuvem e pode abrir-se como grafo
      { tipo: 'nuvem', p: 'Que palavras associas a «escola»?', max: 3 },
      // vf: verdadeiro ou falso, com resposta certa (c: true/false) e explicação (f)
      { tipo: 'vf', titulo: 'Verdadeiro ou falso?', afirmacoes: [
        { t: 'Uma semana tem sete dias.', c: true, f: 'De segunda-feira a domingo.' },
        { t: 'Um minuto tem cem segundos.', c: false, f: 'Tem sessenta.' }
      ] },
      // escala sem valor certo: opinião; no fim aparece o histograma e a média da turma
      { tipo: 'escala', titulo: 'Onde te situas?', p: 'Gosto de responder no telemóvel durante a aula.', min: 1, max: 10, etiquetas: ['Nada', 'Muito'] },
      // escala com valor certo (c) e tolerância: estimativa, conta para «certas»
      { tipo: 'escala', titulo: 'Estimativa', p: 'Quantos minutos tem uma hora e meia?', min: 0, max: 200, passo: 5, c: 90, tolerancia: 5, unidade: 'minutos', f: '60 + 30 = 90.' },
      // jogo: escolha múltipla com tempo (segundos: 0 tira o tempo)
      { tipo: 'jogo', segundos: 20, perguntas: [
        { p: 'Quantos meses tem um ano?', o: ['10', '12', '14'], c: 1, f: 'De janeiro a dezembro.' }
      ] },
      // opiniao: escolha sem resposta certa; aparece em barras
      { tipo: 'opiniao', p: 'Preferes responder sozinho ou com um colega?', o: ['Sozinho', 'Com um colega', 'Tanto faz'] },
      // escrita: texto livre; só o professor vê
      { tipo: 'escrita', titulo: 'Por palavras tuas', perguntas: ['O que mudavas nestas atividades?'] }
    ]
  }
};
