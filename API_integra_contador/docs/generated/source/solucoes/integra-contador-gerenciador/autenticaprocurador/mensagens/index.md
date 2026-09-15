---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "a6af73560455d00798e373c27525c19be46956fa3cb8faa944ca84deda0fa577"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/mensagens/).

# Mensagens de negócio

## Envio de XML Assinado (Termo de Autorização)

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [Sucesso-AUTENTICAPROCURADOR] | Requisição efetuada com sucesso. | HTTP STATUS: 200 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-002] | Parâmetros de entrada inválidos. Campo xml nulo, vazio ou não encontrado. | Verifique os dados de entrada informados. HTTP STATUS: 400 |
| [Erro-AUTENTICAPROCURADOR-003] | Erro ao efetuar login. | Verifique os dados de entrada informados. HTTP STATUS: 500 Verifique a mensagem e tente novamente, caso o problema persista deverá abrir um acionamento para verificar o problema. |
| [Erro-AUTENTICAPROCURADOR-008] | Erro ao validar o certificado digital. | HTTP STATUS: 500 Verifique a mensagem e tente novamente, caso o problema persista deverá abrir um acionamento para verificar o problema. |
| [AcessoNegado-AUTENTICAPROCURADOR-009] | Certificado Digital deve ser e-PF, e-CPF, e-PJ ou e-CNPJ. | HTTP STATUS: 403 |
| [AcessoNegado-AUTENTICAPROCURADOR-010] | Certificado Digital está expirado. | HTTP STATUS: 403 |
| [AcessoNegado-AUTENTICAPROCURADOR-011] | Acesso negado, NI do procurador diferente do NI do certificado. | HTTP STATUS: 403 |
| [AcessoNegado-AUTENTICAPROCURADOR-012] | Acesso negado, NI do contratante diferente do NI do contratante do XML assinado. | HTTP STATUS: 403 |
| [AcessoNegado-AUTENTICAPROCURADOR-013] | Acesso negado, XML assinado inválido: {0} | HTTP STATUS: 403 |
| [Erro-AUTENTICAPROCURADOR-014] | Erro ao obter o CNPJ do certificado presente no XML assinado. | HTTP STATUS: 500 Verifique a mensagem e tente novamente, caso o problema persista deverá abrir um acionamento para verificar o problema. |
| [EntradaIncorreta-AUTENTICAPROCURADOR-015] | Layout do XML inválido: tag {0} não encontrada. | tags existentes: dados , assinadoPor , sistema , destinatario , vigencia , dataAssinatura , finalidade , avisoLegal , termo , HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-016] | Layout do XML inválido: atributo {0} da tag {1} inválido. | atributos: id , data , nome , papel , numero , texto HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-017] | Layout do XML inválido: data de vigência deve ser maior ou igual que a data corrente. | HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-018] | Layout do XML inválido: data de assinatura não deve ser posterior a data atual. | HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-019] | Layout do XML inválido: tag raiz deve ser termoDeAutorizacao. | HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-020] | A string fornecida do xml não é uma base64 válida. Conteúdo do xml: {0}. | HTTP STATUS: 400 |
| [AcessoNegado-AUTENTICAPROCURADOR-021] | Certificado fornecido não possui extensões da ICP-Brasil. | HTTP STATUS: 403 |
| [AcessoNegado-AUTENTICAPROCURADOR-023] | O certificado informado não está autorizado. | HTTP STATUS: 403 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-025] | Xml sem assinatura. A validação de estrutura deveria encontrar esse problema (Namespace: {0}). | HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-026] | Elemento 'CanonicalizationMethod' inválido: '{0}'. | HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-027] | Elemento 'SignatureMethod' inválido: '{0}'. | HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-028] | Apenas um Elemento 'Reference' é requerido/permitido. | HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-029] | A assinatura do evento deverá ser realizada sobre todo documento Xml (Atributo 'URI' dever ser vazio). | HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-030] | Elemento 'DigestMethod' inválido: '{0}'. | HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-031] | As seguintes transformações são exigidas. 'http://www.w3.org/2000/09/xmldsig#enveloped-signature' e 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'. | HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-032] | Apenas um Elemento 'KeyInfo/X509Data' é requerido/permitido. | HTTP STATUS: 400 |
| [EntradaIncorreta-AUTENTICAPROCURADOR-033] | Ações Sugeridas: Verificar se houve alteração do evento após a assinatura. Verificar a validade da assinatura. | HTTP STATUS: 400 |
| [Erro-AUTENTICAPROCURADOR-034] | Padrão de assinatura não reconhecido. | HTTP STATUS: 500 Verifique a mensagem e tente novamente, caso o problema persista deverá abrir um acionamento para verificar o problema. |
| [AcessoNegado-AUTENTICAPROCURADOR-037] | O certificado digital do signatário ou do solicitante da informação encontra-se revogado. | HTTP STATUS: 403 Verifique a mensagem e informe um certificado válido. |
| [AcessoNegado-AUTENTICAPROCURADOR-038] | Ocorreu um erro ao realizar a análise do XML. Verifique se o XML não está mal formado, e se não existem caracteres inválidos no documento. A primeira linha deve conter uma tag XML válida e não pode conter uma linha com espaço em branco ou caracteres ocultos de quebra de linha. | Verifique o conteúdo do documento XML enviado. HTTP STATUS: 403 |
| [AcessoNegado-AUTENTICAPROCURADOR-039] | O certificado não foi considerado válido pelas verificações internas do conteúdo X509Certificate2. | Verifique se o certificado informado possui as características válidas do padrão ICP-Brasil. HTTP STATUS: 403 |
| [AcessoNegado-AUTENTICAPROCURADOR-040] | A formação da cadeia de certificação até sua raiz deve ser confiável. | Verifique se o certificado informado possui as características válidas do padrão ICP-Brasil. HTTP STATUS: 403 |
| [AcessoNegado-AUTENTICAPROCURADOR-041] | O certificado não pode ser do tipo autoassinado (self-signed). | Verifique se o certificado informado possui as características válidas do padrão ICP-Brasil. HTTP STATUS: 403 |
