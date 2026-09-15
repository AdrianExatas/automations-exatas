---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/dados_de_dominio/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "9041cccd0207bc82bda095cba3d29aee5e0c32b670544e6428ba2e0287a74004"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sn/defis/dados_de_dominio/).

# Dados de domínio

**Tipos de evento para situação especial**

| Código | Descrição |
| --- | --- |
| 1 | Cisão parcial |
| 2 | Cisão total |
| 3 | Extinção |
| 4 | Fusão |
| 5 | Incorporação/Incorporada |

**Regra para inatividade - somente para ano anterior a 2025**

| Código | Descrição |
| --- | --- |
| 0 | As atividades do PGDASD totalizam zero. Responde NÃO à pergunta "Contribuinte declara que permaneceu, durante o ano calendário, sem efetuar qualquer atividade operacional, não operacional, financeira ou patrimonial?" |
| 1 | As atividades do PGDASD totalizam zero. Responde SIM à pergunta "Contribuinte declara que permaneceu, durante o ano calendário, sem efetuar qualquer atividade operacional, não operacional, financeira ou patrimonial?" |
| 2 | O total das atividades do PGDASD (incluindo valor fixo) é maior que zero. |

**Tipo de benefeciário da doação à campanha eleitoral**

| Código | Descrição |
| --- | --- |
| 1 | Candidato a cargo político eletivo |
| 2 | Comitê financeiro |
| 3 | Partido político |

**Tipo de forma de doação à campanha eleitoral**

| Código | Descrição |
| --- | --- |
| 1 | Cheque |
| 2 | Outro títulos de crédito |
| 3 | Transferência eletrônica |
| 4 | Depósito em espécie |
| 5 | Dinheiro |
| 6 | Bens |
| 7 | Serviços |

**Tipo de operação interestadual**

| Código | Descrição |
| --- | --- |
| 1 | Entrada |
| 2 | Saída |

**Tipo de administração tributária**

| Código | Descrição |
| --- | --- |
| 1 | Distrital |
| 2 | Estadual |
| 3 | Federal |
| 4 | Municipal |
