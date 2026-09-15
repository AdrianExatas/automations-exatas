# Autenticação mTLS e OAuth2

Fonte normativa: [guia rápido do SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/quick_start/).

## Pré-requisitos

- Contrato ativo do Integra Contador.
- Consumer Key e Consumer Secret obtidos na Área do Cliente SERPRO.
- Certificado digital e-CNPJ ICP-Brasil PFX/P12 correspondente ao contratante.

## Obtenção dos tokens

Envie `POST https://autenticacao.sapi.serpro.gov.br/authenticate` com mTLS e:

```http
Authorization: Basic <base64-consumer-key-dois-pontos-consumer-secret>
Role-Type: TERCEIROS
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

Exemplo cURL com placeholders:

```bash
curl --request POST \
  --url 'https://autenticacao.sapi.serpro.gov.br/authenticate' \
  --header "Authorization: Basic <BASIC_CREDENTIALS>" \
  --header 'Role-Type: TERCEIROS' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data 'grant_type=client_credentials' \
  --cert-type P12 \
  --cert '<CERTIFICADO_PFX>:<SENHA>'
```

A resposta contém dois tokens distintos:

```json
{
  "expires_in": 1800,
  "scope": "default",
  "token_type": "Bearer",
  "access_token": "<ACCESS_TOKEN>",
  "jwt_token": "<JWT_TOKEN>"
}
```

- `access_token` vai no cabeçalho `Authorization: Bearer`.
- `jwt_token` vai no cabeçalho próprio `jwt_token`.
- `expires_in` deve controlar o cache dos tokens. Ao receber `401`, descarte o par e autentique novamente.

## Proteção das credenciais

Não grave valores reais em código, documentação, logs ou arquivos versionados. A senha do certificado e o Consumer Secret devem vir de um cofre ou variável de ambiente protegida. Tokens também são credenciais temporárias.

O exemplo TypeScript em `examples/typescript/integra-contador.ts` usa `node:https` com PFX/P12 e funciona como referência, não como SDK de produção.
