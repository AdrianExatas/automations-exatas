---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "0896c773b27eecf0547f5a28acca6a9e3a7d78dfc0681cbf0ee059e1b362a34d"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-procuracoes/procuracoes/mensagens/).

# Mensagens de negócio

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [Sucesso-PROCURACOES] | Requisição efetuada com sucesso. | Objeto dados foi preenchido. |
| [Aviso-PROCURACOES-20001] | Uma ou mais procurações foram retornadas com sucesso. | - |
| [Aviso-PROCURACOES-40400] | Não possui procuração ativa. | - |
| [AcessoNegado-PROCURACOES-40300] | Procurador diferente do Autor do pedido. | Permissão negada. Procurador deve ser o mesmo do autor do pedido. |
| [AcessoNegado-PROCURACOES-40300] | Outorgante diferente do Contribuinte. | Permissão negada. Outorgante deve ser o mesmo do contribunte. |
| [AcessoNegado-PROCURACOES-40301] | X-API-KEY Inválido. | Corrigir header. |
| [EntrataIncorreta-PROCURACOES-40002] | CNPJ do contratante inválido! | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40002] | CPF do contratante inválido! | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40003] | CNPJ do autor do pedido inválido! | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40003] | CPF do autor do pedido inválido! | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40004] | CNPJ do contribuinte inválido! | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40004] | CPF do contribuinte inválido! | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40005] | IdSistema inválido. | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40006] | IdServiço inválido. | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40007] | CPF do outorgante inválido! | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40007] | CNPJ do outorgante inválido! | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40007] | Tipo Ni do outorgante inválido! | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40007] | CPF do outorgado inválido! | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40007] | CNPJ do outorgado inválido! | Dados inválidos. Corrigir dados. |
| [EntrataIncorreta-PROCURACOES-40007] | Tipo Ni do outorgado inválido! | Dados inválidos. Corrigir dados. |
| [Erro-PROCURACOES-500XX (50001-50099)] | Erro ao utilizar o Integra Contador Procurações. Tente novamente mais tarde. | Sistema indisponível. Efetuar nova tentativa. |
