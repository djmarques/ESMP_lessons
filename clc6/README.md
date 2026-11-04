# CLC 6 · Culturas de urbanismo e mobilidade

Site interativo das aulas de Cultura, Língua e Comunicação 6 (formação de adultos), para projetar na sala. Por agora tem:

- o **programa** (núcleo gerador, os quatro DR e o percurso da casa ao mundo, avaliação);
- **DR1 · Aula 1**: a casa e o lar (cinco filósofos);
- **DR1 · Aula 2**: arquitetura hostil, ter lar sem ter casa, texto de opinião.

É HTML, CSS e JavaScript simples: não precisa de instalação nem de compilação. Funciona aberto diretamente no navegador (duplo clique em `index.html`) e no GitHub Pages.

## Ficheiros

| Ficheiro | O que tem |
| --- | --- |
| `index.html` | Todo o conteúdo: um `<section class="slide">` por slide |
| `style.css` | Aspeto (cores e tipos de letra da apresentação original) |
| `app.js` | Comportamento: navegação, passos, questionários, temporizadores, códigos QR |
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
