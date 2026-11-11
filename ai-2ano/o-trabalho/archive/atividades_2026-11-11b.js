/* atividades.js — atividades para responder no telemóvel (página ../../respostas/).
   Uma atividade por slide com o botão «Responder no telemóvel» (data-path …&a=<chave>).
   Cada uma tem disciplina, título e passos: jogo, classificar, opiniao, escrita.
   Gerado a partir dos slides; ver respostas/LEIA-ME.md. */
window.ATIVIDADES = {
 "ontem": {
  "disciplina": "AI 11.º",
  "titulo": "O meu dia de ontem",
  "passos": [
   {
    "tipo": "escrita",
    "titulo": "Pensa no teu dia de ontem",
    "perguntas": [
     "Uma coisa que fizeste e que já desapareceu (comeste, lavaste, arrumaste…).",
     "Uma coisa que fizeste e que ainda lá está (montaste, arranjaste, criaste…).",
     "Uma coisa que fizeste com outros (combinaste, discutiste, decidiste, convenceste alguém…)."
    ]
   }
  ]
 },
 "eletricista": {
  "disciplina": "AI 11.º",
  "titulo": "O dia de um eletricista",
  "passos": [
   {
    "tipo": "classificar",
    "titulo": "Um dia de um técnico de instalações elétricas",
    "intro": "Para cada tarefa, escolhe: labor, obra ou ação.",
    "categorias": [
     "Labor",
     "Obra",
     "Ação"
    ],
    "itens": [
     {
      "t": "Instalar o quadro elétrico e os cabos de uma casa nova.",
      "c": 1,
      "f": "Obra: segue um projeto, tem fim, e fica na casa durante anos."
     },
     {
      "t": "Varrer e arrumar o local da obra ao fim do dia. Amanhã está sujo outra vez.",
      "c": 0,
      "f": "Labor: é consumido logo e tem de se repetir."
     },
     {
      "t": "Ir com os colegas falar com o encarregado para exigirem equipamento de proteção.",
      "c": 2,
      "f": "Ação: falar e agir com os outros, para mudar uma situação."
     },
     {
      "t": "Trocar as lâmpadas fundidas de um centro comercial, todas as semanas.",
      "c": 0,
      "f": "Labor: manutenção que nunca acaba. É preciso, mas não deixa nada de novo."
     },
     {
      "t": "Montar um sistema de painéis solares num telhado.",
      "c": 1,
      "f": "Obra: uma coisa nova, que fica no mundo."
     },
     {
      "t": "Votar na eleição da comissão de trabalhadores da empresa.",
      "c": 2,
      "f": "Ação: decidir em conjunto, na vida pública da empresa."
     }
    ]
   }
  ]
 },
 "multimedia": {
  "disciplina": "AI 11.º",
  "titulo": "O dia de um técnico de multimédia",
  "passos": [
   {
    "tipo": "classificar",
    "titulo": "Um dia de um técnico de multimédia",
    "intro": "Para cada tarefa, escolhe: labor, obra ou ação.",
    "categorias": [
     "Labor",
     "Obra",
     "Ação"
    ],
    "itens": [
     {
      "t": "Publicar três stories por dia na conta de uma loja. Desaparecem ao fim de 24 horas.",
      "c": 0,
      "f": "Labor: consome-se logo e amanhã é preciso recomeçar."
     },
     {
      "t": "Realizar um documentário de 20 minutos sobre o bairro.",
      "c": 1,
      "f": "Obra: tem um plano, um fim, e fica para ser visto anos depois."
     },
     {
      "t": "Organizar com outros criadores uma petição para mudar as regras de pagamento de uma plataforma.",
      "c": 2,
      "f": "Ação: agir em conjunto, em público, para mudar as regras."
     },
     {
      "t": "Responder todos os dias às mensagens e aos comentários da página de um cliente.",
      "c": 0,
      "f": "Labor: nunca acaba; no dia seguinte há mais."
     },
     {
      "t": "Criar o site e o logótipo de uma associação.",
      "c": 1,
      "f": "Obra: um objeto que fica e que outros vão usar."
     },
     {
      "t": "Falar num debate público sobre inteligência artificial e direitos de autor.",
      "c": 2,
      "f": "Ação: tomar a palavra diante dos outros."
     }
    ]
   }
  ]
 },
 "viral": {
  "disciplina": "AI 11.º",
  "titulo": "Um vídeo viral: obra ou labor?",
  "passos": [
   {
    "tipo": "opiniao",
    "p": "Um vídeo que se torna viral é obra ou labor?",
    "o": [
     "Obra",
     "Labor",
     "Depende"
    ],
    "porque": "Porquê?"
   }
  ]
 },
 "acao": {
  "disciplina": "AI 11.º",
  "titulo": "A ação na minha turma",
  "passos": [
   {
    "tipo": "escrita",
    "titulo": "Onde está a ação?",
    "perguntas": [
     "Quando é que a tua turma agiu em conjunto, este ano? O que fizeram?",
     "No teu futuro trabalho, onde é que vais poder agir com os outros?"
    ]
   }
  ]
 },
 "profissao": {
  "disciplina": "AI 11.º",
  "titulo": "A minha profissão em três cores",
  "passos": [
   {
    "tipo": "escrita",
    "titulo": "A tua profissão",
    "intro": "Escreve tarefas da profissão para que estás a estudar (eletricista ou técnico de multimédia).",
    "perguntas": [
     "Tarefas de labor: repetem-se e não deixam nada que dure.",
     "Tarefas de obra: produzem uma coisa que fica.",
     "Tarefas de ação: fazem-se com os outros, falando e decidindo."
    ]
   },
   {
    "tipo": "opiniao",
    "p": "Qual das três vai ocupar mais tempo do teu dia?",
    "o": [
     "Labor",
     "Obra",
     "Ação"
    ],
    "porque": "Porquê? (opcional)"
   },
   {
    "tipo": "opiniao",
    "p": "E qual te dá mais orgulho?",
    "o": [
     "Labor",
     "Obra",
     "Ação"
    ],
    "porque": "Porquê? (opcional)"
   }
  ]
 },
 "quiz": {
  "disciplina": "AI 11.º",
  "titulo": "Labor, obra ou ação? (verificação)",
  "passos": [
   {
    "tipo": "jogo",
    "perguntas": [
     {
      "p": "Qual destas atividades é labor?",
      "o": [
       "Construir uma casa",
       "Preparar o jantar da família",
       "Votar numa eleição",
       "Escrever um livro"
      ],
      "c": 1,
      "f": "O jantar é consumido e é preciso recomeçar: labor."
     },
     {
      "p": "O que distingue a obra do labor?",
      "o": [
       "A obra é mais cansativa",
       "A obra é sempre paga",
       "O resultado da obra dura e fica no mundo",
       "A obra é sempre feita em grupo"
      ],
      "c": 2,
      "f": "A obra produz coisas que duram."
     },
     {
      "p": "Os estafetas de uma cidade reúnem-se, discutem e decidem exigir em conjunto melhores condições. Isto é…",
      "o": [
       "Labor",
       "Obra",
       "Ação",
       "Nenhuma"
      ],
      "c": 2,
      "f": "Ação: começar algo novo com os outros."
     },
     {
      "p": "Porque critica Arendt a sociedade moderna?",
      "o": [
       "Porque as pessoas trabalham pouco",
       "Porque quase tudo se torna produzir e consumir",
       "Porque as máquinas são perigosas",
       "Porque já ninguém fabrica objetos"
      ],
      "c": 1,
      "f": "O labor ganhou às outras duas atividades."
     }
    ]
   }
  ]
 },
 "dimensoes": {
  "disciplina": "AI 11.º",
  "titulo": "As duas dimensões do trabalho",
  "passos": [
   {
    "tipo": "opiniao",
    "p": "Um futebolista profissional: que dimensão do trabalho pesa mais?",
    "o": [
     "Económica",
     "Social",
     "As duas"
    ],
    "porque": "Porquê?"
   },
   {
    "tipo": "escrita",
    "perguntas": [
     "Na tua futura profissão, o que vai pesar mais: a dimensão económica (o salário) ou a social (quem és, para quem és útil)? Porquê?"
    ]
   }
  ]
 },
 "labor": {
  "disciplina": "AI 11.º",
  "titulo": "Labor, obra e ação",
  "passos": [
   {
    "tipo": "jogo",
    "perguntas": [
     {
      "p": "Lavar a loiça é…",
      "o": [
       "labor",
       "ação",
       "obra"
      ],
      "c": 0,
      "f": "Ao jantar fica tudo limpo; ao pequeno-almoço, tudo recomeça."
     },
     {
      "p": "Construir uma mesa é…",
      "o": [
       "obra",
       "ação",
       "labor"
      ],
      "c": 0,
      "f": "Segue um plano, tem fim, e o resultado dura no mundo."
     },
     {
      "p": "Votar numa eleição aproxima-se de…",
      "o": [
       "labor",
       "obra",
       "ação"
      ],
      "c": 2,
      "f": "Faz-se com os outros, na esfera pública, e muda as relações."
     },
     {
      "p": "O que é próprio do labor?",
      "o": [
       "o resultado é consumido e é preciso recomeçar",
       "precisa sempre dos outros",
       "o resultado dura"
      ],
      "c": 0,
      "f": "Responde às necessidades do corpo."
     },
     {
      "p": "«Sozinho podes trabalhar, mas não podes…»",
      "o": [
       "comer",
       "agir",
       "fabricar"
      ],
      "c": 1,
      "f": "Para Arendt, a ação precisa dos outros."
     },
     {
      "p": "A dimensão social do trabalho diz respeito a…",
      "o": [
       "quanto se ganha",
       "quantas horas se trabalha",
       "quem somos: identidade, estatuto, relações"
      ],
      "c": 2,
      "f": "A dimensão económica responde a «quanto vale, e quem paga?»."
     },
     {
      "p": "Uma técnica de instalações elétricas, numa empresa, com horário e salário, trabalha…",
      "o": [
       "como voluntária",
       "sem pagamento, em casa",
       "por conta de outrem",
       "por conta própria"
      ],
      "c": 2,
      "f": "É assalariada: trabalha sob a autoridade de um empregador."
     },
     {
      "p": "Um editor de vídeo independente, com os seus clientes, trabalha…",
      "o": [
       "por conta de outrem",
       "por conta própria",
       "como voluntário"
      ],
      "c": 1,
      "f": "Decide como trabalha e vende o resultado aos clientes."
     }
    ]
   },
   {
    "tipo": "classificar",
    "titulo": "Labor, obra ou ação?",
    "categorias": [
     "Labor",
     "Obra",
     "Ação"
    ],
    "intro": "Para cada atividade, escolhe a categoria certa.",
    "itens": [
     {
      "t": "Lavar a roupa de trabalho todas as semanas.",
      "c": 0,
      "f": "Repete-se sem fim e não deixa nada que dure."
     },
     {
      "t": "Gravar e editar o vídeo de apresentação da escola.",
      "c": 1,
      "f": "Tem um plano, um fim, e fica para outros verem."
     },
     {
      "t": "Juntar-se aos colegas para pedir à direção uma sala de edição aberta à noite.",
      "c": 2,
      "f": "Agir com os outros para mudar uma situação."
     },
     {
      "t": "Fazer a instalação elétrica de uma garagem.",
      "c": 1,
      "f": "Uma coisa nova, que fica durante anos."
     },
     {
      "t": "Preparar as refeições do dia.",
      "c": 0,
      "f": "Consome-se logo e é preciso recomeçar."
     },
     {
      "t": "Discutir e votar, na associação de estudantes, a data da viagem de finalistas.",
      "c": 2,
      "f": "Decidir em conjunto, tomando a palavra."
     },
     {
      "t": "Limpar a caixa de email todas as manhãs.",
      "c": 0,
      "f": "No dia seguinte, está cheia outra vez."
     },
     {
      "t": "Fazer um portefólio com os teus melhores trabalhos.",
      "c": 1,
      "f": "Um objeto que fica e que vais mostrar."
     },
     {
      "t": "Falar numa reunião de pais e alunos para propor uma mudança na escola.",
      "c": 2,
      "f": "Tomar a palavra em público."
     }
    ]
   },
   {
    "tipo": "opiniao",
    "p": "Na tua futura profissão, o que vai ocupar mais tempo?",
    "o": [
     "Labor",
     "Obra",
     "Ação"
    ],
    "porque": "Porquê? Dá um exemplo."
   },
   {
    "tipo": "escrita",
    "perguntas": [
     "Dá um exemplo do teu curso (Multimédia ou Instalações Elétricas) para cada uma: labor, obra e ação.",
     "Que «obra» gostavas de deixar feita, uma coisa que dure? Porquê?"
    ]
   }
  ]
 },
 "saida": {
  "disciplina": "AI 11.º",
  "titulo": "Bilhete de saída: labor, obra e ação",
  "passos": [
   {
    "tipo": "escrita",
    "titulo": "Bilhete de saída",
    "perguntas": [
     "Um exemplo teu de labor.",
     "Um exemplo teu de obra.",
     "Um exemplo teu de ação.",
     "Uma pergunta que ainda tens (opcional)."
    ]
   }
  ]
 },
 "abolicao": {
  "disciplina": "AI 11.º",
  "titulo": "Pela abolição",
  "passos": [
   {
    "tipo": "opiniao",
    "p": "Ainda hoje há pessoas vítimas de tráfico humano e de trabalho forçado. Já tinhas ouvido falar disso?",
    "o": [
     "Sim",
     "Não",
     "Não tenho a certeza"
    ],
    "porque": "Onde ouviste, ou o que imaginas que seja?"
   },
   {
    "tipo": "escrita",
    "titulo": "Na pele de uma pessoa escravizada",
    "perguntas": [
     "Imagina-te na pele de uma pessoa escravizada. Escreve três argumentos a favor da abolição da escravatura.",
     "Volta às quatro perguntas da ficha (quem manda, o que te prende, o que recebes, podes ir-te embora). Qual das respostas te parece mais injusta? Porquê?"
    ]
   }
  ]
 },
 "quemfala": {
  "disciplina": "AI 11.º",
  "titulo": "Quem está a falar?",
  "passos": [
   {
    "tipo": "classificar",
    "titulo": "Quem está a falar?",
    "intro": "Lê cada frase e escolhe quem a diz.",
    "categorias": [
     "Recoletor",
     "Escravo",
     "Servo",
     "Aprendiz"
    ],
    "itens": [
     {
      "t": "«Hoje comemos o que apanhámos. Amanhã mudamos de sítio.»",
      "c": 0,
      "f": "Recoletor: vive do que a Natureza dá e é nómada."
     },
     {
      "t": "«Fui feito prisioneiro na guerra. Agora pertenço a um dono.»",
      "c": 1,
      "f": "Escravo: os prisioneiros de guerra eram transformados em escravos."
     },
     {
      "t": "«Não posso sair desta terra sem o senhor deixar.»",
      "c": 2,
      "f": "Servo: está preso à gleba."
     },
     {
      "t": "«Paguei para entrar na oficina. Dão-me comida e cama.»",
      "c": 3,
      "f": "Aprendiz: paga para aprender o ofício."
     },
     {
      "t": "«Trabalho de graça nas terras do senhor. Chama-se corveia.»",
      "c": 2,
      "f": "Servo: a corveia é trabalho gratuito na reserva."
     },
     {
      "t": "«Não tenho quaisquer direitos, nem sou cidadão.»",
      "c": 1,
      "f": "Escravo: sem direitos e sem cidadania."
     }
    ]
   },
   {
    "tipo": "escrita",
    "perguntas": [
     "No teu estágio (formação em contexto de trabalho), quem é o «mestre»? Em que degrau da escada estás tu: aprendiz, companheiro ou mestre? Explica."
    ]
   }
  ]
 },
 "oficina": {
  "disciplina": "AI 11.º",
  "titulo": "Oficina, manufatura ou fábrica?",
  "passos": [
   {
    "tipo": "classificar",
    "titulo": "Oficina, manufatura ou fábrica?",
    "intro": "Situações de hoje, nos vossos cursos. A que se parece cada uma?",
    "categorias": [
     "Oficina",
     "Manufatura",
     "Fábrica"
    ],
    "itens": [
     {
      "t": "Um eletricista por conta própria faz sozinho toda a instalação de uma casa.",
      "c": 0,
      "f": "Oficina: uma pessoa domina o trabalho do princípio ao fim."
     },
     {
      "t": "Trinta pessoas montam quadros elétricos à mão; cada uma faz só uma parte.",
      "c": 1,
      "f": "Manufatura: à mão, com o trabalho dividido e um patrão."
     },
     {
      "t": "Uma linha de máquinas produz quilómetros de cabo elétrico por dia.",
      "c": 2,
      "f": "Fábrica: quem produz é a máquina."
     },
     {
      "t": "Uma criadora filma, edita e publica o seu próprio vídeo.",
      "c": 0,
      "f": "Oficina: faz o produto inteiro, com as suas ferramentas."
     },
     {
      "t": "Num estúdio, um escreve, outro filma, outro edita e outro trata do som.",
      "c": 1,
      "f": "Manufatura: feito por pessoas, mas cada uma só faz uma parte."
     },
     {
      "t": "Um programa gera sozinho milhares de anúncios por hora.",
      "c": 2,
      "f": "Fábrica: a produção passou para a máquina."
     }
    ]
   },
   {
    "tipo": "opiniao",
    "p": "Onde preferias trabalhar?",
    "o": [
     "Oficina",
     "Manufatura",
     "Fábrica"
    ],
    "porque": "Porquê? O que se ganha e o que se perde?"
   }
  ]
 },
 "fichas": {
  "disciplina": "AI 11.º",
  "titulo": "Dez mil anos numa tabela",
  "passos": [
   {
    "tipo": "opiniao",
    "p": "Em que época preferias ser trabalhador?",
    "o": [
     "Recoletor",
     "Servo",
     "Companheiro numa oficina",
     "Operário numa fábrica"
    ],
    "porque": "Porquê? Usa pelo menos uma das quatro perguntas da ficha."
   },
   {
    "tipo": "escrita",
    "perguntas": [
     "Preenche a tua própria ficha, a pensar no teu estágio ou no teu primeiro emprego: quem manda, o que te prende, o que recebes, podes ir-te embora?"
    ]
   }
  ]
 },
 "modelos-ie": {
  "disciplina": "AI 11.º",
  "titulo": "Taylor, Ford ou Toyota? · Instalações Elétricas",
  "passos": [
   {
    "tipo": "classificar",
    "titulo": "Taylor, Ford ou Toyota?",
    "intro": "Situações de trabalho na tua área. Que modelo de organização é?",
    "categorias": [
     "Taylorismo",
     "Fordismo",
     "Toyotismo"
    ],
    "itens": [
     {
      "t": "Um supervisor cronometra quanto tempo demoras a cravar cada terminal e pagam-te por peça.",
      "c": 0,
      "f": "Taylorismo: tempos cronometrados e pagamento à peça."
     },
     {
      "t": "O quadro elétrico passa num tapete e tu só apertas sempre os mesmos quatro parafusos.",
      "c": 1,
      "f": "Fordismo: a linha de montagem traz o trabalho até ti."
     },
     {
      "t": "A empresa só encomenda o cabo depois de o cliente confirmar a obra.",
      "c": 2,
      "f": "Toyotismo: produzir o necessário, no momento necessário."
     },
     {
      "t": "O engenheiro planeia tudo no gabinete; tu só executas o que está na folha.",
      "c": 0,
      "f": "Taylorismo: quem pensa é o gabinete."
     },
     {
      "t": "Uma fábrica faz milhares de tomadas iguais por dia, para vender barato a toda a gente.",
      "c": 1,
      "f": "Fordismo: produção em massa de bens padronizados."
     },
     {
      "t": "Na tua equipa todos sabem fazer instalação, domótica e manutenção, e decidem juntos.",
      "c": 2,
      "f": "Toyotismo: trabalhadores multifuncionais, em equipa."
     }
    ]
   },
   {
    "tipo": "opiniao",
    "p": "Em qual dos três modelos preferias trabalhar?",
    "o": [
     "Taylorismo",
     "Fordismo",
     "Toyotismo"
    ],
    "porque": "Porquê?"
   }
  ]
 },
 "modelos-mm": {
  "disciplina": "AI 11.º",
  "titulo": "Taylor, Ford ou Toyota? · Multimédia",
  "passos": [
   {
    "tipo": "classificar",
    "titulo": "Taylor, Ford ou Toyota?",
    "intro": "Situações de trabalho na tua área. Que modelo de organização é?",
    "categorias": [
     "Taylorismo",
     "Fordismo",
     "Toyotismo"
    ],
    "itens": [
     {
      "t": "Uma agência mede quantas legendas fazes por hora e paga-te por cada uma.",
      "c": 0,
      "f": "Taylorismo: tempos controlados e pagamento à peça."
     },
     {
      "t": "Um estúdio faz centenas de vídeos iguais: um só corta, outro só põe o som, outro só exporta.",
      "c": 1,
      "f": "Fordismo: produção em série, cada um numa tarefa repetitiva."
     },
     {
      "t": "Só se começa o vídeo depois de o cliente o encomendar, e é feito à medida dele.",
      "c": 2,
      "f": "Toyotismo: produz-se o que é pedido, personalizado."
     },
     {
      "t": "O diretor decide tudo; os editores seguem o guião plano a plano, sem propor nada.",
      "c": 0,
      "f": "Taylorismo: uns pensam, outros executam."
     },
     {
      "t": "O mesmo anúncio padronizado, produzido em massa para milhões de pessoas.",
      "c": 1,
      "f": "Fordismo: produto uniforme, consumo em massa."
     },
     {
      "t": "Na equipa todos sabem filmar, editar e fazer grafismo, e qualquer um pode travar uma entrega com erros.",
      "c": 2,
      "f": "Toyotismo: equipa multifuncional que controla a qualidade."
     }
    ]
   },
   {
    "tipo": "opiniao",
    "p": "Em qual dos três modelos preferias trabalhar?",
    "o": [
     "Taylorismo",
     "Fordismo",
     "Toyotismo"
    ],
    "porque": "Porquê?"
   }
  ]
 },
 "impacto": {
  "disciplina": "AI 11.º",
  "titulo": "A tecnologia e o trabalho",
  "passos": [
   {
    "tipo": "opiniao",
    "p": "A tecnologia no mundo do trabalho, para ti, é sobretudo…",
    "o": [
     "uma oportunidade",
     "uma ameaça",
     "as duas coisas"
    ],
    "porque": "Dá um exemplo da tua área (Instalações Elétricas ou Multimédia)."
   },
   {
    "tipo": "escrita",
    "perguntas": [
     "Escolhe um impacto, positivo ou negativo, da revolução tecnológica no mundo do trabalho e comenta-o em três ou quatro linhas."
    ]
   }
  ]
 },
 "teletrabalho": {
  "disciplina": "AI 11.º",
  "titulo": "Dá para fazer em teletrabalho?",
  "passos": [
   {
    "tipo": "classificar",
    "titulo": "Dá para fazer em teletrabalho?",
    "intro": "Tarefas das vossas duas áreas.",
    "categorias": [
     "Sim",
     "Não"
    ],
    "itens": [
     {
      "t": "Instalar o quadro elétrico de um prédio.",
      "c": 1,
      "f": "Tem de ser feito no local."
     },
     {
      "t": "Editar um vídeo para um cliente.",
      "c": 0,
      "f": "Basta o computador, o software e a internet."
     },
     {
      "t": "Desenhar no computador o esquema elétrico de uma casa.",
      "c": 0,
      "f": "É trabalho de projeto: faz-se em qualquer lugar."
     },
     {
      "t": "Filmar um casamento.",
      "c": 1,
      "f": "É preciso estar lá."
     },
     {
      "t": "Fazer o orçamento de uma instalação e enviá-lo por correio eletrónico.",
      "c": 0,
      "f": "Trabalho de escritório: pode ser à distância."
     },
     {
      "t": "Reparar a avaria de um elevador.",
      "c": 1,
      "f": "Exige presença e ferramentas no local."
     }
    ]
   },
   {
    "tipo": "opiniao",
    "p": "Gostavas de trabalhar em teletrabalho?",
    "o": [
     "Sim",
     "Não",
     "Só alguns dias"
    ],
    "porque": "Diz uma vantagem e um inconveniente para ti."
   }
  ]
 },
 "upwork": {
  "disciplina": "AI 11.º",
  "titulo": "Trabalhar numa plataforma",
  "passos": [
   {
    "tipo": "opiniao",
    "p": "Trabalhavas como freelancer numa plataforma?",
    "o": [
     "Sim",
     "Não",
     "Só como complemento"
    ],
    "porque": "Porquê?"
   },
   {
    "tipo": "escrita",
    "titulo": "Vantagens e desvantagens",
    "perguntas": [
     "Uma vantagem e uma desvantagem deste modelo para quem presta o serviço (o freelancer).",
     "Uma vantagem e uma desvantagem para quem contrata.",
     "Que direitos e que proteção social achas que este tipo de trabalho garante? (Pensa em férias, doença e desemprego.)"
    ]
   }
  ]
 }
};
