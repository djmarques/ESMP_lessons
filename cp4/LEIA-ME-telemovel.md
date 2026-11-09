# Respostas pelo telemóvel → email e folha de cálculo

Cada bloco tem, a seguir ao jogo, um slide **«No telemóvel»** com um código QR. Cada formando abre-o no seu telemóvel, escreve o nome, joga (20 segundos por pergunta, com pontos e som) e responde a duas ou três perguntas escritas. Quando carrega em **Enviar**:

- recebes **um email por formando** (nome, data, respostas do jogo e respostas escritas);
- fica tudo numa folha de cálculo no teu Google Drive, **«CP 4 · respostas dos formandos»**, com um separador por atividade e uma linha por formando.

O site está no GitHub Pages e não consegue enviar emails sozinho. Quem recebe as respostas é um pequeno programa (Google Apps Script) que corre na tua conta Google. Só tens de o instalar uma vez.

## Instalar (uma vez, cerca de 5 minutos)

1. Vai a **https://script.google.com** com a tua conta Google e carrega em **Novo projeto**.
2. Apaga o que lá está. Abre o ficheiro `apps-script.gs` desta pasta, copia tudo e cola. Dá um nome ao projeto (por exemplo «CP4 respostas») e carrega no ícone de guardar.
3. **Autorizar e testar:** na barra de cima, escolhe a função `testar` e carrega em **Executar**. O Google pede autorização:
   - aparece «A Google não validou esta app», porque o programa é teu e não foi publicado. Carrega em **Avançadas → Aceder a CP4 respostas (não seguro)** e depois em **Permitir**;
   - deve chegar-te um email «CP 4 · Teste · Formando de teste», e aparece no Drive a folha «CP 4 · respostas dos formandos». Podes apagar a linha de teste.
4. **Publicar:** **Implementar → Nova implementação**. Na roda dentada, escolhe **Aplicação Web**.
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**

   Carrega em **Implementar** e copia o **URL da aplicação Web** (termina em `/exec`).
5. Abre `config.js` desta pasta e cola esse endereço entre as aspas:
   ```js
   SCRIPT_URL: 'https://script.google.com/macros/s/…/exec'
   ```
6. Envia os ficheiros para o GitHub, como fazes com os slides.

Para confirmar que está a funcionar, abre o endereço `/exec` no navegador: deve aparecer «O recetor de respostas do CP 4 está a funcionar.»

## Se o Google não pedir autorização para enviar email

Se o teste der o erro «Não tem autorização para chamar MailApp…», declara as autorizações à mão:
1. No editor, roda dentada **Definições do projeto** → marca **Mostrar o ficheiro de manifesto "appsscript.json" no editor**.
2. Abre `appsscript.json` no editor, apaga o conteúdo e cola o do ficheiro `appsscript.json` desta pasta. Guarda.
3. Volta a `Código.gs`, escolhe `testar` e carrega em **Executar**. O Google pede de novo as autorizações: marca **Selecionar tudo**.

## Na sala

- O código QR só aparece com o site **publicado** (no GitHub Pages). Aberto como ficheiro no teu computador, o slide mostra um aviso no lugar do código QR.
- Quem não tiver telemóvel faz como antes: o jogo projetado, de braço no ar, e as respostas escritas na folha.
- Se a internet falhar, o telemóvel guarda as respostas e mostra o botão **Tentar enviar outra vez**. Se o envio não estiver configurado, o formando vê um resumo das respostas para te mostrar.

## Limites e cuidados

- Uma conta Gmail pessoal pode enviar cerca de **100 emails por dia** com o Apps Script. Acima disso, os emails param até ao dia seguinte, mas as respostas continuam a entrar na folha. Para deixares de receber emails e usares só a folha, muda `ENVIAR_EMAIL = true` para `false` no script.
- Qualquer pessoa com o endereço pode enviar respostas. O endereço só está no código QR, por isso o risco é baixo.
- Os nomes e as respostas dos formandos ficam guardados na tua conta Google. Se a escola tiver regras sobre dados dos alunos, ou uma conta Google da escola, usa essa.
- Se mudares o código do script, tens de fazer **Implementar → Gerir implementações → editar → Nova versão** para a mudança passar a valer (o endereço mantém-se).

## Ficheiros

| Ficheiro | O que faz |
| --- | --- |
| `aluno.html`, `aluno.css`, `aluno.js` | A página do formando no telemóvel |
| `atividades.js` | As perguntas de cada atividade (jogo e perguntas escritas), copiadas dos jogos do `index.html` |
| `config.js` | O endereço do teu Apps Script |
| `apps-script.gs` | O código que colas em script.google.com |

Se mudares uma pergunta de um jogo no `index.html`, pede para voltar a gerar o `atividades.js`, ou edita-o à mão: cada pergunta tem `p` (pergunta), `o` (opções), `c` (posição da certa, a contar do 0) e `f` (explicação).
