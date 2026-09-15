---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/mensagens/"
sourceUpdatedAt: "22 de dezembro de 2025 13:26:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "84fea02bddb1a599287f9e5b0dd859d767cefd4dec48a925c46a14c372806024"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-caixapostal/caixapostal/mensagens/).

# Mensagens de negócio

## Mensagens Obter lista de mensagens por contribuintes

| Códigos | Mensagem |
| --- | --- |
| Sucesso-CAIXAPOSTAL-00 | Requisição efetuada com sucesso. |
| Erro-CAIXAPOSTAL-02 | Contribuinte não possui mensagem para filtro fornecido. |
| Erro-CAIXAPOSTAL-04 | Contribuinte pessoa física não encontrado. |
| Erro-CAIXAPOSTAL-05 | Contribuinte pessoa jurídica não encontrado. |
| EntradaIncorreta-CAIXAPOSTAL-06 | Contribuinte pessoa jurídica do cnpj filtro não encontrado. |
| EntradaIncorreta-CAIXAPOSTAL-07 | Indicador de filtro fora de domínio. |
| EntradaIncorreta-CAIXAPOSTAL-08 | Status fora do domínio. |
| EntradaIncorreta-CAIXAPOSTAL-10 | CNPJ básico do filtro deve ser ugual ao CNPJ básico do contribuinte. |
| Erro-CAIXAPOSTAL-99 | Erro Natural |

## Mensagens Obter detalhes de uma mensagem específica

| Códigos | Mensagem |
| --- | --- |
| Sucesso-CAIXAPOSTAL-00 | Requisição efetuada com sucesso. |
| Erro-CAIXAPOSTAL-01 | Mensagem não encontrada.. |
| Erro-CAIXAPOSTAL-02 | ISN não encontrado. |
| Erro-CAIXAPOSTAL-03 | Mensagem expirada não pode ser lida. |
| EntradaIncorreta-CAIXAPOSTAL-04 | Sistema chamador inativo ou inválido. |
| EntradaIncorreta-CAIXAPOSTAL-05 | Indicador de PF/PJ fora do domínio. |
| EntradaIncorreta-CAIXAPOSTAL-06 | IP da máquina cliente obrigatório. |
| EntradaIncorreta-CAIXAPOSTAL-08 | Papel do usuário fora do domínio. |
| EntradaIncorreta-CAIXAPOSTAL-09 | Tipo de autenticação do usuário fora do domínio. |
| EntradaIncorreta-CAIXAPOSTAL-10 | Codigo de acesso obrigatório para valor do tipo de autenticação do usuário. |
| EntradaIncorreta-CAIXAPOSTAL-11 | Dados do certificado obrigatório para valor do tipo de autenticação do usuário. |
| EntradaIncorreta-CAIXAPOSTAL-12 | Dados do contribuinte inválidos. |
| AcessoNegado-CAIXAPOSTAL-13 | Usuário sem autorização para acessar a mensagem do contribuinte. |
| Erro-CAIXAPOSTAL-99 | Erro Natural. |

## Mensagens Obter indicador de novas mensagens

| Códigos | Mensagem |
| --- | --- |
| Sucesso-CAIXAPOSTAL-00 | Requisição efetuada com sucesso. |
| EntradaIncorreta-CAIXAPOSTAL-10 | NI informado não numérico ou zerado. |
| EntradaIncorreta-CAIXAPOSTAL-11 | Tipo de NI inválido. |
| EntradaIncorreta-CAIXAPOSTAL-12 | NI incompatível com tipo de NI informado. |
| Erro-CAIXAPOSTAL-99 | Erro natural. |

## Mensagens de Exceção

| Códigos | Mensagem |
| --- | --- |
| Erro-CAIXAPOSTAL-991 | Serviço informado não é um dos serviços disponibilizados pelo sistema. |
| Erro-CAIXAPOSTAL-992 | Serviço informado ({0}) invá1lido. |
| Erro-CAIXAPOSTAL-993 | Não foi possível converter retorno do serviço acionado do Caixa Postal. |
| Erro-CAIXAPOSTAL-994 | Campo informado ({0}) inválido. |
