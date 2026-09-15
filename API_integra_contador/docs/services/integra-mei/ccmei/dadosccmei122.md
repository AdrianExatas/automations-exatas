---
key: "CCMEI.DADOSCCMEI122"
family: "integra-mei"
systemId: "CCMEI"
serviceId: "DADOSCCMEI122"
version: null
operationPath: "Consultar"
sourceStatus: "fetched"
---

# Consulta os dados do Certificado de Condição MEI

Consulta os dados do Certificado de Condição MEI.

## Identificação

| Propriedade | Valor |
| --- | --- |
| Chave | `CCMEI.DADOSCCMEI122` |
| Família | `integra-mei` |
| Caminho físico | `POST /Consultar` |
| Versão | Não informada |
| Situação oficial | 01/10/2024 |
| Bilhetamento | Consultar regra comercial vigente |
| Procuração | Não conclusivo |

## Entrada

Nenhum campo estruturado foi extraído automaticamente; consulte a fonte oficial e as anomalias.

## Saída

| Seção | Campo | Tipo oficial | Obrigatório | Domínio | Descrição |
| --- | --- | --- | --- | --- | --- |
| Dados de Saída | status | Number(3) | — | — | Status HTTP retornado no acionamento do serviço. |
| Dados de Saída | mensagens | Array de String | — | — | Mensagem explicativa retornada no acionamento do serviço. É um array composto de Código e texto da mensagem. O campo Código é um Texto que representa um código interno do negócio. |
| Dados de Saída | dados | String (String escapada: Array de Object Debito) | — | — | Estrutura de dados de retorno. |
| Dados de Saída — Objeto: Dados | cnpj | String | — | — | Número do cnpj sem formatação |
| Dados de Saída — Objeto: Dados | empresario | Object Empresario | — | — | Informações do empresário |
| Dados de Saída — Objeto: Dados | dataInicioAtividades | String | — | — | Data de início das atividades no formato YYYY-MM-DD |
| Dados de Saída — Objeto: Dados | nomeEmpresarial | String | — | — | Nome empresarial |
| Dados de Saída — Objeto: Dados | capitalSocial | Number | — | — | Capital social do CNPJ |
| Dados de Saída — Objeto: Dados | situacaoCadastralVigente | String | — | — | Situação cadastral do CNPJ |
| Dados de Saída — Objeto: Dados | dataInicioSituacaoCadastral | String | — | — | Data da atual situação cadastral no formato YYYY-MM-DD |
| Dados de Saída — Objeto: Dados | enderecoComercial | Object EnderecoComercial | — | — | Endereço comercial |
| Dados de Saída — Objeto: Dados | enquadramento | Object Enquadramento | — | — | Períodos de enquadramento como MEI |
| Dados de Saída — Objeto: Dados | atividade | Object Atividade | — | — | Atividade exercida pelo CNPJ |
| Dados de Saída — Objeto: Dados | termoCienciaDispensa | Object termoCienciaDispensa | — | — | Termo assinalado como ciência da dispensa de alvará |
| Dados de Saída — Objeto: Dados | qrcode | String | — | — | Qrcode para emissão do CCMEI no formato Texto Base 64 |
| Dados de Saída — Objeto: Empresario | nomeCivil | String | SIM | — | nome civil do empresário |
| Dados de Saída — Objeto: Empresario | nomeSocial | String | NÃO | — | nome social do empresário |
| Dados de Saída — Objeto: Empresario | cpf | String | SIM | — | CPF do empresário |
| Dados de Saída — Objeto: EnderecoComercial | cep | Number | SIM | — | CEP do endereço comercial |
| Dados de Saída — Objeto: EnderecoComercial | logradouro | String | NÃO | — | Logradouro |
| Dados de Saída — Objeto: EnderecoComercial | numero | String | SIM | — | Número do logradouro |
| Dados de Saída — Objeto: EnderecoComercial | complemento | String | NÃO | — | Complemento do logradouro |
| Dados de Saída — Objeto: EnderecoComercial | bairro | String | SIM | — | Bairro |
| Dados de Saída — Objeto: EnderecoComercial | municipio | String | SIM | — | Município] |
| Dados de Saída — Objeto: EnderecoComercial | uf | String | SIM | — | UF] |
| Dados de Saída — Objeto: Enquadramento | PeriodosMei | Object periodosMei | SIM | — | Períodos de enquadramento |
| Dados de Saída — Objeto: Enquadramento | situacao | String | SIM | — | Enquadrado ou não |
| Dados de Saída — Objeto: Enquadramento | optanteMei | Boolean | SIM | — | Optante como MEI ou não |
| Dados de Saída — Objeto: PeriodosMei | indice | Number | SIM | — | Índice de ordenação |
| Dados de Saída — Objeto: PeriodosMei | dataInicio | String | — | — | Data de ínicio do enquadramento no formato YYYY-MM-DD |
| Dados de Saída — Objeto: PeriodosMei | dataFim | String | — | — | Data de final do enquadramento no formato YYYY-MM-DD |
| Dados de Saída — Objeto: Atividade | formasAtuacao | Array de String | SIM | — | Lista de formas de atuação |
| Dados de Saída — Objeto: Atividade | ocupacaoPrincipal | Object ocupacaoPrincipal | SIM | — | Ocupação principal exercidada pelo CNPJ |
| Dados de Saída — Objeto: Atividade | ocupacoesSecundarias | Array de Object ocupacoesSecundarias | SIM | — | Ocupaçôes secudárias exercidadas pelo CNPJ |
| Dados de Saída — Objeto: Atividade | optanteMei | Boolean | SIM | — | Optante como MEI ou não |
| Dados de Saída — Objeto: OcupacaoPrincipal | descricaoOcupacao | String | SIM | — | Descrição da ocupação |
| Dados de Saída — Objeto: OcupacaoPrincipal | codigoCNAE | String | — | — | Códido da CNAE exercida |
| Dados de Saída — Objeto: OcupacaoPrincipal | descricaoCNAE | String | — | — | Descrição da CNAE exercida |
| Dados de Saída — Lista Objeto: OcupacoesSecundarias | descricaoOcupacao | String | SIM | — | Descrição da ocupação |
| Dados de Saída — Lista Objeto: OcupacoesSecundarias | codigoCNAE | String | — | — | Códido da CNAE exercida |
| Dados de Saída — Lista Objeto: OcupacoesSecundarias | descricaoCNAE | String | — | — | Descrição da CNAE exercida |
| Dados de Saída — Objeto: TermoCienciaDispensa | titulo | String | SIM | — | Título da solicitação de dispensa de Alvará e licenciamento |
| Dados de Saída — Objeto: TermoCienciaDispensa | texto | String | — | — | Texto da solicitação de dispensa de Alvará e licenciamento |

## Exemplos oficiais e normalizados

### Exemplo 1 — request

Fonte oficial:

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

Forma normalizada:

```json
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

### Exemplo 2 — response

Fonte oficial:

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
       },           
    "status": 200,
    "mensagens": [
        {
          "codigo": "Sucesso-CCMEI-SUC-00020",
          "texto": "Requisição efetuada com sucesso."
        }
      ],
    "dados": "{\"cnpj\":\"00000000000000\",\"empresario\":{\"nomeCivil\":\"AQUI VAI O NOME CIVIL\",\"nomeSocial\":null,\"cpf\":\"99999999999\"},\"dataInicioAtividades\":\"2020-01-01\",\"nomeEmpresarial\":\"AQUI VAI O NOME EMPRESARIAL\",\"capitalSocial\":1000.00,\"situacaoCadastralVigente\":\"ATIVA\",\"dataInicioSituacaoCadastral\":\"2020-01-01\",\"enderecoComercial\":{\"cep\":\"99999999\",\"logradouro\":\"AQUI VAI O NOME DO LOGRADOURO\",\"numero\":\"999\",\"complemento\":\"\",\"bairro\":\"AQUI VAI O BAIRRO\",\"municipio\":\"NOME DO MUNICIPIO\",\"uf\":\"UF\"},\"enquadramento\":{\"periodosMei\":[{\"indice\":1,\"dataInicio\":\"2020-01-01T00:00:00\",\"dataFim\":null}],\"situacao\":\"Enquadrado na condição de MEI\",\"optanteMei\":true},\"atividade\":{\"formasAtuacao\":[\"Estabelecimento fixo\",\"Internet\"],\"ocupacaoPrincipal\":{\"descricaoOcupacao\":\"AQUI VAI A DESCRICAO DA OCUPACAO\",\"codigoCNAE\":\"9999-9/99\",\"descricaoCNAE\":\"DESCRICAO DA CNAE\"},\"ocupacoesSecundarias\":[{\"descricaoOcupacao\":\"DESCRICAO DA OCUPACAO\",\"codigoCNAE\":\"9999999\",\"descricaoCNAE\":\"DESCRICAO DA CNAE\"}]},\"termoCienciaDispensa\":{\"titulo\":\"Termo de Ciência e Responsabilidade com Efeito de Dispensa de Alvará e Licença de Funcionamento\",\"texto\":\"Declaro, sob as penas da Lei, que conheço e atendo os requisitos legais exigidos pelo Estado e pela Prefeitura do Município para emissão do Alvará de Licença e Funcionamento, compreendidos os aspectos sanitários, ambientais, tributários, de segurança pública, uso e ocupação do solo, atividades domiciliares e restrições ao uso de espaços públicos. O não-atendimento a esses requisitos acarretará o cancelamento deste Alvará de Licença e Funcionamento Provisório.\"},\"qrCode\":null}"    
}
```

Forma normalizada:

```json
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
  },
  "status": 200,
  "mensagens": [
    {
      "codigo": "Sucesso-CCMEI-SUC-00020",
      "texto": "Requisição efetuada com sucesso."
    }
  ],
  "dados": "{\"cnpj\":\"00000000000000\",\"empresario\":{\"nomeCivil\":\"AQUI VAI O NOME CIVIL\",\"nomeSocial\":null,\"cpf\":\"99999999999\"},\"dataInicioAtividades\":\"2020-01-01\",\"nomeEmpresarial\":\"AQUI VAI O NOME EMPRESARIAL\",\"capitalSocial\":1000.00,\"situacaoCadastralVigente\":\"ATIVA\",\"dataInicioSituacaoCadastral\":\"2020-01-01\",\"enderecoComercial\":{\"cep\":\"99999999\",\"logradouro\":\"AQUI VAI O NOME DO LOGRADOURO\",\"numero\":\"999\",\"complemento\":\"\",\"bairro\":\"AQUI VAI O BAIRRO\",\"municipio\":\"NOME DO MUNICIPIO\",\"uf\":\"UF\"},\"enquadramento\":{\"periodosMei\":[{\"indice\":1,\"dataInicio\":\"2020-01-01T00:00:00\",\"dataFim\":null}],\"situacao\":\"Enquadrado na condição de MEI\",\"optanteMei\":true},\"atividade\":{\"formasAtuacao\":[\"Estabelecimento fixo\",\"Internet\"],\"ocupacaoPrincipal\":{\"descricaoOcupacao\":\"AQUI VAI A DESCRICAO DA OCUPACAO\",\"codigoCNAE\":\"9999-9/99\",\"descricaoCNAE\":\"DESCRICAO DA CNAE\"},\"ocupacoesSecundarias\":[{\"descricaoOcupacao\":\"DESCRICAO DA OCUPACAO\",\"codigoCNAE\":\"9999999\",\"descricaoCNAE\":\"DESCRICAO DA CNAE\"}]},\"termoCienciaDispensa\":{\"titulo\":\"Termo de Ciência e Responsabilidade com Efeito de Dispensa de Alvará e Licença de Funcionamento\",\"texto\":\"Declaro, sob as penas da Lei, que conheço e atendo os requisitos legais exigidos pelo Estado e pela Prefeitura do Município para emissão do Alvará de Licença e Funcionamento, compreendidos os aspectos sanitários, ambientais, tributários, de segurança pública, uso e ocupação do solo, atividades domiciliares e restrições ao uso de espaços públicos. O não-atendimento a esses requisitos acarretará o cancelamento deste Alvará de Licença e Funcionamento Provisório.\"},\"qrCode\":null}"
}
```

## Referências relacionadas

### Mensagens

- [Mensagens de negócio](../../../generated/source/solucoes/integra-mei/ccmei/mensagens/index.md) — [fonte SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/mensagens/)

### Limites

- Nenhuma referência específica localizada.

### Dados de domínio

- Nenhuma referência específica localizada.

## Anomalias

- Nenhuma anomalia detectada automaticamente.

## Proveniência

- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/servicos/consultar_dados_ccmei/)
- [Documentação oficial SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/api-integra-contador/pt/solucoes/integra-mei/ccmei/exemplos/retorno_consultar_dados_ccmei/)

- Última atualização informada pela fonte: 10 de abril de 2026 12:33:28 UTC
- Conteúdo coletado em: 2026-09-14T14:55:05.806Z
- SHA-256 semântico: `5066b1442696819d1e99222c09093adf4969bb21d88cd121b86cd6381aed9ab1`
