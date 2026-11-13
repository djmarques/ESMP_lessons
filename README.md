# Aulas · Daniel Marques

Página inicial e sites interativos das aulas, prontos para o GitHub Pages.

## Estrutura

```
index.html          página inicial (lista de disciplinas e temas)
catalogo.js         a lista que a página inicial mostra: edita só este ficheiro
.nojekyll           diz ao GitHub Pages para servir os ficheiros tal como estão
comum/              ferramentas iguais em todas as aulas: telemóvel em todos os questionários,
                    respostas da turma, quadro, grafo de vocabulário, pergunta rápida (ver comum/LEIA-ME.md)
respostas/          página do aluno no telemóvel e script da folha «Avaliação contínua»
demo/               atividade de demonstração com todos os tipos de pergunta
clc6/               CLC 6 · Culturas de urbanismo e mobilidade
cp4/                CP 4 · Processos identitários
ai-3ano/
  cidadania-europeia/   Área de Integração 12.º · Cidadania europeia (copiar para aqui)
```

Cada tema é um site independente na sua pasta (ver o README dentro de `clc6/` para editar slides, questionários e pesquisas).

## Publicar

1. Cria um repositório no GitHub (por exemplo `aulas`) e carrega todo o conteúdo desta pasta para a raiz.
2. **Settings → Pages → Build and deployment → Deploy from a branch**, ramo `main`, pasta `/ (root)`, **Save**.
3. O site fica em `https://<o-teu-utilizador>.github.io/aulas/`. Cada tema tem o seu endereço, por exemplo `…/aulas/clc6/`.

## Acrescentar um tema ou uma disciplina

1. Põe a pasta do site do tema dentro da pasta da disciplina (por exemplo `ai-2ano/o-trabalho/`).
2. Em `catalogo.js`, acrescenta ou completa a linha do tema com `pasta: 'ai-2ano/o-trabalho/'`.

Um tema sem `pasta` aparece na página inicial como «Em preparação».

Usa só letras minúsculas, números e hífenes nos nomes das pastas (sem espaços nem acentos): os endereços ficam mais simples e não há problemas no GitHub.
