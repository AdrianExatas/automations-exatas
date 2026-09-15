# Automação: Auditoria e Conciliação do Extrator da DIRF x eSocial

Este projeto realiza a **extração, auditoria e conciliação** entre os dados da Folha de Pagamento do Domínio (regime de caixa) e os dados retornados pelo eSocial (Totalizador S-5002) processados pelo Extrator da DIRF.

---

## 📁 Estrutura do Projeto

```text
consultar_extrator_dirf/
│
├── .env                                   # Credenciais de conexão ODBC (Sybase SQL Anywhere) — nunca versionado
├── common.py                              # Utilitários compartilhados (conexão, load_env, format_cpf/cnpj)
├── README.md                              # Documentação técnica e operacional
│
├── auditar_e_gerar_relatorio_fidedigno.py # MOTOR PRINCIPAL: gera os dois relatórios executivos de conciliação
├── comparar_valor_sistema_esocial.py      # Motor anterior (aceita filtros por --codi-emp/--ano/--competencia)
├── auditar_divergencias_extrator.py       # Auditoria de CADASTRO de rubricas (FOEVENTOS x incidência eSocial)
│
├── tests/
│   └── test_regressao_conciliacao.py      # Teste de regressão (roda contra o banco, sem pytest)
│
├── queries/                               # Consultas SQL consolidadas e documentadas
│   ├── sql_extrator_dados_sistema.sql
│   ├── sql_extrator_eventos_sistema.sql
│   └── sql_extrator_esocial_s5002.sql
│
├── relatorios/                            # Planilhas Excel de saída (gitignored — contém CPF/remuneração)
│   ├── Auditoria_Extrator_DIRF_eSocial_2026.xlsx  # Relatório executivo (motor principal)
│   ├── Comparacao_Valor_Sistema_eSocial.xlsx      # Mesmo motor/conteúdo, nome de compatibilidade
│   └── Relatorio_Geral_Divergencias_Extrator.xlsx # Saída de auditar_divergencias_extrator.py
│
└── archive_reverse_engineering/           # Acervo de engenharia reversa e scripts de descoberta
    ├── NOTES.md                           # Schema consolidado (tabelas, códigos TIPO/incidência IRRF)
    ├── dumps/                             # Extrações do PowerBuilder (forel19.pbd)
    └── scripts_inspecao/                  # ~160 scripts pontuais usados no mapeamento das tabelas
```

---

## ⚙️ Como Funciona a Conciliação (motor principal)

O motor `auditar_e_gerar_relatorio_fidedigno.py` compara, por Empresa + Competência + CPF:

1. **Valor do Sistema** (regime de caixa, por `DATA_PAGTO`):
   - Bases do IRRF: `bethadba.FOBASESIRRF` (`RATEIO = 0`), categorizadas por `TIPO`: Mensal (`NOT IN (2,3,4,6)`), 13º Salário (`IN (2,3,6)`), PLR (`= 4`).
   - Previdência Oficial (`ABATIMENTOS`) e Dependentes (`DEPEND_DESCONTO`).
   - Plano de Saúde (`FOEVENTOS.CLASSIFICACAO = 29`) e Rendimentos Isentos (`FOEVENTOS.REND_ISENTOS > 0` e correlatos) via `FOMOVTOSERV`.
2. **Valor do eSocial**: retorno **S-5002** validado (`FOESOCIAL_DADOS_EVENTOS.VALIDADO = 1`, excluindo eventos retificados) e suas subtabelas `_DED_DEPEN` e `_PLANO_SAUDE`.
3. **Classificação por linha** (`|Diferença| > R$ 0,01`), em ordem de severidade:
   - `DIVERGÊNCIA CRÍTICA: IRRF` — folha e eSocial divergem no imposto retido (risco de malha fina/autuação).
   - `DIVERGÊNCIA: BASE DE CÁLCULO` — divergência nos rendimentos tributáveis.
   - `DIVERGÊNCIA: DEDUÇÕES (INSS/DEP)` — INSS ou dependentes.
   - `DIVERGÊNCIA: PLANO SAÚDE/ISENTOS` — plano de saúde ou rendimentos isentos.
   - `PENDÊNCIA eSOCIAL` — folha calculada, evento S-5002 ainda não retornado (normalmente atraso de processamento nos meses mais recentes).
   - `APENAS NO eSOCIAL` — evento eSocial sem folha correspondente no Domínio.
   - `CONCILIADO 100%` — nenhuma divergência acima do centavo.

O **dashboard** ("📊 Resumo Executivo") calcula os totais financeiros globais **excluindo** `PENDÊNCIA eSOCIAL`/`APENAS NO eSOCIAL`, para não misturar atraso operacional com divergência fiscal real — o valor pendente aparece à parte, numa nota de rodapé da tabela.

### Limitação conhecida: Rendimentos Isentos

O eSocial reporta, de forma consistente, mais "Isentos/Não Tributáveis" do que o Sistema calcula (~R$ 570 mil de diferença global em 2026). Investigação mostrou que o **Extrator da DIRF** classifica algumas rubricas de férias como isentas (`VLRISENOUTROS`) sem que isso esteja refletido no cadastro `FOEVENTOS.REND_ISENTOS` do Domínio — não é um filtro faltando no SQL, é uma regra fiscal própria do Extrator não documentada nesta base. Ver detalhes em `archive_reverse_engineering/NOTES.md`. Por isso essa categoria é tratada como severidade **MÉDIA** (revisão manual), não crítica.

---

## 🚀 Como Executar

### Motor principal (recomendado)
```powershell
python auditar_e_gerar_relatorio_fidedigno.py
```
Gera `relatorios/Auditoria_Extrator_DIRF_eSocial_2026.xlsx` e `relatorios/Comparacao_Valor_Sistema_eSocial.xlsx` (mesmo conteúdo, nomes diferentes por compatibilidade). Ano-base fixo em `2026` dentro de `main()` — ajustar lá para auditar outro ano.

### Motor anterior (com filtros de linha de comando)
```powershell
python comparar_valor_sistema_esocial.py --codi-emp 206 --ano 2026
python comparar_valor_sistema_esocial.py --competencia 2026-01-01
```

### Auditoria de cadastro de rubricas
```powershell
python auditar_divergencias_extrator.py --empresa 206
```
Identifica rubricas cujo `CODIGO_INCIDENCIA_IRRF_ESOCIAL` (faixa isento 70-79 / tributável 11-15) diverge da flag `REND_ISENTOS`/`REND_TRIBUTAVEIS` cadastrada no Domínio — útil para investigar a causa-raiz de divergências recorrentes de Base/Isentos antes de tratá-las manualmente.

### Teste de regressão
```powershell
python tests/test_regressao_conciliacao.py
```
Roda contra o banco de produção (somente leitura) e valida invariantes estruturais + 2 casos históricos conhecidos de IRRF crítico. Rodar antes de qualquer alteração no motor de classificação.

---

## 📊 Estrutura da Planilha Gerada (motor principal)

8 abas: **Resumo Executivo** (dashboard), **Divergências Críticas IRRF**, **Divergências de Base**, **Pendências eSocial**, **Apenas no eSocial**, **Divergências Plano Saúde**, **Resumo por Empresa**, **Conciliação Completa** (analítico linha a linha, todas as colunas Sistema x eSocial x Diferença).
