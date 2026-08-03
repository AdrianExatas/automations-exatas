# Manutenção do catálogo

## Critério para `verified`

Uma capacidade só pode ser promovida quando houver:

1. evidência da funcionalidade visível e da permissão/licença exigida;
2. contrato capturado com método, rota, query, payload e resposta normalizada;
3. schema de entrada fechado, risco e idempotência definidos;
4. teste mockado do contrato;
5. smoke test somente de leitura ou `read-like POST`;
6. para escrita, captura Playwright com a requisição abortada antes do ambiente real e teste de `prepare/commit` contra mock.

Nunca promova uma operação a partir de suposição sobre nomes de endpoints.

## Atualização por drift

1. Execute `bun run inventory` com uma sessão válida.
2. Compare o relatório com `CATALOG_VERSIONS` e as fixtures.
3. Recapture o fluxo afetado com todas as mutações abortadas.
4. Atualize somente as capacidades afetadas, seus schemas e evidências.
5. Rode `bun run typecheck`, `bun test` e `bun run build`.
6. Faça smoke test real exclusivamente de leitura.

Uma falha de rede durante a verificação de versão bloqueia escrita. Não transforme essa falha em permissão implícita.

## Relatório de cobertura

O inventário inclui totais por estado e `unexplained`. O critério de aceitação é `unexplained: []`. Novos itens de navegação devem gerar uma nova capacidade classificada, mesmo quando ainda indisponível.

## Segredos

Fixtures, snapshots e logs devem passar por busca de `authorization`, `cookie`, `token`, `jwt`, `password`, `senha`, `secret`, `private key`, `PFX` e padrões equivalentes. Valores reais nunca entram no repositório. Certificados e senhas só podem ser manipulados por referência a variável de ambiente ou cofre local.
