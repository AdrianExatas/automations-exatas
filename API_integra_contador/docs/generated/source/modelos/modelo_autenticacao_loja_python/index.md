---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/modelos/modelo_autenticacao_loja_python/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "2a39beeb0d0fc31361b8f5d1c0935c1838352353ecf0c4a6e27cb373aed3fb1d"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/modelos/modelo_autenticacao_loja_python/).

# Modelo de Autenticação na Loja - Python

Aqui você encontra um programa de modelo, escrito na linguagem `Python` para servir de referência na implementação da autenticação da loja com suas credenciais e certificado digital eCNPJ padrão ICP Brasil exportado para o formato PFX ou P12.

Aviso importante

O Consumer Key e Consumer Secret identificam seu usuário e seu contrato com o SERPRO. Mantenha essas informações protegidas.

### Linguagem de programação

`Python 3`

| Versão | Autor | Código-fonte |
| --- | --- | --- |
| 1.0.1 | SERPRO | Serpro.Componentes.AutenticacaoLoja.Python.zip |

### Certificado Digital

Utilizar o certificado digital de contratante eCNPJ padrão ICP Brasil.

### Dependências

Pacotes importados via `pip install`:

- requests_pkcs12
- base64
- json

## Créditos e Licença

Esse componente foi criado pelas equipes do SERPRO.

E foi utilizado [licença MIT](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/modelos/LICENSE/).

## Nota

Os modelos de implementação aqui fornecidos são exemplos básicos destinados a orientar na implementação de soluções. Recomendamos utilizá-los como referência inicial, mas com cuidado ao considerar sua aplicação em um ambiente de produção. É essencial realizar testes completos para garantir o correto funcionamento e considerar possíveis ajustes e atualizações necessárias antes de utilizar o modelo em um ambiente de produção.
