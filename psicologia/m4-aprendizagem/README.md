# Psicologia · Módulo 4 · Fatores e processos de aprendizagem

Site interativo para projetar na sala e para os alunos estudarem em casa. Constrói a ideia de aprendizagem peça a peça, como uma escada em que cada degrau acrescenta um só conceito:

1. **O que é aprender?** A definição montada em três peças (experiência, mudança, estável e duradoura), o que não é aprendizagem, aprender sem mostrar, voluntária e involuntária, desaprender.
2. **O que ajuda a aprender?** Fatores individuais (maturação, atenção, motivação, aprendizagem anterior), sociais e situacionais.
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

## Ficheiros

| Ficheiro | O que tem |
| --- | --- |
| `index.html` | Todo o conteúdo: um `<section class="slide">` por slide |
| `style.css` | Aspeto (secção 16: as composições e simulações deste módulo) |
| `app.js` | Comportamento: navegação, passos, jogos, simulações, temporizadores |
| `notes.js` | Notas do professor, uma por slide |

## Atalhos na sala

| Tecla | Ação |
| --- | --- |
| `→`, espaço | Passo seguinte (ou slide seguinte) |
| `←` | Passo anterior (ou slide anterior) |
| `N` | Notas do professor |
| `F` | Ecrã inteiro |

## Simulações

- **Habituação** (`.habit`): cada toque da sirene mostra um susto menor.
- **Cão de Pavlov** (`.pavlov`): campainha, comida, ou as duas; a associação cresce com os pares e enfraquece só com a campainha (extinção).
- **Caixa de Skinner** (`.skinner`): escolhe reforço ou punição, positivo ou negativo, e vê a probabilidade de o rato carregar na alavanca a subir ou a descer. É ilustrativa: não usa dados reais.
- **Motivação** (`.yd`): a curva em U invertido.
- **Reforço ou punição?** (`.matrix2`): duas perguntas, uma resposta.
- **Questionário de preferências** (`.kolb`): seis perguntas, feito para a aula; não é o inventário de Kolb nem um diagnóstico. As respostas não saem do navegador.
