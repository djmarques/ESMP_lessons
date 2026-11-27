# Psicologia · Módulo 4 · Fatores e processos de aprendizagem

Site interativo para projetar na sala e para os alunos estudarem em casa. Constrói a ideia de aprendizagem peça a peça, como uma escada em que cada degrau acrescenta um só conceito:

1. **O que é aprender?** A definição montada em três peças (experiência, mudança, estável e duradoura), o que não é aprendizagem, aprender sem mostrar, voluntária e involuntária, desaprender.
2. **O que ajuda a aprender?** Um mapa animado arruma cada fator na sua família: individuais (maturação, atenção, motivação, aprendizagem anterior), sociais (estímulos, afetos, escola) e situacionais (sentido, feedback, reforço). Cada fator tem depois a sua cena animada, e um jogo de três opções («de que família é?») fecha a lição. Depois do meio sociocultural há três slides com dados (o elevador social, segundo a OCDE; o bairro onde se cresce, segundo Chetty e colegas; o meio e o cérebro, segundo Noble e Gianaros) e um jogo de escolha múltipla sobre eles; as fontes completas estão nas notas do professor.
3. **Degrau 1: habituação** (com simulação de som).
4. **Degrau 2: condicionamento clássico** (Pavlov, o pequeno Albert, Peter e o coelho, com a simulação do cão).
5. **Degrau 3: condicionamento operante** (Thorndike, Skinner, reforço e punição, com a simulação da caixa de Skinner e o quadro interativo das duas perguntas).
6. **Degrau 4: a mente entra em cena** (Köhler e o insight, Tolman e a aprendizagem latente).
7. **Degrau 5: aprender com os outros** (Bandura, o boneco Bobo, reforço e punição vicariantes, os fatores da modelação).
8. **Aprender a aprender** (Kolb, Honey e Mumford, um questionário de preferências e uma nota crítica sobre a investigação).
9. **Quando aprender é difícil** (dificuldades de aprendizagem, fatores do insucesso, o quociente de inteligência e a crítica de Gardner).

Há jogos de **escolha múltipla** e de **verdadeiro ou falso** ao longo das lições: uma pergunta de cada vez, com tempo, pontos e som. Teclas 1 a 4 (ou 1 e 2) escolhem a resposta; Enter passa à seguinte.

Fontes: o manual (páginas no PowerPoint do professor), a sebenta da escola (Módulo 4) e os diapositivos anteriores do professor. Não há fotografias de pessoas reais: os autores aparecem com as iniciais.

É HTML, CSS e JavaScript simples: não precisa de instalação. Funciona aberto no navegador e no GitHub Pages.

## Por dentro do cérebro e Degrau 1 em 3D (27 de novembro de 2026)

Entre a lição 2 e a escada há um grupo novo, **«Por dentro do cérebro»**, e o Degrau 1 passou a ter cenas 3D. Os degraus 2 a 5 e o ciclo de Kolb vieram a seguir (secção abaixo).

| Slide | O que é |
| --- | --- |
| `s-n-caixa` | A «caixa negra» abre-se: crânio, córtex, pré-frontal, tálamo, hipocampo, amígdala, cerebelo (anatomia real) |
| `s-n-neuronio` | Dois neurónios: impulso elétrico, sinapse, neurotransmissor (modelo esquemático) |
| `s-n-rede` | Jogo de sala: praticar um caminho reforça as ligações; meses sem praticar podam as outras |
| `s-n-cortex` | O artigo de Piccolo e colegas (2016): gráfico simplificado, construído por passos, com cursor da idade |
| `s-n-medir` | Eletroencefalograma, ressonância magnética funcional e o percurso de um som no cérebro |
| `s-hab-sim` | A sirene, agora no cérebro: a resposta diminui a cada toque; um som novo repõe-na |
| `s-hab-kandel` | A lesma-do-mar de Kandel: tocar no sifão, choque na cauda, descansar |
| `s-hab-jogo` | Jogo de verdadeiro ou falso (com o botão «Jogar» para os telemóveis) |

**Ficheiros:** `neuro3d.js` (as cenas) e `neuro3d.css`. A biblioteca three.js e a anatomia real **não estão nesta pasta**: são carregadas de `../../cp4/assets/vendor/three.min.js` e `../../cp4/cerebro3d-dados.js` (os mesmos dados do cérebro 3D de «Processos identitários», cerca de 3,7 MB). Se a pasta `cp4` mudar de sítio, é preciso corrigir esses dois caminhos no fim do `index.html`.

**Como se escreve uma cena:** `<div class="palco3d" data-cena="nome">` dentro de um slide com a classe `n3d`. As legendas são os `<p data-step="n">` dentro de `.leg3d` (um clique por legenda); os botões levam `data-act` e os cursores `data-ctl`. O que cada cena mostra em cada passo, as etiquetas e as câmaras estão em `neuro3d.js`, uma secção por cena.

**O que é real e o que é modelo:** o crânio, o córtex e as estruturas profundas são anatomia real (FreeSurfer fsaverage, BodyParts3D). Os neurónios, a rede, a lesma e os valores das simulações (por exemplo, a resposta cair um terço a cada toque) são modelos para a aula; cada slide diz isso na linha das fontes. As curvas do gráfico do córtex foram redesenhadas à mão a partir da figura 1 do artigo e são aproximadas; a figura original (CC BY) está em `assets/`.

A versão anterior do `index.html` e do `notes.js` está em `archive/`, com a data de 27 de novembro.

## Degraus 2 a 5 e ciclo de Kolb em 3D (27 de novembro de 2026, segunda parte)

As lições 4 a 8 ganharam onze slides 3D: três substituem versões em 2D (mantendo o `id`) e oito são novos. A lição 9 não foi alterada.

| Slide | Lição | O que é |
| --- | --- | --- |
| `s-pav-sim` (substituído) | 4 | O cão de Pavlov: campainha, comida, ou as duas; a associação cresce e extingue-se |
| `s-cl-cerebro` (novo) | 4 | O pequeno Albert no cérebro: rato e ruído encontram-se na amígdala; o córtex pré-frontal trava o medo |
| `s-skinner-sim` (substituído) | 5 | A caixa de Skinner com as quatro consequências (reforço e punição, positivos e negativos) |
| `s-op-cerebro` (novo) | 5 | A dopamina como sinal de surpresa (Schultz, Dayan e Montague, 1997) |
| `s-insight-3d` (novo) | 6 | O chimpanzé, a vara e a banana: o insight de Köhler |
| `s-tolman-jogo` (novo) | 6 | Jogo do labirinto: correr para o queijo sem e com exploração prévia |
| `s-mapa-cerebro` (novo) | 6 | Células de lugar no hipocampo (O'Keefe, 1971) |
| `s-bobo-3d` (novo) | 7 | O boneco Bobo: o adulto bate, a criança observa e depois imita |
| `s-bobo-65` (novo) | 7 | Bandura, 1965: modelo premiado, modelo castigado, e a diferença entre aprender e fazer |
| `s-espelho` (novo) | 7 | Fazer e ver fazer ativam zonas comuns; o que se sabe e o que se discute sobre neurónios-espelho |
| `s-kolb` (substituído) | 8 | O ciclo de Kolb num anel 3D, com o exemplo do penálti, e os quatro estilos |

**Conceitos dentro da animação:** os nomes dos conceitos (estímulo condicionado, reforço negativo, insight, reforço vicariante…) aparecem como etiquetas laranja presas ao objeto a que dizem respeito (classe `conceito` em `stage.label`), e não só na legenda de baixo.

**Extras de uma cena:** `data-dx="0.2"` no `.palco3d` desloca a imagem para a esquerda (para dar lugar a um cartão à direita); `data-dy="0"` desliga a subida que compensa a legenda; um elemento com `data-em="2 3"` dentro do palco só aparece nos passos 2 e 3.

**Teclado no jogo do labirinto:** <kbd>Shift</kbd> + setas. As setas sozinhas mudam de slide, e as letras D, Q, G, P e J abrem as ferramentas da aula (`comum/aula.js`), por isso o jogo não usa letras.

**O que é real e o que é modelo:** nos slides «por dentro do cérebro» a anatomia é real e as zonas iluminadas são aproximadas; os percursos dos sinais estão simplificados. O cão, o rato, o chimpanzé, as pessoas, o labirinto e o anel de Kolb são desenhos esquemáticos, e os números das simulações (por exemplo, cada associação somar 30% do que falta) foram escolhidos para a aula. O mecanismo do medo foi estudado em ratos; aplicá-lo ao pequeno Albert é uma ilustração, e o slide diz isso. As fontes estão na última linha de cada slide e nas notas do professor.

As versões anteriores a esta segunda parte estão em `archive/`, com o sufixo `_2026-11-27b`.

## Texto de apoio

Cada slide tem, por baixo do título, um parágrafo curto de contexto (a classe `lede`), útil na aula e para quem estuda em casa. As notas do professor (tecla `N`) começam por um guião, «COMO CONDUZIR»: objetivo, o que dizer, o que perguntar e o que mostra cada clique. Os textos estão no ficheiro `leads.js` do gerador; no site, ficam diretamente no `index.html` e no `notes.js`.

## Ficheiros

| Ficheiro | O que tem |
| --- | --- |
| `index.html` | Todo o conteúdo: um `<section class="slide">` por slide |
| `style.css` | Aspeto (secção 16: as composições e simulações deste módulo; secção 17: as cenas animadas da lição 2) |
| `app.js` | Comportamento: navegação, passos, jogos, simulações, temporizadores |
| `notes.js` | Notas do professor, uma por slide |

## Atalhos na sala

| Tecla | Ação |
| --- | --- |
| `→`, espaço | Passo seguinte (ou slide seguinte) |
| `←` | Passo anterior (ou slide anterior) |
| `N` | Notas do professor |
| `F` | Ecrã inteiro |

## Cenas animadas e mapa dos fatores (lição 2)

Funcionam como as cenas de «O trabalho». Os slides com a classe `cena` têm um desenho SVG (`.palco`) em que quem aprende é sempre a figura laranja com um ponto branco no peito.

- `data-step="n"` faz aparecer elementos, dentro e fora do desenho.
- Para mover ou trocar coisas num clique, o `app.js` acrescenta ao slide as classes `ge1`, `ge2`… («o passo é pelo menos n»). As regras de cada cena estão no fim do `style.css` (por exemplo `#s-cerebro.ge2 #cer-f { transform: translateX(250px) scale(1.5) }`).
- `data-steps="n"` no `<section>` indica quantos cliques tem a cena.
- A faixa por cima do título (`<div class="fam">`) mostra as três famílias; a família do slide leva a classe `now` e abre com os seus fatores, e o fator do slide também leva `now`.

A versão anterior desta lição está em `archive/index_2026-11-16.html`.

## Simulações

- **Habituação** (`.habit`): cada toque da sirene mostra um susto menor.
- **Cão de Pavlov** (`.pavlov`): campainha, comida, ou as duas; a associação cresce com os pares e enfraquece só com a campainha (extinção).
- **Caixa de Skinner** (`.skinner`): um rato desenhado vai à alavanca, põe-se de pé e pressiona-a. Com reforço positivo, a comida cai pelo tubo até ao comedouro (com som) e o rato come; com reforço negativo, o som alto para; com punição positiva, apanha um choque; com punição negativa, a comida do comedouro é retirada. «Iniciar» deixa-o correr sozinho; «Uma vez» mostra um só ensaio. É ilustrativa: não usa dados reais.
- **Motivação** (`.yd`): a curva em U invertido.
- **Reforço ou punição?** (`.matrix2`): duas perguntas, uma resposta.
- **Questionário de preferências** (`.kolb`): seis perguntas, feito para a aula; não é o inventário de Kolb nem um diagnóstico. As respostas não saem do navegador.
