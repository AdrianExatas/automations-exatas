# Rastreabilidade com X-Request-Tag e responseId

Fonte normativa: [Identificador Opcional de Requisições](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/identificador_requisicoes/).

`X-Request-Tag` é um cabeçalho opcional de texto livre, com até 32 caracteres, incluído no relatório detalhado de consumo. Use um identificador que permita correlacionar a chamada com o processo interno sem expor informação desnecessária.

```http
X-Request-Tag: lote26-pgdas-gerar-0001
```

Recomendações:

- Gere o valor antes da chamada e mantenha-o estável nas consultas de confirmação relacionadas.
- Não inclua Consumer Secret, tokens, senha, conteúdo fiscal ou nome completo.
- Registre `idSistema`, `idServico`, contribuinte mascarado, horário, HTTP status e `responseId`.
- Preserve o identificador em erros e chamados ao suporte.

O formato sugerido pelo SERPRO combina tipo e número do autor, contribuinte e sequencial da funcionalidade. Como o campo não é validado semanticamente, um identificador interno opaco também pode ser usado, desde que respeite 32 caracteres e permita reconciliação com o relatório de consumo.
