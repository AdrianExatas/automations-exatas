# Notas de engenharia reversa — schema Domínio (Extrator da DIRF x eSocial)

Conhecimento consolidado dos ~160 scripts pontuais desta pasta e da sessão de
validação/correção do motor de conciliação. Objetivo: servir de referência
rápida sem precisar reabrir os scripts de exploração um por um.

## Tabelas principais

| Tabela | Papel |
|---|---|
| `bethadba.GEEMPRE` | Cadastro de empresas (`CODI_EMP`, `NOME_EMP`, `CGCE_EMP`=CNPJ) |
| `bethadba.FOEMPREGADOS` | Cadastro de colaboradores (`CODI_EMP`, `I_EMPREGADOS`, `CPF`, `NOME`) |
| `bethadba.FOEVENTOS` | Cadastro de rubricas/eventos de folha — ver seção "Classificação de rubricas" |
| `bethadba.FOPARMTO` | Parametrização; liga evento ao `CODI_EMP_EVE` (empresa "modelo" de eventos) |
| `bethadba.FOBASESSERVIRRF` / `bethadba.FOBASESIRRF` | Base de cálculo do IRRF por serviço, agrupada por `TIPO` (ver abaixo). `RATEIO=0` evita duplicação por centro de custo. Join via `I_BASESIRRF`. |
| `bethadba.FOBASESSERV` / `bethadba.FOMOVTOSERV` | Movimentos de folha por evento (`VALOR_CAL`, `PROV_DESC`, `RATEIO`, `ORIGEM`). Join via `I_CALCULOS`. |
| `bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR` | Totalizador do retorno S-5002 por evento/CPF (campos `VLR*`) |
| `bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR` | CPF/nome do colaborador por evento do Extrator |
| `bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_DED_DEPEN` | Subtabela de dedução de dependentes do retorno S-5002 |
| `bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_PLANO_SAUDE` | Subtabela de plano de saúde do retorno S-5002 (`VLRSAUDETIT`) |
| `bethadba.FOESOCIAL_DADOS_EVENTOS` | Controle de validação/retificação (`VALIDADO`, `CODI_EMP_EVENTO_RETIFICADO`, `I_DADOS_EVENTOS_EVENTO_RETIFICADO`) |

## `TIPO` em `FOBASESIRRF` (confirmado, comentário em `validar_regras_2026.py`)

| TIPO | Significado |
|---|---|
| 1 | Mensal / Folha Normal |
| 2 | Adiantamento de 13º |
| 3 | 13º Salário Rescisão |
| 4 | PLR |
| 6 | 13º Salário 2ª Parcela |
| 7 | RRA (Rendimento Recebido Acumuladamente) — sem registros em 2026 até a data desta nota |

Bucket correto para "13º salário" no agregado: `TIPO IN (2, 3, 6)`. Bucket "mensal": `TIPO NOT IN (2, 3, 4, 6)`. (O motor `comparar_valor_sistema_esocial.py` mais antigo usa um bucket ligeiramente diferente — `NOT IN (4,6)` para mensal — o que só afeta a coluna de exibição "mensal vs 13º", não o total somado.)

## Classificação de rubricas (`FOEVENTOS`)

- `CLASSIFICACAO = 29` → Plano de Saúde (usado para achar `SISTEMA_PLANO_SAUDE` via `FOMOVTOSERV`)
- `CLASSIFICACAO = 46` → também tratado como isento no motor novo, mas **nenhum evento com esse código apareceu nos dados de 2026** — pode ser um código legado ou de outra empresa/config.
- `REND_ISENTOS` → não é booleano, é um código do tipo de isenção. Valores observados em 2026 e a rubrica associada (inferido pelos nomes, não documentado formalmente):
  - `1` = afastamentos/salário maternidade
  - `2` = ajuda de custo / diferenças
  - `5` = médias de férias (não necessariamente isento, aparece em rubricas normais também — cuidado)
  - `6` = aviso prévio indenizado, férias indenizadas/proporcionais em rescisão
  - `7` = salário família
  - `8` = abono pecuniário
  - **A condição `REND_ISENTOS > 0` no motor de conciliação já captura a maioria desses casos.**
- `REND_TRIBUTAVEIS` → similar, código do tipo de rendimento tributável (1=mensal, 2=INSS, 3=IRRF conforme usado em `auditar_divergencias_extrator.py`)
- `CODIGO_INCIDENCIA_IRRF_ESOCIAL` → código de incidência IRRF do leiaute eSocial (tabela 3 do S-1010). Faixa `70-79` = isentos; faixa `11-15` = tributável (conforme regra cadastrada em `auditar_divergencias_extrator.py`). Valores 72 e 46 (citados em versões antigas do motor de conciliação) não aparecem em uso nos dados de 2026 — parecem ser condições vestigiais/copiadas sem verificação.

## Gap conhecido: eSocial reporta mais "Isentos" que o Sistema calcula

Investigado em 2026-09-15 (ver commits/sessão de validação): mesmo com a regra de isentos "correta" aplicada, o eSocial (`VLRISENOUTROS` e campos irmãos no totalizador) reporta ~R$ 570 mil a mais do que o Sistema em 2026. Um caso concreto (empresa 370, CPF 064.675.814-40, competência 02/2026) mostrou que o Extrator da DIRF classificou rubricas de férias comuns (`HORAS FÉRIAS`, `1/3 DE FÉRIAS`) como isentas no campo `VLRISENOUTROS`, sem que o evento correspondente no Domínio tenha `REND_ISENTOS` marcado. **Hipótese**: o Extrator da DIRF aplica uma regra fiscal própria (não documentada nesta base) para decidir o que cai em "outros isentos", que não está 1:1 com o cadastro `FOEVENTOS.REND_ISENTOS`. Não foi encontrada uma correção de SQL simples para isso — precisa de confirmação com suporte Domínio ou documentação do Extrator.

## Retificação de eventos eSocial

Um evento retificado tem `VALIDADO=1` mas existe um evento "filho" com `CODI_EMP_EVENTO_RETIFICADO`/`I_DADOS_EVENTOS_EVENTO_RETIFICADO` apontando para ele. A regra `NOT EXISTS (... ret.VALIDADO = 1)` exclui o evento original quando a retificação está validada. Investigado em 2026-09-15: não foram encontradas cadeias de retificação de 2º nível nem eventos duplicados não-retificados para o mesmo CPF+competência em 2026 — o mecanismo de exclusão funciona corretamente nos dados atuais.
