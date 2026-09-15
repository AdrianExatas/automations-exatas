---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/dados_de_dominio/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "8075dc9117a1856d8c780635db0b82a690ad7ce1b7011b53cd0a49b63679f40b"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-sicalc/sicalc/dados_de_dominio/).

# Dados de domínio

## Tipo do período de apuração

Cada receita/extensão tem um formato de tipo de período de apuração esperado (atributo tipoPA):

| Código | Descrição |
| --- | --- |
| AN | anual |
| TR | trimestral |
| ME | mensal |
| QZ | quinzenal |
| DC | decendial |
| SM | semanal |
| DI | diário |

## Data do período de apuração

Enviar o valor no formato esperado de acordo com o tipo de PA informado:

| Se o tipo for | Formato |
| --- | --- |
| anual | aaaa |
| trimestral | trimestre/ano (01 a 04) |
| mensal | mm/aaaa |
| quinzenal | quinzena/mm/ano (01 ou 02) |
| decendial | decêndio/mm/ano (01 a 03) |
| semanal | semana/mm/aaaa (01 a 05) |
| diário | dd/mm/aaaa |

## Código do município

O serviço utiliza a codificação da Tabela de Órgãos e Municípios da Receita Federal do Brasil.

Deve ser informado somente o código do município, o dígito verificador é ignorado. Por exemplo: para 9701-2 (Brasília), só 9701 deve ser informado.

Link para consulta [Tabela de Orgaos e Municipios](https://www.tomweb.receita.fazenda.gov.br/)

## Códigos da receita e extensão

O serviço utiliza a codificação da Tabela de Códigos de Receitas da Receita Federal do Brasil Link para consulta [Tabela de Receitas](https://siefreceitas.receita.economia.gov.br/codigos-de-receita-de-tributos-e-contribuicoes-darf-e-dje)

## Número de referência

Informação complementar do pagamento efetuado que é encaminhada para a cobrança e arrecadação da Receita Federal.

O envio do campo pode ser opcional ou obrigatório. O serviço [Apoio de consulta receitas do Sicalc](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/sistemas/sicalc/servicos/apoio_consulta_receitas_do_sicalc) retorna a descrição do campo referência e se o seu envio é opcional ou obrigatório para a receita informada.

Caso o envio seja opcional, não são feitas nenhuma validações no valor informado, o cliente deve se certificar de estar informando um valor correto.

Na tabela abaixo, você pode conferir os valores esperados neste campo para alguns códigos de receita.

| Receita/Extensão | Descrição | Informação aguardada | Formato |
| --- | --- | --- | --- |
| 1070-01 | Imposto Territorial Rural (até 2021) | Enviar o NIRF numérico | 9999999 |
| 1070-02 | Imposto Territorial Rural (a partir de 2022) | Enviar o NIRF/CIB alfanumérico | 9999999/AAAAAAAA |
