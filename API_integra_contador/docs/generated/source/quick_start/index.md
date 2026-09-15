---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "d2e3493bb11ffa7cb7e975c41067098225cd03b53f9d5ee2f07386d8badbd6b6"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

# Guias rápidos

## Como autenticar na API

As APIs disponibilizadas pela plataforma API SERPRO utilizam o protocolo OAuth2 para realizar a autenticação e autorização de acesso das APIs contratadas. Siga os passos abaixo para se autenticar e consumir a API.

### 1. Primeiro passo - Obtenha Consumer Key e Consumer Secret

Para consumir as APIs, você deverá utilizar os dois códigos (Consumer Key e Consumer Secret) disponibilizados na Área do Cliente. Esses códigos servem para identificar o contrato. As credenciais de acesso devem ser obtidas a partir da área do cliente Serpro em [https://cliente.serpro.gov.br](https://cliente.serpro.gov.br/).

Exemplos de códigos:

```text
Consumer Key: <SERPRO_CONSUMER_KEY>
Consumer Secret: <SERPRO_CONSUMER_SECRET>
```

Aviso importante

O Consumer Key e Consumer Secret identificam seu usuário e seu contrato com o SERPRO. Mantenha essas informações protegidas.

### 2. Segundo passo - Solicite o Bearer Token e JWT Token

Para consultar as APIs, é necessário obter um token de acesso temporário (Bearer) e um JWT token. O token de acesso possui um tempo de validade e sempre que expirado, este passo de requisição de um novo token de acesso deve ser repetido.

**API protegida com Certificado Digital SSL**

Todo Bearer Token gerado solicitará o certificado digital (e-CNPJ nos padrões ICP Brasil). Esse certificado digital deve ser o mesmo utilizado na contratação do produto. Para utilizar o Integra Contador o Contratante deve utilizar o seu certificado junto com as credenciais da API Serpro que são disponibilizadas após contratação. A obrigatoriedade da utilização do certificado digital e-CNPJ obedece o padrão de acesso aos sistemas da Receita Federal do Brasil (RFB).

#### Como solicitar os Tokens de Acesso Bearer e JWT token

Para solicitar os tokens temporários, é necessário realizar uma requisição HTTP POST para o endpoint authenticate [https://autenticacao.sapi.serpro.gov.br/authenticate](https://autenticacao.sapi.serpro.gov.br/authenticate), com as seguintes características:

```text
a) Certificado Digital e-CNPJ padrão ICP-Brasil válido;

b) HTTP Header:

- "Authorization": "Basic (base64(consumerKey:consumerSecret))"
- "role-type": "TERCEIROS"
- "content-type": "application/x-www-form-urlencoded"
```

Para utilização no parâmetro `Authorization`, é necessário concatenar os códigos `Consumer Key` e `Consumer Secret`, separados pelo caracter `:`, e converter o resultado em `BASE64`. No exemplo a seguir, é retornada a `string` *`ZGphUjIx[...]IzT3RlCg`*:

```text
echo -n "djaR21PGoYp1iyK2n2ACOH9REdUb:ObRsAJWOL4fv2Tp27D1vd8fB3Ote" | base64
```

Resultado:

```text
ZGphUjIxUEdvWXAxaXlLMm4yQUNPSDlSRWRVYjpPYlJzQUpXT0w0ZnYyVHAyN0QxdmQ4ZkIzT3RlCg
```

Abaixo segue um exemplo de chamada via `cUrl`:

```text
curl -i -X POST \
-H "Authorization:BasiZGphUjIxUEdvWXAxaXlLMm4yQUNPSDlSRWRVYjpPYlJzQUpXT0w0ZnYyVHAyN0QxdmQ4ZkIzT3RlCg" \
-H "Role-Type:TERCEIROS" \
-H "Content-Type:application/x-www-form-urlencoded" \
-d 'grant_type=client_credentials' \
--cert-type P12 \
--cert arquivo_certificado.p12:senha_certificado \
'https://autenticacao.sapi.serpro.gov.br/authenticate'
```

**API protegida com Certificado Digital SSL**

Toda requisição de autenticação na loja do Serpro deverá ser informado o arquivo do certificado digital do tipo .p12 ou .pfx acompanhado da senha do certificado. Para executar esse script via `curl`, é necessário mudar para a pasta do arquivo do certificado.

**Content-type**

Caso experiencie erros de `415 Unsupported Media Type` na chamada de solicitação do Token, utilize o campo do Header `Content-Type` com o valor `application/x-www-form-urlencoded`

```text
[HEADER] Content-type: "application/x-www-form-urlencoded"
```

### 3. Terceiro passo - Receba o Token

#### Access token e JWT token

O retorno da autenticação será o "payload" demonstrado abaixo, com os dois tokens temporários (access_token e jwt_token) para serem utilizados no consumo dos serviços até a expiração (expires_in):

Exemplos do Json de retorno:

```text
{
"expires_in": 2008,
"scope": "default",
"token_type": "Bearer",
"access_token": "af012866-daae-3aef-8b40-bd14e8cfac99",
"jwt_token": "<JWT_TOKEN>"
}
```

ou

```text
{
"expires_in": 2008,
"scope": "default",
"token_type": "Bearer",
"access_token": "<JWT_TOKEN>",
"jwt_token": "<JWT_TOKEN>"
}
```

#### Renovação do access token e JWT token

Atentar que sempre que o token de acesso temporário expirar, o gateway vai retornar um `HTTP CODE 401` após realizar uma requisição para uma API. Neste caso, deve ser repetido o Segundo Passo [Solicite o Bearer Token e JWT Token)](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/#2-segundo-passo-solicite-o-bearer-token-e-jwt-token) para uma nova autenticação.

### 4. Quarto passo - Fazendo uma requisição

De posse dos `access_token` e `jwt_token`, faça a requisição a API.

```text
curl -i -X POST \
-H "Authorization:Bearer <ACCESS_TOKEN>" \
-H "Content-Type:application/json" \
-H "jwt_token:<JWT_TOKEN>" \
-d \
'{
"contratante": {
"numero": "00000000000000",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PGDASD",
"idServico": "CONSEXTRATO16",
"versaoSistema": "1.0",
"dados": "{ \"numeroDas\": \"99999999999999999\" }"
}
}' \
'https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar'
```

No exemplo acima foram utilizados os seguintes parâmetros:

- [HEADER] Accept: application/json Informamos o tipo de dados que estamos requerendo, nesse caso JSON
- [HEADER] Authorization: Bearer <ACCESS_TOKEN> Informamos o token de acesso recebido
- [HEADER] jwt_token: <JWT_TOKEN> Informamos um jwt token válido retornado na autenticação via SAPI.
- [POST] [https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar](https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/Consultar) Chamamos a url da API e o método desejado. No caso, a url base é "https://gateway.apiserpro.serpro.gov.br/integra-contador/v1/", e o método é "Consultar/.
- [BODY]: Neste exemplo a requisição está ocorrendo no sistema PGDASD no serviço Consulta Extrato do DAS. Vide a sessão [Documentação/Integra Contador](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/integra_contador/) para mais detalhes de cada solução disponível para consumo.

Exemplo do body para envio no post:

```text
{
"contratante": {
"numero": "00000000000000",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"pedidoDados": {
"idSistema": "PGDASD",
"idServico": "CONSEXTRATO16",
"versaoSistema": "1.0",
"dados": "{ \"numeroDas\": \"99999999999999999\" }"
}
}
```

Exemplo de resposta esperada:

```text
{
"contratante": {
"numero": "string",
"tipo": number
},
"autorPedidoDados": {
"numero": "string",
"tipo": number
},
"contribuinte": {
"numero": "string",
"tipo": number
},
"pedidoDados": {
"idSistema": "string",
"idServico": "string",
"versaoSistema": "string",
"dados": "string"
},
"status": number,
"dados": "string",
"mensagens": [{
"codigo": "string",
"texto": "string"
}]
}
```
