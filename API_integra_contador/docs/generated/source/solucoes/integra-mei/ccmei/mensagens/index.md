---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "28ca9c1f192ea1d5ec52f08208054c9f39f6b62587a03235d08bb9f07db09080"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/mensagens/).

# Mensagens de negócio

## Mensagens de sucesso

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [SUCESSO-CCMEI-SUC-00010] | Requisição efetuada com sucesso. | Consultar situação cadastral dos CNPJs |
| [SUCESSO-CCMEI-SUC-00020] | Requisição efetuada com sucesso. | Consultar dados do CCMEI |
| [SUCESSO-CCMEI-SUC-00030] | Requisição efetuada com sucesso. | Emitir CCMEI |

## Mensagens de entrada incorreta

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [EntradaIncorreta-CCMEI-CRT-0001] | Tipo (indicador de CPF ou CNPJ) não informado | Informar se o Tipo é 1 (CPF) OU 2 (CNPJ) |
| [EntradaIncorreta-CCMEI-CRT-0005] | Tipo (indicador de CPF ou CNPJ) diferente de 1 e 2 | Informar o Tipo correto sendo 1 (CPF) OU 2 (CNPJ) |
| [EntradaIncorreta-CCMEI-CRT-0010] | CPF não informado. | Informar o CPF |
| [EntradaIncorreta-CCMEI-CRT-0020] | CPF inválido. | Informar o CPF correto |
| [EntradaIncorreta-CCMEI-CRT-0030] | CNPJ não informado. | Informar o CNPJ |
| [EntradaIncorreta-CCMEI-CRT-0035] | CNPJ inválido. | Informar o CNPJ correto |
| [EntradaIncorreta-CCMEI-CRT-0040] | Id do sistema não informado. | Informar o Id do sistema |
| [EntradaIncorreta-CCMEI-CRT-0045] | Id do sistema inválido. | Informar o Id do sistema correto |
| [EntradaIncorreta-CCMEI-CRT-0050] | Id do serviço não informado. | Informar o Id do serviço |
| [EntradaIncorreta-CCMEI-CRT-0055] | Id do serviço inválido. | Informar o Id do serviço correto |
| [EntradaIncorreta-CCMEI-CRT-0060] | CPF do responsável não informado. | Informar o CPF do responsável |
| [EntradaIncorreta-CCMEI-CRT-0065] | CPF do responsável inválido. | Informar o CPF do responsável correto |
| [EntradaIncorreta-CCMEI-CRT-5010] | Informado tipo 2(CNPJ) para a consulta CCMEISITCADASTRAL123. O correto é tipo 1(CPF). | Informar o CPF |
| [EntradaIncorreta-CCMEI-CRT-5020] | Informado tipo 1(CPF) para a consulta DADOSCCMEI122. O correto é tipo 2(CNPJ). | Informar o CNPJ |
| [EntradaIncorreta-CCMEI-CRT-5030] | Informado tipo 1(CPF) para a consulta DADOSCCMEI122. O correto é tipo 2(CNPJ). | Informar o CNPJ |

## Mensagens de aviso

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [Aviso-CCMEI-BSN-0010] | Este CNPJ está na situação baixada. | Não é permitida a emissão do CCMEI |
| [Aviso-CCMEI-BSN-0020] | Este CNPJ não possui mais a condição de MEI. | Não é permitida a emissão do CCMEI |
| [Aviso-CCMEI-BSN-0030] | Não foram encontrados períodos de enquadramento como MEI para o CNPJ pesquisado. | Não é permitida a emissão do CCMEI |
| [Aviso-CCMEI-BSN-0040] | Este CNPJ não está em situação ativa. | Não é permitida a emissão do CCMEI |
| [Aviso-CCMEI-BSN-0050] | Para a emissão do CCMEI é preciso atualizar as Ocupações exercidas. | Não é permitida a emissão do CCMEI |
| [Aviso-CCMEI-BSN-0060] | A atualização efetuada hoje no cadastro MEI ainda não foi totalmente processada. Por favor aguarde um momento e tente a emissão do CCMEI mais tarde. | Não é permitida a emissão do CCMEI |
| [Aviso-CCMEI-BSN-0080] | Não foi possível recuperar dados do MEI no Simples Nacional, por favor tente mais tarde. | Não é permitida a emissão do CCMEI |
| [Aviso-CCMEI-BSN-0090] | CPF informado não tem empresas MEI. | Não é permitida a emissão do CCMEI |
| [Aviso-CCMEI-BSN-0100] | O CPF pesquisado não possui nenhuma empresa MEI | Não é permitida a emissão do CCMEI |

## Mensagens de erro

| Códigos | Mensagem | Ação |
| --- | --- | --- |
| [Erro-CCMEI-ERRO-0500] | Ocorreu um erro Interno na aplicação. Caso persista, favor entrar em contato. | Comunicar o erro ao administrador do sistema |
