---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/erros_comuns/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "f07c2537634cacac2f17787f5c8c8a6df7794e0812353709b0e763ff0386abae"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/erros_comuns/).

# Erros comuns ao utilizar este serviço

Essa página será incrementada conforme as dúvidas mais frequentes dos usuários.

## Sobre a transmissão e a assinatura digital do XML

A grande maioria dos erros reportados por usuários são relativos à funcionalidade [Transmitir Declaração](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/entregar_declaracao/), especialmente no processo de assinatura no XML.

Os padrões exigidos para a assinatura digital estão descritos em [Transmitir Declaração](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/dctfweb/servicos/entregar_declaracao/), que também contém modelos de assinadores em C# e PHP. **O Serpro não presta consultoria na elaboração de assinadores em demais linguagens**. O material mais completo sobre os elementos da assinatura é a documentação da recomendação da W3C, lá referenciada ([http://www.w3.org/TR/xmldsig-core/](http://www.w3.org/TR/xmldsig-core/)). É um texto extenso e a maior parte dos ítens não é utilizada, mas é uma boa fonte para entender qual o papel de cada elemento da assinatura e assim guiar uma implementação correta do processo. As seções [3.1.1 Reference Generation](https://www.w3.org/TR/xmldsig-core/#sec-ReferenceGeneration) e [3.1.2 Signature Generation](https://www.w3.org/TR/xmldsig-core/#sec-SignatureGeneration) contém o essencial e servem como ponto de partida para entender os demais elementos.

Caso esteja tendo problemas **com a assinatura digital**, saiba que no [Serviço de validação de assinaturas eletrônicas do ITI](https://validar.iti.gov.br/) é possivel validar sua assinatura gratuitamente. Com um detalhe - caso sua assinatura esteja **mal formada** (isto é, há um erro sério em sua estrutura conforme prescrita na referência acima) você não obterá qualquer resposta pois a página sequer conseguirá carregar a assinatura. Algo similar ocorrerá caso envie uma assinatura mal formada para nós - receberá o erro "TRANS18-Erro ao processar elemento Signature do XML. Verifique a validade dos elementos SignatureValue e SignedInfo do XML".

A seguir, outros erros comuns de assinatura:

- TRANS04-XML com conteúdo inválido enviado para transmissão.O XML enviado para transmissão é distinto do XML Gerado além da assinatura digital: A declaração assinada deve ser idêntica, caractere a caractere, à recebida pelo serviço CONSXMLDECLARACAO38. A comparação é feita via hash computado em cima do XML recebido, removida a tag de assinatura. É muito comum recebermos queixas sobre transmissões recusadas quando o XML foi alterado no processo de assinatura (alterações que não alteram sua semântica, como troca de ordem dos atributos de uma tag ou transformação de maiúsculas em minúsculas em algum ponto). Caso passe por esse problema, inspecione tanto a string contendo o XML sendo repassada a seu assinador e o XML após a assinatura, pois algumas bibliotecas de manipulação de XML alteram automaticamente o XML (algumas trocam a ordem dos atributos, passam o valor do atributo encoding para maiúsculo etc). Recomendamos realizar a comparação das strings por algum aplicativo ao invés de fazê-lo visualmente, pois o último método é muito propenso a erros. É comum recebermos queixas improcedentes de usuários que usaram esse método (inclusive pela presença de caracteres invisíveis, como o UTF-8 BOM).
- TRANS02- XML com formato inválido enviado para transmissão. O número de tags 'Reference' encontrado é diferente de 1: A tag Reference descreve o que esta sendo assinado e como. Na operação de transmissão de declaração, a tag ConteudoDeclaracao é o que deve ser assinado - o que será indicado pelo valor do atributo URI da tag Reference como sendo o valor do atributo ID da tag ConteudoDeclaracao. No padrão que utilizamos (http://www.w3.org/TR/xmldsig-core/), há um elemento Reference para cada elemento assinado. Como exigimos a assinatura de um único elemento, deve haver exatamente uma tag Reference.
