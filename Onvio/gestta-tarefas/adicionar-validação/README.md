# adicionar-validacao

Automacao em Node.js/TypeScript, executada com Bun, para habilitar aprovacao obrigatoria de tarefas no Gestta a partir de uma planilha local.

## Escopo

- le `sheets/EMPRESAS APROVAÇÃO FISCAL.xlsx`
- resolve empresa por CNPJ
- resolve aprovador pela coluna `VALIDAÇÃO`
- busca todos os vinculos do cliente no `SETOR` informado
- aplica `approve=true`, `approvers=[userId]` e `approve_type=["DONE","DISCONSIDERED"]`

## Configuracao

1. Copie `.env.example` para `.env`.
2. Escolha a origem do JWT do Gestta:
   - recomendada: artefato compartilhado em `shared/onvio-auth`
   - fallback manual: `JWT_GESTTA` ou `GESTTA_JWT_TOKEN`
3. Opcionalmente defina `API_3001_URL`.
4. Opcionalmente defina `PLANILHA_PATH`.

## Uso

Dry-run:

```bash
bun run --cwd Onvio/gestta-tarefas/adicionar-validação dev
bun run --cwd Onvio/gestta-tarefas/adicionar-validação start
```

Aplicar alteracoes:

```bash
bun run --cwd Onvio/gestta-tarefas/adicionar-validação dev:apply
bun run --cwd Onvio/gestta-tarefas/adicionar-validação start -- --apply
```

Selecionar a planilha no Explorer:

```bash
bun run --cwd Onvio/gestta-tarefas/adicionar-validação start:selecionar
```

## Observacoes

- a execucao padrao e `dry-run`
- `--apply` envia o PATCH real para o Gestta
- `--continuar` retoma do checkpoint salvo em `relatorios/`
- duplicatas do mesmo `(cnpj, setor)` com o mesmo validador sao deduplicadas
- duplicatas do mesmo `(cnpj, setor)` com validadores diferentes falham no pre-processamento
