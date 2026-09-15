---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/mapa_dos_eventos/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "23d1f3221dccc410f7d0e3bd8b9ecafe372af42dd054bfef77d2894312a9839e"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-contador-gerenciador/eventosatualizacao/mapa_dos_eventos/).

# Mapa dos Eventos de Atualização

A seguir são descritos todos os eventos disponibilizados e seus respectivos produtores de eventos.

## Produtor de Eventos: Integra-DCTFWeb

| # | Solução | IdSistema | IdEvento | Tipo |
| --- | --- | --- | --- | --- |
| 3.01 | Integra-DCTFWeb | DCTFWEB | E0301 | PJ ou PF |

A DCTF Previdenciária fornecerá o evento: Declaração.

Esse evento é produzido quando tem movimento de recebimento de apuração ou entrega de declaração.

Por exemplo:

- Recebimento de REINF, e-Social e SERO, ou
- transmissão da declaração.

Ou seja, somente as operações de recebimento da apuração e transmissão da declaração (inclusive transmissão imediata) serão monitoradas. As Consultas e alterações nas declarações que não geram o evento de transmissão não serão passíveis de monitoração.

Os eventos de transmissão podem ocorrer em declarações do tipo:

- GERAL MENSAL
- 13º SALÁRIO
- AFERIÇÃO
- ESPETÁCULO DESPORTIVO
- RECLAMATÓRIA TRABALHISTA

Sempre que houver uma transmissão de declaração original ou retificadora ocorrerá a indicação da data da última atualização.

Exemplo: caso uma declaração seja transmitida assinada pelo contribuinte ou por transmissão imediata, o sistema envia uma atualização com data desta última atualização, essa data sinaliza que houve uma atualização na declaração deste contribuinte para o evento de transmissão.

## Produtor de Eventos: Integra-CaixaPostal

| # | Solução | IdSistema | IdEvento | Tipo |
| --- | --- | --- | --- | --- |
| 6.01 | Integra-CaixaPostal | CAIXAPOSTAL | E0601 | PJ ou PF |

Evento de envio de nova mensagem de um contribuinte.

Exemplo: no caso de recebimento de uma nova mensagem no Caixa, este evento é gerado e atualizado com a data do evento.

## Produtor de Eventos: Integra-Pagamento

| # | Solução | IdSistema | IdEvento | Tipo |
| --- | --- | --- | --- | --- |
| 7.01 | Integra-Pagamento | PAGTOWEB | E0701 | PJ ou PF |

O Integra Contador será notificado sempre que houver algum dos eventos abaixo com algum dos pagamentos de um determinado contribuinte:

- Entrada de novo documento na base de pagamentos da Receita Federal;
- Alteração de algum dos campos retificáveis de algum pagamento;
- Cancelamento ou ‘Desfaz Cancelamento’ de algum pagamento;
- Bloqueio de parte ou total do saldo do pagamento pelo usuário da Receita Federal (Bloqueio de Pagamentos Online);

(*) Saldo é parte do valor do pagamento ainda não utilizada, ou seja, não alocada à débitos e não restituída ao contribuinte. Alterações de saldo devido a alocações e restituições (não registradas no Bloqueio de Pagamentos Online) não são notificadas.
