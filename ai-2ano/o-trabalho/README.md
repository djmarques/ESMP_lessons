# Área de Integração 11.º · O trabalho

Site interativo do tema-problema 6.1, para projetar na sala e para os alunos estudarem em casa. Tem 120 slides em 10 lições:

1. O que é trabalhar? (física, economia, filosofia, Organização Internacional do Trabalho)
2. Do ócio ao dever (Aristóteles, São Bento, Lutero, Calvino, Weber)
3. Labor, obra e ação (Hannah Arendt)
4. Direito do trabalho (Código do Trabalho, contratos, Constituição)
5. Teatro: o trabalho em cena (quatro cenas, juízes, debate)
6. História do trabalho (versão curta, com uma galeria de dez quadros)
7. Organizar o trabalho (Smith, Taylor, Ford, Toyota, Tempos Modernos)
8. Marx e os seus críticos (mais-valia, alienação, Böhm-Bawerk, Friedman)
9. O mercado de trabalho hoje (desemprego e como se mede)
10. Currículo e entrevista (construtor de currículo e treino em trios)

Cada lição tem um ou dois **jogos** de escolha múltipla (10 jogos, 78 perguntas): uma pergunta de cada vez, 20 segundos por pergunta, pontos com bónus de rapidez e som de acerto e de erro. Teclas 1 a 4 escolhem a resposta; Enter passa à seguinte; o botão do altifalante liga e desliga o som. As perguntas de escolha múltipla do fim das lições ficaram como **Revisão**, para os alunos estudarem em casa.

Os quadros estão em `assets/` (domínio público, Wikimedia Commons).

É HTML, CSS e JavaScript simples: não precisa de instalação nem de compilação. Funciona aberto diretamente no navegador (duplo clique em `index.html`) e no GitHub Pages.

## Ficheiros

| Ficheiro | O que tem |
| --- | --- |
| `index.html` | Todo o conteúdo: um `<section class="slide">` por slide |
| `cv.html` | Construtor de currículo: os alunos escrevem à esquerda e veem a folha A4 à direita; imprime ou guarda em PDF. Nada é enviado: o rascunho fica só naquele navegador |
| `style.css` | Aspeto (cores e tipos de letra da apresentação original) |
| `app.js` | Comportamento: navegação, passos, questionários, simulações, temporizadores, códigos QR |
| `notes.js` | Notas do professor, uma por slide (inclui as notas da apresentação original) |

## Atalhos na sala

| Tecla | Ação |
| --- | --- |
| `→`, espaço, Page Down | Passo seguinte (ou slide seguinte) |
| `←`, Page Up | Passo anterior (ou slide anterior) |
| `Home` / `End` | Primeiro / último slide |
| `N` | Mostrar ou esconder as notas do professor |
| `F` | Ecrã inteiro |

No telemóvel ou num quadro interativo, desliza para a esquerda ou para a direita. Cada slide tem endereço próprio (por exemplo `…/ai-2ano/o-trabalho/#s-roleplay`).

## Acrescentar ou editar um slide

Copia um `<section class="slide">` parecido, cola-o onde o queres e muda:

```html
<section class="slide" id="s-novo" data-lesson="4 · Direito do trabalho" data-title="Nome curto no índice">
  <p class="kicker">Etiqueta pequena</p>
  <h2>Título do slide</h2>
  <div class="card" data-step="1">Aparece no primeiro clique.</div>
  <p class="ask" data-step="2">Pergunta final, a laranja.</p>
</section>
```

- `id` tem de ser único e começar por `s-` (é o endereço do slide).
- `data-lesson` agrupa o slide no índice; um nome novo cria um grupo novo.
- `data-step="n"` faz o elemento aparecer no passo n. Sem `data-step`, aparece logo.
- Para as notas do professor, acrescenta em `notes.js` uma linha `"s-novo": "texto das notas",`.

Peças disponíveis: `card` (variantes `blue`, `peach`, `dark`), `grid g2` / `g3` / `g4`, cartões que viram (`flip`), votação de braço no ar (`poll`), questionários (`quiz`), jogos com tempo e som (`game`), temporizador (`timer` com `data-seconds`), pesquisa com código QR (`research`) e simulações com barras deslizantes (`sim`).

## Atualizar os números

Os dados do desemprego (slides «A taxa de desemprego» e «Quantos estão sem trabalho?») são do Instituto Nacional de Estatística, 3.º trimestre de 2026. Quando sair o trimestre seguinte, muda os valores no `index.html`: procura por `5,5 %`, `19,9 %` e `value="316.8"` (o valor inicial da barra deslizante, com ponto).
