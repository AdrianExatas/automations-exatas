---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/"
sourceUpdatedAt: "25 de fevereiro de 2026 21:19:34 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "5cabd3a82acd2ddc5b092f0f4002f9698cc5ca17fef8daa27d541a1f789363c1"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/).

# Introdução

## O que é o serviço Eventos de Última Atualização?

O serviço Eventos de Última Atualização é uma solução de monitoramento disponível para clientes que tenham adquirido acesso através da loja SERPRO do produto Integra Contador.

Essa solução é projetada para trabalhar com eventos, onde os sistemas de negócio atuam como produtores e se comunicam com o Integra Contador para informar sobre atualizações ocorridas.

A função principal desse serviço é fornecer uma sinalização indicando que ocorreu uma atualização relacionada a um tópico específico. Ele permite que o cliente saiba quando foi a última atualização de um evento específico relacionado a um determinado contribuinte. Esses eventos ficam disponibilizados pelo prazo máximo de 60 dias.

## Como funciona o uso via Integra Contador?

Para utilizar os serviços de consulta EVENTOSATUALIZACAO, é necessário utilizar a API Integra Contador, que gerencia o pedido de dados a ser realizado pelo próprio contratante.

A estrutura básica de entrada deve conter os dados do "Contratante", "Autor do pedido de dados", "Contribuinte" e "Pedido de dados". Essas informações são fornecidas no formato JSON no corpo (body) da requisição utilizando o método POST.

A consulta ocorre de forma assíncrona e em lote. Existem dois tipos de serviços, um para solicitar e outro para obter os eventos, sendo que foi separado em PF (Pessoa Física) e PJ (Pessoa Jurídica).

Este serviço garante sempre a exibição das datas de atualização do evento mais recente, limitando-se aos últimos 60 dias, após esse período a data não será mais exibida, pois, o dado não sofreu mais nenhuma alteração.

⚠️ **Importante:** O sistema aceita contribuintes do tipo 3 (Lista de Pessoa Física) e 4 (Lista de Pessoa Jurídica).

A requisição do tipo solicitar eventos PF (Pessoa Física) ou PJ (Pessoa Jurídica) vai retornar um número de protocolo e uma estimativa de tempo de atendimento (ETA) para o cliente retornar e obter as datas dos eventos solicitados. Nessa requisição o "Contratante" é o próprio "Autor do pedido de dados". O objeto "Contribuinte" recebe uma indicação de Tipo 3 para lote de PF (Pessoa Física) ou 4 para lote de PJ (Pessoa Jurídica) com o lote de números de inscrição. O pedido de dados contém o identificador do evento a solicitado.

**IMPORTANTE**

A aplicação Integra Contador Consultar Eventos implementa um sistema de estimativa de tempo de processamento baseado em EMA (Exponential Moving Average) e P90 (percentil 90), permitindo que os clientes saibam quanto tempo suas solicitações levarão para serem processadas.

**IMPORTANTE**

É mandatório que o "Autor do Pedido de Dados" tenha procuração eletrônica do Portal eCAC para cada "Contribuinte". Só é permitido consultar se existir procuração ativa para o sistema de negócio monitorado. Por se tratar de um processamento em lote, as procurações verificadas devem estar vigentes até o dia anterior (D-1).

SOBRE O SINCRONISMO DAS ATUALIZAÇÕES

As atualizações nas bases produtoras de eventos ocorrem em um tempo médio de 15 minutos. Se um evento teve uma atualização na base de dados, a disponibilidade da data do evento pode demorar até 15 minutos ou mais para ficar sincronizada e disponível.

Para obter mais informações sobre os eventos disponíveis, consulte a seção [Mapa dos Eventos de Atualização](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/mapa_dos_eventos/).
