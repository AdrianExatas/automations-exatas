---
source: "https://centraldeajuda.serpro.gov.br/duvidas/pt/avisos/integracontadoreventosatualizacao/"
sourceUpdatedAt: "17 de abril de 2024 15:29:20 -03"
retrievedAt: "2026-09-14T15:02:49.914Z"
semanticHash: "c3910aeb027150be0f0ece5f80764b90fef5914bc5451a6528bb73713da27c14"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://centraldeajuda.serpro.gov.br/duvidas/pt/avisos/integracontadoreventosatualizacao/).

# Integra Contador - Eventos de Última Atualização!

É com satisfação que comunicamos a implantação do serviço **"Eventos de Última Atualização"**! Trata-se de grande marco para o **Integra Contador**, que passa a oferecer uma solução de monitoramento revolucionária e gratuita, que vai apoiar os clientes na assertividade de suas consultas, uma vez que informa as alterações ocorridas nas bases de dados por contribuinte PF e ou PJ.

A solução é projetada para trabalhar com eventos, onde os sistemas de negócio atuam como produtores e se comunicam com o Integra Contador para informar sobre atualizações ocorridas.

A função principal desse serviço é fornecer uma sinalização, indicando que ocorreu uma atualização relacionada a um tópico específico. A novidade vai proporcionar a otimização dos processos das empresas que prestam serviços contábeis aos contribuintes, além de possibilitar a redução do consumo de páginas web do e-Cac, uma vez que agora as empresas passam a ter um canal seguro e apropriado para realizar análises preditivas para os seus respectivos clientes.

## Mapa dos Eventos de Atualização:

### 1. Produtor de Eventos: Integra-DCTFWeb

A DCTF Previdenciária fornecerá o evento: Declaração.

Esse evento é produzido quando tem movimento de recebimento de apuração ou entrega de declaração.

Por exemplo:

- Recebimento de REINF, e-Social e SERO, ou
- transmissão da declaração.

Os eventos de transmissão podem ocorrer em declarações do tipo:

- GERAL MENSAL
- 13º SALÁRIO
- AFERIÇÃO
- ESPETÁCULO DESPORTIVO
- RECLAMATÓRIA TRABALHISTA

Sempre que houver uma transmissão de declaração original ou retificadora ocorrerá a indicação da data da última atualização.

### 2. Produtor de Eventos: Integra-CaixaPostal

É produzido um evento sempre que houver o recebimento de uma nova mensagem na Caixa Postal do contribuinte PF e ou PJ

### 3. Produtor de Eventos: Integra-Pagamento

O Integra Contador será notificado sempre que houver algum dos eventos de pagamento relacionados abaixo, de um determinado contribuinte:

- Entrada de novo documento na base de pagamentos da Receita Federal;
- Alteração de algum dos campos retificáveis de algum pagamento;
- Cancelamento ou ‘Desfaz Cancelamento’ de algum pagamento;
- Bloqueio de parte ou total do saldo do pagamento pelo usuário da Receita Federal (Bloqueio de Pagamentos Online)

Conheça também a Documentação Técnica do produto .

*Publicado em 17/04/2024*
