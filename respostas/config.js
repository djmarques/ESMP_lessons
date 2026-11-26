/* config.js — endereço do recetor de respostas (Google Apps Script), comum a
   todas as disciplinas, e o nome de cada disciplina tal como aparece nos
   separadores da folha «Avaliação contínua». Ver LEIA-ME.md. */
window.CONFIG = {
  // música de fundo nos jogos com tempo, no telemóvel ou computador de cada aluno (cada um pode
  // desligá-la no botão da nota musical). false = sem música nos aparelhos dos alunos; os sons
  // curtos (certo, errado, tempo a acabar) continuam. A música do projetor não depende disto.
  MUSICA_ALUNOS: true,
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyWAfWQqYBffae5hjqFVwKwkcvFEa5H640loxPTnsVuNRNps7cjP4Lp-wMq_MhJGD00Ng/exec',
  // pasta do site da aula → disciplina (usada nos questionários lidos dos slides
  // e nas perguntas rápidas; as atividades de atividades.js trazem a sua)
  DISCIPLINAS: {
    'ai-2ano/o-trabalho': 'AI 11.º',
    'ai-3ano/cidadania-europeia': 'AI 12.º',
    'psicologia/m4-aprendizagem': 'Psicologia',
    'clc6': 'CLC 6',
    'clc3': 'CLC 3',
    'cp4': 'CP 4',
    'cp2': 'CP 2',
    'demo': 'Demonstração'
  }
};
