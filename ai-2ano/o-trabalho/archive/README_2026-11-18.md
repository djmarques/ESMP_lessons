# Área de Integração 11.º · O trabalho

Site interativo do tema-problema 6.1, para projetar na sala e para os alunos estudarem em casa. Tem 157 slides em 9 lições, pela ordem em que são dadas, mais uma lição extra:

1. O que é trabalhar? (física, economia, filosofia, Organização Internacional do Trabalho)
2. Do ócio ao dever (Aristóteles, São Bento, Lutero, Calvino, Weber)
3. Labor, obra e ação (Hannah Arendt)
4. História do trabalho I e II (cenas animadas: da recoleção ao comércio triangular; da manufatura aos sindicatos)
5. Organizar o trabalho I e II (Smith, Taylor, Ford, Toyota; automação, globalização, teletrabalho, plataformas)
6. Direito do trabalho (Código do Trabalho, contratos, Constituição)
7. Emprego e desemprego (setores de atividade, precariedade, taxa de desemprego, consequências, medidas)
8. Jovens, idade e formação (primeiro emprego, idadismo, educação e formação ao longo da vida, trabalho digno)
9. Currículo, entrevista e IA (construtor de currículo, assistente de inteligência artificial, treino em trios)

Extra: Marx e os seus críticos (mais-valia, alienação, Böhm-Bawerk, Friedman).

A lição de teatro («O trabalho em cena») foi arquivada: está em `archive/index_2026-11-11.html`.

Cada lição tem um ou dois **jogos** de escolha múltipla : uma pergunta de cada vez, 20 segundos por pergunta, pontos com bónus de rapidez e som de acerto e de erro. Teclas 1 a 4 escolhem a resposta; Enter passa à seguinte; o botão do altifalante liga e desliga o som. As perguntas de escolha múltipla do fim das lições ficaram como **Revisão**, para os alunos estudarem em casa.

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

## Cenas animadas (lições 6 e 7)

Os slides com a classe `cena` têm um desenho SVG (`.palco`) em que o trabalhador é sempre a figura laranja com um ponto branco no peito e quem manda é a figura azul-escura. Por baixo ficam as definições (`ddef mini`) e a «ficha» com as mesmas perguntas em todas as épocas (`ficha`).

- `data-step="n"` continua a fazer aparecer elementos, dentro e fora do desenho.
- Para mover ou trocar coisas num clique, o `app.js` acrescenta ao slide as classes `ge1`, `ge2`… («o passo é pelo menos n»). As regras de cada cena estão no fim do `style.css` (por exemplo `#s-h-exodo.ge3 #exo-g { transform: translateX(345px) }`).
- `data-steps="n"` no `<section>` indica quantos cliques tem a cena.

A versão anterior destas lições (com a galeria de dez quadros) está em `archive/`, com a data 2026-11-11.

## Atualizar os números

Os slides «Porque é tão difícil o primeiro emprego?», «O trabalho dá mais do que um salário» e «Idadismo» também têm números do Instituto Nacional de Estatística (5,5 %, 19,9 %, 36,8 %, 6 em cada 10): atualiza-os quando mudarem.

Os dados do desemprego (slides «A taxa de desemprego» e «Quantos estão sem trabalho?») são do Instituto Nacional de Estatística, 3.º trimestre de 2026. Quando sair o trimestre seguinte, muda os valores no `index.html`: procura por `5,5 %`, `19,9 %` e `value="316.8"` (o valor inicial da barra deslizante, com ponto).
