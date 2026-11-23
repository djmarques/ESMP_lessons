# CLC 6 · Culturas de urbanismo e mobilidade

Site interativo das aulas de Cultura, Língua e Comunicação 6 (formação de adultos), para projetar na sala. Tem 294 slides:

- o **programa** (núcleo gerador, os quatro DR e o percurso da casa ao mundo, avaliação, o trabalho de grupo e o quadro «Onde está cada DR?»);
- **DR1 · A casa** (aulas 1 a 7): casa e lar; arquitetura hostil; o que faz uma casa boa (critérios, preço, oferta e procura, crise de 2008, conforto térmico, anúncio); o Ramalhete; a casa dos avós; obras em casa (com «Planear a casa para o lazer»); reclamar e requerer;
- **DR2 · Vizinhança e trabalho** (aulas 8 a 13): equipamentos e cidade dos 15 minutos, área central e renda locativa; Cesário Verde, Caeiro, Campos e Simmel; memória dos lugares, história oral e socialização, relato e crónica, texto informativo e literário, debate «preservar ou dinamizar»; suburbanização, integrar ou romper; movimentos pendulares, património e mobilidade laboral, turismo e alojamento local; sotaques, dialetos e «Atender em duas línguas»;
- **DR3 · Instituições** (aulas 14 a 19): a polissemia da Polis, rede urbana e redes nacionais de equipamentos culturais; o PDM; lei, decreto-lei, portaria, despacho; prevenção rodoviária, sinais e iconografia, campanhas (rodoviárias e do território); quem trata de quê, como o Estado comunica, pesquisa e resumo; consulta pública simulada;
- **DR4 · Mobilidades** (aulas 20 a 24): migrações, a cidade que muda, contar a migração, o português no mundo, integrar;
- **Projeto de grupo** (aulas 25 a 29): quatro oficinas, uma por DR, e as apresentações finais. Substitui as apresentações individuais no fim de cada DR (os slides dessas aulas foram mantidos e adaptados).

## Etiquetas DR

Cada slide diz que Domínios de Referência mobiliza: `<section class="slide" … data-dr="1,3">`. A partir daí, o `app.js` mostra:

- em baixo, à esquerda, as quatro etiquetas DR1 a DR4, com as do slide atual a cores (DR1 laranja queimado, DR2 pêssego, DR3 azul-escuro, DR4 azul);
- no índice, um ponto de cor por DR ao lado de cada slide, e os botões **Todos · DR1 · DR2 · DR3 · DR4**, que mostram só os slides de um domínio (útil nas oficinas do projeto);
- no slide «Onde está cada DR?» (`<div class="drmatrix">`), um quadro aulas × DR, gerado sozinho a partir das etiquetas.

Para mudar uma etiqueta, edita o `data-dr` do slide. Um slide novo sem `data-dr` fica sem etiqueta.

## Projeto de grupo

Um PowerPoint por grupo sobre um lugar ou um tema, com os quatro DR: em cada DR, pelo menos um slide de Cultura, um de Língua e um de Comunicação. O slide «O trabalho de grupo: quatro DR» (programa) apresenta-o. Cada oficina (aulas 25 a 28) tem: abertura, «O que o DR pede» (os três critérios de evidência do referencial, em linguagem simples, e ideias para os três slides), temas e estrutura, avaliação entre grupos e autoavaliação. Atividades no telemóvel: `grupo`, `proj1` a `proj4` (ponto da situação), `pares` a `pares4`, `auto1` a `auto3`, `fecho`.

Os slides com o botão **Responder no telemóvel** mostram um código QR: os formandos respondem no telemóvel e as respostas ficam na folha de cálculo «Avaliação contínua» (ver `../respostas/LEIA-ME.md`). Num slide também pode estar o código QR com as respostas da turma ao lado, ao vivo: `<div class="esmp-ao-vivo" data-path="../respostas/?f=clc6&a=ideal"></div>` (é assim a nuvem de palavras da aula 3; ver `../comum/LEIA-ME.md`). As atividades estão em `atividades.js`. As versões anteriores dos ficheiros estão em `archive/`.

É HTML, CSS e JavaScript simples: não precisa de instalação nem de compilação. Funciona aberto diretamente no navegador (duplo clique em `index.html`) e no GitHub Pages.

## Ficheiros

| Ficheiro | O que tem |
| --- | --- |
| `index.html` | Todo o conteúdo: um `<section class="slide">` por slide |
| `style.css` | Aspeto (cores e tipos de letra da apresentação original) |
| `app.js` | Comportamento: navegação, passos, questionários, temporizadores, códigos QR |
| `widgets.js` | Simulações e animações interativas (ver abaixo) |
| `notes.js` | Notas do formador, uma por slide |
| `bairro3d.js` | Aula 3 · o bairro da D. Rosa em 3D (ver abaixo) |
| `crise2008.js` | Aula 3 · a crise de 2008 em animações (ver abaixo) |
| `assets/vendor/three.min.js` | three.js, versão 160 (desenho 3D; licença MIT), guardado aqui para funcionar sem internet |

## Publicar no GitHub Pages

1. Cria um repositório novo no GitHub (por exemplo `clc6`).
2. Carrega estes ficheiros para a raiz do repositório (botão **Add file → Upload files**) e confirma (**Commit changes**).
3. Vai a **Settings → Pages**.
4. Em **Build and deployment**, escolhe **Deploy from a branch**, ramo `main`, pasta `/ (root)`, e carrega em **Save**.
5. Ao fim de um ou dois minutos, o site fica em `https://<o-teu-utilizador>.github.io/clc6/`.

Cada slide tem endereço próprio (por exemplo `…/clc6/#s-waldron`), por isso podes partilhar a ligação para um slide concreto.

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

Cada aula tem um jogo de escolha múltipla com 8 perguntas: uma de cada vez, 20 segundos por pergunta, pontos com bónus de rapidez e som de acerto e de erro. A turma responde de braço no ar (ou com os dedos, 1 a 4) e o formador clica na resposta mais votada, ou usa as teclas 1 a 4; Enter passa à seguinte. O botão do altifalante liga e desliga o som. As perguntas de escolha múltipla que já existiam ficaram como «Revisão», para estudar em casa. A aula 3 tem também quatro **jogos rápidos** ao longo da aula, cada um logo depois do tema que verifica (critérios de qualidade, o preço das casas, conforto térmico, o anúncio): 4 ou 5 perguntas de 25 segundos e, no telemóvel, uma pergunta para responder por palavras próprias. O jogo de 8 perguntas fica no fim, como revisão final.

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

Os exemplos completos estão em `index.html`.

## O bairro da D. Rosa em 3D (`bairro3d.js`)

Um tabuleiro 3D com 32 casas (os mesmos preços e cores da simulação «contagio») que atravessa a Aula 3 em cinco slides: «Qualidade de vida: da casa ao bairro», «A crise da habitação em números» (gráficos de barras ao lado do tabuleiro), «Quem decide o preço de uma casa?», «Oferta e procura no bairro» (sliders de procura, oferta e juros) e «Uma venda cara sobe a rua toda» (botões que constroem uma estação de metro, um supermercado ou um viaduto). Cada clique (→) muda a câmara e as peças. No telemóvel, o tabuleiro fica em cima e os cartões por baixo.

O slide «Uma casa fria… e quente» usa o mesmo motor 3D para mostrar a casa da D. Rosa em corte: botões de inverno e verão e de sete medidas (isolar o telhado e as paredes, janelas eficientes, vedar frinchas, sombreamento exterior, ventilar à noite, telhado claro), bolas que mostram o calor a passar e a temperatura dentro de casa. O modelo de calor está na função `thermal` (ilustrativo).

Os números do slide da crise da habitação estão em `NUM`, perto do início do `bairro3d.js` (fontes no próprio slide e nas notas). Clicar numa casa vende-a por mais 40%. Sons gerados no navegador (botão 🔊 no canto, partilhado com os jogos).

Para mudar a história, edita a função `layout` de cada slide em `SLIDES`, no início do ficheiro. Se o navegador não tiver 3D, os slides mostram o desenho 2D antigo.

## A crise de 2008 em animações (`crise2008.js`)

Onze slides na Aula 3, entre «Jogo rápido: o preço» e «Esta semana: a habitação no Parlamento», para explicar as ideias do filme «A Queda de Wall Street» (*The Big Short*, 2015): abertura (com os dois excertos do filme), nove animações e um jogo rápido de seis perguntas (atividade «j3crise» no telemóvel).

| Slide | Cena (`data-cena`) | O que mostra |
| --- | --- | --- |
| O que é uma ação? | `acao` | uma padaria dividida em 100 cubos; a altura dos cubos é o preço |
| Longo ou curto? | `longo` | gráfico 2D do preço e do que ganha ou perde cada posição; barra para o preço final |
| Vender o que não se tem | `short` | a Ana pede uma ação emprestada à D. Rosa, vende-a ao Tiago, recompra-a e devolve-a |
| O que é uma obrigação? | `obrigacao` | empréstimo, juros, vender a dívida; duas padarias: mais juro, mais risco |
| Hipotecas em pacote | `hipotecaria` | a prestação da família, o pacote, os investidores |
| Fatias | `tranches` | três fatias que enchem de cima para baixo; barra «famílias que deixam de pagar» |
| CDO | `cdo` | as fatias BBB viram um pacote novo (CDO) e um CDO de CDO; a mesma barra |
| Apostas sobre apostas | `apostas` | o seguro contra o incumprimento e as apostas à volta |
| A bolha rebenta | `bolha` | crédito fácil, preços a subir, a bolha, o dominó de 2008 |

Cada clique (→) é um passo da história; a faixa por baixo do quadro mostra a legenda desse passo e, no fim, a definição. As peças andam sempre para o sítio que o passo atual lhes dá, por isso andar para trás (←) também funciona. Para mudar a história de uma cena, edita a função `pose` dessa cena em `SCENES`, no `crise2008.js`; para mudar as legendas, edita os `<p>` dentro de `.c08-leg` no `index.html`. Os sons usam o mesmo botão 🔊 dos jogos.

Os números das cenas são ilustrativos (padaria de 10 000 €; fatias de 70%, 20% e 10%; juros de 4%, 8% e 15%). Os factos históricos têm fonte no próprio slide e nas notas: índice S&P/Case-Shiller (preços das casas nos Estados Unidos), Federal Reserve History e FDIC. O «20 vezes» das apostas é o número dito no filme. Se o navegador não tiver 3D, o quadro avisa e as legendas contam a história.

## Simulações e animações (`widgets.js`)

Cada simulação é um `<div class="wg" data-widget="nome"></div>` no `index.html`; o `widgets.js` desenha-a e cria os botões e as barras. Os cliques dentro de uma simulação não mudam de slide.

| Nome | Slide | O que faz |
| --- | --- | --- |
| `curvas` | Aula 3 · A procura, A oferta, O equilíbrio, Experimenta | quadro escuro ao estilo Manim; `data-modo` escolhe o slide; no último, sliders de procura, oferta e juros |
| `clima` | Aula 3 · O clima está a mudar | quadro escuro: temperatura média por década, ondas de calor por ano, anos mais quentes, extremos de calor e de frio |
| `anuncio` | Aula 3 · A estrutura de um anúncio | cada clique acende uma parte do anúncio fictício e mostra a definição; clicar numa parte também |
| `calcpreco` | Aula 3 · Quanto pedir? | método da comparação para o preço e a renda dos três imóveis da atividade de escrita |
| `oferta` | Aula 3 · Oferta e procura no bairro | só aparece se o navegador não tiver 3D (substitui o tabuleiro) |
| `contagio` | Aula 3 · Uma venda cara sobe a rua toda | só aparece se o navegador não tiver 3D (substitui o tabuleiro) |
| `quinze` | Aula 8 · A cidade dos 15 minutos | o que se alcança a pé, de bicicleta ou de carro |
| `renda` | Aula 8 · A renda locativa | as curvas aparecem a cada clique (→); no fim, a estação de metro |
| `ruralurb` | Aula 9 · De aldeia a cidade | barra que transforma a paisagem |
| `rua` | Aula 10 · Uma rua no tempo | a mesma rua em 1975, 1995, 2012 e 2025 |
| `crescimento` | Aula 11 · Uma cidade a crescer | área metropolitana de 1900 a 2025 |
| `tabs` | Aula 11 · Três modelos de cidade | separadores Burgess, Hoyt, Harris e Ullman |
| `pendular` | Aula 12 · Movimentos pendulares | um dia de movimentos casa-trabalho |
| `elastico` | Aula 12 · Distância-tempo | os lugares mudam de posição em km, minutos e euros |
| `turismo` | Aula 12 · Alojamento local | modelo ilustrativo: residentes, renda, comércio, empregos |
| `dialetos` | Aula 13 · O mapa dos dialetos | clica numa zona do mapa |
| `pdm` | Aula 15 · Planeia o teu concelho | escolhe um uso e clica nos quadrados |
| `decibeis` | Aula 16 · A lei do ruído | escala de decibéis com os limites da lei |
| `travagem` | Aula 17 · A distância de paragem | velocidade, atenção, piso; botão «Travar!» |
| `fluxos` | Aula 20 · Quem sai, quem chega | anos 60, saídas de 2024, estrangeiros em 2025 |
| `pushpull` | Aula 20 · Porque se parte? | balança entre ficar e partir |
| `falantes` | Aula 23 · Uma língua, nove países | bolhas com a população dos países |

As cenas desenhadas (área central de dia e de noite, Atenas, integrar ou romper, o bairro da Ana, o primeiro mês da Amina) usam as classes `ge1`, `ge2`… que o `app.js` põe no slide («o passo é pelo menos n»); as regras de cada cena estão no fim do `style.css`. A Ana (laranja, com um ponto branco) é a personagem que aparece nos DR2 a DR4.

## Atualizar os números

Dados com data, para atualizar quando saírem novos:

- **Preço das casas** (aula 3, «A crise da habitação em números», «A onda chega à periferia»; aula 8, «A teoria e a realidade»): INE, 2.º trimestre de 2026 (2 445 €/m² no país; Lisboa 5 299; Cascais 5 200; Oeiras 4 704; Grande Lisboa 4 030; Loures +29%, Lisboa +8,9%).
- **Turismo** (aula 12): INE, Estatísticas do Turismo 2025 (29,9 milhões de turistas, 34,8 milhões de hóspedes, 89,7 milhões de dormidas). **Alojamento local em Lisboa**: 6 765 registos cancelados em fevereiro de 2026.
- **Sinistralidade** (aula 17): ANSR, 618 mortos a 30 dias em 2024; 58,1 por milhão (UE 45,0); 55% em zonas urbanas.
- **Migrações** (aulas 20, 21, 24): INE (1 597 530 estrangeiros, 14%, fim de 2025); AIMA, Relatório de Migrações e Asilo 2025 (1 585 854; nacionalidades; 70,3% em Lisboa, Setúbal, Faro e Porto; 194 703 processos pendentes); Observatório da Emigração (65 mil saídas em 2024). O esquema `fluxos` tem os números dentro do `widgets.js` (procura `sets = {`).
- **Censos 2021** (aula 12, movimentos pendulares; aula 14, áreas metropolitanas): só mudam com os Censos 2031.

- **Redes culturais** (aula 14, «Redes de equipamentos culturais»): Observatório Português das Atividades Culturais, indicadores de monitorização 2025 (262, 96, 40, 93 e 47 concelhos; 30 concelhos sem equipamentos).
