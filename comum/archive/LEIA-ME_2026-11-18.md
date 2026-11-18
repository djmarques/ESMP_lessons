# Ferramentas comuns a todas as aulas

Esta pasta junta o que é igual em todos os sites das aulas. Cada `index.html` carrega-a com duas linhas no fim do `<body>`:

    <script src="../comum/partilhado.js"></script>
    <script src="../comum/aula.js"></script>

(com `../../` nas pastas de dois níveis, como `ai-2ano/o-trabalho/`). Um site novo só precisa destas duas linhas.

| Ficheiro | O que faz |
| --- | --- |
| `partilhado.js` | Lê os questionários e jogos dos slides; desenha as respostas da turma (barras, histograma, nuvem); código QR |
| `aula.js`, `aula.css` | Ferramentas do professor nos slides |

## O que aparece nos slides

- **«Responder no telemóvel»** em todos os questionários (`.quiz`) e jogos (`.game`) que não tinham botão. Não é preciso escrever nada em `atividades.js`: o telemóvel lê as perguntas do próprio slide. Cada questionário fica com o seu separador na folha «Avaliação contínua», com o título do slide.
- **«Respostas da turma»** ao lado dos botões que já existiam e dentro da janela do código QR: gráficos que se atualizam de 5 em 5 segundos, sem nomes. A caixa «Mostrar as respostas certas» pinta a opção certa de verde quando quiseres.
- **Barra de ferramentas** no canto inferior direito (ou pelo teclado):

| Tecla | Ferramenta |
| --- | --- |
| `D` | Desenhar por cima do slide (os riscos ficam guardados nesse slide até fechares a página) |
| `Q` | Quadro em branco, escuro ou claro |
| `G` | Grafo de vocabulário |
| `P` | Pergunta rápida no telemóvel |
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
