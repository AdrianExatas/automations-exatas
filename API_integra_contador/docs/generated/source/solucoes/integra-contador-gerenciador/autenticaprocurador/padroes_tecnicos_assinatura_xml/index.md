---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/padroes_tecnicos_assinatura_xml/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "8e319eac328b00faf4e4e94898759e9854a92d23bf55ffddec6f8e4562a26662"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/autenticaprocurador/padroes_tecnicos_assinatura_xml/).

# Padrões Técnicos de Assinatura do XML

## Objetivo

Prover as informações dos padrões técnicos utilizados na assinatura digital do documento XML. A sigla XML significa “eXtensible Markup Language” em inglês, que é um formato de arquivo universal usado para criar documentos com dados organizados.

## Padrão de documento XML

A especificação do documento XML adotada é a recomendação W3C para XML 1.0, disponível em [http://www.w3.org/TR/REC-xml](http://www.w3.org/TR/REC-xml).

A codificação dos caracteres será em `UTF-8`, assim todos os documentos XML serão iniciados com a seguinte declaração:

```text
<?xml version="1.0" encoding="UTF-8"?>
```

Cada arquivo XML somente poderá ter uma única declaração ` `.

Alguns caracteres especiais/reservados pela sintaxe XML quando forem inseridos (caso de razão social com o nome com caracteres especiais.) como dado de conteúdo deverão ser substituídos pelos seus respectivos caracteres de escape, conforme a tabela abaixo:

| Caractere | Escape |
| --- | --- |
| > (sinal de maior) | &gt ; |
| < (sinal de menor) | &lt ; |
| & (e comercial) | &amp; |
| ” (aspas duplas) | &quot; |
| ’ (sinal de apóstrofe ou aspas simples) | &apos; |

## Modelo do XML (Termo de Autorização)

A seguir o modelo de documento XML para ser assinado digitalmente. Essa estrutura é obrigatória.

A declaração do namespace da assinatura digital deverá ser realizada na própria tag ` `, conforme exemplo abaixo:

```text
<?xml version="1.0" encoding="UTF-8"?>
<termoDeAutorizacao>

<dados>

<sistema id="API Integra Contador" />

<termo texto="Autorizo a empresa CONTRATANTE, identificada neste termo deautorização como DESTINATÁRIO, a executar as requisições dos serviços webdisponibilizados pela API INTEGRA CONTADOR, onde terei o papel de AUTORPEDIDO DE DADOS no corpo da mensagem enviada na requisição do serviço web.Esse termo de autorização está assinado digitalmente com o certificadodigital do PROCURADOR ou OUTORGADO DO CONTRIBUINTE responsável, identificadocomo AUTOR DO PEDIDO DE DADOS." />

<avisoLegal texto="O acesso a estas informações foi autorizado pelo próprioPROCURADOR ou OUTORGADO DO CONTRIBUINTE, responsável pela informação, viaassinatura digital. É dever do destinatário da autorização e consumidordeste acesso observar a adoção de base legal para o tratamento dos dadosrecebidos conforme artigos 7º ou 11º da LGPD (Lei n.º 13.709, de 14 deagosto de 2018), aos direitos do titular dos dados (art. 9º, 17 e 18, daLGPD) e aos princípios que norteiam todos os tratamentos de dados no Brasil(art. 6º, da LGPD)."/>

<finalidade texto="A finalidade única e exclusiva desse TERMO DEAUTORIZAÇÃO, é garantir que o CONTRATANTE apresente a API INTEGRA CONTADOResse consentimento do PROCURADOR ou OUTORGADO DO CONTRIBUINTE assinadodigitalmente, para que possa realizar as requisições dos serviços web da APIINTEGRA CONTADOR em nome do AUTOR PEDIDO DE DADOS (PROCURADOR ou OUTORGADODO CONTRIBUINTE)." />

<dataAssinatura data="20220614"/>

<vigencia data="20221231"/>

<destinatario numero="33683111000107"
nome="SERVICO FEDERAL DE PROCESSAMENTO DE DADOS (SERPRO)"
tipo="PJ"
papel="contratante"/>

<assinadoPor numero="00000000000000"
nome="NOME DO CONTRIBUINTE"
tipo="PJ"
papel="autor pedido de dados"/>
</dados>

<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">

...

</Signature>

</termoDeAutorizacao>
```

### Descrição das Tags e Atributos

**Termo de Autorização:** documento XML com os dados da autorização e assinado digitalmente.

**Sistema:** identificação do sistema a ser utilizado esse termo de autorização.

**Termo:** texto de autorização com o seguinte conteúdo:

```text
Autorizo a empresa CONTRATANTE, identificada neste termo de autorização como DESTINATÁRIO, a executar as requisições dos serviços web disponibilizados pela API INTEGRA CONTADOR, onde terei o papel de AUTOR PEDIDO DE DADOS no corpo da mensagem enviada na requisição do serviço web. Esse termo de autorização está assinado digitalmente com o certificado digital do PROCURADOR ou OUTORGADO DO CONTRIBUINTE responsável, identificado como AUTOR DO PEDIDO DE DADOS.
```

**Aviso Legal:** texto LGPD com o seguinte conteúdo:

```text
O acesso a estas informações foi autorizado pelo próprio PROCURADOR ou OUTORGADO DO CONTRIBUINTE, responsável pela informação, via assinatura digital. É dever do destinatário da autorização e consumidor deste acesso observar a adoção de base legal para o tratamento dos dados recebidos conforme artigos 7º ou 11º da LGPD (Lei n.º 13.709, de 14 de agosto de 2018), aos direitos do titular dos dados (art. 9º, 17 e 18, da LGPD) e aos princípios que norteiam todos os tratamentos de dados no Brasil (art. 6º, da LGPD).
```

**Finalidade:** texto que define a finalidade do uso desse termo de autorização, contém o seguinte conteúdo:

```text
A finalidade única e exclusiva desse TERMO DE AUTORIZAÇÃO, é garantir que o CONTRATANTE apresente a API INTEGRA CONTADOR esse consentimento do PROCURADOR ou OUTORGADO DO CONTRIBUINTE assinado digitalmente, para que possa realizar as requisições dos serviços web da API INTEGRA CONTADOR em nome do AUTOR PEDIDO DE DADOS (PROCURADOR ou OUTORGADO DO CONTRIBUINTE).
```

**Data da Assinatura:** data da assinatura deste termo de autorização, no formato AAAAMMDD (A = ano, M = mês e D = dia).

**Vigência:** data de validade desse termo de autorização.

**Destinatário:** pessoa jurídica que contratou o produto API Integra Contador no eCommerce da Loja Serpro e quer autenticar uma sessão com a assinatura do Autor do Pedido de Dados para consumir os serviços do API Integra Contador em nome do PROCURADOR ou OUTORGADO DO CONTRIBUINTE.

**Número:** com tamanho de 14 posições, o atributo número representa o CNPJ sem máscara e só é permitido números.

- Nome: nome do contratante (razão social).
- Tipo: PJ – pessoa jurídica
- Papel: Contratante

**Assinado Por:** pessoa física (PF) ou jurídica (PJ) que está assinando este documento XML com seu certificado digital. Dessa forma ele está autorizando o Contratante para poder consumir os serviços na API Integra Contador com o seu número de CPF ou CNPJ pelo período de vigência aqui indicado.

**Número:** com tamanho de 11 posições (CPF) quando pessoa física ou com tamanho de 14 posições (CNPJ) quando pessoa jurídica, sem máscara e só permitido números.

- Nome: nome do autor do pedido de dados procurador.
- Tipo: PF – pessoa física ou PJ – pessoa jurídica
- Papel: autor pedido de dados
- Signature: assinatura digital deste documento XML.

## Schema do XML

A estrutura dos XML recebidos pelo Autentica-Procurado são especificadas e checadas por um Schema, que é uma linguagem que define a estrutura do documento XML, descrevendo os seus elementos e a sua organização, além de estabelecer regras de preenchimento de conteúdo e de obrigatoriedade de cada elemento ou grupo de informação. Este Schema A validação da estrutura XML da mensagem é realizada por um analisador sintático (parser) que verifica se a mensagem atende as definições e regras de seu Schema XML.

Qualquer divergência da estrutura XML da mensagem em relação ao seu Schema XML provoca um erro de validação.

## Padrão de Comunicação

A comunicação será baseada em Web Service, disponibilizados pelo serviço chamado Autenticação Procurador.

A troca de mensagens será por meio de `Json`. Sendo que o `XML` após assinado será transformado em uma String codificada em `base64`.

## Padrão de certificado digital

O certificado digital utilizado para assinar o documento XML deverá ser emitido por Autoridade Certificadora credenciada pela Infraestrutura de Chaves Públicas Brasileira – ICP-Brasil.

Este deverá pertencer à série A. Existem duas séries as quais os certificados podem pertencer, a série A e a S. A série A reúne os certificados de assinatura digital utilizados na confirmação de identidade na Web, em e-mails, em redes privadas virtuais (VPN) e em documentos eletrônicos com verificação da integridade de suas informações. A série S reúne os certificados de sigilo que são utilizados na codificação de documentos, de bases de

dados, de mensagens e de outras informações eletrônicas sigilosas. O certificado digital deverá ser do tipo A1 ou A3. Certificados digitais de tipo A1 ficam armazenados no próprio computador a partir do qual ele será utilizado. Certificados digitais do tipo A3 são armazenados em dispositivo portátil inviolável do tipo smart card ou token, que possuem um chip com capacidade de realizar a assinatura digital. Este tipo de dispositivo é bastante seguro, pois toda operação é realizada pelo chip existente no dispositivo, sem qualquer acesso externo à chave privada do certificado digital.

Para que um certificado seja aceito na função de transmissor de solicitações este deverá ser do tipo e-CPF (e-PF) ou e-CNPJ (e-PJ).

O certificado digital é exigido no momento da assinatura do documento XML para envio ao login do serviço Autenticação Procurador.

| Padrões do Certificado Digital |
| --- |
| Para assinatura, utilizar o certificado digital do responsável que vai exercer o papel de PROCURADOR ou OUTORGADO DO CONTRIBUINTE, autor do pedido de dados. |
| X.509 versão 3, emitido por Autoridade Certificadora credenciada pela Infraestrutura de Chaves Públicas Brasileira – ICP-Brasil, do Padrão de certificado tipo A1 ou A3, devendo ser um e-CPF (e-PF) ou e-CNPJ (e-PJ). |

## Assinatura do documento XML

Os documentos XML são assinados digitalmente utilizando o certificado digital do Procurador para garantir autenticidade e a integridade das informações dos documentos eletrônicos. Este XML é assinado digitalmente seguindo a especificação descrita na sessão Padrão de assinatura digital.

## Padrão de assinatura digital

O sistema utiliza um subconjunto do padrão de assinatura XML definido pelo [http://www.w3.org/TR/xmldsig-core/](http://www.w3.org/TR/xmldsig-core/).

- Padrão de assinatura: XML Digital Signature, utilizando o formato Enveloped [http://www.w3.org/TR/xmldsig-core/](http://www.w3.org/TR/xmldsig-core/)
- Certificado digital: emitido por AC credenciada no ICP-Brasil [http://www.w3.org/2000/09/xmldsig#X509Data](http://www.w3.org/2000/09/xmldsig#X509Data)
- Cadeia de certificação: EndCertOnly (Incluir na assinatura apenas o certificado do usuário final): 3.1. Tipo do certificado: A1 ou A3
- Tamanho da chave criptográfica: compatível com os certificados A1 e A3 (2048 bits)
- Função criptográfica assimétrica: RSA [http://www.w3.org/2001/04/xmldsigmore#rsa-sha256](http://www.w3.org/2001/04/xmldsigmore#rsa-sha256)
- Função de message digest: SHA-256. [http://www.w3.org/2001/04/xmlenc#sha256](http://www.w3.org/2001/04/xmlenc#sha256)
- Codificação: Base64 [http://www.w3.org/2000/09/xmldsig#base64](http://www.w3.org/2000/09/xmldsig#base64)
- Transformações exigidas: útil para realizar a canonicalização do XML enviado para realizar a validação correta da assinatura digital. São elas: 8.1. Enveloped [http://www.w3.org/2000/09/xmldsig#enveloped-signature](http://www.w3.org/2000/09/xmldsig#enveloped-signature) 8.2. C14N [http://www.w3.org/TR/2001/REC-xml-c14n-20010315](http://www.w3.org/TR/2001/REC-xml-c14n-20010315)

As informações necessárias à identificação do assinante estão presentes dentro do certificado digital. O arquivo XML assinado deve conter apenas a tag X509Certificate nas informações que dizem respeito ao certificado.

| Padrão da assinatura digital |
| --- |
| XML Digital Signature, Enveloped, com certificado digital X.509 versão 3, com chave privada de tamanho variável, conforme o padrão da ICP-Brasil (1024, 2048, ou mais bits), com padrões de criptografia assimétrica RSA, algoritmo message digest SHA-256 e utilização das transformações Enveloped e C14N. |

Abaixo temos um exemplo de um documento assinado:

```text
<?xml version="1.0" encoding="UTF-8"?>
<termoDeAutorizacao>
<dados>
<sistema id="API Integra Contador" />

<termo texto="Autorizo a empresa CONTRATANTE, identificada neste termo deautorização como DESTINATÁRIO, a executar as requisições dos serviços webdisponibilizados pela API INTEGRA CONTADOR, onde terei o papel de AUTORPEDIDO DE DADOS no corpo da mensagem enviada na requisição do serviço web.Esse termo de autorização está assinado digitalmente com o certificadodigital do PROCURADOR ou OUTORGADO DO CONTRIBUINTE responsável, identificadocomo AUTOR DO PEDIDO DE DADOS." />
<avisoLegal texto="O acesso a estas informações foi autorizado pelo próprioPROCURADOR ou OUTORGADO DO CONTRIBUINTE, responsável pela informação, viaassinatura digital. É dever do destinatário da autorização e consumidordeste acesso observar a adoção de base legal para o tratamento dos dadosrecebidos conforme artigos 7º ou 11º da LGPD (Lei n.º 13.709, de 14 deagosto de 2018), aos direitos do titular dos dados (art. 9º, 17 e 18, daLGPD) e aos princípios que norteiam todos os tratamentos de dados no Brasil(art. 6º, da LGPD)."/>
<finalidade texto="A finalidade única e exclusiva desse TERMO DEAUTORIZAÇÃO, é garantir que o CONTRATANTE apresente a API INTEGRA CONTADOResse consentimento do PROCURADOR ou OUTORGADO DO CONTRIBUINTE assinadodigitalmente, para que possa realizar as requisições dos serviços web da APIINTEGRA CONTADOR em nome do AUTOR PEDIDO DE DADOS (PROCURADOR ou OUTORGADODO CONTRIBUINTE)." />
<dataAssinatura data="20220614"/>
<vigencia data="20221231"/>
<destinatario numero="33683111000107"
nome="SERVICO FEDERAL DE PROCESSAMENTO DE DADOS (SERPRO)"
tipo="PJ"
papel="contratante"/>
<assinadoPor numero="00000000000000"
nome="NOME DO CONTRIBUINTE"
tipo="PJ"
papel="autor pedido de dados"/>
</dados>
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
<SignedInfo>
<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001REC-xml-c14n-20010315"/>
<SignatureMethod Algorithm="http://www.w3.org/2001/04xmldsig-more#rsa-sha256"/>
<Reference URI="" >
<Transforms>
<Transform Algorithm="http://www.w3.org/2000/09xmldsig#enveloped-signature"/>
<Transform Algorithm="http://www.w3.org/TR/2001REC-xml-c14n-20010315"/>
</Transforms>
<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
<DigestValue>9QY...=</DigestValue>
</Reference>
</SignedInfo>
<SignatureValue>W64q...==</SignatureValue>
<KeyInfo>
<X509Data>
<X509Certificate>MIIGx...=</X509Certificate>
</X509Data>
</KeyInfo>
</Signature>
</termoDeAutorizacao>
```

## Processo de validação de assinatura digital

O Procedimento de validação da assinatura digital adotado pelo serviço de Autenticação do Procurador é o mesmo do sistema eSocial:

1) extrair a chave pública do certificado;

2) verificar o prazo de validade do certificado utilizado;

3) montar e validar a cadeia de confiança dos certificados validando também a LCR (Lista de Certificados Revogados) de cada certificado da cadeia;

4) validar o uso da chave utilizada (assinatura digital) de forma a aceitar certificados somente do tipo A (não serão aceitos certificados do tipo S);

5) garantir que o certificado utilizado é de um usuário final e não de uma autoridade certificadora;

6) adotar as regras definidas pelo RFC 3280 para as LCR e cadeia de confiança;

7) validar a integridade de todas as LCR utilizadas pelo sistema;

8) prazo de validade de cada LCR utilizada (verificar data inicial e final).

| Validação da assinatura digital |
| --- |
| Será validada além da integridade e autoria, a cadeia de confiança com a validação das LCR. |

## Validação do Certificado Digital

O Certificado Digital utilizado na assinatura do arquivo XML deve atender aos seguintes critérios, caso contrário uma mensagem será retornada:

| Mensagem | Efeito |
| --- | --- |
| A formação da cadeia de certificação até sua raiz deve ser confiável. | Rejeição do documento assinado. |
| A raiz da cadeia deverá pertencer a Autoridade Certificadora Raiz Brasileira (ICP-Brasil). | Rejeição do documento assinado. |
| O certificado não poderá estar revogado. | Rejeição do documento assinado. |
| O certificado não poderá estar expirado na data da verificação. | Rejeição do documento assinado. |
| O certificado deverá ser do tipo e-CNPJ, ou e-PJ, se o certificado for de Pessoa Jurídica. | Rejeição do documento assinado. |
| O certificado deverá ser do tipo e-CPF, ou e-PF, se o certificado for de Pessoa Física. | Rejeição do documento assinado. |
| O certificado não foi encontrado. | Rejeição do documento assinado. |
| Falha ao acessar a lista de certificados revogados. | Rejeição do documento assinado. |

## Layout XML (Termo de Autorização)

| Tag | Descrição | Ocorrência | Obrigatório |
| --- | --- | --- | --- |
| dados | Contém os dados de identificação do Contratante do Produto na Loja Serpro e do Autor do Pedido de Dados que está assinando o documento XML para autenticar com os dados do Procurador. | Única | SIM |
| sistema | Identificação do sistema. Atributo: id = “API Integra Contador” | Única | SIM |
| termo | Atributo: Texto = “Autorizo a empresa CONTRATANTE, identificada neste termo de autorização como DESTINATÁRIO, a executar as requisições dos serviços web disponibilizados pela API INTEGRA CONTADOR, onde terei o papel de AUTOR PEDIDO DE DADOS no corpo da mensagem enviada na requisição do serviço web. Esse termo de autorização está assinado digitalmente com o certificado digital do PROCURADOR ou OUTORGADO DO CONTRIBUINTE responsável, identificado como AUTOR DO PEDIDO DE DADOS.” | Única | SIM |
| avisoLegal | Atributo: Texto = “O acesso a estas informações foi autorizado pelo próprio PROCURADOR ou OUTORGADO DO CONTRIBUINTE, responsável pela informação, via assinatura digital. É dever do destinatário da autorização e consumidor deste acesso observar a adoção de base legal para o tratamento dos dados recebidos conforme artigos 7º ou 11º da LGPD (Lei n.º 13.709, de 14 de agosto de 2018), aos direitos do titular dos dados (art. 9º, 17 e 18, da LGPD) e aos princípios que norteiam todos os tratamentos de dados no Brasil (art. 6º, da LGPD).” | Única | SIM |
| finalidade | Atributo: Texto: “A finalidade única e exclusiva desse TERMO DE AUTORIZAÇÃO, é garantir que o CONTRATANTE apresente a API INTEGRA CONTADOR esse consentimento do PROCURADOR ou OUTORGADO DO CONTRIBUINTE assinado digitalmente, para que possa realizar as requisições dos serviços web da API INTEGRA CONTADOR em nome do AUTOR PEDIDO DE DADOS (PROCURADOR ou OUTORGADO DO CONTRIBUINTE).” | Única | SIM |
| dataAssinatura | Atributo: Data: data da assinatura deste termo de autorização, no formato AAAAMMDD (A = ano, M = mês e D = dia). | Única | SIM |
| vigencia | Atributo: Data: data de validade do termo de autorização, no formato AAAAMMDD (A = ano, M = mês e D = dia). | Única | SIM |
| destinatario | Atributos: numero: número do CNPJ (tamanho 14), somente números e sem máscara de formatação. Nome: nome da razão social do contratante. Tipo: “PJ” Papel: “contratante” | Única | SIM |
| assinadoPor | Assinado pelo contribuinte responsável pelo papel de Autor Pedido de Dados ou Procurador de contribuintes. Atributos: numero: número do CNPJ (tamanho 14) ou número do CPF (tamanho 11), somente números e sem máscara de formatação. Nome: nome do contribuinte. Tipo: “PJ” ou “PF” Papel: “autor pedido de dados” | Única | SIM |

## Validações aplicadas

| Critério | Efeito |
| --- | --- |
| CNPJ inválido | Rejeição do documento assinado. |
| CPF inválido | Rejeição do documento assinado. |
| O número de inscrição deverá ter o tamanho 11(CPF) ou 14 (CNPJ) | Rejeição do documento assinado. |
| O número de inscrição do autor pedido de dados deverá ser igual ao CNPJ/CPF do certificado utilizado para assinar. | Rejeição do documento assinado. |

## Recomendações adicionais

Algumas recomendações para problemas comuns, já identificadas e que podem ser verificadas no conteúdo do documento antes de assinar o documento:

- utilizar aspas no lugar do apóstrofo;
- antes de adicionar o elemento x509 que contém o certificado, deve-se remover os espaço em branco, os caracteres especiais de quebra de linha, tais como: \r \n CR LF .
- remover a indentação do documento xml e quebra de linha \r \n ;
- realizar um teste unitário para converter a string base64 para XML;
- após assinar o documento, o mesmo deve permanecer inalterado, qualquer modificação torna o cálculo do hash da assinatura inválido;
- Existe uma ferramenta governamental gratuita em que se pode testar a integridade da assinatura de um documento XML: [https://validar.iti.gov.br/].

Para finalizar, verifique se não existe algum caractere UNICODE oculto no texto do documento Termo de Autorização. A existência de caracteres ocultos podem provocar a mensagem `[AcessoNegado-AUTENTICAPROCURADOR-013]`. Essa mensagem é exibida no processo de validação da assinatura digital.
