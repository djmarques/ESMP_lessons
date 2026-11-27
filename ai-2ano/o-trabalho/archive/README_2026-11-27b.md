# Área de Integração 11.º · O trabalho

Site interativo do tema-problema 6.1, para projetar na sala e para os alunos estudarem em casa. Tem 205 slides: seis lições, pela ordem em que são dadas, e depois os recursos extra.

1. O que é trabalhar? (física, economia, filosofia, Organização Internacional do Trabalho)
2. Do ócio ao dever (Aristóteles, São Bento, Lutero, Calvino, Weber)
3. Labor, obra e ação (Hannah Arendt)
4. História do trabalho I e II (cenas animadas: da recoleção ao comércio triangular; da manufatura aos sindicatos; a civilização industrial: energia, fábricas, crises)
5. Organizar o trabalho I (Smith, Taylor, Ford)
6. Do Toyotismo ao desemprego: uma só aula de 50 minutos com o Toyotismo, o teletrabalho, o direito do trabalho (com o contrato coletivo) e a taxa de desemprego, ligados por um tabuleiro 3D que atravessa a aula

Recursos extra (não foram dados nas aulas; ficam no fim do índice, para consulta e para os alunos mais curiosos): Organizar o trabalho II (a crise dos modelos, kaizen, automação, globalização, plataformas), Direito do trabalho (contratos, Constituição), Emprego e desemprego (setores de atividade, precariedade, consequências, medidas), Jovens, idade e formação, Currículo, entrevista e IA, Marx e os seus críticos.

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

## Lição 4b: a civilização industrial (novembro de 2026)

Bloco novo de 19 slides, entre a revisão da história do trabalho e «5 · Organizar o trabalho I», a partir do documento «Civilização industrial» (economia e sociedade; transformações económicas; novas fontes de energia; das oficinas às fábricas; as crises do capitalismo), mais as consequências na cidade (o rio, o ar, a mariposa) e a luta pelos direitos. Três a quatro aulas.

| Ficheiro | O que tem |
| --- | --- |
| `industria3d.js` | Cinco animações 3D (comboio a vapor, motor de quatro tempos, turbina e dínamo, fiação de algodão dia e noite, cidade industrial). Um só desenhador 3D para todas; cada animação é uma tabela de passos, por isso a seta para trás funciona. Precisa de `assets/vendor/three.min.js` (three.js 160, guardado no site para funcionar sem internet) |
| `civind.js` | As peças 2D: a calculadora da força do vapor (F = p × A), os três ciclos económicos e o modelo animado da cascata da crise (equações diferenciais resolvidas no navegador) |
| `vapor.js`, `vapor.css` | A física da máquina a vapor, uma ideia por slide (slides `s-fv-*`, novembro de 2026): o comboio que se desfaz no esquema fornalha → caldeira → cilindro e pistão → roda; a caldeira com moléculas e barra da temperatura; F = p × A; W = F × d; P = W ÷ t; rendimento; indução (íman e bobina). As barras são partilhadas entre slides. Inclui o estilo dos slides «Problema» (com espaço em branco para resolver no quadro) e «Resolução» (um passo por clique) |
| `ficha-vapor.html`, `ficha-vapor-resolucao.html` | Ficha de trabalho em formato de prova (capa, tabela de constantes, formulário, 3 grupos com 10 itens, cotações num total de 200 pontos) e os critérios de classificação com a resolução passo a passo. A versão anterior, de uma página, está em `archive/ficha-vapor_2026-11-24.html`; a versão longa, com 5 grupos e 17 itens, em `archive/ficha-vapor_2026-11-24b.html` |

- As legendas das animações estão no `index.html` (um `<p>` por passo, dentro de `.i3d-leg`); os textos das etiquetas sobre a imagem estão no `industria3d.js`, procurando por `S.label(`.
- Som: o botão do altifalante, no canto das animações, liga e desliga o som de todo o site (o mesmo dos jogos).
- Atividades no telemóvel: `ci-oficina` (oficina ou fábrica), `ci-ia` (debate sobre a inteligência artificial generativa) e `ci-cascata` (fase depressiva ou expansiva), no `atividades.js`.
- Sem WebGL (computadores muito antigos), as animações não aparecem, mas as legendas contam a história.

## Civilização industrial: indução, mariposas e previsões (23 de novembro de 2026)

- **«Animação: turbina e dínamo»** (`s-ci-dinamo`): a animação 3D está dentro do quadro escuro, ao lado de um osciloscópio (fluxo e tensão) e de uma equação de cada vez. A cena está em `industria3d.js` (secção 3); os textos e as equações estão no `index.html`. Os números que mudam têm `data-ind="…"` e são preenchidos pela cena.
- **Mariposas** (`s-ci-mariposa-caca`, `s-ci-mariposa-dados`, `s-ci-mariposa-geracoes`): o jogo e o modelo estão em `civind.js` (secções 7 e 8). Os números das experiências reais estão escritos no `index.html` (cartões `md-grelha`).
- **Previsões** (`ci-prev`): a turma vota antes de ver a resposta. Para criar outra, copia o bloco `<div class="ci-prev" data-certa="c">` (acrescenta a classe `claro` num slide de fundo branco) e muda as opções; `data-certa` diz qual é a certa.
- **Colunas lado a lado dentro de um slide 3D**: a classe `lado-a-lado` na grelha diz ao `industria3d.js` que a coluna vizinha não fica por baixo da animação (para calcular a altura).
- A versão anterior destes ficheiros está em `archive/`, com a data 2026-11-23.


## 24 de novembro de 2026: física da máquina a vapor refeita

O slide `s-ci-vapor-fisica` (oito fórmulas num só slide) foi substituído por sete slides `s-fv-ponte`, `s-fv-pressao`, `s-fv-forca`, `s-fv-trabalho`, `s-fv-potencia`, `s-fv-rendimento`, `s-fv-mapa`, mais `s-fv-inducao` antes da animação do dínamo, e por cinco problemas com resolução (`s-fv-p1` a `s-fv-p5`, `s-fv-r1` a `s-fv-r5`). A versão anterior está em `archive/index_2026-11-24.html`; o código do slide antigo continua em `civind.js` (sem efeito enquanto o slide não existir).

## 27 de novembro de 2026: aula compacta «Do Toyotismo ao desemprego»

Faltava dar tudo o que vinha depois de «5 · Organizar o trabalho I» e só havia uma aula de 50 minutos antes do teste. A lição «6 · Do Toyotismo ao desemprego» junta, por esta ordem, 12 slides que já existiam e 8 novos:

| Paragem | Slides |
| --- | --- |
| 1 · A fábrica | `s-sx-abertura` (novo, 3D), `s-o-toyota`, `s-tres-modelos`, `s-o-modelos-ie`, `s-o-modelos-mm` |
| 2 · A casa | `s-sx-casa` (novo, 3D), `s-o-teletrabalho`, `s-o-tele-jogo`, `s-o-tele-tabela` |
| 3 · A mesa das regras | `s-sx-mesa` (novo, 3D), `s-balanca`, `s-codigo`, `s-sx-coletivo` (novo: cena do contrato coletivo), `s-sx-coletivo-jogo` (novo: certo ou errado) |
| 4 · A fila do desemprego | `s-sx-fila` (novo, 3D), `s-e-desempregado`, `s-e-taxa-cena`, `s-taxa` |
| Fecho | `s-sx-fim` (novo, 3D), `s-sx-jogo` (novo: jogo de 8 perguntas, duas por paragem) |

- Nenhum slide foi apagado nem alterado por dentro: os 12 mudaram de sítio (o endereço `#s-…` é o mesmo) e todos os outros ficaram, pela ordem antiga, em grupos «Extra · …» no fim do índice.
- Os slides novos começam por `s-sx-`. A cena do contrato coletivo usa as mesmas figuras das outras cenas; a regra que troca o contrato individual pelo coletivo está no fim do `style.css`.
- As atividades no telemóvel continuam a funcionar: dependem do endereço do slide, que não mudou. O questionário e o jogo novos ganham sozinhos o botão do telemóvel (ver `comum/LEIA-ME.md`).
- Para voltar à ordem antiga: os quatro ficheiros de antes estão em `archive/`, com a data 2026-11-27 (`index`, `notes`, `style`, `README`); o `percurso3d.js` pode ficar, porque sem os slides `s-sx-…` não faz nada.

### O tabuleiro 3D que atravessa a aula (`percurso3d.js`)

Um só tabuleiro com quatro paragens (a fábrica, a casa, a mesa das regras, a fila do desemprego). O trabalhador (a peça laranja com o ponto branco) caminha de paragem em paragem. A mesma cena aparece em cinco slides, e cada um retoma a história onde o anterior a deixou:

| Slide | Momentos | O que se vê |
| --- | --- | --- |
| `s-sx-abertura` | 0 a 2 | o tabuleiro inteiro; a crise do Fordismo (linha e armazém cheio); a Toyota (a encomenda, depois o produto) |
| `s-sx-casa` | 2 a 3 | o trabalhador vai para casa; o portátil liga-se à empresa |
| `s-sx-mesa` | 3 a 5 | um trabalhador e um empregador, contrato individual; depois o sindicato, a associação de empregadores e o contrato coletivo |
| `s-sx-fila` | 5 a 7 | a fábrica sai do tabuleiro; a fila; a conta da taxa (16 pessoas, 6 inativas, 10 ativas, 2 desempregadas: 20 %) |
| `s-sx-fim` | 8 | o tabuleiro inteiro, com uma ideia por paragem |

- A história é uma tabela: no `percurso3d.js`, `SCRIPT` diz onde está cada peça a partir de cada momento, `SHOTS` diz o que a câmara enquadra, e as etiquetas estão em `label(…)`. As legendas por baixo da imagem estão no `index.html` (um `<p>` por clique, dentro de `.i3d-leg`).
- Um slide mostra o momento `BASE[id do slide]` mais o número de cliques dados. Para o tabuleiro aparecer noutro slide, cria o slide com as classes `ci i3d-slide p3d` e acrescenta o seu endereço a `BASE`.
- Usa o `assets/vendor/three.min.js` e o aspeto das outras animações 3D (classes `.i3d-…`), mas tem o seu próprio desenhador. Sem WebGL, as legendas contam a história.
