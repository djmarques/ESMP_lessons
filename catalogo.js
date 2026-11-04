/* =====================================================================
   catalogo.js — lista de disciplinas e temas mostrados na página inicial.
   ---------------------------------------------------------------------
   Para acrescentar um tema: copia uma linha de `temas` e muda os campos.
     titulo     nome do tema, como aparece no cartão
     descricao  uma frase curta
     pasta      caminho da pasta do site do tema, a partir da raiz do
                repositório, terminado em "/". Sem pasta = "em preparação".
   Para acrescentar uma disciplina: copia um bloco { ... } inteiro.
   Kept as a .js file (not JSON) so the page works from a local file and
   on GitHub Pages without fetch().
   ===================================================================== */
window.CATALOGO = [
  {
    disciplina: 'Área de Integração',
    nivel: '3.º ano · 12.º · Ensino profissional',
    publico: 'profissional',
    temas: [
      { titulo: 'Cidadania europeia', descricao: 'Tema-problema 5.2: a União Europeia e o que significa ser cidadão europeu.', pasta: 'ai-3ano/cidadania-europeia/' },
      { titulo: 'Cultura global ou globalização das culturas?', descricao: 'Tema-problema 7.1.' },
    ],
  },
  {
    disciplina: 'Área de Integração',
    nivel: '2.º ano · 11.º · Ensino profissional',
    publico: 'profissional',
    temas: [
      { titulo: 'O trabalho', descricao: 'Tema-problema 6.1.' },
    ],
  },
  {
    disciplina: 'Psicologia',
    nivel: 'Ensino profissional',
    publico: 'profissional',
    temas: [
      { titulo: 'Processos cognitivos, emocionais e motivacionais', descricao: 'Módulo 4.' },
    ],
  },
  {
    disciplina: 'Cultura, Língua e Comunicação',
    nivel: 'CLC 6 · Formação de adultos',
    publico: 'adultos',
    temas: [
      { titulo: 'Culturas de urbanismo e mobilidade', descricao: 'Programa da unidade · DR1: a casa e o lar · arquitetura hostil.', pasta: 'clc6/' },
    ],
  },
];
