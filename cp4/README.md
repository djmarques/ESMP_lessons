# CP 4 · Processos identitários

Site interativo da unidade Cidadania e Profissionalidade 4 (formação de adultos), para projetar na sala. Tem o programa e cinco blocos: o nome e o reconhecimento, o navio de Teseu, Phineas Gage e o outro, identidade pessoal e social, e organizações verticais e horizontais (contexto profissional).

Os blocos 2 a 5 estão orientados para a prática e para o mundo do trabalho: cada exercício tem uma etiqueta que diz como se faz (folha em branco, computador ou telemóvel, em pares, em grupos), e cada bloco fecha com um slide «Para que serve?». As versões anteriores estão em `archive/`.

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
