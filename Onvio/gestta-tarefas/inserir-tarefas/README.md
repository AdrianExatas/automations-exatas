# inserir-tarefas

CLI em Node.js/TypeScript para sincronizar vinculos empresa-tarefa e responsavel por empresa no Gestta.

## Escopo

- le planilha com `COD`, `EMPRESA`, `CNPJ`, `TAREFA` e `RESPONSAVEL`
- resolve empresa, tarefa e responsavel
- adiciona empresas ausentes na tarefa
- valida o resultado final antes de remover vinculos extras

O fluxo nao chama `task-gen`. Tarefas operacionais ja geradas no Gestta nao sao removidas nem regeneradas.

## Configuracao

1. Copie `.env.example` para `.env`.
2. Defina `JWT_GESTTA` ou `GESTTA_JWT_TOKEN`, ou gere o artefato compartilhado com `shared/onvio-auth`.
3. Opcionalmente ajuste `PLANILHA_PATH`, `LOCAL_API_URL` ou `API_3001_URL`.
4. Opcionalmente ajuste os timeouts e a concorrencia do cliente Gestta.
5. Opcionalmente defina `ONVIO_AUTH_ARTIFACT_PATH` se o JSON de auth estiver fora do caminho padrao.

## Uso

```bash
bun install
bun run --cwd Onvio/gestta-tarefas/inserir-tarefas build
bun run --cwd Onvio/gestta-tarefas/inserir-tarefas start
```

Execucao em `dry-run`:

```bash
bun run --cwd Onvio/gestta-tarefas/inserir-tarefas dev
```

Aplicar alteracoes:

```bash
bun run --cwd Onvio/gestta-tarefas/inserir-tarefas dev -- --apply
bun run --cwd Onvio/gestta-tarefas/inserir-tarefas start -- --apply
```

Continuar uma execucao interrompida:

```bash
bun run --cwd Onvio/gestta-tarefas/inserir-tarefas dev -- --continuar
bun run --cwd Onvio/gestta-tarefas/inserir-tarefas dev -- --apply --continuar
```

## Arquivos de exemplo

- `data/PROVISAO DP.xlsx` e um sample seguro para desenvolvimento
- `postman-requests/Inserir-tarefas.postman_collection.json` contem apenas placeholders

## Relatorios

Cada execucao gera JSON, XLSX e `relatorios/indice.json`.

## Testes

```bash
bun run --cwd Onvio/gestta-tarefas/inserir-tarefas test
```
