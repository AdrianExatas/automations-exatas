# alterar-responsavel

Automacao em Node.js/TypeScript para alterar o responsavel e regerar as tarefas do mes no Gestta a partir de uma planilha local.

## Pre-requisitos

- Node.js 18+
- `.env` com `JWT_GESTTA` ou `GESTTA_JWT_TOKEN`
- planilha local em `../_local/data/DP RESPONSAVEL.xlsx` ou outro caminho informado por argumento/variavel

## Configuracao

1. Copie `.env.example` para `.env`.
2. Preencha o token JWT do Gestta.
3. Opcionalmente defina `API_3001_URL` para enriquecer a resolucao por CNPJ.
4. Opcionalmente defina `PLANILHA_PATH`.

Padrao da planilha quando nada e informado:

```text
../_local/data/DP RESPONSAVEL.xlsx
```

## Uso

```bash
npm install
npm run build
npm run start
```

Selecionar a planilha no Explorer do Windows:

```bash
npm run start:selecionar
```

Executar com caminho explicito:

```bash
npm run start -- "C:\\pasta\\minha-planilha.xlsx"
npm run dev -- "..\\_local\\data\\DP RESPONSAVEL.xlsx"
```

## Formato da planilha

Colunas esperadas:

- `COD.`
- `CNPJ`
- `RESPONSAVEL`
- `MES GERACAO`
- `SETOR` opcional

## Observacoes

- falhas por empresa nao interrompem o restante da execucao
- os relatorios ficam em `relatorios/`
- detalhes sobre a API local e lacunas do Gestta estao em [../docs/uso-api-3001-e-lacunas-gestta.md](../docs/uso-api-3001-e-lacunas-gestta.md)
