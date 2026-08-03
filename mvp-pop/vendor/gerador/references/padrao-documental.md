# Padrão documental v2

## Princípios comuns

- Os quatro documentos compartilham `schema_version: "2.0"`, metadados, nomes de saída e IDs estáveis de etapa.
- Códigos usam os prefixos complementares `PR.`, `IN.`, `FORM.` e `MP.`.
- Informações não confirmadas ficam explícitas em `pontos_validacao`; transcrição ou risco sugerido nunca se torna informação oficial sem revisão humana.
- Modelos, logo e scripts são resolvidos somente por caminhos relativos à skill.
- Imagens operacionais não fazem parte da entrada do gerador. O vídeo pode gerar frames temporários apenas para análise, eliminados ao final.

## POP/PR

O POP resume a ordem do processo na tabela:

| O QUE | COMO | SETOR | REGISTRO |
| --- | --- | --- | --- |

- `O QUE`: ação clara.
- `COMO`: descrição curta da execução.
- `SETOR`: responsável confirmado ou ponto de validação.
- `REGISTRO`: sistema, documento ou evidência resultante.
- Não inserir prints.

## IT/IN

Cada item de `it.secoes` contém somente:

- `titulo`;
- `caminho`, quando conhecido, no formato `Sistema > Menu > Tela`;
- `instrucoes`, em ações numeradas;
- `atencoes`, apenas quando evitam um erro relevante;
- `campo_print` para etapas visualmente relevantes.

O campo manual usa controle Word do tipo imagem, caixa com borda 16:9, tag baseada no ID da etapa, orientação do que capturar e legenda. O gerador não procura nem incorpora uma imagem real.

Não renderizar público-alvo, glossário, “quando usar”, objetivo por etapa, conferências ou resultados repetitivos, mesmo que um JSON legado contenha esses campos.

## FORM

- Os blocos se referem às etapas e contêm critérios verificáveis com resposta `SIM/NÃO`.
- Respostas começam vazias. Qualquer vazio mantém o parecer `PENDENTE`.
- Sem vazios: uma resposta divergente produz `NÃO CONFORME`; todas conformes produzem `CONFORME`.
- O percentual fica vazio enquanto houver pendência e nunca exibe `#DIV/0!`.
- Células de entrada ficam desbloqueadas; fórmulas ficam protegidas.
- Cada bloco tem `EVIDÊNCIA/PRINT — INSERÇÃO MANUAL`.
- Cliente, prazo e contexto são configuráveis. Não inventar valor universal.
- Impressão: uma página de largura e altura automática.

## MP

- A cadeia contém `fornecedores`, `entradas`, `clientes` e `saidas`.
- O fluxo usa as macroetapas compartilhadas.
- `mp.riscos` aceita vários riscos por etapa.
- Risco plausível, mas não confirmado: `sugerido: true`, destaque visual e P/G vazios.
- P e G aceitam inteiros de 1 a 5. `P×G` e classificação permanecem vazios até ambos serem preenchidos.
- Escala: 1–4 `TOLERÁVEL`, 5–10 `ALARP`, 12–25 `INACEITÁVEL`.
- Mitigação e indicador ficam vazios sem evidência; a revisão é listada como pendência.
- Não manter planilhas, vínculos, nomes definidos ou conteúdo histórico dos exemplos sanitizados.

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
  "pontos_validacao": [],
  "transcricao": { "status": "concluida|inconclusiva|sem_audio|falhou" }
}
```

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
- Saída: somente documentos selecionados, relatório curto e arquivo de pendências quando necessário.

