---
source: "https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/servicos/consultar_dados_ccmei/"
sourceUpdatedAt: "10 de abril de 2026 12:33:28 UTC"
retrievedAt: "2026-09-14T14:50:27.826Z"
semanticHash: "4b1d971e1ce76e3aa5b657f019beede44e768b1d35bd4112639fca76d696db70"
generated: true
---

> Conteúdo normalizado automaticamente a partir da documentação oficial. Em caso de dúvida, prevalece a [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/servicos/consultar_dados_ccmei/).

# Consulta os dados do Certificado de Condição MEI

Este serviço consulta os dados atualizados do CCMEI, a partir do CNPJ informado.

Identificação no Pedido de Dados

idSistema: CCMEI idServico: DADOSCCMEI122

**Dados de Entrada**

Objeto Dados:

Não se aplica

**Exemplo: conteúdo body json de entrada**

```text
{
"contratante": {
"numero": "00000000000000",
"tipo": 2
},
"autorPedidoDados": {
"numero": "00000000000000",
"tipo": 2
},
"contribuinte": {
"numero": "00000000000000",
"tipo": 2
},
"pedidoDados": {
"idSistema": "CCMEI",
"idServico": "DADOSCCMEI122",
"versaoSistema": "1.0",
"dados": ""
}
}
```

**Dados de Saída**

São retornados os dados do CCMEI

| Campo | Descrição | Tipo |
| --- | --- | --- |
| status | Status HTTP retornado no acionamento do serviço. | Number(3) |
| mensagens | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. | Array de String |
| dados | Estrutura de dados de retorno. | String (String escapada: Array de Object Debito) |

Objeto: Dados

| Campo | Descrição | Tipo |
| --- | --- | --- |
| cnpj | Número do cnpj sem formatação | String |
| empresario | Informações do empresário | Object Empresario |
| dataInicioAtividades | Data de início das atividades no formato YYYY-MM-DD | String |
| nomeEmpresarial | Nome empresarial | String |
| capitalSocial | Capital social do CNPJ | Number |
| situacaoCadastralVigente | Situação cadastral do CNPJ | String |
| dataInicioSituacaoCadastral | Data da atual situação cadastral no formato YYYY-MM-DD | String |
| enderecoComercial | Endereço comercial | Object EnderecoComercial |
| enquadramento | Períodos de enquadramento como MEI | Object Enquadramento |
| atividade | Atividade exercida pelo CNPJ | Object Atividade |
| termoCienciaDispensa | Termo assinalado como ciência da dispensa de alvará | Object termoCienciaDispensa |
| qrcode | Qrcode para emissão do CCMEI no formato Texto Base 64 | String |

Objeto: Empresario

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| nomeCivil | nome civil do empresário | String | SIM |
| nomeSocial | nome social do empresário | String | NÃO |
| cpf | CPF do empresário | String | SIM |

Objeto: EnderecoComercial

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| cep | CEP do endereço comercial | Number | SIM |
| logradouro | Logradouro | String | NÃO |
| numero | Número do logradouro | String | SIM |
| complemento | Complemento do logradouro | String | NÃO |
| bairro | Bairro | String | SIM |
| municipio | Município] | String | SIM |
| uf | UF] | String | SIM |

Objeto: Enquadramento

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| PeriodosMei | Períodos de enquadramento | Object periodosMei | SIM |
| situacao | Enquadrado ou não | String | SIM |
| optanteMei | Optante como MEI ou não | Boolean | SIM |

Objeto: PeriodosMei

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| indice | Índice de ordenação | Number | SIM |
| dataInicio | Data de ínicio do enquadramento no formato YYYY-MM-DD | String |  |
| dataFim | Data de final do enquadramento no formato YYYY-MM-DD | String |  |

Objeto: Atividade

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| formasAtuacao | Lista de formas de atuação | Array de String | SIM |
| ocupacaoPrincipal | Ocupação principal exercidada pelo CNPJ | Object ocupacaoPrincipal | SIM |
| ocupacoesSecundarias | Ocupaçôes secudárias exercidadas pelo CNPJ | Array de Object ocupacoesSecundarias | SIM |
| optanteMei | Optante como MEI ou não | Boolean | SIM |

Objeto: OcupacaoPrincipal

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| descricaoOcupacao | Descrição da ocupação | String | SIM |
| codigoCNAE | Códido da CNAE exercida | String |  |
| descricaoCNAE | Descrição da CNAE exercida | String |  |

Lista Objeto: OcupacoesSecundarias

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| descricaoOcupacao | Descrição da ocupação | String | SIM |
| codigoCNAE | Códido da CNAE exercida | String |  |
| descricaoCNAE | Descrição da CNAE exercida | String |  |

Objeto: TermoCienciaDispensa

| Campo | Descrição | Tipo | Obrigatório |
| --- | --- | --- | --- |
| titulo | Título da solicitação de dispensa de Alvará e licenciamento | String | SIM |
| texto | Texto da solicitação de dispensa de Alvará e licenciamento | String |  |

**Exemplo: conteúdo payload json de saída**

Json de exemplo: [retorno Consultar Dados CCMEI](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_consultar_dados_ccmei/)
