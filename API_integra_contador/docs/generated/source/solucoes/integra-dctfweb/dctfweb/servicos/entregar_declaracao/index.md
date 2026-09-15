---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/entregar_declaracao/"
sourceUpdatedAt: "10 de abril de 2026 14:58:42 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "2e126d06db2e8d76e638bb94dd68339215f042faf82692fdc13dce47603c688b"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/entregar_declaracao/).

# Transmitir declaração

Efetua a transmissão de uma declaração EM ANDAMENTO a partir da informação do base64 gerado no serviço CONSXMLDECLARACAO38. O arquivo deverá ser assinado digitalmente pelo contribuinte antes de acionar o serviço TRANSDECLARACAO310.

Conteúdo da declaração assinada deve ser imutável

A declaração assinada deve ser idêntica, caractere a caractere, à recebida pelo serviço CONSXMLDECLARACAO38. **A comparação é feita via hash computado em cima do XML recebido, removida a tag de assinatura.** É muito comum recebermos queixas sobre transmissões recusadas quando o XML foi alterado no processo de assinatura (alterações que não alteram sua semântica, como troca de ordem dos atributos de uma tag ou transformação de maiúsculas em minúsculas em algum ponto). Recomendamos realizar a comparação dos arquivos por algum aplicativo ao invés de fazê-lo visualmente.

Modelos de assinador digital

Exemplos disponíveis nas linguagens C# e PHP: - [Dotnet](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/modelos/modelo_de_assinador_digital_dotnet.md) - [PHP](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/modelos/modelo_de_assinador_digital_php.md)

Identificação no Pedido de Dados

idSistema: DCTFWEB idServico: TRANSDECLARACAO310

**Dados de Entrada**

Objeto Dados:

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| categoria | Categoria declaração | String ou Number | SIM |
| anoPA | Ano período apuração | String | SIM |
| mesPA | Mês período apuração | String | SIM. Exceto categoria 41 GERAL_13o_SALARIO ou 51 PF_13o_SALARIO |
| diaPA | Dia período apuração | String | NÃO. Somente para categoria 45 ESPETACULO_DESPORTIVO |
| numProcReclamatoria | Número Processo Reclamatória | String | NÃO. Somente para categoria 46 Reclamatória Trabalhista |
| xmlAssinadoBase64 | O XML obtido pela operação 'Consultar o XML da Declaração' assinado e em base64. O certificado usado na assinatura deve ser o do autor do pedido de dados. O elemento do XML a ser assinado é o 'ConteudoDeclaracao' (se não for o caso, a transmissão será rejeitada). Além disso, a assinatura deve seguir o padrão indicado na seção Padrões exigidos para a assinatura digital dessa página. | String | SIM |

**Exemplos objeto "dados" variações por categoria:**

```text
"dados": "{\"categoria\": \"GERAL_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"04\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": 40,\"anoPA\":\"2022\",\"mesPA\":\"04\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": 50,\"anoPA\":\"2022\",\"mesPA\":\"06\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": \"ESPETACULO_DESPORTIVO\",\"anoPA\":\"2022\",\"mesPA\":\"04\",\"diaPA\":\"19\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": 45,\"anoPA\":\"2022\",\"mesPA\":\"04\",\"diaPA\":\"19\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": \"GERAL_13o_SALARIO\",\"anoPA\":\"2022\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": 41,\"anoPA\":\"2022\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": \"PF_13o_SALARIO\",\"anoPA\":\"2022\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": 51,\"anoPA\":\"2022\",\"xmlAssinadoBase64\":\"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\":  \"RECLAMATORIA_TRABALHISTA\",\"anoPA\":\"2023\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"123456789012345\",\"xmlAssinadoBase64\": \"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
"dados": "{\"categoria\": 46,\"anoPA\":\"2023\",\"mesPA\":\"12\",\"numProcReclamatoria\": \"123456789012345\",\"xmlAssinadoBase64\": \"AQUI_VAI_TEXTOBASE64ASSINADO\"}"
```

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "00000000000",
"tipo": 1
},
"autorPedidoDados": {
"numero": "00000000000",
"tipo": 1
},
"contribuinte": {
"numero": "00000000000",
"tipo": 1
},
"pedidoDados": {
"idSistema": "DCTFWEB",
"idServico": "TRANSDECLARACAO310",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\\"mesPA\":\"06\",\"xmlAssinadoBase64\"\"<BASE64_REMOVIDO_TAMANHO_24093>\"}"
}
}
```

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| dados | Estrutura de dados de retorno. | String ( String escapada: NumeroRecibo) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um texto de tamanho 5 que representa um código interno do negócio. | Array de Object |

**Exemplo: json retorno**

```text
{
"contratante": {
"numero": "00000000000",
"tipo": 1
},
"autorPedidoDados": {
"numero": "00000000000",
"tipo": 1
},
"contribuinte": {
"numero": "00000000000",
"tipo": 1
},
"pedidoDados": {
"idSistema": "DCTFWEB",
"idServico": "TRANSDECLARACAO310",
"versaoSistema": "1.0",
"dados": "{\"categoria\": \"PF_MENSAL\",\"anoPA\":\"2022\",\"mesPA\":\"06\",\"xmlAssinadoBase64\": \"<BASE64_REMOVIDO_TAMANHO_24892>\"}"
},
"status": 200,
"dados": "{\"NumeroRecibo\":24781}",
"mensagens": [
{
"codigo": "Aviso-DCTFWEB-MG11",
"texto": "Transmissor Declaração Assinada executado com sucesso."
},
{
"codigo": "Sucesso-DCTFWEB-MG00",
"texto": "Requisição efetuada com sucesso"
}
]
}
```

**Padrões exigidos para a assinatura digital**

- Padrão de assinatura: XML Digital Signature, utilizando o formato Enveloped (http://www.w3.org/TR/xmldsig-core/)
- Certificado digital: emitido por AC credenciada no ICP-Brasil (http://www.w3.org/2000/09/xmldsig#X509Data)
- Cadeia de certificação: EndCertOnly (Incluir na assinatura apenas o certificado do usuário final) 3.1. Tipo do certificado: A1 ou A3
- Tamanho da chave criptográfica: compatível com os certificados A1 e A3 (2048 bits)
- Função criptográfica assimétrica: RSA (http://www.w3.org/2001/04/xmldsig-more#rsa-sha256)
- Função de message digest: SHA-256. (http://www.w3.org/2001/04/xmlenc#sha256)
- Codificação: Base64 (http://www.w3.org/2000/09/xmldsig#base64)
- Transformações exigidas: útil para realizar a canonicalização do XML enviado para realizar a validação correta da assinatura digital. São elas: 8.1. Enveloped (http://www.w3.org/2000/09/xmldsig#enveloped-signature) 8.2. C14N (http://www.w3.org/TR/2001/REC-xml-c14n-20010315)
- Elemento a ser assinado: A tag 'ConteudoDeclaracao' do XML.
- De quem deve ser o certificado usado na assinatura: do autor do pedido de dados (que consta no campo 'autorPedidoDados' do JSON da requisição).

Exemplo de elemento signature que usa corretamente os padrões exigidos (obs:o prefixo 'ds' não é necessário, mas ele também é aceito):

```text
<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
<ds:SignedInfo>
<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001REC-xml-c14n-20010315"/>
<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04xmldsig-more#rsa-sha256"/>
<ds:Reference URI="#id_12345">
<ds:Transforms>
<ds:Transform Algorithm="http://www.w3.org/2000/09xmldsig#enveloped-signature"/>
<ds:Transform Algorithm="http://www.w3.org/TR/2001REC-xml-c14n-20010315"/>
</ds:Transforms>
<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
<ds:DigestValue>Jb3obb+h9SIKg5JEDzSLzFYVYeQSG+2rc/auTZ7aUPU=<ds:DigestValue>
</ds:Reference>
</ds:SignedInfo>
<ds:SignatureValue>...</ds:SignatureValue>
<ds:KeyInfo>
<ds:X509Data>
<ds:X509Certificate>...</ds:X509Certificate>
</ds:X509Data>
</ds:KeyInfo>
</ds:Signature>
```
