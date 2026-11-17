# CLC 6 · Culturas de urbanismo e mobilidade

Site interativo das aulas de Cultura, Língua e Comunicação 6 (formação de adultos), para projetar na sala. Tem 257 slides:

- o **programa** (núcleo gerador, os quatro DR e o percurso da casa ao mundo, avaliação);
- **DR1 · A casa** (aulas 1 a 8). Revisto em novembro de 2026 com Geografia A: na aula 3, quem decide o preço de uma casa, oferta e procura (simulação), o contágio dos preços (simulação) e a onda que chega à periferia (dados do INE); na aula 5, povoamento disperso e concentrado;
- **DR2 · Vizinhança e trabalho** (aulas 9 a 15): equipamentos e cidade dos 15 minutos, Jane Jacobs, área central e renda locativa; Cesário Verde, Caeiro, Campos e Simmel; memória dos lugares, gentrificação, relato e crónica; suburbanização, modelos de Burgess, Hoyt e Harris-Ullman, integrar ou romper, Hume; movimentos pendulares, distância-tempo, turismo e alojamento local; sotaques e dialetos (Lindley Cintra); apresentações;
- **DR3 · Instituições** (aulas 16 a 22): a polissemia da Polis, Aristóteles, a lei das vilas e cidades, rede urbana, Lefebvre; o PDM e a classificação do solo (simulação «Planeia o teu concelho»); lei, decreto-lei, portaria, despacho e o Regulamento Geral do Ruído; prevenção rodoviária (simulação da distância de paragem) e campanhas; quem trata de quê, pesquisa e resumo; consulta pública simulada (Vale Novo) com Rawls; apresentações;
- **DR4 · Mobilidades** (aulas 23 a 28): migrações, fluxos e números (INE, AIMA, Observatório da Emigração), repulsão e atração (Lee), Kant e Arendt; a cidade que muda, arte e equipamentos culturais; Camões, Cesário, Campos e Soeiro Pereira Gomes, o relato de vivências; o português no mundo, apreciação crítica, Acordo Ortográfico; integrar (serviços, Português Língua de Acolhimento, vocabulário do trabalho); apresentações e fecho.

Os slides com o botão **Responder no telemóvel** mostram um código QR: os formandos respondem no telemóvel e as respostas ficam na folha de cálculo «Avaliação contínua» (ver `../respostas/LEIA-ME.md`). As atividades estão em `atividades.js`. As versões anteriores dos ficheiros estão em `archive/`.

É HTML, CSS e JavaScript simples: não precisa de instalação nem de compilação. Funciona aberto diretamente no navegador (duplo clique em `index.html`) e no GitHub Pages.

## Ficheiros

| Ficheiro | O que tem |
| --- | --- |
| `index.html` | Todo o conteúdo: um `<section class="slide">` por slide |
| `style.css` | Aspeto (cores e tipos de letra da apresentação original) |
| `app.js` | Comportamento: navegação, passos, questionários, temporizadores, códigos QR |
| `widgets.js` | Simulações e animações interativas (ver abaixo) |
| `notes.js` | Notas do formador, uma por slide |

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

Os exemplos completos estão em `index.html`.

## Simulações e animações (`widgets.js`)

Cada simulação é um `<div class="wg" data-widget="nome"></div>` no `index.html`; o `widgets.js` desenha-a e cria os botões e as barras. Os cliques dentro de uma simulação não mudam de slide.

| Nome | Slide | O que faz |
| --- | --- | --- |
| `oferta` | Aula 3 · Oferta e procura | curvas de oferta e procura com barras (procura, oferta, juros) |
| `contagio` | Aula 3 · Uma venda cara sobe a rua toda | clica numa casa: a subida espalha-se às vizinhas |
| `quinze` | Aula 9 · A cidade dos 15 minutos | o que se alcança a pé, de bicicleta ou de carro |
| `renda` | Aula 9 · A renda locativa | as curvas aparecem a cada clique (→); no fim, a estação de metro |
| `ruralurb` | Aula 10 · De aldeia a cidade | barra que transforma a paisagem |
| `rua` | Aula 11 · Uma rua no tempo | a mesma rua em 1975, 1995, 2012 e 2025 |
| `crescimento` | Aula 12 · Uma cidade a crescer | área metropolitana de 1900 a 2025 |
| `tabs` | Aula 12 · Três modelos de cidade | separadores Burgess, Hoyt, Harris e Ullman |
| `pendular` | Aula 13 · Movimentos pendulares | um dia de movimentos casa-trabalho |
| `elastico` | Aula 13 · Distância-tempo | os lugares mudam de posição em km, minutos e euros |
| `turismo` | Aula 13 · Alojamento local | modelo ilustrativo: residentes, renda, comércio, empregos |
| `dialetos` | Aula 14 · O mapa dos dialetos | clica numa zona do mapa |
| `pdm` | Aula 17 · Planeia o teu concelho | escolhe um uso e clica nos quadrados |
| `decibeis` | Aula 18 · A lei do ruído | escala de decibéis com os limites da lei |
| `travagem` | Aula 19 · A distância de paragem | velocidade, atenção, piso; botão «Travar!» |
| `fluxos` | Aula 23 · Quem sai, quem chega | anos 60, saídas de 2024, estrangeiros em 2025 |
| `pushpull` | Aula 23 · Porque se parte? | balança entre ficar e partir |
| `falantes` | Aula 26 · Uma língua, nove países | bolhas com a população dos países |

As cenas desenhadas (área central de dia e de noite, Atenas, integrar ou romper, o bairro da Ana, o primeiro mês da Amina) usam as classes `ge1`, `ge2`… que o `app.js` põe no slide («o passo é pelo menos n»); as regras de cada cena estão no fim do `style.css`. A Ana (laranja, com um ponto branco) é a personagem que aparece nos DR2 a DR4.

## Atualizar os números

Dados com data, para atualizar quando saírem novos:

- **Preço das casas** (aula 3, «A crise da habitação em números», «A onda chega à periferia»; aula 9, «A teoria e a realidade»): INE, 2.º trimestre de 2026 (2 445 €/m² no país; Lisboa 5 299; Cascais 5 200; Oeiras 4 704; Grande Lisboa 4 030; Loures +29%, Lisboa +8,9%).
- **Turismo** (aula 13): INE, Estatísticas do Turismo 2025 (29,9 milhões de turistas, 34,8 milhões de hóspedes, 89,7 milhões de dormidas). **Alojamento local em Lisboa**: 6 765 registos cancelados em fevereiro de 2026.
- **Sinistralidade** (aula 19): ANSR, 618 mortos a 30 dias em 2024; 58,1 por milhão (UE 45,0); 55% em zonas urbanas.
- **Migrações** (aulas 23, 24, 27): INE (1 597 530 estrangeiros, 14%, fim de 2025); AIMA, Relatório de Migrações e Asilo 2025 (1 585 854; nacionalidades; 70,3% em Lisboa, Setúbal, Faro e Porto; 194 703 processos pendentes); Observatório da Emigração (65 mil saídas em 2024). O esquema `fluxos` tem os números dentro do `widgets.js` (procura `sets = {`).
- **Censos 2021** (aula 13, movimentos pendulares; aula 16, áreas metropolitanas): só mudam com os Censos 2031.
