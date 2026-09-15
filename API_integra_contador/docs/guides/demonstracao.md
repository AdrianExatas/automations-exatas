# Ambiente de demonstração

Fonte normativa: [Como usar a demonstração](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/como_usar_a_demonstracao_da_api/).

O modo Trial usa objetos simulados para demonstrar o comportamento da API. Ele não comprova acesso, procuração, disponibilidade ou efeito na RFB e não deve ser confundido com homologação completa.

Os cenários oficiais ficam registrados no manifesto com `kind: trial-scenario` e normalizados em `docs/generated/source/cenarios_trial`.

Ao testar:

1. Escolha o caminho físico indicado pelo cenário.
2. Copie o envelope simulado exatamente como documentado.
3. Compare HTTP status, envelope e mensagens.
4. Não reutilize identificadores simulados em produção.

O sincronizador trata a lista de cenários como dinâmica. Uma redução ou novo cenário aparece em `bun run sync:check` em vez de ser ignorado.
