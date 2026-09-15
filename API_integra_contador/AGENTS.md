# Instruções para agentes — Integra Contador

Use esta base antes de escrever qualquer integração com a API.

## Ordem de consulta

1. Leia `docs/guides/envelope-e-chamadas.md` e o guia transversal relacionado à tarefa.
2. Localize o serviço em `catalog/services.json` por `systemId`, `serviceId`, finalidade ou família.
3. Abra o documento indicado em `docs/services`.
4. Consulte `issues[]` e `source.status` antes de usar exemplos ou inferir tipos.
5. Quando a informação continuar ambígua, abra a URL oficial presente em `source`; não complete o contrato por suposição.

## Invariantes do protocolo

- Todos os cinco caminhos de negócio usam `POST`.
- `operationPath` escolhe `/Apoiar`, `/Consultar`, `/Declarar`, `/Emitir` ou `/Monitorar`.
- `pedidoDados.idSistema` e `pedidoDados.idServico` selecionam o serviço lógico.
- `pedidoDados.dados` deve ser `JSON.stringify(dados)`: o valor no envelope é uma string JSON escapada.
- Envie `Authorization: Bearer <access_token>` e `jwt_token: <jwt_token>` em chamadas de negócio.
- Só envie `autenticar_procurador_token` quando o fluxo aplicável tiver produzido esse token.
- Identificadores CPF/CNPJ são enviados sem máscara. O contratante é CNPJ, `tipo: 2`.

## Segurança e comportamento operacional

- Nunca registre ou versione certificados, senhas, Consumer Key, Consumer Secret, access tokens ou JWTs.
- Não execute exemplos contra produção sem solicitação explícita e credenciais fornecidas por meio seguro.
- Não repita automaticamente operações mutáveis após HTTP 504. O resultado é indeterminado e o backend pode ter concluído o trabalho.
- Em `401`, obtenha novos tokens; em `429`, aguarde; em falhas temporárias, aplique espera progressiva somente quando a operação for segura.
- Preserve `responseId` e use `X-Request-Tag` para rastreabilidade.

## Fidelidade documental

- SERPRO é a única autoridade normativa neste projeto.
- O OpenAPI oficial descreve os caminhos físicos, não todos os contratos lógicos. Não crie endpoints REST por serviço.
- Valores `null`, campos ausentes e itens em `issues[]` são incertezas reais; não os substitua por inferências sem registrar a decisão.
- Arquivos gerados não devem ser editados. Corrija o parser ou uma regra de curadoria e regenere a base.
