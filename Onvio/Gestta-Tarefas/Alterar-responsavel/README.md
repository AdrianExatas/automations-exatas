# Automação: Alterar responsável de tarefas (Gestta)

Altera o responsável e regera as tarefas do mês para cada empresa listada na planilha **DP RESPONSÁVEL.xlsx**.

## Pré-requisitos

- Node.js 18+
- Planilha `data/DP RESPONSÁVEL.xlsx` com colunas: **CÓD.**, **CNPJ**, **RESPONSÁVEL**, **MES GERACAO** (opcional: **SETOR**)

## Como obter o JWT

1. Faça login no app [Gestta](https://app.gestta.com.br).
2. Abra as ferramentas do desenvolvedor (F12) → aba Rede (Network).
3. Realize qualquer ação (ex.: abrir uma empresa).
4. Localize uma requisição à `api.gestta.com.br` e copie o valor do header `Authorization` (ex.: `JWT eyJhbG...`).
5. Use apenas o token (a parte após `JWT `) no `.env`.

O JWT expira; renove e atualize o `.env` quando necessário.

## Configuração

1. Copie `.env.example` para `.env`.
2. Defina no `.env`:
   - `JWT_GESTTA=` ou `GESTTA_JWT_TOKEN=` com o token obtido acima.
   - Opcional: `API_3001_URL=` (ex.: `http://localhost:3001`) para resolver cliente por CNPJ e listar setores canônicos via API local do projeto *Comparar Adiantamentos*.
   - Opcional: `PLANILHA_PATH=` com o caminho absoluto ou relativo à pasta do script para a planilha (padrão: `../data/DP RESPONSÁVEL.xlsx` quando o script é executado de dentro de `Alterar-responsavel`).

## Formato da planilha

| CÓD. | CNPJ           | RESPONSÁVEL    | MES GERACAO |
|------|----------------|----------------|-------------|
| 1    | 07273339000100 | Juliana Pereira| mar/26      |
| 2    | 52.815.444/0001-89 | João Silva | 03/2026  |

- **MES GERACAO:** aceita `mar/26`, `03/2026`, etc. (mês 1–12, ano 2 ou 4 dígitos).
- **CNPJ:** pode ser com ou sem formatação; será normalizado (só dígitos).

## Uso

```bash
cd Alterar-responsavel
npm install
npm run build
npm run start
```

**Selecionar planilha no Explorer (Windows):** abre o diálogo “Abrir arquivo” para escolher o .xlsx:

```bash
npm run start:selecionar
# ou
npm run start -- --selecionar
```

**Ou informar o caminho** como argumento (caminho absoluto ou relativo):

```bash
npm run start -- "C:\pasta\minha-planilha.xlsx"
npm run start -- "../data/DP RESPONSÁVEL outubro.xlsx"
npm run dev -- "caminho/para/planilha.xlsx"
```

O script processa cada linha da planilha, uma por uma, com um pequeno intervalo (500 ms) entre empresas. Falhas em uma empresa não interrompem as demais; ao final é exibido um resumo (sucesso/falha) e a lista de falhas.

## Lacuna: IDs do PATCH “Alterar responsável”

O PATCH `admin/group/customer/config` exige um array **ids** (IDs de registros `group_customer`).

- O script usa GET `/admin/customer/:customerId/company/task` e envia os `_id` dos itens no PATCH; **não está provado** que esses IDs sejam os esperados pelo PATCH.
- Se nenhum ID for obtido (ou a chamada falhar), o **PATCH é omitido** e apenas **Remover tarefas** e **Gerar tarefas** são executados.
- Em caso de falha, o log indica a **etapa** em que ocorreu (ex.: `buscarCliente`, `removerTarefas`) e, para GET company/task, o status e trecho da resposta.

Para mais detalhes e o que ainda falta descobrir na API do Gestta, veja **[docs/uso-api-3001-e-lacunas-gestta.md](../docs/uso-api-3001-e-lacunas-gestta.md)**.

## Estrutura

```
Alterar-responsavel/
  package.json
  tsconfig.json
  .env.example
  src/
    index.ts       # entrada: lê planilha, orquestra por linha
    types.ts       # interfaces
    planilha.ts    # leitura Excel, normalização CNPJ, parse mês/ano
    mapeamentos.ts # cliente por CNPJ, usuário por nome; opcional API 3001
    api/
      client.ts    # axios com base URL e Authorization
      endpoints.ts # listar clientes/usuários, getGroupCustomerIds, PATCH, DELETE/POST task-gen
      local-api-3001.ts  # opcional: empresas e departamentos da API local (porta 3001)
  README.md
```

## Variáveis de ambiente

| Variável        | Obrigatório | Descrição |
|-----------------|-------------|-----------|
| JWT_GESTTA ou GESTTA_JWT_TOKEN | Sim | Token JWT do Gestta |
| API_3001_URL    | Não         | URL da API local (ex.: `http://localhost:3001`) para resolver gestta_id por CNPJ e listar setores |
| PLANILHA_PATH   | Não         | Caminho da planilha quando não informado por argumento (padrão: `../data/DP RESPONSÁVEL.xlsx`) |

**Ordem de definição da planilha:** 1) argumento na linha de comando → 2) `PLANILHA_PATH` → 3) padrão.
