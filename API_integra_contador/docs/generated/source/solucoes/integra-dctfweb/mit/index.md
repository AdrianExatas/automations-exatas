---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "ad60c3408d70873658c3c931c158269fb5f190ed3aef80165f8465e889bfd7a7"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/).

# Introdução

## O que é o MIT?

O Módulo de Inclusão de Tributos – MIT, é um serviço integrado à Declaração de Débitos e Créditos Tributários Federais - DCTFWeb para recepção de débitos e créditos relativos a tributos administrados pela Receita Federal do Brasil – RFB que ainda não são transmitidos para a DCTFWeb por meio de uma escrituração fiscal específica.

O MIT pode ser preenchido diretamente no Atendimento Virtual (e-CAC) da Receita Federal, acessível pelo endereço https://www.gov.br/receitafederal/pt-br/canais_atendimento/atendimento-virtual ou por meio de importação de arquivo previamente preparado no ambiente do próprio contribuinte.

O MIT foi desenvolvido no intuito de simplificar o cumprimento de obrigações acessórias, reduzindo a quantidade de declarações e uniformizando o tratamento do crédito tributário.

Prazo: O prazo para a entrega da Declaração de Débitos e Créditos Tributários Federais Previdenciários e de Outras Entidades e Fundos (DCTFWeb) foi alterado. Até 2024, o prazo de entrega era até o dia 15 do mês subsequente ao período de apuração. Agora em 2025, a transmissão da DCTFWeb deve ser feita **até o último dia útil do mês subsequente ao período de apuração**.

Excepcionalmente os débitos e créditos decorrentes do mês de janeiro de 2025 devem ser declarados até 31/03/2025, ou último dia útil de Março de 2025.

## Quem pode utilizar este serviço?

Pessoas jurídicas que estão sujeitas ao recolhimento mensal da DCTF.

Somente poderão enviar a DCTFWeb os contribuintes enquadrados nos grupos específicos definidos pela [Instrução Normativa RFB nº 2005/2021](https://www.in.gov.br/en/web/dou/-/instrucao-normativa-rfb-n-2.005-de-29-de-janeiro-de-2021-301651873) e [Instrução Normativa RFB nº 2.237/2024](https://www.in.gov.br/en/web/dou/-/instrucao-normativa-rfb-n-2.237-de-4-de-dezembro-de-2024-599911204).

## Como funciona o uso via Integra Contador?

Para utilizar os serviços do Integra DCTFWeb, é necessário fazer uma chamada à API por meio do Integra Contador, que é responsável por gerenciar o envio e o recebimento dos dados.

A requisição deve ser feita via método `POST`, com um corpo (`body`) em formato `JSON`, contendo as seguintes informações:

- Contratante
- Autor do Pedido de Dados
- Contribuinte
- Pedido de Dados

⚠️ **Importante:** O sistema aceita apenas contribuintes do tipo 2 (Pessoa Jurídica). Pedidos com outros tipos de contribuinte não serão processados.

O Integra Contador estabelece um canal seguro de comunicação com o sistema MIT, garantindo a integridade e a confidencialidade das informações transmitidas.

## Sumário dos serviços

ATENÇÃO

É essencial a leitura **cuidadosa** da documentação de cada serviço no menu **Documentação > Soluções > Integra-DCTFWeb > MIT > Serviços** para a utilização correta dos mesmos. Verifique também a página [Mensagens](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-dctfweb/mit/mensagens/) para um melhor entendimento das informações retornadas pela API.

Lembrando que as apurações após serem encerradas no MIT, terão suas informações transmitidas para a DCTFWeb para integrar, junto com os tributos escriturados no eSocial ou na EFD-Reinf, a declaração mensal de confissão de débitos do contribuinte. No MIT, as apurações podem estar na situação EM EDIÇÃO, ENCERRAMENTO EM CURSO ou ENCERRADA.

- Encerrar Apuração: Este serviço oferece uma solução para o encerramento de uma apuração que não apresente pendências, no Módulo de Inclusão de Tributos do sistema DCTFWeb. Caso haja algum item com pendências, o sistema sinaliza as pendências e impede a criação da apuração.
- Consultar Situação Encerramento: Este serviço oferece uma solução para a consulta assíncrona do encerramento de uma apuração, no Módulo de Inclusão de Tributos do sistema DCTFWeb.
- Consultar Apuração: O serviço permite consultar as apurações registradas no sistema, proporcionando acesso rápido e seguro às informações detalhadas. Ao realizar a consulta, o usuário pode visualizar o retorno do JSON contendo os dados da apuração ou das pendências associadas, facilitando a análise e tomada de decisão.
- Consultar Apuração por ano ou mês: O serviço permite listar todas as apurações MIT por ano ou mês.
