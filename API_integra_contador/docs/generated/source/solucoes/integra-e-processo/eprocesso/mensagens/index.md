---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "d2ae094e4c990b0b265849088fa71420c63e389c42cdad2047a9c7c0b273d4a3"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-e-processo/eprocesso/mensagens/).

# Mensagens de negócio

| Código | Mensagem | Ação |
| --- | --- | --- |
| Sucesso-EPROCESSO-SC_001 | Requisição efetuada com sucesso. | HTTP STATUS: 200 |
| Sucesso-EPROCESSO-SC_002 | Nenhum dado encontrado. {var} | HTTP STATUS: 200 |
| Erro-EPROCESSO-ER_001 | Erro interno ao processar a requisição. Tente novamente mais tarde. | Erro interno. Tente novamente mais tarde. HTTP STATUS: 500 |
| Erro-EPROCESSO-ER_002 | Recurso REST inexistente. | Verificar recurso REST solicitado. HTTP STATUS: 404 |
| EntradaIncorreta-EPROCESSO-EI_001 | Dados de entrada inválidos. | Verificar e corrigir dados de entrada. HTTP STATUS: 400 |
| EntradaIncorreta-EPROCESSO-EI_002 | Requisição inválida. Serviço Inexistente: {idServico} | Verificar e corrigir o valor do atributo 'idServico'. HTTP STATUS: 400 |
| EntradaIncorreta-EPROCESSO-EI_003 | Requisição inválida. Versão Inexistente: {versaoSistema} | Verificar e corrigir o valor do atributo 'versaoSistema'. HTTP STATUS: 400 |
| EntradaIncorreta-EPROCESSO-EI_004 | Requisição inválida. Dados com falha na conversão JSON: {dados} | Verificar e corrigir o valor do atributo 'dados' com string escapada representada em JSON. HTTP STATUS: 400 |
| EntradaIncorreta-EPROCESSO-EI_005 | Requisição inválida. Dados inválidos na execução: {dados} | Verificar e corrigir o valor do atributo 'dados' com string escapada representada em JSON. HTTP STATUS: 400 |
| AcessoNegado-EPROCESSO-AN_001 | Acesso não autorizado. | HTTP STATUS: 401 |
