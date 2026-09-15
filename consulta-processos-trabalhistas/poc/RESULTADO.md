# Resultado da POC Datajud — busca por CNPJ

**Decisão: NO-GO.** A API pública do Datajud **não** permite localizar processos trabalhistas pelo CNPJ. Não construir o robô 400 × 24 TRTs em cima desta fonte.

Data da execução: 2026-09-04.

## Amostra

| CNPJ | Razão social (Receita) | UF | TRT esperado |
| --- | --- | --- | --- |
| 43.268.332/0001-64 | R R C TRANSPORTES LTDA | SE | TRT20 |
| 15.066.244/0001-44 | JOSAFA ALVES DOS SANTOS FERRAGENS LTDA | SE | TRT20 |

Não havia número de processo conhecido. Mesmo assim a falha **não** depende disso: o índice público simplesmente não tem o objeto `partes`.

Tribunais consultados: `api_publica_trt20` (sede das empresas), `api_publica_trt2` e schema também em `trt15`.

## Schema real (`_source`)

`_mapping` retorna **403** (usuário `dpj_api_publica` sem privilégio de metadata).

Documento público (TRT20 e TRT2 idênticos ao [glossário oficial](https://datajud-wiki.cnj.jus.br/api-publica/glossario/)):

- `id`, `tribunal`, `grau`, `numeroProcesso`
- `dataAjuizamento`, `nivelSigilo`, `dataHoraUltimaAtualizacao`, `@timestamp`
- `orgaoJulgador` (codigo, nome, codigoMunicipioIBGE)
- `classe`, `assuntos`, `sistema`, `formato`
- `movimentos` (codigo, nome, dataHora, complementos, orgaoJulgador)

**Ausentes:** `partes`, `polo`, `documento`, `cnpj`, `cpf`, `pessoa`.

## Busca por CNPJ

| Estratégia | HTTP | Resultado |
| --- | --- | --- |
| `match` em `partes.numeroDocumento` / `partes.documento` / `partes.nome` | 200 | 0 hits (campo não mapeado; o Elastic ignora) |
| `nested` em `path: partes` | 400 | `failed to find nested object under path [partes]` em TRT20 e TRT2 |

Nenhum processo retornado para os dois CNPJs.

## Rate limit e escala

- Latência típica: **10–18 s** por `_search`.
- TRT2 sob carga: `es_rejected_execution_exception` e timeout de leitura.
- Carga 400 CNPJs × 24 TRTs ≈ 9.600 calls; inviável mesmo se o campo existisse, sem fila e sem backoff. **Com o campo inexistente, a escala é irrelevante.**

## Critérios

- Sucesso (≥3/5 com documento da parte, ou processo-controle recuperado por CNPJ): **não atendido**.
- Falha (campo ausente + nested 400 + 0 hits): **atendido**.

## Próximo passo

Descoberta de acervo e processo novo: **API comercial** (Judit, Escavador ou similar), cotar 400 CNPJs, só Justiça do Trabalho, sem autos.

Datajud continua útil **depois** que o número CNJ existir: capa, classe, assuntos e movimentações nos aliases `api_publica_trt1`–`trt24`.

DJE permanece fase 2 (citações), não substitui descoberta.

Artefatos brutos: `poc/out/schema_*.json`, `poc/out/resultados.csv`.
