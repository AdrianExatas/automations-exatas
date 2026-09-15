---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/entregar_saida/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "e6c7c2b97d93bf7e78f1ab19ffff7a281cad27879ee6a0cb09f139ef4e378887"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/servicos/entregar_saida/).

# Transmitir a Declaração Sócio Econômica - DEFIS

**Dados de Saída**

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um Array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Array |
| dados | Estrutura de dados de retorno. | String |

Objeto: SaidaEntregar

| Campo | Descrição | Tipo |
| --- | --- | --- |
| declaracaoPdf | PDF da Declaração, em base 64. | String |
| reciboPdf | PDF do Recibo, em base 64. | String |
| idDefis | Id da Defis gerada na transmissão. | String (15) |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [dados de Saida](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/exemplos/retorno_entregar/)
