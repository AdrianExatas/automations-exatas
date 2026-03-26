# Comparar Adiantamentos Líquidos Domínio

Lista documentos de Adiantamento nas pastas **RELATÓRIO DE LÍQUIDOS** (2025 e 2026) via API BD e storage Onvio, baixa os PDFs e compara com o relatório consolidado.

## Requisitos

- Node.js 18+
- API BD (projeto ONVIO/BD) rodando, ex.: `http://localhost:3001`
- `.env` com `ONVIO_UDS_LONG_TOKEN` e opcionalmente `API_BD_URL`, `ONVIO_FIRM_COMPANY_ID`, `FILTER_COMPANY_ID`, `DOWNLOAD_DIR`

## Instalação

```bash
npm install
```

## Variáveis de ambiente

Crie um `.env` na raiz do projeto:

- `ONVIO_UDS_LONG_TOKEN` (obrigatório) – token UDS Long do Onvio
- `API_BD_URL` – base da API BD (default: `http://localhost:3001`)
- `ONVIO_BASE_URL` – base Onvio (default: `https://onvio.com.br`)
- `ONVIO_FIRM_COMPANY_ID` – opcional, company ID do escritório
- `FILTER_COMPANY_ID` – opcional: código ou onvio_id da empresa (ex.: `259` para Litoral)
- `DOWNLOAD_DIR` – pasta de download dos PDFs (default: `./downloads`)
- `TEST_FOLDER_IDS` – opcional, para teste: lista de `folder_id` separados por vírgula (ignora API BD)

## Comandos

```bash
# Listar documentos "Adiantamento" nas pastas RELATÓRIO DE LÍQUIDOS 2025 e 2026
npm run listar-adiantamento

# Baixar os PDFs (usa listagem em memória ou arquivo JSON passado como argumento)
npm run baixar-adiantamento
# ou com JSON pré-gerado:
node scripts/baixar-documentos-adiantamento.js listagem.json

# Comparar relatório consolidado com os PDFs mensais baixados
npm run comparar-adiantamento
```

A listagem pede à API BD pastas cujo `path` termina em `.../RELATÓRIO DE LÍQUIDOS/2025` ou `.../RELATÓRIO DE LÍQUIDOS/2026`. O download não filtra por ano: todos os documentos retornados pelo listar são baixados.

## Incluindo documentos de 2026

Os scripts **já consideram 2025 e 2026**. Se só aparecerem (ou forem baixados) documentos de 2025, a causa costuma ser a **API BD** não ter pastas de 2026 no banco.

1. **Garantir que a API BD tenha pastas de 2026**  
   No projeto [ONVIO/BD](../BD), rode novamente o fluxo que popula a estrutura de pastas a partir do Onvio:
   - `npm run fetch` (gera/atualiza a estrutura em JSON)
   - `npm run sync:all` (ou `sync:extract` + `sync:validate` + `sync:load`) para carregar no Postgres  
   Assim a tabela `folders` passará a ter linhas com `path` terminando em `.../RELATÓRIO DE LÍQUIDOS/2026` (desde que essas pastas existam no Onvio).

2. **Rodar listar e baixar de novo**  
   Com a API BD atualizada:
   - `npm run listar-adiantamento` – confira no JSON de saída se `byYear.2026` tem itens.
   - `npm run baixar-adiantamento` – os PDFs de 2026 serão baixados junto com os de 2025.

Se `byYear.2026` continuar vazio após um novo sync, verifique no Onvio se as pastas **Pessoal/RELATÓRIO DE LÍQUIDOS/2026** existem para as empresas desejadas.
