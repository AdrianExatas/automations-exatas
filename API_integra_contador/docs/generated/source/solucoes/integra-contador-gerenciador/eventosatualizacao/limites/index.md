---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/limites/"
sourceUpdatedAt: "25 de fevereiro de 2026 21:41:24 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "cdbb83f799c58b4b09edf9f041842c73c2ddf24c170005a617b0ec86efc582a0"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/limites/).

# Limites

## Por que existem limites nas solicitação de Eventos de Última Atualização?

Por tratar-se de um serviço de monitoração para ser consumido por diversas empresas, o controle de limites ajuda a manter o ambiente estável e disponível a maior parte do tempo, assim todos os clientes poderam fazer o uso de uma forma mais sustentável evitando interrupções, erros ou indisponibilidades.

## Limites atuais

Visando a confiabilidade do serviço, foram estabelecidos alguns limites para as requisições realizadas pelos contratantes. Os limites definidos são esses:

- Requisições por evento (diariamente) :
- Eventos de PF, são 1.000 requisições por dia.
- Eventos de PJ, são 1.000 requisições por dia.
- Lote máximo de contribuintes :
- São 1.000 contribuintes distintos por requisição.

## Controle de limites

A cada resposta de requisição uma mensagem de aviso sob o código `[Aviso-EVENTOSATUALIZACAO-005]` exibe o saldo de requisições restantes para o evento acionado.

## Atingimento do limite

No caso de atingir o limite diário de requisições, a mensagem `[Aviso-EVENTOSATUALIZACAO-004]` com `status HTTP 429` impedirá novas requisições. Os limites serão liberados no dia seguinte.

## Ajustes nos limites

A análise técnica de performance é quem vai determinar os limites técnicos de uso deste serviço. A qualquer momento esses valores podem ser ajustados, tudo vai depender da forma de uso e dos alertas de monitoração deste serviço.

## TempoLimiteEmMin

Tempo limite (TTL - Time To Live) em minutos para armazenamento de resultados.

**Características:**

- Valor padrão: 20 minutos.
- Após este período, os dados são automaticamente removidos.
- Se o cliente não obtiver o resultado dentro deste prazo, deverá criar uma nova solicitação.

**⚠️ Importante:**

- Resultados são também removidos automaticamente após primeira obtenção bem-sucedida (código 200). Isso evita reprocessamento desnecessário. Isso segue o padrão One Shot (pega e apaga).

## TempoEsperaMedioEmMs

Estimativa dinâmica de tempo de processamento em milissegundos, calculada com base no histórico recente de execuções.

**Cálculo baseado em:**

- EMA (α=0.25): Média móvel exponencial do tempo histórico
- P90: 90% das requisições concluídas neste tempo
- Margem de segurança: 25% adicional
- Segmentação por tamanho: Estimativa específica por faixa de quantidade
- Valor mínimo: 3000ms (3 segundos)

Tabela de segmentação:

| Tamanho | Faixa de Registros | Descrição |
| --- | --- | --- |
| P | 1–10 | Pequeno |
| M1 | 11–50 | Médio 1 |
| M2 | 51–100 | Médio 2 |
| G1 | 101–250 | Grande 1 |
| G2 | 251–500 | Grande 2 |
| GG | 501–1000 | Extra Grande |

**Como usar:**

- Receba o tempoEsperaMedioEmMs na resposta da solicitação
- Aguarde esse tempo (recomendado: adicionar 1-2 segundos de buffer)
- Faça polling usando OBTEREVENTOSPF133 ou OBTEREVENTOSPJ134 com o protocolo
