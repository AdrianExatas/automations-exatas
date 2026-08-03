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

## Inclusao aditiva da aba Tobias

Para incluir, sem remover vinculos existentes nem alterar responsaveis, as 63 empresas da
primeira aba `Tobias` nas tarefas financeiras de emissao de nota:

```bash
# Preflight sem alteracoes
bun run dev -- --tobias "C:\\caminho\\PLANILHA DE NOTAS FISCAIS (2).xlsx" --dry-run

# Aplicar somente apos o preflight bem-sucedido
bun run dev -- --tobias "C:\\caminho\\PLANILHA DE NOTAS FISCAIS (2).xlsx" --apply
```

O modo `--tobias` exige exatamente 63 CNPJs unicos na primeira aba e inclui cada empresa nas
tarefas `EMISSÃO NOTA FISCAL - PRODUTO` e `EMISSÃO NOTA FISCAL - SERVIÇO`. Ele somente chama os
endpoints de leitura e inclusao; nao remove empresas nem modifica responsaveis.

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
