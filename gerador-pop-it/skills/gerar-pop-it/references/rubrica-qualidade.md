# Rubrica de qualidade operacional

Critérios para documentos úteis à operação, alinhados ao padrão Exatas, aos exemplos em `../../referencias/` e aos fundamentos de gestão de processos (abordagem ISO 9001: entrada → processo → resultado pretendido; PR = cronologia; IN = padrão de cumprimento; monitorar via FORM/MP).

Use esta rubrica **antes** de fechar o JSON v2. Falhas viram correção no conteúdo ou pendência explícita — nunca invenção de regra.

## Princípios

1. **Resultado pretendido**: o pacote deixa claro o que entra, o que se faz e o que deve sair.
2. **Executável**: um operador consegue cumprir a IN sem conhecimento implícito.
3. **Auditável**: o FORM verifica fatos observáveis e evidências, não intenções.
4. **Rastreável**: IDs e barreiras do MP apontam para etapas/controles reais.
5. **Honesto**: lacunas ficam em `pontos_validacao` (agrupadas), sem completar por suposição.
6. **Universal**: o texto operacional não cita empresa/cliente do vídeo nem meta-frases (“na fonte”, “exemplo demonstrativo”, “no vídeo”); usa termos genéricos (“empresa da execução”).

## PR (POP)

| Critério | Passa quando |
| --- | --- |
| Objetivo | `documento.objetivo` descreve o propósito do processo |
| Resultado | `documento.resultado_esperado` descreve a saída pretendida |
| Etapas | `O QUE` com verbo de ação; ordem cronológica |
| Como | `COMO` curto (orientação, não tutorial longo); sem demo do vídeo |
| Registro | `REGISTRO` nomeia sistema, documento ou evidência concreta |
| Setor | Confirmado pelo brief ou uma única pendência de setor |
| Universalidade | Sem razão social/nome do caso filmado nem “na fonte”/“exemplo demonstrativo” |

## IN (IT)

| Critério | Passa quando |
| --- | --- |
| Caminho | UI conhecida usa `Sistema > Menu > Tela` |
| Ações | Instruções numeradas, no imperativo, uma ação por item |
| Atenções | Só alertas que evitam erro real |
| Ramos | Se a fonte tem decisão (se/então), ambos os ramos aparecem |
| Print | Campo 16:9 só em etapa visualmente crítica; legenda descreve a tela |
| Perfil | Sem público-alvo, glossário didático, “quando usar” ou objetivos por etapa |
| Privacidade | Orientação de print evita credenciais e dados de outro cliente |
| Universalidade | Instruções sem empresa-demo do vídeo nem meta-frases da gravação |

## FORM

| Critério | Passa quando |
| --- | --- |
| Verificável | Cada pergunta checa um fato observável ou evidência |
| Forma | Pergunta termina em `?`; `resposta_conforme` coerente (`SIM`/`NÃO`) |
| Atomicidade | Evita perguntas compostas ambíguas (dois fatos em uma só) |
| Cobertura | Pontos de decisão/evidência da IT têm critério (ou pendência justificada) |
| Condicional | Critérios “quando aplicável” deixam a condição explícita no texto |
| Evidência | Observação/assinatura no rodapé institucional; critérios auditam fatos observáveis |

## MP

| Critério | Passa quando |
| --- | --- |
| SIPOC | Fornecedores/entradas/clientes/saídas coerentes com o PR |
| Riscos | Ligados a `etapa_id` existente; descrevem falha operacional real |
| Barreira | Preferencialmente aponta bloco/critério FORM ou controle nomeado |
| P/G | Riscos não confirmados ficam `sugerido: true`; P/G ausentes recebem o padrão da normalização |
| Mitigação | Só preenchida com evidência na fonte; senão vazia + pendência |
| Pendência | Uma pendência agrupada para revisar P/G dos riscos sugeridos |

## Cobertura cruzada

Quando os documentos existirem no pacote:

- Toda etapa POP tem seção IT correspondente (`etapa_id`).
- Etapas críticas (decisão, evidência, comunicação ao cliente) têm bloco FORM — ou pendência explicando a omissão.
- Todo risco MP com `etapa_id` referencia etapa existente.
- Códigos do pacote são consistentes entre si e com a Lista Mestra.

## Lista Documental Mestra

Cada PR/IN/FORM/MP gerado pode ter entrada em `lista_mestra.entradas[]` no JSON:

- `codigo_titulo`, `origem` (`INTERNO`), `tipo`, `setor`
- elaborador / verificador / aprovador quando confirmados
- `procedimento_raiz` = código PR do pacote (se houver)
- `procedimentos_citados` = demais códigos do pacote + documentação complementar confirmada
- localização do arquivo gerado ou pendência se ainda não houver diretório oficial

A planilha `FORM.QUA.003` no build é opt-in (`-UpdateListaMestra` ou `-ListaMestraPath`).

## Checklist rápido (antes do build)

- [ ] Objetivo e resultado preenchidos (se POP solicitado)
- [ ] Ramos da transcrição refletidos na IN
- [ ] FORM auditável e ligado às etapas
- [ ] MP com SIPOC e barreiras úteis
- [ ] Pendências agrupadas (sem spam)
- [ ] Entradas da lista mestra coerentes com os documentos solicitados
