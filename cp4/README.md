# CP 4 · Processos identitários

Site interativo da unidade Cidadania e Profissionalidade 4 (formação de adultos), para projetar na sala. Tem 186 slides: o programa e os blocos dos quatro Domínios de Referência (DR), mais o projeto de grupo.

- **DR1 · Da identidade à alteridade**: 1. o nome e o reconhecimento; 2. o navio de Teseu; 3. Phineas Gage e o outro; 4. identidade pessoal e social; 5. como tratar o outro (empatia, igualdade e equidade, diversidade, intolerância).
- **DR2 · Deontologia na construção da cultura organizacional**: 1. ética do dever e das consequências (Kant e Mill); 2. organizações verticais e horizontais; 3. códigos de conduta, pertença e lealdade, equipas multiculturais; 4. motivação (Maslow, Herzberg), convergência de objetivos, metas SMART.
- **DR3 · Políticas públicas de inclusão**: 1. concertação social, tipos de políticas públicas, organismos de combate à discriminação, direitos políticos e associativos; 2. impactos das migrações, unidade na diversidade, educação para a cidadania.
- **DR4 · Uma nova identidade europeia**: 1. dimensão supranacional, documentos da construção europeia, governos e sociedade civil, cidadania europeia; 2. património comum da humanidade, respeito e solidariedade, cidadania mundial.
- **Projeto de grupo**: quatro oficinas, uma por DR, e as apresentações finais. Substitui a apresentação oral no fim de cada DR (o slide da apresentação do DR1 foi mantido e adaptado, na oficina do DR1).

Os blocos estão orientados para a prática e para o mundo do trabalho: cada exercício tem uma etiqueta que diz como se faz (folha em branco, computador ou telemóvel, em pares, em grupos), e cada bloco fecha com um slide «Para que serve?». As versões anteriores estão em `archive/`.

## Etiquetas DR

Cada slide diz que Domínios de Referência mobiliza: `<section class="slide" … data-dr="1,3">`. A partir daí, o `app.js` mostra: em baixo, à esquerda, as quatro etiquetas DR1 a DR4, com as do slide atual a cores; no índice, um ponto de cor por DR ao lado de cada slide e os botões **Todos · DR1 · DR2 · DR3 · DR4**, que mostram só os slides de um domínio; no slide «Onde está cada DR?» (`<div class="drmatrix">`), um quadro blocos × DR, gerado sozinho. Para mudar uma etiqueta, edita o `data-dr` do slide.

## Projeto de grupo

Um PowerPoint por grupo sobre um caso ou um tema, com os quatro DR: em cada DR, pelo menos um slide com uma ideia, um com um caso real e um com o que se faz. O slide «O trabalho de grupo: quatro DR» (programa) apresenta-o. Cada oficina tem a abertura e o slide «O que o DR pede» (os três critérios de evidência do referencial, em linguagem simples). Atividades no telemóvel: `grupo`, `proj1` a `proj4`, `pares`, `fecho`.

## Oficinas de escrita (26 de novembro de 2026)

Oito slides novos, um por tema do manual da Areal Editores (UFCD 4, «Processos identitários») que ainda não tinha slide próprio ou exercício de texto. Cada um dá o essencial do tema em cartões e pede um texto, escrito no telemóvel e recolhido na folha «Avaliação contínua» (um separador por texto, com o plano e o texto em colunas «Escrita»).

| Slide | Bloco | Tema do manual | Texto pedido | Atividade |
| --- | --- | --- | --- | --- |
| `s-esc-racismo` | DR1.5 | 5 Racismo · 13 Discurso de Martin Luther King | comentário | `esc-racismo` |
| `s-esc-genero` | DR1.5 | 6 Desigualdades de género · 7 A mulher na modernidade | texto de opinião | `esc-genero` |
| `s-esc-sigilo` | DR2.3 | 11 Sigilo profissional | resposta fundamentada a um caso | `esc-sigilo` |
| `s-esc-migracoes` | DR3.2 | 14 a 17 Migrações e acolhimento | relato | `esc-migracoes` |
| `s-esc-valores` | DR4.1 | 19 Liberdade, responsabilidade, justiça e democracia | texto expositivo | `esc-valores` |
| `s-esc-schengen` | DR4.1 | 24 O espaço e a cooperação Schengen | texto argumentativo | `esc-schengen` |
| `s-esc-patrimonio` | DR4.2 | 20 a 23 Património cultural português | texto de candidatura | `esc-patrimonio` |
| `s-esc-final` | Apresentações finais | 25 Atividade aglutinadora: igualdade e combate à discriminação na União Europeia | texto de síntese, individual | `esc-final` |

Os slides têm a classe `oficina` (regras no fim do `style.css`): cartões compactos em duas colunas e, em baixo, o texto pedido ao lado do código QR. Para criar outra oficina, copia um destes slides e uma das atividades `esc-…` no fim do `atividades.js`. Os dois filmes propostos pelo manual (temas 12 e 18) não foram incluídos. Dados com data: diferença salarial de 12,5% (remuneração base, 2023); 29 países no espaço Schengen (2026).

## Atividades novas (novembro de 2026)

As atividades `grupo`, `codigo`, `meta`, `motivacao`, `concertacao`, `incluir`, `inclusao`, `patrimonio`, `europa`, `proj1` a `proj4`, `pares` e `fecho` foram acrescentadas à mão no fim do `atividades.js`: se voltares a gerar esse ficheiro a partir dos jogos, guarda-as antes.

## Atualizar os números

- Salário mínimo (bloco DR3.1): 920 euros em 2026; 970 previstos para 2027.
- Segurança Social e estrangeiros (bloco DR3.2): dados de 2025 (cerca de 4 150 milhões de euros de contribuições, 820 milhões de prestações, 14% das contribuições, cerca de 20% dos contribuintes); 1 597 530 estrangeiros residentes no fim de 2025.
- Património Mundial (bloco DR4.2): 17 bens em Portugal. Zona euro (bloco DR4.1): 21 países.

A seguir a cada jogo há um slide «No telemóvel»: os formandos jogam no seu telemóvel e as respostas chegam-te por email. Ver `LEIA-ME-telemovel.md`.

As ilustrações estão em `assets/`.

É HTML, CSS e JavaScript simples: não precisa de instalação nem de compilação. Funciona aberto diretamente no navegador (duplo clique em `index.html`) e no GitHub Pages.

## Ficheiros

| Ficheiro | O que tem |
| --- | --- |
| `index.html` | Todo o conteúdo: um `<section class="slide">` por slide |
| `style.css` | Aspeto (cores e tipos de letra da apresentação original) |
| `app.js` | Comportamento: navegação, passos, questionários, temporizadores, códigos QR |
| `notes.js` | Notas do formador, uma por slide |
| `cerebro3d.js`, `cerebro3d.css` | Os três slides 3D do bloco DR1.3: o trajeto da barra de Gage, o cérebro interativo e a lobotomia transorbital |
| `cerebro3d-dados.js` | A anatomia real usada pelos slides 3D (gerada, não editar à mão): córtex e estruturas profundas do FreeSurfer fsaverage; crânio, mandíbula e olhos do BodyParts3D; feixes de substância branca do atlas HCP1065 |
| `assets/vendor/three.min.js` | three.js (versão 160, licença MIT), a biblioteca que desenha o 3D. Fica no repositório para funcionar sem internet |
| `aluno.html` e afins | Página do formando no telemóvel (ver `LEIA-ME-telemovel.md`) |

## Publicar no GitHub Pages

1. Cria um repositório novo no GitHub (por exemplo `aulas`).
2. Carrega estes ficheiros para a raiz do repositório (botão **Add file → Upload files**) e confirma (**Commit changes**).
3. Vai a **Settings → Pages**.
4. Em **Build and deployment**, escolhe **Deploy from a branch**, ramo `main`, pasta `/ (root)`, e carrega em **Save**.
5. Ao fim de um ou dois minutos, o site fica em `https://<o-teu-utilizador>.github.io/aulas/cp4/`.

Cada slide tem endereço próprio (por exemplo `…/cp4/#s-navio`), por isso podes partilhar a ligação para um slide concreto.

## Atalhos na sala

| Tecla | Ação |
| --- | --- |
| `→`, espaço, Page Down | Passo seguinte (ou slide seguinte) |
| `←`, Page Up | Passo anterior (ou slide anterior) |
| `Home` / `End` | Primeiro / último slide |
| `N` | Mostrar ou esconder as notas do formador |
| `F` | Ecrã inteiro |

No telemóvel ou num quadro interativo, desliza para a esquerda ou para a direita.

## Acrescentar ou editar um slide

Copia um `<section class="slide">` parecido, cola-o onde o queres e muda:

```html
<section class="slide" id="s-novo" data-lesson="DR2 · Aula 1" data-title="Nome curto no índice">
  <p class="kicker">Etiqueta pequena</p>
  <h2>Título do slide</h2>
  <div class="card" data-step="1">Aparece no primeiro clique.</div>
  <p class="ask" data-step="2">Pergunta final, a laranja.</p>
</section>
```

- `id` tem de ser único e começar por `s-` (é o endereço do slide).
- `data-lesson` agrupa o slide no índice; um nome novo cria um grupo novo.
- `data-step="n"` faz o elemento aparecer no passo n. Sem `data-step`, aparece logo.
- Para uma imagem, põe o ficheiro numa pasta `assets/` e usa `<img src="assets/nome.jpg" alt="descrição">`.
- Para as notas do formador, acrescenta em `notes.js` uma linha `"s-novo": "texto das notas",`.

Peças disponíveis: `card` (com variantes `blue`, `peach`, `dark`, `green`), `grid g2` / `g3` / `g4` (colunas), `split` (duas colunas), `num` (número num círculo), `ic` (ícone num círculo), `big` com `data-count="14476"` (número que conta até ao valor).

## Jogos

Cada aula tem um jogo de escolha múltipla com 8 perguntas: uma de cada vez, 20 segundos por pergunta, pontos com bónus de rapidez e som de acerto e de erro. A turma responde de braço no ar (ou com os dedos, 1 a 4) e o formador clica na resposta mais votada, ou usa as teclas 1 a 4; Enter passa à seguinte. O botão do altifalante liga e desliga o som. As perguntas de escolha múltipla que já existiam ficaram como «Revisão», para estudar em casa.

Para mudar uma pergunta, procura o texto no `index.html`: cada pergunta é um `<div class="gq" data-answer="b">`, e `data-answer` diz qual dos botões (`a`, `b`, `c`, `d`) é o certo.

## Acrescentar um questionário

```html
<div class="quiz">
  <div class="q" data-answer="b">
    <p class="stem">A pergunta?</p>
    <div class="opts"><button data-opt="a">Opção A</button><button data-opt="b">Opção B</button></div>
    <p class="why">Explicação que aparece depois de responder.</p>
  </div>
  <div class="score"><span>Pontuação: <output>0</output> / 1</span><button class="btn ghost" data-retry>Tentar outra vez</button></div>
</div>
```

Verdadeiro ou falso: usa `data-opt="V"` e `data-opt="F"`.

## Acrescentar uma pesquisa (com código QR e temporizador)

```html
<div class="research" data-url="https://endereco-da-fonte">
  <div>
    <div class="card"><p>A pergunta de pesquisa.</p></div>
    <div class="timer" data-seconds="300"><output>5:00</output><button class="btn">Iniciar</button><button class="btn ghost" data-reset>Repor</button></div>
    <button class="btn orange" data-answer>Mostrar resposta</button>
    <div class="answer card dark"><p>A resposta e a fonte.</p></div>
  </div>
  <div class="qr"><div class="code"></div><a target="_blank" rel="noopener"></a></div>
</div>
```

O código QR é gerado a partir de `data-url` (precisa de internet; sem ela, fica só a ligação). Um `.timer` também pode ser usado sozinho em qualquer slide.

## Outras peças interativas

- **Cartões que viram** (`.flip`): frente e verso; clica para virar.
- **Votação de braço no ar** (`.poll`): o formador conta com `+` e `−` e as barras mostram a proporção.
- **Lista de verificação** (`.check`): cada item fica assinalado ao clicar.
- **Linhas que abrem** (`<details class="more">`): um título que se abre com um clique para mostrar o texto (usado no programa).

Os exemplos completos estão em `index.html`.

## Cenas animadas (blocos DR1.5 e DR2.1, e a «Teoria do corpo»)

Os slides com a classe `cena` têm um desenho SVG em que «eu» sou a figura laranja e «o outro» é a figura azul. `data-step` faz aparecer elementos; para mover coisas num clique, o `app.js` acrescenta ao slide as classes `ge1`, `ge2`… e as regras de cada cena estão no fim do `style.css`. `data-steps` no `<section>` indica quantos cliques tem a cena.

## Slides 3D (bloco DR1.3)

Os três slides usam anatomia real, não desenhada à mão:

- **Cérebro**: FreeSurfer *fsaverage* (média de 40 ressonâncias magnéticas): córtex com os lobos (atlas de Desikan-Killiany), o córtex pré-frontal (áreas de Brodmann, atlas PALS-B12), tálamo, núcleos da base, hipocampo, amígdala, corpo caloso, ventrículos, cerebelo e tronco cerebral.
- **Crânio, mandíbula e olhos**: BodyParts3D, (c) The Database Center for Life Science, licenciado em CC Attribution-Share Alike 2.1 Japan. Ajustado à volta do cérebro fsaverage.
- **Feixes de substância branca**: atlas de tractografia HCP1065 (Fang-Cheng Yeh, 2022, *Nature Communications* 13, 4933), CC BY-SA 4.0. Os dados foram fornecidos em parte pelo Human Connectome Project, WU-Minn Consortium (investigadores principais: David Van Essen e Kamil Ugurbil; 1U54MH091657), financiado pelos 16 institutos e centros dos NIH que apoiam o NIH Blueprint for Neuroscience Research, e pelo McDonnell Center for Systems Neuroscience da Washington University.
- **Trajeto da barra de Gage**: ajustado à reconstrução de John Van Horn e colegas (*PLoS ONE*, 2012); no modelo, a barra atravessa 3,9% do córtex (Van Horn: 3,97%).
- **Lobotomia transorbital**: a técnica descrita por Walter Freeman, citada por Elliot Valenstein (*Great and Desperate Cures*, 1986).

Por causa das licenças CC BY-SA, o ficheiro `cerebro3d-dados.js` fica também sob CC BY-SA.

`#s-gage-3d` e `#s-lobotomia-3d` são animações por passos: cada clique (→) é um momento, e a legenda em baixo conta-o. Para mudar uma legenda, edita o `<p data-step="n">` dentro de `.legendas` no `index.html`. O que a câmara mostra em cada passo está na tabela `CAMERA` de cada cena, em `cerebro3d.js` (em milímetros).

`#s-cerebro-3d` é interativo: arrasta para rodar, roda do rato para aproximar, clica numa parte. Os textos de cada parte estão em `INFO`, em `cerebro3d.js`.

O ficheiro de anatomia tem cerca de 3,7 MB: a primeira abertura do site demora um pouco mais. Se o navegador não tiver 3D (WebGL), aparece uma mensagem e as legendas continuam a contar a história.
