# Padrão documental v2

## Princípios comuns

- Os quatro documentos compartilham `schema_version: "2.0"`, metadados, nomes de saída e IDs estáveis de etapa.
- Códigos usam os prefixos complementares `PR.`, `IN.`, `FORM.` e `MP.`.
- A fonte principal é a transcrição fornecida, complementada por metadados informados pelo usuário (título, área, códigos, responsáveis, prazos).
- Informações não confirmadas ficam explícitas em `pontos_validacao`; risco sugerido nunca se torna informação oficial sem revisão humana.
- Modelos, logo e scripts são resolvidos somente por caminhos relativos à skill.
- Imagens operacionais não fazem parte da entrada do gerador; prints são inseridos manualmente nos campos preparados.
- O texto operacional (POP/IT/FORM/MP) é **universal**: não depende do vídeo nem de uma empresa específica filmada. Use “empresa da execução”, “contribuinte da tarefa”, “período solicitado”, etc. **Não** citar razão social, CNPJ ou nomes do caso da gravação no `COMO`, instruções, critérios ou riscos. **Não** usar meta-linguagem (“na fonte”, “exemplo demonstrativo”, “no vídeo”, “na gravação”). Demos da transcrição, se necessário mencionar, ficam só em `pontos_validacao`.

## POP/PR

O POP resume a ordem do processo na tabela:

| O QUE | COMO | SETOR | REGISTRO |
| --- | --- | --- | --- |

- `O QUE`: ação clara com verbo (ex.: Consultar, Registrar, Comunicar).
- `COMO`: orientação curta da execução (preferir até cerca de duas linhas); detalhes longos ficam na IT.
- `SETOR`: responsável confirmado pelo brief; se ausente, uma pendência de setor (não repetir placeholder em cada linha sem necessidade).
- `REGISTRO`: sistema, documento ou evidência resultante nomeável.
- `documento.objetivo` e `documento.resultado_esperado` devem estar preenchidos quando o POP for solicitado (entrada → resultado pretendido).
- Abreviaturas e documentação complementar: formato e anti-`System.String[]` em `word-abertura.md` (âncora PR.FIS.001: `CODIGO - Titulo;`, sem o próprio documento).
- Não inserir prints.

## IT/IN

Cada item de `it.secoes` contém somente:

- `titulo`;
- `caminho`, quando conhecido, no formato `Sistema > Menu > Tela`;
- `instrucoes`, em ações numeradas no imperativo;
- `atencoes`, apenas quando evitam um erro relevante;
- `campo_print` para etapas visualmente relevantes.

Quando a fonte trouxer decisão ou exceção (se/então), documente **ambos** os ramos nas instruções da etapa correspondente (ex.: com e sem parcelamento). Não omitir o ramo alternativo.

O campo manual usa controle Word do tipo imagem, caixa com borda 16:9, tag baseada no ID da etapa, orientação do que capturar e legenda. O gerador não procura nem incorpora uma imagem real. A orientação deve evitar exposição de credenciais, dados pessoais desnecessários ou informações de outro cliente.

Não renderizar público-alvo, glossário, “quando usar”, objetivo por etapa, conferências ou resultados repetitivos, mesmo que um JSON legado contenha esses campos.

## FORM

- Os blocos se referem às etapas e contêm critérios verificáveis com resposta `SIM/NÃO`.
- Cada pergunta deve auditar um fato observável ou evidência (não intenção). Preferir uma pergunta por fato; evitar compostas ambíguas.
- Critérios condicionais deixam a condição explícita (ex.: “Quando houver débitos, os valores foram registrados…?”).
- Etapas críticas da IT (decisão, evidência, comunicação) devem ter bloco FORM ou pendência justificada.
- Layout Excel (gerado por openpyxl a partir de `assets/templates/FORM-template.xlsx`, sanitizado da referência FORM.QUA.002; **sem** Excel COM em lote): cabeçalho institucional (logo/Setor/Código/título/emissão/revisão/versão), painel de coeficiente e resumo de inspeção, blocos numerados com `Coeficiente Parcial` e `Parecer Inspeção`, rodapé com `OBSERVAÇÃO` e assinaturas.
- Respostas começam vazias. Parecer do bloco inicia em `NÃO CONFORME` (dropdown institucional); o executor ajusta para `CONFORME` após inspeção.
- Sem vazios respondidos: o coeficiente parcial e o resumo usam as fórmulas do template (`SIM` → 100%, demais → 0%).
- Cliente/CNPJ, prazo (`prazo_dias`) e observações são configuráveis. Não inventar valor universal.
- Impressão: área `B2:K85`, retrato, uma página de largura.
- Fidelidade estrutural: ver contrato fechado em `form-fidelidade.md` e gate `compare_form_fidelity.py` no build. Aba `FORM`, zoom 85%, grade oculta, sem freeze de painéis, merges ≥165, 17 regras de formatação condicional e logo do template.

## MP

- A cadeia contém `fornecedores`, `entradas`, `clientes` e `saidas`, coerentes com o POP.
- O fluxo usa as macroetapas compartilhadas.
- `mp.riscos` aceita vários riscos por etapa; priorize falhas típicas (dado errado, acesso, omissão de evidência, falha de comunicação).
- BARREIRA do Excel é um bloco mesclado com os títulos de documento do pacote (**FORM + IN + PR** via `codigo_*` / `arquivo_*`). Não usar `FORM.… - Bloco B0x` na coluna BARREIRA (blocos ficam no FORM).
- RESULTADO mesclado até o slot 65; Mitigação permanece por linha.
- DEPART. e SIPOC de setor usam a lista numerada `01 - Atendimento` … `13 - Auditoria` (Plan1!D). QUEM FAZ usa Plan1!B.
- Risco plausível, mas não confirmado: `sugerido: true` e destaque visual; P/G podem vir vazios do JSON.
- P e G aceitam inteiros de 1 a 5. Quando ausentes, a normalização aplica o padrão (3 e 3 em risco sugerido, 2 e 3 nos demais) para que `P×G` e a classificação colorida saiam preenchidos como na referência; a revisão dos valores fica registrada como pendência.
- Escala: 1–4 `TOLERÁVEL`, 5–10 `ALARP`, 12–25 `INACEITÁVEL`.
- Mitigação e indicador ficam vazios sem evidência; a revisão de P/G dos sugeridos vira **uma** pendência agrupada.
- Não manter planilhas, vínculos, nomes definidos ou conteúdo histórico dos exemplos sanitizados.
- Layout Excel (gerado por openpyxl a partir de `assets/templates/MP-template.xlsx`, sanitizado da referência MP.FIS.001; **sem** Excel COM em lote): cabeçalho no padrão MP.FIS.001 (Código/Emissão/Versão/Revisão à direita; DEPART./PROCESSO sem fundo azul; INÍCIO/PRODUTO na faixa navy; Resultado ocultável), SIPOC `CADEIA CLIENTE FORNECEDOR` com SAÍDA, mapa integrado nas linhas 38–65, escalas 66–86 (`E70` = `MUITO GRAVE`), formas vetoriais DrawingML e abas auxiliares Plan1/EXEMPLO ocultas.
- Fidelidade estrutural: ver contrato fechado em `mp-fidelidade.md` e gate `compare_mp_fidelity.py` no build. Aba `MP`, zoom 85%, grade oculta, painéis em `A7`, 86 linhas, merges BARREIRA/RESULTADO, coluna `ETAPAS` vazia (rótulo na forma), BARREIRA sem hiperlink, classificação/P×G via formatação condicional e descrição do risco na coluna auxiliar oculta `L` + comentário.

## Lista Documental Mestra

- Cada documento gerado (PR/IN/FORM/MP) pode produzir entrada em `lista_mestra.entradas[]` no JSON (útil para rastreio).
- Campos mínimos: `codigo_titulo`, `origem` (`INTERNO`), `tipo`, `setor`, papéis de aprovação quando confirmados, `localizacao`, `procedimento_raiz`, `procedimentos_citados`.
- A planilha `FORM.QUA.003` só é gerada/atualizada no build com `-UpdateListaMestra` ou `-ListaMestraPath` (omitida por padrão; `-SkipListaMestra` força a omissão).
- A referência em `../../referencias/FORM.QUA.003...` não é sobrescrita automaticamente.

## Contrato JSON v2

Use `content-v2.schema.json` como definição validável. Estrutura resumida:

```json
{
  "schema_version": "2.0",
  "documentos_solicitados": ["pop", "it", "form", "mp"],
  "saida": {
    "arquivo_pop": "PR.XXX.XXX - Processo.docx",
    "arquivo_it": "IN.XXX.XXX - Processo.docx",
    "arquivo_form": "FORM.XXX.XXX - Processo.xlsx",
    "arquivo_mp": "MP.XXX.XXX - Processo.xlsx"
  },
  "documento": {
    "titulo": "PROCESSO",
    "codigo_pop": "PR.XXX.XXX",
    "codigo_it": "IN.XXX.XXX",
    "codigo_form": "FORM.XXX.XXX",
    "codigo_mp": "MP.XXX.XXX"
  },
  "pop": { "etapas": [] },
  "it": { "secoes": [] },
  "form": { "campos_contexto": [], "blocos": [] },
  "mp": { "cadeia": {}, "riscos": [] },
  "lista_mestra": { "entradas": [] },
  "pontos_validacao": [],
  "transcricao": { "status": "fornecida", "idioma": "pt" }
}
```

`lista_mestra.entradas` pode ser omitida na entrada: a normalização deriva uma linha por documento solicitado.

Status de `transcricao` no fluxo atual: use `fornecida`. A normalização ainda aceita aliases (`concluida`, `inconclusiva`, `falhou` e legados como `sem_audio`) apenas por compatibilidade.

Referências:

- `it.secoes[].etapa_id` aponta para `pop.etapas[].id` quando o POP existir.
- `form.blocos[].etapa_id` aponta para a etapa correspondente.
- `mp.riscos[].etapa_id` aponta para uma macroetapa.
- IDs não se repetem dentro da coleção à qual pertencem.
- Nomes de saída são apenas nomes de arquivo, nunca caminhos, e têm a extensão do documento.

## Compatibilidade legada

- `paragrafos` e `passo_a_passo` tornam-se `instrucoes`.
- `print_id` e `prints[].caption` tornam-se ID e legenda do campo manual.
- `timestamp`, `filename`, `path`, `redactions` e propriedades similares de prints são descartados.
- Campos didáticos antigos que não pertencem ao perfil objetivo da IT são ignorados na renderização.

## Validação de entrega

- Word: arquivo abre sem reparo; cabeçalho, logo e tabelas existem; IT possui um controle de imagem por campo solicitado; não há screenshot real no corpo.
- FORM: critérios, validações `SIM/NÃO`, fórmulas, formatação condicional e paginação estão corretos; fidelidade aprovada por `compare_form_fidelity.py`.
- MP: cadeia, fluxo e riscos correspondem às etapas; sugeridos estão destacados; P/G trazem o padrão da normalização pendente de revisão; escala e fórmulas funcionam; BARREIRA = FORM+IN+PR; fidelidade aprovada por `compare_mp_fidelity.py`.
- Conjunto: códigos, extensões, IDs e referências cruzadas são consistentes.
- Saída: `documentos/` com os arquivos selecionados; `geracao/` com JSON de conteúdo, relatório curto e arquivo de pendências quando necessário.

