---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "38cd84e0946b58ca21c87685f72f6dc0ffce9b921676dffd54fe387e1355824f"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/).

# Introdução

## O que é o Integra PNRCONTADOR?

O Integra Redesim visa possibilitar ao profissional contábil e às empresas contábeis a ciência e gestão dos seus vínculos contabilistas. Por ele, é possível consultar seus vínculos, renunciar a um vínculo, consultar suas renúncias ou emitir comprovantes de renúncia.

## Quem pode utilizar este serviço?

Pessoas físicas que atuam como profissionais contábeis ou pessoas jurídicas que sejam empresas contábeis. Os contribuintes só podem utilizar os serviços para consultar informações, solicitar renúncias de vínculo ou emitir comprovantes referentes a clientes deles próprios, não sendo possível o acesso aos vínculos de terceiros.

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra Redesim, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita contribuintes do tipo 1 (Pessoa Física) e 2 (Pessoa Jurídica).

O Integra Contador estabelece um canal seguro de comunicação com o sistema PNRCONTADOR, garantindo a integridade e a confidencialidade das informações transmitidas.

## Limites de utilização

Os limites atuais definidos são:

- Tamanho máximo da página de clientes/renúncias: 50 distintos por requisição.
- Limite de requisições simultâneas para qualquer dos serviços: 200 requisições.

Para cada requisição dos serviços de Consultas de Vínculos e de Renúncias, o tamanho da página deverá obedecer o limite de até 50 registros de resposta por requisição.

Para toda e qualquer requisição de serviços, há um limite de até 200 requisições simultâneas com o intuíto de não sobrecarregar os recursos computacionais. No caso de atingir o limite de simultaneidade, uma mensagem status HTTP 429 impedirá novas requisições temporariamente por alguns segundos, até que as requisições concorrentes sejam processadas e liberadas automaticamente para novas requisições.

## Sumário dos serviços

ATENÇÃO

É essencial a leitura **cuidadosa** da documentação de cada serviço no menu **Documentação > Soluções > Integra-Redesim > PNRCONTADOR > Serviços** para a utilização correta dos mesmos. Verifique também as páginas [Mensagens](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-redesim/pnrcontador/mensagens/) para um melhor entendimento das informações retornadas pela API.

- Consultar Vínculos: Consulta os vínculos contabilistas ativos da empresa ou profissional contábil.
- Consultar Renúncias: Consulta as renúncias de vínculo realizadas anteriormente pela empresa ou profissional contábil.
- Solicitar Renúncia: Solicita uma renúncia de vínculo contabilista.
- Situação Solicitar Renúncia: Consulta a situação de uma solicitação de renúncia realizada pelo serviço Solicitar Renúncia .
- Emitir Comprovante: Emite um comprovante em formato PDF atestando a efetivação de uma renúncia de vínculo.
