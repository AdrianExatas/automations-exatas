# Procurações e autor do pedido

Fonte normativa: [Serviços x Procurações](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/servicos_vs_procuracoes/).

Quando o autor do pedido não é o próprio contribuinte, determinados serviços exigem procuração eletrônica cadastrada no e-CAC. O campo `procuration` de cada `ServiceRecord` informa:

- `required: true`: a tabela oficial exige autorização ou indica expressamente essa necessidade.
- `required: false`: a fonte apresenta `n/a` para o serviço.
- `required: null`: a coleta não encontrou evidência conclusiva.
- `codes`: códigos oficiais da procuração e-CAC, quando publicados.

Não trate `null` como dispensa.

## Token de procurador

Quando o contratante da API executa um serviço em nome de um autor diferente, pode ser necessário o fluxo `AUTENTICAPROCURADOR / ENVIOXMLASSINADO81`. Ele recebe um termo XML assinado pelo certificado do procurador e produz o token enviado no cabeçalho:

```http
autenticar_procurador_token: <TOKEN_DO_PROCURADOR>
```

Esse token não substitui `Authorization` nem `jwt_token`. Validade, cache e renovação devem seguir o retorno do serviço de autenticação do procurador.

Consulte o documento consolidado de `AUTENTICAPROCURADOR.ENVIOXMLASSINADO81` antes de implementar assinatura XML; não deduza algoritmo, canonicalização ou cadeia de certificado a partir deste resumo.
