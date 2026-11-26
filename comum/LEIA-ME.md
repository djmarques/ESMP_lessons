# Ferramentas comuns a todas as aulas

Esta pasta junta o que é igual em todos os sites das aulas. Cada `index.html` carrega-a com duas linhas no fim do `<body>`:

    <script src="../comum/partilhado.js"></script>
    <script src="../comum/aula.js"></script>

(com `../../` nas pastas de dois níveis, como `ai-2ano/o-trabalho/`). Um site novo só precisa destas duas linhas.

| Ficheiro | O que faz |
| --- | --- |
| `partilhado.js` | Lê os questionários e jogos dos slides; desenha as respostas da turma (barras, histograma, nuvem); código QR |
| `aula.js`, `aula.css` | Ferramentas do professor nos slides |
| `efeitos.js` | Sons, música de fundo e animações dos jogos (ver «Jogos: um só botão, som e animações») |

## Jogos: um só botão, som e animações (26 de novembro de 2026)

**Um só botão, «Jogar».** Nos slides com um jogo (`.game`), o botão «Começar o jogo» e o «Responder no telemóvel» deram lugar a um único botão, «▶ Jogar», que abre a janela do jogo:

- **Código QR**, como antes, para quem joga no telemóvel.
- **«Jogar neste dispositivo»**: abre o jogo num separador novo, para quem está no computador ou no tablet e não precisa do código. As respostas ficam registadas na folha «Avaliação contínua», como no telemóvel. O mesmo botão aparece na janela dos questionários («Responder neste dispositivo»).
- **«Sala ao vivo aberta pelo professor?»**: quem está no computador escreve as quatro letras da sala que estão no ecrã do professor e entra no jogo ao vivo, sem ler o código QR.
- **«Jogar ao vivo»** e **«Classificação»**, como antes.
- **«Só neste ecrã · sem registo»**: o jogo antigo, dentro do slide, para quando não há telemóveis (a turma responde de braço no ar; teclas 1 a 4 e Enter). É o único modo que não fica registado na folha.

Não é preciso mudar nada nos slides: o `aula.js` faz a troca sozinho em todos os jogos, incluindo os que vierem a ser criados. Se um jogo já tinha «Responder no telemóvel» com uma atividade de `atividades.js` (CLC 6), o botão «Jogar» usa essa atividade e o separador da folha continua o mesmo.

**Som e música (`efeitos.js`).** Tudo é sintetizado no navegador, sem ficheiros de som.

| Onde | O que se ouve e vê |
| --- | --- |
| Aparelho do aluno (jogo ao ritmo de cada um) | Contagem «3, 2, 1, Já!», música de fundo, aviso aos 10 segundos, tiques cada vez mais agudos e música mais rápida nos últimos 5, «uá-uá» quando o tempo acaba, papelinhos e «+135» na resposta certa, série de certas («3 seguidas!»), estrelas no fim |
| Projetor, jogo ao vivo | Música na sala de espera, um som por cada aluno que entra, música durante a pergunta, tiques nos últimos 5 segundos. Ao revelar, a música **pára** (é a altura de explicar a resposta) e aparecem: percentagem de certas, o mais rápido, a maior série, quem subiu na classificação. No fim: tambores, pódio do 3.º para o 1.º e papelinhos |
| Telemóvel, jogo ao vivo | Só sons curtos (não há música: essa é a do projetor), vibração, papelinhos, série de certas e «subiste 2 lugares» |
| Slide, «Só neste ecrã» | Música durante a pergunta, mais rápida nos últimos 5 segundos, papelinhos |

Os dois botões ao lado dos pontos desligam os sons (altifalante) e a música (nota musical). A escolha fica guardada em cada aparelho. Para tirar a música dos aparelhos de **todos** os alunos de uma vez: `MUSICA_ALUNOS: false` em `respostas/config.js` (a música do projetor não depende disto).

**Segunda volta.** No fim de um jogo, o aluno vê as estrelas (1 a 3) e o botão «Segunda volta: as N que falhaste»: um treino sem tempo, só com as perguntas falhadas, cada uma com a sua explicação. Não muda a pontuação que já foi enviada para a folha.

**A pontuação não mudou:** 100 pontos pela resposta certa e até 50 pela rapidez. As séries, as estrelas e a segunda volta não dão pontos.

Quem tem «reduzir movimento» ligado no sistema vê menos papelinhos e nada abana.

## Ao vivo: a turma toda ao mesmo tempo (novembro de 2026)

| Ficheiro | O que faz |
| --- | --- |
| `vivo.js` | A ligação entre o projetor e os telemóveis («salas»), usada pelos dois lados |
| `jogos.js` | Os jogos de turma: desenho e regras (mariposas, fábrica de sapatos) |
| `aovivo.js` | O lado do professor: questionário ao vivo, classificação, jogos |

O `aula.js` carrega estes três ficheiros sozinho. Precisa do script do Google na versão 4 (ver `respostas/LEIA-ME.md`) e do site publicado.

**Como abrir:** tecla `J`, ou o botão «Ao vivo» da barra de ferramentas. Aparece o menu:

- **Questionário deste slide:** qualquer questionário ou jogo dos slides, uma pergunta de cada vez. Os alunos leem o código QR e entram; tu carregas em «Começar». Em cada pergunta vês quantos já responderam; a resposta é revelada quando todos respondem, quando o tempo acaba ou quando carregas em «Revelar» (ou `Enter`). Depois: barras por opção, a resposta certa e os cinco primeiros. No fim, o pódio, e as respostas ficam gravadas na folha «Avaliação contínua». Também se abre pelo botão «Jogar» de um jogo, ou pela janela «Respostas da turma» → «▶ Jogar ao vivo».
- **Sê o pássaro:** cada telemóvel recebe um tronco com 12 mariposas claras e 12 escuras e 10 segundos. No fim, o projetor repete as caçadas de todos ao mesmo tempo, num só tronco, e soma as contagens do tronco limpo e do tronco com fuligem.
- **A fábrica de sapatos:** três maneiras de trabalhar, à tua escolha em cada turno de 45 segundos: todos artesãos (cada um faz o sapato inteiro, quatro tarefas, e perde tempo a trocar de ferramenta), todos na linha de montagem (cada um repete uma tarefa; a linha produz tantos sapatos quantas as peças do posto mais lento) ou metade de cada. O projetor mostra a produção a crescer e, no fim, a tabela dos turnos (sapatos por pessoa).

**Classificação** de uma atividade feita ao ritmo de cada um: janela «Respostas da turma» → «🏆 Classificação». Mostra nomes, por isso pede a tua chave de professor.

**Um botão dentro de um slide:** `<button type="button" data-esmp-jogo="mariposas">Jogar com a turma toda</button>` (ou `data-esmp-jogo="fabrica"`). Exemplos: AI 11.º, slides «Jogo: sê o pássaro» e «Adam Smith: a fábrica de alfinetes».

Na sala de espera, clicar num nome tira esse telemóvel do jogo (para nomes que não são nomes).

**Um jogo novo** precisa de três coisas: as regras e o desenho em `jogos.js` (uma função para o telemóvel que devolve o resultado), uma função em `aovivo.js` que abre a sala, publica `{ fase: 'jogo', jogo: '…', ronda, inicio, dur }` e recolhe os resultados, e uma linha em `respostas/vivo.js` (função `fJogo`).

## O que aparece nos slides

- **«Jogar»** em todos os jogos (`.game`): ver «Jogos: um só botão, som e animações», acima.
- **«Responder no telemóvel»** em todos os questionários (`.quiz`) que não tinham botão. Não é preciso escrever nada em `atividades.js`: o telemóvel lê as perguntas do próprio slide. Cada questionário fica com o seu separador na folha «Avaliação contínua», com o título do slide.
- **«Respostas da turma»** ao lado dos botões que já existiam e dentro da janela do código QR: gráficos que se atualizam de 5 em 5 segundos, sem nomes. A caixa «Mostrar as respostas certas» pinta a opção certa de verde quando quiseres.
- **Respostas da turma dentro do slide:** `<div class="esmp-ao-vivo" data-path="../respostas/?f=<pasta>&a=<atividade>"></div>` mostra, no próprio slide, o código QR e o painel da turma (por exemplo uma nuvem de palavras de aquecimento). Só vai buscar respostas enquanto o slide está à vista. As respostas passam pela folha, porque é aí que são contadas. Exemplo: CLC 6, aula 3, «Nuvem de palavras: uma casa boa».
- **Barra de ferramentas** no canto inferior direito (ou pelo teclado):

| Tecla | Ferramenta |
| --- | --- |
| `D` | Desenhar por cima do slide (os riscos ficam guardados nesse slide até fechares a página) |
| `Q` | Quadro em branco, escuro ou claro |
| `G` | Grafo de vocabulário |
| `P` | Pergunta rápida no telemóvel |
| `J` | Ao vivo: questionário do slide, mariposas, fábrica de sapatos |
| `Esc` | Fecha a ferramenta aberta |

No quadro, `Z` ou a tecla de apagar desfaz o último risco.

## Pergunta rápida

Escolhe o tipo (nuvem de palavras, verdadeiro ou falso, escala, escolha múltipla), escreve a pergunta e carrega em «Lançar». Aparece o código QR e, ao lado, as respostas a chegar. As respostas ficam na folha, num separador «Pergunta rápida dia-mês hora · pergunta». As últimas oito perguntas ficam guardadas no computador, no fundo da janela, para voltares a abrir as respostas.

## Grafo de vocabulário

As palavras são nós e as ligações entre conceitos são arestas.

- Numa nuvem de palavras, «Abrir como grafo de vocabulário» transforma as palavras dos alunos em nós (as mais repetidas são maiores) e vai juntando as que chegarem.
- Com `G` abres um grafo vazio e escreves tu as palavras (várias de uma vez, separadas por vírgulas).
- **Ligar:** toca numa palavra e depois noutra. Tocar outra vez nas mesmas duas desliga-as.
- **Etiqueta:** toca numa ligação e escreve (por exemplo «causa», «é um tipo de»).
- **Mover:** arrasta a palavra. «Arrumar» volta a distribuí-las.
- O grafo fica guardado neste computador (por aula e por pergunta). «Guardar imagem» descarrega um PNG.

## Limites a ter em conta

- As respostas da turma só aparecem depois de o Apps Script ser atualizado para a versão 3 (ver `respostas/LEIA-ME.md`).
- Um aluno entra nos gráficos quando acaba a atividade toda e carrega no fim, não pergunta a pergunta.
- O código QR só aparece com o site publicado (GitHub Pages), não com o ficheiro aberto do disco.
