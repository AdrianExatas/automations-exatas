# Automação de Conferência REINF × DCTFWeb × Domínio

Sistema de conciliação fiscal automatizada entre os totalizadores da EFD-Reinf armazenados no banco Thomson Reuters Domínio e a declaração oficial DCTFWeb transmitida à Receita Federal, obtida pelo serviço `DCTFWEB.CONSXMLDECLARACAO38` da API SERPRO Integra Contador.

Desenvolvido em **TypeScript / Bun**.

---

## Recursos e Destaques

- **Conformidade em Centavos:** Tolerância R$ 0,00. Qualquer diferença a partir de R$ 0,01 é classificada como divergência.
- **Filtro Estrito de Origens:** Processa exclusivamente `Reinf CP = 6` (Série R-2000) e `Reinf RET = 7` (Série R-4000), descartando origens alheias (como eSocial = 1).
- **Validação de Fechamento do Domínio:** Valida o último fechamento aceito com recibo (`R-2099` / `R-4099`). Detecta reaberturas posteriores (`R-2098` / `R-4098`) ou ausência de fechamento, classificando o período como pendente e nunca declarando falsa conformidade.
- **Segurança e Sigilo:**
  - Todas as consultas ao banco Domínio são estritamente `SELECT`.
  - XMLs fiscais e credenciais permanecem exclusivamente em memória.
  - Nenhum segredo (senhas, PFX, tokens) é gravado no SQLite, logs ou exportado para o Excel.
- **Proteção de Custo:** Estimativa prévia de chamadas tarifadas ao SERPRO antes do disparo de lotes, com confirmação obrigatória.
- **Relatório Excel Multi-Abas:** Abas `Resumo`, `Divergências`, `Detalhes`, `Pendências`, `Erros` e `Metadados`.
- **Painel Visual Moderno:** Dashboard executivo web servido nativamente com Bun, suporte a modo escuro, cards de KPI e drilldown por código de receita.

---

## Comandos de Execução

### 1. Painel Web
```bash
bun run ui
# Acesse em: http://localhost:3000
```

### 2. Linha de Comando (CLI)

#### Conferência de Empresa Individual
```bash
bun run compare --competencia 2026-01 --empresa 101
```

#### Conferência em Lote
```bash
bun run batch --competencia 2026-01 --export relatorio_2026_01.xlsx
```

#### Modo Simulado / Teste Offline
Adicione a flag `--mock` (ou `-m`) para rodar os 5 cenários reais controlados sem necessidade de conexão ativa ao SERPRO ou ODBC:
```bash
bun run batch --competencia 2026-01 --mock --yes
```

---

## Configuração de Ambiente (.env)

Copie o `.env.example` para `.env` na raiz do projeto ou nesta pasta:

```ini
# SERPRO Integra Contador
SERPRO_CONSUMER_KEY=<sua-consumer-key>
SERPRO_CONSUMER_SECRET=<seu-consumer-secret>
SERPRO_CERT_PFX_PATH=<caminho-absoluto-do-certificado.pfx>
SERPRO_CERT_PASSWORD=<senha-do-certificado>
SERPRO_CONTRATANTE_CNPJ=00000000000000

# Domínio Sistemas (ODBC / Sybase SQL Anywhere)
DOMINIO_ODBC_DSN=Contabil Oficial
DOMINIO_USER=EXTERNO
DOMINIO_PASSWORD=<senha-usuario-externo>

# Auditoria e Aplicação
SQLITE_DB_PATH=conferencia_historico.db
PORT=3000
```

---

## Testes Automatizados

Para executar a suíte completa de testes:
```bash
bun test
```
