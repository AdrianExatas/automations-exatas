# Erros, timeout e retentativas

Fontes normativas: [códigos HTTP](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/codigos_retorno/), [política de timeout](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/timeout/) e [mensagens do gerenciador](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/mensagens/).

| HTTP | Interpretação operacional |
| --- | --- |
| 200 | Pedido concluído; ainda verifique `status` e `mensagens` do negócio |
| 202 | Pedido reconhecido e ainda processando; siga o tempo informado |
| 204 | Sem conteúdo disponível; observe cabeçalhos como `ETag` quando documentado |
| 304 | Recurso/token auxiliar não modificado; use o valor em cache conforme o serviço |
| 400 | Entrada, tipo de operação, sistema ou serviço inválido; corrija antes de repetir |
| 401 | Tokens de acesso expirados ou inválidos; autentique novamente |
| 403 | Identidade, contrato, procuração ou token de procurador sem autorização |
| 404 | Recurso ou combinação não encontrada |
| 429 | Limite atingido; aguarde e respeite eventual indicação do servidor |
| 500/503 | Falha temporária ou interna; registre rastreabilidade e use espera progressiva quando seguro |
| 504 | Resultado indeterminado; o backend pode concluir após o timeout |

## Regra crítica para 504

O limite síncrono publicado é de até 30 segundos. Um `504` não prova que uma transmissão, entrega ou emissão falhou. Para operações com efeito:

1. Não reenvie imediatamente.
2. Preserve `responseId`, `X-Request-Tag`, horário e identificação do serviço.
3. Consulte situação, recibo ou documento por uma operação de leitura, quando existir.
4. Reenvie somente após confirmar que a RFB não recebeu ou concluiu o pedido.

Isso evita declarações, documentos e guias duplicados.

## Política segura de repetição

- Consultas idempotentes: repetição limitada com espera progressiva e aleatoriedade pode ser usada para `429`, `500` e `503`.
- Operações mutáveis: não repita automaticamente sem uma chave ou consulta de confirmação documentada.
- `401`: renove o par de tokens e repita no máximo uma vez.
- `400` e `403`: não repita sem alteração de dados, credenciais ou autorização.

Os códigos de negócio em `mensagens` variam por sistema. Consulte as referências relacionadas no documento do serviço.
