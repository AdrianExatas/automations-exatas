# Automacao: espelhar empresas e responsaveis no Gestta

CLI em Node.js/TypeScript para sincronizar o vinculo empresa-tarefa e o responsavel por empresa a partir de uma planilha de exemplo em `data/PROVISAO DP.xlsx`.

## Escopo do v1

- Ler planilha com `COD`, `EMPRESA`, `CNPJ`, `TAREFA` e `RESPONSAVEL`
- Resolver empresa e tarefa no Gestta
- Resolver responsavel no Gestta com fallback para `http://localhost:3001/api/employees`
- Adicionar empresas ausentes na tarefa
- Aguardar a configuracao da tarefa aparecer por empresa
- Alterar o responsavel de cada empresa na tarefa
- Validar o resultado final por empresa
- Remover vinculos extras apenas depois da validacao final

O v1 nao chama `task-gen`. Tarefas operacionais ja geradas no Gestta nao sao removidas nem regeneradas.

## Configuracao

1. Copie `.env.example` para `.env`
2. Defina `JWT_GESTTA` ou `GESTTA_JWT_TOKEN`
3. Opcionalmente ajuste `PLANILHA_PATH`
4. Opcionalmente ajuste `LOCAL_API_URL` ou `API_3001_URL`
5. Opcionalmente ajuste `GESTTA_HTTP_TIMEOUT_MS`, `GESTTA_READ_RETRIES`, `GESTTA_READ_RETRY_DELAY_MS` e `GESTTA_CUSTOMER_TASK_CONCURRENCY`

## Uso

```bash
npm install
npm run build
npm start
```

Por padrao a execucao eh `dry-run`.

```bash
npm run dev
npm run dev -- --apply
npm start -- --apply
```

Para retomar uma execucao interrompida no mesmo modo (`dry-run` ou `apply`):

```bash
npm run dev -- --continuar
npm run dev -- --apply --continuar
```

Tambem eh possivel informar a planilha por argumento:

```bash
npm run dev -- "C:\\caminho\\planilha.xlsx"
npm run dev -- --apply "C:\\caminho\\planilha.xlsx"
```

## Relatorios

Cada execucao salva:

- JSON em `relatorios/`
- XLSX em `relatorios/`
- indice consolidado em `relatorios/indice.json`

Os relatorios incluem:

- vinculos atuais encontrados
- inclusoes solicitadas
- pendencias de configuracao apos inclusao
- divergencias de responsavel apos patch
- extras removidos
- eventos detalhados em aba propria no XLSX
- falhas HTTP por empresa em aba propria no XLSX, quando houver
- origem do responsavel resolvido (`gestta` ou `local-fallback`)

## Arquivos de exemplo

- `data/PROVISAO DP.xlsx` e um sample ficticio para desenvolvimento e testes
- `PostmanRequests/Inserir-tarefas.postman_collection.json` contem apenas placeholders

## Testes

```bash
npm test
```
