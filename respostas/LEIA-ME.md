# Responder no telemóvel (todas as disciplinas)

Esta pasta tem a página que os alunos abrem no telemóvel pelo código QR dos slides «No telemóvel». É a mesma página para todas as disciplinas: o endereço diz qual é a atividade.

    respostas/?f=ai-2ano/o-trabalho&a=labor

- `f` é a pasta do site da aula, onde está o ficheiro `atividades.js`;
- `a` é o nome da atividade dentro desse ficheiro.

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
| `opiniao` | escolhe uma opção e, se quiser, explica porquê | não |
| `escrita` | responde em caixas de texto | não |

## Atualizar o script no Google

Quando o `apps-script.gs` mudar, abre o projeto **CP4 respostas** em script.google.com, apaga o código antigo e cola o novo. Depois:
**Implementar → Gerir implementações → lápis → Versão: Nova versão → Implementar.**
O endereço `/exec` mantém-se, por isso não é preciso mudar o `config.js`.
