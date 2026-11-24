# Responder no telemóvel (todas as disciplinas)

Esta pasta tem a página que os alunos abrem no telemóvel pelo código QR dos slides «No telemóvel». É a mesma página para todas as disciplinas: o endereço diz qual é a atividade.

    respostas/?f=ai-2ano/o-trabalho&a=labor

- `f` é a pasta do site da aula;
- `a` é o nome de uma atividade escrita no `atividades.js` dessa pasta;
- em vez de `a`, `q=3` abre o quarto questionário ou jogo dos slides dessa aula (lido diretamente do `index.html`: é assim que todos os questionários de todas as aulas funcionam no telemóvel);
- em vez de `a`, `x=…` é uma pergunta rápida lançada pelo professor (tecla `P` nos slides).

Quando o aluno carrega em **Enviar**, as respostas vão para o Google Apps Script (endereço em `config.js`). O script escreve-as na folha de cálculo do teu Google Drive, num separador por disciplina e atividade, e manda-te um email com o assunto «disciplina · atividade · nome · data».

## Ficheiros

| Ficheiro | O que faz |
| --- | --- |
| `index.html`, `aluno.css`, `aluno.js` | A página do aluno no telemóvel |
| `config.js` | O endereço do Apps Script (o mesmo para todas as disciplinas) |
| `apps-script.gs`, `appsscript.json` | O código que está em script.google.com |

## Tipos de atividade

Cada atividade, no `atividades.js` do site da aula, tem `disciplina`, `titulo` e uma lista de `passos`, que o aluno faz por ordem:

| Passo | O que o aluno faz | Conta para «certas»? |
| --- | --- | --- |
| `jogo` | escolha múltipla, 20 segundos por pergunta, pontos e som | sim |
| `classificar` | um item de cada vez, escolhe a categoria | sim, se o item tiver a resposta certa (`c`) |
| `vf` | verdadeiro ou falso, uma afirmação de cada vez (`afirmacoes: [{ t, c: true, f }]`) | sim |
| `escala` | arrasta um cursor entre `min` e `max` (`etiquetas` para as pontas) | só se tiver valor certo (`c`, com `tolerancia`) |
| `nuvem` | escreve até `max` palavras (3 por defeito) para a nuvem da turma | não |
| `opiniao` | escolhe uma opção e, se quiser, explica porquê | não |
| `escrita` | responde em caixas de texto | não |

Há um exemplo de cada tipo em `demo/atividades.js`, para copiar. Para experimentar: `respostas/?f=demo&a=experimentar`.

## Novembro de 2026 (versão 3): vários nomes e respostas da turma

- **Colega sem telemóvel:** no primeiro ecrã, «Responder com um colega que não tem telemóvel» acrescenta outro nome (até quatro no total). Na folha, cada nome fica com a sua linha, com as mesmas respostas e a mesma pontuação.
- **Respostas da turma:** depois do sinal verde, o telemóvel mostra as respostas de todos, sem nomes: barras nas perguntas de escolha, histograma e média nas escalas, nuvem nas palavras. A resposta do próprio aluno vem marcada. Os textos livres (`escrita` e o «porquê» das opiniões) nunca saem da folha.
- Na folha, as colunas passam a chamar-se «Opinião», «Escala» e «Nuvem» além de «Escrita». Só as três primeiras, e as perguntas de jogo, entram nos gráficos. Nos separadores criados antes desta versão as opiniões estão em colunas «Escrita» e por isso não aparecem em gráfico.
- **É preciso atualizar o script uma vez** (instruções em baixo). Até lá, tudo continua a ser gravado como antes, mas os gráficos da turma não aparecem e dois nomes ficam na mesma linha («Ana + Bruno»).

## Atualizar o script no Google

Quando o `apps-script.gs` mudar, abre o projeto **CP4 respostas** em script.google.com, apaga o código antigo e cola o novo. Depois:
**Implementar → Gerir implementações → lápis → Versão: Nova versão → Implementar.**
O endereço `/exec` mantém-se, por isso não é preciso mudar o `config.js`.

## Novembro de 2026: envio confirmado

- O telemóvel lê a resposta do Apps Script e só mostra **«Respostas recebidas»** (sinal verde) quando a linha ficou escrita na folha. Enquanto envia, mostra uma roda a girar e pede para não fechar a página. Se falhar, tenta mais 4 vezes; se mesmo assim falhar, guarda as respostas no telemóvel e reenvia-as da próxima vez que o aluno abrir uma atividade.
- O Apps Script deixou de pôr os envios em fila (a fila fazia perder respostas quando a turma inteira acabava o mesmo jogo ao mesmo tempo). Para atualizar: colar `apps-script.gs` por cima → Implementar → Gerir implementações → lápis → Versão: Nova versão → Implementar.
- Se a página for aberta no navegador interno de um leitor de QR ou de outra app, aparece um aviso com o botão «Abrir no Chrome» (nalguns Android, o teclado não aparece nesses navegadores).
- Raramente, se a ligação cair depois de a folha gravar mas antes de chegar a confirmação, a mesma resposta pode aparecer duas vezes na folha.
- Caixas de texto: nalguns Android aparecia o cursor mas não o teclado (o campo do nome funcionava). Cada caixa tem agora, por baixo, «O teclado não aparece? Toca aqui.», que a troca por um campo de uma linha igual ao do nome; e tocar numa caixa que já tem o cursor reabre o teclado.
