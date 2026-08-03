# Padrão documental v2

## Princípios comuns

- Os quatro documentos compartilham `schema_version: "2.0"`, metadados, nomes de saída e IDs estáveis de etapa.
- Códigos usam os prefixos complementares `PR.`, `IN.`, `FORM.` e `MP.`.
- A fonte principal é a transcrição fornecida, complementada por metadados informados pelo usuário (título, área, códigos, responsáveis, prazos).
- Informações não confirmadas ficam explícitas em `pontos_validacao`; risco sugerido nunca se torna informação oficial sem revisão humana.
- Modelos, logo e scripts são resolvidos somente por caminhos relativos à skill.
- Imagens operacionais não fazem parte da entrada do gerador; prints são inseridos manualmente nos campos preparados.

## POP/PR

O POP resume a ordem do processo na tabela:

| O QUE | COMO | SETOR | REGISTRO |
| --- | --- | --- | --- |

- `O QUE`: ação clara com verbo (ex.: Consultar, Registrar, Comunicar).
- `COMO`: orientação curta da execução (preferir até cerca de duas linhas); detalhes longos ficam na IT.
- `SETOR`: responsável confirmado pelo brief; se ausente, uma pendência de setor (não repetir placeholder em cada linha sem necessidade).
- `REGISTRO`: sistema, documento ou evidência resultante nomeável.
- `documento.objetivo` e `documento.resultado_esperado` devem estar preenchidos quando o POP for solicitado (entrada → resultado pretendido).
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
- Respostas começam vazias. Qualquer vazio mantém o parecer `PENDENTE`.
- Sem vazios: uma resposta divergente produz `NÃO CONFORME`; todas conformes produzem `CONFORME`.
- O percentual fica vazio enquanto houver pendência e nunca exibe `#DIV/0!`.
- Células de entrada ficam desbloqueadas; fórmulas ficam protegidas.
- Cada bloco tem `EVIDÊNCIA/PRINT — INSERÇÃO MANUAL`.
- Cliente, prazo e contexto são configuráveis. Não inventar valor universal.
- Impressão: uma página de largura e altura automática.

## MP

- A cadeia contém `fornecedores`, `entradas`, `clientes` e `saidas`, coerentes com o POP.
- O fluxo usa as macroetapas compartilhadas.
- `mp.riscos` aceita vários riscos por etapa; priorize falhas típicas (dado errado, acesso, omissão de evidência, falha de comunicação).
- Barreira preferencialmente aponta bloco/critério do FORM ou controle nomeado.
- Risco plausível, mas não confirmado: `sugerido: true`, destaque visual e P/G vazios.
- P e G aceitam inteiros de 1 a 5. `P×G` e classificação permanecem vazios até ambos serem preenchidos.
- Escala: 1–4 `TOLERÁVEL`, 5–10 `ALARP`, 12–25 `INACEITÁVEL`.
- Mitigação e indicador ficam vazios sem evidência; a revisão de P/G dos sugeridos vira **uma** pendência agrupada.
- Não manter planilhas, vínculos, nomes definidos ou conteúdo histórico dos exemplos sanitizados.

## Lista Documental Mestra

- Cada documento gerado (PR/IN/FORM/MP) produz entrada em `lista_mestra.entradas[]`.
- Campos mínimos: `codigo_titulo`, `origem` (`INTERNO`), `tipo`, `setor`, papéis de aprovação quando confirmados, `localizacao`, `procedimento_raiz`, `procedimentos_citados`.
- O build faz upsert por código na planilha no formato `FORM.QUA.003` (template sanitizado ou cópia de trabalho informada).
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
- FORM: critérios, validações `SIM/NÃO`, fórmulas, proteção, formatação condicional e paginação estão corretos.
- MP: cadeia, fluxo e riscos correspondem às etapas; sugeridos estão destacados; P/G começam vazios; escala e fórmulas funcionam.
- Conjunto: códigos, extensões, IDs e referências cruzadas são consistentes.
- Saída: `documentos/` com os arquivos selecionados; `geracao/` com JSON de conteúdo, relatório curto e arquivo de pendências quando necessário.

